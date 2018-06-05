/* global angular, myApp, StellarSdk */

myApp.factory('AuthenticationFactory', function($window, BlobFactory) {
  let _blob;
  let _userBlob;  // TODO: remove as it holds secret.
  let _password;
  let _walletfile;
  let _address;
  const _secrets = [];  // The only place where secret is held. See also method `sign(te, callback)`.

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
      _address    = blob.data.account_id;
      _secrets.splice(0, _secrets.length, blob.data.masterkey);
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

    get address() {
      return _address;
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
      if(!this.isLogged()) return;

      _blob = undefined;
      _userBlob = undefined;
      _password = undefined;
      _walletfile = undefined;
      _address = undefined;
      _secrets.splice(0, _secrets.length);

      delete $window.sessionStorage.userBlob;
      delete $window.sessionStorage.password;
      delete $window.sessionStorage.walletfile;
    },

    register(opts, callback){
      const options = {
        'account': _address,
        'password': opts.password,
        'masterkey': _secrets[0],  // TODO: blob format v2 to handle multiple secrets (and other things in upcoming commits).
        'walletfile': opts.walletfile
      };
      BlobFactory.create(options, function (err, blob) {
        if (err) return callback(err);

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
