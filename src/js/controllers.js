myApp.controller("HeaderCtrl", ['$scope', '$rootScope', '$location', 'UserAuthFactory', 'StellarApi',
  function($scope, $rootScope, $location, UserAuthFactory, StellarApi) {

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

myApp.controller("SettingsCtrl", [ '$scope', '$location', 'SettingFactory', 
                                   function($scope, $location, SettingFactory) {
	$scope.proxy = SettingFactory.getProxy();
	$scope.url = SettingFactory.getStellarUrl();
	$scope.fed_network = SettingFactory.getFedNetwork();
	
	$scope.save = function() {
		SettingFactory.setProxy($scope.proxy);
		SettingFactory.setStellarUrl($scope.url);
		SettingFactory.setFedNetwork($scope.fed_network);
		$location.path('/');
	};
} ]);

