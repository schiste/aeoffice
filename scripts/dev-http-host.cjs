const { createServer } = require("node:http")
const { createHash } = require("node:crypto")
const { readFile } = require("node:fs/promises")
const { resolve, sep } = require("node:path")

const DEFAULT_HOSTNAME = "127.0.0.1"
const DEFAULT_PORT = 8787
const DEVELOPMENT_WORLD_TICK_MS = 50
const DEVELOPMENT_WALK_SPEED_PX_PER_SECOND = 88
const DEVELOPMENT_RUN_SPEED_PX_PER_SECOND = 148
const DEVELOPMENT_COLLISION_BODY_RADIUS_PX = 7.5
const DEVELOPMENT_COLLISION_SLIDE_MAX_NUDGE_PX = 12
const WEB_APP_DIST_DIR = resolve(__dirname, "../apps/web/dist-app")

function createPrefixedFetchHandler(routes) {
  return async (request) => {
    const url = new URL(request.url)
    const route = routes.find((candidate) =>
      prefixMatches(url.pathname, candidate.prefix),
    )

    if (!route) {
      return jsonResponse(404, {
        error: "not_found",
        reason: "No mounted development route matches this request.",
      })
    }

    return route.handler(rewriteRequestPath(request, route.prefix))
  }
}

function createNodeRequestHandler(fetchHandler) {
  return async (incoming, outgoing) => {
    try {
      const request = nodeRequestToFetchRequest(incoming)
      const response = await fetchHandler(request)
      await writeFetchResponse(outgoing, response)
    } catch (error) {
      await writeFetchResponse(
        outgoing,
        jsonResponse(500, {
          error: "internal_error",
          reason: error instanceof Error ? error.message : "Unknown error.",
        }),
      )
    }
  }
}

function createDevelopmentFetchHandler(env = process.env) {
  return createDevelopmentRuntime({ env }).handler
}

function createDevelopmentRuntime(options = {}) {
  const api = require("../apps/api/dist/index.js")
  const media = require("../apps/media-gateway/dist/index.js")
  const worldServer = require("../apps/world-server/dist/index.js")
  const env = options.env ?? process.env
  const resolvedEnv = developmentEnv(env)
  const apiRuntime = api.createApiRuntimeFromConfig({
    config: api.apiRuntimeConfigFromEnv(resolvedEnv),
    fetch: runtimeFetch,
    clock: options.clock,
  })
  const worldRuntime = worldServer.createWorldGatewayRuntime({
    config: developmentWorldConfig(),
    clock: options.clock,
  })
  const mediaRuntime = media.createMediaGatewayRuntime({
    config: media.mediaGatewayConfigFromEnv(resolvedEnv),
    participantDirectory: createWorldParticipantDirectory(worldRuntime.world),
    clock: options.clock,
  })

  const handler = createPrefixedFetchHandler([
    {
      prefix: "/dev",
      handler: createDevelopmentToolsHandler(apiRuntime, worldRuntime, options.clock),
    },
    {
      prefix: "/api",
      handler: api.createApiFetchHandler(apiRuntime),
    },
    {
      prefix: "/media",
      handler: media.createMediaGatewayFetchHandler(mediaRuntime),
    },
    {
      prefix: "/world",
      handler: worldServer.createWorldFetchHandler(worldRuntime),
    },
    {
      prefix: "/app",
      handler: createStaticWebHandler(WEB_APP_DIST_DIR),
    },
    {
      prefix: "/",
      handler: createStaticWebHandler(WEB_APP_DIST_DIR),
    },
  ])

  return {
    handler,
    apiRuntime,
    mediaRuntime,
    worldRuntime,
  }
}

function startDevelopmentServer(options = {}) {
  const hostname = options.hostname ?? DEFAULT_HOSTNAME
  const port = options.port ?? DEFAULT_PORT
  const runtime = options.runtime ??
    (options.handler
      ? undefined
      : createDevelopmentRuntime({
          env: options.env ?? process.env,
          clock: options.clock,
        }))
  const handler = options.handler ?? runtime.handler
  const server = createServer(createNodeRequestHandler(handler))

  if (runtime) {
    installDevelopmentWorldRealtimeGateway(server, runtime.worldRuntime, options.clock)
  }

  return new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, hostname, () => {
      server.off("error", reject)
      resolve({
        server,
        url: `http://${hostname}:${server.address().port}`,
        runtime,
      })
    })
  })
}

function installDevelopmentWorldRealtimeGateway(server, worldRuntime, clock) {
  const sockets = new Map()
  const tickInterval = setInterval(() => {
    const events = worldRuntime.controller.tick(clock?.nowMs() ?? Date.now())
    if (events.length > 0) {
      routeRealtimeWorldEvents(sockets, undefined, events)
    }
  }, DEVELOPMENT_WORLD_TICK_MS)

  server.on("close", () => {
    clearInterval(tickInterval)
  })

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(
      request.url ?? "/",
      `http://${request.headers.host ?? `${DEFAULT_HOSTNAME}:${DEFAULT_PORT}`}`,
    )

    if (url.pathname !== "/world/realtime") {
      socket.destroy()
      return
    }

    const key = headerValue(request.headers["sec-websocket-key"])
    if (!key) {
      socket.destroy()
      return
    }

    socket.write(webSocketHandshakeResponse(key))
    let clientId =
      typeof url.searchParams.get("clientId") === "string"
        ? url.searchParams.get("clientId")
        : undefined
    let pending = Buffer.from(head ?? Buffer.alloc(0))

    if (clientId) {
      sockets.set(clientId, socket)
    }

    socket.on("data", (chunk) => {
      pending = Buffer.concat([pending, chunk])
      const parsed = readWebSocketFrames(pending)
      pending = parsed.remaining

      for (const frame of parsed.frames) {
        if (frame.opcode === 8) {
          socket.end(encodeWebSocketFrame("", 8))
          return
        }

        if (frame.opcode === 9) {
          socket.write(encodeWebSocketFrame(frame.payload, 10))
          continue
        }

        if (frame.opcode !== 1) continue

        try {
          const packet = JSON.parse(frame.payload.toString("utf8"))
          if (!packet || typeof packet !== "object") continue
          if (packet.type !== "world_message") continue
          if (typeof packet.clientId !== "string") continue

          clientId = packet.clientId
          sockets.set(clientId, socket)

          const events = worldRuntime.controller.queueRealtimeMessage(
            packet.clientId,
            packet.message,
            clock?.nowMs() ?? Date.now(),
          )
          routeRealtimeWorldEvents(sockets, packet.clientId, events)
        } catch (error) {
          sendWebSocketJson(socket, {
            type: "world_realtime_error",
            reason: error instanceof Error ? error.message : "Invalid realtime packet.",
          })
        }
      }
    })

    socket.on("close", () => {
      if (clientId && sockets.get(clientId) === socket) {
        sockets.delete(clientId)
      }
    })
    socket.on("error", () => {
      if (clientId && sockets.get(clientId) === socket) {
        sockets.delete(clientId)
      }
    })
  })
}

function routeRealtimeWorldEvents(sockets, senderClientId, events) {
  for (const event of events) {
    if (event.type === "broadcast") {
      for (const [clientId, socket] of sockets) {
        if (event.exceptClientId === clientId) continue
        sendWebSocketJson(socket, {
          type: "world_events",
          transport: "websocket",
          events: [event],
        })
      }
      continue
    }

    if (event.type === "send") {
      for (const clientId of event.clientIds ?? []) {
        const socket = sockets.get(clientId)
        if (!socket) continue
        sendWebSocketJson(socket, {
          type: "world_events",
          transport: "websocket",
          events: [event],
        })
      }
      continue
    }

    const sender = senderClientId ? sockets.get(senderClientId) : undefined
    if (sender) {
      sendWebSocketJson(sender, {
        type: "world_events",
        transport: "websocket",
        events: [event],
      })
    }
  }
}

function webSocketHandshakeResponse(key) {
  const accept = createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64")

  return [
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "",
    "",
  ].join("\r\n")
}

function sendWebSocketJson(socket, packet) {
  socket.write(encodeWebSocketFrame(JSON.stringify(packet), 1))
}

function encodeWebSocketFrame(payload, opcode = 1) {
  const payloadBuffer = Buffer.isBuffer(payload)
    ? payload
    : Buffer.from(String(payload), "utf8")
  const header =
    payloadBuffer.length < 126
      ? Buffer.from([0x80 | opcode, payloadBuffer.length])
      : payloadBuffer.length <= 0xffff
        ? Buffer.from([
            0x80 | opcode,
            126,
            (payloadBuffer.length >> 8) & 0xff,
            payloadBuffer.length & 0xff,
          ])
        : Buffer.concat([
            Buffer.from([0x80 | opcode, 127, 0, 0, 0, 0]),
            uint32Buffer(payloadBuffer.length),
          ])

  return Buffer.concat([header, payloadBuffer])
}

function readWebSocketFrames(buffer) {
  const frames = []
  let offset = 0

  while (buffer.length - offset >= 2) {
    const first = buffer[offset]
    const second = buffer[offset + 1]
    const opcode = first & 0x0f
    const masked = (second & 0x80) !== 0
    let length = second & 0x7f
    let headerLength = 2

    if (length === 126) {
      if (buffer.length - offset < 4) break
      length = buffer.readUInt16BE(offset + 2)
      headerLength = 4
    } else if (length === 127) {
      if (buffer.length - offset < 10) break
      const high = buffer.readUInt32BE(offset + 2)
      const low = buffer.readUInt32BE(offset + 6)
      if (high !== 0) {
        throw new Error("Realtime frame is too large for the development host.")
      }
      length = low
      headerLength = 10
    }

    const maskLength = masked ? 4 : 0
    const frameLength = headerLength + maskLength + length
    if (buffer.length - offset < frameLength) break

    const mask = masked
      ? buffer.subarray(offset + headerLength, offset + headerLength + 4)
      : undefined
    const payloadStart = offset + headerLength + maskLength
    const payload = Buffer.from(buffer.subarray(payloadStart, payloadStart + length))

    if (mask) {
      for (let index = 0; index < payload.length; index += 1) {
        payload[index] ^= mask[index % 4]
      }
    }

    frames.push({ opcode, payload })
    offset += frameLength
  }

  return {
    frames,
    remaining: buffer.subarray(offset),
  }
}

function uint32Buffer(value) {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32BE(value, 0)
  return buffer
}

function rewriteRequestPath(request, prefix) {
  const url = new URL(request.url)
  const nextPath = url.pathname.slice(prefix.length) || "/"
  const init = {
    method: request.method,
    headers: request.headers,
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body
    init.duplex = "half"
  }

  url.pathname = nextPath.startsWith("/") ? nextPath : `/${nextPath}`
  return new Request(url, init)
}

function createDevAuthHandler(apiRuntime, clock) {
  return async (request) => {
    const url = new URL(request.url)

    if (request.method !== "POST" || url.pathname !== "/sign-in") {
      return jsonResponse(404, {
        error: "not_found",
        reason: "No development auth route matches this request.",
      })
    }

    const input = await request.json()
    const profile =
      input && typeof input === "object" && !Array.isArray(input) ? input : {}
    const subject =
      typeof profile.subject === "string" && profile.subject.trim()
        ? profile.subject
        : "wikimedia-local-user"
    const username =
      typeof profile.username === "string" && profile.username.trim()
        ? profile.username
        : "Local User"
    const result = await apiRuntime.auth.signInWithWikimediaProfile(
      {
        sub: subject,
        username,
        blocked: false,
        groups: [],
      },
      clock?.nowMs() ?? Date.now(),
    )

    if (result.status === "denied") {
      return jsonResponse(403, {
        error: "sign_in_denied",
        reason: result.reason,
      })
    }

    return jsonResponse(200, {
      userId: result.user.id,
      username: result.user.username,
      sessionId: result.session.id,
      roles: result.roleKeys,
    })
  }
}

function createDevelopmentToolsHandler(apiRuntime, worldRuntime, clock) {
  const authHandler = createDevAuthHandler(apiRuntime, clock)
  const fixtureMapHandler = createDevFixtureMapHandler()
  const worldGeometryHandler = createDevWorldGeometryHandler(worldRuntime)
  const worldMovementHandler = createDevWorldMovementHandler(worldRuntime)

  return async (request) => {
    const url = new URL(request.url)

    if (url.pathname === "/sign-in") {
      return authHandler(request)
    }

    if (url.pathname === "/fixture-map") {
      return fixtureMapHandler(request)
    }

    if (url.pathname === "/world-geometry") {
      return worldGeometryHandler(request)
    }

    if (url.pathname === "/world-movement") {
      return worldMovementHandler(request)
    }

    return jsonResponse(404, {
      error: "not_found",
      reason: "No development tool route matches this request.",
    })
  }
}

function createDevWorldGeometryHandler(worldRuntime) {
  return async (request) => {
    if (request.method !== "POST") {
      return jsonResponse(405, {
        error: "method_not_allowed",
        reason: "World geometry updates only support POST.",
      })
    }

    const body = await request.json()
    const geometry = developmentWorldGeometryFromBody(body)
    worldRuntime.controller.resetRoom(geometry)

    return jsonResponse(200, {
      status: "ok",
      blockedTileCount: geometry.map.blockedTiles.length,
      zoneCount: geometry.zones.length,
    })
  }
}

function createDevWorldMovementHandler(worldRuntime) {
  return async (request) => {
    if (request.method !== "POST") {
      return jsonResponse(405, {
        error: "method_not_allowed",
        reason: "World movement tuning updates only support POST.",
      })
    }

    const body = await request.json()
    const tuning = developmentWorldMovementFromBody(body)
    worldRuntime.world.updateMovementTuning(tuning)

    return jsonResponse(200, {
      status: "ok",
      playerSize: tuning.playerSize,
      speedPxPerSecond: tuning.speedPxPerSecond,
      runSpeedPxPerSecond: tuning.runSpeedPxPerSecond,
      collisionSlide: tuning.collisionSlide,
    })
  }
}

function createDevFixtureMapHandler() {
  return async (request) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return jsonResponse(405, {
        error: "method_not_allowed",
        reason: "Fixture maps only support GET and HEAD.",
      })
    }

    const presetId = new URL(request.url).searchParams.get("preset") ?? "lobby"

    if (!isDevelopmentPresetId(presetId)) {
      return jsonResponse(400, {
        error: "invalid_preset",
        reason: `Unknown development fixture preset: ${presetId}`,
      })
    }

    const body = createDevelopmentFixtureMap(presetId)
    return new Response(request.method === "HEAD" ? undefined : JSON.stringify(body), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    })
  }
}

function createDevelopmentFixtureMap(presetId = "lobby") {
  const assetRegistry = require("../packages/asset-registry/dist/index.js")
  const preset = assetRegistry.compilePresetMap(presetId)
  const definition = preset.definition
  const compiled = preset.compiled
  const tokenIds = new Set(compiled.referencedTokenIds)

  return {
    definition,
    compiled,
    spawnPoints: preset.spawnPoints,
    catalog: {
      version: assetRegistry.starterVisualAssetCatalog.version,
      tileSize: assetRegistry.starterVisualAssetCatalog.tileSize,
      tokens: assetRegistry.starterVisualAssetCatalog.tokens
        .filter((token) => tokenIds.has(token.id))
        .map((token) => ({
          id: token.id,
          kind: token.kind,
          layer: token.layer,
          provisionalGid: token.provisionalGid,
          widthTiles: token.widthTiles,
          heightTiles: token.heightTiles,
          collidable: token.collidable,
          asset: token.asset,
          tags: token.tags,
        })),
    },
  }
}

function isDevelopmentPresetId(value) {
  return value === "lobby" || value === "meeting_room" || value === "lounge_cafe"
}

function createStaticWebHandler(rootDir) {
  return async (request) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return jsonResponse(405, {
        error: "method_not_allowed",
        reason: "Static app assets only support GET and HEAD.",
      })
    }

    const url = new URL(request.url)
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname
    const filePath = resolve(rootDir, `.${decodeURIComponent(pathname)}`)

    if (!filePath.startsWith(`${rootDir}${sep}`) && filePath !== rootDir) {
      return jsonResponse(403, {
        error: "forbidden",
        reason: "Static asset path is outside the web root.",
      })
    }

    try {
      const body = await readFile(filePath)

      return new Response(request.method === "HEAD" ? undefined : body, {
        status: 200,
        headers: {
          "content-type": contentType(filePath),
        },
      })
    } catch {
      return jsonResponse(404, {
        error: "not_found",
        reason: "Static app asset was not found.",
      })
    }
  }
}

function nodeRequestToFetchRequest(incoming) {
  const protocol = headerValue(incoming.headers["x-forwarded-proto"]) ?? "http"
  const host = headerValue(incoming.headers.host) ?? `${DEFAULT_HOSTNAME}:${DEFAULT_PORT}`
  const url = new URL(incoming.url ?? "/", `${protocol}://${host}`)
  const init = {
    method: incoming.method ?? "GET",
    headers: nodeHeaders(incoming.headers),
  }

  if (init.method !== "GET" && init.method !== "HEAD") {
    init.body = incoming
    init.duplex = "half"
  }

  return new Request(url, init)
}

async function writeFetchResponse(outgoing, response) {
  outgoing.statusCode = response.status
  response.headers.forEach((value, name) => {
    outgoing.setHeader(name, value)
  })

  const body = Buffer.from(await response.arrayBuffer())
  outgoing.end(body)
}

function nodeHeaders(headers) {
  const result = new Headers()

  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) continue
    result.set(name, Array.isArray(value) ? value.join(", ") : value)
  }

  return result
}

function prefixMatches(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  })
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8"
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8"
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8"
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8"
  if (filePath.endsWith(".png")) return "image/png"
  if (filePath.endsWith(".svg")) return "image/svg+xml"
  return "application/octet-stream"
}

function headerValue(value) {
  if (Array.isArray(value)) return value[0]
  return value
}

async function runtimeFetch(url, request) {
  const response = await fetch(url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  })

  return {
    ok: response.ok,
    status: response.status,
    json: () => response.json(),
  }
}

function developmentEnv(env) {
  return {
    ...env,
    WIKIMEDIA_OAUTH_CLIENT_ID:
      env.WIKIMEDIA_OAUTH_CLIENT_ID ?? "local-dev-client",
    WIKIMEDIA_OAUTH_REDIRECT_URI:
      env.WIKIMEDIA_OAUTH_REDIRECT_URI ??
      `http://${DEFAULT_HOSTNAME}:${env.PORT ?? DEFAULT_PORT}/api/auth/wikimedia/callback`,
    AEDVENTURE_DEFAULT_ROLE_KEYS:
      env.AEDVENTURE_DEFAULT_ROLE_KEYS ?? "space:member",
    AEDVENTURE_DEFAULT_PERMISSION_KEYS:
      env.AEDVENTURE_DEFAULT_PERMISSION_KEYS ??
      [
        "room:lobby:enter",
        "chat:room:send",
        "chat:room:receive",
        "media:zone:join",
        "media:zone:publish",
        "media:zone:subscribe",
      ].join(","),
    AEDVENTURE_LIVEKIT_URL:
      env.AEDVENTURE_LIVEKIT_URL ?? "ws://localhost:7880",
  }
}

function developmentWorldConfig() {
  const fixtureMap = createDevelopmentFixtureMap().compiled

  return {
    map: {
      width: fixtureMap.width * fixtureMap.tileSize,
      height: fixtureMap.height * fixtureMap.tileSize,
      tileSize: fixtureMap.tileSize,
      blockedTiles: fixtureMap.blockedTiles,
    },
    zones: fixtureMap.zones.map((zone) => ({
      id: zone.id,
      bounds: {
        x: zone.xStart * fixtureMap.tileSize,
        y: zone.yStart * fixtureMap.tileSize,
        width: (zone.xEnd - zone.xStart) * fixtureMap.tileSize,
        height: (zone.yEnd - zone.yStart) * fixtureMap.tileSize,
      },
    })),
    playerSize: collisionBodySizeForRadius(DEVELOPMENT_COLLISION_BODY_RADIUS_PX),
    speedPxPerSecond: DEVELOPMENT_WALK_SPEED_PX_PER_SECOND,
    runSpeedPxPerSecond: DEVELOPMENT_RUN_SPEED_PX_PER_SECOND,
    collisionSlide: {
      maxNudgePx: DEVELOPMENT_COLLISION_SLIDE_MAX_NUDGE_PX,
    },
    defaultAvatarId: "adam",
    tickMs: DEVELOPMENT_WORLD_TICK_MS,
    defaultRoomId: "room-lobby",
    proximityChatRadiusPx: 96,
  }
}

function developmentWorldMovementFromBody(body) {
  const record = body && typeof body === "object" && !Array.isArray(body) ? body : {}
  const collisionBodyRadiusPx = optionalPositiveNumber(
    record.collisionBodyRadiusPx,
    "collisionBodyRadiusPx",
    DEVELOPMENT_COLLISION_BODY_RADIUS_PX,
  )
  const collisionSlideMaxNudgePx = optionalNonNegativeNumber(
    record.collisionSlideMaxNudgePx,
    "collisionSlideMaxNudgePx",
    DEVELOPMENT_COLLISION_SLIDE_MAX_NUDGE_PX,
  )

  return {
    playerSize: collisionBodySizeForRadius(collisionBodyRadiusPx),
    speedPxPerSecond: optionalPositiveNumber(
      record.walkSpeedPxPerSecond,
      "walkSpeedPxPerSecond",
      DEVELOPMENT_WALK_SPEED_PX_PER_SECOND,
    ),
    runSpeedPxPerSecond: optionalPositiveNumber(
      record.runSpeedPxPerSecond,
      "runSpeedPxPerSecond",
      DEVELOPMENT_RUN_SPEED_PX_PER_SECOND,
    ),
    collisionSlide: {
      maxNudgePx: collisionSlideMaxNudgePx,
    },
  }
}

function developmentWorldGeometryFromBody(body) {
  const record = body && typeof body === "object" && !Array.isArray(body) ? body : {}
  const map = record.map && typeof record.map === "object" ? record.map : {}
  const zones = Array.isArray(record.zones) ? record.zones : []
  const width = requiredPositiveNumber(map.width, "map.width")
  const height = requiredPositiveNumber(map.height, "map.height")
  const tileSize = requiredPositiveNumber(map.tileSize, "map.tileSize")
  const blockedTiles = Array.isArray(map.blockedTiles)
    ? map.blockedTiles.map((tile, index) => ({
        x: requiredNonNegativeNumber(tile?.x, `map.blockedTiles[${index}].x`),
        y: requiredNonNegativeNumber(tile?.y, `map.blockedTiles[${index}].y`),
      }))
    : []

  return {
    map: {
      width,
      height,
      tileSize,
      blockedTiles,
    },
    zones: zones.map((zone, index) => ({
      id: requiredStringValue(zone?.id, `zones[${index}].id`),
      bounds: {
        x: requiredNonNegativeNumber(zone?.bounds?.x, `zones[${index}].bounds.x`),
        y: requiredNonNegativeNumber(zone?.bounds?.y, `zones[${index}].bounds.y`),
        width: requiredPositiveNumber(zone?.bounds?.width, `zones[${index}].bounds.width`),
        height: requiredPositiveNumber(zone?.bounds?.height, `zones[${index}].bounds.height`),
      },
      requiredPermission:
        typeof zone?.requiredPermission === "string"
          ? zone.requiredPermission
          : undefined,
    })),
  }
}

function collisionBodySizeForRadius(radiusPx) {
  const diameter = radiusPx * 2

  return {
    width: diameter,
    height: diameter,
  }
}

function requiredStringValue(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Expected ${field} to be a non-empty string.`)
  }

  return value
}

function requiredPositiveNumber(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Expected ${field} to be a positive number.`)
  }

  return value
}

function optionalPositiveNumber(value, field, fallback) {
  if (value === undefined) return fallback
  return requiredPositiveNumber(value, field)
}

function requiredNonNegativeNumber(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Expected ${field} to be a non-negative number.`)
  }

  return value
}

function optionalNonNegativeNumber(value, field, fallback) {
  if (value === undefined) return fallback
  return requiredNonNegativeNumber(value, field)
}

function createWorldParticipantDirectory(world) {
  return {
    async findParticipant(playerId) {
      return world.getParticipant(playerId)
    },
    async listParticipantsFor(requester) {
      return world.listParticipants().filter(
        (participant) => participant.roomId === requester.roomId,
      )
    },
  }
}

async function main() {
  const port = Number(process.env.PORT ?? DEFAULT_PORT)
  const hostname = process.env.HOST ?? DEFAULT_HOSTNAME
  const { server, url } = await startDevelopmentServer({ hostname, port })

  console.log(`Aedventure dev HTTP host listening on ${url}`)
  console.log(`Browser shell available at ${url}/app`)
  console.log("Mounted local-only dev tools under /dev")
  console.log("Mounted API routes under /api")
  console.log("Mounted world routes under /world")
  console.log("Mounted media routes under /media")

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
      server.close(() => process.exit(0))
    })
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}

module.exports = {
  createDevelopmentFetchHandler,
  createDevelopmentFixtureMap,
  createDevelopmentRuntime,
  createDevelopmentToolsHandler,
  createDevAuthHandler,
  createDevFixtureMapHandler,
  createNodeRequestHandler,
  createPrefixedFetchHandler,
  createStaticWebHandler,
  encodeWebSocketFrame,
  installDevelopmentWorldRealtimeGateway,
  jsonResponse,
  nodeRequestToFetchRequest,
  readWebSocketFrames,
  startDevelopmentServer,
  writeFetchResponse,
}
