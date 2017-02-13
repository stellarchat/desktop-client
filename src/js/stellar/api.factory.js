myApp.factory('StellarApi', ['$rootScope', function($scope) {
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
    				console.warn(self.balances, res);
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
		console.log(lines);
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
		var self = this;
		console.debug('payments', self.address);
		self.server.payments().forAccount(self.address).order("desc").limit("200").call().then(function(data){
			console.log(data);
			var payments = []; 
			data.records.forEach(function(r){
				var t = { "id": r.id, "type": r.type };
				switch(r.type){
				case 'payment':
					t.isInbound = r.to == self.address;
					t.counterparty = t.isInbound ? r.from : r.to;
					t.asset = r.asset_type == "native" ? {code: "XLM"} : {code:r.asset_code, issuer: r.asset_issuer};
					t.amount = r.amount;
					break;
				case 'create_account':
					t.isInbound = r.account == self.address;
					t.counterparty = t.isInbound ? r.source_account : r.account;
					t.asset = {code: "XLM"};
					t.amount = r.starting_balance;
					break;
				default:
					
				}
				payments.push(t);
			});
			callback(null, payments);
		}).catch(function(err){
			console.error('Payments Fail !', err);
			callback(err, null);
		});
	};
	
	api.queryEffects = function(callback) {
		var self = this;
		console.debug('effects', self.address);
		self.server.effects().forAccount(self.address).order("desc").limit("200").call().then(function(data){
			console.log(data);
			var effects = []; 
			data.records.forEach(function(r){
				var t = { "id": r.id, "type": r.type };
				switch(r.type){
				case 'payment':
					t.isInbound = r.to == self.address;
					t.counterparty = t.isInbound ? r.from : r.to;
					t.asset = r.asset_type == "native" ? {code: "XLM"} : {code:r.asset_code, issuer: r.asset_issuer};
					t.amount = r.amount;
					break;
				case 'create_account':
					t.isInbound = r.account == self.address;
					t.counterparty = t.isInbound ? r.source_account : r.account;
					t.asset = {code: "XLM"};
					t.amount = r.starting_balance;
					break;
				default:
					
				}
				effects.push(t);
			});
			callback(null, effects);
		}).catch(function(err){
			console.error('Effects Fail !', err);
			callback(err, null);
		});
	}

	return api;
} ]);
