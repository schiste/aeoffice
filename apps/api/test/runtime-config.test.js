const assert = require("assert")
const {
  apiRuntimeConfigFromEnv,
  createApiRuntimeFromConfig,
} = require("../dist/index.js")

const nowMs = Date.parse("2026-05-23T10:00:00.000Z")

class RecordingApp {
  constructor() {
    this.routes = new Map()
  }

  get(path, handler) {
    this.routes.set(`GET ${path}`, handler)
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
    this.headers = {}
    this.body = undefined
  }

  status(code) {
    this.statusCode = code
    return this
  }

  header(name, value) {
    this.headers[name] = value
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

async function main() {
  const config = apiRuntimeConfigFromEnv({
    WIKIMEDIA_OAUTH_CLIENT_ID: "client-1",
    WIKIMEDIA_OAUTH_CLIENT_SECRET: "secret-1",
    WIKIMEDIA_OAUTH_REDIRECT_URI:
      "https://office.example.test/auth/wikimedia/callback",
    WIKIMEDIA_OAUTH_SCOPES: "basic, editpage",
    AEDVENTURE_SESSION_TTL_MS: "3600000",
    AEDVENTURE_WORLD_TOKEN_TTL_MS: "300000",
    AEDVENTURE_OAUTH_STATE_TTL_MS: "600000",
    AEDVENTURE_SESSION_COOKIE_NAME: "office_session",
    AEDVENTURE_DEFAULT_ROLE_KEYS: "space:member",
    AEDVENTURE_DEFAULT_PERMISSION_KEYS:
      "room:lobby:enter,chat:room:send,chat:room:receive",
  })
  const fetchCalls = []
  const runtime = createApiRuntimeFromConfig({
    config,
    clock: {
      nowMs: () => nowMs,
    },
    fetch: async (url, request) => {
      fetchCalls.push({ url, request })

      if (request.method === "POST") {
        return jsonResponse(200, {
          access_token: "access-123",
          token_type: "Bearer",
        })
      }

      return jsonResponse(200, {
        sub: "wikimedia-user-1",
        username: "Ada",
        blocked: false,
        groups: [],
      })
    },
  })
  const app = new RecordingApp()

  runtime.registerRoutes(app)

  const start = await invoke(app.route("GET", "/auth/wikimedia/start"), {
    query: {
      redirect_after_sign_in: "/office",
      code_challenge: "challenge-123",
    },
  })

  assert.equal(start.statusCode, 302)
  assert.ok(start.headers.location.includes("client_id=client-1"))
  assert.ok(start.headers.location.includes("scope=basic+editpage"))

  const callback = await invoke(app.route("GET", "/auth/wikimedia/callback"), {
    query: {
      state: "oauth_state_1",
      code: "code-123",
    },
  })

  assert.equal(callback.statusCode, 200)
  assert.equal(callback.body.username, "Ada")
  assert.ok(callback.headers["set-cookie"].includes("office_session="))

  const token = await invoke(app.route("POST", "/world-token"), {
    body: {
      sessionId: callback.body.sessionId,
      roomId: "room-lobby",
    },
  })

  assert.equal(token.statusCode, 200)
  assert.deepEqual(token.body.claims.roles, ["space:member"])
  assert.deepEqual(token.body.claims.permissions, [
    "room:lobby:enter",
    "chat:room:send",
    "chat:room:receive",
  ])
  assert.equal(fetchCalls[0].request.method, "POST")
  assert.match(fetchCalls[0].request.body, /grant_type=authorization_code/)
  assert.equal(fetchCalls[1].request.method, "GET")
  assert.equal(fetchCalls[1].request.headers.authorization, "Bearer access-123")
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
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
