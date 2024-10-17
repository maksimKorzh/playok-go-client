initGUI();
const { ipcRenderer } = require('electron');
ipcRenderer.on('websocket-message', (event, message) => {
  let response = JSON.parse(message);
  //document.getElementById('lobby').innerHTML += '<button>' + message + '</button>'
});
