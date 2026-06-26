const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT ? Number(process.env.PORT) : 8765;
const TOKEN_FILE = path.join(__dirname, '.token');
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const CMD_TIMEOUT_MS = 20000;

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function loadOrCreateToken() {
  if (fs.existsSync(TOKEN_FILE)) {
    return fs.readFileSync(TOKEN_FILE, 'utf8').trim();
  }
  const token = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(TOKEN_FILE, token, { mode: 0o600 });
  return token;
}

const TOKEN = loadOrCreateToken();

let extSocket = null;
const pending = new Map(); // id -> {resolve, reject, timer}

function send400(res, message) {
  res.writeHead(400, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: message }));
}

function send401(res) {
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
}

function send403(res, message) {
  res.writeHead(403, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: message || 'forbidden' }));
}

function isAuthorized(req) {
  // Reject anything sent by an actual page/browser fetch: real cross-context
  // browser requests always carry an Origin header. Plain tools like curl,
  // or this Claude Code session's Bash tool, do not.
  if (req.headers.origin) return false;
  const auth = req.headers['authorization'] || '';
  const match = auth.match(/^Bearer (.+)$/);
  return !!match && match[1] === TOKEN;
}

function dispatchCommand(action, params) {
  return new Promise((resolve, reject) => {
    if (!extSocket || extSocket.readyState !== extSocket.OPEN) {
      reject(new Error('extension not connected'));
      return;
    }
    const id = crypto.randomUUID();
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('command timed out'));
    }, CMD_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer });
    extSocket.send(JSON.stringify({ id, type: 'cmd', action, params: params || {} }));
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/status') {
    if (!isAuthorized(req)) return send401(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, extensionConnected: !!extSocket }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/cmd') {
    if (!isAuthorized(req)) return send401(res);
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      let parsed;
      try {
        parsed = JSON.parse(body || '{}');
      } catch {
        return send400(res, 'invalid json');
      }
      const { action, params } = parsed;
      if (!action) return send400(res, 'missing action');
      try {
        const data = await dispatchCommand(action, params);
        if (action === 'screenshot' && data && data.base64) {
          const filename = `${Date.now()}.png`;
          const filePath = path.join(SCREENSHOT_DIR, filename);
          fs.writeFileSync(filePath, Buffer.from(data.base64, 'base64'));
          data.path = filePath;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, data }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  send400(res, 'not found');
});

const wss = new WebSocketServer({ server, path: '/ext' });

wss.on('connection', (socket, req) => {
  let registered = false;

  socket.once('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      socket.close();
      return;
    }
    if (msg.type !== 'register' || msg.token !== TOKEN) {
      socket.close();
      return;
    }
    registered = true;
    if (extSocket) {
      try { extSocket.close(); } catch {}
    }
    extSocket = socket;
    console.log('[bridge] extension connected');

    socket.on('message', (raw2) => {
      let result;
      try {
        result = JSON.parse(raw2.toString());
      } catch {
        return;
      }
      const entry = pending.get(result.id);
      if (!entry) return;
      clearTimeout(entry.timer);
      pending.delete(result.id);
      if (result.ok) entry.resolve(result.data);
      else entry.reject(new Error(result.error || 'unknown error'));
    });

    socket.on('close', () => {
      if (extSocket === socket) {
        extSocket = null;
        console.log('[bridge] extension disconnected');
      }
    });
  });

  setTimeout(() => {
    if (!registered) socket.close();
  }, 5000);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[bridge] listening on http://127.0.0.1:${PORT}`);
  console.log(`[bridge] token (paste into extension popup): ${TOKEN}`);
});
