const { ipcRenderer } = require('electron');

var ranks = [
  {'min': 1800, 'max': 3000, 'rank': '9d'},
  {'min': 1750, 'max': 1800, 'rank': '8d'},
  {'min': 1700, 'max': 1750, 'rank': '7d'},
  {'min': 1650, 'max': 1700, 'rank': '6d'},
  {'min': 1600, 'max': 1650, 'rank': '5d'},
  {'min': 1550, 'max': 1600, 'rank': '4d'},
  {'min': 1500, 'max': 1550, 'rank': '3d'},
  {'min': 1450, 'max': 1500, 'rank': '2d'},
  {'min': 1400, 'max': 1450, 'rank': '1d'},
  {'min': 1350, 'max': 1400, 'rank': '1k'},
  {'min': 1300, 'max': 1350, 'rank': '2k'},
  {'min': 1250, 'max': 1300, 'rank': '3k'},
  {'min': 1200, 'max': 1250, 'rank': '4k'},
  {'min': 1150, 'max': 1200, 'rank': '5k'},
  {'min': 1100, 'max': 1150, 'rank': '6k'},
  {'min': 1050, 'max': 1100,  'rank': '7k'},
  {'min': 1000, 'max': 1050,  'rank': '8k'},
  {'min':  950, 'max': 1000,  'rank': '9k'},
  {'min':  900, 'max': 950,  'rank': '10k'},
  {'min':  850, 'max': 900,  'rank': '11k'},
  {'min':  800, 'max': 850,  'rank': '12k'},
  {'min':  750, 'max': 800,  'rank': '13k'},
  {'min':  700, 'max': 750,  'rank': '14k'},
  {'min':    0, 'max': 700,  'rank': '15k'},
];

var players = {};
var games = {};
var table = 100;
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
  if (response.i[0] == 25) {
    let player = response.s[0];
    let rating = response.i[3];
    players[player] = {
      'name': player,
      'rank': getRank(rating),
      'rating': rating
    }
  }

  if (response.i[0] == 70) {
    let boardSize = response.s[0].split(',')[1];
    if (parseInt(boardSize) != 19) return;
    if ((table in games) && response.i[1] != table) return; 
    let player1 = response.s[1];
    let player2 = response.s[2];
    let ratingLimit = parseInt(document.getElementById('rank').value);
    let timeControl = response.s[0].split(',')[0];
    let gameStatus = response.s[0].split(',').length == 3 ? 'free' : 'ranked';
    games[response.i[1]] = [player1, player2];
    if (response.i[3] == 0 && response.i[4] == 0) {
      logs += '<tr><td>#' + response.i[1] +
              '</td><td>' + 'empty' +
              '</td><td>' + 'empty' +
              '</td><td>' + timeControl +
              '</td><td>' + gameStatus + '</td></tr>';
      document.getElementById('table').value = response.i[1];
    }
    else if (response.i[3] == 1 && response.i[4] == 0) {
      if (players[player1] != undefined) {
        if (players[player1].rating > ratingLimit) return;
        logs += '<tr><td>#' + response.i[1] +
                '</td><td>' + players[player1].name + '[' + players[player1].rank + ']' +
                '</td><td>' + 'empty' +
                '</td><td>' + timeControl +
                '</td><td>' + gameStatus + '</td></tr>';
        document.getElementById('table').value = response.i[1];
      }
    }
    else if (response.i[3] == 0 && response.i[4] == 1) {
      if (players[player2] != undefined) {
        if (players[player2].rating > ratingLimit) return;
        logs += '<tr><td>#' + response.i[1] +
              '</td><td>' + 'empty' +
              '</td><td>' + players[player2].name + '[' + players[player2].rank + ']' +
              '</td><td>' + timeControl +
              '</td><td>' + gameStatus + '</td></tr>';
        document.getElementById('table').value = response.i[1];
      }
    }
    else if (response.i[3] == 1 && response.i[4] == 1) {
      if (players[player1] != undefined && players[player2] != undefined) {
        if (players[player1].rating > ratingLimit || players[player2].rating > ratingLimit) return;
        logs += '<tr><td>#' + response.i[1] +
              '</td><td>' + players[player1].name + '[' + players[player1].rank + ']' +
              '</td><td>' + players[player2].name + '[' + players[player2].rank + ']' +
              '</td><td>' + timeControl +
              '</td><td>' + gameStatus + '</td></tr>';
        document.getElementById('table').value = response.i[1];
      }
    }
  }
  
  if (response.i[0] == 73) {
    games[response.i[1]] = ['', ''];
    document.getElementById('table').value = response.i[1];
    sendMessage('tg');
    sendMessage('tm');
    startInterval();
    document.getElementById('rank').value = '3000';
    logs = '';
  }

  if (response.i[0] == 81 && response.i[1] == table) {
    logs += response.s[0] + '<br>';
    if (response.s[0].includes('resigns') ||
        response.s[0].includes('territory') ||
        response.s[0].includes('exceeded')) {
          gameOver = 1;
          alert(response.s[0]);
          stopInterval();
        }
  }

  if (response.i[0] == 90 && response.i.length == 25) {
    blackTime = response.i[22];
    whiteTime = response.i[24];
    updateTimer();
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
        setStone(sq, side, false);
      }
    } drawBoard();
  }

  if (response.i[0] == 92) {
    let move = response.s[0];
    if (move != undefined) {
      if (move == '-') {
        passMove();
      } else {
        let col = 'abcdefghjklmnopqrst'.indexOf(move.split('-')[0]);
        let row = 19-parseInt(move.split('-')[1]);
        let sq = (row+1) * 21 + (col+1);
        setStone(sq, side, false);
        drawBoard();
      }
    }
  }

  let lobby = document.getElementById('lobby');
  lobby.innerHTML = '<table style="width: 100%;">' + logs + '</table>';
  lobby.scrollTop = lobby.scrollHeight;
});

initGUI();
