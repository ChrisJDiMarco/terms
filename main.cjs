const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

app.setName('Terms');
if (process.env.TERMS_TEST_DATA) app.setPath('userData', process.env.TERMS_TEST_DATA);
let server;
let origin;
let window;
let saveQueue = Promise.resolve();
let finishingQuit = false;
const root = path.join(__dirname, 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const savePath = () => path.join(app.getPath('userData'), 'table.json');

function validSender(event) {
  return window && event.sender === window.webContents && event.senderFrame === window.webContents.mainFrame && event.senderFrame.url.startsWith(origin + '/');
}

ipcMain.handle('terms:load', async event => {
  if (!validSender(event)) throw new Error('Invalid sender');
  try { return JSON.parse(await fs.readFile(savePath(), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; return { loadError: 'Your saved table could not be read. A new game is ready.' }; }
});
ipcMain.handle('terms:save', async (event, value) => {
  if (!validSender(event)) throw new Error('Invalid sender');
  const encoded = JSON.stringify(value);
  if (!value || value.version !== 1 || encoded.length > 65536) throw new Error('Invalid save');
  const write = async () => {
    await fs.mkdir(app.getPath('userData'), { recursive: true });
    await fs.writeFile(savePath() + '.tmp', encoded, 'utf8');
    await fs.rename(savePath() + '.tmp', savePath());
    return true;
  };
  saveQueue = saveQueue.catch(() => {}).then(write);
  return saveQueue;
});

async function createWindow() {
  window = new BrowserWindow({ width: 1440, height: 960, minWidth: 1080, minHeight: 760, title: 'Terms', backgroundColor: '#111d28', titleBarStyle: 'hiddenInset', show: false, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, spellcheck: false } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => { if (url !== origin + '/') event.preventDefault(); });
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  window.webContents.session.setPermissionCheckHandler(() => false);
  window.once('ready-to-show', () => window.show());
  window.on('closed', () => { window = null; });
  await window.loadURL(origin + '/');
}

app.whenReady().then(async () => {
  server = http.createServer(async (request, response) => {
    try {
      if (request.headers.host !== new URL(origin).host) { response.writeHead(403).end(); return; }
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
      const url = new URL(request.url, origin);
      const decoded = decodeURIComponent(url.pathname);
      const file = path.resolve(root, '.' + (decoded === '/' ? '/index.html' : decoded));
      if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
      const content = await fs.readFile(file);
      response.writeHead(200, {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
        'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store'
      });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch (error) { response.writeHead(error.code === 'ENOENT' ? 404 : 400).end('Unable to open this resource.'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  origin = `http://127.0.0.1:${server.address().port}`;
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Terms', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] },
    { label: 'Edit', submenu: [{ role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'togglefullscreen' }] }
  ]));
  await createWindow();
  app.on('activate', () => { if (!window) createWindow().catch(error => dialog.showErrorBox('Terms could not open', error.message)); });
}).catch(error => { dialog.showErrorBox('Terms could not open', error.message); app.quit(); });
app.on('window-all-closed', () => app.quit());
app.on('before-quit', event => {
  if (finishingQuit) return;
  event.preventDefault();
  saveQueue.catch(error => dialog.showErrorBox('The last move could not be saved', error.message)).finally(() => {
    finishingQuit = true;
    app.quit();
  });
});
app.on('will-quit', () => { if (server) server.close(); });
