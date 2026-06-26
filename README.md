# claude-web-control

Lets a Claude Code session (running locally on your $20/mo plan — no Anthropic
API key, no extra billing) control your actual Chrome browser: open tabs,
click, type, scroll, read the page, and take screenshots.

There are two pieces:

- **`bridge-server/`** — a small local Node server. The extension connects to
  it over WebSocket; I (Claude, via my Bash tool) send it plain HTTP commands.
- **`extension/`** — a Chrome (MV3) extension that receives commands from the
  bridge and executes them against your real tabs, using `chrome.debugger`
  (Chrome DevTools Protocol) for trusted clicks/typing and content-script
  injection for reading the DOM.

See [docs/](docs/) for setup, the wire protocol, the full command reference,
and the security model.

## Quick start

```bash
cd bridge-server
npm install
npm start
```

This prints a token and starts listening on `http://127.0.0.1:8765`.

Then load the extension:

1. Open `chrome://extensions`, enable Developer mode.
2. "Load unpacked" → select the `extension/` folder.
3. Click the extension icon, paste the token printed by the server, click Save.

The extension badge turns **ON** (green) once it's connected. From here, just
tell me (Claude) what you want done in the browser — I drive it via the
bridge's `/cmd` endpoint.

Full docs: [docs/README.md](docs/README.md). Prefer a walkthrough?
See [docs/TUTORIAL.md](docs/TUTORIAL.md) for a click-by-click guide.
