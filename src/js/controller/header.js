/* global myApp */

myApp.controller("HeaderCtrl", ['$scope', '$route', '$rootScope', '$location', 'AuthenticationFactory', 'StellarApi', function( $scope , $route,  $rootScope ,  $location ,  AuthenticationFactory ,  StellarApi ) {

    $scope.isActive = function(route) {
      return route === $location.path();
    }

    $scope.logout = function () {
      AuthenticationFactory.logout();
      $location.path("/login");
      StellarApi.logout();
      $rootScope.reset();
    }
    $scope.reload = function() {
      $route.reload();
    }
  }
]);
