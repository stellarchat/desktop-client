myApp.controller("HeaderCtrl", ['$scope', '$rootScope', '$location', 'UserAuthFactory', 'SettingFactory', 'StellarApi',
  function($scope, $rootScope, $location, UserAuthFactory, SettingFactory, StellarApi) {

    $scope.isActive = function(route) {
      return route === $location.path();
    }

    $scope.logout = function () {
      UserAuthFactory.logout();
      StellarApi.logout();
      $rootScope.reset();
    }
  }
]);

myApp.controller("FooterCtrl", [ '$scope', '$translate', 'SettingFactory',
  function($scope, $translate, SettingFactory) {
	$scope.changeLanguage = function (key) {
	    $translate.use(key);
	    SettingFactory.setLang(key);
	};
}]);

myApp.controller("HomeCtrl", ['$scope',
  function($scope) {
    $scope.name = "Home Controller";
  }
]);

