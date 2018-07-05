/* global myApp */
myApp.controller('proxyModalCtrl', ['$rootScope', '$scope', 'SettingFactory', 'StellarApi',
                             function( $rootScope ,  $scope ,  SettingFactory ,  StellarApi ) {


  $scope.proxy = SettingFactory.getProxy();

  $scope.save = function() {
    SettingFactory.setProxy($scope.proxy);
    location.reload();
  };

}]);
