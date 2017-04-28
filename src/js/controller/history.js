myApp.controller("PaymentsCtrl", [ '$scope', '$rootScope', 'StellarApi', 'FedNameFactory',
                                  function($scope, $rootScope, StellarApi, FedNameFactory) {
	$scope.payments = [];
	
	$scope.working = false;
	$scope.refresh = function() {
		if ($scope.working) { return; }
		StellarApi.queryPayments(function(err, payments){
			$scope.working = false;
			if (err) {
				$scope.error_msg = err.message;
			} else {
				$scope.error_msg = "";
				$scope.payments = payments;
			}
			$scope.updateAllNick();
			$scope.$apply();
		});
		$scope.working = true;
	};
	$scope.refresh();
	
	$scope.updateAllNick = function() {
		$scope.payments.forEach(function(tx) {
			if (FedNameFactory.isCached(tx.counterparty)) {
				tx.nick = FedNameFactory.getName(tx.counterparty);
			} else {
				FedNameFactory.resolve(tx.counterparty, function(err, data) {
					if (err) {
						console.error(err);
					} else {
						$scope.updateNick(tx.counterparty, data.nick);
						$scope.$apply();
					}
				});
			}
		});
	};
	
	$scope.updateNick = function(address, nick) {
		$scope.payments.forEach(function(tx) {
			if (tx.counterparty === address) {
				tx.nick = nick;
			}
		});
	};
} ]);

myApp.controller("TradesCtrl", [ '$scope', '$rootScope', 'StellarApi', 
                                   function($scope, $rootScope, StellarApi) {
 	$scope.trades = [];
 	
 	$scope.working = false;
 	$scope.refresh = function() {
 		if ($scope.working) { return; }
 		StellarApi.queryTransactions(function(err, trades){
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