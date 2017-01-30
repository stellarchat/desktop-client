myApp.controller("HeaderCtrl", ['$scope', '$location', 'UserAuthFactory',
  function($scope, $location, UserAuthFactory) {

    $scope.isActive = function(route) {
      return route === $location.path();
    }

    $scope.logout = function () {
      UserAuthFactory.logout();
    }
  }
]);

myApp.controller("FooterCtrl", [ '$scope', '$translate',
  function($scope, $translate) {
	$scope.changeLanguage = function (key) {
	    $translate.use(key);
	};
}]);

myApp.controller("HomeCtrl", ['$scope',
  function($scope) {
    $scope.name = "Home Controller";
  }
]);

myApp.controller("HistoryCtrl", ['$scope',
  function($scope) {
    $scope.name = "History Controller";
  }
]);

