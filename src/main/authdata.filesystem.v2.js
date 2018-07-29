/* global module, require */
'use strict';

const {SIGNING_METHOD} = require('../common/constants')
const fs = require('fs');
const keystore = require('../main/keystore')
const moment = require('moment');
const StellarSdk = require('stellar-sdk');

const validateContact = (c) => {
  if(c.address) {
    if(!StellarSdk.StrKey.isValidEd25519PublicKey(c.address)) throw new Error('Not a valid address.');
  }
  if(c.federation) {
    if(typeof c.federation !== 'string') throw new Error('Invalid federation.');
  }
  if(!c.address && !c.federation) throw new Error('Either address or federation required, or both.');
  if(typeof c.name !== 'string') throw new Error('Invalid name.');
  if(c.name.length > 100) throw new Error(`Too long name, max 100 characters. Got ${c.name.length}.`);
  if(typeof c.details !== 'string') throw new Error('Invalid details.');
  if(c.details.length > 10000) throw new Error(`Too long details, max 10000 characters. Got ${c.name.length}.`);

  if(!moment(c.created, 'YYYY-MM-DDTHH:mm:ssZZ', true).isValid()) throw new Error('Invalid created time.')
  if(!moment(c.updated, 'YYYY-MM-DDTHH:mm:ssZZ', true).isValid()) throw new Error('Invalid created time.')

  switch(c.defaultMemoType) {
    case(StellarSdk.MemoNone):
    case(StellarSdk.MemoId):
    case(StellarSdk.MemoText):
    case(StellarSdk.MemoHash):
    case(StellarSdk.MemoReturn): {
      try {
        new StellarSdk.Memo(c.defaultMemoType, c.defaultMemoValue)
      } catch(e) {
        throw new Error(`Invalid Memo type and value combination. Got "${c.defaultMemoType}" and "${c.defaultMemoValue}".`)
      }
      break;
    }
    default: {
      throw new Error(`Invalid Memo type. Got ${c.defaultMemoType}.`)
    }
  }

}

/* abstract class AuthData
  *
  * A wrapper around AuthDataFilesystemV2 class in the main process.
  *
  * For now support only one keypair per account, but it should be easy to extend in future.
  *
  */
class AuthDataFilesystemBackendV2 {
  constructor(data){
    if(typeof data.network !== 'string') throw new Error('No valid network provided.');
    if(typeof data.address !== 'string') throw new Error('No valid address provided.');
    if(!Array.isArray(data.keypairs)) throw new Error('Keypairs is not array.');
    if(!Array.isArray(data.contacts)) throw new Error('Contacts is not array.');
    this._network = data.network;
    this._address = data.address;
    this._keypairs = data.keypairs;
    this._contacts = data.contacts;
    this._password = data.password;
    this._path = data.path;
    this._created = data.created;
    this._updated = data.updated;
  }

  static create(opts) {
    return new AuthDataFilesystemBackendV2(opts);
  }

  static async load(opts) {
    const fileContent = fs.readFileSync(opts.path, 'utf-8');
    const plaintext = keystore.fromV3(fileContent, opts.password, {});
    const data = Object.assign({}, opts, JSON.parse(plaintext));
    return new AuthDataFilesystemBackendV2(data);
  }

  _getSafeKeypairs() {
    return this._keypairs
      .map((keypair)=> {
        switch(keypair.signingMethod) {
          case(SIGNING_METHOD.EXTERNAL_SECRET):
          case(SIGNING_METHOD.COLD_MACHINE):
          case(SIGNING_METHOD.HARDWARE_WALLET):
          case(SIGNING_METHOD.UNKNOWN):
          case(SIGNING_METHOD.NONE): {
            return keypair;
          }
          case(SIGNING_METHOD.ENCRYPTED_SECRET): {
            return {
              publicKey: keypair.publicKey,
              signingMethod: keypair.signingMethod,
              details: "REDACTED",
            }
          }
          default: {
            throw new Error(`Invalid Keypair found: ${JSON.stringify(keypair)}`);
          }
        }
      });
  }

  toJSON() {
    return {
      network: this._network,
      address: this._address,
      keypairs: this._getSafeKeypairs(),
      contacts: this._contacts,
      password: this._password,
      path: this._path,
      created: this._created,
      updated: this._updated,
    };
  }

  async save() {
    const data = {
      address: this._address,
      network: this._network,
      keypairs: this._keypairs,
      contacts: this._contacts,
      created: this._created,
      updated: this._updated,
    }
    const fileContent = JSON.stringify(keystore.toV3(data, this._password, {}));
    fs.writeFileSync(this._path, fileContent, 'utf-8');
  }


  signWithEncryptedSecret(publicKey, teHash) {
    const keypair = this._keypairs
      .filter((keypair)=>keypair.signingMethod === SIGNING_METHOD.ENCRYPTED_SECRET)
      .find((keypair)=>keypair.publicKey === publicKey);
    if(!keypair) throw new Error(`No keypair found with public key ${publicKey}`)
    const kp = StellarSdk.Keypair.fromSecret(keypair.details)
    return kp.signDecorated(teHash);
  }


  async addContact(contact) {
    validateContact(contact);

    this._contacts.push(contact);
    await this.save();
  }

  async updateContact(name, contact) {
    const foundContact = this._contacts.find((contact)=>contact.name === name)
    if(!foundContact) throw new Error('No such contact.');
    validateContact(contact);

    const index = this._contacts.indexOf(foundContact);
    this._contacts.splice(index, 1, contact);

    await this.save();
  }

  async deleteContact(name) {
    const foundContact = this._contacts.find((contact)=>contact.name === name)
    if(!foundContact) throw new Error('No such contact.');
    const index = this._contacts.indexOf(foundContact);
    this._contacts.splice(index, 1);

    await this.save();
  }

}

module.exports = {
  AuthDataFilesystemBackendV2: AuthDataFilesystemBackendV2,
}
