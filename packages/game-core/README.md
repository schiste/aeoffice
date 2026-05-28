# packages/game-core

Neutral deterministic simulation primitives shared by application domains.

Responsibilities:

- deterministic tick timing helpers
- entity movement application
- collision resolution
- zone overlap checks
- snapshot creation helpers
- client reconciliation/replay primitives

`game-core` is intentionally domain-neutral. Office, RPG, idle, or strategy apps
provide their own entities, permissions, actions, maps, and UI behavior.
