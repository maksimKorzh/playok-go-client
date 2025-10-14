var ranks = [
  {'min': 1600, 'max': 3000, 'rank': '9d'},
  {'min': 1550, 'max': 1600, 'rank': '8d'},
  {'min': 1500, 'max': 1550, 'rank': '7d'},
  {'min': 1450, 'max': 1500, 'rank': '6d'},
  {'min': 1400, 'max': 1450, 'rank': '5d'},
  {'min': 1350, 'max': 1400, 'rank': '4d'},
  {'min': 1300, 'max': 1350, 'rank': '3d'},
  {'min': 1250, 'max': 1300, 'rank': '2d'},
  {'min': 1200, 'max': 1250, 'rank': '1d'},
  {'min': 1150, 'max': 1200, 'rank': '1k'},
  {'min': 1100, 'max': 1150, 'rank': '2k'},
  {'min': 1050, 'max': 1100, 'rank': '3k'},
  {'min': 1000, 'max': 1050, 'rank': '4k'},
  {'min':  950, 'max': 1000, 'rank': '5k'},
  {'min':  900, 'max': 950,  'rank': '6k'},
  {'min':  850, 'max': 900,  'rank': '7k'},
  {'min':  800, 'max': 850,  'rank': '8k'},
  {'min':  750, 'max': 800,  'rank': '9k'},
  {'min':  0, 'max': 750,    'rank': '10k'},
];

var players = {};
var opponent = '';
var me = '';
var table = 100;
var logs = 'connecting to web socket...<br>';
var ratingLimit = 3000;
var prevChallenge = '';
var accepting = 0;
var DEBUG = 0;

function getRank(rating) {
  for (let entry of ranks) {
    if (hideRank || rating == 1200) return '?'
    else if (rating >= entry.min && rating < entry.max) return entry.rank;
  } return 'N/A';
}

function joinGame(color, tableNum, info) {
  if (prevChallenge == info) {
    sendMessage('leave');
    accepting = 1;
    logs += 'accepting challenges is ON<br>';
    return;
  }
  if (!accepting) return;
  table = tableNum;
  sendMessage('join');
  sendMessage(color);
  accepting = 0;
  logs += 'accepting challenges is OFF<br>';
  window.playokAPI.showConfirm('Accept match "' + info + ' as ' + color + '" ?').then((choice) => {
    if (choice.response == 0) {
      sendMessage('start');
    } else {
      sendMessage('leave');
      prevChallenge = info;
      accepting = 1;
      logs += 'accepting challenges is ON<br>';
    }
  });
}

function getUserInfo(label) {
  window.playokAPI.prompt({
    title: 'PlayOK',
    label: label,
    type: 'input',
    inputAttrs: {
      type: 'text',
      spellcheck: 'false',
    },
    value: opponent.split('[')[0]
  }).then(result => {
    if (result !== null) playerInfo(result);
    else return 0;
  });
}

function updateLogs() {
  let lobby = document.getElementById('lobby');
  lobby.innerHTML = logs
  lobby.scrollTop = lobby.scrollHeight;
}

window.playokAPI.onData((message) => {
  if (DEBUG) logs += message + '<br>';
  if (message.includes('username')) {
    opponent = message.split(':')[1];
    me = opponent;
    logs += 'logged in as "' + opponent + '"<br>';
    return;
  }
  if (message == 'close') {
    logs += 'web socket connection has  been closed<br>';
    return
  }
  let response = JSON.parse(message);
  if (response.i[0] == 25) { // player info
    let player = response.s[0];
    let rating = response.i[3];
    players[player] = {
      'name': player,
      'rank': getRank(rating),
      'rating': rating
    }
  }

  if (response.i[0] == 70) { // lobby & pairing
    let boardSize = response.s[0].split(',')[1];
    if (parseInt(boardSize) != 19) return;
    let player1 = response.s[1];
    let player2 = response.s[2];
    if (response.i[3] == 1 && response.i[4] == 0) {
      if (players[player1] != undefined && accepting) {
        if (players[player1].rating > ratingLimit) return;
        opponent = players[player1].name + '[' + players[player1].rank + ']';
        logs += '#' + response.i[1] + ', ' + response.s[0] + ' ' + opponent + '<br>';
        joinGame('white', response.i[1], response.s[0] + ' ' + opponent);
      }
    }
    else if (response.i[3] == 0 && response.i[4] == 1) {
      if (players[player2] != undefined && accepting) {
        if (players[player2].rating > ratingLimit) return;
        opponent = players[player2].name + '[' + players[player2].rank + ']';
        logs += '#' + response.i[1] + ', ' + response.s[0] + ' ' + opponent + '<br>';
        joinGame('black', response.i[1], response.s[0] + ' ' + opponent);
      }
    }
  }
  
  if (response.i[0] == 81 && response.i[1] == table) { // chat messages & system notifications
    logs += response.s[0] + '<br>';
    //if (response.s[0].includes('passes')) window.playokAPI.showAlert('PASS');
    if (response.s[0].includes('does not agree')) drawBoard();
    if (response.s[0].includes('asks to undo')) {
      window.playokAPI.showConfirm('Opponent asks to undo the turn, accept?').then((choice) => {
        if (choice.response == 0) {
          sendMessage('undo-accept');
        }
      });
    }
    if (response.s[0].includes('resigns') ||
        response.s[0].includes('territory') ||
        response.s[0].includes('offline') ||
        response.s[0].includes('exceeded')) {
          gameOver = 1;
          window.playokAPI.showAlert(response.s[0]);
          stopInterval();
        }
  }
  
  if (response.i[0] == 87 && response.i[1] == table) {
    if (response.i[2] == 1) logs += '#' + response.i[1] + ', opponent returned to the game<br>';
    if (response.i[2] == 0) logs += '#' + response.i[1] + ', opponent leaft game<br>';
  }

  if (response.i[0] == 90 && response.i.length == 25) { // timer
    blackTime = response.i[22];
    whiteTime = response.i[24];
    blackByoStones = response.i[11];
    whiteByoStones = response.i[12];
    blackCaptured = response.i[21];
    whiteCaptured = response.i[23];
    updateTimer();
  }
  
  if (response.i[0] == 90 && response.i[2] == 53) {
    drawBoard();
    drawDeadStones(response.i);
    logs += 'counting game<br>';
  }

  if (response.i[0] == 91) { // load game
    table = response.i[1];
    gameOver = 0;
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

  if (response.i[0] == 92) { // update move
    drawBoard();
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
  updateLogs();
});

initGUI();

const input = document.getElementById('chat');                              
input.addEventListener('keydown', (e) => {                                  
  if (e.key == 'Enter') sendMessage('chat');                                
});
