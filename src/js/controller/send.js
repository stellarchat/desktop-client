/* global myApp, StellarSdk, ripple */

myApp.controller("SendCtrl", ['$scope', '$rootScope', '$routeParams', 'StellarApi', 'SettingFactory', 'AuthenticationFactory', '$http',
  function($scope, $rootScope, $routeParams, StellarApi, SettingFactory, AuthenticationFactory, $http) {
    console.log('Send to', $routeParams);

    $scope.MemoNone = StellarSdk.MemoNone;
    $scope.MemoID = StellarSdk.MemoID;
    $scope.MemoText = StellarSdk.MemoText;
    $scope.MemoHash = StellarSdk.MemoHash;
    $scope.MemoReturn = StellarSdk.MemoReturn;  // effectively equals MemoHash, thus skipped.

    $scope.asset = {};
    $scope.input_address;
    $scope.memo;
    $scope.memo_type = 'none';
    $scope.memo_provided;
    $scope.memo_require = false;
    $scope.sending;
    $scope.send_done = false;

    $scope.initSend = function(){
      if (AuthenticationFactory.getContact($routeParams.name)) {
        $scope.input_address = $routeParams.name;
        $scope.resolve();
      }
    }

    $scope.send_error = {
      invalid : false,
      domain : false,
      memo : '',
      message : '',
      hasError : function() {
        return this.invalid || this.domain || this.message;
      }
    };
    $scope.target_domain;
    $scope.real_address;
    $scope.real_not_fund = false;
    $scope.real_accept = "";
    $scope.send = [];
    $scope.extra_fields = [];
    $scope.extra_assets = [];
    $scope.act_loading;
    $scope.is_federation;
    $scope.is_contact;

    $scope.setMemoType = function(type) {
      $scope.memo_type = type;
    };
    $scope.isValidMemo = function() {
      if ($scope.memo) {
        $scope.send_error.memo = StellarApi.isValidMemo($scope.memo_type, $scope.memo);
      } else {
        $scope.send_error.memo = '';
      }
      return !$scope.send_error.memo;
    };
    $scope.pickCoin = function() {
      $scope.asset.code = $rootScope.currentNetwork.coin.code;
      $scope.asset.issuer = undefined;
      $scope.asset.name = $rootScope.currentNetwork.coin.name;
      $scope.asset.logo = $rootScope.currentNetwork.coin.logo;
      $scope.asset.website = $rootScope.currentNetwork.website;
    };
    $scope.pickToken = function(code, issuer) {
      $scope.asset.code = code;
      $scope.asset.issuer = issuer;
      var gateway = $rootScope.gateways.getSourceById(issuer);
      $scope.asset.name = gateway.name;
      $scope.asset.logo = gateway.logo;
      $scope.asset.website = gateway.website;
    };
    $scope.isLine = function(code, issuer) {
      if(code === $rootScope.currentNetwork.coin.code && !issuer) {
        return code == $scope.asset.code;
      } else {
        return code == $scope.asset.code && issuer == $scope.asset.issuer;
      }
    }

    $scope.resetService = function(){
      $scope.send_error.invalid = false;
      $scope.send_error.domain = false;
      $scope.send_error.message = '';
      $scope.memo_require = false;
      $scope.send_done = false;

      $scope.real_address = '';
      $scope.real_not_fund = false;
      $scope.real_accept = "";
      $scope.send = [];
      $scope.extra_fields = [];
      $scope.extra_assets = [];
      $scope.mulipleAsset = false;

      $scope.service_error = "";
      $scope.service_amount = 0;
      $scope.service_currency = "";

      $scope.fed_url = "";
      $scope.quote_id = "";
      $scope.quote_error = "";
    }
    $scope.resolve = function() {
      $scope.resetService();

      if (AuthenticationFactory.getContact($scope.input_address)){
        $scope.is_contact = true;
        var contact = AuthenticationFactory.getContact($scope.input_address);
        $scope.full_address = contact.address;
        $scope.real_address = $scope.full_address;
        if (contact.memo) {
          $scope.memo_type = contact.memotype;
          $scope.memo = contact.memo;
        }
      } else {
        $scope.is_contact = false;
        $scope.full_address = autoCompleteURL($scope.input_address);
      }

      var snapshot = $scope.full_address;
      var i = snapshot.indexOf("*");
      if (i<0) {
        $scope.act_loading = false;
        $scope.is_federation = false;
        $scope.memo_provided = false;
        $scope.real_address = $scope.full_address;
        $scope.send_error.invalid = !StellarApi.isValidAddress(snapshot);
        if (!$scope.send_error.invalid && special_destinations[$scope.real_address]) {
          $scope.memo_type = special_destinations[$scope.real_address].memo_type;
          $scope.memo_require = true;
        }
        $scope.resolveAccountInfo();
      } else {
        $scope.is_federation = true;
        $scope.resolveFederation(snapshot);
      }
    };

    $scope.resolveFederation = function(snapshot) {
      console.debug('resolve', snapshot);
      var i = snapshot.indexOf("*");
      var prestr = snapshot.substring(0, i);
      var domain = snapshot.substring(i+1);

      $scope.target_domain = domain;
      $scope.act_loading = true;

      StellarSdk.StellarTomlResolver.resolve(domain).then(function(stellarToml) {
        $scope.fed_url = stellarToml.FEDERATION_SERVER;
        var server = new StellarSdk.FederationServer(stellarToml.FEDERATION_SERVER, domain, {});
        server.resolveAddress(prestr).then(function(data){
          console.debug(prestr, data);
          $scope.act_loading = false;
          $scope.send_error.message = '';
          $scope.real_address = data.account_id;

          if (data.memo) {
            $scope.memo = data.memo.toString();
            $scope.memo_type = data.memo_type;
            $scope.memo_provided = true;
          } else {
            $scope.memo = '';
            $scope.memo_provided = false;
          }

          if (data.error) {
            $scope.send_error.message = data.detail || data.error;
          } else {
            if (data.extra_fields) {
              $scope.quote_id = data.account_id;
              $scope.extra_fields = data.extra_fields;
              $scope.extra_assets = data.assets;
              $scope.mulipleAsset = $scope.extra_assets.length > 1;
              $scope.service_currency = $scope.extra_assets[0].code + "." + $scope.extra_assets[0].issuer;
            } else {
              $scope.resolveAccountInfo();
            }
          }

          $scope.$apply();
        }).catch(function(err){
          if (snapshot !== $scope.full_address) {
            return;
          }
          console.debug(prestr, err);
          if (typeof err == "string") {
            $scope.send_error.message = err;
          } else {
            $scope.send_error.message = err.detail || err.message || err;
          }
          $scope.act_loading = false;
          $scope.$apply();
        });

      }).catch(function(err){
        console.error(err);
        if (snapshot !== $scope.full_address) {
          return;
        }
        $scope.send_error.domain = true;
        $scope.act_loading = false;
        $scope.$apply();
      });

    };

    $scope.$watch('service_currency', function () { $scope.quote(); }, true);
    $scope.$watch('service_amount',   function () { $scope.quote(); }, true);
    $scope.$watch('extra_fields',     function () { $scope.quote(); }, true);

    $scope.quote_data;
    $scope.quote = function() {
      $scope.asset = {};
      if (!$scope.serviceForm || !$scope.serviceForm.$valid || !$scope.service_amount) {
        return;
      }

      var arr = $scope.service_currency.split(".");
      var data = {
        type: "quote",
        amount       : $scope.service_amount,
        asset_code   : arr[0],
        asset_issuer : arr[1],
        account_id   : $scope.quote_id,
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
        $scope.real_address = res.data.account_id;

        var gateway = $rootScope.gateways.getSourceById($scope.asset.issuer);
        $scope.asset.logo = gateway.logo;
        $scope.asset.name = gateway.name;

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

    $scope.resolveAccountInfo = function() {
      if (!$scope.real_address || !StellarApi.isValidAddress($scope.real_address)) {
        return;
      }
      console.debug('resolve ' + $scope.real_address);
      $scope.act_loading = true;
      StellarApi.getInfo($scope.real_address, function(err, data) {
        $scope.act_loading = false;
        if (err) {
          if (err instanceof StellarSdk.NotFoundError) {
            $scope.real_not_fund = true;
            $scope.send.unshift({
              code   : $rootScope.currentNetwork.coin.code,
              issuer : '',
              name   : $rootScope.currentNetwork.coin.name,
              logo   : $rootScope.currentNetwork.coin.logo
            });

            if ($scope.asset.code !== $rootScope.currentNetwork.coin.code) {
              $scope.pickCoin();
            }
          } else {
            $scope.send_error.message = StellarApi.getErrMsg(err);
            console.error('resolveAccountInfo', err);
          }
        } else {
          var accept = [];
          var code, issuer, name, logo;
          data.balances.forEach(function(line){
            if (line.asset_type == 'native') {
              accept.push($rootScope.currentNetwork.coin.code);
              code = $rootScope.currentNetwork.coin.code;
              issuer = '';
              name = $rootScope.currentNetwork.coin.name;
              logo = $rootScope.currentNetwork.coin.logo;
            } else {
              if (accept.indexOf(line.asset_code) < 0) {
                accept.push(line.asset_code);
              }
              code = line.asset_code;
              issuer = line.asset_issuer;
              var gateway = $rootScope.gateways.getSourceById(issuer);
              name = gateway.name;
              logo = gateway.logo;
            }

            $scope.send.unshift({
              code   : code,
              issuer : issuer,
              name   : name,
              logo   : logo
            });
          });
          $scope.real_accept = accept.join(', ');
        }
        $scope.$apply();
      });
    };

    $scope.send_asset = function() {
      $scope.sending = true;
      $scope.send_done = false;
      $scope.send_error.message = '';

      StellarApi.send($scope.real_address, $scope.asset.code, $scope.asset.issuer,
        $scope.asset.amount, $scope.memo_type, $scope.memo, function(err, hash){
          $scope.sending = false;

          if (err) {
            $scope.send_error.message = StellarApi.getErrMsg(err);
          } else {
            $scope.service_amount = 0;
            $scope.asset.amount = 0;
            $scope.send_done = true;
          }
          $rootScope.$apply();
        });
    };

    function autoCompleteURL(address) {
      if (address.indexOf("*") >=0) {
        return address;
      }
      if (address.indexOf("~") == 0) {
        return address.substring(1) + "*" + SettingFactory.getFedNetwork();
      }
      if (ripple.UInt160.is_valid(address)) {
        return address + "*" + SettingFactory.getFedRipple();
      }
      if (!isNaN(ripple.Base.decode_check([0, 5], address, 'bitcoin'))) {
        return address + "*" + SettingFactory.getFedBitcoin();
      }
      return address;
    }

      // memo_type is either of: MemoNone: "none", MemoID = "id", MemoText = "text", MemoHash = "hash"
    var special_destinations = {
      'GCLDH6L6FBLTD3H3B23D6TIFVVTFBLZMNBC3ZOI6FGI5GPQROL4FOXIN' : {memo_type: 'id',   name: 'RippleFox'},
      'GA5XIGA5C7QTPTWXQHY6MCJRMTRZDOSHR6EFIBNDQTCQHG262N4GGKTM' : {memo_type: 'id',   name: 'Kraken'},
      'GCGNWKCJ3KHRLPM3TM6N7D3W5YKDJFL6A2YCXFXNMRTZ4Q66MEMZ6FI2' : {memo_type: 'id',   name: 'Poloniex'},
      'GB6YPGW5JFMMP2QB2USQ33EUWTXVL4ZT5ITUNCY3YKVWOJPP57CANOF3' : {memo_type: 'text', name: 'Bittrex'},
      'GB7GRJ5DTE3AA2TCVHQS2LAD3D7NFG7YLTOEWEBVRNUUI2Q3TJ5UQIFM' : {memo_type: 'id',   name: 'BTC38'},
      'GDZCEWJ5TVXUTFH6V5CVDQDE43KRXYUFRHKI7X64EWMVOVYYZJFWIFQ2' : {memo_type: 'id',   name: 'Aex.com'},
      'GBV4ZDEPNQ2FKSPKGJP2YKDAIZWQ2XKRQD4V4ACH3TCTFY6KPY3OAVS7' : {memo_type: 'id',   name: 'Changelly'},
      'GAHK7EEG2WWHVKDNT4CEQFZGKF2LGDSW2IVM4S5DP42RBW3K6BTODB4A' : {memo_type: 'text', name: 'Binance'},
      'GDP34WXZRCSHVUDQLGKJKOBMS5LOQPHCIADZU5POEF3IICZ7XNQJ65Y6' : {memo_type: 'text', name: 'Huobi'},
      'GBGII2C7M4TOEC2MVAZYG3TRFM3ATCCEWANSN4Q3AHEX3NRKXJCVZDEV' : {memo_type: 'id',   name: 'OKEX'},
    }

    $scope.initSend();

  } ]);

