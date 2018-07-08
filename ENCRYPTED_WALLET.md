# Interface of file contents for encrypted wallets.

```typescript
// Version 1

interface Contact {
    name      : string
    view      : string
    address   : string
    memotype? : 'id' | 'text' | 'hash'
    memo?     : string
}

interface Blob {
    account_id: string
    masterkey: string
    contacts: Contact[]
    created: string  // (new Date()).toString() format.
}

function theGistOfEncryption(blob, password) {
    const plaintext = JSON.stringify(blob);
    const ciphertext = require('sjcl').encrypt(`${password.length}|${password}`, plaintext, {ks: 256, iter: 1000});
    const fileContents = btoa(ciphertext);
    return fileContents;
}
```

```typescript
// Version 2

// Extends Keystore as defined here: https://github.com/ethereum/wiki/wiki/Web3-Secret-Storage-Definition
interface Keystore {
  version: number,  // uses 3
  id: string,
  crypto: {
    ciphertext: string,
    cipher: string,  // uses 'aes-128-ctr'
    cipherparams: CipherParams,  // uses { iv: string },
    kdf: string,  // uses 'scrypt'
    kdfparams: KdfParams,  // uses  { dklen: number, salt: string, n: number, r: number, p: number },
    mac: string,
  }
  // Non-standard extension ahead.
  content: 'stellar',  // Signal that content is Stellar technology's AuthData, not a plain Ethereum private key.
  contentparams: {
      version: '2.0',  // Decimal point mandatory. First digit is major (breaking) change, second is minor (compatible)
  }
}

interface AuthData {
    address : string  // Verified with `StellarSdk.isValidEd25519PublicKey(address)`
    network : string  // Network passphrase of network where the account is created in
    keypairs: Keypair[]  // To know what publicKeys user owns lets UI to decide how to request their signatures.
    contacts: Contact[]  // Sorted by time created.
    created : string  // local timezone, ISO format: 2018-06-13T08:13:56+00:00
    updated : string  // local timezone, ISO format: 2018-06-13T08:13:56+00:00
}

interface Keypair {
    publicKey    : string  // Verified with `StellarSdk.isValidEd25519PublicKey(address)`
    signingMethod: SigningMethod  // Force user to sign in one way only.
    details      : string  // depends on signingMethod, i.e. for "encryptedSecret" that's the secret itself.
}

enum SigningMethod {
    ENCRYPTED_SECRET = 'encryptedSecret',
    EXTERNAL_SECRET  = 'externalSecret',
    COLD_MACHINE     = 'coldMachine',
    HARDWARE_WALLET  = 'hardwareWallet',
    UNKNOWN          = 'unknown',  // Effectively everything at the same time. Default value until used first time.
    NONE             = 'none',  // Effectively read-only. Remind user that he can't sign that.
}

interface Contact {
    address    : string | undefined  // at least one of "address" or "federation" must be defined.
    federation : string | undefined  // If both of them are, "address" takes precedence.
    name       : string  // UTF-8, max 100 characters, must be at least 1 character.
    details    : string  // UTF-8, max 10'000 characters, may be empty.
    created    : string  // local timezone, ISO format: 2018-06-13T08:13:56+00:00
    updated    : string  // local timezone, ISO format: 2018-06-13T08:13:56+00:00
    // Memo is verified with `try{ new StellarSdk.Memo(type, value); return true} catch(e) { return false}`
    defaultMemoType : 'none' | 'id' | 'text' | 'hash' | 'return'  // Matches constants as in `StellarSdk.Memo.*`
    defaultMemoValue: undefined | string | number  // According to memo type
}

function theGistOfEncryption(authData, password) {
    const cipherparams = { iv: require('crypto').randomBytes(16) };
    const kdfparams = { dklen: 32, salt: require('crypto').randomBytes(32), n: 262144, r: 8, p: 1 };
    const plaintext = JSON.stringify(authData);
    const id = require('uuid/v4')({ random: require('crypto').randomBytes(16) });
    const derivedKey = require('scryptsy')(Buffer.from(password), kdfparams.salt, kdfparams.n, kdfparams.r, kdfparams.p, kdfparams.dklen);
    const cipher = require('crypto').createCipheriv('aes-128-ctr', derivedKey.slice(0, 16), cipherparams.iv);
    const ciphertext = Buffer.concat([ cipher.update(plaintext), cipher.final() ]);
    const mac = require('keccak256')(Buffer.concat([ derivedKey.slice(16, 32), Buffer.from(ciphertext, 'hex') ]));
    const fileContents = JSON.stringify({
        version: 3,
        id: id,
        content: 'stellar',
        contentparams: {
            version: '2.0',
        },
        crypto: {
            ciphertext: ciphertext.toString('hex'),
            cipher: 'aes-128-ctr',
            cipherparams: cipherparams,
            kdf: 'scrypt',
            kdfparams: kdfparams,
            mac: mac.toString('hex'),
        },
    });
    return fileContents;
}

```