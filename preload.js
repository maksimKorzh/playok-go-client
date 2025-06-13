const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('playokAPI', {
  connect: () => ipcRenderer.send('main', 'connect'),
  send: (channel, cmd) => ipcRenderer.send(channel, cmd),
  onData: (callback) => ipcRenderer.on('websocket-message', (_, data) => callback(data)),
  prompt: (options) => ipcRenderer.invoke('show-prompt', options)
});
