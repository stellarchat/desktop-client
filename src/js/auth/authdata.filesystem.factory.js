/**
 * BLOB
 * User blob storage for desktop client
 */

/* global angular, myApp, nw, require */

// There's currently a code repetition between blobLocal and blobRemote..
'use strict';
const fs = require('fs');
const sjcl = require('sjcl');

myApp.factory('AuthDataFilesystem', ['$window', 'AuthData', function ($window, AuthData){

  const CRYPT_CONFIG = {
    ks: 256,  // key size
    iter: 1000,  // iterations (key derivation)
  };

  // Blob operations - do NOT change the mapping of existing ops!
  const BLOB_OPS = {
    // Special
    noop: 0,

    // Simple ops
    set: 16,
    unset: 17,
    extend: 18,

    // Meta ops
    push: 32,
    pop: 33,
    shift: 34,
    unshift: 35,
    filter: 36
  };
  const BLOB_OPS_REVERSE = {};
  for (const name in BLOB_OPS) BLOB_OPS_REVERSE[BLOB_OPS[name]] = name;








  /* class AuthDataFilesystem
   *
   * Do not create directly because that's async, use static method `AuthDataFilesystem.create(opts, cb)`.
   */
  return class AuthDataFilesystem extends AuthData {
    //// Pseudo-private properties:
    // _password
    // _path
    // _address
    // _contacts
    // _created
    // _secrets

    constructor(data){
      super(data.address, data.secrets, data.contacts);
      this._password = data.password;
      this._path = data.path;
      this._created = data.created;
    }

    // create(opts:Map<string, any>) => Promise<AuthDataFilesystem> -- create in filesystem and return Promise of instance.
    static create(opts) {
      const authData = new AuthDataFilesystem({
        address: opts.address,
        secrets: opts.secrets,
        password: opts.password,
        path: opts.path,

        contacts: [],
        created: (new Date()).toJSON(),
      });

      return authData.save()
        .catch((err)=>{
          //The default folder is the root of HD when the first time user save file on Mac.
          // EACCES: permission denied
          if (nw.global.navigator.platform.indexOf('Mac') >= 0 && err.message.indexOf('permission denied') >= 0) {
            throw new Error("Permission denied. Please choose another location.");
          }

          throw err;
        });
    }

    // restore() => AuthDataFilesystem -- restore from sessionStorage and return instance.
    static restore() {
      if(!$window.sessionStorage[AuthData.SESSION_KEY]) throw new Error('No authdata in session.');
      try {
        const {password, path, blob} = JSON.parse($window.sessionStorage[AuthData.SESSION_KEY]);
        return AuthDataFilesystem.fromBlob(password, path, blob);
      } catch(e) {
        const errorMsg = `File wallet in session corrupted, cleaned up!\n${$window.sessionStorage[AuthData.SESSION_KEY]}\n${e}`;
        delete $window.sessionStorage[AuthData.SESSION_KEY];
        throw new Error(errorMsg)
      }
    }

    // load(...params:any[]) => Promise<AuthDataFilesystem> -- load from filesystem and return Promise of instance.
    static load(opts) {
      return new Promise((resolve, reject) => {
        fs.readFile(opts.path, 'utf8', (err, blob) => {
          if (err) return reject(err);

          try {
            resolve(AuthDataFilesystem.fromBlob(opts.password, opts.path, blob));
          } catch(e) {
            reject(e);
          }

        });

      })
    }

    // store() => AuthDataFilesystem -- store in sessionStorage and return current instance.
    store() {
      $window.sessionStorage[AuthData.SESSION_KEY] = JSON.stringify({
        blob: this.blob,
        password: this._password,
        path: this._path,
      });
      return this;
    }

    // save() => Promise<void> -- save to long-term storage (e.g. filesystem) and return Promise of current instance.
    save() {
      return new Promise((resolve, reject) => {
        fs.writeFile(this._path, this.blob, (err) => {
          if(err) return reject(err);

          try {
            resolve(this.store());
          } catch(e) {
            reject(e);
          }
        });
      })
    }

    //
    // New methods below.
    //

    static fromBlob(password, path, rawData){
      if(!password) throw new Error('No password.')
      if(!path) throw new Error('No path to wallet file.')
      if(!rawData) throw new Error('No rawData.')

      const decrypted = AuthDataFilesystem._decrypt(password, rawData);
      if (!decrypted) throw new Error("Error while decrypting blob");

      const authDataFileSystem = new AuthDataFilesystem({
        address: decrypted.account_id,
        secrets: decrypted.masterkey,
        contacts: decrypted.contacts,
        created: decrypted.created,
        password,
        path,
      });
      return authDataFileSystem;
    }

    static _encrypt(password, data) {
      // Filter Angular metadata before encryption
      let cleanContacts = data.contacts;
      if ('object' === typeof data && 'object' === typeof data.contacts) {
        cleanContacts = angular.fromJson(angular.toJson(data.contacts));
      }

      const plaintext_v1 = JSON.stringify({
        account_id: data.address,
        contacts: cleanContacts,
        created: data.created,
        masterkey: data.secrets[0],
      })
      const blob = btoa(sjcl.encrypt(`${password.length}|${password}`, plaintext_v1, {
          ks: CRYPT_CONFIG.ks,
          iter: CRYPT_CONFIG.iter
      }));
      return blob;
    }

    static _decrypt(password, blob) {
      const plaintext_v1 = sjcl.decrypt(`${password.length}|${password}`, atob(blob));
      const object = JSON.parse(plaintext_v1);
      return {
        account_id: object.account_id,
        contacts: object.contacts,
        created: object.created,
        masterkey: [object.masterkey],
      }
    }

    get blob() {
      return AuthDataFilesystem._encrypt(this._password, this);
    }

  }

}]);
