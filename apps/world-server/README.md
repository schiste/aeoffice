# apps/world-server

Target authoritative world server.

Responsibilities:

- Run Colyseus rooms.
- Accept movement intents.
- Compute position, collision, speed limits, proximity, and room transitions.
- Enforce zone and room permissions.
- Emit server-authoritative state.
- Keep only live state in memory.

Durable state belongs in Postgres through `apps/api`.

Current implementation:

- `AuthoritativeWorld` is a pure in-memory movement state machine.
- It accepts protocol movement intents, not client coordinates.
- It delegates collision and zone permission checks to `packages/map-engine`.
- It emits `player_state`, `movement_rejected`, or `protocol_error` messages.

Next step:

- Wrap `AuthoritativeWorld` in a Colyseus room adapter after API/session token
  boundaries exist.
