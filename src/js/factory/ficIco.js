/* global Buffer, fetch, moment, myApp, StellarSdk, Web3 */

myApp.factory('FicIcoFactory', ['$http', 'SettingFactory', 'StellarApi',
                       function( $http ,  SettingFactory ,  StellarApi ) {

  // const MIN_AMOUNT = 1000;  // Real minimal amount is 600.00002 FIC.

  const LIVE_LOCKUP_0 = 1526425200000;  // May 15
  const LIVE_LOCKUP_90 = LIVE_LOCKUP_0 + (60 * 60 * 24) * 90 * 1000; // Mon, 13 Aug 2018 23:00:00 +0000
  const LIVE_LOCKUP_180 = LIVE_LOCKUP_0 + (60 * 60 * 24) * 180 * 1000; // Sun, 11 Nov 2018 23:00:00 +0000
  const TEST_LOCKUP_0 = 1531116000000;  // Mon, 09 Jul 2018 12:00:00 +0000
  const TEST_LOCKUP_90 = TEST_LOCKUP_0 + (60 * 60 * 24) * 5 * 1000; // Fri, 14 Jul 2018 6:00:00 +0000
  const TEST_LOCKUP_180 = TEST_LOCKUP_0 + (60 * 60 * 24) * 10 * 1000; // Wed, 19 Jul 2018 6:00:00 +0000

  const Unlock = (ficAddress, lockupAddress, lockup) => async () => {
    const SUBMIT = async (te) => StellarApi.server.submitTransaction(te).catch((e)=>e).then((res)=>res)

    let lockupAccount;
    try {
      lockupAccount = await StellarApi.server.loadAccount(lockupAddress);
      lockupAccount._baseAccount.sequence.minus(2);
    } catch(e) {
      if(e instanceof StellarSdk.NotFoundError) throw new Error(`Already unlocked (${lockupAddress})`);
      throw e;
    }
    // console.log(`Lockup account ${lockupAddress} sequence & balance:`, lockupAccount.sequenceNumber(), lockupAccount.balances)

    let timebounds;
    switch(SettingFactory.getCurrentNetwork().networkPassphrase) {
      case(SettingFactory.NETWORKS.ficTest.networkPassphrase): {
        timebounds = {minTime: ({0: TEST_LOCKUP_0, 1: TEST_LOCKUP_90, 2: TEST_LOCKUP_180})[lockup], maxTime: Number.MAX_SAFE_INTEGER}
        break;
      }
      case(SettingFactory.NETWORKS.fic.networkPassphrase): {
        timebounds = {minTime: ({0: LIVE_LOCKUP_0, 1: LIVE_LOCKUP_90, 2: LIVE_LOCKUP_180})[lockup], maxTime: Number.MAX_SAFE_INTEGER}
        break;
      }
      default: {
        timebounds = undefined;
        break;
      }
    }

    const prete1 = new StellarSdk.TransactionBuilder(lockupAccount, { timebounds })
      .addOperation(StellarSdk.Operation.createAccount({
        source: lockupAddress,
        destination: ficAddress,
        startingBalance: '400',
      }))
      .build();

    const prete2 = new StellarSdk.TransactionBuilder(lockupAccount, { timebounds })
      .addOperation(StellarSdk.Operation.accountMerge({
        source: lockupAddress,
        destination: ficAddress,
      }))
      .build();

    const resultCreate = await SUBMIT(prete1); // Create user account ${ficAddress}
    const resultUnlock = await SUBMIT(prete2); // Merge into user account ${ficAddress}

    return {
      resultCreate,
      resultUnlock,
    }
  }

  class FicIco {
    async getFicTxs(userAddress) {
      if(!await this.initPromise) throw new Error('Not useful, see state and comments');

      const directoryResponse = await fetch(`${StellarApi.server.serverURL}/accounts/${this.ficDistributorAddress}`);
      const directory = await directoryResponse.json();
      const lockupAddressMap = directory.data;

      const userLockups = Object.keys(lockupAddressMap).filter((key)=>key.slice(0,56) === userAddress);
      const responses = [];

      for(const key of userLockups) {

        const lockupAddress = Buffer.from(lockupAddressMap[key], 'base64').toString();

        //console.log(lockupAddress);
        const res = await fetch(`${StellarApi.server.serverURL}/accounts/${lockupAddress}/transactions?order=desc&limit=4`);
        const json = await res.json();
        const transactions = json._embedded.records;
        transactions.forEach((transaction) => transaction.envelope = new StellarSdk.Transaction(transaction.envelope_xdr));

        const creationTransation = transactions.find((tx)=>tx.source_account==this.ficDistributorAddress && tx.envelope.operations.find((op)=>op.type === 'createAccount'))
        const setupTransaction = transactions.find((tx)=>tx.source_account==this.ficDistributorAddress && tx.envelope.operations.find((op)=>op.type === 'setOptions'));
        const createTransaction = transactions.find((tx)=>tx.source_account==lockupAddress && tx.envelope.operations.find((op)=>op.type === 'createAccount'));
        const mergeTransaction = transactions.find((tx)=>tx.source_account==lockupAddress && tx.envelope.operations.find((op)=>op.type === 'accountMerge'));
        const lockupCode = creationTransation.envelope.memo.value.readInt8(31);
        const lockup = ({0: '0', 1:'90', 2:'180'})[lockupCode];

        const r = {
          lockupAddress,
          ficNonce: key.slice(57),
          ethAddress: creationTransation.envelope.memo.value.slice(0, 20).toString('hex'),
          lockup,
          amount: creationTransation.envelope.operations[0].startingBalance.split('.')[0],  // Ghetto rounding to integers.
          ethTxHash: setupTransaction && setupTransaction.envelope.memo.value.toString('hex'),
          tx1: creationTransation && {timestamp: creationTransation.created_at, txId: creationTransation.id},
          tx2: setupTransaction   && {timestamp: setupTransaction.created_at  , txId: setupTransaction.id  },
          tx3: createTransaction  && {timestamp: createTransaction.created_at , txId: createTransaction.id },
          tx4: mergeTransaction   && {timestamp: mergeTransaction.created_at  , txId: mergeTransaction.id  },
          unlock: Unlock(userAddress, lockupAddress, lockupCode),
        };
        responses.push(r);

      }
      return responses;
    }

    // Ethereum part.

    async getEthWithdrawPayload(publicKey, amount, lockup) {
      if(!await this.initPromise) throw new Error('Not useful, see state and comments');
      try {
        const methodHash = this.web3.utils.sha3('withdraw(bytes32,uint256,uint8)').slice(2, 10);
        const pk = StellarSdk.StrKey.decodeEd25519PublicKey(publicKey).toString('hex');
        const tokens = this._BN(this.web3.utils.toWei(amount, 'ether'));
        const hexData = [
          methodHash,
          pk,
          this.web3.utils.leftPad(tokens.toString(16), 64, 0),
          this.web3.utils.leftPad(this._BN(lockup).toString(16), 64, 0)
        ].join('');

        return '0x' + hexData;
      }
      catch (e) {
        console.error(e);
      }
    }
    async getEthTokens(address) {
      if(!await this.initPromise) throw new Error('Not useful, see state and comments');
      const data = await Promise.all([
          this.ethSmartContract.methods.getBalances(address).call(),
          this.ethSmartContract.getPastEvents('Withdraw', {
            fromBlock: 0,
            toBlock: 'latest',
            filter: { beneficiary: address }
          })
        ])
      const balances = data[0];
      const events = data[1];
      const _0 = this._BN(balances[0]).div(this._BN(1e18)).toString();
      const _90 = this._BN(balances[1]).div(this._BN(1e18)).toString();
      const _180 = this._BN(balances[2]).div(this._BN(1e18)).toString();
      const result = {
        total    : { '0': _0, '90': _90, '180': _180 },
        claimed  : { '0':  0, '90':   0, '180':    0 },
        remaining: { '0': _0, '90': _90, '180': _180 },
        txs: []
      };
      const claimed = result.claimed;
      const total = result.total;
      for (const event of events) {
        const tx = await this._createEthTxFromEvent(event);
        const amount = this._BN(tx.amount);
        claimed[tx.lockup] = this._BN(claimed[tx.lockup]).add(amount).toString();
        total[tx.lockup] = this._BN(total[tx.lockup]).add(amount).toString();
        result.txs.push(tx);
      }
      return result;
    }
    _BN(value) {
      // Assume this.initiPromise is good, because only internals calls this methods.
      return this.web3.utils.toBN(value);
    }
    async _createEthTxFromEvent(event) {
      if(!await this.initPromise) throw new Error('Not useful, see state and comments');
      const eventValues = event.returnValues;
      const tx = Object.create(null);
      tx.blockNumber = event.blockNumber;
      tx.who = eventValues.who;
      tx.beneficiary = eventValues.beneficiary;
      tx.publicKey = StellarSdk.StrKey.encodeEd25519PublicKey(this.web3.utils.hexToBytes(eventValues.publicKey));
      tx.amount = this._BN(eventValues.amount).div(this._BN(1e18)).toString();
      tx.lockup = eventValues.lockup;
      tx.txHash = event.transactionHash;
      return tx;
    }

    // Lifecycle magic below.

    static new() {
      const ficIco = new FicIco();
      ficIco.initPromise = ficIco._init()
        .then((isUsable)=>{
          console.info(`ficIco initialized, usable: ${isUsable}, state: ${ficIco.state}, comments: ${ficIco.comment}`);
          return isUsable;
        })
        .catch((e)=>{
          console.error('ficIco failed to initialize.', e);
          throw e;
        })
      return ficIco;
    }

    async _init() {
      try {
        const res = await fetch(new Request(`https://s3.amazonaws.com/ficnetwork-public/ico.json?rid=${Math.random()}`, {cache: 'no-cache'}));
        const data = await res.json();
        const currentConfig = data[SettingFactory.getCurrentNetwork().networkPassphrase];
        if(!currentConfig) throw new Error(`No current network "${SettingFactory.getNetworkType()}" between FIC ICO configs: "${Object.keys(data).join('", "')}"`);

        this.state = currentConfig.state;
        this.comment = currentConfig.comment;
        switch(this.state) {
          case('active'): // all ok
          case('paused'): // read only
          case('finished'): { // read only
            this.web3 = new Web3(currentConfig.ethereumNetwork);
            this.ethSmartContract = new this.web3.eth.Contract(FicIco.ETH_ABI, currentConfig.ethereumSCAddress);
            this.ficDistributorAddress = currentConfig.ficDistributorAddress;

            return true;
          }
          case('pending'): { // nothing is ok
            return false;
          }
          default: { // rip
            throw new Error(`Bad state ${this.state}`);
          }

        }
      } catch(e) { // rip
        console.error(e)
        return false;
      }
    }

    get LOCKUP_DATE_0() {
      return moment.utc( (SettingFactory.getCurrentNetwork().networkPassphrase === SettingFactory.NETWORKS.fic.networkPassphrase) ? LIVE_LOCKUP_0 : TEST_LOCKUP_0 )
    }

    get LOCKUP_DATE_90() {
      return moment.utc( (SettingFactory.getCurrentNetwork().networkPassphrase === SettingFactory.NETWORKS.fic.networkPassphrase) ? LIVE_LOCKUP_90 : TEST_LOCKUP_90 )
    }

    get LOCKUP_DATE_180() {
      return moment.utc( (SettingFactory.getCurrentNetwork().networkPassphrase === SettingFactory.NETWORKS.fic.networkPassphrase) ? LIVE_LOCKUP_180 : TEST_LOCKUP_180 )
    }

    static get ETH_ABI() {
      return [{'constant':true,'inputs':[{'name':'_holder','type':'address'}],'name':'getBalances','outputs':[{'name':'','type':'uint256'},{'name':'','type':'uint256'},{'name':'','type':'uint256'}],'payable':false,'stateMutability':'view','type':'function'}, {'anonymous':false,'inputs':[{'indexed':true,'name':'who','type':'address'},{'indexed':true,'name':'beneficiary','type':'address'},{'indexed':true,'name':'publicKey','type':'bytes32'},{'indexed':false,'name':'amount','type':'uint256'},{'indexed':false,'name':'lockup','type':'uint8'}],'name':'Withdraw','type':'event'}];
    }
  }

  return FicIco.new();

} ]);
