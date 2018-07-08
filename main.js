/*global __dirname, process, require */

(function () {
  'use strict'
  const fs = require('fs');
  const electron = require('electron')
  const app = electron.app
  const path = require('path')
  const os = require('os')
  const BrowserWindow = electron.BrowserWindow
  const Tray = electron.Tray
  const appName = app.getName()
  const appVersion = app.getVersion()
  const dataDir = app.getPath('userData') + path.sep
  const cacheDir = app.getPath('userCache') + path.sep
  const tempDir = app.getPath('temp') + path.sep
  const homeDir = app.getPath('home') + path.sep
  const hostname = os.hostname()
  const username = (process.platform === 'win32') ? process.env.USERNAME : process.env.USER

  const {HWW_API, KEYSTORE_API} = require('./src/common/constants')
  const {AuthDataFilesystemBackendV2} = require('./src/main/authdata.filesystem.v2')

  const HardwareWallet = require('./src/main/hardwareWalletLedger');
  const HardwareWalletLedger = HardwareWallet.Ledger;

  // report crashes to the Electron project
  // require('crash-reporter').start()
  // adds debug features like hotkeys for triggering dev tools and reload
  process.on('uncaughtException', onCrash)
  // add this switch for the notification window
  app.commandLine.appendSwitch('--enable-transparent-visuals')
  /**
   * createMainWindow - create main application window
   *
   * @return {type}  description
   */
  function createMainWindow () {
    var win = new BrowserWindow({
      width: 1280,
      height: 800,
      frame: true,
      minWidth: 800,
      minHeight: 600
    })
    win.loadURL('file://' + __dirname + '/src/index.html')
    win.on('closed', onClosed)
    win.webContents.on('crashed', onCrash)
    win.on('unresponsive', onCrash)
    return win
  }
  /**
   * onClosed - description
   *
   * @return {type}  description
   */
  function onClosed () {
    // deref the window
    // for multiple windows store them in an array
    mainWindow = null
  }
  /**
   * onCrash - description
   *
   * @param  {type} exc description
   * @return {type}     description
   */
  function onCrash (exc) {
    console.log(exc)
  }
  /**
   * handleStartupEvent function - description
   *
   * @return {type}  description
   */
  var handleStartupEvent = function () {
    if (process.platform !== 'win32') {
      return false
    }
    var cp = require('child_process')
    var path = require('path')
    var updateDotExe = path.resolve(path.dirname(process.execPath), '..', 'update.exe')
    var target = path.basename(process.execPath)
    var squirrelCommand = process.argv[1]
    switch (squirrelCommand) {
      case '--squirrel-install':
      case '--squirrel-updated':
      // Optionally do things such as:
      //
      // - Install desktop and start menu shortcuts
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus
      // create shortcuts
        cp.spawnSync(updateDotExe, ['--createShortcut', target], {
          detached: true
        })
        // Always quit when done
        app.quit()
        return true
      case '--squirrel-uninstall':
      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers
        cp.spawnSync(updateDotExe, ['--removeShortcut', target], {
          detached: true
        })
        // Always quit when done
        app.quit()
        return true
      case '--squirrel-obsolete':
        // This is called on the outgoing version of your app before
        // we update to the new version - it's the opposite of
        // --squirrel-updated
        app.quit()
        return true
    }
  }
  // check if we are being called by insaller routine
  if (handleStartupEvent()) {
    return
  }
  // prevent window being GC'd
  var mainWindow
  var trayIcon
  /**
   * activate function - description
   *
   * @return {type}  description
   */
  app.on('activate', function () {
    if (!mainWindow) {
      mainWindow = createMainWindow()
    }
  })
  /**
   * ready function - description
   *
   * @return {type}  description
   */
  app.on('ready', function () {
    mainWindow = createMainWindow();
    try {
      const isDev = require('electron-is-dev')
      if (isDev) {
        require('electron-debug')()
        const electronDevTools = require('electron-devtools-installer')
        electronDevTools.default(electronDevTools.ANGULARJS_BATARANG);
        Promise.resolve()
          .then(()=>require('devtron').install())
          .then(()=>console.log('Devtron installed'))
          .catch(()=>console.log('Devtron failed to install'));
      }
    } catch(e) {
      console.log(`Skipped dev dependencies`)
    }

    HardwareWalletLedger.listeners.push((...args) => mainWindow.webContents.send(HWW_API.LISTEN, ...args));
    HardwareWalletLedger.init();

  })
  /**
   * sysConfig function - description
   *
   * @return {type}  description
   */
  app.sysConfig = function () {
    return {
      app: {
        name: appName,
        version: appVersion,
        icon: path.join(__dirname, 'assets', 'boilerplate.png')
      },
      host: hostname,
      platform: process.platform,
      user: username,
      paths: {
        home: homeDir,
        temp: tempDir,
        data: dataDir,
        cache: cacheDir
      }
    }
  }
  /**
   * getMainWindow function - description
   *
   * @return {type}  description
   */
  app.getMainWindow = function () {
    return mainWindow
  }
  /**
   * close function - description
   *
   * @return {type}  description
   */
  app.close = function () {
    if (mainWindow) {
      mainWindow.close()
    }
    app.quit()
  }
  /**
   * toggleFullscreen function - description
   *
   * @return {type}  description
   */
  app.toggleFullscreen = function () {
    if (mainWindow) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen())
    }
  }
  /**
   * minimizeAppToSysTray function - description
   *
   * @return {type}  description
   */
  app.minimizeAppToSysTray = function () {
    trayIcon = new Tray(path.join(__dirname, 'assets', 'boilerplate_tray.png'))
    trayIcon.setToolTip('App is running in background mode.')
    trayIcon.on('click', () => {
      if (mainWindow) {
        mainWindow.show()
        trayIcon.destroy()
      }
    })
    if (mainWindow) {
      mainWindow.hide()
    }
  }


  const wrapIPC = (channel, routine, postCallback) => {
    electron.ipcMain.on(channel, async (event, reqId, ...args) => {
      console.log(`Request<${channel}/${reqId}> arguments:`, ...args)
      try {
        if(!reqId) throw new Error(`No request ID provided. Consider passing a random number.`)
        const res = await routine(...args);
        if(postCallback) await postCallback(res);
        event.sender.send(channel, reqId, null, res);
      } catch(err) {
        console.error(`Request<${channel}/${reqId}> error:`, err);
        event.sender.send(channel, reqId, `Request<${channel}/${reqId}> failed: ${err.message}`);
      }
    });
  }

  //// authdata.filesystem.v1 API

  wrapIPC('writeFile', (path, dataString) => {
    return fs.writeFileSync(path, dataString);
  })

  wrapIPC('readFile', (path) => {
    return fs.readFileSync(path, 'utf-8');
  })



  //// authdata.filesystem.v2 API

  let authData;

  wrapIPC(KEYSTORE_API.CREATE, async (opts) => {
    authData = await AuthDataFilesystemBackendV2.create(opts);
    return authData.toJSON();
  })

  wrapIPC(KEYSTORE_API.LOAD, async (opts) => {
    authData = await AuthDataFilesystemBackendV2.load(opts)
    return authData.toJSON();
  })

  wrapIPC(KEYSTORE_API.SAVE, async () => {
    await authData.save();
    return authData.toJSON();
  })

  wrapIPC(KEYSTORE_API.LOGOUT, async () => {
    authData = undefined;
    return;
  })

  wrapIPC(KEYSTORE_API.ADDCONTACT, async (contact) => {
    await authData.addContact(contact);
    return authData.toJSON().contacts;
  })

  wrapIPC(KEYSTORE_API.UPDATECONTACT, async (name, contact) => {
    await authData.updateContact(name, contact);
    return authData.toJSON().contacts;
  })

  wrapIPC(KEYSTORE_API.DELETECONTACT, async (name) => {
    await authData.deleteContact(name);
    return authData.toJSON().contacts;
  })


  //// Hardware Wallet API

  electron.ipcMain.on(HWW_API.SUPPORT, (event, reqId) => {
    HardwareWalletLedger.isSupported()
      .then((res) =>event.sender.send(HWW_API.SUPPORT, reqId, null, res))
      .catch((err)=>event.sender.send(HWW_API.SUPPORT, reqId, `Request<${HWW_API.SUPPORT}/${reqId}> failed: ${err.message}`))
  })

  electron.ipcMain.on(HWW_API.LIST, (event, id) => {
    event.sender.send(HWW_API.LIST, id, null, HardwareWalletLedger.list());
  })

  const wrapHwwMethod = (method, channel, callback) => {
    return wrapIPC(channel, async (hwwId, ...args) => {
      if(!hwwId) throw new Error(`No hardwallet ID provided. Consider using 'HWW_API.LIST'.`)

      const ledger = HardwareWalletLedger.listOfLedgers.get(hwwId);
      const res = await ledger[method](...args);
      if(callback) callback(res);
      return res;
    });
  };

  wrapHwwMethod('getAppConfig'      , HWW_API.CONFIG    /*, (res)=>console.log(res) || res */)
  wrapHwwMethod('selectSubaccount'  , HWW_API.SELECT    /*, (res)=>console.log(res) || res */)
  wrapHwwMethod('deselectSubaccount', HWW_API.DESELECT  /*, (res)=>console.log(res) || res */)
  wrapHwwMethod('getPublicKey'      , HWW_API.PK        /*, (res)=>console.log(res) || res */)
  wrapHwwMethod('signTe'            , HWW_API.SIGN_TE   /*, (res)=>console.log(res) || res */)
  wrapHwwMethod('signHash'          , HWW_API.SIGN_HASH /*, (res)=>console.log(res) || res */)

})()
