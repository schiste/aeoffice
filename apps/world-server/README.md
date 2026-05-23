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

