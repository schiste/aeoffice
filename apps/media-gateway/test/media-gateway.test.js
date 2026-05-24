const assert = require("assert")
const {
  MediaGatewayController,
  MediaGatewayService,
  UnsignedLocalMediaTokenSigner,
  registerMediaGatewayRoutes,
} = require("../dist/index.js")
const { MEDIA_PERMISSIONS } = require("@aedventure/policy")

const nowMs = Date.parse("2026-05-23T10:00:00.000Z")

const service = new MediaGatewayService(
  {
    liveKitUrl: "ws://livekit.local:7880",
    tokenTtlMs: 5 * 60 * 1000,
    proximityRadiusPx: 64,
  },
  new UnsignedLocalMediaTokenSigner(),
)

const requester = {
  playerId: "p1",
  roomId: "room-1",
  zoneIds: ["stage"],
  permissions: [
    MEDIA_PERMISSIONS.roomJoin,
    MEDIA_PERMISSIONS.roomPublish,
    MEDIA_PERMISSIONS.roomSubscribe,
    MEDIA_PERMISSIONS.proximityJoin,
    MEDIA_PERMISSIONS.proximityPublish,
    MEDIA_PERMISSIONS.proximitySubscribe,
    MEDIA_PERMISSIONS.zoneJoin,
    MEDIA_PERMISSIONS.zonePublish,
    MEDIA_PERMISSIONS.zoneSubscribe,
  ],
  position: { x: 0, y: 0 },
}

const nearby = {
  playerId: "p2",
  roomId: "room-1",
  zoneIds: ["stage"],
  permissions: [
    MEDIA_PERMISSIONS.roomJoin,
    MEDIA_PERMISSIONS.roomSubscribe,
    MEDIA_PERMISSIONS.proximityJoin,
    MEDIA_PERMISSIONS.proximitySubscribe,
    MEDIA_PERMISSIONS.zoneJoin,
    MEDIA_PERMISSIONS.zoneSubscribe,
  ],
  position: { x: 32, y: 0 },
}

const far = {
  playerId: "p3",
  roomId: "room-1",
  zoneIds: [],
  permissions: [
    MEDIA_PERMISSIONS.roomJoin,
    MEDIA_PERMISSIONS.roomSubscribe,
    MEDIA_PERMISSIONS.proximityJoin,
    MEDIA_PERMISSIONS.proximitySubscribe,
  ],
  position: { x: 256, y: 0 },
}

const participants = [requester, nearby, far]

const roomToken = service.issueMediaToken({
  requester,
  participants,
  request: { mode: "room", publish: true, subscribe: true },
  nowMs,
})

assert.equal(roomToken.status, "issued")
assert.equal(roomToken.liveKitUrl, "ws://livekit.local:7880")
assert.equal(roomToken.claims.room, "room:room-1")
assert.equal(roomToken.claims.canPublish, true)
assert.equal(roomToken.claims.canSubscribe, true)
assert.deepEqual(roomToken.claims.participantPlayerIds, ["p1", "p2", "p3"])

const proximityToken = service.issueMediaToken({
  requester,
  participants,
  request: {
    mode: "proximity",
    targetPlayerIds: ["p2", "p3"],
    publish: true,
    subscribe: true,
  },
  nowMs,
})

assert.equal(proximityToken.status, "issued")
assert.equal(proximityToken.claims.room, "proximity:room-1:p1:p2:p3")
assert.deepEqual(proximityToken.claims.participantPlayerIds, ["p1", "p2"])

const zoneToken = service.issueMediaToken({
  requester,
  participants,
  request: { mode: "zone", zoneId: "stage", publish: true, subscribe: true },
  nowMs,
})

assert.equal(zoneToken.status, "issued")
assert.equal(zoneToken.claims.room, "zone:room-1:stage")
assert.deepEqual(zoneToken.claims.participantPlayerIds, ["p1", "p2"])

const denied = service.issueMediaToken({
  requester: { ...requester, permissions: [] },
  participants,
  request: { mode: "room", publish: true, subscribe: true },
  nowMs,
})

assert.equal(denied.status, "denied")
assert.equal(denied.reason, "missing_permission")

const outOfScope = service.issueMediaToken({
  requester,
  participants,
  request: { mode: "zone", zoneId: "backstage", publish: true, subscribe: true },
  nowMs,
})

assert.equal(outOfScope.status, "denied")
assert.equal(outOfScope.reason, "out_of_scope")

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

const participantDirectory = {
  async findParticipant(playerId) {
    return participants.find((participant) => participant.playerId === playerId)
  },
  async listParticipantsFor(requesterContext) {
    return participants.filter(
      (participant) => participant.roomId === requesterContext.roomId,
    )
  },
}
const controller = new MediaGatewayController(service, participantDirectory)
const app = new RecordingApp()

registerMediaGatewayRoutes(app, {
  controller,
  clock: {
    nowMs: () => nowMs,
  },
})

async function routeChecks() {
  const issued = await invoke(app.route("POST", "/media-token"), {
    body: {
      playerId: "p1",
      mode: "zone",
      zoneId: "stage",
      publish: true,
      subscribe: true,
    },
  })

  assert.equal(issued.statusCode, 200)
  assert.equal(issued.body.status, "issued")
  assert.equal(issued.body.room, "zone:room-1:stage")
  assert.equal(issued.body.canPublish, true)
  assert.equal(issued.body.canSubscribe, true)
  assert.deepEqual(issued.body.participantPlayerIds, ["p1", "p2"])

  const unknown = await invoke(app.route("POST", "/media-token"), {
    body: {
      playerId: "missing-player",
      mode: "zone",
      zoneId: "stage",
    },
  })

  assert.equal(unknown.statusCode, 404)
  assert.equal(unknown.body.status, "denied")
  assert.equal(unknown.body.reason, "unknown_player")

  const badRequest = await invoke(app.route("POST", "/media-token"), {
    body: {
      playerId: "p1",
      mode: "invalid",
    },
  })

  assert.equal(badRequest.statusCode, 400)
  assert.equal(badRequest.body.status, "denied")
  assert.equal(badRequest.body.reason, "bad_request")
}

routeChecks().catch((error) => {
  console.error(error)
  process.exit(1)
})
