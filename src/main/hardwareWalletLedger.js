/*global module, Buffer, require */
module.exports = (()=>{
  'use strict';

  const { default: Transport } = require("@ledgerhq/hw-transport-node-hid");
  const { default: Str } = require("@ledgerhq/hw-app-str");
  const { Keypair, xdr } = require("stellar-sdk");
  const BigNumber = require('bignumber.js')
  const {sha256} = require("sha.js");

  const {HWW_STATE} = require('../common/constants')


  //// Helpers
  const hash = (data) => {
    let hasher = new sha256();
    hasher.update(data, 'utf8');
    return hasher.digest();
  }

  const parseSubaccount = (_subaccount) => {
      const subaccount = new BigNumber(_subaccount);
      if(!subaccount.isFinite()) throw new Error(`Not a number: ${subaccount.toString()}`)
      if(subaccount.isNegative()) throw new Error(`Not a positive integer: ${subaccount.toString()}`)
      if(subaccount.dp() > 0) throw new Error(`Not a whole integer: ${subaccount.toString()}`)
      return subaccount.toString();
  }


  /**
   * HardwareWalletLedger provides high-level API for Ledger device with Stellar app.
   *
   * As it turns out Ledger behaviour is "pretty random" that depends on timing of interactions and computer's OS.
   * Furthermore it lacks full introspection about which state it is in and whenever it's available for signing.
   * This class creates wrapper with less random behaviour and provide more information of the current state.
   *
   * Class listens for added or removed Ledgers and manages a list of instances for each unique Ledger device. It also
   * informs intances whenever its Ledger has gone offline or came back online. From there, each instance monitors
   * itself via watchdog that tries to get public key and figures out current state based on success or error messages.
   *
   * High-level wrapper provide the following benefits:
   * - more granual states (as discussed above)
   * - less inconsistent behaviour across Linux and MacOS (it still has minor problems, and Windows is untested)
   * - request queue to solve "Ledger is busy" errors
   * - "selected subaccount" to mimic "login workflow" and so methods wont need it as explicit parameter
   *
   * @class HardwareWalletLedger
   */
  class HardwareWalletLedger {

    constructor(uid, device) {
      this.uid = uid;
      this.device = device;
      this.descriptor = undefined;
      this.transport = undefined;
      this.watchdog = undefined;
      this.subaccount = undefined;  // Set with `this.selectSubaccount('0');`
      this.publicKey = undefined;   // Set with `this.selectSubaccount('0');`
      this.queue = Promise.resolve();
      this.busy = false;
    }

    async deconstructor() {
      await this._changeState(HWW_STATE.OFFLINE)
      console.info(`Hardwallet<${this.uid}> deconstructed.`)
    }

    assertState(...states) {
      if(!states.includes(this.state)) throw new Error(`Hardwallet<${this.uid}>: Active state is '${this.state}', but required any of ${states}`)
    }

    async _changeState(newState, ...args) {
      if(!newState || this.state === newState) return;
      switch(newState) {
        case(HWW_STATE.OFFLINE   ): {await this._goOffline(   ...args); break; }
        case(HWW_STATE.SLEEP     ): {await this._goSleep(     ...args); break; }
        case(HWW_STATE.ONLINE    ): {await this._goOnline(    ...args); break; }
        case(HWW_STATE.AVAILABLE ): {await this._goAvailable( ...args); break; }
        case(HWW_STATE.READY     ): {await this._goReady(     ...args); break; }
        default: {
          throw new Error(`Hardwallet<${this.uid}>: Internal error - unrecognized state '${newState}'`)
        }
      }

      console.info(`Hardwallet<${this.uid}> State: ${this.state||''} -> ${newState}`)
      this.state = newState;
      await Promise.all([HardwareWalletLedger.listeners.map((cb)=>cb(this.uid, newState, this.state, HardwareWalletLedger.list()))]);
    }

    async _goOffline() {
      this.descriptor = undefined;
      if(this.watchdog) {
        clearInterval(this.watchdog);
        this.watchdog = undefined;
        console.info(`Hardwallet<${this.uid}> Watchdog: stopped.`)
      }

      if(this.transport) {
        try {
          await this.transport.close();
          this.transport = undefined;
          this.str = undefined;
          this.busy = false;
          console.info(`Hardwallet<${this.uid}>: Transport closed.`)
        } catch(e) {
          console.error(`Hardwallet<${this.uid}>failed to close transport`, e)
        }
      }
    }

    async _goOnline(descriptor) {
      this.descriptor = descriptor;
      if(!this.watchdog) {
        this.watchdog = setInterval(()=>this._watchdogCallback(), 2000)
        console.info(`Hardwallet<${this.uid}> Watchdog: started.`)
        this._watchdogCallback();
      }
    }

    async _goSleep() {
      // Nothing special to do in backend, but frontend would love to learn about this.
    }

    async _goAvailable() {
      // Nothing special to do in backend, but frontend would love to learn about this.
    }

    async _goReady() {
      // Nothing special to do in backend, but frontend would love to learn about this.
    }

    async _watchdogCallback() {
      console.log(`Hardwallet<${this.uid}> Watchdog: state='${this.state}' busy='${this.busy}'`)
      if(!this.transport) {
        try {
          const transport = await Transport.open(this.descriptor);
          const str = new Str(transport);
          this.transport = transport;
          this.str = str;
          console.info(`Hardwallet<${this.uid}>: Transport open.`)
        } catch(e) {
          console.warn(`Hardwallet<${this.uid}> Watchdog: recovering from error... (${e.message})`)
          return;  // Skip the rest try again later.
        }
      }

      let newState;
      try {

        if(this.subaccount) {
          if(!this.publicKey && !this.busy) await this.selectSubaccount(this.subaccount)
          if(!this.busy) await this.ping();
          newState = HWW_STATE.READY;
        } else {
          if(!this.busy && await this.ping()) newState = HWW_STATE.AVAILABLE;
        }

      } catch(err) {

        // After PIN, outside Stellar app, if calling `this.str.getAppConfiguration`
        if(err.statusCode === 27904 && err.statusText === 'INS_NOT_SUPPORTED') {
          newState = HWW_STATE.ONLINE;

        // After PIN, outside Stellar app, if calling `this.str.getPublicKey`.
        } else if(err.statusCode === 26368 && err.statusText === 'INCORRECT_LENGTH') {
          newState = HWW_STATE.ONLINE;

        // During sleep.
        } else if(err.statusCode === 26628 && err.statusText === 'UNKNOWN_ERROR') {
          newState = HWW_STATE.SLEEP;

        // If Ledger has changed path at random reconnect.
        } else if(err.message === 'Invalid channel' || err.message === 'Cannot write to HID device') {
          newState = HWW_STATE.ONLINE;
          try {
            await this.transport.close();
            this.transport = undefined;
            this.str = undefined;
            console.warn(`Hardwallet<${this.uid}> Transport closed.`)
          } catch(e) {
            console.error(`Hardwallet<${this.uid}> failed to close transport:`, e)
          }

        // ... else let the user know (if application was open from terminal).
        } else { console.error(`Hardwallet<${this.uid}> Watchdog got unrecognized Error: code=${err.statusCode} text="${err.statusText}" message="${err.message}"`) }
      }

      try {
        this._changeState(newState);
      } catch(err) {
        console.error(`Hardwallet<${this.uid}> Watchdog: Internal error during changing state to '${newState}': `, err)
      }
    }

    async _selectSubaccount(_subaccount) {
      this.assertState(HWW_STATE.AVAILABLE);
      const subaccount = parseSubaccount(_subaccount);
      const publicKey = await this._getPublicKey(subaccount, true);
      this.subaccount = subaccount.toString();
      this.publicKey = publicKey;
      await this._changeState(HWW_STATE.READY);
      return this.publicKey;
    }

    async _deselectSubaccount(_subaccount) {
      this.assertState(HWW_STATE.OFFLINE, HWW_STATE.SLEEP, HWW_STATE.ONLINE, HWW_STATE.READY);
      this.subaccount = undefined;
      this.publicKey = undefined;
      if(this.state === HWW_STATE.READY) await this._changeState(HWW_STATE.AVAILABLE);
      return undefined;
    }

    async _getAppConfig() {
      this.assertState(HWW_STATE.AVAILABLE, HWW_STATE.READY);
      const result = await this.str.getAppConfiguration();
      return result;
    }

    async _getPublicKey(_subaccount, display) {
      this.assertState(HWW_STATE.AVAILABLE, HWW_STATE.READY);
      if(_subaccount === undefined) {
        return this.publicKey;
      } else if(typeof _subaccount === 'string' || typeof _subaccount === 'number') {
        return (await this.str.getPublicKey(`44'/148'/${parseSubaccount(_subaccount)}'`, true, display?true:false)).publicKey;
      } else if(Array.isArray(_subaccount)) {
        const all = [];
        for(const sub of _subaccount) {
          all.push((await this.str.getPublicKey(`44'/148'/${parseSubaccount(sub)}'`, true, display?true:false)).publicKey);
        }
        return all
      } else {
        throw new Error('catch me')
      }
    }

    async _signTe(teSignatureBaseSerialized) {
      this.assertState(HWW_STATE.READY);
      const signatureWrapper = await this.str.signTransaction(`44'/148'/${this.subaccount}'`, Buffer.from(teSignatureBaseSerialized, 'base64'));

      // add signature to transaction
      const keyPair = Keypair.fromPublicKey(this.publicKey);
      const hint = keyPair.signatureHint();
      const decoratedSignature = new xdr.DecoratedSignature({hint: hint, signature: signatureWrapper.signature});

      return decoratedSignature.toXDR().toString('base64');
    }

    async _signHash(teHashSerialized) {
      // Less secure than `signTe` and handles any transactions, but we don't have such usecase yet. TODO: Implement later.
      this.assertState(HWW_STATE.READY);
      throw new Error('TODO: Implement.');
    }

    async _ping() {
      // FYI If Ledger Nano is asleep, then getPublicKey errors but getAppConfig keeps working. Also without verification is 3x faster.
      return await this.str.getPublicKey(`44'/148'/0'`, false, false);
    }

    // Wrap methods to use queue, effectively solving all "Ledger Device is busy" errors.
    _wrapper(fn) {
      this.busy = true;
      const queue = this.queue
        .catch(()=>undefined)
        .then(()=>fn())
        .catch((err) => {
          // console.log(`Hardwallet<${this.uid}> wrapper got error:`, err);
          this.busy=false;
          throw err;
        })
        .then((res)=>{
          this.busy=false;
          return res;
        });
      this.queue = queue;
      return queue;
    }

    selectSubaccount(...args)   { return this._wrapper(()=>this._selectSubaccount(...args)   ); }
    deselectSubaccount(...args) { return this._wrapper(()=>this._deselectSubaccount(...args) ); }
    getAppConfig(...args)       { return this._wrapper(()=>this._getAppConfig(...args)       ); }
    getPublicKey(...args)       { return this._wrapper(()=>this._getPublicKey(...args)       ); }
    signTe(...args)             { return this._wrapper(()=>this._signTe(...args)             ); }
    signHash(...args)           { return this._wrapper(()=>this._signHash(...args)           ); }
    ping(...args)               { return this._wrapper(()=>this._ping(...args)               ); }

  }


  // Public static properties.
  HardwareWalletLedger.listOfLedgers = new Map();
  HardwareWalletLedger.listeners = [];


  // Public static methods.
  HardwareWalletLedger.isSupported = async () => {
    return Transport.isSupported();
  }

  HardwareWalletLedger.list = () => {
    return [...HardwareWalletLedger.listOfLedgers.values()].map((hww)=>({
        device: hww.device,
        publicKey: hww.publicKey,
        state: hww.state,
        subaccount: hww.subaccount,
        uid: hww.uid,
      }));
  }

  HardwareWalletLedger.init = () => {
    HardwareWalletLedger.unsubscribeTransport = Transport.listen({next: async (e) => {
      const uid = hash(JSON.stringify({
        manufacturer: e.manufacturer,
        product     : e.product     ,
        productId   : e.productId   ,
        release     : e.release     ,
        serialNumber: e.serialNumber,
        vendorId    : e.vendorId    ,
      })).toString('base64').substr(0, 8);
      // console.log(uid, e)
      try {
        switch(e.type) {
          case('add'): {
            if(!HardwareWalletLedger.listOfLedgers.has(uid)) HardwareWalletLedger.listOfLedgers.set(uid, new HardwareWalletLedger(uid, e.device));
            await HardwareWalletLedger.listOfLedgers.get(uid)._changeState(HWW_STATE.ONLINE, e.descriptor);
            break;
          }
          case('remove'): {
            await HardwareWalletLedger.listOfLedgers.get(uid)._changeState(HWW_STATE.OFFLINE);
            break;
          }
          default: {
            throw new Error(`Unrecognized Ledger event '${e.type}'`)
          }
        }
      } catch(err) {
          console.error(`Hardwallet<${this.uid}>: Internal error.`, err)
      }
    }});
  }

  HardwareWalletLedger.cleanup = async function() {
    HardwareWalletLedger.unsubscribeTransport();
    HardwareWalletLedger.unsubscribeTransport = undefined;
    await Promise.all([...HardwareWalletLedger.listOfLedgers.values()].map((ledger)=>ledger.deconstructor()));
  }


  return {
    Ledger: HardwareWalletLedger,
  }

})();
