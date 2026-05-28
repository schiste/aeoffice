# packages/game-protocol

Domain-neutral wire contracts for realtime tile-world games.

This package owns input intent messages, action commands, entity state, map
state, world snapshots, server tick metadata, and reconciliation payloads. App
packages can layer product messages on top, but the realtime simulation core
should share these contracts between client and server.
