/**
 * Strata IDE - Preload Script
 * Securely expose IPC to renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // Project management
  project: {
    create: (name: string, options: any) => ipcRenderer.invoke('project:create', name, options),
    open: (path: string) => ipcRenderer.invoke('project:open', path),
    list: () => ipcRenderer.invoke('project:list'),
    get: (id: string) => ipcRenderer.invoke('project:get', id),
    save: (id: string) => ipcRenderer.invoke('project:save', id)
  },

  // File management
  file: {
    add: (projectId: string, path: string, content: string) => 
      ipcRenderer.invoke('file:add', projectId, path, content),
    update: (projectId: string, path: string, content: string) => 
      ipcRenderer.invoke('file:update', projectId, path, content),
    delete: (projectId: string, path: string) => 
      ipcRenderer.invoke('file:delete', projectId, path),
    list: (projectId: string) => ipcRenderer.invoke('file:list', projectId)
  },

  // Build operations
  build: {
    compile: (projectPath: string, options: any) => 
      ipcRenderer.invoke('build:compile', projectPath, options),
    typecheck: (sourceFile: string) => 
      ipcRenderer.invoke('build:typecheck', sourceFile),
    analyze: (sourceFile: string) => 
      ipcRenderer.invoke('build:analyze', sourceFile)
  },

  // Runtime operations
  run: {
    execute: (projectPath: string, options: any) => 
      ipcRenderer.invoke('run:execute', projectPath, options),
    file: (sourceFile: string, runtimeOptions: any, buildOptions: any) => 
      ipcRenderer.invoke('run:file', sourceFile, runtimeOptions, buildOptions)
  },

  // Events
  on: (channel: string, callback: (event: any, data: any) => void) => {
    ipcRenderer.on(channel, callback);
  },

  // Menu events
  onMenuEvent: (event: string, callback: () => void) => {
    ipcRenderer.on(`menu:${event}`, callback);
  }
};

contextBridge.exposeInMainWorld('strataSDK', api);

declare global {
  interface Window {
    strataSDK: typeof api;
  }
}
