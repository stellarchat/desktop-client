myApp.controller("BridgesCtrl", [ '$scope', '$rootScope', '$location', 'SettingFactory', 'StellarApi',
                                   function($scope, $rootScope, $location, SettingFactory, StellarApi) {
	
	StellarSdk.StellarTomlResolver.resolve('naobtc.com').then(function(stellarToml) {
		 console.debug(stellarToml);
	}).catch(function(err){
		console.error(err); 
	});
	
	$scope.bridges = {};
	$scope.anchor = SettingFactory.getBridgeService();
	$scope.anchor_logo;
	$scope.init = function(){
		var anchors = $rootScope.gateways.getAllSources();
		for (var name in anchors) {
			var anchor = anchors[name];
			if (anchor.deposit_api){
				$scope.bridges[name] = anchor;
			}
			if (name == $scope.anchor) {
				$scope.anchor_logo = anchor.logo;
			}
		}
	};
	$scope.init();
	
	$scope.changeBridge = function(name) {
	    SettingFactory.setBridgeService(name);
	    $scope.anchor = name;
	    $scope.anchor_logo = $scope.bridges[name].logo;
	};
	
} ]);
