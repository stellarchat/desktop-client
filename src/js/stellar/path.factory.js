myApp.factory('StellarPath', ['$rootScope', function($scope) {
	var path = {
		server : null,
		closeStream : undefined
	};
	
	path.close = function(){
		if (this.closeStream) {
			this.closeStream();
			this.closeStream = undefined;
		}
	};
	
	path.get = function(src, dest, code, issuer, amount, callback) {
		this.server.paths(src, dest, getAsset(code, issuer), amount).call().then(function(data){
			callback(null, data);
		}).catch(function(err){
			console.error(amount, code, issuer, err);
			callback(err);
		});
	};
	
	// stellar-sdk does not have path stream feature. :( 
	path.listen = function(src, dest, code, issuer, amount, handler) {
		var self = this;
		console.debug('listen path ' + amount + ' ' + code);
		self.closeStream = self.server.paths(src, dest, getAsset(code, issuer), amount).stream({
			onmessage: function(res){
				console.log('stream', amount + code, res);
				handler(res);
			},
			onerror : function(res) {
				console.error('stream', amount + code, res);
			}
		});
	}
	
	function getAsset(code, issuer) {
		if (typeof code == 'object') {
			issuer = code.issuer;
			code = code.code;
		}
		return code == 'XLM' ? new StellarSdk.Asset.native() : new StellarSdk.Asset(code, issuer); 
	}

	return path;
} ]);
