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
const MOBILE_PRESENTATION_VIEWPORTS = [
  { name: "mobile", width: 390, height: 760 },
  { name: "mobile-narrow", width: 360, height: 740 },
]

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
    const initial = await runScenario("boot and render text contract", () =>
      assertBootAndRenderTextContract(page, consoleErrors),
    )
    await runScenario("initial visibility and known facts", () =>
      assertInitialVisibilityContract(initial),
    )
    await runScenario("ambient clock", () => assertIdleAmbientClockAdvances(page))
    await runScenario("hero spawn placement", () => assertHeroStartsAtSurvivorCave(page, initial))
    await runScenario("Studio tile detail links", () =>
      exerciseStudioTileDetailLinks(page, consoleErrors),
    )
    await runScenario("base management surface", () =>
      exerciseBaseManagementSurface(page, consoleErrors),
    )
    await runScenario("survivor cave dungeon entry loop", () =>
      exerciseSurvivorCaveDungeonEntry(page, consoleErrors),
    )
    await runScenario("hidden cells and fog screenshot", async () => {
      const state = await assertHiddenMapCellsAreInvisibleToPointer(page, consoleErrors)
      assert.notEqual(state.map.interaction.selectedDetail?.visibility, "hidden")
      await assertNonBlankFogMapScreenshot(page, state)
      return state
    })
    await runScenario("mobile presentation", () => assertMobilePresentation(browser, url))
    const questHud = await runScenario("quest HUD drag and collapse", () =>
      exerciseQuestHud(page, consoleErrors),
    )
    assert.equal(questHud.shell.questPanel.collapsed, false)
    assert.ok(questHud.shell.questPanel.x !== initial.shell.questPanel.x)
    assert.ok(questHud.shell.questPanel.y !== initial.shell.questPanel.y)
    const characterMoved = await runScenario("travel dialog and hero movement", () =>
      exerciseMainCharacterMovement(page, consoleErrors),
    )
    assert.equal(characterMoved.map.character.lastMoveAccepted, true)

    const interacted = await runScenario("map interaction and camera", () =>
      interactWithMap(page, consoleErrors),
    )
    assert.ok(interacted.map.interaction.selectedHex)
    assert.ok(interacted.map.interaction.selectedLabel)

    const switched = await runScenario("map mode switching", () =>
      exerciseMapModeSwitching(page, consoleErrors),
    )
    assert.equal(switched.mapMode.active, "overworld_hex")
    assert.equal(switched.map.topology.kind, "hex")

    const firstPlayable = await runScenario("first playable progression", () =>
      completeFirstPlayableArc(page, consoleErrors),
    )
    assertFirstPlayableComplete(firstPlayable)

    const exported = await runScenario("persistence, offline catchup, and reset", () =>
      exerciseSaveReloadOfflineAndReset(page, firstPlayable, consoleErrors),
    )
    assert.ok(exported.payload.length > 200)
    await closeAdmin(page, consoleErrors)

    await runScenario("final screenshots", async () => {
      await assertNonBlankAppScreenshot(page)
      await assertNonBlankMapScreenshot(page)
    })
    await runScenario("console cleanliness", () => assert.deepEqual(consoleErrors, []))
  } finally {
    if (browser) await browser.close()
    await new Promise((resolve) => server.close(resolve))
  }
}

async function runScenario(name, scenario) {
  console.log(`[add-rpg-smoke] ${name}`)
  try {
    return await scenario()
  } catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error))
    const wrapped = new Error(`Scenario "${name}" failed: ${cause.message}`)
    wrapped.stack = cause.stack ? `${wrapped.message}\nCaused by: ${cause.stack}` : wrapped.stack
    throw wrapped
  }
}

async function assertBootAndRenderTextContract(page, consoleErrors) {
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
      state.shell?.interfaceHierarchy?.primary?.label === "Map" &&
      state.shell?.interfaceHierarchy?.secondary?.label === "Decision" &&
      state.shell?.interfaceHierarchy?.tertiary?.label === "Status" &&
      state.shell?.interfaceHierarchy?.advanced?.label === "Admin" &&
      state.shell?.interfaceHierarchy?.advanced?.hiddenByDefault === true &&
      state.shell?.interfaceHierarchy?.questions?.whereAmI?.length > 0 &&
      state.shell?.interfaceHierarchy?.questions?.whatChanged?.length > 0 &&
      state.shell?.interfaceHierarchy?.questions?.whatShouldIDoNow?.length > 0 &&
      state.shell?.interfaceHierarchy?.questions?.whatHappensIfIWait?.length > 0 &&
      typeof state.shell?.currentAction?.label === "string" &&
      state.shell.currentAction.label.length > 0 &&
      typeof state.shell.currentAction.detail === "string" &&
      state.shell.currentAction.detail.length > 0 &&
      typeof state.shell.currentAction.source === "string" &&
      state.shell?.shellMenuOpen === false &&
      state.shell?.adminOpen === false &&
      state.shell?.discoveryPanel?.collapsed === false &&
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
      state.map?.character?.visible === true &&
      state.map?.character?.authority === "browser_navigation_triggers_rust_time" &&
      state.map?.travel?.costGameMinutes === 60 &&
      state.map?.travel?.costRuntimeSeconds === 60 &&
      state.travel?.costGameMinutes === 60 &&
      state.travel?.costRuntimeSeconds === 60 &&
      state.travel?.confirmation?.eligible === true &&
      state.travel?.confirmation?.reason === "opening_reach_base_from_survivor_cave" &&
      state.map?.landmarks?.studioLabelVisible === true &&
      state.map?.landmarks?.survivorCaveVisible === true &&
      state.map?.authority?.rules === "rust_wasm_snapshot" &&
      state.map?.authority?.mutatesSimulation === false &&
      state.map?.presentation?.terrainArt === "procedural_painterly_topology" &&
      state.map?.presentation?.bubbleEffects === "animated_halo_edge" &&
      state.map?.presentation?.landmarkSprites === "procedural_sprite_stack" &&
      state.map?.presentation?.labelRendering === "high_resolution_phaser_text" &&
      state.map?.presentation?.ambience === "subtle_motes_and_topographic_scan" &&
      state.discovery?.phase === "enter_dungeon" &&
      typeof state.discovery?.nextAction?.label === "string" &&
      state.discovery.nextAction.label.length > 0 &&
      state.discovery.nextAction.kind === "enter_dungeon" &&
      state.discovery.nextAction.enabled === true &&
      state.discovery?.dungeonEntryAvailable === true &&
      state.discovery?.dungeonEntryTarget === "add.rpg.dungeon.survivor-cave" &&
      state.discovery?.enabledActionIds?.includes("dungeon:add.rpg.dungeon.survivor-cave") &&
      state.discovery?.enabledActionIds?.includes("first-playable:reach-base") &&
      state.dungeonObjective === null &&
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
  assert.match(initial.shell.interfaceHierarchy.questions.whereAmI, /Overworld/)
  assert.equal(initial.shell.interfaceHierarchy.secondary.actionLabel, initial.shell.currentAction.label)
  assert.equal(initial.shell.interfaceHierarchy.secondary.actionEnabled, initial.shell.currentAction.enabled)
  assert.ok(
    ["first_playable", "discovery"].includes(initial.shell.currentAction.source),
    "Initial current action should be owned by the tutorial or discovery loop.",
  )
  assert.equal(initial.shell.currentAction.primaryEnabled, true)
  assert.match(initial.shell.interfaceHierarchy.tertiary.waitForecast, /60m|Clock/)
  assert.equal(await page.locator("#current-action-surface").count(), 1)
  assert.equal(await page.locator("#interface-hierarchy-brief").count(), 0)
  for (const question of [
    "what-should-i-do",
    "what-if-i-wait",
    "what-changed",
    "where-am-i",
  ]) {
    assert.equal(
      await page.locator(`#current-action-surface .decision-brief [data-question="${question}"]`).count(),
      1,
      `Current action should expose ${question} in the compact decision brief.`,
    )
  }
  assert.equal(await page.locator("#discovery-next-action").count(), 0)
  assert.equal(await page.locator("#base-management-recommendation").count(), 0)
  assert.equal(await page.locator("#first-playable-action").count(), 0)
  assert.equal(initial.snapshot.heroMap, initial.map.landmarks.survivorCave)
  assert.equal(initial.mapMode.scale.topology, "hex")
  assert.equal(initial.mapMode.scale.travelScale, "strategic")
  assert.equal(initial.mapMode.scale.timePerCellSeconds, 3600)
  assert.equal(initial.mapMode.scale.preserveAspectRatio, true)
  assert.ok(initial.ui.resourceCount > 0)
  assert.ok(initial.catalog.worldActionCount > 0)
  return initial
}

function assertInitialVisibilityContract(initial) {
  assertInitialDiscoveryAnchors(initial)
  assert.ok(initial.map.visibility.hiddenCells > 0, "Initial overworld should contain hidden cells")
  assert.ok(initial.map.knownFacts.hiddenCells > 0)
  assert.ok(initial.map.knownFacts.exactTerrainKnownCells > 0)
  assert.ok(initial.map.knownFacts.dynamicRiskKnownCells > 0)
  assert.ok(initial.map.knownFacts.vagueTravelLabels > 0)
  assert.equal(typeof initial.map.knownFacts.sampleHiddenTravelLabel, "string")
  assert.ok(initial.map.knownFacts.sampleHiddenTravelLabel.length > 0)
  assert.ok(initial.map.knownFacts.dynamicRiskKnownCells < initial.map.cells.total)
  assert.equal(initial.map.visibility.hiddenCells, initial.map.knownFacts.hiddenCells)
  assert.ok(initial.map.visibility.visibleCells > 0)
  assert.ok(initial.map.visibility.discoveredCells > 0)
  assert.equal(initial.map.visibility.fogRendering, "phaser_visual_overlay")
  assert.equal(initial.map.visibility.affectsAuthority, false)
  assert.equal(initial.map.visibility.travelRevealPreviewActive, false)
  assert.equal(initial.map.visibility.travelRevealPreviewCells, 0)
  assert.equal(
    initial.map.visibility.hiddenCellRendering,
    "invisible_until_known_or_travel_revealed",
  )
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
  assert.equal(
    initial.map.presentation.visibilityPolish.fogEdge,
    "soft_feathered_visibility_boundary",
  )
  assert.equal(initial.map.presentation.visibilityPolish.revealEffect, "expanding_ripple")
  assert.equal(initial.map.presentation.visibilityPolish.caveMouthSilhouettes, true)
  assert.equal(
    initial.map.presentation.visibilityPolish.travelReveal,
    "progressive_in_travel_radius",
  )
  assert.equal(initial.map.presentation.visibilityPolish.authority, "visual_only")
  assert.ok(initial.map.presentation.visibilityPolish.laterModifiers.includes("day_night_radius"))
  assert.ok(initial.map.presentation.visibilityPolish.laterModifiers.includes("weather_season"))
  assert.ok(
    initial.map.presentation.visibilityPolish.laterModifiers.includes(
      "scouting_buildings_items",
    ),
  )
}

function assertFirstPlayableComplete(firstPlayable) {
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
}

async function exerciseMapModeSwitching(page, consoleErrors) {
  await page.locator("#map-mode-dungeon_square").click()
  const dungeon = await waitForTextState(
    page,
    (state) =>
      state.mapMode?.active === "dungeon_square" &&
      state.mapMode?.topology === "square" &&
      state.mapMode?.fixture === false &&
      state.map?.topology?.kind === "square" &&
      state.map?.topology?.fixture === false &&
      state.map?.mapId === "add.rpg.dungeon.studio" &&
      state.map?.cells?.total > 100 &&
      state.map?.cells?.blocked > 0 &&
      state.map?.cells?.bubbleEdge === 0 &&
      // Dungeon FOV: a wall-occluded cone limits what is lit, so some cells are
      // visible and most stay hidden until explored.
      state.map?.visibility?.visibleCells > 0 &&
      state.map?.visibility?.hiddenCells > 0 &&
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
      state.mapMode?.scale?.travelScale === "interior" &&
      state.mapMode?.scale?.timePerCellSeconds === null &&
      state.map?.topology?.kind === "square" &&
      state.map?.mapId === "add.rpg.base.studio" &&
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

async function exerciseBaseManagementSurface(page, consoleErrors) {
  await page.locator("#map-mode-base_square").click()
  const base = await waitForTextState(
    page,
    (state) =>
      state.mapMode?.active === "base_square" &&
      state.shell?.adminOpen === false &&
      state.baseManagement?.active === true &&
      state.baseManagement?.title === "The Studio" &&
      state.baseManagement?.tabIds?.includes("crystal") &&
      state.baseManagement?.tabIds?.includes("build") &&
      state.baseManagement?.tabIds?.includes("power") &&
      state.baseManagement?.tabIds?.includes("crew") &&
      state.baseManagement?.tabIds?.includes("social") &&
      state.baseManagement?.tabIds?.includes("expeditions") &&
      state.baseManagement?.tabIds?.includes("resonance") &&
      state.baseManagement?.tabIds?.includes("processing") &&
      state.baseManagement?.resourcePressure?.some((resource) => resource.id === "resource.bassline") &&
      state.baseManagement?.resourcePressure?.every(
        (resource) =>
          typeof resource.gainPerSecond === "number" &&
          typeof resource.spendPerSecond === "number" &&
          typeof resource.netPerSecond === "number" &&
          (resource.productionZeroReason === null ||
            typeof resource.productionZeroReason === "string"),
      ) &&
      state.baseManagement?.rolePressure?.some((role) => role.id === "role.crystal_bassline") &&
      state.baseManagement?.economy?.waitForecasts?.length === 3 &&
      state.baseManagement?.economy?.waitForecasts?.some((forecast) => forecast.label === "1m") &&
      state.baseManagement?.economy?.waitForecasts?.some((forecast) => forecast.label === "5m") &&
      state.baseManagement?.economy?.waitForecasts?.some((forecast) => forecast.label === "30m") &&
      state.baseManagement?.staffing?.presets?.some((preset) => preset.id === "balanced") &&
      state.baseManagement?.staffing?.presets?.some((preset) => preset.id === "push_reach") &&
      state.baseManagement?.staffing?.presets?.some((preset) => preset.id === "gather_stone") &&
      state.baseManagement?.staffing?.presets?.some((preset) => preset.id === "recover_power") &&
      state.baseManagement?.staffing?.slotPools?.some((pool) => pool.id === "crystal_circle") &&
      state.baseManagement?.staffing?.slotPools?.some((pool) => pool.id === "fire_pit") &&
      state.baseManagement?.stationMachine?.cards?.some((card) => card.id === "station.studio") &&
      state.baseManagement?.stationMachine?.cards?.some((card) => card.id === "station.crystal_circle") &&
      state.baseManagement?.stationMachine?.cards?.some((card) => card.id === "station.fire_pit") &&
      state.baseManagement?.stationMachine?.groups?.some((group) => group.id === "studio") &&
      state.baseManagement?.stationMachine?.groups?.some((group) => group.id === "crystal") &&
      typeof state.baseManagement?.socialPressure?.headline === "string" &&
      typeof state.baseManagement?.socialPressure?.vibes?.explanation === "string" &&
      typeof state.baseManagement?.socialPressure?.housing?.warning === "string" &&
      typeof state.baseManagement?.socialPressure?.recruitment?.costProjection === "string" &&
      typeof state.baseManagement?.socialPressure?.supportForecast?.copy === "string" &&
      state.baseManagement?.expeditions?.targets?.some(
        (target) => target.id === "expedition.local_scavenge_sweep",
      ) &&
      typeof state.baseManagement?.expeditions?.summary === "string" &&
      state.baseManagement?.resonance?.recipes?.some(
        (recipe) => recipe.id === "resonance.recipe.bassline_overtone",
      ) &&
      typeof state.baseManagement?.resonance?.summary === "string" &&
      state.baseManagement?.playerLoop?.steps?.length === 8 &&
      state.baseManagement?.playerLoop?.steps?.filter((step) => step.status === "current").length === 1 &&
      typeof state.baseManagement?.playerLoop?.health?.label === "string" &&
      typeof state.baseManagement?.playerLoop?.rateWatch?.summary === "string" &&
      typeof state.baseManagement?.playerLoop?.returnPlan?.summary === "string" &&
      typeof state.baseManagement?.recommendedAction?.label === "string" &&
      typeof state.baseManagement?.nextBottleneck?.label === "string" &&
      state.baseManagement?.rateChange === null,
    consoleErrors,
  )
  assert.equal(base.shell.adminOpen, false)
  assert.equal(base.shell.currentAction.source, "base_loop")
  assert.equal(base.shell.currentAction.label, base.baseManagement.recommendedAction.label)
  assert.ok(base.baseManagement.recommendedAction.kind.length > 0)
  assert.deepEqual(
    base.baseManagement.playerLoop.steps.map((step) => step.id),
    [
      "check_health",
      "see_bottleneck",
      "act",
      "watch_rates",
      "push_growth",
      "come_back",
      "review_return",
      "decide_again",
    ],
    "Base player loop should expose the full idle decision cadence.",
  )
  assert.ok(
    ["stable", "strained", "critical"].includes(base.baseManagement.playerLoop.health.status),
    "Base player loop should expose a stable health status.",
  )
  assert.ok(
    base.baseManagement.playerLoop.rateWatch.rates.length > 0,
    "Base player loop should expose visible rates to watch after actions.",
  )
  assert.ok(
    typeof base.baseManagement.playerLoop.decisionHint === "string" &&
      base.baseManagement.playerLoop.decisionHint.length > 0,
    "Base player loop should explain how to make the next decision.",
  )
  assert.ok(base.baseManagement.resourcePressure.length >= 3)
  assert.ok(base.baseManagement.rolePressure.length >= 3)
  assert.ok(base.baseManagement.economy.waitForecasts.length, "Base economy should forecast wait outcomes.")
  assert.ok(
    base.baseManagement.economy.stalledSystems.every(
      (system) => typeof system.reason === "string" && system.reason.length > 0,
    ),
    "Every stalled base system should have a human-readable reason.",
  )
  assert.ok(
    typeof base.baseManagement.economy.offlinePreview.summary === "string" &&
      base.baseManagement.economy.offlinePreview.summary.length > 0,
    "Base economy should expose an offline preview summary.",
  )
  assert.ok(
    ["locked", "ready", "waiting_vibes", "pending_arrival", "housing_tight", "overcrowded"].includes(
      base.baseManagement.socialPressure.status,
    ),
    "Social pressure should expose a stable strategic status.",
  )
  assert.ok(
    typeof base.baseManagement.socialPressure.vibes.lossExplanation === "string" &&
      base.baseManagement.socialPressure.vibes.lossExplanation.length > 0,
    "Vibes should explain gain/loss pressure.",
  )
  assert.ok(
    typeof base.baseManagement.socialPressure.supportForecast.copy === "string" &&
      base.baseManagement.socialPressure.supportForecast.copy.length > 0,
    "Recruitment should forecast whether the base can support the recruit.",
  )
  assert.ok(
    base.baseManagement.rolePressure.some(
      (role) =>
        role.id === "role.crystal_bassline" &&
        role.slotPool === "crystal_circle" &&
        role.nextWorkerDeltaPerSecond > 0 &&
        typeof role.pressureCopy === "string",
    ),
    "Bassline staffing should expose slot pressure and next-worker impact.",
  )
  assert.ok(base.baseManagement.stationMachine.cards.length >= 7)
  assert.ok(
    base.baseManagement.stationMachine.cards.every(
      (card) =>
        typeof card.outputEffect === "string" &&
        card.outputEffect.length > 0 &&
        typeof card.brownoutPriorityCopy === "string" &&
        card.brownoutPriorityCopy.length > 0,
    ),
    "Every station machine card should explain output effect and brownout priority.",
  )
  assert.ok(
    base.baseManagement.stationMachine.cards.some(
      (card) =>
        card.id === "station.resonance_chamber" &&
        card.availableRecipeIds.includes("recipe.resonance_field_calibration"),
    ),
    "Resonance Chamber should expose its processing recipe.",
  )
  assert.ok(
    base.baseManagement.stationMachine.cards.some(
      (card) =>
        card.id === "station.crystal_circle" &&
        card.availableRecipeIds.includes("construction.slot_capacity"),
    ),
    "Crystal Circle should expose crystal upgrade work as recipes.",
  )
  assert.ok(base.baseManagement.buildLoop.projects.length >= 15)
  assert.deepEqual(
    [...base.baseManagement.buildLoop.groups.map((group) => group.id)].sort(),
    ["crystal", "housing", "repair", "station", "support"].sort(),
    "Construction loop should expose repair, crystal, station, housing, and support categories.",
  )
  ;[
    "project.expand_bunks",
    "project.safe_water_systems",
    "project.expedition_staging",
    "project.prepare_loudspeakers",
  ].forEach((projectId) => {
    assert.ok(
      base.baseManagement.buildLoop.projects.some(
        (project) =>
          project.id === projectId &&
          typeof project.resultPreview === "string" &&
          project.resultPreview.length > 0 &&
          typeof project.futureEconomyChange === "string" &&
          project.futureEconomyChange.length > 0,
      ),
      `Construction loop should expose project ${projectId} with future economy copy.`,
    )
  })

  await page.locator("#base-management-panel").waitFor({ state: "visible" })
  const panelText = await page.locator("#base-management-panel").innerText()
  ;[
    "The Studio",
    "Player loop",
    "Health",
    "Bottleneck",
    "Recommended",
    "Do it",
    "Action",
    "Return",
    "Rates",
    "Check base health",
    "Make a better decision",
    "Base loop",
    "Current limiter",
    "Gain",
    "Spend",
    "Net",
    "1m",
    "5m",
    "30m",
    "Offline preview",
    "Crystal",
    "Build",
    "Power",
    "Crew",
    "Social",
    "Expeditions",
    "Resonance",
    "Processing",
  ].forEach((expectedText) => {
    assert.match(
      panelText,
      new RegExp(expectedText, "i"),
      `Base management panel should include ${expectedText}.`,
    )
  })
  assert.doesNotMatch(panelText, /Runtime|Snapshot|Debug/i)

  await clickVisibleElementByDomId(page, "base-tab-build")
  await waitForTextState(
    page,
    (state) => state.baseManagement?.active === true && state.baseManagement?.selectedTab === "build",
    consoleErrors,
  )
  const buildPanelText = await page.locator("#base-management-panel").innerText()
  ;[
    "Construction loop",
    "Repair",
    "Crystal",
    "Station",
    "Housing",
    "Support",
    "Expand Bunks",
    "Safer Water Systems",
    "Expedition Prep Structures",
    "Relay and Loudspeaker Prep",
    "Workers",
    "Missing resource",
    "Future economy",
  ].forEach((expectedText) => {
    assert.match(
      buildPanelText,
      new RegExp(expectedText, "i"),
      `Build panel should include ${expectedText}.`,
    )
  })
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-construction-loop-smoke.png",
    "ADD RPG construction loop surface screenshot",
  )
  await clickVisibleElementByDomId(page, "base-tab-crystal")
  await waitForTextState(
    page,
    (state) => state.baseManagement?.active === true && state.baseManagement?.selectedTab === "crystal",
    consoleErrors,
  )

  const beforeBassline = base.baseManagement.rolePressure.find((role) => role.id === "role.crystal_bassline")
  const beforeBasslineResource = base.baseManagement.resourcePressure.find(
    (resource) => resource.id === "resource.bassline",
  )
  assert.ok(beforeBassline)
  assert.ok(beforeBasslineResource)
  await clickVisibleElementByDomId(page, "base-role-bassline-plus")
  const staffedBassline = await waitForTextState(
    page,
    (state) => {
      const role = state.baseManagement?.rolePressure?.find((candidate) => candidate.id === "role.crystal_bassline")
      const resource = state.baseManagement?.resourcePressure?.find((candidate) => candidate.id === "resource.bassline")
      return (
        state.baseManagement?.active === true &&
        role?.crewAssigned === beforeBassline.crewAssigned + 1 &&
        resource?.gainPerSecond > beforeBasslineResource.gainPerSecond &&
        state.baseManagement?.staffing?.freeCrew === base.baseManagement.staffing.freeCrew - 1 &&
        state.baseManagement?.rateChange?.changes.some(
          (change) => change.id === "resource.bassline" && change.deltaPerSecond > 0,
        )
      )
    },
    consoleErrors,
  )
  assert.match(
    staffedBassline.baseManagement.staffing.visibleImpact.rateSummary,
    /Bassline|resource/i,
    "Staffing impact should describe the changed economy.",
  )
  assert.ok(
    staffedBassline.baseManagement.rateChange?.changes.some(
      (change) => change.id === "resource.bassline" && change.deltaPerSecond > 0,
    ),
    "Crew movement should expose a visible Bassline rate delta.",
  )
  assert.match(
    await page.locator("#base-rate-change").innerText(),
    /Rate change|Bassline/i,
    "Staffing panel should show the rate change after moving crew.",
  )
  await clickVisibleElementByDomId(page, "base-role-bassline-minus")
  await waitForTextState(
    page,
    (state) =>
      state.baseManagement?.rolePressure?.find((role) => role.id === "role.crystal_bassline")
        ?.crewAssigned === beforeBassline.crewAssigned,
    consoleErrors,
  )

  await clickVisibleElementByDomId(page, "base-tab-crew")
  await waitForTextState(
    page,
    (state) => state.baseManagement?.active === true && state.baseManagement?.selectedTab === "crew",
    consoleErrors,
  )
  const crewPanelText = await page.locator("#base-management-panel").innerText()
  ;[
    "Staffing command",
    "Hero task",
    "Balanced",
    "Push reach",
    "Gather stone",
    "Recover power",
    "Crystal slots",
    "Fire Pit seats",
  ].forEach((expectedText) => {
    assert.match(
      crewPanelText,
      new RegExp(expectedText, "i"),
      `Crew panel should include ${expectedText}.`,
    )
  })
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-staffing-management-smoke.png",
    "ADD RPG staffing management surface screenshot",
  )

  await clickVisibleElementByDomId(page, "base-tab-power")
  await waitForTextState(
    page,
    (state) => state.baseManagement?.active === true && state.baseManagement?.selectedTab === "power",
    consoleErrors,
  )
  const machinePanelText = await page.locator("#base-management-panel").innerText()
  ;[
    "Station machine",
    "Crystal Circle",
    "Studio",
    "Fire Pit",
    "Resonance Chamber",
    "Mix Console",
    "Workshop",
    "Research Booth",
    "Current job",
    "Available recipes",
    "Brownout priority",
    "Chorus/s",
  ].forEach((expectedText) => {
    assert.match(
      machinePanelText,
      new RegExp(expectedText, "i"),
      `Station machine panel should include ${expectedText}.`,
    )
  })
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-station-machine-smoke.png",
    "ADD RPG station machine surface screenshot",
  )

  await clickVisibleElementByDomId(page, "base-tab-social")
  await waitForTextState(
    page,
    (state) => state.baseManagement?.active === true && state.baseManagement?.selectedTab === "social",
    consoleErrors,
  )
  const socialPanelText = await page.locator("#base-management-panel").innerText()
  ;[
    "Social pressure",
    "Bunks",
    "Recruitment",
    "Vibes",
    "Can we support this recruit",
    "Pending arrival",
    "Gain",
    "Loss",
    "Cost",
  ].forEach((expectedText) => {
    assert.match(
      socialPanelText,
      new RegExp(expectedText, "i"),
      `Social panel should include ${expectedText}.`,
    )
  })
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-social-pressure-smoke.png",
    "ADD RPG social pressure surface screenshot",
  )

  await clickVisibleElementByDomId(page, "base-tab-expeditions")
  const expeditions = await waitForTextState(
    page,
    (state) =>
      state.baseManagement?.active === true &&
      state.baseManagement?.selectedTab === "expeditions" &&
      state.baseManagement?.expeditions?.targets?.some(
        (target) => target.id === "expedition.local_scavenge_sweep" && target.enabled,
      ),
    consoleErrors,
  )
  assert.equal(expeditions.baseManagement.expeditions.activeCount, 0)
  assert.ok(expeditions.baseManagement.expeditions.availableCrew >= 1)
  const expeditionPanelText = await page.locator("#base-management-panel").innerText()
  ;[
    "Expedition board",
    "Target",
    "Local Scavenge Sweep",
    "Low risk",
    "Stone",
    "Returned reports",
  ].forEach((expectedText) => {
    assert.match(
      expeditionPanelText,
      new RegExp(expectedText, "i"),
      `Expeditions panel should include ${expectedText}.`,
    )
  })
  await clickVisibleElementByDomId(page, "base-start-expedition-expedition-local_scavenge_sweep")
  const activeExpedition = await waitForTextState(
    page,
    (state) =>
      state.baseManagement?.selectedTab === "expeditions" &&
      state.baseManagement?.expeditions?.activeCount === 1 &&
      state.baseManagement?.expeditions?.activeJobs?.some(
        (job) => job.targetId === "expedition.local_scavenge_sweep",
      ),
    consoleErrors,
  )
  assert.equal(
    activeExpedition.baseManagement.expeditions.availableCrew,
    expeditions.baseManagement.expeditions.availableCrew - 1,
  )
  await page.evaluate(() => window.advanceTime?.(120000))
  const returnedExpedition = await waitForTextState(
    page,
    (state) =>
      state.baseManagement?.selectedTab === "expeditions" &&
      state.baseManagement?.expeditions?.activeCount === 0 &&
      state.baseManagement?.expeditions?.completedReportCount >= 1 &&
      state.baseManagement?.expeditions?.reports?.some(
        (report) => report.targetId === "expedition.local_scavenge_sweep",
      ),
    consoleErrors,
  )
  assert.ok(
    returnedExpedition.baseManagement.expeditions.reports.some((report) =>
      /Stone/i.test(report.rewardCopy),
    ),
    "Returned expedition report should describe material rewards.",
  )
  assert.ok(
    returnedExpedition.baseManagement.expeditions.reports.some((report) =>
      /Echo|Signal/i.test(report.resonanceCopy),
    ),
    "Returned expedition report should describe strange material rewards.",
  )
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-expeditions-smoke.png",
    "ADD RPG expeditions surface screenshot",
  )

  await clickVisibleElementByDomId(page, "base-tab-resonance")
  const resonanceReady = await waitForTextState(
    page,
    (state) =>
      state.baseManagement?.active === true &&
      state.baseManagement?.selectedTab === "resonance" &&
      state.baseManagement?.resonance?.materials?.some(
        (material) => material.id === "echo_shards" && material.value >= 1,
      ) &&
      state.baseManagement?.resonance?.recipes?.some(
        (recipe) => recipe.id === "resonance.recipe.bassline_overtone" && recipe.enabled,
      ),
    consoleErrors,
  )
  assert.equal(resonanceReady.baseManagement.resonance.tuning.basslineLevel, 0)
  await assertVisibleText(page, "#base-management-panel", [
    "Resonance loop",
    "Strange material",
    "Crystal tuning",
    "Bassline Overtone",
    "Start resonance",
  ])
  await clickVisibleElementByDomId(
    page,
    "base-start-resonance-resonance-recipe-bassline_overtone",
  )
  await waitForTextState(
    page,
    (state) =>
      state.baseManagement?.selectedTab === "resonance" &&
      state.baseManagement?.resonance?.activeJobCount === 1 &&
      state.baseManagement?.resonance?.recipes?.some(
        (recipe) => recipe.id === "resonance.recipe.bassline_overtone" && recipe.inProgress,
      ),
    consoleErrors,
  )
  await page.evaluate(() => window.advanceTime?.(300000))
  const tunedResonance = await waitForTextState(
    page,
    (state) =>
      state.baseManagement?.selectedTab === "resonance" &&
      state.baseManagement?.resonance?.activeJobCount === 0 &&
      state.baseManagement?.resonance?.tuning?.basslineLevel >= 1,
    consoleErrors,
  )
  assert.ok(
    tunedResonance.baseManagement.resonance.tuning.basslineBonusPercent >= 6,
    "Bassline Overtone should improve Bassline tuning.",
  )
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-resonance-smoke.png",
    "ADD RPG resonance conversion surface screenshot",
  )

  for (const tab of ["build", "power", "crew", "social", "expeditions", "resonance", "processing", "crystal"]) {
    await clickVisibleElementByDomId(page, `base-tab-${tab}`)
    await waitForTextState(
      page,
      (state) =>
        state.baseManagement?.active === true &&
        state.baseManagement?.selectedTab === tab &&
        state.shell?.adminOpen === false,
      consoleErrors,
    )
  }

  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-base-management-smoke.png",
    "ADD RPG base management surface screenshot",
  )
  return returnToOverworld(page, consoleErrors)
}

async function assertMobilePresentation(browser, url) {
  for (const viewport of MOBILE_PRESENTATION_VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
    })
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
          state.map?.presentation?.terrainArt === "procedural_painterly_topology" &&
          state.shell?.questPanel?.collapsed === true,
        consoleErrors,
      )
      await assertMobileLayoutComposition(page, viewport)
      await assertNonBlankNamedAppScreenshot(
        page,
        `add-rpg-${viewport.name}-smoke.png`,
        `ADD RPG ${viewport.name} app screenshot`,
      )
      assert.deepEqual(consoleErrors, [])
    } finally {
      await page.close()
    }
  }
}

async function assertMobileLayoutComposition(page, viewport) {
  const metrics = await page.evaluate(() => {
    function rectFor(selector) {
      const element = document.querySelector(selector)
      if (!(element instanceof HTMLElement)) return null
      const rect = element.getBoundingClientRect()
      return {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }
    }

    const contextPanel = document.querySelector(
      "#discovery-panel, #base-management-panel, #dungeon-context-panel, #offline-return-panel",
    )
    let context = null
    if (contextPanel instanceof HTMLElement) {
      const rect = contextPanel.getBoundingClientRect()
      context = {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }
    }

    return {
      width: window.innerWidth,
      height: window.innerHeight,
      topbar: rectFor(".map-topbar"),
      questPanel: rectFor("#first-playable-panel"),
      cameraControls: rectFor(".map-camera-controls"),
      context,
    }
  })

  assert.ok(metrics.topbar, `${viewport.name}: expected compact topbar`)
  assert.ok(metrics.context, `${viewport.name}: expected contextual bottom sheet`)
  assert.ok(metrics.questPanel, `${viewport.name}: expected objective tracker`)
  assert.ok(metrics.cameraControls, `${viewport.name}: expected camera controls`)
  assert.equal(metrics.width, viewport.width)
  assert.equal(metrics.height, viewport.height)
  assert.ok(metrics.topbar.height <= 46, `${viewport.name}: topbar is too tall`)
  assert.ok(metrics.questPanel.height <= 64, `${viewport.name}: objective tracker should start collapsed`)
  assert.ok(
    metrics.questPanel.top >= metrics.topbar.bottom + 2,
    `${viewport.name}: objective tracker overlaps the topbar`,
  )
  assert.ok(
    metrics.context.top >= viewport.height * 0.55,
    `${viewport.name}: contextual panel should behave like a bottom sheet`,
  )
  assert.ok(
    metrics.context.bottom <= viewport.height + 1,
    `${viewport.name}: contextual panel overflows the viewport`,
  )
  assert.ok(
    metrics.cameraControls.bottom <= metrics.context.top - 4,
    `${viewport.name}: camera controls overlap the bottom sheet`,
  )
  assert.ok(
    metrics.cameraControls.left >= 0 && metrics.cameraControls.right <= viewport.width,
    `${viewport.name}: camera controls should remain reachable`,
  )
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
    assert.equal(
      state.shell?.currentAction?.source,
      "first_playable",
      `The shared current action should own first-playable progression: ${JSON.stringify(
        state.shell?.currentAction,
      )}`,
    )
    const actionButton = page.locator("#current-action-primary")
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
      state.ui?.firstPlayable?.persistenceReady === true &&
      state.offlineReturn?.elapsedSeconds >= 3600,
    consoleErrors,
  )
  assert.ok(offlineTicked.snapshot.clockSeconds > imported.snapshot.clockSeconds)
  assert.equal(offlineTicked.ui.firstPlayable.persistenceReady, true)
  assert.equal(offlineTicked.offlineReturn.source, "manual")
  assert.ok(
    Array.isArray(offlineTicked.offlineReturn.resourceDeltas),
    "Offline return should expose resource gains as an array.",
  )
  assert.ok(
    offlineTicked.offlineReturn.summary.includes("manual") ||
      offlineTicked.offlineReturn.summary.includes("online-only"),
    "Offline return should explain what did not progress.",
  )
  assert.deepEqual(
    new Set(offlineTicked.offlineReturn.didNotProgress.map((rule) => rule.id)),
    new Set([
      "manual_hero_world_actions",
      "base_stone_collection",
      "base_water_collection",
    ]),
    "Offline return should preserve the explicit online-only rule split.",
  )
  assert.equal(typeof offlineTicked.offlineReturn.bubble.summary, "string")
  assert.equal(typeof offlineTicked.offlineReturn.brownout.summary, "string")
  assert.equal(typeof offlineTicked.offlineReturn.nextAction.label, "string")
  assert.ok(
    offlineTicked.offlineReturn.review.blockerCount >= offlineTicked.offlineReturn.didNotProgress.length,
    "Offline return review should make blocker count scannable.",
  )
  assert.match(
    offlineTicked.offlineReturn.review.manualProgressionRule,
    /Automated|manual|online/i,
    "Offline return review should clarify manual-vs-offline progression rules.",
  )
  await closeAdmin(page, consoleErrors)
  await page.locator("#offline-return-panel").waitFor({ state: "visible" })
  await assertVisibleText(page, "#offline-return-panel", [
    "While you were away",
    "Manual catch-up",
    "Gained",
    "Completed",
    "Recruits",
    "Bubble",
    "Brownouts",
    "Blockers",
    "Unchanged systems",
    "Offline rules",
    "Automated loops only",
    "After dismissing",
    "Continue to next action",
  ])
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-offline-return-smoke.png",
    "ADD RPG offline return summary screenshot",
  )
  await page.locator("#dismiss-offline-return-primary").click()
  await page.locator("#offline-return-panel").waitFor({ state: "hidden" })
  await waitForTextState(
    page,
    (state) =>
      state.offlineReturn === null &&
      state.shell?.currentAction?.source !== "offline_return" &&
      state.shell?.currentAction?.label === offlineTicked.offlineReturn.nextAction.label,
    consoleErrors,
  )

  await openAdmin(page, consoleErrors)
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
  assert.equal(await page.locator("#save-payload").inputValue(), "{ invalid add save")
  await page.locator("#import-save").dispatchEvent("click")
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

  await page.locator("#open-shell-menu").click()
  await waitForTextState(
    page,
    (nextState) => nextState.shell?.shellMenuOpen === true,
    consoleErrors,
  )
  await page.locator("#open-admin").click()
  await page.locator("#admin-view.open").waitFor({ state: "visible" })
  await page.locator("#save-payload").waitFor({ state: "visible" })
  return waitForTextState(
    page,
    (nextState) =>
      nextState.shell?.adminOpen === true && nextState.shell?.shellMenuOpen === false,
    consoleErrors,
  )
}

async function closeAdmin(page, consoleErrors) {
  const state = await renderGameToText(page)
  if (state.shell?.adminOpen !== true) return state

  await page.locator("#close-admin").click()
  const closed = await waitForTextState(
    page,
    (nextState) => nextState.shell?.adminOpen === false,
    consoleErrors,
  )
  await page.waitForTimeout(240)
  return closed
}

async function assertVisibleText(page, selector, fragments) {
  const locator = page.locator(selector)
  await locator.waitFor({ state: "visible" })
  const text = await locator.textContent()
  for (const fragment of fragments) {
    assert.ok(
      text?.includes(fragment),
      `Expected ${selector} to include "${fragment}", got: ${text}`,
    )
  }
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
  await page.locator("#first-playable-body").waitFor({ state: "hidden" })
  const collapsed = await waitForTextState(
    page,
    (state) => state.shell?.questPanel?.collapsed === true,
    consoleErrors,
  )
  assert.equal(collapsed.shell.questPanel.x, dragged.shell.questPanel.x)
  assert.equal(collapsed.shell.questPanel.y, dragged.shell.questPanel.y)

  await page.locator("#toggle-first-playable-panel").click()
  await page.locator("#first-playable-body").waitFor({ state: "visible" })
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

async function characterScreenPoint(page, state) {
  const character = state.map?.character
  assert.ok(character, "ADD RPG telemetry should expose character coordinates")
  assert.ok(Number.isFinite(character.x), "ADD RPG character should expose a world x")
  assert.ok(Number.isFinite(character.y), "ADD RPG character should expose a world y")
  return worldScreenPoint(page, state, { x: character.x, y: character.y })
}

async function worldScreenPoint(page, state, worldPoint) {
  return (await worldScreenPointCandidates(page, state, worldPoint))[0]
}

async function worldScreenPointCandidates(page, state, worldPoint) {
  const canvas = page.locator("#add-world canvas")
  await canvas.waitFor({ state: "visible" })
  const box = await canvas.boundingBox()
  assert.ok(box, "ADD RPG Phaser canvas should have a browser box")
  const camera = state.map?.camera
  assert.ok(camera, "ADD RPG telemetry should expose camera coordinates")
  const cameraOrigin = {
    x: box.width / 2,
    y: box.height / 2,
  }
  return [
    {
      x: box.x + (worldPoint.x - camera.scrollX - cameraOrigin.x) * camera.zoom + cameraOrigin.x,
      y: box.y + (worldPoint.y - camera.scrollY - cameraOrigin.y) * camera.zoom + cameraOrigin.y,
    },
    {
      x: box.x + (worldPoint.x - camera.scrollX) * camera.zoom,
      y: box.y + (worldPoint.y - camera.scrollY) * camera.zoom,
    },
  ]
}

async function clickWorldPointUntilSelected(page, state, worldPoint, predicate, consoleErrors) {
  if (predicate(state)) return state
  const candidates = await worldScreenPointCandidates(page, state, worldPoint)
  let lastError
  for (const point of candidates) {
    await page.mouse.move(point.x, point.y)
    await page.mouse.click(point.x, point.y)
    try {
      return await waitForTextState(page, predicate, consoleErrors, 700)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error("No world-point candidate selected the expected cell.")
}

async function clickViewportPointUntilSelected(page, viewportPoint, predicate, consoleErrors) {
  const current = await renderGameToText(page)
  if (predicate(current)) return current
  const canvas = page.locator("#add-world canvas")
  await canvas.waitFor({ state: "visible" })
  const box = await canvas.boundingBox()
  assert.ok(box, "ADD RPG Phaser canvas should have a browser box")
  const candidates = [
    { x: box.x + viewportPoint.x, y: box.y + viewportPoint.y },
    { x: box.x + viewportPoint.x + 12, y: box.y + viewportPoint.y },
    { x: box.x + viewportPoint.x - 12, y: box.y + viewportPoint.y },
    { x: box.x + viewportPoint.x, y: box.y + viewportPoint.y + 12 },
    { x: box.x + viewportPoint.x, y: box.y + viewportPoint.y - 12 },
  ]
  let lastError
  for (const point of candidates) {
    await page.mouse.move(point.x, point.y)
    await page.mouse.click(point.x, point.y)
    try {
      return await waitForTextState(page, predicate, consoleErrors, 700)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error("No viewport-point candidate selected the expected cell.")
}

async function exerciseStudioTileDetailLinks(page, consoleErrors) {
  const before = await renderGameToText(page)
  const restoreQuestPanel = before.shell?.questPanel?.collapsed === false
  if (restoreQuestPanel) {
    await page.locator("#toggle-first-playable-panel").click()
    await waitForTextState(
      page,
      (state) => state.shell?.questPanel?.collapsed === true,
      consoleErrors,
    )
  }

  try {
    for (let index = 0; index < 3; index += 1) {
      await page.locator("#map-zoom-out").click()
    }

    const zoomed = await waitForTextState(
      page,
      (state) =>
        state.mapMode?.active === "overworld_hex" &&
        state.map?.landmarks?.baseCenter === "0,0" &&
        state.map?.landmarks?.baseCenterViewport !== null,
      consoleErrors,
    )
    const selectedStudio = await clickViewportPointUntilSelected(
      page,
      zoomed.map.landmarks.baseCenterViewport,
      (state) =>
        state.mapMode?.active === "overworld_hex" &&
        state.discovery?.tileDetail?.cell === "hex:0,0" &&
        state.discovery.tileDetail.label === "The Studio" &&
        state.discovery.tileDetail.hasSubmap === true &&
        state.discovery.tileDetail.linkCount >= 2 &&
        state.discovery.tileDetail.linkKinds.includes("base") &&
        state.discovery.tileDetail.linkKinds.includes("area") &&
        state.discovery.tileDetail.linkLabels.includes("The Studio") &&
        state.discovery.tileDetail.linkLabels.includes("Studio Grounds") &&
        state.discovery.tileDetail.targetMapModes.includes("base_square") &&
        state.discovery.tileDetail.targetMapModes.includes("area_hex") &&
        state.discovery.tileDetail.targetMapIds.includes("add.rpg.base.studio") &&
        state.discovery.tileDetail.targetMapIds.includes("add.rpg.area.studio-grounds") &&
        state.discovery.tileDetail.actionIds.includes(
          "tile-action:base:tile-link:base:studio-echo",
        ) &&
        state.discovery.tileDetail.enabledLinkIds.some((id) => id.includes("base")) &&
        state.discovery.tileDetail.actionKinds.includes("manage_base") &&
        state.discovery.tileDetail.actionKinds.includes("enter_submap") &&
        !state.discovery.tileDetail.targetMapIds.includes("add.rpg.dungeon.studio"),
      consoleErrors,
    )
    assert.ok(selectedStudio.discovery.tileDetail.linkCount >= 2)
    await openDetailsSection(page, "#selected-tile-section")
    await page.waitForFunction(() => {
      const element = document.querySelector("#selected-tile-decision")
      return element?.textContent?.includes("The Studio")
    })
    const studioTileText = await page
      .locator("#selected-tile-decision")
      .evaluate((element) => element.textContent ?? "")
    ;[
      "The Studio",
      "Studio Grounds",
      "Open The Studio",
      "Base",
    ].forEach((expectedText) => {
      assert.ok(
        studioTileText.includes(expectedText),
        `Studio tile detail should include ${expectedText}. Actual text: ${studioTileText}`,
      )
    })
    assert.ok(
      !studioTileText.includes("Enter The Studio"),
      "The overworld Studio tile should not expose direct dungeon entry.",
    )
    await assertNonBlankNamedAppScreenshot(
      page,
      "add-rpg-studio-tile-detail-smoke.png",
      "ADD RPG Studio tile detail screenshot",
    )

    await clickVisibleElementByDomId(
      page,
      "tile-detail-action-tile-action-base-tile-link-base-studio-echo",
    )
    await waitForTextState(
      page,
      (state) =>
        state.mapMode?.active === "base_square" &&
        state.map?.mapId === "add.rpg.base.studio" &&
        state.map?.landmarks?.renderedCount >= 3,
      consoleErrors,
    )
    const studioDungeonEntrance = page.locator("#enter-studio-dungeon")
    await studioDungeonEntrance.waitFor({ state: "visible" })
    assert.equal(
      await studioDungeonEntrance.innerText(),
      "Enter The Studio Dungeon",
      "The Studio subtile should expose the Studio dungeon entrance.",
    )
    await assertNonBlankNamedAppScreenshot(
      page,
      "add-rpg-studio-subtile-dungeon-entrance-smoke.png",
      "ADD RPG Studio subtile dungeon entrance screenshot",
    )
    await clickVisibleElementByDomId(page, "enter-studio-dungeon")
    await waitForTextState(
      page,
      (state) =>
        state.mapMode?.active === "dungeon_square" &&
        state.mapMode?.dungeonTarget === "add.rpg.dungeon.studio" &&
        state.mapMode?.lastDungeonEntryCommand === "interaction-enter:add.rpg.dungeon.studio" &&
        state.mapMode?.lastTileActionTarget === "add.rpg.dungeon.studio" &&
        state.map?.mapId === "add.rpg.dungeon.studio",
      consoleErrors,
    )

    await clickVisibleElementByDomId(page, "return-overworld")
    await waitForTextState(
      page,
      (state) =>
        (state.mapMode?.active === "base_square" &&
          state.map?.mapId === "add.rpg.base.studio") ||
        (state.mapMode?.active === "area_hex" &&
          state.map?.mapId === "add.rpg.area.studio-grounds"),
      consoleErrors,
    )

    return await returnToOverworld(page, consoleErrors)
  } finally {
    const afterReturn = await returnToOverworld(page, consoleErrors)
    if (restoreQuestPanel && afterReturn.shell?.questPanel?.collapsed === true) {
      await page.locator("#toggle-first-playable-panel").click()
      await waitForTextState(
        page,
        (nextState) => nextState.shell?.questPanel?.collapsed === false,
        consoleErrors,
      )
    }
  }
}

async function returnToOverworld(page, consoleErrors) {
  const state = await renderGameToText(page)
  if (state.mapMode?.active === "overworld_hex") return state

  const returnButton = page.locator("#return-overworld")
  if (await returnButton.isVisible()) {
    try {
      await clickVisibleElementByDomId(page, "return-overworld")
    } catch {
      await clickVisibleElementByDomId(page, "map-mode-overworld_hex")
    }
  } else {
    await clickVisibleElementByDomId(page, "map-mode-overworld_hex")
  }
  return waitForTextState(
    page,
    (nextState) => nextState.mapMode?.active === "overworld_hex",
    consoleErrors,
  )
}

async function exerciseSurvivorCaveDungeonEntry(page, consoleErrors) {
  const before = await renderGameToText(page)
  assert.equal(before.mapMode.active, "overworld_hex")
  assert.equal(before.map.character.coord, before.map.landmarks.survivorCave)
  assert.ok(
    before.map.character.dungeonLinksAtCell.some(
      (link) =>
        link.enabled === true &&
        link.label === "Survivor Cave" &&
        link.targetMapId === "add.rpg.dungeon.survivor-cave",
    ),
    "The Hero should stand on an enabled Survivor Cave dungeon link.",
  )
  assert.equal(before.discovery.phase, "enter_dungeon")
  assert.equal(before.discovery.dungeonEntryAvailable, true)

  assert.match(
    await page.locator("#enter-dungeon").innerText(),
    /Enter Survivor Cave/,
    "The overworld action should invite the player into the Survivor Cave.",
  )

  await clickVisibleElementByDomId(page, "enter-dungeon")
  const dungeon = await waitForTextState(
    page,
    (state) =>
      state.mapMode?.active === "dungeon_square" &&
      state.mapMode?.topology === "square" &&
      state.mapMode?.scale?.travelScale === "local" &&
      state.mapMode?.scale?.timePerCellSeconds === null &&
      state.map?.mapId === "add.rpg.dungeon.survivor-cave" &&
      state.map?.topology?.kind === "square" &&
      state.map?.validationValid === true &&
      state.map?.character?.cell === "square:2,4" &&
      state.dungeonObjective?.active === true &&
      state.dungeonObjective?.label === "Survivor Cave" &&
      state.dungeonObjective?.mapId === "add.rpg.dungeon.survivor-cave" &&
      state.dungeonObjective?.currentStepId === "survey-cave-mouth" &&
      state.dungeonObjective?.returnAvailable === true &&
      state.dungeonContext?.active === true &&
      state.dungeonContext?.panel === "dungeon_context" &&
      state.dungeonContext?.currentObjective?.currentStepId === "survey-cave-mouth" &&
      state.dungeonContext?.returnAction?.available === true &&
      state.dungeonContext?.discoveredExits?.labels?.includes("Return to overworld") &&
      state.dungeonContext?.blockers?.hiddenCells > 0 &&
      state.dungeonContext?.localMapState?.heroCell === "square:2,4",
    consoleErrors,
  )
  assert.equal(dungeon.ui.firstPlayable.currentStepId, before.ui.firstPlayable.currentStepId)
  assert.ok(
    dungeon.dungeonObjective.stepStatuses.some(
      (step) => step.id === "return-overworld" && step.status === "next",
    ),
    "Dungeon objective should include a return step.",
  )
  assert.match(
    await page.locator("#first-playable-panel").innerText(),
    /Survivor Cave|safe threshold|cave/i,
    "The objective panel should switch to cave-specific dungeon copy.",
  )
  const dungeonPanelText = await page.locator("#dungeon-context-panel").innerText()
  ;[
    "Dungeon status",
    "Current objective",
    "Discovered exits",
    "Blockers",
    "Local map",
    "Return to overworld",
  ].forEach((expectedText) => {
    assert.match(
      dungeonPanelText,
      new RegExp(expectedText, "i"),
      `Dungeon context panel should include ${expectedText}.`,
    )
  })
  assert.doesNotMatch(
    dungeonPanelText,
    /Return outside/i,
    "Dungeon context panel should not duplicate the full left objective step list.",
  )
  assert.doesNotMatch(
    dungeonPanelText,
    /Road to Base|Follow the low signal|Keep moving through the ash/i,
    "Dungeon context panel should stay local to dungeon mode, not global story choices.",
  )
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-survivor-cave-entry-smoke.png",
    "ADD RPG Survivor Cave entry screenshot",
  )

  await clickVisibleElementByDomId(page, "return-overworld")
  const returned = await waitForTextState(
    page,
    (state) =>
      state.mapMode?.active === "overworld_hex" &&
      state.mapMode?.scale?.travelScale === "strategic" &&
      state.map?.topology?.kind === "hex" &&
      state.map?.character?.coord === before.map.character.coord &&
      state.discovery?.phase === "enter_dungeon" &&
      state.discovery?.dungeonEntryAvailable === true &&
      state.dungeonObjective === null,
    consoleErrors,
  )
  assert.equal(returned.snapshot.clockSeconds >= before.snapshot.clockSeconds, true)
  return returned
}

async function exerciseMainCharacterMovement(page, consoleErrors) {
  const before = await renderGameToText(page)
  assert.equal(before.map?.character?.visible, true)
  assert.ok(before.map?.character?.cell, "Main character should report a cell")
  assert.equal(before.travel?.confirmation?.dramaState, "fresh")
  assert.equal(before.travel?.confirmation?.eligible, true)
  assert.equal(
    before.travel?.confirmation?.reason,
    "opening_reach_base_from_survivor_cave",
  )

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
  assert.equal(firstDialog.travel.confirmation.eligible, true)
  assert.equal(
    firstDialog.travel.confirmation.reason,
    "opening_reach_base_from_survivor_cave",
  )

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
  const observedTravelRevealProgress = new Set()
  await assertTravelRevealPreview(page, consoleErrors, {
    observedTravelClockTimes,
    observedTravelRevealProgress,
  })
  const moved = await waitForTextState(
    page,
    (state) => {
      if (state.ui?.worldTime?.animating && state.ui.worldTime.localTime) {
        observedTravelClockTimes.add(state.ui.worldTime.localTime)
      }
      if (state.map?.visibility?.travelRevealPreviewActive) {
        observedTravelRevealProgress.add(state.map.visibility.travelRevealPreviewProgress)
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
        state.travel?.confirmation?.eligible === false &&
        state.travel?.confirmation?.reason === "already_complete" &&
        state.ui?.worldTime?.animating === false &&
        state.map?.visibility?.travelRevealPreviewActive === false &&
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
  assert.equal(moved.discovery.phase, "movement")
  assert.equal(typeof moved.discovery.nextAction.label, "string")
  assert.ok(moved.discovery.nextAction.label.length > 0)
  assert.ok(["wait", "travel", "inspect", "enter_dungeon", "domain_action", "blocked"].includes(moved.discovery.nextAction.kind))
  assert.ok(
    moved.discovery.movementDiscoveredDelta > 0,
    "Discovery telemetry should report newly revealed cells after movement.",
  )
  assert.ok(
    moved.discovery.tileChoiceCount > 0,
    "Discovery telemetry should expose at least one tile choice after movement.",
  )
  assert.equal(moved.discovery.movementConsequences.active, true)
  assert.equal(typeof moved.discovery.movementConsequences.viralLoad.percent, "number")
  assert.equal(typeof moved.discovery.movementConsequences.viralLoad.delta, "number")
  assert.equal(typeof moved.discovery.movementConsequences.timeOfDay.phase, "string")
  assert.ok(
    ["safe", "watch", "danger", "critical"].includes(
      moved.discovery.movementConsequences.safety.severity,
    ),
    "Movement consequence safety severity should use the known survival scale.",
  )
  assert.equal(
    moved.discovery.movementConsequences.futureAuthority,
    "automatic_return_thresholds_later",
  )
  await openDetailsSection(page, "#movement-consequences-section")
  assert.match(
    await page.locator("#movement-consequences").innerText(),
    /Movement consequences|Viral load|Time|Safety/,
    "Movement consequence card should explain viral load, time, and safety pressure.",
  )
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-movement-consequences-smoke.png",
    "ADD RPG movement consequences screenshot",
  )
  assert.equal(
    await page.locator("#tile-choices-section").evaluate((node) => node.open),
    false,
    "Nearby tile choices should start collapsed behind a density control.",
  )
  assert.match(
    await page.locator("#current-action-surface").innerText(),
    /First playable|Discovery|Base loop|Dungeon objective|Return review/i,
    "The shared Current Action surface should remain the foreground decision.",
  )
  await page.locator("#toggle-discovery-panel").click()
  const collapsedDiscovery = await waitForTextState(
    page,
    (state) =>
      state.shell?.discoveryPanel?.collapsed === true &&
      typeof state.discovery?.nextAction?.label === "string" &&
      state.discovery.nextAction.label.length > 0,
    consoleErrors,
  )
  assert.equal(collapsedDiscovery.shell.discoveryPanel.collapsed, true)
  assert.equal(
    await page.locator("#discovery-panel-body").count(),
    0,
    "Collapsed Discovery panel should hide supporting detail.",
  )
  assert.match(
    await page.locator("#current-action-surface").innerText(),
    /First playable|Discovery|Base loop|Dungeon objective|Return review/i,
    "Collapsed Discovery panel should still show the shared Current Action surface.",
  )
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-discovery-collapsed-smoke.png",
    "ADD RPG collapsed discovery panel screenshot",
  )
  await page.locator("#toggle-discovery-panel").click()
  await waitForTextState(
    page,
    (state) => state.shell?.discoveryPanel?.collapsed === false,
    consoleErrors,
  )
  assert.ok(
    observedTravelClockTimes.size >= 3,
    `Travel clock should show multiple minute values, saw ${Array.from(observedTravelClockTimes).join(", ")}`,
  )
  assert.ok(
    Array.from(observedTravelRevealProgress).some((progress) => progress > 0 && progress < 1),
    `Travel should visually unveil cells before arrival, saw reveal progress values ${Array.from(
      observedTravelRevealProgress,
    ).join(", ")}`,
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
  const beforeInteraction = await renderGameToText(page)
  const heroPoint = await characterScreenPoint(page, beforeInteraction)

  await page.mouse.move(heroPoint.x, heroPoint.y)
  await waitForTextState(
    page,
    (state) => state.map?.interaction?.hoveredHex !== null,
    consoleErrors,
  )
  await page.mouse.click(heroPoint.x, heroPoint.y)
  const selected = await waitForTextState(
    page,
    (state) =>
      state.map?.interaction?.selectedHex !== null &&
      state.discovery?.selectedTile !== null &&
      state.discovery?.tileDetail !== null &&
      state.discovery.tileDetail.hasSubmap === false &&
      state.discovery.tileDetail.linkCount === 0 &&
      state.discovery.tileDetail.visibleLinkIds.length === 0 &&
      state.discovery.selectedTile.travelMinutes === 60 &&
      typeof state.discovery.selectedTile.travelRisk === "string" &&
      typeof state.discovery.selectedTile.standingHere === "boolean" &&
      Array.isArray(state.discovery.selectedTile.knownFacts) &&
      Array.isArray(state.discovery.selectedTile.unknownFacts) &&
      Number.isInteger(state.discovery.selectedTile.dungeonLinkCount) &&
      typeof state.discovery.selectedTile.usefulnessLevel === "string" &&
      state.discovery.selectedTile.usefulnessReasons.length > 0 &&
      Array.isArray(state.discovery.tileChoices) &&
      state.discovery.tileChoices.length > 0 &&
      state.discovery.tileChoices.every(
        (choice) =>
          typeof choice.actionLabel === "string" &&
          choice.actionLabel.length > 0 &&
          typeof choice.actionHint === "string" &&
          choice.actionHint.length > 0,
      ),
    consoleErrors,
  )
  await openDetailsSection(page, "#tile-choices-section")
  const tileChoicesText = await page.locator("#tile-choices-section").innerText()
  assert.match(
    tileChoicesText,
    /Review selected|Compare route|Review entrance|Assess scout|Use selected route/i,
    "Nearby tile choices should expose a player-facing action label.",
  )
  await page.evaluate(() => {
    const element = document.querySelector(".discovery-tile-choice")
    if (!(element instanceof HTMLElement)) {
      throw new Error("Expected a discovery tile choice to be available.")
    }
    element.click()
  })
  await openDetailsSection(page, "#selected-tile-section")
  assert.match(
    await page.locator("#selected-tile-decision").evaluate((element) => element.textContent ?? ""),
    /Travel|Toxicity|Known|Unknown|Links|Usefulness|Why it matters/,
    "Selected tile card should explain travel, risk, facts, usefulness, and optional submap links.",
  )
  await assertNonBlankNamedAppScreenshot(
    page,
    "add-rpg-selected-tile-decision-smoke.png",
    "ADD RPG selected tile decision screenshot",
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

  await page.mouse.move(heroPoint.x, heroPoint.y)
  await page.mouse.down()
  await page.mouse.move(heroPoint.x - 90, heroPoint.y - 54, { steps: 5 })
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

async function assertHiddenMapCellsAreInvisibleToPointer(page, consoleErrors) {
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
      assert.fail("Invisible hidden tiles should not become selected from blank map space.")
    }
  }

  const latest = await renderGameToText(page)
  if (restorePanel) {
    await page.locator("#toggle-first-playable-panel").click()
    return waitForTextState(
      page,
      (state) =>
        state.shell?.questPanel?.collapsed === false &&
        state.map?.interaction?.selectedDetail?.visibility !== "hidden",
      consoleErrors,
    )
  }
  return latest
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
  assert.equal(
    state.map.visibility.hiddenCellRendering,
    "invisible_until_known_or_travel_revealed",
  )
  assert.ok(state.map.visibility.hiddenCells > 0)
  assert.ok(state.map.visibility.visibleCells > 0)
  await assertNonBlankNamedMapScreenshot(
    page,
    "add-rpg-fog-map-smoke.png",
    "ADD RPG fog overlay map screenshot",
  )
}

async function assertTravelRevealPreview(page, consoleErrors, observations = {}) {
  const { observedTravelClockTimes, observedTravelRevealProgress } = observations
  const state = await waitForTextState(
    page,
    (candidate) => {
      collectTravelAnimationObservation(
        candidate,
        observedTravelClockTimes,
        observedTravelRevealProgress,
      )
      return (
        candidate.map?.character?.moving === true &&
        candidate.map?.visibility?.travelRevealPreviewActive === true &&
        candidate.map.visibility.travelRevealPreviewCells > 0 &&
        candidate.map.visibility.travelRevealPreviewProgress > 0 &&
        candidate.map.visibility.travelRevealPreviewProgress < 1 &&
        candidate.map.visibility.travelRevealDestinationCell === candidate.map.travel.toCell
      )
    },
    consoleErrors,
    2600,
  )
  await collectTravelAnimationObservations(
    page,
    observedTravelClockTimes,
    observedTravelRevealProgress,
  )
  await assertNonBlankNamedMapScreenshot(
    page,
    "add-rpg-travel-reveal-smoke.png",
    "ADD RPG in-travel fog reveal screenshot",
  )
  return state
}

async function collectTravelAnimationObservations(
  page,
  observedTravelClockTimes,
  observedTravelRevealProgress,
) {
  if (!observedTravelClockTimes && !observedTravelRevealProgress) return
  for (let sample = 0; sample < 5; sample += 1) {
    await page.waitForTimeout(80)
    collectTravelAnimationObservation(
      await renderGameToText(page),
      observedTravelClockTimes,
      observedTravelRevealProgress,
    )
  }
}

function collectTravelAnimationObservation(
  state,
  observedTravelClockTimes,
  observedTravelRevealProgress,
) {
  if (state.ui?.worldTime?.animating && state.ui.worldTime.localTime) {
    observedTravelClockTimes?.add(state.ui.worldTime.localTime)
  }
  if (state.map?.visibility?.travelRevealPreviewActive) {
    observedTravelRevealProgress?.add(state.map.visibility.travelRevealPreviewProgress)
  }
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
    if (page.isClosed()) return
    try {
      await page.waitForTimeout(intervalMs)
      if (page.isClosed()) return
      await page.keyboard.down(key)
    } catch (error) {
      if (
        page.isClosed() ||
        /Target page, context or browser has been closed/.test(String(error?.message ?? error))
      ) {
        return
      }
      throw error
    }
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

async function clickVisibleElementByDomId(page, id) {
  await page.waitForFunction((targetId) => document.getElementById(targetId) !== null, id)
  await page.evaluate((targetId) => {
    const element = document.getElementById(targetId)
    if (!(element instanceof HTMLElement)) {
      throw new Error(`Expected #${targetId} to be an HTMLElement.`)
    }
    element.scrollIntoView({ block: "center", inline: "nearest" })
    element.click()
  }, id)
}

async function openDetailsSection(page, selector) {
  const details = page.locator(selector)
  await details.waitFor({ state: "attached" })
  const isOpen = await details.evaluate((node) => {
    if (!(node instanceof HTMLDetailsElement)) {
      throw new Error(`Expected ${node.id || "target"} to be a details element.`)
    }
    return node.open
  })
  if (!isOpen) {
    await details.evaluate((node) => {
      node.open = true
    })
  }
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

async function assertNonBlankNamedAppScreenshot(page, filename, label) {
  fs.mkdirSync(path.dirname(SCREENSHOT_PATH), { recursive: true })
  const screenshotPath = path.join(ROOT_DIR, "tmp", filename)
  await page.locator("#app").screenshot({ path: screenshotPath })
  assertNonBlankImageBuffer(
    fs.readFileSync(screenshotPath),
    label,
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
