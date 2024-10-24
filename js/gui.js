var canvas, ctx, cell;
var editMode = 0;
var takePlace = 0;
var gameOver = 1;
var userSide = BLACK;

function drawBoard() {
  cell = canvas.width / (size-2);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
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
      let color = board[sq] == 1 ? 'black' : 'white';
      if (board[sq]) {
        ctx.beginPath();
        ctx.arc(col * cell + cell / 2, row * cell + cell / 2, cell / 2 - 2, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = (color == 'white') ? 2 : 1;
        ctx.stroke();
      }
      if (sq == userMove) {
        let color = board[sq] == 1 ? 'white' : 'black';
        ctx.beginPath();
        ctx.arc(col * cell+(cell/4)*2, row * cell +(cell/4)*2, cell / 5 - 2, 0, 2 * Math.PI);
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
  if (board[sq] != EMPTY) side = userSide; 
  if (gameOver || side != userSide) return;
  setStone(sq, side, true);
  drawBoard();
  let move = {"i": [92, table, 0, (row * 19 + col), 0]};
  let message = JSON.stringify(move);
  ipcRenderer.send('main', message);
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
  let command = {"i": []};
  switch (action) {
    case 'join':
      command.i = [72, table];
      logs = '';
      break;
    case 'leave':
      command.i = [73, table];
      initGoban();
      drawBoard();
      table = 0;
      logs = '';
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
  }
  let message = JSON.stringify(command);
  ipcRenderer.send('main', message);
}

function resizeCanvas() {
  canvas.width = window.innerHeight-34;
  canvas.height = canvas.width;
  drawBoard();
  document.getElementById('panel').innerHTML = `
    <div id="lobby" style="margin: 4px; margin-top: 16px; overflow: scroll; width: ` + (canvas.width-200) + `px; height: ` + (canvas.height-33) + `px; border: 2px solid black;"></div>
    <div style="display: flex; gap: 4px;  width: ` + (canvas.width-198) + `px;">
      <input id="table" type="number" value="` + table + `" style="width: 125%; font-size: 18px;"/>
      <button onclick="sendMessage('join');" style="font-size: 15px;">▽</button>
      <button onclick="sendMessage('leave');" style="font-size: 15px;">△</button>
      <button onclick="sendMessage('black');" style="font-size: 20px;">●</button>
      <button onclick="sendMessage('white');" style="font-size: 20px;">○</button>
      <button onclick="sendMessage('start');" style="font-size: 15px;">▷</button>
      <button onclick="sendMessage('pass');" style="font-size: 15px;">□</button>
      <button onclick="sendMessage('resign');" style="font-size: 15px;">❌</button>
      <button onclick="(async () => { if(table in games) alert(await evaluatePosition()); })();">EVAL</button>
      <button onclick="if (!gameOver && side == userSide) playMove();">AI</button>
      <button onclick="sendMessage('connect');">CONNECT</button>
    </div>
  `;
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
  window.addEventListener('resize', resizeCanvas);
  initGoban();
  resizeCanvas();
}
