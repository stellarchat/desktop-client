myApp.controller("PaymentsCtrl", [ '$scope', '$rootScope', 'StellarApi', 
                                  function($scope, $rootScope, StellarApi) {
	$scope.payments = [];
	
	$scope.working = false;
	$scope.refresh = function() {
		if ($scope.working) { return; }
		StellarApi.queryPayments(function(err, payments){
			if (err) {
				$scope.error_msg = err.message;
			} else {
				$scope.error_msg = "";
				$scope.payments = payments;
			}
			$scope.working = false;
			$scope.$apply();
		});
		$scope.working = true;
	};
	
	$scope.refresh();
} ]);

myApp.controller("TradesCtrl", [ '$scope', '$rootScope', 'StellarApi', 
                                   function($scope, $rootScope, StellarApi) {
 	$scope.trades = [];
 	
 	$scope.working = false;
 	$scope.refresh = function() {
 		if ($scope.working) { return; }
 		StellarApi.queryEffects(function(err, trades){
 			if (err) {
 				$scope.error_msg = err.message;
 			} else {
 				$scope.error_msg = "";
 				$scope.trades = trades;
 			}
 			$scope.working = false;
 			$scope.$apply();
 		});
 		$scope.working = true;
 	};
 	
 	$scope.refresh();
 } ]);