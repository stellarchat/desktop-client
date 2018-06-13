/* global myApp */
'use strict';


myApp.factory('AuthDataInmemory', ['$window', 'AuthData', function ($window, AuthData){

  /* class BlobObj
   *
   * Do not create directly because that's async, use static method `BlobObj.create(opts, cb)`.
   */
  return class AuthDataInmemory extends AuthData {
    constructor(data){
      super(data.address, data.secrets, data.contacts);
    }

    // create(opts:Map<string, any>) => Promise<AuthDataInmemory> -- create and return Promise of instance.
    static create(opts) {
      const authData = new AuthDataInmemory({address: opts.address, secrets: [], contacts: []});

      return authData.save();
    }

    // restore() => AuthDataInmemory -- restore from sessionStorage and return instance.
    static restore() {
      if(!$window.sessionStorage[AuthData.SESSION_KEY]) throw new Error('No authdata in session.');
      try {
        return new AuthDataInmemory(JSON.parse($window.sessionStorage.authdata))
      } catch(e) {
        const errorMsg = `File wallet in session corrupted, cleaned up!\n${$window.sessionStorage[AuthData.SESSION_KEY]}\n${e}`;
        delete $window.sessionStorage[AuthData.SESSION_KEY];
        throw new Error(errorMsg)
      }
    }

    // load(...opts:any[]) => Promise<AuthDataInmemory> -- fake-load from sessionStorage and return Promise of instance.
    static load(opts) {
      console.log(opts)
      return AuthDataInmemory.create(opts)
    }

    // store() => AuthDataInmemory -- store in sessionStorage and return instance.
    store() {
      $window.sessionStorage[AuthData.SESSION_KEY] = JSON.stringify({
        address: this.address,
        contacts: this.contacts,
        secrets: this.secrets,
      });
      return this;
    }

    // save() => Promise<AuthDataInmemory> -- fake-save and return Promise of current instance.
    save() {
      return new Promise((resolve, reject) => {
        try {
          resolve(this.store());
        } catch(e) {
          reject(e)
        }
      })
    }

  }

}]);
