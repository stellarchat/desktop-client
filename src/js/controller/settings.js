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
	$scope.network_type = SettingFactory.getNetworkType();
	$scope.url = SettingFactory.getStellarUrl();
	$scope.test_url = SettingFactory.getTestUrl();
	$scope.other_url = SettingFactory.getOtherUrl();
	$scope.passphrase = SettingFactory.getNetPassphrase();
	
	$scope.fed_network = SettingFactory.getFedNetwork();
	$scope.fed_ripple  = SettingFactory.getFedRipple();
	$scope.fed_bitcoin = SettingFactory.getFedBitcoin();
	$scope.save = function(mode) {
		$scope.network_error = "";
		if (mode == 'network') {
			SettingFactory.setProxy($scope.proxy);
			var server_change = false;
			if (SettingFactory.getNetworkType() != $scope.network_type) {
				SettingFactory.setNetworkType($scope.network_type);
				server_change = true;
			}
			if (SettingFactory.getTestUrl() != $scope.test_url) {
				SettingFactory.setTestUrl($scope.test_url);
				server_change = true;
			}
			if (SettingFactory.getStellarUrl() != $scope.url) {
				SettingFactory.setStellarUrl($scope.url);
				server_change = true;
			}
			if (SettingFactory.getOtherUrl() != $scope.other_url) {
				SettingFactory.setOtherUrl($scope.other_url);
				server_change = true;
			}
			if (SettingFactory.getNetPassphrase() != $scope.passphrase) {
				SettingFactory.setNetPassphrase($scope.passphrase);
				server_change = true;
			}
			
			if (server_change) {
				try {
					var url = "";
					if ($scope.network_type == 'test') {
						url = $scope.test_url;
					} else if ($scope.network_type == 'other') {
						url = $scope.other_url;
					} else {
						$scope.url;
					}
					
					StellarApi.setServer(url, $scope.network_type, $scope.passphrase);
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
