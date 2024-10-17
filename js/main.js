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
 
  // Load game {"i": [72, table]}
  if (response.i[0] == 91) {
    initGoban();
    let moves = response.s;
    if (moves != undefined) {
      for (let move of moves) {
        let col = 'abcdefghjklmnopqrst'.indexOf(move.split('-')[0]);
        let row = 19-parseInt(move.split('-')[1]);
        let sq = (row+1) * 21 + (col+1);
        setStone(sq, side);
      }
    } drawBoard();
  }

  // Update game
  if (response.i[0] == 92) {
    let move = response.s;
    let col = 'abcdefghjklmnopqrst'.indexOf(move.split('-')[0]);
    let row = 19-parseInt(move.split('-')[1]);
    let sq = (row+1) * 21 + (col+1);
    setStone(sq, side);
    drawBoard();
  }

  logs = logs.split('<br>').slice(-30,).join('<br>');
  watch = watch.split('<br>').slice(-11,).join('<br>');
  document.getElementById('lobby').innerHTML = watch + '<hr>' + logs;
});

initGUI();
