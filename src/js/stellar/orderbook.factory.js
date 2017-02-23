myApp.factory('StellarOrderbook', ['$rootScope', function($scope) {
	var orderbook = {
		server : null,
	};
	
	orderbook.get = function(baseBuying, counterSelling, callback) {
		var key = getKey(baseBuying) + '/' + getKey(counterSelling);
		console.debug('orderbook', key);
		this.server.orderbook(getAsset(baseBuying), getAsset(counterSelling)).call().then(function(data){
			callback(null, data);
		}).catch(function(err){
			console.error(key, err);
			callback(err);
		});
	};
	
	orderbook.listen = function(baseBuying, counterSelling) {
		var key = getKey(baseBuying) + '/' + getKey(counterSelling);
		this.server.orderbook(getAsset(baseBuying), getAsset(counterSelling)).stream({
			onmessage: function(res){
				console.log('stream', key, res);
			}
		});
	}
	
	function getKey(code, issuer) {
		if (typeof code == 'object') {
			issuer = code.issuer;
			code = code.code;
		}
		return code == 'XLM' ? code : code + '.' + issuer;
	}
	
	function getAsset(code, issuer) {
		if (typeof code == 'object') {
			issuer = code.issuer;
			code = code.code;
		}
		return code == 'XLM' ? new StellarSdk.Asset.native() : new StellarSdk.Asset(code, issuer); 
	}

	return orderbook;
} ]);
