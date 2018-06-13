/* global myApp, StellarSdk */

myApp.factory('StellarPath', ['$rootScope', function($rootScope) {
  let _server;
  let _closeStream;

  const getAsset = (code, issuer) => {
    if (typeof code == 'object') {
      issuer = code.issuer;
      code = code.code;
    }
    return code == $rootScope.currentNetwork.coin.code ? new StellarSdk.Asset.native() : new StellarSdk.Asset(code, issuer);
  }

  return {

    setServer(server) {
      _server = server;
    },

    close() {
      if (_closeStream) {
        _closeStream();
        _closeStream = undefined;
      }
    },

    get(src, dest, code, issuer, amount, callback) {
      _server.paths(src, dest, getAsset(code, issuer), amount).call().then((data) => {
        callback(null, data);
      }).catch((err) => {
        console.error(amount, code, issuer, err);
        callback(err);
      });
    },

    // stellar-sdk does not have path stream feature. :(
    listen(src, dest, code, issuer, amount, handler) {
      console.debug('listen path ' + amount + ' ' + code);
      _closeStream = _server.paths(src, dest, getAsset(code, issuer), amount).stream({
        onmessage: (res) => {
          console.log('stream', amount + code, res);
          handler(res);
        },
        onerror : (res) => {
          console.error('stream', amount + code, res);
        }
      });
    },

  };
} ]);
