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
	$scope.precise = 4;
	
	$scope.book = {
		origin : null,
		asks : [],
		bids : [],
		update : function(data) {
			this.origin = data;
			this.asks = JSON.parse(JSON.stringify(data.asks));
			this.bids = JSON.parse(JSON.stringify(data.bids));
			var depth = 0;
			for (var i=0; i<this.asks.length; i++) {
				this.asks[i].volumn = this.asks[i].amount * this.asks[i].price;
				depth = depth + this.asks[i].volumn;
				this.asks[i].depth = depth;
			}
			depth = 0;
			for (var i=0; i<this.bids.length; i++) {
				this.bids[i].volumn = this.bids[i].amount * this.bids[i].price;
				depth = depth + this.bids[i].volumn;
				this.bids[i].depth = depth;
			}
			var max_depth = this.asks[this.asks.length-1].depth > this.bids[this.bids.length-1].depth ? this.asks[this.asks.length-1].depth : this.bids[this.bids.length-1].depth;
			for (var i=0; i<this.asks.length; i++) {
				this.asks[i].pct = Math.round(this.asks[i].depth / max_depth * 100, 2);
			}
			for (var i=0; i<this.bids.length; i++) {
				this.bids[i].pct = Math.round(this.bids[i].depth / max_depth * 100, 2);
			}
		}
	}
	
	$scope.refreshBook = function() {
		var base = {code: $scope.base_code, issuer: $scope.base_issuer};
		var counter = {code: $scope.counter_code, issuer: $scope.counter_issuer};
		StellarApi.queryBook(base, counter, function(err, data) {
			if (err) {
				
			} else {
				console.debug(!$scope.book.origin || !_.isEqual($scope.book.origin.asks, data.asks) || !_.isEqual($scope.book.origin.bids, data.bids) ? 'book changed': 'book unchange');
				if(!$scope.book.origin || !_.isEqual($scope.book.origin.asks, data.asks) || !_.isEqual($scope.book.origin.bids, data.bids)) {
					$scope.book.update(data);
					console.log($scope.book);
					$scope.$apply();
				}
			}
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
