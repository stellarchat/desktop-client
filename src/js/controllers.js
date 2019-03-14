/* global myApp, round */

myApp.controller("HeaderCtrl", ['$scope', '$rootScope', '$location', 'AuthenticationFactory', 'SettingFactory', 'StellarApi',
  function($scope, $rootScope, $location, AuthenticationFactory, SettingFactory, StellarApi) {

    $scope.isActive = function(route) {
      return route === $location.path();
    }

    $scope.logout = function () {
      AuthenticationFactory.logout();
      $location.path("/login");
      StellarApi.logout();
      $rootScope.reset();
    }
  }
]);

myApp.controller("FooterCtrl", [ '$scope', '$translate', 'SettingFactory', 'RemoteFactory',
  function($scope, $translate, SettingFactory, RemoteFactory) {
    $scope.changeLanguage = function (key) {
      $translate.use(key);
      SettingFactory.setLang(key);
    };

    $scope.version = '4.4';
    $scope.new_version = false;
    $scope.diff = false;
    RemoteFactory.getNwjsClientVersion(function(err, data){
      if (err) {
        console.warn('Can not get the version from github.', err);
      } else {
        if (data && data.version) {
          $scope.new_version = data.version;
          $scope.diff = ($scope.version !== $scope.new_version);
        }
      }
    });

  }]);

myApp.controller("HomeCtrl", ['$scope', '$rootScope', 'RemoteFactory',
  function($scope, $rootScope, RemoteFactory) {

    RemoteFactory.getStellarTicker(function(err, ticker) {
      if (ticker) {
        $rootScope.stellar_ticker = ticker;
        console.log(ticker);
        update();
      }
    });

    $scope.data = [];
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
    function update() {
      $scope.pie.reset();
      $scope.data = [];

      $scope.pie.total = 0;
      $rootScope.stellar_ticker.assets.forEach(function(asset){
        if (asset.code == $rootScope.currentNetwork.coin.code) {
          //$scope.pie.total = asset.volume24h_XLM;
        } else {
          if (asset.volume24h_XLM) {
            $scope.pie.total += asset.volume24h_XLM;
            //$scope.pie.labels.push(asset.slug);
            //$scope.pie.data.push(round(asset.volume24h_XLM, 0));
            $scope.data.push({
              slug: asset.slug,
              curr: asset.code,
              domain: asset.domain,
              volume: asset.volume24h_XLM,
              pct: 0
            });
          }
        }
      });

      $scope.data.sort((a, b) =>{
        return b.volume - a.volume;
      });

      $scope.data.forEach(item => {
        item.pct = item.volume * 100 / $scope.pie.total;
      });

      var other_volume = $scope.pie.total;
      for (var i=0; i<$scope.data.length; i++) {
        var asset = $scope.data[i];
        other_volume = other_volume - asset.volume;
        if (other_volume > $scope.pie.total * 0.1) {
          $scope.pie.labels.push(asset.slug);
          $scope.pie.data.push(round(asset.volume, 0));
        } else {
          $scope.pie.labels.push('Others');
          $scope.pie.data.push(round(other_volume, 0));
          break;
        }
      }
    }

    if ($rootScope.stellar_ticker) {
      update();
    }
  }]);

