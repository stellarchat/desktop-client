/* global CONST, ipcRenderer, myApp */

// hardwareWalletDaemon - singleton that manages hardwallets.
myApp.factory('hardwareWalletDaemon', [
                              function() {
  let hwws = [];
  const listeners = new Set();

  class HardwareWalletDaemon {

    get initialized()  { return this.initPromise.then(()=>true);    }
    get isSupported()  { return this.initPromise;                   }
    get list()         { return this.initPromise.then(()=>hwws);    }
    get activeWallet() { return this.initPromise.then(()=>hwws[0]); }  // Simply take first one. TODO: support multiple wallets.

    async deselectSubaccount(...args) {
      return this.initPromise.then(async ()=>this._invokeIPC(CONST.HWW_API.DESELECT, (await this.activeWallet).uid, ...args));
    }
    async getPublicKey(...args) {
      return this.initPromise.then(async ()=>this._invokeIPC(CONST.HWW_API.PK, (await this.activeWallet).uid, ...args));
    }
    async selectSubaccount(...args) {
      return this.initPromise.then(async ()=>this._invokeIPC(CONST.HWW_API.SELECT, (await this.activeWallet).uid, ...args));
    }
    async signHash(...args) {
      return this.initPromise.then(async ()=>this._invokeIPC(CONST.HWW_API.SIGN_HASH, (await this.activeWallet).uid, ...args));
    }
    async signTransaction(...args) {
      return this.initPromise.then(async ()=>this._invokeIPC(CONST.HWW_API.SIGN_TE, (await this.activeWallet).uid, ...args));
    }
    async getAppConfig(...args) {
      return this.initPromise.then(async ()=>this._invokeIPC(CONST.HWW_API.CONFIG, (await this.activeWallet).uid, ...args));
    }

    async _invokeIPC(channel, ...args) {
      const _id = Math.floor(Math.random()*10000);
      const promise = new Promise((resolve, reject)=>{
        const cb = (event, id, err, result) => {
          if(id!==_id) return;
          ipcRenderer.removeListener(channel, cb);
          if(err) { reject(new Error(err)) } else { resolve(result) }
        }
        ipcRenderer.on(channel, cb)
      })
      ipcRenderer.send(channel, _id, ...args)
      return promise;
    }

    listen(listener) {
      listeners.add(listener);
    }

    removeListener(listener) {
      listeners.delete(listener);
    }

    // Lifecycle magic below.

    static new() {
      const hardwareWalletDaemon = new HardwareWalletDaemon();
      hardwareWalletDaemon.initPromise = hardwareWalletDaemon._init()
        .then((isSupported)=>{
          console.info(`hardwareWalletDaemon initialized, supported = ${isSupported}`);
          return isSupported;
        })
        .catch((e)=>{
          console.error('hardwareWalletDaemon failed to initialize.', e);
          throw e;
        })
      return hardwareWalletDaemon;
    }

    async deconstructor() {
      if(await this.isSupported) ipcRenderer.removeListener(CONST.HWW_API.LISTEN, this._update);
    }

    async _init() {
      const isSupported = await this._invokeIPC(CONST.HWW_API.SUPPORT);
      if(isSupported) {
        ipcRenderer.on(CONST.HWW_API.LISTEN, (...args)=>this._update(...args));
        const hwwList = await this._invokeIPC(CONST.HWW_API.LIST);
        for(const hww of hwwList) /*await*/ this._update(null, hww.uid, hww.state, null, hwwList)
      }
      return isSupported;
    }

    async _update(event, uid, currentState, prevState, hwwList) {
      hwws.splice(0, hwws.length, ...hwwList);
      await this.initPromise;
      console.info(`Hardwallet<${uid}> state: ${prevState||''} -> ${currentState}`);

      for(const listener of listeners) {
        const pleaseRemove = await listener(this);
        if(pleaseRemove) this.removeListener(listener);
      }
    }

  }


  return HardwareWalletDaemon.new();
}]);

