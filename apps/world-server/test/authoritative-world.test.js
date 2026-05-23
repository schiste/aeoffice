const assert = require("assert")
const {
  AuthoritativeWorld,
  UnsignedLocalWorldTokenVerifier,
  WorldAdmissionService,
} = require("../dist/index.js")
const { CHAT_PERMISSIONS } = require("@aedventure/policy")

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
  defaultRoomId: "room-1",
  proximityChatRadiusPx: 64,
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
  defaultRoomId: "room-1",
  proximityChatRadiusPx: 64,
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

const chatWorld = new AuthoritativeWorld({
  map: {
    width: 256,
    height: 256,
    tileSize: 32,
    blockedTiles: [],
  },
  zones: [
    {
      id: "zone-a",
      bounds: { x: 0, y: 0, width: 128, height: 128 },
    },
  ],
  playerSize: { width: 16, height: 16 },
  speedPxPerSecond: 64,
  defaultAvatarId: "adam",
  tickMs: 250,
  defaultRoomId: "room-1",
  proximityChatRadiusPx: 64,
})

chatWorld.addPlayer({
  playerId: "sender",
  spawn: { x: 0, y: 0 },
  permissions: [
    CHAT_PERMISSIONS.roomSend,
    CHAT_PERMISSIONS.proximitySend,
    CHAT_PERMISSIONS.zoneSend,
  ],
})

chatWorld.addPlayer({
  playerId: "near",
  spawn: { x: 32, y: 0 },
  permissions: [
    CHAT_PERMISSIONS.roomReceive,
    CHAT_PERMISSIONS.proximityReceive,
    CHAT_PERMISSIONS.zoneReceive,
  ],
})

chatWorld.addPlayer({
  playerId: "far",
  spawn: { x: 200, y: 0 },
  permissions: [
    CHAT_PERMISSIONS.roomReceive,
    CHAT_PERMISSIONS.proximityReceive,
  ],
})

const roomChat = chatWorld.handleClientMessage(
  "sender",
  { type: "chat_send", scope: "room", body: "Hello room", seq: 10 },
  2000,
)

assert.equal(roomChat.type, "chat_delivered")
assert.deepEqual(roomChat.recipientPlayerIds, ["near", "far"])

const proximityChat = chatWorld.handleClientMessage(
  "sender",
  { type: "chat_send", scope: "proximity", body: "Hello nearby", seq: 11 },
  2001,
)

assert.equal(proximityChat.type, "chat_delivered")
assert.deepEqual(proximityChat.recipientPlayerIds, ["near"])

const zoneChat = chatWorld.handleClientMessage(
  "sender",
  { type: "chat_send", scope: "zone", zoneId: "zone-a", body: "Hello zone", seq: 12 },
  2002,
)

assert.equal(zoneChat.type, "chat_delivered")
assert.deepEqual(zoneChat.recipientPlayerIds, ["near"])

const legacyChatShape = chatWorld.handleClientMessage(
  "sender",
  { type: "chat_send", message: "client decided recipients", seq: 13 },
  2003,
)

assert.equal(legacyChatShape.type, "protocol_error")

const admissionWorld = new AuthoritativeWorld({
  map: {
    width: 128,
    height: 128,
    tileSize: 32,
    blockedTiles: [],
  },
  zones: [],
  playerSize: { width: 16, height: 16 },
  speedPxPerSecond: 64,
  defaultAvatarId: "adam",
  tickMs: 250,
  defaultRoomId: "room-1",
  proximityChatRadiusPx: 64,
})
const admission = new WorldAdmissionService(
  admissionWorld,
  new UnsignedLocalWorldTokenVerifier(),
)

const validClaims = {
  sub: "usr_1",
  sessionId: "sess_1",
  roomId: "room-1",
  permissions: [CHAT_PERMISSIONS.roomSend],
  roles: ["space:member"],
  expiresAt: "2026-05-23T10:05:00.000Z",
}
const admitted = admission.admit({
  token: `unsigned-local.${JSON.stringify(validClaims)}`,
  playerId: "admitted-player",
  spawn: { x: 0, y: 0 },
  requestedRoomId: "room-1",
  nowMs: Date.parse("2026-05-23T10:00:00.000Z"),
})

assert.equal(admitted.status, "admitted")
assert.equal(admitted.player.userId, "usr_1")
assert.equal(admitted.player.roomId, "room-1")
assert.deepEqual(admitted.player.permissions, [CHAT_PERMISSIONS.roomSend])
assert.deepEqual(admitted.player.roles, ["space:member"])

const wrongRoom = admission.admit({
  token: `unsigned-local.${JSON.stringify(validClaims)}`,
  playerId: "wrong-room-player",
  spawn: { x: 0, y: 0 },
  requestedRoomId: "room-2",
  nowMs: Date.parse("2026-05-23T10:00:00.000Z"),
})

assert.equal(wrongRoom.status, "denied")
assert.equal(wrongRoom.reason, "room_mismatch")

const expired = admission.admit({
  token: `unsigned-local.${JSON.stringify({
    ...validClaims,
    expiresAt: "2026-05-23T09:59:00.000Z",
  })}`,
  playerId: "expired-player",
  spawn: { x: 0, y: 0 },
  requestedRoomId: "room-1",
  nowMs: Date.parse("2026-05-23T10:00:00.000Z"),
})

assert.equal(expired.status, "denied")
assert.equal(expired.reason, "expired_token")
