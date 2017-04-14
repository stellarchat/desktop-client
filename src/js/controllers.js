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
		StellarApi.federationServer($scope.fed_network).then(function(server){
			server.resolveAccountId($rootScope.address).then(function(data){
				if(data.stellar_address) {
					var index = data.stellar_address.indexOf("*");
					$scope.fed_name = data.stellar_address.substring(0, index);
					$scope.$apply();
				}
			}).catch(function(err){
				console.error(err);
			});
		}).catch(function(err){
			console.error(err);
		});
	};
	$scope.resolveFed();
} ]);

