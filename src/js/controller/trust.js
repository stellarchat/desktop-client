myApp.controller("TrustCtrl", [ '$scope', '$rootScope', 'StellarApi',
                                function($scope, $rootScope, StellarApi) {
	$scope.manual_code;
	$scope.manual_issuer;
	$scope.manual_logo = $rootScope.gateways.getSourceById($scope.manual_issuer).logo;
	$scope.manual_name;
	$scope.fed_url;
	$scope.fed_currencies = [];
	$scope.fed_error;
	$scope.fed_loading;
	
	$scope.resolve = function() {
		var snapshot = $scope.fed_url;
		$scope.fed_error = false;
		$scope.fed_loading = true;
		StellarApi.federation($scope.fed_url).then(function(res){
			$scope.fed_error = false;
			$scope.fed_loading = false;
			$scope.fed_currencies = res.CURRENCIES;
			$scope.$apply();
			console.debug(res);
		}).catch(function(err){
			if (snapshot !== $scope.fed_url) {
				return;
			}
			$scope.fed_currencies = [];
			$scope.fed_error = true;
			$scope.fed_loading = false;
			$scope.$apply();
			console.error(snapshot, err);
		});
	}
	$scope.issuerChange = function() {
		var gateway = $rootScope.gateways.getSourceById($scope.manual_issuer);
		$scope.manual_logo = gateway.logo;
		$scope.manual_name = gateway.name;
	}
	$scope.hasLine = function(code, issuer) {
		if (!$rootScope.lines[code] || !$rootScope.lines[code][issuer]) {
			return false;
		}
		return $rootScope.lines[code][issuer].limit > 0;
	};
	$scope.hasBalance = function(code, issuer) {
		if (!$rootScope.lines[code] || !$rootScope.lines[code][issuer]) {
			return false;
		}
		return $rootScope.lines[code][issuer].balance > 0;
	};
	$scope.changeState = {};
	$scope.setChanging = function(code, issuer, state) {
		if (!$scope.changeState[code]) {
			$scope.changeState[code] = {};
		}
		$scope.changeState[code][issuer] = state;
	};
	$scope.isChanging = function(code, issuer) {
		if ($scope.changeState[code] && $scope.changeState[code][issuer]) {
			return $scope.changeState[code][issuer];
		} else {
			return false;
		}
	}
	$scope.addTrust = function(code, issuer) {
		var code = code || $scope.manual_code;
		var issuer = issuer || $scope.manual_issuer;
		$scope.setChanging(code, issuer, true);
		$scope.trust_error = "";
		StellarApi.changeTrust(code, issuer, "100000000000", function(err, data){
			$scope.setChanging(code, issuer, false);
			if (err) {
				if (err.extras && err.extras.result_xdr) {
					var resultXdr = StellarSdk.xdr.TransactionResult.fromXDR(err.extras.result_xdr, 'base64');
					$scope.trust_error = resultXdr.result().results()[0].value().value().switch().name;
				} else {
					$scope.trust_error = err.detail || err.message;
				}
			}
			$rootScope.$apply();
		});
	};
	$scope.delTrust = function(code, issuer) {
		var code = code || $scope.manual_code;
		var issuer = issuer || $scope.manual_issuer;
		$scope.setChanging(code, issuer, true);
		$scope.trust_error = "";
		StellarApi.changeTrust(code, issuer, "0", function(err, data){
			$scope.setChanging(code, issuer, false);
			if (err) {
				if (err.extras && err.extras.result_xdr) {
					var resultXdr = StellarSdk.xdr.TransactionResult.fromXDR(err.extras.result_xdr, 'base64');
					$scope.trust_error = resultXdr.result().results()[0].value().value().switch().name;
				} else {
					$scope.trust_error = err.detail || err.message;
				}
			}
			$rootScope.$apply();
		});
	};
} ]);
