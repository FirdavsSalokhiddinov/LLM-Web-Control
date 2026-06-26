# Tutorial: setting it up from scratch

This walks through everything from a clean checkout to Claude clicking around
in your real Chrome browser. Total time: ~5 minutes.

## Prerequisites

- Google Chrome (or Chromium/Brave/Edge/Vivaldi — anything Chromium-based)
- Node.js installed (`node -v` should print something; v18+ recommended)

Check Node is installed:

```bash
node -v
```

If that errors with "command not found", install Node first (e.g. via your
package manager or https://nodejs.org), then continue.

## Step 1 — Install the bridge server's dependencies

```bash
cd /home/francue/Desktop/claude-powered/bridge-server
npm install
```

You should see `added 1 package` (the `ws` library) and no errors.

## Step 2 — Start the bridge server

```bash
npm start
```

You'll see output like:

```
[bridge] listening on http://127.0.0.1:8765
[bridge] token (paste into extension popup): 79e355460d50113699242c0c585fa7021423c25fcdd4ac8095c5c7e930ee08cb
```

**Copy that token** — you'll paste it into the extension in Step 4.

Leave this terminal window open and running. This server has to stay alive
the whole time you want browser control to work. (If you close it, just
`npm start` again later — the token is saved in `bridge-server/.token` and
won't change.)

> If you ever lose the token, run this in a second terminal:
> `cat /home/francue/Desktop/claude-powered/bridge-server/.token`

## Step 3 — Load the extension into Chrome

1. Open Chrome and go to `chrome://extensions`
2. Turn on **Developer mode** (toggle, top-right corner of the page)
3. Click **Load unpacked**
4. In the file picker, select the folder:
   `/home/francue/Desktop/claude-powered/extension`
5. You should now see a card for **"Claude Browser Control"** in your
   extensions list, version `0.1.0`

Pin it to your toolbar for convenience: click the puzzle-piece icon in
Chrome's toolbar → click the pin icon next to "Claude Browser Control".

## Step 4 — Connect the extension to the bridge

1. Click the **Claude Browser Control** icon in your toolbar
2. A small popup opens with a "Bridge token" field
3. Paste the token you copied in Step 2
4. Click **Save**

Within a second or two, the extension's toolbar icon should show a small
green **`ON`** badge — that means it successfully connected to the bridge
server over WebSocket.

If you don't see `ON`:
- Check the bridge server terminal is still running (Step 2)
- Re-check you pasted the *whole* token with no extra spaces
- Open `chrome://extensions`, click "service worker" under the extension's
  card to see its console log for errors

## Step 5 — Verify the connection from the command line

In a new terminal:

```bash
cd /home/francue/Desktop/claude-powered/bridge-server
TOKEN=$(cat .token)
curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8765/status
```

Expected output:

```json
{"ok":true,"extensionConnected":true}
```

If `extensionConnected` is `false`, go back to Step 4.

## Step 6 — Try your first command

Open any normal webpage in Chrome (e.g. `https://example.com`) in the tab
you want to control, make it the active tab, then run:

```bash
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"snapshot"}'
```

You should get back JSON describing the page — its title, URL, and a list
of interactive elements (links, buttons, etc.) with selectors. You may
briefly see Chrome's "Claude Browser Control started debugging this
browser" banner appear on that tab the first time a command touches it —
that's expected (see [SECURITY.md](SECURITY.md)).

Try clicking something on the page — e.g. on `https://example.com` there's a
"More information..." link:

```bash
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"click","params":{"selector":"a"}}'
```

Watch the tab navigate. That confirms full control is working end to end.

## Step 7 — Hand control to Claude

From here, you don't need to run `curl` commands yourself — that's my job.
Just tell me in this chat what you want done in the browser, for example:

> "Open github.com and tell me how many notifications I have"

> "Go to this product page and add it to my cart"

I'll use `snapshot` to read the page, decide on selectors, and issue
`click`/`type`/`navigate` commands through the bridge automatically, falling
back to `screenshot` + coordinates if I can't resolve something via the DOM.

## Stopping / restarting

- **Pause control:** just stop the bridge server (`Ctrl+C` in its terminal).
  The extension badge goes dark; your browser behaves completely normally.
- **Resume later:** `cd bridge-server && npm start` again — same token,
  no need to redo the extension setup.
- **Fully uninstall:** remove the extension from `chrome://extensions`,
  then delete the `claude-powered` folder.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `npm install` fails | Check `node -v` / `npm -v` work at all; reinstall Node if missing |
| Badge never turns `ON` | Confirm bridge server is running and printed a token; re-paste token in popup |
| `curl` returns `401` | You forgot `-H "Authorization: Bearer $TOKEN"`, or token is stale — re-`cat .token` |
| `curl` returns `403` | You added an `Origin` header by hand — don't; plain `curl` doesn't send one |
| `{"ok":false,"error":"extension not connected"}` | Extension popup badge isn't `ON` yet — see Step 4 |
| `{"ok":false,"error":"selector not found: ..."}` | The element isn't on the page yet, or selector was wrong — call `snapshot` again to get a fresh list |
| Chrome shows a debugging banner | Expected — `chrome.debugger` is how trusted clicks/typing work. Goes away when the tab is no longer being controlled. |
