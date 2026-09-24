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

  // Apunta directamente a la nube de Vercel
  const targetUrl = process.env.APP_URL 
    ? `${process.env.APP_URL}/admin` 
    : 'https://control-roll-uk3d-pi.vercel.app/admin';

  win.loadURL(targetUrl);
  win.on('closed', () => { win = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});