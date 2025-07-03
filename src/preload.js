// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectInput: () => ipcRenderer.invoke('select-input'),
  selectOutput: () => ipcRenderer.invoke('select-output'),
  startDistribution: (opts) => ipcRenderer.send('start-distribution', opts),
  onProgress: (cb) => ipcRenderer.on('distribution-progress', (event, percent) => cb(percent)),
  onLog: (cb) => ipcRenderer.on('distribution-log', (event, msg) => cb(msg)),
  onDistributionDone: (cb) => ipcRenderer.on('distribution-done', cb),
});
