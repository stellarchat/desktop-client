/*global module */

module.exports = {

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

}
