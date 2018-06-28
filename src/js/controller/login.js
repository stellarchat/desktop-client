/* global myApp, require */

myApp.controller('LoginCtrl', ['$scope', '$rootScope', '$window', '$location', 'FileDialog', 'AuthenticationFactory', 'StellarApi',
  function($scope, $rootScope, $window, $location, FileDialog, AuthenticationFactory, StellarApi) {
    $scope.address="";
    $scope.showTemp = false;
    $scope.toggleTemp = function() {
      $scope.showTemp = !$scope.showTemp;
    }

    $scope.fileInputClick = function() {
      const remote = require('electron').remote;
      var dialog = remote.dialog;

      dialog.showOpenDialog({
          properties: [ 'openFile' ]
        }, function ( filenames ) {
          $scope.$apply(function() {
            $scope.walletfile = filenames.shift();
          });
        }
      );
    };

    $scope.submitForm = function(){
      if (!$scope.walletfile) {
        $scope.error = 'Please select a wallet file.';
        return;
      }
      $scope.backendMessages = [];

      const type = AuthenticationFactory.TYPE.FILESYSTEM;
      AuthenticationFactory.load(type, {path: $scope.walletfile, password: $scope.password}, (err) => {
        $scope.$apply(() => {
          if (err) {
            console.error(err)
            $scope.error = 'Login failed: Wallet file or password is wrong.';
            return;
          }

          $location.path('/');
        });
      });
    }

    $scope.submitAddress = function(){
      $scope.invalidAddress = !StellarApi.isValidAddress($scope.address);
      if ($scope.invalidAddress) {
        return;
      }
      const type = AuthenticationFactory.TYPE.TEMPORARY;
      AuthenticationFactory.load(type, {address: $scope.address}, (err) => {
        $scope.$apply(() => {
          if (err) {
            console.error(err)
            $scope.error = `Login failed: ${err}`;
            return;
          }

          $location.path('/');
        });
      });
    }
  }
]);
