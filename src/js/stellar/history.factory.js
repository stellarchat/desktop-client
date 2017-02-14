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
	}

	return history;
} ]);
