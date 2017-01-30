myApp.controller("SendCtrl", ['$scope', '$rootScope', 'StellarApi',
                              function($scope, $rootScope, StellarApi) {
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
		
		var snapshot = $scope.target_address;
		var i = snapshot.indexOf("*");
		if (i<0) {
			$scope.act_loading = false;
			$scope.is_federation = false;
			$scope.memo_provided = false;
			$scope.real_address = $scope.target_address;
			$scope.target_error.invalid = !StellarApi.isValidAddress(snapshot);
		} else {
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
					}
					$scope.$apply();
				}).catch(function(err){
					if (snapshot !== $scope.target_address) {
						return;
					}
					$scope.target_error.message = err.message;
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
	$scope.send = function() {
		$scope.sending = true;
		StellarApi.send($scope.real_address, $scope.src_code, $scope.src_issuer, 
				$scope.target_amount, $scope.memo_type, $scope.memo, function(err, hash){
			$scope.sending = false;
			if (err) {
				console.error('SendFail', err);
				$scope.target_error.message = err.message;
			} else {
				$scope.target_error.message = '';
			}
			$rootScope.$apply();
		});
	};
} ]);