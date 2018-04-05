myApp.factory('StellarApi', ['$rootScope', 'StellarHistory', 'StellarOrderbook', 'StellarPath', 
		function($scope, history, orderbook, path) {
	var api = {
		address : undefined,
		seed : undefined,
		closeAccountStream : undefined,
		closeTxStream : undefined,
		balances : {},
		subentry : 0,
		seq : {
			snapshot : "",
			time : new Date()
		}
	};
	
	api.logout = function() {
		this.adress = undefined;
		this.seed = undefined;
		this.balances = {};
		this.subentry = 0;
		this.seq.snapshot = "";
		this.seq.time = new Date();
		if (this.closeAccountStream) {
			this.closeAccountStream();
			this.closeAccountStream = undefined;
		}
		if (this.closeTxStream) {
			this.closeTxStream();
			this.closeTxStream = undefined;
		}
		orderbook.close();
		path.close();
	}
	
	api.updateSeq = function(account) {
		var self = this;
		var now = new Date();
		// In the same ledger
		if (now - self.seq.time < 5000) {
			for (;account.sequence <= self.seq.snapshot;) {
				account.incrementSequenceNumber();
				console.debug('Sequence: ' + self.seq.snapshot + ' -> ' + account.sequence);
			}
		}
		self.seq.snapshot = account.sequence;
		self.seq.time = now;
	}
	
	api.random = function() {
		var keypair = StellarSdk.Keypair.random();
		this.address = keypair.publicKey();
		this.seed = keypair.secret();
		return {address: this.address, secret: this.seed};
	};
	
	api.getAddress = function(seed) {
		var seed = seed || this.seed;
		var keypair = StellarSdk.Keypair.fromSecret(seed);
		return keypair.publicKey();
	};
	
	api.isValidAddress = function(address) {
		return StellarSdk.StrKey.isValidEd25519PublicKey(address);
	};
	api.federation = function(fed_url) {
		return StellarSdk.StellarTomlResolver.resolve(fed_url);
	};
	api.federationServer = function(domain) {
		return StellarSdk.FederationServer.createForDomain(domain);
	};
	
	api.setServer = function(url, type, passphrase) {
		var url = url || 'https://horizon.stellar.org';
		if ('test' == type) {
			console.debug("TestNetwork: " + url);
			StellarSdk.Network.useTestNetwork();
			this.server = new StellarSdk.Server(url, {allowHttp: true});
		} else if ('other' == type) {
			console.debug("Use Network: " + url + ', Passphrase: ' + passphrase);
			StellarSdk.Network.use(new StellarSdk.Network(passphrase));
			this.server = new StellarSdk.Server(url, {allowHttp: true});
		} else {
			console.debug("PublicNetwork: " + url);
			StellarSdk.Network.usePublicNetwork();
			this.server = new StellarSdk.Server(url);
		}
		history.server = this.server;
		orderbook.server = this.server;
		path.server = this.server;
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
		amount = round(amount, 7);
		self.server.loadAccount(self.address).then(function(account){
			self.updateSeq(account);
			var payment = StellarSdk.Operation.createAccount({
				destination: target,
				startingBalance: amount.toString()
	        });
			var memo = self.getMemo(memo_type, memo_value);
	        var tx = new StellarSdk.TransactionBuilder(account, {memo:memo}).addOperation(payment).build();
	        tx.sign(StellarSdk.Keypair.fromSecret(self.seed));
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
		amount = round(amount, 7);
		self.server.loadAccount(self.address).then(function(account){
			self.updateSeq(account);
			var payment = StellarSdk.Operation.payment({
				destination: target,
				asset: StellarSdk.Asset.native(),
				amount: amount.toString()
	        });
			var memo = self.getMemo(memo_type, memo_value);
	        var tx = new StellarSdk.TransactionBuilder(account, {memo:memo}).addOperation(payment).build();
	        tx.sign(StellarSdk.Keypair.fromSecret(self.seed));
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
		amount = round(amount, 7);
		self.server.loadAccount(self.address).then(function(account){
			self.updateSeq(account);
			var payment = StellarSdk.Operation.payment({
				destination: target,
				asset: new StellarSdk.Asset(currency, issuer),
				amount: amount.toString()
	        });
			var memo = self.getMemo(memo_type, memo_value);
	        var tx = new StellarSdk.TransactionBuilder(account, {memo:memo}).addOperation(payment).build();
	        tx.sign(StellarSdk.Keypair.fromSecret(self.seed));
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
		amount = round(amount, 7);
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
	
	api.convert = function(alt, callback) {
		var self = this;
		console.debug(alt.origin.source_amount + '/' + alt.src_code + ' -> ' + alt.origin.destination_amount + '/' + alt.dst_code);
		var path = alt.origin.path.map(function(item){
			if (item.asset_type == 'native') {
				return new StellarSdk.Asset.native();
			} else {
				return new StellarSdk.Asset(item.asset_code, item.asset_issuer);
			}
		});
		var sendMax = alt.origin.source_amount;
		if (alt.max_rate) {
			sendMax = round(alt.max_rate * sendMax, 7).toString();
		}
		self.server.loadAccount(self.address).then(function(account){
			self.updateSeq(account);
			var pathPayment = StellarSdk.Operation.pathPayment({
				destination: self.address,
				sendAsset  : getAsset(alt.src_code, alt.src_issuer),
				sendMax    : sendMax,
				destAsset  : getAsset(alt.dst_code, alt.dst_issuer),
				destAmount : alt.origin.destination_amount,
				path       : path
	        });
	        var tx = new StellarSdk.TransactionBuilder(account).addOperation(pathPayment).build();
	        tx.sign(StellarSdk.Keypair.fromSecret(self.seed));
	        return self.server.submitTransaction(tx);
		}).then(function(txResult){
			console.log('Send Asset done.', txResult);
			callback(null, txResult.hash);
		}).catch(function(err){
			console.error('Send Fail !', err);
			callback(err, null);
		});
	};
	
	api.listenStream = function() {
		var self = this;
		if (self.closeAccountStream) {
			self.closeAccountStream();
			self.closeAccountStream = undefined;
		}
		if (self.closeTxStream) {
			self.closeTxStream();
			self.closeTxStream = undefined;
		}
		
		self.closeAccountStream = self.server.accounts().accountId(self.address).stream({
    		onmessage: function(res){
    			if (self.subentry !== res.subentry_count) {
    				console.debug('subentry: ' + self.subentry + ' -> ' + res.subentry_count);
    				self.subentry = res.subentry_count;
    				$scope.reserve = self.subentry * 0.5 + 1;
    				$scope.$apply();
    			}
    			if(!_.isEqual(self.balances, res.balances)) {
    				console.debug('balances: ', self.balances, res.balances);
    				self.balances = res.balances;
    				self.updateRootBalance();
    				$scope.$apply();
    			}
    		}
    	});
		
		// TODO: parse the tx and do action
		self.closeTxStream = self.server.transactions().forAccount(self.address)
    		.cursor("now")
	    	.stream({
	    		onmessage: function(res) {
	    			var tx = history.processTx(res, self.address);
	    			console.log('tx stream', tx);
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
		$scope.$broadcast("balanceChange");
	}
	
	api.getInfo = function(address, callback) {
		var address = address || this.address;
		this.server.accounts().accountId(address).call().then(function(data){
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
			self.updateSeq(account);
			var op = StellarSdk.Operation.changeTrust({
				asset: asset,
				limit: limit.toString()
	        });
	        var tx = new StellarSdk.TransactionBuilder(account).addOperation(op).build();
	        tx.sign(StellarSdk.Keypair.fromSecret(self.seed));
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
	
	api.setOption = function(name, value, callback) {
		var self = this;
		var opt = {};
		opt[name] = value
		console.debug('set option:', name, '-', value);
		self.server.loadAccount(self.address).then(function(account){
			self.updateSeq(account);
			var op = StellarSdk.Operation.setOptions(opt);
	        var tx = new StellarSdk.TransactionBuilder(account).addOperation(op).build();
	        tx.sign(StellarSdk.Keypair.fromSecret(self.seed));
	        return self.server.submitTransaction(tx);
		}).then(function(txResult){
			console.log('Option updated.', txResult);
			callback(null, txResult.hash);
		}).catch(function(err){
			console.error('Option Fail !', err);
			callback(err, null);
		});
	};
	
	api.setData = function(name, value, callback) {
		var self = this;
		var opt = {name: name, value: value? value : null};
		console.debug('manageData:', name, '-', value);
		self.server.loadAccount(self.address).then(function(account){
			self.updateSeq(account);
			var op = StellarSdk.Operation.manageData(opt);
	        var tx = new StellarSdk.TransactionBuilder(account).addOperation(op).build();
	        tx.sign(StellarSdk.Keypair.fromSecret(self.seed));
	        return self.server.submitTransaction(tx);
		}).then(function(txResult){
			console.log('Data updated.', txResult);
			callback(null, txResult.hash);
		}).catch(function(err){
			console.error('manageData Fail !', err);
			callback(err, null);
		});
	};
	
	api.merge = function(destAccount, callback) {
		var self = this;
		var opt = {destination: destAccount};
		console.debug('merge:', self.address, '->', destAccount);
		self.server.loadAccount(self.address).then(function(account){
			self.updateSeq(account);
			var op = StellarSdk.Operation.accountMerge(opt);
	        var tx = new StellarSdk.TransactionBuilder(account).addOperation(op).build();
	        tx.sign(StellarSdk.Keypair.fromSecret(self.seed));
	        return self.server.submitTransaction(tx);
		}).then(function(txResult){
			console.log('Account merged.', txResult);
			callback(null, txResult.hash);
		}).catch(function(err){
			console.error('accountMerge Fail !', err);
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
			self.subentry = data.subentry_count;
			$scope.reserve = self.subentry * 0.5 + 1;
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
	api.queryPaymentsNext = function(addressOrPage, callback) {
		console.debug('loop payments', this.address);
		history.payments(addressOrPage, callback);
	};
	
	api.queryEffects = function(callback) {
		console.debug('effects', this.address);
		history.effects(this.address, callback);
	};
	
	api.queryEffectsNext = function(addressOrPage, callback) {
		console.debug('loop effects', this.address);
		history.effects(addressOrPage, callback);
	};
	
	api.queryTransactions = function(callback) {
		console.debug('transactions', this.address);
		history.transactions(this.address, callback);
	};
	
	api.queryTransactionsNext = function(page, callback) {
		console.debug('loop transactions');
		history.transactions(page, callback);
	};
	
	api.queryBook = function(baseBuy, counterSell, callback) {
		orderbook.get(baseBuy, counterSell, callback);
	};
	
	api.listenOrderbook = function(baseBuying, counterSelling, handler) {
		orderbook.listen(baseBuying, counterSelling, handler);
	};
	
	api.closeOrderbook = function() {
		orderbook.close();
	};
	
	api.queryPath = function(src, dest, code, issuer, amount, callback) {
		path.get(src, dest, code, issuer, amount, callback);
	};
	
	api.listenPath = function(src, dest, code, issuer, amount, handler) {
		path.listen(src, dest, code, issuer, amount, handler);
	};
	
	api.closePath = function() {
		path.close();
	};
	
	api.queryOffer = function(callback) {
		var self = this;
		console.debug('offers', self.address);
		self.server.offers('accounts', self.address).limit(200).call().then(function(data) {
			console.log('offers', data.records);
			callback(null, data.records);
		}).catch(function(err){
			console.error('QueryOffer Fail !', err);
			callback(err, null);
		});
	};
	
	api._offer = function(selling, buying, amount, price, callback) {
		var self = this;
		amount = round(amount, 7);
		console.debug('Sell', amount, selling.code, 'for', buying.code, '@', price);
		self.server.loadAccount(self.address).then(function(account){
			self.updateSeq(account);
			var op = StellarSdk.Operation.manageOffer({
				selling: selling,
				buying: buying,
				amount: amount.toString(),
				price : price.toString()
	        });
	        var tx = new StellarSdk.TransactionBuilder(account).addOperation(op).build();
	        tx.sign(StellarSdk.Keypair.fromSecret(self.seed));
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
	
	api.cancel = function(offer, callback) {
		var self = this;
		var selling, buying, price, offer_id;
		if (typeof offer === 'object') {
			selling = offer.selling;
			buying  = offer.buying;
			price   = round(offer.price, 7);
			offer_id = offer.id;
		} else {
			selling = StellarSdk.Asset.native();
			buying  = new StellarSdk.Asset('DUMMY', account.accountId());
			price   = "1";
			offer_id = offer;
		}
		console.debug('Cancel Offer', offer_id);
		self.server.loadAccount(self.address).then(function(account){
			self.updateSeq(account);
			var op = StellarSdk.Operation.manageOffer({
				selling: selling,
				buying: buying,
				amount: "0",
				price : price,
				offerId : offer_id
	        });
	        var tx = new StellarSdk.TransactionBuilder(account).addOperation(op).build();
	        tx.sign(StellarSdk.Keypair.fromSecret(self.seed));
	        return self.server.submitTransaction(tx);
		}).then(function(txResult){
			console.log(txResult);
			callback(null, txResult.hash);
		}).catch(function(err){
			console.error('Cancel Offer Fail !', err);
			callback(err, null);
		});
	};
	
	api.getFedName = function(domain, address, callback) {
		this.federationServer(domain).then(function(server){
			server.resolveAccountId(address).then(function(data){
				if(data.stellar_address) {
					var index = data.stellar_address.indexOf("*");
					var fed_name = data.stellar_address.substring(0, index);
					return callback(null, fed_name);
				}
			}).catch(function(err){
				return callback(err);
			});
		}).catch(function(err){
			return callback(err);
		});
	}
	
	api.getErrMsg = function(err) {
		var message = "";
		if (err.name == "NotFoundError") {
			message = "NotFoundError";
		} else if (err.data && err.data.extras && err.data.extras.result_xdr) {
			var resultXdr = StellarSdk.xdr.TransactionResult.fromXDR(err.data.extras.result_xdr, 'base64');
			if (resultXdr.result().results()) {
				message = resultXdr.result().results()[0].value().value().switch().name;
			} else {
				message = resultXdr.result().switch().name;
			}
		} else {
			message = err.detail || err.message;
		}
		if (!message) {
			console.error("Fail in getErrMsg", err);
		}
		return message;
	}
	
	function getAsset(code, issuer) {
		if (typeof code == 'object') {
			issuer = code.issuer;
			code = code.code;
		}
		return code == 'XLM' ? new StellarSdk.Asset.native() : new StellarSdk.Asset(code, issuer); 
	}

	return api;
} ]);


function b64DecodeUnicode(str) {
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}
