/* global myApp */

myApp.controller("HeaderCtrl", ['$scope', '$rootScope', '$location', 'AuthenticationFactory', 'StellarApi',
                       function( $scope ,  $rootScope ,  $location ,  AuthenticationFactory ,  StellarApi ) {

    $scope.isActive = function(route) {
      return route === $location.path();
    }

    $scope.logout = async () => {
      await AuthenticationFactory.logout();
      $location.path("/login");
      StellarApi.logout();
      $rootScope.reset();
    }
  }
]);
