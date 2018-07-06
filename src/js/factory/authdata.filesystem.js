/* global ipcRenderer, myApp */


myApp.factory('AuthDataFilesystemRouter', ['$window', 'AuthData', 'AuthDataFilesystemV1',
                                  function( $window ,  AuthData ,  AuthDataFilesystemV1 ){

  /* class AuthDataFilesystem
   *
   * Do not create directly because that's async, use static method `AuthDataFilesystem.create(opts, cb)`.
   */

  class AuthDataFilesystemRouter /* extends AuthData */ {

    constructor(){
      throw new Error('AuthDataFilesystem should not be instantized itself, but delegate to one of versions.')
    }

    // create(opts:Map<string, any>) => Promise<AuthDataFilesystem> -- create in filesystem and return Promise of instance.
    static async create(opts) {
      // Create newest version by default.
      return AuthDataFilesystemV1.create(opts);
    }

    // restore() => AuthDataFilesystem -- restore from sessionStorage and return instance.
    static restore() {
      if(!$window.sessionStorage[AuthData.SESSION_KEY]) throw new Error('No authdata in session.');
      try {
        const {version, password, path, blob} = JSON.parse($window.sessionStorage[AuthData.SESSION_KEY]);
        const AuthDataFilesystem = AuthDataFilesystem.VERSION_CLASS[version];

        if(!AuthDataFilesystem) throw new Error(`Unsupported version ${version}`)

        return AuthDataFilesystem.fromBlob(password, path, blob);
      } catch(e) {
        const errorMsg = `File wallet in session is corrupted, cleaned up!\n${$window.sessionStorage[AuthData.SESSION_KEY]}\n${e}`;
        delete $window.sessionStorage[AuthData.SESSION_KEY];
        throw new Error(errorMsg)
      }
    }

    // load(...params:any[]) => Promise<AuthDataFilesystem> -- load from filesystem and return Promise of instance.
    static async load(opts) {
      // Try, starting with newest version.
      const AuthDataFileSystems = Object.values(AuthDataFilesystemRouter.VERSION_CLASS);
      let authDataFileSystem;
      for(const AuthDataFileSystem of AuthDataFileSystems) {
        try {
          authDataFileSystem = await AuthDataFileSystem.load(opts);
        } catch(e) {
          console.info(`Failed to load file with version ${AuthDataFileSystem.VERSION}`);
        }
        if(authDataFileSystem) break;
      }
      if(!authDataFileSystem) throw new Error(`Failed to load file with any version.`)

      return authDataFileSystem;
    }

  }
  AuthDataFilesystemRouter.VERSION_CLASS = {
    1: AuthDataFilesystemV1,
  }


  return AuthDataFilesystemRouter;

}]);
