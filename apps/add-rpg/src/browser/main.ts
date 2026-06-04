import { createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js"
import html from "solid-js/html"
import { render } from "solid-js/web"
import {
  ADD_DOMAIN_BOUNDARY,
  SimulationClient,
  addCommandForGameInteraction,
  addSnapshotToGameWorld,
  selectAddUiState,
  workerRequestForAddCommand,
  type AddUiState,
  type CatalogSnapshot,
  type SimulationSnapshot,
  type WorkerRequest,
} from "@aedventure/add-domain"
import type { GameInteraction, GameWorld } from "@aedventure/game-world"

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

interface RuntimeTextState {
  readonly app: "add-rpg"
  readonly coordinateSystem: "hex axial q/r projected through Phaser"
  readonly shell: {
    readonly framework: "solid"
    readonly surface: "thin_add_management_shell"
    readonly hostsPhaserMap: boolean
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
      readonly water: number
      readonly vibes: number
    }
  } | null
  readonly ui: {
    readonly resourceCount: number
    readonly noteCount: number
    readonly activeStoryBeatId: string | null
    readonly enabledWorldActionIds: readonly string[]
    readonly objectiveReachMet: boolean
    readonly recruitmentEnabled: boolean
  } | null
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
const [lastEvent, setLastEvent] = createSignal("booting")
const [lastCommand, setLastCommand] = createSignal<string | null>(null)
const [lastError, setLastError] = createSignal<string | null>(null)

let mapHost: AddRpgPhaserMapHost | null = null

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

  const nextWorld = addSnapshotToGameWorld(currentSnapshot, currentCatalog, {
    worldId: "add.rpg.live-world",
    mapId: "add.rpg.hex-overworld",
    hexRadius: 26,
  })
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
    <main class="add-app-shell">
      <section class="world-pane">
        <div class="world-toolbar">
          <div>
            <p class="eyebrow">ADD live runtime</p>
            <h1>Overworld command deck</h1>
          </div>
          <div class="status-stack">
            <span class="status-pill" data-state=${() => statusState()}>
              ${() => statusLabel()}
            </span>
            <span class="status-pill quiet">${() => `${Math.round(snapshot()?.clockSeconds ?? 0)}s`}</span>
          </div>
        </div>
        <div id="add-world" class="add-world" ref=${(node: HTMLDivElement) => (mapElement = node)}>
          <div class=${() => (mapInfo().ready ? "map-loading hidden" : "map-loading")}>
            Initializing map
          </div>
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

      <aside class="management-rail" aria-label="ADD management controls">
        <section class="panel runtime-panel">
          <div class="panel-heading">
            <span>Runtime</span>
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

function resourceRows(): readonly unknown[] {
  return (uiState()?.resources.slice(0, 6) ?? []).map(
    (resource) => html`
      <article class="resource-row">
        <span>${resource.label}</span>
        <strong>${formatResource(resource.value)} / ${formatResource(resource.cap)}</strong>
      </article>
    `,
  )
}

function actionRows(): readonly unknown[] {
  return worldActions()
    .slice(0, 5)
    .map(
      (action) => html`
        <li class=${action.enabled ? "" : "disabled"}>
          <span>${action.label}</span>
          <small>${action.heroOnly ? "hero" : "crew"}</small>
        </li>
      `,
    )
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

async function tickRuntime(seconds: number): Promise<void> {
  if (!ready() || requestInFlight) return
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

async function resetRuntime(): Promise<void> {
  await sendAndWaitForSnapshot(() => {
    setLastCommand("reset")
    setResetCount((count) => count + 1)
    client.reset()
  })
  if (!lastError()) void requestSave("reset")
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
  if (requestInFlight) return
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
  return {
    app: "add-rpg",
    coordinateSystem: "hex axial q/r projected through Phaser",
    shell: {
      framework: "solid",
      surface: "thin_add_management_shell",
      hostsPhaserMap: true,
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
            water: currentSnapshot.resources.water,
            vibes: currentSnapshot.resources.vibes,
          },
        }
      : null,
    ui: currentUi
      ? {
          resourceCount: currentUi.resources.length,
          noteCount: currentUi.notes.length,
          activeStoryBeatId: currentUi.activeStoryBeat?.id ?? null,
          enabledWorldActionIds: currentUi.availableWorldActions
            .filter((action) => action.enabled)
            .map((action) => action.id),
          objectiveReachMet: currentUi.objective.reachMet,
          recruitmentEnabled: currentUi.objective.recruitmentEnabled,
        }
      : null,
    map: mapHost?.getInfo() ?? mapInfo(),
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

function formatResource(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
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
      hoveredHex: null,
      selectedHex: null,
      selectedLabel: null,
    },
  }
}
