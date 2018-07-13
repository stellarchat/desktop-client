/* global $, myApp, StellarSdk */

myApp.controller("TrustCtrl", ['$scope', '$rootScope', 'StellarApi',
                      function( $scope ,  $rootScope ,  StellarApi ) {
    $scope.manual_code;
    $scope.manual_issuer;
    $scope.manual_logo = $rootScope.gateways.getSourceById($scope.manual_issuer).logo;
    $scope.manual_name;
    $scope.fed_url;
    $scope.fed_currencies = [];
    $scope.fed_error;
    $scope.fed_loading;

    $scope.show_all = false;
    $scope.showHide = () => {
      $scope.show_all = !$scope.show_all;
    }

    $scope.resolve = async () => {
      var snapshot = $scope.fed_url;
      $scope.fed_error = false;
      $scope.fed_loading = true;
      try {
        const res = await StellarApi.federation($scope.fed_url)
        $scope.fed_error = false;
        $scope.fed_loading = false;
        $scope.fed_currencies = res.CURRENCIES;
        $scope.$apply();
        console.debug(res);
      } catch(err) {
        if (snapshot !== $scope.fed_url) {
          return;
        }
        $scope.fed_currencies = [];
        $scope.fed_error = true;
        $scope.fed_loading = false;
        $scope.$apply();
        console.error(snapshot, err);
      }
    }
    $scope.issuerChange = () => {
      var gateway = $rootScope.gateways.getSourceById($scope.manual_issuer);
      $scope.manual_logo = gateway.logo;
      $scope.manual_name = gateway.name;
    }
    $scope.hasLine = (code, issuer) => {
      if (!$rootScope.lines[code] || !$rootScope.lines[code][issuer]) {
        return false;
      }
      return $rootScope.lines[code][issuer].limit > 0;
    };
    $scope.hasBalance = (code, issuer) => {
      if (!$rootScope.lines[code] || !$rootScope.lines[code][issuer]) {
        return false;
      }
      return $rootScope.lines[code][issuer].balance > 0;
    };
    $scope.changeState = {};
    $scope.setChanging = (code, issuer, state) => {
      if (!$scope.changeState[code]) {
        $scope.changeState[code] = {};
      }
      $scope.changeState[code][issuer] = state;
    };
    $scope.isChanging = (code, issuer) => {
      if ($scope.changeState[code] && $scope.changeState[code][issuer]) {
        return $scope.changeState[code][issuer];
      } else {
        return false;
      }
    }

    $scope.addTrust = async (code, issuer, amount) => {
      code = code || $scope.manual_code;
      issuer = issuer || $scope.manual_issuer;
      amount = amount || "100000000000";
      try{
        new StellarSdk.Asset(code, issuer);
      } catch(e) {
        $scope.trust_error = e.message;
        return;
      }
      changeTrustHelper(code, issuer, amount);
    };

    $scope.delTrust = async (code, issuer) => {
      code = code || $scope.manual_code;
      issuer = issuer || $scope.manual_issuer;
      changeTrustHelper(code, issuer, "0");
    };

    const changeTrustHelper = async (code, issuer, amount) => {
      console.log(code,issuer, amount)
      // 1. reset & start spinner.
      $scope.setChanging(code, issuer, true);
      $scope.trust_error = "";
      $scope.trust_done = false;
      try {
        // 2. Get Te
        const te = await StellarApi.changeTrust(code, issuer, amount);

        // 3. Pass te to signModal, wait for response and then close it.
        $scope.te = te;
        $scope.$apply();

        $(`#signModal`).modal('show');
        const teSigned = await new Promise((resolve, reject) => {
            $scope.callbackToSignModal = (err, te) => err ? reject(err) : resolve(te);
            $scope.$apply();
          });

        // 4. Submit teSigned
        await StellarApi.submitTransaction(teSigned);

        // 5a. Show success.
        $scope.trust_done = true;
      } catch(err) {
        // 5b. Show error.
        console.error(err)
          $scope.trust_error = StellarApi.getErrMsg(err);
      } finally {
        // 6. Stop spinner.
        $scope.setChanging(code, issuer, false);
        $rootScope.$apply();
      }

    };
  } ]);
