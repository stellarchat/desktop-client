/* global myApp */

myApp.controller("FooterCtrl", [ '$scope', '$translate', 'SettingFactory', 'RemoteFactory',
                        function( $scope ,  $translate ,  SettingFactory ,  RemoteFactory ) {
    $scope.changeLanguage = function (key) {
      $translate.use(key);
      SettingFactory.setLang(key);
    };

    $scope.version = '5.0.0-alpha';
    $scope.new_version = false;
    $scope.diff = false;
    $scope.isFIC = SettingFactory.getCurrentNetwork().coin.code === 'FIC';
    RemoteFactory.getClientVersion(function(err, data){
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
