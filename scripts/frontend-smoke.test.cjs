const assert = require("node:assert")
const { chromium } = require("playwright")
const { PNG } = require("pngjs")
const { startDevelopmentServer } = require("./dev-http-host.cjs")

const SMOKE_MESSAGE = "Frontend smoke chat"

async function main() {
  const { server, url } = await startDevelopmentServer({
    hostname: "127.0.0.1",
    port: 0,
    env: {
      AEDVENTURE_DEFAULT_ROLE_KEYS: "space:member",
      AEDVENTURE_DEFAULT_PERMISSION_KEYS: [
        "room:lobby:enter",
        "chat:room:send",
        "chat:room:receive",
        "media:zone:join",
        "media:zone:publish",
        "media:zone:subscribe",
      ].join(","),
    },
  })

  let browser
  const consoleErrors = []

  try {
    browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text())
      }
    })
    page.on("pageerror", (error) => {
      consoleErrors.push(error.message)
    })

    await page.goto(`${url}/app`, { waitUntil: "domcontentloaded" })
    await waitForTextState(page, (state) => state.map?.activeMapId === "lobby")
    assert.equal(
      await page.evaluate(() => typeof window.render_game_to_text),
      "function",
    )
    const generatedMapButton = page.locator('[data-map-id="generated"]')
    assert.equal(await generatedMapButton.isDisabled(), true)

    await page.locator('[data-prompt-example*="large 12-person"]').click()
    assert.match(await page.locator("#map-prompt").inputValue(), /12-person/)
    await page.locator("#generate-map").click()
    const generated = await waitForTextState(
      page,
      (state) =>
        state.map?.activeMapId === "generated" &&
        state.map.generatedAvailable === true &&
        state.map.validation?.valid === true &&
        /entry spots are clear/.test(state.map.validationSummary ?? ""),
    )
    assert.equal(
      generated.map.availableMaps.find((map) => map.id === "generated").disabled,
      false,
    )
    assert.equal(await generatedMapButton.isDisabled(), false)

    await page.locator('[data-map-id="meeting_room"]').click()
    await waitForTextState(
      page,
      (state) =>
        state.map?.activeMapId === "meeting_room" &&
        state.lifecycle?.phase === "empty" &&
        state.map.generatedAvailable === true &&
        state.map.generatedPreviewStatus === "Generated room saved",
    )
    await assertNonBlankMapScreenshot(page)

    await page.locator("#start").click()
    const joined = await waitForTextState(
      page,
      (state) =>
        state.joined === true &&
        state.players.length >= 2 &&
        state.controls.joinLabel === "In office",
    )
    assert.equal(joined.lifecycle.phase, "joined")

    const beforeMove = joined.player
    await page.keyboard.press("ArrowDown")
    await waitForTextState(
      page,
      (state) =>
        state.player.x !== beforeMove.x ||
        state.player.y !== beforeMove.y ||
        state.movement.lastRejectedReason,
    )

    await page.locator("#chat-body").fill(SMOKE_MESSAGE)
    await page.locator("#chat-form").evaluate((form) => {
      form.requestSubmit()
    })
    await waitForTextState(page, (state) =>
      state.chat.messages.some((message) => message.body === SMOKE_MESSAGE),
    )

    await page.locator("#join-meeting").click()
    const media = await waitForTextState(
      page,
      (state) =>
        state.media.tokenIssued === true &&
        state.media.room === "zone:room-lobby:meeting-zone",
    )
    assert.equal(media.media.canPublish, true)
    assert.equal(media.media.canSubscribe, true)

    await page.locator("#reset").click()
    const reset = await waitForTextState(
      page,
      (state) =>
        state.joined === false &&
        state.lifecycle.phase === "empty" &&
        state.controls.resetDisabled === true,
    )
    assert.deepEqual(reset.snapshotPlayerIds, [])
    assert.equal(reset.chat.messages.length, 0)

    await page.locator("#start").click()
    const rejoined = await waitForTextState(
      page,
      (state) =>
        state.joined === true &&
        state.players.length >= 2 &&
        state.controls.joinLabel === "In office",
    )
    assert.equal(rejoined.lifecycle.phase, "joined")

    assert.deepEqual(consoleErrors, [])
  } finally {
    if (browser) {
      await browser.close()
    }
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}

async function waitForTextState(page, predicate, timeoutMs = 7000) {
  const startedAt = Date.now()
  let latest

  while (Date.now() - startedAt < timeoutMs) {
    latest = await renderGameToText(page)
    if (predicate(latest)) return latest
    await page.waitForTimeout(100)
  }

  assert.fail(
    `Timed out waiting for frontend smoke state. Latest state:\n${JSON.stringify(
      latest,
      null,
      2,
    )}`,
  )
}

async function renderGameToText(page) {
  return page.evaluate(() => {
    if (typeof window.render_game_to_text !== "function") {
      throw new Error("Missing window.render_game_to_text.")
    }

    return JSON.parse(window.render_game_to_text())
  })
}

async function assertNonBlankMapScreenshot(page) {
  const screenshot = await page.locator("#map").screenshot()
  const image = PNG.sync.read(screenshot)
  const stride = Math.max(4, Math.floor((image.width * image.height) / 20000) * 4)
  const colors = new Set()
  let minLuma = 255
  let maxLuma = 0
  let opaqueSamples = 0

  for (let offset = 0; offset < image.data.length; offset += stride) {
    const red = image.data[offset]
    const green = image.data[offset + 1]
    const blue = image.data[offset + 2]
    const alpha = image.data[offset + 3]

    if (alpha < 16) continue

    opaqueSamples += 1
    minLuma = Math.min(minLuma, red, green, blue)
    maxLuma = Math.max(maxLuma, red, green, blue)

    if (colors.size < 64) {
      colors.add(`${red >> 4}:${green >> 4}:${blue >> 4}`)
    }
  }

  assert.ok(image.width >= 300, `Expected map screenshot width, got ${image.width}.`)
  assert.ok(image.height >= 250, `Expected map screenshot height, got ${image.height}.`)
  assert.ok(opaqueSamples > 500, "Expected enough opaque map screenshot samples.")
  assert.ok(colors.size >= 4, `Expected nonblank map colors, got ${colors.size}.`)
  assert.ok(
    maxLuma - minLuma >= 24,
    `Expected visible map contrast, got ${maxLuma - minLuma}.`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
