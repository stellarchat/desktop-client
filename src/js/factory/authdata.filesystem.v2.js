/**
 * BLOB
 * User blob storage for desktop client
 */

/* global CONST, invokeIPC, myApp, StellarSdk */

// There's currently a code repetition between blobLocal and blobRemote..
'use strict';

myApp.factory('AuthDataFilesystemV2', ['$window', 'AuthData', 'SettingFactory',
                              function( $window ,  AuthData ,  SettingFactory ){

  /* abstract class AuthData
   *
   * A wrapper around AuthDataFilesystemV2 class in the main process.
   *
   * For now support only one keypair per account, but it should be easy to extend in future.
   *
   */
  class AuthDataFilesystemV2 extends AuthData {
    constructor(data){
      super(data.network, data.address, data.keypairs, data.contacts);
      this._created = data.created;
      this._updated = data.updated;
    }

    static get SESSION_KEY() { return 'authdata'; }

    // create(...opts:any[]) => Promise<AuthData> -- create in persistent storage and return Promise of instance.
    static async create(opts) {
      const backendOpts = {
        network: SettingFactory.getCurrentNetwork().networkPassphrase,
        address: opts.address,
        keypairs: opts.keypairs || opts.secrets.map((secret)=>({
          publicKey: StellarSdk.Keypair.fromSecret(secret).publicKey(),
          signingMethod: CONST.SIGNING_METHOD.ENCRYPTED_SECRET,
          details: secret,
        })),
        password: opts.password,
        path: opts.path,

        contacts: [],
        created: (new Date()).toJSON(),
        updated: (new Date()).toJSON(),
      }

      const data = await invokeIPC(CONST.KEYSTORE_API.CREATE, backendOpts)
      const authData = new AuthDataFilesystemV2(data);

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

    // restore() => AuthData -- restore from sessionStorage and return instance.
    static restore() {
      const {blob} = JSON.parse($window.sessionStorage[AuthData.SESSION_KEY]);
      return new AuthDataFilesystemV2(blob);
    }

    // load(...opts:any[]) => Promise<AuthData> -- load from long-term storage (e.g. filesystem) and return Promise of instance.
    static async load(opts) {
      const data = await invokeIPC(CONST.KEYSTORE_API.LOAD, opts)
      return new AuthDataFilesystemV2(data);
    }

    // store() => AuthData -- store in sessionStorage and return current instance.
    store() {
      $window.sessionStorage[AuthData.SESSION_KEY] = JSON.stringify({
        version: AuthDataFilesystemV2.VERSION,
        blob: {
          network: this._network,
          address: this._address,
          keypairs: this._keypairs,
          contacts: this._contacts,
          created: this._created,
          updated: this._updated,
        }
      });
      return this;
    }

    // save() => Promise<AuthData> -- save to long-term storage (e.g. filesystem) and return Promise with current instance.
    async save() {
      await invokeIPC(CONST.KEYSTORE_API.SAVE);
      return this;
    }

    // logout() => Promise<void> -- safely close outside connections and return Promise.
    async logout() {
      await invokeIPC(CONST.KEYSTORE_API.LOGOUT);
      return;
    }

    // string -- address of the account.
    get address() {
      return this._address;
    }

    // Array<string> -- array of keypairs.
    get keypairs() {
      return this._keypairs.slice();
    }

    // Array<Contact> -- array of Contacts.
    get contacts() {
      return this._contacts.slice();
    }

    async addContact(contact) {
      this._contacts = await invokeIPC(CONST.KEYSTORE_API.ADDCONTACT, contact)
    }

    async updateContact(name, newContact) {
      this._contacts = await invokeIPC(CONST.KEYSTORE_API.UPDATECONTACT, name, newContact)
    }

    async deleteContact(name) {
      this._contacts = await invokeIPC(CONST.KEYSTORE_API.DELETECONTACT, name)
    }

    getContact(value) {
      if (!value) return false;
      for (const contact of super.contacts) {
        if (contact.name === value || contact.address === value) return contact;
      }
      return false;
    }

    get VERSION() { return AuthDataFilesystemV2.VERSION; }
  }
  AuthDataFilesystemV2.VERSION = '2.0';

  return AuthDataFilesystemV2;

}]);
