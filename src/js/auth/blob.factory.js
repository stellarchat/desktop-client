/**
 * BLOB
 * User blob storage for desktop client
 */

/* global angular, myApp, require */

// There's currently a code repetition between blobLocal and blobRemote..
'use strict';
const fs = require('fs');
const sjcl = require('sjcl');

myApp.factory('BlobFactory', ['$rootScope', '$window', function ($scope, $window){

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

  /* class BlobObj
   *
   * Do not create directly because that's async, use static method `BlobObj.create(opts, cb)`.
   */
  return class BlobObj {
    constructor(password, walletfile, data){
      this.password = password;
      this.walletfile = walletfile;
      this.data = data;

      if(!this.data) throw new Error("Error while decrypting blob");
    }

    static fromBlob(password, walletfile, rawData){
      if(!password) throw new Error('No password.')
      if(!walletfile) throw new Error('No path to wallet file.')
      if(!rawData) throw new Error('No rawData.')

      const blob = new BlobObj(password, walletfile, BlobObj._decrypt(password, rawData));
      if (!blob.data) throw new Error("Error while decrypting blob");
      return blob;
    }

    /**
     * Attempts to retrieve and decrypt the blob.
     */
    static open(password, walletfile, callback) {
      fs.readFile(walletfile, 'utf8', (err, blob) => {
        if (err) return callback(err);

        try {
          const o = BlobObj.fromBlob(password, walletfile, blob);
          o._saveToSession();
          callback(null, o);
        } catch(e) {
          callback(e);
        }

      });
    }

    /**
     * Create a blob object
     *
     * @param {object} opts
     * @param {string} opts.url
     * @param {string} opts.id
     * @param opts.crypt
     * @param opts.unlock
     * @param {string} opts.username
     * @param {string} opts.account
     * @param {string} opts.masterkey
     * @param {object=} opts.oldUserBlob
     */
    static create(opts, callback) {
      const blob = new BlobObj(opts.password, opts.walletfile, {
        masterkey: opts.masterkey,
        account_id: opts.account_id,
        contacts: [],
        created: (new Date()).toJSON()
      });

      blob._saveToSession();
      blob._saveToFile(callback);
    }

    _saveToSession() {
      $window.sessionStorage.walletfile = JSON.stringify({
        blob: this.blob,
        password: this.password,
        path: this.walletfile,
      });
    }

    static fromSession() {
      if(!$window.sessionStorage.walletfile) throw new Error('No file wallet in session.');
      try {
        const {password, path, blob} = JSON.parse($window.sessionStorage.walletfile);
        return BlobObj.fromBlob(password, path, blob);
      } catch(e) {
        const {walletfile} = $window.sessionStorage;
        delete $window.sessionStorage.walletfile;
        throw new Error(`File wallet in session corrupted, cleaned up!\n${walletfile}\n${e}`)
      }
    }

    // Store blob in a file
    _saveToFile(callback) {
      console.log('blob persist:', this.data);

      fs.writeFile(this.walletfile, this.blob, (err) => {

        this._saveToSession();
        callback(err, this);
      });
    }

    get blob() {
      return BlobObj._encrypt(this.password, this.data);
    }

    static _encrypt(password, data) {
      // Filter Angular metadata before encryption
      if ('object' === typeof data && 'object' === typeof data.contacts) {
        data.contacts = angular.fromJson(angular.toJson(data.contacts));
      }

      const plaintext = JSON.stringify(data)
      const blob = btoa(sjcl.encrypt(`${password.length}|${password}`, plaintext, {
          ks: CRYPT_CONFIG.ks,
          iter: CRYPT_CONFIG.iter
      }));
      return blob;
    }

    static _decrypt(password, blob) {
      const plaintext = sjcl.decrypt(`${password.length}|${password}`, atob(blob));
      return JSON.parse(plaintext);
    }

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

      this._traverse(this.data, pointer, path, op, params);

      this._saveToFile((err, data) => {
        console.log('Blob saved');
        if (typeof callback === 'function') callback(err, data);
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

  }

}]);
