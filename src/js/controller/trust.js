/* global myApp, StellarSdk */

myApp.controller("TrustCtrl", [ '$scope', '$rootScope', 'StellarApi',
  function($scope, $rootScope, StellarApi) {
    $scope.manual_code;
    $scope.manual_issuer;
    $scope.manual_logo = $rootScope.gateways.getSourceById($scope.manual_issuer).logo;
    $scope.manual_name;
    $scope.fed_url;
    $scope.fed_currencies = [];
    $scope.fed_error;
    $scope.fed_loading;

    $scope.show_all = false;
    $scope.showHide = function() {
      $scope.show_all = !$scope.show_all;
    }

    $scope.resolve = function() {
      var snapshot = $scope.fed_url;
      $scope.fed_error = false;
      $scope.fed_loading = true;
      StellarApi.federation($scope.fed_url).then(function(res){
        $scope.fed_error = false;
        $scope.fed_loading = false;
        $scope.fed_currencies = res.CURRENCIES;
        $scope.$apply();
        console.debug(res);
      }).catch(function(err){
        if (snapshot !== $scope.fed_url) {
          return;
        }
        $scope.fed_currencies = [];
        $scope.fed_error = true;
        $scope.fed_loading = false;
        $scope.$apply();
        console.error(snapshot, err);
      });
    }
    $scope.issuerChange = function() {
      var gateway = $rootScope.gateways.getSourceById($scope.manual_issuer);
      $scope.manual_logo = gateway.logo;
      $scope.manual_name = gateway.name;
    }
    $scope.hasLine = function(code, issuer) {
      if (!$rootScope.lines[code] || !$rootScope.lines[code][issuer]) {
        return false;
      }
      return $rootScope.lines[code][issuer].limit > 0;
    };
    $scope.hasBalance = function(code, issuer) {
      if (!$rootScope.lines[code] || !$rootScope.lines[code][issuer]) {
        return false;
      }
      return $rootScope.lines[code][issuer].balance > 0;
    };
    $scope.changeState = {};
    $scope.setChanging = function(code, issuer, state) {
      if (!$scope.changeState[code]) {
        $scope.changeState[code] = {};
      }
      $scope.changeState[code][issuer] = state;
    };
    $scope.isChanging = function(code, issuer) {
      if ($scope.changeState[code] && $scope.changeState[code][issuer]) {
        return $scope.changeState[code][issuer];
      } else {
        return false;
      }
    }
    $scope.addTrust = function(code, issuer, amount) {
      amount = amount || "100000000000";
      $scope.trust_error = "";
      $scope.trust_done = false;

      try{
        new StellarSdk.Asset(code, issuer);
      } catch(e) {
        $scope.trust_error = e.message;
        return;
      }

      $scope.setChanging(code, issuer, true);
      StellarApi.changeTrust(code, issuer, amount, function(err, data){
        $scope.setChanging(code, issuer, false);
        if (err) {
          $scope.trust_error = StellarApi.getErrMsg(err);
        } else {
          $scope.trust_done = true;
        }
        $rootScope.$apply();
      });
    };
    $scope.delTrust = function(code, issuer) {
      code = code || $scope.manual_code;
      issuer = issuer || $scope.manual_issuer;
      $scope.setChanging(code, issuer, true);
      $scope.trust_error = "";
      $scope.trust_done = false;
      StellarApi.changeTrust(code, issuer, "0", function(err, data){
        $scope.setChanging(code, issuer, false);
        if (err) {
          $scope.trust_error = StellarApi.getErrMsg(err);
        } else {
          $scope.trust_done = true;
        }
        $rootScope.$apply();
      });
    };
  } ]);
