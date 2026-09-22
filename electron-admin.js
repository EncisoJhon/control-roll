const { app, BrowserWindow } = require('electron');

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1366,
    height: 850,
    title: 'Control Roll — Consola Administrativa',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Apunta a la vista administrativa
  const targetUrl = process.env.APP_URL 
    ? `${process.env.APP_URL}/admin` 
    : 'http://localhost:3000/admin';

  win.loadURL(targetUrl);
  win.on('closed', () => { win = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});