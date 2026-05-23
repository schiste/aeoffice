# apps/web

Target frontend application.

Responsibilities:

- Render the app shell.
- Host the Phaser world renderer.
- Send input intents, not authoritative positions.
- Connect to API sessions.
- Connect to world-server state.
- Connect to LiveKit only with server-issued tokens.

No product features should be added here until the hard-fork gates are active.

