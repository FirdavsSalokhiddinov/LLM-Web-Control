# Architecture

```
 ┌────────────────────┐        HTTP POST /cmd          ┌──────────────┐        WebSocket           ┌───────────────────┐
 │ Claude Code session│ ───────────────────────────────▶│ bridge-server │◀──────────────────────────▶│ Chrome extension  │
 │ (this terminal)    │   Authorization: Bearer <token>│ (Node, :8765) │   register {token}, cmd/result│ background.js     │
 └────────────────────┘                                 └──────────────┘                             └─────────┬─────────┘
                                                                                                                 │
                                                                                         chrome.scripting / chrome.debugger (CDP)
                                                                                                                 ▼
                                                                                                          your real browser tabs
```

## Why a bridge server, not a direct connection

Claude Code (me) doesn't run inside the browser and can't open a WebSocket to
an extension directly from the Bash tool in a clean request/response way.
The bridge is a tiny stateful relay: it holds the one WebSocket connection
to the extension open, and turns each of my HTTP requests into a
request/response over that socket, matched by an id.

## Why `chrome.debugger` instead of just content scripts

Content scripts can dispatch synthetic DOM events, but many sites distinguish
"trusted" (real user) input from synthetic events and ignore the latter
(e.g. for form submission, drag handles, canvas apps). `chrome.debugger`
attaches the Chrome DevTools Protocol to a tab and issues `Input.dispatchMouseEvent`,
`Input.dispatchKeyEvent`, and `Input.insertText` — the same primitives DevTools
itself uses — which appear as trusted input. This is what makes "click" and
"type" commands work reliably across arbitrary sites, and what makes
screenshot+coordinate fallback viable when no DOM selector can be resolved
(e.g. canvas-rendered UI).

## Command flow

1. You ask me to do something in the browser.
2. I decide on an action (e.g. `snapshot` to read the page, then `click` on
   a selector found in that snapshot).
3. I run `curl -X POST http://127.0.0.1:8765/cmd -H "Authorization: Bearer $TOKEN" -d '{"action":"click","params":{"selector":"#submit"}}'`.
4. The bridge forwards `{id, type:"cmd", action, params}` over the open
   WebSocket to the extension.
5. `background.js` runs the action (attaching the debugger to the tab if not
   already attached) and sends back `{id, ok, data}`.
6. The bridge resolves the matching pending HTTP request with that result.

## DOM-first, screenshot fallback

The `snapshot` command returns a structured list of interactive elements
(tag, role, visible text, bounding box, a CSS selector) extracted by an
injected content function (`chrome.scripting.executeScript`). I use this to
pick a `selector` for `click`/`type` whenever possible — it's faster and more
reliable than reasoning over pixels.

When an element can't be resolved via the DOM (canvas-based UI, shadow DOM
edge cases, custom widgets with no stable selector), I fall back to the
`screenshot` command and click/type using raw `x`/`y` coordinates instead of
a `selector` — same CDP primitives, just aimed at coordinates I infer from
the image instead of a resolved element rect.

## Security boundary

See [SECURITY.md](SECURITY.md) — the short version: the bridge only listens
on `127.0.0.1`, requires a random per-install bearer token, and rejects any
request that carries an `Origin` header (which blocks malicious webpages
from CSRF'ing the bridge from inside your own browser).
