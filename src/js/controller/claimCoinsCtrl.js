myApp.controller("claimCoinsCtrl", [ '$rootScope', '$scope', '$location', '$window', 'FicIcoFactory',
                           function(  $rootScope ,  $scope ,  $location ,  $window ,  FicIcoFactory  ) {

  const allAddresses = JSON.parse($window.localStorage[`whitelist`]);

  (async () => {
    await FicIcoFactory.initPromise;
    $scope.contractAddress = FicIcoFactory.ethSmartContract._address;
    $scope.isNumber = angular.isNumber;
    $scope.periods = ["0", "90", "180"];
    $scope.max = '';
    $scope.allGood = false;
    $scope.claiming = false;
    $scope.minAmount = 2000;

    $scope.$apply();
  })()

  $scope.$watch('details', function(newValue){
    if(newValue.dist != undefined) {
      $scope.ethAddresses = allAddresses[newValue.dist][$rootScope.address];
      $scope.claim = {"address": newValue.address, "period": newValue.period+" days", "amount": "", "terms": false};
    }
  }, true);

  $scope.$watch('claim', function(newValue) {
    if(newValue != undefined) {
      let period = $scope.claim.period.split(" ")[0],
          addresses = $scope.ethAddresses;

      let currentAddress = addresses.filter(function(obj){
        return obj.address == newValue.address
      });
      let currentCoins = currentAddress[0].coins,
          remaining = currentCoins.remaining[period],
          remains = remaining - newValue.amount;

      if(newValue.address != '' && newValue.period != '') {
        $scope.remainingAmount = remains;
        $scope.maxAmount = remaining;
      } else {
        $scope.remainingAmount = '–';
        $scope.maxAmount = 0;
      }
      if(newValue.address != '' && newValue.period != '' && !isNaN(newValue.amount) && newValue.amount <= remaining && newValue.amount >= $scope.minAmount && newValue.terms == true) {
        $scope.allGood = true;
      } else {
        $scope.allGood = false;
      }
    }

  }, true);

  $scope.selectAll = () => {
    let period = $scope.claim.period.split(" ")[0];
    let addresses = $scope.ethAddresses;
    let currentAddress = addresses.filter(function(obj){
      return obj.address == $scope.claim.address
    });
    let currentCoins = currentAddress[0].coins;
    $scope.claim.amount = parseInt(currentCoins.remaining[period]);
  }

  $scope.submitClaim = async () => {
    $scope.claiming = true;
    $scope.formData = $scope.claim;

    const amount = $scope.claim.amount;
    const publicKey = $rootScope.address;
    const lockup = $scope.claim.period.split(" ")[0];

    console.log($scope.formData.payload)
    $scope.formData.payload = 'creating...'
    console.log($scope.formData.payload)
    const payload = await FicIcoFactory.getEthWithdrawPayload(publicKey, amount.toString(), lockup.toString());
    $scope.formData.payload = payload;
    console.log($scope.formData.payload)
    $scope.$apply();
    console.log($scope.formData.payload)
  }
  $scope.openMyEtherWallet = () => {
    require('electron').shell.openExternal(`https://www.myetherwallet.com/?to=${$scope.contractAddress}&sendMode=ether&value=0&data=${$scope.formData.payload}#send-transaction`);
  }
  $scope.$on("$destroy", () => {
    $location.search({});
  });

  $('#contractModal').on('hidden.bs.modal', function () {
    $location.path('/fic_history').search('key', null);
    $scope.$apply();
  });

}]);
