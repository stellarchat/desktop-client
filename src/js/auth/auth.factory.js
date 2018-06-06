/* global angular, myApp, StellarSdk */

// Auth - singleton that manages account.
myApp.factory('AuthenticationFactory', ['$window', 'AuthData', 'AuthDataFilesystem', 'AuthDataInmemory',
                                function($window ,  AuthData ,  AuthDataFilesystem ,  AuthDataInmemory) {
  let _type;
  let _data;  // `_dta.secrets` is the only place where secret is held. See also method `sign(te, callback)`.

  class Auth {

    get SESSION_KEY() { return 'authtype'; }
    get TYPE() { return {
        get TEMPORARY() { return 'temporary' },
        get FILESYSTEM() { return 'filesystem' },
    }}
    get AUTH_DATA() { return {
        get [this.TYPE.FILESYSTEM]() { return AuthDataFilesystem; },
        get [this.TYPE.TEMPORARY]() { return AuthDataInmemory; },
    }}

    //
    // Lifecycle.
    //

    get isInMemory() {
      return !!_type;
    }

    get isInSession() {
      return !!$window.sessionStorage[this.SESSION_KEY];
    }

    create(opts, callback){
      AuthDataFilesystem.create(opts)
        .then((authdata) => {
          console.log("AuthenticationFactory: registration succeeded", authdata);
          callback(null, authdata, 'local');
        }).catch(callback);
    }

    load(type, opts, callback) {
      const AuthData = this.AUTH_DATA[type];
      if(!AuthData) throw new Error(`Unsupported type "${$window.sessionStorage[this.SESSION_KEY]}"`);

      AuthData.load(opts)
        .then((authdata) => {
          _type = type;
          _data = authdata;
          this._store();
          console.warn(`Restored "${type}" authdata from session.`)
          callback(null);
        })
      .catch(callback);

    }

    restore() {
      if(this.isInMemory) return;  // Restore only once: Skip if already initiated or restored from session.

      const type = $window.sessionStorage[this.SESSION_KEY];
      const AuthData = this.AUTH_DATA[type];
      if(!AuthData) throw new Error(`Unsupported type "${$window.sessionStorage[this.SESSION_KEY]}"`);

      try {
        const authdata = AuthData.restore();

        _type = type;
        _data = authdata;
        console.warn(`Restored "${type}" authdata from session.`)
      } catch(e) {
        _type    = undefined;
        _data    = undefined;
        console.warn(`Got error while restoring from session, cleaned up!`, e)
      }

      delete $window.sessionStorage[this.SESSION_KEY];
      if(_type) this._store();
    }

    // No need to store or save as Auth does it automatically when neccessary.
    _store() {
      if(!this.isInMemory) throw new Error('Nothing in memory to store to session');

      $window.sessionStorage[this.SESSION_KEY] = _type;
      _data.store();
    }

    logout() {
      if(!this.isInMemory) return;

      _type = undefined;
      _data = undefined;

      delete $window.sessionStorage[this.SESSION_KEY];
      delete $window.sessionStorage[AuthData.SESSION_KEY];
    }

    //
    // Account address and signing.
    //

    get address() {
      return _data ? _data.address : undefined;
    }

    teThresholds(te) {
      // TODO #1: parse "te" to get list of source accounts.
      // TODO #2: fetch horizon to lookup actual signers for them.

      // For now assume that account has default signers.
      return Promise.resolve({
        [this.address]: {  // Account.
          requiredThreshold: 1,
          attainedThreshold: 0,
          availableSigners: {
            [this.address]: 1,  // Public Key.
          }
        },
      });
    }

    requiredSigners(thresholds) {
      return Object.entries(thresholds)
        .map(([account, thresholds]) => thresholds.attainedThreshold > thresholds.requiredThreshold ? thresholds.availableSigners : {})
        .reduce((all, signers)=>Object.entries(signers).forEach(([signer, weight])=>all[signer] = Math.max(weight, all[signer])), Object.create(null))
        .map((mapOfAllSignersAndWeights)=>Object.entries(mapOfAllSignersAndWeights))
        .sort((a, b) => a[1] > b[1])  // Biggest weight first.
        .map((signerAndWeight) => signerAndWeight[0])
    }

    sign(te, callback) {
      const availablePKs = _data.secrets.reduce((map, secret)=>map[StellarSdk.Keypair.fromSecret(secret)] = secret, Object.create(null));
      // Sign all we can automatically.
      let nextSigner;
      do {
        nextSigner = this.requiredSigners(this.teThresholds(te)).filter((pk) => pk in availablePKs).pop();
        if(nextSigner) te.sign(availablePKs[nextSigner]);
      } while(nextSigner)

      callback(null, te);
    }

    //
    // Contact Management. Implicitly saves and stores AuthData.
    //

    get contacts() {
      switch(_type) {
        case(this.TYPE.TEMPORARY): return [];
        case(this.TYPE.FILESYSTEM): return _data.contacts;
        case(undefined): return [];
        default: throw new Error(`Unsupported type "${_type}"`);
      }
    }

    addContact(contact, callback) {
      _data.unshift("/_contacts", contact, callback);
    }

    updateContact(name, contact, callback) {
      _data.filter('/_contacts', 'name', name, 'extend', '', contact, callback);
    }

    deleteContact(name, callback) {
      _data.filter('/_contacts', 'name', name, 'unset', '', callback);
    }

    getContact(value) {
      if (!value) return false;
      for (const contact of _data.contacts) {
        if (contact.name === value || contact.address === value) return contact;
      }
      return false;
    }

  }

  return new Auth();
}]);


myApp.factory('TokenInterceptor', ($q, $window) => {
  return {
    request: (config) => {
      config.headers = config.headers || {};
      if ($window.sessionStorage.token) {
        config.headers['X-Access-Token'] = $window.sessionStorage.token;
        config.headers['X-Key'] = $window.sessionStorage.user;
        config.headers['Content-Type'] = "application/json";
      }
      //console.log('TokenInterceptor:request', config);
      return config || $q.when(config);
    },

    response: (response) => {
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
