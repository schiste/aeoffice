# Hard-Fork Target Architecture

## 1. Target Runtime

```text
apps/web
  React or Svelte frontend
  Phaser world renderer
  local input prediction only

apps/world-server
  Colyseus authoritative world server
  movement simulation
  collision
  zone permissions
  proximity
  room transitions

apps/api
  Fastify API
  Wikimedia OAuth 2.0
  local users/sessions
  roles/permissions
  durable persistence

apps/media-gateway
  LiveKit token endpoint
  media policy
  proximity subscription decisions
  coturn configuration surface

packages/protocol
  event schemas
  movement intent protocol
  chat protocol
  media protocol

packages/map-engine
  map loading
  collision model
  zones
  portals
  navigation graph

packages/auth-wikimedia
  OAuth client
  profile normalization
  group/role mapping helpers

packages/shared-types
  shared domain types
```

## 2. Movement Protocol

Client sends intent:

```json
{
  "type": "move",
  "direction": "down",
  "seq": 42
}
```

Server computes:

- New position.
- Collision.
- Speed limit.
- Zone permission.
- Proximity membership.
- Room transition.

Server broadcasts state:

```json
{
  "type": "player_state",
  "playerId": "p_123",
  "x": 705,
  "y": 508,
  "anim": "adam_walk_down",
  "seqAck": 42
}
```

## 3. Auth Boundary

Wikimedia OAuth establishes external identity.

Local API creates:

- User.
- OAuth identity.
- Session.
- Roles.
- Permissions.

World server trusts only API-issued session/world tokens, never raw client
claims.

## 4. Media Boundary

The target app uses LiveKit for media.

Flow:

1. User enters proximity or meeting zone.
2. World server/API decides media permission.
3. Media gateway creates LiveKit JWT.
4. Client connects to LiveKit with server-issued token.
5. Server controls which rooms/zones produce media access.

## 5. Persistence Boundary

Postgres owns durable state.

Colyseus owns live state only.

Valkey/Redis supports:

- Sessions/cache where appropriate.
- Pub/sub or adapters.
- Rate limits.
- Short-lived coordination.

## 6. Permission Boundary

Permissions are server-side.

The client may hide UI, but server checks decide:

- Enter room.
- Enter zone.
- Send chat.
- Receive chat.
- Join media.
- Moderate.
- Transition spaces.
- Access map/object metadata.

