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
