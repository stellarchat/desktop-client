myApp.factory('StellarHistory', ['$rootScope', function($scope) {
	var history = {
		server : null
	};
	
	history.payments = function(address, callback) {
		this.server.payments().forAccount(address).order("desc").limit("200").call().then(function(data){
			console.log(data);
			var payments = []; 
			data.records.forEach(function(r){
				var t = { "id": r.id, "type": r.type };
				switch(r.type){
				case 'payment':
					t.isInbound = r.to == address;
					t.counterparty = t.isInbound ? r.from : r.to;
					t.asset = r.asset_type == "native" ? {code: "XLM"} : {code:r.asset_code, issuer: r.asset_issuer};
					t.amount = parseFloat(r.amount);
					break;
				case 'create_account':
					t.isInbound = r.account == address;
					t.counterparty = t.isInbound ? r.source_account : r.account;
					t.asset = {code: "XLM"};
					t.amount = parseFloat(r.starting_balance);
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
	
	history.effects = function(address, callback) {
		this.server.effects().forAccount(address).order("desc").limit("200").call().then(function(data){
			console.log(data);
			var effects = []; 
			data.records.forEach(function(r){
				var t = { "id": r.id, "type": r.type };
				switch(r.type){
				case 'payment':
					t.isInbound = r.to == address;
					t.counterparty = t.isInbound ? r.from : r.to;
					t.asset = r.asset_type == "native" ? {code: "XLM"} : {code:r.asset_code, issuer: r.asset_issuer};
					t.amount = r.amount;
					break;
				case 'create_account':
					t.isInbound = r.account == address;
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
	};
	
	history.transactions = function(addressOrPage, callback) {
		var self = this;
		var page;
		var address;
		if ('string' === typeof addressOrPage) {
			page = this.server.transactions().forAccount(addressOrPage).order('desc').limit("200").call();
			address = addressOrPage;
		} else {
			page = addressOrPage;
			address = page.address;
		}
		page.then(function(page) {
			console.log(page);
			var transactions = [];
			page.records.forEach(function(record){
				var tx = self.processTx(record, address);
				console.log(tx);
				transactions.push(tx);
			});
			
			var nextPage = null;
			if (page.records.length >= 200) {
				nextPage = page.next();
				nextPage.address = address;
			}
			callback(null, transactions, nextPage);
		}).catch(function(err){
			console.error('Transactions Fail !', err);
			callback(err, null);
		});
	};
	
	history.processTx = function(record, address) {
		var tx = new StellarSdk.Transaction(record.envelope_xdr);
		var resultXdr = StellarSdk.xdr.TransactionResult.fromXDR(record.result_xdr, 'base64');
		
		var result = {
			date : new Date(record.created_at),
			fee  : record.fee_paid,
        	source_account : record.source_account,
        	source_account_sequence : record.source_account_sequence,
        	operation_count : record.operation_count,
        	memo_type : record.memo_type,
        	memo : record.memo,
        	resultCode : resultXdr.result().results()[0].value().value().switch().name
		};
		
		tx.operations.forEach(function(op) {
			switch(op.type){
			case 'payment':
				op.isInbound = op.destination == address;
				op.counterparty = op.isInbound ? tx.source : op.destination;
				break;
			case 'createAccount':
				op.isInbound = op.destination == address;
				op.counterparty = op.isInbound ? tx.source : op.destination;
				op.asset = {code: "XLM"};
				op.amount = op.startingBalance;
				break;
			default:
				
			}
		});
		result.tx = tx;
		
		return result;
	}

	return history;
} ]);
