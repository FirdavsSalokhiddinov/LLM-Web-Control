# Claude Browser Control — Setup & Usage

## What this is

A way for this Claude Code session to control your real, logged-in Chrome
browser — same cookies, same sessions, same tabs — based on what you type to
me in this terminal. No Anthropic API key, no separate billing: the "brain"
is this Claude Code session itself, already covered by your existing plan.

## Pieces

```
claude-powered/
├── bridge-server/   local Node server (WebSocket + HTTP), runs on 127.0.0.1:8765
├── extension/       Chrome MV3 extension, loaded unpacked
└── docs/            this folder
```

## One-time setup

1. **Install and start the bridge server:**

   ```bash
   cd bridge-server
   npm install
   npm start
   ```

   On first run this generates a random token, saves it to `bridge-server/.token`
   (gitignored), and prints it to the console. Keep this terminal running —
   it's the relay between me and your browser.

2. **Load the extension:**

   - Go to `chrome://extensions`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked", select the `extension/` folder
   - Click the new extension's icon in the toolbar, paste the token from
     step 1 into the popup, click Save

3. **Check connection:** the extension's toolbar badge shows `ON` in green
   once it's connected to the bridge. If you restart the server, the token
   stays the same (read from `.token`) so you don't need to re-paste it,
   unless you delete `.token`.

## Day-to-day use

Once both are running, just tell me what to do in the browser in this chat
("open github.com and check my notifications", "fill out this form", "find
the price on this page"). I issue commands to the bridge over plain HTTP
(`curl`/Bash), the extension executes them in your actual browser, and I read
back the results (DOM snapshots, extracted text, or screenshots) to decide
the next step.

You'll see Chrome's "this extension is debugging this browser" banner appear
on tabs I'm actively controlling — that's expected; it's how Chrome surfaces
that `chrome.debugger` (the same API devtools uses) is attached for trusted
clicks/keystrokes.

## Stopping

Close the bridge-server terminal (Ctrl+C) or disable/remove the extension.
Without the bridge running, the extension just sits idle (badge cleared) and
the browser behaves completely normally.

See also: [TUTORIAL.md](TUTORIAL.md) for a step-by-step walkthrough,
[ARCHITECTURE.md](ARCHITECTURE.md), [COMMANDS.md](COMMANDS.md), and
[SECURITY.md](SECURITY.md).
