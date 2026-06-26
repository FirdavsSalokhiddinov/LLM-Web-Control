# Command reference

All commands go through:

```bash
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"<action>","params":{...}}'
```

Response shape: `{"ok": true, "data": {...}}` or `{"ok": false, "error": "..."}`.

Most actions take an optional `tabId`; if omitted, they act on the current
active tab in the current window.

## Tab management

| action | params | returns |
|---|---|---|
| `listTabs` | — | `[{id, url, title, active, windowId}, ...]` |
| `newTab` | `{url?}` | `{tabId}` |
| `closeTab` | `{tabId?}` | `{closed}` |
| `switchTab` | `{tabId}` | `{tabId}` |
| `navigate` | `{tabId?, url}` | `{tabId}` |
| `getPageInfo` | `{tabId?}` | `{url, title}` |

## Reading the page

| action | params | returns |
|---|---|---|
| `snapshot` | `{tabId?, maxElements?}` | `{url, title, scrollX, scrollY, viewport, elements:[{selector, tag, role, type, name, placeholder, text, href, rect}]}` |
| `extractText` | `{tabId?, selector?}` | innerText of `selector`, or whole `<body>` if omitted |
| `screenshot` | `{tabId?}` | `{base64, path}` — also written to `bridge-server/screenshots/<timestamp>.png` |

`snapshot` is the primary way I "see" a page: it lists clickable/interactive
elements with a ready-to-use CSS `selector`.

## Acting on the page

| action | params | notes |
|---|---|---|
| `click` | `{tabId?, selector}` or `{tabId?, x, y}` | dispatches a trusted mouse click via CDP |
| `type` | `{tabId?, selector?, text}` | clicks `selector` first to focus (if given), then inserts `text` |
| `pressKey` | `{tabId?, key}` | named keys (`Enter`, `Tab`, `Escape`, `Backspace`, `Delete`, `Space`, `ArrowUp/Down/Left/Right`) plus any single letter or digit (e.g. `r`, `t`, `2`) for app keyboard shortcuts |
| `drag` | `{tabId?, x1, y1, x2, y2, steps?}` | trusted mouse-down → move → mouse-up between two points; for drawing/resizing on canvas apps |
| `scroll` | `{tabId?, deltaX?, deltaY?}` | scrolls the page by the given offsets |

## Examples

Read the active tab's interactive elements:

```bash
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" -d '{"action":"snapshot"}'
```

Click a button found in that snapshot:

```bash
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"click","params":{"selector":"#submit-btn"}}'
```

Type into a focused field and press Enter:

```bash
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"type","params":{"selector":"input[name=q]","text":"claude code"}}'
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"pressKey","params":{"key":"Enter"}}'
```

Take a screenshot for the coordinate fallback path:

```bash
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" -d '{"action":"screenshot"}'
# data.path points to a PNG file I can read directly
```
