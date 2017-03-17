myApp.controller("TradeCtrl", [ '$scope', '$rootScope', 'StellarApi', 'StellarOrderbook',
                                  function($scope, $rootScope, StellarApi, StellarOrderbook) {
	$scope.offers = {
		origin : null,
		ask : [],
		bid : [],
		update : function(data) {
			this.origin = data;
			this.ask = [];
			this.bid = [];
			for (var i=0; i<data.length; i++) {
				var offer = data[i];
				var buy_code = offer.buying.asset_type == 'native' ? 'XLM' : offer.buying.asset_code;
				var buy_issuer = buy_code == 'XLM' ? '' : offer.buying.asset_issuer;
				var sell_code = offer.selling.asset_type == 'native' ? 'XLM' : offer.selling.asset_code;
				var sell_issuer = sell_code == 'XLM' ? '' : offer.selling.asset_issuer;
				
				if (sameAsset(sell_code, sell_issuer, $scope.base_code, $scope.base_issuer)
						&& sameAsset(buy_code, buy_issuer, $scope.counter_code, $scope.counter_issuer)) {
					this.ask.push({
						id : offer.id,
						amount : parseFloat(offer.amount),
						price  : parseFloat(offer.price),
						volume : offer.amount * offer.price
					});
				}
				if (sameAsset(sell_code, sell_issuer, $scope.counter_code, $scope.counter_issuer)
						&& sameAsset(buy_code, buy_issuer, $scope.base_code, $scope.base_issuer) ) {
					this.bid.push({
						id : offer.id,
						amount : offer.amount * offer.price,
						price  : 1 / offer.price,
						volume : parseFloat(offer.amount)
					});
				}
			}
		}
	}
	
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
	$scope.refreshBook();
	
	$scope.refreshOffer = function() {
		StellarApi.queryOffer(function(err, offers){
			if (err) {
				
			} else {
				$scope.offers.update(offers);
				console.log($scope.offers);
				$scope.$apply();
			}
		});
	}
	$scope.refreshOffer();
	
	$scope.buy_price;
	$scope.buy_amount;
	$scope.buy_volume;
	$scope.sell_price;
	$scope.sell_amount;
	$scope.sell_volume;
	$scope.calculate = function(name) {
		switch(name) {
		case 'buy_price':
			$scope.buy_volume = round($scope.buy_price * $scope.buy_amount, 8);
			break;
		case 'buy_amount':
			$scope.buy_volume = round($scope.buy_price * $scope.buy_amount, 8);
			break;
		case 'buy_volume':
			$scope.buy_amount = round($scope.buy_volume / $scope.buy_price, 8);
			break;
		case 'sell_price':
			$scope.sell_volume = round($scope.sell_price * $scope.sell_amount, 8);
			break;
		case 'sell_amount':
			$scope.sell_volume = round($scope.sell_price * $scope.sell_amount, 8);
			break;
		case 'sell_volume':
			$scope.sell_amount = round($scope.sell_volume / $scope.sell_price, 8);
			break;
		}
	}
	
	//option {type:'buy', currency:'XLM', issuer: '', base: 'CNY', base_issuer: 'GXXX', amount: 100, price: 0.01}
	$scope.offer = function(type) {
		var option = {
			type : type,
			currency : $scope.base_code,
			issuer   : $scope.base_issuer,
			base        : $scope.counter_code,
			base_issuer : $scope.counter_issuer0
		};
		if (type == 'buy') {
			option.amount = $scope.buy_amount;
			option.price  = $scope.buy_price;
		} else {
			option.amount = $scope.sell_amount;
			option.price  = $scope.sell_price;
		}
		StellarApi.offer(option, function(err, hash) {
			if (err) {
				
			} else {
				$scope.refreshOffer();
			}
		});
	}
	
	$scope.cancel = function(offer_id) {
		StellarApi.cancel(offer_id, function(err, hash){
			if (err) {
				
			} else {
				$scope.refreshOffer();
			}
		});
	}
	
	function sameAsset(code, issuer, code2, issuer2) {
		if (code == 'XLM') {
			return code == code2;
		} else {
			return code == code2 && issuer == issuer2;
		}
	}
	
	function round(dight, howMany) {
		if(howMany) {
			dight = Math.round(dight * Math.pow(10, howMany)) / Math.pow(10, howMany);
		} else {
			dight = Math.round(dight);
		}	
		return dight;
	}
} ]);
