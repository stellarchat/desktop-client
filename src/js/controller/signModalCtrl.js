/* global $, Buffer, CONST, myApp, StellarSdk */
myApp.controller('signModalCtrl', ['$rootScope', '$scope', 'AuthenticationFactory', '$element', '$timeout', 'hardwareWalletDaemon',
                          function( $rootScope ,  $scope ,  AuthenticationFactory ,  $element ,  $timeout ,  hardwareWalletDaemon ) {

  // Set default error in case user closes modal. Otherwise always override it.
  let paramsToReturnCallback = [new Error('Signing was cancelled by user.'), null];
  let thresholds;

  /** START: On modal open **/
  $($element).on('show.bs.modal', async () => {
    $scope.signatureInvalid = true;
    $scope.walletInvalid = true;
    $scope.walletError = '';
    $scope.plainError = '';
    $scope.signWithLedger = 'Sign with Ledger';
    $scope.loading = true;
    if(AuthenticationFactory.secretAmount > 0) {
      $scope.loadingState = 'Signing...';
    } else {
      $scope.loadingState = 'Loading...';
    }
  });
  $($element).on('shown.bs.modal', async () => {
    thresholds = await AuthenticationFactory.teThresholds($scope.te)
    $scope.refresh();
  });
  $($element).on('hide.bs.modal', async () => {
  });
  $($element).on('hidden.bs.modal', async () => {
    $scope.callback(...paramsToReturnCallback);
  });
  /** END: Offline sign **/


  /** START: Plain secret sign **/
  $scope.$watch('plainSecret', () => {
    if(StellarSdk.StrKey.isValidEd25519SecretSeed($scope.plainSecret)) {
      $scope.plainError = '';
      $('.plainSecretSign').removeAttr("disabled");
    } else {
      $scope.plainError = 'Invalid Secret.';
      $('.plainSecretSign').attr("disabled", "disabled");
    }
  }, true);

  $scope.plainSecretSign = async () => {
    try {
      const before = $scope.te.signatures.length;
      $scope.te = AuthenticationFactory.sign($scope.te, thresholds, [], [$scope.plainSecret]);
      const after = $scope.te.signatures.length;
      if(before === after) throw new Error('Secret is not useful for any of accounts above.');
    } catch(err) {
      $scope.plainError = err.message;
      $('.plainSecretSign').attr("disabled", "disabled");
    } finally {
      $scope.refresh();
    }
  }
  /** END: Plain secret sign **/


  /** START: Hardware wallet sign **/
  $scope.hardwareWalletSign = async () => {
    try {
      $scope.signWithLedger = 'Please confirm Transaction in Ledger...'
      $scope.refresh();
      const signature = await hardwareWalletDaemon.signTransaction($scope.te.signatureBase().toString('base64') )
      $scope.te = AuthenticationFactory.sign($scope.te, thresholds, [signature], []);
      $scope.signWithLedger = 'Done! Sign with Ledger again'
    } catch(err) {
      if(err.message.toLowerCase().includes('reject')) {
        $scope.signWithLedger = `Transaction rejected. Try again?`
      } else {
        $scope.signWithLedger = `Unknown Error.`
        console.error(err);
      }
    } finally {
      $scope.refresh();
    }
  }
  /** END: Hardware wallet sign **/


  /** START: Offline sign **/
  $scope.$watch('signatureXDRs', (newValue) => {
    if(!newValue) return;

    let parsedSignatureXDRs
    let parsedSignatures

    try {
      parsedSignatureXDRs = JSON.parse(newValue);
    } catch (e) {
      // TODO display error
      throw e;
    }
    try {
      parsedSignatures = parsedSignatureXDRs.map((sig)=>StellarSdk.xdr.DecoratedSignature.fromXDR(Buffer.from(sig, 'base64')))
    } catch(e) {
      // TODO display error
      throw e;
    }
    const myKP = StellarSdk.Keypair.fromPublicKey($rootScope.address)
    const isOk = parsedSignatures.every((sig)=>StellarSdk.verify($scope.te.hash(), sig.signature(), myKP.rawPublicKey()));

    if(isOk) {
      $scope.signatureInvalid = false;
    } else {
      $scope.signatureInvalid = true;
    }

  }, true);

  $scope.offlineSignatureAdd = async () => {
    $scope.loading = true;
    const parsedSignatureXDRs = JSON.parse($scope.signatureXDRs);
    $scope.te = AuthenticationFactory.sign($scope.te, thresholds, parsedSignatureXDRs);
    $scope.refresh();
  }
  /** END: Offline sign **/


  /** START: Refresh signing **/
  $scope.refresh = async () => {

    // Check if all done
    $scope.te = AuthenticationFactory.sign($scope.te, thresholds, [], []);
    $scope.requiredSigners = AuthenticationFactory.requiredSigners($scope.te, thresholds);
    if($scope.requiredSigners.length === 0) {
      paramsToReturnCallback = [null, $scope.te];
      $($element).modal('hide');
      return;
    }

    //

    // Otherwise, calc printable information
    $scope.teXDR = $scope.te.toEnvelope().toXDR().toString('base64');
    const teBare = new StellarSdk.Transaction($scope.teXDR);
    teBare.signatures = [];
    const allSigners = AuthenticationFactory.requiredSigners(teBare, thresholds);
    $scope.signedSigners = allSigners
      .map((signerPK) => StellarSdk.Keypair.fromPublicKey(signerPK))
      .filter((signerKP) => $scope.te.signatures.some((sig)=>StellarSdk.verify($scope.te.hash(), sig.signature(), signerKP.rawPublicKey())))
      .map((signerKP) => signerKP.publicKey())

    // Apply changes
    $scope.loading = false;
    $scope.loadingState = 'Signing...';
    $scope.$apply();
  }
  /** END: Refresh signing **/



  /** START: Communicate with Ledger **/

  // Connect with ledger

  const listener = async (hardwareWalletDaemon) => {
    try {
      const isSupported = await hardwareWalletDaemon.isSupported;
      if(!isSupported) {
        $scope.walletError = 'Your computer doesn\'t support Ledger!'
        $scope.$apply();
        throw 'Your computer doesn\'t support Ledger!';
      }
      const hardwareList = await hardwareWalletDaemon.list;
      if(hardwareList.length != 1) {
        $scope.addressInputDisabled = true;
        if(hardwareList.length < 1) $scope.walletError = 'Please connect Ledger.'
        if(hardwareList.length > 1) $scope.walletError = 'Please connect only one Ledger.'
        $scope.$apply();
        if(hardwareList.length != 1) throw 'Hardware list count is not expected';
      }

      const wallet = await hardwareWalletDaemon.activeWallet;
      if(wallet.state !== CONST.HWW_STATE.AVAILABLE && wallet.state !== CONST.HWW_STATE.READY) {
        $scope.walletError = 'Please open Ledger app.'
        $scope.$apply();
        throw 'Please open Ledger app';
      }

      $scope.walletError = '';
      $scope.walletInvalid = false;
      $scope.$apply();
    } catch(err) {
      console.error('SignModalCtrl.listen:', err);
    }
  }

  hardwareWalletDaemon.listen(listener);
  listener(hardwareWalletDaemon);

  /** END: Communicate with Ledger **/



  /** START: Select all text in <pre> **/
  const selectText = (element) => {
    var doc = document,
        text = element,
        range, selection
    ;
    if (doc.body.createTextRange) { //ms
      range = doc.body.createTextRange();
      range.moveToElementText(text);
      range.select();
    } else if (window.getSelection) { //all others
      selection = window.getSelection();
      range = doc.createRange();
      range.selectNodeContents(text);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
  for(const pretag of document.getElementsByTagName('pre')) {
    pretag.onclick = function() {selectText(this)};
  }
  /** END: Select all text in <pre> **/


  /** START: Tab bugfix **/
  $('.nav-tabs a').click(function (e) {
    e.preventDefault();
    $(this).tab('show');
  });
  /** END: Tab bugfix **/

}]);
