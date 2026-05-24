const { createServer } = require("node:http")
const { readFile } = require("node:fs/promises")
const { resolve, sep } = require("node:path")

const DEFAULT_HOSTNAME = "127.0.0.1"
const DEFAULT_PORT = 8787
const WEB_STATIC_DIR = resolve(__dirname, "../apps/web/static")

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
      handler: createDevAuthHandler(apiRuntime, options.clock),
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
      handler: createStaticWebHandler(WEB_STATIC_DIR),
    },
    {
      prefix: "/",
      handler: createStaticWebHandler(WEB_STATIC_DIR),
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
  const handler =
    options.handler ?? createDevelopmentFetchHandler(options.env ?? process.env)
  const server = createServer(createNodeRequestHandler(handler))

  return new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, hostname, () => {
      server.off("error", reject)
      resolve({
        server,
        url: `http://${hostname}:${server.address().port}`,
      })
    })
  })
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
  return {
    map: {
      width: 512,
      height: 512,
      tileSize: 32,
      blockedTiles: [
        { x: 0, y: 0 },
        { x: 15, y: 15 },
      ],
    },
    zones: [
      {
        id: "meeting-zone",
        bounds: { x: 32, y: 32, width: 128, height: 96 },
      },
    ],
    playerSize: { width: 16, height: 16 },
    speedPxPerSecond: 64,
    defaultAvatarId: "adam",
    tickMs: 250,
    defaultRoomId: "room-lobby",
    proximityChatRadiusPx: 96,
  }
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
  console.log("Mounted local-only dev auth under /dev")
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
  createDevelopmentRuntime,
  createDevAuthHandler,
  createNodeRequestHandler,
  createPrefixedFetchHandler,
  createStaticWebHandler,
  jsonResponse,
  nodeRequestToFetchRequest,
  startDevelopmentServer,
  writeFetchResponse,
}
