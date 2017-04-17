myApp.controller("BridgesCtrl", [ '$scope', '$rootScope', '$location', 'SettingFactory', 'StellarApi',
                                   function($scope, $rootScope, $location, SettingFactory, StellarApi) {
	
	StellarSdk.StellarTomlResolver.resolve('naobtc.com').then(function(stellarToml) {
		 console.debug(stellarToml);
	}).catch(function(err){
		console.error(err); 
	});
	 
	$scope.isMode = function(mode) {
		return $scope.mode === mode;
    }
	$scope.setMode = function(mode) {
		return $scope.mode = mode;
    }
	
	$scope.proxy = SettingFactory.getProxy();
	$scope.url = SettingFactory.getStellarUrl();
	$scope.fed_network = SettingFactory.getFedNetwork();
	$scope.fed_ripple  = SettingFactory.getFedRipple();
	$scope.fed_bitcoin = SettingFactory.getFedBitcoin();
	$scope.save = function(mode) {
		if (mode == 'network') {
			SettingFactory.setProxy($scope.proxy);
			SettingFactory.setStellarUrl($scope.url);
		}
		if (mode == 'federation') {
			SettingFactory.setFedNetwork($scope.fed_network);
			SettingFactory.setFedRipple($scope.fed_ripple);
			SettingFactory.setFedBitcoin($scope.fed_bitcoin);
		}
		
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
