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

var players = {};
var games = {};
var table = 100;
var me = '';
var logs = '';

function getRank(rating) {
  for (let entry of ranks) {
    if (rating >= entry.min && rating < entry.max) return entry.rank;
  } return 'N/A';
}

ipcRenderer.on('websocket-message', (event, message) => {
  if (message == 'open') { setTimeout(function() { logs = '&nbsp;Web socket connection is open<br>'}, 100); return; }
  if (message == 'close') { logs = '&nbsp;Web socket connection is closed<br>'; return; }
  let response = JSON.parse(message);

  if (response.i[0] == 18) { me = response.s[0]; }
  
  if (response.i[0] == 25) {
    let player = response.s[0];
    let rating = response.i[3];
    players[player] = player + '[' + getRank(rating) + ']';
    if (player == me) me = player + '[' + players[player] + ']';
  }

  if (response.i[0] == 70) {
    if ((table in games) && response.i[1] != table) return; 
    let player1 = response.s[1];
    let player2 = response.s[2];
    let timeControl = response.s[0].split(',')[0];
    let boardSize = response.s[0].split(',')[1];
    if (parseInt(boardSize) != 19) return;
    let gameStatus = response.s[0].split(',').length == 3 ? 'free' : 'ranked'; 
    games[response.i[1]] = [player1, player2];
    if (response.i[3] == 0 && response.i[4] == 0) {
      logs += '<tr><td>#' + response.i[1] +
              '</td><td>' + 'empty' +
              '</td><td>' + 'empty' +
              '</td><td>' + timeControl +
              '</td><td>' + boardSize +
              '</td><td>' + gameStatus + '</td></tr>';
    }
    else if (response.i[3] == 1 && response.i[4] == 0) {
      if (players[player1] != undefined) {;
        logs += '<tr><td>#' + response.i[1] +
                '</td><td>' + players[player1] +
                '</td><td>' + 'empty' +
                '</td><td>' + timeControl +
                '</td><td>' + boardSize +
                '</td><td>' + gameStatus + '</td></tr>';
      }
    }
    else if (response.i[3] == 0 && response.i[4] == 1) {
      if (players[player2] != undefined) {
        logs += '<tr><td>#' + response.i[1] +
              '</td><td>' + 'empty' +
              '</td><td>' + players[player2] +
              '</td><td>' + timeControl +
              '</td><td>' + boardSize +
              '</td><td>' + gameStatus + '</td></tr>';
      }
    }
    else if (response.i[3] == 1 && response.i[4] == 1) {
      if (players[player1] != undefined && players[player2] != undefined) {
        logs += '<tr><td>#' + response.i[1] +
              '</td><td>' + players[player1] +
              '</td><td>' + players[player2] +
              '</td><td>' + timeControl +
              '</td><td>' + boardSize +
              '</td><td>' + gameStatus + '</td></tr>';
      }
    }
  }
  
  if (response.i[0] == 81 && response.i[1] == table) {
    logs += response.s[0] + '<br>';
    if (response.s[0].includes('resigns') ||
        response.s[0].includes('territory') ||
        response.s[0].includes('exceeded')) {
          gameOver = 1;
          alert(response.s[0]);
        }
  }

  if (response.i[0] == 90 && response.i[2] == 53) logs += '+ dead stones removal phase<br>';
  if (response.i[0] == 91) {
    initGoban();
    let moves = response.s;
    if (moves != undefined) {
      for (let move of moves) {
        if (move == '-') { passMove(); continue; }
        let col = 'abcdefghjklmnopqrst'.indexOf(move.split('-')[0]);
        let row = 19-parseInt(move.split('-')[1]);
        let sq = (row+1) * 21 + (col+1);
        setStone(sq, side);
      }
    } drawBoard();
  }

  if (response.i[0] == 92) {
    let move = response.s[0];
    if (move != undefined) {
      if (move == '-') {
        passMove();
        userSide = side;
      } else {
        let col = 'abcdefghjklmnopqrst'.indexOf(move.split('-')[0]);
        let row = 19-parseInt(move.split('-')[1]);
        let sq = (row+1) * 21 + (col+1);
        setStone(sq, side);
        drawBoard();
      }
    }
  }

  let lobby = document.getElementById('lobby');
  lobby.innerHTML = '<table style="width: 100%;">' + logs + '</table>';
  lobby.scrollTop = lobby.scrollHeight;
});

initGUI();
