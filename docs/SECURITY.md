# Security model

This tool gives a local process (effectively, me — Claude, via your Bash
tool) the ability to fully control your browser: read any page you have
open, click anything, type anything, including into authenticated sessions.
Treat the bridge token like a password to your browser.

## What's protected

- **Bind to localhost only.** `bridge-server` listens on `127.0.0.1`, not
  `0.0.0.0` — nothing outside your machine can reach it.
- **Bearer token required.** A random 256-bit token is generated on first
  run (`bridge-server/.token`, gitignored) and must be sent as
  `Authorization: Bearer <token>` on every request. Without it, every
  `/cmd` and `/status` call gets `401`.
- **Origin-header rejection.** Any request carrying an `Origin` header is
  rejected with `403`, regardless of token. Real cross-context requests made
  by JavaScript running in a browser tab (e.g. a malicious or compromised
  webpage trying to `fetch('http://127.0.0.1:8765/cmd', ...)`) always carry
  an `Origin` header; plain tools like `curl` or my Bash tool do not. This
  closes the obvious CSRF/drive-by attack vector against the bridge.
- **Extension registration is also token-gated.** The extension must present
  the same token over its WebSocket `register` message before the bridge
  will relay any commands to it.

## What's NOT protected, and why that's an accepted tradeoff

- **Any process on your machine that has the token can fully control your
  browser.** This is by design — it's a local automation tool. Don't share
  `bridge-server/.token` or commit it (it's gitignored already).
- **The extension itself has `<all_urls>` host permission and the
  `debugger` permission.** That's required to act on whatever page you ask
  about. Chrome will show a visible "this extension is debugging this
  browser" banner on any tab being actively controlled — this is Chrome's
  own safeguard, not something this tool suppresses.
- **No command allowlist/sandboxing of *what* gets clicked/typed.** I (Claude)
  am the only thing deciding what commands to send, based on your
  instructions in this chat. If you ask me to do something on a sensitive
  page (banking, etc.), I'll do it — same trust model as asking me to run
  shell commands on your machine.

## If you stop using this

- Stop the bridge server (Ctrl+C) — the extension just goes idle.
- To fully remove: delete `bridge-server/.token`, remove the extension from
  `chrome://extensions`, delete this project folder.
