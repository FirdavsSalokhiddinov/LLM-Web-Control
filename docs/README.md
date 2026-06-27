# Setup & Usage Guide

LLM-Powered-Web turns your local coding LLM into a web crawler, scraper, and browser automation tool — with zero data leaving your machine.

**Tested with:** Codex · Claude Code · OpenCode · Qwen 4B · Llama 3.3 · Kimi K2.6

---

## One-Time Setup

### 1. Install & start the bridge server

```bash
cd bridge-server
npm install
npm start
```

On first launch, the bridge:
- Generates a random 256-bit authentication token
- Stores it in `bridge-server/.token` (automatically gitignored)
- Prints the token to the terminal

Keep the bridge server running — it's the communication layer between your LLM and Chrome.

### 2. Load the Chrome extension

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. The extension appears in your toolbar

### 3. Connect the extension

1. Click the extension icon
2. Paste the token from the terminal
3. Click **Save**

Once connected, the badge turns **green** and displays **ON**.

If you restart the bridge later, it reloads the token from `.token` — no need to re-paste unless you delete that file.

---

## Daily Usage

With the bridge running and extension connected, your LLM can drive the browser. Typical workflows:

| Task | How it works |
|---|---|
| Crawl a page | `snapshot` → read DOM elements → follow links |
| Scrape data | `extractText` → read targeted content |
| Fill & submit forms | `type` + `click` → automate workflows |
| Take screenshots | `screenshot` → analyze visually |
| Navigate | `navigate` → `newTab` → `switchTab` |

### Workflow

1. Your LLM sends an HTTP command to the bridge
2. The bridge forwards it over WebSocket to the extension
3. The extension executes the action in your real Chrome browser
4. Results (DOM data, text, screenshots) flow back to the LLM
5. The LLM decides the next action

While controlling a tab, Chrome shows **"This extension is debugging this browser"** — standard CDP behavior, not hidden.

---

## Stopping

- Press **Ctrl+C** in the bridge terminal, or
- Disable/remove the Chrome extension

The extension becomes idle when the bridge is unavailable. Your browser returns to normal.

---

## More Docs

| Document | What's inside |
|---|---|
| [TUTORIAL.md](TUTORIAL.md) | Step-by-step walkthrough from scratch |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Internal design, CDP, command flow |
| [COMMANDS.md](COMMANDS.md) | Complete command reference |
| [SECURITY.md](SECURITY.md) | Security model & privacy guarantees |
