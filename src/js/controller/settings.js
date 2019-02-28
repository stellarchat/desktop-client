/* global myApp */

myApp.controller("SettingsCtrl", [ '$scope', '$rootScope', '$location', 'SettingFactory', 'StellarApi',
  function($scope, $rootScope, $location, SettingFactory, StellarApi) {
    $scope.mode = 'network';
    $scope.isMode = function(mode) {
      return $scope.mode === mode;
    }
    $scope.setMode = function(mode) {
      return $scope.mode = mode;
    }

    $scope.proxy = SettingFactory.getProxy();

    $scope.active_network = SettingFactory.getNetworkType();
    $scope.active_horizon = SettingFactory.getStellarUrl();
    $scope.active_passphrase = SettingFactory.getNetPassphrase();
    $scope.active_coin = SettingFactory.getCoin();
    $scope.network_type = SettingFactory.getNetworkType();
    $scope.network_horizon = SettingFactory.getStellarUrl();
    $scope.network_passphrase = SettingFactory.getNetPassphrase();
    $scope.network_coin = SettingFactory.getCoin();
    $scope.all_networks = SettingFactory.NETWORKS;
    $scope.network_timeout = parseFloat(SettingFactory.getTimeout());
    $scope.network_basefee = parseFloat(SettingFactory.getBasefee());

    $scope.fed_network = SettingFactory.getFedNetwork();
    $scope.fed_ripple  = SettingFactory.getFedRipple();
    $scope.fed_bitcoin = SettingFactory.getFedBitcoin();
    $scope.set = function(type) {
      $scope.network_type = type;
      $scope.network_horizon = SettingFactory.getStellarUrl(type);
      $scope.network = SettingFactory.NETWORKS[type];
      if(type === 'other') {
        $scope.network_passphrase = SettingFactory.getNetPassphrase(type);
        $scope.network_coin = SettingFactory.getCoin(type);
      }
    }
    $scope.save = function(mode) {
      $scope.network_error = "";
      if (mode == 'network') {
        if ($scope.active_network !== $scope.network_type ||
            $scope.active_horizon !== $scope.network_horizon ||
            $scope.active_passphrase !== $scope.network_passphrase ||
            $scope.active_coin !== $scope.network_coin) {
          try {
            SettingFactory.setNetworkType($scope.network_type);
            SettingFactory.setStellarUrl($scope.network_horizon);
            SettingFactory.setNetPassphrase($scope.network_passphrase);
            SettingFactory.setCoin($scope.network_coin);

            $scope.active_network = SettingFactory.getNetworkType()
            $scope.active_horizon = SettingFactory.getStellarUrl()
            $scope.active_passphrase = SettingFactory.getNetPassphrase()
            $scope.active_coin = SettingFactory.getCoin()

            StellarApi.setServer($scope.active_horizon, $scope.active_passphrase, SettingFactory.getAllowHttp());
            StellarApi.logout();
            $rootScope.reset();
            $rootScope.$broadcast('$authUpdate');  // workaround to refresh and get changes into effect.
            location.reload();

          } catch (e) {
            console.error(e);
            $scope.network_error = e.message;
          }
        }
        SettingFactory.setTimeout($scope.network_timeout);
        SettingFactory.setBasefee($scope.network_basefee);
        StellarApi.setTimeout($scope.network_timeout);
        StellarApi.setBasefee($scope.network_basefee);
      }

      if (mode == 'federation') {
        SettingFactory.setFedNetwork($scope.fed_network);
        SettingFactory.setFedRipple($scope.fed_ripple);
        SettingFactory.setFedBitcoin($scope.fed_bitcoin);
      }

      if (mode == 'proxy') {
        SettingFactory.setProxy($scope.proxy);
      }
    };

    $scope.fed_name = "";
    $scope.resolveFed = function() {
      StellarApi.getFedName($scope.fed_network, $rootScope.address, function(err, name){
        if (err) {
          console.error(err);
        } else {
          $scope.fed_name = name;
          $scope.$apply();
        }
      });
    };
    $scope.resolveFed();
  } ]);
