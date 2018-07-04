/* global myApp, require, StellarSdk */

myApp.controller('RegisterCtrl', ['$scope', '$location', 'AuthenticationFactory',
                         function( $scope ,  $location ,  AuthenticationFactory ) {
    $scope.password = '';
    $scope.passwordSet = {};
    $scope.password1 = '';
    $scope.password2 = '';
    $scope.key = '';
    $scope.mode = 'register_new_account'; // register_new_account
    $scope.showMasterKeyInput = false;
    $scope.submitLoading = false;
    $scope.weakPassword = true;

    // Password strength
    var passwordStrength = {
      0: "Worst",
      1: "Bad",
      2: "Weak",
      3: "Good",
      4: "Strong"
    }

    // Password strength meter
    var meter = document.getElementById('password-strength-meter');
    var text = document.getElementById('password-strength-text');


    //Watch for password changes
    $scope.$watch('password1', function(newValue){
      if(newValue == undefined) { newValue = ''; }
      let result = zxcvbn(newValue);
      meter.value = result.score;
      if (newValue !== "") {
        text.innerHTML = "Password strength: " + passwordStrength[result.score];
      } else {
        text.innerHTML = "Password strength: -";
      }
      if(result.score >= 2) {
        $scope.weakPassword = false;
      } else {
        $scope.weakPassword = true;
      }
    }, true);


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
      $scope.weakPassword = true;

      if ($scope.registerForm) $scope.registerForm.$setPristine(true);
    };



    $scope.fileInputClick = function() {
      const remote = require('electron').remote;
      var dialog = remote.dialog;

      var dt = new Date();
      var datestr = (''+dt.getFullYear()+(dt.getMonth()+1)+dt.getDate()+'_'+dt.getHours()+dt.getMinutes()+dt.getSeconds()).replace(/([-: ])(\d{1})(?!\d)/g,'$10$2');

      dialog.showSaveDialog({
          properties: [ 'openFile' ],
          defaultPath: 'wallet' + datestr + '.txt',
        }, function ( filename ) {
          $scope.$apply(function() {
            $scope.walletfile = filename;
            if($scope.walletfile != '' && $scope.walletfile != undefined) {
              $scope.mode = 'register_empty_wallet';
            } else {
              $scope.mode = 'register_new_account';
            }
            $scope.save_error = '';
          });
        }
      );
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
