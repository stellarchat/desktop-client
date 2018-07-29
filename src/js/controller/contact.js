/* global myApp, ripple */

myApp.controller("ContactCtrl", ['$scope', '$rootScope', 'AuthenticationFactory', 'StellarApi',
                        function( $scope ,  $rootScope ,  AuthenticationFactory ,  StellarApi ) {
    $scope.toggle_form = () => {
      $scope.addform_visible = !$scope.addform_visible;
      $scope.reset_form();
    };

    $scope.reset_form = () => {
      $scope.contact = {
        name     : '',
        view     : '',
        address  : '',
        memotype : 'id',
        memo     : ''
      };
      $scope.error = {};
    };
    $scope.reset_form();

    $scope.invalid = (obj) => {
      return $scope.error['exist'] || $scope.error['address'] || $scope.error['memo'];
    }

    $scope.resolve = () => {
      if ($scope.contact.name) {
        var item = $rootScope.contacts.find((element) => {
          return element.name == $scope.contact.name;
        });
        $scope.error['exist'] = item;
      } else {
        $scope.error['exist'] = null;
      }

      if ($scope.contact.address) {
        $scope.error['address'] = !(StellarApi.isValidAddress($scope.contact.address)
					|| ripple.UInt160.is_valid($scope.contact.address)
					|| !isNaN(ripple.Base.decode_check([0, 5], $scope.contact.address, 'bitcoin')));
      } else {
        $scope.error['address'] = null;
      }

      if ($scope.contact.memo) {
        $scope.error['memo'] = StellarApi.isValidMemo($scope.contact.memotype, $scope.contact.memo);
      } else {
        $scope.error['memo'] = '';
      }
    };

    $scope.create = async () => {
      var contact = {
        name    : $scope.contact.name,
        view    : $scope.contact.view,
        address : $scope.contact.address
      };

      if ($scope.contact.memo) {
        contact.memotype = $scope.contact.memotype;
        contact.memo     = $scope.contact.memo;
      }

      $scope.toggle_form();
      $scope.reset_form();

      try {
        await AuthenticationFactory.addContact(contact, true);
        $rootScope.contacts = AuthenticationFactory.contacts;
      } catch(err) {
        $scope.error['memo'] = err.message;	// just find some place to show err
      } finally {
        $scope.$apply();
      }
    };

  }]);

myApp.controller("ContactRowCtrl", ['$scope', '$rootScope', '$location', 'AuthenticationFactory', 'StellarApi',
  function($scope, $rootScope, $location, AuthenticationFactory, StellarApi) {

    $scope.editing = false;
    $scope.cancel = (index) => {
      $scope.editing = false;
    };

    //Switch to edit mode
    $scope.edit = (index) => {
      $scope.editing      = true;
      $scope.editname     = $scope.entry.name;
      $scope.editaddress  = $scope.entry.address;
      $scope.editview     = $scope.entry.view || $scope.entry.address;
      $scope.editmemotype = $scope.entry.memotype || 'id';
      $scope.editmemo     = $scope.entry.memo;
    };

    $scope.error = {};
    $scope.invalid = (obj) => {
      return $scope.error['exist'] || $scope.error['address'] || $scope.error['memo'];
    }

    $scope.resolve = () => {
      if ($scope.editname && $scope.editname != $scope.entry.name) {
        var item = $rootScope.contacts.find((element) => {
          return element.name == $scope.editname;
        });
        $scope.error['exist'] = item;
      } else {
        $scope.error['exist'] = null;
      }

      if ($scope.editaddress) {
        $scope.error['address'] = !(StellarApi.isValidAddress($scope.editaddress)
									|| ripple.UInt160.is_valid($scope.editaddress)
									|| !isNaN(ripple.Base.decode_check([0, 5], $scope.editaddress, 'bitcoin')));
      } else {
        $scope.error['address'] = null;
      }

      if ($scope.editmemo) {
        $scope.error['memo'] = StellarApi.isValidMemo($scope.editmemotype, $scope.editmemo);
      } else {
        $scope.error['memo'] = '';
      }
    };

    $scope.update = async (index) => {
      if ($scope.invalid()) {
        return;
      }

      var contact = {
        name    : $scope.editname,
        view    : $scope.editview,
        address : $scope.editaddress
      };

      if ($scope.editmemo) {
        contact.memotype = $scope.editmemotype;
        contact.memo     = $scope.editmemo;
      }

      $scope.editing = false;

      try {
        await AuthenticationFactory.updateContact($scope.entry.name, contact, true);
        $rootScope.contacts = AuthenticationFactory.contacts;
      } catch(err) {
        $scope.error['memo'] = err.message; // just find some place to show err
      } finally {
        $scope.$apply();
      }

    };

    $scope.remove = async (index) => {
      try {
        await AuthenticationFactory.deleteContact($scope.entry.name);
        $rootScope.contacts = AuthenticationFactory.contacts;
      } catch(err) {
        $scope.error['memo'] = err.message; // just find some place to show err
      } finally {
        $scope.$apply();
      }
    };

    $scope.send = (index) => {
      $location.path('/send').search($scope.entry);
    }
  }]);
