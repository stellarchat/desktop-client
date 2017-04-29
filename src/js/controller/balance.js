myApp.controller("BalanceCtrl", [ '$scope', '$rootScope', 'StellarApi', 
                                  function($scope, $rootScope, StellarApi) {
	$scope.working = false;
	$scope.refresh = function() {
		if ($scope.working) { return; }
		$scope.working = true;
		StellarApi.queryAccount(function(err){
			$scope.$apply(function(){
				$scope.working = false;
			});
		});
		$scope.estimate();
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
	
	$scope.price = {};
	$scope.getPrice = function(code, issuer, callback) {
		var base = {code: code, issuer: issuer};
		var counter = {code: 'XLM', issuer: ''};
		StellarApi.queryBook(base, counter, function(err, data) {
			if (err) {
				console.error('Price ' + base + '.' + issuer, err);
			} else {
				if (data.bids && data.bids[0]) {
					$scope.price[code + '.' + issuer] = parseFloat(data.bids[0].price);
					console.debug('Price ' + code + '.' + issuer, $scope.price[code + '.' + issuer]);
				}
			}
			callback();
		});
	}
	
	$scope.estimated_value = 0;
	$scope.calculate_estimated = function() {
		$scope.estimated_value = $rootScope.balance;
		for (var code in $rootScope.lines) {
			for (var issuer in $rootScope.lines[code]) {
				if (!$scope.price[code + '.' + issuer]) {
					$scope.price[code + '.' + issuer] = 0;
				}
				$scope.estimated_value += $rootScope.lines[code][issuer].balance * $scope.price[code + '.' + issuer];
			}
		}
	}
	$scope.estimate = function() {
		$scope.calculate_estimated();
		for (var code in $rootScope.lines) {
			for (var issuer in $rootScope.lines[code]) {
				$scope.getPrice(code, issuer, function(err, price){
					$scope.calculate_estimated();
					$scope.$apply();
				});
			}
		}
	}
	$scope.estimate();
	
	$scope.$on("balanceChange", function() {
		$scope.estimate();
		console.debug('balanceChange', $scope.estimated_value);
	});
} ]);
