myApp.factory('SettingFactory', function($window) {
	return {
		setLang : function(lang) {
			$window.localStorage['lang'] = lang;
		},
		getLang : function() {
			return $window.localStorage['lang'] || 'cn';
		},
		setProxy : function(proxy) {
			$window.localStorage['proxy'] = proxy;
		},
		getProxy : function() {
			return $window.localStorage['proxy'];
		},
		setStellarUrl : function(url) {
			$window.localStorage['stellar_url'] = url;
		},
		getStellarUrl : function(url) {
			return $window.localStorage['stellar_url'] || 'https://horizon.stellar.org';
		}
	};
});