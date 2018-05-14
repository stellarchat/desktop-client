/* global myApp */

myApp.controller("ConvertCtrl", ['$scope', '$rootScope', 'StellarApi', 'SettingFactory', '$http',
  function($scope, $rootScope, StellarApi, SettingFactory, $http) {
    $scope.send = [];
    $scope.dst_amount = 0;
    $scope.dst_currency = '';
    $scope.init = function(){
      $scope.send.push({code: $rootScope.currentNetwork.coin.code, issuer: ''});
      for (var code in $rootScope.lines) {
        for(var issuer in $rootScope.lines[code]) {
          $scope.send.push({code: code, issuer: issuer});
        }
      }
      $scope.dst_currency = $scope.send[0].code + "." + $scope.send[0].issuer;
    }
    $scope.init();

    $scope.asset = {};
    $scope.pick = function(code, issuer) {
      $scope.asset = $scope.paths[code + '.' + issuer];
    };
    $scope.isLine = function(code, issuer) {
      if (code == $rootScope.currentNetwork.coin.code) {
        return code == $scope.asset.src_code;
      } else {
        return code == $scope.asset.src_code && issuer == $scope.asset.src_issuer;
      }
    }

    $scope.paths = {};
    $scope.finding = false;
    $scope.updatePath = function() {
      var arr = $scope.dst_currency.split(".");
      var amount = $scope.dst_amount;

      $scope.paths = {};
      $scope.asset = {};
      $scope.finding = true;
      $scope.send_done = false;
      $scope.send_error = '';
      StellarApi.queryPath($rootScope.address, $rootScope.address, arr[0], arr[1], amount, function(err, data){
        $scope.finding = false;
        if (err) {
          if (typeof err == "string") {
            $scope.send_error = err;
          } else {
            $scope.send_error = err.detail || err.message;
          }
        } else {
          data.records.forEach(function(item){
            var alt = {
              origin: item,
              dst_code   : item.destination_asset_type == 'native' ? $rootScope.currentNetwork.coin.code : item.destination_asset_code,
              dst_issuer : item.destination_asset_type == 'native' ? '' : item.destination_asset_issuer,
              src_amount : parseFloat(item.source_amount),
              src_code   : item.source_asset_type == 'native' ? $rootScope.currentNetwork.coin.code : item.source_asset_code,
              src_issuer : item.source_asset_type == 'native' ? '' : item.source_asset_issuer,
            };
            alt.precise = alt.src_code == 'BTC' ? 6 : 3;
            alt.price = alt.src_amount / item.destination_amount;

            var gateway = $rootScope.gateways.getSourceById(alt.src_issuer);
            alt.src_logo = gateway.logo;
            alt.src_name = gateway.name;

            var isValid = true;
            if (alt.src_amount <= 0) {
              isValid = false;
            } else {
              if (alt.src_code == $rootScope.currentNetwork.coin.code) {
                if ($rootScope.balance - alt.src_amount < 0) {
                  isValid = false;
                }
              } else {
                if ($rootScope.lines[alt.src_code][alt.src_issuer].balance - alt.src_amount < 0) {
                  isValid = false;
                }
              }

              if (alt.src_code == alt.dst_code && alt.src_issuer == alt.dst_issuer && alt.price >= 1) {
                isValid = false;
              }
            }

            if (isValid) {
              if ($scope.paths[alt.src_code + '.' + alt.src_issuer]) {
                if ($scope.paths[alt.src_code + '.' + alt.src_issuer].src_amount > alt.amount) {
                  $scope.paths[alt.src_code + '.' + alt.src_issuer] = alt;
                }
              } else {
                $scope.paths[alt.src_code + '.' + alt.src_issuer] = alt;
              }
            }
          });
        }
        $scope.$apply();
      });
    };

    $scope.sending;
    $scope.send_done = false;
    $scope.send_error = '';

    $scope.send_asset = function() {
      $scope.sending = true;
      $scope.send_done = false;
      $scope.send_error = '';

      $scope.asset.max_rate = 1.0001;
      StellarApi.convert($scope.asset, function(err, hash){
        $scope.sending = false;

        if (err) {
          $scope.send_error = StellarApi.getErrMsg(err);
        } else {
          $scope.dst_amount = 0;
          $scope.paths = {};
          $scope.asset = {};
          $scope.send_done = true;
        }
        $rootScope.$apply();
      });
    };
  } ]);

