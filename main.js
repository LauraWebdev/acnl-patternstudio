const { app, BrowserWindow } = require('electron');

function createWindow () {
  const win = new BrowserWindow({
    width: 1300,
    height: 700,
    minHeight: 590,
    minWidth: 840,
    webPreferences: {
      nodeIntegration: true
    }
  });

  win.loadFile('./src/app.htm');

  win.webContents.openDevTools();
  win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});