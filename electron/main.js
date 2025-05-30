const path = require('path');
const { app, BrowserWindow } = require('electron');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.setAspectRatio(800 / 600); // Lock aspect ratio (e.g., 4:3)

  // Dynamically build the full path to index.html
  const indexPath = path.join(__dirname, '../dist/line2025/browser/index.html');

  // Load it using a file URL
  mainWindow.loadFile(indexPath);

  // Optional: Open DevTools automatically
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});