/* global myApp, nw, StellarSdk */

myApp.controller('RegisterCtrl', ['$scope', '$rootScope', '$window', '$location', 'FileDialog', 'AuthenticationFactory',
  function($scope, $rootScope, $window, $location, FileDialog, AuthenticationFactory) {
    $scope.password = '';
    $scope.passwordSet = {};
    $scope.password1 = '';
    $scope.password2 = '';
    $scope.key = '';
    $scope.mode = 'register_new_account';
    $scope.showMasterKeyInput = false;
    $scope.submitLoading = false;

    $scope.changeMode = function(mode) {
      $scope.mode = mode;
    };
    $scope.showPass = function(flag) {
      $scope.showPassword = flag;
    };
    $scope.showSec = function(flag) {
      $scope.showSecret = flag;
    };

    $scope.reset = function() {
      $scope.password = '';
      $scope.password1 = '';
      $scope.password2 = '';
      $scope.masterkey = '';
      $scope.key = '';
      $scope.mode = 'register_new_account';
      $scope.showMasterKeyInput = false;
      $scope.submitLoading = false;

      if ($scope.registerForm) $scope.registerForm.$setPristine(true);
    };

    $scope.fileInputClick = function() {
      var dt = new Date();
      var datestr = (''+dt.getFullYear()+(dt.getMonth()+1)+dt.getDate()+'_'+dt.getHours()+dt.getMinutes()+dt.getSeconds()).replace(/([-: ])(\d{1})(?!\d)/g,'$10$2');
      FileDialog.saveAs(function(filename) {
        $scope.$apply(function() {
          $scope.walletfile = filename;
          $scope.mode = 'register_empty_wallet';
          $scope.save_error = '';
        });
      }, 'wallet' + datestr + '.txt');
    };

    $scope.submitForm = function() {
      if(!$scope.masterkey) $scope.masterkey = StellarSdk.Keypair.random().secret();

      const options = {
        address: StellarSdk.Keypair.fromSecret($scope.masterkey).publicKey(),  // ignored until blob format v2.
        secrets: [$scope.masterkey],  // TODO: blob format v2 to handle multiple secrets (and other things in upcoming commits).
        password: $scope.password1,
        path: $scope.walletfile
      };
      AuthenticationFactory.create(AuthenticationFactory.TYPE.FILESYSTEM, options, (err) => {
        if (err) {
          console.error('Registration failed!', err);
          $scope.save_error = err.message;
          $scope.$apply();
          return;
        }

        $scope.password = new Array($scope.password1.length+1).join("*");
        $scope.key = `S${new Array(56).join("*")}`;
        $scope.mode = 'welcome';
        $scope.$apply();
      });
    };

    $scope.submitSecretKeyForm = function(){
      $scope.masterkey = $scope.secretKey;
      $scope.fileInputClick();
    };

    $scope.gotoFund = function() {
      $scope.mode = 'register_empty_wallet';
      $scope.reset();

      $location.path('/');
    };

  }
]);
