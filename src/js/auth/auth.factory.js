myApp.factory('AuthenticationFactory', function($window, BlobFactory) {
  return {
    isLogged: function() {
    	if ($window.sessionStorage.userBlob || $window.sessionStorage.blob) {
            return true;
        } else {
            delete this.blob;
            delete this.userBlob;
            delete this.password;
            delete this.walletfile;
            return false;
        }
    },
    setBlob: function(blob) {
    	this.blob       = blob;
    	this.userBlob   = JSON.stringify(blob.data);
    	this.password   = blob.password;
    	this.walletfile = blob.walletfile;
    	$window.sessionStorage.userBlob   = this.userBlob;
        $window.sessionStorage.password   = this.password;
        $window.sessionStorage.walletfile = this.walletfile;
    },
    getBlobFromSession: function(callback) {
    	var self = this;
    	self.userBlob   = $window.sessionStorage.userBlob;
    	self.password   = $window.sessionStorage.password;
    	self.walletfile = $window.sessionStorage.walletfile;
    	
    	BlobFactory.init(self.walletfile, self.password, function(err, blob){
    		console.log('Init blob from session', blob);
    		self.blob = blob;
    		self.userBlob = JSON.stringify(blob.data);
    		$window.sessionStorage.userBlob = self.userBlob;
    		
    		if (typeof callback === 'function') {
    	        callback(err, blob);
    	    }
    	});
    },
    addContact: function(contact, callback){
    	this.blob.unshift("/contacts", contact, callback);
    },
    updateContact: function(name, contact, callback){
    	this.blob.filter('/contacts', 'name', name, 'extend', '', contact, callback);
    },
    deleteContact: function(name, callback){
    	this.blob.filter('/contacts', 'name', name, 'unset', '', callback);
    },
    getContact: function(value) {
    	if (!value) return false;
    	var contacts = this.blob.data.contacts;
    	for (var i=0;i<contacts.length;i++) {
    		if (contacts[i].name === value || contacts[i].address === value) {
    			return contacts[i];
    		}
    	}
    	return false;
    }
  };
});

myApp.factory('UserAuthFactory', function($window, $location, $http, AuthenticationFactory, BlobFactory) {
  return {
    logout: function() {
      if (AuthenticationFactory.isLogged()) {
        delete AuthenticationFactory.blob;
        delete AuthenticationFactory.userBlob;
        delete AuthenticationFactory.password;
        delete AuthenticationFactory.walletfile;

        delete $window.sessionStorage.userBlob;
        delete $window.sessionStorage.password;
        delete $window.sessionStorage.walletfile;

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
