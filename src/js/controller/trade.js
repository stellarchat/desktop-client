myApp.controller("TradeCtrl", [ '$scope', '$rootScope', 'StellarApi', 
                                  function($scope, $rootScope, StellarApi) {
	$scope.offers = [];
	$scope.offers_buy = [];
	$scope.offers_sell = [];
	
	$scope.base_code = 'XLM';
	$scope.base_issuer = '';
	$scope.counter_code = 'CNY';
	$scope.counter_issuer = $rootScope.gateways.data['ripplefox.com'].assets['CNY'].issuer;
	$scope.base = $rootScope.gateways.getSourceById($scope.base_issuer);
	$scope.counter = $rootScope.gateways.getSourceById($scope.counter_issuer);
	
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
