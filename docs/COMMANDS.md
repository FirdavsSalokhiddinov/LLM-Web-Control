# Command Reference

All browser commands are sent via HTTP POST to the bridge server:

```bash
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"<action>","params":{...}}'
```

## Response Format

```json
{"ok": true, "data": { ... }}
```

```json
{"ok": false, "error": "..."}
```

Most actions accept an optional `tabId`. If omitted, the command targets the currently active tab.

---

## Tab Management

| Action | Parameters | Returns |
|---|---|---|
| `listTabs` | — | `[{id, url, title, active, windowId}, ...]` |
| `newTab` | `{url?}` | `{tabId}` |
| `closeTab` | `{tabId?}` | `{closed}` |
| `switchTab` | `{tabId}` | `{tabId}` |
| `navigate` | `{tabId?, url}` | `{tabId}` |
| `getPageInfo` | `{tabId?}` | `{url, title}` |

---

## Reading the Page (Crawl & Scrape)

| Action | Parameters | Returns |
|---|---|---|
| `snapshot` | `{tabId?, maxElements?}` | `{url, title, scrollX, scrollY, viewport, elements: [{selector, tag, role, type, name, placeholder, text, href, rect}]}` |
| `extractText` | `{tabId?, selector?}` | Inner text of the specified selector, or the entire `<body>` if omitted |
| `screenshot` | `{tabId?}` | `{base64, path}` — also saves the image to `bridge-server/screenshots/<timestamp>.png` |

**`snapshot`** is the primary crawling action. It returns structured information about all interactive elements with ready-to-use CSS selectors — ideal for programmatic scraping and navigation.

**`screenshot`** serves as a visual fallback when DOM selectors are unavailable (canvas, Shadow DOM, rich widgets).

---

## Acting on the Page

| Action | Parameters | Notes |
|---|---|---|
| `click` | `{tabId?, selector}` **or** `{tabId?, x, y}` | Trusted CDP mouse click |
| `type` | `{tabId?, selector?, text}` | Focuses selector (if given), inserts text via CDP |
| `pressKey` | `{tabId?, key}` | Supported: `Enter`, `Tab`, `Escape`, `Backspace`, `Delete`, `Space`, `ArrowUp/Down/Left/Right`, any single letter or digit |
| `drag` | `{tabId?, x1, y1, x2, y2, steps?}` | Mouse drag for canvas, sliders, resizing |
| `scroll` | `{tabId?, deltaX?, deltaY?}` | Scroll by pixel offsets |

---

## Crawl & Scrape Examples

### Snapshot a page (crawl starting point)

```bash
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"snapshot"}'
```

### Extract text from an element

```bash
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"extractText","params":{"selector":"main"}}'
```

### Click a link

```bash
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"click","params":{"selector":"#submit-btn"}}'
```

### Type into a field and submit

```bash
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"type","params":{"selector":"input[name=q]","text":"local LLM web scraper"}}'

curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"pressKey","params":{"key":"Enter"}}'
```

### Take a screenshot

```bash
curl -s -X POST http://127.0.0.1:8765/cmd \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"screenshot"}'
```

Returns `data.path` pointing to the saved PNG file.

### Multi-step crawl

```bash
# 1. Navigate
curl -s -X POST ... -d '{"action":"navigate","params":{"url":"https://example.com"}}'

# 2. Snapshot to see page structure
curl -s -X POST ... -d '{"action":"snapshot"}'

# 3. Click first article link
curl -s -X POST ... -d '{"action":"click","params":{"selector":"article:nth-child(1) a"}}'

# 4. Read the article
curl -s -X POST ... -d '{"action":"extractText"}'
```
