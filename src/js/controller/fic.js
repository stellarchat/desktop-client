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
    },
    txs: [
      {
        timestamp: '1234',
        txid: 'asdf',
        pk: 'GABC',
        nonce: 1,
        lockup: '0',  // or 90 or 180
        amount: '120000000',
      },
      {
        timestamp: '1234',
        txid: 'asdf',
        pk: 'GABC',
        nonce: 2,
        lockup: '0',  // or 90 or 180
        amount: '120000000',
      }
    ],
  };
  return fics;
}

myApp.controller("EthereumAddressCtrl", [ '$scope', '$rootScope', '$window', 'StellarApi', 'FedNameFactory', 'AuthenticationFactory', function($scope, $rootScope, $window, StellarApi, FedNameFactory, AuthenticationFactory) {

  $scope.eth_address = '';
  $scope.invalid_eth = false;
  $scope.eth_addresses = ( $window.localStorage[`eth_address`] ? JSON.parse($window.localStorage[`eth_address`]) : '' );

  $scope.addEthAdrress = function(eth_address) {
    var currentAddresses = {},
        localAddresses = {},
        walletAdresses = [],
        allAdresses = [],
        coin_data = {};

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
    }
    else {
      $scope.invalid_eth = true;
      console.error('Invalid Ethereum address.');
    }
  }

  $scope.removeEthAdrress = function(eth_address) {
    var currentAddresses = JSON.parse($window.localStorage[`eth_address`]),
        walletAdresses = currentAddresses[$scope.address],
        addressIndex = walletAdresses.indexOf(eth_address),
        newAddresses = {};

    delete walletAdresses[addressIndex];
    walletAdresses.splice(addressIndex, 1);
    if(walletAdresses.length == 0) {
      $window.localStorage.removeItem(`eth_address`);
    } else {
      newAddresses[$scope.address] = walletAdresses;
      $window.localStorage[`eth_address`] = JSON.stringify(newAddresses);
    }
    $scope.eth_addresses = ( $window.localStorage[`eth_address`] ? JSON.parse($window.localStorage[`eth_address`]) : '' );
  }

}]);


myApp.controller("FicCoinCtrl", [ '$scope', '$rootScope', '$window', 'StellarApi', 'FedNameFactory', 'AuthenticationFactory', function($scope, $rootScope, $window, StellarApi, FedNameFactory, AuthenticationFactory) {

  var coin_data = ( $window.localStorage[`coins`] ? JSON.parse($window.localStorage[`coins`]) : '' );
  $scope.FicCoins = coin_data;


  var lockupDate = moment("2018-05-15 23:00+00:00"),
      lockup90 = moment("2018-05-15 23:00+00:00").add(90, 'days'),
      lockup180 = moment("2018-05-15 23:00+00:00").add(180, 'days'),
      now = moment(new Date()),
      duration = moment.duration(now.diff(lockup90)),
      days = duration.asSeconds();
      console.log(days);


  $scope.availableIn = function(days) {

  }
  console.log(lockup180);
}]);


myApp.controller("FicClaimCtrl", [ '$scope', '$rootScope', '$window', 'StellarApi', 'FedNameFactory', 'AuthenticationFactory', function($scope, $rootScope, $window, StellarApi, FedNameFactory, AuthenticationFactory) {

  var coin_data = ( $window.localStorage[`coins`] ? JSON.parse($window.localStorage[`coins`]) : '' );

  $scope.isNumber = angular.isNumber;
  $scope.eth_addresses = ( $window.localStorage[`eth_address`] ? JSON.parse($window.localStorage[`eth_address`]) : '' );
  $scope.periods = ["0", "90", "180"];
  $scope.claim = {"address":"", "period": "", "amount": "", "terms": false};
  $scope.max = '';
  $scope.allGood = false;

  $scope.$watch('claim', function(newValue) {
    var period = $scope.claim.period.split(" "),
        remaining = (coin_data[$scope.claim.address].remaining[period[0]] ? coin_data[$scope.claim.address].remaining[period[0]] : ''),
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

}]);
