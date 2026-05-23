const assert = require("assert")
const {
  AuthenticationService,
  DEFAULT_AUTHENTICATION_POLICY,
  InMemoryPlatformStore,
  JsonTokenSigner,
  SequentialIdGenerator,
} = require("../dist/index.js")
const { ApiController } = require("../dist/controller.js")

const nowMs = Date.parse("2026-05-23T10:00:00.000Z")

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
const controller = new ApiController(auth)

const signIn = controller.signInWithWikimediaProfile({
  profile: {
    sub: "wikimedia-user-controller",
    username: "Grace",
    blocked: false,
    groups: ["event-organizer"],
  },
  nowMs,
})

assert.equal(signIn.status, 200)
assert.equal(signIn.body.username, "Grace")
assert.deepEqual(signIn.body.roles, ["space:event-organizer"])
assert.ok(signIn.headers["set-cookie"].includes("HttpOnly"))
assert.ok(signIn.headers["set-cookie"].includes("Secure"))
assert.ok(signIn.headers["set-cookie"].includes("SameSite=Lax"))

const token = controller.issueWorldToken({
  sessionId: signIn.body.sessionId,
  permissions: ["room:lobby:enter"],
  roles: signIn.body.roles,
  roomId: "room-lobby",
  nowMs,
})

assert.equal(token.status, 200)
assert.equal(token.body.claims.sessionId, signIn.body.sessionId)
assert.equal(token.body.claims.roomId, "room-lobby")
assert.ok(token.body.token.startsWith("unsigned-local."))

const blocked = controller.signInWithWikimediaProfile({
  profile: {
    sub: "blocked-controller-user",
    username: "Blocked",
    blocked: true,
    groups: [],
  },
  nowMs,
})

assert.equal(blocked.status, 403)
assert.equal(blocked.body.error, "sign_in_denied")

const badToken = controller.issueWorldToken({
  sessionId: "missing_session",
  permissions: [],
  roles: [],
  nowMs,
})

assert.equal(badToken.status, 401)
assert.equal(badToken.body.error, "world_token_denied")
