import { createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js"
import html from "solid-js/html"
import { render } from "solid-js/web"
import {
  ADD_DOMAIN_BOUNDARY,
  SimulationClient,
  addCommandForGameInteraction,
  selectAddUiState,
  workerRequestForAddCommand,
  type AddUiState,
  type AddFirstPlayableAction,
  type CatalogSnapshot,
  type SimulationSnapshot,
  type WorkerRequest,
} from "@aedventure/add-domain"
import type { GameInteraction, GameWorld } from "@aedventure/game-world"

import {
  ADD_MAP_MODE_OPTIONS,
  addMapModeLabel,
  createAddWorldForMapMode,
  type AddMapMode,
} from "./add-map-modes"
import { AddRpgPhaserMapHost, type AddPhaserMapInfo } from "./phaser-add-map"
import {
  ADD_AUTOSAVE_STORAGE_KEY,
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
import "./styles.css"

const ROLE_CRYSTAL_BASSLINE = "role.crystal_bassline"
const ROLE_CONSTRUCTION = "role.construction"
const ROLE_FIRE_PIT = "role.fire_pit"
const ROLE_SCAVENGE = "role.scavenge"
const ROLE_WATER = "role.water"
const PROJECT_RESTORE_STUDIO = "project.restore_studio"
const PROJECT_BUILD_FIRE_PIT = "project.build_fire_pit"

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

interface RuntimeTextState {
  readonly app: "add-rpg"
  readonly coordinateSystem: "active ADD map mode projected through Phaser"
  readonly shell: {
    readonly framework: "solid"
    readonly surface: "fullscreen_map_shell"
    readonly hostsPhaserMap: boolean
    readonly adminOpen: boolean
    readonly questPanel: {
      readonly collapsed: boolean
      readonly x: number
      readonly y: number
    }
  }
  readonly boundary: typeof ADD_DOMAIN_BOUNDARY
  readonly runtime: {
    readonly workerBoundary: "ui-worker-rust-wasm-snapshot"
    readonly ready: boolean
    readonly snapshotReceived: boolean
    readonly catalogReceived: boolean
    readonly autoTick: boolean
    readonly online: boolean
    readonly lastEvent: string
    readonly lastCommand: string | null
    readonly error: string | null
  }
  readonly snapshot: {
    readonly clockSeconds: number
    readonly hexCount: number
    readonly stabilizedHexes: number
    readonly heroAssigned: boolean
    readonly activeWorldAction: string | null
    readonly resources: {
      readonly bassline: number
      readonly chorus: number
      readonly harmonics: number
      readonly stone: number
      readonly water: number
      readonly vibes: number
    }
    readonly base: {
      readonly tutorialInvestigated: boolean
      readonly tutorialExplored: boolean
      readonly studioRestoreUnlocked: boolean
      readonly studioRestored: boolean
      readonly firePitBuilt: boolean
      readonly bunksCapacity: number
      readonly freeBunks: number
    }
    readonly roster: {
      readonly heroRoleId: string
      readonly totalCrew: number
      readonly crewByRole: Record<string, number>
    }
    readonly bubble: {
      readonly reachFromBase: number
      readonly fieldBudget: number
      readonly targetRing: number
      readonly frontierProgress: number
    }
    readonly recruitment: {
      readonly totalRecruitedThisRun: number
      readonly pendingCount: number
      readonly nextRecruitCost: number
    }
    readonly activeConstruction: {
      readonly optionId: string
      readonly remainingSeconds: number
    } | null
  } | null
  readonly ui: {
    readonly worldTime: {
      readonly day: number
      readonly referenceDate: string
      readonly localTime: string
      readonly season: string
      readonly seasonLabel: string
      readonly daylightPhase: string
      readonly daylightRatio: number
      readonly nightRatio: number
      readonly sunrise: string
      readonly sunset: string
      readonly location: string
      readonly source: string
    }
    readonly resourceCount: number
    readonly resourceFlows: readonly {
      readonly id: string
      readonly source: string
      readonly sink: string
      readonly blocker: string | null
    }[]
    readonly noteCount: number
    readonly activeStoryBeatId: string | null
    readonly storyChoiceIds: readonly string[]
    readonly enabledWorldActionIds: readonly string[]
    readonly roleAssignments: readonly {
      readonly id: string
      readonly available: boolean
      readonly heroAssigned: boolean
      readonly crewAssigned: number
    }[]
    readonly constructionOptions: readonly {
      readonly id: string
      readonly complete: boolean
      readonly enabled: boolean
      readonly inProgress: boolean
      readonly blockedReason: string | null
    }[]
    readonly objectiveReachMet: boolean
    readonly recruitmentEnabled: boolean
    readonly firstPlayable: {
      readonly complete: boolean
      readonly completedCount: number
      readonly totalCount: number
      readonly currentStepId: string | null
      readonly currentAction: AddFirstPlayableAction | null
      readonly steps: readonly {
        readonly id: string
        readonly complete: boolean
        readonly active: boolean
        readonly actionLabel: string | null
      }[]
      readonly persistenceReady: boolean
    }
  } | null
  readonly mapMode: {
    readonly active: AddMapMode
    readonly label: string
    readonly available: readonly AddMapMode[]
    readonly topology: "hex" | "square" | "unknown"
    readonly fixture: boolean
  }
  readonly map: AddPhaserMapInfo
  readonly persistence: {
    readonly storageKey: string
    readonly autosaveEnabled: boolean
    readonly autosaveAvailable: boolean
    readonly lastAutosaveAtMs: number | null
    readonly lastAutosaveClockSeconds: number | null
    readonly lastAutosaveSource: AddSaveSource | null
    readonly lastManualExportAtMs: number | null
    readonly lastImportAtMs: number | null
    readonly lastOfflineCatchupSeconds: number
    readonly resetCount: number
    readonly savePayloadLength: number
    readonly status: string
    readonly storageError: string | null
  }
  readonly catalog: {
    readonly resourceCount: number
    readonly roleCount: number
    readonly tileCount: number
    readonly worldActionCount: number
  } | null
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
const [autoTick, setAutoTick] = createSignal(true)
const [adminOpen, setAdminOpen] = createSignal(false)
const [firstPlayableCollapsed, setFirstPlayableCollapsed] = createSignal(false)
const [questPanelPosition, setQuestPanelPosition] = createSignal(defaultQuestPanelPosition())
const [lastEvent, setLastEvent] = createSignal("booting")
const [lastCommand, setLastCommand] = createSignal<string | null>(null)
const [lastError, setLastError] = createSignal<string | null>(null)

let mapHost: AddRpgPhaserMapHost | null = null
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
    setCatalog(nextCatalog)
    setLastEvent("ready")
    setLastError(null)
    resolveSnapshotWaiters()
    maybeRestoreAutosaveOnBoot(nextSnapshot)
  },
  onSnapshot(nextSnapshot) {
    snapshotVersion += 1
    setSnapshot(nextSnapshot)
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

createEffect(() => {
  const currentSnapshot = snapshot()
  const currentCatalog = catalog()
  if (!currentSnapshot || !currentCatalog) return

  const nextWorld = createAddWorldForMapMode(mapMode(), currentSnapshot, currentCatalog)
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
    mapHost = new AddRpgPhaserMapHost(mapElement)
    const currentWorld = world()
    if (currentWorld) {
      mapHost.renderWorld(currentWorld)
      refreshMapInfo()
    }
    autoTickTimer = window.setInterval(() => {
      if (autoTick() && ready()) {
        void tickRuntime(1)
      }
    }, 1000)
    mapInfoTimer = window.setInterval(refreshMapInfo, 180)
    autosaveTimer = window.setInterval(maybeRequestAutosave, 3500)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
  })

  onCleanup(() => {
    if (autoTickTimer !== undefined) window.clearInterval(autoTickTimer)
    if (mapInfoTimer !== undefined) window.clearInterval(mapInfoTimer)
    if (autosaveTimer !== undefined) window.clearInterval(autosaveTimer)
    window.removeEventListener("online", handleOnline)
    window.removeEventListener("offline", handleOffline)
    mapHost?.destroy()
    client.dispose()
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
            data-phase=${() => uiState()?.worldTime.daylightPhase ?? "day"}
            data-season=${() => uiState()?.worldTime.season ?? "spring"}
            style=${() => dayNightOverlayStyle()}
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
              <div class="world-time-chip" aria-label="Game time">
                <span>${() => worldTimePrimaryCopy()}</span>
                <small>${() => worldTimeSecondaryCopy()}</small>
                <i style=${() => daylightMeterStyle()} aria-hidden="true" />
              </div>
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
              <span>First playable</span>
              <div class="panel-heading-actions">
                <span class="small-chip">
                  ${() => `${uiState()?.firstPlayable.completedCount ?? 0}/${uiState()?.firstPlayable.totalCount ?? 0}`}
                </span>
                <button
                  id="toggle-first-playable-panel"
                  type="button"
                  class="panel-icon-button"
                  onClick=${() => setFirstPlayableCollapsed(!firstPlayableCollapsed())}
                  aria-expanded=${() => !firstPlayableCollapsed()}
                  aria-controls="first-playable-body"
                  aria-label=${() => (firstPlayableCollapsed() ? "Expand first playable tasks" : "Collapse first playable tasks")}
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
        onClick=${() => switchMapMode(option.id)}
      >
        ${option.label}
      </button>
    `,
  )
}

function dayNightOverlayStyle(): Record<string, string> {
  const time = uiState()?.worldTime
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

function daylightMeterStyle(): Record<string, string> {
  const ratio = uiState()?.worldTime.daylightRatio ?? 1
  return {
    "--daylight-ratio": `${Math.max(8, Math.round(ratio * 100))}%`,
  }
}

function worldTimePrimaryCopy(): string {
  const time = uiState()?.worldTime
  if (!time) return "Day 1 · --:--"
  return `Day ${time.day} · ${time.localTime}`
}

function worldTimeSecondaryCopy(): string {
  const time = uiState()?.worldTime
  if (!time) return "Solar estimate pending"
  return `${time.seasonLabel} · ${titleCase(time.daylightPhase)} · ${time.sunrise}/${time.sunset}`
}

function switchMapMode(nextMode: AddMapMode): void {
  if (mapMode() === nextMode) return
  setMapMode(nextMode)
  setLastCommand(`map:${nextMode}`)
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

async function tickRuntime(seconds: number, options: { readonly queue?: boolean } = {}): Promise<void> {
  if (!ready()) return
  if (requestInFlight && !options.queue) return
  await sendAndWaitForSnapshot(() => {
    setLastCommand(`tick:${seconds.toFixed(1)}s`)
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
    client.reset()
  })
  if (!lastError()) await requestSave("reset")
}

async function runFirstPlayableAction(): Promise<void> {
  const action = currentFirstPlayableStep()?.action
  if (!action) return
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
  return {
    app: "add-rpg",
    coordinateSystem: "active ADD map mode projected through Phaser",
    shell: {
      framework: "solid",
      surface: "fullscreen_map_shell",
      hostsPhaserMap: true,
      adminOpen: adminOpen(),
      questPanel: {
        collapsed: firstPlayableCollapsed(),
        x: questPanelPosition().x,
        y: questPanelPosition().y,
      },
    },
    boundary: ADD_DOMAIN_BOUNDARY,
    runtime: {
      workerBoundary: "ui-worker-rust-wasm-snapshot",
      ready: ready(),
      snapshotReceived: currentSnapshot !== null,
      catalogReceived: currentCatalog !== null,
      autoTick: autoTick(),
      online: online(),
      lastEvent: lastEvent(),
      lastCommand: lastCommand(),
      error: lastError(),
    },
    snapshot: currentSnapshot
      ? {
          clockSeconds: Math.round(currentSnapshot.clockSeconds * 100) / 100,
          hexCount: currentSnapshot.hexes.length,
          stabilizedHexes: currentSnapshot.bubble.stabilizedHexes,
          heroAssigned: currentSnapshot.roster.heroAssigned,
          activeWorldAction: currentSnapshot.activeWorldAction?.actionId ?? null,
          resources: {
            bassline: currentSnapshot.resources.bassline,
            chorus: currentSnapshot.resources.chorus,
            harmonics: currentSnapshot.resources.harmonics,
            stone: currentSnapshot.resources.stone,
            water: currentSnapshot.resources.water,
            vibes: currentSnapshot.resources.vibes,
          },
          base: {
            tutorialInvestigated: currentSnapshot.base.tutorialInvestigated,
            tutorialExplored: currentSnapshot.base.tutorialExplored,
            studioRestoreUnlocked: currentSnapshot.base.studioRestoreUnlocked,
            studioRestored: currentSnapshot.base.studioRestored,
            firePitBuilt: currentSnapshot.base.firePitBuilt,
            bunksCapacity: currentSnapshot.base.bunksCapacity,
            freeBunks: currentSnapshot.base.freeBunks,
          },
          roster: {
            heroRoleId: currentSnapshot.roster.heroRoleId,
            totalCrew: currentSnapshot.roster.totalCrew,
            crewByRole: stringNumberRecord(currentSnapshot.roster.crewByRole),
          },
          bubble: {
            reachFromBase: currentSnapshot.bubble.reachFromBase,
            fieldBudget: currentSnapshot.bubble.fieldBudget,
            targetRing: currentSnapshot.bubble.targetRing,
            frontierProgress: currentSnapshot.bubble.frontierProgress,
          },
          recruitment: {
            totalRecruitedThisRun: currentSnapshot.recruitment.totalRecruitedThisRun,
            pendingCount: currentSnapshot.recruitment.pendingRecruits.length,
            nextRecruitCost: currentSnapshot.recruitment.nextRecruitCost,
          },
          activeConstruction: currentSnapshot.activeConstruction
            ? {
                optionId: currentSnapshot.activeConstruction.optionId,
                remainingSeconds:
                  Math.round(currentSnapshot.activeConstruction.remainingWorkSeconds * 100) / 100,
              }
            : null,
        }
      : null,
    ui: currentUi
      ? {
          worldTime: {
            day: currentUi.worldTime.day,
            referenceDate: currentUi.worldTime.referenceDate,
            localTime: currentUi.worldTime.localTime,
            season: currentUi.worldTime.season,
            seasonLabel: currentUi.worldTime.seasonLabel,
            daylightPhase: currentUi.worldTime.daylightPhase,
            daylightRatio: currentUi.worldTime.daylightRatio,
            nightRatio: currentUi.worldTime.nightRatio,
            sunrise: currentUi.worldTime.sunrise,
            sunset: currentUi.worldTime.sunset,
            location: currentUi.worldTime.location.label,
            source: currentUi.worldTime.source,
          },
          resourceCount: currentUi.resources.length,
          resourceFlows: currentUi.resources.map((resource) => ({
            id: resource.id,
            source: resource.source,
            sink: resource.sink,
            blocker: resource.blocker,
          })),
          noteCount: currentUi.notes.length,
          activeStoryBeatId: currentUi.activeStoryBeat?.id ?? null,
          storyChoiceIds: currentUi.activeStoryBeat?.choices.map((choice) => choice.id) ?? [],
          enabledWorldActionIds: currentUi.availableWorldActions
            .filter((action) => action.enabled)
            .map((action) => action.id),
          roleAssignments: currentUi.roleAssignments.map((role) => ({
            id: role.id,
            available: role.available,
            heroAssigned: role.heroAssigned,
            crewAssigned: role.crewAssigned,
          })),
          constructionOptions: currentUi.constructionOptions.map((option) => ({
            id: option.id,
            complete: option.complete,
            enabled: option.enabled,
            inProgress: option.inProgress,
            blockedReason: option.blockedReason,
          })),
          objectiveReachMet: currentUi.objective.reachMet,
          recruitmentEnabled: currentUi.objective.recruitmentEnabled,
          firstPlayable: {
            complete: currentUi.firstPlayable.complete,
            completedCount: currentUi.firstPlayable.completedCount,
            totalCount: currentUi.firstPlayable.totalCount,
            currentStepId: currentUi.firstPlayable.currentStepId,
            currentAction:
              currentUi.firstPlayable.steps.find((step) => step.active)?.action ?? null,
            steps: currentUi.firstPlayable.steps.map((step) => ({
              id: step.id,
              complete: step.complete,
              active: step.active,
              actionLabel: step.actionLabel,
            })),
            persistenceReady: persistenceReadyForFirstPlayable(),
          },
        }
      : null,
    mapMode: {
      active: mapMode(),
      label: addMapModeLabel(mapMode()),
      available: ADD_MAP_MODE_OPTIONS.map((option) => option.id),
      topology: currentMapInfo.topology.kind,
      fixture: currentMapInfo.topology.fixture,
    },
    map: currentMapInfo,
    persistence: {
      storageKey: ADD_AUTOSAVE_STORAGE_KEY,
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
    },
    catalog: currentCatalog
      ? {
          resourceCount: currentCatalog.resources.length,
          roleCount: currentCatalog.roles.length,
          tileCount: currentCatalog.tiles.length,
          worldActionCount: currentCatalog.worldActions.length,
        }
      : null,
  }
}

function statusState(): string {
  if (lastError()) return "error"
  return ready() ? "ready" : "booting"
}

function statusLabel(): string {
  if (lastError()) return "Runtime error"
  return ready() ? "Live" : "Booting"
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

function titleCase(value: string): string {
  return value.length === 0 ? value : `${value[0].toUpperCase()}${value.slice(1)}`
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

function stringNumberRecord(
  value: Record<string, number> | Map<string, number>,
): Record<string, number> {
  if (typeof (value as Map<string, number>).entries === "function") {
    return Object.fromEntries((value as Map<string, number>).entries())
  }
  return value as Record<string, number>
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
    character: {
      id: "add.entity.hero",
      label: "Hero",
      visible: false,
      coord: null,
      cell: null,
      x: null,
      y: null,
      moving: false,
      lastMoveDirection: null,
      lastMoveAccepted: null,
      blockedReason: null,
      dungeonLinksAtCell: [],
      authority: "local_browser_navigation_preview",
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
    },
    presentation: {
      terrainArt: "procedural_painterly_topology",
      bubbleEffects: "animated_halo_edge",
      landmarkSprites: "procedural_sprite_stack",
      labelRendering: "high_resolution_phaser_text",
      ambience: "subtle_motes_and_topographic_scan",
      transitionState: "idle",
      transitionProgress: 1,
      responsiveLayout: "desktop",
    },
  }
}
