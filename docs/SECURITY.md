# Security Model & Privacy

LLM-Powered-Web gives a local LLM the ability to control your real Chrome browser — reading pages, clicking, typing, scraping data, and interacting with authenticated sessions using your existing browser profile.

**Your data stays with you.** Every command runs locally. No data is ever sent to an external server.

Treat the bridge token like a password to your browser.

---

## Privacy First — Your Data Stays With You

| Concern | How LLM-Powered-Web protects you |
|---|---|
| Data exfiltration | No data is transmitted outside your machine. The bridge listens on `127.0.0.1` only. |
| Third-party APIs | No API keys required. No cloud dependency. Everything runs locally. |
| Telemetry | Zero. No analytics, no tracking, no phone-home. |
| Token storage | `.token` file is gitignored by default. Stored with `0o600` permissions. |
| Screenshots | Saved locally in `bridge-server/screenshots/`. Never uploaded. |

---

## Localhost-Only Bridge

The bridge server binds exclusively to:

```
127.0.0.1:8765
```

It is **not** exposed to your local network or the internet. Only processes on your machine can reach it.

---

## Bearer Token Authentication

On first launch, the bridge generates a random 256-bit token:

```text
Stored in: bridge-server/.token
Permissions: 0o600 (owner read/write only)
Git: automatically ignored
```

Every request must include:

```http
Authorization: Bearer <token>
```

Requests without a valid token receive `401 Unauthorized`.

---

## Origin Header Protection (CSRF)

The bridge rejects **any HTTP request containing an `Origin` header**, regardless of whether the token is valid.

This prevents:
- Cross-Site Request Forgery (CSRF) attacks
- Malicious webpages from calling the local bridge with `fetch()`
- Drive-by browser attacks against the automation endpoint

Command-line tools, local scripts, and local LLMs do not send an `Origin` header, so legitimate requests work normally. Rejected requests receive `403 Forbidden`.

---

## Extension Authentication

The Chrome extension must authenticate with the same bearer token when establishing its WebSocket connection. Only authenticated extensions can receive commands from the bridge.

---

## Accepted Trade-Offs

### Local processes with the token have full browser access

Any application on your machine that possesses the bridge token can control your browser. Protect `.token` as you would a password or SSH key.

**Never:** commit it to Git, share it, or send it to anyone.

### Powerful Chrome permissions

The extension requires `<all_urls>` and `debugger` permissions — necessary to automate any webpage and generate trusted CDP input. Chrome displays a **"This extension is debugging this browser"** banner while active. This is standard behavior and is never hidden.

### No command sandbox

LLM-Powered-Web does not restrict which browser actions can be executed. If your LLM is instructed to access sensitive sites, log into accounts, or submit forms, those commands execute as requested. The trust model is the same as allowing a local LLM to execute shell commands on your machine.

---

## Stopping

- Press **Ctrl+C** in the bridge terminal, or
- Disable/remove the Chrome extension

The extension goes idle immediately when the bridge disconnects.

---

## Complete Removal

1. Stop the bridge server (Ctrl+C)
2. Delete `bridge-server/.token`
3. Remove the extension from `chrome://extensions`
4. Delete the project directory

No components remain on your system.
