const assert = require("assert")
const {
  AuthenticationService,
  DEFAULT_AUTHENTICATION_POLICY,
  InMemoryPlatformStore,
  JsonTokenSigner,
  SequentialIdGenerator,
} = require("../dist/index.js")

const nowMs = Date.parse("2026-05-23T10:00:00.000Z")

const store = new InMemoryPlatformStore()
const service = new AuthenticationService({
  store,
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

const signIn = service.signInWithWikimediaProfile(
  {
    sub: "wikimedia-user-1",
    username: "Ada",
    blocked: false,
    groups: ["event-organizer", "event-organizer", "autoconfirmed"],
    editcount: 42,
  },
  nowMs,
)

assert.equal(signIn.status, "signed_in")
assert.equal(signIn.user.username, "Ada")
assert.equal(signIn.identity.providerSubject, "wikimedia-user-1")
assert.deepEqual(signIn.roleKeys, ["space:event-organizer"])
assert.equal(signIn.sessionCookie.name, "aedventure_session")
assert.equal(signIn.sessionCookie.httpOnly, true)

const worldToken = service.issueWorldToken(signIn.session.id, {
  permissions: ["room:lobby:enter", "zone:staff-room:enter"],
  roles: signIn.roleKeys,
  nowMs,
})

assert.equal(worldToken.claims.sub, signIn.user.id)
assert.equal(worldToken.claims.sessionId, signIn.session.id)
assert.ok(worldToken.token.startsWith("unsigned-local."))

const secondSignIn = service.signInWithWikimediaProfile(
  {
    sub: "wikimedia-user-1",
    username: "Ada Lovelace",
    blocked: false,
    groups: [],
  },
  nowMs + 1000,
)

assert.equal(secondSignIn.status, "signed_in")
assert.equal(secondSignIn.user.id, signIn.user.id)
assert.equal(secondSignIn.user.username, "Ada Lovelace")
assert.deepEqual(secondSignIn.identity.groups, [])

const blocked = service.signInWithWikimediaProfile(
  {
    sub: "wikimedia-user-2",
    username: "BlockedUser",
    blocked: true,
    groups: [],
  },
  nowMs,
)

assert.equal(blocked.status, "denied")
assert.equal(blocked.reason, "wikimedia_blocked")

assert.throws(
  () =>
    service.issueWorldToken("missing_session", {
      permissions: [],
      roles: [],
      nowMs,
    }),
  /unknown session/,
)
