# Tutorial: Setting Up LLM-Web-Control from Scratch

This guide walks you through setting up **LLM-Web-Control** from a fresh clone to controlling your real Chrome browser with your favorite coding LLM.

**Estimated setup time:** ~5 minutes

**Tested with:**

- ✅ Claude Code
- ✅ Codex
- ✅ Open Code
- ✅ Qwen 4B

---

## Prerequisites

You'll need:

- Google Chrome (or any Chromium-based browser such as Brave, Edge, Vivaldi, or Chromium)
- Node.js (v18 or newer recommended)

Verify Node is installed:

```bash
node -v
```

If you see **"command not found"**, install Node.js first from your package manager or https://nodejs.org.

---

## Step 1 — Install the Bridge Server

```bash
cd bridge-server
npm install
```

You should see the required packages install successfully without errors.

---

## Step 2 — Start the Bridge Server

```bash
npm start
```

You'll see output similar to:

```text
[bridge] listening on http://127.0.0.1:8765
[bridge] token: 79e355460d50113699242c0c585fa7021423c25fcdd4ac8095c5c7e930ee08cb
```

Copy the generated token—you'll use it in Step 4.

Keep this terminal running. The bridge server is the communication layer between your coding LLM and Chrome.

If you stop the server, simply run:

```bash
npm start
```

again later. The token is stored in:

```text
bridge-server/.token
```

so it remains the same between restarts.

If you ever need to view the token:

```bash
cat bridge-server/.token
```

---

## Step 3 — Load the Chrome Extension

1. Open:

```
chrome://extensions
```

2. Enable **Developer mode**.

3. Click **Load unpacked**.

4. Select the project's `extension/` folder.

5. You should now see **LLM-Web-Control** in your extensions list.

(Optional) Pin the extension to your toolbar by clicking Chrome's puzzle-piece icon and selecting the pin.

---

## Step 4 — Connect the Extension

1. Click the **LLM-Web-Control** extension icon.
2. Paste the token copied from Step 2.
3. Click **Save**.

Within a second, the toolbar badge should display:

```
ON
```

in green.

If it doesn't:

- Ensure the bridge server is still running.
- Verify the token was copied correctly.
- Open the extension's **Service Worker** console from `chrome://extensions` to inspect any errors.

---

## Step 5 — Verify the Connection

Open a second terminal:

```bash
cd bridge-server

TOKEN=$(cat .token)

curl -s \
  -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8765/status
```

Expected output:

```json
{
  "ok": true,
  "extensionConnected": true
}
```

If `extensionConnected` is `false`, revisit Step 4.

---

## Step 6 — Send Your First Command

Open any webpage in Chrome (for example, https://example.com) and make it the active tab.

Request a DOM snapshot:

```bash
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"snapshot"}'
```

You'll receive JSON describing:

- Current URL
- Page title
- Interactive elements
- CSS selectors
- Bounding boxes
- Form fields
- Buttons
- Links

The first command may briefly display Chrome's:

> This extension is debugging this browser

notification.

This is expected because LLM-Web-Control uses the Chrome DevTools Protocol (`chrome.debugger`) to generate trusted browser input.

---

## Step 7 — Try Clicking Something

For example, on `https://example.com`:

```bash
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"click","params":{"selector":"a"}}'
```

The browser should immediately follow the link.

Congratulations—your bridge, extension, and browser are all communicating correctly.

---

## Step 8 — Let Your Coding LLM Take Over

From this point forward, you don't need to use `curl` manually.

Simply ask your supported coding LLM to perform browser tasks, for example:

> Open GitHub and check my notifications.

> Search for "Chrome DevTools Protocol" on Google.

> Fill out this form.

> Add this product to my shopping cart.

The LLM automatically:

1. Reads the page using `snapshot`.
2. Identifies interactive elements.
3. Executes browser commands through the bridge.
4. Falls back to screenshots and coordinate-based interaction when DOM selectors aren't available.

---

## Stopping or Restarting

Pause browser automation:

```text
Ctrl+C
```

in the bridge server terminal.

Resume later:

```bash
cd bridge-server
npm start
```

The same token will continue to work.

To completely uninstall:

- Remove the extension from `chrome://extensions`
- Delete the project folder

---

## Troubleshooting

| Problem | Solution |
|----------|----------|
| `npm install` fails | Verify `node -v` and `npm -v` work correctly. Install or reinstall Node.js if necessary. |
| Extension badge never turns **ON** | Confirm the bridge server is running and the correct token was pasted. |
| `401 Unauthorized` | Verify you're sending `Authorization: Bearer <token>` and that the token matches `.token`. |
| `403 Forbidden` | Don't send an `Origin` header. Standard `curl` requests won't include one. |
| `{"ok":false,"error":"extension not connected"}` | The extension isn't connected to the bridge yet. Recheck Step 4. |
| `{"ok":false,"error":"selector not found"}` | Refresh the page snapshot to obtain updated selectors before clicking again. |
| Chrome displays a debugging banner | Expected behavior. LLM-Web-Control uses `chrome.debugger` to generate trusted mouse and keyboard input. The banner disappears when browser control ends. |
