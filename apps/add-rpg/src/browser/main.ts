import {
  ADD_DOMAIN_BOUNDARY,
  SimulationClient,
  type CatalogSnapshot,
  type SimulationSnapshot,
} from "@aedventure/add-domain"

import "./styles.css"

interface RuntimeTextState {
  app: "add-rpg"
  boundary: typeof ADD_DOMAIN_BOUNDARY
  runtime: {
    workerBoundary: "ui-worker-rust-wasm-snapshot"
    ready: boolean
    snapshotReceived: boolean
    catalogReceived: boolean
    lastEvent: string
    error: string | null
  }
  snapshot: {
    clockSeconds: number
    hexCount: number
    stabilizedHexes: number
    heroAssigned: boolean
    resources: {
      bassline: number
      chorus: number
      harmonics: number
      water: number
      vibes: number
    }
  } | null
  catalog: {
    resourceCount: number
    roleCount: number
    tileCount: number
    worldActionCount: number
  } | null
}

declare global {
  interface Window {
    render_game_to_text?: () => string
    advanceTime?: (milliseconds?: number) => Promise<string>
  }
}

let snapshot: SimulationSnapshot | null = null
let catalog: CatalogSnapshot | null = null
let ready = false
let lastEvent = "booting"
let lastError: string | null = null
let heroAssigned = false
let snapshotVersion = 0
let snapshotWaiters: Array<{ afterVersion: number; resolve: () => void }> = []

const client = new SimulationClient({
  createWorker: () =>
    new Worker(new URL("../workers/add-runtime.worker.ts", import.meta.url), {
      type: "module",
    }),
  onReady(nextSnapshot, nextCatalog) {
    ready = true
    snapshot = nextSnapshot
    catalog = nextCatalog
    snapshotVersion += 1
    heroAssigned = nextSnapshot.roster.heroAssigned
    lastEvent = "ready"
    lastError = null
    resolveSnapshotWaiters()
    render()
  },
  onSnapshot(nextSnapshot) {
    snapshot = nextSnapshot
    snapshotVersion += 1
    heroAssigned = nextSnapshot.roster.heroAssigned
    lastEvent = "snapshot"
    lastError = null
    resolveSnapshotWaiters()
    render()
  },
  onSave() {
    lastEvent = "save"
    render()
  },
  onError(message) {
    lastEvent = "error"
    lastError = message
    resolveSnapshotWaiters()
    render()
  },
})

window.render_game_to_text = () => JSON.stringify(toTextState())
window.advanceTime = async (milliseconds = 1000) => {
  if (!ready) await waitForSnapshotAfter(snapshotVersion)
  const seconds = Math.max(0.001, milliseconds / 1000)
  await sendAndWaitForSnapshot(() => client.tick(seconds))
  return JSON.stringify(toTextState())
}

installControls()
render()
client.init()

function installControls() {
  element("tick-runtime").addEventListener("click", () => {
    void sendAndWaitForSnapshot(() => client.tick(5))
  })
  element("assign-hero").addEventListener("click", () => {
    void sendAndWaitForSnapshot(() => client.assignHero(!heroAssigned))
  })
  element("reset-runtime").addEventListener("click", () => {
    void sendAndWaitForSnapshot(() => client.reset())
  })
}

async function sendAndWaitForSnapshot(send: () => void) {
  const waiter = waitForSnapshotAfter(snapshotVersion)
  send()
  await waiter
}

async function waitForSnapshotAfter(afterVersion: number) {
  if (snapshotVersion > afterVersion || lastError) return

  await new Promise<void>((resolve) => {
    snapshotWaiters.push({ afterVersion, resolve })
    window.setTimeout(resolve, 4000)
  })
}

function resolveSnapshotWaiters() {
  const pending: typeof snapshotWaiters = []
  snapshotWaiters.forEach((waiter) => {
    if (snapshotVersion > waiter.afterVersion || lastError) {
      waiter.resolve()
      return
    }
    pending.push(waiter)
  })
  snapshotWaiters = pending
}

function render() {
  const state = toTextState()
  const status = element("runtime-status")
  status.textContent = state.runtime.ready ? "Ready" : state.runtime.error ? "Error" : "Booting"
  status.dataset.state = state.runtime.error ? "error" : state.runtime.ready ? "ready" : "booting"

  element("clock-seconds").textContent = `${state.snapshot?.clockSeconds ?? 0}s`
  element("hex-count").textContent = `${state.snapshot?.hexCount ?? 0}`
  element("catalog-count").textContent = state.catalog
    ? `${state.catalog.resourceCount + state.catalog.tileCount} assets`
    : "0 assets"
  element("resource-bassline").textContent = formatResource(
    state.snapshot?.resources.bassline,
  )
  element("resource-chorus").textContent = formatResource(state.snapshot?.resources.chorus)
  element("resource-harmonics").textContent = formatResource(
    state.snapshot?.resources.harmonics,
  )
  element("hero-state").textContent = state.snapshot?.heroAssigned ? "Assigned" : "Unassigned"
  element("runtime-note").textContent =
    state.runtime.error ??
    `Last event: ${state.runtime.lastEvent}. ${state.snapshot?.stabilizedHexes ?? 0} stabilized hexes.`

  document.querySelectorAll("button").forEach((button) => {
    button.toggleAttribute("disabled", !state.runtime.ready)
  })
}

function toTextState(): RuntimeTextState {
  return {
    app: "add-rpg",
    boundary: ADD_DOMAIN_BOUNDARY,
    runtime: {
      workerBoundary: "ui-worker-rust-wasm-snapshot",
      ready,
      snapshotReceived: snapshot !== null,
      catalogReceived: catalog !== null,
      lastEvent,
      error: lastError,
    },
    snapshot: snapshot
      ? {
          clockSeconds: Math.round(snapshot.clockSeconds * 100) / 100,
          hexCount: snapshot.hexes.length,
          stabilizedHexes: snapshot.bubble.stabilizedHexes,
          heroAssigned: snapshot.roster.heroAssigned,
          resources: {
            bassline: snapshot.resources.bassline,
            chorus: snapshot.resources.chorus,
            harmonics: snapshot.resources.harmonics,
            water: snapshot.resources.water,
            vibes: snapshot.resources.vibes,
          },
        }
      : null,
    catalog: catalog
      ? {
          resourceCount: catalog.resources.length,
          roleCount: catalog.roles.length,
          tileCount: catalog.tiles.length,
          worldActionCount: catalog.worldActions.length,
        }
      : null,
  }
}

function formatResource(value: number | undefined) {
  return value === undefined ? "0" : value.toFixed(1)
}

function element(id: string): HTMLElement {
  const found = document.getElementById(id)
  if (!found) throw new Error(`Missing #${id}`)
  return found
}
