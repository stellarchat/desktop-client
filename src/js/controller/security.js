/* global b64DecodeUnicode, myApp */

myApp.controller("SecurityCtrl", ['$scope', '$rootScope', 'AuthenticationFactory', 'StellarApi',
  function($scope, $rootScope, AuthenticationFactory, StellarApi) {
    $scope.mode = 'security';
    $scope.isMode = function(mode) {
      return $scope.mode === mode;
    }
    $scope.setMode = function(mode) {
      return $scope.mode = mode;
    }

    $scope.keyAmount = AuthenticationFactory.secretAmount;
    $scope.key = `S${new Array(56).join("*")}`;

    $scope.showSec = function(flag) {
      $scope.showSecret = flag;
      $scope.keyOpen = AuthenticationFactory.secrets[0];  // TODO: keep secret only in Auth.
      $scope.keyQRCode = $scope.keyOpen;
    };


    $scope.network_error;
    $scope.refresh = function() {
      StellarApi.getInfo(null, function(err, data) {
        if (err) {
          $scope.network_error = StellarApi.getErrMsg(err);
        } else {
          $scope.inflation = data.inflation_destination;
          $scope.domain = data.home_domain;
          $scope.data_attr = {};
          for (var key in data.data_attr) {
            $scope.data_attr[key] = b64DecodeUnicode(data.data_attr[key]);
          }
        }
        $scope.$apply();
      });
    };
    $scope.refresh();

    $scope.inflation = '';
    $scope.inflation_working = false;
    $scope.inflation_error = '';
    $scope.inflation_done = false;
    $scope.setInflation = function() {
      $scope.inflation_error = '';
      $scope.inflation_done = false;
      $scope.inflation_working = true;
      StellarApi.setOption('inflationDest', $scope.inflation, function(err, hash){
        $scope.inflation_working = false;
        if (err) {
          $scope.inflation_error = StellarApi.getErrMsg(err);
        } else {
          $scope.inflation_done = true;
        }
        $scope.$apply();
      });
    };
    $scope.setInflationFox = function() {
      $scope.inflation = 'GAREELUB43IRHWEASCFBLKHURCGMHE5IF6XSE7EXDLACYHGRHM43RFOX';
      $scope.setInflation();
    }
    $scope.setInflationXLMPool = function() {
      $scope.inflation = 'GA3FUYFOPWZ25YXTCA73RK2UGONHCO27OHQRSGV3VCE67UEPEFEDCOPA';
      $scope.setInflation();
    }
    $scope.setInflationMoonPool = function() {
      $scope.inflation = 'GB56YLTH5SDOYTUGPWY5MXJ7VQTY7BEM2YVJZTN5O555VA6DJYCTY2MP';
      $scope.setInflation();
    }

    $scope.setInflationLumenaut = function() {
      $scope.inflation = 'GCCD6AJOYZCUAQLX32ZJF2MKFFAUJ53PVCFQI3RHWKL3V47QYE2BNAUT';
      $scope.setInflation();
    }

    $scope.domain = '';
    $scope.domain_working = false;
    $scope.domain_error = '';
    $scope.domain_done = false;
    $scope.setDomain = function() {
      $scope.domain_error = '';
      $scope.domain_done = false;
      $scope.domain_working = true;
      StellarApi.setOption('homeDomain', $scope.domain, function(err, hash){
        $scope.domain_working = false;
        if (err) {
          $scope.domain_error = StellarApi.getErrMsg(err);
        } else {
          $scope.domain_done = true;
        }
        $scope.$apply();
      });
    };

    $scope.data_attr = {};
    $scope.data_key = '';
    $scope.data_value = '';
    $scope.data_working = false;
    $scope.data_error = '';
    $scope.data_done = false;
    $scope.setData = function() {
      $scope.data_error = '';
      $scope.data_done = false;
      $scope.data_working = true;
      StellarApi.setData($scope.data_key, $scope.data_value, function(err, hash){
        $scope.data_working = false;
        if (err) {
          $scope.data_error = StellarApi.getErrMsg(err);
        } else {
          if ($scope.data_value) {
            $scope.data_attr[$scope.data_key] = $scope.data_value;
          } else {
            delete $scope.data_attr[$scope.data_key];
          }
          $scope.data_done = true;
        }
        $scope.$apply();
      });
    };

    $scope.delete_warning = true;
    $scope.toggleWarning = function() {
      $scope.delete_warning = !$scope.delete_warning;
    }
    $scope.merge = function() {
      $scope.merge_error = '';
      $scope.merge_done = false;
      $scope.merge_working = true;
      StellarApi.merge($scope.dest_account, function(err, hash){
        $scope.merge_working = false;
        if (err) {
          $scope.merge_error = StellarApi.getErrMsg(err);
        } else {
          $rootScope.balance = 0;
          $rootScope.reserve = 0;
          $scope.merge_done = true;
        }
        $scope.$apply();
      });
    };
  }
]);
