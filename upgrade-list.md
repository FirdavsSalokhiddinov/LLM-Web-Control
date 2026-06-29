# Upgrade Ideas

Potential improvements for LLM-Powered-Web, identified from code analysis of `bridge-server/server.js`, `extension/background.js`, and `extension/manifest.json`.

---

## High Impact

| Upgrade | What it does | Why |
|---|---|---|
| **`evaluate` JS action** | Run arbitrary JavaScript in the page via `chrome.scripting.executeScript` | Unlocks any DOM read or mutation the LLM needs — currently only `snapshot` and `extractText` are available |
| **`waitFor` / `waitForSelector`** | Wait for an element to appear, a URL pattern, or a timeout | LLMs currently have no way to know when a page or SPA transition finishes |
| **Network interception** | Expose CDP `Network.enable` to capture XHR/fetch responses and resource loads | LLMs can read API responses directly instead of parsing DOM |
| **Cookie & storage management** | `getCookies`, `setCookie`, `clearCookies`, `getLocalStorage`, `setLocalStorage` | Enables session-aware automation and login state persistence |

## Medium Impact

| Upgrade | What it does | Why |
|---|---|---|
| **Table extraction** | Extract structured row/column data from `<table>` elements | Common scraping target — currently the LLM must parse tables out of raw DOM |
| **Download handling** | Intercept downloads, return the file path | Critical for scraping PDFs, CSVs, images |
| **Highlight / locate element** | Visually mark an element by selector (e.g., flash a red border) | Helps vision-capable LLMs confirm which element they're targeting |
| **Command queue + retry** | Auto-retry on timeout, queue commands during page loads | Makes the bridge more robust for multi-step automation pipelines |
| **Structured logging** | Log levels, timestamps, optional file output instead of raw `console.log` | Debugging automation failures without watching stderr |

## Nice-to-Have

| Upgrade | What it does | Why |
|---|---|---|
| **Docker setup** | `Dockerfile` + `docker-compose.yml` for the bridge | Zero-dependency startup; isolates Node.js requirements |
| **CLI wrapper** | Small script that reads `.token` and wraps `curl` calls | Better UX than constructing curl commands manually |
| **Iframe content access** | `snapshot` / `extractText` into named `<iframe>` elements | Currently only top-level documents are readable |
| **PDF generation** | Print page as PDF via CDP `Page.printToPDF` | Alternative to screenshot for document-style content |
| **Mobile viewport emulation** | Set device metrics and user-agent via CDP `Emulation.setDeviceMetricsOverride` | Test and scrape mobile versions of sites |
| **Network throttling** | Simulate slow connections via CDP `Network.emulateNetworkConditions` | Test behavior under various network conditions |
| **Multi-profile support** | Save/load multiple bridge tokens and extension profiles | Switching between different browsing contexts |
