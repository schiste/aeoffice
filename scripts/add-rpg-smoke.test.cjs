const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")
const { chromium } = require("playwright")
const { assertNonBlankImageBuffer } = require("./app-qa-contracts.cjs")
const { startStaticAppServer } = require("./app-qa-server.cjs")

const ROOT_DIR = path.resolve(__dirname, "..")
const DIST_DIR = path.join(ROOT_DIR, "apps/add-rpg/dist-app")
const SCREENSHOT_PATH = path.join(ROOT_DIR, "tmp/add-rpg-smoke.png")

async function main() {
  const { server, url } = await startStaticAppServer({
    directory: DIST_DIR,
    basePath: "/app",
  })
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
        state.app === "add-rpg" &&
        state.runtime?.workerBoundary === "ui-worker-rust-wasm-snapshot" &&
        state.runtime?.ready === true &&
        state.runtime?.snapshotReceived === true &&
        state.runtime?.catalogReceived === true &&
        state.shell?.framework === "solid" &&
        state.shell?.hostsPhaserMap === true &&
        state.map?.hostedBy === "phaser" &&
        state.map?.ready === true &&
        state.map?.validationValid === true &&
        state.snapshot?.hexCount > 0 &&
        state.map?.cells?.total === state.snapshot.hexCount &&
        state.map?.cells?.bubbleEdge > 0 &&
        state.map?.cells?.stabilized > 0 &&
        state.map?.landmarks?.studioLabelVisible === true &&
        state.map?.landmarks?.survivorCaveVisible === true &&
        state.map?.authority?.rules === "rust_wasm_snapshot" &&
        state.map?.authority?.mutatesSimulation === false &&
        state.catalog?.resourceCount > 0 &&
        state.catalog?.tileCount > 0,
      consoleErrors,
    )

    assert.equal(initial.boundary.runtimeAuthority, "rust-wasm")
    assert.equal(initial.boundary.firstTargetApp, "apps/add-rpg")
    assert.equal(initial.runtime.error, null)
    assert.ok(initial.ui.resourceCount > 0)
    assert.ok(initial.catalog.worldActionCount > 0)

    const interacted = await interactWithMap(page, consoleErrors)
    assert.ok(interacted.map.interaction.selectedHex)
    assert.ok(interacted.map.interaction.selectedLabel)

    await page.locator("#tick-runtime").click()
    const ticked = await waitForTextState(
      page,
      (state) => state.snapshot?.clockSeconds > initial.snapshot.clockSeconds,
      consoleErrors,
    )
    assert.ok(ticked.snapshot.clockSeconds > initial.snapshot.clockSeconds)

    await page.locator("#assign-hero").click()
    const toggled = await waitForTextState(
      page,
      (state) => state.snapshot?.heroAssigned !== ticked.snapshot.heroAssigned,
      consoleErrors,
    )
    assert.notEqual(toggled.snapshot.heroAssigned, ticked.snapshot.heroAssigned)
    assert.ok(toggled.ui.enabledWorldActionIds.length > 0)

    await page.evaluate(() => window.advanceTime?.(1500))
    const advanced = await waitForTextState(
      page,
      (state) => state.snapshot?.clockSeconds > toggled.snapshot.clockSeconds,
      consoleErrors,
    )
    assert.ok(advanced.snapshot.clockSeconds > toggled.snapshot.clockSeconds)

    await assertNonBlankAppScreenshot(page)
    await assertNonBlankMapScreenshot(page)
    assert.deepEqual(consoleErrors, [])
  } finally {
    if (browser) await browser.close()
    await new Promise((resolve) => server.close(resolve))
  }
}

async function interactWithMap(page, consoleErrors) {
  const canvas = page.locator("#add-world canvas")
  await canvas.waitFor({ state: "visible" })
  const box = await canvas.boundingBox()
  assert.ok(box, "ADD RPG Phaser canvas should have a browser box")
  const center = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  }

  await page.mouse.move(center.x, center.y)
  await waitForTextState(
    page,
    (state) => state.map?.interaction?.hoveredHex !== null,
    consoleErrors,
  )
  await page.mouse.click(center.x, center.y)
  const selected = await waitForTextState(
    page,
    (state) => state.map?.interaction?.selectedHex !== null,
    consoleErrors,
  )

  const zoomBefore = selected.map.camera.zoom
  for (let index = 0; index < 5; index += 1) {
    await page.locator("#map-zoom-in").click()
  }
  const zoomed = await waitForTextState(
    page,
    (state) => state.map?.camera?.zoom > zoomBefore + 0.35,
    consoleErrors,
  )
  const cameraBefore = zoomed.map.camera

  await page.mouse.move(center.x, center.y)
  await page.mouse.down()
  await page.mouse.move(center.x - 90, center.y - 54, { steps: 5 })
  await page.mouse.up()

  const panned = await waitForTextState(
    page,
    (state) =>
      Math.abs((state.map?.camera?.scrollX ?? 0) - cameraBefore.scrollX) > 0.5 ||
      Math.abs((state.map?.camera?.scrollY ?? 0) - cameraBefore.scrollY) > 0.5,
    consoleErrors,
  )

  await page.locator("#map-reset-camera").click()
  await waitForTextState(
    page,
    (state) =>
      Math.abs((state.map?.camera?.scrollX ?? 0) - panned.map.camera.scrollX) > 0.5 ||
      Math.abs((state.map?.camera?.scrollY ?? 0) - panned.map.camera.scrollY) > 0.5,
    consoleErrors,
  )

  return panned
}

async function assertNonBlankMapScreenshot(page) {
  fs.mkdirSync(path.dirname(SCREENSHOT_PATH), { recursive: true })
  const mapPath = path.join(ROOT_DIR, "tmp/add-rpg-map-smoke.png")
  await page.locator("#add-world canvas").screenshot({ path: mapPath })
  assertNonBlankImageBuffer(
    fs.readFileSync(mapPath),
    "ADD RPG Phaser map screenshot",
    {
      minWidth: 300,
      minHeight: 220,
      minOpaqueSamples: 500,
      minUniqueColors: 8,
      minLuminanceRange: 20,
    },
  )
}

async function waitForTextState(page, predicate, consoleErrors = [], timeoutMs = 12000) {
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
    `Timed out waiting for ADD RPG state. Last state: ${JSON.stringify(
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

async function assertNonBlankAppScreenshot(page) {
  fs.mkdirSync(path.dirname(SCREENSHOT_PATH), { recursive: true })
  await page.locator("#app").screenshot({ path: SCREENSHOT_PATH })
  assertNonBlankImageBuffer(
    fs.readFileSync(SCREENSHOT_PATH),
    "ADD RPG runtime app screenshot",
    {
      minWidth: 300,
      minHeight: 220,
      minOpaqueSamples: 500,
      minUniqueColors: 8,
      minLuminanceRange: 24,
    },
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
