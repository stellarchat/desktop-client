/* global angular, myApp, StellarSdk */

// Auth - singleton that manages account.
myApp.factory('AuthenticationFactory', ['$rootScope', '$window', 'AuthData', 'AuthDataFilesystem', 'AuthDataInmemory',
                                function($rootScope ,  $window ,  AuthData ,  AuthDataFilesystem ,  AuthDataInmemory) {
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

    create(type, opts, callback){
      const AuthData = this.AUTH_DATA[type];
      if(!AuthData) throw new Error(`Unsupported type "${$window.sessionStorage[this.SESSION_KEY]}"`);

      AuthData.create(opts)
        .then((authdata) => {
          console.log("AuthenticationFactory: registration succeeded", authdata);

          _type = type;
          _data = authdata;
          this._store();
          callback(null, authdata, 'local');
        }).catch(callback);
    }

    load(type, opts, callback) {
      const AuthData = this.AUTH_DATA[type];
      if(!AuthData) throw new Error(`Unsupported type "${$window.sessionStorage[this.SESSION_KEY]}"`);

      AuthData.load(opts)
        .then((authdata) => {
          if (authdata.address.substring(0, 1) == "r") throw new Error(`Login failed: Wallet file is a Ripple file.`);

          _type = type;
          _data = authdata;
          this._store();

          console.info(`Restored "${type}" authdata from session.`)
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

    // No need to explicitly store or save, because Auth does it automatically when neccessary. Thus private method.
    _store() {
      if(!this.isInMemory) throw new Error('Nothing in memory to store to session');

      $window.sessionStorage[this.SESSION_KEY] = _type;
      _data.store();
      $rootScope.$broadcast('$authUpdate');
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
    // It's also partly implemented for later multi-signature support.
    //

    get address() {
      return _data ? _data.address : undefined;
    }

    get secretAmount() {
      return _data ? _data.secrets.length : 0;
    }

    get secrets() {
      console.warn(`Your ${this.secretAmount} secret(s) were revealed!`)
      return _data ? _data.secrets : undefined;
    }

    teThresholds(te) {
      // TODO #1: parse "te" to get list of source accounts.
      // TODO #2: fetch horizon to lookup actual signers for them.

      // For now assume that account has default signers.
      return Promise.resolve({
        [this.address]: {  // Account.
          requiredThreshold: 1,
          attainedThreshold: te.signatures.length,  // Assumes no multisignatures. TODO: upgrade.
          availableSigners: {
            [this.address]: 1,  // Public Key.
          }
        },
      });
    }

    requiredSigners(thresholds) {
      const allUsefulSignersAndWeights = Object.entries(thresholds)
        .filter(([account, thresholds]) => thresholds.attainedThreshold < thresholds.requiredThreshold)
        .reduce((all, [account, signers])=> {
            Object.entries(signers.availableSigners).forEach(([signer, weight])=>all[signer] = Math.max(weight, all[signer] || 0));
            return all;
          },
          Object.create(null))

      return Object.entries(allUsefulSignersAndWeights)
        .sort((a, b) => a[1] > b[1])  // Biggest weight first.
        .map((signerAndWeight) => signerAndWeight[0])
    }

    get availablePKs() {
      return _data.secrets.reduce((map, secret)=>{
          const kp = StellarSdk.Keypair.fromSecret(secret);
          map[kp.publicKey()] = kp;
          return map;
        },
        Object.create(null));
    }

    // Sign with all available and useful secrets we can automatically.
    sign(te) {
      return Promise.resolve()
        .then(()=>{
          return this.teThresholds(te);
        })
        .then((thresholds)=>{
          const usefulSignature = this.requiredSigners(thresholds).filter((pk) => pk in this.availablePKs).pop();

          if(usefulSignature) {
            const kp = this.availablePKs[usefulSignature];
            te.sign(kp);
            console.info(`Automatically signed Tx ${te.hash} with Keypair ${kp.publicKey()}`);
            return this.sign(te);
          } else {
            return te;
          }
        })
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
