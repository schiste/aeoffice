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
    assert.equal(meetingRoom.zones.zoneCount, 1)
    assert.equal(meetingRoom.zones.zones[0].availability, "passive")
    assert.equal(meetingRoom.zones.zones[0].markerVisible, false)
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
    assertCameraStateContract(joined)
    assert.equal(joined.world.joined, true)
    assert.equal(joined.world.playerCount, joined.players.length)
    assert.deepEqual(joined.world.snapshotPlayerIds, joined.snapshotPlayerIds)
    assertRenderStateContract(joined)
    assertRendererCapabilities(joined)
    await assertCameraExcellence(page)

    await page.setViewportSize({ width: 900, height: 700 })
    await page.waitForTimeout(250)
    await assertNonBlankMapScreenshot(page)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.waitForTimeout(250)

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
    const meetingZone = meetingReady.zones.zones.find(
      (zone) => zone.id === "meeting-zone",
    )
    assert.equal(meetingZone.availability, "available")
    assert.equal(meetingZone.availableAction, "join_meeting")
    assert.equal(meetingZone.markerVisible, true)
    assert.equal(meetingZone.labelVisible, true)
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
    assert.equal(
      media.zones.zones.find((zone) => zone.id === "meeting-zone")?.availability,
      "joined",
    )
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
    assertRendererCapabilities(rejoined)
    await assertNonBlankMapScreenshot(page)

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
    assertRendererCapabilities(recovered)
    await assertWebGLContextRecovery(page)
    await assertLargeGpuMapSmoke(page)
    await assertAvatarSystemSmoke(page)
    await assertZonePresentationSmoke(page)
    await assertDepthSortingSmoke(page)

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
  assert.equal(typeof state.renderer?.requestedRenderer, "string")
  assert.equal(typeof state.renderer?.actualRenderer, "string")
  assert.equal(typeof state.renderer?.webgl?.available, "boolean")
  assert.equal(typeof state.renderer?.rounding?.vertexRoundMode, "string")
  assert.ok(
    Array.isArray(state.renderer?.tilemap?.staticLayers),
    "Expected renderer.tilemap.staticLayers in render_game_to_text.",
  )
  assert.equal(typeof state.renderer?.assets?.atlasLoaded, "boolean")
  assert.equal(typeof state.renderer?.assets?.primarySource, "string")
  assert.equal(typeof state.renderer?.depth?.debugOverlayEnabled, "boolean")
  assert.ok(
    Array.isArray(state.renderer?.depth?.objects),
    "Expected renderer.depth.objects in render_game_to_text.",
  )
  assert.ok(
    Array.isArray(state.renderer?.depth?.players),
    "Expected renderer.depth.players in render_game_to_text.",
  )
  assert.equal(state.avatars?.source, "renderer_runtime")
  assert.ok(
    Array.isArray(state.avatars?.availableAvatarIds),
    "Expected avatars.availableAvatarIds in render_game_to_text.",
  )
  assert.ok(
    Array.isArray(state.avatars?.animationKeys),
    "Expected avatars.animationKeys in render_game_to_text.",
  )
  assert.ok(
    Array.isArray(state.avatars?.players),
    "Expected avatars.players in render_game_to_text.",
  )
  assert.equal(state.zones?.source, "compiled_map")
  assert.equal(typeof state.zones?.zoneCount, "number")
  assert.ok(
    Array.isArray(state.zones?.zones),
    "Expected zones.zones in render_game_to_text.",
  )
  assertCameraStateContract(state)
}

function assertCameraStateContract(state) {
  assert.equal(typeof state.camera?.mode, "string")
  assert.equal(typeof state.camera?.zoomPreset, "string")
  assert.equal(typeof state.camera?.zoomFactor, "number")
  assert.equal(typeof state.camera?.defaultZoomFactor, "number")
  assert.equal(typeof state.camera?.effectiveZoom, "number")
  assert.equal(typeof state.camera?.minZoomFactor, "number")
  assert.equal(typeof state.camera?.maxZoomFactor, "number")
  assert.equal(typeof state.camera?.canZoomIn, "boolean")
  assert.equal(typeof state.camera?.canZoomOut, "boolean")
  assert.equal(typeof state.camera?.worldView?.x, "number")
  assert.equal(typeof state.camera?.worldView?.y, "number")
  assert.equal(typeof state.camera?.worldView?.width, "number")
  assert.equal(typeof state.camera?.worldView?.height, "number")
  assert.equal(typeof state.camera?.deadzone?.width, "number")
  assert.equal(typeof state.camera?.deadzone?.height, "number")
  assert.equal(typeof state.camera?.followLerp, "number")
  assert.equal(typeof state.camera?.followAnchor, "string")
  assert.equal(typeof state.camera?.localPlayerVisible, "boolean")
}

function assertRendererCapabilities(state) {
  assert.equal(state.renderer.requestedRenderer, "webgl")
  assert.equal(state.renderer.actualRenderer, "webgl")
  assert.equal(state.renderer.config.pixelArt, true)
  assert.equal(state.renderer.config.smoothPixelArt, false)
  assert.equal(state.renderer.config.antialias, false)
  assert.equal(state.renderer.config.antialiasGL, false)
  assert.equal(state.renderer.config.roundPixels, true)
  assert.equal(state.renderer.config.powerPreference, "high-performance")
  assert.equal(state.renderer.config.clearBeforeRender, true)
  assert.equal(state.renderer.config.preserveDrawingBuffer, false)
  assert.equal(state.renderer.rounding.globalRoundPixels, true)
  assert.equal(state.renderer.rounding.cameraRoundPixels, true)
  assert.equal(state.renderer.rounding.cameraFollowRoundsPixels, true)
  assert.equal(state.renderer.rounding.vertexRoundMode, "safeAuto")
  assert.equal(state.renderer.tilemap.staticGpuLayerCount, 2)
  assert.equal(state.renderer.tilemap.staticCpuLayerCount, 0)
  assert.equal(state.renderer.tilemap.objectLayerMode, "sprites")
  assert.equal(state.renderer.tilemap.zoneLayerMode, "graphics")
  assert.equal(state.renderer.tilemap.avatarLayerMode, "display_objects")
  assert.equal(state.renderer.tilemap.labelLayerMode, "display_objects")
  assert.equal(state.renderer.assets.atlasId, "atlas.internal.office.polished_v1")
  assert.equal(state.renderer.assets.primarySource, "internal_atlas")
  assert.equal(state.renderer.assets.atlasLoaded, true)
  assert.equal(state.renderer.assets.manifestLoaded, true)
  assert.equal(state.renderer.assets.exportScale, 2)
  assert.equal(state.renderer.assets.fallbackTokenCount, 0)
  assert.equal(state.renderer.depth.debugOverlayEnabled, false)
  assert.equal(typeof state.renderer.depth.objectCount, "number")
  assert.equal(typeof state.renderer.depth.playerCount, "number")
  assert.deepEqual(
    state.renderer.tilemap.staticLayers.map((layer) => [
      layer.name,
      layer.mode,
    ]),
    [
      ["floor", "gpu"],
      ["walls", "gpu"],
    ],
  )
  assert.equal(state.renderer.webgl.available, true)
  assert.equal(state.renderer.webgl.contextLost, false)
  assert.equal(state.renderer.webgl.recoveryReady, true)
  assert.equal(typeof state.renderer.webgl.contextLossCount, "number")
  assert.equal(typeof state.renderer.webgl.contextRestoreCount, "number")
  assert.equal(typeof state.renderer.webgl.loseContextExtensionAvailable, "boolean")
  assert.ok(
    state.renderer.webgl.maxTextures >= 1,
    `Expected WebGL texture units, got ${state.renderer.webgl.maxTextures}.`,
  )
  assert.ok(
    state.renderer.webgl.maxTextureSize >= 1024,
    `Expected useful WebGL max texture size, got ${state.renderer.webgl.maxTextureSize}.`,
  )
  assert.ok(
    state.camera.deadzone.width > 0 && state.camera.deadzone.height > 0,
    `Expected tuned camera deadzone, got ${JSON.stringify(state.camera.deadzone)}.`,
  )
  assert.ok(
    state.camera.effectiveZoom >= 0.75,
    `Expected usable camera zoom, got ${state.camera.effectiveZoom}.`,
  )
}

async function assertCameraExcellence(page) {
  await page.waitForTimeout(500)
  const baseline = await renderGameToText(page)

  assert.equal(baseline.camera.mode, "follow_player")
  assert.equal(baseline.camera.zoomPreset, "standard")
  assert.equal(baseline.camera.followAnchor, "stable_player_anchor")
  assert.equal(baseline.camera.localPlayerVisible, true)
  await assertIdleCameraStable(page)

  await page.locator("#camera-fit").click()
  const fitRoom = await waitForTextState(
    page,
    (state) =>
      state.camera.mode === "fit_room" &&
      state.camera.zoomPreset === "room" &&
      state.camera.followAnchor === "room_center" &&
      state.camera.localPlayerVisible === true,
  )
  assert.equal(await page.locator("#camera-fit").getAttribute("aria-pressed"), "true")
  assert.equal(fitRoom.camera.canZoomIn, true)

  await page.locator("#camera-follow").click()
  const follow = await waitForTextState(
    page,
    (state) =>
      state.camera.mode === "follow_player" &&
      state.camera.zoomPreset === "standard" &&
      state.camera.localPlayerVisible === true,
  )
  assert.equal(await page.locator("#camera-follow").getAttribute("aria-pressed"), "true")
  assert.equal(follow.camera.followAnchor, "stable_player_anchor")

  await page.locator("#zoom-preset").selectOption("focus")
  await waitForTextState(
    page,
    (state) =>
      state.camera.mode === "follow_player" &&
      state.camera.zoomPreset === "focus" &&
      state.camera.localPlayerVisible === true,
  )

  await page.locator("#zoom-in").click()
  await waitForTextState(
    page,
    (state) =>
      state.camera.zoomPreset === "custom" &&
      state.camera.localPlayerVisible === true,
  )

  await page.locator("#zoom-reset").click()
  await waitForTextState(
    page,
    (state) =>
      state.camera.mode === "follow_player" &&
      state.camera.zoomPreset === "standard" &&
      state.camera.localPlayerVisible === true,
  )
}

async function assertIdleCameraStable(page) {
  const samples = await page.evaluate(async () => {
    const readState = () => JSON.parse(window.render_game_to_text())
    const cameraSamples = []

    for (let index = 0; index < 14; index += 1) {
      await new Promise((resolve) => window.requestAnimationFrame(resolve))
      const state = readState()
      cameraSamples.push({
        x: state.camera.worldView.x,
        y: state.camera.worldView.y,
        visible: state.camera.localPlayerVisible,
      })
    }

    return cameraSamples
  })
  const xs = samples.map((sample) => sample.x)
  const ys = samples.map((sample) => sample.y)
  const driftX = Math.max(...xs) - Math.min(...xs)
  const driftY = Math.max(...ys) - Math.min(...ys)

  assert.ok(
    samples.every((sample) => sample.visible),
    `Expected local player to remain visible in idle camera samples: ${JSON.stringify(samples)}.`,
  )
  assert.ok(
    driftX <= 1.5 && driftY <= 1.5,
    `Expected no idle camera jitter, got drift ${driftX}x${driftY}.`,
  )
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
    assert.equal(mobile.camera.defaultZoomFactor, 1)
    assert.equal(mobile.camera.zoomPreset, "standard")
    assert.equal(mobile.camera.localPlayerVisible, true)
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

async function assertWebGLContextRecovery(page) {
  const before = await renderGameToText(page)
  assertRendererCapabilities(before)
  assert.equal(
    before.renderer.webgl.loseContextExtensionAvailable,
    true,
    "Expected WEBGL_lose_context support in browser smoke.",
  )

  const browserContextResult = await page.evaluate(async () => {
    const canvas = document.querySelector("#map canvas")
    const gl =
      canvas?.getContext("webgl") ||
      canvas?.getContext("experimental-webgl")
    const extension = gl?.getExtension("WEBGL_lose_context")

    if (!canvas || !gl || !extension) {
      return {
        available: false,
        lost: false,
        restored: false,
      }
    }

    return new Promise((resolve) => {
      let lost = false
      let restored = false
      const timeout = window.setTimeout(() => {
        resolve({
          available: true,
          lost,
          restored,
        })
      }, 2500)

      canvas.addEventListener(
        "webglcontextlost",
        () => {
          lost = true
          window.setTimeout(() => extension.restoreContext(), 60)
        },
        { once: true },
      )
      canvas.addEventListener(
        "webglcontextrestored",
        () => {
          restored = true
          window.clearTimeout(timeout)
          resolve({
            available: true,
            lost,
            restored,
          })
        },
        { once: true },
      )

      extension.loseContext()
    })
  })

  assert.deepEqual(browserContextResult, {
    available: true,
    lost: true,
    restored: true,
  })

  const restored = await waitForTextState(
    page,
    (state) =>
      state.renderer.webgl.contextLossCount > before.renderer.webgl.contextLossCount &&
      state.renderer.webgl.contextRestoreCount >
        before.renderer.webgl.contextRestoreCount &&
      state.renderer.webgl.contextLost === false &&
      state.renderer.webgl.recoveryReady === true,
    9000,
  )
  assertRendererCapabilities(restored)
  await assertNonBlankMapScreenshot(page)
}

async function assertLargeGpuMapSmoke(page) {
  await page.evaluate(async () => {
    if (!window.__aedventureRendererTest?.renderLargeStaticMap) {
      throw new Error("Missing renderer test API.")
    }

    await window.__aedventureRendererTest.renderLargeStaticMap({
      width: 128,
      height: 96,
    })
  })

  const large = await waitForTextState(
    page,
    (state) =>
      state.map?.label === "Renderer stress map" &&
      state.map.width === 128 &&
      state.map.height === 96 &&
      state.renderer.tilemap.staticGpuLayerCount === 2 &&
      state.renderer.tilemap.staticTileCount > 12000,
    9000,
  )
  assertRendererCapabilities(large)
  await assertNonBlankMapScreenshot(page)

  const cadence = await page.evaluate(async () => {
    const samples = []
    let last

    return new Promise((resolve) => {
      const step = (time) => {
        if (last !== undefined) {
          samples.push(time - last)
        }
        last = time

        if (samples.length >= 45) {
          const sorted = [...samples].sort((a, b) => a - b)
          resolve({
            averageMs:
              samples.reduce((total, sample) => total + sample, 0) /
              samples.length,
            p95Ms: sorted[Math.floor(sorted.length * 0.95)],
            maxMs: Math.max(...samples),
          })
          return
        }

        window.requestAnimationFrame(step)
      }

      window.requestAnimationFrame(step)
    })
  })

  assert.ok(
    cadence.averageMs < 50,
    `Expected large GPU map average frame cadence below collapse threshold, got ${cadence.averageMs}ms.`,
  )
  assert.ok(
    cadence.p95Ms < 90,
    `Expected large GPU map p95 frame cadence below collapse threshold, got ${cadence.p95Ms}ms.`,
  )
  assert.ok(
    cadence.maxMs < 250,
    `Expected large GPU map max frame cadence below collapse threshold, got ${cadence.maxMs}ms.`,
  )
}

async function assertAvatarSystemSmoke(page) {
  const fixture = await page.evaluate(async () => {
    if (!window.__aedventureRendererTest?.renderAvatarFixtureCase) {
      throw new Error("Missing renderer avatar test API.")
    }

    return window.__aedventureRendererTest.renderAvatarFixtureCase()
  })
  await page.evaluate(() => window.advanceTime())

  const avatarState = await waitForTextState(
    page,
    (state) =>
      state.map?.label === "Avatar fixture" &&
      state.avatars.players.length === 4 &&
      state.avatars.players.every((player) => player.labelVisible),
    9000,
  )

  assert.deepEqual(avatarState.avatars.availableAvatarIds, [
    "ember",
    "cobalt",
    "moss",
    "violet",
  ])
  assert.equal(avatarState.avatars.animationCount, 32)
  assert.deepEqual(avatarState.avatars.interpolationProfiles, ["local", "remote"])
  assert.deepEqual(avatarState.avatars.emoteIds, ["wave", "raise_hand", "focus"])
  assert.deepEqual(fixture.avatarIds, ["ember", "cobalt", "moss", "violet"])
  assert.deepEqual(fixture.directions, ["down", "right", "left", "up"])
  assert.ok(
    avatarState.avatars.cosmeticSlots.includes("accessory"),
    "Expected future cosmetic slots in avatar registry.",
  )

  const playersByAvatar = new Map(
    avatarState.avatars.players.map((player) => [player.avatarId, player]),
  )
  for (const avatarId of fixture.avatarIds) {
    const player = playersByAvatar.get(avatarId)
    assert.ok(player, `Expected ${avatarId} avatar render state.`)
    assert.equal(player.labelVisible, true)
    assert.equal(player.labelVisibilityReason, "visible")
    assert.equal(player.animation.action, "idle")
    assert.match(player.animation.key, new RegExp(`^${avatarId}_idle_`))
    assert.ok(player.labelBounds.width >= 48)
  }

  const localAvatar = avatarState.avatars.players.find((player) => player.local)
  const remoteAvatar = avatarState.avatars.players.find(
    (player) => player.playerId === "avatar-cobalt",
  )
  assert.equal(localAvatar.interpolationProfile, "local")
  assert.equal(remoteAvatar.interpolationProfile, "remote")
  assert.equal(remoteAvatar.emoteId, "wave")
  await assertNonBlankMapScreenshot(page)

  await page.evaluate(async () => {
    if (!window.__aedventureRendererTest?.moveAvatarFixturePlayer) {
      throw new Error("Missing avatar movement test API.")
    }

    await window.__aedventureRendererTest.moveAvatarFixturePlayer(
      "avatar-cobalt",
      { x: 288, y: 192 },
      "down",
    )
  })
  const moving = await waitForTextState(
    page,
    (state) => {
      const remote = state.avatars.players.find(
        (player) => player.playerId === "avatar-cobalt",
      )

      return (
        remote?.interpolationProfile === "remote" &&
        remote?.animation.action === "walk" &&
        remote?.interpolationActive === true
      )
    },
  )
  assert.equal(
    moving.avatars.players.find((player) => player.playerId === "avatar-cobalt")
      .labelVisible,
    true,
  )

  await waitForTextState(
    page,
    (state) => {
      const remote = state.avatars.players.find(
        (player) => player.playerId === "avatar-cobalt",
      )

      return remote?.interpolationActive === false &&
        remote?.targetPosition.x === 288 &&
        remote?.targetPosition.y === 192
    },
    9000,
  )

  await page.evaluate(async () => {
    if (!window.__aedventureRendererTest?.triggerAvatarEmote) {
      throw new Error("Missing avatar emote test API.")
    }

    await window.__aedventureRendererTest.triggerAvatarEmote(
      "avatar-violet",
      "raise_hand",
    )
  })
  await waitForTextState(
    page,
    (state) =>
      state.avatars.players.find((player) => player.playerId === "avatar-violet")
        ?.emoteId === "raise_hand",
  )
}

async function assertZonePresentationSmoke(page) {
  const fixture = await page.evaluate(async () => {
    if (!window.__aedventureRendererTest?.renderZoneFixtureCase) {
      throw new Error("Missing renderer zone test API.")
    }

    return window.__aedventureRendererTest.renderZoneFixtureCase()
  })
  await page.evaluate(() => window.advanceTime())

  const zoneState = await waitForTextState(
    page,
    (state) =>
      state.map?.label === "Zone fixture" &&
      state.zones.zoneCount === 4 &&
      state.zones.zones.some(
        (zone) =>
          zone.id === "meeting-zone" &&
          zone.availability === "available" &&
          zone.availableAction === "join_meeting",
      ),
    9000,
  )

  assert.deepEqual(fixture.zoneIds, [
    "meeting-zone",
    "private-zone",
    "portal-door",
    "quiet-zone",
  ])
  assert.deepEqual(fixture.zoneTypes, [
    "meeting_private",
    "private",
    "portal",
    "quiet",
  ])
  assert.deepEqual(
    zoneState.zones.zones.map((zone) => [zone.id, zone.kind]),
    [
      ["meeting-zone", "meeting"],
      ["private-zone", "private"],
      ["portal-door", "portal"],
      ["quiet-zone", "quiet"],
    ],
  )

  const meetingZone = zoneState.zones.zones.find(
    (zone) => zone.id === "meeting-zone",
  )
  assert.equal(meetingZone.active, true)
  assert.equal(meetingZone.markerVisible, true)
  assert.equal(meetingZone.labelVisible, true)
  assert.equal(zoneState.meeting.panelState, "available")
  assert.equal(zoneState.meeting.joinDisabled, false)
  assert.ok(
    meetingZone.labelScale >= 0.72 && meetingZone.labelScale <= 1.18,
    `Expected zoom-aware zone label scale, got ${meetingZone.labelScale}.`,
  )

  await page.evaluate(async () => {
    if (!window.__aedventureRendererTest?.setZoneDebugOverlay) {
      throw new Error("Missing zone debug test API.")
    }

    await window.__aedventureRendererTest.setZoneDebugOverlay(true)
  })
  const debug = await waitForTextState(
    page,
    (state) =>
      state.zones.debugOverlayEnabled === true &&
      state.zones.zones.every((zone) => zone.debugVisible === true),
  )
  assert.equal(debug.zones.debugOverlayEnabled, true)
  await assertNonBlankMapScreenshot(page)

  await page.evaluate(async () => {
    if (!window.__aedventureRendererTest?.moveLocalPlayer) {
      throw new Error("Missing local movement zone test API.")
    }

    await window.__aedventureRendererTest.moveLocalPlayer({ x: 288, y: 112 })
  })
  const privateZone = await waitForTextState(
    page,
    (state) =>
      state.zones.activeZoneIds.includes("private-zone") &&
      state.zones.zones.find((zone) => zone.id === "private-zone")
        ?.availableAction === "enter_private",
  )
  assert.equal(privateZone.meeting.panelState, "outside")
  assert.equal(privateZone.meeting.joinDisabled, true)
  assert.equal(
    privateZone.zones.zones.find((zone) => zone.id === "private-zone")
      .markerVisible,
    true,
  )

  await page.evaluate(async () => {
    await window.__aedventureRendererTest.moveLocalPlayer({ x: 112, y: 208 })
  })
  const portalZone = await waitForTextState(
    page,
    (state) =>
      state.zones.activeZoneIds.includes("portal-door") &&
      state.zones.zones.find((zone) => zone.id === "portal-door")
        ?.availableAction === "enter_portal",
  )
  assert.equal(portalZone.meeting.joinDisabled, true)
  assert.equal(
    portalZone.zones.zones.find((zone) => zone.id === "portal-door")
      .markerVisible,
    true,
  )
}

async function assertDepthSortingSmoke(page) {
  const cases = [
    "table_player_behind",
    "table_player_front",
    "wall_player_behind",
  ]

  for (const caseId of cases) {
    const depthCase = await page.evaluate(async (id) => {
      if (!window.__aedventureRendererTest?.renderDepthFixtureCase) {
        throw new Error("Missing renderer depth test API.")
      }

      return window.__aedventureRendererTest.renderDepthFixtureCase(id)
    }, caseId)
    await page.evaluate(() => window.advanceTime())

    const state = await waitForTextState(
      page,
      (state) =>
        state.map?.label === `Depth case: ${caseId}` &&
        state.renderer.depth.playerCount === 1 &&
        state.renderer.depth.objectCount >= 1,
      9000,
    )

    assertRendererCapabilities(state)
    assertDepthOrdering(state, depthCase)
    await assertDepthScreenshotCase(page, state, depthCase)
  }
}

function assertDepthOrdering(state, depthCase) {
  const player = state.renderer.depth.players.find((player) => player.local)
  const object = state.renderer.depth.objects.find(
    (object) => object.tokenId === depthCase.occluderTokenId,
  )

  assert.ok(player, `Expected local player depth info for ${depthCase.id}.`)
  assert.ok(object, `Expected occluder depth info for ${depthCase.id}.`)
  assert.equal(
    object.occlusionMode,
    depthCase.occluderTokenId.startsWith("wall.") ? "foreground" : "y_sort",
  )

  if (depthCase.expectedLayerAtSample === "object") {
    assert.ok(
      player.depth < object.depth,
      `Expected ${depthCase.id} player depth ${player.depth} behind object depth ${object.depth}.`,
    )
  } else {
    assert.ok(
      player.depth > object.depth,
      `Expected ${depthCase.id} player depth ${player.depth} in front of object depth ${object.depth}.`,
    )
  }
}

async function assertDepthScreenshotCase(page, state, depthCase) {
  const screenshot = await page.locator("#map canvas").screenshot()
  const image = PNG.sync.read(screenshot)
  const point = clampCanvasPoint(depthCase.sampleViewport, image)
  const stats = pixelStats(image, point.x, point.y, 12)

  if (depthCase.expectedLayerAtSample === "avatar") {
    assert.ok(
      stats.avatarPixels >= 12,
      `Expected avatar-colored pixels for ${depthCase.id} near ${JSON.stringify(
        point,
      )}, got ${JSON.stringify(stats)}.`,
    )
    return
  }

  assert.ok(
    stats.warmObjectPixels >= 12 && stats.warmObjectPixels > stats.avatarPixels,
    `Expected object-colored pixels for ${depthCase.id} near ${JSON.stringify(
      point,
    )}, got ${JSON.stringify(stats)}.`,
  )
}

function clampCanvasPoint(point, image) {
  return {
    x: Math.max(0, Math.min(image.width - 1, Math.round(point.x))),
    y: Math.max(0, Math.min(image.height - 1, Math.round(point.y))),
  }
}

function pixelStats(image, centerX, centerY, radius) {
  let avatarPixels = 0
  let warmObjectPixels = 0
  let opaquePixels = 0

  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      if (x < 0 || y < 0 || x >= image.width || y >= image.height) continue

      const offset = (image.width * y + x) << 2
      const color = {
        red: image.data[offset],
        green: image.data[offset + 1],
        blue: image.data[offset + 2],
        alpha: image.data[offset + 3],
      }

      if (color.alpha > 180) {
        opaquePixels += 1
      }
      if (isCobaltAvatarPixel(color)) {
        avatarPixels += 1
      }
      if (isWarmObjectPixel(color)) {
        warmObjectPixels += 1
      }
    }
  }

  return {
    avatarPixels,
    warmObjectPixels,
    opaquePixels,
  }
}

function isCobaltAvatarPixel(color) {
  return (
    color.alpha > 180 &&
    color.blue > 105 &&
    color.blue - color.red > 40 &&
    color.blue >= color.green + 8
  )
}

function isWarmObjectPixel(color) {
  return (
    color.alpha > 180 &&
    color.red > 80 &&
    color.green > 45 &&
    color.red >= color.blue + 25 &&
    color.green >= color.blue - 8 &&
    !isCobaltAvatarPixel(color)
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
