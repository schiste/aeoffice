const assert = require("node:assert")
const {
  createDevelopmentRuntime,
} = require("./dev-http-host.cjs")
const {
  CustomerVirtualOfficeApp,
  HttpAppApiClient,
  HttpMediaGatewayClient,
  HttpWorldTransport,
  TransportWorldClient,
} = require("../apps/web/dist/index.js")

const nowMs = Date.parse("2026-05-23T10:00:00.000Z")

async function main() {
  const runtime = createDevelopmentRuntime({
    clock: {
      nowMs: () => nowMs,
    },
    env: {
      AEDVENTURE_DEFAULT_ROLE_KEYS: "space:member",
      AEDVENTURE_DEFAULT_PERMISSION_KEYS: [
        "room:lobby:enter",
        "chat:room:send",
        "chat:room:receive",
        "media:zone:join",
        "media:zone:publish",
        "media:zone:subscribe",
      ].join(","),
    },
  })
  const firstSignIn = await signIn(
    runtime.handler,
    "wikimedia-user-1",
    "Ada",
  )
  const secondSignIn = await signIn(
    runtime.handler,
    "wikimedia-user-2",
    "Grace",
  )
  const rendererEvents = []
  const firstApp = appFor(runtime.handler, "client-1", rendererEvents)
  const secondApp = appFor(runtime.handler, "client-2")
  const fixtureMap = await getFixtureMap(runtime.handler)
  const firstSpawn = fixtureSpawnPosition(fixtureMap, "default")
  const secondSpawn = fixtureSpawnPosition(fixtureMap, "guest")

  const entered = await firstApp.enterWorld({
    sessionId: firstSignIn.session.id,
    playerId: "player-1",
    spawn: firstSpawn,
    roomId: "room-lobby",
    nowMs,
  })
  await secondApp.enterWorld({
    sessionId: secondSignIn.session.id,
    playerId: "player-2",
    spawn: secondSpawn,
    roomId: "room-lobby",
    nowMs,
  })

  assert.equal(entered.playerId, "player-1")
  assert.equal(firstApp.getState().joined, true)
  assert.ok(firstApp.getState().worldToken.startsWith("unsigned-local."))

  await firstApp.move("right", nowMs + 250)
  assert.equal(firstApp.getState().players[0].x, firstSpawn.x + 16)
  assert.equal(firstApp.getState().players[0].y, firstSpawn.y)

  await firstApp.sendChat("room", "Hello through dev host", nowMs + 500)
  assert.equal(firstApp.getState().chatLog.length, 1)
  assert.deepEqual(firstApp.getState().chatLog[0].recipientPlayerIds, [
    "player-2",
  ])

  const media = await firstApp.joinMediaZone("meeting-zone", nowMs + 750)

  assert.equal(media.status, "issued")
  assert.equal(media.room, "zone:room-lobby:meeting-zone")
  assert.equal(media.liveKitUrl, "ws://localhost:7880")
  assert.deepEqual(media.participantPlayerIds, ["player-1", "player-2"])
  assert.deepEqual(rendererEvents, [
    ["entered", "player-1"],
    ["updated", firstSpawn.x + 16, firstSpawn.y],
    ["chat", "Hello through dev host"],
    ["media", "zone:room-lobby:meeting-zone"],
  ])
}

function appFor(handler, clientId, rendererEvents = []) {
  const fetch = fetchAgainst(handler)

  return new CustomerVirtualOfficeApp({
    api: new HttpAppApiClient({
      baseUrl: "http://dev.local/api",
      fetch,
    }),
    world: new TransportWorldClient(
      new HttpWorldTransport({
        baseUrl: "http://dev.local/world",
        clientId,
        fetch,
      }),
    ),
    media: new HttpMediaGatewayClient({
      baseUrl: "http://dev.local/media",
      fetch,
    }),
    renderer: {
      worldEntered: (player) => rendererEvents.push(["entered", player.playerId]),
      playerUpdated: (player) =>
        rendererEvents.push(["updated", player.x, player.y]),
      chatDelivered: (message) => rendererEvents.push(["chat", message.body]),
      mediaTokenIssued: (token) => rendererEvents.push(["media", token.room]),
      rejected: (reason) => rendererEvents.push(["rejected", reason]),
    },
  })
}

function fetchAgainst(handler) {
  return async (url, init) => {
    const response = await handler(
      new Request(url, {
        method: init.method,
        headers: init.headers,
        body: init.body,
      }),
    )

    return {
      ok: response.ok,
      status: response.status,
      json: () => response.json(),
    }
  }
}

async function signIn(handler, subject, username) {
  const response = await handler(
    new Request("http://dev.local/dev/sign-in", {
      method: "POST",
      body: JSON.stringify({
        subject,
        username,
      }),
    }),
  )
  const result = await response.json()

  assert.equal(response.status, 200)
  assert.equal(result.username, username)
  return {
    session: {
      id: result.sessionId,
    },
  }
}

async function getFixtureMap(handler) {
  const response = await handler(new Request("http://dev.local/dev/fixture-map"))
  assert.equal(response.status, 200)
  return response.json()
}

function fixtureSpawnPosition(fixtureMap, spawnId) {
  const spawn = fixtureMap.spawnPoints.find((candidate) => candidate.id === spawnId)
  assert.ok(spawn, `Missing fixture spawn point ${spawnId}`)
  return spawn.position
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
