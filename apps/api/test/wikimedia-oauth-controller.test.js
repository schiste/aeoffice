const assert = require("assert")
const { WikimediaOAuthClient } = require("@aedventure/auth-wikimedia")
const {
  AuthenticationService,
  DEFAULT_AUTHENTICATION_POLICY,
  InMemoryOAuthStateStore,
  InMemoryPlatformStore,
  JsonTokenSigner,
  SequentialIdGenerator,
  SequentialOAuthStateGenerator,
  WikimediaOAuthController,
} = require("../dist/index.js")

const nowMs = Date.parse("2026-05-23T10:00:00.000Z")

class RecordingHttpClient {
  constructor({ tokenResponse, profileResponse }) {
    this.tokenResponse = tokenResponse
    this.profileResponse = profileResponse
    this.posts = []
    this.gets = []
  }

  async postForm(url, body, headers) {
    this.posts.push({ url, body, headers })
    return this.tokenResponse
  }

  async getJson(url, headers) {
    this.gets.push({ url, headers })
    return this.profileResponse
  }
}

async function main() {
  const http = new RecordingHttpClient({
    tokenResponse: {
      access_token: "access-123",
      refresh_token: "refresh-123",
      token_type: "Bearer",
    },
    profileResponse: {
      sub: "wikimedia-user-1",
      username: "Ada",
      blocked: false,
      groups: ["event-organizer"],
    },
  })
  const oauth = new WikimediaOAuthClient(
    {
      clientId: "client-1",
      clientSecret: "secret-1",
      redirectUri: "https://app.example.test/oauth/wikimedia/callback",
      endpoints: {
        tokenUrl: "https://meta.example.test/oauth2/access_token",
        profileUrl: "https://meta.example.test/oauth2/resource/profile",
      },
    },
    http,
  )
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
  const controller = new WikimediaOAuthController({
    oauth,
    auth,
    stateStore: new InMemoryOAuthStateStore(),
    stateGenerator: new SequentialOAuthStateGenerator(),
    stateTtlMs: 1000 * 60 * 10,
  })

  const begin = await controller.beginSignIn({
    nowMs,
    redirectAfterSignIn: "/office",
    codeChallenge: "challenge-123",
    codeVerifier: "verifier-123",
  })

  assert.equal(begin.status, 302)
  assert.equal(begin.body.provider, "wikimedia")
  assert.equal(begin.body.expiresAt, "2026-05-23T10:10:00.000Z")
  assert.ok(begin.headers.location.includes("state=oauth_state_1"))
  assert.ok(begin.headers.location.includes("code_challenge=challenge-123"))

  const invalidRedirect = await controller.beginSignIn({
    nowMs,
    redirectAfterSignIn: "https://evil.example.test/office",
  })

  assert.equal(invalidRedirect.status, 400)
  assert.equal(
    invalidRedirect.body.error,
    "redirect_after_sign_in_invalid",
  )

  const complete = await controller.completeSignIn({
    code: "code-123",
    state: "oauth_state_1",
    nowMs: nowMs + 1000,
  })

  assert.equal(complete.status, 200)
  assert.equal(complete.body.username, "Ada")
  assert.equal(complete.body.redirectAfterSignIn, "/office")
  assert.deepEqual(complete.body.roles, ["space:event-organizer"])
  assert.ok(complete.headers["set-cookie"].includes("HttpOnly"))
  assert.equal(http.posts[0].body.get("code_verifier"), "verifier-123")
  assert.equal(http.gets[0].headers.authorization, "Bearer access-123")

  const replay = await controller.completeSignIn({
    code: "code-123",
    state: "oauth_state_1",
    nowMs: nowMs + 2000,
  })

  assert.equal(replay.status, 400)
  assert.equal(replay.body.error, "oauth_state_invalid")

  const missingState = await controller.completeSignIn({
    code: "code-123",
    nowMs,
  })

  assert.equal(missingState.status, 400)
  assert.equal(missingState.body.error, "oauth_state_missing")

  const expiredController = new WikimediaOAuthController({
    oauth,
    auth,
    stateStore: new InMemoryOAuthStateStore(),
    stateGenerator: new SequentialOAuthStateGenerator(),
    stateTtlMs: 1,
  })

  await expiredController.beginSignIn({ nowMs })
  const expired = await expiredController.completeSignIn({
    code: "code-123",
    state: "oauth_state_1",
    nowMs: nowMs + 2,
  })

  assert.equal(expired.status, 400)
  assert.equal(expired.body.error, "oauth_state_invalid")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
