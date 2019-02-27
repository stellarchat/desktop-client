/* globals angular, gateways, nw, translate_cn, translate_en, translate_fr, translate_br */
/* exported myApp */
var myApp = angular.module('myApp', ['ngRoute', 'pascalprecht.translate', 'chart.js', 'monospaced.qrcode']);

myApp.config(function($routeProvider, $httpProvider, $translateProvider, $compileProvider) {
  $translateProvider.translations('cn', translate_cn);
  $translateProvider.translations('en', translate_en);
  $translateProvider.translations('fr', translate_fr);
  $translateProvider.translations('br', translate_br);
  $translateProvider.preferredLanguage('cn');
  $translateProvider.useSanitizeValueStrategy('escape');

  $compileProvider.imgSrcSanitizationWhitelist(/^\s*(local|http|https|app|tel|ftp|file|blob|content|ms-appx|x-wmapp0|cdvfile|chrome-extension):|data:image\//);
  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);

  $httpProvider.interceptors.push('TokenInterceptor');

  $routeProvider.when('/login', {
    templateUrl : 'pages/login.html',
    controller : 'LoginCtrl',
    access : {
      requiredLogin : false
    }
  }).when('/register', {
    templateUrl : 'pages/register.html',
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
      if ((nextRoute.access && nextRoute.access.requiredLogin) && !AuthenticationFactory.isInSession) {
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
        if(AuthenticationFactory.isInSession) AuthenticationFactory.restore();
      }
    });

    $rootScope.$on('$routeChangeSuccess', function(event, nextRoute, currentRoute) {
      $rootScope.showMenu = AuthenticationFactory.isInSession;
      // if the user is already logged in, take him to the home page
      if (AuthenticationFactory.isInSession && $location.path() == '/login') {
        $location.path('/');
      }
    });

    $rootScope.$on('$authUpdate', function(){
      console.log('$authUpdate', AuthenticationFactory.isInMemory, $rootScope.address, AuthenticationFactory.address);

      if (AuthenticationFactory.isInMemory) {
        $rootScope.address = AuthenticationFactory.address;
        $rootScope.contacts = AuthenticationFactory.contacts;
        $rootScope.resolveFed();
        StellarApi.listenStream();
        StellarApi.queryAccount();
      } else {
        delete $rootScope.address;
        delete $rootScope.contacts;
      }
    });

    $rootScope.goTo = function(url){
      $location.path(url);
    };


    $rootScope.balance = 0; //native asset;
    $rootScope.reserve = 0;
    $rootScope.lines = {}; // lines.CNY.xxx = {code: 'CNY', issuer: 'xxx', balance: 200, limit: 1000}
    $rootScope.getBalance = function(code, issuer) {
      if (code == $rootScope.currentNetwork.coin.code) {
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
    $rootScope.currentNetwork = SettingFactory.getCurrentNetwork();
    $rootScope.isPublicNetwork = function() {
      return this.currentNetwork.name == "Stellar Public Network";
    }

    $rootScope.isLangCN = function() {
      return SettingFactory.getLang() == 'cn';
    }

    $translate.use(SettingFactory.getLang());
    try {
      StellarApi.setServer(SettingFactory.getStellarUrl(), SettingFactory.getNetPassphrase(), SettingFactory.getAllowHttp());
      StellarApi.setTimeout(SettingFactory.getTimeout());
    } catch(e) {
      console.error("Cannot set server", SettingFactory.getStellarUrl(), SettingFactory.getNetworkType(), e);
      console.warn("Change network back to xlm.");
      SettingFactory.setNetworkType('xlm');
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

/* exported round */
var round = function(dight, howMany) {
  if(howMany) {
    dight = Math.round(dight * Math.pow(10, howMany)) / Math.pow(10, howMany);
  } else {
    dight = Math.round(dight);
  }
  return dight;
}
