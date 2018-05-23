/* global myApp */

myApp.controller("PaymentsCtrl", [ '$scope', '$rootScope', 'StellarApi', 'FedNameFactory', 'AuthenticationFactory',
  function($scope, $rootScope, StellarApi, FedNameFactory, AuthenticationFactory) {
    $scope.payments = [];
    $scope.next = undefined;

    $scope.loading = false;
    $scope.refresh = function() {
      if ($scope.loading) { return; }
      $scope.next = undefined;
      $scope.loading = true;

      StellarApi.queryPayments(function(err, payments, nextPage){
        $scope.loading = false;
        if (err) {
          $scope.error_msg = StellarApi.getErrMsg(err);
        } else {
          $scope.error_msg = "";
          $scope.payments = payments;
          $scope.updateTx(0);
          $scope.next = nextPage;
        }
        $scope.updateAllNick();
        $scope.$apply();
      });

    };
    $scope.refresh();

    $scope.load_more = function() {
      if ($scope.loading) { return; }
      $scope.loading = true;
      StellarApi.queryPaymentsNext($scope.next, function(err, payments, nextPage){
        $scope.loading = false;
        if (err) {
          $scope.error_msg = err.message;
        } else {
          $scope.error_msg = "";
          var start_index = $scope.payments.length;
          payments.forEach(function(item){
            $scope.payments.push(item);
          });
          $scope.updateTx(start_index);
          $scope.next = nextPage;
        }
        $scope.updateAllNick();
        $scope.$apply();
      });
    };

    $scope.updateAllNick = function() {
      $scope.payments.forEach(function(tx) {
        var contact = AuthenticationFactory.getContact(tx.counterparty);
        if (contact) {
          // Check contacts
          tx.nick = contact.name;
        } else {
          //Check FedName service
          if (FedNameFactory.isCached(tx.counterparty)) {
            if (FedNameFactory.getName(tx.counterparty)) {
              tx.nick = "~" + FedNameFactory.getName(tx.counterparty);
            }
          } else {
            FedNameFactory.resolve(tx.counterparty, function(err, data) {
              if (err) {
                console.error(err);
              } else {
                if (data.nick) {
                  $scope.updateNick(tx.counterparty, "~" + data.nick);
                  $scope.$apply();
                }
              }
            });
          }
        }
      });
    };

    $scope.updateNick = function(address, nick) {
      $scope.payments.forEach(function(tx) {
        if (tx.counterparty === address) {
          tx.nick = nick;
        }
      });
    };

    $scope.updateTx = function(start_index) {
      for (var i=start_index; i<$scope.payments.length; i++) {
        update($scope.payments[i], i);
      }

      function update(payment, index) {
        payment.transaction().then(function(tx){
          $scope.payments[index].date = tx.created_at;
          $scope.payments[index].memo = tx.memo;
          $scope.payments[index].memo_type = tx.memo_type;
          $scope.$apply();
        });
      }
    };
  } ]);

myApp.controller("TradesCtrl", [ '$scope', '$rootScope', 'StellarApi',
  function($scope, $rootScope, StellarApi) {
    $scope.trades = [];
    $scope.next = undefined;

    $scope.loading = false;
    $scope.refresh = function() {
      if ($scope.loading) { return; }
      $scope.loading = true;
      $scope.trades = [];
      $scope.next = undefined;

      StellarApi.queryTransactions(function(err, trades, nextPage){
        $scope.loading = false;
        if (err) {
          $scope.error_msg = StellarApi.getErrMsg(err);
        } else {
          $scope.error_msg = "";
          trades.forEach(function(item){
            if (item.operation_count == 1) {
              item.type = item.tx.operations[0].type;
            } else {
              item.type = 'batch';
            }
            $scope.trades.push(item);
          });
          $scope.next = nextPage;
        }
        $scope.$apply();
      });
    };
    $scope.refresh();

    $scope.load_more = function() {
      if ($scope.loading) { return; }
      $scope.loading = true;
      StellarApi.queryTransactionsNext($scope.next, function(err, trades, nextPage){
        $scope.loading = false;
        if (err) {
          $scope.error_msg = err.message;
        } else {
          $scope.error_msg = "";
          trades.forEach(function(item){
            if (item.operation_count == 1) {
              item.type = item.tx.operations[0].type;
            } else {
              item.type = 'batch';
            }
            $scope.trades.push(item);
          });
          $scope.next = nextPage;
        }
        $scope.$apply();
      });
    };
  } ]);

myApp.controller("EffectsCtrl", [ '$scope', '$rootScope', '$q', 'StellarApi', 'SettingFactory',
  function($scope, $rootScope, $q, StellarApi, SettingFactory) {
    $scope.effects = [];
    $scope.parsed = {};
    $scope.next = undefined;

    $scope.loading = false;
    $scope.refresh = function() {
      if ($scope.loading) {
        return;
      }
      $scope.loading = true;
      $scope.effects = [];
      $scope.parsed = {};
      $scope.next = undefined;

      StellarApi.queryEffects(function(err, effects, nextPage) {
        if (err) {
          $scope.loading = false;
          $scope.error_msg = StellarApi.getErrMsg(err);
        } else {
          $scope.error_msg = "";
          $scope.next = nextPage;

          var snapshot = {};
          var id_arr = effects.map(fx =>{
            snapshot[fx.id] = fx;
            return fx.id;
          });
          var promises = effects.map(fx => {
            return addEffect(fx).catch(err => err);
          });

          return $q.all(promises).then(() => {
            $scope.loading = false;
            id_arr.forEach((id) =>{
              if ($scope.parsed[id]) {
                $scope.effects.push($scope.parsed[id]);
              } else {
                console.warn(snapshot[id]);
              }
            });
            console.debug('effects', $scope.effects);
          });

        }
        $scope.$apply();
      });
    };
    $scope.refresh();

    $scope.load_more = function() {
      if ($scope.loading) {
        return;
      }
      $scope.loading = true;
      StellarApi.queryEffectsNext($scope.next, function(err, effects, nextPage) {
        if (err) {
          $scope.loading = false;
          $scope.error_msg = err.message;
        } else {
          $scope.error_msg = "";
          $scope.next = nextPage;

          var snapshot = {};
          var id_arr = effects.map(fx =>{
            snapshot[fx.id] = fx;
            return fx.id;
          });
          var promises = effects.map(fx => {
            return addEffect(fx).catch(err => err);
          });

          return $q.all(promises).then(() => {
            $scope.loading = false;
            id_arr.forEach((id) =>{
              if ($scope.parsed[id]) {
                $scope.effects.push($scope.parsed[id]);
              } else {
                console.warn(snapshot[id]);
              }
            });
            //console.debug('effects', $scope.effects);
          });
        }
        $scope.$apply();
      });
    };

    function addEffect(effect) {
      return effect.operation().then((operation) => {
        return operation.transaction().then((transaction) => {
          const res = parseEffect(effect, operation, transaction, SettingFactory.getCoin());
          if (res) {
            $scope.parsed[res.id] = res;
            return res;
          } else {
            return $q.reject();
          }
        });
      });
    }

  } ]);


function copyAmount(res, fx, nativeCode, prefix) {
  prefix = prefix || '';

  res[`${prefix}amount`] = fx[`${prefix}amount`];
  if (fx[`${prefix}asset_type`] === 'native') {
    res[`${prefix}asset_code`] = nativeCode;
  } else {
    res[`${prefix}asset_code`] = fx[`${prefix}asset_code`];
    res[`${prefix}asset_issuer`] = fx[`${prefix}asset_issuer`];
  }
}

function parseEffect(fx, op, tx, nativeCode) {

  console.log(fx, op, tx)

  let res = {
    id:			fx.id,
    type:		fx.type,
    op_type:    op.type,
    hash:		tx.hash,
    date:		tx.created_at,
    numOps:	tx.operation_count,
    memo:		tx.memo,
    memoType:	tx.memo_type
  };

  /* eslint-disable camelcase */
  const handlers = {
    'account_created': function () {
      res.from	= op.funder;
      res.amount	= fx.starting_balance;
    },
    'account_removed': function () {
    },
    'account_credited': function () {
      if (op.type === 'path_payment' && op.from === op.to) {
        //copyAmount(res, fx, nativeCode);
        res = null;
      } else if (op.type === 'account_merge') {
        res.from = op.account;
        copyAmount(res, fx, nativeCode);
      } else {
        res.from = op.from;
        copyAmount(res, fx, nativeCode);
      }
    },
    'account_debited': function () {
      if (op.type === 'path_payment' && op.from === op.to) {
        //copyAmount(res, fx);
        res = null;
      } else {
        res.to = op.to || op.account;	// op.payment || op.create_account(?)
        copyAmount(res, fx, nativeCode);
      }
    },
    'account_flags_updated': function () {
    },
    'account_home_domain_updated': function () {
      res.domain = fx.home_domain;
    },
    'account_thresholds_updated': function () {
    },
    'data_created': function () {
    },
    'data_removed': function () {
    },
    'data_updated': function () {
    },
    'offer_created': function () {
    },
    'offer_removed': function () {
    },
    'offer_updated': function () {
    },
    'signer_created': function () {
      res.public_key	= fx.public_key;
      res.weight		= fx.weight;
    },
    'signer_removed': function () {
      res.public_key = fx.public_key;
    },
    'signer_updated': function () {
      console.warn(fx, op, tx);
    },
    'trade': function () {
      if (op.type === 'path_payment' && op.from !== op.to && op.from === fx.account) {
        res = null;
      } else {
        copyAmount(res, fx, nativeCode, 'sold_');
        copyAmount(res, fx, nativeCode, 'bought_');
      }
    },
    'trustline_created': function () {
      res.asset_code		= fx.asset_code;
      res.asset_issuer	= fx.asset_issuer;
      res.limit			= fx.limit;
    },
    'trustline_removed': function () {
      res.asset_code		= fx.asset_code;
      res.asset_issuer	= fx.asset_issuer;
      res.limit			= fx.limit;
    },
    'trustline_updated': function () {
      res.asset_code		= fx.asset_code;
      res.asset_issuer	= fx.asset_issuer;
      res.limit			= fx.limit;
    },
    'trustline_authorized': function () {
    },
    'trustline_deauthorized': function () {
    }
  };
  /* eslint-enable camelcase */

  if (fx.type in handlers) {
    handlers[fx.type]();
  } else {
    console.log(fx);
    console.log(op);
    console.log(tx);
  }

  return res;
}
