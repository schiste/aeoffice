import { createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js"
import html from "solid-js/html"
import { render } from "solid-js/web"
import {
  SimulationClient,
  addCommandForGameInteraction,
  selectAddDiscoverySummary,
  selectAddDungeonObjective,
  selectAddUiState,
  selectAddWorldTimeForClockSeconds,
  workerRequestForAddCommand,
  applyDungeonFieldOfView,
  applyDungeonDoorStates,
  dungeonDoorKey,
  emptyDungeonVisibility,
  addDungeonByMapId,
  ADD_MAP_MODE_OPTIONS,
  STUDIO_DUNGEON_MAP_ID,
  addMapModeLabel,
  createAddWorldForMapMode,
  type AddUiState,
  type AddDiscoveryActionLink,
  type AddDungeonObjectiveStep,
  type AddDiscoveryMovementEvent,
  type AddFirstPlayableAction,
  type AddMapMode,
  type AddWorldTimeSummary,
  type CatalogSnapshot,
  type SimulationSnapshot,
  type WorkerRequest,
} from "@aedventure/add-domain"
import type { CellCoord } from "@aedventure/game-topology"
import type { GameInteraction, GameWorld } from "@aedventure/game-world"

import type { VisibilityMap } from "@aedventure/game-visibility"
import {
  AddRpgPhaserMapHost,
  type AddCharacterTravelEvent,
  type AddPhaserMapInfo,
} from "./phaser-add-map"
import {
  createAddRuntimeTextState,
  type RuntimeTextState,
  type AddTelemetryTravelDialogEligibility as TravelDialogEligibility,
  type AddTelemetryTravelDialogEligibilityReason as TravelDialogEligibilityReason,
  type AddTelemetryTravelDialogKind as TravelDialogKind,
  type AddTelemetryTravelDramaState as TravelDramaState,
  type AddTelemetryTravelExperience as TravelExperience,
} from "./add-telemetry-presenter"
import {
  clearAutosave,
  createSaveRecord,
  formatDuration,
  formatSaveTimestamp,
  offlineCatchupSecondsFor,
  readAutosave,
  writeAutosave,
  type AddBrowserSaveRecord,
  type AddSaveSource,
} from "./save-runtime"
import {
  ADD_DUNGEON_AMBIENT_RUNTIME_SECONDS_PER_TICK,
  ADD_DUNGEON_STEP_PRESENTATION,
  ADD_TILE_TRAVEL_PRESENTATION,
  createAddClockAdvancePresentationTiming,
} from "./travel-presentation-timing"
import "./styles.css"

const ROLE_CRYSTAL_BASSLINE = "role.crystal_bassline"
const ROLE_CONSTRUCTION = "role.construction"
const ROLE_FIRE_PIT = "role.fire_pit"
const ROLE_SCAVENGE = "role.scavenge"
const ROLE_WATER = "role.water"
const PROJECT_RESTORE_STUDIO = "project.restore_studio"
const PROJECT_BUILD_FIRE_PIT = "project.build_fire_pit"
const OPENING_TRAVEL_STEP_ID = "reach-base"

const FIRST_PLAYABLE_ROLE_IDS = [
  ROLE_CRYSTAL_BASSLINE,
  ROLE_SCAVENGE,
  ROLE_CONSTRUCTION,
  ROLE_FIRE_PIT,
  ROLE_WATER,
] as const

interface QuestPanelPosition {
  readonly x: number
  readonly y: number
}

interface TravelDialogState {
  readonly kind: TravelDialogKind
  readonly event: AddCharacterTravelEvent
  readonly resolve: (accepted: boolean) => void
}

interface ClockAnimationState {
  readonly fromClockSeconds: number
  readonly toClockSeconds: number
  readonly currentClockSeconds: number
  readonly remainingMinutes: number
  readonly totalMinutes: number
  readonly durationMs: number
  readonly clockStepMs: number
  readonly reason: string
}

declare global {
  interface Window {
    render_game_to_text?: () => string
    advanceTime?: (milliseconds?: number) => Promise<string>
  }
}

let snapshotVersion = 0
let snapshotWaiters: Array<{ afterVersion: number; resolve: () => void }> = []
let requestInFlight = false
let saveVersion = 0
let saveWaiters: Array<{ afterVersion: number; resolve: (payload: string | null) => void }> = []
let saveRequestInFlight = false
let pendingSaveSource: AddSaveSource = "autosave"
let lastSavePayload: string | null = null
let autosaveRestoreAttempted = false
let queuedOfflineCatchupSeconds = 0
let lastAutosaveRequestMs = 0

const [snapshot, setSnapshot] = createSignal<SimulationSnapshot | null>(null)
const [catalog, setCatalog] = createSignal<CatalogSnapshot | null>(null)
const [world, setWorld] = createSignal<GameWorld | null>(null)
const [mapMode, setMapMode] = createSignal<AddMapMode>("overworld_hex")
const [dungeonTarget, setDungeonTarget] = createSignal<string>(STUDIO_DUNGEON_MAP_ID)
const [mapInfo, setMapInfo] = createSignal<AddPhaserMapInfo>(emptyMapInfo())
const [autosaveRecord, setAutosaveRecord] = createSignal<AddBrowserSaveRecord | null>(readAutosave())
const [autosaveEnabled, setAutosaveEnabled] = createSignal(true)
const [savePayload, setSavePayload] = createSignal(autosaveRecord()?.payload ?? "")
const [saveStatus, setSaveStatus] = createSignal(formatSaveTimestamp(autosaveRecord()))
const [storageError, setStorageError] = createSignal<string | null>(null)
const [lastManualExportAtMs, setLastManualExportAtMs] = createSignal<number | null>(null)
const [lastImportAtMs, setLastImportAtMs] = createSignal<number | null>(null)
const [lastOfflineCatchupSeconds, setLastOfflineCatchupSeconds] = createSignal(0)
const [resetCount, setResetCount] = createSignal(0)
const [online, setOnline] = createSignal(typeof navigator === "undefined" ? true : navigator.onLine)
const [ready, setReady] = createSignal(false)
// Ambient world clock runs by default ("autoTick"). It advances the runtime in
// fixed 1-second steps; the speed multiplier only changes how often a step fires
// (every 1000/timeSpeed ms), never the step size, so 2x/4x play stays behaviorally
// identical to real time. It pauses only while the Hero crosses a tile (gated on
// travelExperience phase) so the per-hex +1h stays exact, then resumes on arrival.
const [autoTick, setAutoTick] = createSignal(true)
const [timeSpeed, setTimeSpeed] = createSignal(1)
const [adminOpen, setAdminOpen] = createSignal(false)
const [firstPlayableCollapsed, setFirstPlayableCollapsed] = createSignal(false)
const [questPanelPosition, setQuestPanelPosition] = createSignal(defaultQuestPanelPosition())
const [travelExperience, setTravelExperience] = createSignal<TravelExperience | null>(null)
const [lastDiscoveryMovement, setLastDiscoveryMovement] =
  createSignal<AddDiscoveryMovementEvent | null>(null)
const [travelDialog, setTravelDialog] = createSignal<TravelDialogState | null>(null)
const [displayClockSeconds, setDisplayClockSeconds] = createSignal<number | null>(null)
const [clockAnimation, setClockAnimation] = createSignal<ClockAnimationState | null>(null)
const [lastEvent, setLastEvent] = createSignal("booting")
const [lastCommand, setLastCommand] = createSignal<string | null>(null)
const [lastError, setLastError] = createSignal<string | null>(null)

let mapHost: AddRpgPhaserMapHost | null = null
let travelClearTimer: number | undefined
let clockAnimationFrameId: number | undefined
let travelDramaState: TravelDramaState = "fresh"
let questPanelDrag:
  | {
      readonly pointerId: number
      readonly startX: number
      readonly startY: number
      readonly originX: number
      readonly originY: number
    }
  | null = null

const client = new SimulationClient({
  createWorker: () =>
    new Worker(new URL("../workers/add-runtime.worker.ts", import.meta.url), {
      type: "module",
    }),
  onReady(nextSnapshot, nextCatalog) {
    snapshotVersion += 1
    setReady(true)
    setSnapshot(nextSnapshot)
    setDisplayClockSeconds(nextSnapshot.clockSeconds)
    setCatalog(nextCatalog)
    setLastEvent("ready")
    setLastError(null)
    resolveSnapshotWaiters()
    maybeRestoreAutosaveOnBoot(nextSnapshot)
  },
  onSnapshot(nextSnapshot) {
    snapshotVersion += 1
    setSnapshot(nextSnapshot)
    if (travelExperience()?.phase === "traveling") {
      // A travel reveal owns the presentation clock; let it run to arrival.
      // Truth (nextSnapshot.clockSeconds) is recorded above and settled on arrival.
    } else {
      // Boot import, offline catch-up, autoTick, and manual advances all snap
      // the display straight to truth — no animation, no fast-forward crawl.
      cancelClockAnimation()
      setDisplayClockSeconds(nextSnapshot.clockSeconds)
    }
    setLastEvent("snapshot")
    setLastError(null)
    resolveSnapshotWaiters()
    const catchupStarted = maybeRunQueuedOfflineCatchup()
    if (!catchupStarted) maybeRequestAutosave()
  },
  onSave(payload) {
    saveVersion += 1
    lastSavePayload = payload
    saveRequestInFlight = false
    setLastEvent("save")
    persistSavePayload(payload, pendingSaveSource)
    resolveSaveWaiters(payload)
  },
  onError(message) {
    setLastEvent("error")
    setLastError(message)
    saveRequestInFlight = false
    resolveSaveWaiters(null)
    resolveSnapshotWaiters()
  },
})

const uiState = createMemo<AddUiState | null>(() => {
  const currentSnapshot = snapshot()
  const currentCatalog = catalog()
  return currentSnapshot && currentCatalog
    ? selectAddUiState(currentSnapshot, currentCatalog)
    : null
})
const discoveryState = createMemo(() => {
  const currentSnapshot = snapshot()
  const currentCatalog = catalog()
  if (!currentSnapshot || !currentCatalog) return null

  const info = mapInfo()
  const experience = travelExperience()
  const travelPhase =
    experience?.phase ?? (info.travel.previewCell ? "preview" : "idle")
  return selectAddDiscoverySummary({
    snapshot: currentSnapshot,
    catalog: currentCatalog,
    heroCell: info.character.cell,
    selectedTile: info.interaction.selectedDetail,
    previewTile: info.interaction.hoveredDetail ?? info.interaction.selectedDetail,
    heroDungeonLinks: info.character.dungeonLinksAtCell,
    selectedDungeonLinks: info.dungeonLinks.selected,
    travel: {
      active: experience?.phase === "traveling" || info.travel.active,
      phase: travelPhase,
      previewCell: info.travel.previewCell,
      destinationLabel:
        experience?.event.destinationLabel ??
        info.travel.destinationLabel ??
        info.travel.previewLabel,
      exposureRisk:
        experience?.event.exposureRisk ??
        info.travel.exposureRisk ??
        info.travel.previewExposureRisk,
      previewAdjacent: info.travel.previewAdjacent,
      gameMinutes: info.travel.costGameMinutes,
    },
    lastMovement: lastDiscoveryMovement(),
  })
})
const dungeonObjectiveState = createMemo(() =>
  selectAddDungeonObjective({
    mapMode: mapMode(),
    dungeonMapId: mapMode() === "dungeon_square" ? dungeonTarget() : null,
    heroCell: mapInfo().character.cell,
  }),
)
const displayedWorldTime = createMemo<AddWorldTimeSummary | null>(() => {
  const currentSnapshot = snapshot()
  const clockSeconds = displayClockSeconds() ?? currentSnapshot?.clockSeconds
  return clockSeconds === undefined || clockSeconds === null
    ? null
    : selectAddWorldTimeForClockSeconds(clockSeconds)
})

const worldActions = createMemo(() => uiState()?.availableWorldActions ?? [])
const gameInteractions = createMemo(() => {
  const currentWorld = world()
  const map = currentWorld?.maps.find((candidate) => candidate.id === currentWorld.activeMapId)
  return map?.interactions ?? []
})
const primaryWorldActionInteraction = createMemo(() =>
  gameInteractions().find(
    (interaction) => interaction.kind === "world_action" && interaction.enabled,
  ),
)
const recruitmentInteraction = createMemo(() =>
  gameInteractions().find((interaction) => interaction.action === "add.recruit_from_survivor_cave"),
)
// On the overworld, the enabled dungeon link under the Hero (e.g. the Studio on
// the Base) — surfaces an "Enter" affordance that opens that dungeon map.
const heroDungeonLink = createMemo(() =>
  mapMode() === "overworld_hex"
    ? (mapInfo().character.dungeonLinksAtCell.find((link) => link.enabled) ?? null)
    : null,
)

// Hero pose (coord + facing), as stable strings, drives the dungeon cone FOV.
const heroDungeonCell = createMemo(() =>
  mapMode() === "dungeon_square" ? mapInfo().character.cell : null,
)
const heroDungeonFacing = createMemo(() =>
  mapMode() === "dungeon_square" ? mapInfo().character.facing : null,
)
// Remembered dungeon visibility, persisted across moves/turns; reset per dungeon.
let dungeonVisibility: VisibilityMap = emptyDungeonVisibility()
let dungeonVisibilityKey = ""

createEffect(() => {
  const currentSnapshot = snapshot()
  const currentCatalog = catalog()
  if (!currentSnapshot || !currentCatalog) return

  const mode = mapMode()
  const target = dungeonTarget()
  let nextWorld = createAddWorldForMapMode(mode, currentSnapshot, currentCatalog, {
    dungeonMapId: target,
  })

  if (mode === "dungeon_square") {
    if (dungeonVisibilityKey !== target) {
      // Fresh memory each time a dungeon is entered.
      dungeonVisibility = emptyDungeonVisibility()
      dungeonVisibilityKey = target
    }
    const activeMap = nextWorld.maps.find((map) => map.id === nextWorld.activeMapId)
    if (activeMap) {
      const dungeonId = addDungeonByMapId(activeMap.id)?.id ?? activeMap.id
      // Doors are authoritative game state: overlay open/closed (which drives
      // `blocked`, gating both movement and the FOV cone) before computing FOV.
      let dungeonMap = applyDungeonDoorStates(
        activeMap,
        dungeonId,
        new Set(currentSnapshot.openDoors ?? []),
      )
      // The dungeon registry owns the visibility policy; "fully_lit" dungeons skip FOV.
      const usesFov =
        (addDungeonByMapId(activeMap.id)?.visibilityPolicy ?? "directional_fov") ===
        "directional_fov"
      if (usesFov) {
        const fov = applyDungeonFieldOfView(
          dungeonMap,
          heroDungeonCell(),
          heroDungeonFacing(),
          dungeonVisibility,
        )
        dungeonVisibility = fov.visibility
        dungeonMap = fov.map
      }
      nextWorld = {
        ...nextWorld,
        maps: nextWorld.maps.map((map) => (map.id === activeMap.id ? dungeonMap : map)),
      }
    }
  } else {
    dungeonVisibilityKey = ""
  }

  setWorld(nextWorld)
  mapHost?.renderWorld(nextWorld)
  refreshMapInfo()
})

window.render_game_to_text = () => JSON.stringify(toTextState())
window.advanceTime = async (milliseconds = 1000) => {
  await tickRuntime(milliseconds / 1000)
  mapHost?.advanceTime(milliseconds)
  refreshMapInfo()
  return JSON.stringify(toTextState())
}

render(() => html`<${AddRpgApp} />`, requiredElement("app"))
client.init()

function AddRpgApp() {
  let mapElement: HTMLDivElement | undefined
  let autoTickTimer: number | undefined
  let mapInfoTimer: number | undefined
  let autosaveTimer: number | undefined

  onMount(() => {
    if (!mapElement) return
    mapHost = new AddRpgPhaserMapHost(mapElement, {
      onBeforeCharacterTravel: confirmFirstCharacterTravel,
      onCharacterTravel: (event) => {
        void handleCharacterTravel(event)
      },
      onDoorToggle: (coord) => {
        void handleDoorToggle(coord)
      },
    })
    const currentWorld = world()
    if (currentWorld) {
      mapHost.renderWorld(currentWorld)
      refreshMapInfo()
    }
    mapInfoTimer = window.setInterval(refreshMapInfo, 180)
    autosaveTimer = window.setInterval(maybeRequestAutosave, 3500)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
  })

  onCleanup(() => {
    if (autoTickTimer !== undefined) window.clearInterval(autoTickTimer)
    if (mapInfoTimer !== undefined) window.clearInterval(mapInfoTimer)
    if (autosaveTimer !== undefined) window.clearInterval(autosaveTimer)
    if (travelClearTimer !== undefined) window.clearTimeout(travelClearTimer)
    cancelClockAnimation()
    window.removeEventListener("online", handleOnline)
    window.removeEventListener("offline", handleOffline)
    mapHost?.destroy()
    client.dispose()
  })

  // Ambient clock: one fixed 1-second runtime step per fire, fired every
  // 1000/timeSpeed ms. Re-runs when play/pause, readiness, or speed changes,
  // recreating the interval at the new cadence (step size stays 1s for fidelity).
  createEffect(() => {
    const playing = autoTick() && ready()
    const speed = timeSpeed()
    // Overworld runs compressed (1 in-game minute / real second); dungeons run
    // ~real-time (1 in-game second / real second).
    const ambientStep =
      mapMode() === "overworld_hex" ? 1 : ADD_DUNGEON_AMBIENT_RUNTIME_SECONDS_PER_TICK
    if (autoTickTimer !== undefined) {
      window.clearInterval(autoTickTimer)
      autoTickTimer = undefined
    }
    if (!playing || speed <= 0) return
    const periodMs = Math.max(1, Math.round(1000 / speed))
    autoTickTimer = window.setInterval(() => {
      if (autoTick() && ready() && travelExperience()?.phase !== "traveling") {
        void tickRuntime(ambientStep)
      }
    }, periodMs)
  })

  return html`
    <main class=${() => (adminOpen() ? "add-app-shell admin-open" : "add-app-shell")}>
      <section class="world-pane">
        <div id="add-world" class="add-world" ref=${(node: HTMLDivElement) => (mapElement = node)}>
          <div class=${() => (mapInfo().ready ? "map-loading hidden" : "map-loading")}>
            Initializing map
          </div>
          <div
            class="day-night-overlay"
            data-phase=${() => displayedWorldTime()?.daylightPhase ?? "day"}
            data-season=${() => displayedWorldTime()?.season ?? "spring"}
            style=${() => dayNightOverlayStyle()}
            aria-hidden="true"
          />
          <div
            class="toxicity-haze"
            data-risk=${() => travelRiskState()}
            style=${() => toxicityHazeStyle()}
            aria-hidden="true"
          />
          <div class="map-topbar" aria-label="ADD map navigation">
            <div class="map-mode-switcher" role="tablist" aria-label="ADD map mode">
              ${() => mapModeButtons()}
            </div>
            <div class="status-stack">
              <span class="status-pill" data-state=${() => statusState()}>
                ${() => statusLabel()}
              </span>
              <div
                class=${() =>
                  travelExperience()?.phase === "traveling" || clockAnimation()
                    ? "world-time-chip traveling"
                    : "world-time-chip"}
                aria-label="Game time"
              >
                <span>${() => worldTimePrimaryCopy()}</span>
                <small>${() => worldTimeSecondaryCopy()}</small>
                <i style=${() => daylightMeterStyle()} aria-hidden="true" />
              </div>
              ${() => {
                if (mapMode() === "dungeon_square") {
                  return html`<button
                    id="return-overworld"
                    type="button"
                    class="enter-dungeon-button return-overworld-button"
                    onClick=${() => returnToOverworldFromDungeon()}
                  >
                    Return to Overworld
                  </button>`
                }
                const link = heroDungeonLink()
                return link
                  ? html`<button
                      id="enter-dungeon"
                      type="button"
                      class="enter-dungeon-button"
                      onClick=${() => enterDungeonLink(link)}
                    >
                      Enter ${link.label}
                    </button>`
                  : null
              }}
              <button
                id="time-speed-control"
                type="button"
                class=${() => (autoTick() ? "time-speed-button" : "time-speed-button paused")}
                onClick=${() => cycleTimeSpeed()}
                disabled=${() => !ready()}
                aria-label=${() =>
                  autoTick()
                    ? `Time speed ${timeSpeed()} times, click to change`
                    : "Time paused, click to resume"}
              >
                ${() => timeSpeedLabel()}
              </button>
              <button
                id="open-admin"
                type="button"
                class="admin-toggle"
                onClick=${() => setAdminOpen(true)}
                aria-controls="admin-view"
                aria-expanded=${() => adminOpen()}
              >
                Admin
              </button>
            </div>
          </div>
          <section
            class=${() => travelPanelClass()}
            aria-live="polite"
            aria-label="Travel time and exposure"
          >
            <div>
              <span>${() => travelPanelTitle()}</span>
              <strong>${() => travelPanelClockCopy()}</strong>
            </div>
            <p>${() => travelPanelDetailCopy()}</p>
            <div class="travel-risk-row">
              <span class=${() => `travel-risk-pill ${travelRiskState()}`}>
                ${() => travelRiskCopy()}
              </span>
              <span>${ADD_TILE_TRAVEL_PRESENTATION.visibleGameMinutes}m daylight step</span>
            </div>
            <i style=${() => travelProgressStyle()} aria-hidden="true" />
          </section>
          <section id="discovery-panel" class="panel discovery-panel" aria-label="Discovery loop">
            <div class="panel-heading discovery-heading">
              <span>Discovery</span>
              <span class="small-chip">${() => discoveryPhaseLabel()}</span>
            </div>
            <strong>${() => discoveryState()?.headline ?? "Waiting for discovery"}</strong>
            <p>${() => discoveryState()?.detail ?? "Move the Hero or select a tile to reveal the next choice."}</p>
            <div class="discovery-movement">
              <span>${() => discoveryState()?.movement.title ?? "Scout one step at a time"}</span>
              <small>${() => discoveryMovementMetricCopy()}</small>
            </div>
            ${() => discoveryConsequenceCard()}
            ${() => discoverySelectedTileCard()}
            <div class="discovery-tiles">
              ${() => discoveryTileRows()}
            </div>
            <div class="discovery-resources">
              ${() => discoveryResourceRows()}
            </div>
            <div class="discovery-actions">
              ${() => discoveryActionButtons()}
            </div>
          </section>
          ${() => travelDialogView()}
          <section
            id="first-playable-panel"
            class=${() =>
              firstPlayableCollapsed()
                ? "panel first-playable-panel first-playable-overlay collapsed"
                : "panel first-playable-panel first-playable-overlay"}
            style=${() => questPanelStyle()}
            aria-label="First playable objective"
          >
            <div
              class="panel-heading first-playable-drag-handle"
              onPointerDown=${beginQuestPanelDrag}
              onPointerMove=${dragQuestPanel}
              onPointerUp=${endQuestPanelDrag}
              onPointerCancel=${endQuestPanelDrag}
            >
              <span>${() => objectivePanelTitle()}</span>
              <div class="panel-heading-actions">
                <span class="small-chip">
                  ${() => objectivePanelChip()}
                </span>
                <button
                  id="toggle-first-playable-panel"
                  type="button"
                  class="panel-icon-button"
                  onClick=${() => setFirstPlayableCollapsed(!firstPlayableCollapsed())}
                  aria-expanded=${() => !firstPlayableCollapsed()}
                  aria-controls="first-playable-body"
                  aria-label=${() => objectivePanelToggleLabel()}
                >
                  ${() => (firstPlayableCollapsed() ? "Show" : "Hide")}
                </button>
              </div>
            </div>
            <div
              id="first-playable-body"
              class="first-playable-body"
              hidden=${() => firstPlayableCollapsed()}
            >
              ${() => objectivePanelBody()}
            </div>
          </section>
          <div class="map-hud" aria-label="ADD map controls">
            <div class="map-camera-controls">
              <button
                id="map-zoom-out"
                type="button"
                class="map-button"
                onClick=${() => zoomMap(0.9)}
                disabled=${() => !mapInfo().ready}
                aria-label="Zoom out"
              >
                -
              </button>
              <span class="zoom-readout">${() => `${Math.round(mapInfo().camera.zoom * 100)}%`}</span>
              <button
                id="map-zoom-in"
                type="button"
                class="map-button"
                onClick=${() => zoomMap(1.1)}
                disabled=${() => !mapInfo().ready}
                aria-label="Zoom in"
              >
                +
              </button>
              <button
                id="map-reset-camera"
                type="button"
                class="map-button text"
                onClick=${resetMapCamera}
                disabled=${() => !mapInfo().ready}
              >
                Center
              </button>
            </div>
            <div class="map-selection-readout">
              <span>${() => mapFocusCopy()}</span>
            </div>
          </div>
        </div>
      </section>

      <div
        class=${() => (adminOpen() ? "admin-backdrop visible" : "admin-backdrop")}
        onClick=${() => setAdminOpen(false)}
        aria-hidden="true"
      />

      <aside
        id="admin-view"
        class=${() => (adminOpen() ? "admin-view open" : "admin-view")}
        aria-label="ADD admin controls"
        aria-hidden=${() => !adminOpen()}
      >
        <div class="admin-header">
          <div>
            <span class="admin-title">Admin</span>
            <small>Runtime, saves, resources, and manual controls</small>
          </div>
          <button
            id="close-admin"
            type="button"
            class="ghost-button"
            onClick=${() => setAdminOpen(false)}
            aria-label="Close admin"
          >
            Close
          </button>
        </div>

        <section class="panel runtime-panel">
          <div class="panel-heading">
            <span>System</span>
            <button
              type="button"
              class="ghost-button"
              onClick=${() => setAutoTick(!autoTick())}
              aria-pressed=${() => autoTick()}
            >
              ${() => (autoTick() ? "Auto tick" : "Paused")}
            </button>
          </div>
          <dl class="runtime-list">
            <div>
              <dt>Boundary</dt>
              <dd>UI -> Worker -> Rust/WASM -> Snapshot</dd>
            </div>
            <div>
              <dt>Map</dt>
              <dd>${() => mapInfo().mapId ?? "Waiting"}</dd>
            </div>
            <div>
              <dt>Renderer</dt>
              <dd>${() => `${mapInfo().rendererType} / ${mapInfo().cells.total} cells`}</dd>
            </div>
            <div>
              <dt>Save</dt>
              <dd>${() => saveStatus()}</dd>
            </div>
          </dl>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <span>Resources</span>
            <span class="small-chip">${() => `${uiState()?.resources.length ?? 0} tracked`}</span>
          </div>
          <div class="resource-list">
            ${() => resourceRows()}
          </div>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <span>Objective</span>
            <span class="small-chip">${() => objectiveState()}</span>
          </div>
          <p class="objective-copy">
            ${() => objectiveCopy()}
          </p>
          <p class="note-line">
            ${() => uiState()?.notes[0] ?? "Waiting for runtime notes."}
          </p>
        </section>

        <section class="panel command-panel">
          <div class="panel-heading">
            <span>Commands</span>
            <span class="small-chip">${() => lastCommand() ?? "Idle"}</span>
          </div>
          <div class="command-grid">
            <button id="tick-runtime" type="button" onClick=${() => void tickRuntime(5)} disabled=${() => !ready()}>
              Advance 5s
            </button>
            <button id="tick-runtime-fast" type="button" onClick=${() => void tickRuntime(120)} disabled=${() => !ready()}>
              Advance 2m
            </button>
            <button id="assign-hero" type="button" onClick=${() => void toggleHero()} disabled=${() => !ready()}>
              ${() => (snapshot()?.roster.heroAssigned ? "Unassign hero" : "Assign hero")}
            </button>
            <button
              type="button"
              onClick=${() => void runInteraction(primaryWorldActionInteraction())}
              disabled=${() => !Boolean(primaryWorldActionInteraction())}
            >
              ${() => primaryWorldActionInteraction()?.label ?? "World action"}
            </button>
            <button
              type="button"
              id="recruit-survivor"
              onClick=${() => void runInteraction(recruitmentInteraction())}
              disabled=${() => !Boolean(recruitmentInteraction()?.enabled)}
            >
              Recruit
            </button>
            <button id="reset-runtime" type="button" class="ghost-button" onClick=${() => void resetRuntime()} disabled=${() => !ready()}>
              Reset
            </button>
          </div>
          <div class="quick-control-group" aria-label="First playable role controls">
            ${() => roleQuickControls()}
          </div>
          <div class="quick-control-group" aria-label="First playable construction controls">
            ${() => constructionQuickControls()}
          </div>
          ${() => (lastError() ? html`<p class="error-line">${lastError()}</p>` : null)}
        </section>

        <section class="panel run-panel">
          <div class="panel-heading">
            <span>Run</span>
            <button
              id="toggle-autosave"
              type="button"
              class="ghost-button"
              onClick=${() => setAutosaveEnabled(!autosaveEnabled())}
              aria-pressed=${() => autosaveEnabled()}
            >
              ${() => (autosaveEnabled() ? "Autosave" : "Manual")}
            </button>
          </div>
          <dl class="runtime-list">
            <div>
              <dt>Autosave</dt>
              <dd>${() => formatSaveTimestamp(autosaveRecord())}</dd>
            </div>
            <div>
              <dt>Offline</dt>
              <dd>${() => lastOfflineCopy()}</dd>
            </div>
          </dl>
          <textarea
            id="save-payload"
            class="save-payload"
            spellcheck="false"
            value=${() => savePayload()}
            onInput=${(event: InputEvent) => setSavePayload((event.currentTarget as HTMLTextAreaElement).value)}
            aria-label="ADD save payload"
          />
          <div class="run-grid">
            <button id="export-save" type="button" onClick=${() => void exportSaveNow()} disabled=${() => !ready()}>
              Save now
            </button>
            <button
              id="load-autosave"
              type="button"
              onClick=${() => void loadAutosave()}
              disabled=${() => !ready() || !autosaveRecord()}
            >
              Load autosave
            </button>
            <button id="import-save" type="button" onClick=${() => void importSaveText()} disabled=${() => !ready()}>
              Import text
            </button>
            <button id="offline-catchup" type="button" onClick=${() => void runOfflineCatchup(3600)} disabled=${() => !ready()}>
              Offline 1h
            </button>
            <button id="clear-autosave" type="button" class="ghost-button" onClick=${clearBrowserAutosave}>
              Clear save
            </button>
          </div>
          ${() => (storageError() ? html`<p class="error-line">${storageError()}</p>` : null)}
        </section>

        <section class="panel compact-panel">
          <div class="panel-heading">
            <span>World actions</span>
            <span class="small-chip">${() => `${worldActions().filter((action) => action.enabled).length} ready`}</span>
          </div>
          <ul class="action-list">
            ${() => actionRows()}
          </ul>
        </section>
      </aside>
    </main>
  `
}

function defaultQuestPanelPosition(): QuestPanelPosition {
  if (typeof window !== "undefined" && window.innerWidth <= 520) {
    return { x: 10, y: 104 }
  }
  return { x: 14, y: 64 }
}

function questPanelStyle(): Record<string, string> {
  const position = questPanelPosition()
  return {
    "--quest-panel-x": `${position.x}px`,
    "--quest-panel-y": `${position.y}px`,
  }
}

function beginQuestPanelDrag(event: PointerEvent): void {
  if (event.button !== 0) return
  const target = event.target instanceof Element ? event.target : null
  if (target?.closest("button")) return

  event.preventDefault()
  event.stopPropagation()

  const current = questPanelPosition()
  questPanelDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: current.x,
    originY: current.y,
  }
  const handle = event.currentTarget as HTMLElement
  handle.setPointerCapture(event.pointerId)
  handle.classList.add("dragging")
}

function dragQuestPanel(event: PointerEvent): void {
  if (!questPanelDrag || questPanelDrag.pointerId !== event.pointerId) return
  event.preventDefault()
  event.stopPropagation()
  const nextX = questPanelDrag.originX + event.clientX - questPanelDrag.startX
  const nextY = questPanelDrag.originY + event.clientY - questPanelDrag.startY
  setQuestPanelPosition(clampQuestPanelPosition(nextX, nextY))
}

function endQuestPanelDrag(event: PointerEvent): void {
  if (!questPanelDrag || questPanelDrag.pointerId !== event.pointerId) return
  event.preventDefault()
  event.stopPropagation()
  const handle = event.currentTarget as HTMLElement
  handle.releasePointerCapture(event.pointerId)
  handle.classList.remove("dragging")
  questPanelDrag = null
}

function clampQuestPanelPosition(x: number, y: number): QuestPanelPosition {
  const panel = document.getElementById("first-playable-panel")
  const panelWidth = panel?.offsetWidth ?? 390
  const panelHeight = panel?.offsetHeight ?? (firstPlayableCollapsed() ? 64 : 360)
  const viewportWidth = window.innerWidth || 1024
  const viewportHeight = window.innerHeight || 768
  const gutter = viewportWidth <= 520 ? 10 : 12
  const maxX = Math.max(gutter, viewportWidth - panelWidth - gutter)
  const maxY = Math.max(gutter, viewportHeight - panelHeight - gutter)
  return {
    x: Math.round(Math.min(maxX, Math.max(gutter, x))),
    y: Math.round(Math.min(maxY, Math.max(gutter, y))),
  }
}

function resourceRows(): readonly unknown[] {
  return (uiState()?.resources.slice(0, 6) ?? []).map(
    (resource) => html`
      <article class="resource-row">
        <span>
          ${resource.label}
          ${() =>
            resource.blocker
              ? html`<small class="row-blocker">${resource.blocker}</small>`
              : html`<small>${resource.source} -> ${resource.sink}</small>`}
        </span>
        <strong>${formatResource(resource.value)} / ${formatResource(resource.cap)}</strong>
      </article>
    `,
  )
}

function discoveryPhaseLabel(): string {
  switch (discoveryState()?.phase) {
    case "movement":
      return "Movement"
    case "enter_dungeon":
      return "Entrance"
    case "act":
      return "Action"
    case "choose_tile":
      return "Choice"
    default:
      return "Waiting"
  }
}

function discoveryMovementMetricCopy(): string {
  const movement = discoveryState()?.movement
  if (!movement) return "No movement yet"
  const parts: string[] = []
  if (movement.gameMinutes !== null) parts.push(`${movement.gameMinutes}m`)
  if (movement.discoveredDelta > 0) parts.push(`+${movement.discoveredDelta} revealed`)
  if (movement.toxicityDelta > 0) parts.push(`+${Math.round(movement.toxicityDelta * 100)}% toxicity`)
  if (movement.risk) parts.push(titleCase(movement.risk.replaceAll("_", " ")))
  return parts.length > 0 ? parts.join(" · ") : "Choose an adjacent tile"
}

function discoveryConsequenceCard(): unknown {
  const consequences = discoveryState()?.movementConsequences
  if (!consequences || (!consequences.active && consequences.safety.severity === "safe")) {
    return null
  }
  return html`
    <article
      id="movement-consequences"
      class="movement-consequences"
      data-severity=${consequences.safety.severity}
    >
      <header>
        <span>
          Movement consequences
          <strong>${consequences.safety.headline}</strong>
        </span>
        <small>${titleCase(consequences.safety.severity)}</small>
      </header>
      <div class="consequence-metrics">
        <span>
          Viral load
          <strong>${consequences.viralLoad.percent}%</strong>
          <small>${formatSignedRatioPercent(consequences.viralLoad.delta)} this step</small>
        </span>
        <span>
          Time
          <strong>${titleCase(consequences.timeOfDay.phase)}</strong>
          <small>${consequences.timeOfDay.localTime} · ${titleCase(consequences.timeOfDay.riskModifier)} risk</small>
        </span>
        <span>
          Safety
          <strong>${titleCase(consequences.safety.severity)}</strong>
          <small>${consequences.safety.detail}</small>
        </span>
      </div>
      <p>
        <span>${consequences.viralLoad.copy}</span>
        <span>${consequences.timeOfDay.copy}</span>
      </p>
      <ul class="consequence-warnings">
        ${() => discoveryConsequenceWarnings()}
      </ul>
    </article>
  `
}

function discoveryConsequenceWarnings(): readonly unknown[] {
  const consequences = discoveryState()?.movementConsequences
  const warnings =
    consequences && consequences.warnings.length > 0
      ? consequences?.warnings
      : ["Automatic return or failure thresholds are tracked here but remain a later rule gate."]
  return (warnings ?? []).map((warning) => html`<li>${warning}</li>`)
}

function discoveryTileRows(): readonly unknown[] {
  const choices = discoveryState()?.tileChoices ?? []
  if (choices.length === 0) {
    return [
      html`<article class="discovery-empty">Select a visible tile or move the Hero to reveal new choices.</article>`,
    ]
  }
  return choices.map(
    (choice) => html`
      <article class="discovery-tile" data-visibility=${choice.visibility}>
        <span>
          ${choice.label}
          <small>${choice.copy}</small>
        </span>
        <strong>${choice.dungeonCount > 0 ? `${choice.dungeonCount} link` : titleCase(choice.risk.replaceAll("_", " "))}</strong>
      </article>
    `,
  )
}

function discoverySelectedTileCard(): unknown {
  const selected = discoveryState()?.selectedTile
  if (!selected) return null
  return html`
    <article
      id="selected-tile-decision"
      class="discovery-selected-tile"
      data-usefulness=${selected.usefulness.level}
      data-visibility=${selected.visibility}
    >
      <header>
        <span>
          Selected tile
          <strong>${selected.label}</strong>
        </span>
        <small>${titleCase(selected.usefulness.level)} value</small>
      </header>
      <div class="selected-tile-metrics">
        <span>
          Travel
          <strong>${selected.travel.gameMinutes}m</strong>
          <small>${selected.travel.standingHere ? "Here" : selected.travel.canTravelNow ? "Ready now" : selected.travel.adjacent ? "Readable" : "Move closer"}</small>
        </span>
        <span>
          Toxicity
          <strong>${titleCase(selected.travel.risk.replaceAll("_", " "))}</strong>
          <small>${selected.travel.copy}</small>
        </span>
        <span>
          Links
          <strong>${selected.dungeonLinks.count}</strong>
          <small>${selected.dungeonLinks.copy}</small>
        </span>
      </div>
      <div class="selected-tile-facts">
        <div>
          <small>Known</small>
          ${selected.facts.known.length > 0
            ? selected.facts.known.map((fact) => html`<span>${fact}</span>`)
            : html`<span>Nothing precise yet</span>`}
        </div>
        <div>
          <small>Unknown</small>
          ${selected.facts.unknown.map((fact) => html`<span>${fact}</span>`)}
        </div>
      </div>
      <p>${selected.usefulness.reasons.join(" ")}</p>
    </article>
  `
}

function discoveryResourceRows(): readonly unknown[] {
  const resources = discoveryState()?.resourceLinks ?? []
  const visible = resources.filter((resource) => resource.relevant)
  const rows = visible.length > 0 ? visible : resources.slice(0, 2)
  return rows.map(
    (resource) => html`
      <article class=${resource.relevant ? "discovery-resource relevant" : "discovery-resource"}>
        <span>
          ${resource.label}
          <small>${resource.copy}</small>
        </span>
        <strong>
          ${formatResource(resource.value)}${resource.target !== null ? ` / ${formatResource(resource.target)}` : ""}
        </strong>
      </article>
    `,
  )
}

function discoveryActionButtons(): readonly unknown[] {
  const links = discoveryState()?.actionLinks ?? []
  if (links.length === 0) {
    return [html`<button type="button" disabled>No linked action yet</button>`]
  }
  return links.map(
    (link) => html`
      <button
        id=${`discovery-action-${safeElementId(link.id)}`}
        type="button"
        class=${link.kind === "dungeon_entry" ? "primary-action" : ""}
        onClick=${() => void runDiscoveryAction(link)}
        disabled=${() => !link.enabled}
        title=${link.reason ?? link.label}
      >
        ${link.label}
      </button>
    `,
  )
}

function objectivePanelTitle(): string {
  return dungeonObjectiveState() ? "Dungeon objective" : "First playable"
}

function objectivePanelChip(): string {
  const dungeon = dungeonObjectiveState()
  if (dungeon) {
    const activeIndex = Math.max(
      0,
      dungeon.steps.findIndex((step) => step.status === "active"),
    )
    return `${activeIndex + 1}/${dungeon.steps.length}`
  }
  return `${uiState()?.firstPlayable.completedCount ?? 0}/${uiState()?.firstPlayable.totalCount ?? 0}`
}

function objectivePanelToggleLabel(): string {
  const action = firstPlayableCollapsed() ? "Expand" : "Collapse"
  return `${action} ${objectivePanelTitle().toLowerCase()} tasks`
}

function objectivePanelBody(): unknown {
  const dungeon = dungeonObjectiveState()
  if (dungeon) {
    return html`
      <div class="progress-track dungeon-progress" aria-hidden="true">
        <span style=${() => ({ width: dungeonObjectiveProgressWidth() })} />
      </div>
      <p class="objective-copy dungeon-objective-copy">
        <strong>${dungeon.headline}</strong>
        <span>${dungeon.detail}</span>
      </p>
      <button
        id="return-overworld-objective"
        type="button"
        class="primary-action"
        onClick=${() => returnToOverworldFromDungeon()}
      >
        ${dungeon.returnLabel}
      </button>
      <ol class="first-playable-list dungeon-objective-list">
        ${() => dungeonObjectiveStepRows()}
      </ol>
    `
  }

  return html`
    <div class="progress-track" aria-hidden="true">
      <span style=${() => ({ width: firstPlayableProgressWidth() })} />
    </div>
    <p class="objective-copy">
      ${() => firstPlayableCopy()}
    </p>
    <button
      id="first-playable-action"
      type="button"
      class="primary-action"
      onClick=${() => void runFirstPlayableAction()}
      disabled=${() => !Boolean(currentFirstPlayableStep()?.action)}
    >
      ${() => currentFirstPlayableStep()?.actionLabel ?? "First arc complete"}
    </button>
    <div class="story-choice-grid">
      ${() => storyChoiceButtons()}
    </div>
    <ol class="first-playable-list">
      ${() => firstPlayableStepRows()}
    </ol>
  `
}

function dungeonObjectiveProgressWidth(): string {
  const dungeon = dungeonObjectiveState()
  if (!dungeon || dungeon.steps.length === 0) return "0%"
  const activeIndex = Math.max(
    0,
    dungeon.steps.findIndex((step) => step.status === "active"),
  )
  return `${Math.round(((activeIndex + 1) / dungeon.steps.length) * 100)}%`
}

function dungeonObjectiveStepRows(): readonly unknown[] {
  return (dungeonObjectiveState()?.steps ?? []).map((step: AddDungeonObjectiveStep) => {
    const stateLabel =
      step.status === "complete" ? "Done" : step.status === "active" ? "Now" : "Next"
    return html`
      <li class=${step.status === "active" ? "active" : step.status === "complete" ? "complete" : ""}>
        <span>${step.label}</span>
        <small>${stateLabel}</small>
      </li>
    `
  })
}

function currentFirstPlayableStep() {
  return uiState()?.firstPlayable.steps.find((step) => step.active) ?? null
}

function firstPlayableProgressWidth(): string {
  const firstPlayable = uiState()?.firstPlayable
  if (!firstPlayable || firstPlayable.totalCount <= 0) return "0%"
  return `${Math.round((firstPlayable.completedCount / firstPlayable.totalCount) * 100)}%`
}

function firstPlayableCopy(): string {
  const firstPlayable = uiState()?.firstPlayable
  if (!firstPlayable) return "Waiting for the ADD runtime."
  if (firstPlayable.complete) {
    return persistenceReadyForFirstPlayable()
      ? "The first ADD arc is complete and save/offline behavior has been exercised."
      : "The first ADD arc is complete. Save now or run offline catch-up to verify the idle layer."
  }
  const current = currentFirstPlayableStep()
  return current?.detail ?? "Follow the next action to complete the first ADD arc."
}

function firstPlayableStepRows(): readonly unknown[] {
  return (uiState()?.firstPlayable.steps ?? []).map(
    (step) => html`
      <li class=${step.active ? "active" : step.complete ? "complete" : ""}>
        <span>${step.label}</span>
        <small>${step.complete ? "Done" : step.active ? "Now" : "Next"}</small>
      </li>
    `,
  )
}

function storyChoiceButtons(): readonly unknown[] {
  const beat = uiState()?.activeStoryBeat
  const currentSnapshot = snapshot()
  if (!beat || !currentSnapshot || beat.choices.length === 0 || storyChoiceSelected(currentSnapshot, beat.id)) {
    return []
  }
  return beat.choices.map(
    (choice) => html`
      <button
        id=${`story-choice-${slugForId(choice.id)}`}
        type="button"
        class="story-choice-button"
        onClick=${() => void chooseStoryOption(beat.id, choice.id)}
        disabled=${() => !ready()}
      >
        ${choice.label}
      </button>
    `,
  )
}

function roleQuickControls(): readonly unknown[] {
  const assignments = uiState()?.roleAssignments ?? []
  return FIRST_PLAYABLE_ROLE_IDS.map((roleId) => {
    const role = assignments.find((candidate) => candidate.id === roleId)
    if (!role) return null
    const shortName = roleShortLabel(role.id)
    return html`
      <article class="quick-control-row">
        <span>
          ${role.label}
          <small>${role.lockedReason ?? `${role.crewAssigned} crew`}</small>
        </span>
        <div>
          <button
            id=${`assign-${slugForRole(role.id)}`}
            type="button"
            class="ghost-button"
            onClick=${() => void setHeroRole(role.id)}
            disabled=${() => !ready() || !role.available}
          >
            Hero
          </button>
          <button
            id=${`crew-${slugForRole(role.id)}`}
            type="button"
            onClick=${() => void setRoleCrew(role.id, role.suggestedCrew)}
            disabled=${() => !ready() || !role.available || role.suggestedCrew <= 0}
          >
            ${shortName} crew
          </button>
        </div>
      </article>
    `
  }).filter(Boolean)
}

function constructionQuickControls(): readonly unknown[] {
  const options = uiState()?.constructionOptions ?? []
  return [PROJECT_RESTORE_STUDIO, PROJECT_BUILD_FIRE_PIT].map((optionId) => {
    const option = options.find((candidate) => candidate.id === optionId)
    if (!option) return null
    return html`
      <article class="quick-control-row">
        <span>
          ${option.label}
          <small>${option.complete ? "Complete" : option.blockedReason ?? option.costLabel}</small>
        </span>
        <button
          id=${constructionButtonId(option.id)}
          type="button"
          onClick=${() => void startConstruction(option.id)}
          disabled=${() => !ready() || !option.enabled}
        >
          Start
        </button>
      </article>
    `
  }).filter(Boolean)
}

function actionRows(): readonly unknown[] {
  return worldActions()
    .slice(0, 5)
    .map(
      (action) => html`
        <li class=${action.enabled ? "" : "disabled"}>
          <span>${action.label}</span>
          <small>${action.blockedReason ?? (action.heroOnly ? "hero" : "crew")}</small>
        </li>
      `,
    )
}

function mapModeButtons(): readonly unknown[] {
  return ADD_MAP_MODE_OPTIONS.map(
    (option) => html`
      <button
        id=${`map-mode-${option.id}`}
        type="button"
        class=${() => (mapMode() === option.id ? "map-mode-button active" : "map-mode-button")}
        role="tab"
        aria-selected=${() => mapMode() === option.id}
        onClick=${() => switchMapModeFromTab(option.id)}
      >
        ${option.label}
      </button>
    `,
  )
}

// Smoothly animates the *presentation* clock toward a target. Only the explicit
// per-hex travel reveal uses this; every other authoritative change snaps the
// display directly (see onSnapshot). Driven by real elapsed time via rAF so it
// finishes exactly with the Hero and can never drift past arrival or crawl
// through a large jump.
function animatePresentationClockTo(targetClockSeconds: number, reason: string): void {
  const currentClockSeconds = displayClockSeconds()
  if (currentClockSeconds === null || targetClockSeconds <= currentClockSeconds) {
    cancelClockAnimation()
    setDisplayClockSeconds(targetClockSeconds)
    return
  }

  const timing = createAddClockAdvancePresentationTiming(
    currentClockSeconds,
    targetClockSeconds,
  )
  if (timing.visibleGameMinutes <= 0 || timing.durationMs <= 0) {
    cancelClockAnimation()
    setDisplayClockSeconds(targetClockSeconds)
    return
  }

  // Cancel any in-flight animation so a new travel restarts cleanly from the
  // current mid-interpolation value (e.g. rapid consecutive moves).
  cancelClockAnimation()
  const fromClockSeconds = currentClockSeconds
  const span = targetClockSeconds - fromClockSeconds
  const startedAtMs = performance.now()
  setClockAnimation({
    fromClockSeconds,
    toClockSeconds: targetClockSeconds,
    currentClockSeconds: fromClockSeconds,
    remainingMinutes: timing.visibleGameMinutes,
    totalMinutes: timing.visibleGameMinutes,
    durationMs: timing.durationMs,
    clockStepMs: timing.msPerVisibleMinute,
    reason,
  })

  const frame = (nowMs: number) => {
    const progress = Math.min(1, Math.max(0, (nowMs - startedAtMs) / timing.durationMs))
    const nextClockSeconds = fromClockSeconds + progress * span
    const remainingMinutes = Math.max(
      0,
      Math.round(timing.visibleGameMinutes * (1 - progress)),
    )
    setDisplayClockSeconds(nextClockSeconds)
    setClockAnimation((current) =>
      current
        ? {
            ...current,
            currentClockSeconds: nextClockSeconds,
            remainingMinutes,
          }
        : current,
    )

    if (progress >= 1) {
      setDisplayClockSeconds(targetClockSeconds)
      setClockAnimation(null)
      clockAnimationFrameId = undefined
      return
    }

    clockAnimationFrameId = requestAnimationFrame(frame)
  }

  clockAnimationFrameId = requestAnimationFrame(frame)
}

function cancelClockAnimation(): void {
  if (clockAnimationFrameId !== undefined) {
    cancelAnimationFrame(clockAnimationFrameId)
    clockAnimationFrameId = undefined
  }
  setClockAnimation(null)
}

function dayNightOverlayStyle(): Record<string, string> {
  const time = displayedWorldTime()
  const nightAlpha = time ? Math.min(0.58, time.nightRatio * 0.52) : 0
  const dawnAlpha =
    time?.daylightPhase === "dawn" || time?.daylightPhase === "dusk"
      ? Math.max(0.16, 0.32 * (1 - time.daylightRatio))
      : 0
  return {
    "--night-alpha": nightAlpha.toFixed(3),
    "--dawn-alpha": dawnAlpha.toFixed(3),
  }
}

function toxicityHazeStyle(): Record<string, string> {
  const survival = snapshot()?.heroSurvival
  const risk = currentTravelRisk()
  const baseAlpha = Math.min(0.34, (survival?.viralLoadRatio ?? 0) * 0.42)
  const riskAlpha =
    risk === "toxic"
      ? 0.24
      : risk === "fringe"
        ? 0.16
        : risk === "safe_field"
          ? 0.06
          : 0
  const activeBoost = travelExperience()?.phase === "traveling" ? 0.08 : 0
  return {
    "--toxicity-alpha": Math.min(0.46, baseAlpha + riskAlpha + activeBoost).toFixed(3),
  }
}

function daylightMeterStyle(): Record<string, string> {
  const ratio = displayedWorldTime()?.daylightRatio ?? 1
  return {
    "--daylight-ratio": `${Math.max(8, Math.round(ratio * 100))}%`,
  }
}

function travelProgressStyle(): Record<string, string> {
  const experience = travelExperience()
  const mapTravel = mapInfo().travel
  const progress =
    experience?.phase === "arrived" ? 1 : mapTravel.active ? mapTravel.progress : 0
  return {
    "--travel-progress": `${Math.max(4, Math.round(progress * 100))}%`,
  }
}

function worldTimePrimaryCopy(): string {
  const time = displayedWorldTime()
  if (!time) return "Day 1 · --:--"
  return `Day ${time.day} · ${time.localTime}`
}

function worldTimeSecondaryCopy(): string {
  const time = displayedWorldTime()
  if (!time) return "Solar estimate pending"
  return `${time.seasonLabel} · ${titleCase(time.daylightPhase)} · ${time.sunrise}/${time.sunset}`
}

function travelPanelClass(): string {
  const phase = travelExperience()?.phase
  if (phase === "traveling") return "travel-panel active"
  if (phase === "arrived") return "travel-panel arrived"
  return mapInfo().travel.previewAdjacent ? "travel-panel preview adjacent" : "travel-panel preview"
}

function travelPanelTitle(): string {
  const experience = travelExperience()
  if (experience?.phase === "traveling") return "Crossing tile"
  if (experience?.phase === "arrived") return "Arrived"
  return "Next step"
}

function travelPanelClockCopy(): string {
  const experience = travelExperience()
  const currentSnapshot = snapshot()
  if (experience) {
    return `${experience.fromTime.localTime} -> ${experience.toTime.localTime}`
  }
  if (!currentSnapshot) return "+1h"
  const arrival = selectAddWorldTimeForClockSeconds(
    currentSnapshot.clockSeconds + ADD_TILE_TRAVEL_PRESENTATION.runtimeSeconds,
  )
  return `${displayedWorldTime()?.localTime ?? "--:--"} -> ${arrival.localTime}`
}

function travelPanelDetailCopy(): string {
  const experience = travelExperience()
  if (experience) {
    const destination = experience.event.destinationLabel
    const suffix =
      experience.phase === "traveling"
        ? "The clock is burning forward while the Hero crosses the tile."
        : "One hour was spent in the field."
    return `${destination}. ${suffix}`
  }

  const travel = mapInfo().travel
  if (travel.previewAdjacent && travel.previewLabel) {
    return `${travel.previewLabel}. Crossing there will consume one in-game hour.`
  }
  if (travel.previewLabel) {
    return `${travel.previewLabel}. Move one adjacent tile at a time to control exposure.`
  }
  return "Every adjacent tile crossing consumes one in-game hour."
}

function travelRiskState(): string {
  return currentTravelRisk() ?? "none"
}

function travelRiskCopy(): string {
  const risk = currentTravelRisk()
  switch (risk) {
    case "studio":
      return "Sheltered"
    case "safe_field":
      return "Safe field"
    case "fringe":
      return "Toxic fringe"
    case "toxic":
      return "High toxicity"
    case "unknown":
      return "Unknown conditions"
    default:
      return "Exposure varies"
  }
}

function currentTravelRisk(): string | null {
  const experience = travelExperience()
  return (
    experience?.event.exposureRisk ??
    mapInfo().travel.previewExposureRisk ??
    mapInfo().travel.exposureRisk ??
    null
  )
}

async function confirmFirstCharacterTravel(event: AddCharacterTravelEvent): Promise<boolean> {
  const eligibility = openingTravelDialogEligibilityForEvent(event, mapInfo())
  if (!eligibility.eligible) {
    if (travelDramaState !== "complete") travelDramaState = "complete"
    return true
  }

  if (travelDramaState === "declined_once") {
    await showTravelDialog("dramatic_reprise", event)
    travelDramaState = "complete"
    return true
  }

  const firstAccepted = await showTravelDialog("first_warning", event)
  if (!firstAccepted) {
    travelDramaState = "declined_once"
    await showTravelDialog("first_declined", event)
    return false
  }

  const secondAccepted = await showTravelDialog("second_warning", event)
  if (!secondAccepted) {
    travelDramaState = "declined_once"
    return false
  }

  travelDramaState = "complete"
  return true
}

function openingTravelDialogEligibilityForEvent(
  event: AddCharacterTravelEvent,
  currentMapInfo: AddPhaserMapInfo,
): TravelDialogEligibility {
  const eligibility = openingTravelDialogEligibility(currentMapInfo)
  if (!eligibility.eligible) return eligibility

  const survivorCave = currentMapInfo.landmarks.survivorCave
  const survivorCaveCell = survivorCave ? `hex:${survivorCave}` : null
  if (!survivorCaveCell || event.fromCell !== survivorCaveCell) {
    return { eligible: false, reason: "not_survivor_cave_start" }
  }
  if (event.toCell === survivorCaveCell) {
    return { eligible: false, reason: "not_leaving_survivor_cave" }
  }
  return eligibility
}

function openingTravelDialogEligibility(
  currentMapInfo: AddPhaserMapInfo = mapInfo(),
): TravelDialogEligibility {
  if (travelDramaState === "complete") {
    return { eligible: false, reason: "already_complete" }
  }

  const currentSnapshot = snapshot()
  const currentUi = uiState()
  if (!currentSnapshot || !currentUi) {
    return { eligible: false, reason: "missing_state" }
  }
  if (mapMode() !== "overworld_hex") {
    return { eligible: false, reason: "not_overworld" }
  }
  if (currentUi.firstPlayable.currentStepId !== OPENING_TRAVEL_STEP_ID) {
    return { eligible: false, reason: "not_reach_base_step" }
  }

  const survivorCave = currentMapInfo.landmarks.survivorCave
  if (!survivorCave) {
    return { eligible: false, reason: "missing_survivor_cave" }
  }
  if (
    `${currentSnapshot.heroMap.q},${currentSnapshot.heroMap.r}` !== survivorCave ||
    currentMapInfo.character.coord !== survivorCave
  ) {
    return { eligible: false, reason: "not_survivor_cave_start" }
  }

  return { eligible: true, reason: "opening_reach_base_from_survivor_cave" }
}

function showTravelDialog(
  kind: TravelDialogKind,
  event: AddCharacterTravelEvent,
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    setTravelDialog({ kind, event, resolve })
  })
}

function answerTravelDialog(accepted: boolean): void {
  const current = travelDialog()
  if (!current) return
  setTravelDialog(null)
  current.resolve(accepted)
}

function travelDialogView(): unknown {
  const dialog = travelDialog()
  if (!dialog) return null

  return html`
    <div class="travel-dialog-backdrop">
      <section
        id="travel-confirmation-dialog"
        class="travel-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="travel-dialog-title"
        data-kind=${dialog.kind}
      >
        <span class="travel-dialog-eyebrow">${() => travelDialogEyebrow(dialog.kind)}</span>
        <h2 id="travel-dialog-title">${() => travelDialogTitle(dialog.kind)}</h2>
        <p>${() => travelDialogCopy(dialog.kind, dialog.event)}</p>
        <div class="travel-dialog-actions">
          ${() => travelDialogActions(dialog.kind)}
        </div>
      </section>
    </div>
  `
}

function travelDialogEyebrow(kind: TravelDialogKind): string {
  if (kind === "first_declined") return "Fair enough"
  if (kind === "dramatic_reprise") return "One more thing"
  return "Before you cross"
}

function travelDialogTitle(kind: TravelDialogKind): string {
  switch (kind) {
    case "first_warning":
      return "Hmmmm..."
    case "second_warning":
      return "Really sure?"
    case "first_declined":
      return "Oh well."
    case "dramatic_reprise":
      return "That was just for dramatic effect."
  }
}

function travelDialogCopy(
  kind: TravelDialogKind,
  event: AddCharacterTravelEvent,
): string {
  switch (kind) {
    case "first_warning":
      return `The world is toxic, remember? Are you really sure you want to venture forth? It's gonna take you a solid hour to cross the region toward ${event.destinationLabel}...`
    case "second_warning":
      return "Are you really sure? It's 1 HOUR. Keep that in mind, right?"
    case "first_declined":
      return "You can stay where you are, but that won't be so fun, right?"
    case "dramatic_reprise":
      return "That was just for dramatic effect. Just venture forth."
  }
}

function travelDialogActions(kind: TravelDialogKind): readonly unknown[] {
  if (kind === "first_declined") {
    return [
      html`
        <button
          id="travel-dialog-dismiss"
          type="button"
          class="primary-action"
          onClick=${() => answerTravelDialog(true)}
        >
          Fine
        </button>
      `,
    ]
  }

  if (kind === "dramatic_reprise") {
    return [
      html`
        <button
          id="travel-dialog-venture"
          type="button"
          class="primary-action"
          onClick=${() => answerTravelDialog(true)}
        >
          Venture forth
        </button>
      `,
    ]
  }

  return [
    html`
      <button
        id="travel-dialog-cancel"
        type="button"
        class="ghost-button"
        onClick=${() => answerTravelDialog(false)}
      >
        ${kind === "first_warning" ? "No, stay here" : "Not yet"}
      </button>
    `,
    html`
      <button
        id="travel-dialog-confirm"
        type="button"
        class="primary-action"
        onClick=${() => answerTravelDialog(true)}
      >
        ${kind === "first_warning" ? "OK, venture forth" : "Yes, I know"}
      </button>
    `,
  ]
}

function switchMapMode(nextMode: AddMapMode): void {
  if (mapMode() === nextMode) return
  setTravelExperience(null)
  setMapMode(nextMode)
  setLastCommand(`map:${nextMode}`)
}

function switchMapModeFromTab(nextMode: AddMapMode): void {
  if (nextMode === "dungeon_square") setDungeonTarget(STUDIO_DUNGEON_MAP_ID)
  switchMapMode(nextMode)
}

function returnToOverworldFromDungeon(): void {
  if (mapMode() === "overworld_hex") return
  setTravelExperience(null)
  setMapMode("overworld_hex")
  setLastCommand("return:overworld")
}

function enterDungeonLink(link: AddPhaserMapInfo["character"]["dungeonLinksAtCell"][number]): void {
  setDungeonTarget(link.targetMapId)
  setLastCommand(`enter:${link.targetMapId}`)
  switchMapMode("dungeon_square")
}

function refreshMapInfo(): void {
  const info = mapHost?.getInfo()
  if (info) setMapInfo(info)
}

function zoomMap(factor: number): void {
  mapHost?.zoomBy(factor)
  refreshMapInfo()
}

function resetMapCamera(): void {
  mapHost?.resetCamera()
  refreshMapInfo()
}

function mapFocusCopy(): string {
  const info = mapInfo()
  if (info.interaction.selectedLabel) return info.interaction.selectedLabel
  if (info.interaction.hoveredHex) return `Hex ${info.interaction.hoveredHex}`
  if (info.cells.total > 0) return `${info.cells.bubbleEdge} bubble edge cells`
  return "Waiting for map"
}

function handleOnline(): void {
  setOnline(true)
}

function handleOffline(): void {
  setOnline(false)
}

function maybeRestoreAutosaveOnBoot(_initialSnapshot: SimulationSnapshot): void {
  if (autosaveRestoreAttempted) return
  autosaveRestoreAttempted = true

  const record = refreshAutosaveFromStorage()
  if (!record) {
    setSaveStatus("No autosave")
    maybeRequestAutosave()
    return
  }

  queuedOfflineCatchupSeconds = offlineCatchupSecondsFor(record)
  setSavePayload(record.payload)
  setLastCommand("load_autosave")
  setSaveStatus(
    queuedOfflineCatchupSeconds > 0
      ? `Loading autosave +${formatDuration(queuedOfflineCatchupSeconds)}`
      : "Loading autosave",
  )
  client.importSave(record.payload)
}

function maybeRunQueuedOfflineCatchup(): boolean {
  if (queuedOfflineCatchupSeconds <= 0) return false

  const seconds = queuedOfflineCatchupSeconds
  queuedOfflineCatchupSeconds = 0
  setLastOfflineCatchupSeconds(seconds)
  setLastCommand(`offline:${formatDuration(seconds)}`)
  setSaveStatus(`Catching up ${formatDuration(seconds)}`)
  client.runOfflineCatchup(seconds)
  return true
}

function maybeRequestAutosave(): void {
  if (!ready() || !autosaveEnabled() || saveRequestInFlight) return
  const now = Date.now()
  if (now - lastAutosaveRequestMs < 3000) return
  lastAutosaveRequestMs = now
  void requestSave("autosave")
}

async function exportSaveNow(): Promise<void> {
  await requestSave("manual")
}

async function loadAutosave(): Promise<void> {
  const record = refreshAutosaveFromStorage()
  if (!record) {
    setStorageError("No browser autosave is available.")
    return
  }

  queuedOfflineCatchupSeconds = offlineCatchupSecondsFor(record)
  setSavePayload(record.payload)
  setLastImportAtMs(Date.now())
  await sendAndWaitForSnapshot(() => {
    setLastCommand("load_autosave")
    setSaveStatus(
      queuedOfflineCatchupSeconds > 0
        ? `Loading autosave +${formatDuration(queuedOfflineCatchupSeconds)}`
        : "Loading autosave",
    )
    client.importSave(record.payload)
  })
}

async function importSaveText(): Promise<void> {
  const payload = savePayload().trim()
  if (!payload) {
    setStorageError("Paste a save payload before importing.")
    return
  }
  try {
    JSON.parse(payload)
  } catch {
    setLastEvent("error")
    setLastError("Save payload is not valid JSON.")
    setStorageError("Save payload is not valid JSON.")
    return
  }

  queuedOfflineCatchupSeconds = 0
  await sendAndWaitForSnapshot(() => {
    setLastCommand("import_save")
    setStorageError(null)
    client.importSave(payload)
  })

  if (!lastError()) {
    setLastImportAtMs(Date.now())
    await requestSave("import")
  }
}

async function runOfflineCatchup(seconds: number): Promise<void> {
  await sendAndWaitForSnapshot(() => {
    setLastOfflineCatchupSeconds(seconds)
    setLastCommand(`offline:${formatDuration(seconds)}`)
    setSaveStatus(`Catching up ${formatDuration(seconds)}`)
    client.runOfflineCatchup(seconds)
  })
  if (!lastError()) void requestSave("offline_catchup")
}

function clearBrowserAutosave(): void {
  try {
    clearAutosave()
    setAutosaveRecord(null)
    setSavePayload("")
    setSaveStatus("No autosave")
    setStorageError(null)
  } catch (error) {
    setStorageError(error instanceof Error ? error.message : String(error))
  }
}

async function requestSave(source: AddSaveSource): Promise<string | null> {
  if (!ready() || saveRequestInFlight) return lastSavePayload
  saveRequestInFlight = true
  pendingSaveSource = source
  const afterVersion = saveVersion
  const waiter = waitForSaveAfter(afterVersion)
  client.exportSave()
  const payload = await waiter
  if (saveVersion <= afterVersion) saveRequestInFlight = false
  return payload
}

function persistSavePayload(payload: string, source: AddSaveSource): void {
  const record = createSaveRecord(payload, snapshot(), source)
  try {
    writeAutosave(record)
    setAutosaveRecord(record)
    if (source !== "autosave" || savePayload().trim().length === 0) {
      setSavePayload(payload)
    }
    if (source === "manual") setLastManualExportAtMs(record.savedAtMs)
    if (source === "import") setLastImportAtMs(record.savedAtMs)
    setSaveStatus(`${source === "autosave" ? "Autosaved" : "Saved"} ${formatSaveTimestamp(record)}`)
    setStorageError(null)
  } catch (error) {
    setStorageError(error instanceof Error ? error.message : String(error))
  } finally {
    pendingSaveSource = "autosave"
  }
}

function refreshAutosaveFromStorage(): AddBrowserSaveRecord | null {
  const record = readAutosave()
  setAutosaveRecord(record)
  if (record) setSaveStatus(formatSaveTimestamp(record))
  return record
}

function lastOfflineCopy(): string {
  const seconds = lastOfflineCatchupSeconds()
  if (seconds <= 0) return online() ? "Ready" : "Browser offline"
  return `${formatDuration(seconds)} applied`
}

async function handleDoorToggle(coord: CellCoord): Promise<void> {
  // Doors are Rust-authoritative: send openDoor and let the new snapshot drive
  // the door overlay + FOV recompute (and the swing animation in the scene).
  const dungeonId = addDungeonByMapId(dungeonTarget())?.id ?? dungeonTarget()
  const key = dungeonDoorKey(dungeonId, coord)
  await sendAndWaitForSnapshot(() => {
    client.openDoor(key)
  })
}

async function handleCharacterTravel(event: AddCharacterTravelEvent): Promise<void> {
  const currentSnapshot = snapshot()
  if (!currentSnapshot) return

  if (travelClearTimer !== undefined) {
    window.clearTimeout(travelClearTimer)
    travelClearTimer = undefined
  }

  // Overworld hex = 1 in-game hour per tile; dungeon square = ~1 in-game second.
  const travelTiming =
    mapMode() === "overworld_hex" ? ADD_TILE_TRAVEL_PRESENTATION : ADD_DUNGEON_STEP_PRESENTATION
  const fromClockSeconds = currentSnapshot.clockSeconds
  const toClockSeconds = fromClockSeconds + travelTiming.runtimeSeconds
  const startedAtMs = Date.now()
  const arrivalAtMs = startedAtMs + travelTiming.durationMs

  setTravelExperience({
    phase: "traveling",
    event,
    fromClockSeconds,
    toClockSeconds,
    fromTime: selectAddWorldTimeForClockSeconds(fromClockSeconds),
    toTime: selectAddWorldTimeForClockSeconds(toClockSeconds),
    startedAtMs,
    arrivalAtMs,
    runtimeSynced: false,
    toxicityBefore: currentSnapshot.heroSurvival.viralLoadRatio,
    toxicityAfter: null,
  })
  animatePresentationClockTo(toClockSeconds, "tile_travel")

  mapHost?.setTravelLocked(true)
  try {
    await Promise.all([
      tickRuntime(travelTiming.runtimeSeconds, {
        queue: true,
        commandLabel: `travel:${event.direction}`,
      }),
      waitForTravelPresentation(startedAtMs, travelTiming.durationMs),
    ])
  } finally {
    mapHost?.setTravelLocked(false)
    // Settle the presentation clock to the authoritative clock at arrival so the
    // tile-hour lands exactly; ambient ticking resumes from here.
    cancelClockAnimation()
    setDisplayClockSeconds(snapshot()?.clockSeconds ?? toClockSeconds)
  }

  await revealHeroDestination(event)

  const afterSnapshot = snapshot()
  if (afterSnapshot) {
    setLastDiscoveryMovement({
      fromCell: event.fromCell,
      toCell: event.toCell,
      destinationLabel: event.destinationLabel,
      exposureRisk: event.exposureRisk,
      gameMinutes: travelTiming.visibleGameMinutes,
      discoveredBefore: currentSnapshot.discoveredCells.length,
      discoveredAfter: afterSnapshot.discoveredCells.length,
      toxicityBefore: currentSnapshot.heroSurvival.viralLoadRatio,
      toxicityAfter: afterSnapshot.heroSurvival.viralLoadRatio,
    })
  }
  setTravelExperience((current) =>
    current
      ? {
          ...current,
          phase: "arrived",
          runtimeSynced: true,
          toxicityAfter: afterSnapshot?.heroSurvival.viralLoadRatio ?? current.toxicityBefore,
        }
      : current,
  )

  travelClearTimer = window.setTimeout(() => {
    setTravelExperience(null)
    travelClearTimer = undefined
  }, 3600)
}

function waitForTravelPresentation(startedAtMs: number, durationMs: number): Promise<void> {
  const remainingMs = Math.max(0, startedAtMs + durationMs - Date.now())
  if (remainingMs <= 0) return Promise.resolve()
  return new Promise((resolve) => {
    window.setTimeout(resolve, remainingMs)
  })
}

async function revealHeroDestination(event: AddCharacterTravelEvent): Promise<void> {
  const toCoord = event.toCoord
  if (toCoord.kind !== "hex") return
  await sendAndWaitForSnapshot(() => {
    setLastCommand(`hero_move:${toCoord.q},${toCoord.r}`)
    client.moveHeroTo(toCoord.q, toCoord.r)
  })
}

async function tickRuntime(
  seconds: number,
  options: { readonly queue?: boolean; readonly commandLabel?: string } = {},
): Promise<void> {
  if (!ready()) return
  if (requestInFlight && !options.queue) return
  await sendAndWaitForSnapshot(() => {
    setLastCommand(options.commandLabel ?? `tick:${seconds.toFixed(1)}s`)
    client.tick(seconds)
  })
}

async function toggleHero(): Promise<void> {
  const currentSnapshot = snapshot()
  if (!currentSnapshot) return
  await sendAndWaitForSnapshot(() => {
    const assigned = !currentSnapshot.roster.heroAssigned
    setLastCommand(assigned ? "assign_hero" : "unassign_hero")
    client.assignHero(assigned)
  })
}

async function chooseStoryOption(beatId: string, optionId: string): Promise<void> {
  await sendAndWaitForSnapshot(() => {
    setLastCommand("choose_story_option")
    client.chooseStoryOption(beatId, optionId)
  })
}

async function setHeroRole(roleId: string): Promise<void> {
  await sendAndWaitForSnapshot(() => {
    setLastCommand(`hero_role:${roleId}`)
    client.setHeroRole(roleId)
  })
}

async function setRoleCrew(roleId: string, crew: number): Promise<void> {
  await sendAndWaitForSnapshot(() => {
    setLastCommand(`crew:${roleId}:${crew}`)
    client.setRoleCrew(roleId, crew)
  })
}

async function startConstruction(optionId: string): Promise<void> {
  await sendAndWaitForSnapshot(() => {
    setLastCommand(`construction:${optionId}`)
    client.startConstruction(optionId)
  })
}

async function resetRuntime(): Promise<void> {
  await sendAndWaitForSnapshot(() => {
    setLastCommand("reset")
    setResetCount((count) => count + 1)
    travelDramaState = "fresh"
    setTravelDialog(null)
    setLastDiscoveryMovement(null)
    client.reset()
  })
  if (!lastError()) await requestSave("reset")
}

async function runFirstPlayableAction(): Promise<void> {
  const action = currentFirstPlayableStep()?.action
  if (!action) return
  await runAddAction(action)
}

async function runDiscoveryAction(link: AddDiscoveryActionLink): Promise<void> {
  if (!link.enabled) return
  if (link.kind === "dungeon_entry") {
    enterDiscoveryDungeon()
    return
  }
  if (link.action) await runAddAction(link.action)
}

function enterDiscoveryDungeon(): void {
  const entry = discoveryState()?.dungeonEntry
  if (!entry?.enabled) return
  setDungeonTarget(entry.targetMapId)
  setLastCommand(`enter:${entry.targetMapId}`)
  switchMapMode("dungeon_square")
}

async function runAddAction(action: AddFirstPlayableAction): Promise<void> {
  switch (action.type) {
    case "choose_story_option":
      await chooseStoryOption(action.beatId, action.optionId)
      return
    case "assign_hero":
      await sendAndWaitForSnapshot(() => {
        setLastCommand(action.assigned ? "assign_hero" : "unassign_hero")
        client.assignHero(action.assigned)
      })
      return
    case "set_hero_role":
      await setHeroRole(action.roleId)
      return
    case "set_role_crew":
      await setRoleCrew(action.roleId, action.crew)
      return
    case "start_world_action":
      await sendAndWaitForSnapshot(() => {
        setLastCommand(`world_action:${action.actionId}`)
        client.startWorldAction(action.actionId)
      })
      return
    case "start_construction":
      await startConstruction(action.optionId)
      return
    case "tick":
      await tickRuntime(action.seconds, { queue: true })
      return
    case "recruit_from_survivor_cave":
      await sendAndWaitForSnapshot(() => {
        setLastCommand("recruit_from_survivor_cave")
        client.recruitFromSurvivorCave()
      })
  }
}

async function runInteraction(interaction: GameInteraction | undefined): Promise<void> {
  if (!interaction) return
  const command = addCommandForGameInteraction(interaction)
  if (!command) return
  const request = workerRequestForAddCommand(command)
  await sendAndWaitForSnapshot(() => {
    setLastCommand(command.kind)
    sendWorkerRequest(request)
  })
}

function sendWorkerRequest(request: WorkerRequest): void {
  switch (request.type) {
    case "tick":
      client.tick(request.seconds)
      return
    case "offlineCatchup":
      client.runOfflineCatchup(request.elapsedSeconds)
      return
    case "reset":
      client.reset()
      return
    case "importSave":
      client.importSave(request.payload)
      return
    case "exportSave":
      client.exportSave()
      return
    case "assignHero":
      client.assignHero(request.assigned)
      return
    case "startWorldAction":
      client.startWorldAction(request.actionId)
      return
    case "chooseStoryOption":
      client.chooseStoryOption(request.beatId, request.optionId)
      return
    case "recruitFromSurvivorCave":
      client.recruitFromSurvivorCave()
      return
    case "moveHeroTo":
      client.moveHeroTo(request.q, request.r)
      return
    default:
      setLastError(`Command ${request.type} is not exposed by this shell yet.`)
  }
}

async function sendAndWaitForSnapshot(send: () => void): Promise<void> {
  while (requestInFlight) {
    await waitForSnapshotAfter(snapshotVersion)
  }
  requestInFlight = true
  const waiter = waitForSnapshotAfter(snapshotVersion)
  send()
  await waiter
  requestInFlight = false
}

async function waitForSnapshotAfter(afterVersion: number): Promise<void> {
  if (snapshotVersion > afterVersion || lastError()) return

  await new Promise<void>((resolve) => {
    snapshotWaiters.push({ afterVersion, resolve })
    window.setTimeout(resolve, 4000)
  })
}

function resolveSnapshotWaiters(): void {
  const pending: typeof snapshotWaiters = []
  snapshotWaiters.forEach((waiter) => {
    if (snapshotVersion > waiter.afterVersion || lastError()) {
      waiter.resolve()
      return
    }
    pending.push(waiter)
  })
  snapshotWaiters = pending
}

async function waitForSaveAfter(afterVersion: number): Promise<string | null> {
  if (saveVersion > afterVersion || lastError()) return lastSavePayload

  return new Promise<string | null>((resolve) => {
    saveWaiters.push({ afterVersion, resolve })
    window.setTimeout(() => resolve(lastSavePayload), 4000)
  })
}

function resolveSaveWaiters(payload: string | null): void {
  const pending: typeof saveWaiters = []
  saveWaiters.forEach((waiter) => {
    if (saveVersion > waiter.afterVersion || lastError()) {
      waiter.resolve(payload)
      return
    }
    pending.push(waiter)
  })
  saveWaiters = pending
}

function toTextState(): RuntimeTextState {
  const currentSnapshot = snapshot()
  const currentCatalog = catalog()
  const currentUi = uiState()
  const currentMapInfo = mapHost?.getInfo() ?? mapInfo()
  const currentDiscovery =
    currentSnapshot && currentCatalog
      ? selectAddDiscoverySummary({
          snapshot: currentSnapshot,
          catalog: currentCatalog,
          heroCell: currentMapInfo.character.cell,
          selectedTile: currentMapInfo.interaction.selectedDetail,
          previewTile:
            currentMapInfo.interaction.hoveredDetail ??
            currentMapInfo.interaction.selectedDetail,
          heroDungeonLinks: currentMapInfo.character.dungeonLinksAtCell,
          selectedDungeonLinks: currentMapInfo.dungeonLinks.selected,
          travel: {
            active: travelExperience()?.phase === "traveling" || currentMapInfo.travel.active,
            phase:
              travelExperience()?.phase ??
              (currentMapInfo.travel.previewCell ? "preview" : "idle"),
            previewCell: currentMapInfo.travel.previewCell,
            destinationLabel:
              travelExperience()?.event.destinationLabel ??
              currentMapInfo.travel.destinationLabel ??
              currentMapInfo.travel.previewLabel,
            exposureRisk:
              travelExperience()?.event.exposureRisk ??
              currentMapInfo.travel.exposureRisk ??
              currentMapInfo.travel.previewExposureRisk,
            previewAdjacent: currentMapInfo.travel.previewAdjacent,
            gameMinutes: currentMapInfo.travel.costGameMinutes,
          },
          lastMovement: lastDiscoveryMovement(),
        })
      : null
  const currentDungeonObjective = selectAddDungeonObjective({
    mapMode: mapMode(),
    dungeonMapId: mapMode() === "dungeon_square" ? dungeonTarget() : null,
    heroCell: currentMapInfo.character.cell,
  })
  return createAddRuntimeTextState({
    snapshot: currentSnapshot,
    catalog: currentCatalog,
    ui: currentUi,
    displayedWorldTime: displayedWorldTime(),
    displayClockSeconds: displayClockSeconds(),
    clockAnimation: clockAnimation(),
    mapInfo: currentMapInfo,
    discovery: currentDiscovery,
    dungeonObjective: currentDungeonObjective,
    mapMode: mapMode(),
    adminOpen: adminOpen(),
    firstPlayableCollapsed: firstPlayableCollapsed(),
    questPanelPosition: questPanelPosition(),
    runtime: {
      ready: ready(),
      autoTick: autoTick(),
      timeSpeed: timeSpeed(),
      online: online(),
      lastEvent: lastEvent(),
      lastCommand: lastCommand(),
      error: lastError(),
    },
    travel: {
      experience: travelExperience(),
      dramaState: travelDramaState,
      dialogKind: travelDialog()?.kind ?? null,
      confirmationEligibility: openingTravelDialogEligibility(currentMapInfo),
    },
    persistence: {
      autosaveEnabled: autosaveEnabled(),
      autosaveAvailable: autosaveRecord() !== null,
      lastAutosaveAtMs: autosaveRecord()?.savedAtMs ?? null,
      lastAutosaveClockSeconds: autosaveRecord()?.clockSeconds ?? null,
      lastAutosaveSource: autosaveRecord()?.source ?? null,
      lastManualExportAtMs: lastManualExportAtMs(),
      lastImportAtMs: lastImportAtMs(),
      lastOfflineCatchupSeconds: lastOfflineCatchupSeconds(),
      resetCount: resetCount(),
      savePayloadLength: savePayload().length,
      status: saveStatus(),
      storageError: storageError(),
      firstPlayablePersistenceReady: persistenceReadyForFirstPlayable(),
    },
  })
}

function statusState(): string {
  if (lastError()) return "error"
  return ready() ? "ready" : "booting"
}

function statusLabel(): string {
  if (lastError()) return "Runtime error"
  if (!ready()) return "Booting"
  // Ambient world clock runs by default ("Live"); the toggle pauses it ("Paused").
  return autoTick() ? "Live" : "Paused"
}

const ADD_TIME_SPEEDS: readonly number[] = [1, 2, 4]

// Single-button time control cycling: Paused -> 1x -> 2x -> 4x -> Paused.
function cycleTimeSpeed(): void {
  if (!autoTick()) {
    setTimeSpeed(1)
    setAutoTick(true)
    return
  }
  const nextSpeed = ADD_TIME_SPEEDS[ADD_TIME_SPEEDS.indexOf(timeSpeed()) + 1]
  if (nextSpeed === undefined) {
    setAutoTick(false)
    return
  }
  setTimeSpeed(nextSpeed)
}

function timeSpeedLabel(): string {
  if (!ready()) return "…"
  return autoTick() ? `▶ ${timeSpeed()}×` : "⏸ Paused"
}

function objectiveState(): string {
  const objective = uiState()?.objective
  if (!objective) return "pending"
  return objective.reachMet ? "met" : "open"
}

function objectiveCopy(): string {
  const objective = uiState()?.objective
  if (!objective) return "Waiting for objective state."
  const caveState = objective.survivorCaveInBubble ? "inside" : "outside"
  return `Reach ${objective.reachTarget}; survivor cave ${caveState} bubble at distance ${objective.survivorCaveDistance}.`
}

function persistenceReadyForFirstPlayable(): boolean {
  return (
    autosaveRecord() !== null &&
    (lastManualExportAtMs() !== null || savePayload().length > 200) &&
    lastOfflineCatchupSeconds() > 0
  )
}

function formatResource(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

function formatSignedRatioPercent(value: number): string {
  const percent = Math.round(Math.abs(value) * 1000) / 10
  return `${value >= 0 ? "+" : "-"}${percent}%`
}

function titleCase(value: string): string {
  return value.length === 0 ? value : `${value[0].toUpperCase()}${value.slice(1)}`
}

function safeElementId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-")
}

function slugForRole(roleId: string): string {
  switch (roleId) {
    case ROLE_CRYSTAL_BASSLINE:
      return "bassline"
    case ROLE_CONSTRUCTION:
      return "construction"
    case ROLE_FIRE_PIT:
      return "fire-pit"
    case ROLE_SCAVENGE:
      return "scavenge"
    case ROLE_WATER:
      return "water"
    default:
      return slugForId(roleId)
  }
}

function roleShortLabel(roleId: string): string {
  switch (roleId) {
    case ROLE_CRYSTAL_BASSLINE:
      return "Bassline"
    case ROLE_CONSTRUCTION:
      return "Build"
    case ROLE_FIRE_PIT:
      return "Fire"
    case ROLE_SCAVENGE:
      return "Scavenge"
    case ROLE_WATER:
      return "Water"
    default:
      return "Role"
  }
}

function constructionButtonId(optionId: string): string {
  switch (optionId) {
    case PROJECT_RESTORE_STUDIO:
      return "start-restore-studio"
    case PROJECT_BUILD_FIRE_PIT:
      return "start-fire-pit"
    default:
      return `start-${slugForId(optionId)}`
  }
}

function slugForId(id: string): string {
  return id.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()
}

function storyChoiceSelected(currentSnapshot: SimulationSnapshot, beatId: string): boolean {
  const choiceByBeat = currentSnapshot.narrative.choiceByBeat as
    | Record<string, string>
    | Map<string, string>
    | undefined
  if (!choiceByBeat) return false
  if (typeof (choiceByBeat as Map<string, string>).has === "function") {
    return (choiceByBeat as Map<string, string>).has(beatId)
  }
  return Boolean((choiceByBeat as Record<string, string>)[beatId])
}

function requiredElement(id: string): HTMLElement {
  const found = document.getElementById(id)
  if (!found) throw new Error(`Missing #${id}`)
  return found
}

function emptyMapInfo(): AddPhaserMapInfo {
  return {
    hostedBy: "phaser",
    ready: false,
    renderCount: 0,
    mapId: null,
    validationValid: false,
    validationSummary: "Map has not rendered yet.",
    rendererType: "unknown",
    topology: {
      kind: "unknown",
      mapMode: null,
      fixture: false,
      radius: null,
      cellSize: null,
    },
    authority: {
      rules: "rust_wasm_snapshot",
      phaser: "visual_projection_only",
      mutatesSimulation: false,
    },
    cells: {
      total: 0,
      inactive: 0,
      converting: 0,
      stabilized: 0,
      blocked: 0,
      bubbleEdge: 0,
    },
    dungeonLinks: {
      total: 0,
      cellsWithLinks: 0,
      selected: [],
    },
    knownFacts: {
      hiddenCells: 0,
      discoveredCells: 0,
      visibleCells: 0,
      staleCells: 0,
      exactTerrainKnownCells: 0,
      dynamicRiskKnownCells: 0,
      vagueTravelLabels: 0,
      sampleHiddenTravelLabel: null,
    },
    visibility: {
      hiddenCells: 0,
      discoveredCells: 0,
      visibleCells: 0,
      staleCells: 0,
      revealTransitionsActive: 0,
      travelRevealPreviewActive: false,
      travelRevealPreviewCells: 0,
      travelRevealPreviewProgress: 0,
      travelRevealDestinationCell: null,
      fogRendering: "phaser_visual_overlay",
      affectsAuthority: false,
      hiddenCellRendering: "invisible_until_known_or_travel_revealed",
    },
    character: {
      id: "add.entity.hero",
      label: "Hero",
      visible: false,
      coord: null,
      cell: null,
      x: null,
      y: null,
      moving: false,
      facing: null,
      lastMoveDirection: null,
      lastMoveAccepted: null,
      blockedReason: null,
      dungeonLinksAtCell: [],
      authority: "browser_navigation_triggers_rust_time",
    },
    travel: {
      costGameMinutes: ADD_TILE_TRAVEL_PRESENTATION.visibleGameMinutes,
      costRuntimeSeconds: ADD_TILE_TRAVEL_PRESENTATION.runtimeSeconds,
      presentationDurationMs: ADD_TILE_TRAVEL_PRESENTATION.durationMs,
      clockStepMs: ADD_TILE_TRAVEL_PRESENTATION.msPerVisibleMinute,
      active: false,
      progress: 0,
      direction: null,
      fromCell: null,
      toCell: null,
      destinationLabel: null,
      destinationState: null,
      destinationTerrain: null,
      exposureRisk: null,
      previewCell: null,
      previewLabel: null,
      previewAdjacent: false,
      previewExposureRisk: null,
      blockedReason: null,
    },
    landmarks: {
      baseCenter: null,
      studioLabelVisible: false,
      survivorCave: null,
      survivorCaveVisible: false,
      renderedCount: 0,
    },
    camera: {
      mode: "fit",
      zoom: 1,
      scrollX: 0,
      scrollY: 0,
    },
    interaction: {
      hoverEnabled: true,
      selectEnabled: true,
      hoveredCell: null,
      selectedCell: null,
      hoveredHex: null,
      selectedHex: null,
      selectedLabel: null,
      hoveredDetail: null,
      selectedDetail: null,
      visibilitySamples: {
        hidden: null,
        discovered: null,
        visible: null,
        stale: null,
      },
    },
    presentation: {
      terrainArt: "procedural_painterly_topology",
      bubbleEffects: "animated_halo_edge",
      landmarkSprites: "procedural_sprite_stack",
      labelRendering: "high_resolution_phaser_text",
      ambience: "subtle_motes_and_topographic_scan",
      visibilityPolish: {
        fogEdge: "soft_feathered_visibility_boundary",
        revealEffect: "expanding_ripple",
        caveMouthSilhouettes: true,
        travelReveal: "progressive_in_travel_radius",
        authority: "visual_only",
        laterModifiers: ["day_night_radius", "weather_season", "scouting_buildings_items"],
      },
      transitionState: "idle",
      transitionProgress: 1,
      responsiveLayout: "desktop",
    },
  }
}
