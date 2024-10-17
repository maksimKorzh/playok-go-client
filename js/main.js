const { ipcRenderer } = require('electron');

var logs = '';
var watch = '';

ipcRenderer.on('websocket-message', (event, message) => {
  logs += '<small>' + message + '</small><br>';
  let response = JSON.parse(message);
  
  // Games in progress
  if (response.i[0] == 70 && response.i[3] == 1 && response.i[4] == 1) {
    watch += '&nbsp;WATCH: #' + response.i[1] + ' ' + response.s.slice(1,).join(' VS ') + '<br>';
  }
  
  // Load game
  if (response.i[0] == 91) {
    initGoban();
    console.log(message);
  }

  logs = logs.split('<br>').slice(-11,).join('<br>');
  watch = watch.split('<br>').slice(-11,).join('<br>');
  document.getElementById('lobby').innerHTML = logs + '<hr>' + watch;
});

initGUI();
