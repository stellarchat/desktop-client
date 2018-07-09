/* global Buffer, module, require, scryptsy, uuidv4 */

// Credits to Web3 for base: https://github.com/ethereumjs/ethereumjs-wallet/blob/master/index.js

const createKeccakHash = require('keccak')
const crypto = require('crypto');
const scryptsy = require('scryptsy');
const uuidv4 = require('uuid/v4');

const keccak256 = (a) => createKeccakHash('keccak256').update(a).digest();
const decipherBuffer = (decipher, data) => Buffer.concat([ decipher.update(data), decipher.final() ]);

const toV3 = function (plaintext, password, opts, progressCallback) {
  if(typeof plaintext === 'object') plaintext = JSON.stringify(plaintext);

  opts = opts || {}
  var salt = opts.salt || crypto.randomBytes(32)
  var iv = opts.iv || crypto.randomBytes(16)

  var derivedKey
  var kdf = opts.kdf || 'scrypt'
  var kdfparams = {
    dklen: opts.dklen || 32,
    salt: salt.toString('hex')
  }

  if (kdf === 'pbkdf2') {
    kdfparams.c = opts.c || 16384 // Originally was 262144.
    kdfparams.prf = 'hmac-sha256'
    derivedKey = crypto.pbkdf2Sync(Buffer.from(password), salt, kdfparams.c, kdfparams.dklen, 'sha256')
  } else if (kdf === 'scrypt') {
    kdfparams.n = opts.n || 16384 // Originally was 262144, MyEtherWallet has 8192.
    kdfparams.r = opts.r || 8
    kdfparams.p = opts.p || 1
    derivedKey = scryptsy(Buffer.from(password), salt, kdfparams.n, kdfparams.r, kdfparams.p, kdfparams.dklen, progressCallback)
  } else {
    // TODO: Support Argon2
    throw new Error('Unsupported kdf')
  }

  var cipher = crypto.createCipheriv(opts.cipher || 'aes-128-ctr', derivedKey.slice(0, 16), iv)
  if (!cipher) {
    throw new Error('Unsupported cipher')
  }

  var ciphertext = Buffer.concat([ cipher.update(plaintext), cipher.final() ])

  // `keccak256` is the same as `require('ethereumjs-util').sha3` at version 5.1.4
  var mac = keccak256(Buffer.concat([ derivedKey.slice(16, 32), Buffer.from(ciphertext, 'hex') ]));

  return {
    version: 3,
    contentType: 'stellar',
    contentVersion: 2,
    id: uuidv4({ random: opts.uuid || crypto.randomBytes(16) }),
    crypto: {
      ciphertext: ciphertext.toString('hex'),
      cipherparams: {
        iv: iv.toString('hex')
      },
      cipher: opts.cipher || 'aes-128-ctr',
      kdf: kdf,
      kdfparams: kdfparams,
      mac: mac.toString('hex')
    }
  }
}

const fromV3 = function (input, password, opts, progressCallback) {
  if(typeof password !== 'string') throw new Error('Password is not a string.');
  var json = (typeof input === 'object') ? input : JSON.parse(opts.nonStrict ? input.toLowerCase() : input);

  if (json.version !== 3) {
    throw new Error('Not a V3 wallet')
  }

  var derivedKey
  var kdfparams
  if (json.crypto.kdf === 'scrypt') {
    kdfparams = json.crypto.kdfparams

    derivedKey = scryptsy(Buffer.from(password), Buffer.from(kdfparams.salt, 'hex'), kdfparams.n, kdfparams.r, kdfparams.p, kdfparams.dklen, progressCallback)
  } else if (json.crypto.kdf === 'pbkdf2') {
    kdfparams = json.crypto.kdfparams

    if (kdfparams.prf !== 'hmac-sha256') {
      throw new Error('Unsupported parameters to PBKDF2')
    }

    derivedKey = crypto.pbkdf2Sync(Buffer.from(password), Buffer.from(kdfparams.salt, 'hex'), kdfparams.c, kdfparams.dklen, 'sha256')
  } else {
    throw new Error('Unsupported key derivation scheme')
  }

  var ciphertext = Buffer.from(json.crypto.ciphertext, 'hex')

  // `keccak256` is the same as `require('ethereumjs-util').sha3` at version 5.1.4
  var mac = keccak256(Buffer.concat([ derivedKey.slice(16, 32), ciphertext ]));
  if (mac.toString('hex') !== json.crypto.mac) {
    throw new Error('Key derivation failed - possibly wrong passphrase')
  }

  var decipher = crypto.createDecipheriv(json.crypto.cipher, derivedKey.slice(0, 16), Buffer.from(json.crypto.cipherparams.iv, 'hex'))
  var plaintext = decipherBuffer(decipher, ciphertext, 'hex')

  return plaintext;
}

module.exports = {
    toV3: toV3,
    fromV3: fromV3,
}