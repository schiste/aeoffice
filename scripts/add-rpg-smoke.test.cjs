const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")
const { chromium } = require("playwright")
const { assertNonBlankImageBuffer } = require("./app-qa-contracts.cjs")
const { startStaticAppServer } = require("./app-qa-server.cjs")

const ROOT_DIR = path.resolve(__dirname, "..")
const DIST_DIR = path.join(ROOT_DIR, "apps/add-rpg/dist-app")
const SCREENSHOT_PATH = path.join(ROOT_DIR, "tmp/add-rpg-smoke.png")
const ADD_AUTOSAVE_STORAGE_KEY = "aedventure.add-rpg.autosave.v1"
const RESET_CLOCK_TOLERANCE_SECONDS = 60

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
    await page.addInitScript((storageKey) => {
      if (window.sessionStorage.getItem("add-rpg-smoke-storage-ready") === "1") return
      window.localStorage.removeItem(storageKey)
      window.sessionStorage.setItem("add-rpg-smoke-storage-ready", "1")
    }, ADD_AUTOSAVE_STORAGE_KEY)

    await page.goto(`${url}/app`, { waitUntil: "domcontentloaded" })
    const initial = await waitForTextState(
      page,
      (state) =>
        state.app === "add-rpg" &&
        state.runtime?.workerBoundary === "ui-worker-rust-wasm-snapshot" &&
        state.runtime?.ready === true &&
        state.runtime?.autoTick === true &&
        state.runtime?.snapshotReceived === true &&
        state.runtime?.catalogReceived === true &&
        state.shell?.framework === "solid" &&
        state.shell?.surface === "fullscreen_map_shell" &&
        state.shell?.hostsPhaserMap === true &&
        state.shell?.adminOpen === false &&
        state.shell?.questPanel?.collapsed === false &&
        Number.isFinite(state.shell?.questPanel?.x) &&
        Number.isFinite(state.shell?.questPanel?.y) &&
        state.mapMode?.active === "overworld_hex" &&
        state.mapMode?.topology === "hex" &&
        state.map?.hostedBy === "phaser" &&
        state.map?.ready === true &&
        state.map?.validationValid === true &&
        state.map?.topology?.kind === "hex" &&
        state.map?.topology?.fixture === false &&
        state.snapshot?.hexCount > 0 &&
        state.snapshot?.discoveredCellCount === 2 &&
        typeof state.snapshot?.heroMap === "string" &&
        state.map?.cells?.total === state.snapshot.hexCount &&
        state.map?.dungeonLinks?.total > 0 &&
        state.map?.dungeonLinks?.cellsWithLinks > 0 &&
        state.map?.knownFacts?.hiddenCells > 0 &&
        state.map?.knownFacts?.exactTerrainKnownCells > 0 &&
        state.map?.knownFacts?.dynamicRiskKnownCells > 0 &&
        state.map?.knownFacts?.vagueTravelLabels > 0 &&
        typeof state.map?.knownFacts?.sampleHiddenTravelLabel === "string" &&
        state.map.knownFacts.sampleHiddenTravelLabel.length > 0 &&
        state.map.knownFacts.dynamicRiskKnownCells < state.map.cells.total &&
        state.map?.visibility?.hiddenCells === state.map.knownFacts.hiddenCells &&
        state.map?.visibility?.visibleCells > 0 &&
        state.map?.visibility?.discoveredCells > 0 &&
        state.map?.visibility?.fogRendering === "phaser_visual_overlay" &&
        state.map?.visibility?.affectsAuthority === false &&
        state.map?.character?.visible === true &&
        state.map?.character?.authority === "browser_navigation_triggers_rust_time" &&
        state.map?.travel?.costGameMinutes === 60 &&
        state.map?.travel?.costRuntimeSeconds === 60 &&
        state.travel?.costGameMinutes === 60 &&
        state.travel?.costRuntimeSeconds === 60 &&
        state.map?.landmarks?.studioLabelVisible === true &&
        state.map?.landmarks?.survivorCaveVisible === true &&
        state.map?.authority?.rules === "rust_wasm_snapshot" &&
        state.map?.authority?.mutatesSimulation === false &&
        state.map?.presentation?.terrainArt === "procedural_painterly_topology" &&
        state.map?.presentation?.bubbleEffects === "animated_halo_edge" &&
        state.map?.presentation?.landmarkSprites === "procedural_sprite_stack" &&
        state.map?.presentation?.labelRendering === "high_resolution_phaser_text" &&
        state.map?.presentation?.ambience === "subtle_motes_and_topographic_scan" &&
        state.map?.presentation?.visibilityPolish?.fogEdge ===
          "soft_feathered_visibility_boundary" &&
        state.map?.presentation?.visibilityPolish?.revealEffect === "expanding_ripple" &&
        state.map?.presentation?.visibilityPolish?.caveMouthSilhouettes === true &&
        state.map?.presentation?.visibilityPolish?.authority === "visual_only" &&
        state.map?.presentation?.visibilityPolish?.laterModifiers?.includes(
          "day_night_radius",
        ) &&
        state.map.presentation.visibilityPolish.laterModifiers.includes("weather_season") &&
        state.map.presentation.visibilityPolish.laterModifiers.includes(
          "scouting_buildings_items",
        ) &&
        state.ui?.worldTime?.day >= 1 &&
        state.ui?.worldTime?.season === "spring" &&
        state.ui?.worldTime?.source === "estimated_solar_model" &&
        typeof state.ui?.worldTime?.sunrise === "string" &&
        typeof state.ui?.worldTime?.sunset === "string" &&
        state.catalog?.resourceCount > 0 &&
        state.catalog?.tileCount > 0,
      consoleErrors,
    )

    assert.equal(initial.boundary.runtimeAuthority, "rust-wasm")
    assert.equal(initial.boundary.firstTargetApp, "apps/add-rpg")
    assert.equal(initial.runtime.error, null)
    assert.equal(initial.snapshot.heroMap, initial.map.landmarks.survivorCave)
    assertInitialDiscoveryAnchors(initial)
    assert.ok(initial.map.visibility.hiddenCells > 0, "Initial overworld should contain hidden cells")
    assert.equal(initial.map.interaction.visibilitySamples.hidden.label, "Unknown region")
    assert.equal(initial.map.interaction.visibilitySamples.hidden.knownInfoLevel, "unknown")
    assert.equal(initial.map.interaction.visibilitySamples.hidden.dungeonLinks.length, 0)
    assert.equal(initial.map.interaction.visibilitySamples.hidden.dungeonActionsVisible, false)
    assert.equal(
      initial.map.interaction.visibilitySamples.discovered.knownInfoLevel,
      "known_static",
    )
    assert.match(initial.map.interaction.visibilitySamples.discovered.label, /·/)
    assert.equal(initial.map.interaction.visibilitySamples.visible.knownInfoLevel, "full_current")
    assert.ok(
      initial.map.character.dungeonLinksAtCell.length > 0,
      "The visible Survivor Cave can expose its dungeon link once discovered/visible.",
    )
    assert.ok(initial.ui.resourceCount > 0)
    assert.ok(initial.catalog.worldActionCount > 0)
    await assertIdleAmbientClockAdvances(page)
    await assertHeroStartsAtSurvivorCave(page, initial)
    const hiddenSelection = await selectHiddenMapCell(page, consoleErrors)
    assert.equal(hiddenSelection.map.interaction.selectedLabel, "Unknown region")
    assert.equal(hiddenSelection.map.interaction.selectedDetail.visibility, "hidden")
    assert.equal(hiddenSelection.map.interaction.selectedDetail.knownInfoLevel, "unknown")
    assert.equal(hiddenSelection.map.interaction.selectedDetail.dungeonLinks.length, 0)
    assert.equal(hiddenSelection.map.interaction.selectedDetail.dungeonActionsVisible, false)
    assert.equal(hiddenSelection.map.travel.previewLabel, "Unknown region")
    assert.equal(hiddenSelection.map.travel.previewExposureRisk, "unknown")
    await assertNonBlankFogMapScreenshot(page, hiddenSelection)
    await assertMobilePresentation(browser, url)
    const questHud = await exerciseQuestHud(page, consoleErrors)
    assert.equal(questHud.shell.questPanel.collapsed, false)
    assert.ok(questHud.shell.questPanel.x !== initial.shell.questPanel.x)
    assert.ok(questHud.shell.questPanel.y !== initial.shell.questPanel.y)
    const characterMoved = await exerciseMainCharacterMovement(page, consoleErrors)
    assert.equal(characterMoved.map.character.lastMoveAccepted, true)

    const interacted = await interactWithMap(page, consoleErrors)
    assert.ok(interacted.map.interaction.selectedHex)
    assert.ok(interacted.map.interaction.selectedLabel)

    const switched = await exerciseMapModeSwitching(page, consoleErrors)
    assert.equal(switched.mapMode.active, "overworld_hex")
    assert.equal(switched.map.topology.kind, "hex")

    const firstPlayable = await completeFirstPlayableArc(page, consoleErrors)
    assert.equal(firstPlayable.ui.firstPlayable.complete, true)
    assert.equal(firstPlayable.snapshot.base.studioRestored, true)
    assert.equal(firstPlayable.snapshot.base.firePitBuilt, true)
    assert.equal(firstPlayable.ui.recruitmentEnabled, true)
    assert.ok(firstPlayable.snapshot.bubble.reachFromBase >= 3)
    assert.ok(firstPlayable.snapshot.recruitment.totalRecruitedThisRun >= 1)
    assert.ok(
      firstPlayable.snapshot.recruitment.pendingCount > 0 ||
        firstPlayable.snapshot.roster.totalCrew > 2,
    )

    const exported = await exerciseSaveReloadOfflineAndReset(page, firstPlayable, consoleErrors)
    assert.ok(exported.payload.length > 200)
    await closeAdmin(page, consoleErrors)

    await assertNonBlankAppScreenshot(page)
    await assertNonBlankMapScreenshot(page)
    assert.deepEqual(consoleErrors, [])
  } finally {
    if (browser) await browser.close()
    await new Promise((resolve) => server.close(resolve))
  }
}

async function exerciseMapModeSwitching(page, consoleErrors) {
  await page.locator("#map-mode-dungeon_square").click()
  const dungeon = await waitForTextState(
    page,
    (state) =>
      state.mapMode?.active === "dungeon_square" &&
      state.mapMode?.topology === "square" &&
      state.mapMode?.fixture === true &&
      state.map?.topology?.kind === "square" &&
      state.map?.topology?.fixture === true &&
      state.map?.mapId === "add.rpg.square-dungeon-fixture" &&
      state.map?.cells?.total > 100 &&
      state.map?.cells?.blocked > 0 &&
      state.map?.cells?.bubbleEdge === 0 &&
      state.map?.landmarks?.renderedCount > 0 &&
      state.map?.presentation?.transitionState &&
      state.map?.presentation?.landmarkSprites === "procedural_sprite_stack",
    consoleErrors,
  )
  assert.ok(dungeon.map.cells.total !== dungeon.snapshot.hexCount)
  await assertNonBlankNamedMapScreenshot(
    page,
    "add-rpg-dungeon-map-smoke.png",
    "ADD RPG square dungeon map screenshot",
  )

  await selectMapCenter(page)
  await waitForTextState(
    page,
    (state) =>
      state.mapMode?.active === "dungeon_square" &&
      typeof state.map?.interaction?.selectedCell === "string" &&
      state.map.interaction.selectedCell.startsWith("square:"),
    consoleErrors,
  )

  await page.locator("#map-mode-base_square").click()
  await waitForTextState(
    page,
    (state) =>
      state.mapMode?.active === "base_square" &&
      state.map?.topology?.kind === "square" &&
      state.map?.mapId === "add.rpg.square-base-fixture" &&
      state.map?.cells?.blocked > 0 &&
      state.map?.landmarks?.renderedCount > 0,
    consoleErrors,
  )

  await page.locator("#map-mode-overworld_hex").click()
  return waitForTextState(
    page,
    (state) =>
      state.mapMode?.active === "overworld_hex" &&
      state.mapMode?.topology === "hex" &&
      state.map?.topology?.kind === "hex" &&
      state.map?.cells?.total === state.snapshot?.hexCount &&
      state.map?.visibility?.hiddenCells > 0,
    consoleErrors,
  )
}

async function assertMobilePresentation(browser, url) {
  const page = await browser.newPage({ viewport: { width: 390, height: 760 } })
  const consoleErrors = []
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  page.on("pageerror", (error) => {
    consoleErrors.push(error.stack || error.message)
  })
  await page.addInitScript((storageKey) => {
    window.localStorage.removeItem(storageKey)
  }, ADD_AUTOSAVE_STORAGE_KEY)

  try {
    await page.goto(`${url}/app`, { waitUntil: "domcontentloaded" })
    await waitForTextState(
      page,
      (state) =>
        state.app === "add-rpg" &&
        state.runtime?.ready === true &&
        state.map?.ready === true &&
        state.map?.presentation?.responsiveLayout === "mobile" &&
        state.map?.presentation?.terrainArt === "procedural_painterly_topology",
      consoleErrors,
    )
    assert.deepEqual(consoleErrors, [])
  } finally {
    await page.close()
  }
}

function assertInitialDiscoveryAnchors(state) {
  assert.equal(state.snapshot.discoveredCellCount, 2)
  assert.deepEqual(
    sortedCells(state.snapshot.discoveredCells),
    sortedCells([state.map.landmarks.survivorCave, state.map.landmarks.baseCenter]),
    "Initial discovery should contain exactly Survivor Cave and the Studio/base anchor.",
  )
}

async function completeFirstPlayableArc(page, consoleErrors) {
  let state = await renderGameToText(page)
  assert.ok(state.ui?.firstPlayable, "ADD first playable telemetry should be exposed")
  assert.equal(state.ui.firstPlayable.persistenceReady, false)
  assert.ok(state.ui.resourceFlows.some((flow) => flow.id === "resource.bassline" && flow.source))
  assert.ok(
    state.ui.constructionOptions.some((option) => option.id === "project.restore_studio"),
  )
  assert.ok(
    state.ui.roleAssignments.some((role) => role.id === "role.crystal_bassline"),
  )

  for (let step = 0; step < 80; step += 1) {
    state = await renderGameToText(page)
    if (
      state.ui?.firstPlayable?.complete === true &&
      state.snapshot?.base?.studioRestored === true &&
      state.snapshot?.base?.firePitBuilt === true &&
      state.snapshot?.recruitment?.totalRecruitedThisRun >= 1
    ) {
      return state
    }

    const action = state.ui?.firstPlayable?.currentAction
    assert.ok(
      action,
      `First playable should expose an action before completion: ${JSON.stringify(
        state.ui?.firstPlayable,
      )}`,
    )
    const beforeDigest = firstPlayableDigest(state)
    const actionButton = page.locator("#first-playable-action")
    if (await actionButton.isDisabled()) {
      const completedState = await renderGameToText(page)
      if (
        completedState.ui?.firstPlayable?.complete === true &&
        completedState.snapshot?.recruitment?.totalRecruitedThisRun >= 1
      ) {
        return completedState
      }
      throw new Error(
        `First playable action disabled before completion: ${JSON.stringify(
          completedState.ui?.firstPlayable,
        )}`,
      )
    }
    await actionButton.click()
    await waitForTextState(
      page,
      (nextState) =>
        nextState.runtime?.error === null &&
        firstPlayableDigest(nextState) !== beforeDigest,
      consoleErrors,
      action.type === "tick" ? 18000 : 8000,
    )
  }

  throw new Error(
    `ADD first playable did not complete. Last state: ${JSON.stringify(
      await renderGameToText(page),
    )}`,
  )
}

function firstPlayableDigest(state) {
  return JSON.stringify({
    clockSeconds: Math.round(state.snapshot?.clockSeconds ?? 0),
    heroAssigned: state.snapshot?.heroAssigned,
    activeWorldAction: state.snapshot?.activeWorldAction,
    resources: state.snapshot?.resources,
    base: state.snapshot?.base,
    bubble: state.snapshot?.bubble,
    recruitment: state.snapshot?.recruitment,
    roster: state.snapshot?.roster,
    activeConstruction: state.snapshot?.activeConstruction,
    activeStoryBeatId: state.ui?.activeStoryBeatId,
    firstPlayable: state.ui?.firstPlayable,
  })
}

async function exerciseSaveReloadOfflineAndReset(page, advanced, consoleErrors) {
  await openAdmin(page, consoleErrors)
  const saved = await clickUntilTextState(
    page,
    "#export-save",
    (state) =>
      state.persistence?.autosaveAvailable === true &&
      state.persistence?.lastManualExportAtMs !== null &&
      state.persistence?.savePayloadLength > 200,
    consoleErrors,
    8,
    2200,
  )
  const payload = await page.locator("#save-payload").inputValue()
  assert.equal(typeof JSON.parse(payload), "object")
  const exportedClock = saved.snapshot.clockSeconds
  const exportedDiscoveryCount = saved.snapshot.discoveredCellCount
  const exportedDiscoveredCells = sortedCells(saved.snapshot.discoveredCells)
  const exportedHeroMap = saved.snapshot.heroMap
  const parsedPayload = JSON.parse(payload)
  assert.ok(Array.isArray(parsedPayload.discoveredCells))
  assert.equal(parsedPayload.discoveredCells.length, exportedDiscoveryCount)
  assert.deepEqual(parsedPayload.heroMap, parseHexCoord(exportedHeroMap))

  await page.evaluate(
    ({ key }) => {
      const raw = window.localStorage.getItem(key)
      if (!raw) throw new Error("Missing ADD autosave after export")
      const record = JSON.parse(raw)
      record.savedAtMs = Date.now() - 60 * 60 * 1000
      window.localStorage.setItem(key, JSON.stringify(record))
    },
    { key: ADD_AUTOSAVE_STORAGE_KEY },
  )
  await page.reload({ waitUntil: "domcontentloaded" })
  const reloaded = await waitForTextState(
    page,
    (state) =>
      state.runtime?.ready === true &&
      state.runtime?.error === null &&
      state.snapshot?.heroAssigned === advanced.snapshot.heroAssigned &&
      state.persistence?.autosaveAvailable === true &&
      state.persistence?.lastOfflineCatchupSeconds >= 3500 &&
      state.snapshot?.clockSeconds >= exportedClock + 3500 &&
      state.snapshot?.discoveredCellCount === exportedDiscoveryCount,
    consoleErrors,
    16000,
  )
  assert.ok(reloaded.snapshot.clockSeconds > exportedClock)
  assert.equal(
    reloaded.ui.worldTime.animating,
    false,
    "Offline catch-up on reload should snap the clock, not animate the jump.",
  )
  assert.ok(
    Math.abs(
      reloaded.ui.worldTime.presentationClockSeconds -
        reloaded.ui.worldTime.authoritativeClockSeconds,
    ) <= 1.1,
    "Offline catch-up should leave the presentation clock snapped to authoritative, not crawling.",
  )
  assert.deepEqual(
    sortedCells(reloaded.snapshot.discoveredCells),
    exportedDiscoveredCells,
    "Autosave reload should preserve the same discovered cells after offline catch-up.",
  )

  await openAdmin(page, consoleErrors)
  await page.locator("#save-payload").fill(payload)
  await page.locator("#import-save").click()
  const imported = await waitForTextState(
    page,
    (state) =>
      state.runtime?.error === null &&
      state.persistence?.lastImportAtMs !== null &&
      state.snapshot?.clockSeconds < reloaded.snapshot.clockSeconds - 1000 &&
      state.snapshot?.discoveredCellCount === exportedDiscoveryCount &&
      state.snapshot?.heroMap === exportedHeroMap &&
      sameCells(state.snapshot?.discoveredCells, exportedDiscoveredCells),
    consoleErrors,
  )
  assert.ok(imported.persistence.lastImportAtMs)

  await page.locator("#offline-catchup").click()
  const offlineTicked = await waitForTextState(
    page,
    (state) =>
      state.persistence?.lastOfflineCatchupSeconds >= 3600 &&
      state.snapshot?.clockSeconds >= imported.snapshot.clockSeconds + 3500 &&
      state.ui?.firstPlayable?.persistenceReady === true,
    consoleErrors,
  )
  assert.ok(offlineTicked.snapshot.clockSeconds > imported.snapshot.clockSeconds)
  assert.equal(offlineTicked.ui.firstPlayable.persistenceReady, true)

  await page.locator("#reset-runtime").click()
  const reset = await waitForTextState(
    page,
    (state) =>
      state.runtime?.error === null &&
      state.persistence?.resetCount > 0 &&
      state.snapshot?.clockSeconds < RESET_CLOCK_TOLERANCE_SECONDS &&
      state.snapshot?.heroAssigned === false &&
      state.snapshot?.discoveredCellCount === 2 &&
      state.snapshot?.heroMap === state.map?.landmarks?.survivorCave,
    consoleErrors,
  )
  assert.equal(reset.snapshot.heroAssigned, false)

  await page.locator("#save-payload").fill("{ invalid add save")
  await page.locator("#import-save").click()
  const errored = await waitForTextState(
    page,
    (state) => typeof state.runtime?.error === "string" && state.runtime.error.length > 0,
    consoleErrors,
  )
  assert.ok(errored.runtime.error)

  await page.locator("#reset-runtime").click()
  await waitForTextState(
    page,
    (state) =>
      state.runtime?.error === null &&
      state.snapshot?.clockSeconds < RESET_CLOCK_TOLERANCE_SECONDS,
    consoleErrors,
  )

  return { payload }
}

async function openAdmin(page, consoleErrors) {
  const state = await renderGameToText(page)
  if (state.shell?.adminOpen === true) return state

  await page.locator("#open-admin").click()
  await page.locator("#admin-view.open").waitFor({ state: "visible" })
  await page.locator("#save-payload").waitFor({ state: "visible" })
  return waitForTextState(
    page,
    (nextState) => nextState.shell?.adminOpen === true,
    consoleErrors,
  )
}

async function closeAdmin(page, consoleErrors) {
  const state = await renderGameToText(page)
  if (state.shell?.adminOpen !== true) return state

  await page.locator("#close-admin").click()
  return waitForTextState(
    page,
    (nextState) => nextState.shell?.adminOpen === false,
    consoleErrors,
  )
}

async function exerciseQuestHud(page, consoleErrors) {
  const handle = page.locator(".first-playable-drag-handle")
  await handle.waitFor({ state: "visible" })
  const before = await renderGameToText(page)
  assert.equal(before.shell?.questPanel?.collapsed, false)
  const box = await handle.boundingBox()
  assert.ok(box, "First playable drag handle should have a browser box")
  const start = {
    x: box.x + 24,
    y: box.y + box.height / 2,
  }

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 110, start.y + 42, { steps: 6 })
  await page.mouse.up()

  const dragged = await waitForTextState(
    page,
    (state) =>
      Math.abs((state.shell?.questPanel?.x ?? 0) - before.shell.questPanel.x) > 20 &&
      Math.abs((state.shell?.questPanel?.y ?? 0) - before.shell.questPanel.y) > 10,
    consoleErrors,
  )

  await page.locator("#toggle-first-playable-panel").click()
  await page.locator("#first-playable-action").waitFor({ state: "hidden" })
  const collapsed = await waitForTextState(
    page,
    (state) => state.shell?.questPanel?.collapsed === true,
    consoleErrors,
  )
  assert.equal(collapsed.shell.questPanel.x, dragged.shell.questPanel.x)
  assert.equal(collapsed.shell.questPanel.y, dragged.shell.questPanel.y)

  await page.locator("#toggle-first-playable-panel").click()
  await page.locator("#first-playable-action").waitFor({ state: "visible" })
  return waitForTextState(
    page,
    (state) =>
      state.shell?.questPanel?.collapsed === false &&
      state.shell.questPanel.x === dragged.shell.questPanel.x &&
      state.shell.questPanel.y === dragged.shell.questPanel.y,
    consoleErrors,
  )
}

async function assertIdleAmbientClockAdvances(page) {
  // Idle (no input): ambient world clock runs at ~1 game-minute per real second,
  // snapping each tick (presentation tracks authoritative, never animating).
  const before = await renderGameToText(page)
  await page.waitForTimeout(2500)
  const after = await renderGameToText(page)
  const advance = after.snapshot.clockSeconds - before.snapshot.clockSeconds
  assert.ok(
    advance >= 1 && advance <= 6,
    `Idle ambient clock should advance ~1 game-min/sec (saw ${advance}s over ~2.5s).`,
  )
  assert.equal(
    after.ui.worldTime.animating,
    false,
    "Idle ambient ticks should snap the clock, not animate it.",
  )
  assert.ok(
    Math.abs(
      after.ui.worldTime.presentationClockSeconds -
        after.ui.worldTime.authoritativeClockSeconds,
    ) <= 1.1,
    "Idle presentation clock should track the authoritative clock.",
  )
}

async function assertHeroStartsAtSurvivorCave(page, state) {
  const canvas = page.locator("#add-world canvas")
  await canvas.waitFor({ state: "visible" })
  const box = await canvas.boundingBox()
  assert.ok(box, "ADD RPG Phaser canvas should have a browser box")
  const character = state.map?.character
  const camera = state.map?.camera
  assert.equal(character?.coord, state.map?.landmarks?.survivorCave)
  assert.equal(character?.cell, `hex:${state.map.landmarks.survivorCave}`)
  const cameraOrigin = {
    x: box.width / 2,
    y: box.height / 2,
  }
  const screenX = (character.x - camera.scrollX - cameraOrigin.x) * camera.zoom + cameraOrigin.x
  const screenY = (character.y - camera.scrollY - cameraOrigin.y) * camera.zoom + cameraOrigin.y
  assert.ok(
    Math.abs(screenX - box.width / 2) <= 10,
    `Survivor Cave/Hero should start horizontally centered, got ${screenX} for ${box.width}`,
  )
  assert.ok(
    Math.abs(screenY - box.height / 2) <= 10,
    `Survivor Cave/Hero should start vertically centered, got ${screenY} for ${box.height}`,
  )
}

async function exerciseMainCharacterMovement(page, consoleErrors) {
  const before = await renderGameToText(page)
  assert.equal(before.map?.character?.visible, true)
  assert.ok(before.map?.character?.cell, "Main character should report a cell")
  assert.equal(before.travel?.confirmation?.dramaState, "fresh")

  await page.keyboard.press("ArrowLeft")
  const firstDialog = await waitForTextState(
    page,
    (state) =>
      state.travel?.confirmation?.dialogOpen === true &&
      state.travel.confirmation.dialogKind === "first_warning" &&
      state.map?.character?.cell === before.map.character.cell,
    consoleErrors,
  )
  assert.equal(firstDialog.travel.confirmation.dramaState, "fresh")

  await page.locator("#travel-dialog-cancel").click()
  await waitForTextState(
    page,
    (state) =>
      state.travel?.confirmation?.dialogOpen === true &&
      state.travel.confirmation.dialogKind === "first_declined" &&
      state.map?.character?.cell === before.map.character.cell,
    consoleErrors,
  )
  await page.locator("#travel-dialog-dismiss").click()
  await waitForTextState(
    page,
    (state) =>
      state.travel?.confirmation?.dialogOpen === false &&
      state.travel.confirmation.dramaState === "declined_once" &&
      state.map?.character?.cell === before.map.character.cell,
    consoleErrors,
  )

  await page.keyboard.press("ArrowLeft")
  await waitForTextState(
    page,
    (state) =>
      state.travel?.confirmation?.dialogOpen === true &&
      state.travel.confirmation.dialogKind === "dramatic_reprise" &&
      state.map?.character?.cell === before.map.character.cell,
    consoleErrors,
  )
  await page.locator("#travel-dialog-venture").click()
  const minimumArrivalClockSeconds = before.snapshot.clockSeconds + 59
  const observedTravelClockTimes = new Set()
  const moved = await waitForTextState(
    page,
    (state) => {
      if (state.ui?.worldTime?.animating && state.ui.worldTime.localTime) {
        observedTravelClockTimes.add(state.ui.worldTime.localTime)
      }
      const presentationClockSeconds =
        state.ui?.worldTime?.presentationClockSeconds ?? state.snapshot?.clockSeconds ?? 0
      const authoritativeClockSeconds =
        state.ui?.worldTime?.authoritativeClockSeconds ?? state.snapshot?.clockSeconds ?? 0
      const presentationCaughtUp =
        presentationClockSeconds >= minimumArrivalClockSeconds &&
        authoritativeClockSeconds - presentationClockSeconds <= 1.1
      return (
        state.map?.character?.lastMoveDirection === "left" &&
        state.map?.character?.lastMoveAccepted === true &&
        state.map?.character?.cell !== before.map.character.cell &&
        state.map?.character?.moving === false &&
        state.snapshot?.clockSeconds >= minimumArrivalClockSeconds &&
        state.snapshot?.discoveredCellCount > before.snapshot.discoveredCellCount &&
        state.travel?.confirmation?.dramaState === "complete" &&
        state.travel?.confirmation?.dialogOpen === false &&
        state.ui?.worldTime?.animating === false &&
        presentationCaughtUp &&
        observedTravelClockTimes.size >= 3
      )
    },
    consoleErrors,
    10000,
  )
  assert.equal(moved.travel.costGameMinutes, 60)
  assert.ok(
    hasNewCells(before.snapshot.discoveredCells, moved.snapshot.discoveredCells),
    "Moving the hero should reveal at least one new discovered cell.",
  )
  assert.equal(moved.travel.presentationDurationMs, moved.map.travel.presentationDurationMs)
  assert.equal(moved.travel.clockStepMs, moved.map.travel.clockStepMs)
  assert.ok(
    Math.abs(
      moved.travel.presentationDurationMs -
        moved.travel.costGameMinutes * moved.travel.clockStepMs,
    ) < 0.01,
    "Travel duration should be derived from the visible minute cadence.",
  )
  assert.ok(moved.travel.toTime, "Travel should expose an arrival time")
  assert.ok(moved.travel.exposureRisk, "Travel should expose an exposure risk")
  assert.ok(
    observedTravelClockTimes.size >= 3,
    `Travel clock should show multiple minute values, saw ${Array.from(observedTravelClockTimes).join(", ")}`,
  )
  const settledTravelClockSeconds = moved.snapshot.clockSeconds
  await page.waitForTimeout(1300)
  const afterTravelIdle = await renderGameToText(page)
  assert.equal(afterTravelIdle.runtime.autoTick, true)
  assert.equal(
    afterTravelIdle.ui.worldTime.animating,
    false,
    "Travel reveal should not leave the displayed clock animating after the crossing.",
  )
  assert.ok(
    Math.abs(
      afterTravelIdle.ui.worldTime.presentationClockSeconds -
        afterTravelIdle.ui.worldTime.authoritativeClockSeconds,
    ) <= 1.1,
    "After the crossing the presentation clock should track the authoritative clock (snapped, not drifting).",
  )
  assert.ok(
    afterTravelIdle.snapshot.clockSeconds >= settledTravelClockSeconds &&
      afterTravelIdle.snapshot.clockSeconds < settledTravelClockSeconds + 60,
    "After the crossing the clock should resume ambient ticking, not jump another tile-hour.",
  )

  await page.keyboard.down("ArrowRight")
  const repeatedRightKey = repeatHeldKey(page, "ArrowRight", 28, 120)
  const returned = await waitForTextState(
    page,
    (state) =>
      state.map?.character?.lastMoveDirection === "right" &&
      state.map?.character?.lastMoveAccepted === true &&
      state.map?.character?.cell === before.map.character.cell &&
      state.map?.character?.moving === false &&
      state.snapshot?.clockSeconds >= moved.snapshot.clockSeconds + 59 &&
      state.travel?.runtimeSynced === true &&
      state.ui?.worldTime?.animating === false,
    consoleErrors,
    8000,
  )
  await repeatedRightKey
  await page.keyboard.up("ArrowRight")
  const afterHeldReturn = await waitForTextState(
    page,
    (state) =>
      state.map?.character?.cell === returned.map.character.cell &&
      state.map?.character?.moving === false &&
      state.snapshot?.clockSeconds >= returned.snapshot.clockSeconds &&
      state.snapshot?.clockSeconds < returned.snapshot.clockSeconds + 60 &&
      state.ui?.worldTime?.animating === false,
    consoleErrors,
  )
  assert.equal(afterHeldReturn.map.character.cell, returned.map.character.cell)
  assert.equal(afterHeldReturn.map.character.moving, false)
  assert.ok(
    afterHeldReturn.snapshot.clockSeconds >= returned.snapshot.clockSeconds &&
      afterHeldReturn.snapshot.clockSeconds < returned.snapshot.clockSeconds + 60,
    "Held movement may pass ambient time but must not queue a chained tile-hour.",
  )
  assert.equal(afterHeldReturn.snapshot.discoveredCellCount, returned.snapshot.discoveredCellCount)
  assert.deepEqual(
    sortedCells(afterHeldReturn.snapshot.discoveredCells),
    sortedCells(returned.snapshot.discoveredCells),
    "Held movement should not queue a chained travel or reveal additional cells.",
  )
  assert.equal(afterHeldReturn.ui.worldTime.animating, false)
  assert.equal(returned.map.character.cell, before.map.character.cell)

  const expectedNorthWest = adjacentHexCell(returned.map.character.cell, 0, -1)
  await page.keyboard.down("ArrowUp")
  await page.keyboard.down("ArrowLeft")
  await page.waitForTimeout(90)
  await page.keyboard.up("ArrowLeft")
  await page.keyboard.up("ArrowUp")

  const upperLeft = await waitForTextState(
    page,
    (state) =>
      state.map?.character?.lastMoveDirection === "north_west" &&
      state.map?.character?.lastMoveAccepted === true &&
      state.map?.character?.cell === expectedNorthWest &&
      state.map?.character?.moving === false &&
      state.snapshot?.clockSeconds >= returned.snapshot.clockSeconds + 59,
    consoleErrors,
    8000,
  )

  return upperLeft
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

async function selectHiddenMapCell(page, consoleErrors) {
  const before = await renderGameToText(page)
  const restorePanel = before.shell?.questPanel?.collapsed === false
  if (restorePanel) {
    await page.locator("#toggle-first-playable-panel").click()
    await waitForTextState(
      page,
      (state) => state.shell?.questPanel?.collapsed === true,
      consoleErrors,
    )
  }

  const canvas = page.locator("#add-world canvas")
  await canvas.waitFor({ state: "visible" })
  const box = await canvas.boundingBox()
  assert.ok(box, "ADD RPG Phaser canvas should have a browser box")

  const candidates = [
    { x: 0.12, y: 0.50 },
    { x: 0.18, y: 0.42 },
    { x: 0.24, y: 0.62 },
    { x: 0.33, y: 0.36 },
  ]

  for (const point of candidates) {
    await page.mouse.click(box.x + box.width * point.x, box.y + box.height * point.y)
    await page.waitForTimeout(180)
    const state = await renderGameToText(page)
    if (state.map?.interaction?.selectedDetail?.visibility === "hidden") {
      if (!restorePanel) return state
      await page.locator("#toggle-first-playable-panel").click()
      return waitForTextState(
        page,
        (candidate) =>
          candidate.shell?.questPanel?.collapsed === false &&
          candidate.map?.interaction?.selectedDetail?.visibility === "hidden",
        consoleErrors,
      )
    }
  }

  const latest = await renderGameToText(page)
  if (restorePanel) {
    await page.locator("#toggle-first-playable-panel").click()
    await waitForTextState(
      page,
      (state) => state.shell?.questPanel?.collapsed === false,
      consoleErrors,
    )
  }
  assert.fail(
    `Expected a hidden tile selection candidate. Latest selection: ${JSON.stringify(
      latest.map?.interaction,
      null,
      2,
    )}`,
  )
}

async function selectMapCenter(page) {
  const canvas = page.locator("#add-world canvas")
  await canvas.waitFor({ state: "visible" })
  const box = await canvas.boundingBox()
  assert.ok(box, "ADD RPG Phaser canvas should have a browser box")
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

async function assertNonBlankMapScreenshot(page) {
  await assertNonBlankNamedMapScreenshot(
    page,
    "add-rpg-map-smoke.png",
    "ADD RPG Phaser map screenshot",
  )
}

async function assertNonBlankFogMapScreenshot(page, state) {
  assert.equal(state.map.visibility.fogRendering, "phaser_visual_overlay")
  assert.ok(state.map.visibility.hiddenCells > 0)
  assert.ok(state.map.visibility.visibleCells > 0)
  await assertNonBlankNamedMapScreenshot(
    page,
    "add-rpg-fog-map-smoke.png",
    "ADD RPG fog overlay map screenshot",
  )
}

async function assertNonBlankNamedMapScreenshot(page, filename, label) {
  fs.mkdirSync(path.dirname(SCREENSHOT_PATH), { recursive: true })
  const mapPath = path.join(ROOT_DIR, "tmp", filename)
  await page.locator("#add-world canvas").screenshot({ path: mapPath })
  assertNonBlankImageBuffer(
    fs.readFileSync(mapPath),
    label,
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

async function repeatHeldKey(page, key, count, intervalMs) {
  for (let index = 0; index < count; index += 1) {
    await page.waitForTimeout(intervalMs)
    await page.keyboard.down(key)
  }
}

async function clickUntilTextState(
  page,
  selector,
  predicate,
  consoleErrors = [],
  attempts = 4,
  timeoutPerAttemptMs = 1800,
) {
  let lastState
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await page.locator(selector).click()
    const startedAt = Date.now()
    while (Date.now() - startedAt < timeoutPerAttemptMs) {
      lastState = await renderGameToText(page)
      if (predicate(lastState)) return lastState
      await page.waitForTimeout(120)
    }
  }

  assert.fail(
    `Timed out after ${attempts} clicks waiting for state from ${selector}. ` +
      `Console errors: ${JSON.stringify(consoleErrors)}. Last state:\n${JSON.stringify(
        lastState,
        null,
        2,
      )}`,
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

function adjacentHexCell(cell, qDelta, rDelta) {
  const match = /^hex:(-?\d+),(-?\d+)$/.exec(cell)
  assert.ok(match, `Expected a hex cell string, got ${cell}`)
  return `hex:${Number(match[1]) + qDelta},${Number(match[2]) + rDelta}`
}

function sortedCells(cells) {
  return [...(cells ?? [])].sort((left, right) => String(left).localeCompare(String(right)))
}

function sameCells(left, right) {
  return JSON.stringify(sortedCells(left)) === JSON.stringify(sortedCells(right))
}

function hasNewCells(beforeCells, afterCells) {
  const before = new Set(beforeCells ?? [])
  return (afterCells ?? []).some((cell) => !before.has(cell))
}

function parseHexCoord(coord) {
  const match = /^(-?\d+),(-?\d+)$/.exec(coord)
  assert.ok(match, `Expected a hex coord string, got ${coord}`)
  return { q: Number(match[1]), r: Number(match[2]) }
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
