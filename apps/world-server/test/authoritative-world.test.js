const assert = require("assert")
const { AuthoritativeWorld } = require("../dist/index.js")

const world = new AuthoritativeWorld({
  map: {
    width: 128,
    height: 128,
    tileSize: 32,
    blockedTiles: [{ x: 1, y: 1 }],
  },
  zones: [
    {
      id: "staff-room",
      bounds: { x: 48, y: 0, width: 32, height: 64 },
      requiredPermission: "zone:staff-room:enter",
    },
  ],
  playerSize: { width: 16, height: 16 },
  speedPxPerSecond: 64,
  defaultAvatarId: "adam",
  tickMs: 250,
})

world.addPlayer({
  playerId: "p1",
  spawn: { x: 32, y: 0 },
})

const denied = world.handleClientMessage(
  "p1",
  { type: "move", direction: "right", seq: 1 },
  1000,
)

assert.equal(denied.type, "movement_rejected")
assert.equal(denied.reason, "zone_permission")
assert.equal(denied.x, 32)
assert.equal(denied.y, 0)

const permittedWorld = new AuthoritativeWorld({
  map: {
    width: 128,
    height: 128,
    tileSize: 32,
    blockedTiles: [{ x: 1, y: 1 }],
  },
  zones: [
    {
      id: "staff-room",
      bounds: { x: 48, y: 0, width: 32, height: 64 },
      requiredPermission: "zone:staff-room:enter",
    },
  ],
  playerSize: { width: 16, height: 16 },
  speedPxPerSecond: 64,
  defaultAvatarId: "adam",
  tickMs: 250,
})

permittedWorld.addPlayer({
  playerId: "p2",
  spawn: { x: 32, y: 0 },
  permissions: ["zone:staff-room:enter"],
})

const accepted = permittedWorld.handleClientMessage(
  "p2",
  { type: "move", direction: "right", seq: 1 },
  1000,
)

assert.equal(accepted.type, "player_state")
assert.equal(accepted.x, 48)
assert.equal(accepted.y, 0)
assert.equal(accepted.seqAck, 1)
assert.equal(accepted.anim, "adam_walk_right")

const towardObstacle = permittedWorld.handleClientMessage(
  "p2",
  { type: "move", direction: "down", seq: 2 },
  1250,
)

assert.equal(towardObstacle.type, "player_state")
assert.equal(towardObstacle.x, 48)
assert.equal(towardObstacle.y, 16)

const blocked = permittedWorld.handleClientMessage(
  "p2",
  { type: "move", direction: "down", seq: 3 },
  1500,
)

assert.equal(blocked.type, "movement_rejected")
assert.equal(blocked.reason, "collision")
assert.equal(blocked.x, 48)
assert.equal(blocked.y, 16)

const invalid = permittedWorld.handleClientMessage(
  "p2",
  { type: "move", x: 99, y: 99, seq: 4 },
  1750,
)

assert.equal(invalid.type, "protocol_error")
assert.equal(invalid.code, "invalid_payload")
