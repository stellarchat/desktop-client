/* global $, b64DecodeUnicode, myApp */

myApp.controller("SecurityCtrl", ['$scope', '$rootScope', 'AuthenticationFactory', 'StellarApi',
                         function( $scope ,  $rootScope ,  AuthenticationFactory ,  StellarApi ) {
    $scope.mode = 'security';
    $scope.isMode = (mode) => {
      return $scope.mode === mode;
    }
    $scope.setMode = (mode) => {
      return $scope.mode = mode;
    }

    $scope.keyAmount = AuthenticationFactory.secretAmount;
    $scope.key = `S${new Array(56).join("*")}`;

    $scope.showSec = (flag) => {
      $scope.showSecret = flag;
      $scope.keyOpen = AuthenticationFactory.secrets[0];  // TODO: keep secret only in Auth.
      $scope.keyQRCode = $scope.keyOpen;
    };


    $scope.network_error;
    $scope.refresh = () => {
      StellarApi.getInfo(null, (err, data) => {
        if (err) {
          $scope.network_error = StellarApi.getErrMsg(err);
        } else {
          $scope.inflation = data.inflation_destination;
          $scope.domain = data.home_domain;
          $scope.data_attr = {};
          for (var key in data.data_attr) {
            $scope.data_attr[key] = b64DecodeUnicode(data.data_attr[key]);
          }
          $scope.$apply();
        }
      });
    };
    $scope.refresh();

    $scope.inflation = '';
    $scope.inflation_working = false;
    $scope.inflation_error = '';
    $scope.inflation_done = false;

    $scope.setInflation = async () => {
      // 1. reset & start spinner.
      $scope.inflation_error = '';
      $scope.inflation_done = false;
      $scope.inflation_result = null;
      $scope.inflation_working = true;

      try {
        // 2. Get Te
        const te = await StellarApi.setOption('inflationDest', $scope.inflation);

        // 3. Pass te to signModal, wait for response and then close it.
        $scope.te = te;
        $scope.$apply();

        $(`#signModal`).modal();
        const teSigned = await new Promise((resolve, reject) => {
            $scope.callbackToSignModal = (err, te) => {
              if(err) reject(err);
              resolve(te);
            }
          });

        $('#signModal').modal('toggle');
        $scope.$apply();

        // 4. Submit teSigned
        const result = await StellarApi.submitTransaction(teSigned);

        // 5a. Show success.
        $scope.inflation_done = true;
        $scope.inflation_result = result;
      } catch(err) {
        // 5b. Show error.
        console.error(err)
        $scope.inflation_error = StellarApi.getErrMsg(err);
      } finally {
        // 6. Stop spinner.
        $scope.inflation_working = false;
        $rootScope.$apply();
      }

    };

    $scope.setInflationFox = () => {
      $scope.inflation = 'GAREELUB43IRHWEASCFBLKHURCGMHE5IF6XSE7EXDLACYHGRHM43RFOX';
      $scope.setInflation();
    }
    $scope.setInflationXLMPool = () => {
      $scope.inflation = 'GA3FUYFOPWZ25YXTCA73RK2UGONHCO27OHQRSGV3VCE67UEPEFEDCOPA';
      $scope.setInflation();
    }
    $scope.setInflationMoonPool = () => {
      $scope.inflation = 'GB56YLTH5SDOYTUGPWY5MXJ7VQTY7BEM2YVJZTN5O555VA6DJYCTY2MP';
      $scope.setInflation();
    }

    $scope.setInflationLumenaut = () => {
      $scope.inflation = 'GCCD6AJOYZCUAQLX32ZJF2MKFFAUJ53PVCFQI3RHWKL3V47QYE2BNAUT';
      $scope.setInflation();
    }

    $scope.domain = '';
    $scope.domain_working = false;
    $scope.domain_error = '';
    $scope.domain_done = false;
    $scope.setDomain = async () => {
      // 1. reset & start spinner.
      $scope.domain_error = '';
      $scope.domain_done = false;
      $scope.domain_result = null;
      $scope.domain_working = true;

      try {
        // 2. Get Te
        const te = await StellarApi.setOption('homeDomain', $scope.domain);

        // 3. Pass te to signModal, wait for response and then close it.
        $scope.te = te;
        $scope.$apply();

        $(`#signModal`).modal('show');
        const teSigned = await new Promise((resolve, reject) => {
            $scope.callbackToSignModal = (err, te) => err ? reject(err) : resolve(te);
            $scope.$apply();
          });

        // 4. Submit teSigned
        const result = await StellarApi.submitTransaction(teSigned);

        // 5a. Handle success.
        $scope.domain_done = true;
        $scope.domain_result = result;
      } catch(err) {
        // 5b. Handle error.
        console.error(err)
        $scope.domain_error = StellarApi.getErrMsg(err);
      } finally {
        // 6. Stop spinner.
        $scope.domain_working = false;
        $rootScope.$apply();
      }

    };

    $scope.data_attr = {};
    $scope.data_key = '';
    $scope.data_value = '';
    $scope.data_working = false;
    $scope.data_error = '';
    $scope.data_done = false;
    $scope.setData = async () => {
      // 1. reset & start spinner.
      $scope.data_error = '';
      $scope.data_done = false;
      $scope.data_working = true;
      $scope.data_result = null;

      try {
        // 2. Get Te
        const te = await StellarApi.setData($scope.data_key, $scope.data_value);

        // 3. Pass te to signModal, wait for response and then close it.
        $scope.te = te;
        $scope.$apply();

        $(`#signModal`).modal();
        const teSigned = await new Promise((resolve, reject) => {
            $scope.callbackToSignModal = (err, te) => {
              if(err) reject(err);
              resolve(te);
            }
          });

        $('#signModal').modal('toggle');
        $scope.$apply();

        // 4. Submit teSigned
        const result = await StellarApi.submitTransaction(teSigned);

        // 5a. Handle success.
        if ($scope.data_value) {
          $scope.data_attr[$scope.data_key] = $scope.data_value;
        } else {
          delete $scope.data_attr[$scope.data_key];
        }
        $scope.data_done = true;
        $scope.data_result = result;
      } catch(err) {
        // 5b. Handle error.
        console.error(err)
        $scope.data_error = StellarApi.getErrMsg(err);
      } finally {
        // 6. Stop spinner.
        $scope.data_working = false;
        $rootScope.$apply();
      }

    };

    $scope.delete_warning = true;
    $scope.toggleWarning = () => {
      $scope.delete_warning = !$scope.delete_warning;
    }
    $scope.merge = async () => {
      // 1. reset & start spinner.
      $scope.merge_error = '';
      $scope.merge_done = false;
      $scope.merge_working = true;

      try {
        // 2. Get Te
        const te = await StellarApi.merge($scope.dest_account);

        // 3. Pass te to signModal, wait for response and then close it.
        $scope.te = te;
        $scope.$apply();

        $(`#signModal`).modal();
        const teSigned = await new Promise((resolve, reject) => {
            $scope.callbackToSignModal = (err, te) => {
              if(err) reject(err);
              resolve(te);
            }
          });

        $('#signModal').modal('toggle');
        $scope.$apply();

        // 4. Submit teSigned
        const result = await StellarApi.submitTransaction(teSigned);

        // 5a. Handle success.
        $rootScope.balance = 0;
        $rootScope.reserve = 0;
        $scope.merge_done = true;
        $scope.merge_result = result;
      } catch(err) {
        // 5b. Handle error.
        console.error(err)
        $scope.merge_error = StellarApi.getErrMsg(err);
      } finally {
        // 6. Stop spinner.
        $scope.merge_working = false;
        $rootScope.$apply();
      }

    };
  }
]);
