const assert = require("assert")
const { WikimediaOAuthClient } = require("@aedventure/auth-wikimedia")
const {
  ApiController,
  AuthenticationService,
  DEFAULT_AUTHENTICATION_POLICY,
  InMemoryOAuthStateStore,
  InMemoryPlatformStore,
  JsonTokenSigner,
  SequentialIdGenerator,
  SequentialOAuthStateGenerator,
  WikimediaOAuthController,
  registerApiRoutes,
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

class RecordingHttpClient {
  async postForm() {
    return {
      access_token: "access-123",
      token_type: "Bearer",
    }
  }

  async getJson() {
    return {
      sub: "wikimedia-user-1",
      username: "Ada",
      blocked: false,
      groups: ["event-organizer"],
    }
  }
}

async function invoke(handler, request) {
  const reply = new RecordingReply()
  await handler(request, reply)
  return reply
}

async function main() {
  const auth = new AuthenticationService({
    store: new InMemoryPlatformStore(),
    idGenerator: new SequentialIdGenerator(),
    tokenSigner: new JsonTokenSigner(),
    policy: DEFAULT_AUTHENTICATION_POLICY,
    roleMappings: [
      {
        wikimediaGroup: "event-organizer",
        roleKey: "space:event-organizer",
      },
    ],
  })
  const oauth = new WikimediaOAuthClient(
    {
      clientId: "client-1",
      clientSecret: "secret-1",
      redirectUri: "https://app.example.test/auth/wikimedia/callback",
    },
    new RecordingHttpClient(),
  )
  const app = new RecordingApp()

  registerApiRoutes(app, {
    apiController: new ApiController(auth),
    wikimediaOAuthController: new WikimediaOAuthController({
      oauth,
      auth,
      stateStore: new InMemoryOAuthStateStore(),
      stateGenerator: new SequentialOAuthStateGenerator(),
      stateTtlMs: 1000 * 60 * 10,
    }),
    clock: {
      nowMs: () => nowMs,
    },
  })

  const start = await invoke(app.route("GET", "/auth/wikimedia/start"), {
    query: {
      redirect_after_sign_in: "/office",
      code_challenge: "challenge-123",
    },
  })

  assert.equal(start.statusCode, 302)
  assert.equal(start.body.provider, "wikimedia")
  assert.ok(start.headers.location.includes("state=oauth_state_1"))
  assert.ok(start.headers.location.includes("code_challenge=challenge-123"))

  const callback = await invoke(app.route("GET", "/auth/wikimedia/callback"), {
    query: {
      state: "oauth_state_1",
      code: "code-123",
    },
  })

  assert.equal(callback.statusCode, 200)
  assert.equal(callback.body.username, "Ada")
  assert.equal(callback.body.redirectAfterSignIn, "/office")
  assert.ok(callback.headers["set-cookie"].includes("HttpOnly"))

  const token = await invoke(app.route("POST", "/world-token"), {
    body: {
      sessionId: callback.body.sessionId,
      permissions: ["room:lobby:enter"],
      roles: callback.body.roles,
      roomId: "room-lobby",
    },
  })

  assert.equal(token.statusCode, 200)
  assert.equal(token.body.claims.sessionId, callback.body.sessionId)
  assert.equal(token.body.claims.roomId, "room-lobby")

  const invalidToken = await invoke(app.route("POST", "/world-token"), {
    body: {
      sessionId: callback.body.sessionId,
      permissions: "room:lobby:enter",
      roles: [],
    },
  })

  assert.equal(invalidToken.statusCode, 400)
  assert.equal(invalidToken.body.error, "bad_request")
  assert.match(invalidToken.body.reason, /permissions/)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
