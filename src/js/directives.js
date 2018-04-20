/* global myApp, StellarSdk */

myApp.directive('gateway', [ function() {
  return {
    restrict : 'E',
    templateUrl : 'directive/gateway.html',
    replace : true,
    scope : true,
    link : function(scope, element, attrs) {
      scope.__name = attrs.name;
      scope.__code = attrs.code;
      scope.__address = attrs.address;
      scope.__website = attrs.website;
      scope.__logo = attrs.logo;
    }
  }
} ]);

myApp.directive('txPayment', [ function() {
  return {
    restrict : 'E',
    templateUrl : 'directive/tx-payment.html',
    replace : true
  }
} ]);
myApp.directive('txPathPayment', [ function() {
  return {
    restrict : 'E',
    templateUrl : 'directive/tx-pathPayment.html',
    replace : true
  }
} ]);
myApp.directive('txTrust', [ function() {
  return {
    restrict : 'E',
    templateUrl : 'directive/tx-trust.html',
    replace : true
  }
} ]);
myApp.directive('txOffer', [ function() {
  return {
    restrict : 'E',
    templateUrl : 'directive/tx-offer.html',
    replace : true
  }
} ]);
myApp.directive('txOptions', [ function() {
  return {
    restrict : 'E',
    templateUrl : 'directive/tx-options.html',
    replace : true
  }
} ]);
myApp.directive('txData', [ function() {
  return {
    restrict : 'E',
    templateUrl : 'directive/tx-data.html',
    replace : true
  }
} ]);
myApp.directive('txInflation', [ function() {
  return {
    restrict : 'E',
    templateUrl : 'directive/tx-inflation.html',
    replace : true
  }
} ]);
myApp.directive('txBatch', [ function() {
  return {
    restrict : 'E',
    templateUrl : 'directive/tx-batch.html',
    replace : true
  }
} ]);
myApp.directive('txDefault', [ function() {
  return {
    restrict : 'E',
    templateUrl : 'directive/tx-default.html',
    replace : true
  }
} ]);


/**
 * A generic confirmation for risky actions. Usage: Add attributes:
 * ng-really-message="Are you sure"? ng-really-click="takeAction()" function
 */
myApp.directive('ngReallyClick', [function() {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      element.bind('click', function() {
        var message = attrs.ngReallyMessage;
        if (message && confirm(message)) {
          scope.$apply(attrs.ngReallyClick);
        }
      });
    }
  }
}]);

myApp.directive('masterKey', function() {
  return {
    restrict : 'A',
    require : '?ngModel',
    link : function(scope, elm, attr, ctrl) {
      if (!ctrl) return;

      var validator = function(value) {
        try{
          StellarSdk.Keypair.fromSecret(value);
        } catch(e) {
          ctrl.$setValidity('masterKey', false);
          return value;
        }
        ctrl.$setValidity('masterKey', true);
        return value;
      };

      ctrl.$formatters.push(validator);
      ctrl.$parsers.unshift(validator);

      attr.$observe('masterKey', function() {
        validator(ctrl.$viewValue);
      });
    }
  };
});

/**
 * <input type="password" name="password1" ng-model="password1" > <input
 * type="password" name="password2" ng-model="password2"
 * value-matches="password1">
 */
myApp.directive('valueMatches', ['$parse', function ($parse) {
  return {
    require: 'ngModel',
    link: function (scope, elm, attrs, ngModel) {
      var originalModel = $parse(attrs.valueMatches);
      var secondModel   = $parse(attrs.ngModel);
      // Watch for changes to this input
      scope.$watch(attrs.ngModel, function (newValue) {
        ngModel.$setValidity(attrs.name, newValue === originalModel(scope));
      });
      // Watch for changes to the value-matches model's value
      scope.$watch(attrs.valueMatches, function (newValue) {
        ngModel.$setValidity(attrs.name, newValue === secondModel(scope));
      });
    }
  };
}]);

myApp.directive('strongPassword', function () {
  return {
    restrict: 'A',
    require: '?ngModel',
    link: function (scope, elm, attr, ctrl) {
      if (!ctrl) return;

      var validator = function(password) {
        var score = 0;
        var username = ""+scope.username;

        if (!password) {
          scope.strength = '';
          return password;
        }

        // password < 6
        if (password.length < 6 ) {
          ctrl.$setValidity('strongPassword', false);
          scope.strength = 'weak';
          return;
        }

        // password == user name
        if (password.toLowerCase() === username.toLowerCase()) {
          ctrl.$setValidity('strongPassword', false);
          scope.strength = 'match';
          return;
        }

        const checkRepetition = function (pLen, str) {
          var res = "";
          for (var i = 0; i < str.length; i++ ) {
            var repeated = true;

            for (var j = 0; j < pLen && (j+i+pLen) < str.length; j++) {
              repeated = repeated && (str.charAt(j+i) === str.charAt(j+i+pLen));
            }
            if (j<pLen) {
              repeated = false;
            }

            if (repeated) {
              i += pLen-1;
              repeated = false;
            } else {
              res += str.charAt(i);
            }
          }
          return res;
        };

        // password length
        score += password.length * 4;
        score += ( checkRepetition(1, password).length - password.length ) * 1;
        score += ( checkRepetition(2, password).length - password.length ) * 1;
        score += ( checkRepetition(3, password).length - password.length ) * 1;
        score += ( checkRepetition(4, password).length - password.length ) * 1;

        // password has 3 numbers
        if (password.match(/(.*[0-9].*[0-9].*[0-9])/)) {
          score += 5;
        }

        // password has 2 symbols
        if (password.match(/(.*[!,@,#,$,%,&,*,?,_,~].*[!,@,#,$,%,&,*,?,_,~])/)) {
          score += 5;
        }

        // password has Upper and Lower chars
        if (password.match(/([a-z].*[A-Z])|([A-Z].*[a-z])/)){
          score += 10;
        }

        // password has number and chars
        if (password.match(/([a-zA-Z])/) && password.match(/([0-9])/)) {
          score += 15;
        }

        //password has number and symbol
        if (password.match(/([!,@,#,$,%,&,*,?,_,~])/) && password.match(/([0-9])/)) {
          score += 15;
        }

        // password has char and symbol
        if (password.match(/([!,@,#,$,%,&,*,?,_,~])/) && password.match(/([a-zA-Z])/)) {
          score += 15;
        }

        // password is just a numbers or chars
        if (password.match(/^\w+$/) || password.match(/^\d+$/) ) {
          score -= 10;
        }

        // verifying 0 < score < 100
        if (score < 0) { score = 0; }
        if (score > 100) { score = 100; }

        if (score < 34) {
          ctrl.$setValidity('strongPassword', false);
          scope.strength = 'weak';
          return;
        }

        ctrl.$setValidity('strongPassword', true);

        if (score < 68) {
          scope.strength = 'medium';
          return password;
        }

        scope.strength = 'strong';
        return password;
      };

      ctrl.$formatters.push(validator);
      ctrl.$parsers.unshift(validator);

      attr.$observe('strongPassword', function() {
        validator(ctrl.$viewValue);
      });
    }
  };
});

