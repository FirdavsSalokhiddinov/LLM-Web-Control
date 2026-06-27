# LLM-Web-Control — Setup & Usage

## What is LLM-Web-Control?

LLM-Web-Control lets your favorite coding LLM control your real, logged-in Chrome browser—using the same cookies, sessions, tabs, and profiles you already have. Simply interact with your coding LLM as usual, and it can automate browser tasks through the local bridge server.

No additional API keys or usage fees are required beyond your existing coding LLM setup.

**Tested with:**

- ✅ Claude Code
- ✅ Codex
- ✅ Open Code
- ✅ Qwen 4B

## Project Structure

```text
llm-web-control/
├── bridge-server/   Local Node.js bridge (HTTP + WebSocket), listens on 127.0.0.1:8765
├── extension/       Chrome MV3 extension (loaded unpacked)
└── docs/            Documentation
```

## One-time Setup

### 1. Install and start the bridge server

```bash
cd bridge-server
npm install
npm start
```

On the first launch, the bridge server:

- Generates a random authentication token
- Stores it in `bridge-server/.token` (gitignored)
- Prints the token to the terminal

Keep the bridge server running—it's the communication layer between your coding LLM and Chrome.

---

### 2. Load the Chrome extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Click the extension icon
6. Paste the token from Step 1
7. Click **Save**

---

### 3. Verify the connection

Once connected, the extension badge turns **green** and displays **ON**.

If you restart the bridge server later, it automatically reloads the token from `.token`, so you won't need to paste it again unless you delete the file.

---

## Daily Usage

After both the bridge server and extension are running, simply ask your supported coding LLM to perform browser tasks, for example:

- Open GitHub and check notifications
- Fill out a form
- Read a webpage
- Click buttons
- Search for information
- Take screenshots
- Navigate between tabs

The workflow is simple:

1. Your coding LLM sends an HTTP command to the bridge server.
2. The bridge forwards the command to the Chrome extension over WebSocket.
3. The extension performs the requested action inside your real browser.
4. Results such as DOM snapshots, extracted text, screenshots, or browser state are returned to the LLM.
5. The LLM uses those results to determine the next action.

While controlling a tab, Chrome displays the standard **"This extension is debugging this browser"** banner. This is expected behavior because LLM-Web-Control uses `chrome.debugger` (the same API used by Chrome DevTools) to generate trusted mouse and keyboard input.

---

## Stopping LLM-Web-Control

To stop browser automation, simply:

- Press **Ctrl+C** in the bridge server terminal, or
- Disable or remove the Chrome extension.

When the bridge server is not running, the extension remains idle and your browser behaves normally.

---

## Documentation

For additional information, see:

- **`TUTORIAL.md`** — Step-by-step walkthrough
- **`ARCHITECTURE.md`** — Internal architecture and design
- **`COMMANDS.md`** — Complete command reference
- **`SECURITY.md`** — Security model and threat boundaries
