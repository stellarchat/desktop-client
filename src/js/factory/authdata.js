/**
 * BLOB
 * User blob storage for desktop client
 */

/* global myApp */

// There's currently a code repetition between blobLocal and blobRemote..
'use strict';

myApp.factory('AuthData', [
                 function (){

  /* abstract class AuthData
   *
   * Handles persistence of data for Auth. Various subclasses handles various long-term storages.
   */
  class AuthData {
    constructor(network, address, keypairs, contacts){
      if(typeof network !== 'string') throw new Error('No valid network provided.');
      if(typeof address !== 'string') throw new Error('No valid address provided.');
      if(!Array.isArray(keypairs)) throw new Error('Keypairs is not array.');
      if(!Array.isArray(contacts)) throw new Error('Contacts is not array.');
      this._network = network;
      this._address = address;
      this._keypairs = keypairs;
      this._contacts = contacts;
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

    // string -- network on which the account exists. Not an array because address reuse between networks is not recommended.
    get network() {
      return this._network;
    }

    // logout() => Promise<void> -- safely close outside connections and return Promise.
    logout() {
      throw new Error('Implement .logout()');
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

    // signWithEncryptedSecret(publicKey: string, teHash: Buffer) => Promise<string> -- sign teHash with given publicKey and return signature.
    async signWithEncryptedSecret(publicKey, teHash) {
      throw new Error('Implement .signWithEncryptedSecret()');

    }

    async addContact(contact) {
      throw new Error('Implement .addContact()');
    }

    async updateContact(name, newContact) {
      throw new Error('Implement .updateContact()');
    }

    async deleteContact(name) {
      throw new Error('Implement .deleteContact()');
    }

    getContact(nameOrAddress) {
      throw new Error('Implement .getContact()');
    }

  }

  return AuthData;

}]);
