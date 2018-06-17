/**
 * BLOB
 * User blob storage for desktop client
 */

/* global myApp */

// There's currently a code repetition between blobLocal and blobRemote..
'use strict';

myApp.factory('AuthData', ['$rootScope', '$window', function ($scope, $window){

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

  /* abstract class AuthData
   *
   * Handles persistence of data for Auth. Various subclasses handles various long-term storages.
   */
  return class AuthData {
    constructor(address, secrets, contacts){
      if(!address) throw new Error('No address provided.');
      if(!Array.isArray(secrets)) throw new Error('Secrets is not array.');
      if(!Array.isArray(contacts)) throw new Error('Contacts is not array.');
      this._address = address;
      this._secrets = secrets || [];
      this._contacts = contacts || [];
    }

    static get SESSION_KEY() { return 'authdata'; }

    // create(...opts:any[]) => Promise<AuthData> -- create in persistent storage and return Promise of instance.
    static create(opts) {
      throw new Error('Implement .create()');
    }

    // restore() => AuthData -- restore from sessionStorage and return instance.
    static restore() {
      throw new Error('Implement .restore()');
    }

    // load(...opts:any[]) => Promise<AuthData> -- load from long-term storage (e.g. filesystem) and return Promise of instance.
    static load(opts) {
      throw new Error('Implement .load()');
    }

    // store() => AuthData -- store in sessionStorage and return current instance.
    store() {
      throw new Error('Implement .store()');
    }

    // save() => Promise<AuthData> -- save to long-term storage (e.g. filesystem) and return Promise with current instance.
    save() {
      throw new Error('Implement .save()');
    }

    // string -- address of the account.
    get address() {
      return this._address;
    }

    // Array<string> -- array of secrets.
    get secrets() {
      return this._secrets.slice();
    }

    // Array<Contact> -- array of Contacts.
    get contacts() {
      return this._contacts.slice();
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
          $.extend(context[part], params[0]);
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

  }

}]);
