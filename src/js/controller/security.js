myApp.controller("SecurityCtrl", ['$scope', 'AuthenticationFactory', 'StellarApi',
	function($scope, AuthenticationFactory, StellarApi) {
		$scope.mode = 'security';
		$scope.isMode = function(mode) {
			return $scope.mode === mode;
	    }
		$scope.setMode = function(mode) {
			return $scope.mode = mode;
	    }
	
		$scope.keyOpen = JSON.parse(AuthenticationFactory.userBlob).masterkey;
		$scope.key = $scope.keyOpen[0] + new Array($scope.keyOpen.length).join("*");
		
	    $scope.showSec = function(flag) {
			$scope.showSecret = flag;
		};
		
		$scope.network_error;
		$scope.refresh = function() {
			StellarApi.getInfo(null, function(err, data) {
				if (err) {
					if (err.message) {
						$scope.network_error = err.message;
					} else {
						if (err.extras && err.extras.result_xdr) {
							var resultXdr = StellarSdk.xdr.TransactionResult.fromXDR(err.extras.result_xdr, 'base64');
							$scope.network_error = resultXdr.result().results()[0].value().value().switch().name;
						} else {
							console.error("Unhandle!!", err);
						}
					}
				} else {
					$scope.inflation = data.inflation_destination;
					$scope.domain = data.home_domain;
					$scope.$apply();
				}
			});
		};
		$scope.refresh();
		
		$scope.inflation = '';
		$scope.inflation_working = false;
		$scope.inflation_error = '';
		$scope.inflation_done = false;
		$scope.setInflation = function() {
			$scope.inflation_error = '';
			$scope.inflation_done = false;
			$scope.inflation_working = true;
			StellarApi.setOption('inflationDest', $scope.inflation, function(err, hash){
				$scope.inflation_working = false;
				if (err) {
					if (err.message) {
						$scope.inflation_error = err.message;
					} else {
						if (err.extras && err.extras.result_xdr) {
							var resultXdr = StellarSdk.xdr.TransactionResult.fromXDR(err.extras.result_xdr, 'base64');
							$scope.inflation_error = resultXdr.result().results()[0].value().value().switch().name;
						} else {
							console.error("Unhandle!!", err);
						}
					}
				} else {
					$scope.inflation_done = true;
				}
				$scope.$apply();
			});
		};
		$scope.setInflationFox = function() {
			$scope.inflation = 'GAREELUB43IRHWEASCFBLKHURCGMHE5IF6XSE7EXDLACYHGRHM43RFOX';
			$scope.setInflation();
		}
		$scope.setInflationPool = function() {
			$scope.inflation = 'GA3FUYFOPWZ25YXTCA73RK2UGONHCO27OHQRSGV3VCE67UEPEFEDCOPA';
			$scope.setInflation();
		}
		
		$scope.domain = '';
		$scope.domain_working = false;
		$scope.domain_error = '';
		$scope.domain_done = false;
		$scope.setDomain = function() {
			$scope.domain_error = '';
			$scope.domain_done = false;
			$scope.domain_working = true;
			StellarApi.setOption('homeDomain', $scope.domain, function(err, hash){
				$scope.domain_working = false;
				if (err) {
					if (err.message) {
						$scope.domain_error = err.message;
					} else {
						if (err.extras && err.extras.result_xdr) {
							var resultXdr = StellarSdk.xdr.TransactionResult.fromXDR(err.extras.result_xdr, 'base64');
							$scope.domain_error = resultXdr.result().results()[0].value().value().switch().name;
						} else {
							console.error("Unhandle!!", err);
						}
					}
				} else {
					$scope.domain_done = true;
				}
				$scope.$apply();
			});
		};
	}
]);