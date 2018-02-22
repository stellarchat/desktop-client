myApp.controller("HeaderCtrl", ['$scope', '$rootScope', '$location', 'UserAuthFactory', 'SettingFactory', 'StellarApi',
  function($scope, $rootScope, $location, UserAuthFactory, SettingFactory, StellarApi) {

    $scope.isActive = function(route) {
      return route === $location.path();
    }

    $scope.logout = function () {
      UserAuthFactory.logout();
      StellarApi.logout();
      $rootScope.reset();
    }
  }
]);

myApp.controller("FooterCtrl", [ '$scope', '$translate', 'SettingFactory',
  function($scope, $translate, SettingFactory) {
	$scope.changeLanguage = function (key) {
	    $translate.use(key);
	    SettingFactory.setLang(key);
	};
}]);

myApp.controller("HomeCtrl", ['$scope', '$rootScope', 'RemoteFactory',
   function($scope, $rootScope, RemoteFactory) {

	RemoteFactory.getStellarTicker(function(err, ticker) {
		if (ticker) {
			$rootScope.stellar_ticker = ticker;
			console.log(ticker);
			updatePie();
		}
	});
	
	$scope.pie = {
		labels : [],
		data : [],
		options : {legend: {display: true}},
		table : [],
		total : 0,
		reset : function(){
			this.labels = [];
			this.data   = [];
			this.table  = [];
			this.total  = 0;
		}
	};
	function updatePie() {
		$scope.pie.reset();
		
		$scope.pie.total = 0;
		$rootScope.stellar_ticker.assets.forEach(function(asset){
			if (asset.code == 'XLM') {
				//$scope.pie.total = asset.volume24h_XLM;
			} else {
				if (asset.volume24h_XLM) {
					$scope.pie.total += asset.volume24h_XLM;
					$scope.pie.labels.push(asset.slug);
					$scope.pie.data.push(round(asset.volume24h_XLM, 0));
					$scope.pie.table.push({
						curr: asset.code, 
						domain: asset.domain, 
						volume: asset.volume24h_XLM, 
						pct: 0
					});
				}
			}
		});
		
		$scope.pie.table.sort((a, b) =>{
			return b.volume - a.volume;
		});

		$scope.pie.table.forEach(item => {
			item.pct = item.volume * 100 / $scope.pie.total;
		});
	}
	
	if ($rootScope.stellar_ticker) {
		updatePie();
	}
}]);

