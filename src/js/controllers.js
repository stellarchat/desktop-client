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

		$scope.pie.table.forEach(item => {
			item.pct = item.volume * 100 / $scope.pie.total;
		});
		/*
		$rootScope.stellar_ticker.forEach(function(pair){
			var curr = pair.Name.split('_');
			var base = curr[0];
			var counter = curr[1];
			
			if (base == 'XLM' && pair.Base_Volume > 0) {
				$scope.pie.labels.push(counter);
				$scope.pie.data.push(round(pair.Base_Volume, 0));
				$scope.pie.table.push({curr: counter, volume: pair.Base_Volume, pct: 0});
				$scope.pie.total +=  round(pair.Base_Volume, 0);
			}
			if (counter == 'XLM' && pair.Counter_Volume > 0) {
				$scope.pie.labels.push(base);
				$scope.pie.data.push(round(pair.Counter_Volume, 0));
				$scope.pie.table.push({curr: base, volume: pair.Counter_Volume, pct: 0});
				$scope.pie.total +=  round(pair.Counter_Volume, 0);
			}
		});
		$scope.pie.table.forEach(function(line) {
			line.pct = 100 * line.volume / $scope.pie.total; 
		});
		*/
	}
	
	if ($rootScope.stellar_ticker) {
		updatePie();
	}
}]);

