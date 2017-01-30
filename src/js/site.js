!function() {
    angular.module("eclipticApp", ["ngRoute", "debounce", "siyfion.sfTypeahead"]).config(["$routeProvider", "$locationProvider", function(e, t) {
        e.when("/wallet", {
            templateUrl: "/wallet",
            controller: "walletCtrl"
        }).when("/trade", {
            templateUrl: "/trade",
            controller: "tradeCtrl"
        }).when("/contacts", {
            templateUrl: "/contact",
            controller: "contactCtrl"
        }).when("/anchors", {
            templateUrl: "/anchor",
            controller: "anchorCtrl"
        }).when("/2fa", {
            templateUrl: "/settings/twoFactor",
            controller: "anchorCtrl"
        }).otherwise("/wallet"),
        t.html5Mode(!0)
    }
    ])
}(),
function() {
    angular.module("eclipticApp").controller("anchorCtrl", ["$rootScope", "$scope", "api", "federation", "modal", function(e, t, n, s, r) {
        var o = function() {
            t.isEditingTrustLine = !1,
            t.isAnchorInvalid = !1,
            t.useManualEntry = !1,
            t.line = {},
            delete t.lines
        };
        t.editTrustLine = function() {
            t.isEditingTrustLine = !0,
            n.changeTrust(t.line.asset.asset, t.line.asset.issuerId, t.line.limit).then(function() {
                e.requestRefreshAccount(),
                t.line.issuer !== t.line.asset.issuerId && n.addContact(t.line.issuer, t.line.asset.issuerId).then(function() {
                    e.requestRefreshContacts()
                }),
                o(),
                r.showConfirm("Success", "The anchor has been connected to this wallet.")
            }).catch(function(e) {
                return "tx_insufficient_balance" === e || "op_low_reserve" === e ? void r.showReserveLow() : (t.isEditingTrustLine = !1,
                void r.showConfirm("Failed", "The anchor could not be connected to this wallet."))
            })
        }
        ,
        t.canEditTrustLine = function() {
            return t.line.asset && t.line.asset.asset && t.line.asset.issuerId && t.line.limit >= 0
        }
        ,
        t.onAnchorChanged = function() {
            s.resolve(t.line.issuer, !0).then(function(e) {
                e.name && (t.line.issuerDisplay = e.accountId),
                delete t.lines,
                t.line.asset = {
                    issuerId: e.accountId
                },
                delete t.line.limit,
                t.useManualEntry = !0,
                t.isAnchorInvalid = !1
            }).catch(function() {
                t.useManualEntry = !1,
                delete t.line.issuerDisplay,
                n.getIssuingAssets(t.line.issuer).then(function(e) {
                    t.isAnchorInvalid = !1,
                    t.lines = e,
                    delete t.line.limit
                }).catch(function() {
                    t.isAnchorInvalid = !0
                })
            })
        }
        ,
        t.removeAnchor = function(s, o) {
            t.isEditingTrustLine = !0,
            n.changeTrust(s, o.issuerId, 0).then(function() {
                t.isEditingTrustLine = !1,
                e.requestRefreshAccount(),
                r.showConfirm("Success", "The anchor has been removed from this wallet.")
            }).catch(function() {
                r.showError("Failed", "Failed to remove the anchor."),
                t.isEditingTrustLine = !1
            })
        }
        ,
        t.line = {}
    }
    ])
}(),
function() {
    angular.module("eclipticApp").controller("contactCtrl", ["$rootScope", "$scope", "api", "federation", "modal", function(e, t, n, s, r) {
        t.onAccountChanged = function() {
            s.resolve(t.contact.accountId).then(function(e) {
                t.isAccountValid = !0,
                e.name && (t.contact.display = e.accountId)
            }).catch(function() {
                delete t.contact.display,
                t.isAccountValid = !1
            })
        }
        ,
        t.addContact = function() {
            t.isEditingContact = !0,
            n.addContact(t.contact.name, t.contact.display ? t.contact.display : t.contact.accountId).then(function() {
                t.isEditingContact = !1,
                e.requestRefreshContacts(),
                t.contact = {},
                r.showConfirm("Success", "The contact was added successfully.")
            }).catch(function() {
                t.isEditingContact = !1,
                r.showConfirm("Failed", "We were unable to add the contact.")
            })
        }
        ,
        t.deleteContact = function(s) {
            t.isEditingContact = !0,
            n.deleteContact(s).then(function() {
                t.isEditingContact = !1,
                e.requestRefreshContacts(),
                r.showConfirm("Success", "The contact was removed successfully.")
            }).catch(function() {
                t.isEditingContact = !1,
                r.showConfirm("Failed", "We were unable to remove the contact.")
            })
        }
        ,
        t.contact = {}
    }
    ])
}(),
function() {
    angular.module("eclipticApp").controller("rootCtrl", ["$rootScope", "api", "federation", "$q", "$timeout", "$interval", "modal", function(e, t, n, s, r, o, a) {
        e.requestRefreshAccount = function() {
            t.getBalances().then(function(t) {
                e.assets = t.assets,
                e.$broadcast("accountRefreshed")
            })
        }
        ,
        e.requestRefreshBalances = function() {
            var n = t.getBalances().then(function(t) {
                e.balances = t
            })
              , r = t.getTransactions().then(function(t) {
                e.transactions = t
            });
            s.all([n, r]).then(function() {
                e.$broadcast("balancesRefreshed")
            })
        }
        ,
        e.requestRefreshContacts = function() {
            return s(function(n) {
                t.getContacts().then(function(t) {
                    e.contacts = t,
                    e.$broadcast("contactsRefreshed", t),
                    n()
                })
            })
        }
        ,
        e.requestRefreshTrade = function() {
            e.$broadcast("tradeRefreshed")
        }
        ,
        e.showSeed = function() {
            a.showConfirm("Secret key", "The secret key for your current wallet is " + seed + ".")
        }
        ,
        r(function() {
            e.requestRefreshContacts().then(function() {
                e.requestRefreshAccount(),
                e.requestRefreshBalances(),
                o(function() {
                    e.requestRefreshBalances()
                }, 5e3),
                o(function() {
                    e.requestRefreshTrade()
                }, 15e3)
            })
        }, 0)
    }
    ])
}(),
function() {
    angular.module("eclipticApp").controller("tradeCtrl", ["$rootScope", "$scope", "api", "modal", function(e, t, n, s) {
        t.trade = {
            direction: "Sell"
        },
        t.books = {};
        var r = function() {
            e.assets && e.assets.length > 0 && !t.trade.asset && (t.trade.asset = e.assets[0],
            t.trade.issuer = t.trade.asset.issuers[0],
            t.trade.counterIssuer = "",
            t.trade.counterIssuer.issuer = null,
            t.onAssetChange(),
            e.requestRefreshTrade())
        };
        t.$on("$routeChangeSuccess", r),
        t.$on("accountRefreshed", r),
        t.$on("tradeRefreshed", function() {
            t.refreshOrderbook(),
            t.refreshMyOrders(),
            t.refreshTradeHistory()
        }),
        t.isValidMarket = function() {
            var e = t.trade;
            return !(!e.asset || !e.counterAsset) && (e.asset.isNative || !(e.asset.name === e.counterAsset.name && e.issuer.issuerId === e.counterIssuer.issuerId) && e.counterAsset.isNative || !(e.asset.name === e.counterAsset.name && e.issuer.issuerId === e.counterIssuer.issuerId))
        }
        ,
        t.onTradeDirectionChanged = function(e) {
            t.trade.direction = e
        }
        ,
        t.swapAssets = function() {
            var e = t.trade.asset
              , n = t.trade.issuer;
            t.trade.asset = t.trade.counterAsset,
            t.trade.issuer = t.trade.counterIssuer,
            t.trade.counterAsset = e,
            t.trade.counterIssuer = n,
            t.trade.price > 0 && (t.trade.price = 1 / t.trade.price,
            t.trade.consequenceAmount > 0 && (t.trade.actionAmount = t.trade.consequenceAmount),
            t.onOrderChanged()),
            t.onAssetChange()
        }
        ,
        t.refreshTradeHistory = function() {
            n.getTrades().then(function(e) {
                t.books.trades = e
            })
        }
        ,
        t.refreshMyOrders = function() {
            n.getOrders().then(function(e) {
                e.forEach(function(e) {
                    "native" === e.buying.asset_type && (e.buying.asset_code = "XLM"),
                    "native" === e.selling.asset_type && (e.selling.asset_code = "XLM")
                }),
                t.books.my = e
            })
        }
        ;
        var o = function() {
            t.onTradeDirectionChanged("Sell"),
            t.trade.actionAmount = null,
            t.trade.price = null,
            t.trade.consequenceAmount = null
        };
        t.onAssetChange = function() {
            t.trade.asset || (t.trade.asset = {
                name: "XLM",
                isNative: !0
            }),
            t.trade.counterAsset || (t.trade.counterAsset = {
                name: "XLM",
                isNative: !0
            }),
            o(),
            t.refreshOrderbook()
        }
        ,
        t.refreshOrderbook = function() {
            t.trade.asset && (t.trade.asset.isNative || t.trade.issuer) && t.trade.counterAsset && (t.trade.counterAsset.isNative || t.trade.counterIssuer) && n.getOrderbook(t.trade.asset.name, t.trade.asset.isNative ? null : t.trade.issuer.issuerId, t.trade.counterAsset.name, t.trade.counterAsset.isNative ? null : t.trade.counterIssuer.issuerId).then(function(e) {
                t.books.bids = e.bids,
                t.books.asks = e.asks,
                t.$broadcast("requestGraphRefresh", {
                    bids: t.books.bids,
                    asks: t.books.asks
                })
            })
        }
        ,
        t.onOrderChanged = function() {
            t.trade.actionAmount > 0 && t.trade.price > 0 && (t.trade.consequenceAmount = t.trade.actionAmount * t.trade.price)
        }
        ,
        t.placeOrder = function() {
            var r;
            t.isPlacingOrder = !0,
            r = "Sell" === t.trade.direction ? n.placeOrder(t.trade.asset.name, null === t.trade.issuer ? null : t.trade.issuer.issuerId, t.trade.counterAsset.name, null === t.trade.counterIssuer ? null : t.trade.counterIssuer.issuerId, t.trade.actionAmount, t.trade.price) : n.placeOrder(t.trade.counterAsset.name, null === t.trade.counterIssuer ? null : t.trade.counterIssuer.issuerId, t.trade.asset.name, null === t.trade.issuer ? null : t.trade.issuer.issuerId, t.trade.consequenceAmount, 1 / t.trade.price),
            r.then(function() {
                e.requestRefreshBalances(),
                e.requestRefreshTrade(),
                o(),
                s.showConfirm("Order placed", "Your order has been placed."),
                t.isPlacingOrder = !1
            }).catch(function(e) {
                return t.isPlacingOrder = !1,
                "tx_insufficient_balance" === e || "op_low_reserve" === e ? void s.showReserveLow() : "op_underfunded" === e ? void s.showError("Order failed", "You do not have enough funds to place that order.") : "op_cross_self" === e ? void s.showError("Order failed", "Your order crossed with one of your existing orders (you cannot place an order against yourself).") : void s.showError("Order failed", "Sorry, we were unable to place your order.")
            })
        }
        ,
        t.removeOffer = function(r) {
            t.isPlacingOrder = !0,
            n.removeOffer(r).then(function() {
                e.requestRefreshTrade(),
                s.showConfirm("Success", "Your order has been removed."),
                t.isPlacingOrder = !1
            }).catch(function() {
                s.showError("Failed", "Sorry, we were unable to remove your offer."),
                t.isPlacingOrder = !1
            })
        }
    }
    ])
}(),
function() {
    angular.module("eclipticApp").controller("tradeGraphCtrl", ["$scope", "$filter", function(e, t) {
        var n = function(n) {
            var s = e.$parent.trade.asset
              , r = e.$parent.trade.counterAsset
              , o = s.name || "XLM"
              , a = r.name || "XLM"
              , i = {
                x: [],
                y: [],
                type: "scatter",
                mode: "lines",
                line: {
                    color: "#74e349"
                },
                text: [],
                hoverinfo: "text"
            }
              , c = {
                x: [],
                y: [],
                type: "scatter",
                mode: "lines",
                line: {
                    color: "#e34949"
                },
                text: [],
                hoverinfo: "text"
            }
              , u = 0
              , d = 1
              , l = 0;
            (new jinqJs).from(n.bids).orderBy([{
                field: "price",
                sort: "desc"
            }]).select(function(e) {
                return {
                    price: e.price,
                    amount: e.amount
                }
            }).forEach(function(e) {
                i.x.push(e.price),
                i.y.push(l),
                l += e.amount / e.price,
                i.x.push(e.price),
                i.y.push(l),
                i.text.push(null),
                i.text.push("Sum: " + t("number")(l, 2) + " " + o + " | Price: " + t("number")(e.price, 4) + " " + a),
                u = e.price
            });
            var f = 0;
            (new jinqJs).from(n.asks).orderBy([{
                field: "price",
                sort: "asc"
            }]).select(function(e) {
                return {
                    price: e.price,
                    amount: e.amount
                }
            }).forEach(function(e) {
                c.x.push(e.price),
                c.y.push(f),
                f = Number(f) + Number(e.amount),
                c.x.push(e.price),
                c.y.push(f),
                c.text.push(null),
                c.text.push("Sum: " + t("number")(f, 2) + " " + o + " | Price: " + t("number")(e.price, 4) + " " + a),
                d = e.price
            });
            var h = [i, c]
              , m = {
                showlegend: !1,
                xaxis: {
                    title: "Price (" + a + ")",
                    range: [u, d],
                    fixedrange: !0,
                    zeroline: !1
                },
                yaxis: {
                    title: "Sum (" + o + ")",
                    range: [0, Math.max(Math.max(0, l), f ? f : 1)],
                    fixedrange: !0,
                    side: "left"
                },
                yaxis2: {
                    range: [0, Math.max(Math.max(0, l), f ? f : 1)],
                    fixedrange: !0,
                    overlaying: "y",
                    side: "right"
                },
                font: {
                    family: '"Work Sans", sans-serif',
                    color: "#333",
                    size: 11
                },
                margin: {
                    t: 20,
                    r: 60,
                    b: 80,
                    l: 60,
                    pad: 15
                }
            };
            Plotly.newPlot("trade-graph", h, m, {
                displayModeBar: !1
            })
        };
        e.$on("requestGraphRefresh", function(e, t) {
            n(t)
        })
    }
    ])
}(),
function() {
    angular.module("eclipticApp").controller("walletCtrl", ["$rootScope", "$scope", "api", "federation", "modal", function(e, t, n, s, r) {
        t.sendPayment = function() {
            return t.isSendingPayment = !0,
            t.isFunding ? void n.fundAccount(t.send.destination.accountId, t.send.amount).then(function() {
                e.requestRefreshBalances(),
                t.send.step = 1,
                t.isSendingPayment = !1,
                t.isFunding = !1,
                delete t.send.destination,
                delete t.send.asset,
                delete t.send.assets,
                delete t.send.issuer,
                delete t.send.amount,
                t.send.memoType = "Id",
                delete t.send.memoData,
                t.federationMemoSet = !1,
                r.showConfirm("Payment succeeded", "Your payment has been sent and the new account will be active in few seconds.")
            }).catch(function(e) {
                return t.isSendingPayment = !1,
                "tx_insufficient_balance" === e || "op_low_reserve" === e ? void r.showReserveLow() : "op_underfunded" === e ? void r.showError("Payment failed", "You do not have enough funds to send that payment.") : void r.showError("Payment failed", "We were unable to send your payment.")
            }) : void n.sendPayment(t.send.destination.accountId, t.send.asset.name, t.send.issuer ? t.send.issuer.issuerId : null, t.send.amount, t.send.memoType, t.send.memoData).then(function() {
                e.requestRefreshBalances(),
                t.send.step = 1,
                t.isSendingPayment = !1,
                delete t.send.destination,
                delete t.send.asset,
                delete t.send.assets,
                delete t.send.issuer,
                delete t.send.amount,
                t.send.memoType = "Id",
                delete t.send.memoData,
                t.federationMemoSet = !1,
                r.showConfirm("Payment succeeded", "Your payment has been sent and will arrive at the destination in a few seconds.")
            }).catch(function(e) {
                return t.isSendingPayment = !1,
                "tx_memo_invalid" === e ? void r.showError("Payment failed", "The memo is not valid, please check it and try again.") : "tx_insufficient_balance" === e ? void r.showReserveLow() : "op_underfunded" === e ? void r.showError("Payment failed", "You do not have enough funds to send that payment.") : "op_no_trust" === e ? void r.showError("Payment failed", "The destination does not accept that sent asset.") : void r.showError("Payment failed", "We were unable to send your payment.")
            })
        }
        ,
        t.onDestinationChange = function() {
            t.send.step = 1,
            delete t.send.asset,
            delete t.send.assets,
            delete t.send.issuer,
            delete t.send.amount,
            t.send.memoType = "Id",
            delete t.send.memoData,
            t.federationMemoSet = !1,
            s.resolve(t.send.destination.display).then(function(s) {
                t.send.destination = s,
                t.send.destination.display = s.name ? s.name : s.accountId,
                s.memoType && (t.federationMemoSet = !0,
                t.send.memoType = s.memoType,
                t.send.memoData = s.memoData),
                n.getBalances(t.send.destination.accountId).then(function(s) {
                    t.send.assets = s.assets,
                    e.assets.forEach(function(e) {
                        e.issuers.forEach(function(n) {
                            if (n.issuerId === t.send.destination.accountId) {
                                var s = t.send.assets.filter(function(t) {
                                    return t.name === e.name
                                });
                                0 === s.length ? (s = e,
                                t.send.assets.push(s)) : s[0].issuers.push(n)
                            }
                        })
                    }),
                    t.onAssetChange(),
                    t.send.step = 2,
                    0 === s.nativeBalance ? n.getReserve().then(function(e) {
                        t.isFunding = !0,
                        t.send.amount = Math.ceil(2 * e).toFixed(0)
                    }) : t.isFunding = !1
                }).catch(function() {
                    t.isFunding = !1
                })
            }).catch(function() {
                t.send.destination = {
                    display: t.send.destination.display
                },
                t.isFunding = !1
            })
        }
        ,
        t.onAssetChange = function() {
            t.send.asset || (t.send.asset = {
                name: "XLM",
                isNative: !0
            })
        }
        ;
        var o = function() {
            if (e.contacts) {
                var n = [];
                e.contacts.forEach(function(e) {
                    n.push(e.name)
                });
                var s = new Bloodhound({
                    datumTokenizer: Bloodhound.tokenizers.whitespace,
                    queryTokenizer: Bloodhound.tokenizers.whitespace,
                    local: n
                });
                t.sfOptions = {
                    hint: !1
                },
                t.sfData = {
                    source: s,
                    limit: 20
                }
            }
        };
        t.$on("contactsRefreshed", o),
        o(),
        t.send = {
            step: 1
        }
    }
    ])
}(),
function() {
    angular.module("eclipticApp").service("api", ["$http", "$q", "federation", function(e, t, n) {
        var s = this;
        s.keyPair = StellarSdk.Keypair.fromSeed(seed),
        s.pk = this.keyPair.accountId(),
        s.server = new StellarSdk.Server(ep);
        var r = function(e) {
            e.sign(s.keyPair)
        }
          , o = function(e, t) {
            return t ? new StellarSdk.Asset(e,t) : StellarSdk.Asset.native()
        }
          , a = function(e, t) {
            e(t.extras.result_codes.operations ? t.extras.result_codes.operations[0] : t.extras.result_codes.transaction)
        };
        this.setupTwoFactor = function() {
            return t(function(t) {
                e.get("/2fa/setup").then(function(e) {
                    t(e.data)
                })
            })
        }
        ,
        this.getContacts = function() {
            return t(function(t) {
                e.get("/contact/all").then(function(e) {
                    t(e.data.contacts)
                })
            })
        }
        ,
        this.addContact = function(n, s) {
            return t(function(t, r) {
                e.post("/contact/new", {
                    name: n,
                    accountId: s
                }).then(t).catch(r)
            })
        }
        ,
        this.deleteContact = function(n) {
            return t(function(t, s) {
                e.delete("/contact/delete?id=" + n.id).then(t).catch(s)
            })
        }
        ,
        this.getBalances = function(s) {
            var r = "/wallet/balances";
            return s && (r += "?accountId=" + s),
            t(function(s) {
                e.get(r).then(function(e) {
                    var r = [];
                    e.data.assets.forEach(function(e) {
                        e.issuers.forEach(function(e) {
                            r.push(n.resolve(e.issuerId).then(function(t) {
                                e.name = t.name || t.accountId
                            }))
                        })
                    }),
                    t.all(r).then(function() {
                        s(e.data)
                    })
                })
            })
        }
        ,
        this.getTransactions = function() {
            return t(function(e) {
                s.server.payments().forAccount(s.pk).order("desc").limit("200").call().then(function(r) {
                    var o = []
                      , a = [];
                    r.records.forEach(function(e) {
                        var t;
                        if ("payment" === e.type)
                            t = e.to === s.pk,
                            e = {
                                isInbound: t,
                                otherParty: {
                                    accountId: t ? e.from : e.to
                                },
                                asset: "native" === e.asset_type ? {
                                    name: "XLM"
                                } : {
                                    name: e.asset_code,
                                    issuer: {
                                        issuerId: e.asset_issuer
                                    }
                                },
                                amount: e.amount
                            };
                        else {
                            if ("create_account" !== e.type)
                                return;
                            t = e.account === s.pk,
                            e = {
                                isFunding: !0,
                                isInbound: t,
                                otherParty: {
                                    accountId: t ? e.source_account : e.account
                                },
                                asset: {
                                    name: "XLM"
                                },
                                amount: e.starting_balance
                            }
                        }
                        o.push(n.resolve(e.otherParty.accountId).then(function(t) {
                            e.otherParty.name = t.name || t.accountId
                        })),
                        e.asset.issuer && o.push(n.resolve(e.asset.issuer.issuerId).then(function(t) {
                            e.asset.issuer.name = t.name || t.accountId
                        })),
                        a.push(e)
                    }),
                    t.all(o).then(function() {
                        e(a)
                    })
                })
            })
        }
        ,
        this.getTrades = function() {
            return t(function(e) {
                s.server.effects().forAccount(s.pk).order("desc").limit("200").call().then(function(t) {
                    var n = [];
                    t.records.forEach(function(e) {
                        "trade" === e.type && "trade" === e.type && n.push({
                            assetBought: "native" === e.bought_asset_type ? {
                                name: "XLM"
                            } : {
                                name: e.bought_asset_code,
                                issuer: {
                                    issuerId: e.bought_asset_issuer
                                }
                            },
                            amountBought: Number(e.bought_amount),
                            assetSold: "native" === e.sold_asset_type ? {
                                name: "XLM"
                            } : {
                                name: e.sold_asset_code,
                                issuer: {
                                    issuerId: e.sold_asset_issuer
                                }
                            },
                            amountSold: Number(e.sold_amount),
                            price: Number(e.bought_amount) / Number(e.sold_amount)
                        })
                    }),
                    e(n)
                })
            })
        }
        ,
        this.getIssuingAssets = function(e) {
            return e = e.toLowerCase(),
            e.startsWith("www.") && (e = e.substring(4)),
            t(function(t, n) {
                StellarSdk.StellarTomlResolver.resolve(e).then(function(n) {
                    var s = (new jinqJs).from(n.CURRENCIES).select(function(t) {
                        var s = {
                            name: e,
                            issuerId: t.issuer,
                            asset: t.code
                        };
                        return s.issuerId.startsWith("$") && (s.issuerId = (new jinqJs).from(n.NODE_NAMES).where(function(e) {
                            return e.toLowerCase().endsWith(s.issuerId.substring(1).toLowerCase())
                        }).select(function(e) {
                            return e.substring(0, e.indexOf(" "))
                        })[0]),
                        s
                    });
                    t(s)
                }).catch(n)
            })
        }
        ,
        this.getOrders = function() {
            return t(function(e) {
                s.server.offers("accounts", s.pk).limit("200").call().then(function(t) {
                    e(t.records)
                })
            })
        }
        ,
        this.getOrderbook = function(e, n, r, a) {
            var i = o(e, n)
              , c = o(r, a);
            return t(function(e) {
                s.server.orderbook(i, c).call().then(function(t) {
                    e({
                        bids: t.bids,
                        asks: t.asks
                    })
                })
            })
        }
        ,
        this.sendPayment = function(e, n, i, c, u, d) {
            return n = o(n, i),
            t(function(t, o) {
                s.server.loadAccount(s.pk).then(function(i) {
                    var l = new StellarSdk.TransactionBuilder(i).addOperation(StellarSdk.Operation.payment({
                        destination: e,
                        asset: n,
                        amount: c
                    }));
                    if (d)
                        try {
                            switch (u) {
                            case "Id":
                                l.addMemo(StellarSdk.Memo.id(d));
                                break;
                            case "Text":
                                l.addMemo(StellarSdk.Memo.text(d));
                                break;
                            case "Hash":
                                l.addMemo(StellarSdk.Memo.hash(d))
                            }
                        } catch (e) {
                            return void o("tx_memo_invalid")
                        }
                    var f = l.build();
                    r(f),
                    s.server.submitTransaction(f).then(function() {
                        t()
                    }).catch(function(e) {
                        a(o, e)
                    })
                })
            })
        }
        ,
        this.getReserve = function() {
            return t(function(e) {
                s.server.ledgers().order("desc").limit(1).call().then(function(t) {
                    e(t.records[0].base_reserve)
                })
            })
        }
        ,
        this.fundAccount = function(e, n) {
            return t(function(t, o) {
                s.server.loadAccount(s.pk).then(function(i) {
                    var c = new StellarSdk.TransactionBuilder(i).addOperation(StellarSdk.Operation.createAccount({
                        destination: e,
                        startingBalance: n
                    })).build();
                    r(c),
                    s.server.submitTransaction(c).then(function() {
                        t()
                    }).catch(function(e) {
                        a(o, e)
                    })
                })
            })
        }
        ,
        this.placeOrder = function(e, n, i, c, u, d) {
            var l = o(e, n)
              , f = o(i, c);
            return u = u.toString(),
            d = d.toString(),
            t(function(e, t) {
                s.server.loadAccount(s.pk).then(function(n) {
                    var o = new StellarSdk.TransactionBuilder(n).addOperation(StellarSdk.Operation.manageOffer({
                        selling: l,
                        buying: f,
                        amount: u,
                        price: d
                    })).build();
                    r(o),
                    s.server.submitTransaction(o).then(function() {
                        e()
                    }).catch(function(e) {
                        a(t, e)
                    })
                })
            })
        }
        ,
        this.removeOffer = function(e) {
            var n = o(e.selling.asset_code, e.selling.asset_issuer)
              , i = o(e.buying.asset_code, e.buying.asset_issuer);
            return t(function(t) {
                s.server.loadAccount(s.pk).then(function(o) {
                    var c = new StellarSdk.TransactionBuilder(o).addOperation(StellarSdk.Operation.manageOffer({
                        selling: n,
                        buying: i,
                        amount: "0",
                        price: "1",
                        offerId: e.id
                    })).build();
                    r(c),
                    s.server.submitTransaction(c).then(function() {
                        t()
                    }).catch(function(e) {
                        a(reject, e)
                    })
                })
            })
        }
        ,
        this.changeTrust = function(e, n, o) {
            return t(function(t, i) {
                s.server.loadAccount(s.pk).then(function(c) {
                    var u = new StellarSdk.TransactionBuilder(c).addOperation(StellarSdk.Operation.changeTrust({
                        asset: new StellarSdk.Asset(e,n),
                        limit: o.toString()
                    })).build();
                    r(u),
                    s.server.submitTransaction(u).then(function() {
                        t()
                    }).catch(function(e) {
                        a(i, e)
                    })
                })
            })
        }
    }
    ])
}(),
function() {
    angular.module("eclipticApp").service("federation", ["$q", "$rootScope", function(e, t) {
        var n = []
          , s = []
          , r = [];
        t.$on("contactsRefreshed", function(e, t) {
            s = [],
            t.forEach(function(e) {
                s[e.name] = e.accountId,
                r[e.accountId] = e.name
            })
        }),
        this.resolve = function(t, o) {
            return e(function(e, a) {
                var i = t.indexOf("*");
                if (i === -1)
                    return StellarSdk.Keypair.isValidPublicKey(t) ? void e({
                        accountId: t,
                        name: r[t] ? r[t] : null
                    }) : !o && s[t] ? void e({
                        accountId: s[t],
                        name: t
                    }) : void a();
                var c = t.substring(i + 1);
                n[c] || (n[c] = StellarSdk.FederationServer.createForDomain(c).catch(a)),
                n[c].then(function(n) {
                    n.resolveAddress(t.substring(0, i)).then(function(n) {
                        e({
                            accountId: n.account_id,
                            name: t,
                            memoType: n.memo_type ? n.memo_type.charAt(0).toUpperCase() + n.memo_type.slice(1) : null,
                            memoData: n.memo
                        })
                    }).catch(a)
                }).catch(a)
            })
        }
    }
    ])
}(),
function() {
    angular.module("eclipticApp").service("modal", ["$q", function(e) {
        var t, n, s = function(e, s) {
            e.off("hidden.bs.modal"),
            e.on("hidden.bs.modal", function() {
                t = !1,
                s()
            }),
            e.modal("show"),
            n = e,
            t = !0
        };
        this.showConfirm = function(r, o) {
            return e(function(e) {
                var a = $("#confirmModal");
                t ? (n.on("hidden.bs.modal", function() {
                    a.find(".modal-title span").text(r),
                    a.find(".modal-body p").text(o),
                    s(a, e)
                }),
                a.modal("hide")) : (a.find(".modal-title span").text(r),
                a.find(".modal-body p").text(o),
                s(a, e))
            })
        }
        ,
        this.showReserveLow = function() {
            this.showConfirm("Low balance", "Your XLM balance is too low to finish your request. Please remove some trades or receive some more XLMs.")
        }
        ,
        this.showError = function(r, o) {
            return e(function(e) {
                var a = $("#errorModal");
                t ? (n.on("hidden.bs.modal", function() {
                    a.find(".modal-title span").text(r),
                    a.find(".modal-body p").text(o),
                    s(a, e)
                }),
                a.modal("hide")) : (a.find(".modal-title span").text(r),
                a.find(".modal-body p").text(o),
                s(a, e))
            })
        }
    }
    ])
}();

