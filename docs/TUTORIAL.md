# Tutorial: From Zero to Web Crawling with Local LLMs

This walkthrough sets up **LLM-Powered-Web** from scratch and gets your local LLM crawling and scraping the web.

**Estimated time:** ~5 minutes

**Tested with:** Codex · Claude Code · OpenCode · Qwen 4B · Llama 3.3 · Kimi K2.6

---

## Prerequisites

- **Google Chrome** (or Brave, Edge, Vivaldi, Chromium)
- **Node.js 18+**

Verify Node:

```bash
node -v
```

If you see "command not found", install Node.js from [nodejs.org](https://nodejs.org) or your package manager.

---

## Step 1 — Install the Bridge

```bash
cd bridge-server
npm install
```

Wait for dependencies to install (single dependency: `ws`).

---

## Step 2 — Start the Bridge

```bash
npm start
```

You'll see:

```
[bridge] listening on http://127.0.0.1:8765
[bridge] token (paste into extension popup): 79e355460d50...ee08cb
```

**Copy the token.** Keep this terminal running — the bridge is the communication layer between your LLM and Chrome.

The token is stored in `bridge-server/.token` and persists across restarts. View it anytime with:

```bash
cat bridge-server/.token
```

---

## Step 3 — Load the Extension

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. The extension appears in your list

(Optional) Pin the extension to your toolbar for easy access.

---

## Step 4 — Connect the Extension

1. Click the LLM-Powered-Web extension icon
2. Paste the token from Step 2
3. Click **Save**

Within a second, the badge turns green and displays **ON**.

**Troubleshooting:** If it doesn't connect:
- Is the bridge server still running?
- Was the token copied correctly?
- Open the extension's Service Worker console from `chrome://extensions` to inspect errors

---

## Step 5 — Verify the Connection

Open a second terminal:

```bash
cd bridge-server
TOKEN=$(cat .token)
curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8765/status
```

Expected:

```json
{"ok":true,"extensionConnected":true}
```

If `extensionConnected` is `false`, revisit Step 4.

---

## Step 6 — Your First Crawl: Snapshot a Page

Navigate to any webpage in Chrome (e.g., `https://example.com`) and make it the active tab.

Request a DOM snapshot:

```bash
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"snapshot"}'
```

You'll receive JSON with:
- Current URL and page title
- All interactive elements (links, buttons, inputs)
- CSS selectors ready for targeting
- Bounding box coordinates
- Form fields and their types

The first command may briefly show Chrome's **"This extension is debugging this browser"** banner — this is standard CDP behavior.

---

## Step 7 — Navigate and Scrape

Now let's crawl: navigate to a new page, snapshot it, and extract text.

```bash
# Navigate to a URL
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"navigate","params":{"url":"https://example.com"}}'

# Wait a moment, then snapshot
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"snapshot"}'

# Extract text from the body
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"extractText"}'
```

---

## Step 8 — Click and Interact

On `https://example.com`:

```bash
# Click the first link
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"click","params":{"selector":"a"}}'
```

The browser follows the link immediately.

---

## Step 9 — Let Your Local LLM Take Over

From this point, you never need `curl` again. Just tell your LLM what to do:

> Crawl the Hacker News front page and summarize the top 5 stories.
>
> Go to Wikipedia, search for "Local LLM", and save the first paragraph.
>
> Open GitHub, check my notifications, and report back.
>
> Find all product links on this page and open each in a new tab.

Your LLM automatically:
1. Reads pages with `snapshot`
2. Identifies interactive elements and selectors
3. Sends commands through the bridge
4. Falls back to screenshots + coordinates when needed
5. Builds multi-step crawl pipelines

---

## Stopping or Restarting

**Pause automation:** `Ctrl+C` in the bridge terminal.

**Resume:**

```bash
cd bridge-server
npm start
```

Same token works. No reconfiguration needed.

**Uninstall:**
1. Stop the bridge
2. Remove extension from `chrome://extensions`
3. Delete the project folder

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `npm install` fails | Verify `node -v` and `npm -v`. Install or reinstall Node.js. |
| Badge never turns green | Bridge running? Token correct? Check Service Worker console. |
| `401 Unauthorized` | Check `Authorization: Bearer <token>` matches `.token`. |
| `403 Forbidden` | You're sending an `Origin` header. Don't. |
| `extension not connected` | Extension hasn't authenticated yet. Recheck connection. |
| `selector not found` | Refresh with `snapshot` before clicking — selectors change on navigation. |
| Debugging banner visible | Expected. CDP requirement. Disappears when automation stops. |
