myApp.controller("SettingsCtrl", [ '$scope', '$rootScope', '$location', 'SettingFactory', 'StellarApi',
                                   function($scope, $rootScope, $location, SettingFactory, StellarApi) {
	$scope.mode = 'network';
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
		$scope.network_error = "";
		if (mode == 'network') {
			SettingFactory.setProxy($scope.proxy);
			if (SettingFactory.getStellarUrl() != $scope.url) {
				try {
					StellarApi.setServer($scope.url);
					SettingFactory.setStellarUrl($scope.url);
					StellarApi.logout();
					$rootScope.reset();
					$rootScope.$broadcast('$blobUpdate');
				} catch (e) {
					console.error(e);
					$scope.network_error = e.message;
				}
			}
		}
		
		if (mode == 'federation') {
			SettingFactory.setFedNetwork($scope.fed_network);
			SettingFactory.setFedRipple($scope.fed_ripple);
			SettingFactory.setFedBitcoin($scope.fed_bitcoin);
		}
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
