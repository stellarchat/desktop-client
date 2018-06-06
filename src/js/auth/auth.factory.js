/* global angular, myApp, StellarSdk */

myApp.factory('AuthenticationFactory', function($window, BlobFactory) {
  let _type;
  let _blob;
  let _address;
  const _secrets = [];  // The only place where secret is held. See also method `sign(te, callback)`.

  return {

    // Read-only constants.
    get TYPE() { return {
        get TEMPORARY() { return 'temporary' },
        get FILESYSTEM() { return 'filesystem' },
    } },

    get isInMemory() {
      return !!_type;
    },

    get isInSession() {
      return !!$window.sessionStorage.type;
    },

    restoreFromSession() {
      if(this.isInMemory) return;  // Restore only once: Skip if already initiated or restored from session.

      try {
        switch($window.sessionStorage.type) {
          case(this.TYPE.TEMPORARY): {
            throw new Error('TODO');
            // _type = this.TYPE.TEMPORARY;
          }
          case(this.TYPE.FILESYSTEM): {
            _type    = this.TYPE.FILESYSTEM;
            _blob = BlobFactory.fromSession();
            _address = _blob.data.account_id;
            _secrets.splice(0, _secrets.length, _blob.data.masterkey);
            break;
          }
          case(undefined): {
            _type = undefined;
            break;
          }
          default: {
            throw new Error(`Unsupported type "${$window.sessionStorage.type}"`);
          }
        }
      } catch(e) {
        console.warn(`Got error while restoring from session, cleaning up!`, e)
        _blob    = undefined;
        _type    = undefined;
        _address = undefined;
        _secrets.splice(0, _secrets.length);
      }

      delete $window.sessionStorage.type;
      if(_type) $window.sessionStorage.type = _type;
    },

    get address() {
      return _address;
    },

    get contacts() {
      switch(_type) {
        case(this.TYPE.TEMPORARY): return [];
        case(this.TYPE.FILESYSTEM): return _blob.data.contacts;
        case(undefined): return [];
        default: throw new Error(`Unsupported type "${_type}"`);
      }
    },

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
    },

    requiredSigners(thresholds) {
      return Object.entries(thresholds)
        .map(([account, thresholds]) => thresholds.attainedThreshold > thresholds.requiredThreshold ? thresholds.availableSigners : {})
        .reduce((all, signers)=>Object.entries(signers).forEach(([signer, weight])=>all[signer] = Math.max(weight, all[signer])), Object.create(null))
        .map((mapOfAllSignersAndWeights)=>Object.entries(mapOfAllSignersAndWeights))
        .sort((a, b) => a[1] > b[1])  // Biggest weight first.
        .map((signerAndWeight) => signerAndWeight[0])
    },

    sign(te, callback) {
      const availablePKs = _secrets.reduce((map, secret)=>map[StellarSdk.Keypair.fromSecret(secret)] = secret, Object.create(null));
      // Sign all we can automatically.
      let nextSigner;
      do {
        nextSigner = this.requiredSigners(this.teThresholds(te)).filter((pk) => pk in availablePKs).pop();
        if(nextSigner) te.sign(availablePKs[nextSigner]);
      } while(nextSigner)

      callback(null, te);
    },

    setAccount(address, secrets) {
      if(!StellarSdk.StrKey.isValidEd25519PublicKey(address)) throw new Error('Invalid Address.');
      if(!secrets.every((secret)=>StellarSdk.StrKey.isValidEd25519SecretSeed(secret))) throw new Error('Invalid Secret.');

      _secrets.splice(0, _secrets.length, ...secrets);
      _address = address;
    },

    random() {
        const keypair = StellarSdk.Keypair.random();
        _address = keypair.publicKey();
        _secrets.splice(0, _secrets.length, keypair.secret());
        return _secrets[0];  // To display when creating the wallet.
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
      if(!this.isInMemory) return;

      _type = undefined;
      _blob = undefined;
      _address = undefined;
      _secrets.splice(0, _secrets.length);

      delete $window.sessionStorage.type;
      delete $window.sessionStorage.walletfile;
    },

    register(opts, callback){
      const options = {
        'account_id': _address,
        'password': opts.password,
        'masterkey': _secrets[0],  // TODO: blob format v2 to handle multiple secrets (and other things in upcoming commits).
        'walletfile': opts.walletfile
      };
      BlobFactory.create(options, (err, blob) => {
        if (err) return callback(err);

        console.log("AuthenticationFactory: registration succeeded", blob);
        callback(null, blob, 'local');
      });
    },

    openfile(password, walletfile, callback) {
      BlobFactory.open(password, walletfile, (err, blob) => {
        if (err) callback(err);

        _blob    = blob;
        _type    = this.TYPE.FILESYSTEM;
        _address = _blob.data.account_id;
        _secrets.splice(0, _secrets.length, _blob.data.masterkey);

        $window.sessionStorage.type = _type;

        console.log("client: authflow: login succeeded", blob);
        callback(null);
      });
    }

  }
});


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
