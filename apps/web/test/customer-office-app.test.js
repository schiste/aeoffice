const assert = require("assert")
const {
  ApiController,
  AuthenticationService,
  DEFAULT_AUTHENTICATION_POLICY,
  InMemoryPlatformStore,
  JsonTokenSigner,
  SeededPermissionResolver,
  SequentialIdGenerator,
} = require("@aedventure/api")
const {
  AuthoritativeWorld,
  UnsignedLocalWorldTokenVerifier,
  WorldAdmissionService,
  WorldRoomController,
} = require("@aedventure/world-server")
const {
  MediaGatewayService,
  UnsignedLocalMediaTokenSigner,
} = require("@aedventure/media-gateway")
const { CHAT_PERMISSIONS, MEDIA_PERMISSIONS } = require("@aedventure/policy")
const { CustomerVirtualOfficeApp } = require("../dist/index.js")

const nowMs = Date.parse("2026-05-23T10:00:00.000Z")

class InProcessApiClient {
  constructor(controller) {
    this.controller = controller
  }

  async issueWorldToken(input) {
    const response = await this.controller.issueWorldToken(input)
    assert.equal(response.status, 200)
    return response.body
  }
}

class InProcessWorldClient {
  constructor(controller, clientId) {
    this.controller = controller
    this.clientId = clientId
  }

  async join(input) {
    const joined = this.controller.join({
      clientId: this.clientId,
      token: input.token,
      playerId: input.playerId,
      spawn: input.spawn,
      nowMs: input.nowMs,
      avatarId: input.avatarId,
      requestedRoomId: input.roomId,
    })

    if (joined.status === "denied") return joined

    return {
      status: "joined",
      player: {
        playerId: joined.player.playerId,
        userId: joined.player.userId,
        x: joined.player.position.x,
        y: joined.player.position.y,
        roomId: joined.player.roomId,
        direction: joined.player.direction,
        zoneIds: joined.player.zoneIds,
        permissions: joined.player.permissions,
        roles: joined.player.roles,
        lastSeqAck: joined.player.lastSeqAck,
      },
    }
  }

  async send(message, sentAtMs) {
    return this.controller
      .receive(this.clientId, message, sentAtMs)
      .filter((event) => eventVisibleToClient(event, this.clientId))
      .map((event) => event.message)
  }
}

class InProcessMediaClient {
  constructor(world, service) {
    this.world = world
    this.service = service
  }

  async issueToken(input) {
    const requester = this.world.getParticipant(input.playerId)
    assert.ok(requester, `Expected participant ${input.playerId}`)
    const result = this.service.issueMediaToken({
      requester,
      participants: this.world.listParticipants(),
      request: {
        mode: input.mode,
        zoneId: input.zoneId,
        targetPlayerIds: input.targetPlayerIds,
        publish: input.publish,
        subscribe: input.subscribe,
      },
      nowMs: input.nowMs,
    })

    if (result.status === "denied") return result

    return {
      status: "issued",
      liveKitUrl: result.liveKitUrl,
      token: result.token,
      room: result.claims.room,
      canPublish: result.claims.canPublish,
      canSubscribe: result.claims.canSubscribe,
      participantPlayerIds: result.claims.participantPlayerIds,
      expiresAt: result.claims.expiresAt,
    }
  }
}

async function main() {
  const api = buildApiController()
  const world = buildWorld()
  const worldController = new WorldRoomController(
    world,
    new WorldAdmissionService(world, new UnsignedLocalWorldTokenVerifier()),
  )
  const mediaClient = new InProcessMediaClient(
    world,
    new MediaGatewayService(
      {
        liveKitUrl: "ws://livekit.local:7880",
        tokenTtlMs: 5 * 60 * 1000,
        proximityRadiusPx: 96,
      },
      new UnsignedLocalMediaTokenSigner(),
    ),
  )
  const rendererEvents = []
  const app = new CustomerVirtualOfficeApp({
    api: new InProcessApiClient(api),
    world: new InProcessWorldClient(worldController, "client-1"),
    media: mediaClient,
    renderer: {
      worldEntered: (player) => rendererEvents.push(["entered", player.playerId]),
      playerUpdated: (player) => rendererEvents.push(["updated", player.x, player.y]),
      chatDelivered: (message) => rendererEvents.push(["chat", message.body]),
      mediaTokenIssued: (token) => rendererEvents.push(["media", token.room]),
      rejected: (reason) => rendererEvents.push(["rejected", reason]),
    },
  })
  const receiver = new CustomerVirtualOfficeApp({
    api: new InProcessApiClient(api),
    world: new InProcessWorldClient(worldController, "client-2"),
    media: mediaClient,
  })
  const firstSignIn = await signIn(api.auth, "wikimedia-user-1", "Ada")
  const secondSignIn = await signIn(api.auth, "wikimedia-user-2", "Grace")

  const entered = await app.enterWorld({
    sessionId: firstSignIn.session.id,
    playerId: "player-1",
    spawn: { x: 32, y: 32 },
    tenantId: "tenant-1",
    spaceId: "space-1",
    roomId: "room-lobby",
    nowMs,
  })
  await receiver.enterWorld({
    sessionId: secondSignIn.session.id,
    playerId: "player-2",
    spawn: { x: 64, y: 32 },
    tenantId: "tenant-1",
    spaceId: "space-1",
    roomId: "room-lobby",
    nowMs,
  })

  assert.equal(entered.playerId, "player-1")
  assert.equal(app.getState().joined, true)
  assert.ok(app.getState().worldToken.startsWith("unsigned-local."))
  assert.deepEqual(app.getState().players.map((player) => player.playerId), ["player-1"])

  await app.move("right", nowMs + 250)
  assert.equal(app.getState().players[0].x, 48)
  assert.equal(app.getState().players[0].lastSeqAck, 1)

  await app.sendChat("room", "Hello from the app layer", nowMs + 500)
  assert.equal(app.getState().chatLog.length, 1)
  assert.deepEqual(app.getState().chatLog[0].recipientPlayerIds, ["player-2"])

  const media = await app.joinMediaZone("meeting-zone", nowMs + 750)
  assert.equal(media.status, "issued")
  assert.equal(media.room, "zone:room-lobby:meeting-zone")
  assert.equal(media.canPublish, true)
  assert.equal(media.canSubscribe, true)
  assert.deepEqual(media.participantPlayerIds, ["player-1", "player-2"])

  assert.deepEqual(rendererEvents, [
    ["entered", "player-1"],
    ["updated", 48, 32],
    ["chat", "Hello from the app layer"],
    ["media", "zone:room-lobby:meeting-zone"],
  ])
}

function buildApiController() {
  const auth = new AuthenticationService({
    store: new InMemoryPlatformStore(),
    idGenerator: new SequentialIdGenerator(),
    tokenSigner: new JsonTokenSigner(),
    policy: DEFAULT_AUTHENTICATION_POLICY,
  })
  const permissionResolver = new SeededPermissionResolver({
    defaultAccess: {
      roles: ["space:member"],
      permissions: [
        "room:lobby:enter",
        CHAT_PERMISSIONS.roomSend,
        CHAT_PERMISSIONS.roomReceive,
        MEDIA_PERMISSIONS.zoneJoin,
        MEDIA_PERMISSIONS.zonePublish,
        MEDIA_PERMISSIONS.zoneSubscribe,
      ],
    },
  })
  const controller = new ApiController(auth, permissionResolver)

  return {
    auth,
    issueWorldToken: (input) => controller.issueWorldToken(input),
  }
}

function buildWorld() {
  return new AuthoritativeWorld({
    map: {
      width: 256,
      height: 256,
      tileSize: 32,
      blockedTiles: [],
    },
    zones: [
      {
        id: "meeting-zone",
        bounds: { x: 0, y: 0, width: 128, height: 128 },
      },
    ],
    playerSize: { width: 16, height: 16 },
    speedPxPerSecond: 64,
    defaultAvatarId: "adam",
    tickMs: 250,
    defaultRoomId: "room-lobby",
    proximityChatRadiusPx: 96,
  })
}

async function signIn(auth, subject, username) {
  const result = await auth.signInWithWikimediaProfile(
    {
      sub: subject,
      username,
      blocked: false,
      groups: [],
    },
    nowMs,
  )

  assert.equal(result.status, "signed_in")
  return result
}

function eventVisibleToClient(event, clientId) {
  if (event.type === "broadcast") return event.exceptClientId !== clientId
  return event.clientIds.includes(clientId)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
