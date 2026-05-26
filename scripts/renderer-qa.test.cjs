const assert = require("node:assert")
const { mkdirSync, writeFileSync } = require("node:fs")
const { join } = require("node:path")
const { tmpdir } = require("node:os")
const { chromium } = require("playwright")
const { PNG } = require("pngjs")
const { startDevelopmentServer } = require("./dev-http-host.cjs")

const ARTIFACT_DIR =
  process.env.RENDERER_QA_ARTIFACT_DIR ?? join(tmpdir(), "aedventure-renderer-qa")

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 960, expectedMode: "desktop" },
  { name: "mobile", width: 390, height: 760, expectedMode: "mobile" },
]

const DEPTH_CASES = [
  "table_player_behind",
  "table_player_front",
  "wall_player_behind",
]
const AVATAR_VISUAL_FACINGS = [
  "up",
  "upRight",
  "right",
  "downRight",
  "down",
  "downLeft",
  "left",
  "upLeft",
]

async function main() {
  mkdirSync(ARTIFACT_DIR, { recursive: true })

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

  try {
    browser = await chromium.launch()
    const report = {
      artifactDir: ARTIFACT_DIR,
      rendererSnapshots: [],
      frameCadence: [],
      screenshots: [],
      depthCases: [],
      devTools: [],
      mapSwitchLeak: undefined,
      avatarFacingChecks: [],
      avatarFrameProgression: undefined,
      avatarTextureLeak: undefined,
    }

    await verifyRendererRuntime(browser, url, report)
    await verifyResponsiveScreenshots(browser, url, report)
    await verifyDevTools(browser, url, report)

    writeFileSync(
      join(ARTIFACT_DIR, "renderer-qa-report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    )
    console.log(`Renderer QA artifacts saved to ${ARTIFACT_DIR}`)
  } finally {
    if (browser) {
      await browser.close()
    }
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}

async function verifyRendererRuntime(browser, url, report) {
  const page = await newQaPage(browser, { width: 1440, height: 960 })

  try {
    await page.goto(`${url}/app`, { waitUntil: "domcontentloaded" })
    const initial = await waitForTextState(
      page,
      (state) =>
        state.map?.activeMapId === "lobby" &&
        state.lifecycle?.rendererReadiness === "ready" &&
        rendererReadyForQa(state),
    )
    assertRendererSnapshot(initial)
    report.rendererSnapshots.push(snapshotForReport("initial-lobby", initial))
    report.screenshots.push(
      await captureCanvas(page, "desktop-lobby-canvas.png"),
    )

    const baselineCadence = await measureFrameCadence(page)
    assertFrameCadence(initial.renderer.performance, baselineCadence)
    report.frameCadence.push({ label: "initial-lobby", ...baselineCadence })

    await page.locator("#start").click()
    const joined = await waitForTextState(
      page,
      (state) =>
        state.joined === true &&
        state.lifecycle?.phase === "joined" &&
        state.players.length >= 2 &&
        rendererReadyForQa(state),
    )
    assertRendererSnapshot(joined)
    assert.ok(joined.renderer.depth.playerCount >= 2)
    report.rendererSnapshots.push(snapshotForReport("joined-lobby", joined))
    report.screenshots.push(
      await captureCanvas(page, "desktop-joined-canvas.png"),
    )

    const benchmark = await runMapSwitchLeakCheck(page)
    report.mapSwitchLeak = benchmark
    const stress = await waitForTextState(
      page,
      (state) =>
        state.map?.label === "Renderer stress map" &&
        state.map.width === 100 &&
        state.map.height === 80 &&
        state.renderer.performance.pooling.activeSpriteCount > 0 &&
        rendererReadyForQa(state),
      9000,
    )
    assertRendererSnapshot(stress)
    report.rendererSnapshots.push(snapshotForReport("stress-map", stress))
    report.screenshots.push(await captureCanvas(page, "stress-map-canvas.png"))

    const stressCadence = await measureFrameCadence(page)
    assertFrameCadence(stress.renderer.performance, stressCadence)
    report.frameCadence.push({ label: "stress-map", ...stressCadence })

    for (const caseId of DEPTH_CASES) {
      const depthCase = await page.evaluate(async (id) => {
        if (!window.__aedventureRendererTest?.renderDepthFixtureCase) {
          throw new Error("Missing renderer depth fixture API.")
        }

        return window.__aedventureRendererTest.renderDepthFixtureCase(id)
      }, caseId)
      await page.evaluate(() => window.advanceTime())

      const state = await waitForTextState(
        page,
        (current) =>
          current.map?.label === `Depth case: ${caseId}` &&
          current.renderer.depth.playerCount === 1 &&
          current.renderer.depth.objectCount >= 1 &&
          rendererReadyForQa(current),
        9000,
      )
      assertRendererSnapshot(state)
      assertDepthOrdering(state, depthCase)
      const screenshot = await captureCanvas(
        page,
        `depth-${caseId}-canvas.png`,
      )
      const depthStats = await assertDepthScreenshot(page, state, depthCase)
      report.depthCases.push({
        caseId,
        expectedLayerAtSample: depthCase.expectedLayerAtSample,
        occluderTokenId: depthCase.occluderTokenId,
        screenshot,
        depthStats,
      })
    }

    const gallery = await page.evaluate(async () => {
      if (!window.__aedventureRendererTest?.renderAvatarPreviewGallery) {
        throw new Error("Missing avatar preview gallery API.")
      }

      return window.__aedventureRendererTest.renderAvatarPreviewGallery()
    })
    await page.evaluate(() => window.advanceTime())

    const galleryState = await waitForTextState(
      page,
      (state) =>
        state.map?.label === "Avatar preview gallery" &&
        state.avatars.players.length === 128 &&
        state.renderer.depth.playerCount >= 128 &&
        state.avatars.players.some(
          (player) =>
            player.animation.action === "run" &&
            player.animation.visualFacing === "downRight",
        ) &&
        rendererReadyForQa(state),
      9000,
    )
    assertRendererSnapshot(galleryState)
    assert.equal(gallery.rows, 16)
    assert.equal(gallery.columns, 8)
    assert.deepEqual(gallery.actions, ["idle", "walk", "run", "turn"])
    assert.equal(gallery.playerIds.length, 128)
    report.rendererSnapshots.push(
      snapshotForReport("avatar-preview-gallery", galleryState),
    )
    const galleryScreenshot = await captureCanvasWithBuffer(
      page,
      "avatar-preview-gallery-canvas.png",
    )
    report.screenshots.push(galleryScreenshot.screenshot)
    report.avatarFacingChecks = assertAvatarFacingScreenshot(
      galleryScreenshot.buffer,
      galleryState,
    )
    const progressedGalleryState = await waitForProgressedAvatarGallery(page)
    report.avatarFrameProgression = assertAvatarFrameProgression(
      galleryState,
      progressedGalleryState,
    )
    report.avatarTextureLeak = await runAvatarTextureLeakCheck(
      page,
      progressedGalleryState,
    )
  } finally {
    assertNoConsoleErrors(page, "desktop renderer runtime")
    await page.close()
  }
}

async function verifyResponsiveScreenshots(browser, url, report) {
  for (const viewport of VIEWPORTS) {
    const page = await newQaPage(browser, {
      width: viewport.width,
      height: viewport.height,
    })

    try {
      await page.goto(`${url}/app`, { waitUntil: "domcontentloaded" })
      const initial = await waitForTextState(
        page,
        (state) =>
          state.map?.activeMapId === "lobby" &&
          state.lifecycle?.rendererReadiness === "ready" &&
          rendererReadyForQa(state),
      )
      assert.equal(initial.layout.mode, viewport.expectedMode)
      assert.equal(initial.camera.localPlayerVisible, true)
      assertRendererSnapshot(initial)

      const screenshotPath = join(
        ARTIFACT_DIR,
        `${viewport.name}-responsive-page.png`,
      )
      await page.screenshot({ path: screenshotPath, fullPage: true })
      report.screenshots.push({
        label: `${viewport.name}-responsive-page`,
        path: screenshotPath,
      })
      report.screenshots.push(
        await captureCanvas(page, `${viewport.name}-responsive-canvas.png`),
      )
    } finally {
      assertNoConsoleErrors(page, `${viewport.name} responsive renderer`)
      await page.close()
    }
  }
}

async function verifyDevTools(browser, url, report) {
  const page = await newQaPage(browser, { width: 1280, height: 900 })

  try {
    await page.goto(
      `${url}/app?devtools=1&devGrid=1&devCollision=1&devZones=1&devDepth=1&devObjectFootprints=1&devSpriteBounds=1&devCamera=1&devFixture=zone_fixture`,
      { waitUntil: "domcontentloaded" },
    )
    const initial = await waitForTextState(
      page,
      (state) =>
        state.devTools?.gated === true &&
        state.devTools?.enabled === true &&
        state.devTools?.activeFixtureId === "zone_fixture" &&
        state.map?.label === "Zone fixture" &&
        state.devTools.renderer?.overlays?.grid === true &&
        state.devTools.renderer?.overlays?.collision === true &&
        state.devTools.renderer?.overlays?.zones === true &&
        state.devTools.renderer?.overlays?.depth === true &&
        state.devTools.renderer?.overlays?.objectFootprints === true &&
        state.devTools.renderer?.overlays?.spriteBounds === true &&
        state.devTools.renderer?.overlays?.camera === true,
      9000,
    )

    assert.equal(initial.devTools.primaryUiControlsExposed, 0)
    assert.equal(initial.devTools.menu.visible, true)
    assert.equal(initial.devTools.menu.overlayControlCount, 7)
    assert.equal(initial.devTools.menu.fixtureOptionCount, 13)
    assert.equal(initial.devTools.menu.selectedFixtureId, "zone_fixture")
    assert.deepEqual(
      initial.devTools.menu.checkedOverlayIds.sort(),
      [
        "camera",
        "collision",
        "depth",
        "grid",
        "objectFootprints",
        "spriteBounds",
        "zones",
      ].sort(),
    )
    assert.equal(initial.devTools.feelPanel.visible, true)
    assert.equal(initial.devTools.feelPanel.presetCount, 5)
    assert.equal(initial.devTools.feelPanel.activePresetId, "default")
    assert.equal(initial.devTools.feelPanel.controlCount, 13)
    assert.equal(initial.movement.feel.panelVisible, true)
    assert.equal(initial.movement.feel.activePresetId, "default")
    assert.deepEqual(
      initial.movement.feel.presets.map((preset) => preset.id),
      ["default", "snappy", "smooth", "heavy", "mobile"],
    )
    assert.equal(
      initial.movement.feel.values.turnResponseTimeConstantMs,
      18,
    )
    assert.equal(initial.movement.feel.values.collisionBodyRadiusPx, 7.5)
    assert.equal(initial.movement.prediction.collisionBody.radiusPx, 7.5)
    assert.equal(initial.zones.debugOverlayEnabled, true)
    assert.equal(initial.renderer.depth.debugOverlayEnabled, true)
    assert.ok(initial.devTools.renderer.overlayObjectCounts.gridLineCount > 0)
    assert.ok(initial.devTools.renderer.overlayObjectCounts.blockedTileCount > 0)
    assert.ok(initial.devTools.renderer.overlayObjectCounts.zoneBoundsCount > 0)
    assert.ok(initial.devTools.renderer.overlayObjectCounts.depthAnchorCount > 0)
    assert.ok(
      initial.devTools.renderer.overlayObjectCounts.objectFootprintCount > 0,
    )
    assert.ok(initial.devTools.renderer.overlayObjectCounts.spriteBoundsCount > 0)
    assert.equal(initial.devTools.renderer.cameraReadout.mode, initial.camera.mode)
    assert.ok(
      initial.devTools.renderer.fixtureSelector.availableFixtureIds.includes(
        "stress_100x80",
      ),
    )
    assert.ok(
      initial.devTools.renderer.fixtureSelector.availableFixtureIds.includes(
        "avatar_preview_gallery",
      ),
    )
    assert.deepEqual(
      await page.locator("[data-devtools-control]").count(),
      0,
      "Expected no product-facing developer controls.",
    )
    report.devTools.push({
      label: "query-param-gated",
      activeFixtureId: initial.devTools.activeFixtureId,
      overlays: initial.devTools.overlays,
      overlayObjectCounts: initial.devTools.renderer.overlayObjectCounts,
    })
    const devToolsPagePath = join(ARTIFACT_DIR, "devtools-page.png")
    await page.screenshot({ path: devToolsPagePath, fullPage: true })
    report.screenshots.push({
      label: "devtools-page",
      path: devToolsPagePath,
    })
    report.screenshots.push(await captureCanvas(page, "devtools-zone-canvas.png"))

    await page.locator('[data-feel-preset="smooth"]').click()
    const smoothFeel = await waitForTextState(
      page,
      (state) =>
        state.movement?.feel?.activePresetId === "smooth" &&
        state.devTools?.feelPanel?.activePresetId === "smooth" &&
        state.movement?.feel?.values?.turnResponseTimeConstantMs === 34 &&
        state.movement?.motion?.feel?.values?.activeCorrectionTimeConstantMs ===
          260,
    )
    assert.equal(smoothFeel.movement.feel.activePresetLabel, "Smooth")
    assert.ok(
      smoothFeel.movement.debugLog.some((entry) =>
        /feel-preset: smooth/.test(entry),
      ),
      "Expected movement trace to record smooth preset selection.",
    )

    await page.locator('[data-feel-range="turnResponseTimeConstantMs"]').fill("9")
    const tunedFeel = await waitForTextState(
      page,
      (state) =>
        state.movement?.feel?.activePresetId === "custom" &&
        state.movement?.feel?.values?.turnResponseTimeConstantMs === 9 &&
        state.movement?.motion?.feel?.values?.turnResponseTimeConstantMs === 9,
    )
    assert.equal(
      tunedFeel.movement.feel.values.turnResponseTimeConstantMs,
      9,
    )
    assert.ok(
      tunedFeel.movement.debugLog.some((entry) =>
        /feel: turnResponseTimeConstantMs=9ms/.test(entry),
      ),
      "Expected movement trace to record live feel tuning.",
    )
    const apiTunedFeel = await page.evaluate(() => {
      if (!window.__aedventureMovementFeel?.setValue) {
        throw new Error("Missing movement feel dev API.")
      }

      return window.__aedventureMovementFeel.setValue(
        "collisionSlideSpeedScale",
        0.65,
      )
    })
    assert.equal(apiTunedFeel.values.collisionSlideSpeedScale, 0.65)
    const bodyTunedFeel = await page.evaluate(() => {
      if (!window.__aedventureMovementFeel?.setValue) {
        throw new Error("Missing movement feel dev API.")
      }

      return window.__aedventureMovementFeel.setValue(
        "collisionBodyRadiusPx",
        7,
      )
    })
    assert.equal(bodyTunedFeel.values.collisionBodyRadiusPx, 7)
    const mobilePreset = await page.evaluate(() => {
      if (!window.__aedventureMovementFeel?.setPreset) {
        throw new Error("Missing movement feel preset dev API.")
      }

      return window.__aedventureMovementFeel.setPreset("mobile")
    })
    assert.equal(mobilePreset.activePresetId, "mobile")
    assert.equal(mobilePreset.values.runSpeedPxPerSecond, 138)
    assert.equal(mobilePreset.values.analogCurveExponent, 0.75)
    report.devTools.push({
      label: "movement-feel-tuning",
      presetIds: smoothFeel.movement.feel.presets.map((preset) => preset.id),
      selectedPresetId: mobilePreset.activePresetId,
      turnResponseTimeConstantMs:
        tunedFeel.movement.feel.values.turnResponseTimeConstantMs,
      collisionSlideSpeedScale: apiTunedFeel.values.collisionSlideSpeedScale,
      collisionBodyRadiusPx: bodyTunedFeel.values.collisionBodyRadiusPx,
    })

    await page.keyboard.press("Alt+Shift+C")
    const collisionOff = await waitForTextState(
      page,
      (state) =>
        state.devTools?.overlays?.collision === false &&
        state.devTools.renderer?.overlays?.collision === false &&
        !state.devTools.menu.checkedOverlayIds.includes("collision"),
    )
    assert.equal(collisionOff.devTools.enabled, true)
    report.devTools.push({
      label: "keyboard-collision-toggle",
      activeFixtureId: collisionOff.devTools.activeFixtureId,
      overlays: collisionOff.devTools.overlays,
    })

    await page.locator('[data-dev-overlay-control="objectFootprints"]').uncheck()
    const footprintOff = await waitForTextState(
      page,
      (state) =>
        state.devTools?.overlays?.objectFootprints === false &&
        state.devTools.renderer?.overlays?.objectFootprints === false &&
        !state.devTools.menu.checkedOverlayIds.includes("objectFootprints"),
    )
    assert.equal(footprintOff.devTools.menu.visible, true)
    report.devTools.push({
      label: "menu-object-footprint-toggle",
      overlays: footprintOff.devTools.overlays,
      checkedOverlayIds: footprintOff.devTools.menu.checkedOverlayIds,
    })

    await page.keyboard.press("Alt+Shift+F")
    const nextFixture = await waitForTextState(
      page,
      (state) =>
        state.devTools?.activeFixtureId === "stress_20x15" &&
        state.map?.label === "Renderer stress map" &&
        state.map?.width === 20 &&
        state.map?.height === 15,
      9000,
    )
    assert.equal(nextFixture.devTools.renderer.fixtureSelector.activeFixtureId, "stress_20x15")
    report.devTools.push({
      label: "keyboard-fixture-next",
      activeFixtureId: nextFixture.devTools.activeFixtureId,
      map: {
        label: nextFixture.map.label,
        width: nextFixture.map.width,
        height: nextFixture.map.height,
      },
    })
    report.screenshots.push(await captureCanvas(page, "devtools-stress-canvas.png"))
  } finally {
    assertNoConsoleErrors(page, "developer renderer tools")
    await page.close()
  }
}

async function newQaPage(browser, viewport) {
  const page = await browser.newPage({ viewport })
  const consoleErrors = []

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text())
    }
  })
  page.on("pageerror", (error) => {
    consoleErrors.push(error.stack || error.message)
  })
  page.rendererQaConsoleErrors = consoleErrors

  return page
}

function assertNoConsoleErrors(page, label) {
  assert.equal(
    page.rendererQaConsoleErrors.length,
    0,
    `${label}: browser console errors\n${JSON.stringify(
      page.rendererQaConsoleErrors,
      null,
      2,
    )}`,
  )
}

async function runMapSwitchLeakCheck(page) {
  const benchmark = await page.evaluate(async () => {
    if (!window.__aedventureRendererTest?.runBigMapBenchmark) {
      throw new Error("Missing renderer benchmark API.")
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
  assert.ok(
    benchmark.repeatedLargeMapDisplayObjectDelta <= 2,
    `Expected repeated large-map display objects to stay bounded, got ${benchmark.repeatedLargeMapDisplayObjectDelta}.`,
  )
  assert.ok(
    benchmark.repeatedLargeMapTextureDelta <= 0,
    `Expected repeated large-map texture count not to grow, got ${benchmark.repeatedLargeMapTextureDelta}.`,
  )
  assert.equal(
    benchmark.repeatedLargeMapCreatedSpriteDelta,
    0,
    "Expected repeated large-map switch not to allocate more object sprites.",
  )
  assert.equal(
    benchmark.repeatedLargeMapCreatedTextureDelta,
    0,
    "Expected repeated large-map switch not to allocate more object textures.",
  )
  assert.deepEqual(benchmark.proof, {
    passed: true,
    benchmarkMapsCovered: true,
    tileBatching: true,
    staticLayerBaking: true,
    viewportCulling: true,
    objectPooling: true,
    textureReuse: true,
    noMapSwitchLeaks: true,
  })

  benchmark.samples.forEach((sample) => {
    assertRendererPerformance(sample.performance)
    assert.ok(sample.staticTileCount >= 20 * 15)
    assert.ok(sample.objectCount > 0)
    assert.ok(sample.mapRenderDurationMs >= 0)
    assert.equal(sample.performance.lifecycle.phaserGameReused, true)
    assert.equal(sample.proof.tileBatching, true)
    assert.equal(sample.proof.staticLayerBaking, true)
    assert.equal(sample.proof.viewportCullingAccounted, true)
    assert.equal(sample.proof.viewportCullingActive, true)
    assert.equal(sample.proof.objectPoolingActive, true)
    assert.equal(sample.proof.objectPoolReuseObserved, true)
    assert.equal(sample.proof.textureReuseObserved, true)
  })

  return {
    sampleCount: benchmark.samples.length,
    gameInstanceIds: benchmark.gameInstanceIds,
    repeatedLargeMapDisplayObjectDelta:
      benchmark.repeatedLargeMapDisplayObjectDelta,
    repeatedLargeMapTextureDelta: benchmark.repeatedLargeMapTextureDelta,
    repeatedLargeMapCreatedSpriteDelta:
      benchmark.repeatedLargeMapCreatedSpriteDelta,
    repeatedLargeMapCreatedTextureDelta:
      benchmark.repeatedLargeMapCreatedTextureDelta,
    proof: benchmark.proof,
    samples: benchmark.samples.map((sample) => ({
      pass: sample.pass,
      size: sample.size,
      staticTileCount: sample.staticTileCount,
      objectCount: sample.objectCount,
      mapRenderDurationMs: sample.mapRenderDurationMs,
      displayObjectCount: sample.performance.runtime.displayObjectCount,
      textureCount: sample.performance.runtime.textureCount,
      tileBatching: sample.proof.tileBatching,
      staticLayerBaking: sample.proof.staticLayerBaking,
      viewportCulling: {
        visible:
          sample.performance.proofs.viewportCulling.visibleObjectSpriteCount,
        culled: sample.performance.proofs.viewportCulling.culledObjectSpriteCount,
        ratio: sample.performance.proofs.viewportCulling.culledRatio,
      },
      objectPooling: sample.proof.objectPoolReuseObserved,
      textureReuse: sample.proof.textureReuseObserved,
    })),
  }
}

async function waitForProgressedAvatarGallery(page) {
  await page.waitForTimeout(850)

  return waitForTextState(
    page,
    (state) => {
      const runSample = avatarPreviewPlayer(
        state,
        "ember",
        "run",
        "downRight",
      )
      const walkSample = avatarPreviewPlayer(
        state,
        "cobalt",
        "walk",
        "upRight",
      )
      const idleSample = avatarPreviewPlayer(
        state,
        "moss",
        "idle",
        "downLeft",
      )

      return state.map?.label === "Avatar preview gallery" &&
        runSample?.animation.frameProgression.rawFrameIndex >= 2 &&
        walkSample?.animation.frameProgression.rawFrameIndex >= 2 &&
        idleSample?.animation.frameProgression.rawFrameIndex >= 1
    },
    9000,
  )
}

function assertAvatarFrameProgression(beforeState, afterState) {
  const samples = [
    ["ember", "run", "downRight"],
    ["cobalt", "walk", "upRight"],
    ["moss", "idle", "downLeft"],
  ].map(([avatarId, action, visualFacing]) => {
    const before = avatarPreviewPlayer(beforeState, avatarId, action, visualFacing)
    const after = avatarPreviewPlayer(afterState, avatarId, action, visualFacing)

    assert.ok(
      before,
      `Missing initial avatar frame sample ${avatarId}/${action}/${visualFacing}.`,
    )
    assert.ok(
      after,
      `Missing progressed avatar frame sample ${avatarId}/${action}/${visualFacing}.`,
    )

    const beforeProgression = before.animation.frameProgression
    const afterProgression = after.animation.frameProgression

    assert.equal(beforeProgression.source, "phaser_animation_manager")
    assert.equal(afterProgression.source, "phaser_animation_manager")
    assert.equal(afterProgression.frameCount, after.animation.sprite.frameCount)
    assert.equal(afterProgression.loop, after.animation.sprite.loop)
    assert.ok(
      afterProgression.elapsedMs > beforeProgression.elapsedMs,
      `Expected elapsed frame time to advance for ${after.playerId}.`,
    )
    assert.ok(
      afterProgression.rawFrameIndex > beforeProgression.rawFrameIndex,
      `Expected raw frame index to advance for ${after.playerId}.`,
    )
    assert.ok(
      afterProgression.currentFrameIndex >= 0 &&
        afterProgression.currentFrameIndex < afterProgression.frameCount,
      `Expected bounded current frame index for ${after.playerId}.`,
    )
    assert.ok(
      after.animation.frameKey.endsWith(
        `/${String(afterProgression.currentFrameIndex).padStart(2, "0")}`,
      ),
      `Expected frame key to match progression telemetry for ${after.playerId}.`,
    )

    return {
      playerId: after.playerId,
      action,
      visualFacing,
      before: compactFrameProgression(beforeProgression),
      after: compactFrameProgression(afterProgression),
      frameKey: after.animation.frameKey,
      textureKey: after.animation.textureKey,
      nativeAnimation: {
        key: after.animation.nativeAnimation.key,
        registered: after.animation.nativeAnimation.registered,
        playing: after.animation.nativeAnimation.playing,
        progress: after.animation.nativeAnimation.progress,
      },
    }
  })

  return {
    source: "avatar_animation_frame_progression",
    sampleCount: samples.length,
    samples,
  }
}

async function runAvatarTextureLeakCheck(page, galleryState) {
  const firstFullGallery = await waitForFullAvatarFrameCache(page)
  const firstTextureCount =
    firstFullGallery.renderer.performance.runtime.textureCount
  const firstAvatarTextureCount = uniqueAvatarTextureCount(firstFullGallery)

  await dispatchRendererTestCommand(page, "renderLargeStaticMap", {
    width: 20,
    height: 15,
  })
  const mapState = await waitForTextState(
    page,
    (state) =>
      state.map?.label === "Renderer stress map" &&
      state.map.width === 20 &&
      state.map.height === 15 &&
      rendererReadyForQa(state),
    9000,
  )

  await dispatchRendererTestCommand(page, "renderAvatarPreviewGallery")
  const secondFullGallery = await waitForFullAvatarFrameCache(page)

  await dispatchRendererTestCommand(page, "renderAvatarPreviewGallery")
  const thirdFullGallery = await waitForFullAvatarFrameCache(page)

  const secondTextureCount =
    secondFullGallery.renderer.performance.runtime.textureCount
  const thirdTextureCount =
    thirdFullGallery.renderer.performance.runtime.textureCount
  const expectedVisibleAvatarTextureCount = 128

  assert.equal(
    uniqueAvatarTextureCount(galleryState),
    expectedVisibleAvatarTextureCount,
    "Expected avatar gallery to expose one visible texture per preview avatar.",
  )
  assert.equal(
    firstAvatarTextureCount,
    expectedVisibleAvatarTextureCount,
    "Expected fully-cycled gallery to keep one current texture per preview avatar.",
  )
  assert.equal(
    uniqueAvatarTextureCount(secondFullGallery),
    expectedVisibleAvatarTextureCount,
    "Expected avatar texture keys to remain bounded after map switch.",
  )
  assert.equal(
    uniqueAvatarTextureCount(thirdFullGallery),
    expectedVisibleAvatarTextureCount,
    "Expected avatar texture keys to remain bounded after avatar switch.",
  )
  assert.ok(
    secondTextureCount <= firstTextureCount + 4,
    `Expected map -> avatar switch texture count to stay bounded, got ${firstTextureCount} -> ${secondTextureCount}.`,
  )
  assert.ok(
    thirdTextureCount <= secondTextureCount,
    `Expected repeated avatar gallery texture count not to grow, got ${secondTextureCount} -> ${thirdTextureCount}.`,
  )

  return {
    source: "avatar_texture_switch_leak_check",
    fullyCycledGalleryTextureCount: firstTextureCount,
    intermediateMapTextureCount:
      mapState.renderer.performance.runtime.textureCount,
    secondGalleryTextureCount: secondTextureCount,
    thirdGalleryTextureCount: thirdTextureCount,
    mapToAvatarTextureDelta: secondTextureCount - firstTextureCount,
    repeatedAvatarTextureDelta: thirdTextureCount - secondTextureCount,
    visibleAvatarTextureCount: expectedVisibleAvatarTextureCount,
    firstAvatarTextureCount,
    secondAvatarTextureCount: uniqueAvatarTextureCount(secondFullGallery),
    thirdAvatarTextureCount: uniqueAvatarTextureCount(thirdFullGallery),
  }
}

async function dispatchRendererTestCommand(page, commandName, ...args) {
  await page.evaluate(
    ({ commandName, args }) => {
      const api = window.__aedventureRendererTest
      const command = api?.[commandName]

      if (typeof command !== "function") {
        throw new Error(`Missing renderer test API: ${commandName}`)
      }

      void Promise.resolve(command(...args)).catch((error) => {
        console.error(error instanceof Error ? error.stack : String(error))
      })
    },
    { commandName, args },
  )
}

async function waitForFullAvatarFrameCache(page) {
  await page.waitForTimeout(2300)

  return waitForTextState(
    page,
    (state) =>
      state.map?.label === "Avatar preview gallery" &&
      state.avatars.players.length === 128 &&
      rendererReadyForQa(state),
    9000,
  )
}

function uniqueAvatarTextureCount(state) {
  return new Set(
    state.avatars.players.map((player) => player.animation.textureKey),
  ).size
}

function avatarPreviewPlayer(state, avatarId, action, visualFacing) {
  return state.avatars?.players?.find(
    (player) =>
      player.playerId ===
      `avatar-preview-${avatarId}-${action}-${visualFacing}`,
  )
}

function compactFrameProgression(progression) {
  return {
    source: progression.source,
    elapsedMs: progression.elapsedMs,
    rawFrameIndex: progression.rawFrameIndex,
    currentFrameIndex: progression.currentFrameIndex,
    frameCount: progression.frameCount,
    normalizedCycleProgress: progression.normalizedCycleProgress,
  }
}

function assertRendererSnapshot(state) {
  assert.equal(state.renderer.requestedRenderer, "webgl")
  assert.equal(state.renderer.actualRenderer, "webgl")
  assert.equal(state.renderer.webgl.available, true)
  assert.equal(state.renderer.webgl.contextLost, false)
  assert.equal(state.renderer.webgl.recoveryReady, true)
  assert.ok(state.renderer.webgl.maxTextureSize >= 1024)
  assert.equal(state.renderer.scenes.source, "phaser_scene_manager")
  assert.equal(state.renderer.scenes.bootSceneKey, "RendererLoadingScene")
  assert.equal(state.renderer.scenes.worldSceneKey, "OfficeScene")
  assert.ok(state.renderer.scenes.activeSceneKeys.includes("OfficeScene"))
  assert.ok(
    state.renderer.scenes.registeredSceneKeys.includes("RendererLoadingScene"),
  )
  assert.ok(state.renderer.scenes.registeredSceneKeys.includes("OfficeScene"))
  assert.ok(
    state.renderer.scenes.plannedSceneKeys.includes(
      "GeneratedRoomPreviewScene",
    ),
  )
  assert.ok(
    state.renderer.scenes.scenes.some(
      (scene) => scene.key === "OfficeScene" && scene.status === "active",
    ),
  )
  assert.equal(state.renderer.assets.primarySource, "internal_atlas")
  assert.equal(state.renderer.assets.atlasLoaded, true)
  assert.equal(
    state.renderer.assets.loader.source,
    "phaser_loader_asset_pack",
  )
  assert.equal(state.renderer.assets.loader.progress.complete, true)
  assert.equal(state.renderer.assets.loader.progress.failedFiles, 0)
  assert.ok(state.renderer.assets.loader.loadedSections.includes("core-office"))
  assert.ok(
    state.renderer.assets.loader.cache.jsonKeys.includes(
      "aedventure.office.atlas.manifest",
    ),
  )
  assert.ok(
    state.renderer.assets.loader.cache.textureKeys.includes(
      "aedventure.office.atlas.image",
    ),
  )
  assert.equal(state.renderer.assets.metadata.sourceLicenseValidated, true)
  assert.equal(state.renderer.assets.metadata.atlasBuildValidated, true)
  assert.ok(state.renderer.assets.metadata.collisionFootprintCount >= 20)
  assert.ok(state.renderer.assets.metadata.occlusionSplitCount >= 6)
  assert.equal(state.renderer.tilemap.staticGpuLayerCount, 2)
  assert.equal(state.renderer.tilemap.objectLayerMode, "sprites")
  assert.equal(state.renderer.tilemap.staticLayerBake.enabled, true)
  assert.equal(
    state.renderer.tilemap.staticLayerBake.mode,
    "single_render_texture",
  )
  assert.equal(state.renderer.tilemap.staticLayerBake.sourceLayerCount, 2)
  assert.equal(state.renderer.tilemap.staticLayerBake.bakedLayerCount, 1)
  assert.ok(state.renderer.tilemap.staticLayerBake.displayObjectReduction >= 1)
  assert.ok(
    state.renderer.effects.applied.customWebglPipelines.includes(
      "ShaderQuad:aedventure_room_lighting",
    ),
    "Expected custom WebGL room-lighting shader pipeline.",
  )
  assert.equal(
    state.renderer.effects.applied.shaderPass,
    "custom_room_lighting_shader",
  )
  assert.equal(state.renderer.effects.applied.zoneGlow, "custom_zone_glow_shader")
  assert.ok(
    state.renderer.effects.applied.particleEffects.includes(
      "room_entry_transition",
    ),
    "Expected room-entry particles in renderer snapshot.",
  )
  assert.equal(state.renderer.effects.objectCounts.shaderPasses, 1)
  assert.equal(state.renderer.effects.objectCounts.shaderObjects, 1)
  assert.ok(state.renderer.effects.objectCounts.particleEmitters >= 1)
  assert.equal(state.renderer.effects.objectCounts.particleTextures, 1)
  assert.ok(state.renderer.effects.objectCounts.particleAliveBudget <= 96)
  assert.equal(state.renderer.effects.capability.shadersAvailable, true)
  assert.equal(state.renderer.effects.capability.particlesAvailable, true)
  assert.equal(state.camera.secondary.source, "phaser_camera_manager")
  assert.ok(state.camera.secondary.totalCameraCount >= 2)
  const overviewExpected =
    state.camera.viewportWidth >= 540 && state.camera.viewportHeight >= 360
  if (overviewExpected) {
    assert.equal(state.camera.secondary.mode, "main_plus_overview")
    assert.ok(state.camera.secondary.visibleCameraCount >= 2)
    assert.ok(
      state.camera.secondary.secondaryCameras.some(
        (camera) =>
          camera.id === "overview-minimap" &&
          camera.role === "minimap_overview" &&
          camera.active &&
          camera.renderTarget === "same_scene_overlay",
      ),
      "Expected active overview minimap secondary camera.",
    )
  } else {
    assert.equal(state.camera.secondary.mode, "main_only")
  }
  assert.equal(state.renderer.mapValidation.valid, true)
  assert.equal(state.renderer.mapValidation.mutationSafe, true)
  assert.equal(state.renderer.performance.runtime.textureCount > 0, true)
  assert.equal(state.renderer.performance.runtime.displayObjectCount > 0, true)
  assert.equal(typeof state.renderer.depth.objectCount, "number")
  assert.equal(typeof state.renderer.depth.playerCount, "number")
  assert.equal(state.avatars.spriteAtlas.atlasImport.source, "avatar_atlas_manifest")
  assert.equal(
    state.avatars.spriteAtlas.atlasImport.activeSource,
    "runtime_generated_fallback",
  )
  assert.equal(state.avatars.spriteAtlas.atlasImport.contractValidated, true)
  assertRendererPerformance(state.renderer.performance)
}

function rendererReadyForQa(state) {
  return (
    state.renderer?.assets?.primarySource === "internal_atlas" &&
    state.renderer.assets.atlasLoaded === true &&
    state.renderer.assets.fallbackTokenCount === 0 &&
    state.renderer.mapValidation?.valid === true
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
  assert.equal(performance.lifecycle.phaserGameReused, true)
  assert.equal(typeof performance.lifecycle.mapRenderCount, "number")
  assert.equal(typeof performance.lifecycle.mapSwitchCount, "number")
  assert.equal(typeof performance.runtime.lastMapRenderDurationMs, "number")
  assert.equal(typeof performance.runtime.displayObjectCount, "number")
  assert.equal(typeof performance.runtime.textureCount, "number")
  assert.equal(typeof performance.pooling.activeSpriteCount, "number")
  assert.equal(typeof performance.pooling.visibleSpriteCount, "number")
  assert.equal(typeof performance.pooling.culledSpriteCount, "number")
  assert.match(performance.proofs.mapSize, /^\d+x\d+$/)
  assert.equal(typeof performance.proofs.tileBatching.compatible, "boolean")
  assert.equal(typeof performance.proofs.staticLayerBaking.enabled, "boolean")
  assert.equal(
    typeof performance.proofs.staticLayerBaking.displayObjectReduction,
    "number",
  )
  assert.equal(typeof performance.proofs.viewportCulling.active, "boolean")
  assert.equal(typeof performance.proofs.viewportCulling.culledRatio, "number")
  assert.equal(typeof performance.proofs.objectPooling.reuseObserved, "boolean")
  assert.equal(typeof performance.proofs.textureReuse.reuseObserved, "boolean")
}

function snapshotForReport(label, state) {
  return {
    label,
    activeMapId: state.map?.activeMapId,
    renderer: {
      actualRenderer: state.renderer.actualRenderer,
      phaserVersion: state.renderer.phaserVersion,
      canvas: state.renderer.canvas,
      webgl: {
        available: state.renderer.webgl.available,
        maxTextures: state.renderer.webgl.maxTextures,
        maxTextureSize: state.renderer.webgl.maxTextureSize,
        drawingBufferWidth: state.renderer.webgl.drawingBufferWidth,
        drawingBufferHeight: state.renderer.webgl.drawingBufferHeight,
      },
      tilemap: {
        staticGpuLayerCount: state.renderer.tilemap.staticGpuLayerCount,
        staticTileCount: state.renderer.tilemap.staticTileCount,
        staticLayerBake: state.renderer.tilemap.staticLayerBake,
      },
      depth: {
        objectCount: state.renderer.depth.objectCount,
        foregroundObjectCount: state.renderer.depth.foregroundObjectCount,
        playerCount: state.renderer.depth.playerCount,
      },
      performance: {
        displayObjectCount: state.renderer.performance.runtime.displayObjectCount,
        textureCount: state.renderer.performance.runtime.textureCount,
        mapRenderCount: state.renderer.performance.lifecycle.mapRenderCount,
        mapSwitchCount: state.renderer.performance.lifecycle.mapSwitchCount,
      },
      effects: {
        customWebglPipelines:
          state.renderer.effects.applied.customWebglPipelines,
        shaderPass: state.renderer.effects.applied.shaderPass,
        shaderPasses: state.renderer.effects.objectCounts.shaderPasses,
        particleEffects: state.renderer.effects.applied.particleEffects,
        particleEmitters: state.renderer.effects.objectCounts.particleEmitters,
        particleAliveBudget:
          state.renderer.effects.objectCounts.particleAliveBudget,
      },
      scenes: {
        activeSceneKeys: state.renderer.scenes.activeSceneKeys,
        registeredSceneKeys: state.renderer.scenes.registeredSceneKeys,
        plannedSceneKeys: state.renderer.scenes.plannedSceneKeys,
      },
      cameras: state.camera.secondary,
      mapValidation: state.renderer.mapValidation,
    },
    avatarAtlasImport: {
      manifestPath: state.avatars.spriteAtlas.atlasImport.manifestPath,
      imagePath: state.avatars.spriteAtlas.atlasImport.imagePath,
      activeSource: state.avatars.spriteAtlas.atlasImport.activeSource,
      fallbackActive: state.avatars.spriteAtlas.atlasImport.fallbackActive,
      expectedFrameCount:
        state.avatars.spriteAtlas.atlasImport.expectedFrameCount,
    },
  }
}

async function captureCanvas(page, filename) {
  const { screenshot } = await captureCanvasWithBuffer(page, filename)

  return screenshot
}

async function captureCanvasWithBuffer(page, filename) {
  const path = join(ARTIFACT_DIR, filename)
  const buffer = await page.locator("#map canvas").screenshot({ path })
  const stats = analyzeCanvasImage(buffer)

  assert.ok(
    stats.opaquePixelRatio >= 0.75,
    `${filename}: expected mostly opaque canvas pixels, got ${stats.opaquePixelRatio}.`,
  )
  assert.ok(
    stats.luminanceRange >= 25,
    `${filename}: expected visible canvas contrast, got range ${stats.luminanceRange}.`,
  )
  assert.ok(
    stats.sampledUniqueColors >= 12,
    `${filename}: expected nonblank varied canvas, got ${stats.sampledUniqueColors} sampled colors.`,
  )

  return {
    buffer,
    screenshot: {
      label: filename.replace(/\.png$/, ""),
      path,
      stats,
    },
  }
}

function assertAvatarFacingScreenshot(buffer, state) {
  const image = PNG.sync.read(buffer)
  const checks = AVATAR_VISUAL_FACINGS.map((visualFacing) => {
    const player = avatarPreviewPlayer(state, "ember", "idle", visualFacing)
    assert.ok(player, `Missing avatar preview player for ${visualFacing}.`)

    const point = projectWorldToImagePoint(state, player.currentPosition, image)
    const crop = cropImage(
      image,
      Math.round(point.x - 13),
      Math.round(point.y - 24),
      26,
      30,
    )
    const cropPath = join(
      ARTIFACT_DIR,
      `avatar-facing-${visualFacing}-crop.png`,
    )
    writeFileSync(cropPath, PNG.sync.write(crop))

    const stats = avatarCropStats(crop)
    assert.ok(
      stats.avatarLikePixelCount >= 70,
      `Expected visible avatar pixels for ${visualFacing}, got ${JSON.stringify(stats)}.`,
    )
    assert.ok(
      stats.sampledUniqueColors >= 4,
      `Expected varied avatar crop colors for ${visualFacing}, got ${JSON.stringify(stats)}.`,
    )
    assert.ok(
      stats.luminanceRange >= 18,
      `Expected readable avatar crop contrast for ${visualFacing}, got ${JSON.stringify(stats)}.`,
    )

    return {
      visualFacing,
      playerId: player.playerId,
      point,
      cropPath,
      stats,
    }
  })
  const uniqueFingerprints = new Set(checks.map((check) => check.stats.fingerprint))

  assert.ok(
    uniqueFingerprints.size >= 6,
    `Expected 8-way facing crops to produce distinct silhouettes, got ${uniqueFingerprints.size}.`,
  )

  return checks
}

function projectWorldToImagePoint(state, position, image) {
  const canvasWidth = state.renderer.canvas.width || image.width
  const canvasHeight = state.renderer.canvas.height || image.height
  const scaleX = image.width / canvasWidth
  const scaleY = image.height / canvasHeight

  return {
    x: Math.round(
      (position.x - state.camera.worldView.x) * state.camera.effectiveZoom *
        scaleX,
    ),
    y: Math.round(
      (position.y - state.camera.worldView.y) * state.camera.effectiveZoom *
        scaleY,
    ),
  }
}

function cropImage(image, x, y, width, height) {
  const crop = new PNG({ width, height })

  for (let cropY = 0; cropY < height; cropY += 1) {
    for (let cropX = 0; cropX < width; cropX += 1) {
      const sourceX = Math.min(image.width - 1, Math.max(0, x + cropX))
      const sourceY = Math.min(image.height - 1, Math.max(0, y + cropY))
      const sourceOffset = (image.width * sourceY + sourceX) << 2
      const targetOffset = (width * cropY + cropX) << 2

      crop.data[targetOffset] = image.data[sourceOffset]
      crop.data[targetOffset + 1] = image.data[sourceOffset + 1]
      crop.data[targetOffset + 2] = image.data[sourceOffset + 2]
      crop.data[targetOffset + 3] = image.data[sourceOffset + 3]
    }
  }

  return crop
}

function avatarCropStats(image) {
  const background = {
    red: image.data[0],
    green: image.data[1],
    blue: image.data[2],
  }
  let avatarLikePixelCount = 0
  let minLuminance = 255
  let maxLuminance = 0
  const sampledColors = new Set()

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (image.width * y + x) << 2
      const red = image.data[offset]
      const green = image.data[offset + 1]
      const blue = image.data[offset + 2]
      const distance = Math.hypot(
        red - background.red,
        green - background.green,
        blue - background.blue,
      )

      if (distance < 35) continue

      const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
      avatarLikePixelCount += 1
      minLuminance = Math.min(minLuminance, luminance)
      maxLuminance = Math.max(maxLuminance, luminance)
      sampledColors.add(
        `${Math.round(red / 16)}:${Math.round(green / 16)}:${Math.round(
          blue / 16,
        )}`,
      )
    }
  }

  return {
    width: image.width,
    height: image.height,
    avatarLikePixelCount,
    sampledUniqueColors: sampledColors.size,
    luminanceRange: roundTo(maxLuminance - minLuminance, 2),
    fingerprint: [...sampledColors].sort().join("|"),
  }
}

function analyzeCanvasImage(buffer) {
  const image = PNG.sync.read(buffer)
  const totalPixels = image.width * image.height
  let opaquePixels = 0
  let minLuminance = 255
  let maxLuminance = 0
  let luminanceTotal = 0
  const sampledColors = new Set()

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (image.width * y + x) << 2
      const alpha = image.data[offset + 3]
      if (alpha < 32) continue

      const red = image.data[offset]
      const green = image.data[offset + 1]
      const blue = image.data[offset + 2]
      const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue

      opaquePixels += 1
      minLuminance = Math.min(minLuminance, luminance)
      maxLuminance = Math.max(maxLuminance, luminance)
      luminanceTotal += luminance

      if (x % 12 === 0 && y % 12 === 0) {
        sampledColors.add(
          `${Math.round(red / 8)}:${Math.round(green / 8)}:${Math.round(
            blue / 8,
          )}`,
        )
      }
    }
  }

  return {
    width: image.width,
    height: image.height,
    opaquePixelRatio: roundTo(opaquePixels / totalPixels, 4),
    luminanceRange: roundTo(maxLuminance - minLuminance, 2),
    averageLuminance: roundTo(luminanceTotal / Math.max(1, opaquePixels), 2),
    sampledUniqueColors: sampledColors.size,
  }
}

async function measureFrameCadence(page, sampleCount = 40) {
  return page.evaluate(async (count) => {
    const round = (value, places) => {
      const multiplier = 10 ** places
      return Math.round(value * multiplier) / multiplier
    }
    const samples = []
    let previous = performance.now()

    for (let index = 0; index < count; index += 1) {
      await new Promise((resolve) => window.requestAnimationFrame(resolve))
      const current = performance.now()
      samples.push(current - previous)
      previous = current
    }

    const sorted = [...samples].sort((first, second) => first - second)
    const percentileIndex = Math.min(
      sorted.length - 1,
      Math.ceil(sorted.length * 0.95) - 1,
    )

    return {
      samples: samples.length,
      averageMs: round(
        samples.reduce((total, sample) => total + sample, 0) / samples.length,
        2,
      ),
      p95Ms: round(sorted[percentileIndex], 2),
      maxMs: round(Math.max(...samples), 2),
    }
  }, sampleCount)
}

function assertFrameCadence(performance, cadence) {
  assert.ok(
    cadence.averageMs < performance.target.smokeAverageBudgetMs,
    `Expected average frame cadence below ${performance.target.smokeAverageBudgetMs}ms, got ${cadence.averageMs}ms.`,
  )
  assert.ok(
    cadence.p95Ms < performance.target.smokeP95BudgetMs,
    `Expected p95 frame cadence below ${performance.target.smokeP95BudgetMs}ms, got ${cadence.p95Ms}ms.`,
  )
  assert.ok(
    cadence.maxMs < performance.target.smokeMaxBudgetMs,
    `Expected max frame cadence below ${performance.target.smokeMaxBudgetMs}ms, got ${cadence.maxMs}ms.`,
  )
}

function assertDepthOrdering(state, depthCase) {
  const player = state.renderer.depth.players.find((candidate) => candidate.local)
  const object = state.renderer.depth.objects.find(
    (candidate) => candidate.tokenId === depthCase.occluderTokenId,
  )

  assert.ok(player, `Expected local player depth info for ${depthCase.id}.`)
  assert.ok(object, `Expected occluder depth info for ${depthCase.id}.`)

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

async function assertDepthScreenshot(page, state, depthCase) {
  const buffer = await page.locator("#map canvas").screenshot()
  const image = PNG.sync.read(buffer)
  const point = depthSamplePoint(state, depthCase, image)
  const stats = pixelStats(image, point.x, point.y, 12)

  if (depthCase.expectedLayerAtSample === "avatar") {
    assert.ok(
      stats.avatarPixels >= 12,
      `Expected avatar-colored pixels for ${depthCase.id}, got ${JSON.stringify(
        stats,
      )}.`,
    )
    return { samplePoint: point, ...stats }
  }

  assert.ok(
    stats.warmObjectPixels >= 12 && stats.warmObjectPixels > stats.avatarPixels,
    `Expected object-colored pixels for ${depthCase.id}, got ${JSON.stringify(
      stats,
    )}.`,
  )
  return { samplePoint: point, ...stats }
}

function depthSamplePoint(state, depthCase, image) {
  const fixturePoint = clampCanvasPoint(depthCase.sampleViewport, image)
  if (pointWithinCanvas(depthCase.sampleViewport, image)) {
    return { ...fixturePoint, source: "fixture_projection" }
  }

  const player = state.renderer.depth.players.find((candidate) => candidate.local)
  const object = state.renderer.depth.objects.find(
    (candidate) => candidate.tokenId === depthCase.occluderTokenId,
  )
  const bounds =
    depthCase.expectedLayerAtSample === "avatar" ? player?.labelBounds : object?.bounds

  if (!bounds) {
    return { ...fixturePoint, source: "fixture_projection_clamped" }
  }

  return {
    ...clampCanvasPoint(
      worldToViewportPoint(
        {
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2,
        },
        state.camera,
      ),
      image,
    ),
    source: "camera_bounds_projection",
  }
}

function worldToViewportPoint(point, camera) {
  return {
    x: (point.x - camera.worldView.x) * camera.effectiveZoom,
    y: (point.y - camera.worldView.y) * camera.effectiveZoom,
  }
}

function pointWithinCanvas(point, image) {
  return (
    point.x >= 0 &&
    point.y >= 0 &&
    point.x < image.width &&
    point.y < image.height
  )
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

function clampCanvasPoint(point, image) {
  return {
    x: Math.max(0, Math.min(image.width - 1, Math.round(point.x))),
    y: Math.max(0, Math.min(image.height - 1, Math.round(point.y))),
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
    `Timed out waiting for renderer QA state. Latest state:\n${JSON.stringify(
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

function roundTo(value, places) {
  const multiplier = 10 ** places
  return Math.round(value * multiplier) / multiplier
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
