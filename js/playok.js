const { ipcRenderer } = require('electron');

var ranks = [
  {'min': 1390, 'max': 3000, 'rank': '9d'},
  {'min': 1360, 'max': 1390, 'rank': '8d'},
  {'min': 1330, 'max': 1360, 'rank': '7d'},
  {'min': 1300, 'max': 1330, 'rank': '6d'},
  {'min': 1270, 'max': 1300, 'rank': '5d'},
  {'min': 1240, 'max': 1270, 'rank': '4d'},
  {'min': 1210, 'max': 1240, 'rank': '3d'},
  {'min': 1180, 'max': 1210, 'rank': '2d'},
  {'min': 1150, 'max': 1180, 'rank': '1d'},
  {'min': 1120, 'max': 1150, 'rank': '1k'},
  {'min': 1090, 'max': 1120, 'rank': '2k'},
  {'min': 1060, 'max': 1090, 'rank': '3k'},
  {'min': 1030, 'max': 1060, 'rank': '4k'},
  {'min': 1000, 'max': 1030, 'rank': '5k'},
  {'min':  970, 'max': 1000, 'rank': '6k'},
  {'min':  940, 'max': 970,  'rank': '7k'},
  {'min':  910, 'max': 940,  'rank': '8k'},
  {'min':  880, 'max': 910,  'rank': '9k'},
  {'min':  850, 'max': 880,  'rank': '10k'},
  {'min':  820, 'max': 850,  'rank': '11k'},
  {'min':    0, 'max': 790,  'rank': '12k'},
];

var players = [];
var logs = '';
var watch = '';

function getRank(rating) {
  for (let entry of ranks) {
    if (rating >= entry.min && rating < entry.max) return entry.rank;
  } return 'N/A';
}

ipcRenderer.on('websocket-message', (event, message) => {
  logs += '<small>' + message + '</small><br>';
  let response = JSON.parse(message);
  
  // Games in progress
  //if (response.i[0] == 70 && response.i[3] == 1 && response.i[4] == 1) {
  //  watch += '&nbsp;WATCH: #' + message + ' ' + response.s.slice(1,).join(' VS ') + '<br>';
  //}
  if (response.i[0] == 25) {
    let player = response.s[0];
    let rating = response.i[3];
    players[player] = getRank(rating);
  }

  // Load game {"i": [72, table]}
  if (response.i[0] == 91) { console.log(response)
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
    let move = response.s[0];
    if (move != undefined) {
      let col = 'abcdefghjklmnopqrst'.indexOf(move.split('-')[0]);
      let row = 19-parseInt(move.split('-')[1]);
      let sq = (row+1) * 21 + (col+1);
      setStone(sq, side);
      drawBoard();
    }
  }

  logs = logs.split('<br>').slice(-30,).join('<br>');
  watch = watch.split('<br>').slice(-11,).join('<br>');
  document.getElementById('lobby').innerHTML = watch;
});

initGUI();
