var myApp = angular.module('myApp', ['ngRoute', 'pascalprecht.translate', 'chart.js', 'monospaced.qrcode']);

myApp.config(function($routeProvider, $httpProvider, $translateProvider) {
	$translateProvider.translations('cn', translate_cn);
	$translateProvider.translations('en', translate_en);
	$translateProvider.translations('fr', translate_fr);
	$translateProvider.preferredLanguage('cn');
	$translateProvider.useSanitizeValueStrategy('escape');

	$httpProvider.interceptors.push('TokenInterceptor');

	$routeProvider.when('/login', {
		templateUrl : 'pages/login.html',
		controller : 'LoginCtrl',
		access : {
			requiredLogin : false
		}
	}).when('/registry', {
		templateUrl : 'pages/registry.html',
		controller : 'RegisterCtrl',
		access : {
			requiredLogin : false
		}
	}).when('/security', {
		templateUrl : 'pages/security.html',
		controller : 'SecurityCtrl',
		access : {
			requiredLogin : false
		}
	}).when('/', {
		templateUrl : 'pages/home.html',
		controller : 'HomeCtrl',
		access : {
			requiredLogin : true
		}
	}).when('/balance', {
		templateUrl : 'pages/balance.html',
		controller : 'BalanceCtrl',
		access : {
			requiredLogin : true
		}
	}).when('/trust', {
		templateUrl : 'pages/trust.html',
		controller : 'TrustCtrl',
		access : {
			requiredLogin : true
		}
	}).when('/send', {
		templateUrl : 'pages/send.html',
		controller : 'SendCtrl',
		access : {
			requiredLogin : true
		}
	}).when('/contact', {
		templateUrl : 'pages/contact.html',
		controller : 'ContactCtrl',
		access : {
			requiredLogin : true
		}
	}).when('/convert', {
		templateUrl : 'pages/convert.html',
		controller : 'ConvertCtrl',
		access : {
			requiredLogin : true
		}
	}).when('/hist_payments', {
		templateUrl : 'pages/history_payments.html',
		controller : 'PaymentsCtrl',
		access : {
			requiredLogin : true
		}
	}).when('/hist_effects', {
		templateUrl : 'pages/history_effects.html',
		controller : 'EffectsCtrl',
		access : {
			requiredLogin : true
		}
	}).when('/hist_trades', {
		templateUrl : 'pages/history_trades.html',
		controller : 'TradesCtrl',
		access : {
			requiredLogin : true
		}
	}).when('/trade', {
		templateUrl : 'pages/trade.html',
		controller : 'TradeCtrl',
		access : {
			requiredLogin : true
		}
	}).when('/bridges', {
		templateUrl : 'pages/bridges.html',
		controller : 'BridgesCtrl',
		access : {
			requiredLogin : true
		}
	}).when('/ico', {
		templateUrl : 'pages/ico.html',
		controller : 'IcoCtrl',
		access : {
			requiredLogin : true
		}
	}).when('/ico/:type', {
		templateUrl : 'pages/ico.html',
		controller : 'IcoCtrl',
		access : {
			requiredLogin : true
		}
	}).when('/settings', {
		templateUrl : 'pages/settings.html',
		controller : 'SettingsCtrl',
		access : {
			requiredLogin : true
		}
	}).otherwise({
		redirectTo : '/login'
	});
});

myApp.run(['$rootScope', '$window', '$location', '$translate', 'AuthenticationFactory', 'StellarApi', 'SettingFactory', 'RemoteFactory', 'AnchorFactory',
           function($rootScope, $window, $location, $translate, AuthenticationFactory, StellarApi, SettingFactory, RemoteFactory, AnchorFactory) {

	$rootScope.$on("$routeChangeStart", function(event, nextRoute, currentRoute) {
		  if ((nextRoute.access && nextRoute.access.requiredLogin) && !AuthenticationFactory.isLogged()) {
			  $location.path("/login");
		  } else {
			  if (currentRoute && currentRoute.originalPath == '/trade') {
				  console.log('Leave trade page');
				  StellarApi.closeOrderbook();
			  }
			  if (currentRoute && currentRoute.originalPath == '/send') {
				  console.log('Leave send page');
				  $location.search({}); // clean params
			  }
			  // check if user object exists else fetch it. This is incase of a page refresh
			  if (!AuthenticationFactory.user) AuthenticationFactory.user = $window.sessionStorage.user;
			  if (!AuthenticationFactory.userRole) AuthenticationFactory.userRole = $window.sessionStorage.userRole;
			  if (!AuthenticationFactory.userBlob && $window.sessionStorage.userBlob) {
				  //AuthenticationFactory.userBlob = $window.sessionStorage.userBlob;
				  AuthenticationFactory.getBlobFromSession(function(err, blob){
					  $rootScope.$broadcast('$blobUpdate');
				  });
			  }
		  }
	});

	$rootScope.$on('$routeChangeSuccess', function(event, nextRoute, currentRoute) {
	      $rootScope.showMenu = AuthenticationFactory.isLogged();
	      $rootScope.role = AuthenticationFactory.userRole;
	      // if the user is already logged in, take him to the home page
	      if (AuthenticationFactory.isLogged() == true && $location.path() == '/login') {
	    	  $location.path('/');
	      }
	});

	$rootScope.$on('$blobUpdate', function(){
		console.log($rootScope.address, AuthenticationFactory.blob);

	      if ($rootScope.address && AuthenticationFactory.userBlob) {
	    	  var data = JSON.parse(AuthenticationFactory.userBlob);
	    	  console.log('$blobUpdate', data);
	    	  $rootScope.address = data.account_id;
	    	  $rootScope.contacts = data.contacts;
	    	  $rootScope.resolveFed();
	    	  StellarApi.setAccount(data.account_id, data.masterkey);
	    	  StellarApi.listenStream();
	    	  StellarApi.queryAccount();
	      }
	});

	$rootScope.goTo = function(url){
	      $location.path(url);
	};


	$rootScope.balance = 0; //native asset;
	$rootScope.reserve = 0;
	$rootScope.lines = {}; // lines.CNY.xxx = {code: 'CNY', issuer: 'xxx', balance: 200, limit: 1000}
	$rootScope.getBalance = function(code, issuer) {
		if (code == 'XLM') {
			return $rootScope.balance;
		} else {
			return $rootScope.lines[code] && $rootScope.lines[code][issuer] ? $rootScope.lines[code][issuer].balance : 0;
		}
	}
	$rootScope.resolveFed = function() {
		StellarApi.getFedName(SettingFactory.getFedNetwork(), $rootScope.address, function(err, name){
			if (err) {
				console.error(err);
			} else {
				$rootScope.fed_name = name;
				$rootScope.$apply();
			}
		});
	};

	//the default gateway list
	$rootScope.gateways = gateways;
	RemoteFactory.getIcoAnchors(function(err, data){
		if (err) {
			console.error(err);
		} else {
			gateways.addAnchors(data);
		}
	});

	$rootScope.ico_data;
	RemoteFactory.getIcoItems(function(err, data){
		if (err) {
			console.error(err);
		} else {
			$rootScope.ico_data = data;
		}
	});
	for (var domain in gateways.data) {
		AnchorFactory.addAnchor(domain);
	}

	$rootScope.stellar_ticker;
	RemoteFactory.getStellarTicker(function(err, ticker){
		if (ticker) { $rootScope.stellar_ticker = ticker; }
	});

	reset();
	function reset() {
		console.warn('reset');
		$rootScope.fed_name = "";
		$rootScope.address  = 'undefined';
		$rootScope.contacts = [];
		$rootScope.lines = {};
		$rootScope.balance = 0;
		$rootScope.reserve = 0;

		$rootScope.offers = {};
		$rootScope.events = [];
		$rootScope.history = [];
		$rootScope.balances = {};
		$rootScope.loadState = [];
		$rootScope.unseenNotifications = {
			count: 0
		};
	}

	$rootScope.reset = function(){
		reset();
	}

	$rootScope.objKeyLength = function(obj) {
		return Object.keys(obj).length;
	}
	$rootScope.isValidAddress = function(address) {
		return StellarApi.isValidAddress(address);
	}
	$rootScope.isPublicNetwork = function() {
		return SettingFactory.getNetworkType() == 'public';
	}
	$rootScope.isTestNetwork = function() {
		return SettingFactory.getNetworkType() == 'test';
	}
	$rootScope.isOtherNetwork = function() {
		return SettingFactory.getNetworkType() == 'other';
	}

	$rootScope.isLangCN = function() {
		return SettingFactory.getLang() == 'cn';
	}

	$translate.use(SettingFactory.getLang());
	try {
		if ('test' == SettingFactory.getNetworkType()) {
			StellarApi.setServer(SettingFactory.getTestUrl(), 'test');
		} else if ('other' == SettingFactory.getNetworkType()) {
			StellarApi.setServer(SettingFactory.getOtherUrl(), 'other', SettingFactory.getNetPassphrase());
		} else {
			StellarApi.setServer(SettingFactory.getStellarUrl(), SettingFactory.getNetworkType());
		}
	} catch(e) {
		console.error("Cannot set server", SettingFactory.getStellarUrl(), e);
		console.warn("Change network back to public.");
		SettingFactory.setNetworkType('public');
		StellarApi.setServer(null);
	}

	if (SettingFactory.getProxy()) {
		try {
			nw.App.setProxyConfig(SettingFactory.getProxy()); //"127.0.0.1:53323"
		} catch(e) {
			console.error("Cannot set proxy", SettingFactory.getProxy(), e);
		}
	}
}]);

function round(dight, howMany) {
	if(howMany) {
		dight = Math.round(dight * Math.pow(10, howMany)) / Math.pow(10, howMany);
	} else {
		dight = Math.round(dight);
	}
	return dight;
}
