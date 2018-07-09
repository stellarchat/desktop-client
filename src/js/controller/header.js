/* global myApp */

myApp.controller("HeaderCtrl", ['$scope', '$route', '$window', '$rootScope', '$location', 'AuthenticationFactory', 'StellarApi', function( $scope , $route, $window,  $rootScope ,  $location ,  AuthenticationFactory ,  StellarApi ) {

    $scope.isActive = function(route) {
      return route === $location.path();
    }
    $scope.launched = $window.localStorage['launched'] ? true : false;

    $scope.logout = async () => {
      await AuthenticationFactory.logout();
      $location.path("/login");
      StellarApi.logout();
      $rootScope.reset();
    }
    $scope.reload = function() {
      $route.reload();
    }
  }
]);
