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
        state.map.generatedPreview?.mode === "applied" &&
        state.map.generatedPreview?.previewMatchesRendered === true &&
        /entry spots are clear/.test(state.map.validationSummary ?? ""),
    )
    assert.equal(generated.map.aiReadiness.rendererAgnostic, true)
    assert.deepEqual(generated.map.aiReadiness.compilerOutputs, [
      "render_layers",
      "collision_layers",
      "zones",
    ])
    assert.equal(generated.map.aiReadiness.previewMatchesRendered, true)
    assert.equal(
      generated.map.generatedPreview.previewFingerprint,
      generated.map.generatedPreview.appliedFingerprint,
    )
    assert.equal(
      generated.map.generatedPreview.appliedFingerprint,
      generated.mapValidation.renderFingerprint,
    )
    assert.equal(generated.renderer.mapValidation.collisionLayerPresent, true)
    assert.ok(
      generated.map.validation.checks.every((check) => check.status === "pass"),
      "Expected explainable generated-map validation checks to pass.",
    )
    assert.equal(
      generated.map.availableMaps.find((map) => map.id === "generated").disabled,
      false,
    )
    assert.equal(await generatedMapButton.isDisabled(), false)
    await assertInvalidMapPreflight(page)

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
    assert.equal(joined.movement.repeatMs, 50)
    assert.equal(joined.movement.prediction.maxStepMs, 50)
    assert.equal(joined.movement.prediction.historyLimit, 48)
    assert.equal(joined.movement.motion.mode, "continuous_local_motion")
    assert.equal(joined.movement.simulation.inputHz, 20)
    assert.ok(
      [
        "http_request_response_fallback",
        "websocket_fixed_tick_snapshot_stream",
      ].includes(joined.movement.simulation.mode),
    )
    assert.equal(joined.movement.motion.movementMode, "walk")
    assertMovementFeelContract(joined)
    assert.equal(joined.movement.feel.panelVisible, false)
    assert.equal(joined.movement.movementMode, "walk")
    assert.equal(joined.movement.runToggled, false)
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
    const realtimeReady = await waitForTextState(
      page,
      (state) => state.movement.realtime.status === "open",
    )
    assert.equal(realtimeReady.movement.realtime.status, "open")
    assert.equal(
      realtimeReady.movement.simulation.mode,
      "websocket_fixed_tick_snapshot_stream",
    )
    assert.equal(realtimeReady.movement.simulation.inputHz, 20)

    const beforeMoveState = await renderGameToText(page)
    const beforeMove = beforeMoveState.player
    const predictedBefore = beforeMoveState.movement.prediction.totalPredicted
    const realtimeSentBefore = beforeMoveState.movement.realtime.sentCount
    await page.keyboard.press("ArrowDown")
    const predictedMove = await waitForTextState(
      page,
      (state) => {
        const localPlayer = state.players.find((player) => player.local)
        return (
          state.movement.realtime.status === "open" &&
          state.movement.realtime.sentCount > realtimeSentBefore &&
          state.movement.prediction.totalPredicted > predictedBefore &&
          state.movement.prediction.lastRequestedVector?.x === 0 &&
          state.movement.prediction.lastRequestedVector?.y === 1 &&
          state.movement.prediction.lastDirection === "down" &&
          localPlayer &&
          (localPlayer.x !== beforeMove.visualX ||
            localPlayer.y !== beforeMove.visualY ||
            state.player.x !== beforeMove.x ||
            state.player.y !== beforeMove.y)
        )
      },
    )
    assert.equal(predictedMove.movement.realtime.status, "open")
    assert.ok(
      predictedMove.movement.prediction.totalPredicted > predictedBefore,
      `Expected a new predicted movement, got ${JSON.stringify(predictedMove.movement.prediction)}.`,
    )
    const moved = await waitForTextState(
      page,
      (state) =>
        state.movement.prediction.active === false &&
        (state.player.x !== beforeMove.x ||
          state.player.y !== beforeMove.y ||
          state.movement.lastRejectedReason),
    )
    assert.equal(
      moved.movement.prediction.mode,
      "client_prediction_server_reconciliation",
    )
    assert.ok(
      moved.movement.prediction.totalPredicted >= 1 ||
        moved.movement.prediction.totalClientBlocked >= 1,
      `Expected movement to use client prediction, got ${JSON.stringify(moved.movement.prediction)}.`,
    )
    assert.equal(
      moved.movement.prediction.pendingCount,
      moved.movement.prediction.pendingSeqs.length,
    )
    assert.equal(typeof moved.movement.prediction.totalReplayed, "number")
    assert.equal(typeof moved.movement.prediction.lastReplayCount, "number")
    assert.equal(moved.movement.simulation.serverTickMs, 50)
    assert.equal(moved.movement.simulation.serverHz, 20)
    assert.ok(
      moved.movement.simulation.snapshotCount >= 1,
      `Expected realtime snapshots, got ${JSON.stringify(moved.movement.simulation)}.`,
    )
    assert.ok(
      ["confirmed", "predicted", "server_rejected", "client_blocked"].includes(
        moved.movement.prediction.lastOutcome,
      ),
      `Unexpected prediction outcome ${moved.movement.prediction.lastOutcome}.`,
    )

    const beforeDiagonal = await renderGameToText(page)
    const diagonalPredictedBefore =
      beforeDiagonal.movement.prediction.totalPredicted
    const diagonalSettledBefore =
      beforeDiagonal.movement.prediction.totalConfirmed +
      beforeDiagonal.movement.prediction.totalCorrected +
      beforeDiagonal.movement.prediction.totalServerRejected
    const diagonalRealtimeSentBefore = beforeDiagonal.movement.realtime.sentCount
    await page.keyboard.down("ArrowUp")
    await page.waitForTimeout(20)
    await page.keyboard.down("ArrowRight")
    await page.waitForTimeout(80)
    let diagonalMoved
    try {
      await page.keyboard.up("ArrowRight")
      await page.keyboard.up("ArrowUp")
      diagonalMoved = await waitForTextState(
        page,
        (state) =>
          state.movement.prediction.active === false &&
          state.movement.realtime.sentCount > diagonalRealtimeSentBefore &&
          state.movement.prediction.totalPredicted > diagonalPredictedBefore &&
          state.movement.prediction.lastRequestedVector?.x === 0.707 &&
          state.movement.prediction.lastRequestedVector?.y === -0.707 &&
          state.movement.prediction.lastDirection === "right" &&
          state.movement.prediction.totalConfirmed +
            state.movement.prediction.totalCorrected +
            state.movement.prediction.totalServerRejected >
            diagonalSettledBefore,
      )
    } finally {
      await page.keyboard.up("ArrowRight")
      await page.keyboard.up("ArrowUp")
    }
    assert.ok(
      diagonalMoved.movement.prediction.totalPredicted >
        diagonalPredictedBefore,
      `Expected diagonal movement to use client prediction, got ${JSON.stringify(diagonalMoved.movement.prediction)}.`,
    )
    assert.deepEqual(diagonalMoved.movement.prediction.lastRequestedVector, {
      x: 0.707,
      y: -0.707,
    })
    assert.equal(
      typeof diagonalMoved.movement.prediction.lastCollisionSlide,
      "boolean",
    )
    if (diagonalMoved.movement.prediction.lastCollisionSlide) {
      assert.ok(
        ["x", "y", "corner"].includes(
          diagonalMoved.movement.prediction.lastCollisionSlideAxis,
        ),
        `Expected slide axis telemetry, got ${JSON.stringify(diagonalMoved.movement.prediction)}.`,
      )
      assert.equal(
        typeof diagonalMoved.movement.prediction.lastCollisionSlideDistancePx,
        "number",
      )
    }
    assert.ok(
      diagonalMoved.movement.prediction.lastAckSeq >=
        beforeDiagonal.movement.prediction.lastAckSeq ||
        beforeDiagonal.movement.prediction.lastAckSeq === undefined,
      `Expected diagonal reconciliation to expose an ack sequence, got ${JSON.stringify(diagonalMoved.movement.prediction)}.`,
    )
    assert.equal(
      diagonalMoved.movement.prediction.pendingCount,
      diagonalMoved.movement.prediction.pendingSeqs.length,
    )
    assert.ok(
      diagonalMoved.movement.debugLog.some((entry) =>
        /keys=up\+right/.test(entry),
      ),
      `Expected movement debug log to include real keyboard chord state, got ${JSON.stringify(diagonalMoved.movement.debugLog)}.`,
    )
    assert.ok(
      diagonalMoved.movement.debugLog.some((entry) =>
        /vector=1,-1/.test(entry),
      ),
      `Expected movement debug log to include diagonal vector, got ${JSON.stringify(diagonalMoved.movement.debugLog)}.`,
    )
    assert.ok(
      diagonalMoved.movement.debugLog.some((entry) =>
        /serverRequested=0\.707,-0\.707/.test(entry),
      ),
      `Expected movement debug log to include server vector telemetry, got ${JSON.stringify(diagonalMoved.movement.debugLog)}.`,
    )
    assert.ok(
      diagonalMoved.movement.debugLog.some((entry) =>
        /serverMode=walk/.test(entry),
      ),
      `Expected movement debug log to include server movement mode, got ${JSON.stringify(diagonalMoved.movement.debugLog)}.`,
    )
    assert.ok(
      !diagonalMoved.movement.debugLog.some((entry) =>
        /serverApplied=legacy\/missing/.test(entry),
      ),
      `Expected current world server to report applied vectors, got ${JSON.stringify(diagonalMoved.movement.debugLog)}.`,
    )
    assert.equal(
      diagonalMoved.movement.serverProtocolMismatch,
      undefined,
      `Expected no server protocol mismatch, got ${JSON.stringify(diagonalMoved.movement.serverProtocolMismatch)}.`,
    )
    assert.ok(
      diagonalMoved.movement.prediction.totalPredicted >
        diagonalPredictedBefore,
      "Expected diagonal move to complete after server reconciliation.",
    )

    const beforePadDiagonal = await renderGameToText(page)
    await page.locator(".compact-tool").evaluate((section) => {
      section.open = true
    })
    await page.locator("#run-toggle").click()
    await page.locator('[data-move-x="1"][data-move-y="1"]').click()
    const padDiagonalMoved = await waitForTextState(
      page,
      (state) =>
        state.movement.prediction.active === false &&
        state.movement.prediction.totalPredicted >
          beforePadDiagonal.movement.prediction.totalPredicted &&
        state.movement.prediction.lastRequestedVector?.x === 0.707 &&
        state.movement.prediction.lastRequestedVector?.y === 0.707 &&
        state.movement.prediction.lastDirection === "right" &&
        state.movement.prediction.lastMovementMode === "run" &&
        state.movement.prediction.lastSpeedPxPerSecond === 148,
    )
    assert.equal(
      padDiagonalMoved.movement.prediction.lastRequestedVector.x,
      0.707,
    )
    assert.equal(padDiagonalMoved.movement.runToggled, true)
    assert.equal(await page.locator("#run-toggle").getAttribute("aria-pressed"), "true")
    await page.locator("#run-toggle").click()

    const beforeJoystickMove = await renderGameToText(page)
    assertJoystickContract(beforeJoystickMove)
    const joystickSurface = page.locator(".joystick-surface")
    await joystickSurface.scrollIntoViewIfNeeded()
    const joystickBox = await joystickSurface.boundingBox()
    assert.ok(joystickBox, "Expected joystick surface to be measurable.")
    await page.mouse.move(
      joystickBox.x + joystickBox.width / 2,
      joystickBox.y + joystickBox.height / 2,
    )
    await page.mouse.down()
    await page.mouse.move(
      joystickBox.x + joystickBox.width * 0.86,
      joystickBox.y + joystickBox.height * 0.38,
    )
    const joystickMoved = await waitForTextState(
      page,
      (state) =>
        state.movement.joystick.active === true &&
        state.movement.joystick.primary === true &&
        state.movement.joystick.vector.x > 0.55 &&
        state.movement.joystick.vector.y < -0.1 &&
        state.movement.motion.targetSpeedPxPerSecond > 40 &&
        state.movement.motion.targetSpeedPxPerSecond < 88 &&
        state.movement.prediction.totalPredicted >
          beforeJoystickMove.movement.prediction.totalPredicted,
    )
    assert.equal(joystickMoved.movement.joystick.dpadFallback, true)
    assert.equal(joystickMoved.movement.joystick.direction, "right")
    assert.equal(
      joystickMoved.movement.debugLog.some((entry) =>
        entry.includes("joystick-move"),
      ),
      true,
      `Expected joystick movement in debug log, got ${JSON.stringify(joystickMoved.movement.debugLog)}.`,
    )
    await page.mouse.up()
    await waitForTextState(
      page,
      (state) => state.movement.joystick.active === false,
      3000,
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
    await assertEffectsLayerSmoke(page)
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
  assert.equal(
    state.movement?.prediction?.mode,
    "client_prediction_server_reconciliation",
  )
  assert.equal(typeof state.movement?.prediction?.active, "boolean")
  assert.equal(typeof state.movement?.movementMode, "string")
  assert.equal(typeof state.movement?.runToggled, "boolean")
  assert.equal(state.movement?.motion?.mode, "continuous_local_motion")
  assert.equal(typeof state.movement?.motion?.active, "boolean")
  assert.equal(typeof state.movement?.motion?.speedPxPerSecond, "number")
  assert.equal(typeof state.movement?.motion?.correctionPx, "number")
  assertMovementFeelContract(state)
  assertJoystickContract(state)
  assert.equal(typeof state.movement?.realtime?.status, "string")
  assert.equal(typeof state.movement?.realtime?.sentCount, "number")
  assert.equal(typeof state.movement?.realtime?.receivedCount, "number")
  assert.equal(typeof state.movement?.realtime?.fallbackCount, "number")
  assert.equal(typeof state.movement?.realtime?.snapshotCount, "number")
  if (state.movement?.realtime?.snapshotCount > 0) {
    assert.equal(typeof state.movement.realtime.serverTickHz, "number")
    assert.equal(typeof state.movement.realtime.inputStats?.authority, "string")
    assert.equal(
      state.movement.realtime.inputStats?.inputCoalescing,
      "latest_intent_per_client_per_tick",
    )
    assert.equal(
      typeof state.movement.realtime.inputStats?.processedMoveCount,
      "number",
    )
    assert.equal(
      typeof state.movement.realtime.inputStats?.droppedMoveCount,
      "number",
    )
  }
  assert.equal(typeof state.movement?.simulation?.mode, "string")
  assert.equal(state.movement?.simulation?.authority, "server_authoritative")
  assert.equal(state.movement?.simulation?.serverTickModel, "fixed_tick")
  assert.equal(
    state.movement?.simulation?.inputCoalescing,
    "latest_intent_per_client_per_tick",
  )
  assert.equal(
    state.movement?.simulation?.clientReconciliation,
    "rewind_replay_blend",
  )
  assert.equal(
    state.movement?.simulation?.remoteInterpolation,
    "snapshot_buffer_delay",
  )
  assert.equal(typeof state.movement?.simulation?.inputHz, "number")
  assert.equal(typeof state.movement?.simulation?.clientInputMs, "number")
  assert.equal(typeof state.movement?.simulation?.snapshotCount, "number")
  assert.equal(typeof state.movement?.prediction?.lastOutcome, "string")
  assert.equal(
    state.movement?.prediction?.reconciliationModel,
    "rewind_replay_blend",
  )
  assert.equal(
    state.movement?.prediction?.historyModel,
    "sequence_numbered_input_history",
  )
  assert.equal(typeof state.movement?.prediction?.totalPredicted, "number")
  assert.equal(typeof state.movement?.prediction?.totalConfirmed, "number")
  assert.equal(typeof state.movement?.prediction?.totalCorrected, "number")
  assert.equal(typeof state.movement?.prediction?.totalClientBlocked, "number")
  assert.equal(typeof state.movement?.prediction?.totalServerRejected, "number")
  assert.equal(typeof state.movement?.prediction?.historyLimit, "number")
  assert.equal(typeof state.movement?.prediction?.pendingCount, "number")
  assert.ok(
    Array.isArray(state.movement?.prediction?.pendingSeqs),
    "Expected prediction.pendingSeqs in render_game_to_text.",
  )
  assert.equal(typeof state.movement?.prediction?.totalReplayed, "number")
  assert.equal(typeof state.movement?.prediction?.lastReplayCount, "number")
  if (state.movement?.prediction?.active) {
    assert.equal(typeof state.movement.prediction.requestedVector?.x, "number")
    assert.equal(typeof state.movement.prediction.requestedVector?.y, "number")
    assert.equal(typeof state.movement.prediction.appliedVector?.x, "number")
    assert.equal(typeof state.movement.prediction.appliedVector?.y, "number")
    assert.equal(typeof state.movement.prediction.speedPxPerSecond, "number")
    assert.equal(typeof state.movement.prediction.collisionSlide, "boolean")
    if (state.movement.prediction.collisionSlide) {
      assert.ok(
        ["x", "y", "corner"].includes(
          state.movement.prediction.collisionSlideAxis,
        ),
        "Expected active collision slide axis telemetry.",
      )
      assert.equal(
        typeof state.movement.prediction.collisionSlideDistancePx,
        "number",
      )
    }
  }
  assert.equal(typeof state.map?.renderer, "string")
  assertEngineArchitectureContract(state)
  assert.equal(typeof state.renderer?.requestedRenderer, "string")
  assert.equal(typeof state.renderer?.actualRenderer, "string")
  assert.equal(typeof state.renderer?.webgl?.available, "boolean")
  assert.equal(typeof state.renderer?.rounding?.vertexRoundMode, "string")
  assert.equal(state.mapValidation?.source, "renderer_preflight")
  assert.equal(typeof state.mapValidation?.valid, "boolean")
  assert.equal(typeof state.mapValidation?.renderFingerprint, "string")
  assert.equal(state.renderer?.mapValidation?.source, "renderer_preflight")
  assert.equal(state.performance?.source, "renderer_runtime")
  assert.equal(typeof state.performance?.target?.targetFps, "number")
  assert.equal(typeof state.performance?.lifecycle?.gameInstanceId, "number")
  assert.equal(typeof state.performance?.runtime?.textureCount, "number")
  assert.ok(
    Array.isArray(state.renderer?.tilemap?.staticLayers),
    "Expected renderer.tilemap.staticLayers in render_game_to_text.",
  )
  assert.equal(typeof state.renderer?.assets?.atlasLoaded, "boolean")
  assert.equal(typeof state.renderer?.assets?.primarySource, "string")
  assert.equal(typeof state.renderer?.assets?.metadata?.frameCount, "number")
  assert.equal(
    typeof state.renderer?.assets?.metadata?.sourceLicenseValidated,
    "boolean",
  )
  assert.equal(
    typeof state.renderer?.assets?.metadata?.atlasBuildValidated,
    "boolean",
  )
  assert.ok(
    Array.isArray(state.renderer?.assets?.metadata?.tenantThemeTags),
    "Expected renderer.assets.metadata.tenantThemeTags in render_game_to_text.",
  )
  assert.equal(typeof state.renderer?.depth?.debugOverlayEnabled, "boolean")
  assert.equal(typeof state.devTools?.gated, "boolean")
  assert.equal(typeof state.devTools?.enabled, "boolean")
  assert.equal(typeof state.devTools?.feelPanel?.visible, "boolean")
  assert.equal(typeof state.devTools?.feelPanel?.controlCount, "number")
  assert.ok(
    Array.isArray(state.devTools?.availableFixtureIds),
    "Expected devTools.availableFixtureIds in render_game_to_text.",
  )
  assert.equal(
    state.devTools?.primaryUiControlsExposed,
    0,
    "Expected no product-facing devtools controls.",
  )
  assert.equal(state.devTools?.renderer?.source, "renderer_dev_tools")
  assert.equal(typeof state.devTools?.renderer?.overlays?.grid, "boolean")
  assert.equal(
    typeof state.devTools?.renderer?.overlayObjectCounts?.gridLineCount,
    "number",
  )
  assert.ok(
    Array.isArray(state.devTools?.renderer?.keyboardShortcuts),
    "Expected devTools renderer keyboard shortcuts in render_game_to_text.",
  )
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
  assert.equal(state.avatars?.spriteAtlas?.source, "runtime_generated_sprite_atlas")
  assert.equal(state.avatars?.animationPipeline?.source, "sprite_atlas_metadata")
  assert.equal(state.avatars?.spriteAtlas?.serverDirectionModel, "4_way")
  assert.equal(state.avatars?.spriteAtlas?.visualDirectionModel, "8_way")
  assert.ok(
    Array.isArray(state.avatars?.spriteAtlas?.supportedStates),
    "Expected avatars.spriteAtlas.supportedStates in render_game_to_text.",
  )
  assert.ok(
    Array.isArray(state.avatars?.animationStates),
    "Expected avatars.animationStates in render_game_to_text.",
  )
  assert.ok(
    Array.isArray(state.avatars?.previewFixtures),
    "Expected avatars.previewFixtures in render_game_to_text.",
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
  assert.equal(
    state.worldInteractions?.authority,
    "server_permitted_actions_only",
  )
  assert.ok(
    [
      "none",
      "walk_nearby",
      "checking_permission",
      "press_e_or_tap",
      "server_denied",
    ].includes(state.worldInteractions?.actionAffordance),
    `Expected interaction affordance telemetry, got ${JSON.stringify(state.worldInteractions)}.`,
  )
  assert.equal(
    state.worldInteractions?.presentation?.markerStyle,
    "action_marker_cards",
  )
  assert.equal(
    state.worldInteractions?.presentation?.selectionMode,
    "hover_click_marker",
  )
  assert.equal(state.effects?.source, "renderer_runtime")
  assert.equal(state.effects?.authority, "visual_only")
  assert.equal(typeof state.effects?.enabled, "boolean")
  assert.equal(state.effects?.deterministic, true)
  assert.equal(state.effects?.animationMode, "static")
  assert.ok(
    Array.isArray(state.effects?.applied?.webglFilters),
    "Expected effects.applied.webglFilters in render_game_to_text.",
  )
  assert.ok(
    Array.isArray(state.effects?.applied?.ambientEffects),
    "Expected effects.applied.ambientEffects in render_game_to_text.",
  )
  assertCameraStateContract(state)
}

function assertEngineArchitectureContract(state) {
  assert.equal(state.engine?.source, "browser_engine_runtime")
  assert.equal(state.engine?.renderer?.host, "RendererHost")
  assert.equal(state.engine?.renderer?.scene, "OfficeScene")
  assert.ok(
    state.engine?.renderer?.modules?.includes("TilemapRenderer"),
    `Expected TilemapRenderer module, got ${JSON.stringify(state.engine?.renderer)}.`,
  )
  assert.ok(
    state.engine?.renderer?.modules?.includes("AvatarRenderer"),
    `Expected AvatarRenderer module, got ${JSON.stringify(state.engine?.renderer)}.`,
  )
  assert.equal(state.engine?.controllers?.input, "InputController")
  assert.equal(state.engine?.controllers?.worldSync, "WorldSyncController")
  assert.equal(
    state.engine?.boundaries?.phaserIsolatedBehindRendererHost,
    true,
  )
  assert.equal(
    state.engine?.boundaries?.inputStateOwnedOutsideDomEvents,
    true,
  )
  assert.equal(
    state.engine?.boundaries?.realtimeTransportOwnedByWorldSync,
    true,
  )
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
  assert.equal(typeof state.camera?.lead?.enabled, "boolean")
  assert.equal(typeof state.camera?.lead?.active, "boolean")
  assert.ok(
    ["motion_snapshot", "derived_target_delta", "idle"].includes(
      state.camera?.lead?.source,
    ),
    `Expected camera lead source, got ${JSON.stringify(state.camera?.lead)}.`,
  )
  assert.equal(typeof state.camera?.lead?.offset?.x, "number")
  assert.equal(typeof state.camera?.lead?.offset?.y, "number")
  assert.equal(typeof state.camera?.lead?.targetOffset?.x, "number")
  assert.equal(typeof state.camera?.lead?.targetOffset?.y, "number")
  assert.equal(typeof state.camera?.lead?.velocity?.x, "number")
  assert.equal(typeof state.camera?.lead?.velocity?.y, "number")
  assert.equal(typeof state.camera?.lead?.speedPxPerSecond, "number")
  assert.equal(typeof state.camera?.lead?.maxDistancePx, "number")
  assert.equal(typeof state.camera?.lead?.smoothingTimeConstantMs, "number")
  assert.equal(typeof state.camera?.lead?.correctionDampingActive, "boolean")
  assert.equal(typeof state.camera?.localPlayerVisible, "boolean")
}

function assertMovementFeelContract(state) {
  assert.equal(state.movement?.feel?.source, "client_runtime_tuning")
  assert.equal(typeof state.movement?.feel?.panelVisible, "boolean")
  assert.equal(typeof state.movement?.feel?.values?.walkSpeedPxPerSecond, "number")
  assert.equal(typeof state.movement?.feel?.values?.runSpeedPxPerSecond, "number")
  assert.equal(
    typeof state.movement?.feel?.values?.accelerationTimeConstantMs,
    "number",
  )
  assert.equal(
    typeof state.movement?.feel?.values?.decelerationTimeConstantMs,
    "number",
  )
  assert.equal(
    typeof state.movement?.feel?.values?.turnResponseTimeConstantMs,
    "number",
  )
  assert.equal(
    typeof state.movement?.feel?.values?.analogCurveExponent,
    "number",
  )
  assert.equal(
    typeof state.movement?.feel?.values?.collisionBodyRadiusPx,
    "number",
  )
  assert.equal(
    typeof state.movement?.feel?.values?.collisionSlideMaxNudgePx,
    "number",
  )
  assert.equal(
    typeof state.movement?.feel?.values?.activeCorrectionTimeConstantMs,
    "number",
  )
  assert.equal(
    typeof state.movement?.feel?.values?.collisionSlideSpeedScale,
    "number",
  )
  assert.ok(
    Array.isArray(state.movement?.feel?.controls),
    "Expected movement.feel.controls in render_game_to_text.",
  )
  assert.ok(
    state.movement.feel.controls.some(
      (control) => control.key === "turnResponseTimeConstantMs",
    ),
    "Expected turn response to be explicitly tunable.",
  )
  assert.ok(
    state.movement.feel.controls.some(
      (control) => control.key === "collisionBodyRadiusPx",
    ),
    "Expected collision body radius to be explicitly tunable.",
  )
  assert.equal(
    typeof state.movement?.prediction?.collisionBody?.radiusPx,
    "number",
  )
  assert.equal(
    typeof state.movement?.prediction?.collisionBody?.slideMaxNudgePx,
    "number",
  )
}

function assertJoystickContract(state) {
  assert.equal(state.movement?.joystick?.available, true)
  assert.equal(state.movement?.joystick?.primary, true)
  assert.equal(state.movement?.joystick?.dpadFallback, true)
  assert.equal(typeof state.movement?.joystick?.active, "boolean")
  assert.equal(typeof state.movement?.joystick?.vector?.x, "number")
  assert.equal(typeof state.movement?.joystick?.vector?.y, "number")
  assert.equal(typeof state.movement?.joystick?.magnitude, "number")
  assert.ok(
    state.movement.joystick.radiusPx >= 24,
    `Expected joystick radius telemetry, got ${JSON.stringify(state.movement.joystick)}.`,
  )
  assert.ok(
    state.movement.joystick.deadzonePx > 0,
    `Expected joystick deadzone telemetry, got ${JSON.stringify(state.movement.joystick)}.`,
  )
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
  assert.equal(state.renderer.tilemap.staticLayerBatching, "phaser_tilemap_gpu_layers")
  assert.equal(state.renderer.tilemap.staticLayerBatchCount, 2)
  assert.equal(state.renderer.tilemap.objectLayerMode, "sprites")
  assert.equal(state.renderer.tilemap.zoneLayerMode, "graphics")
  assert.equal(state.renderer.tilemap.avatarLayerMode, "display_objects")
  assert.equal(state.renderer.tilemap.labelLayerMode, "display_objects")
  assert.equal(state.renderer.effects.source, "renderer_runtime")
  assert.equal(state.renderer.effects.authority, "visual_only")
  assert.equal(state.renderer.effects.deterministic, true)
  assert.equal(state.renderer.effects.enabled, true)
  assert.equal(state.renderer.effects.quality, "premium")
  assert.equal(state.renderer.effects.applied.selectionOutlines, "zone_renderer")
  assert.equal(state.renderer.effects.applied.hoverOutlines, "zone_renderer")
  assert.ok(
    state.renderer.effects.applied.ambientEffects.includes("ambient_tint"),
    "Expected deterministic ambient tint effect.",
  )
  assert.equal(state.renderer.effects.capability.webglAvailable, true)
  assert.equal(state.renderer.effects.capability.contextLost, false)
  assert.equal(state.renderer.mapValidation.valid, true)
  assert.equal(state.renderer.mapValidation.mutationSafe, true)
  assert.equal(typeof state.renderer.mapValidation.collisionLayerPresent, "boolean")
  assert.ok(
    state.renderer.mapValidation.visualFootprintCount >= 1,
    "Expected renderer visual-footprint preflight checks.",
  )
  assertRendererPerformance(state.renderer.performance)
  assertRendererPerformance(state.performance)
  assert.equal(state.renderer.assets.atlasId, "atlas.internal.office.polished_v1")
  assert.equal(state.renderer.assets.primarySource, "internal_atlas")
  assert.equal(state.renderer.assets.atlasLoaded, true)
  assert.equal(state.renderer.assets.manifestLoaded, true)
  assert.equal(state.renderer.assets.exportScale, 2)
  assert.equal(state.renderer.assets.fallbackTokenCount, 0)
  assert.equal(state.renderer.assets.metadata.sourceLicenseValidated, true)
  assert.equal(state.renderer.assets.metadata.atlasBuildValidated, true)
  assert.ok(state.renderer.assets.metadata.frameCount >= 20)
  assert.ok(state.renderer.assets.metadata.variantCount >= 40)
  assert.ok(
    state.renderer.assets.metadata.tenantThemeTags.includes("brandable"),
    "Expected tenant theme tag metadata to include brandable assets.",
  )
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

function assertRendererPerformance(performance) {
  assert.equal(performance.source, "renderer_runtime")
  assert.equal(performance.target.targetFps, 60)
  assert.equal(performance.target.minimumAcceptableFps, 45)
  assert.equal(performance.target.targetFrameBudgetMs, 16.67)
  assert.equal(performance.target.minimumFrameBudgetMs, 22.22)
  assert.equal(performance.target.smokeAverageBudgetMs, 50)
  assert.equal(performance.target.smokeP95BudgetMs, 90)
  assert.equal(performance.target.smokeMaxBudgetMs, 250)
  assert.deepEqual(performance.target.benchmarkMaps, [
    "20x15",
    "50x40",
    "100x80",
  ])
  assert.equal(
    performance.target.documentedAt,
    "docs/renderer-performance-budget.md",
  )
  assert.equal(
    performance.strategy.tileLayerBatching,
    "phaser_tilemap_gpu_layers",
  )
  assert.equal(performance.strategy.roomChunking, "logical_32x32_tile_chunks")
  assert.equal(performance.strategy.tileLayerCulling, "camera_gpu_layer")
  assert.equal(performance.strategy.objectCulling, "camera_worldview_margin")
  assert.equal(performance.strategy.objectPooling, "pooled_phaser_images")
  assert.equal(
    performance.strategy.textureReuse,
    "signature_reused_tileset_and_object_textures",
  )
  assert.equal(performance.strategy.gameReuse, "single_phaser_game_instance")
  assert.ok(performance.chunking.chunkSizeTiles >= 16)
  assert.ok(performance.chunking.totalChunks >= 1)
  assert.ok(performance.chunking.visibleChunks >= 1)
  assert.ok(performance.chunking.visibleChunkRatio > 0)
  assert.equal(typeof performance.culling.cullMarginPx, "number")
  assert.equal(typeof performance.pooling.activeSpriteCount, "number")
  assert.equal(typeof performance.pooling.pooledSpriteCount, "number")
  assert.equal(typeof performance.lifecycle.mapRenderCount, "number")
  assert.equal(typeof performance.lifecycle.mapSwitchCount, "number")
  assert.equal(performance.lifecycle.phaserGameReused, true)
  assert.equal(typeof performance.runtime.lastMapRenderDurationMs, "number")
  assert.equal(typeof performance.runtime.displayObjectCount, "number")
  assert.equal(typeof performance.runtime.textureCount, "number")
  assert.match(performance.proofs.mapSize, /^\d+x\d+$/)
  assert.equal(typeof performance.proofs.tileBatching.compatible, "boolean")
  assert.equal(typeof performance.proofs.viewportCulling.active, "boolean")
  assert.equal(typeof performance.proofs.viewportCulling.culledRatio, "number")
  assert.equal(typeof performance.proofs.objectPooling.reuseObserved, "boolean")
  assert.equal(typeof performance.proofs.textureReuse.reuseObserved, "boolean")
}

async function assertCameraExcellence(page) {
  await page.waitForTimeout(500)
  const baseline = await renderGameToText(page)

  assert.equal(baseline.camera.mode, "follow_player")
  assert.equal(baseline.camera.zoomPreset, "standard")
  assert.equal(baseline.camera.followAnchor, "leading_player_anchor")
  assert.equal(baseline.camera.lead.enabled, true)
  assert.equal(baseline.camera.localPlayerVisible, true)
  await assertIdleCameraStable(page)
  await assertCameraLead(page)

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
  assert.equal(follow.camera.followAnchor, "leading_player_anchor")

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

async function assertCameraLead(page) {
  await page.keyboard.down("Shift")
  await page.keyboard.down("ArrowRight")
  const leading = await waitForTextState(
    page,
    (state) =>
      state.camera.lead.enabled === true &&
      state.camera.lead.active === true &&
      state.camera.lead.offset.x > 0 &&
      state.camera.lead.targetOffset.x > 0 &&
      state.camera.lead.maxDistancePx >= 40 &&
      state.camera.lead.source === "motion_snapshot" &&
      state.movement.motion.inputActive === true &&
      state.movement.motion.movementMode === "run",
    3000,
  )

  assert.equal(leading.camera.localPlayerVisible, true)
  assert.ok(
    Math.abs(leading.camera.lead.offset.x) <= leading.camera.lead.maxDistancePx,
    `Expected bounded camera lead, got ${JSON.stringify(leading.camera.lead)}.`,
  )

  await page.keyboard.up("ArrowRight")
  await page.keyboard.up("Shift")
  await waitForTextState(
    page,
    (state) =>
      state.movement.motion.inputActive === false &&
      state.camera.lead.source === "motion_snapshot",
    3000,
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
        { label: "World", open: false },
        { label: "Call", open: false },
        { label: "Move", open: false },
        { label: "Chat", open: false },
      ],
    )
    await expectVisible(
      mobilePage.locator("details.world-action-tool summary"),
      "Expected collapsed World action handle on mobile.",
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
    await mobilePage.locator("details.compact-tool summary").click()
    await expectVisible(
      mobilePage.locator("#analog-joystick"),
      "Expected analog joystick to be the primary mobile movement control.",
    )
    await expectVisible(
      mobilePage.locator(".controls-dpad"),
      "Expected D-pad fallback to remain available below the joystick.",
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
  const benchmark = await page.evaluate(async () => {
    if (!window.__aedventureRendererTest?.runBigMapBenchmark) {
      throw new Error("Missing renderer benchmark test API.")
    }

    return window.__aedventureRendererTest.runBigMapBenchmark()
  })

  assert.deepEqual(benchmark.gameInstanceIds, [benchmark.gameInstanceIds[0]])
  assert.equal(benchmark.gameInstanceIds.length, 1)
  assert.deepEqual(
    benchmark.samples.map((sample) => `${sample.pass}:${sample.size}`),
    [
      "1:20x15",
      "1:50x40",
      "1:100x80",
      "2:20x15",
      "2:50x40",
      "2:100x80",
    ],
  )
  assert.deepEqual(benchmark.proof, {
    passed: true,
    benchmarkMapsCovered: true,
    tileBatching: true,
    viewportCulling: true,
    objectPooling: true,
    textureReuse: true,
    noMapSwitchLeaks: true,
  })
  benchmark.samples.forEach((sample) => {
    assertRendererPerformance(sample.performance)
    assert.deepEqual(sample.proof, {
      tileBatching: true,
      viewportCullingAccounted: true,
      viewportCullingActive: true,
      objectPoolingActive: true,
      objectPoolReuseObserved: true,
      textureReuseObserved: true,
    })
    assert.ok(
      sample.mapRenderDurationMs >= 0,
      `Expected map render duration for ${sample.size}.`,
    )
    assert.ok(
      sample.staticTileCount >= 20 * 15,
      `Expected static tiles in ${sample.size}, got ${sample.staticTileCount}.`,
    )
    assert.ok(
      sample.objectCount > 0,
      `Expected object sprite load in ${sample.size} benchmark.`,
    )
  })

  assert.ok(
    benchmark.repeatedLargeMapDisplayObjectDelta <= 2,
    `Expected repeated large-map display objects to stay bounded, got delta ${benchmark.repeatedLargeMapDisplayObjectDelta}.`,
  )
  assert.ok(
    benchmark.repeatedLargeMapTextureDelta <= 0,
    `Expected repeated large-map texture count not to grow, got delta ${benchmark.repeatedLargeMapTextureDelta}.`,
  )
  assert.equal(benchmark.repeatedLargeMapCreatedSpriteDelta, 0)
  assert.equal(benchmark.repeatedLargeMapCreatedTextureDelta, 0)

  const large = await waitForTextState(
    page,
    (state) =>
      state.map?.label === "Renderer stress map" &&
      state.map.width === 100 &&
      state.map.height === 80 &&
      state.renderer.tilemap.staticGpuLayerCount === 2 &&
      state.renderer.tilemap.staticTileCount >= 8000 &&
      state.renderer.performance.pooling.activeSpriteCount > 0 &&
      state.renderer.performance.pooling.culledSpriteCount > 0 &&
      state.renderer.performance.proofs.tileBatching.compatible === true &&
      state.renderer.performance.proofs.viewportCulling.culledRatio > 0,
    9000,
  )
  assertRendererCapabilities(large)
  assert.equal(large.renderer.performance.lifecycle.phaserGameReused, true)
  assert.equal(large.renderer.performance.chunking.totalChunks, 12)
  assert.ok(large.renderer.performance.chunking.visibleChunks < 12)
  assert.ok(
    large.renderer.performance.pooling.reusedTextureCount > 0,
    "Expected object texture reuse during benchmark map switches.",
  )
  assert.ok(
    large.renderer.performance.pooling.reusedSpriteCount > 0,
    "Expected pooled object sprite reuse during benchmark map switches.",
  )
  await assertNonBlankMapScreenshot(page)

  const cadence = await measureFrameCadence(page)

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

async function assertInvalidMapPreflight(page) {
  const invalidAttempt = await page.evaluate(async () => {
    if (!window.__aedventureRendererTest?.attemptInvalidMap) {
      throw new Error("Missing invalid map preflight test API.")
    }

    return window.__aedventureRendererTest.attemptInvalidMap()
  })

  assert.equal(invalidAttempt.accepted, false)
  assert.match(
    invalidAttempt.error,
    /Renderer map preflight failed before Phaser mutation/,
  )
  assert.match(invalidAttempt.error, /Visual footprint/)
  assert.equal(invalidAttempt.after.activeMapId, invalidAttempt.before.activeMapId)
  assert.equal(
    invalidAttempt.after.mapRenderCount,
    invalidAttempt.before.mapRenderCount,
  )
  assert.notEqual(
    invalidAttempt.after.renderFingerprint,
    invalidAttempt.before.renderFingerprint,
    "Expected rejected map fingerprint to be reported without mutating the scene.",
  )

  const state = await renderGameToText(page)
  assert.equal(state.map.activeMapId, invalidAttempt.before.activeMapId)
  assert.equal(
    state.performance.lifecycle.mapRenderCount,
    invalidAttempt.before.mapRenderCount,
  )
}

async function assertEffectsLayerSmoke(page) {
  const baseline = await renderGameToText(page)
  assert.equal(baseline.effects.source, "renderer_runtime")
  assert.equal(baseline.effects.authority, "visual_only")
  assert.equal(baseline.effects.enabled, true)
  assert.equal(baseline.effects.quality, "premium")
  assert.equal(baseline.effects.deterministic, true)
  assert.equal(baseline.effects.animationMode, "static")
  assert.equal(baseline.effects.applied.lightPass, "static_room_lights")
  assert.equal(baseline.effects.applied.shadowPass, "static_corner_shadows")
  assert.equal(baseline.effects.applied.selectionOutlines, "zone_renderer")
  assert.equal(baseline.effects.applied.hoverOutlines, "zone_renderer")
  assert.equal(baseline.effects.applied.tenantLighting, "day")
  assert.ok(
    baseline.effects.objectCounts.ambientShapes >= 1,
    "Expected static ambient effect geometry.",
  )
  assert.ok(
    baseline.effects.objectCounts.lightShapes >= 1,
    "Expected static light pass geometry.",
  )
  assert.ok(
    baseline.effects.objectCounts.shadowShapes >= 1,
    "Expected static shadow pass geometry.",
  )
  if (baseline.effects.capability.filtersAvailable) {
    assert.ok(
      baseline.effects.applied.webglFilters.includes("camera_color_matrix"),
      "Expected low-cost camera color-matrix filter when Phaser filters are available.",
    )
  }

  const cadence = await measureFrameCadence(page)
  assert.ok(
    cadence.averageMs < 50,
    `Expected effects average frame cadence below collapse threshold, got ${cadence.averageMs}ms.`,
  )
  assert.ok(
    cadence.p95Ms < 90,
    `Expected effects p95 frame cadence below collapse threshold, got ${cadence.p95Ms}ms.`,
  )
  assert.ok(
    cadence.maxMs < 250,
    `Expected effects max frame cadence below collapse threshold, got ${cadence.maxMs}ms.`,
  )

  await page.evaluate(async () => {
    if (!window.__aedventureRendererTest?.setRendererEffects) {
      throw new Error("Missing renderer effects test API.")
    }

    await window.__aedventureRendererTest.setRendererEffects({
      lowCapabilityOverride: true,
    })
  })
  const lowCapability = await waitForTextState(
    page,
    (state) =>
      state.effects.enabled === false &&
      state.effects.disabledReason === "low_capability" &&
      state.effects.capability.lowCapability === true,
  )
  assert.equal(lowCapability.effects.objectCounts.ambientShapes, 0)
  assert.deepEqual(lowCapability.effects.applied.webglFilters, [])
  await assertNonBlankMapScreenshot(page)

  await page.evaluate(async () => {
    await window.__aedventureRendererTest.setRendererEffects({
      lowCapabilityOverride: false,
      enabled: true,
      quality: "auto",
      tenantLighting: "night",
    })
  })
  const night = await waitForTextState(
    page,
    (state) =>
      state.effects.enabled === true &&
      state.effects.applied.tenantLighting === "night" &&
      state.renderer.effects.applied.tenantLighting === "night",
  )
  assert.equal(night.effects.deterministic, true)
  await assertNonBlankMapScreenshot(page)

  await page.evaluate(async () => {
    await window.__aedventureRendererTest.setRendererEffects({
      tenantLighting: "day",
    })
  })
  await waitForTextState(
    page,
    (state) =>
      state.effects.enabled === true &&
      state.effects.applied.tenantLighting === "day",
  )
}

async function measureFrameCadence(page) {
  return page.evaluate(async () => {
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
  assert.equal(avatarState.avatars.animationCount, 64)
  assert.equal(avatarState.avatars.spriteAtlas.atlasId, "internal-avatar-atlas-v1")
  assert.equal(avatarState.avatars.spriteAtlas.renderMode, "sprite_atlas")
  assert.equal(avatarState.avatars.spriteAtlas.schemaVersion, 1)
  assert.equal(avatarState.avatars.spriteAtlas.frameCount, 352)
  assert.equal(
    avatarState.avatars.spriteAtlas.frameKeyStrategy,
    "avatar_action_server_direction_frame",
  )
  assert.equal(
    avatarState.avatars.spriteAtlas.generatedTextureSource,
    "runtime_canvas_sprite_frames",
  )
  assert.equal(
    avatarState.avatars.animationPipeline.renderer,
    "phaser_image_frame_swap",
  )
  assert.equal(
    avatarState.avatars.animationPipeline.turnBlending,
    "pose_blend",
  )
  assert.equal(
    avatarState.avatars.animationPipeline.emoteHooks,
    "renderer_emote_registry",
  )
  assert.equal(
    avatarState.avatars.labelVisibilityRules,
    "local_always_remote_overlap_suppressed",
  )
  assert.equal(avatarState.avatars.emoteHooks, "renderer_emote_registry")
  assert.equal(
    avatarState.avatars.animationPipeline.labelVisibilityRules,
    "local_always_remote_overlap_suppressed",
  )
  assert.deepEqual(
    avatarState.avatars.spriteAtlas.stateDefinitions.map((state) => [
      state.action,
      state.frameCount,
      state.frameRate,
      state.loop,
    ]),
    [
      ["idle", 4, 2, true],
      ["walk", 6, 9, true],
      ["run", 8, 12, true],
      ["turn", 4, 8, false],
    ],
  )
  assert.deepEqual(avatarState.avatars.animationStates, [
    "idle",
    "walk",
    "run",
    "turn",
  ])
  assert.equal(
    avatarState.avatars.visualDirectionModel,
    "server_4_way_visual_8_way",
  )
  assert.ok(
    avatarState.avatars.previewFixtures.length >= 128,
    "Expected avatar preview fixtures to cover avatar/state/visual-facing combinations.",
  )
  assert.equal(
    avatarState.devTools.availableFixtureIds.includes("avatar_preview_gallery"),
    true,
  )
  for (const facing of [
    "up",
    "upRight",
    "right",
    "downRight",
    "down",
    "downLeft",
    "left",
    "upLeft",
  ]) {
    assert.ok(
      avatarState.avatars.previewFixtures.some(
        (fixture) => fixture.visualFacing === facing,
      ),
      `Expected avatar preview fixture for visual facing ${facing}.`,
    )
  }
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
    assert.equal(player.labelPolicy, "local_always_remote_overlap_suppressed")
    assert.equal(player.labelResolution, 4)
    assert.equal(player.labelTextureFilter, "linear")
    assert.ok(
      player.labelScreenScale >= 0.72 && player.labelScreenScale <= 1.08,
      `Expected zoom-aware label scale, got ${player.labelScreenScale}.`,
    )
    assert.deepEqual(player.movementSmoothing, {
      mode: player.local
        ? "continuous_local_motion"
        : "remote_snapshot_buffer",
      logicalVertexRoundMode: "off",
      visualTransformIsolation: "inner_visual_root",
    })
    if (player.local) {
      assert.equal(player.remoteInterpolation, undefined)
    } else {
      assert.equal(player.remoteInterpolation.mode, "snapshot_buffer")
      assert.equal(
        player.remoteInterpolation.source,
        "server_snapshot_stream",
      )
      assert.equal(typeof player.remoteInterpolation.interpolationDelayMs, "number")
      assert.equal(typeof player.remoteInterpolation.extrapolationLimitMs, "number")
      assert.equal(typeof player.remoteInterpolation.bufferedSnapshotCount, "number")
      assert.equal(typeof player.remoteInterpolation.bufferedWindowMs, "number")
      assert.equal(typeof player.remoteInterpolation.extrapolating, "boolean")
      assert.equal(typeof player.remoteInterpolation.snapping, "boolean")
      assert.equal(typeof player.remoteInterpolation.velocity.x, "number")
      assert.equal(typeof player.remoteInterpolation.velocity.y, "number")
    }
    assert.equal(player.animation.action, "idle")
    assert.equal(player.animation.state, "idle")
    assert.equal(player.animation.pipeline, "sprite_atlas_metadata")
    assert.equal(player.animation.direction, player.animation.serverDirection)
    assert.match(player.animation.key, new RegExp(`^${avatarId}_idle_`))
    assert.equal(player.animation.sprite.atlasId, "internal-avatar-atlas-v1")
    assert.equal(player.animation.sprite.renderMode, "sprite_atlas")
    assert.equal(player.animation.sprite.frameCount, 4)
    assert.equal(player.animation.sprite.frameRate, 2)
    assert.equal(player.animation.sprite.frameDurationMs, 500)
    assert.equal(player.animation.sprite.loop, true)
    assert.equal(player.animation.sprite.blendDurationMs, 96)
    assert.equal(player.animation.frameRate, 2)
    assert.equal(player.animation.frameDurationMs, 500)
    assert.equal(player.animation.loop, true)
    assert.equal(typeof player.animation.transition.reason, "string")
    assert.equal(typeof player.animation.transition.preserveSpritePhase, "boolean")
    assert.equal(typeof player.animation.transition.restartedSpriteClock, "boolean")
    assert.equal(typeof player.animation.transition.turnHoldActive, "boolean")
    assert.equal(typeof player.animation.frameIndex, "number")
    assert.ok(
      player.animation.frameKey.startsWith(player.animation.sprite.framePrefix),
      `Expected current frame key to use sprite prefix, got ${JSON.stringify(player.animation)}.`,
    )
    assert.ok(
      player.animation.sprite.frameKeys.every((key) =>
        key.startsWith(player.animation.sprite.framePrefix),
      ),
      `Expected stable sprite frame keys, got ${JSON.stringify(player.animation.sprite)}.`,
    )
    assert.deepEqual(
      player.animation.sprite.textureKeys,
      player.animation.sprite.frameKeys,
    )
    assert.ok(
      [
        "up",
        "upRight",
        "right",
        "downRight",
        "down",
        "downLeft",
        "left",
        "upLeft",
      ].includes(player.animation.visualFacing),
      `Expected 8-way visual facing state, got ${JSON.stringify(player.animation)}.`,
    )
    assert.equal(typeof player.animation.poseBlendActive, "boolean")
    assert.ok(
      player.labelBounds.width * avatarState.camera.effectiveZoom >= 48,
      `Expected readable screen-space label width, got ${player.labelBounds.width} at zoom ${avatarState.camera.effectiveZoom}.`,
    )
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
        remote?.remoteInterpolation?.mode === "snapshot_buffer" &&
        remote?.remoteInterpolation?.bufferedSnapshotCount >= 2 &&
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
  const movingRemote = moving.avatars.players.find(
    (player) => player.playerId === "avatar-cobalt",
  )
  assert.ok(
    movingRemote.currentPosition.x !== movingRemote.targetPosition.x ||
      movingRemote.currentPosition.y !== movingRemote.targetPosition.y,
    `Expected remote avatar to be between grid cells while smoothing, got ${JSON.stringify(movingRemote)}.`,
  )
  assert.equal(movingRemote.animation.visualFacing, "downRight")
  assert.equal(movingRemote.animation.transition.reason, "idle_to_locomotion")
  assert.equal(movingRemote.animation.transition.preserveSpritePhase, false)
  assert.equal(movingRemote.animation.transition.restartedSpriteClock, true)
  assert.ok(
    movingRemote.remoteInterpolation.latestSnapshotAgeMs >= 0,
    `Expected remote snapshot age telemetry, got ${JSON.stringify(movingRemote.remoteInterpolation)}.`,
  )
  assert.equal(
    movingRemote.remoteInterpolation.source,
    "server_snapshot_stream",
  )

  await page.evaluate(async () => {
    await window.__aedventureRendererTest.moveAvatarFixturePlayer(
      "avatar-cobalt",
      { x: 320, y: 160 },
      "right",
    )
  })
  const directionBlend = await waitForTextState(
    page,
    (state) => {
      const remote = state.avatars.players.find(
        (player) => player.playerId === "avatar-cobalt",
      )

      return (
        remote?.animation.action === "walk" &&
        remote?.animation.visualFacing === "upRight" &&
        remote?.animation.transition.reason === "locomotion_direction_blend"
      )
    },
    9000,
  )
  const directionBlendRemote = directionBlend.avatars.players.find(
    (player) => player.playerId === "avatar-cobalt",
  )

  assert.equal(
    directionBlendRemote.animation.transition.preserveSpritePhase,
    true,
  )
  assert.equal(
    directionBlendRemote.animation.transition.restartedSpriteClock,
    false,
  )

  await waitForTextState(
    page,
    (state) => {
      const remote = state.avatars.players.find(
        (player) => player.playerId === "avatar-cobalt",
      )

      return remote?.interpolationActive === false &&
        remote?.targetPosition.x === 320 &&
        remote?.targetPosition.y === 160 &&
        remote?.animation.action === "idle"
    },
    9000,
  )

  await page.evaluate(async () => {
    await window.__aedventureRendererTest.moveAvatarFixturePlayer(
      "avatar-cobalt",
      { x: 320, y: 160 },
      "left",
    )
  })
  const turning = await waitForTextState(
    page,
    (state) => {
      const remote = state.avatars.players.find(
        (player) => player.playerId === "avatar-cobalt",
      )

      return (
        remote?.animation.action === "turn" &&
        remote?.animation.transition.reason === "idle_to_turn"
      )
    },
    9000,
  )
  const turningRemote = turning.avatars.players.find(
    (player) => player.playerId === "avatar-cobalt",
  )
  assert.equal(turningRemote.animation.transition.turnHoldActive, true)

  await waitForTextState(
    page,
    (state) => {
      const remote = state.avatars.players.find(
        (player) => player.playerId === "avatar-cobalt",
      )

      return (
        remote?.animation.action === "idle" &&
        remote?.animation.transition.reason === "turn_to_idle"
      )
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

  const gallery = await page.evaluate(async () => {
    if (!window.__aedventureRendererTest?.renderAvatarPreviewGallery) {
      throw new Error("Missing avatar preview gallery test API.")
    }

    return window.__aedventureRendererTest.renderAvatarPreviewGallery()
  })
  await page.evaluate(() => window.advanceTime())

  const galleryState = await waitForTextState(
    page,
    (state) =>
      state.map?.label === "Avatar preview gallery" &&
      state.avatars.players.length === 128 &&
      state.avatars.players.some(
        (player) =>
          player.animation.action === "run" &&
          player.animation.visualFacing === "downRight",
      ) &&
      state.avatars.players.some(
        (player) =>
          player.animation.action === "turn" &&
          player.animation.visualFacing === "upLeft",
      ),
    9000,
  )

  assert.equal(gallery.rows, 16)
  assert.equal(gallery.columns, 8)
  assert.deepEqual(gallery.avatarIds, ["ember", "cobalt", "moss", "violet"])
  assert.deepEqual(gallery.actions, ["idle", "walk", "run", "turn"])
  assert.deepEqual(gallery.visualFacings, [
    "up",
    "upRight",
    "right",
    "downRight",
    "down",
    "downLeft",
    "left",
    "upLeft",
  ])
  assert.equal(gallery.playerIds.length, 128)

  const galleryActions = new Set(
    galleryState.avatars.players.map((player) => player.animation.action),
  )
  const galleryFacings = new Set(
    galleryState.avatars.players.map((player) => player.animation.visualFacing),
  )

  assert.deepEqual([...galleryActions].sort(), ["idle", "run", "turn", "walk"])
  assert.deepEqual([...galleryFacings].sort(), [
    "down",
    "downLeft",
    "downRight",
    "left",
    "right",
    "up",
    "upLeft",
    "upRight",
  ])
  assert.ok(
    galleryState.avatars.players.every(
      (player) =>
        player.animation.pipeline === "sprite_atlas_metadata" &&
        player.animation.frameKey.startsWith(
          player.animation.sprite.framePrefix,
        ),
    ),
    "Expected every preview gallery avatar to render through sprite atlas frames.",
  )
  assert.ok(
    galleryState.renderer.depth.playerCount >= 128,
    `Expected renderer depth telemetry for all preview avatars, got ${galleryState.renderer.depth.playerCount}.`,
  )
  await assertNonBlankMapScreenshot(page)
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
      state.worldInteractions?.state === "available" &&
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
  assert.equal(zoneState.worldInteractions.authority, "server_permitted_actions_only")
  assert.equal(zoneState.worldInteractions.actionAffordance, "press_e_or_tap")
  assert.equal(zoneState.worldInteractions.hotkeyLabel, "E")
  assert.equal(zoneState.worldInteractions.tapLabel, "Tap")
  assert.deepEqual(zoneState.worldInteractions.presentation, {
    markerStyle: "action_marker_cards",
    selectionMode: "hover_click_marker",
    privateAreaFeedback: "none",
  })
  assert.equal(
    zoneState.worldInteractions.candidates.find(
      (candidate) => candidate.id === "zone:meeting-zone:join_meeting",
    )?.serverPermitted,
    true,
  )
  assert.equal(
    zoneState.worldInteractions.primaryCandidateId,
    "zone:meeting-zone:join_meeting",
  )
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
      state.worldInteractions?.permittedCandidateIds.includes(
        "zone:private-zone:enter_private",
      ) &&
      state.zones.zones.find((zone) => zone.id === "private-zone")
        ?.availableAction === "enter_private",
  )
  assert.equal(privateZone.meeting.panelState, "outside")
  assert.equal(privateZone.meeting.joinDisabled, true)
  assert.equal(
    privateZone.worldInteractions.presentation.privateAreaFeedback,
    "available",
  )
  assert.equal(privateZone.worldInteractions.actionAffordance, "press_e_or_tap")
  assert.equal(
    privateZone.zones.zones.find((zone) => zone.id === "private-zone")
      .markerVisible,
    true,
  )
  assert.equal(
    privateZone.zones.zones.find((zone) => zone.id === "private-zone").feedback,
    "private_access_available",
  )
  assert.equal(
    privateZone.zones.zones.find((zone) => zone.id === "private-zone").label,
    "Private access",
  )

  await page.evaluate(async () => {
    await window.__aedventureRendererTest.moveLocalPlayer({ x: 112, y: 208 })
  })
  const portalZone = await waitForTextState(
    page,
    (state) =>
      state.zones.activeZoneIds.includes("portal-door") &&
      state.worldInteractions?.permittedCandidateIds.includes(
        "zone:portal-door:enter_portal",
      ) &&
      state.worldInteractions?.candidates.find(
        (candidate) =>
          candidate.kind === "object" && candidate.action === "open_door",
      )?.markerVisible === true &&
      state.zones.zones.find((zone) => zone.id === "portal-door")
        ?.availableAction === "enter_portal",
  )
  assert.equal(portalZone.meeting.joinDisabled, true)
  assert.equal(portalZone.worldInteractions.actionAffordance, "press_e_or_tap")
  assert.equal(
    portalZone.zones.zones.find((zone) => zone.id === "portal-door")
      .markerVisible,
    true,
  )
  assert.equal(
    portalZone.zones.zones.find((zone) => zone.id === "portal-door").feedback,
    "portal_ready",
  )
  assert.ok(
    portalZone.worldInteractions.candidates.some(
      (candidate) => candidate.markerVisible && candidate.action === "open_door",
    ),
    "Expected a tappable door/object marker when portal area is active.",
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
    color.red > 55 &&
    color.green > 25 &&
    color.red >= color.blue + 20 &&
    color.green >= color.blue - 12 &&
    !isCobaltAvatarPixel(color)
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
