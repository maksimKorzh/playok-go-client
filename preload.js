const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('playokAPI', {
  connect: (s) => ipcRenderer.send('main', s),
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  send: (channel, cmd) => ipcRenderer.send(channel, cmd),
  onData: (callback) => ipcRenderer.on('websocket-message', (_, data) => callback(data)),
  prompt: (options) => ipcRenderer.invoke('show-prompt', options),
  showAlert: (message) => ipcRenderer.invoke('show-alert', message),
  showConfirm: (message) => ipcRenderer.invoke('show-confirm', message),
  saveFile: () => ipcRenderer.invoke('dialog:saveFile'),
});
