/* global $, angular, moment, myApp, require */

myApp.controller("FICCoinCtrl", ['$rootScope', '$route', '$scope', '$location', '$window', 'FicIcoFactory',
                        function( $rootScope ,  $route ,  $scope ,  $location ,  $window ,  FicIcoFactory ) {

  $scope.loadingFicIco = true;
  $scope.readOnlyState = true;
  $scope.stateError = undefined;
  $scope.details = {};
  let ficAddress, ficDistributor, state, comment

  (async () => {
    try {
      const r = await FicIcoFactory.initPromise;
      if(!r) throw 'rip'
      state = await FicIcoFactory.state;
      comment = await FicIcoFactory.comment;
      ficAddress = $rootScope.address;
      ficDistributor = await FicIcoFactory.ficDistributorAddress;

      setState(state);
      getLockupPeriods();
      updateCoins();
      $scope.FicCoins = getLocalCoins();

      $scope.$apply();
    } catch (e) {
      $scope.stateError = `ICO system end-point not accessible. Please check your connection.`;
      $scope.$apply();
      console.error(e);
    }
  })()


  function setState(state) {
    if(state == 'pending') {
      $scope.stateError = `ICO system end-point not accessible. State: ${state}, comments: ${comment}`;
    }
    if(state == 'paused' || state == 'finished') {
      $scope.loadingFicIco = false;
      $scope.stateError = `Currently in READ-ONLY mode. State: ${state}, comments: ${comment}`;
    }
    if(state == 'active') {
      $scope.loadingFicIco = false;
      $scope.readOnlyState = false;
    }
  }

  function getLockupPeriods() {
    const now = moment(new Date());
    const duration90 = moment.duration(now.diff(FicIcoFactory.LOCKUP_DATE_90));
    const days90 = duration90.asDays();
    const duration180 = moment.duration(now.diff(FicIcoFactory.LOCKUP_DATE_180));
    const days180 = duration180.asDays();
    $scope.availableIn = {"90": Math.abs(Math.round(days90)), "180": Math.abs(Math.round(days180))};
  }

  function getLocalCoins() {
    if($window.localStorage[`whitelist`]) {
      const allAddresses = JSON.parse($window.localStorage[`whitelist`]);
      return allAddresses[ficDistributor][ficAddress];
    } else {
      return false;
    }

  }

  async function updateCoins() {
    if($window.localStorage[`whitelist`]) {
      const allAddresses = JSON.parse($window.localStorage[`whitelist`]);
      let allCoins = [];
      allEthAddresses = allAddresses[ficDistributor][ficAddress];

      for(const address of allEthAddresses) {
        const ethAddress = address.address;
        const newCoins = await FicIcoFactory.getEthTokens(ethAddress);
        allCoins.push({address: address.address, coins: newCoins});
        let newRow = {
          [ficAddress]: allCoins
        }
        allAddresses[ficDistributor] = newRow;
        $window.localStorage[`whitelist`] = JSON.stringify(allAddresses);
        console.log(allAddresses);
      }
    }
  }



  $scope.claimCoins = function(address, period) {
    $scope.details = {
      address: address,
      period: period,
      dist: ficDistributor
    };
    $(`#claimCoinsModal`).modal();
  };


  $scope.addEthAddress = function() {
    $(`#addEthAddressModal`).modal();
  }
  $scope.clearLocalData = function() {
    $window.localStorage.removeItem('whitelist');
    $route.reload();
  }
  $scope.removeEthAddress = function(address) {
    let currentAddresses = JSON.parse($window.localStorage[`whitelist`]);
    let currentAccountAddresses = currentAddresses[ficDistributor][ficAddress];

    let newCoins = currentAccountAddresses.filter(function(obj) {
      return obj.address !== address;
    });
    currentAddresses[ficDistributor][ficAddress] = newCoins;

    $window.localStorage[`whitelist`] = JSON.stringify(currentAddresses);
    $route.reload();
  }

}]);


myApp.controller("FICHistoryCtrl", [ '$scope', 'FicIcoFactory',
                            function( $scope ,  FicIcoFactory ) {

  FicIcoFactory.getFicTxs($scope.address).then((res)=>{
    $scope.ficTxs = res;
    $scope.$apply();
  });

  const now = moment(new Date());
  const duration90 = moment.duration(now.diff(FicIcoFactory.LOCKUP_DATE_90));
  const days90 = duration90.asDays();
  const duration180 = moment.duration(now.diff(FicIcoFactory.LOCKUP_DATE_180));
  const days180 = duration180.asDays();

  $scope.availableIn = {"90": Math.abs(Math.round(days90)), "180": Math.abs(Math.round(days180))};

  $scope.loading = false;
  $scope.refresh = async () => {
    if ($scope.loading) { return; }
    $scope.next = undefined;
    $scope.loading = true;

    FicIcoFactory.getFicTxs($scope.address).then((res)=>{
      Object.values(res).map((r)=>{
        if(r.lockup == 0 && r.tx1 && r.tx2 && !r.tx4) {
          r.unlock().then((res)=>{
            FicIcoFactory.getFicTxs($scope.address).then((res)=>{
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
