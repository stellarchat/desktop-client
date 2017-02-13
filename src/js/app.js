var myApp = angular.module('myApp', ['ngRoute', 'pascalprecht.translate']);

myApp.config(function($routeProvider, $httpProvider, $translateProvider) {
	$translateProvider.translations('cn', translate_cn);
	$translateProvider.translations('en', translate_en);
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
	}).when('/payments', {
		templateUrl : 'pages/history_payments.html',
		controller : 'PaymentsCtrl',
		access : {
			requiredLogin : true
		}
	}).otherwise({
		redirectTo : '/login'
	});
});

myApp.run(['$rootScope', '$window', '$location', '$translate', 'AuthenticationFactory', 'StellarApi',
           function($rootScope, $window, $location, $translate, AuthenticationFactory, StellarApi) {
	
	$translate.use($window.localStorage['lang'] || 'cn');
	
	$rootScope.$on("$routeChangeStart", function(event, nextRoute, currentRoute) {
		  if ((nextRoute.access && nextRoute.access.requiredLogin) && !AuthenticationFactory.isLogged()) {
			  $location.path("/login");
		  } else {
			  // check if user object exists else fetch it. This is incase of a page refresh
			  if (!AuthenticationFactory.user) AuthenticationFactory.user = $window.sessionStorage.user;
			  if (!AuthenticationFactory.userRole) AuthenticationFactory.userRole = $window.sessionStorage.userRole;
			  if (!AuthenticationFactory.userBlob) {
				  AuthenticationFactory.userBlob = $window.sessionStorage.userBlob;
				  $rootScope.$broadcast('$blobUpdate');
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
		console.log($rootScope.address, AuthenticationFactory.userBlob);
		
	      if ($rootScope.address && AuthenticationFactory.userBlob) {
	    	  var data = JSON.parse(AuthenticationFactory.userBlob);
	    	  console.log('$blobUpdate', data);
	    	  $rootScope.address = data.account_id;
	    	  StellarApi.setAccount(data.account_id, data.masterkey);
	    	  StellarApi.listenStream();
	    	  StellarApi.queryAccount();
	      }
	});
 
	$rootScope.goTo = function(url){
	      $location.path(url);
	};
	
	
	$rootScope.balance = 88; //native asset;
	$rootScope.lines = {
		'CNY' : [ {
			balance : 0.15,
			code : "CNY",
			issuer : "GAREELUB43IRHWEASCFBLKHURCGMHE5IF6XSE7EXDLACYHGRHM43RFOX",
			limit : 1000000
		} ]
	}; // {CNY: [{code: 'CNY', issuer: 'xxx', balance: 200}]}
	
	//the default gateway list
	$rootScope.gateways = gateways;
	
	reset();
	function reset() {
		console.warn('reset');
		$rootScope.address = 'undefined';
		$rootScope.lines = {};
		$rootScope.balance = 0;
		
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
	
	StellarApi.setServer('https://horizon.stellar.org');
	
	$rootScope.objKeyLength = function(obj) {
		return Object.keys(obj).length;
	}
	$rootScope.isValidAddress = function(address) {
		return StellarApi.isValidAddress(address);
	}
}]);
