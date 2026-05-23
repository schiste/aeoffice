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
- It delegates chat delivery permissions and recipients to `packages/policy`.
- `WorldAdmissionService` admits players from verified API-issued world-token
  claims.
- `UnsignedLocalWorldTokenVerifier` is a development-only verifier for local
  tests.
- It emits `player_state`, `movement_rejected`, `chat_delivered`,
  `chat_rejected`, or `protocol_error` messages.

Next step:

- Replace the local verifier with production JWT verification.
- Wrap `AuthoritativeWorld` in a Colyseus room adapter.
