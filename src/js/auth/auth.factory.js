myApp.factory('AuthenticationFactory', function($window) {
  return {
    isLogged: function() {
    	if ($window.sessionStorage.token && $window.sessionStorage.user || $window.sessionStorage.userBlob) {
            return true;
        } else {
            delete this.user;
            delete this.userBlob;
            return false;
        }
    }
  };
});

myApp.factory('UserAuthFactory', function($window, $location, $http, AuthenticationFactory, BlobFactory) {
  return {
    logout: function() {
      if (AuthenticationFactory.isLogged()) {
        delete AuthenticationFactory.user;
        delete AuthenticationFactory.userBlob;

        delete $window.sessionStorage.token;
        delete $window.sessionStorage.user;
        delete $window.sessionStorage.userBlob;

        $location.path("/login");
      }
    },
    register: function(opts, callback){
    	var options = {
            'account': opts.account,
            'password': opts.password,
            'masterkey': opts.masterkey,
            'walletfile': opts.walletfile
        };
    	BlobFactory.create(options, function (err, blob) {
    		if (err) {
            	return callback(err);
            }
            console.log("UserAuthFactory: registration succeeded", blob);
            callback(null, blob, 'local');
    	});
    },
    openfile: function(walletfile, password, callback) {
    	BlobFactory.init(walletfile, password, function (err, blob) {
          if (err) {
            callback(err);
            return;
          }
          console.log("client: authflow: login succeeded", blob);
          callback(null, blob);
        });
    }
  }
});

myApp.factory('TokenInterceptor', function($q, $window) {
  return {
    request: function(config) {
      config.headers = config.headers || {};
      if ($window.sessionStorage.token) {
        config.headers['X-Access-Token'] = $window.sessionStorage.token;
        config.headers['X-Key'] = $window.sessionStorage.user;
        config.headers['Content-Type'] = "application/json";
      }
      //console.log('TokenInterceptor:request', config);
      return config || $q.when(config);
    },

    response: function(response) {
      return response || $q.when(response);
    }
  };
});

myApp.factory('FileDialog', ['$rootScope', function($scope) {
	var callDialog = function(dialog, callback) {
		dialog.addEventListener('change', function() {
			var result = dialog.value;
			callback(result);
		}, false);
		dialog.click();
	};

	var dialogs = {};

	dialogs.saveAs = function(callback, defaultFilename, acceptTypes) {
		var dialog = document.createElement('input');
		dialog.type = 'file';
		dialog.nwsaveas = defaultFilename || '';
		if (angular.isArray(acceptTypes)) {
			dialog.accept = acceptTypes.join(',');
		} else if (angular.isString(acceptTypes)) {
			dialog.accept = acceptTypes;
		}
		callDialog(dialog, callback);
	};

	dialogs.openFile = function(callback, multiple, acceptTypes) {
		var dialog = document.createElement('input');
		dialog.type = 'file';
		if (multiple === true) {
			dialog.multiple = 'multiple';
		}
		if (angular.isArray(acceptTypes)) {
			dialog.accept = acceptTypes.join(',');
		} else if (angular.isString(acceptTypes)) {
			dialog.accept = acceptTypes;
		}
		callDialog(dialog, callback);
	};

	dialogs.openDir = function(callback) {
		var dialog = document.createElement('input');
		dialog.type = 'file';
		dialog.nwdirectory = 'nwdirectory';
		callDialog(dialog, callback);
	};

	return dialogs;
} ]);
