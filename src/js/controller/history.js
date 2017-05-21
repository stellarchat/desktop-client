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
 	$scope.next = undefined;
 	
 	$scope.loading = false;
 	$scope.refresh = function() {
 		if ($scope.loading) { return; }
 		$scope.loading = true;
 		$scope.trades = [];
 		$scope.next = undefined;
 		
 		StellarApi.queryTransactions(function(err, trades, nextPage){
 			$scope.loading = false;
 			if (err) {
 				$scope.error_msg = err.message;
 			} else {
 				$scope.error_msg = "";
 				$scope.trades = trades;
 				$scope.next = nextPage;
 			}
 			$scope.$apply();
 		});
 	};
 	$scope.refresh();
 	
 	$scope.load_more = function() {
 		if ($scope.loading) { return; }
 		$scope.loading = true;
 		StellarApi.queryTransactionsNext($scope.next, function(err, trades, nextPage){
 			$scope.loading = false;
 			if (err) {
 				$scope.error_msg = err.message;
 			} else {
 				$scope.error_msg = "";
 				trades.forEach(function(item){
 					$scope.trades.push(item);
 				});
 				$scope.next = nextPage;
 			}
 			$scope.$apply();
 		});
 	};
 } ]);