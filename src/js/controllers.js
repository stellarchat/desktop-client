myApp.controller("HeaderCtrl", ['$scope', '$location', 'UserAuthFactory',
  function($scope, $location, UserAuthFactory) {

    $scope.isActive = function(route) {
      return route === $location.path();
    }

    $scope.logout = function () {
      UserAuthFactory.logout();
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

