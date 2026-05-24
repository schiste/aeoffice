const assert = require("node:assert")
const {
  createNodeRequestHandler,
  createPrefixedFetchHandler,
  writeFetchResponse,
} = require("./dev-http-host.cjs")

async function main() {
  const calls = []
  const handle = createPrefixedFetchHandler([
    {
      prefix: "/api",
      handler: async (request) => {
        calls.push(["api", request.method, new URL(request.url).pathname])
        return jsonResponse(200, { mounted: "api" })
      },
    },
    {
      prefix: "/media",
      handler: async (request) => {
        calls.push(["media", request.method, new URL(request.url).pathname])
        return jsonResponse(200, { mounted: "media" })
      },
    },
  ])

  const api = await handle(
    new Request("http://localhost/api/world-token", {
      method: "POST",
      body: JSON.stringify({ sessionId: "sess_1" }),
    }),
  )
  const media = await handle(
    new Request("http://localhost/media/media-token", {
      method: "POST",
      body: JSON.stringify({ playerId: "player-1" }),
    }),
  )
  const missing = await handle(new Request("http://localhost/unknown"))

  assert.equal(api.status, 200)
  assert.deepEqual(await api.json(), { mounted: "api" })
  assert.equal(media.status, 200)
  assert.deepEqual(await media.json(), { mounted: "media" })
  assert.equal(missing.status, 404)
  assert.deepEqual(calls, [
    ["api", "POST", "/world-token"],
    ["media", "POST", "/media-token"],
  ])

  const fakeOutgoing = new FakeOutgoing()
  await writeFetchResponse(
    fakeOutgoing,
    new Response("accepted", {
      status: 202,
      headers: {
        "x-test": "ok",
      },
    }),
  )

  assert.equal(fakeOutgoing.statusCode, 202)
  assert.equal(fakeOutgoing.headers["x-test"], "ok")
  assert.equal(fakeOutgoing.body, "accepted")

  const nodeHandler = createNodeRequestHandler(
    async (request) =>
      jsonResponse(200, {
        method: request.method,
        path: new URL(request.url).pathname,
      }),
  )
  const nodeOutgoing = new FakeOutgoing()

  await nodeHandler(
    {
      method: "GET",
      url: "/health",
      headers: {
        host: "localhost:8787",
      },
    },
    nodeOutgoing,
  )

  assert.equal(nodeOutgoing.statusCode, 200)
  assert.deepEqual(JSON.parse(nodeOutgoing.body), {
    method: "GET",
    path: "/health",
  })
}

class FakeOutgoing {
  constructor() {
    this.statusCode = 0
    this.headers = {}
    this.body = ""
  }

  setHeader(name, value) {
    this.headers[name] = value
  }

  end(body) {
    this.body = Buffer.from(body).toString("utf8")
  }
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
