/**
 * BLOB
 * User blob storage for desktop client
 */

/* global angular, CONST, myApp, require, StellarSdk, toContactV1, toContactV2 */

// There's currently a code repetition between blobLocal and blobRemote..
'use strict';
const {ipcRenderer} = require('electron')
const sjcl = require('sjcl');

myApp.factory('AuthDataFilesystemV1', ['$window', 'AuthData', 'SettingFactory',
                              function( $window ,  AuthData ,  SettingFactory ){

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

  const unescapeToken = (str) => {
    return str.replace(/~./g, (m) => {
      switch (m) {
      case "~0":
        return "~";
      case "~1":
        return "/";
      }
      throw("Invalid tilde escape: " + m);
    });
  };

  const normalizeSubcommands = (subcommands, compress) => {
    // Normalize parameter structure
    if ("number" === typeof subcommands[0] ||
        "string" === typeof subcommands[0]) {
      // Case 1: Single subcommand inline
      subcommands = [subcommands];
    } else if (subcommands.length === 1 &&
               Array.isArray(subcommands[0]) &&
               ("number" === typeof subcommands[0][0] ||
                "string" === typeof subcommands[0][0])) {
      // Case 2: Single subcommand as array
      // (nothing to do)
    } else if (Array.isArray(subcommands[0])) {
      // Case 3: Multiple subcommands as array of arrays
      subcommands = subcommands[0];
    }

    // Normalize op name and convert strings to numeric codes
    subcommands = subcommands.map(function (subcommand) {
      if ("string" === typeof subcommand[0]) {
        subcommand[0] = BLOB_OPS[subcommand[0]];
      }
      if ("number" !== typeof subcommand[0]) {
        throw new Error("Invalid op in subcommand");
      }
      if ("string" !== typeof subcommand[1]) {
        throw new Error("Invalid path in subcommand");
      }
      return subcommand;
    });

    if (compress) {
      // Convert to the minimal possible format
      if (subcommands.length === 1) {
        return subcommands[0];
      } else {
        return [subcommands];
      }
    } else {
      return subcommands;
    }
  }

  function extend(){
    for(var i=1; i<arguments.length; i++) {
      for(var key in arguments[i]) {
        if(arguments[i].hasOwnProperty(key)) {
          if (typeof arguments[0][key] === 'object'
              && typeof arguments[i][key] === 'object'
          ) {
              extend(arguments[0][key], arguments[i][key]);
          } else {
              arguments[0][key] = arguments[i][key];
          }
        }
      }
    }
    return arguments[0];
  }







  /* class AuthDataFilesystem
   *
   * Do not create directly because that's async, use static method `AuthDataFilesystem.create(opts, cb)`.
   */
  class AuthDataFilesystemV1 extends AuthData {
    //// Pseudo-private properties:
    // _password
    // _path
    // _address
    // _contacts
    // _created
    // _updated
    // _keypairs

    constructor(data){
      super(data.network, data.address, data.keypairs, data.contacts);
      this._password = data.password;
      this._path = data.path;
      this._created = data.created;
      this._updated = data.updated;
    }

    // create(opts:Map<string, any>) => Promise<AuthDataFilesystem> -- create in filesystem and return Promise of instance.
    static async create(opts) {
      const authData = new AuthDataFilesystemV1({
        network: SettingFactory.getCurrentNetwork().networkPassphrase,
        address: opts.address,
        keypairs: opts.secrets.map((secret)=>({
          publicKey: StellarSdk.Keypair.fromSecret(secret).publicKey(),
          signingMethod: CONST.SIGNING_METHOD.ENCRYPTED_SECRET,
          details: secret,
        })),
        password: opts.password,
        path: opts.path,

        contacts: [],
        created: (new Date()).toJSON(),
        updated: (new Date()).toJSON(),
      });

      return authData.save()
        .catch((err)=>{
          //The default folder is the root of HD when the first time user save file on Mac.
          // EACCES: permission denied
          if (/* nw.global.navigator.platform.indexOf('Mac') >= 0 &&  */err.message.indexOf('permission denied') >= 0) {
            throw new Error("Permission denied. Please choose another location.");
          }

          throw err;
        });
    }

    // restore() => AuthDataFilesystem -- restore from sessionStorage and return instance.
    static restore() {
      const {blob, password, path} = JSON.parse($window.sessionStorage[AuthData.SESSION_KEY]);
      return AuthDataFilesystemV1.fromBlob(blob, password, path);
    }

    // load(...params:any[]) => Promise<AuthDataFilesystem> -- load from filesystem and return Promise of instance.
    static async load(opts) {
      return new Promise((resolve, reject) => {
        const _id = Math.floor(Math.random()*10000);
        const listener = (event, id, err, dataUTF8) => {
          if(_id !== id) return;
          ipcRenderer.removeListener('readFile', listener)

          if (err) return reject(err);
          try {
            resolve(AuthDataFilesystemV1.fromBlob(dataUTF8, opts.password, opts.path));
          } catch(e) {
            reject(e);
          }
        }
        ipcRenderer.on('readFile', listener)
        ipcRenderer.send('readFile', _id, opts.path)
      })
    }

    // Backwards compatibility only.
    get secrets() {
      return this.keypairs
        .filter((keypair)=>keypair.signingMethod === CONST.SIGNING_METHOD.ENCRYPTED_SECRET)
        .map((keypair)=>keypair.details);
    }

    // Convert contacts to new version.
    get contacts() {
      return super.contacts.map(toContactV2)
    }

    // store() => AuthDataFilesystem -- store in sessionStorage and return current instance.
    store() {
      $window.sessionStorage[AuthData.SESSION_KEY] = JSON.stringify({
        version: AuthDataFilesystemV1.VERSION,
        blob: this.blob,
        password: this._password,
        path: this._path,
      });
      return this;
    }

    // save() => Promise<void> -- save to long-term storage (e.g. filesystem) and return Promise of current instance.
    save() {
      return new Promise((resolve, reject) => {
        const _id = Math.floor(Math.random()*10000);
        const listener = (event, id, err) => {
          if(_id !== id) return;
          ipcRenderer.removeListener('writeFile', listener)

          if (err) return reject(err);
          try {
            resolve(this.store());
          } catch(e) {
            reject(e);
          }
        }
        ipcRenderer.on('writeFile', listener)
        ipcRenderer.send('writeFile', _id, this._path, this.blob)
      })
    }

    async signWithEncryptedSecret(publicKey, teHash) {
      const keypair = this.keypairs
        .filter((keypair)=>keypair.signingMethod === CONST.SIGNING_METHOD.ENCRYPTED_SECRET)
        .find((keypair)=>keypair.publicKey === publicKey);
      if(!keypair) throw new Error(`No keypair found with public key ${publicKey}`)
      const kp = StellarSdk.Keypair.fromSecret(keypair.details)
      return kp.signDecorated(teHash);
    }

    async logout() {
      // Nothing to do, kill the instance and it's done.
      return;
    }

    async addContact(contact) {
      new Promise((resolve, reject) => this.unshift("/_contacts", toContactV1(contact), (err, res) => err ? reject(err) : resolve(res)));
    }

    async updateContact(name, contact) {
      new Promise((resolve, reject) => this.filter('/_contacts', 'name', name, 'extend', '', toContactV1(contact), (err, res) => err ? reject(err) : resolve(res)));
    }

    async deleteContact(name) {
      new Promise((resolve, reject) => this.filter('/_contacts', 'name', name, 'unset', '', (err, res) => err ? reject(err) : resolve(res)));
    }

    getContact(value) {
      if (!value) return false;
      for (const contact of super.contacts) {
        if (contact.name === value || contact.address === value) return toContactV2(contact);
      }
      return false;
    }

    //
    // New methods below.
    //

    static fromBlob(rawData, password, path){
      if(!password) throw new Error('No password.')
      if(!path) throw new Error('No path to wallet file.')
      if(!rawData) throw new Error('No rawData.')

      const decrypted = AuthDataFilesystemV1._decrypt(password, rawData);
      if (!decrypted) throw new Error("Error while decrypting blob");

      const authDataFileSystemV1 = new AuthDataFilesystemV1({
        address: decrypted.account_id,
        keypairs: decrypted.masterkeys.map((secret)=>({
          publicKey: StellarSdk.Keypair.fromSecret(secret).publicKey(),
          signingMethod: CONST.SIGNING_METHOD.ENCRYPTED_SECRET,
          details: secret,
        })),
        contacts: decrypted.contacts,
        network: StellarSdk.Networks.PUBLIC,  // Implied default.
        created: decrypted.created,
        updated: decrypted.created,  // There's no such value in V1, so make it up.
        password,
        path,
      });
      return authDataFileSystemV1;
    }

    static _encrypt(password, data) {
      // Filter Angular metadata before encryption
      let cleanContacts = data.contacts;
      if ('object' === typeof data && 'object' === typeof data.contacts) {
        cleanContacts = angular.fromJson(angular.toJson(data.contacts));
      }

      const plaintext_v1 = JSON.stringify({
        account_id: data.address,
        contacts: cleanContacts.map(toContactV1),
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
        masterkeys: [object.masterkey],
      }
    }

    get blob() {
      return AuthDataFilesystemV1._encrypt(this._password, this);
    }

    //
    // Magical methods to opererate on contacts. I don't want to break old wallet files and left as is. TODO: simplify or explain.
    //

    _applyUpdate(op, path, params, callback) {
      // Exchange from numeric op code to string
      if ("number" === typeof op) op = BLOB_OPS_REVERSE[op];
      if ("string" !== typeof op) throw new Error("Blob update op code must be a number or a valid op id string");

      // Separate each step in the "pointer"
      const pointer = path.split("/");

      const first = pointer.shift();
      if (first !== "") {
        throw new Error("Invalid JSON pointer: "+path);
      }

      this._traverse(this, pointer, path, op, params);  // it was `this.data` instead of `this`.

      this._updated = (new Date()).toJSON();
      this.save().then((data)=>{
        console.log('Blob saved');
        if (typeof callback === 'function') callback(null, data);
      }).catch((err)=>{
        console.error('Blob save failed!', err);
        if (typeof callback === 'function') callback(err);
      });
    }

    _traverse(context, pointer, originalPointer, op, params) {
      let part = unescapeToken(pointer.shift());

      if (Array.isArray(context)) {
        if (part === '-') {
          part = context.length;
        } else if (part % 1 !== 0 || part < 0) {
          throw new Error("Invalid pointer, array element segments must be " +
                          "a positive integer, zero or '-'");
        }
      } else if ("object" !== typeof context) {
        return null;
      } else if (!context.hasOwnProperty(part)) {
        // Some opcodes create the path as they're going along
        if (op === "set") {
          context[part] = {};
        } else if (op === "unshift") {
          // this is not last element in path, and next is not array pointer
          // so create object, not array
          if (pointer.length !== 0 && pointer[0] !== '-' &&
              (pointer[0] % 1 !== 0 || pointer[0] < 0)) {
            context[part] = {};
          } else {
            context[part] = [];
          }
        } else {
          return null;
        }
      }

      if (pointer.length !== 0) {
        return this._traverse(context[part], pointer, originalPointer, op, params);
      }

      switch (op) {
        case "set":
          context[part] = params[0];
          break;
        case "unset":
          if (Array.isArray(context)) {
            context.splice(part, 1);
          } else {
            delete context[part];
          }
          break;
        case "extend":
          if ("object" !== typeof context[part]) {
            throw new Error("Tried to extend a non-object");
          }
          extend(context[part], params[0]);
          break;
        case "unshift": {
          if ("undefined" === typeof context[part]) {
            context[part] = [];
          } else if (!Array.isArray(context[part])) {
            throw new Error("Operator 'unshift' must be applied to an array.");
          }
          context[part].unshift(params[0]);
          break;
        }
        case "filter": {
          if (!Array.isArray(context[part])) break;

          for (const [i, element] of context[part].entries()) {
            if ("object" === typeof element
              && element.hasOwnProperty(params[0])
              && element[params[0]] === params[1]
            ) {
              const subpointer = originalPointer+"/"+i;
              const subcommands = normalizeSubcommands(params.slice(2));

              subcommands.forEach((subcommand) => {
                const op = subcommand[0];
                const pointer = subpointer+subcommand[1];
                this._applyUpdate(op, pointer, subcommand.slice(2));
              });
            }
          }
          break;
        }
        default: {
          throw new Error("Unsupported op "+op);
        }
      }
    }

    /**
     * Prepend an entry to an array.
     *
     * This method adds an entry to the beginning of an array.
     */
    unshift(pointer, value, callback) {
      this._applyUpdate('unshift', pointer, [value], callback);
    }

    /**
     * Filter the row(s) from an array.
     *
     * This method will find any entries from the array stored under `pointer` and
     * apply the `subcommands` to each of them.
     *
     * The subcommands can be any commands with the pointer parameter left out.
     */
    filter(pointer, field, value, subcommands, callback) {
      let params = Array.prototype.slice.apply(arguments);
      if ("function" === typeof params[params.length-1]) callback = params.pop();
      params.shift();

      // Normalize subcommands to minimize the patch size
      params = params.slice(0, 2).concat(normalizeSubcommands(params.slice(2), true));

      this._applyUpdate('filter', pointer, params, callback);
    }

    get VERSION() { return AuthDataFilesystemV1.VERSION; }
  }
  AuthDataFilesystemV1.VERSION = '1.0';

  return AuthDataFilesystemV1

}]);
