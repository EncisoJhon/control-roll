const { app, BrowserWindow } = require('electron');
const path = require('path');

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1366,
    height: 850,
    title: 'Multiservicios Inmutec Control Roll Admin',
    icon: path.join(__dirname, 'public/logo-inmutec.png'),
    autoHideMenuBar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const targetUrl = 'https://control-roll-uk3d-pi.vercel.app/admin';

  win.loadURL(targetUrl);

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Error al cargar:', errorCode, errorDescription);
    win.loadURL(`data:text/html,<h2>Error al conectar a la nube</h2><p>${errorDescription} (${errorCode})</p>`);
  });

  win.on('closed', () => { win = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});