/* global myApp */

myApp.controller('LoginCtrl', ['$scope', '$rootScope', '$window', '$location', 'FileDialog', 'AuthenticationFactory',
  function($scope, $rootScope, $window, $location, FileDialog, AuthenticationFactory) {
    $scope.fileInputClick = function() {
      FileDialog.openFile(function(filename) {
        $scope.$apply(function() {
          $scope.walletfile = filename;
        });
      }, false);
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
          console.log(AuthenticationFactory)
          if (AuthenticationFactory.address.substring(0, 1) == "r") {
            console.error(AuthenticationFactory.address);
            $scope.error = 'Login failed: Wallet file is a Ripple file.';
            return;
          }

          $rootScope.$broadcast('$blobUpdate');
          $location.path('/');
        });
      });
    }

    $scope.submitAddress = function(){
      const type = AuthenticationFactory.TYPE.TEMPORARY;
      AuthenticationFactory.load(type, {address: $scope.address}, (err) => {
        $scope.$apply(() => {
          if (err) {
            console.error(err)
            $scope.error = `Login failed: ${err}`;
            return;
          }

          console.log(AuthenticationFactory)
          $rootScope.$broadcast('$blobUpdate');
          $location.path('/');

        });
      });
    }
  }
]);
