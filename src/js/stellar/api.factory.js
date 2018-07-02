/* global _, myApp, round, StellarSdk */

myApp.factory('StellarApi', ['$rootScope', 'StellarHistory', 'StellarOrderbook', 'StellarPath', 'AuthenticationFactory', 'StellarGuard',
  function($rootScope, StellarHistory, StellarOrderbook, StellarPath, AuthenticationFactory, StellarGuard) {

    let _balances = {};
    let _closeAccountStream;  // function that closes a stream.
    let _closeTxStream;  // function that closes a stream.
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

      get address() {
        return AuthenticationFactory.address;
      },

      _updateSeq(account) {
        const now = new Date();
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

      async _isFunded(address) {
        try {
          await _server.accounts().accountId(address).call()
          return true;
        } catch(err) {
          if (err.name === 'NotFoundError') return false;
          throw err
        }
      },

      async _fund(target, amount, memo_type, memo_value) {
        amount = round(amount, 7);
        const account = await _server.loadAccount(this.address)
        this._updateSeq(account);
        const payment = StellarSdk.Operation.createAccount({
          destination: target,
          startingBalance: amount.toString()
        });
        const memo = new StellarSdk.Memo(memo_type, memo_value);
        return new StellarSdk.TransactionBuilder(account, {memo}).addOperation(payment).build();
      },

      async _sendCoin(target, amount, memo_type, memo_value) {
        amount = round(amount, 7);
        const account = await _server.loadAccount(this.address)
        this._updateSeq(account);
        const payment = StellarSdk.Operation.payment({
          destination: target,
          asset: StellarSdk.Asset.native(),
          amount: amount.toString()
        });
        const memo = new StellarSdk.Memo(memo_type, memo_value);
        return new StellarSdk.TransactionBuilder(account, {memo:memo}).addOperation(payment).build();
      },

      async _sendToken(target, currency, issuer, amount, memo_type, memo_value) {
        amount = round(amount, 7);
        const account = await _server.loadAccount(this.address)
        this._updateSeq(account);
        const payment = StellarSdk.Operation.payment({
          destination: target,
          asset: new StellarSdk.Asset(currency, issuer),
          amount: amount.toString()
        });
        const memo = new StellarSdk.Memo(memo_type, memo_value);
        return new StellarSdk.TransactionBuilder(account, {memo:memo}).addOperation(payment).build();
      },

      _updateRootBalance(balances = _balances) {
        let native = 0;
        const lines = {};

        balances.forEach((line) => {
          if (line.asset_type == 'native') {
            native = parseFloat(line.balance);
          } else {
            if (!lines[line.asset_code]) {
              lines[line.asset_code] = {};
            }
            const item = {
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

      async _offer(selling, buying, amount, price) {
        amount = round(amount, 7);
        console.debug('Sell', amount, selling.code, 'for', buying.code, '@', price);
        const account = await _server.loadAccount(this.address)
        this._updateSeq(account);
        const op = StellarSdk.Operation.manageOffer({
          selling: selling,
          buying: buying,
          amount: amount.toString(),
          price : price.toString()
        });
        return new StellarSdk.TransactionBuilder(account).addOperation(op).build();
      },

      _closeStream() {
        if (_closeAccountStream) {
          _closeAccountStream();
          _closeAccountStream = undefined;
        }
        if (_closeTxStream) {
          _closeTxStream();
          _closeTxStream = undefined;
        }
      },

      async submitTransaction(te, msg) {
        console.info(`Submitting transaction ${te.hash().toString('base64')} ...`)
        try {
          const txResult = await _server.submitTransaction(te)
          console.info(`Transaction ${msg} submitted.`, txResult);
          return txResult.hash;
        } catch(err) {
          console.error('Send Fail !', err);
          throw err;
        }
      },

      logout() {
        this.address = undefined;
        _balances = {};
        _subentry = 0;
        _seq.snapshot = "";
        _seq.time = new Date();
        this._closeStream();
        StellarOrderbook.close();
        StellarPath.close();
      },

      isValidAddress(address) {
        return StellarSdk.StrKey.isValidEd25519PublicKey(address);
      },

      federation(fed_url) {
        return StellarSdk.StellarTomlResolver.resolve(fed_url);
      },

      setServer(url, passphrase, allowHttp=false) {
        if(!url) throw new Error('No URL')
        console.debug("Use Network: " + url + ', Passphrase: ' + passphrase);
        StellarSdk.Network.use(new StellarSdk.Network(passphrase));
        _server = new StellarSdk.Server(url, {allowHttp});
        StellarHistory.setServer(_server);
        StellarOrderbook.setServer(_server);
        StellarPath.setServer(_server);
      },

      isValidMemo(type, memo) {
        try {
          new StellarSdk.Memo(type, memo);
          return '';
        } catch (e) {
          return e.message;
        }
      },

      async send(target, currency, issuer, amount, memo_type, memo_value) {
        amount = round(amount, 7);
        console.debug(target, currency, issuer, amount, memo_type, memo_value);
        if (currency !== $rootScope.currentNetwork.coin.code) {
          return this._sendToken(target, currency, issuer, amount, memo_type, memo_value);
        }

        const isFunded = await this._isFunded(target)
        if (isFunded) {
          return this._sendCoin(target, amount, memo_type, memo_value);
        } else {
          return this._fund(target, amount, memo_type, memo_value);
        }
      },

      async convert(alt) {
        console.debug(alt.origin.source_amount + '/' + alt.src_code + ' -> ' + alt.origin.destination_amount + '/' + alt.dst_code);
        const path = alt.origin.path.map((item) => {
          if (item.asset_type == 'native') {
            return new StellarSdk.Asset.native();
          } else {
            return new StellarSdk.Asset(item.asset_code, item.asset_issuer);
          }
        });
        let sendMax = alt.origin.source_amount;
        if (alt.max_rate) {
          sendMax = round(alt.max_rate * sendMax, 7).toString();
        }
        const account = await _server.loadAccount(this.address)
        this._updateSeq(account);
        const pathPayment = StellarSdk.Operation.pathPayment({
          destination: this.address,
          sendAsset  : getAsset(alt.src_code, alt.src_issuer),
          sendMax    : sendMax,
          destAsset  : getAsset(alt.dst_code, alt.dst_issuer),
          destAmount : alt.origin.destination_amount,
          path       : path
        });
        return new StellarSdk.TransactionBuilder(account).addOperation(pathPayment).build();
      },

      listenStream() {
        this._closeStream();

        console.log(this.address, _server.accounts().accountId(this.address))
        _closeAccountStream = _server.accounts().accountId(this.address).stream({
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
        _closeTxStream = _server.transactions().forAccount(this.address)
          .cursor("now")
          .stream({
            onmessage: (res) => {
              const tx = StellarHistory.processTx(res, this.address);
              console.log('tx stream', tx);
            }
          });
      },

      async getInfo(address, callback) {
        try {
          const data = await _server.accounts().accountId(address||this.address).call()
          callback(null, data);
        } catch(err) {
          if (err.name == 'NotFoundError') {
            console.warn(address, err.name);
            callback(new Error(err.name), null);
          } else {
            console.error(err);
            callback(err, null);
          }
        }
      },

      async changeTrust(code, issuer, limit) {
        const asset = new StellarSdk.Asset(code, issuer);
        console.debug('Turst asset', asset, limit);
        const account = await _server.loadAccount(this.address)
        this._updateSeq(account);
        const op = StellarSdk.Operation.changeTrust({
          asset: asset,
          limit: limit.toString()
        });
        return new StellarSdk.TransactionBuilder(account).addOperation(op).build();
      },

      async setOption(name, value) {
        const opt = {};
        opt[name] = value
        console.debug('set option:', name, '-', value);
        const account = await _server.loadAccount(this.address)
        this._updateSeq(account);
        const op = StellarSdk.Operation.setOptions(opt);
        return new StellarSdk.TransactionBuilder(account).addOperation(op).build();
      },

      async setData(name, value) {
        const opt = {name: name, value: value? value : null};
        console.debug('manageData:', name, '-', value);
        const account = await _server.loadAccount(this.address)
        this._updateSeq(account);
        const op = StellarSdk.Operation.manageData(opt);
        return new StellarSdk.TransactionBuilder(account).addOperation(op).build();
      },

      async merge(destAccount) {
        const opt = {destination: destAccount};
        console.debug('merge:', this.address, '->', destAccount);
        const account = await _server.loadAccount(this.address)
        this._updateSeq(account);
        const op = StellarSdk.Operation.accountMerge(opt);
        return new StellarSdk.TransactionBuilder(account).addOperation(op).build();
      },

      queryAccount(callback) {
        console.debug('query', this.address);
        this.getInfo(this.address, (err, data) => {
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
        });
      },

      queryPayments(callback) {
        console.debug('payments', this.address);
        StellarHistory.payments(this.address, callback);
      },

      queryPaymentsNext(addressOrPage, callback) {
        console.debug('loop payments', this.address);
        StellarHistory.payments(addressOrPage, callback);
      },

      queryEffects(callback) {
        console.debug('effects', this.address);
        StellarHistory.effects(this.address, callback);
      },

      queryEffectsNext(addressOrPage, callback) {
        console.debug('loop effects', this.address);
        StellarHistory.effects(addressOrPage, callback);
      },

      queryTransactions(callback) {
        console.debug('transactions', this.address);
        StellarHistory.transactions(this.address, callback);
      },

      queryTransactionsNext(page, callback) {
        console.debug('loop transactions');
        StellarHistory.transactions(page, callback);
      },

      queryBook(baseBuy, counterSell, callback) {
        StellarOrderbook.get(baseBuy, counterSell, callback);
      },

      listenOrderbook(baseBuying, counterSelling, handler) {
        StellarOrderbook.listen(baseBuying, counterSelling, handler);
      },

      closeOrderbook() {
        StellarOrderbook.close();
      },

      queryPath(src, dest, code, issuer, amount, callback) {
        StellarPath.get(src, dest, code, issuer, amount, callback);
      },

      listenPath(src, dest, code, issuer, amount, handler) {
        StellarHistory.listen(src, dest, code, issuer, amount, handler);
      },

      closePath() {
        StellarHistory.close();
      },

      async queryOffer(callback) {
        console.debug('offers', this.address);
        try {
          const data = await _server.offers('accounts', this.address).limit(200).call()
          console.log('offers', data.records);
          callback(null, data.records);
        } catch(err) {
          console.error('QueryOffer Fail !', err);
          callback(err, null);
        }
      },

      async offer(option) {
        console.debug('%s %s %s use %s@ %s', option.type, option.amount, option.currency, option.base, option.price);
        let buying, selling;
        let selling_amount, selling_price;

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
        return this._offer(selling, buying, selling_amount, selling_price);
      },

      async cancel(offer) {
        let selling, buying, price, offer_id;
        if (typeof offer === 'object') {
          selling = offer.selling;
          buying  = offer.buying;
          price   = round(offer.price, 7);
          offer_id = offer.id;
        } else {
          selling = StellarSdk.Asset.native();
          buying  = new StellarSdk.Asset('DUMMY', this.address);
          price   = "1";
          offer_id = offer;
        }
        console.debug('Cancel Offer', offer_id);
        const account = await _server.loadAccount(this.address)
        this._updateSeq(account);
        const op = StellarSdk.Operation.manageOffer({
          selling: selling,
          buying: buying,
          amount: "0",
          price : price,
          offerId : offer_id
        });
        return new StellarSdk.TransactionBuilder(account).addOperation(op).build();
      },

      async _submitTransaction(transaction, account) {
        const te = AuthenticationFactory.sign(transaction)
        if(StellarGuard.hasStellarGuard(account)) {
          return StellarGuard.submitTransaction(te);
        } else {
          return _server.submitTransaction(te);
        }
      },

      getFedName(domain, address, callback) {
        try {
          const server = StellarSdk.FederationServer.createForDomain(domain);
          const data = server.resolveAccountId(address);
          if(data.stellarthis.address) {
            const index = data.stellarthis.address.indexOf("*");
            const fed_name = data.stellarthis.address.substring(0, index);
            return callback(null, fed_name);
          }
        } catch(err) {
          return callback(err);
        }
      },

      getErrMsg(err) {
        let message = "";
        if (err.name == "NotFoundError") {
          message = "NotFoundError";
        } else if (err.data && err.data.extras && err.data.extras.result_xdr) {
          const resultXdr = StellarSdk.xdr.TransactionResult.fromXDR(err.data.extras.result_xdr, 'base64');
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
