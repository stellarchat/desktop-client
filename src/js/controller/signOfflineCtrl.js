/* global $, myApp, StellarSdk */

myApp.controller('signOfflineCtrl', ['$scope', 'AuthenticationFactory',
  function($scope, AuthenticationFactory) {

  $scope.invalid_xdr = true;
  $scope.teXDR = '';
  $scope.signingError = '';
  $scope.callbackToSignModal = (err, te) => {
    if(err) {
      console.error(err);
    } else {
      $('#signModal').modal('toggle');
      $scope.signed = te.signatures.map((sig)=>sig.toXDR().toString('base64'));
    }
  }


  $scope.$watch('teXDR', async (newValue) => {
    try {
      // await startSpinner();
      try {
        $scope.te = new StellarSdk.Transaction(newValue)
      } catch(e) {
        throw new Error('XDR not valid')
      }

      const thresholds = await AuthenticationFactory.teThresholds($scope.te);
      const tf = AuthenticationFactory.requiredSigners($scope.te, thresholds)
        .some((signerPK)=>signerPK===$scope.address)  // TODO: PK != address
      if(!tf) throw $scope.signingError = "You can't sign this transaction";

      const signerKP = StellarSdk.Keypair.fromPublicKey($scope.address)
      const alreadySigned = $scope.te.signatures.some((sig)=> StellarSdk.verify($scope.te.hash(), sig.signature(), signerKP.rawPublicKey()))
      if(alreadySigned) throw $scope.signingError = "You have already signed this transaction";

      // all good
      $scope.invalid_xdr = false;
      $scope.$apply();

    } catch(e) {
      // tell user e
      if(e.message == 'XDR not valid') {
        console.warn(e.message);
      } else {
        console.error(e);
      }
      $scope.invalid_xdr = true;
    } finally {
      // await stopSpinner();
    }

  });

  $scope.readyToSign = function(teXDR) {
    $(`#signModal`).modal();
  }

  function selectText(element) {
    var doc = document
      , text = element
      , range, selection
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

  for(const preTag of document.getElementsByTagName('pre')) preTag.onclick = function() {selectText(this)};

}]);
