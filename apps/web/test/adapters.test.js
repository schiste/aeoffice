const assert = require("assert")
const {
  HttpAppApiClient,
  HttpMediaGatewayClient,
  HttpWorldTransport,
  TransportWorldClient,
} = require("../dist/index.js")

const nowMs = Date.parse("2026-05-23T10:00:00.000Z")

async function main() {
  const apiCalls = []
  const api = new HttpAppApiClient({
    baseUrl: "https://office.example.test/api/",
    fetch: async (url, init) => {
      apiCalls.push({ url, init })
      return jsonResponse(200, {
        token: "world-token-1",
        claims: {
          sub: "usr_1",
          sessionId: "sess_1",
          roomId: "room-lobby",
          permissions: ["room:lobby:enter"],
          roles: ["space:member"],
          expiresAt: "2026-05-23T10:05:00.000Z",
        },
      })
    },
  })
  const worldToken = await api.issueWorldToken({
    sessionId: "sess_1",
    tenantId: "tenant-1",
    spaceId: "space-1",
    roomId: "room-lobby",
    nowMs,
  })

  assert.equal(worldToken.token, "world-token-1")
  assert.equal(apiCalls[0].url, "https://office.example.test/api/world-token")
  assert.equal(apiCalls[0].init.method, "POST")
  assert.equal(apiCalls[0].init.credentials, "include")
  assert.deepEqual(JSON.parse(apiCalls[0].init.body), {
    sessionId: "sess_1",
    tenantId: "tenant-1",
    spaceId: "space-1",
    roomId: "room-lobby",
  })

  const mediaCalls = []
  const media = new HttpMediaGatewayClient({
    baseUrl: "https://office.example.test/media",
    credentials: "same-origin",
    fetch: async (url, init) => {
      mediaCalls.push({ url, init })
      return jsonResponse(200, {
        status: "issued",
        liveKitUrl: "ws://livekit.local:7880",
        token: "livekit-token-1",
        room: "zone:room-lobby:meeting-zone",
        canPublish: true,
        canSubscribe: true,
        participantPlayerIds: ["player-1", "player-2"],
        expiresAt: "2026-05-23T10:05:00.000Z",
      })
    },
  })
  const mediaToken = await media.issueToken({
    playerId: "player-1",
    mode: "zone",
    zoneId: "meeting-zone",
    publish: true,
    subscribe: true,
    nowMs,
  })

  assert.equal(mediaToken.status, "issued")
  assert.equal(mediaToken.room, "zone:room-lobby:meeting-zone")
  assert.equal(mediaCalls[0].url, "https://office.example.test/media/media-token")
  assert.equal(mediaCalls[0].init.credentials, "same-origin")
  assert.deepEqual(JSON.parse(mediaCalls[0].init.body), {
    playerId: "player-1",
    mode: "zone",
    zoneId: "meeting-zone",
    publish: true,
    subscribe: true,
  })

  const deniedMedia = new HttpMediaGatewayClient({
    baseUrl: "https://office.example.test/media",
    fetch: async () =>
      jsonResponse(
        403,
        {
          status: "denied",
          reason: "missing_permission",
        },
        false,
      ),
  })
  const denied = await deniedMedia.issueToken({
    playerId: "player-1",
    mode: "zone",
    zoneId: "meeting-zone",
    nowMs,
  })

  assert.equal(denied.status, "denied")
  assert.equal(denied.reason, "missing_permission")

  const transportCalls = []
  const world = new TransportWorldClient({
    async request(input) {
      transportCalls.push(input)
      if (input.type === "join") {
        return {
          type: "join_result",
          result: {
            status: "joined",
            player: {
              playerId: input.input.playerId,
              x: input.input.spawn.x,
              y: input.input.spawn.y,
              roomId: input.input.roomId,
              direction: "down",
              zoneIds: [],
              permissions: [],
              roles: [],
              lastSeqAck: 0,
            },
          },
        }
      }

      return {
        type: "messages",
        messages: [
          {
            type: "player_state",
            playerId: "player-1",
            x: 48,
            y: 32,
            direction: "right",
            anim: "adam_walk_right",
            seqAck: 1,
            serverTime: nowMs + 250,
          },
        ],
      }
    },
  })

  const joined = await world.join({
    token: "world-token-1",
    playerId: "player-1",
    spawn: { x: 32, y: 32 },
    roomId: "room-lobby",
    nowMs,
  })
  const messages = await world.send(
    { type: "move", direction: "right", seq: 1 },
    nowMs + 250,
  )

  assert.equal(joined.status, "joined")
  assert.equal(messages[0].type, "player_state")
  assert.equal(transportCalls[0].type, "join")
  assert.equal(transportCalls[1].type, "message")

  const worldCalls = []
  const httpWorldTransport = new HttpWorldTransport({
    baseUrl: "https://office.example.test/world",
    clientId: "client-1",
    fetch: async (url, init) => {
      worldCalls.push({ url, init })
      if (url.endsWith("/join")) {
        return jsonResponse(200, {
          status: "joined",
          clientId: "client-1",
          player: {
            playerId: "player-1",
            userId: "usr_1",
            position: { x: 32, y: 32 },
            roomId: "room-lobby",
            direction: "down",
            zoneIds: ["meeting-zone"],
            permissions: ["chat:room:send"],
            roles: ["space:member"],
            lastSeqAck: 0,
          },
        })
      }

      if (url.endsWith("/message")) {
        return jsonResponse(200, {
          events: [
            {
              type: "send",
              clientIds: ["other-client"],
              message: {
                type: "chat_rejected",
                playerId: "player-1",
                reason: "missing_permission",
                seqAck: 2,
                serverTime: nowMs,
              },
            },
            {
              type: "broadcast",
              message: {
                type: "player_state",
                playerId: "player-1",
                x: 48,
                y: 32,
                direction: "right",
                anim: "adam_walk_right",
                seqAck: 1,
                serverTime: nowMs + 250,
              },
            },
          ],
        })
      }

      return jsonResponse(200, { left: true })
    },
  })
  const httpWorld = new TransportWorldClient(httpWorldTransport)
  const httpJoined = await httpWorld.join({
    token: "world-token-1",
    playerId: "player-1",
    spawn: { x: 32, y: 32 },
    roomId: "room-lobby",
    nowMs,
  })
  const httpMessages = await httpWorld.send(
    { type: "move", direction: "right", seq: 1 },
    nowMs + 250,
  )
  const left = await httpWorldTransport.leave()

  assert.equal(httpJoined.status, "joined")
  assert.equal(httpJoined.player.x, 32)
  assert.equal(httpMessages.length, 1)
  assert.equal(httpMessages[0].type, "player_state")
  assert.equal(left, true)
  assert.equal(worldCalls[0].url, "https://office.example.test/world/join")
  assert.deepEqual(JSON.parse(worldCalls[0].init.body), {
    clientId: "client-1",
    token: "world-token-1",
    playerId: "player-1",
    spawn: { x: 32, y: 32 },
    roomId: "room-lobby",
  })
}

function jsonResponse(status, body, ok = status >= 200 && status < 300) {
  return {
    ok,
    status,
    async json() {
      return body
    },
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
