myApp.controller("SendCtrl", ['$scope', '$rootScope', 'StellarApi', 'SettingFactory',
                              function($scope, $rootScope, StellarApi, SettingFactory) {
	$scope.src_code;
	$scope.src_issuer;
	$scope.src_name;
	$scope.src_logo;
	$scope.src_website;
	$scope.target_address;
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
	$scope.resolve = function() {
		$scope.target_error.invalid = false;
		$scope.target_error.domain = false;
		$scope.target_error.message = '';
		$scope.real_not_fund = false;
		$scope.real_accept = "";
		$scope.send_done = false;
		
		var snapshot = $scope.target_address;
		var i = snapshot.indexOf("*");
		var isFedNetwork = (snapshot.indexOf("~") == 0);
		var isRipple = ripple.UInt160.is_valid(snapshot);
		var isBitcoin = !isNaN(ripple.Base.decode_check([0, 5], snapshot, 'bitcoin'));
		if (i<0 && !isFedNetwork && !isRipple && !isBitcoin) {
			$scope.act_loading = false;
			$scope.is_federation = false;
			$scope.memo_provided = false;
			$scope.real_address = $scope.target_address;
			$scope.target_error.invalid = !StellarApi.isValidAddress(snapshot);
			$scope.resolveAccountInfo();
		} else {
			var prestr;
			var domain;
			
			if (i<0) {
				if (isFedNetwork) {
					prestr = snapshot.substring(1);
					domain = SettingFactory.getFedNetwork();
				}
				if (isRipple) {
					prestr = snapshot;
					domain = SettingFactory.getFedRipple();
				}
				if (isBitcoin) {
					prestr = snapshot;
					domain = SettingFactory.getFedBitcoin();
				}
			} else {
				prestr = snapshot.substring(0, i);
				domain = snapshot.substring(i+1);
			}
			
			$scope.target_domain = domain;
			$scope.act_loading = true;
			$scope.is_federation = true;
			$scope.real_address = '';
			StellarApi.federationServer(domain).then(function(server){
				server.resolveAddress(prestr).then(function(data){
					console.debug(prestr, data);
					$scope.act_loading = false;
					if (data.error) {
						$scope.target_error.message = data.detail || data.error;
					} else {
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
						console.debug(data);
						$scope.resolveAccountInfo();
					}
					$scope.$apply();
				}).catch(function(err){
					if (snapshot !== $scope.target_address) {
						return;
					}
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
				if (snapshot !== $scope.target_address) {
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
					if ($scope.src_code !== 'XLM') {
						$scope.pick('XLM', '');
					}
				} else {
					console.error('resolveAccountInfo', err);
				}
			} else {
				var accept = [];
				data.balances.forEach(function(line){
					if (line.asset_type == 'native') {
						accept.push('XLM');
					} else {
						if (accept.indexOf(line.asset_code) < 0) {
							accept.push(line.asset_code);
						}
					}
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
} ]);