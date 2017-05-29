myApp.controller("SendCtrl", ['$scope', '$rootScope', 'StellarApi', 'SettingFactory',
                              function($scope, $rootScope, StellarApi, SettingFactory) {
	$scope.src_code;
	$scope.src_issuer;
	$scope.src_name;
	$scope.src_logo;
	$scope.src_website;
	$scope.input_address;
	$scope.target_amount;
	$scope.memo;
	$scope.memo_type = 'Text';
	$scope.memo_provided;
	$scope.sending;
	$scope.send_done = false;
	
	$scope.target_error = {
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
	$scope.real_lines = [];
	$scope.act_loading;
	$scope.is_federation;
	
	$scope.setMemoType = function(type) {
		$scope.memo_type = type;
	};
	$scope.isValidMemo = function() {
		if ($scope.memo) {
			$scope.target_error.memo = StellarApi.isValidMemo($scope.memo_type, $scope.memo);
		} else {
			$scope.target_error.memo = '';
		}
		return !$scope.target_error.memo;
	};
	$scope.pick = function(code, issuer) {
		$scope.src_code = code;
		$scope.src_issuer = issuer;
		var gateway = $rootScope.gateways.getSourceById(issuer);
		$scope.src_name = gateway.name;
		$scope.src_logo = gateway.logo;
		$scope.src_website = gateway.website;
	};
	$scope.isLine = function(code, issuer) {
		if (code == 'XLM') {
			return code == $scope.src_code;
		} else {
			return code == $scope.src_code && issuer == $scope.src_issuer;
		}
	}
	$scope.resolve = function() {
		$scope.target_error.invalid = false;
		$scope.target_error.domain = false;
		$scope.target_error.message = '';
		$scope.real_not_fund = false;
		$scope.real_accept = "";
		$scope.real_lines = [];
		$scope.send_done = false;
		
		$scope.full_address = autoCompleteURL($scope.input_address);
		var snapshot = $scope.full_address;
		var i = snapshot.indexOf("*");
		if (i<0) {
			$scope.act_loading = false;
			$scope.is_federation = false;
			$scope.memo_provided = false;
			$scope.real_address = $scope.full_address;
			$scope.target_error.invalid = !StellarApi.isValidAddress(snapshot);
			$scope.resolveAccountInfo();
		} else {
			console.debug('resolve', snapshot);
			var prestr = snapshot.substring(0, i);
			var domain = snapshot.substring(i+1);
			
			$scope.target_domain = domain;
			$scope.act_loading = true;
			$scope.is_federation = true;
			$scope.real_address = '';
			StellarApi.federationServer(domain).then(function(server){
				server.resolveAddress(prestr).then(function(data){
					console.debug(prestr, data);
					$scope.act_loading = false;
					$scope.target_error.message = '';
					$scope.real_address = data.account_id;
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
						$scope.target_error.message = err;
					} else {
						$scope.target_error.message = err.detail || err.message;
					}
					$scope.act_loading = false;
					$scope.$apply();
				});
			}).catch(function(err){
				if (snapshot !== $scope.full_address) {
					return;
				}
				$scope.target_error.domain = true;
				$scope.act_loading = false;
				$scope.$apply();
			});
		}
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
					$scope.real_lines.unshift({
						code   : 'XLM',
						issuer : '',
						name   : gateway.name,
						logo   : gateway.logo
					});
					
					if ($scope.src_code !== 'XLM') {
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
					$scope.real_lines.unshift({
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
	
	$scope.send = function() {
		$scope.sending = true;
		$scope.send_done = false;
		$scope.target_error.message = '';
		
		StellarApi.send($scope.real_address, $scope.src_code, $scope.src_issuer, 
				$scope.target_amount, $scope.memo_type, $scope.memo, function(err, hash){
			$scope.sending = false;
			
			if (err) {
				if (err.message) {
					$scope.target_error.message = err.message;
				} else {
					if (err.extras && err.extras.result_xdr) {
						var resultXdr = StellarSdk.xdr.TransactionResult.fromXDR(err.extras.result_xdr, 'base64');
						$scope.target_error.message = resultXdr.result().results()[0].value().value().switch().name;
					} else {
						console.error("Unhandle!!", err);
					}
				}
			} else {
				$scope.target_amount = 0;
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

