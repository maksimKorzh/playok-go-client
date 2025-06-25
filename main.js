const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const WebSocket = require('ws');
const prompt = require('electron-prompt');
const fs = require('fs');
const https = require('https');
var socket;
var me = '';

function login(win, username, password) {
  if (username == '' && password == '') {
    me = '';
    socket = connect(win, me);
    win.loadFile('index.html');
    return;
  }
  const axios = require('axios');
  const tough = require('tough-cookie');
  const { wrapper } = require('axios-cookiejar-support');
  (async () => {
    const cookieJar = new tough.CookieJar();
    const client = wrapper(axios.create({
      jar: cookieJar,
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Referer': 'https://www.playok.com/en/',
      }
    }));
  
    await cookieJar.setCookie('ref=https://www.playok.com/en/go/; Domain=www.playok.com; Path=/', 'https://www.playok.com');
  
    const data = new URLSearchParams({
      username: username,
      pw: password,
    }).toString();
  
    const response = await client.post('https://www.playok.com/en/login.phtml', data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  
    const cookies = await cookieJar.getCookies('https://www.playok.com');
    console.log('Cookies after login:');
    
    if (response.data.toLowerCase().includes('log in')) {
      win.webContents.send('websocket-message', 'Login failed or not accepted.');
    } else {
      me = username;
      console.log('Login successful.');
      win.loadFile('index.html');
      cookies.forEach(function(c) { if (c.key == 'ksession') socket = connect(win, c.value.split(':')[0]); });
    }
  })();
}

function connect(win, ksession) {
  console.log('KSESSION:', ksession);
  const socket = new WebSocket('wss://x.playok.com:17003/ws/', {
    headers: {
     'Origin': 'null',
    }
  });

  socket.on('open', function () {
    const initialMessage = JSON.stringify({
      "i":[1721],
      "s":[
        ksession + "+524199068774695233|1015759683|17056215",
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
    win.webContents.send('websocket-message', 'username:' + (me == '' ? 'cft7821g' : me));
    console.log('Connected to the WebSocket server.');
    setInterval(function() {
      const keepAliveMessage = JSON.stringify({ "i": [] }); // Sending an empty array as a heartbeat
      socket.send(keepAliveMessage);
    }, 5000);
  });

  socket.on('message', function (data) { win.webContents.send('websocket-message', data.toString()); });
  socket.on('error', function (error) { win.webContents.send('websocket-message', 'Web socket error: ' + error.toString()); });
  socket.on('close', function () {
    win.loadFile('login.html');
    console.log('WebSocket connection closed.');
  }); return socket;
}

function createWindow() {
  let win = new BrowserWindow({
    fullscreen: true,
    width: 1720,
    minWidth:1720,
    height: 1000,
    webPreferences: {
      preload: __dirname + '/preload.js'
    }
  });

  const template = [
    {
      label: 'View',
      submenu: [
        {
          label: 'Reconnect',
          accelerator: 'Ctrl+r',
          click: () => {
            try { socket.close(); } catch {}
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.loadFile('login.html');
            }
          }
        },
        { label: 'Toggle Developer Tools', role: 'toggleDevTools' },
        { label: 'Fullscreen', role: 'togglefullscreen' },
        { label: 'Exit', role: 'quit' },
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  win.loadFile('login.html');
  ipcMain.on('main', (event, messageData) => {
    if (messageData.username == 'guest') {
      console.log('GUEST LOGIN');
      login(win, '', '');
    } else if (messageData.username || messageData.password) {
      console.log('LOGIN:', messageData);
      login(win, messageData.username, messageData.password);
    } else if (messageData.includes('download')) {
      const win = new BrowserWindow({autoHideMenuBar: true});
      let userName = messageData.split('-')[1];
      let url = 'https://www.playok.com/en/stat.phtml?u=' + userName + '&g=go&sk=2';
      win.webContents.setWindowOpenHandler(({ url }) => {
        const savePath = '/home/cmk/go-rank-estimator/game.sgf';
        const file = fs.createWriteStream(savePath);
        https.get(url, (response) => {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log('Download completed:', savePath);
          });
        }).on('error', (err) => {
          fs.unlink(savePath, () => {});
          console.error('Download failed:', err.message);
        });
        return { action: 'allow'};
      });
      win.loadURL(url);
    } else socket.send(JSON.stringify(JSON.parse(messageData)));
  });
  ipcMain.handle('show-prompt', async (event, options) => {
    return await prompt(options, win);
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
