// Connects to the local bridge server and executes browser-control commands
// sent by a Claude Code session. See docs/ARCHITECTURE.md for the protocol.

const BRIDGE_URL = 'ws://127.0.0.1:8765/ext';
const RECONNECT_DELAY_MS = 3000;

let socket = null;
let connected = false;
const attachedTabs = new Set();

function setBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

async function getToken() {
  const { token } = await chrome.storage.local.get('token');
  return token || '';
}

function connect() {
  getToken().then((token) => {
    if (!token) {
      setBadge('!', '#cc0000');
      setTimeout(connect, RECONNECT_DELAY_MS);
      return;
    }
    socket = new WebSocket(BRIDGE_URL);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'register', token }));
      connected = true;
      setBadge('ON', '#2e7d32');
    };

    socket.onmessage = async (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.type !== 'cmd') return;
      try {
        const data = await runCommand(msg.action, msg.params || {});
        socket.send(JSON.stringify({ id: msg.id, ok: true, data }));
      } catch (err) {
        socket.send(JSON.stringify({ id: msg.id, ok: false, error: String(err && err.message || err) }));
      }
    };

    socket.onclose = () => {
      connected = false;
      setBadge('', '#000000');
      setTimeout(connect, RECONNECT_DELAY_MS);
    };

    socket.onerror = () => {
      try { socket.close(); } catch {}
    };
  });
}

chrome.runtime.onStartup.addListener(connect);
chrome.runtime.onInstalled.addListener(connect);
connect();

chrome.storage.onChanged.addListener((changes) => {
  if (changes.token) {
    try { socket && socket.close(); } catch {}
    connect();
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  attachedTabs.delete(tabId);
});

async function ensureDebuggerAttached(tabId) {
  if (attachedTabs.has(tabId)) return;
  await chrome.debugger.attach({ tabId }, '1.3');
  await chrome.debugger.sendCommand({ tabId }, 'Input.setIgnoreInputEvents', { ignore: false });
  attachedTabs.add(tabId);
}

async function cdp(tabId, method, params) {
  await ensureDebuggerAttached(tabId);
  return chrome.debugger.sendCommand({ tabId }, method, params || {});
}

async function activeTabId(params) {
  if (params && params.tabId) return params.tabId;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) throw new Error('no active tab');
  return tab.id;
}

function domSnapshotFn(maxElements) {
  function cssSelector(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 6) {
      let part = node.tagName.toLowerCase();
      if (node.classList.length) part += '.' + Array.from(node.classList).slice(0, 2).map((c) => CSS.escape(c)).join('.');
      const parent = node.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
        if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(' > ');
  }

  const selectorTags = 'a,button,input,textarea,select,[role],[onclick],summary,label';
  const nodes = Array.from(document.querySelectorAll(selectorTags));
  const items = [];
  for (const el of nodes) {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    const style = window.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    items.push({
      selector: cssSelector(el),
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role') || null,
      type: el.getAttribute('type') || null,
      name: el.getAttribute('name') || null,
      placeholder: el.getAttribute('placeholder') || null,
      text: (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 120),
      href: el.getAttribute('href') || null,
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
    });
    if (items.length >= maxElements) break;
  }
  return {
    url: location.href,
    title: document.title,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    elements: items,
  };
}

async function execInPage(tabId, func, args) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args: args || [],
  });
  return result;
}

async function resolveRect(tabId, selector) {
  const rect = await execInPage(
    tabId,
    (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const r2 = el.getBoundingClientRect();
      return { x: r2.x, y: r2.y, width: r2.width, height: r2.height };
    },
    [selector]
  );
  if (!rect) throw new Error(`selector not found: ${selector}`);
  return rect;
}

async function mouseClick(tabId, x, y) {
  await cdp(tabId, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await cdp(tabId, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp(tabId, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function mouseDrag(tabId, x1, y1, x2, y2, steps) {
  const n = steps || 10;
  await cdp(tabId, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1, y: y1 });
  await cdp(tabId, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: x1, y: y1, button: 'left', clickCount: 1 });
  for (let i = 1; i <= n; i++) {
    const x = x1 + (x2 - x1) * (i / n);
    const y = y1 + (y2 - y1) * (i / n);
    await cdp(tabId, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 1 });
  }
  await cdp(tabId, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: x2, y: y2, button: 'left', clickCount: 1 });
}

const KEY_MAP = {
  Enter: { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 },
  Tab: { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 },
  Escape: { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 },
  Backspace: { key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 },
  Delete: { key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46 },
  Space: { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' },
  ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 },
  ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 },
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 },
};

// Falls back to a generated spec for any single letter/digit, so tool
// shortcuts (e.g. Excalidraw's "r" for rectangle, "t" for text) work without
// needing an entry in KEY_MAP.
function keySpecFor(key) {
  if (KEY_MAP[key]) return KEY_MAP[key];
  if (/^[a-z]$/.test(key)) {
    return { key, code: 'Key' + key.toUpperCase(), windowsVirtualKeyCode: 65 + (key.charCodeAt(0) - 97), text: key };
  }
  if (/^[A-Z]$/.test(key)) {
    return { key, code: 'Key' + key, windowsVirtualKeyCode: 65 + (key.charCodeAt(0) - 65), text: key, shiftKey: true };
  }
  if (/^[0-9]$/.test(key)) {
    return { key, code: 'Digit' + key, windowsVirtualKeyCode: 48 + Number(key), text: key };
  }
  return null;
}

async function runCommand(action, params) {
  switch (action) {
    case 'ping':
      return { pong: true };

    case 'listTabs': {
      const tabs = await chrome.tabs.query({});
      return tabs.map((t) => ({ id: t.id, url: t.url, title: t.title, active: t.active, windowId: t.windowId }));
    }

    case 'newTab': {
      const tab = await chrome.tabs.create({ url: params.url || 'about:blank' });
      return { tabId: tab.id };
    }

    case 'closeTab': {
      const tabId = await activeTabId(params);
      await chrome.tabs.remove(tabId);
      return { closed: tabId };
    }

    case 'switchTab': {
      const tab = await chrome.tabs.update(params.tabId, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
      return { tabId: tab.id };
    }

    case 'navigate': {
      const tabId = await activeTabId(params);
      await chrome.tabs.update(tabId, { url: params.url });
      return { tabId };
    }

    case 'getPageInfo': {
      const tabId = await activeTabId(params);
      return execInPage(tabId, () => ({ url: location.href, title: document.title }));
    }

    case 'snapshot': {
      const tabId = await activeTabId(params);
      return execInPage(tabId, domSnapshotFn, [params.maxElements || 150]);
    }

    case 'extractText': {
      const tabId = await activeTabId(params);
      return execInPage(
        tabId,
        (sel) => {
          const el = sel ? document.querySelector(sel) : document.body;
          return el ? el.innerText : null;
        },
        [params.selector || null]
      );
    }

    case 'click': {
      const tabId = await activeTabId(params);
      let x = params.x;
      let y = params.y;
      if (params.selector) {
        const rect = await resolveRect(tabId, params.selector);
        x = rect.x + rect.width / 2;
        y = rect.y + rect.height / 2;
      }
      if (x === undefined || y === undefined) throw new Error('click requires selector or x/y');
      await mouseClick(tabId, x, y);
      return { clicked: { x, y } };
    }

    case 'type': {
      const tabId = await activeTabId(params);
      if (params.selector) {
        const rect = await resolveRect(tabId, params.selector);
        await mouseClick(tabId, rect.x + rect.width / 2, rect.y + rect.height / 2);
      }
      await cdp(tabId, 'Input.insertText', { text: params.text || '' });
      return { typed: params.text || '' };
    }

    case 'pressKey': {
      const tabId = await activeTabId(params);
      const spec = keySpecFor(params.key);
      if (!spec) throw new Error(`unsupported key: ${params.key}`);
      await cdp(tabId, 'Input.dispatchKeyEvent', { type: 'keyDown', ...spec });
      await cdp(tabId, 'Input.dispatchKeyEvent', { type: 'keyUp', ...spec });
      return { pressed: params.key };
    }

    case 'drag': {
      const tabId = await activeTabId(params);
      const { x1, y1, x2, y2, steps } = params;
      if ([x1, y1, x2, y2].some((v) => v === undefined)) {
        throw new Error('drag requires x1, y1, x2, y2');
      }
      await mouseDrag(tabId, x1, y1, x2, y2, steps);
      return { dragged: { from: { x: x1, y: y1 }, to: { x: x2, y: y2 } } };
    }

    case 'scroll': {
      const tabId = await activeTabId(params);
      await execInPage(
        tabId,
        (dx, dy) => window.scrollBy(dx, dy),
        [params.deltaX || 0, params.deltaY || 0]
      );
      return { scrolled: true };
    }

    case 'screenshot': {
      const tabId = await activeTabId(params);
      const tab = await chrome.tabs.get(tabId);
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
      const base64 = dataUrl.split(',')[1];
      return { base64 };
    }

    default:
      throw new Error(`unknown action: ${action}`);
  }
}
