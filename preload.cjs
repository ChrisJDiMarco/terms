const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('termsStore', {
  load: () => ipcRenderer.invoke('terms:load'),
  save: value => ipcRenderer.invoke('terms:save', value)
});
