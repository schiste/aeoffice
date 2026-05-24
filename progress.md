Original prompt: continue do the whole plan end to end, granular commits as you code, don't stop until we have a locally working demo

## Progress

- Started demo-critical path: browser app, fixture-map rendering, local dev host,
  server-authoritative movement, chat, and media-token flow.
- RBAC/admin/SaaS control-plane work remains deliberately deferred.

## Current Slice

- Convert the static browser shell from a smoke-loop page into a playable local
  demo with a local user, companion participant, keyboard movement, chat, media
  token issuance, and machine-readable browser state.

## Notes

- Browser demo queues async actions so keyboard/button input does not race
  server round trips.
- `window.render_game_to_text` and `window.advanceTime` are being added for the
  Playwright-based demo test loop.
- Browser validation passed with Playwright MCP: before join the companion is
  hidden, after join the local player and companion are visible, chat delivers to
  one recipient, media joins `zone:room-lobby:meeting-zone`, and delayed
  movement updates the server-authoritative player position.
- Continuing with lifecycle controls: reset leaves both local demo participants
  through `/world/leave` and makes the demo rejoinable without refresh.
- Playwright MCP verified join -> reset -> rejoin. Reset hides the companion,
  restores idle/not-joined/not-issued statuses, and re-enables Join demo.
- Reusable app layer now has `CustomerVirtualOfficeApp.leaveWorld()` and
  `TransportWorldClient.leave()` so future Phaser code can use the same lifecycle
  path as the local browser demo.
- World server now exposes a room-scoped snapshot route so clients can sync
  visible players from server state instead of assuming who joined locally.
- Browser demo now calls `/world/snapshot` after companion join and records the
  server-confirmed player IDs in `render_game_to_text`.
- Static `/app` files have been promoted into a Vite + TypeScript browser app
  under `apps/web`, while the dev host still preserves `/dev`, `/api`, `/world`,
  `/media`, `/app`, and `/` routes.
- `npm run check` now builds the Vite browser bundle before validating the dev
  HTTP host against the generated `/app/assets/*` files.
- Browser MCP smoke check verified the Vite-built `/app` shell loads, joins the
  local demo, syncs two players, issues a media token, sends chat, and resets.
