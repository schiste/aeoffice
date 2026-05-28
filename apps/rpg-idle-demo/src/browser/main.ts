import {
  eventTargetConsumesGameInput,
  gameInputTelemetry,
  InputController,
  joystickInputFromPointer,
  keyboardGameInputActionForKey,
  keyboardMovementDirectionForKey,
  movementControlIntentFromDataset,
  type MovementControlIntent,
  type RawMovementIntent,
} from "@aedventure/game-input"
import { validateVisualAssetCatalog } from "@aedventure/game-assets"
import { validateCompiledMap } from "@aedventure/game-map"
import {
  PhaserTileWorldRenderer,
  validateFixtureMapForRenderer,
  type FixtureMap,
  type RenderedPlayer,
  type RendererHostOptions,
  type RendererWorldInteractionCandidate,
  type RendererWorldInteractionInfo,
  type RendererZonePresentationOverride,
} from "@aedventure/game-renderer-phaser"
import type { Direction, MovementMode, MovementVector } from "@aedventure/game-protocol"
import {
  simulateMovement,
  zonesAtPosition,
  type CollisionMap,
  type Zone,
} from "@aedventure/map-engine"
import {
  RPG_IDLE_DEMO_ACTIONS,
  RPG_IDLE_DEMO_CATALOG,
  RPG_IDLE_DEMO_ENTITIES,
  createRpgIdleDemoMap,
  referencedRpgTokens,
} from "@aedventure/rpg-domain"

import "./styles.css"

declare global {
  interface Window {
    render_game_to_text?: () => string
    advanceTime?: (ms?: number) => Promise<string>
  }
}

interface Vector2 {
  readonly x: number
  readonly y: number
}

interface DemoState {
  readonly mapId: "rpg_idle_grove"
  heroPosition: Vector2
  heroDirection: Direction
  movementMode: MovementMode
  activeZoneIds: string[]
  wood: number
  gatherCount: number
  lastAction: string
  lastMovement:
    | {
        readonly accepted: boolean
        readonly reason?: string
        readonly requestedVector: MovementVector
        readonly appliedVector: MovementVector
      }
    | undefined
  blockedCount: number
  frameCount: number
  seq: number
}

const TILE_SIZE = 32
const HERO_BODY = { width: 20, height: 22 }
const WALK_SPEED = 92
const RUN_SPEED = 142
const FRAME_CAP_MS = 50
const GATHER_ACTION = RPG_IDLE_DEMO_ACTIONS[0]

const RPG_RENDERER_ASSET_PACK: RendererHostOptions["assetPack"] = {
  packKey: "aedventure.rpg-idle.core-pack",
  coreSection: "core-rpg-idle",
  manifestCacheKey: "aedventure.rpg-idle.atlas.manifest",
  imageTextureKey: "aedventure.rpg-idle.atlas.image",
  manifestPath: "assets/rpg-idle-atlas.manifest.json",
  imagePath: "assets/rpg-idle-atlas.svg",
  assetBundleId: "bundle.rpg-idle-demo.procedural",
  themeBundleId: "theme.rpg-idle-demo.grove",
  deferredSections: [],
}

const elements = {
  world: requiredElement<HTMLDivElement>("world"),
  zoneStatus: requiredElement<HTMLSpanElement>("zone-status"),
  heroStatus: requiredElement<HTMLParagraphElement>("hero-status"),
  woodCount: requiredElement<HTMLSpanElement>("wood-count"),
  actionStatus: requiredElement<HTMLParagraphElement>("action-status"),
  buildStatus: requiredElement<HTMLSpanElement>("build-status"),
  gatherAction: requiredElement<HTMLButtonElement>("gather-action"),
  runToggle: requiredElement<HTMLButtonElement>("run-toggle"),
  resetDemo: requiredElement<HTMLButtonElement>("reset-demo"),
  zoomIn: requiredElement<HTMLButtonElement>("zoom-in"),
  zoomOut: requiredElement<HTMLButtonElement>("zoom-out"),
  zoomReset: requiredElement<HTMLButtonElement>("zoom-reset"),
  moveButtons: [
    ...document.querySelectorAll<HTMLButtonElement>(".move-button"),
  ],
}

const domainMap = createRpgIdleDemoMap()
const fixtureMap = fixtureMapFromDomainMap()
const assetCatalogErrors = validateVisualAssetCatalog(RPG_IDLE_DEMO_CATALOG)
const mapValidation = validateCompiledMap(
  domainMap.compiled,
  domainMap.spawnPoints,
)
const rendererMapValidation = validateFixtureMapForRenderer(fixtureMap)
const collisionMap: CollisionMap = {
  width: domainMap.compiled.width * domainMap.compiled.tileSize,
  height: domainMap.compiled.height * domainMap.compiled.tileSize,
  tileSize: domainMap.compiled.tileSize,
  blockedTiles: domainMap.compiled.blockedTiles,
}
const interactionZones: readonly Zone[] = domainMap.compiled.zones.map((zone) => ({
  id: zone.id,
  bounds: {
    x: zone.xStart * TILE_SIZE,
    y: zone.yStart * TILE_SIZE,
    width: (zone.xEnd - zone.xStart) * TILE_SIZE,
    height: (zone.yEnd - zone.yStart) * TILE_SIZE,
  },
}))

const renderer = new PhaserTileWorldRenderer(elements.world, {
  assetPack: RPG_RENDERER_ASSET_PACK,
})
const input = new InputController(
  { analogCurveExponent: 1 },
  {
    joystickDefaultRadiusPx: 42,
    joystickDeadzoneRatio: 0.18,
  },
)
let nextControlId = 1
let lastFrameAt = performance.now()
let rafId = 0

const initialHeroPosition = spawnCenter("hero_spawn")
const state: DemoState = {
  mapId: "rpg_idle_grove",
  heroPosition: initialHeroPosition,
  heroDirection: "down",
  movementMode: "walk",
  activeZoneIds: [],
  wood: 0,
  gatherCount: 0,
  lastAction: "Ready",
  lastMovement: undefined,
  blockedCount: 0,
  frameCount: 0,
  seq: 1,
}

renderer.renderMap(fixtureMap)
void renderer.advanceTime().then(() => {
  renderer.setCameraMode("fit_room")
  renderer.setEffectsOptions({
    enabled: true,
    quality: "low",
    tenantLighting: "day",
  })
})
renderer.setWorldInteractionActivationHandler((candidateId) => {
  if (candidateId === "interaction.gather_wood") {
    gatherWood("marker")
  }
})
updateDerivedWorldState()
renderApp()
updateRenderer()
installInputHandlers()
window.render_game_to_text = renderGameToText
window.advanceTime = async (ms = 1000 / 60) => {
  advanceSimulation(ms)
  await renderer.advanceTime()
  return renderGameToText()
}
rafId = requestAnimationFrame(frame)

function frame(now: number): void {
  const deltaMs = Math.min(FRAME_CAP_MS, Math.max(0, now - lastFrameAt))
  lastFrameAt = now
  advanceSimulation(deltaMs)
  rafId = requestAnimationFrame(frame)
}

function advanceSimulation(deltaMs: number): void {
  const intent = input.activeHeldIntent()
  state.frameCount += 1

  if (intent) {
    applyMovement(intent, deltaMs)
  } else {
    state.movementMode = input.activeMovementMode()
  }

  updateDerivedWorldState()
  updateRenderer()
  renderApp()
}

function applyMovement(intent: RawMovementIntent, deltaMs: number): void {
  const seq = state.seq
  state.seq += 1
  const currentTopLeft = centerToBodyTopLeft(state.heroPosition)
  const result = simulateMovement({
    current: currentTopLeft,
    vector: intent.vector,
    seq,
    map: collisionMap,
    playerSize: HERO_BODY,
    speedPxPerSecond: intent.movementMode === "run" ? RUN_SPEED : WALK_SPEED,
    deltaMs,
    collisionSlide: {
      maxNudgePx: 10,
      nudgeStepPx: 2,
    },
    zones: interactionZones,
    currentZoneIds: state.activeZoneIds,
  })

  if (result.accepted) {
    state.heroPosition = bodyTopLeftToCenter(result.position)
  } else if (result.reason === "collision") {
    state.blockedCount += 1
  }

  state.heroDirection = result.direction
  state.movementMode = intent.movementMode
  state.lastMovement = {
    accepted: result.accepted,
    reason: result.reason,
    requestedVector: result.requestedVector,
    appliedVector: result.appliedVector,
  }
}

function updateDerivedWorldState(): void {
  state.activeZoneIds = zonesAtPosition(
    interactionZones,
    centerToBodyTopLeft(state.heroPosition),
    HERO_BODY,
  ).map((zone) => zone.id)
}

function updateRenderer(): void {
  renderer.setZoneInteractionState({
    activeZoneIds: state.activeZoneIds,
    availableActionZoneIds: gatherAvailable() ? [GATHER_ACTION.requiredZoneId] : [],
    joinedZoneIds: [],
    presentations: zonePresentations(),
  })
  renderer.setWorldInteractions(worldInteractionInfo())
  renderer.updatePlayers([heroPlayer()])
}

function renderApp(): void {
  const inGrove = gatherAvailable()
  elements.zoneStatus.textContent = inGrove ? "Grove ready" : "Outside grove"
  elements.zoneStatus.classList.toggle("subtle", !inGrove)
  elements.heroStatus.textContent = inGrove
    ? "Close enough to gather from the old tree."
    : "Move the scout toward the grove."
  elements.woodCount.textContent = `${state.wood} wood`
  elements.gatherAction.disabled = !inGrove
  elements.actionStatus.textContent = state.lastAction
  elements.buildStatus.textContent =
    state.wood >= 3 ? "Materials staged" : "Foundation"
  elements.runToggle.textContent = input.activeMovementMode() === "run" ? "Run" : "Walk"
  elements.runToggle.classList.toggle("active", input.activeMovementMode() === "run")

  const viewport = renderer.getViewportState()
  elements.zoomReset.textContent = `${Math.round(viewport.zoomFactor * 100)}%`
}

function heroPlayer(): RenderedPlayer {
  const intent = input.activeHeldIntent()
  const speed = state.movementMode === "run" ? RUN_SPEED : WALK_SPEED
  return {
    playerId: "hero.scout",
    name: "Scout",
    avatarId: "ember",
    position: state.heroPosition,
    direction: state.heroDirection,
    movementMode: state.movementMode,
    cameraMotion: {
      velocity: intent
        ? {
            x: intent.vector.x * speed,
            y: intent.vector.y * speed,
          }
        : { x: 0, y: 0 },
      speedPxPerSecond: intent ? speed : 0,
      inputActive: Boolean(intent),
      correcting: false,
      movementMode: state.movementMode,
    },
    local: true,
    rejected: state.lastMovement?.accepted === false,
  }
}

function gatherWood(source: "button" | "keyboard" | "marker"): void {
  if (!gatherAvailable()) {
    state.lastAction = "Move closer to the grove."
    renderApp()
    return
  }

  state.wood += GATHER_ACTION.resourceDelta.wood
  state.gatherCount += 1
  state.lastAction =
    source === "marker"
      ? "Scout gathered wood from the marker."
      : "Scout gathered wood."
  renderer.triggerAvatarEmote("hero.scout", "focus")
  updateRenderer()
  renderApp()
}

function resetDemo(): void {
  state.heroPosition = initialHeroPosition
  state.heroDirection = "down"
  state.movementMode = "walk"
  state.activeZoneIds = []
  state.wood = 0
  state.gatherCount = 0
  state.lastAction = "Ready"
  state.lastMovement = undefined
  state.blockedCount = 0
  state.seq = 1
  input.clearHeldInput()
  input.setRunToggled(false)
  updateDerivedWorldState()
  updateRenderer()
  renderApp()
}

function gatherAvailable(): boolean {
  return state.activeZoneIds.includes(GATHER_ACTION.requiredZoneId)
}

function zonePresentations(): readonly RendererZonePresentationOverride[] {
  return [
    {
      zoneId: "zone.grove",
      color: 0x4f936b,
      textColor: "#f8fff8",
      glyph: "G",
      tone: "resource",
      label: "Grove",
      prompt: "Gather wood",
      availableAction: "gather_wood",
      feedback: gatherAvailable() ? "Ready" : "Nearby",
      kind: "resource",
    },
  ]
}

function worldInteractionInfo(): RendererWorldInteractionInfo {
  const available = gatherAvailable()
  const candidate: RendererWorldInteractionCandidate = {
    id: "interaction.gather_wood",
    kind: "zone",
    targetId: GATHER_ACTION.requiredZoneId,
    action: "gather_wood",
    label: "Gather wood",
    prompt: available ? "Gather" : "Approach",
    bounds: interactionZones[0].bounds,
    active: available,
    distancePx: distanceToZoneCenter(interactionZones[0]),
    permission: available ? "permitted" : "denied",
    serverPermitted: available,
    permissionReason: available ? undefined : "Scout is outside the grove.",
    markerVisible: true,
    presentation: {
      color: available ? 0x2f6f51 : 0x8b985f,
      textColor: "#ffffff",
      glyph: "E",
      tone: "resource",
      prompt: available ? "Gather" : "Approach",
    },
  }

  return {
    source: "server_permitted_world_interactions",
    authority: "server_permitted_actions_only",
    permissionSource: "dev_world_action_policy",
    state: available ? "available" : "denied",
    actionAffordance: available ? "press_e_or_tap" : "walk_nearby",
    hotkeyLabel: "E",
    tapLabel: "Tap",
    presentation: {
      markerStyle: "action_marker_cards",
      markerEffectMode: "layered_pin_pulse_shadow",
      selectionMode: "hover_click_marker",
      objectSelectionMode: "hover_select_target_outline",
      doorPortalFeedback: "directional_beacon_and_bounds",
      actionFlow: "approach_permission_confirm_execute",
      touchAffordance: "large_marker_hit_area_dom_prompt",
      privateAreaFeedback: available ? "available" : "denied",
    },
    primaryCandidateId: candidate.id,
    activeCandidateIds: available ? [candidate.id] : [],
    permittedCandidateIds: available ? [candidate.id] : [],
    deniedCandidateIds: available ? [] : [candidate.id],
    candidates: [candidate],
  }
}

function fixtureMapFromDomainMap(): FixtureMap {
  const tokens = referencedRpgTokens(domainMap.compiled)

  return {
    definition: {
      style: domainMap.definition.style,
    },
    compiled: {
      width: domainMap.compiled.width,
      height: domainMap.compiled.height,
      tileSize: domainMap.compiled.tileSize,
      blockedTiles: domainMap.compiled.blockedTiles,
      layers: domainMap.compiled.layers,
      collisionLayers: domainMap.compiled.collisionLayers,
      zones: domainMap.compiled.zones,
    },
    catalog: {
      tokens: tokens.map((token) => ({
        id: token.id,
        kind: token.kind,
        provisionalGid: token.provisionalGid,
        widthTiles: token.widthTiles,
        heightTiles: token.heightTiles,
        asset: token.asset,
      })),
    },
  }
}

function renderGameToText(): string {
  const mapValidationInfo = renderer.getMapValidationInfo()
  const zoneInfo = renderer.getZoneInfo()
  const viewport = renderer.getViewportState()
  const performanceInfo = renderer.getPerformanceInfo()
  const capabilityInfo = renderer.getCapabilityInfo()

  return JSON.stringify({
    app: "rpg-idle-demo",
    coordinateSystem: "pixels, origin top-left, x right, y down",
    engineBoundary: {
      domain: "@aedventure/rpg-domain",
      renderer: "@aedventure/game-renderer-phaser",
      uses: [
        "@aedventure/game-assets",
        "@aedventure/game-map",
        "@aedventure/game-input",
        "@aedventure/game-renderer-phaser",
      ],
      importsOfficeDomain: false,
    },
    map: {
      id: state.mapId,
      label: domainMap.label,
      width: domainMap.compiled.width,
      height: domainMap.compiled.height,
      tileSize: domainMap.compiled.tileSize,
      validationValid: mapValidation.valid,
      rendererValidationValid: mapValidationInfo.valid,
      rendererMutationSafe: mapValidationInfo.mutationSafe,
      blockedTileCount: domainMap.compiled.blockedTiles.length,
      zoneIds: domainMap.compiled.zones.map((zone) => zone.id),
    },
    assets: {
      catalogValid: assetCatalogErrors.length === 0,
      catalogErrors: assetCatalogErrors,
      referencedTokenIds: referencedRpgTokens(domainMap.compiled).map(
        (token) => token.id,
      ),
      rendererPrimarySource: capabilityInfo.assets.primarySource,
      fallbackTokenIds: capabilityInfo.assets.fallbackTokenIds,
    },
    hero: {
      id: "hero.scout",
      x: round(state.heroPosition.x),
      y: round(state.heroPosition.y),
      tileX: Math.floor(state.heroPosition.x / TILE_SIZE),
      tileY: Math.floor(state.heroPosition.y / TILE_SIZE),
      direction: state.heroDirection,
      movementMode: state.movementMode,
      activeZoneIds: state.activeZoneIds,
    },
    entities: RPG_IDLE_DEMO_ENTITIES.map((entity) => ({
      id: entity.id,
      kind: entity.kind,
      label: entity.label,
      tokenId: entity.tokenId,
      tile: entity.tile,
    })),
    action: {
      id: GATHER_ACTION.id,
      available: gatherAvailable(),
      gatherCount: state.gatherCount,
      lastAction: state.lastAction,
      primaryCandidateId: worldInteractionInfo().primaryCandidateId,
    },
    resources: {
      wood: state.wood,
    },
    input: gameInputTelemetry(input.snapshot(), { repeatMs: 16 }),
    movement: {
      seq: state.seq,
      last: state.lastMovement,
      blockedCount: state.blockedCount,
    },
    renderer: {
      ...capabilityInfo,
      readiness: mapValidationInfo.valid ? "ready" : "invalid_map",
      viewport,
      zoneInfo,
      performance: {
        mapRenderCount: performanceInfo.lifecycle.mapRenderCount,
        objectCount: performanceInfo.runtime.displayObjectCount,
        textureCount: performanceInfo.runtime.textureCount,
        lastMapRenderDurationMs: performanceInfo.runtime.lastMapRenderDurationMs,
      },
    },
    tests: {
      rendererPreflightValid: rendererMapValidation.valid,
      mapValidationSummary: mapValidation.summary,
    },
  })
}

function installInputHandlers(): void {
  window.addEventListener("keydown", (event) => {
    if (eventTargetConsumesGameInput(event.target)) return

    const direction = keyboardMovementDirectionForKey(event.key)
    if (direction) {
      event.preventDefault()
      if (!event.repeat) input.pressDirection(direction)
      return
    }

    const action = keyboardGameInputActionForKey(event.key)
    if (!action) return

    if (action.type === "interact") {
      event.preventDefault()
      gatherWood("keyboard")
      return
    }

    if (action.type === "run") {
      input.setShiftRunning(true)
    }
  })

  window.addEventListener("keyup", (event) => {
    const direction = keyboardMovementDirectionForKey(event.key)
    if (direction) {
      input.releaseDirection(direction)
      return
    }

    const action = keyboardGameInputActionForKey(event.key)
    if (action?.type === "run") {
      input.setShiftRunning(false)
    }
  })

  elements.gatherAction.addEventListener("click", () => gatherWood("button"))
  elements.resetDemo.addEventListener("click", resetDemo)
  elements.runToggle.addEventListener("click", () => {
    input.toggleRun()
    renderApp()
  })
  elements.zoomIn.addEventListener("click", () => {
    renderer.zoomIn()
    renderApp()
  })
  elements.zoomOut.addEventListener("click", () => {
    renderer.zoomOut()
    renderApp()
  })
  elements.zoomReset.addEventListener("click", () => {
    renderer.resetZoom()
    renderApp()
  })

  for (const button of elements.moveButtons) {
    installMoveButton(button)
  }
}

function installMoveButton(button: HTMLButtonElement): void {
  let activeControl: MovementControlIntent | undefined

  const press = (pointerId: number) => {
    const intent = movementControlIntentFromDataset(button.dataset)
    if (!intent) return

    activeControl = {
      ...intent,
      id: nextControlId,
    }
    nextControlId += 1
    input.pressControl(activeControl)
    button.classList.add("active")
    input.setJoystickPointer(pointerId)
  }

  const release = () => {
    if (activeControl) input.releaseControl(activeControl.id)
    activeControl = undefined
    button.classList.remove("active")
    input.releaseJoystick()
  }

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault()
    button.setPointerCapture(event.pointerId)
    press(event.pointerId)
  })
  button.addEventListener("pointermove", (event) => {
    if (!activeControl) return

    const rect = button.getBoundingClientRect()
    input.updateJoystick(
      joystickInputFromPointer({
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        surfaceRect: rect,
        deadzoneRatio: 0.18,
        minMagnitude: 0.1,
        previousDirection: activeControl.direction,
      }),
    )
  })
  button.addEventListener("pointerup", release)
  button.addEventListener("pointercancel", release)
  button.addEventListener("lostpointercapture", release)
}

function spawnCenter(spawnId: string): Vector2 {
  const spawn = domainMap.spawnPoints.find((candidate) => candidate.id === spawnId)
  if (!spawn) throw new Error(`Unknown RPG spawn point: ${spawnId}`)

  return {
    x: spawn.position.x + TILE_SIZE / 2,
    y: spawn.position.y + TILE_SIZE / 2,
  }
}

function centerToBodyTopLeft(position: Vector2): Vector2 {
  return {
    x: position.x - HERO_BODY.width / 2,
    y: position.y - HERO_BODY.height / 2,
  }
}

function bodyTopLeftToCenter(position: Vector2): Vector2 {
  return {
    x: position.x + HERO_BODY.width / 2,
    y: position.y + HERO_BODY.height / 2,
  }
}

function distanceToZoneCenter(zone: Zone): number {
  const center = {
    x: zone.bounds.x + zone.bounds.width / 2,
    y: zone.bounds.y + zone.bounds.height / 2,
  }

  return round(
    Math.hypot(center.x - state.heroPosition.x, center.y - state.heroPosition.y),
  )
}

function round(value: number): number {
  return Number(value.toFixed(2))
}

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Missing element #${id}`)
  return element as T
}

window.addEventListener("beforeunload", () => {
  cancelAnimationFrame(rafId)
  renderer.destroy()
})
