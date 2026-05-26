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
      `${url}/app?devtools=1&devGrid=1&devCollision=1&devZones=1&devDepth=1&devSpriteBounds=1&devCamera=1&devFixture=zone_fixture`,
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
        state.devTools.renderer?.overlays?.spriteBounds === true &&
        state.devTools.renderer?.overlays?.camera === true,
      9000,
    )

    assert.equal(initial.devTools.primaryUiControlsExposed, 0)
    assert.equal(initial.devTools.feelPanel.visible, true)
    assert.equal(initial.devTools.feelPanel.controlCount, 10)
    assert.equal(initial.movement.feel.panelVisible, true)
    assert.equal(
      initial.movement.feel.values.turnResponseTimeConstantMs,
      18,
    )
    assert.equal(initial.zones.debugOverlayEnabled, true)
    assert.equal(initial.renderer.depth.debugOverlayEnabled, true)
    assert.ok(initial.devTools.renderer.overlayObjectCounts.gridLineCount > 0)
    assert.ok(initial.devTools.renderer.overlayObjectCounts.blockedTileCount > 0)
    assert.ok(initial.devTools.renderer.overlayObjectCounts.spriteBoundsCount > 0)
    assert.equal(initial.devTools.renderer.cameraReadout.mode, initial.camera.mode)
    assert.ok(
      initial.devTools.renderer.fixtureSelector.availableFixtureIds.includes(
        "stress_100x80",
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

    await page.locator('[data-feel-range="turnResponseTimeConstantMs"]').fill("9")
    const tunedFeel = await waitForTextState(
      page,
      (state) =>
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
    report.devTools.push({
      label: "movement-feel-tuning",
      turnResponseTimeConstantMs:
        tunedFeel.movement.feel.values.turnResponseTimeConstantMs,
      collisionSlideSpeedScale: apiTunedFeel.values.collisionSlideSpeedScale,
    })

    await page.keyboard.press("Alt+Shift+C")
    const collisionOff = await waitForTextState(
      page,
      (state) =>
        state.devTools?.overlays?.collision === false &&
        state.devTools.renderer?.overlays?.collision === false,
    )
    assert.equal(collisionOff.devTools.enabled, true)
    report.devTools.push({
      label: "keyboard-collision-toggle",
      activeFixtureId: collisionOff.devTools.activeFixtureId,
      overlays: collisionOff.devTools.overlays,
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

  benchmark.samples.forEach((sample) => {
    assertRendererPerformance(sample.performance)
    assert.ok(sample.staticTileCount >= 20 * 15)
    assert.ok(sample.objectCount > 0)
    assert.ok(sample.mapRenderDurationMs >= 0)
    assert.equal(sample.performance.lifecycle.phaserGameReused, true)
  })

  return {
    sampleCount: benchmark.samples.length,
    gameInstanceIds: benchmark.gameInstanceIds,
    repeatedLargeMapDisplayObjectDelta:
      benchmark.repeatedLargeMapDisplayObjectDelta,
    repeatedLargeMapTextureDelta: benchmark.repeatedLargeMapTextureDelta,
    samples: benchmark.samples.map((sample) => ({
      pass: sample.pass,
      size: sample.size,
      staticTileCount: sample.staticTileCount,
      objectCount: sample.objectCount,
      mapRenderDurationMs: sample.mapRenderDurationMs,
      displayObjectCount: sample.performance.runtime.displayObjectCount,
      textureCount: sample.performance.runtime.textureCount,
    })),
  }
}

function assertRendererSnapshot(state) {
  assert.equal(state.renderer.requestedRenderer, "webgl")
  assert.equal(state.renderer.actualRenderer, "webgl")
  assert.equal(state.renderer.webgl.available, true)
  assert.equal(state.renderer.webgl.contextLost, false)
  assert.equal(state.renderer.webgl.recoveryReady, true)
  assert.ok(state.renderer.webgl.maxTextureSize >= 1024)
  assert.equal(state.renderer.assets.primarySource, "internal_atlas")
  assert.equal(state.renderer.assets.atlasLoaded, true)
  assert.equal(state.renderer.tilemap.staticGpuLayerCount, 2)
  assert.equal(state.renderer.tilemap.objectLayerMode, "sprites")
  assert.equal(state.renderer.mapValidation.valid, true)
  assert.equal(state.renderer.mapValidation.mutationSafe, true)
  assert.equal(state.renderer.performance.runtime.textureCount > 0, true)
  assert.equal(state.renderer.performance.runtime.displayObjectCount > 0, true)
  assert.equal(typeof state.renderer.depth.objectCount, "number")
  assert.equal(typeof state.renderer.depth.playerCount, "number")
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
      mapValidation: state.renderer.mapValidation,
    },
  }
}

async function captureCanvas(page, filename) {
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
    label: filename.replace(/\.png$/, ""),
    path,
    stats,
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
