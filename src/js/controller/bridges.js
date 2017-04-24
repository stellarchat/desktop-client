myApp.controller("BridgesCtrl", [ '$scope', '$rootScope', '$location', 'SettingFactory', 'StellarApi', '$http', 
                                   function($scope, $rootScope, $location, SettingFactory, StellarApi, $http) {
	$scope.bridges = {};
	$scope.anchor = SettingFactory.getBridgeService();
	$scope.anchor_logo;
	$scope.anchor_withdraw;
	$scope.init = function(){
		var anchors = $rootScope.gateways.getAllSources();
		for (var name in anchors) {
			var anchor = anchors[name];
			if (anchor.deposit_api){
				$scope.bridges[name] = anchor;
			}
			if (name == $scope.anchor) {
				$scope.anchor_logo = anchor.logo;
				$scope.anchor_withdraw = anchor.withdraw_info;
				if (SettingFactory.getLang() == 'cn') {
					$scope.anchor_withdraw = anchor.withdraw_info_cn;
				}
			}
		}
	};
	$scope.init();
	
	$scope.deposit = {};
	$scope.resolve = function(){
		StellarSdk.StellarTomlResolver.resolve($scope.anchor).then(function(stellarToml) {
			console.debug(stellarToml);
			var currencies = stellarToml.CURRENCIES;
			var deposit_api = stellarToml.DEPOSIT_SERVER;
			if (!deposit_api) { return; }
			
			currencies.forEach(function(asset){
				$scope.deposit[asset.code] = {
					issuer : asset.issuer
				};
				$scope.resolveDeposit(deposit_api, asset.code);
			});
			$scope.$apply();
		}).catch(function(err){
			console.error(err); 
		});
	};
	$scope.resolve();
	
	$scope.resolveDeposit = function(api, code) {
		var url = api + "?address=" + $rootScope.address + "&asset=" + code;
		console.debug('resolve ' + url);
		$http({
			method: 'GET',
			url: url
		}).then(function(res) {
			$scope.deposit[code].deposit_info = res.data.deposit_info;
			$scope.deposit[code].extra_info = res.data.extra_info;
			if (res.data.extra_info_cn && SettingFactory.getLang() == 'cn') {
				$scope.deposit[code].extra_info = res.data.extra_info_cn;
			}
		}).catch(function(err) {
			console.error(err);
		});
	}
	
	$scope.changeBridge = function(name) {
	    SettingFactory.setBridgeService(name);
	    $scope.anchor = name;
	    $scope.anchor_logo = $scope.bridges[name].logo;
	    $scope.anchor_withdraw = $scope.bridges[name].withdraw_info;
		if (SettingFactory.getLang() == 'cn') {
			$scope.anchor_withdraw = $scope.bridges[name].withdraw_info_cn;
		}
		$scope.deposit = {};
	    $scope.resolve();
	};
	
	
} ]);
