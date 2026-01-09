#!/usr/bin/env node
/**
 * Strata SDK - GUI Launcher
 * Launches the Electron IDE
 */

import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function launchGUI() {
  try {
    console.log('🚀 Launching Strata IDE...');

    // Path to the HTML file
    const htmlPath = path.join(__dirname, '..', 'gui-dist', 'index.html');

    // Check if HTML exists
    try {
      await fs.access(htmlPath);
    } catch {
      console.error('❌ GUI files not found at:', htmlPath);
      console.log('\nTo use the GUI, please ensure gui-dist/index.html exists.');
      console.log('You can use the CLI instead:');
      console.log('  strata-sdk new <project>');
      console.log('  strata-sdk run <file>');
      process.exit(1);
    }

    // Try to spawn Electron
    try {
      const electronPath = require.resolve('electron/dist/electron.exe');
      const mainPath = path.join(__dirname, 'electron-main.mjs');

      // Create electron-main.js if it doesn't exist
      const mainContent = `import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const htmlPath = path.join(__dirname, '..', 'gui-dist', 'index.html');
  if (fs.existsSync(htmlPath)) {
    mainWindow.loadFile(htmlPath);
  } else {
    mainWindow.loadURL('data:text/html,<h1>Strata IDE</h1><p>GUI files not found</p>');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Setup menu
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { label: 'Exit', role: 'quit' }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
`;

      await fs.writeFile(mainPath, mainContent, 'utf-8');

      console.log('✓ Electron main process created');

      // Spawn Electron
      const child = spawn(electronPath, [mainPath], {
        detached: true,
        stdio: 'inherit'
      });

      child.unref();
      console.log('✓ IDE launched!');
      console.log('\nKeyboard shortcuts:');
      console.log('  Ctrl+S - Save');
      console.log('  Ctrl+Shift+B - Build');
      console.log('  F5 - Run');

    } catch (err) {
      console.error('❌ Could not launch Electron:', (err as any).message);
      console.log('\nTroubleshooting:');
      console.log('1. Install electron: npm install electron');
      console.log('2. Make sure electron is installed globally or locally');
      console.log('3. Use CLI instead: strata-sdk run <file>');
      process.exit(1);
    }

  } catch (err) {
    console.error('❌ Error:', (err as any).message);
    process.exit(1);
  }
}

// Fallback for require
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

launchGUI();
