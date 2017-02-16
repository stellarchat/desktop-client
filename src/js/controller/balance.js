myApp.controller("BalanceCtrl", [ '$scope', '$rootScope', 'StellarApi', 
                                  function($scope, $rootScope, StellarApi) {
	$scope.working = false;
	$scope.refresh = function() {
		if ($scope.working) { return; }
		StellarApi.queryAccount(function(err){
			$scope.$apply(function(){
				$scope.working = false;
			});
		});
		$scope.working = true;
	};
	$scope.delTrust = function(code, issuer) {
		$scope.setRemoving(code, issuer, true);
		StellarApi.changeTrust(code, issuer, "0", function(err, data){
			$scope.setRemoving(code, issuer, false);
			$scope.$apply();
		});
	};
	
	$scope.removeState = {};
	$scope.setRemoving = function(code, issuer, state) {
		if (!$scope.removeState[code]) {
			$scope.removeState[code] = {};
		}
		$scope.removeState[code][issuer] = state;
	};
	$scope.isRemoving = function(code, issuer) {
		if ($scope.removeState[code] && $scope.removeState[code][issuer]) {
			return $scope.removeState[code][issuer];
		} else {
			return false;
		}
	}
	
	console.debug('balance init');
} ]);
