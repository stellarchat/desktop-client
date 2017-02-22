myApp.controller("TradeCtrl", [ '$scope', '$rootScope', 'StellarApi', 'StellarOrderbook',
                                  function($scope, $rootScope, StellarApi, StellarOrderbook) {
	$scope.offers = [];
	$scope.offers_buy = [];
	$scope.offers_sell = [];
	
	$scope.base_code = 'XLM';
	$scope.base_issuer = '';
	$scope.counter_code = 'CNY';
	$scope.counter_issuer = $rootScope.gateways.data['ripplefox.com'].assets['CNY'].issuer;
	$scope.base = $rootScope.gateways.getSourceById($scope.base_issuer);
	$scope.counter = $rootScope.gateways.getSourceById($scope.counter_issuer);
	
	$scope.refreshBook = function() {
		var base = {code: $scope.base_code, issuer: $scope.base_issuer};
		var counter = {code: $scope.counter_code, issuer: $scope.counter_issuer};
		StellarOrderbook.get(base, counter, function(err, data) {
			
		});
	}
	
	StellarApi.queryOffer(function(err, offers){
		$scope.offers = offers;
		offers.forEach(function(offer){
			
		});
		$scope.$apply();
	});
	
	
	
	function sameAsset(code, issuer, code2, issuer2) {
		if (code == 'XLM') {
			return code == code2;
		} else {
			return code == code2 && issuer == issuer2;
		}
	}
} ]);
