const assert = require("assert")
const {
  WikimediaOAuthClient,
  buildWikimediaAuthorizationUrl,
  parseWikimediaOAuthProfile,
  validateWikimediaOAuthCallback,
} = require("../dist/index.js")

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
  const authorizationUrl = buildWikimediaAuthorizationUrl(
    {
      clientId: "client-1",
      redirectUri: "https://app.example.test/oauth/wikimedia/callback",
      scopes: ["basic", "editpage"],
    },
    {
      state: "state-123",
      codeChallenge: "challenge-abc",
    },
  )
  const authorization = new URL(authorizationUrl)

  assert.equal(
    authorization.origin + authorization.pathname,
    "https://meta.wikimedia.org/w/rest.php/oauth2/authorize",
  )
  assert.equal(authorization.searchParams.get("client_id"), "client-1")
  assert.equal(authorization.searchParams.get("response_type"), "code")
  assert.equal(authorization.searchParams.get("state"), "state-123")
  assert.equal(
    authorization.searchParams.get("redirect_uri"),
    "https://app.example.test/oauth/wikimedia/callback",
  )
  assert.equal(authorization.searchParams.get("scope"), "basic editpage")
  assert.equal(authorization.searchParams.get("code_challenge"), "challenge-abc")
  assert.equal(authorization.searchParams.get("code_challenge_method"), "S256")

  assert.equal(
    validateWikimediaOAuthCallback({
      code: "code-123",
      state: "state-123",
      expectedState: "state-123",
    }),
    "code-123",
  )
  assert.throws(
    () =>
      validateWikimediaOAuthCallback({
        code: "code-123",
        state: "wrong",
        expectedState: "state-123",
      }),
    /state mismatch/,
  )
  assert.throws(
    () =>
      validateWikimediaOAuthCallback({
        error: "access_denied",
        state: "state-123",
        expectedState: "state-123",
      }),
    /access_denied/,
  )

  const http = new RecordingHttpClient({
    tokenResponse: {
      access_token: "access-123",
      refresh_token: "refresh-123",
      token_type: "Bearer",
      expires_in: 14400,
      scope: "basic editpage",
    },
    profileResponse: {
      sub: 12345,
      username: "Ada",
      blocked: false,
      groups: ["event-organizer", "event-organizer"],
      registered: "2020-01-01T00:00:00Z",
      editcount: 42,
    },
  })
  const client = new WikimediaOAuthClient(
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

  const result = await client.completeAuthorizationCodeFlow({
    code: "code-123",
    state: "state-123",
    expectedState: "state-123",
    codeVerifier: "verifier-123",
  })

  assert.equal(result.token.accessToken, "access-123")
  assert.equal(result.profile.sub, "12345")
  assert.equal(result.identity.providerSubject, "12345")
  assert.deepEqual(result.identity.groups, ["event-organizer"])
  assert.equal(http.posts[0].url, "https://meta.example.test/oauth2/access_token")
  assert.equal(http.posts[0].headers["content-type"], "application/x-www-form-urlencoded")
  assert.equal(http.posts[0].body.get("grant_type"), "authorization_code")
  assert.equal(http.posts[0].body.get("code"), "code-123")
  assert.equal(http.posts[0].body.get("client_id"), "client-1")
  assert.equal(http.posts[0].body.get("client_secret"), "secret-1")
  assert.equal(
    http.posts[0].body.get("redirect_uri"),
    "https://app.example.test/oauth/wikimedia/callback",
  )
  assert.equal(http.posts[0].body.get("code_verifier"), "verifier-123")
  assert.equal(
    http.gets[0].url,
    "https://meta.example.test/oauth2/resource/profile",
  )
  assert.equal(http.gets[0].headers.authorization, "Bearer access-123")

  const profile = parseWikimediaOAuthProfile({
    sub: "wikimedia-user-2",
    username: "Grace",
    groups: ["sysop", "sysop", ""],
  })

  assert.equal(profile.sub, "wikimedia-user-2")
  assert.deepEqual(profile.groups, ["sysop", "sysop", ""])
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
