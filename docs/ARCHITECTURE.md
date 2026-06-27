# Architecture

```text
 ┌──────────────────────────┐        HTTP POST /cmd         ┌──────────────┐        WebSocket           ┌───────────────────┐
 │ Supported Coding LLM     │ ─────────────────────────────▶│ bridge-server │◀──────────────────────────▶│ Chrome extension  │
 │ (Claude Code, Codex,     │   Authorization: Bearer <token>│ (Node, :8765) │   register {token}, cmd/result│ background.js     │
 │ Open Code, Qwen, etc.)   │                               └──────────────┘                             └─────────┬─────────┘
 └──────────────────────────┘                                                                               │
                                                                                     chrome.scripting / chrome.debugger (CDP)
                                                                                                            ▼
                                                                                                     Your real Chrome tabs
```

## Why a bridge server instead of a direct connection?

Coding LLMs don't run inside the browser and can't communicate directly with a Chrome extension in a clean request/response workflow. The bridge server acts as a lightweight stateful relay, maintaining a persistent WebSocket connection to the extension while exposing a simple HTTP API that any supported coding LLM can use.

Each HTTP request is converted into a WebSocket command, tracked by a unique request ID, and the response is returned back to the LLM.

## Why `chrome.debugger` instead of only content scripts?

Content scripts can dispatch synthetic DOM events, but many modern websites distinguish between synthetic events and trusted user input, ignoring the former for security reasons (for example, form submissions, drag-and-drop interfaces, canvas applications, and complex editors).

`chrome.debugger` attaches to a tab using the Chrome DevTools Protocol (CDP) and sends real input events such as:

- `Input.dispatchMouseEvent`
- `Input.dispatchKeyEvent`
- `Input.insertText`

These are the same primitives used by Chrome DevTools itself, making clicks, typing, scrolling, and coordinate-based interactions reliable across virtually any website.

## Command flow

1. You ask your coding LLM to perform an action in Chrome.
2. The LLM determines the required commands (for example, `snapshot` followed by `click`).
3. The LLM sends an HTTP request to the bridge:

```bash
curl -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"click","params":{"selector":"#submit"}}'
```

4. The bridge forwards the command over the WebSocket as:

```json
{
  "id": "...",
  "type": "cmd",
  "action": "click",
  "params": { ... }
}
```

5. The Chrome extension executes the action (attaching the debugger if necessary) and returns:

```json
{
  "id": "...",
  "ok": true,
  "data": { ... }
}
```

6. The bridge matches the response to the original request and returns the result to the LLM.

## DOM-first, screenshot fallback

The `snapshot` command extracts a structured list of interactive elements using `chrome.scripting.executeScript`, including:

- HTML tag
- ARIA role
- Visible text
- Bounding box
- CSS selector

Whenever possible, browser actions target these DOM elements directly, making interactions fast and reliable.

If no stable selector can be resolved—such as with canvas-rendered interfaces, complex Shadow DOM structures, or custom widgets—the LLM automatically falls back to taking a screenshot and interacting using raw `x`/`y` coordinates through the same Chrome DevTools Protocol APIs.

## Security boundary

See [SECURITY.md](SECURITY.md).

In short, the bridge is designed to remain local and secure:

- Listens only on `127.0.0.1`
- Requires a randomly generated bearer token for every request
- Rejects any request containing an `Origin` header, preventing malicious webpages from issuing CSRF requests to the local bridge
- Never exposes browser control outside the local machine unless you explicitly choose to do so
