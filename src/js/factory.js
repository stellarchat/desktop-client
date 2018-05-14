/* global myApp, nw, StellarSdk */

myApp.factory('SettingFactory', function($window) {
  return {
    // To add new preset, add unique prop to NETWORKS, DEFAULT_HORIZONS and COINS, new row at settings.html and translation.
    NETWORKS: {
      xlm: {
        name: "Stellar Public Network",
        networkType: 'xlm',
        networkPassphrase: StellarSdk.Networks.PUBLIC,
        defaultHorizon: "https://horizon.stellar.org",
        coin: {
          name: "lumen",
          atom: "stroop",
          code: "XLM",
          logo: "img/rocket.png"
        },
        allowHTTP: false,
        tabs: ["history", "trade", "balance", "send", "trust", "service", "ico"]
      },
      xlmTest: {
        name: "Stellar Test Network",
        networkType: 'xlmTest',
        networkPassphrase: StellarSdk.Networks.TESTNET,
        defaultHorizon: "https://horizon-testnet.stellar.org",
        coin: {
          name: "lumen",
          atom: "stroop",
          code: "XLM",
          logo: "img/rocket.png"
        },
        allowHTTP: true,
        tabs: ["history", "trade", "balance", "send", "trust"]
      },
      other: {
        name: "User defined",
        networkType: 'other',
        networkPassphrase: undefined,
        defaultHorizon: undefined,
        coin: {
          name: undefined,
          atom: undefined,
          code: undefined,
          logo: undefined
        },
        allowHTTP: true,
        tabs: ["history", "trade", "balance", "send", "trust"]
      }
    },
    setLang : function(lang) {
      return $window.localStorage['lang'] = lang;
    },
    getLang : function() {
      if ($window.localStorage['lang']) {
        return $window.localStorage['lang'];
      } else {
        if (nw.global.navigator.language.indexOf('zh') >= 0) {
          return 'cn';
        } else if (nw.global.navigator.language.indexOf('fr') >= 0) {
          return 'fr';
        } else {
          return 'en';
        }
      }
    },

    setProxy : function(proxy) {
      return $window.localStorage[`proxy`] = "undefined" === proxy ? '' : proxy;
    },
    getProxy : function() {
      return $window.localStorage[`proxy`] || "";
    },

    setNetworkType : function(network) {
      return $window.localStorage[`network_type`] = network in this.NETWORKS ? network : 'xlm';
    },
    getNetworkType : function() {
      return $window.localStorage[`network_type`] || this.setNetworkType();
    },
    getCurrentNetwork : function() {
      return this.NETWORKS[this.getNetworkType()];
    },
    setStellarUrl : function(url) {
      return $window.localStorage[`network_horizon/${this.getNetworkType()}`] = url || this.NETWORKS[this.getNetworkType()].defaultHorizon;
    },
    getStellarUrl : function() {
      return $window.localStorage[`network_horizon/${this.getNetworkType()}`] || this.setStellarUrl();
    },
    setNetPassphrase : function(val) {
      return this.getNetworkType() === 'other' ? $window.localStorage[`network_passphrase/${this.getNetworkType()}`] = val : this.NETWORKS[this.getNetworkType()].networkPassphrase;
    },
    getNetPassphrase : function() {
      return this.getNetworkType() === 'other' ? $window.localStorage[`network_passphrase/${this.getNetworkType()}`] : this.NETWORKS[this.getNetworkType()].networkPassphrase;
    },
    setCoin : function(val) {
      return this.getNetworkType() === 'other' ? $window.localStorage[`network_coin/${this.getNetworkType()}`] = val : this.NETWORKS[this.getNetworkType()].coin.code;
    },
    getCoin : function() {
      return this.getNetworkType() === 'other' ? $window.localStorage[`network_coin/${this.getNetworkType()}`] : this.NETWORKS[this.getNetworkType()].coin.code;
    },
    getAllowHttp : function() {
      return this.NETWORKS[this.getNetworkType()].allowHTTP;
    },

    setFedNetwork : function(domain) {
      $window.localStorage['fed_network'] = domain;
    },
    getFedNetwork : function(url) {
      return $window.localStorage['fed_network'] || 'fed.network';
    },
    setFedRipple : function(domain) {
      $window.localStorage['fed_ripple'] = domain;
    },
    getFedRipple : function(url) {
      return $window.localStorage['fed_ripple'] || 'ripplefox.com';
    },
    setFedBitcoin : function(domain) {
      $window.localStorage['fed_bitcoin'] = domain;
    },
    getFedBitcoin : function(url) {
      return $window.localStorage['fed_bitcoin'] || 'naobtc.com';
    },

    getTradepair : function() {
      if ($window.localStorage['tradepair']) {
        return JSON.parse($window.localStorage['tradepair']);
      } else {
        return {
          base_code   : this.getCurrentNetwork().coin.code,
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
    },

    getBridgeService : function() {
      return $window.localStorage['bridge_service'] || 'ripplefox.com';
    },
    setBridgeService : function(anchor_name) {
      $window.localStorage['bridge_service'] = anchor_name;
    }
  };
});

myApp.factory('FedNameFactory', function(SettingFactory, StellarApi) {
  var fed = {
    map : {}
  };

  fed.isCached = function(address) {
    return this.map[address] ? true : false;
  };

  fed.getName = function(address) {
    return this.map[address].nick;
  };

  fed.resolve = function(address, callback) {
    var self = this;

    if (!self.map[address]) {
      self.map[address] = {
        address : address,
        nick    : ""
      }
    } else {
      return callback(new Error("resolving " + address), null);
    }

    StellarApi.getFedName(SettingFactory.getFedNetwork(), address, function(err, name){
      if (err) {
        console.error(address, err);
      } else {
        self.map[address].nick = name;
      }
      return callback(null, self.map[address])
    });
  };

  return fed;
});

myApp.factory('RemoteFactory', function($http) {
  var remote = {};

  function getResource(url, callback){
    console.debug('GET: ' + url);
    $http({
      method: 'GET',
      url: url
    }).then(function(res) {
      if (res.status != "200") {
        callback(res, null);
      } else {
        callback(null, res.data);
      }
    }).catch(function(err) {
      callback(err, null);
    });
  }

  // Poor network in China, need a backup data source
  remote.getIcoAnchors = function(callback) {
    var url = 'https://stellarchat.github.io/ico/data/anchor.json';
    var backup = 'https://ico.stellar.chat/data/anchor.json';

    getResource(url, function(err, data) {
      if (err) {
        console.error(err);
        getResource(backup, function(err, data){
          return callback(err, data);
        });
      } else {
        return callback(null, data);
      }
    });
  };

  remote.getIcoItems = function(callback) {
    var url = 'https://stellarchat.github.io/ico/data/ico.json';
    var backup = 'https://ico.stellar.chat/data/ico.json';

    getResource(url, function(err, data) {
      if (err) {
        console.error(err);
        getResource(backup, function(err, data){
          return callback(err, data);
        });
      } else {
        return callback(null, data);
      }
    });
  };

  remote.getStellarTicker = function(callback) {
    //var url = 'http://ticker.stellar.org/';
    var url = 'https://api.stellarterm.com/v1/ticker.json';
    getResource(url, callback);
  }

  remote.getClientVersion = function(callback) {
    var url = "https://raw.githubusercontent.com/stellarchat/desktop-client/master/src/package.json";
    getResource(url, callback);
  }
  return remote;
});

myApp.factory('AnchorFactory', ['$rootScope', 'StellarApi',
  function($scope, StellarApi) {
    var obj = {
      anchor : {
        'ripplefox.com' : {domain  : 'ripplefox.com', parsing : false, parsed  : false}
      },
      address : {
        'GAREELUB43IRHWEASCFBLKHURCGMHE5IF6XSE7EXDLACYHGRHM43RFOX' : {domain : 'ripplefox.com', parsing: false, parsed: false}
      }
    };

    obj.isAnchorParsed = function(domain) {
      return this.anchor[domain] && this.anchor[domain].parsed;
    }
    obj.isAccountParsed = function(address) {
      return this.address[address] && this.address[address].parsed;
    }
    obj.getAnchor = function(domainOrAddress) {
      var domain = domainOrAddress;
      if (this.address[domainOrAddress]) {
        domain = this.address[domainOrAddress].domain;
      }
      return this.anchor[domain];
    }

    obj.addAnchor = function(domain) {
      var self = this;
      if (!self.anchor[domain]) {
        self.anchor[domain] = {domain  : domain, parsing : false, parsed  : false};
      }
      if (!self.anchor[domain].parsed) {
        self.parseDomain(domain);
      }
    }

    obj.addAccount = function(address) {
      var self = this;
      if (!self.address[address]) {
        self.address[address] = {domain  : null, parsing : false, parsed  : false};
      }
      if (!self.address[address].parsed) {
        self.parseAccount(address);
      }
    }

    obj.parseAccount = function(address) {
      var self = this;
      if (self.address[address].parsing) {
        return;
      }

      console.debug('Parse domain of ' + address);
      self.address[address].parsing = true;
      StellarApi.getInfo(address, function(err, data) {
        self.address[address].parsing = false;
        if (err) {
          console.error(err);
        } else {
          self.address[address].parsed = true;
          if (data.home_domain) {
            console.debug(address, data.home_domain);
            self.address[address].domain = data.home_domain;
            self.addAnchor(data.home_domain);
          } else {
            console.debug(address + ' home_domain not set.');
          }
        }
      });
    }

    obj.parseDomain = function(domain) {
      var self = this;
      if (self.anchor[domain].parsing) {
        return;
      }

      console.debug('Parse stellar.toml of ' + domain);
      self.anchor[domain].parsing = true;
      StellarSdk.StellarTomlResolver.resolve(domain).then(function(stellarToml) {
        console.debug(domain, stellarToml);
        self.anchor[domain].parsing = false;
        self.anchor[domain].parsed = true;
        self.anchor[domain].toml = stellarToml;
        self.anchor[domain].deposit_api = stellarToml.DEPOSIT_SERVER;
        self.anchor[domain].fed_api = stellarToml.FEDERATION_SERVER;

        var currencies = stellarToml.CURRENCIES;
        currencies.forEach(function(asset){
          if (asset.host && asset.host.indexOf(domain) < 0) {
            //ignore the asset not issued by this domain
            console.warn(domain, asset);
          } else {
            self.address[asset.issuer] = {domain: domain, parsing: false, parsed: true};
          }
        });

        $scope.$broadcast("anchorUpdate");
      }).catch(function(err){
        self.anchor[domain].parsing = false;
        console.error(err);
      });

    }

    return obj;
  } ]);
