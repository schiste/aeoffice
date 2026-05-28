const assert = require("node:assert")
const fs = require("node:fs")
const http = require("node:http")
const path = require("node:path")
const { chromium } = require("playwright")
const { PNG } = require("pngjs")

const ROOT_DIR = path.resolve(__dirname, "..")
const DIST_DIR = path.join(ROOT_DIR, "apps/rpg-idle-demo/dist-app")
const SCREENSHOT_PATH = path.join(ROOT_DIR, "tmp/rpg-idle-demo-smoke.png")

async function main() {
  const { server, url } = await startStaticServer(DIST_DIR)
  let browser
  const consoleErrors = []

  try {
    browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 1180, height: 760 } })
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text())
    })
    page.on("pageerror", (error) => {
      consoleErrors.push(error.stack || error.message)
    })

    await page.goto(`${url}/app`, { waitUntil: "domcontentloaded" })
    const initial = await waitForTextState(
      page,
      (state) =>
        state.app === "rpg-idle-demo" &&
        state.map?.rendererValidationValid === true &&
        state.assets?.catalogValid === true &&
        state.renderer?.performance?.mapRenderCount >= 1 &&
        state.renderer?.performance?.objectCount > 0 &&
        state.action?.available === true,
      consoleErrors,
    )

    assert.deepEqual(initial.engineBoundary.uses, [
      "@aedventure/game-assets",
      "@aedventure/game-map",
      "@aedventure/game-input",
      "@aedventure/game-renderer-phaser",
    ])
    assert.equal(initial.engineBoundary.importsOfficeDomain, false)
    assert.equal(initial.entities.length, 3)
    assert.equal(initial.resources.wood, 0)
    assert.equal(initial.hero.activeZoneIds.includes("zone.grove"), true)
    assert.equal(initial.tests.rendererPreflightValid, true)
    writeDebugState("initial", initial)

    await page.locator("#gather-action").click()
    const gathered = await waitForTextState(
      page,
      (state) =>
        state.resources?.wood === 1 &&
        state.action?.gatherCount === 1 &&
        /gathered wood/i.test(state.action?.lastAction ?? ""),
      consoleErrors,
    )
    assert.equal(gathered.action.available, true)

    const beforeMove = gathered.hero
    await page.keyboard.down("ArrowRight")
    await page.waitForTimeout(260)
    await page.keyboard.up("ArrowRight")
    const moved = await waitForTextState(
      page,
      (state) =>
        state.hero?.x > beforeMove.x + 8 &&
        state.movement?.last?.requestedVector?.x > 0,
      consoleErrors,
    )
    assert.equal(moved.hero.direction, "right")
    assert.ok(moved.input.heldDirectionCount === 0 || moved.hero.x > beforeMove.x)

    await page.locator("#run-toggle").click()
    const running = await waitForTextState(
      page,
      (state) => state.input?.runToggled === true && state.hero?.movementMode === "run",
      consoleErrors,
    )
    assert.equal(running.hero.movementMode, "run")

    await page.locator("#reset-demo").click()
    const reset = await waitForTextState(
      page,
      (state) =>
        state.resources?.wood === 0 &&
        state.action?.gatherCount === 0 &&
        state.input?.runToggled === false &&
        Math.abs(state.hero?.x - initial.hero.x) < 0.1 &&
        Math.abs(state.hero?.y - initial.hero.y) < 0.1,
      consoleErrors,
    )
    assert.equal(reset.action.available, true)
    writeDebugState("reset", reset)

    await assertNonBlankWorldScreenshot(page)

    assert.deepEqual(consoleErrors, [])
  } finally {
    if (browser) await browser.close()
    await new Promise((resolve) => server.close(resolve))
  }
}

function writeDebugState(name, state) {
  if (process.env.DEBUG_RPG_SMOKE !== "1") return

  fs.mkdirSync(path.join(ROOT_DIR, "tmp"), { recursive: true })
  fs.writeFileSync(
    path.join(ROOT_DIR, `tmp/rpg-idle-demo-${name}.json`),
    JSON.stringify(state, null, 2),
  )
}

async function waitForTextState(
  page,
  predicate,
  consoleErrors = [],
  timeoutMs = 8000,
) {
  const startedAt = Date.now()
  let lastState
  let lastError

  while (Date.now() - startedAt < timeoutMs) {
    try {
      lastState = await renderGameToText(page)
      if (predicate(lastState)) return lastState
    } catch (error) {
      lastError = error
    }
    await page.waitForTimeout(100)
  }

  throw new Error(
    `Timed out waiting for RPG idle demo state. Last state: ${JSON.stringify(
      lastState,
    )}. Console errors: ${JSON.stringify(consoleErrors)}. Last error: ${
      lastError?.message ?? "none"
    }`,
  )
}

async function renderGameToText(page) {
  const text = await page.evaluate(() => {
    if (typeof window.render_game_to_text !== "function") {
      throw new Error("render_game_to_text is not installed")
    }
    return window.render_game_to_text()
  })
  return JSON.parse(text)
}

async function assertNonBlankWorldScreenshot(page) {
  fs.mkdirSync(path.dirname(SCREENSHOT_PATH), { recursive: true })
  await page.evaluate(() => {
    const canvas = document.querySelector("#world canvas")
    if (canvas instanceof HTMLCanvasElement) {
      canvas.style.transition = "none"
    }
  })
  await page.locator("#world canvas").screenshot({ path: SCREENSHOT_PATH })
  const png = PNG.sync.read(fs.readFileSync(SCREENSHOT_PATH))
  const colors = new Set()
  let opaquePixels = 0

  for (let index = 0; index < png.data.length; index += 4) {
    const alpha = png.data[index + 3]
    if (alpha < 20) continue
    opaquePixels += 1
    colors.add(
      `${png.data[index]},${png.data[index + 1]},${png.data[index + 2]},${alpha}`,
    )
    if (colors.size > 48 && opaquePixels > 4000) return
  }

  assert.fail(
    `Expected nonblank RPG world screenshot, got ${colors.size} colors and ${opaquePixels} opaque pixels.`,
  )
}

async function startStaticServer(directory) {
  assert.ok(
    fs.existsSync(path.join(directory, "index.html")),
    `Missing RPG idle demo build output at ${directory}. Run npm --workspace @aedventure/rpg-idle-demo run build:browser first.`,
  )

  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1")
    const relativePath = staticPathFor(url.pathname)
    if (!relativePath) {
      response.writeHead(404)
      response.end("Not found")
      return
    }

    const filePath = path.join(directory, relativePath)
    if (!filePath.startsWith(directory) || !fs.existsSync(filePath)) {
      response.writeHead(404)
      response.end("Not found")
      return
    }

    response.writeHead(200, {
      "content-type": contentTypeFor(filePath),
      "cache-control": "no-store",
    })
    fs.createReadStream(filePath).pipe(response)
  })

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve)
  })
  const address = server.address()
  assert.equal(typeof address, "object")
  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
  }
}

function staticPathFor(pathname) {
  if (pathname === "/app" || pathname === "/app/") return "index.html"
  if (!pathname.startsWith("/app/")) return undefined
  const relativePath = decodeURIComponent(pathname.slice("/app/".length))
  return relativePath || "index.html"
}

function contentTypeFor(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8"
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8"
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8"
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8"
  if (filePath.endsWith(".svg")) return "image/svg+xml"
  return "application/octet-stream"
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
