/* global myApp */

let horizon = new StellarSdk.Server('https://horizon-testnet.stellar.org');  // Testing on testnet
StellarSdk.Network.useTestNetwork();

const MIN_AMOUNT = 31;  // TODO doublecheck min amount
const FIC_DISTRIBUTOR = 'GCQJHZKTAO6P3PCIHPKJ55ZC25MS54OIIM7B6YBYH2Y54RFN3IL6WV54';

const Unlock = (ficAddress, lockupAddress) => async () => {
  const SUBMIT = async (te) => horizon.submitTransaction(te).catch((e)=>e).then((res)=>res);

  let lockupAccount;
  try {
    lockupAccount = await horizon.loadAccount(lockupAddress);
  } catch(e) {
    if(e instanceof NotFoundError) throw new Error(`Already unlocked (${lockupAddress})`);
    throw e;
  }
  console.log(`Lockup account ${lockupAddress} sequence & balance:`, lockupAccount.sequenceNumber(), lockupAccount.balances)

  const prete1 = new TransactionBuilder(lockupAccount/* , { timebounds: {minTime, maxTime} } */)  // for testing timebounds are ignored
    .addOperation(Operation.createAccount({
      source: lockupAddress,
      destination: ficAddress,
      startingBalance: String(MIN_AMOUNT),
    }))
    .build();

  const prete2 = new TransactionBuilder(lockupAccount/* , { timebounds: {minTime, maxTime} } */)  // for testing timebounds are ignored
    .addOperation(Operation.accountMerge({
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
  //console.log(lockupAddressMap);

  const userLockups = Object.keys(lockupAddressMap).filter((key)=>key.slice(0,56) === ficAddress);
  const responses = {};

  for(const key of userLockups) {

    const lockupAddress = Buffer.from(lockupAddressMap[key], 'base64').toString();

    //console.log(lockupAddress);
    const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${lockupAddress}/transactions?order=desc&limit=4`);
    const json = await res.json();
    const transactions = json._embedded.records;
    transactions.forEach((transaction) => transaction.envelope = new StellarSdk.Transaction(transaction.envelope_xdr));

    console.log(transactions)

    const creationTransation = transactions.find((tx)=>tx.source_account==FIC_DISTRIBUTOR && tx.envelope.operations.find((op)=>op.type === 'createAccount'))
    const setupTransaction = transactions.find((tx)=>tx.source_account==FIC_DISTRIBUTOR && tx.envelope.operations.find((op)=>op.type === 'setOptions'));
    const createTransaction = transactions.find((tx)=>tx.source_account==lockupAddress && tx.envelope.operations.find((op)=>op.type === 'createAccount'));
    const mergeTransaction = transactions.find((tx)=>tx.source_account==lockupAddress && tx.envelope.operations.find((op)=>op.type === 'accountMerge'));

    responses[lockupAddress] = {
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

  }

  return responses;
};

var abi = [{'constant':true,'inputs':[{'name':'_holder','type':'address'}],'name':'getBalances','outputs':[{'name':'','type':'uint256'},{'name':'','type':'uint256'},{'name':'','type':'uint256'}],'payable':false,'stateMutability':'view','type':'function'}, {'anonymous':false,'inputs':[{'indexed':true,'name':'who','type':'address'},{'indexed':true,'name':'beneficiary','type':'address'},{'indexed':true,'name':'publicKey','type':'bytes32'},{'indexed':false,'name':'amount','type':'uint256'},{'indexed':false,'name':'lockup','type':'uint8'}],'name':'Withdraw','type':'event'}];

function EthWallet(crowdsaleAddress, web3) {
  this.web3 = web3 ? web3 : this.createWeb3();
  this.crowdsaleAddress = crowdsaleAddress;
  this.crowdsale = new this.web3.eth.Contract(abi, this.crowdsaleAddress);
}

EthWallet.prototype.createWeb3 = function() {
  return new Web3('https://ropsten.infura.io/3UOYQzA23QIkrf3lZUEX');
};

EthWallet.prototype.getWithdrawPayload = function(publicKey, amount, lockup) {
  try {
    var utils = this.web3.utils;
    var methodHash = utils.sha3('withdraw(bytes32,uint256,uint8)').slice(2, 10);
    var pk = StellarSdk.StrKey.decodeEd25519PublicKey(publicKey).toString('hex');
    var tokens = this.bn(utils.toWei(amount, 'ether'));

    var hexData = [
      methodHash,
      pk,
      utils.leftPad(tokens.toString(16), 64, 0),
      utils.leftPad(this.bn(lockup).toString(16), 64, 0)
    ].join('');

    return '0x' + hexData;
  } catch (e) {
    console.error(e);
  }
};

EthWallet.prototype.bn = function(value) {
  return this.web3.utils.toBN(value);
};

EthWallet.prototype.getTokens = function(address) {
  var self = this;
  return Promise.all([
    this.crowdsale.methods.getBalances(address).call(),
    this.crowdsale.getPastEvents('Withdraw', {
      fromBlock: 0,
      toBlock:'latest',
      filter: {beneficiary: address}
    })
  ]).then(function(data) {
    var balances = data[0];
    var events = data[1];

    var _0 = self.bn(balances[0]).div(self.bn(1e18)).toString();
    var _90 = self.bn(balances[1]).div(self.bn(1e18)).toString();
    var _180 = self.bn(balances[2]).div(self.bn(1e18)).toString();

    var result = {
      total: {
        '0': _0,
        '90': _90,
        '180': _180
      },
      claimed: {'0': 0, '90': 0, '180': 0},
      remaining : {
        '0': _0,
        '90': _90,
        '180': _180
      },
      txs: []
    };

    var claimed = result.claimed;
    var total = result.total;

    for (var i = 0, n = events.length; i < n; i++) {
      var tx = self._createTxFromEvent(events[i]);
      var amount = self.bn(tx.amount);
      claimed[tx.lockup] = self.bn(claimed[tx.lockup]).add(amount).toString();
      total[tx.lockup] = self.bn(total[tx.lockup]).add(amount).toString();
      result.txs.push(tx);
    }

    return result;
  });
};

EthWallet.prototype._createTxFromEvent = function(event) {
  var eventValues = event.returnValues;
  var tx = Object.create(null);
  tx.who = eventValues.who;
  tx.beneficiary = eventValues.beneficiary;
  tx.publicKey = StellarSdk.StrKey.encodeEd25519PublicKey(this.web3.utils.hexToBytes(eventValues.publicKey));
  tx.amount = this.bn(eventValues.amount).div(this.bn(1e18)).toString();
  tx.lockup = eventValues.lockup;
  tx.txHash = event.transactionHash;
  return tx;
};

var ethereum_address = require('ethereum-address');
var moment = require('moment');

myApp.controller("FICAddressCtrl", [ '$scope', '$rootScope', '$window', 'StellarApi', 'FedNameFactory', 'AuthenticationFactory', function($scope, $rootScope, $window, StellarApi, FedNameFactory, AuthenticationFactory) {

  $scope.eth_address = '';
  $scope.invalid_eth = false;
  $scope.addressInvalid = true;
  $scope.eth_addresses = ( $window.localStorage[`eth_address`] ? JSON.parse($window.localStorage[`eth_address`]) : '' );
  $scope.currentEthAddressCoins = '';

  $scope.addEthAdrress = function(eth_address) {
    var currentAddresses = {},
        localAddresses = {},
        walletAdresses = [],
        allAdresses = [],
        coin_data = {},
        funcAddress = eth_address;

    if($window.localStorage[`eth_address`]) {
      currentAddresses[`${$scope.address}`] = [`${JSON.parse($window.localStorage[`eth_address`])}`];
    }

    if (ethereum_address.isAddress(eth_address)) {
      console.log('Valid ethereum address.');
      if($window.localStorage[`eth_address`]) {
        localAddresses = JSON.parse($window.localStorage[`eth_address`]);
        walletAdresses = localAddresses[$scope.address];
        for(var addr in walletAdresses) {
          allAdresses.push(walletAdresses[addr]);
        }
      }
      allAdresses.push(eth_address);
      currentAddresses[$scope.address] = allAdresses;
      $window.localStorage[`eth_address`] = JSON.stringify(currentAddresses);
      $scope.eth_address = '';
      $scope.invalid_eth = false;
      $scope.eth_addresses = JSON.parse($window.localStorage[`eth_address`]);

      var wallet = new EthWallet('0x0345547ae60f65c16f183a654a98bd36090180ad'),
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

  var lockupDate = moment("2018-05-15 23:00+00:00"),
      lockup90 = moment("2018-05-15 23:00+00:00").add(90, 'days'),
      lockup180 = moment("2018-05-15 23:00+00:00").add(180, 'days'),
      now = moment(new Date()),
      duration90 = moment.duration(now.diff(lockup90)),
      days90 = duration90.asDays(),
      duration180 = moment.duration(now.diff(lockup180)),
      days180 = duration180.asDays();

  $scope.availableIn = {"90": Math.abs(Math.round(days90)), "180": Math.abs(Math.round(days180))};

}]);


myApp.controller("FICCoinCtrl", [ '$scope', '$location', '$rootScope', '$window', 'StellarApi', 'FedNameFactory', 'AuthenticationFactory', function($scope, $location, $rootScope, $window, StellarApi, FedNameFactory, AuthenticationFactory) {

  var coin_data = ( $window.localStorage[`coins`] ? JSON.parse($window.localStorage[`coins`]) : '' );
  $scope.FicCoins = coin_data;
  var all_addresses = JSON.parse($window.localStorage[`eth_address`]),
      eth_addresses = all_addresses[$scope.address],
      wallet = new EthWallet('0x0345547ae60f65c16f183a654a98bd36090180ad'),
      current_coins = {};

  (async ()=>{
    for(const address of eth_addresses) {
      const res = await wallet.getTokens(address);
      current_coins[address] = res;
      $window.localStorage[`coins`] = JSON.stringify(current_coins);
      $scope.FicCoins = current_coins;
      $scope.$apply();
    }
  })();

  var lockupDate = moment("2018-05-15 23:00+00:00"),
      lockup90 = moment("2018-05-15 23:00+00:00").add(90, 'days'),
      lockup180 = moment("2018-05-15 23:00+00:00").add(180, 'days'),
      now = moment(new Date()),
      duration90 = moment.duration(now.diff(lockup90)),
      days90 = duration90.asDays(),
      duration180 = moment.duration(now.diff(lockup180)),
      days180 = duration180.asDays();

  $scope.availableIn = {"90": Math.abs(Math.round(days90)), "180": Math.abs(Math.round(days180))};

  $scope.claim = function(address, period) {
    $location.path('/fic_claim').search({address: address, period: period});
  }

}]);


myApp.controller("FICClaimCtrl", [ '$scope', '$location', '$rootScope', '$window', 'StellarApi', 'FedNameFactory', 'AuthenticationFactory', function($scope, $location, $rootScope, $window, StellarApi, FedNameFactory, AuthenticationFactory) {

  var urlParams = $location.search();

  var coin_data = ( $window.localStorage[`coins`] ? JSON.parse($window.localStorage[`coins`]) : '' );

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
    var period = $scope.claim.period.split(" "),
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
    var period = $scope.claim.period.split(" ");
    $scope.claim.amount = coin_data[$scope.claim.address].remaining[period[0]];
  }

  $scope.submitClaim = function() {
    $scope.formData = $scope.claim;

    var amount = $scope.claim.amount,
        publicKey = $scope.address,
        lockup = $scope.claim.period.split(" ")[0],
        wallet = new EthWallet('0x0345547ae60f65c16f183a654a98bd36090180ad');

    $scope.formData.payload = wallet.getWithdrawPayload(publicKey, amount.toString(), lockup.toString());

  }
  $scope.$on("$destroy", function(){
    $location.search({});
  });

}]);


myApp.controller("FICHistoryCtrl", [ '$scope', '$location', '$rootScope', '$window', 'StellarApi', 'FedNameFactory', 'AuthenticationFactory', function($scope, $location, $rootScope, $window, StellarApi, FedNameFactory, AuthenticationFactory) {

  getTxs($scope.address).then((res)=>{
    $scope.ficTxs = res;
    $scope.$apply();
  });

  var lockupDate = moment("2018-05-15 23:00+00:00"),
      lockup90 = moment("2018-05-15 23:00+00:00").add(90, 'days'),
      lockup180 = moment("2018-05-15 23:00+00:00").add(180, 'days'),
      now = moment(new Date()),
      duration90 = moment.duration(now.diff(lockup90)),
      days90 = duration90.asDays(),
      duration180 = moment.duration(now.diff(lockup180)),
      days180 = duration180.asDays();

  $scope.availableIn = {"90": Math.abs(Math.round(days90)), "180": Math.abs(Math.round(days180))};

  $scope.loading = false;
  $scope.refresh = function() {
    if ($scope.loading) { return; }
    $scope.next = undefined;
    $scope.loading = true;

    getTxs($scope.address).then((res)=>{
      $scope.loading = false;
      $scope.ficTxs = res;
      $scope.$apply();
    });

  };
  $scope.refresh();

}]);
