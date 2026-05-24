const assert = require("assert")
const {
  apiRuntimeConfigFromEnv,
  createApiFetchHandler,
  createApiRuntimeFromConfig,
} = require("../dist/index.js")

const nowMs = Date.parse("2026-05-23T10:00:00.000Z")

async function main() {
  const runtime = createApiRuntimeFromConfig({
    config: apiRuntimeConfigFromEnv({
      WIKIMEDIA_OAUTH_CLIENT_ID: "client-1",
      WIKIMEDIA_OAUTH_REDIRECT_URI:
        "https://office.example.test/auth/wikimedia/callback",
      AEDVENTURE_SESSION_COOKIE_NAME: "office_session",
      AEDVENTURE_DEFAULT_ROLE_KEYS: "space:member",
      AEDVENTURE_DEFAULT_PERMISSION_KEYS: "room:lobby:enter",
    }),
    clock: {
      nowMs: () => nowMs,
    },
    fetch: async (_url, request) => {
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
  const handle = createApiFetchHandler(runtime)

  const start = await handle(
    new Request(
      "https://api.example.test/auth/wikimedia/start?redirect_after_sign_in=/office&code_challenge=challenge-123",
    ),
  )
  const startBody = await start.json()

  assert.equal(start.status, 302)
  assert.equal(startBody.provider, "wikimedia")
  assert.ok(start.headers.get("location").includes("state=oauth_state_1"))

  const callback = await handle(
    new Request(
      "https://api.example.test/auth/wikimedia/callback?state=oauth_state_1&code=code-123",
    ),
  )
  const callbackBody = await callback.json()

  assert.equal(callback.status, 200)
  assert.equal(callbackBody.username, "Ada")
  assert.ok(callback.headers.get("set-cookie").includes("office_session="))

  const token = await handle(
    new Request("https://api.example.test/world-token", {
      method: "POST",
      body: JSON.stringify({
        sessionId: callbackBody.sessionId,
        roomId: "room-lobby",
      }),
    }),
  )
  const tokenBody = await token.json()

  assert.equal(token.status, 200)
  assert.equal(tokenBody.claims.roomId, "room-lobby")
  assert.deepEqual(tokenBody.claims.roles, ["space:member"])
  assert.deepEqual(tokenBody.claims.permissions, ["room:lobby:enter"])

  const missing = await handle(new Request("https://api.example.test/missing"))
  const missingBody = await missing.json()

  assert.equal(missing.status, 404)
  assert.equal(missingBody.error, "not_found")

  const badJson = await handle(
    new Request("https://api.example.test/world-token", {
      method: "POST",
      body: "{",
    }),
  )
  const badJsonBody = await badJson.json()

  assert.equal(badJson.status, 400)
  assert.equal(badJsonBody.error, "bad_request")
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
