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
      AuthenticationFactory.openfile($scope.walletfile, $scope.password, function(err, blob){
        $scope.$apply(function(){
          if (err) {
            $scope.error = 'Login failed: Wallet file or password is wrong.';
            return;
          }
          if (blob.data.account_id.substring(0, 1) == "r") {
            console.error(blob.data.account_id);
            $scope.error = 'Login failed: Wallet file is a Ripple file.';
            return;
          }

          AuthenticationFactory.setBlob(blob);
          $rootScope.$broadcast('$blobUpdate');
          $location.path('/');
        });
      });
    }

    $scope.submitAddress = function(){
      $scope.backendMessages = ['TODO: implement.'];
      $scope.error = 'TODO: implement.';
    }
  }
]);
