# Architecture

```
┌──────────────┐   HTTP POST /cmd    ┌──────────────┐   WebSocket    ┌──────────────────┐
│  Local LLM   │ ──────────────────▶ │ bridge-server │◀─────────────▶│ Chrome Extension │
│ (Codex,      │   Bearer <token>    │  (Node, :8765)│  register,    │  background.js   │
│ Claude Code, │                     └──────────────┘  cmd/result    └────────┬─────────┘
│ OpenCode,    │                                                                │
│ Qwen, Llama, │                                                        chrome.debugger (CDP)
│ Kimi, etc.)  │                                                     chrome.scripting (DOM)
└──────────────┘                                                               │
                                                                                ▼
                                                                         Your real Chrome
                                                                     (cookies, sessions, tabs)
```

## Why a Bridge?

Local LLMs don't run inside the browser and can't talk directly to a Chrome extension in a clean request/response pattern. The bridge server is a lightweight relay:

- Maintains a persistent WebSocket connection to the extension
- Exposes a simple HTTP API your LLM calls naturally
- Tracks each command by a unique request ID
- Maps responses back to the original caller

## Why Chrome DevTools Protocol (CDP)?

Content scripts dispatch synthetic DOM events — but modern websites can distinguish synthetic events from real user input and ignore them (form submissions, drag-and-drop, canvas apps, rich editors).

CDP (`chrome.debugger`) sends the same input primitives Chrome DevTools uses:

- `Input.dispatchMouseEvent` — trusted clicks, drags, scrolls
- `Input.dispatchKeyEvent` — trusted key presses
- `Input.insertText` — trusted text input

These work on every website, including canvas-based apps, complex Shadow DOM, and embedded iframes.

## Crawl & Scrape Data Flow

```
Your LLM
  │
  ├── 1. POST /cmd {"action":"navigate","params":{"url":"..."}}
  │     └── Browser loads page
  │
  ├── 2. POST /cmd {"action":"snapshot"}
  │     └── Returns structured DOM: tags, selectors, text, rects, links, forms
  │
  ├── 3. POST /cmd {"action":"extractText","params":{"selector":"..."}}
  │     └── Returns inner text of targeted element
  │
  ├── 4. POST /cmd {"action":"click","params":{"selector":"a:nth-child(3)"}}
  │     └── Click navigates to next page → repeat from step 1
  │
  └── 5. Screenshot fallback for canvas/unknown layouts
        POST /cmd {"action":"screenshot"}
        └── Returns base64 + saved .png file
```

### DOM-first, screenshot fallback

The `snapshot` action extracts interactive elements with:
- HTML tag and ARIA role
- Visible text and labels
- Bounding box coordinates
- CSS selector (ready to use in subsequent commands)

When no stable selector exists (canvas, custom widgets, Shadow DOM), your LLM falls back to screenshot + coordinate-based interaction via CDP.

## Command Protocol

Each HTTP command generates a WebSocket message:

```json
{"id":"uuid","type":"cmd","action":"click","params":{"selector":"#submit"}}
```

The extension processes it and replies:

```json
{"id":"uuid","ok":true,"data":{"clicked":{"x":100,"y":200}}}
```

The bridge matches the response ID to the original HTTP request and returns the data to your LLM. Commands time out after 20 seconds.

## Security Boundary

See [SECURITY.md](SECURITY.md) for full details. In brief:

- Listens only on `127.0.0.1` — not exposed to network or internet
- Every request requires a bearer token (256-bit random, gitignored)
- Rejects requests with an `Origin` header — prevents CSRF from malicious pages
- **Your data never leaves your machine**
