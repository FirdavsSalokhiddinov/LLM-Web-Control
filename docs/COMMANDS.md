# Command Reference

All browser commands are sent through the bridge server:

```bash
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"<action>","params":{...}}'
```

The bridge accepts commands from any supported coding LLM and forwards them to the Chrome extension.

Response format:

```json
{
  "ok": true,
  "data": { ... }
}
```

or

```json
{
  "ok": false,
  "error": "..."
}
```

Most actions accept an optional `tabId`. If omitted, the command targets the active tab in the current Chrome window.

---

## Tab Management

| Action | Parameters | Returns |
|--------|------------|---------|
| `listTabs` | — | `[{id, url, title, active, windowId}, ...]` |
| `newTab` | `{url?}` | `{tabId}` |
| `closeTab` | `{tabId?}` | `{closed}` |
| `switchTab` | `{tabId}` | `{tabId}` |
| `navigate` | `{tabId?, url}` | `{tabId}` |
| `getPageInfo` | `{tabId?}` | `{url, title}` |

---

## Reading the Page

| Action | Parameters | Returns |
|--------|------------|---------|
| `snapshot` | `{tabId?, maxElements?}` | `{url, title, scrollX, scrollY, viewport, elements:[{selector, tag, role, type, name, placeholder, text, href, rect}]}` |
| `extractText` | `{tabId?, selector?}` | Inner text of the specified selector, or the entire `<body>` if omitted |
| `screenshot` | `{tabId?}` | `{base64, path}` — also saves the image to `bridge-server/screenshots/<timestamp>.png` |

`snapshot` is the primary way supported coding LLMs understand a webpage. It returns structured information about interactive elements, including ready-to-use CSS selectors for reliable automation.

---

## Acting on the Page

| Action | Parameters | Notes |
|--------|------------|-------|
| `click` | `{tabId?, selector}` or `{tabId?, x, y}` | Performs a trusted mouse click through the Chrome DevTools Protocol |
| `type` | `{tabId?, selector?, text}` | Focuses the selector (if provided) before inserting text |
| `pressKey` | `{tabId?, key}` | Supports keys like `Enter`, `Tab`, `Escape`, `Backspace`, `Delete`, `Space`, `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, plus any single letter or digit |
| `drag` | `{tabId?, x1, y1, x2, y2, steps?}` | Performs a trusted mouse drag for drawing, resizing, sliders, and canvas applications |
| `scroll` | `{tabId?, deltaX?, deltaY?}` | Scrolls the page by the specified offsets |

---

## Examples

### Read the active page

```bash
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"snapshot"}'
```

---

### Click a button

```bash
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"click","params":{"selector":"#submit-btn"}}'
```

---

### Type into a field and press Enter

```bash
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"type","params":{"selector":"input[name=q]","text":"hello world"}}'

curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"pressKey","params":{"key":"Enter"}}'
```

---

### Take a screenshot

```bash
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"screenshot"}'
```

The returned `data.path` points to a PNG image that your coding LLM can inspect for coordinate-based interactions when DOM selectors are unavailable.
