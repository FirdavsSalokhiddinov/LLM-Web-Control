# Security Model

LLM-Web-Control gives a local coding LLM the ability to control your real Chrome browser, including reading webpages, clicking elements, typing into forms, taking screenshots, and interacting with authenticated sessions using your existing browser profile.

Because of this, **the bridge token should be treated like a password to your browser**.

---

## What's Protected

### Localhost-only bridge

The bridge server listens only on:

```text
127.0.0.1:8765
```

It is **not** exposed to your local network or the internet (`0.0.0.0`), so only processes running on your machine can reach it.

---

### Bearer token authentication

On first launch, the bridge generates a random 256-bit authentication token.

The token is stored in:

```text
bridge-server/.token
```

This file is automatically ignored by Git.

Every request must include:

```http
Authorization: Bearer <token>
```

Requests without a valid token receive:

```http
401 Unauthorized
```

---

### Origin header protection

The bridge rejects **any HTTP request containing an `Origin` header**, regardless of whether the token is valid.

This prevents browser-based attacks such as:

- Cross-Site Request Forgery (CSRF)
- Malicious webpages attempting to call the local bridge with `fetch()`
- Drive-by browser attacks against the automation endpoint

Command-line tools such as `curl`, local scripts, and coding LLMs communicating through the local bridge do not send an `Origin` header, so legitimate requests continue to work normally.

Rejected requests receive:

```http
403 Forbidden
```

---

### Extension authentication

The Chrome extension must also authenticate using the same bearer token when establishing its WebSocket connection.

Only authenticated extensions are allowed to receive browser commands from the bridge.

---

## Accepted Trade-offs

LLM-Web-Control is intentionally designed as a **local automation tool**, so several capabilities are trusted by design.

### Local processes with the token have full browser access

Any application running on your computer that possesses the bridge token can control your browser.

Protect `bridge-server/.token` just as you would a password or SSH key.

Never:

- Commit it to Git
- Share it publicly
- Send it to someone else

---

### Powerful Chrome permissions

The extension requests permissions including:

- `<all_urls>`
- `debugger`

These permissions are required to automate any webpage and generate trusted keyboard and mouse input through the Chrome DevTools Protocol.

Whenever browser control is active, Chrome displays its standard:

> **"This extension is debugging this browser"**

banner.

This notification is provided by Chrome itself and is never hidden or suppressed.

---

### No command sandbox

LLM-Web-Control intentionally does **not** restrict which browser actions can be executed.

If you instruct your coding LLM to:

- access sensitive websites
- log into accounts
- submit forms
- interact with banking pages

those commands will be executed exactly as requested.

The trust model is the same as allowing a coding LLM to execute shell commands on your local machine.

---

## Stopping LLM-Web-Control

To temporarily stop browser automation:

- Press **Ctrl+C** in the bridge server terminal, or
- Disable the Chrome extension.

The extension immediately becomes idle once the bridge is unavailable.

---

## Complete Removal

To completely remove LLM-Web-Control:

1. Stop the bridge server.
2. Delete `bridge-server/.token`.
3. Remove the extension from `chrome://extensions`.
4. Delete the project directory.

After these steps, no browser automation components remain on your system.
