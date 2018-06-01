/* global angular, myApp, StellarSdk */

myApp.factory('AuthenticationFactory', function($window, BlobFactory) {
  let _blob;
  let _userBlob;  // TODO: remove as it holds secret.
  let _password;
  let _walletfile;
  let _secret;  // The only place where secret is held. See also method `signTe(te, callback)`.

  return {

    get userBlob() {
      return _userBlob;
    },

    isLogged() {
      return 'userBlob' in $window.sessionStorage;
    },

    setBlob(blob) {
      _blob       = blob;
      _userBlob   = JSON.stringify(blob.data);
      _password   = blob.password;
      _walletfile = blob.walletfile;
      _secret     = blob.data.masterkey;
      console.log(_userBlob)
      $window.sessionStorage.userBlob   = _userBlob;
      $window.sessionStorage.password   = _password;
      $window.sessionStorage.walletfile = _walletfile;
    },

    getBlobFromSession(callback) {
      _userBlob   = $window.sessionStorage.userBlob;
      _password   = $window.sessionStorage.password;
      _walletfile = $window.sessionStorage.walletfile;

      BlobFactory.init(_walletfile, _password, (err, blob) => {
        console.log('Init blob from session', blob);
        this.setBlob(blob);
        if(typeof callback === 'function') callback(err, blob);
      });
    },

    canSign() {
      return !!_secret;
    },

    signTe(te, callback) {
      if(!_secret) callback(new Error('No secret provided.'));

      te.sign(StellarSdk.Keypair.fromSecret(_secret));
      callback(null, te);
    },

    addContact(contact, callback) {
      _blob.unshift("/contacts", contact, callback);
    },

    updateContact(name, contact, callback) {
      _blob.filter('/contacts', 'name', name, 'extend', '', contact, callback);
    },

    deleteContact(name, callback) {
      _blob.filter('/contacts', 'name', name, 'unset', '', callback);
    },

    getContact(value) {
      if (!value) return false;
      const contacts = _blob.data.contacts;
      for (const contact of contacts) {
        if (contact.name === value || contact.address === value) return contact;
      }
      return false;
    },

    logout() {
      if(!this.isLogged()) return;

      _blob = undefined;
      _userBlob = undefined;
      _password = undefined;
      _walletfile = undefined;
      _secret = undefined;

      delete $window.sessionStorage.userBlob;
      delete $window.sessionStorage.password;
      delete $window.sessionStorage.walletfile;
    },

    register(opts, callback){
      const options = {
        'account': opts.account,
        'password': opts.password,
        'masterkey': opts.masterkey,
        'walletfile': opts.walletfile
      };
      BlobFactory.create(options, function (err, blob) {
        if (err) {
          return callback(err);
        }
        console.log("AuthenticationFactory: registration succeeded", blob);
        callback(null, blob, 'local');
      });
    },

    openfile(walletfile, password, callback) {
      BlobFactory.init(walletfile, password, function (err, blob) {
        if (err) {
          callback(err);
          return;
        }
        console.log("client: authflow: login succeeded", blob);
        callback(null, blob);
      });
    }

  }

});


myApp.factory('TokenInterceptor', function($q, $window) {
  return {
    request: function(config) {
      config.headers = config.headers || {};
      if ($window.sessionStorage.token) {
        config.headers['X-Access-Token'] = $window.sessionStorage.token;
        config.headers['X-Key'] = $window.sessionStorage.user;
        config.headers['Content-Type'] = "application/json";
      }
      //console.log('TokenInterceptor:request', config);
      return config || $q.when(config);
    },

    response: function(response) {
      return response || $q.when(response);
    }
  };
});


myApp.factory('FileDialog', ['$rootScope', function($scope) {
  const _callDialog = (dialog, callback) => {
    dialog.addEventListener('change', () => {
      const result = dialog.value;
      callback(result);
    }, false);
    dialog.click();
  };

  return {
    saveAs(callback, defaultFilename, acceptTypes) {
      const dialog = document.createElement('input');
      dialog.type = 'file';
      dialog.nwsaveas = defaultFilename || '';
      if (angular.isArray(acceptTypes)) {
        dialog.accept = acceptTypes.join(',');
      } else if (angular.isString(acceptTypes)) {
        dialog.accept = acceptTypes;
      }
      _callDialog(dialog, callback);
    },

    openFile(callback, multiple, acceptTypes) {
      const dialog = document.createElement('input');
      dialog.type = 'file';
      if (multiple === true) dialog.multiple = 'multiple';
      if (angular.isArray(acceptTypes)) {
        dialog.accept = acceptTypes.join(',');
      } else if (angular.isString(acceptTypes)) {
        dialog.accept = acceptTypes;
      }
      _callDialog(dialog, callback);
    },

    openDir(callback) {
      const dialog = document.createElement('input');
      dialog.type = 'file';
      dialog.nwdirectory = 'nwdirectory';
      _callDialog(dialog, callback);
    }
  }
} ]);
