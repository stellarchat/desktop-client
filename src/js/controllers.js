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
    
    $scope.fed_name = "";
	$scope.resolveFed = function() {
		StellarApi.getFedName(SettingFactory.getFedNetwork(), $rootScope.address, function(err, name){
			if (err) {
				console.error(err);
			} else {
				$scope.fed_name = name;
				$scope.$apply();
			}
		});
	};
	$scope.resolveFed();
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

myApp.controller("SettingsCtrl", [ '$scope', '$rootScope', '$location', 'SettingFactory', 'StellarApi',
                                   function($scope, $rootScope, $location, SettingFactory, StellarApi) {
	$scope.proxy = SettingFactory.getProxy();
	$scope.url = SettingFactory.getStellarUrl();
	$scope.fed_network = SettingFactory.getFedNetwork();
	
	$scope.save = function() {
		SettingFactory.setProxy($scope.proxy);
		SettingFactory.setStellarUrl($scope.url);
		SettingFactory.setFedNetwork($scope.fed_network);
		$location.path('/');
	};
	
	$scope.fed_name = "";
	$scope.resolveFed = function() {
		StellarApi.getFedName($scope.fed_network, $rootScope.address, function(err, name){
			if (err) {
				console.error(err);
			} else {
				$scope.fed_name = name;
				$scope.$apply();
			}
		});
	};
	$scope.resolveFed();
} ]);

