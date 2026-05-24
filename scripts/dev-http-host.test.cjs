const assert = require("node:assert")
const {
  createDevelopmentRuntime,
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
    {
      prefix: "/world",
      handler: async (request) => {
        calls.push(["world", request.method, new URL(request.url).pathname])
        return jsonResponse(200, { mounted: "world" })
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
  const world = await handle(
    new Request("http://localhost/world/join", {
      method: "POST",
      body: JSON.stringify({ playerId: "player-1" }),
    }),
  )

  assert.equal(api.status, 200)
  assert.deepEqual(await api.json(), { mounted: "api" })
  assert.equal(media.status, 200)
  assert.deepEqual(await media.json(), { mounted: "media" })
  assert.equal(world.status, 200)
  assert.deepEqual(await world.json(), { mounted: "world" })
  assert.equal(missing.status, 404)
  assert.deepEqual(calls, [
    ["api", "POST", "/world-token"],
    ["media", "POST", "/media-token"],
    ["world", "POST", "/join"],
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

  const runtime = createDevelopmentRuntime()
  const appShell = await runtime.handler(new Request("http://localhost/app"))
  const fixtureMap = await runtime.handler(
    new Request("http://localhost/dev/fixture-map"),
  )
  const devSignIn = await runtime.handler(
    new Request("http://localhost/dev/sign-in", {
      method: "POST",
      body: JSON.stringify({
        subject: "wikimedia-dev-user",
        username: "Dev Ada",
      }),
    }),
  )
  const devSignInBody = await devSignIn.json()

  assert.equal(appShell.status, 200)
  const appShellBody = await appShell.text()
  assert.match(appShellBody, /Aedventure Office/)
  assert.match(appShellBody, /type="module"/)
  assert.equal(appShell.headers.get("content-type"), "text/html; charset=utf-8")
  const appScript = await runtime.handler(
    new Request(`http://localhost${assetPathFromHtml(appShellBody, "src")}`),
  )
  const appStyles = await runtime.handler(
    new Request(`http://localhost${assetPathFromHtml(appShellBody, "href")}`),
  )
  assert.equal(appScript.status, 200)
  const appScriptBody = await appScript.text()
  assert.match(appScriptBody, /render_game_to_text/)
  assert.match(appScriptBody, /\/world\/snapshot/)
  assert.equal(appStyles.status, 200)
  assert.match(await appStyles.text(), /\.phaser-world-host/)
  assert.equal(fixtureMap.status, 200)
  const fixtureMapBody = await fixtureMap.json()
  assert.equal(fixtureMapBody.compiled.width, 16)
  assert.equal(fixtureMapBody.compiled.height, 10)
  assert.equal(fixtureMapBody.compiled.tileSize, 32)
  assert.deepEqual(fixtureMapBody.spawnPoints[0], {
    id: "default",
    position: { x: 64, y: 224 },
  })
  assert.ok(
    fixtureMapBody.catalog.tokens.some(
      (token) => token.id === "item.small_round_table",
    ),
  )
  assert.ok(
    fixtureMapBody.compiled.blockedTiles.some(
      (tile) => tile.x === 6 && tile.y === 4,
    ),
  )
  const worldGeometry = await runtime.handler(
    new Request("http://localhost/dev/world-geometry", {
      method: "POST",
      body: JSON.stringify({
        map: {
          width: fixtureMapBody.compiled.width * fixtureMapBody.compiled.tileSize,
          height: fixtureMapBody.compiled.height * fixtureMapBody.compiled.tileSize,
          tileSize: fixtureMapBody.compiled.tileSize,
          blockedTiles: fixtureMapBody.compiled.blockedTiles,
        },
        zones: fixtureMapBody.compiled.zones.map((zone) => ({
          id: zone.id,
          bounds: {
            x: zone.xStart * fixtureMapBody.compiled.tileSize,
            y: zone.yStart * fixtureMapBody.compiled.tileSize,
            width: (zone.xEnd - zone.xStart) * fixtureMapBody.compiled.tileSize,
            height: (zone.yEnd - zone.yStart) * fixtureMapBody.compiled.tileSize,
          },
        })),
      }),
    }),
  )
  const worldGeometryBody = await worldGeometry.json()
  assert.equal(worldGeometry.status, 200)
  assert.equal(worldGeometryBody.status, "ok")
  assert.equal(
    worldGeometryBody.blockedTileCount,
    fixtureMapBody.compiled.blockedTiles.length,
  )
  assert.equal(worldGeometryBody.zoneCount, fixtureMapBody.compiled.zones.length)
  assert.equal(devSignIn.status, 200)
  assert.equal(devSignInBody.username, "Dev Ada")
  assert.ok(devSignInBody.sessionId)
}

function assetPathFromHtml(html, attribute) {
  const match = html.match(new RegExp(`${attribute}="(/app/assets/[^"]+)"`))
  assert.ok(match, `Expected ${attribute} app asset in HTML.`)
  return match[1]
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
