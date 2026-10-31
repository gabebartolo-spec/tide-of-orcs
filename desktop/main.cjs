// Electron shell for the desktop (Steam) build (TB-074). Serves the Vite build in dist/
// over app://tide so fetch(), module scripts and localStorage behave as on the web.
const { app, BrowserWindow, protocol, net, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DIST = path.join(__dirname, '..', 'dist');
const ORIGIN = 'app://tide';

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function serve() {
  protocol.handle('app', (req) => {
    const rel = decodeURIComponent(new URL(req.url).pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.normalize(path.join(DIST, rel));
    if (!file.startsWith(DIST + path.sep)) return new Response('forbidden', { status: 403 });
    // a missing optional file (sprites/atlas.json, build.json) answers 404 like a static host
    return net.fetch(pathToFileURL(file).toString()).catch(() => new Response('not found', { status: 404 }));
  });
}

function open() {
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 960, minHeight: 600,
    backgroundColor: '#1b2130' /* palette ink */, autoHideMenuBar: true, show: false,
    // backgroundThrottling stays on: a minimised window stops rAF, so nothing accrues offline (rule 2)
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  win.once('ready-to-show', () => win.show());
  // external links open in the system browser, never inside the game window
  win.webContents.setWindowOpenHandler(({ url }) => { void shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(ORIGIN)) e.preventDefault(); });
  void win.loadURL(`${ORIGIN}/index.html`);
}

app.whenReady().then(() => { serve(); open(); });
app.on('window-all-closed', () => app.quit());
