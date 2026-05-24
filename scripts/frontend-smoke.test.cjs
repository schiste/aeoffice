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
    const initial = await waitForTextState(
      page,
      (state) =>
        state.map?.activeMapId === "lobby" &&
        state.lifecycle?.rendererReadiness === "ready" &&
        state.lifecycle?.stageOverlay?.state === "empty",
    )
    assert.equal(initial.lifecycle.stageOverlay.hidden, false)
    assert.doesNotMatch(initial.lifecycle.publicMessage, /unknown_client|HTTP/i)
    assertRenderStateContract(initial)
    assert.equal(
      await page.evaluate(() => typeof window.render_game_to_text),
      "function",
    )
    await assertMapSwitcherVisible(page)
    const generatedMapButton = page.locator('[data-map-id="generated"]')
    assert.equal(await generatedMapButton.isDisabled(), true)
    await assertMobileCollapsedControls(browser, url)

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
    const meetingRoom = await waitForTextState(
      page,
      (state) =>
        state.map?.activeMapId === "meeting_room" &&
        state.lifecycle?.phase === "empty" &&
        state.lifecycle?.stageOverlay?.state === "empty" &&
        state.map.generatedAvailable === true &&
        state.map.generatedPreviewStatus === "Generated room saved",
    )
    assert.equal(meetingRoom.lifecycle.stageOverlay.hidden, false)
    await assertNonBlankMapScreenshot(page)
    await assertMeetingControls(page, {
      panelState: "outside",
      joinEnabled: false,
      leaveEnabled: false,
    })

    await page.locator("#start").click()
    const joined = await waitForTextState(
      page,
      (state) =>
        state.joined === true &&
        state.players.length >= 2 &&
        state.controls.joinLabel === "In office",
    )
    assert.equal(joined.lifecycle.phase, "joined")
    assert.equal(joined.lifecycle.stageOverlay.hidden, true)
    assert.equal(joined.movement.repeatMs, 190)
    assert.equal(joined.viewport.canZoomIn, true)
    assert.equal(joined.viewport.canZoomOut, true)
    assert.equal(joined.world.joined, true)
    assert.equal(joined.world.playerCount, joined.players.length)
    assert.deepEqual(joined.world.snapshotPlayerIds, joined.snapshotPlayerIds)
    assertRenderStateContract(joined)

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
    await assertChatFormUsable(page)
    await page.locator("#chat-form").evaluate((form) => {
      form.requestSubmit()
    })
    await waitForTextState(
      page,
      (state) =>
        state.chat.messages.some((message) => message.body === SMOKE_MESSAGE) &&
        state.lastChatBody === SMOKE_MESSAGE,
    )
    await assertChatTranscriptContains(page, SMOKE_MESSAGE)

    const meetingReady = await waitForTextState(
      page,
      (state) =>
        state.meeting.activeZoneId === "meeting-zone" &&
        state.meeting.panelState === "available" &&
        state.media.tokenIssued === false &&
        /Available because you are in Meeting Zone/.test(
          state.media.tokenStatus || "",
        ) &&
        state.media.micDisabled === false &&
        state.media.cameraDisabled === false,
    )
    assert.equal(meetingReady.media.panelStatus, "Available in zone")
    await assertMeetingControls(page, {
      panelState: "available",
      joinEnabled: true,
      leaveEnabled: false,
    })

    await page.locator("#toggle-mic").click()
    await page.locator("#toggle-camera").click()
    const devicesReady = await waitForTextState(
      page,
      (state) =>
        state.media.tokenIssued === false &&
        state.media.mic === "on" &&
        state.media.camera === "on" &&
        state.media.previewStatus === "Camera ready",
    )
    assert.equal(devicesReady.media.micLabel, "Mic ready")
    assert.equal(devicesReady.media.cameraLabel, "Camera ready")

    const abortMediaToken = (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "temporarily_unavailable",
        }),
      })
    await page.route("**/media/media-token", abortMediaToken)
    await page.locator("#join-meeting").click()
    const unavailableMedia = await waitForTextState(
      page,
      (state) =>
        state.media.panelStatus === "Unavailable" &&
        state.media.tokenIssued === false &&
        state.media.unavailableMessage ===
          "Call media is unavailable. You can keep using the room.",
    )
    assert.match(
      unavailableMedia.media.unavailableDetail ?? "",
      /Invalid media token response/,
    )
    assert.ok(
      unavailableMedia.toasts.every(
        (toast) => !/Failed to fetch|HTTP|unknown_client/i.test(toast ?? ""),
      ),
    )
    await page.unroute("**/media/media-token", abortMediaToken)

    await page.locator("#join-meeting").click()
    const media = await waitForTextState(
      page,
      (state) =>
        state.media.tokenIssued === true &&
        state.media.room === "zone:room-lobby:meeting-zone",
    )
    assert.equal(media.media.canPublish, true)
    assert.equal(media.media.canSubscribe, true)
    assert.equal(media.meeting.panelState, "joined")
    assert.equal(media.media.mic, "off")
    assert.equal(media.media.camera, "off")
    assertRenderStateContract(media)
    await assertMeetingControls(page, {
      panelState: "joined",
      joinEnabled: false,
      leaveEnabled: true,
    })

    await page.locator("#toggle-mic").click()
    await page.locator("#toggle-camera").click()
    await waitForTextState(
      page,
      (state) =>
        state.media.tokenIssued === true &&
        state.media.mic === "on" &&
        state.media.camera === "on" &&
        state.media.previewStatus === "Camera on",
    )

    await page.locator("#reset").click()
    const reset = await waitForTextState(
      page,
      (state) =>
        state.joined === false &&
        state.lifecycle.phase === "empty" &&
        state.lifecycle.stageOverlay?.state === "empty" &&
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
    assert.equal(rejoined.lifecycle.stageOverlay.hidden, true)

    await page.evaluate(async (state) => {
      await fetch("/dev/world-geometry", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          map: {
            width: state.map.width * state.map.tileSize,
            height: state.map.height * state.map.tileSize,
            tileSize: state.map.tileSize,
            blockedTiles: [],
          },
          zones: [],
        }),
      })
    }, rejoined)
    await page.keyboard.press("ArrowRight")
    const recovery = await waitForTextState(
      page,
      (state) =>
        state.lifecycle.phase === "recovering" &&
        state.lifecycle.stageOverlay?.state === "recovery" &&
        state.controls.joinLabel === "Rejoin office",
    )
    assert.equal(recovery.lifecycle.lastRecoveryReason, "unknown_client")
    assert.doesNotMatch(recovery.lifecycle.publicMessage, /unknown_client|HTTP/i)
    assert.doesNotMatch(recovery.lifecycle.stageOverlay.title, /unknown_client|HTTP/i)

    await page.locator("#start").click()
    const recovered = await waitForTextState(
      page,
      (state) =>
        state.joined === true &&
        state.lifecycle.phase === "joined" &&
        state.controls.joinLabel === "In office",
    )
    assert.equal(recovered.lifecycle.stageOverlay.hidden, true)
    assertRenderStateContract(recovered)

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

function assertRenderStateContract(state) {
  assert.equal(typeof state.layout?.mode, "string")
  assert.ok(
    Array.isArray(state.layout?.collapsibleSections),
    "Expected layout.collapsibleSections in render_game_to_text.",
  )
  assert.equal(typeof state.world?.status, "string")
  assert.equal(typeof state.world?.joined, "boolean")
  assert.equal(typeof state.world?.playerCount, "number")
  assert.ok(
    Array.isArray(state.world?.snapshotPlayerIds),
    "Expected world.snapshotPlayerIds in render_game_to_text.",
  )
  assert.equal(typeof state.media?.panelStatus, "string")
  assert.equal(typeof state.media?.tokenIssued, "boolean")
  assert.equal(typeof state.meeting?.panelState, "string")
  assert.equal(typeof state.map?.renderer, "string")
}

async function assertMapSwitcherVisible(page) {
  const expectedMaps = [
    ["lobby", "Lobby"],
    ["meeting_room", "Meeting room"],
    ["lounge_cafe", "Lounge/café"],
    ["generated", "Generated room"],
  ]

  for (const [mapId, label] of expectedMaps) {
    const button = page.locator(`[data-map-id="${mapId}"]`)
    await expectVisible(button, `Expected ${label} map switcher to be visible.`)
  }
}

async function assertChatFormUsable(page) {
  await expectVisible(page.locator("#chat-form"), "Expected chat form to be visible.")
  await expectVisible(page.locator("#chat-body"), "Expected chat input to be visible.")
  await expectVisible(
    page.locator('#chat-form button[type="submit"]'),
    "Expected chat send button to be visible.",
  )
  assert.equal(await page.locator("#chat-body").isDisabled(), false)
  assert.equal(await page.locator('#chat-form button[type="submit"]').isDisabled(), false)
}

async function assertChatTranscriptContains(page, body) {
  const matchingMessages = page.locator("#chat-messages li", {
    hasText: body,
  })

  await matchingMessages.first().waitFor({ state: "visible", timeout: 3000 })
  assert.ok(
    (await matchingMessages.count()) >= 1,
    `Expected chat transcript to include "${body}".`,
  )
}

async function assertMeetingControls(page, expected) {
  const state = await renderGameToText(page)
  const join = page.locator("#join-meeting")
  const leave = page.locator("#leave-meeting")

  assert.equal(state.meeting.panelState, expected.panelState)
  await expectVisible(join, "Expected Join call control to be visible.")
  await expectVisible(leave, "Expected Leave call control to be visible.")
  assert.equal(await join.isDisabled(), !expected.joinEnabled)
  assert.equal(await leave.isDisabled(), !expected.leaveEnabled)
  assert.equal(state.meeting.joinDisabled, !expected.joinEnabled)
  assert.equal(state.meeting.leaveDisabled, !expected.leaveEnabled)
}

async function assertMobileCollapsedControls(browser, url) {
  const mobilePage = await browser.newPage({
    viewport: {
      width: 390,
      height: 760,
    },
  })

  try {
    await mobilePage.goto(`${url}/app`, { waitUntil: "domcontentloaded" })
    const mobile = await waitForTextState(
      mobilePage,
      (state) =>
        state.map?.activeMapId === "lobby" &&
        state.lifecycle?.rendererReadiness === "ready" &&
        state.layout?.mode === "mobile",
    )

    assertRenderStateContract(mobile)
    assert.deepEqual(
      mobile.layout.collapsibleSections.map((section) => ({
        label: section.label,
        open: section.open,
      })),
      [
        { label: "Call", open: false },
        { label: "Move", open: false },
        { label: "Chat", open: false },
      ],
    )
    await expectVisible(
      mobilePage.locator("details.call-tool summary"),
      "Expected collapsed Call control handle on mobile.",
    )
    await expectVisible(
      mobilePage.locator("details.chat-tool summary"),
      "Expected collapsed Chat control handle on mobile.",
    )
    await expectVisible(
      mobilePage.locator("details.compact-tool summary"),
      "Expected collapsed Move control handle on mobile.",
    )
    assert.equal(await mobilePage.locator("#join-meeting").isVisible(), false)
    assert.equal(await mobilePage.locator("#chat-form").isVisible(), false)
    await assertNonBlankMapScreenshot(mobilePage)
  } finally {
    await mobilePage.close()
  }
}

async function expectVisible(locator, message) {
  assert.equal(await locator.isVisible(), true, message)
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
