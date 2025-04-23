var canvas, ctx, cell;
var editMode = 0;
var takePlace = 0;
var gameOver = 1;
var userSide = BLACK;
var blackTime = 0;
var whiteTime = 0;
var intervalId;

const bgImage = new Image();
const blackStoneImage = new Image();
const whiteStoneImage = new Image();
const moveSound = new Audio('./assets/112-2052.wav');
bgImage.src = './assets/board_fox.png';
blackStoneImage.src = './assets/stone_b_fox.png';
whiteStoneImage.src = './assets/stone_w_fox.png';
let imagesLoaded = false;
bgImage.onload = blackStoneImage.onload = whiteStoneImage.onload = () => {
  if (bgImage.complete && blackStoneImage.complete && whiteStoneImage.complete) {
    imagesLoaded = true;
    drawBoard();
  }
};

function drawBoard() {
  cell = canvas.width / (size-2);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  for (let i = 0; i < size-2; i++) {
    const x = i * cell + cell / 2;
    const y = i * cell + cell / 2;
    let offset = cell * 2 - cell / 2 - cell;
    ctx.moveTo(offset, y);
    ctx.lineTo(canvas.width - offset, y);
    ctx.moveTo(x, offset);
    ctx.lineTo(x, canvas.height - offset);
  };
  ctx.lineWidth = 1;
  ctx.stroke();
  for (let row = 0; row < size-2; row++) {
    for (let col = 0; col < size-2; col++) {
      let sq = (row+1) * size + (col+1);
      let starPoints = {
         9: [36, 38, 40, 58, 60, 62, 80, 82, 84],
        13: [64, 67, 70, 109, 112, 115, 154, 157, 160],
        19: [88, 94, 100, 214, 220, 226, 340, 346, 352]
      }
      if ([9, 13, 19].includes(size-2) && starPoints[size-2].includes(sq)) {
        ctx.beginPath();
        ctx.arc(col * cell+(cell/4)*2, row * cell +(cell/4)*2, cell / 6 - 2, 0, 2 * Math.PI);
        ctx.fillStyle = 'black';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      if (board[sq] == 7) continue;
      const stoneImage = board[sq] == 1 ? blackStoneImage : whiteStoneImage;
      if (board[sq]) {
        ctx.drawImage(
          stoneImage,
          col * cell + cell / 2 - cell / 2,
          row * cell + cell / 2 - cell / 2,
          cell,
          cell
        );
      }
      
      if (sq == userMove) {
        let color = board[sq] == 1 ? 'white' : 'black';
        ctx.beginPath();
        ctx.arc(col * cell+(cell/4)*2, row * cell+(cell/4)*2, cell / 5 - 2, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
}

function userInput(event) {
  let rect = canvas.getBoundingClientRect();
  let mouseX = event.clientX - rect.left;
  let mouseY = event.clientY - rect.top;
  let col = Math.floor(mouseX / cell);
  let row = Math.floor(mouseY / cell);
  let sq = (row+1) * size + (col+1);
  if (editMode) {
    setStone(sq, side);
    drawBoard();
  } else {
    if (board[sq] != EMPTY) side = userSide;
    if (gameOver || side != userSide) return;
    let move = {"i": [92, table, 0, (row * 19 + col), 0]};
    let message = JSON.stringify(move);
    ipcRenderer.send('main', message);
  }
}

function sendMessage(action) {
  if (action == 'connect') {
    ipcRenderer.send('main', action);
    return;
  }

  table = parseInt(document.getElementById('table').value);
  if (!(table in games)) {
    alert('Choose valid table');
    return;
  }
  let command = {"i": [], "s": []};
  switch (action) {
    case 'tg':
      command.i = [82, table, parseInt(document.getElementById('tg').value)];
      command.s = ['tg'];
      break;
    case 'tm':
      command.i = [82, table, parseInt(document.getElementById('tm').value)];
      command.s = ['tm'];
      break;
    case 'join':
      startInterval();
      document.getElementById('rank').value = '3000';
      command.i = [72, table];
      logs = '';
      break;
    case 'leave':
      stopInterval();
      command.i = [73, table];
      initGoban();
      drawBoard();
      logs = '';
      games = {};
      takePlace = 0;
      break;
    case 'black':
      userSide = BLACK;
      command.i = [(takePlace ? 84:83), table, 0];
      takePlace ^= 1;
      break;
    case 'white':
      userSide = WHITE;
      command.i = [(takePlace ? 84:83), table, 1];
      takePlace ^= 1;
      break;
    case 'start':
      command.i = [85, table];
      gameOver = 0;
      break;
    case 'pass':
      command.i = [92, table, 0, 400, 0];
      break;
    case 'resign':
      command.i = [93, table, 4, 0];
      gameOver = 1;
      break;
    case 'chat':
      let chat = document.getElementById('chat');
      command.i = [81, table];
      command.s = [chat.value];
      chat.value = '';
      break;
  }
  let message = JSON.stringify(command);
  ipcRenderer.send('main', message);
}

function createGame() {
  let command = {"i": [71], "s": []};
  let message = JSON.stringify(command);
  ipcRenderer.send('main', message);
}

function playerInfo() {
  userName = document.getElementById('info').value;
  fetch('https://www.playok.com/en/stat.phtml?u=' + userName + '&g=go')
  .then(response => { return response.text(); })
  .then(html => {
    let rating = html.split('ranking: <b>').slice(-1)[0].split('</b>')[0];
    if (rating.length > 4) {
      alert('No info available');
      return;
    }
    let games = html.split('games played: <b>').slice(-1)[0].split('</b>')[0];
    let wins = html.split('wins: <b>').slice(-1)[0].split('</b>')[0];
    let losses = html.split('losses: <b>').slice(-1)[0].split('</b>')[0];
    let winrate = html.split('(<b>').slice(-1)[0].split('</b>')[0];
    let abandoned = html.split('abandoned: <b>').slice(-1)[0].split('</b>')[0];
    let streak = html.split('streak: <b>').slice(-1)[0].split('</b>')[0];
    let country = html.split(' - <a href="/en/go/">go</a>').slice(-1)[0].split('<b>').slice(-1)[0].split('</b>')[0].slice(1,-1);
    let online = html.split('registered').slice(-1)[0].includes('online') ? 'online': 'offline';
    fetch('https://www.playok.com/en/stat.phtml?u=' + userName + '&g=go&sk=2')
    .then(response => { return response.text(); })
    .then(html => {
      let results = html.split('td').slice(6,);
      let recentResults = '';
      for (let i in results) {
        try {
          if (i > 72) break;
          let value = results[i].split('<b>')[1].split('</b>')[0];
          recentResults += value.replace('win', '🟢').replace('loss', '❌');
        } catch (e) {}
      }
      alert(
        'Rank:\t\t' + getRank(parseInt(rating)) +
        '\nRating:\t\t' + rating +
        '\nGames:\t\t' + games +
        '\nWins:\t\t' + wins +
        '\nLosses:\t\t' + losses +
        '\nWinrate:\t' + winrate +
        '\nStreak:\t\t' + streak +
        '\nLeaft:\t\t' + abandoned +
        '\nLanguage:\t' + country +
        '\nStatus:\t\t' + online +
        '\nRecent:\t\t' + recentResults + '\n'
      );
    });
  })
}

function copyGame() {
  loadSgf(document.getElementById('chat').value);
  userName = document.getElementById('info').value;
  fetch('https://www.playok.com/en/stat.phtml?u=' + userName + '&g=go&sk=2')
  .then(response => { return response.text(); })
  .then(html => {
    let lastGame = html.split('.txt')[0].split('go').slice(-1)[0];
    if (lastGame.length > 10) {
      alert('No such user');
      return;
    }
    let lastGameUrl = 'https://www.playok.com/p/?g=go' + lastGame + '.txt';
    fetch(lastGameUrl)
    .then( response => { return response.text(); })
    .then(sgf => {
      navigator.clipboard.writeText(sgf);
    });
  });
}

function handleEval() {
 (async () => {
   if (editMode) alert(await evaluatePosition());
   else {
     if(table in games) alert(await evaluatePosition());
     else alert('Choose valid table');
   }
 })();
}

function handleAI() {
  if (editMode) playMove();
  else {
    if (!gameOver && side == userSide) playMove();
    else alert('Choose valid table');
  }
}

function changeMode(btn) {
  editMode ^= 1;
  if (editMode) alert('Edit mode enabled');
  else alert('Edit mode disabled');
}

function updateTimer() {
  if (blackTime < 0 || whiteTime < 0) return;
  document.getElementById('blackTime').innerHTML = secToMin(blackTime);
  document.getElementById('whiteTime').innerHTML = secToMin(whiteTime);
}

function getTime(time) {
  let totalSeconds = 0;
  let currentNumber = '';
  for (let char of time) {
    if (char === '+' || char === '-') {
      if (currentNumber) {
        totalSeconds += parseInt(currentNumber, 10) * 60; // Convert to seconds
        currentNumber = '';
      };currentNumber += char;
    } else if (!isNaN(char)) currentNumber += char;
  }
  if (currentNumber) totalSeconds += parseInt(currentNumber, 10) * 60;
  return totalSeconds;
}

function secToMin(sec) {
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startInterval() {
  if (!intervalId) { // Prevent multiple intervals from being set
    intervalId = setInterval(() => {
      side == BLACK ? (blackTime -= 1) :(whiteTime -= 1);
      updateTimer();
    }, 1000);
  }
}

function stopInterval() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      blackTime = 0;
      whiteTime = 0;
      updateTimer();
    }
}

function resizeCanvas() {
  canvas.width = window.innerHeight-34;
  canvas.height = canvas.width;
  drawBoard();
  try {
    document.getElementById('lobby').style.width = (canvas.width-200) + 'px';
    document.getElementById('lobby').style.height = (canvas.height-127) + 'px';
    document.getElementById('time').style.width = (canvas.height-198) + 'px';
    document.getElementById('navigation').style.width = (canvas.height-198) + 'px';
    document.getElementById('actions').style.width = (canvas.height-198) + 'px';
    document.getElementById('ranks').style.width = (canvas.height-198) + 'px';
    document.getElementById('table').value = table;
  } catch(e) {}
}

function downloadSgf() {
  const element = document.createElement('a');
  const file = new Blob([saveSgf()], { type: 'text/plain' });
  element.href = URL.createObjectURL(file);
  element.download = 'game.sgf';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function handleSave() {
  if (gameOver) downloadSgf();
  else {
    editMode = 0;
    handlePass();
    downloadSgf();
  }
}

function initGUI() {
  let container = document.getElementById('goban');
  canvas = document.createElement('canvas');
  canvas.style = 'border: 2px solid black; margin: 4px; margin-top: 16px;';
  container.appendChild(canvas);
  canvas.addEventListener('click', userInput);
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  window.addEventListener('resize', resizeCanvas);
  initGoban();
  resizeCanvas();
  document.getElementById('panel').innerHTML = `
    <div id="lobby" style="margin: 4px; margin-top: 16px; overflow: hidden; width: ` + (canvas.width-200) + `px; height: ` + (canvas.height-127) + `px; border: 2px solid black;"></div>
    <div id="time" style="display: flex; gap: 4px;  width: ` + (canvas.width-198) + `px; margin-bottom: 4px;">
      <label id="blackTime" style="font-size: 22px; background-color: black; color: white; width: 100%; border: 1px solid black; text-align: center">00:00</label>
      <label id="whiteTime" style="font-size: 22px; background-color: white; color: black; width: 100%; border: 1px solid black; text-align: center">00:00</label>
    </div>
    <div id="navigation" style="display: flex; gap: 4px;  width: ` + (canvas.width-198) + `px; margin-bottom: 4px;">
      <button style="font-size:18px;" onclick="changeMode(this);">%</button>
      <button style="font-size:18px;" onclick="if (editMode) replay = setInterval(function() { nextMove(); drawBoard(); }, 2000)">▷</button>
      <button style="font-size:18px;" onclick="if (editMode) { clearInterval(replay); replay = null; }">||</button>
      <button style="font-size:18px;" onclick="if (editMode) firstMove();"><<<</button>
      <button style="font-size:18px;" onclick="if (editMode) prevFewMoves(16);"><<</button>
      <button style="font-size:18px;" onclick="if (editMode) prevMove();"><</button>
      <button style="font-size:18px;" onclick="if (editMode) nextMove();">></button>
      <button style="font-size:18px;" onclick="if (editMode) nextFewMoves(16);">>></button>
      <button style="font-size:18px;" onclick="if (editMode) lastMove();">>>></button>
      <button style="font-size:15px;" onclick="handleAI();" style="font-size: 15px;">⚙</button>
    </div>
    <div id="actions" style="display: flex; gap: 4px;  width: ` + (canvas.width-198) + `px; margin-bottom: 4px;">
      <button onclick="createGame();" style="font-size: 18px;">@</button>
      <button onclick="handleEval();">🎛</button>
      <button onclick="sendMessage('join');" style="font-size: 15px;">▽</button>
      <button onclick="sendMessage('leave');" style="font-size: 15px;">△</button>
      <button onclick="sendMessage('black');" style="font-size: 20px;">●</button>
      <button onclick="sendMessage('white');" style="font-size: 20px;">○</button>
      <button onclick="sendMessage('start');" style="font-size: 15px;">▷</button>
      <button onclick="sendMessage('pass');" style="font-size: 15px;">□</button>
      <button onclick="sendMessage('resign');" style="font-size: 20px;">x</button>
      <button onclick="sendMessage('connect');">🎮</button>
    </div>
    <div id="ranks" style="display: flex; gap: 4px;  width: ` + (canvas.width-198) + `px; margin-bottom: 4px;">
      <select id="tg" type="number" style="width: 56%; font-size: 14px;">
        <option>1</option>
        <option>2</option>
        <option>3</option>
        <option>5</option>
        <option>7</option>
        <option>10</option>
        <option>15</option>
        <option>20</option>
        <option selected>30</option>
        <option>60</option>
      </select>
      <select id="tm" type="number" style="width: 55%; font-size: 14px;">
        <option>1</option>
        <option>2</option>
        <option>3</option>
        <option>5</option>
        <option>7</option>
        <option selected>10</option>
        <option>20</option>
      </select>
      <input id="table" type="number" value="` + table + `" style="width: 111%; font-size: 18px;"/>
      <select id="rank" type="number" onchange="logs=''; games={};" style="width: 120%; font-size: 18px;">
        <option value="3000">All</option>
        <option value="1450">1d</option>
        <option value="1400">1k</option>
        <option value="1350">2k</option>
        <option value="1300">3k</option>
        <option value="1250">4k</option>
        <option value="1200">5k</option>
        <option value="1150">6k</option>
        <option value="1100">7k</option>
        <option value="1050">8k</option>
        <option value="1000">9k</option>
        <option value="950">10k</option>
      </select>
      <input id="info" type="text" value="cft7821g" spellcheck="false" style="width: 163%; font-size: 18px;"/>
      <button onclick="playerInfo();" style="width: 50%; font-size: 18px;">?</button>
      <button onclick="sendMessage('chat');" style="font-size: 18px;">$</button>
      <input id="chat" type="text" value="" spellcheck="false" style="width: 371%; font-size: 18px;"/>
      <button onclick="copyGame();" style="font-size: 18px;">#</button>
    </div>
  `;

}
