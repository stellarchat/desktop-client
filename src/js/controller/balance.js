/* global myApp */

myApp.controller("BalanceCtrl", [ '$scope', '$rootScope', '$http', 'StellarApi', 'AnchorFactory', 'SettingFactory',
  function($scope, $rootScope, $http, StellarApi, AnchorFactory, SettingFactory) {
    $scope.working = false;
    $scope.refresh = function() {
      if ($scope.working) { return; }
      $scope.working = true;
      StellarApi.queryAccount(function(err){
        $scope.$apply(function(){
          $scope.working = false;
        });
      });
      $scope.estimate();
    };
    $scope.delTrust = function(code, issuer) {
      $scope.setRemoving(code, issuer, true);
      StellarApi.changeTrust(code, issuer, "0", function(err, data){
        if (err) {
          console.error(StellarApi.getErrMsg(err));
        }
        $scope.setRemoving(code, issuer, false);
        $scope.$apply();
      });
    };

    $scope.removeState = {};
    $scope.setRemoving = function(code, issuer, state) {
      if (!$scope.removeState[code]) {
        $scope.removeState[code] = {};
      }
      $scope.removeState[code][issuer] = state;
    };
    $scope.isRemoving = function(code, issuer) {
      if ($scope.removeState[code] && $scope.removeState[code][issuer]) {
        return $scope.removeState[code][issuer];
      } else {
        return false;
      }
    }

    $scope.price = {};
    $scope.getPrice = function(code, issuer, callback) {
      var base = {code: code, issuer: issuer};
      var counter = {code: $rootScope.currentNetwork.coin.code, issuer: ''};
      StellarApi.queryBook(base, counter, function(err, data) {
        if (err) {
          console.error('Price ' + base + '.' + issuer, err);
        } else {
          if (data.bids && data.bids[0]) {
            $scope.price[code + '.' + issuer] = parseFloat(data.bids[0].price);
          }
        }
        callback();
      });
    }

    $scope.estimated_value = 0;
    $scope.calculate_estimated = function() {
      $scope.estimated_value = $rootScope.balance;
      for (var code in $rootScope.lines) {
        for (var issuer in $rootScope.lines[code]) {
          if (!$scope.price[code + '.' + issuer]) {
            $scope.price[code + '.' + issuer] = 0;
          }
          $scope.estimated_value += $rootScope.lines[code][issuer].balance * $scope.price[code + '.' + issuer];
        }
      }
    }
    $scope.estimate = function() {
      $scope.calculate_estimated();
      for (var code in $rootScope.lines) {
        for (var issuer in $rootScope.lines[code]) {
          $scope.getPrice(code, issuer, function(err, price){
            $scope.calculate_estimated();
            $scope.$apply();
          });
        }
      }
    }
    $scope.estimate();

    $scope.$on("balanceChange", function() {
      console.debug('balanceChange event');
      $scope.estimate();
      $scope.initDepositData();
    });

    $scope.deposit_info = {};
    $scope.initDepositData = function() {
      for (var code in $rootScope.lines) {
        if (!$scope.deposit_info[code]) {
          $scope.deposit_info[code] = {};
        }
        for (var issuer in $rootScope.lines[code]) {
          if (!$scope.deposit_info[code][issuer]) {
            $scope.deposit_info[code][issuer] = {deposit_api: null, info: null, resolved: false, show: false};
          }
          AnchorFactory.addAccount(issuer);
        }
      }
    }
    $scope.initDepositData();

    $scope.toggleDepositInfo = function(code, issuer) {
      $scope.deposit_info[code][issuer].show = !$scope.deposit_info[code][issuer].show;
    }

    $scope.resolveDeposit = function(code, issuer) {
      var api = $scope.deposit_info[code][issuer].deposit_api;
      var url = api + "?account=" + $rootScope.address + "&asset_code=" + code;
      console.debug('resolve ' + url);
      $http({
        method: 'GET',
        url: url
      }).then(function(res) {
        $scope.deposit_info[code][issuer].resolved = true;
        $scope.deposit_info[code][issuer].info = res.data;
        if ($scope.deposit_info[code][issuer].info.extra_info) {
          if (typeof $scope.deposit_info[code][issuer].info.extra_info !== "object") {
            $scope.deposit_info[code][issuer].info.extra_info = {
              "Extra Info" : $scope.deposit_info[code][issuer].info.extra_info
            }
          }
        }
      }).catch(function(err) {
        console.error(url, err);
      });
    }

    $scope.updateDepositData = function() {
      for (var code in $scope.deposit_info) {
        for (var issuer in $scope.deposit_info[code]) {
          var anchor = AnchorFactory.getAnchor(issuer);
          if (anchor && anchor.parsed && !$scope.deposit_info[code][issuer].resolved) {
            console.debug('update deposit data', anchor);
            if (anchor.deposit_api) {
              $scope.deposit_info[code][issuer].deposit_api = anchor.deposit_api;
              $scope.resolveDeposit(code, issuer);
            }
          }
        }
      }
    }
    $scope.updateDepositData();

    $scope.$on("anchorUpdate", function() {
      console.debug('anchorUpdate event');
      $scope.updateDepositData();
    });

  } ]);
