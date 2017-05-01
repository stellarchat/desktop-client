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
				if ($scope.hasLine(asset.code, asset.issuer)) {
					$scope.resolveDeposit(deposit_api, asset.code);
				} else {
					$scope.deposit[asset.code].no_trust = true;
				}
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
	
	$scope.hasLine = function(code, issuer) {
		if (!$rootScope.lines[code] || !$rootScope.lines[code][issuer]) {
			return false;
		}
		return $rootScope.lines[code][issuer].limit > 0;
	};
	
	// a special case for CNY.ripplefox anchor
	$scope.service = 'alipay';
	$scope.isActive = function(type) {
		return $scope.service == type;
	}
	$scope.changeService = function(type) {
		if ($scope.service !== type) {
			$scope.service = type;
			$scope.resolveService();
		}
	}
	
	$scope.resolveService = function() {
		console.debug('resolve', $scope.service);
		var prestr = $scope.service;
		var domain = "ripplefox.com";
		$scope.service_loading = true;
		StellarApi.federationServer(domain).then(function(server){
			server.resolveAddress(prestr).then(function(data){
				console.debug(prestr, data);
				if (data.error) {
					$scope.service_error = data.detail || data.error;
				} else {
					$scope.service_error = '';
					$scope.real_address = data.account_id;
					$scope.extra_fields = data.extra_fields;
					if (data.memo) {
						$scope.memo = data.memo.toString();
						$scope.memo_type = data.memo_type;
						$scope.memo_provided = true;
					} else {
						$scope.memo = '';
						$scope.memo_provided = false;
					}
					console.debug(data);
				}
				$scope.service_loading = false;
				$scope.$apply();
			}).catch(function(err){
				if (prestr !== $scope.service) {
					return;
				}
				$scope.real_address = '';
				if (typeof err == "string") {
					$scope.service_error = err;
				} else {
					$scope.service_error = err.detail || err.message;
				}
				$scope.service_loading = false;
				$scope.$apply();
			});
		}).catch(function(err){
			if (prestr !== $scope.service) {
				return;
			}
			$scope.service_loading = false;
			$scope.$apply();
		});
	};
	$scope.resolveService();
} ]);
