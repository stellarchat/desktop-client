/* global $, angular, Buffer, moment, myApp, StellarSdk, Web3 */

let horizon = new StellarSdk.Server('https://horizon-testnet.stellar.org');  // Testing on testnet
StellarSdk.Network.useTestNetwork();

const LOCKUP_DATE_0 = moment("2018-05-15 23:00+00:00");
const LOCKUP_DATE_90 = LOCKUP_DATE_0.add(90, 'days');
const LOCKUP_DATE_180 = LOCKUP_DATE_0.add(180, 'days');
// const MIN_AMOUNT = 1000;  // Real minimal amount is 600.00002 FIC.
const FIC_DISTRIBUTOR = 'GC2PJQNVOMRYGK7DCDHZTBSXAT6W5HSCSUAGTHL7KPHFSBBFVXNPQRJ5';

const Unlock = (ficAddress, lockupAddress) => async () => {
  const SUBMIT = async (te) => horizon.submitTransaction(te).catch((e)=>e).then((res)=>res)
    .then((res)=>{
      console.log(res);
      return res;
    });

  let lockupAccount;
  try {
    lockupAccount = await horizon.loadAccount(lockupAddress);
    lockupAccount._baseAccount.sequence.minus(2);
  } catch(e) {
    if(e instanceof StellarSdk.NotFoundError) throw new Error(`Already unlocked (${lockupAddress})`);
    throw e;
  }
  // console.log(`Lockup account ${lockupAddress} sequence & balance:`, lockupAccount.sequenceNumber(), lockupAccount.balances)

  const prete1 = new StellarSdk.TransactionBuilder(lockupAccount/* , { timebounds: {minTime, maxTime} } */)  // for testing timebounds are ignored
    .addOperation(StellarSdk.Operation.createAccount({
      source: lockupAddress,
      destination: ficAddress,
      startingBalance: '30',
    }))
    .build();

  const prete2 = new StellarSdk.TransactionBuilder(lockupAccount/* , { timebounds: {minTime, maxTime} } */)  // for testing timebounds are ignored
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

const getTxs = async (ficAddress)=>{
  const directoryResponse = await fetch(`https://horizon-testnet.stellar.org/accounts/${FIC_DISTRIBUTOR}`);
  const directory = await directoryResponse.json();
  const lockupAddressMap = directory.data;

  const userLockups = Object.keys(lockupAddressMap).filter((key)=>key.slice(0,56) === ficAddress);
  const responses = [];


  for(const key of userLockups) {

    const lockupAddress = Buffer.from(lockupAddressMap[key], 'base64').toString();

    //console.log(lockupAddress);
    const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${lockupAddress}/transactions?order=desc&limit=4`);
    const json = await res.json();
    const transactions = json._embedded.records;
    transactions.forEach((transaction) => transaction.envelope = new StellarSdk.Transaction(transaction.envelope_xdr));

    const creationTransation = transactions.find((tx)=>tx.source_account==FIC_DISTRIBUTOR && tx.envelope.operations.find((op)=>op.type === 'createAccount'))
    const setupTransaction = transactions.find((tx)=>tx.source_account==FIC_DISTRIBUTOR && tx.envelope.operations.find((op)=>op.type === 'setOptions'));
    const createTransaction = transactions.find((tx)=>tx.source_account==lockupAddress && tx.envelope.operations.find((op)=>op.type === 'createAccount'));
    const mergeTransaction = transactions.find((tx)=>tx.source_account==lockupAddress && tx.envelope.operations.find((op)=>op.type === 'accountMerge'));

    const r = {
      lockupAddress,
      ficNonce: key.slice(57),
      ethAddress: creationTransation.envelope.memo.value.slice(0, 20).toString('hex'),
      lockup: ({0: '0', 1:'90', 2:'180'})[creationTransation.envelope.memo.value.readInt8(31)],
      amount: creationTransation.envelope.operations[0].startingBalance.split('.')[0],  // Ghetto rounding to integers.
      ethTxHash: setupTransaction && setupTransaction.envelope.memo.value.toString('hex'),
      tx1: creationTransation && {timestamp: creationTransation.created_at, txId: creationTransation.id},
      tx2: setupTransaction   && {timestamp: setupTransaction.created_at  , txId: setupTransaction.id  },
      tx3: createTransaction  && {timestamp: createTransaction.created_at , txId: createTransaction.id },
      tx4: mergeTransaction   && {timestamp: mergeTransaction.created_at  , txId: mergeTransaction.id  },
      unlock: Unlock(ficAddress, lockupAddress),
    };
    responses.push(r);

  }
  return responses;
};

class EthWallet {
  constructor(crowdsaleAddress) {
    this.crowdsaleAddress = crowdsaleAddress;
    this.crowdsale = new EthWallet.web3.eth.Contract(EthWallet.abi, this.crowdsaleAddress);
  }
  getWithdrawPayload(publicKey, amount, lockup) {
    try {
      const utils = EthWallet.web3.utils;
      const methodHash = utils.sha3('withdraw(bytes32,uint256,uint8)').slice(2, 10);
      const pk = StellarSdk.StrKey.decodeEd25519PublicKey(publicKey).toString('hex');
      const tokens = this.bn(utils.toWei(amount, 'ether'));
      const hexData = [
        methodHash,
        pk,
        utils.leftPad(tokens.toString(16), 64, 0),
        utils.leftPad(this.bn(lockup).toString(16), 64, 0)
      ].join('');
      return '0x' + hexData;
    }
    catch (e) {
      console.error(e);
    }
  }
  bn(value) {
    return EthWallet.web3.utils.toBN(value);
  }
  getTokens(address) {
    const self = this;
    return Promise.all([
      this.crowdsale.methods.getBalances(address).call(),
      this.crowdsale.getPastEvents('Withdraw', {
        fromBlock: 0,
        toBlock: 'latest',
        filter: { beneficiary: address }
      })
    ]).then(function (data) {
      const balances = data[0];
      const events = data[1];
      const _0 = self.bn(balances[0]).div(self.bn(1e18)).toString();
      const _90 = self.bn(balances[1]).div(self.bn(1e18)).toString();
      const _180 = self.bn(balances[2]).div(self.bn(1e18)).toString();
      const result = {
        total: {
          '0': _0,
          '90': _90,
          '180': _180
        },
        claimed: { '0': 0, '90': 0, '180': 0 },
        remaining: {
          '0': _0,
          '90': _90,
          '180': _180
        },
        txs: []
      };
      const claimed = result.claimed;
      const total = result.total;
      for (const event of events) {
        const tx = self._createTxFromEvent(event);
        const amount = self.bn(tx.amount);
        claimed[tx.lockup] = self.bn(claimed[tx.lockup]).add(amount).toString();
        total[tx.lockup] = self.bn(total[tx.lockup]).add(amount).toString();
        result.txs.push(tx);
      }
      return result;
    });
  }
  _createTxFromEvent(event) {
    const eventValues = event.returnValues;
    const tx = Object.create(null);
    tx.who = eventValues.who;
    tx.beneficiary = eventValues.beneficiary;
    tx.publicKey = StellarSdk.StrKey.encodeEd25519PublicKey(EthWallet.web3.utils.hexToBytes(eventValues.publicKey));
    tx.amount = this.bn(eventValues.amount).div(this.bn(1e18)).toString();
    tx.lockup = eventValues.lockup;
    tx.txHash = event.transactionHash;
    return tx;
  }
}
EthWallet.web3 = new Web3('https://ropsten.infura.io/3UOYQzA23QIkrf3lZUEX');
EthWallet.abi = [{'constant':true,'inputs':[{'name':'_holder','type':'address'}],'name':'getBalances','outputs':[{'name':'','type':'uint256'},{'name':'','type':'uint256'},{'name':'','type':'uint256'}],'payable':false,'stateMutability':'view','type':'function'}, {'anonymous':false,'inputs':[{'indexed':true,'name':'who','type':'address'},{'indexed':true,'name':'beneficiary','type':'address'},{'indexed':true,'name':'publicKey','type':'bytes32'},{'indexed':false,'name':'amount','type':'uint256'},{'indexed':false,'name':'lockup','type':'uint8'}],'name':'Withdraw','type':'event'}];

myApp.controller("FICAddressCtrl", [ '$scope', '$window',
                            function( $scope ,  $window ) {

  $scope.eth_address = '';
  $scope.invalid_eth = false;
  $scope.addressInvalid = true;
  $scope.eth_addresses = ( $window.localStorage[`eth_address`] ? JSON.parse($window.localStorage[`eth_address`]) : '' );
  $scope.currentEthAddressCoins = '';

  $scope.addEthAdrress = function(eth_address) {
    const currentAddresses = {};
    const allAdresses = [];
    const funcAddress = eth_address;

    if($window.localStorage[`eth_address`]) {
      currentAddresses[`${$scope.address}`] = [`${JSON.parse($window.localStorage[`eth_address`])}`];
    }

    if (EthWallet.web3.utils.isAddress(eth_address)) {
      console.log('Valid ethereum address.');
      if($window.localStorage[`eth_address`]) {
        const localAddresses = JSON.parse($window.localStorage[`eth_address`]);
        const walletAdresses = localAddresses[$scope.address];
        for(const addr in walletAdresses) {
          allAdresses.push(walletAdresses[addr]);
        }
      }
      allAdresses.push(eth_address);
      currentAddresses[$scope.address] = allAdresses;
      $window.localStorage[`eth_address`] = JSON.stringify(currentAddresses);
      $scope.eth_address = '';
      $scope.invalid_eth = false;
      $scope.eth_addresses = JSON.parse($window.localStorage[`eth_address`]);

      const wallet = new EthWallet('0x559d3be0e5818eca8d6894b4080ffc37a2058aef'),
          current_coins = ( $window.localStorage[`coins`] ? JSON.parse($window.localStorage[`coins`] ) : {});

      wallet.getTokens(funcAddress).then(function(res){
        current_coins[funcAddress] = res;
        $window.localStorage[`coins`] = JSON.stringify(current_coins);
        $scope.currentEthAddress = funcAddress;
        $scope.currentEthAddressCoins = res;
        $scope.addressInvalid = false;
        $scope.$apply();
      });

    }
    else {
      $scope.invalid_eth = true;
      console.error('Invalid Ethereum address.');
    }
  }

  const now = moment(new Date());
  const duration90 = moment.duration(now.diff(LOCKUP_DATE_90));
  const days90 = duration90.asDays();
  const duration180 = moment.duration(now.diff(LOCKUP_DATE_180));
  const days180 = duration180.asDays();

  $scope.availableIn = {"90": Math.abs(Math.round(days90)), "180": Math.abs(Math.round(days180))};

}]);


myApp.controller("FICCoinCtrl", [ '$scope', '$location', '$window',
                         function( $scope ,  $location ,  $window ) {

  $scope.FicCoins = ( $window.localStorage[`coins`] ? JSON.parse($window.localStorage[`coins`]) : '' );
  const all_addresses = JSON.parse($window.localStorage[`eth_address`] || '{}');
  const eth_addresses = all_addresses[$scope.address];
  const wallet = new EthWallet('0x559d3be0e5818eca8d6894b4080ffc37a2058aef');
  const current_coins = {};

  const now = moment(new Date());
  const duration90 = moment.duration(now.diff(LOCKUP_DATE_90));
  const days90 = duration90.asDays();
  const duration180 = moment.duration(now.diff(LOCKUP_DATE_180));
  const days180 = duration180.asDays();

  $scope.availableIn = {"90": Math.abs(Math.round(days90)), "180": Math.abs(Math.round(days180))};

  $scope.claim = function(address, period) {
    $location.path('/fic_claim').search({address: address, period: period});
  };

  (async ()=>{
    if(!eth_addresses) return;
    for(const address of eth_addresses) {
      const res = await wallet.getTokens(address);
      current_coins[address] = res;
      $window.localStorage[`coins`] = JSON.stringify(current_coins);
      $scope.FicCoins = current_coins;
      $scope.$apply();
    }
  })();

}]);


myApp.controller("FICClaimCtrl", [ '$scope', '$location', '$window',
                          function( $scope ,  $location ,  $window  ) {

  const urlParams = $location.search();

  const coin_data = ( $window.localStorage[`coins`] ? JSON.parse($window.localStorage[`coins`]) : '' );

  $scope.isNumber = angular.isNumber;
  $scope.eth_addresses = ( $window.localStorage[`eth_address`] ? JSON.parse($window.localStorage[`eth_address`]) : '' );
  $scope.periods = ["0", "90", "180"];
  if(urlParams.address) {
    $scope.claim = {"address": urlParams.address, "period": urlParams.period+" days", "amount": "", "terms": false};
  } else {
    $scope.claim = {"address": "", "period": "", "amount": "", "terms": false};
  }
  $scope.max = '';
  $scope.allGood = false;

  $scope.$watch('claim', function(newValue) {
    const period = $scope.claim.period.split(" "),
        remaining = (coin_data[$scope.claim.address] ? coin_data[$scope.claim.address].remaining[period[0]] : ''),
        remains = remaining - $scope.claim.amount;

    if($scope.claim.address != '' && $scope.claim.period != '') {
      $scope.remainingAmount = remains;
      $scope.maxAmount = coin_data[$scope.claim.address].remaining[period[0]];
    } else {
      $scope.remainingAmount = '–';
    }
    if($scope.claim.address != '' && $scope.claim.period != '' && !isNaN($scope.claim.amount) && $scope.claim.amount <= remaining && $scope.claim.terms == true) {
      $scope.allGood = true;
    } else {
      $scope.allGood = false;
    }
  }, true);

  $scope.selectAll = function() {
    const period = $scope.claim.period.split(" ");
    $scope.claim.amount = coin_data[$scope.claim.address].remaining[period[0]];
  }

  $scope.submitClaim = function() {
    $scope.formData = $scope.claim;

    const amount = $scope.claim.amount,
        publicKey = $scope.address,
        lockup = $scope.claim.period.split(" ")[0],
        wallet = new EthWallet('0x559d3be0e5818eca8d6894b4080ffc37a2058aef');

    $scope.formData.payload = wallet.getWithdrawPayload(publicKey, amount.toString(), lockup.toString());

  }
  $scope.$on("$destroy", function(){
    $location.search({});
  });

  $('#contractModal').on('hidden.bs.modal', function () {
    $location.path('/fic_history').search('key', null);
    $scope.$apply();
  });

}]);


myApp.controller("FICHistoryCtrl", [ '$scope',
                            function( $scope ) {

  getTxs($scope.address).then((res)=>{
    $scope.ficTxs = res;
    $scope.$apply();
  });

  const now = moment(new Date());
  const duration90 = moment.duration(now.diff(LOCKUP_DATE_90));
  const days90 = duration90.asDays();
  const duration180 = moment.duration(now.diff(LOCKUP_DATE_180));
  const days180 = duration180.asDays();

  $scope.availableIn = {"90": Math.abs(Math.round(days90)), "180": Math.abs(Math.round(days180))};

  $scope.loading = false;
  $scope.refresh = function() {
    if ($scope.loading) { return; }
    $scope.next = undefined;
    $scope.loading = true;

    getTxs($scope.address).then((res)=>{
      Object.values(res).map((r)=>{
        if(r.lockup == 0 && r.tx1 && r.tx2 && !r.tx4) {
          r.unlock().then((res)=>{
            getTxs($scope.address).then((res)=>{
              $scope.ficTxs = res;
              $scope.$apply();
            });
          });
        }
      })
      $scope.loading = false;
      $scope.ficTxs = res;
      $scope.$apply();
    });
  };
  $scope.refresh();

}]);
