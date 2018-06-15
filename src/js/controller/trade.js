/* global _, myApp, round, StellarSdk */

myApp.controller("TradeCtrl", [ '$scope', '$rootScope', 'StellarApi', 'StellarOrderbook', 'SettingFactory',
  function($scope, $rootScope, StellarApi, StellarOrderbook, SettingFactory) {
    $scope.offers = {
      origin : null,
      ask : {},
      bid : {},
      all : {},
      update : function(data) {
        this.origin = data;
        this.all = {};
        this.ask = {};
        this.bid = {};
        for (var i=0; i<data.length; i++) {
          var offer = data[i];
          var buy_code = offer.buying.asset_type == 'native' ? $rootScope.currentNetwork.coin.code : offer.buying.asset_code;
          var buy_issuer = offer.buying.asset_type == 'native' ? '' : offer.buying.asset_issuer;
          var sell_code = offer.selling.asset_type == 'native' ? $rootScope.currentNetwork.coin.code : offer.selling.asset_code;
          var sell_issuer = offer.selling.asset_type == 'native' ? '' : offer.selling.asset_issuer;

          this.all[offer.id] = {
            id : offer.id,
            buy_code   : buy_code,
            buy_issuer : buy_issuer,
            sell_code  : sell_code,
            sell_issuer : sell_issuer,
            amount : parseFloat(offer.amount),
            price  : parseFloat(offer.price)
          };

          if (sameAsset(sell_code, sell_issuer, $scope.base_code, $scope.base_issuer)
						&& sameAsset(buy_code, buy_issuer, $scope.counter_code, $scope.counter_issuer)) {
            this.ask[offer.id] = {
              id : offer.id,
              amount : parseFloat(offer.amount),
              price  : parseFloat(offer.price),
              volume : offer.amount * offer.price
            };
          }
          if (sameAsset(sell_code, sell_issuer, $scope.counter_code, $scope.counter_issuer)
						&& sameAsset(buy_code, buy_issuer, $scope.base_code, $scope.base_issuer) ) {
            this.bid[offer.id] = {
              id : offer.id,
              amount : offer.amount * offer.price,
              price  : 1 / offer.price,
              volume : parseFloat(offer.amount)
            };
          }
        }
      }
    }

    var tradepair = SettingFactory.getTradepair();

    if (validPair(tradepair.base_code, tradepair.base_issuer)) {
      $scope.base_code   = tradepair.base_code;
      $scope.base_issuer = tradepair.base_issuer;
    } else {
      $scope.base_code   = $rootScope.currentNetwork.coin.code;
      $scope.base_issuer = null;
    }
    if (validPair(tradepair.counter_code, tradepair.counter_issuer)) {
      $scope.counter_code   = tradepair.counter_code;
      $scope.counter_issuer = tradepair.counter_issuer;
    } else {
      $scope.counter_code   = $rootScope.currentNetwork.coin.code;
      $scope.counter_issuer = null;
    }
    $scope.savePair = function() {
      SettingFactory.setTradepair($scope.base_code, $scope.base_issuer, $scope.counter_code, $scope.counter_issuer);
    }

    $scope.base    = $rootScope.gateways.getSourceById($scope.base_issuer);
    $scope.counter = $rootScope.gateways.getSourceById($scope.counter_issuer);

    $scope.precise = 2;
    $scope.price_precise = 4;
    $scope.value_precise = 2;
    $scope.precise_jutify = function() {
      if ($scope.base_code == 'BTC') {
        $scope.precise = 4;
      } else {
        $scope.precise = 2;
      }

      if ($scope.counter_code == 'XLM') {
        $scope.price_precise = 3;
        $scope.value_precise = 3;
      } else if (['BTC', 'ETH'].indexOf($scope.counter_code) >= 0) {
        $scope.price_precise = 7;
        $scope.value_precise = 4;
      } else {
        if ($scope.base_code == 'BTC') {
          $scope.price_precise = 2;
        } else {
          $scope.price_precise = 4;
        }
        $scope.value_precise = 2;
      }
    }
    $scope.precise_jutify();

    $scope.book = {
      origin : null,
      stream : null,
      asks : [],
      bids : [],
      clean : function() {
        this.origin = null;
        this.stream = null;
        this.asks = [];
        this.bids = [];
      },
      update : function(data) {
        this.origin = data;
        this.asks = JSON.parse(JSON.stringify(data.asks));
        this.bids = JSON.parse(JSON.stringify(data.bids));
        this.process();
      },
      streamUpdate : function(data) {
        this.stream = data;
        this.asks = JSON.parse(JSON.stringify(data.asks));
        this.bids = JSON.parse(JSON.stringify(data.bids));
        this.process();
      },
      process : function() {
        var displayNo = 15;
        if (this.asks.length > displayNo) {
          this.asks = this.asks.slice(0, displayNo);
        }
        if (this.bids.length > displayNo) {
          this.bids = this.bids.slice(0, displayNo);
        }
        var depth = 0;
        for (var i=0; i<this.asks.length; i++) {
          this.asks[i].volumn = this.asks[i].amount * this.asks[i].price;
          depth = depth + this.asks[i].volumn;
          this.asks[i].depth = depth;
        }
        depth = 0;
        for (let i=0; i<this.bids.length; i++) {
          this.bids[i].volumn = this.bids[i].amount;
          this.bids[i].amount = this.bids[i].volumn / this.bids[i].price;
          depth = depth + parseFloat(this.bids[i].volumn);
          this.bids[i].depth = depth;
        }
        var max_depth = 0;
        if (this.asks.length>0) {
          max_depth = this.asks[this.asks.length-1].depth;
        }
        if (this.bids.length>0 && this.bids[this.bids.length-1].depth > max_depth) {
          max_depth = this.bids[this.bids.length-1].depth;
        }
        for (let i=0; i<this.asks.length; i++) {
          this.asks[i].pct = round(this.asks[i].depth / max_depth * 100, 2);
        }
        for (let i=0; i<this.bids.length; i++) {
          this.bids[i].pct = round(this.bids[i].depth / max_depth * 100, 2);
        }
      }
    }

    $scope.refreshingBook = false;
    $scope.refreshBook = function() {
      var base = {code: $scope.base_code, issuer: $scope.base_issuer};
      var counter = {code: $scope.counter_code, issuer: $scope.counter_issuer};
      $scope.refreshingBook = true;
      StellarApi.queryBook(base, counter, function(err, data) {
        if (!err) {
          console.debug(!$scope.book.origin || !_.isEqual($scope.book.origin.asks, data.asks) || !_.isEqual($scope.book.origin.bids, data.bids) ? 'book changed': 'book unchange');
          if(!$scope.book.origin || !_.isEqual($scope.book.origin.asks, data.asks) || !_.isEqual($scope.book.origin.bids, data.bids)) {
            $scope.book.update(data);
            console.log($scope.book);
          }
        }
        $scope.refreshingBook = false;
        $scope.$apply();
      });
    }
    //$scope.refreshBook();

    $scope.listenOrderbook = function() {
      var base = {code: $scope.base_code, issuer: $scope.base_issuer};
      var counter = {code: $scope.counter_code, issuer: $scope.counter_issuer};

      StellarApi.closeOrderbook();
      StellarApi.listenOrderbook(base, counter, function(res) {
        if(!_.isEqual($scope.book.stream, res)) {
          $scope.book.streamUpdate(res);
          console.warn('book stream', res);
          $scope.$apply();
        }
      });
    };
    $scope.listenOrderbook();

    $scope.refreshingOffer = false;
    $scope.refreshOffer = function() {
      $scope.refreshingOffer = true;
      StellarApi.queryOffer(function(err, offers){
        if (!err) {
          $scope.offers.update(offers);
          console.log($scope.offers);
        }
        $scope.refreshingOffer = false;
        $scope.$apply();
      });
    }
    $scope.refreshOffer();

    $scope.buying = false;
    $scope.buy_ok;
    $scope.buy_fail;
    $scope.selling = false;
    $scope.sell_ok;
    $scope.sell_fail;

    $scope.buy_price;
    $scope.buy_amount;
    $scope.buy_volume;
    $scope.sell_price;
    $scope.sell_amount;
    $scope.sell_volume;
    $scope.calculate = function(name) {
      switch(name) {
      case 'buy_price':
        $scope.buy_volume = round($scope.buy_price * $scope.buy_amount, 8);
        break;
      case 'buy_amount':
        $scope.buy_volume = round($scope.buy_price * $scope.buy_amount, 8);
        break;
      case 'buy_volume':
        $scope.buy_amount = round($scope.buy_volume / $scope.buy_price, 8);
        break;
      case 'sell_price':
        $scope.sell_volume = round($scope.sell_price * $scope.sell_amount, 8);
        break;
      case 'sell_amount':
        $scope.sell_volume = round($scope.sell_price * $scope.sell_amount, 8);
        break;
      case 'sell_volume':
        $scope.sell_amount = round($scope.sell_volume / $scope.sell_price, 8);
        break;
      }
    }
    $scope.pickPrice = function(src, price) {
      if (src == 'bid') {
        $scope.sell_price = price;
      } else {
        $scope.buy_price = price;
      }
    }

    $scope.offer = function(type) {
      $scope[type + 'ing'] = true;
      $scope[type + '_ok'] = false;
      $scope[type + '_fail'] = "";
      var option = {
        type : type,
        currency : $scope.base_code,
        issuer   : $scope.base_issuer,
        base        : $scope.counter_code,
        base_issuer : $scope.counter_issuer
      };
      if (type == 'buy') {
        option.amount = $scope.buy_amount;
        option.price  = $scope.buy_price;
      } else {
        option.amount = $scope.sell_amount;
        option.price  = $scope.sell_price;
      }
      StellarApi.offer(option, function(err, hash) {
        $scope[type + 'ing'] = false;
        if (err) {
          $scope[type + '_fail'] = StellarApi.getErrMsg(err);
        } else {
          $scope[type + '_ok'] = true;
          $scope[type + '_amount'] = "";
          $scope[type + '_price'] = "";
          $scope[type + '_volume'] = "";
        }
        $scope.$apply();
        //$scope.refreshBook();
        $scope.refreshOffer();
      });
    }

    $scope.cancel = function(offer_id, type) {
      var offer = {id: offer_id};

      $scope.offers.all[offer_id].canceling = true;
      if (type === 'bid') {
        $scope.offers.bid[offer_id].canceling = true;
        offer.price = $scope.offers.bid[offer_id].price;
        offer.selling = getAsset($scope.counter_code, $scope.counter_issuer);
        offer.buying  = getAsset($scope.base_code, $scope.base_issuer);
      } else if (type === 'ask') {
        $scope.offers.ask[offer_id].canceling = true;
        offer.price = $scope.offers.ask[offer_id].price;
        offer.selling = getAsset($scope.base_code, $scope.base_issuer);
        offer.buying  = getAsset($scope.counter_code, $scope.counter_issuer);
      } else {
        // type === 'all'
        if ($scope.offers.bid[offer_id]) { $scope.offers.bid[offer_id].canceling = true; }
        if ($scope.offers.ask[offer_id]) { $scope.offers.ask[offer_id].canceling = true; }
        offer.price = $scope.offers.all[offer_id].price;
        offer.selling = getAsset($scope.offers.all[offer_id].sell_code, $scope.offers.all[offer_id].sell_issuer);
        offer.buying  = getAsset($scope.offers.all[offer_id].buy_code, $scope.offers.all[offer_id].buy_issuer);
      }
      $scope.cancel_error = "";
      StellarApi.cancel(offer, function(err, hash){
        if (err) {
          $scope.cancel_error = StellarApi.getErrMsg(err);
        }
        $scope.refreshOffer();
      });
    }

    $scope.show_pair = false;
    $scope.choosePair = function() {
      $scope.show_pair = !$scope.show_pair;
      if (!$scope.show_pair) {
        $scope.book.clean();
        $scope.listenOrderbook();
        $scope.refreshOffer();
        $scope.savePair();
      }
    }
    $scope.pick = function(type, code, issuer) {
      if (type == 'base') {
        $scope.base_code = code;
        $scope.base_issuer = issuer;
        $scope.base = $rootScope.gateways.getSourceById($scope.base_issuer);
      } else {
        $scope.counter_code = code;
        $scope.counter_issuer = issuer;
        $scope.counter = $rootScope.gateways.getSourceById($scope.counter_issuer);
      }
      $scope.precise_jutify();
    }
    $scope.flip = function() {
      var old_base_code = $scope.base_code;
      var old_base_issuer = $scope.base_issuer;
      $scope.pick('base', $scope.counter_code, $scope.counter_issuer);
      $scope.pick('counter', old_base_code, old_base_issuer);
      if (!$scope.show_pair) {
        $scope.book.clean();
        $scope.listenOrderbook();
        $scope.refreshOffer();
        $scope.savePair();
      }
    }

    $scope.isBase = function(code, issue) {
      return sameAsset(code, issue, $scope.base_code, $scope.base_issuer);
    }
    $scope.isCounter = function(code, issue) {
      return sameAsset(code, issue, $scope.counter_code, $scope.counter_issuer);
    }

    function sameAsset(code, issuer, code2, issuer2) {
      if (code == $rootScope.currentNetwork.coin.code) {
        return code == code2;
      } else {
        return code == code2 && issuer == issuer2;
      }
    }

    function getAsset(code, issuer) {
      if (typeof code == 'object') {
        issuer = code.issuer;
        code = code.code;
      }
      return code == $rootScope.currentNetwork.coin.code ? new StellarSdk.Asset.native() : new StellarSdk.Asset(code, issuer);
    }

    function validPair(code, issuer) {
      if (code == $rootScope.currentNetwork.coin.code) {
        return true;
      }
      try {
        new StellarSdk.Asset(code, issuer);
        return true;
      } catch(e) {
        return false;
      }
    }
  } ]);
