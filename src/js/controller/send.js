myApp.controller("SendCtrl", ['$scope', '$rootScope', 'StellarApi', 'SettingFactory', '$http',
                              function($scope, $rootScope, StellarApi, SettingFactory, $http) {
	$scope.asset = {};
	$scope.input_address;
	$scope.memo;
	$scope.memo_type = 'Text';
	$scope.memo_provided;
	$scope.sending;
	$scope.send_done = false;
	
	$scope.send_error = {
		invalid : false,
		domain : false,
		memo : '',
		message : '',
		hasError : function() {
			return this.invalid || this.domain || this.message;
		}
	};
	$scope.target_domain;
	$scope.real_address;
	$scope.real_not_fund = false;
	$scope.real_accept = "";
	$scope.send = [];
	$scope.extra_fields = [];
	$scope.extra_assets = [];
	$scope.act_loading;
	$scope.is_federation;
	
	$scope.setMemoType = function(type) {
		$scope.memo_type = type;
	};
	$scope.isValidMemo = function() {
		if ($scope.memo) {
			$scope.send_error.memo = StellarApi.isValidMemo($scope.memo_type, $scope.memo);
		} else {
			$scope.send_error.memo = '';
		}
		return !$scope.send_error.memo;
	};
	$scope.pick = function(code, issuer) {
		$scope.asset.code = code;
		$scope.asset.issuer = issuer;
		var gateway = $rootScope.gateways.getSourceById(issuer);
		$scope.asset.name = gateway.name;
		$scope.asset.logo = gateway.logo;
		$scope.asset.website = gateway.website;
	};
	$scope.isLine = function(code, issuer) {
		if (code == 'XLM') {
			return code == $scope.asset.code;
		} else {
			return code == $scope.asset.code && issuer == $scope.asset.issuer;
		}
	}
	
	$scope.resetService = function(){
		$scope.send_error.invalid = false;
		$scope.send_error.domain = false;
		$scope.send_error.message = '';
		$scope.send_done = false;
		
		$scope.real_address = '';
		$scope.real_not_fund = false;
		$scope.real_accept = "";
		$scope.send = [];
		$scope.extra_fields = [];
		$scope.extra_assets = [];
		$scope.mulipleAsset = false;
		
		$scope.service_error = "";
		$scope.service_amount = 0;
		$scope.service_currency = "";
		
		$scope.fed_url = "";
		$scope.quote_id = "";
		$scope.quote_error = "";
	}
	$scope.resolve = function() {
		$scope.resetService();
		
		$scope.full_address = autoCompleteURL($scope.input_address);
		var snapshot = $scope.full_address;
		var i = snapshot.indexOf("*");
		if (i<0) {
			$scope.act_loading = false;
			$scope.is_federation = false;
			$scope.memo_provided = false;
			$scope.real_address = $scope.full_address;
			$scope.send_error.invalid = !StellarApi.isValidAddress(snapshot);
			$scope.resolveAccountInfo();
		} else {
			$scope.is_federation = true;
			$scope.resolveFederation(snapshot);
		}
	};
	
	$scope.resolveFederation = function(snapshot) {
		console.debug('resolve', snapshot);
		var i = snapshot.indexOf("*");
		var prestr = snapshot.substring(0, i);
		var domain = snapshot.substring(i+1);
		
		$scope.target_domain = domain;
		$scope.act_loading = true;
		
		StellarSdk.StellarTomlResolver.resolve(domain).then(function(stellarToml) {
			$scope.fed_url = stellarToml.FEDERATION_SERVER;
			var server = new StellarSdk.FederationServer(stellarToml.FEDERATION_SERVER, domain, {});
			server.resolveAddress(prestr).then(function(data){
				console.debug(prestr, data);
				$scope.act_loading = false;
				$scope.send_error.message = '';
				$scope.real_address = data.account_id;
				
				if (data.memo) {
					$scope.memo = data.memo.toString();
					$scope.memo_type = data.memo_type;
					$scope.memo_provided = true;
				} else {
					$scope.memo = '';
					$scope.memo_provided = false;
				}
				
				if (data.extra_fields) {
					$scope.quote_id = data.account_id;
					$scope.extra_fields = data.extra_fields;
					$scope.extra_assets = data.assets;
					$scope.mulipleAsset = $scope.extra_assets.length > 1;
					$scope.service_currency = $scope.extra_assets[0].code + "." + $scope.extra_assets[0].issuer;
				} else {
					$scope.resolveAccountInfo();
				}
				$scope.$apply();
			}).catch(function(err){
				if (snapshot !== $scope.full_address) {
					return;
				}
				console.debug(prestr, err);
				if (typeof err == "string") {
					$scope.send_error.message = err;
				} else {
					$scope.send_error.message = err.detail || err.message || err;
				}
				$scope.act_loading = false;
				$scope.$apply();
			});
		
		}).catch(function(err){
			console.error(err);
			if (snapshot !== $scope.full_address) {
				return;
			}
			$scope.send_error.domain = true;
			$scope.act_loading = false;
			$scope.$apply();
		});
		
		/*
		StellarApi.federationServer(domain).then(function(server){
			server.resolveAddress(prestr).then(function(data){
				console.debug(prestr, data);
				$scope.act_loading = false;
				$scope.send_error.message = '';
				$scope.real_address = data.account_id;
				
				if (data.extra_fields) {
					$scope.extra_fields = data.extra_fields;
					$scope.extra_assets = data.assets;
					$scope.mulipleAsset = $scope.extra_assets.length > 1;
					$scope.service_currency = $scope.extra_assets[0].code + "." + $scope.extra_assets[0].issuer;
				}
				
				if (data.memo) {
					$scope.memo = data.memo.toString();
					$scope.memo_type = data.memo_type;
					$scope.memo_provided = true;
				} else {
					$scope.memo = '';
					$scope.memo_provided = false;
				}
				$scope.resolveAccountInfo();
				$scope.$apply();
			}).catch(function(err){
				if (snapshot !== $scope.full_address) {
					return;
				}
				console.debug(prestr, err);
				$scope.real_address = '';
				if (typeof err == "string") {
					$scope.send_error.message = err;
				} else {
					$scope.send_error.message = err.detail || err.message;
				}
				$scope.act_loading = false;
				$scope.$apply();
			});
		}).catch(function(err){
			if (snapshot !== $scope.full_address) {
				return;
			}
			$scope.send_error.domain = true;
			$scope.act_loading = false;
			$scope.$apply();
		});
		*/
	};
	
	$scope.$watch('service_currency', function () { $scope.quote(); }, true);
	$scope.$watch('service_amount',   function () { $scope.quote(); }, true);
	$scope.$watch('extra_fields',     function () { $scope.quote(); }, true);
	
	$scope.quote_data;
    $scope.quote = function() {
    	$scope.asset = {};
    	if (!$scope.serviceForm || !$scope.serviceForm.$valid || !$scope.service_amount) {
    		return;
    	}
    	
    	var arr = $scope.service_currency.split(".");
    	var data = {
			type: "quote",
			amount       : $scope.service_amount,
			asset_code   : arr[0],
			asset_issuer : arr[1],
			account_id   : $scope.quote_id,
			address      : $rootScope.address
        };
    	$scope.extra_fields.forEach(function(field){
    		if (field.name) {
    			data[field.name] = field.value;
    		}
    	});
    	
    	var snapshot = JSON.stringify(data);
    	$scope.quote_data = snapshot;
    	
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
			$scope.send = res.data.send;
			$scope.asset = $scope.send[0];
			$scope.memo        = res.data.memo;
			$scope.memo_type   = res.data.memo_type;
			$scope.real_address = res.data.account_id;
			
			var gateway = $rootScope.gateways.getSourceById($scope.asset.issuer);
			$scope.asset.logo = gateway.logo;
			$scope.asset.name = gateway.name;
			
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
    };
	
	$scope.resolveAccountInfo = function() {
		if (!$scope.real_address || !StellarApi.isValidAddress($scope.real_address)) {
			return;
		}
		console.debug('resolve ' + $scope.real_address);
		StellarApi.getInfo($scope.real_address, function(err, data) {
			if (err) {
				if (err.message == "NotFoundError") {
					$scope.real_not_fund = true;
					var gateway = $rootScope.gateways.getSourceById('');
					$scope.send.unshift({
						code   : 'XLM',
						issuer : '',
						name   : gateway.name,
						logo   : gateway.logo
					});
					
					if ($scope.asset.code !== 'XLM') {
						$scope.pick('XLM', '');
					}
				} else {
					console.error('resolveAccountInfo', err);
				}
			} else {
				var accept = [];
				var code, issuer, name, logo;
				data.balances.forEach(function(line){
					if (line.asset_type == 'native') {
						accept.push('XLM');
						code = 'XLM';
						issuer = '';
					} else {
						if (accept.indexOf(line.asset_code) < 0) {
							accept.push(line.asset_code);
						}
						code = line.asset_code;
						issuer = line.asset_issuer;
					}
					
					var gateway = $rootScope.gateways.getSourceById(issuer);
					name = gateway.name;
					logo = gateway.logo;
					$scope.send.unshift({
						code   : code,
						issuer : issuer,
						name   : name,
						logo   : logo
					});
				});
				$scope.real_accept = accept.join(', ');
			}
			$scope.$apply(); 
		});
	};
	
	$scope.send_asset = function() {
		$scope.sending = true;
		$scope.send_done = false;
		$scope.send_error.message = '';
		
		StellarApi.send($scope.real_address, $scope.asset.code, $scope.asset.issuer, 
				$scope.asset.amount, $scope.memo_type, $scope.memo, function(err, hash){
			$scope.sending = false;
			
			if (err) {
				if (err.message) {
					$scope.send_error.message = err.message;
				} else {
					if (err.extras && err.extras.result_xdr) {
						var resultXdr = StellarSdk.xdr.TransactionResult.fromXDR(err.extras.result_xdr, 'base64');
						$scope.send_error.message = resultXdr.result().results()[0].value().value().switch().name;
					} else {
						console.error("Unhandle!!", err);
					}
				}
			} else {
				$scope.service_amount = 0;
				$scope.asset.amount = 0;
				$scope.send_done = true;
			}
			$rootScope.$apply();
		});
	};
	
	function autoCompleteURL(address) {
		if (address.indexOf("*") >=0) {
			return address;
		}
		if (address.indexOf("~") == 0) {
			return address.substring(1) + "*" + SettingFactory.getFedNetwork();
		}
		if (ripple.UInt160.is_valid(address)) {
			return address + "*" + SettingFactory.getFedRipple();
		}
		if (!isNaN(ripple.Base.decode_check([0, 5], address, 'bitcoin'))) {
			return address + "*" + SettingFactory.getFedBitcoin();
		}
		return address;		
	};
} ]);

