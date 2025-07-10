var canvas, ctx, cell;
var editMode = 0;
var takePlace = 0;
var gameOver = 1;
var userSide = BLACK;
var blackTime = 0;
var whiteTime = 0;
var blackCaptured = 0;
var whiteCaptured = 0;
var blackByoStones = -1;
var whiteByoStones = -1;
var intervalId;

const bgImage = new Image();
const blackStoneImage = new Image();
const whiteStoneImage = new Image();
const deadStoneImage = new Image();
const moveSound = new Audio('./assets/112-2052.wav');
bgImage.src = './assets/board_fox.png';
blackStoneImage.src = './assets/stone_b_fox.png';
whiteStoneImage.src = './assets/stone_w_fox.png';
deadStoneImage.src = './assets/dead.png';
let imagesLoaded = false;
bgImage.onload = blackStoneImage.onload = whiteStoneImage.onload = () => {
  if (bgImage.complete && blackStoneImage.complete && whiteStoneImage.complete) {
    imagesLoaded = true;
  }
};

startInterval();

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

function drawDeadStones(data) {
  const colLetters = "abcdefghjklmnopqrst"; // 'i' is skipped visually
  const BOARD_SIZE = 19;
  const BIT_SECTION_START = 15;
  const deadStones = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    const low = data[BIT_SECTION_START + row * 2];
    const high = data[BIT_SECTION_START + row * 2 + 1];
    const y = row + 1; // row index in 21x21 (1-based)
    for (let col = 0; col < 16; col++) {
      if ((low & (1 << col)) !== 0) {
        const x = col + 1; // col index in 21x21 (1-based)
        const coord = `${colLetters[col]}${19 - row}`;
        deadStones.push({ coord, index: y * 21 + x });
      }
    }
    for (let col = 0; col < 4; col++) {
      if ((high & (1 << col)) !== 0) {
        const x = col + 16;
        const coord = `${colLetters[col + 16]}${19 - row}`;
        deadStones.push({ coord, index: y * 21 + x });
      }
    }
  }
  for (let row = 0; row < size-2; row++) {
    for (let col = 0; col < size-2; col++) {
      let sq = (row+1) * size + (col+1);
      const crossImage = deadStoneImage;
      for (let i of deadStones) {
        if (sq == i.index) {
          ctx.drawImage(
            crossImage,
            col * cell + cell / 2 - cell / 2,
            row * cell + cell / 2 - cell / 2,
            cell,
            cell
          );
        }
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
    //if (board[sq] != EMPTY) side = userSide;
    if (gameOver) return;
    let move = {"i": [92, table, 0, (row * 19 + col), 0]};
    let message = JSON.stringify(move);
    window.playokAPI.send('main', message);
  }
}

function sendMessage(action) {
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
      command.i = [72, table];
      break;
    case 'leave':
      stopInterval();
      command.i = [73, table];
      initGoban();
      drawBoard();
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
    case 'continue':
      command.i = [92, table, 0, 441, 0];
      drawBoard();
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
  window.playokAPI.send('main', message);
}

async function playerInfo(userName) {
  opponent = userName;
  fetch('https://www.playok.com/en/stat.phtml?u=' + userName + '&g=go')
  .then(response => { return response.text(); })
  .then(html => {
    let rating = html.split('ranking: <b>').slice(-1)[0].split('</b>')[0];
    if (rating.length > 4) {
      window.playokAPI.showAlert('No info available');
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
      window.playokAPI.showAlert(
        'Rank:\t\t' + getRank(parseInt(rating)) +
        '\nRating:\t\t' + rating +
        '\nGames:\t\t' + games +
        '\nWins:\t\t' + wins +
        '\nLosses:\t\t' + losses +
        '\nWinrate:\t\t' + winrate +
        '\nStreak:\t\t' + streak +
        '\nLeaft:\t\t' + abandoned +
        '\nLanguage:\t' + country +
        '\nStatus:\t\t' + online +
        '\nRecent:\t\t' + recentResults + '\n'
      );
    });
  })
}

async function downloadSgf() {
  const filePath = await window.playokAPI.saveFile();                       
  if (filePath) {
    userName = me;
    fetch('https:www.playok.com/en/stat.phtml?u=' + userName + '&g=go&sk=2')
    .then(response => { return response.text(); })
    .then(html => {
      let lastGame = html.split('.txt')[0].split('go').slice(-1)[0];
      if (lastGame.length > 10) {
        window.playokAPI.showAlert('No such user');
        return;
      }
      let lastGameUrl = 'https:www.playok.com/p/?g=go' + lastGame + '.txt';
      window.playokAPI.send('main', 'path:' + filePath + ':url:' + lastGameUrl);
    });
  }
}

function updateTimer() {
  if (blackTime < 0 || whiteTime < 0) return;
  let bbyo = blackByoStones == -1 ? ' | ' : ' | (' + blackByoStones + ' stones) | ';
  let wbyo = whiteByoStones == -1 ? ' | ' : ' | (' + whiteByoStones + ' stones) | ';
  document.getElementById('blackTime').innerHTML = secToMin(blackTime) + bbyo + blackCaptured + ' captured';
  document.getElementById('whiteTime').innerHTML = secToMin(whiteTime) + wbyo + whiteCaptured + ' captured';
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
      document.getElementById('blackTime').innerHTML = '00:00 | 0 captured';
      document.getElementById('whiteTime').innerHTML = '00:00 | 0 captured';
    }
}

function resizeCanvas() {
  canvas.width = window.innerHeight-34;
  canvas.height = canvas.width;
  drawBoard();
  try {
    document.getElementById('lobby').style.width = (window.innerWidth-canvas.width-32) + 'px';
    document.getElementById('lobby').style.height = (canvas.height-131) + 'px';
    document.getElementById('time').style.width = (window.innerWidth-canvas.height-30) + 'px';
    document.getElementById('actions').style.width = (window.innerWidth-canvas.height-30) + 'px';
    document.getElementById('level').style.width = (window.innerWidth-canvas.height-30) + 'px';
  } catch(e) {}
}

function handleSave() {
  if (gameOver) downloadSgf();
  else {
    editMode = 0;
    handlePass();
    downloadSgf();
  }
}

function challengeToggle() {
  blackTime = 0;
  whiteTime = 0;
  updateTimer();
  accepting ^= 1;
  logs += '(INFO) accepting challenges is ' + (accepting ? 'ON': 'OFF') + '<br>';
  updateLogs();
  if (accepting) {
    sendMessage('leave');
    opponent = me;
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
    <div id="lobby" style="margin: 4px; margin-top: 16px; overflow: hidden; width: ` + (window.innerWidth - canvas.width - 32) + `px; height: ` + (canvas.height-131) + `px; border: 2px solid black;"></div>
    <div id="time" style="display: flex; gap: 4px;  width: ` + (window.innerWidth - canvas.width - 30) + `px; margin-bottom: 4px;">
      <label id="blackTime" style="font-size: 22px; background-color: black; color: white; width: 100%; border: 1px solid black; text-align: center">00:00 | 0 captured</label>
      <label id="whiteTime" style="font-size: 22px; background-color: white; color: black; width: 100%; border: 1px solid black; text-align: center">00:00 | 0 captured</label>
    </div>
    <div id="actions" style="display: flex; gap: 4px;  width: ` + (window.innerWidth - canvas.width - 30) + `px; margin-bottom: 4px;">
      <button onclick="sendMessage('pass');" style="font-size: 20px;">PASS</button>
      <button onclick="sendMessage('resign');" style="font-size: 20px;">RESIGN</button>
      <button onclick="downloadSgf();" style="font-size: 20px;">DOWNLOAD</button>
      <button onclick="getUserInfo('User name:');" style="font-size: 20px;">STATS</button>
    </div>
    <div id="level" style="display: flex; gap: 4px;  width: ` + (window.innerWidth - canvas.width - 30) + `px; margin-bottom: 4px;">
      <button onclick="sendMessage('continue');">CONTINUE</button>
      <button onclick="challengeToggle();">MATCH</button>
      <select id="rank" type="number" onchange="ratingLimit = parseInt(this.value);" style="width: 100%;">
        <option value="3000">All</option>
        <option value="1450">1d</option>
        <option value="1400">1k</option>
        <option value="1350">2k</option>
        <option value="1300">3k</option>
        <option value="1250">4k</option>
        <option value="1200" selected>5k</option>
        <option value="1150">6k</option>
        <option value="1100">7k</option>
        <option value="1050">8k</option>
        <option value="1000">9k</option>
        <option value="950">10k</option>
      </select>
      <input id="chat" type="text" value="" spellcheck="false" style="width: 98%;" />
    </div>
  `;
}
