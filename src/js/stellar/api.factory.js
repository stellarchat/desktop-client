myApp.factory('StellarApi', ['$rootScope', 'StellarHistory', 'StellarOrderbook', function($scope, history, orderbook) {
	var api = {
		address : undefined,
		seed : undefined,
		balances : {}
	};
	
	api.random = function() {
		var keypair = StellarSdk.Keypair.random();
		this.address = keypair.accountId();
		this.seed = keypair.seed();
		return {address: this.address, secret: this.seed};
	};
	
	api.getAddress = function(seed) {
		var seed = seed || this.seed;
		var keypair = StellarSdk.Keypair.fromSeed(seed);
		return keypair.accountId();
	};
	
	api.isValidAddress = function(address) {
		return StellarSdk.Keypair.isValidPublicKey(address);
	};
	api.federation = function(fed_url) {
		return StellarSdk.StellarTomlResolver.resolve(fed_url);
	};
	api.federationServer = function(domain) {
		return StellarSdk.FederationServer.createForDomain(domain);
	};
	
	api.setServer = function(url) {
		var url = url || 'https://horizon.stellar.org';
		
		StellarSdk.Network.usePublicNetwork();
		this.server = new StellarSdk.Server(url);
		history.server = this.server;
		orderbook.server = this.server;
	};
	api.setAccount = function(address, seed) {
		this.address = address;
		this.seed = seed;
	};
	api.isValidMemo = function(type, memo) {
		try {
			switch (type.toUpperCase()) {
			case 'ID':
				StellarSdk.Memo.id(memo);
				break;
			case 'TEXT':
				StellarSdk.Memo.text(memo);
				break;
			case 'HASH':
				StellarSdk.Memo.hash(memo);
				break;
			default : 
				return 'Unkown Type';
			}
		} catch (e) {
			return e.message;
		}
		return '';
	};
	api.getMemo = function(type, memo) {
		if (memo) {
			switch (type.toUpperCase()) {
			case 'ID':
				return StellarSdk.Memo.id(memo);
			case 'TEXT':
				return StellarSdk.Memo.text(memo);
			case 'HASH':
				return StellarSdk.Memo.hash(memo);
			}
		} else {
			return StellarSdk.Memo.none();
		}
		throw new Error('UnSupportMemo');
	};
	api.isFunded = function(address, callback) {
		var self = this;
		self.server.accounts().accountId(address).call().then(function(accountResult){
			callback(null, true);
		}).catch(function(err){
			if (err.name === 'NotFoundError') {
				callback(null, false);
			} else {
				callback(err, false);
			}
		});
	};
	api.fund = function(target, amount, memo_type, memo_value, callback) {
		var self = this;
		amount = Math.round(amount, 7);
		self.server.loadAccount(self.address).then(function(account){
			var payment = StellarSdk.Operation.createAccount({
				destination: target,
				startingBalance: amount.toString()
	        });
			var memo = self.getMemo(memo_type, memo_value);
	        var tx = new StellarSdk.TransactionBuilder(account, {memo:memo}).addOperation(payment).build();
	        tx.sign(StellarSdk.Keypair.fromSeed(self.seed));
	        return self.server.submitTransaction(tx);
		}).then(function(txResult){
			console.debug('Funded.', txResult);
			callback(null, txResult.hash);
		}).catch(function(err){
			console.error('Fund Fail !', err);
			callback(err, null);
		});
	};
	api.sendXLM = function(target, amount, memo_type, memo_value, callback) {
		var self = this;
		amount = Math.round(amount, 7);
		self.server.loadAccount(self.address).then(function(account){
			var payment = StellarSdk.Operation.payment({
				destination: target,
				asset: StellarSdk.Asset.native(),
				amount: amount.toString()
	        });
			var memo = self.getMemo(memo_type, memo_value);
	        var tx = new StellarSdk.TransactionBuilder(account, {memo:memo}).addOperation(payment).build();
	        tx.sign(StellarSdk.Keypair.fromSeed(self.seed));
	        return self.server.submitTransaction(tx);
		}).then(function(txResult){
			console.log('Send XLM done.', txResult);
			callback(null, txResult.hash);
		}).catch(function(err){
			console.error('Send Fail !', err);
			callback(err, null);
		});
	};
	api.sendAsset = function(target, currency, issuer, amount, memo_type, memo_value, callback) {
		var self = this;
		amount = Math.round(amount, 7);
		self.server.loadAccount(self.address).then(function(account){
			var payment = StellarSdk.Operation.payment({
				destination: target,
				asset: new StellarSdk.Asset(currency, issuer),
				amount: amount.toString()
	        });
			var memo = self.getMemo(memo_type, memo_value);
	        var tx = new StellarSdk.TransactionBuilder(account, {memo:memo}).addOperation(payment).build();
	        tx.sign(StellarSdk.Keypair.fromSeed(self.seed));
	        return self.server.submitTransaction(tx);
		}).then(function(txResult){
			console.log('Send Asset done.', txResult);
			callback(null, txResult.hash);
		}).catch(function(err){
			console.error('Send Fail !', err);
			callback(err, null);
		});
	};
	api.send = function(target, currency, issuer, amount, memo_type, memo_value, callback) {
		amount = Math.round(amount, 7);
		console.debug(target, currency, issuer, amount, memo_type, memo_value);
		var self = this;
		if (currency == 'XLM') {
			self.isFunded(target, function(err, isFunded){
				if (err) {
					return callback(err, null);
				} else {
					if (isFunded) {
						self.sendXLM(target, amount, memo_type, memo_value, callback);
					} else {
						self.fund(target, amount, memo_type, memo_value, callback);
					}
				}
			});
		} else {
			self.sendAsset(target, currency, issuer, amount, memo_type, memo_value, callback);
		}
	};
	
	api.listenStream = function() {
		var self = this;
		self.server.accounts().accountId(self.address).stream({
    		onmessage: function(res){
    			if(!_.isEqual(self.balances, res.balances)) {
    				self.balances = res.balances;
    				self.updateRootBalance();
    				$scope.$apply();
    				console.warn('balance', self.balances, res);
    			}
    		}
    	});
	};
	
	api.updateRootBalance = function(balances) {
		var self = this;
		var balances = balances || self.balances;
		var native = 0;
		var lines = {};
		
		balances.forEach(function(line){
			if (line.asset_type == 'native') {
				native = parseFloat(line.balance);
			} else {
				if (!lines[line.asset_code]) {
					lines[line.asset_code] = {};
				}
				var item = {
					code : line.asset_code,
					issuer : line.asset_issuer,
					balance : parseFloat(line.balance),
					limit : parseFloat(line.limit)
				};
				lines[line.asset_code][line.asset_issuer] = item;
			}
		});
		console.log('lines', lines);
		$scope.balance = native;
		$scope.lines = lines;
	}
	
	api.getInfo = function(address, callback) {
		var address = address || this.address;
		this.server.accounts().accountId(address).call().then(function(data){
			console.log(address, data);
			callback(null, data);
		}).catch(function(err){
			if (err.name == 'NotFoundError') {
				console.warn(address, err.name);
				callback(new Error(err.name));
			} else {
				console.error(err);
				callback(err, null);
			}
		});
	};
	
	api.changeTrust = function(code, issuer, limit, callback) {
		var self = this;
		var asset = new StellarSdk.Asset(code, issuer);
		console.debug('Turst asset', asset, limit);
		self.server.loadAccount(self.address).then(function(account){
			var op = StellarSdk.Operation.changeTrust({
				asset: asset,
				limit: limit.toString()
	        });
	        var tx = new StellarSdk.TransactionBuilder(account).addOperation(op).build();
	        tx.sign(StellarSdk.Keypair.fromSeed(self.seed));
	        return self.server.submitTransaction(tx);
		}).then(function(txResult){
			console.log(txResult);
			console.log('Trust updated.', txResult.hash);
			callback(null, txResult.hash);
		}).catch(function(err){
			console.error('Trust Fail !', err);
			callback(err, null);
		});
	};
	
	api.queryAccount = function(callback) {
		var self = this;
		console.debug('query', self.address);
		self.getInfo(self.address, function(err, data){
			if (err) {
				if (callback) { callback(err); }
				return;
			}
			self.balances = data.balances;
			self.updateRootBalance();
			$scope.$apply();
			if (callback) { callback(); }
			return;
		});
	};
	
	api.queryPayments = function(callback) {
		console.debug('payments', this.address);
		history.payments(this.address, callback);
	};
	
	api.queryEffects = function(callback) {
		console.debug('effects', this.address);
		history.effects(this.address, callback);
	};
	
	api.queryTransactions = function(callback) {
		console.debug('transactions', this.address);
		history.transactions(this.address, callback);
	};
	
	api.queryBook = function(baseBuy, counterSell, callback) {
		orderbook.get(baseBuy, counterSell, callback);
	};
	
	api.queryOffer = function(callback) {
		var self = this;
		console.debug('offers', self.address);
		self.server.offers('accounts', self.address).call().then(function(data) {
			console.log('offers', data.records);
			callback(null, data.records);
		}).catch(function(err){
			console.error('QueryOffer Fail !', err);
			callback(err, null);
		});
	};
	
	api._offer = function(selling, buying, amount, price, callback) {
		var self = this;
		amount = Math.round(amount, 7);
		console.debug('Sell', amount, selling.code, 'for', buying.code, '@', price);
		self.server.loadAccount(self.address).then(function(account){
			var op = StellarSdk.Operation.manageOffer({
				selling: selling,
				buying: buying,
				amount: amount.toString(),
				price : price.toString()
	        });
	        var tx = new StellarSdk.TransactionBuilder(account).addOperation(op).build();
	        tx.sign(StellarSdk.Keypair.fromSeed(self.seed));
	        return self.server.submitTransaction(tx);
		}).then(function(txResult){
			console.log(txResult);
			callback(null, txResult.hash);
		}).catch(function(err){
			console.error('Offer Fail !', err);
			callback(err, null);
		});
	};
	
	// option {type:'buy', currency:'XLM', issuer: '', base: 'CNY', base_issuer: 'GXXX', amount: 100, price: 0.01}
	api.offer = function(option, callback) {
		var self = this;
		console.debug('%s %s %s use %s@ %s', option.type, option.amount, option.currency, option.base, option.price);
		var buying, selling;
		var selling_amount, selling_price;
		
		if (option.type == 'buy') {
			selling = getAsset(option.base, option.base_issuer);
			buying = getAsset(option.currency, option.issuer);
			selling_amount = option.amount * option.price;
			selling_price = 1 / option.price;
		} else {
			selling = getAsset(option.currency, option.issuer);
			buying = getAsset(option.base, option.base_issuer);
			selling_amount = option.amount;
			selling_price = option.price;
		}
		self._offer(selling, buying, selling_amount, selling_price, callback);
	};
	
	api.cancel = function(offer_id, callback) {
		var self = this;
		console.debug('Cancel Offer', offer_id);
		self.server.loadAccount(self.address).then(function(account){
			var op = StellarSdk.Operation.manageOffer({
				selling: StellarSdk.Asset.native(),
				buying: new StellarSdk.Asset('DUMMY', account.accountId()),
				amount: "0",
				price : "1",
				offerId : offer_id
	        });
	        var tx = new StellarSdk.TransactionBuilder(account).addOperation(op).build();
	        tx.sign(StellarSdk.Keypair.fromSeed(self.seed));
	        return self.server.submitTransaction(tx);
		}).then(function(txResult){
			console.log(txResult);
			callback(null, txResult.hash);
		}).catch(function(err){
			console.error('Cancel Offer Fail !', err);
			callback(err, null);
		});
	};
	
	function getAsset(code, issuer) {
		if (typeof code == 'object') {
			issuer = code.issuer;
			code = code.code;
		}
		return code == 'XLM' ? new StellarSdk.Asset.native() : new StellarSdk.Asset(code, issuer); 
	}

	return api;
} ]);
