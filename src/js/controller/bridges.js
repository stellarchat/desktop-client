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
		$scope.fed_url = "";
		$scope.fed = undefined;
		StellarSdk.StellarTomlResolver.resolve($scope.anchor).then(function(stellarToml) {
			console.debug(stellarToml);
			var currencies = stellarToml.CURRENCIES;
			var deposit_api = stellarToml.DEPOSIT_SERVER;
			$scope.fed_url = stellarToml.FEDERATION_SERVER;
			$scope.fed = new StellarSdk.FederationServer(stellarToml.FEDERATION_SERVER, $scope.anchor, {});
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
			if ($scope.anchor == 'ripplefox.com') {
				$scope.resolveService();
			}
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
	
	$scope.resetService = function(){
		$scope.account_id = "";
		$scope.extra_fields = [];
		$scope.extra_assets = [];
		$scope.mulipleAsset = false;
		
		$scope.service_error = "";
		$scope.service_currency = "";
		$scope.asset = {};
		$scope.quote_error = "";
	}
	
	$scope.resolveService = function() {
		console.debug('resolve', $scope.service);
		var prestr = $scope.service;
		var domain = "ripplefox.com";
		$scope.resetService();
		$scope.service_loading = true;
		
		$scope.fed.resolveAddress(prestr).then(function(data){
				console.debug(prestr, data);
				if (data.error) {
					$scope.service_error = data.detail || data.error;
				} else {
					$scope.account_id = data.account_id;
					$scope.extra_fields = data.extra_fields;
					$scope.extra_assets = [{code:'CNY', issuer:"GAREELUB43IRHWEASCFBLKHURCGMHE5IF6XSE7EXDLACYHGRHM43RFOX"}, {code:'XLM', issuer:""}];
					$scope.mulipleAsset = $scope.extra_assets.length > 1;
					$scope.service_currency = $scope.extra_assets[0].code + "." + $scope.extra_assets[0].issuer;
					
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
//		}).catch(function(err){
//			if (prestr !== $scope.service) {
//				return;
//			}
//			$scope.service_loading = false;
//			$scope.$apply();
//		});
	};
	
	$scope.$watch('service_currency', function () {
      console.debug($scope.service_currency);
      $scope.quote();
    }, true);

    $scope.$watch('service_amount', function () {
    	 console.debug($scope.service_amount);
    	 $scope.quote();
    }, true);

    $scope.$watch('extra_fields', function () {
    	console.debug($scope.extra_fields);
    	$scope.quote();
    }, true);
    
    $scope.quote_data;
    $scope.quote = function() {
    	if (!$scope.serviceForm.$valid || !$scope.service_amount) {
    		return;
    	}
    	
    	var arr = $scope.service_currency.split(".");
    	var data = {
			type: "quote",
			amount       : $scope.service_amount,
			asset_code   : arr[0],
			asset_issuer : arr[1],
			account_id   : $scope.account_id,
			address      : $rootScope.address
        };
    	$scope.extra_fields.forEach(function(field){
    		if (field.name) {
    			data[field.name] = field.value;
    		}
    	});
    	
    	var snapshot = JSON.stringify(data);
    	$scope.quote_data = snapshot;
    	
    	$scope.asset = {};
    	$scope.quote_error = "";
    	$scope.quote_loading = true;
		$http({
			method: 'GET',
			url: $scope.fed_url,
			params: data
		}).then(function(res) {
			if (snapshot !== $scope.quote_data) {
				return;
			}
			$scope.asset.amount = res.data.amount;
			$scope.asset.code   = res.data.asset.code;
			$scope.asset.issuer = res.data.asset.issuer;
			var gateway = $rootScope.gateways.getSourceById($scope.asset.issuer);
			$scope.asset.logo = gateway.logo;
			$scope.asset.issuer_name = gateway.name;
			
			$scope.quote_loading = false;
			console.debug(res.data);
		}).catch(function(err) {
			if (snapshot !== $scope.quote_data) {
				return;
			}
			console.debug(err);
			if (typeof err == "string") {
				$scope.quote_error = err;
			} else {
				if (err.data && err.data.detail) {
					$scope.quote_error = err.data.detail;
				} else {
					$scope.quote_error = err.message;
				}
			}
			$scope.quote_loading = false;
		});
    }
} ]);
