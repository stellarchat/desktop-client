/* global myApp */
var ethereum_address = require('ethereum-address');
var moment = require('moment');
function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
function getFICs(eth_address) {
  var total = [getRandomInt(999999), getRandomInt(999999), getRandomInt(999999)];
  var claimed = [getRandomInt(99999), getRandomInt(99999), getRandomInt(99999)];
  var fics = {
    total: {
      '0': total[0],
      '90': total[1],
      '180': total[2],
    },
    remaining: {
      '0': total[0] - claimed[0],
      '90': total[1] - claimed[1],
      '180': total[2] - claimed[2],
    },
    claimed: {
      '0': claimed[0],
      '90': claimed[1],
      '180': claimed[2],
    }
  };
  return fics;
}
function getTxs(address) {
  return {
    'GC7JIV3QSYIAFBOJOICVG2HEQ5KJFJSVSMHN2ANYS7OQPI76O5POH4L1': {
      no: '0',
      ethAddressPart: '152eA0B360Fb1d5E333124',
      lockup: '90',
      nonce: '0',
      amount: '45',
      tx1: {
        timestamp: '2018-05-24T07:42:11Z',
        txid: 'ee052388795bb99f7945d8b62a8760f44369a5fe9a25cd5819d821f9bff43951'
      },
      tx2: {
        timestamp: '2018-05-24T07:42:17Z',
        txid: '9bcf9f769bf72219844da1fe3a98c8f7bbb3477534f10ae588ae0b503f7f4ab5'
      },
      tx3: {
        timestamp: '2018-05-24T07:42:22Z',
        txid: '71f62e2787d7d02d04add14b631358429d46ce1af3074ff81fffda503b55ad33'
      },
      tx4: {
        timestamp: '2018-05-24T07:42:26Z',
        txid: '930ade63544b3aa48a43bef91f4358c379a1629788b700a644a113cd1662a03c'
      }
    },
    'GC7JIV3QSYIAFBOJOICVG2HEQ5KJFJSVSMHN2ANYS7OQPI76O5POH4L2': {
      no: '1',
      ethAddressPart: '252eA0B360Fb1d5E333124',
      lockup: '90',
      nonce: '1',
      amount: '100',
      tx1: {
        timestamp: '2018-05-24T07:42:11Z',
        txid: 'ee052388795bb99f7945d8b62a8760f44369a5fe9a25cd5819d821f9bff43951'
      },
      tx2: undefined,
      tx3: undefined,
      tx4: undefined
    },
    'GDTJR2ZVXO6K4ZZN3ZMYONZ2RIXR463MGEDVID4NLCNZWE5UJL2FWNK3': {
      no: '2',
      ethAddressPart: '352eA0B360Fb1d5E333124',
      lockup: '180',
      nonce: '2',
      amount: '46',
      tx1: {
        timestamp: '2018-05-24T07:42:32Z',
        txid: 'b958d7187f920edabcd359ef54de13d4021af814bf72bba34f33330bc3ca94cf'
      },
      tx2: {
        timestamp: '2018-05-24T07:42:41Z',
        txid: '9e9eb7d549504f85e861ba873f67dd42a6e98e1c06baca78a58f4c371edb53d7'
      },
      tx3: undefined,
      tx4: {
        timestamp: '2018-05-24T07:42:52Z',
        txid: 'e1bbd1455bc07fdf1dae9280c45e9ef1de879a8cc818a0c351c2365cbf005820'
      }
    },
    'GC7JIV3QSYIAFBOJOICVG2HEQ5KJFJSVSMHN2ANYS7OQPI76O5POH4L4': {
      no: '3',
      ethAddressPart: '452eA0B360Fb1d5E333124',
      lockup: '180',
      nonce: '3',
      amount: '500',
      tx1: {
        timestamp: '2018-05-24T07:42:11Z',
        txid: 'ee052388795bb99f7945d8b62a8760f44369a5fe9a25cd5819d821f9bff43951'
      },
      tx2: {
        timestamp: '2018-05-24T07:42:41Z',
        txid: '9e9eb7d549504f85e861ba873f67dd42a6e98e1c06baca78a58f4c371edb53d7'
      },
      tx3: undefined,
      tx4: undefined
    }
  };
}

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

      var eth_addresses = JSON.parse($window.localStorage[`eth_address`]);
      for(var addr in eth_addresses) {
        var eth_address = eth_addresses[addr];
        for(var single in eth_address) {
          coin_data[eth_address[single]] = getFICs(eth_addresses[addr]);
        }
      }
      $window.localStorage[`coins`] = JSON.stringify(coin_data);
      $scope.currentEthAddress = funcAddress;
      $scope.currentEthAddressCoins = coin_data[funcAddress];
      $scope.addressInvalid = false;
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
    console.log(address, period);
    $location.path('/fic_claim').search({address: address, period: period});
  }
}]);


myApp.controller("FICClaimCtrl", [ '$scope', '$location', '$rootScope', '$window', 'StellarApi', 'FedNameFactory', 'AuthenticationFactory', function($scope, $location, $rootScope, $window, StellarApi, FedNameFactory, AuthenticationFactory) {

  var urlParams = $location.search();
  console.log(urlParams);

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
  }
  $scope.$on("$destroy", function(){
    $location.search({});
  });

}]);


myApp.controller("FICHistoryCtrl", [ '$scope', '$location', '$rootScope', '$window', 'StellarApi', 'FedNameFactory', 'AuthenticationFactory', function($scope, $location, $rootScope, $window, StellarApi, FedNameFactory, AuthenticationFactory) {

  $scope.ficTxs = getTxs($scope.address);
  console.log($scope.ficTxs);

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
