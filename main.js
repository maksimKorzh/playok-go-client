const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const WebSocket = require('ws');
var socket;

function connect(win) {
  const socket = new WebSocket('wss://x.playok.com:17003/ws/', {
    headers: {
     'Origin': 'null',
    }
  });

  socket.on('open', function () {
    const initialMessage = JSON.stringify({
      "i":[1721],
      "s":[
        "+524199068774695233|1015759683|17056215",
        "en",
        "b",
        "",
        "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "/1732055368318/1",
        "w",
        "1920x1080 1",
        "ref:https://www.playok.com/en/go/",
        "ver:260"
      ]}
    );

    socket.send(initialMessage);
    win.webContents.send('websocket-message', 'open');
    console.log('Connected to the WebSocket server.');
    setInterval(function() {
      const keepAliveMessage = JSON.stringify({ "i": [] }); // Sending an empty array as a heartbeat
      socket.send(keepAliveMessage);
    }, 5000);
  });

  socket.on('message', function (data) { win.webContents.send('websocket-message', data.toString()); });
  socket.on('error', function (error) { win.webContents.send('websocket-message', 'Web socket error: ' + error.toString()); });
  socket.on('close', function () {
    win.webContents.send('websocket-message', 'close');
    console.log('WebSocket connection closed.');
  }); return socket;
}

function createWindow() {
  let win = new BrowserWindow({
    width: 1720,
    minWidth:1720,
    height: 1000,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const template = [
    {
      label: 'View',
      submenu: [
        { label: 'Reload', role: 'reload' },
        { label: 'Toggle Developer Tools', role: 'toggleDevTools' },
        { label: 'Fullscreen', role: 'togglefullscreen' },
        { label: 'Exit', role: 'quit' },
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  win.loadFile('index.html');
  socket = connect(win);
  ipcMain.on('main', (event, messageData) => {
    if (messageData == 'connect') {
      socket = connect(win);
      console.log('created new socket');
    } else socket.send(JSON.stringify(JSON.parse(messageData)));
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
