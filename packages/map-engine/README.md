# packages/map-engine

Target map engine package.

Responsibilities:

- Parse maps.
- Model collisions.
- Model zones.
- Model portals.
- Provide room transition checks.
- Provide navigation graph data for future agents.

Current implementation:

- `simulateMovement` computes the next position from direction, speed, and
  elapsed time.
- Movement is rejected for speed-limit violations, map collisions, and missing
  zone permissions.
- Collision checks use tile coordinates and player bounds.
- Zone checks return entered and left zone IDs for the world server.
