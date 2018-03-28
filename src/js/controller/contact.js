myApp.controller("ContactCtrl", ['$scope', '$rootScope', 'AuthenticationFactory', 'StellarApi',
                                 function($scope, $rootScope, AuthenticationFactory, StellarApi) {

	$scope.toggle_form = function() {
		$scope.addform_visible = !$scope.addform_visible;
		$scope.reset_form();
	};
	
	$scope.reset_form = function() {
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
	
	$scope.invalid = function(obj) {
		return $scope.error['exist'] || $scope.error['address'] || $scope.error['memo'];
	}
	
	$scope.resolve = function() {
		if ($scope.contact.name) {
			var item = $rootScope.contacts.find(function(element){
				return element.name == $scope.contact.name;
			});
			$scope.error['exist'] = item;
		} else {
			$scope.error['exist'] = null;
		}
		
		if ($scope.contact.address) {
			$scope.error['address'] = !StellarApi.isValidAddress($scope.contact.address);
		} else {
			$scope.error['address'] = null;
		}
		
		if ($scope.contact.memo) {
			$scope.error['memo'] = StellarApi.isValidMemo($scope.contact.memotype, $scope.contact.memo);
		} else {
			$scope.error['memo'] = '';
		}
	};

	$scope.create = function() {
		var contact = {
			name    : $scope.contact.name,
			view    : $scope.contact.view,
			address : $scope.contact.address
		};

		if ($scope.contact.memo) {
			contact.memotype = $scope.contact.memotype;
			contact.memo     = $scope.contact.memo;
		}

		AuthenticationFactory.addContact(contact, function(err, blob){
			if (err) {
				$scope.error['memo'] = err.message;
			} else {
				AuthenticationFactory.setBlob(blob);
				$rootScope.contacts = blob.data.contacts;
			}
			$scope.$apply();
		});

		$scope.toggle_form();
		$scope.reset_form();
	};
	
}]);

myApp.controller("ContactRowCtrl", ['$scope', '$rootScope', 'AuthenticationFactory', 'StellarApi',
                                 function($scope, $rootScope, AuthenticationFactory, StellarApi) {

	$scope.editing = false;
	$scope.cancel = function (index) {
      $scope.editing = false;
    };

	//Switch to edit mode
    $scope.edit = function (index){
      $scope.editing      = true;
      $scope.editname     = $scope.entry.name;
      $scope.editaddress  = $scope.entry.address;
      $scope.editview     = $scope.entry.view || $scope.entry.address;
      $scope.editmemotype = $scope.entry.memotype;
      $scope.editmemo     = $scope.entry.memo;
    };
    
}]);
