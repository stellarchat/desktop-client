/* global _, myApp, round, StellarSdk */

myApp.factory('StellarApi', ['$rootScope', 'StellarHistory', 'StellarOrderbook', 'StellarPath',
  function($rootScope, history, orderbook, path) {

    let _address;
    let _balances = {};
    let _closeAccountStream;  // function that closes a stream.
    let _closeTxStream;  // function that closes a stream.
    let _secret;
    let _subentry = 0;
    let _server;
    const _seq = {
      snapshot : "",
      time : new Date()
    };

    const getAsset = (code, issuer) => {
      if (typeof code == 'object') {
        issuer = code.issuer;
        code = code.code;
      }
      return code == $rootScope.currentNetwork.coin.code ? new StellarSdk.Asset.native() : new StellarSdk.Asset(code, issuer);
    }


    return {

      _updateSeq: function(account) {
        var now = new Date();
        // In the same ledger
        if (now - _seq.time < 5000) {
          for (;account.sequence <= _seq.snapshot;) {
            account.incrementSequenceNumber();
            console.debug('Sequence: ' + _seq.snapshot + ' -> ' + account.sequence);
          }
        }
        _seq.snapshot = account.sequence;
        _seq.time = now;
      },

      _isFunded: function(address, callback) {
        _server.accounts().accountId(address).call().then((accountResult) => {
          callback(null, true);
        }).catch((err) => {
          if (err.name === 'NotFoundError') {
            callback(null, false);
          } else {
            callback(err, false);
          }
        });
      },

      _fund: function(target, amount, memo_type, memo_value, callback) {
        amount = round(amount, 7);
        _server.loadAccount(_address).then((account) => {
          this._updateSeq(account);
          var payment = StellarSdk.Operation.createAccount({
            destination: target,
            startingBalance: amount.toString()
          });
          var memo = new StellarSdk.Memo(memo_type, memo_value);
          var tx = new StellarSdk.TransactionBuilder(account, {memo}).addOperation(payment).build();
          tx.sign(StellarSdk.Keypair.fromSecret(_secret));
          return _server.submitTransaction(tx);
        }).then((txResult) => {
          console.debug('Funded.', txResult);
          callback(null, txResult.hash);
        }).catch((err) => {
          console.error('Fund Fail !', err);
          callback(err, null);
        });
      },

      _sendCoin: function(target, amount, memo_type, memo_value, callback) {
        amount = round(amount, 7);
        _server.loadAccount(_address).then((account) => {
          this._updateSeq(account);
          var payment = StellarSdk.Operation.payment({
            destination: target,
            asset: StellarSdk.Asset.native(),
            amount: amount.toString()
          });
          var memo = new StellarSdk.Memo(memo_type, memo_value);
          var tx = new StellarSdk.TransactionBuilder(account, {memo:memo}).addOperation(payment).build();
          tx.sign(StellarSdk.Keypair.fromSecret(_secret));
          return _server.submitTransaction(tx);
        }).then((txResult) => {
          console.log(`Send ${$rootScope.currentNetwork.coin.code} done.`, txResult);
          callback(null, txResult.hash);
        }).catch((err) => {
          console.error('Send Fail !', err);
          callback(err, null);
        });
      },

      _sendToken: function(target, currency, issuer, amount, memo_type, memo_value, callback) {
        amount = round(amount, 7);
        _server.loadAccount(_address).then((account) => {
          this._updateSeq(account);
          var payment = StellarSdk.Operation.payment({
            destination: target,
            asset: new StellarSdk.Asset(currency, issuer),
            amount: amount.toString()
          });
          var memo = new StellarSdk.Memo(memo_type, memo_value);
          var tx = new StellarSdk.TransactionBuilder(account, {memo:memo}).addOperation(payment).build();
          tx.sign(StellarSdk.Keypair.fromSecret(_secret));
          return _server.submitTransaction(tx);
        }).then((txResult) => {
          console.log('Send Asset done.', txResult);
          callback(null, txResult.hash);
        }).catch((err) => {
          console.error('Send Fail !', err);
          callback(err, null);
        });
      },

      _updateRootBalance: function(balances = _balances) {
        var native = 0;
        var lines = {};

        balances.forEach((line) => {
          if (line.asset_type == 'native') {
            native = parseFloat(line.balance);
          } else {
            if (!lines[line.asset_code]) {
              lines[line.asset_code] = {};
            }
            var item = {
              code : line.asset_code,
              issuer : line.asset_issuer,
              balance : parseFloat(line.balance),
              limit : parseFloat(line.limit)
            };
            lines[line.asset_code][line.asset_issuer] = item;
          }
        });
        console.log('lines', lines);
        $rootScope.balance = native;
        $rootScope.lines = lines;
        $rootScope.$broadcast("balanceChange");
      },

      _offer: function(selling, buying, amount, price, callback) {
        amount = round(amount, 7);
        console.debug('Sell', amount, selling.code, 'for', buying.code, '@', price);
        _server.loadAccount(_address).then((account) => {
          this._updateSeq(account);
          var op = StellarSdk.Operation.manageOffer({
            selling: selling,
            buying: buying,
            amount: amount.toString(),
            price : price.toString()
          });
          var tx = new StellarSdk.TransactionBuilder(account).addOperation(op).build();
          tx.sign(StellarSdk.Keypair.fromSecret(_secret));
          return _server.submitTransaction(tx);
        }).then((txResult) => {
          console.log(txResult);
          callback(null, txResult.hash);
        }).catch((err) => {
          console.error('Offer Fail !', err);
          callback(err, null);
        });
      },

      _closeStream: function() {
        if (_closeAccountStream) {
          _closeAccountStream();
          _closeAccountStream = undefined;
        }
        if (_closeTxStream) {
          _closeTxStream();
          _closeTxStream = undefined;
        }
      },


      logout: function() {
        _address = undefined;
        _secret = undefined;
        _balances = {};
        _subentry = 0;
        _seq.snapshot = "";
        _seq.time = new Date();
        this._closeStream();
        orderbook.close();
        path.close();
      },

      random: function() {
        var keypair = StellarSdk.Keypair.random();
        _address = keypair.publicKey();
        _secret = keypair.secret();
        return {address: _address, secret: _secret};
      },

      getAddress: function(secret) {
        var keypair = StellarSdk.Keypair.fromSecret(secret||_secret);
        return keypair.publicKey();
      },

      isValidAddress: function(address) {
        return StellarSdk.StrKey.isValidEd25519PublicKey(address);
      },

      federation: function(fed_url) {
        return StellarSdk.StellarTomlResolver.resolve(fed_url);
      },

      setServer: function(url, passphrase, allowHttp=false) {
        if(!url) throw new Error('No URL')
        console.debug("Use Network: " + url + ', Passphrase: ' + passphrase);
        StellarSdk.Network.use(new StellarSdk.Network(passphrase));
        _server = new StellarSdk.Server(url, {allowHttp});
        history.setServer(_server);
        orderbook.setServer(_server);
        path.setServer(_server);
      },

      setAccount: function(address, secret) {
        _address = address;
        _secret = secret;
      },

      isValidMemo: function(type, memo) {
        try {
          new StellarSdk.Memo(type, memo);
          return '';
        } catch (e) {
          return e.message;
        }
      },

      send: function(target, currency, issuer, amount, memo_type, memo_value, callback) {
        amount = round(amount, 7);
        console.debug(target, currency, issuer, amount, memo_type, memo_value);
        if (currency == $rootScope.currentNetwork.coin.code) {
          this._isFunded(target, (err, isFunded) => {
            if (err) {
              return callback(err, null);
            } else {
              if (isFunded) {
                this._sendCoin(target, amount, memo_type, memo_value, callback);
              } else {
                this._fund(target, amount, memo_type, memo_value, callback);
              }
            }
          });
        } else {
          this._sendToken(target, currency, issuer, amount, memo_type, memo_value, callback);
        }
      },

      convert: function(alt, callback) {
        console.debug(alt.origin.source_amount + '/' + alt.src_code + ' -> ' + alt.origin.destination_amount + '/' + alt.dst_code);
        var path = alt.origin.path.map((item) => {
          if (item.asset_type == 'native') {
            return new StellarSdk.Asset.native();
          } else {
            return new StellarSdk.Asset(item.asset_code, item.asset_issuer);
          }
        });
        var sendMax = alt.origin.source_amount;
        if (alt.max_rate) {
          sendMax = round(alt.max_rate * sendMax, 7).toString();
        }
        _server.loadAccount(_address).then((account) => {
          this._updateSeq(account);
          var pathPayment = StellarSdk.Operation.pathPayment({
            destination: _address,
            sendAsset  : getAsset(alt.src_code, alt.src_issuer),
            sendMax    : sendMax,
            destAsset  : getAsset(alt.dst_code, alt.dst_issuer),
            destAmount : alt.origin.destination_amount,
            path       : path
          });
          var tx = new StellarSdk.TransactionBuilder(account).addOperation(pathPayment).build();
          tx.sign(StellarSdk.Keypair.fromSecret(_secret));
          return _server.submitTransaction(tx);
        }).then((txResult) => {
          console.log('Send Asset done.', txResult);
          callback(null, txResult.hash);
        }).catch((err) => {
          console.error('Send Fail !', err);
          callback(err, null);
        });
      },

      listenStream: function() {
        this._closeStream();

        console.log(_address, _server.accounts().accountId(_address))
        _closeAccountStream = _server.accounts().accountId(_address).stream({
          onmessage: (res) => {
            if (_subentry !== res.subentry_count) {
              console.debug('subentry: ' + _subentry + ' -> ' + res.subentry_count);
              _subentry = res.subentry_count;
              $rootScope.reserve = _subentry * 0.5 + 1;
              $rootScope.$apply();
            }
            if(!_.isEqual(_balances, res.balances)) {
              console.debug('balances: ', _balances, res.balances);
              _balances = res.balances;
              this._updateRootBalance();
              $rootScope.$apply();
            }
          }
        });

        // TODO: parse the tx and do action
        _closeTxStream = _server.transactions().forAccount(_address)
          .cursor("now")
          .stream({
            onmessage: (res) => {
              var tx = history.processTx(res, _address);
              console.log('tx stream', tx);
            }
          });
      },

      getInfo: function(address, callback) {
        _server.accounts().accountId(address||_address).call().then((data) => {
          callback(null, data);
        }).catch((err) => {
          if (err.name == 'NotFoundError') {
            console.warn(address, err.name);
            callback(new Error(err.name));
          } else {
            console.error(err);
            callback(err, null);
          }
        });
      },

      changeTrust: function(code, issuer, limit, callback) {
        var asset = new StellarSdk.Asset(code, issuer);
        console.debug('Turst asset', asset, limit);
        _server.loadAccount(_address).then((account) => {
          this._updateSeq(account);
          var op = StellarSdk.Operation.changeTrust({
            asset: asset,
            limit: limit.toString()
          });
          var tx = new StellarSdk.TransactionBuilder(account).addOperation(op).build();
          tx.sign(StellarSdk.Keypair.fromSecret(_secret));
          return _server.submitTransaction(tx);
        }).then((txResult) => {
          console.log(txResult);
          console.log('Trust updated.', txResult.hash);
          callback(null, txResult.hash);
        }).catch((err) => {
          console.error('Trust Fail !', err);
          callback(err, null);
        });
      },

      setOption: function(name, value, callback) {
        var opt = {};
        opt[name] = value
        console.debug('set option:', name, '-', value);
        _server.loadAccount(_address).then((account) => {
          this._updateSeq(account);
          var op = StellarSdk.Operation.setOptions(opt);
          var tx = new StellarSdk.TransactionBuilder(account).addOperation(op).build();
          tx.sign(StellarSdk.Keypair.fromSecret(_secret));
          return _server.submitTransaction(tx);
        }).then((txResult) => {
          console.log('Option updated.', txResult);
          callback(null, txResult.hash);
        }).catch((err) => {
          console.error('Option Fail !', err);
          callback(err, null);
        });
      },

      setData: function(name, value, callback) {
        var opt = {name: name, value: value? value : null};
        console.debug('manageData:', name, '-', value);
        _server.loadAccount(_address).then((account) => {
          this._updateSeq(account);
          var op = StellarSdk.Operation.manageData(opt);
          var tx = new StellarSdk.TransactionBuilder(account).addOperation(op).build();
          tx.sign(StellarSdk.Keypair.fromSecret(_secret));
          return _server.submitTransaction(tx);
        }).then((txResult) => {
          console.log('Data updated.', txResult);
          callback(null, txResult.hash);
        }).catch((err) => {
          console.error('manageData Fail !', err);
          callback(err, null);
        });
      },

      merge: function(destAccount, callback) {
        var opt = {destination: destAccount};
        console.debug('merge:', _address, '->', destAccount);
        _server.loadAccount(_address).then((account) => {
          this._updateSeq(account);
          var op = StellarSdk.Operation.accountMerge(opt);
          var tx = new StellarSdk.TransactionBuilder(account).addOperation(op).build();
          tx.sign(StellarSdk.Keypair.fromSecret(_secret));
          return _server.submitTransaction(tx);
        }).then((txResult) => {
          console.log('Account merged.', txResult);
          callback(null, txResult.hash);
        }).catch((err) => {
          console.error('accountMerge Fail !', err);
          callback(err, null);
        });
      },

      queryAccount: function(callback) {
        console.debug('query', _address);
        this.getInfo(_address, (err, data) => {
          if (err) {
            if (callback) { callback(err); }
            return;
          }
          _balances = data.balances;
          _subentry = data.subentry_count;
          $rootScope.reserve = _subentry * 0.5 + 1;
          this._updateRootBalance();
          $rootScope.$apply();
          if (callback) { callback(); }
          return;
        });
      },

      queryPayments: function(callback) {
        console.debug('payments', _address);
        history.payments(_address, callback);
      },

      queryPaymentsNext: function(addressOrPage, callback) {
        console.debug('loop payments', _address);
        history.payments(addressOrPage, callback);
      },

      queryEffects: function(callback) {
        console.debug('effects', _address);
        history.effects(_address, callback);
      },

      queryEffectsNext: function(addressOrPage, callback) {
        console.debug('loop effects', _address);
        history.effects(addressOrPage, callback);
      },

      queryTransactions: function(callback) {
        console.debug('transactions', _address);
        history.transactions(_address, callback);
      },

      queryTransactionsNext: function(page, callback) {
        console.debug('loop transactions');
        history.transactions(page, callback);
      },

      queryBook: function(baseBuy, counterSell, callback) {
        orderbook.get(baseBuy, counterSell, callback);
      },

      listenOrderbook: function(baseBuying, counterSelling, handler) {
        orderbook.listen(baseBuying, counterSelling, handler);
      },

      closeOrderbook: function() {
        orderbook.close();
      },

      queryPath: function(src, dest, code, issuer, amount, callback) {
        path.get(src, dest, code, issuer, amount, callback);
      },

      listenPath: function(src, dest, code, issuer, amount, handler) {
        path.listen(src, dest, code, issuer, amount, handler);
      },

      closePath: function() {
        path.close();
      },

      queryOffer: function(callback) {
        console.debug('offers', _address);
        _server.offers('accounts', _address).limit(200).call().then((data) => {
          console.log('offers', data.records);
          callback(null, data.records);
        }).catch((err) => {
          console.error('QueryOffer Fail !', err);
          callback(err, null);
        });
      },

      offer: function(option, callback) {
        console.debug('%s %s %s use %s@ %s', option.type, option.amount, option.currency, option.base, option.price);
        var buying, selling;
        var selling_amount, selling_price;

        if (option.type == 'buy') {
          selling = getAsset(option.base, option.base_issuer);
          buying = getAsset(option.currency, option.issuer);
          selling_amount = option.amount * option.price;
          selling_price = 1 / option.price;
        } else {
          selling = getAsset(option.currency, option.issuer);
          buying = getAsset(option.base, option.base_issuer);
          selling_amount = option.amount;
          selling_price = option.price;
        }
        this._offer(selling, buying, selling_amount, selling_price, callback);
      },

      cancel: function(offer, callback) {
        var selling, buying, price, offer_id;
        if (typeof offer === 'object') {
          selling = offer.selling;
          buying  = offer.buying;
          price   = round(offer.price, 7);
          offer_id = offer.id;
        } else {
          selling = StellarSdk.Asset.native();
          buying  = new StellarSdk.Asset('DUMMY', _address);
          price   = "1";
          offer_id = offer;
        }
        console.debug('Cancel Offer', offer_id);
        _server.loadAccount(_address).then((account) => {
          this._updateSeq(account);
          var op = StellarSdk.Operation.manageOffer({
            selling: selling,
            buying: buying,
            amount: "0",
            price : price,
            offerId : offer_id
          });
          var tx = new StellarSdk.TransactionBuilder(account).addOperation(op).build();
          tx.sign(StellarSdk.Keypair.fromSecret(_secret));
          return _server.submitTransaction(tx);
        }).then((txResult) => {
          console.log(txResult);
          callback(null, txResult.hash);
        }).catch((err) => {
          console.error('Cancel Offer Fail !', err);
          callback(err, null);
        });
      },

      getFedName: function(domain, address, callback) {
        StellarSdk.FederationServer.createForDomain(domain).then((server) => {
          return server.resolveAccountId(address);
        })
        .then((data) => {
          if(data.stellar_address) {
            var index = data.stellar_address.indexOf("*");
            var fed_name = data.stellar_address.substring(0, index);
            return callback(null, fed_name);
          }
        }).catch((err) => {
          return callback(err);
        });
      },

      getErrMsg: function(err) {
        var message = "";
        if (err.name == "NotFoundError") {
          message = "NotFoundError";
        } else if (err.data && err.data.extras && err.data.extras.result_xdr) {
          var resultXdr = StellarSdk.xdr.TransactionResult.fromXDR(err.data.extras.result_xdr, 'base64');
          if (resultXdr.result().results()) {
            message = resultXdr.result().results()[0].value().value().switch().name;
          } else {
            message = resultXdr.result().switch().name;
          }
        } else {
          message = err.detail || err.message;
        }

        if (!message) console.error("Fail in getErrMsg", err);
        return message;
      },

    };
  } ]);

/* exported b64DecodeUnicode */
const b64DecodeUnicode = (str) => {
  const encodedURIComponent = atob(str)
    .split('')
    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
    .join('');
  return decodeURIComponent(encodedURIComponent);
}
