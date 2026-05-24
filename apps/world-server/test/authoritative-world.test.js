const assert = require("assert")
const {
  AuthoritativeWorld,
  createWorldFetchHandler,
  createWorldGatewayRuntime,
  UnsignedLocalWorldTokenVerifier,
  WorldAdmissionService,
  WorldRoomController,
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

const roomWorld = new AuthoritativeWorld({
  map: {
    width: 256,
    height: 256,
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
const roomAdmission = new WorldAdmissionService(
  roomWorld,
  new UnsignedLocalWorldTokenVerifier(),
)
const controller = new WorldRoomController(roomWorld, roomAdmission)

const senderToken = `unsigned-local.${JSON.stringify({
  sub: "usr_sender",
  sessionId: "sess_sender",
  roomId: "room-1",
  permissions: [CHAT_PERMISSIONS.roomSend],
  roles: ["space:member"],
  expiresAt: "2026-05-23T10:05:00.000Z",
})}`
const receiverToken = `unsigned-local.${JSON.stringify({
  sub: "usr_receiver",
  sessionId: "sess_receiver",
  roomId: "room-1",
  permissions: [CHAT_PERMISSIONS.roomReceive],
  roles: ["space:member"],
  expiresAt: "2026-05-23T10:05:00.000Z",
})}`

const badJoin = controller.join({
  clientId: "bad-client",
  token: "not-a-token",
  playerId: "bad-player",
  spawn: { x: 0, y: 0 },
  requestedRoomId: "room-1",
  nowMs: Date.parse("2026-05-23T10:00:00.000Z"),
})

assert.equal(badJoin.status, "denied")
assert.equal(badJoin.reason, "invalid_token")

const senderJoin = controller.join({
  clientId: "client-sender",
  token: senderToken,
  playerId: "player-sender",
  spawn: { x: 0, y: 0 },
  requestedRoomId: "room-1",
  nowMs: Date.parse("2026-05-23T10:00:00.000Z"),
})
const receiverJoin = controller.join({
  clientId: "client-receiver",
  token: receiverToken,
  playerId: "player-receiver",
  spawn: { x: 32, y: 0 },
  requestedRoomId: "room-1",
  nowMs: Date.parse("2026-05-23T10:00:00.000Z"),
})

assert.equal(senderJoin.status, "joined")
assert.equal(receiverJoin.status, "joined")

const moveEvents = controller.receive(
  "client-sender",
  { type: "move", direction: "right", seq: 1 },
  Date.parse("2026-05-23T10:00:01.000Z"),
)

assert.equal(moveEvents.length, 1)
assert.equal(moveEvents[0].type, "broadcast")
assert.equal(moveEvents[0].message.type, "player_state")
assert.equal(moveEvents[0].message.playerId, "player-sender")
assert.equal(moveEvents[0].message.x, 16)

const chatEvents = controller.receive(
  "client-sender",
  { type: "chat_send", scope: "room", body: "Server-routed hello", seq: 2 },
  Date.parse("2026-05-23T10:00:02.000Z"),
)

assert.equal(chatEvents.length, 2)
assert.equal(chatEvents[0].type, "send")
assert.deepEqual(chatEvents[0].clientIds, ["client-sender"])
assert.equal(chatEvents[1].type, "send")
assert.deepEqual(chatEvents[1].clientIds, ["client-receiver"])
assert.equal(chatEvents[1].message.type, "chat_delivered")

const unknownClientEvents = controller.receive(
  "missing-client",
  { type: "move", direction: "right", seq: 3 },
  Date.parse("2026-05-23T10:00:03.000Z"),
)

assert.equal(unknownClientEvents[0].type, "send")
assert.deepEqual(unknownClientEvents[0].clientIds, ["missing-client"])
assert.equal(unknownClientEvents[0].message.type, "protocol_error")

assert.equal(controller.leave("client-sender"), true)
assert.equal(roomWorld.getPlayer("player-sender"), undefined)

class RecordingApp {
  constructor() {
    this.routes = new Map()
  }

  post(path, handler) {
    this.routes.set(`POST ${path}`, handler)
  }

  route(method, path) {
    const handler = this.routes.get(`${method} ${path}`)
    assert.ok(handler, `Expected route ${method} ${path}`)
    return handler
  }
}

class RecordingReply {
  constructor() {
    this.statusCode = undefined
    this.body = undefined
  }

  status(code) {
    this.statusCode = code
    return this
  }

  send(body) {
    this.body = body
    return this
  }
}

async function invoke(handler, request) {
  const reply = new RecordingReply()
  await handler(request, reply)
  return reply
}

async function gatewayRouteChecks() {
  const runtime = createWorldGatewayRuntime({
    config: {
      map: {
        width: 256,
        height: 256,
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
    },
    clock: {
      nowMs: () => Date.parse("2026-05-23T10:00:00.000Z"),
    },
  })
  const app = new RecordingApp()
  const token = `unsigned-local.${JSON.stringify({
    sub: "usr_route",
    sessionId: "sess_route",
    roomId: "room-1",
    permissions: [CHAT_PERMISSIONS.roomSend],
    roles: ["space:member"],
    expiresAt: "2026-05-23T10:05:00.000Z",
  })}`

  runtime.registerRoutes(app)

  const joined = await invoke(app.route("POST", "/join"), {
    body: {
      clientId: "route-client",
      token,
      playerId: "route-player",
      spawn: { x: 0, y: 0 },
      roomId: "room-1",
    },
  })

  assert.equal(joined.statusCode, 200)
  assert.equal(joined.body.status, "joined")
  assert.equal(joined.body.player.playerId, "route-player")

  const moved = await invoke(app.route("POST", "/message"), {
    body: {
      clientId: "route-client",
      message: { type: "move", direction: "right", seq: 1 },
    },
  })

  assert.equal(moved.statusCode, 200)
  assert.equal(moved.body.events[0].type, "broadcast")
  assert.equal(moved.body.events[0].message.type, "player_state")

  const handle = createWorldFetchHandler(runtime)
  const left = await handle(
    new Request("https://world.example.test/leave", {
      method: "POST",
      body: JSON.stringify({ clientId: "route-client" }),
    }),
  )
  const leftBody = await left.json()

  assert.equal(left.status, 200)
  assert.equal(leftBody.left, true)

  const missing = await handle(
    new Request("https://world.example.test/missing", {
      method: "POST",
      body: "{}",
    }),
  )
  const missingBody = await missing.json()

  assert.equal(missing.status, 404)
  assert.equal(missingBody.error, "not_found")
}

gatewayRouteChecks().catch((error) => {
  console.error(error)
  process.exit(1)
})
