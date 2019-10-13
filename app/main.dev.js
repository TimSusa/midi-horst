/* eslint global-require: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 * @flow
 */
import localtunnel from 'localtunnel';
import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

// Helpers
import os from 'os';
import path from 'path';
import url from 'url';
import MenuBuilder from './menu';

let webServer = null;
let shuttingDown = null;

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', async () => {
  console.log('READY!');
  shuttingDown = false;
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728
  });

  mainWindow.loadURL(`file://${__dirname}/app.html`);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
    startExpress();
    // (async () => {
    //   const tunnel = await localtunnel({ port: 3000 });

    //   // the assigned public url for your tunnel
    //   // i.e. https://abcdefgjhij.localtunnel.me
    //   console.log('URL: ', tunnel.url);

    //   tunnel.on('close', () => {
    //     // tunnels are closed
    //   });
    // })();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
});

// Called before quitting...gives us an opportunity to shutdown the child process
app.on('before-quit', function() {
  log.info('gracefully shutting down...');

  // Need this to make sure we don't kick things off again in the child process
  shuttingDown = true;

  // Kill the web process
  webServer && webServer.kill && webServer.kill();
});
function startExpress() {
  // Create the path of the express server to pass in with the spawn call
  //const webServerDirectory = path.join(__dirname, 'http', 'bin', 'start-child-process');

  // const nodePath = '/usr/local/bin/node';
  // if (process.platform === 'win32') {
  //   // Overwrite with the windows path...only testing on mac currently
  // }

  // Optionally update environment variables used
  //const env = JSON.parse(JSON.stringify(process.env));

  // Start the node express server
  // const { spawn } = require('child_process');
  // webServer = spawn(nodePath, [webServerDirectory], {
  //   env: process.env
  // });
  require('./http/bin/start-child-process.js');
  log.info('loading: http/bin/start-child-process.js');

  // Were we successful?
  // if (!webServer) {
  //   log.info("couldn't start web server");
  //   return;
  // }

  // // Handle standard out data from the child process
  // webServer.stdout.on('data', function(data) {
  //   log.info(`data: ${data}`);
  // });

  // // Triggered when a child process uses process.send() to send messages.
  // webServer.on('message', function(message) {
  //   log.info(message);
  // });

  // // Handle closing of the child process
  // webServer.on('close', function(code) {
  //   log.info(`child process exited with code ${code}`);
  //   webServer = null;

  //   // Only restart if killed for a reason...
  //   if (!shuttingDown) {
  //     log.info('restarting...');
  //     startExpress();
  //   }
  // });

  // // Handle the stream for the child process stderr
  // webServer.stderr.on('data', function(data) {
  //   log.info(`stderr: ${data}`);
  // });

  // // Occurs when:
  // // The process could not be spawned, or
  // // The process could not be killed, or
  // // Sending a message to the child process failed.
  // webServer.on('error', function(err) {
  //   log.info(`web server error: ${err}`);
  // });
}
