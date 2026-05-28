# packages/map-engine

Compatibility facade for older map-engine imports.

The deterministic movement, collision, and zone primitives moved to
`@aedventure/game-core` in Phase 9. This package re-exports the new neutral core
temporarily so older imports keep compiling while apps migrate.

Moved implementation:

- `simulateMovement` computes the next position from a normalized movement
  vector, speed, and elapsed time.
- Movement is rejected for speed-limit violations, map collisions, and missing
  zone permissions.
- Diagonal vectors are normalized so they do not move faster than cardinal
  movement, and diagonal collisions can slide along a clear axis.
- Collision checks use tile coordinates and player bounds.
- Zone checks return entered and left zone IDs for the world server.
