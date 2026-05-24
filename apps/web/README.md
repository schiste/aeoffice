# apps/web

Target frontend application.

Responsibilities:

- Render the app shell.
- Host the Phaser world renderer.
- Send input intents, not authoritative positions.
- Connect to API sessions.
- Connect to world-server state.
- Connect to LiveKit only with server-issued tokens.

The current implementation is a framework-free customer app orchestrator. It
owns the app-layer flow before Phaser rendering is wired:

- Request a world token from the API.
- Join the world-server with that server-issued token.
- Send movement and chat protocol intents.
- Apply authoritative server messages to local app state.
- Request media-zone tokens from the media gateway.

No role/RBAC management UI belongs here during the app-layer MVP. This app can
use seeded or fixture-backed permissions while the server still enforces access.
