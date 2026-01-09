/**
 * Strata IDE - Electron Main Process
 * Desktop IDE for Strata development
 */

import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { StrataRunner } from '../runner/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | null = null;
const runner = new StrataRunner();

app.on('ready', createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../../dist-gui/index.html'));
  mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  setupMenu();
  setupIPC();
}

function setupMenu() {
  const template: any[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New Project', click: () => mainWindow?.webContents.send('menu:new-project') },
        { label: 'Open Project', click: () => mainWindow?.webContents.send('menu:open-project') },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => mainWindow?.webContents.send('menu:save') },
        { type: 'separator' },
        { label: 'Exit', role: 'quit' }
      ]
    },
    {
      label: 'Build',
      submenu: [
        { label: 'Build', accelerator: 'CmdOrCtrl+Shift+B', click: () => mainWindow?.webContents.send('menu:build') },
        { label: 'Run', accelerator: 'F5', click: () => mainWindow?.webContents.send('menu:run') },
        { label: 'Stop', click: () => mainWindow?.webContents.send('menu:stop') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function setupIPC() {
  // Project operations
  ipcMain.handle('project:create', async (_event, name: string, options: any) => {
    const pm = runner.getProjectManager();
    return pm.createProject(name, options);
  });

  ipcMain.handle('project:open', async (_event, projectPath: string) => {
    const pm = runner.getProjectManager();
    return pm.openProject(projectPath);
  });

  ipcMain.handle('project:list', async () => {
    const pm = runner.getProjectManager();
    return pm.listProjects();
  });

  ipcMain.handle('project:get', async (_event, projectId: string) => {
    const pm = runner.getProjectManager();
    return pm.getProject(projectId);
  });

  ipcMain.handle('project:save', async (_event, projectId: string) => {
    const pm = runner.getProjectManager();
    return pm.saveProject(projectId);
  });

  // File operations
  ipcMain.handle('file:add', async (_event, projectId: string, filePath: string, content: string) => {
    const pm = runner.getProjectManager();
    return pm.addFile(projectId, filePath, content);
  });

  ipcMain.handle('file:update', async (_event, projectId: string, filePath: string, content: string) => {
    const pm = runner.getProjectManager();
    return pm.updateFile(projectId, filePath, content);
  });

  ipcMain.handle('file:delete', async (_event, projectId: string, filePath: string) => {
    const pm = runner.getProjectManager();
    return pm.deleteFile(projectId, filePath);
  });

  ipcMain.handle('file:list', async (_event, projectId: string) => {
    const pm = runner.getProjectManager();
    return pm.getProjectFiles(projectId);
  });

  // Build operations
  ipcMain.handle('build:compile', async (_event, projectPath: string, options: any) => {
    return runner.buildProject(projectPath, options);
  });

  ipcMain.handle('build:typecheck', async (_event, sourceFile: string) => {
    return runner.typeCheck(sourceFile);
  });

  ipcMain.handle('build:analyze', async (_event, sourceFile: string) => {
    return runner.analyze(sourceFile);
  });

  // Runtime operations
  ipcMain.handle('run:execute', async (_event, projectPath: string, runtimeOptions: any) => {
    return runner.runProject(projectPath, runtimeOptions);
  });

  ipcMain.handle('run:file', async (_event, sourceFile: string, runtimeOptions: any, buildOptions: any) => {
    return runner.run(sourceFile, runtimeOptions, buildOptions);
  });

  // Listen for runner events
  runner.on('compile', (event) => {
    mainWindow?.webContents.send('runner:compile', event);
  });

  runner.on('runtime', (event) => {
    mainWindow?.webContents.send('runner:runtime', event);
  });

  runner.on('projectCreated', (event) => {
    mainWindow?.webContents.send('runner:projectCreated', event);
  });
}
