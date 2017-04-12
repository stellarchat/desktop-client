myApp.factory('SettingFactory', function($window) {
	return {
		setLang : function(lang) {
			$window.localStorage['lang'] = lang;
		},
		getLang : function() {
			return $window.localStorage['lang'] || 'cn';
		},
		setProxy : function(proxy) {
			if ("undefined" == proxy) { 
				proxy = "";
			}
			$window.localStorage['proxy'] = proxy;
		},
		getProxy : function() {
			return $window.localStorage['proxy'] || "";
		},
		setStellarUrl : function(url) {
			$window.localStorage['stellar_url'] = url;
		},
		getStellarUrl : function(url) {
			return $window.localStorage['stellar_url'] || 'https://horizon.stellar.org';
		},
		setFedNetwork : function(domain) {
			$window.localStorage['fed_network'] = domain;
		},
		getFedNetwork : function(url) {
			return $window.localStorage['fed_network'] || 'fed.network';
		},
		getTradepair : function() {
			if ($window.localStorage['tradepair']) {
				return JSON.parse($window.localStorage['tradepair']);
			} else {
				return {
					base_code   : 'XLM',
					base_issuer : '',
					counter_code   : 'CNY',
					counter_issuer : 'GAREELUB43IRHWEASCFBLKHURCGMHE5IF6XSE7EXDLACYHGRHM43RFOX'
				}
			}
		},
		setTradepair : function(base_code, base_issuer, counter_code, counter_issuer) {
			var trade_pair = {
				base_code   : base_code,
				base_issuer : base_issuer,
				counter_code   : counter_code,
				counter_issuer : counter_issuer
			}
			$window.localStorage['tradepair'] = JSON.stringify(trade_pair);
		}
	};
});