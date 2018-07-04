/* global $, angular, moment, myApp, require */

myApp.controller("FICAddressCtrl", [ '$scope', '$window', 'FicIcoFactory',
                            function( $scope ,  $window ,  FicIcoFactory ) {

  $scope.eth_address = '';
  $scope.invalid_eth = false;
  $scope.addressInvalid = true;
  $scope.eth_addresses = ( $window.localStorage[`eth_address`] ? JSON.parse($window.localStorage[`eth_address`]) : '' );
  $scope.currentEthAddressCoins = '';

  $scope.addEthAdrress = async (eth_address) => {
    const currentAddresses = {};
    const allAdresses = [];
    const funcAddress = eth_address;

    if($window.localStorage[`eth_address`]) {
      currentAddresses[`${$scope.address}`] = [`${JSON.parse($window.localStorage[`eth_address`])}`];
    }

    if (FicIcoFactory.web3.utils.isAddress(eth_address)) {
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

      const current_coins = ( $window.localStorage[`coins`] ? JSON.parse($window.localStorage[`coins`] ) : {});

      const res = await FicIcoFactory.getEthTokens(funcAddress)
      current_coins[funcAddress] = res;
      $window.localStorage[`coins`] = JSON.stringify(current_coins);
      $scope.currentEthAddress = funcAddress;
      $scope.currentEthAddressCoins = res;
      $scope.addressInvalid = false;
      $scope.$apply();
    } else {
      $scope.invalid_eth = true;
      console.error('Invalid Ethereum address.');
    }
  }

  const now = moment(new Date());
  const duration90 = moment.duration(now.diff(FicIcoFactory.LOCKUP_DATE_90));
  const days90 = duration90.asDays();
  const duration180 = moment.duration(now.diff(FicIcoFactory.LOCKUP_DATE_180));
  const days180 = duration180.asDays();

  $scope.availableIn = {"90": Math.abs(Math.round(days90)), "180": Math.abs(Math.round(days180))};

}]);


myApp.controller("FICCoinCtrl", [ '$scope', '$location', '$window', 'FicIcoFactory',
                         function( $scope ,  $location ,  $window ,  FicIcoFactory ) {

  $scope.FicCoins = ( $window.localStorage[`coins`] ? JSON.parse($window.localStorage[`coins`]) : '' );
  const all_addresses = JSON.parse($window.localStorage[`eth_address`] || '{}');
  const eth_addresses = all_addresses[$scope.address];
  const current_coins = {};

  const now = moment(new Date());
  const duration90 = moment.duration(now.diff(FicIcoFactory.LOCKUP_DATE_90));
  const days90 = duration90.asDays();
  const duration180 = moment.duration(now.diff(FicIcoFactory.LOCKUP_DATE_180));
  const days180 = duration180.asDays();

  $scope.availableIn = {"90": Math.abs(Math.round(days90)), "180": Math.abs(Math.round(days180))};

  $scope.claim = function(address, period) {
    $location.path('/fic_claim').search({address: address, period: period});
  };

  (async ()=>{
    if(!eth_addresses) return;
    for(const address of eth_addresses) {
      const res = await FicIcoFactory.getEthTokens(address);
      current_coins[address] = res;
      $window.localStorage[`coins`] = JSON.stringify(current_coins);
      $scope.FicCoins = current_coins;
      $scope.$apply();
    }
  })();

}]);


myApp.controller("FICClaimCtrl", [ '$scope', '$location', '$window', 'FicIcoFactory',
                          function( $scope ,  $location ,  $window ,  FicIcoFactory  ) {

  const urlParams = $location.search();

  const coin_data = ( $window.localStorage[`coins`] ? JSON.parse($window.localStorage[`coins`]) : '' );

  $scope.contractAddress = '0x559d3be0e5818eca8d6894b4080ffc37a2058aef';
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

  $scope.selectAll = () => {
    const period = $scope.claim.period.split(" ");
    $scope.claim.amount = coin_data[$scope.claim.address].remaining[period[0]];
  }

  $scope.submitClaim = async () => {
    $scope.formData = $scope.claim;

    const amount = $scope.claim.amount;
    const publicKey = $scope.address;
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
