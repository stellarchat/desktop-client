/*global module */

module.exports = {

  SIGNING_METHOD: {
    ENCRYPTED_SECRET: 'encryptedSecret',
    EXTERNAL_SECRET : 'externalSecret',
    COLD_MACHINE    : 'coldMachine',
    HARDWARE_WALLET : 'hardwareWallet',
    UNKNOWN         : 'unknown',  // Effectively everything at the same time. Default value until used first time.
    NONE            : 'none',  // Effectively read-only. Remind user that he can't sign that.
  },

  HWW_STATE: {
    OFFLINE: 'offline',  // After removing cable and "remove" event.
    SLEEP: 'sleep',  // After timeout when PIN has to be entered again.
    ONLINE: 'online',  // After PIN but before Stellar app (usually after "add" event).
    AVAILABLE: 'available',  // inside Stellar app but not yet confirmed subaccount.
    READY: 'ready',  // inside Stellar app and selected subaccount.
  },

  HWW_API: {
    CONFIG: 'HardwareWallet.getAppConfig',
    DESELECT: 'HardwareWallet.deselectSubaccount',
    LIST: 'HardwareWallet.list',
    LISTEN: 'HardwareWallet.listen',
    PK: 'hardwareWallet.getPublicKey',
    SELECT: 'HardwareWallet.selectSubaccount',
    SIGN_HASH: 'hardwareWallet.signHash',
    SIGN_TE: 'hardwareWallet.signTransaction',
    SUPPORT: 'HardwareWallet.isSupported',
  },

  KEYSTORE_API: {
    CREATE: 'Keystore.create',
    LOAD: 'Keystore.load',
    SAVE: 'Keystore.save',
    LOGOUT: 'Keystore.logout',
    SIGN: 'Keystore.sign',
    ADDCONTACT: 'Keystore.addContact',
    UPDATECONTACT: 'Keystore.updateContact',
    DELETECONTACT: 'Keystore.deleteContact',
  }

}
