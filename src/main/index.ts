import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './windows/mainWindow';
import { registerAllHandlers } from './ipc';
import { initializeDatabase } from './services/database';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const initializeApp = async (): Promise<void> => {
  // Initialize database
  await initializeDatabase();

  // Register IPC handlers
  registerAllHandlers();

  // Create the main window
  mainWindow = createMainWindow();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', initializeApp);

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
  }
});
