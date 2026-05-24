# apps/web

Target frontend application.

Responsibilities:

- Render the app shell.
- Host the Phaser world renderer.
- Send input intents, not authoritative positions.
- Connect to API sessions.
- Connect to world-server state.
- Connect to LiveKit only with server-issued tokens.

The current implementation is a framework-free customer app orchestrator with a
Phaser 4 canvas renderer:

- Build the browser demo with Vite and TypeScript.
- Render the local fixture map through Phaser tile layers from the shared visual
  asset registry contract.
- Generate the internal CC0 polished office tileset and avatar shapes from
  semantic asset token IDs until final production art is onboarded.
- Join a local user plus demo companion for movement, chat, and media-token
  validation.
- Request a world token from the API.
- Join the world-server with that server-issued token.
- Send movement and chat protocol intents.
- Apply authoritative server messages to local app state.
- Request media-zone tokens from the media gateway.

Runtime adapters are intentionally narrow:

- `HttpAppApiClient` calls the API for world tokens.
- `HttpWorldTransport` calls dependency-free world transport routes for local
  app-layer smoke testing.
- `HttpMediaGatewayClient` calls the media gateway for LiveKit tokens.
- `TransportWorldClient` wraps the future Colyseus/WebSocket transport.

No role/RBAC management UI belongs here during the app-layer MVP. This app can
use seeded or fixture-backed permissions while the server still enforces access.
