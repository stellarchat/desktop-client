/* global myApp */

myApp.controller("IcoCtrl", [ '$scope', '$rootScope', '$routeParams', 'StellarApi', 'SettingFactory', 'RemoteFactory',
  function($scope, $rootScope, $routeParams, StellarApi, SettingFactory, RemoteFactory) {
    //console.log('IcoCtrl', $routeParams.type);

    if ($rootScope.ico_data) {
      $rootScope.ico_data.ongoing.forEach(function(ico){
        if (SettingFactory.getLang() == 'cn') {
          ico.p1 = ico.p1_cn;
          ico.p2 = ico.p2_cn;
        }
      });
    }

    //query again
    RemoteFactory.getIcoItems(function(err, data){
      if (err) {
        if (!$rootScope.ico_data) {
          $scope.trust_error = err.statusText || err.message;
        }
      } else {
        console.log(data);
        $rootScope.ico_data = data;
        $rootScope.ico_data.ongoing.forEach(function(ico){
          if (SettingFactory.getLang() == 'cn') {
            ico.p1 = ico.p1_cn;
            ico.p2 = ico.p2_cn;
          }
        });
      }
    });

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
    $scope.addTrust = function(code, issuer) {
      code = code || $scope.manual_code;
      issuer = issuer || $scope.manual_issuer;
      $scope.setChanging(code, issuer, true);
      $scope.trust_error = "";
      StellarApi.changeTrust(code, issuer, "100000000000", function(err, data){
        $scope.setChanging(code, issuer, false);
        if (err) {
          $scope.trust_error = StellarApi.getErrMsg(err);
        }
        $rootScope.$apply();
      });
    };
    $scope.delTrust = function(code, issuer) {
      code = code || $scope.manual_code;
      issuer = issuer || $scope.manual_issuer;
      $scope.setChanging(code, issuer, true);
      $scope.trust_error = "";
      StellarApi.changeTrust(code, issuer, "0", function(err, data){
        $scope.setChanging(code, issuer, false);
        if (err) {
          $scope.trust_error = StellarApi.getErrMsg(err);
        }
        $rootScope.$apply();
      });
    };
  } ]);
