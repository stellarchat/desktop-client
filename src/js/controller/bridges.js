/* global myApp, StellarSdk */

myApp.controller("BridgesCtrl", [ '$scope', '$rootScope', '$location', 'SettingFactory', 'AnchorFactory', 'StellarApi', '$http',
  function($scope, $rootScope, $location, SettingFactory, AnchorFactory, StellarApi, $http) {
    $scope.bridges = {};
    $scope.anchor;
    $scope.anchor_name = SettingFactory.getBridgeService();
    $scope.anchor_logo;
    $scope.anchor_withdraw;
    $scope.service;
    $scope.init = function(){
      var anchors = $rootScope.gateways.getAllSources();
      for (var name in anchors) {
        var anchor = anchors[name];
        var parsed =  AnchorFactory.getAnchor(anchor.name);
        //var deposit_api_url = AnchorFactory.
        if (anchor.deposit_service || parsed && parsed.deposit_api){
          $scope.bridges[name] = anchor;
        }
        if (name == $scope.anchor_name) {
          $scope.anchor = anchor;
          $scope.anchor_logo = anchor.logo;
          $scope.anchor_withdraw = anchor.withdraw_info;
          if (anchor.service) {
            $scope.service = anchor.service[0].name;
          }
          if (SettingFactory.getLang() == 'cn') {
            $scope.anchor_withdraw = anchor.withdraw_info_cn;
          }
        }
      }
    };
    $scope.init();

    $scope.deposit = {};
    $scope.resolve = function(){
      $scope.fed_url = "";
      $scope.fed = undefined;
      StellarSdk.StellarTomlResolver.resolve($scope.anchor_name).then(function(stellarToml) {
        console.debug(stellarToml);
        var currencies = stellarToml.CURRENCIES;
        var deposit_api = stellarToml.DEPOSIT_SERVER;
        $scope.fed_url = stellarToml.FEDERATION_SERVER;
        $scope.fed = new StellarSdk.FederationServer(stellarToml.FEDERATION_SERVER, $scope.anchor_name, {});
        if (!deposit_api) { return; }
        currencies.forEach(function(asset){
          if (asset.host && asset.host.indexOf($scope.anchor_name) < 0) {
            // ignore the asset not issued by the domain
          } else {
            $scope.deposit[asset.code] = {
              code   : asset.code,
              issuer : asset.issuer,
              api    : deposit_api
            };
            if ($scope.hasLine(asset.code, asset.issuer)) {
              $scope.resolveDeposit(deposit_api, asset.code);
            } else {
              $scope.deposit[asset.code].no_trust = true;
            }
          }
        });
        if ($scope.service) {
          $scope.resolveService();
        }
        $scope.$apply();
      }).catch(function(err){
        console.error(err);
      });
    };
    $scope.resolve();

    $scope.resolveDeposit = function(api, code) {
      var url = api + "?account=" + $rootScope.address + "&asset_code=" + code;
      console.debug('resolve ' + url);
      $http({
        method: 'GET',
        url: url
      }).then(function(res) {
        $scope.deposit[code].how = res.data.how;
        $scope.deposit[code].extra_info = res.data.extra_info;
        if (typeof $scope.deposit[code].extra_info !== "object") {
          $scope.deposit[code].extra_info = {
            "Extra Info" : $scope.deposit[code].extra_info
          }
        }
      }).catch(function(err) {
        if (err.data && err.data.error) {
          $scope.deposit[code].how = err.data.error;
        }
        console.error(err);
      });
    }

    $scope.changeBridge = function(name) {
      SettingFactory.setBridgeService(name);
      $scope.anchor = $scope.bridges[name];
      $scope.anchor_name = $scope.anchor.name;
      $scope.anchor_logo = $scope.anchor.logo;
      $scope.anchor_withdraw = $scope.anchor.withdraw_info;
      $scope.resetService();
      if ($scope.anchor.service) {
        $scope.service = $scope.anchor.service[0].name;
      }
      if (SettingFactory.getLang() == 'cn') {
        $scope.anchor_withdraw = $scope.bridges[name].withdraw_info_cn;
      }
      $scope.deposit = {};
      $scope.resolve();
    };

    $scope.hasLine = function(code, issuer) {
      if (!$rootScope.lines[code] || !$rootScope.lines[code][issuer]) {
        return false;
      }
      return $rootScope.lines[code][issuer].limit > 0;
    };

    // a special case for CNY.ripplefox anchor
    $scope.isActive = function(type) {
      return $scope.service == type;
    }
    $scope.changeService = function(type) {
      if ($scope.service !== type) {
        $scope.service = type;
        $scope.resolveService();
      }
    }

    $scope.resetService = function(){
      $scope.account_id = "";
      $scope.extra_fields = [];
      $scope.extra_assets = [];
      $scope.mulipleAsset = false;

      $scope.service_error = "";
      $scope.service_amount = 0;
      $scope.service_currency = "";
      $scope.send = [];
      $scope.asset = {};
      $scope.quote_error = "";
      $scope.send_done = false;
      $scope.send_error = '';
    }

    $scope.resolveService = function() {
      console.debug('resolve', $scope.service);
      var prestr = $scope.service;
      $scope.resetService();
      $scope.service_loading = true;

      $scope.fed.resolveAddress(prestr).then(function(data){
        console.debug(prestr, data);
        if (data.error) {
          $scope.service_error = data.detail || data.error;
        } else {
          $scope.account_id = data.account_id;
          $scope.extra_fields = data.extra_fields;
          $scope.extra_assets = data.assets;
          $scope.mulipleAsset = $scope.extra_assets.length > 1;
          $scope.service_currency = $scope.extra_assets[0].code + "." + $scope.extra_assets[0].issuer;

          if (data.memo) {
            $scope.memo = data.memo.toString();
            $scope.memo_type = data.memo_type;  // either of: MemoID = "id", MemoText = "text", MemoHash = "hash"
            $scope.memo_provided = true;
          } else {
            $scope.memo = '';
            $scope.memo_provided = false;
          }
        }
        $scope.service_loading = false;
        $scope.$apply();
      }).catch(function(err){
        if (prestr !== $scope.service) {
          return;
        }
        $scope.real_address = '';
        if (typeof err == "string") {
          $scope.service_error = err;
        } else {
          $scope.service_error = err.detail || err.message;
        }
        $scope.service_loading = false;
        $scope.$apply();
      });
    };

    $scope.$watch('service_currency', function () {
      $scope.quote();
    }, true);

    $scope.$watch('service_amount', function () {
      $scope.quote();
    }, true);

    $scope.$watch('extra_fields', function () {
      $scope.quote();
    }, true);

    $scope.quote_data;
    $scope.quote = function() {
      $scope.asset = {};
      if (!$scope.serviceForm.$valid || !$scope.service_amount) {
        return;
      }

      var arr = $scope.service_currency.split(".");
      var data = {
        type: "quote",
        amount       : $scope.service_amount,
        asset_code   : arr[0],
        asset_issuer : arr[1],
        account_id   : $scope.account_id,
        address      : $rootScope.address
      };
      $scope.extra_fields.forEach(function(field){
        if (field.name) {
          data[field.name] = field.value;
        }
      });

      var snapshot = JSON.stringify(data);
      $scope.quote_data = snapshot;

      $scope.quote_error = "";
      $scope.quote_loading = true;
      $http({
        method: 'GET',
        url: $scope.fed_url,
        params: data
      }).then(function(res) {
        if (snapshot !== $scope.quote_data) {
          return;
        }
        $scope.send = res.data.send;
        $scope.asset = $scope.send[0];
        $scope.memo        = res.data.memo;
        $scope.memo_type   = res.data.memo_type;
        $scope.destination = res.data.account_id;

        var gateway = $rootScope.gateways.getSourceById($scope.asset.issuer);
        $scope.asset.logo = gateway.logo;
        $scope.asset.issuer_name = gateway.name;

        $scope.quote_loading = false;
        console.debug(res.data);
      }).catch(function(err) {
        if (snapshot !== $scope.quote_data) {
          return;
        }
        console.debug(err);
        if (typeof err == "string") {
          $scope.quote_error = err;
        } else {
          if (err.data && err.data.detail) {
            $scope.quote_error = err.data.detail;
          } else {
            $scope.quote_error = err.message;
          }
        }
        $scope.quote_loading = false;
      });
    };

    $scope.send_asset = function() {
      $scope.sending = true;
      $scope.send_done = false;
      $scope.send_error = '';

      StellarApi.send($scope.destination, $scope.asset.code, $scope.asset.issuer,
        $scope.asset.amount, $scope.memo_type, $scope.memo, function(err, hash){
          $scope.sending = false;
          if (err) {
            $scope.send_error = StellarApi.getErrMsg(err);
          } else {
            $scope.service_amount = 0;
            $scope.send_done = true;
          }
          $rootScope.$apply();
        });
    };

    $scope.addTrust = function(code, issuer) {
      $scope.deposit[code].trust_error = "";
      $scope.deposit[code].changing = true;
      StellarApi.changeTrust(code, issuer, "100000000000", function(err, data){
        $scope.deposit[code].changing = false;
        if (err) {
          $scope.deposit[code].trust_error = StellarApi.getErrMsg(err);
        }
        $rootScope.$apply();
      });
    };

    $scope.$on("balanceChange", function() {
      for (var code in $scope.deposit) {
        var asset = $scope.deposit[code];
        if ($scope.deposit[asset.code].no_trust && $scope.hasLine(asset.code, asset.issuer)) {
          $scope.deposit[asset.code].no_trust = false;
          $scope.resolveDeposit(asset.api, asset.code);
        }
      }
    });
  } ]);
