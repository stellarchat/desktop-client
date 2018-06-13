/* global myApp, StellarSdk */

myApp.factory('StellarOrderbook', ['$rootScope', function($rootScope) {
  let _server;
  let _closeBookStream;

  const getAsset = (code, issuer) => {
    if (typeof code == 'object') {
      issuer = code.issuer;
      code = code.code;
    }
    return code == $rootScope.currentNetwork.coin.code ? new StellarSdk.Asset.native() : new StellarSdk.Asset(code, issuer);
  }

  const getKey = (code, issuer) => {
    if (typeof code == 'object') {
      issuer = code.issuer;
      code = code.code;
    }
    return code == $rootScope.currentNetwork.coin.code ? code : code + '.' + issuer;
  }

  return {

    setServer(server) {
      _server = server;
    },

    close(){
      if (_closeBookStream) {
        _closeBookStream();
        _closeBookStream = undefined;
      }
    },

    get(baseBuying, counterSelling, callback) {
      const key = getKey(baseBuying) + '/' + getKey(counterSelling);
      console.debug('orderbook', key);
      _server.orderbook(getAsset(baseBuying), getAsset(counterSelling)).call().then((data) => {
        callback(null, data);
      }).catch((err) => {
        console.error(key, err);
        callback(err);
      });
    },

    listen(baseBuying, counterSelling, handler) {
      const key = getKey(baseBuying) + '/' + getKey(counterSelling);
      console.debug('listen orderbook ' + key);
      _closeBookStream = _server.orderbook(getAsset(baseBuying), getAsset(counterSelling)).stream({
        onmessage: (res) => {
          //console.log('stream', key, res);
          handler(res);
        }
      });
    },

  };
} ]);
