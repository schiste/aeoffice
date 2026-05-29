import { For, Show, createEffect, createMemo, createSignal, onCleanup } from 'solid-js'
import './App.css'
import { MapViewport } from './components/MapViewport'
import { SimulationClient } from './lib/sim/client'
import { UI_COPY } from './lib/ui-copy'
import type {
  CatalogSnapshot,
  ConstructionOptionDef,
  ProcessingRecipeDef,
  RequirementDef,
  RoleDef,
  SimulationSnapshot,
  StoryBeatDef,
  VisibilityDef,
  WorldActionDef,
} from './lib/sim/protocol'

const LIVE_TICK_INTERVAL_MS = 250
const MAX_LIVE_TICK_SECONDS = 1
const AUTOSAVE_INTERVAL_MS = 15000
const MIN_OFFLINE_SUMMARY_SECONDS = 5
const SAVE_STORAGE_KEY = 'add.runtime.save'
const SAVE_TIMESTAMP_KEY = 'add.runtime.saveAt'
const RESOURCE_BASSLINE = 'resource.bassline'
const RESOURCE_CHORUS = 'resource.chorus'
const RESOURCE_HARMONICS = 'resource.harmonics'
const RESOURCE_STONE = 'resource.stone'
const RESOURCE_WATER = 'resource.water'
const RESOURCE_VIBES = 'resource.vibes'
const ROLE_CRYSTAL_BASSLINE = 'role.crystal_bassline'
const ROLE_CRYSTAL_CHORUS = 'role.crystal_chorus'
const ROLE_CRYSTAL_HARMONICS = 'role.crystal_harmonics'
const ROLE_CONSTRUCTION = 'role.construction'
const ROLE_FIRE_PIT = 'role.fire_pit'
const ROLE_SCAVENGE = 'role.scavenge'
const ROLE_WATER = 'role.water'
const STATION_CRYSTAL_CIRCLE = 'station.crystal_circle'
const STATION_RESONANCE_CHAMBER = 'station.resonance_chamber'
const STATION_MIX_CONSOLE = 'station.mix_console'
const UI_PANEL_NARRATIVE = 'ui.panel.narrative'
const WORLD_ACTION_INVESTIGATE_BASE = 'world_action.investigate_base'
const WORLD_ACTION_EXPLORE_BASE = 'world_action.explore_base'
const STORY_BEAT_INVESTIGATE_BASE = 'story.beat.investigate_base'
const STORY_BEAT_EXPLORE_BASE = 'story.beat.explore_base'
const STORY_BEAT_RESTORE_STUDIO = 'story.beat.restore_studio'
const STORY_BEAT_BUILD_FIRE_PIT = 'story.beat.build_fire_pit'
const STORY_BEAT_REACH_SURVIVOR_CAVE = 'story.beat.reach_survivor_cave'
const STORY_BEAT_FIRST_RECRUIT = 'story.beat.first_recruit'
const STORY_BEAT_AWAIT_SURVIVOR_ARRIVAL = 'story.beat.await_survivor_arrival'
const STORY_BEAT_STABILIZE_BASE = 'story.beat.stabilize_base'
const UI_PANEL_POWER = 'ui.panel.power'
const UI_PANEL_CRYSTAL = 'ui.panel.crystal'
const UI_PANEL_HERO = 'ui.panel.hero'
const UI_PANEL_MAP = 'ui.panel.map'
const UI_PANEL_CONSTRUCTION = 'ui.panel.construction'
const UI_PANEL_BASE = 'ui.panel.base'
const UI_PANEL_RUN = 'ui.panel.run'
const UI_PANEL_OBJECTIVES = 'ui.panel.objectives'
const UI_METRIC_CRYSTAL_FREE_SLOTS = 'ui.metric.crystal.free_slots'
const UI_METRIC_CRYSTAL_OUTPUT_LEVEL = 'ui.metric.crystal.output_level'
const UI_METRIC_CRYSTAL_FIELD_POLISH = 'ui.metric.crystal.field_polish'
const UI_METRIC_CRYSTAL_BUBBLE_BUDGET = 'ui.metric.crystal.bubble_budget'
const UI_METRIC_CRYSTAL_SOURCE = 'ui.metric.crystal.source'
const UI_METRIC_CRYSTAL_SINK = 'ui.metric.crystal.sink'
const UI_METRIC_CRYSTAL_RISK = 'ui.metric.crystal.risk'
const UI_METRIC_CHORUS_RATE = 'ui.metric.chorus.rate'
const UI_METRIC_CHORUS_STATION_UPKEEP = 'ui.metric.chorus.station_upkeep'
const UI_METRIC_CHORUS_SOURCE = 'ui.metric.chorus.source'
const UI_METRIC_CHORUS_SINK = 'ui.metric.chorus.sink'
const UI_METRIC_CHORUS_RISK = 'ui.metric.chorus.risk'
const UI_METRIC_HARMONICS_TIER = 'ui.metric.harmonics.tier'
const UI_METRIC_HARMONICS_EFFICIENCY = 'ui.metric.harmonics.efficiency'
const UI_METRIC_HARMONICS_SOURCE = 'ui.metric.harmonics.source'
const UI_METRIC_HARMONICS_SINK = 'ui.metric.harmonics.sink'
const UI_METRIC_HARMONICS_RISK = 'ui.metric.harmonics.risk'
const UI_METRIC_POWER_ACTIVE_UPKEEP = 'ui.metric.power.active_upkeep'
const UI_METRIC_POWER_ACTIVE_STAFF = 'ui.metric.power.active_staff'
const UI_METRIC_POWER_LIFE_SUPPORT = 'ui.metric.power.life_support'
const UI_METRIC_POWER_BROWNOUT = 'ui.metric.power.brownout'
const UI_SUMMARY_CONSTRUCTION_SOURCE = 'ui.summary.construction.source'
const UI_SUMMARY_CONSTRUCTION_SINK = 'ui.summary.construction.sink'
const UI_SUMMARY_CONSTRUCTION_BLOCKER = 'ui.summary.construction.blocker'
const UI_SUMMARY_POWER_SOURCE = 'ui.summary.power.source'
const UI_SUMMARY_POWER_SINK = 'ui.summary.power.sink'
const UI_SUMMARY_POWER_BLOCKER = 'ui.summary.power.blocker'
const UI_METRIC_BASE_RECRUIT_COST = 'ui.metric.base.recruit_cost'
const UI_METRIC_BASE_BUNKS = 'ui.metric.base.bunks'
const UI_METRIC_BASE_HOUSING = 'ui.metric.base.housing'
const UI_METRIC_BASE_BAD_VIBES = 'ui.metric.base.bad_vibes'
const UI_METRIC_BASE_CREW_EFFICIENCY = 'ui.metric.base.crew_efficiency'
const UI_METRIC_BASE_STONE_STOCK = 'ui.metric.base.stone_stock'
const UI_METRIC_BASE_WATER_STOCK = 'ui.metric.base.water_stock'
const UI_SUMMARY_BASE_SOURCE = 'ui.summary.base.source'
const UI_SUMMARY_BASE_SINK = 'ui.summary.base.sink'
const UI_SUMMARY_BASE_BLOCKER = 'ui.summary.base.blocker'
const UI_CONTROL_HERO_TASK = 'ui.control.hero.task'
const UI_STATUS_HERO = 'ui.status.hero'
const UI_METRIC_HERO_VITALS = 'ui.metric.hero.vitals'
const UI_METRIC_HERO_WOUNDS = 'ui.metric.hero.wounds'
const UI_METRIC_HERO_RETURN_WINDOW = 'ui.metric.hero.return_window'
const UI_METRIC_HERO_RECOVERY = 'ui.metric.hero.recovery'
const UI_METRIC_HERO_ECHO_SCARS = 'ui.metric.hero.echo_scars'
const UI_METRIC_HERO_DEBUFF = 'ui.metric.hero.debuff'
const UI_CONTROL_CONSTRUCTION_CREW = 'ui.control.construction.crew'
const UI_CONTROL_BASE_SCAVENGE = 'ui.control.base.scavenge'
const UI_CONTROL_BASE_FIRE_PIT = 'ui.control.base.fire_pit'
const UI_CONTROL_BASE_WATER = 'ui.control.base.water'
const UI_ACTION_RECRUIT = 'ui.action.recruit'
const UI_STATUS_BASE_STUDIO = 'ui.status.base.studio'
const UI_STATUS_BASE_FIRE_PIT = 'ui.status.base.fire_pit'
const UI_STATUS_BASE_RECRUITS = 'ui.status.base.recruits'
const UI_STATUS_BASE_HOUSING = 'ui.status.base.housing'
const UI_MAP_CAVE_GATE = 'ui.map.cave_gate'
const FLAG_HERO_OUTSIDE_BUBBLE = 'hero.outside_bubble'
const FLAG_HERO_FORCED_RETURN_ACTIVE = 'hero.forced_return_active'
const FLAG_HERO_RECOVERING_AT_STUDIO = 'hero.recovering_at_studio'
const UI_OBJECTIVE_STATUS = 'ui.objective.status'
const UI_OBJECTIVE_ACTIVE_GOAL = 'ui.objective.active_goal'
const UI_OBJECTIVE_NEXT = 'ui.objective.next'
const UI_OBJECTIVE_BLOCKER = 'ui.objective.blocker'
const UI_OBJECTIVE_UNLOCK = 'ui.objective.unlock'
const UI_OBJECTIVE_NEXT_MOVE = 'ui.objective.next_move'
const UI_OBJECTIVE_WATCH_OUT = 'ui.objective.watch_out'
const TOP_RESOURCE_IDS = [
  RESOURCE_BASSLINE,
  RESOURCE_CHORUS,
  RESOURCE_HARMONICS,
  RESOURCE_STONE,
  RESOURCE_WATER,
  RESOURCE_VIBES,
] as const

interface AwaySummary {
  elapsedSeconds: number
  resourceLines: Array<{ key: string; label: string; value: string }>
  recruitDelta: number
  reachDelta: number
}

function triggerSaveDownload(payload: string) {
  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const timestamp = new Date().toISOString().replaceAll(':', '-')
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `add-run-${timestamp}.json`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function App() {
  const [snapshot, setSnapshot] = createSignal<SimulationSnapshot | null>(null)
  const [catalog, setCatalog] = createSignal<CatalogSnapshot | null>(null)
  const [runtimeStatus, setRuntimeStatus] = createSignal<'booting' | 'ready' | 'error'>('booting')
  const [runtimeError, setRuntimeError] = createSignal<string | null>(null)
  const [lastSave, setLastSave] = createSignal<string | null>(null)
  const [pendingSaveDownload, setPendingSaveDownload] = createSignal(false)
  const [restorePhase, setRestorePhase] = createSignal<'booting' | 'importing' | 'catching_up' | 'ready'>('booting')
  const [pendingOfflineSeconds, setPendingOfflineSeconds] = createSignal(0)
  const [offlineBaseline, setOfflineBaseline] = createSignal<SimulationSnapshot | null>(null)
  const [awaySummary, setAwaySummary] = createSignal<AwaySummary | null>(null)
  const [viewMode, setViewMode] = createSignal<'game' | 'admin' | 'data'>('game')

  const simulationClient = new SimulationClient({
    onReady(nextSnapshot, nextCatalog) {
      setSnapshot(nextSnapshot)
      setCatalog(nextCatalog)
      setRuntimeStatus('ready')
    },
    onSnapshot(nextSnapshot) {
      const phase = restorePhase()
      setSnapshot(nextSnapshot)
      if (phase === 'importing') {
        if (pendingOfflineSeconds() >= MIN_OFFLINE_SUMMARY_SECONDS) {
          setOfflineBaseline(nextSnapshot)
          setRestorePhase('catching_up')
          simulationClient.runOfflineCatchup(pendingOfflineSeconds())
          return
        }
        setRestorePhase('ready')
        return
      }
      if (phase === 'catching_up') {
        const baseline = offlineBaseline()
        if (baseline) {
          setAwaySummary(buildAwaySummary(baseline, nextSnapshot, pendingOfflineSeconds()))
        }
        setOfflineBaseline(null)
        setPendingOfflineSeconds(0)
        setRestorePhase('ready')
      }
    },
    onSave(payload) {
      setLastSave(payload)
      window.localStorage.setItem(SAVE_STORAGE_KEY, payload)
      window.localStorage.setItem(SAVE_TIMESTAMP_KEY, String(Date.now()))
      if (pendingSaveDownload()) {
        setPendingSaveDownload(false)
        triggerSaveDownload(payload)
      }
    },
    onError(message) {
      setRuntimeStatus('error')
      setRuntimeError(message)
    },
  })

  createEffect(() => {
    simulationClient.init()
    onCleanup(() => simulationClient.dispose())
  })

  createEffect(() => {
    if (runtimeStatus() !== 'ready' || restorePhase() !== 'booting') {
      return
    }

    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY)
    const savedAt = Number(window.localStorage.getItem(SAVE_TIMESTAMP_KEY) ?? '0')
    if (!raw) {
      setRestorePhase('ready')
      return
    }

    setLastSave(raw)
    const elapsedSeconds = savedAt > 0 ? Math.max(0, (Date.now() - savedAt) / 1000) : 0
    setPendingOfflineSeconds(elapsedSeconds)
    setRestorePhase('importing')
    simulationClient.importSave(raw)
  })

  createEffect(() => {
    if (runtimeStatus() !== 'ready' || restorePhase() !== 'ready') {
      return
    }

    let lastNow = performance.now()
    const advanceRuntime = () => {
      const now = performance.now()
      const elapsedSeconds = Math.min((now - lastNow) / 1000, MAX_LIVE_TICK_SECONDS)
      lastNow = now

      if (document.visibilityState !== 'visible' || elapsedSeconds <= 0) {
        return
      }

      simulationClient.tick(elapsedSeconds)
    }

    const onVisibilityChange = () => {
      lastNow = performance.now()
    }

    const intervalId = window.setInterval(advanceRuntime, LIVE_TICK_INTERVAL_MS)
    document.addEventListener('visibilitychange', onVisibilityChange)

    onCleanup(() => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    })
  })

  createEffect(() => {
    if (runtimeStatus() !== 'ready' || restorePhase() !== 'ready') {
      return
    }

    const flushSave = () => simulationClient.exportSave()
    const intervalId = window.setInterval(flushSave, AUTOSAVE_INTERVAL_MS)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushSave()
      }
    }
    const onBeforeUnload = () => {
      flushSave()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('beforeunload', onBeforeUnload)

    onCleanup(() => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('beforeunload', onBeforeUnload)
    })
  })

  const basslineWorkers = createMemo(() => {
    const current = snapshot()
    if (!current) return 0
    return workerCount(current, ROLE_CRYSTAL_BASSLINE)
  })

  const chorusWorkers = createMemo(() => {
    const current = snapshot()
    if (!current) return 0
    return workerCount(current, ROLE_CRYSTAL_CHORUS)
  })

  const harmonicsWorkers = createMemo(() => {
    const current = snapshot()
    if (!current) return 0
    return workerCount(current, ROLE_CRYSTAL_HARMONICS)
  })

  const constructionWorkers = createMemo(() => {
    const current = snapshot()
    if (!current) return 0
    return workerCount(current, ROLE_CONSTRUCTION)
  })

  const firePitWorkers = createMemo(() => {
    const current = snapshot()
    if (!current) return 0
    return workerCount(current, ROLE_FIRE_PIT)
  })

  const scavengeWorkers = createMemo(() => {
    const current = snapshot()
    if (!current) return 0
    return workerCount(current, ROLE_SCAVENGE)
  })

  const waterWorkers = createMemo(() => {
    const current = snapshot()
    if (!current) return 0
    return workerCount(current, ROLE_WATER)
  })

  const crystalAssignedCrew = createMemo(() => {
    const current = snapshot()
    if (!current) return 0
    return (
      crewCount(current, ROLE_CRYSTAL_BASSLINE) +
      crewCount(current, ROLE_CRYSTAL_CHORUS) +
      crewCount(current, ROLE_CRYSTAL_HARMONICS)
    )
  })

  const totalSlots = createMemo(() => {
    const current = snapshot()
    if (!current) return 0
    return current.crystalCircle.baseSlots + current.crystalCircle.slotCapacityLevel
  })

  const allocatedCrew = createMemo(() => {
    const current = snapshot()
    if (!current) return 0
    return Object.values(current.roster.crewByRole).reduce((sum, crew) => sum + crew, 0)
  })

  const maxFirePitCrew = createMemo(() => {
    const current = snapshot()
    if (!current || !current.base.firePitBuilt) return 0
    const firePitCapacity = Math.max(0, catalog()?.balance.crystal.firePitCrewSlots ?? 2)
    return Math.max(
      0,
      Math.min(
        firePitCapacity,
        current.roster.totalCrew -
          crewCount(current, ROLE_CRYSTAL_BASSLINE) -
          crewCount(current, ROLE_CRYSTAL_CHORUS) -
          crewCount(current, ROLE_CRYSTAL_HARMONICS) -
          crewCount(current, ROLE_CONSTRUCTION),
      ) -
        crewCount(current, ROLE_SCAVENGE) -
        crewCount(current, ROLE_WATER),
    )
  })

  const maxScavengeCrew = createMemo(() => {
    const current = snapshot()
    if (!current) return 0
    return Math.max(
      0,
      current.roster.totalCrew -
        crewCount(current, ROLE_CRYSTAL_BASSLINE) -
        crewCount(current, ROLE_CRYSTAL_CHORUS) -
        crewCount(current, ROLE_CRYSTAL_HARMONICS) -
        crewCount(current, ROLE_CONSTRUCTION) -
        crewCount(current, ROLE_FIRE_PIT) -
        crewCount(current, ROLE_WATER),
    )
  })

  const maxWaterCrew = createMemo(() => {
    const current = snapshot()
    if (!current) return 0
    return Math.max(
      0,
      current.roster.totalCrew -
        crewCount(current, ROLE_CRYSTAL_BASSLINE) -
        crewCount(current, ROLE_CRYSTAL_CHORUS) -
        crewCount(current, ROLE_CRYSTAL_HARMONICS) -
        crewCount(current, ROLE_CONSTRUCTION) -
        crewCount(current, ROLE_FIRE_PIT) -
        crewCount(current, ROLE_SCAVENGE),
    )
  })

  const activeConstruction = createMemo(() => snapshot()?.activeConstruction ?? null)
  const constructionOptions = createMemo(() =>
    (catalog()?.constructionOptions ?? []).slice().sort((a, b) => a.uiOrder - b.uiOrder),
  )
  const worldActions = createMemo(() =>
    (catalog()?.worldActions ?? []).slice().sort((a, b) => a.uiOrder - b.uiOrder),
  )
  const processingRecipes = createMemo(() =>
    (catalog()?.processingRecipes ?? []).slice().sort((a, b) => a.uiOrder - b.uiOrder),
  )
  const heroRoles = createMemo(() =>
    (catalog()?.roles ?? [])
      .filter((role) => role.heroAllowed)
      .slice()
      .sort((a, b) => a.uiOrder - b.uiOrder),
  )
  const topResources = createMemo(() => visibleTopResources(snapshot(), catalog()))

  return (
    <main class="shell" data-ui="app-shell">
      <section class="hero-strip" data-ui="app-hero-strip">
        <div class="eyebrow-row" data-ui="app-eyebrow-row">
          <p class="eyebrow" data-ui="app-eyebrow">{uiLabel(catalog(), 'ui.app.eyebrow', UI_COPY.app.eyebrow)}</p>
          <div class="eyebrow-actions" data-ui="app-eyebrow-actions">
            <div class="mode-switch mode-switch-inline" data-ui="app-mode-switch">
              <button
                data-ui="app-mode-game"
                class={`mode-button ${viewMode() === 'game' ? 'mode-button-active' : ''}`}
                onClick={() => setViewMode('game')}
              >
                {uiLabel(catalog(), 'ui.app.view.game', UI_COPY.app.gameView)}
              </button>
              <button
                data-ui="app-mode-admin"
                class={`mode-button ${viewMode() === 'admin' ? 'mode-button-active' : ''}`}
                onClick={() => setViewMode('admin')}
              >
                {uiLabel(catalog(), 'ui.app.view.admin', UI_COPY.app.adminView)}
              </button>
              <button
                data-ui="app-mode-data-tree"
                class={`mode-button ${viewMode() === 'data' ? 'mode-button-active' : ''}`}
                onClick={() => setViewMode('data')}
              >
                {uiLabel(catalog(), 'ui.app.view.data_tree', UI_COPY.app.dataTreeView)}
              </button>
            </div>
            <RunPanel
              catalog={catalog()}
              snapshot={snapshot()}
              lastSave={lastSave()}
              awaySummary={awaySummary()}
              onDownloadSave={() => {
                setPendingSaveDownload(true)
                simulationClient.exportSave()
              }}
              onImportSave={(payload) => {
                setAwaySummary(null)
                setRestorePhase('ready')
                simulationClient.importSave(payload)
              }}
              onLoadAutosave={() => {
                const raw = window.localStorage.getItem(SAVE_STORAGE_KEY)
                if (!raw) return
                setAwaySummary(null)
                setRestorePhase('ready')
                simulationClient.importSave(raw)
              }}
              onResetRun={() => {
                if (!window.confirm('Reset the current run?')) return
                window.localStorage.removeItem(SAVE_STORAGE_KEY)
                window.localStorage.removeItem(SAVE_TIMESTAMP_KEY)
                setLastSave(null)
                setPendingSaveDownload(false)
                setAwaySummary(null)
                setPendingOfflineSeconds(0)
                setOfflineBaseline(null)
                setRestorePhase('ready')
                simulationClient.reset()
              }}
              onDismissAwaySummary={() => setAwaySummary(null)}
              headerMenu
            />
          </div>
        </div>
        <div class="status-cluster" data-ui="app-status-cluster">
          <For each={topResources()}>
            {(resource) => (
              <StatusPill
                dataUi={`app-status-${uiId(resource.id)}`}
                label={resource.label}
                value={resource.value}
              />
            )}
          </For>
        </div>
      </section>

      {viewMode() === 'game' ? (
        <GameView
          catalog={catalog()}
          snapshot={snapshot()}
          simulationClient={simulationClient}
          activeConstruction={activeConstruction()}
          constructionOptions={constructionOptions()}
          processingRecipes={processingRecipes()}
          worldActions={worldActions()}
          heroRoles={heroRoles()}
          crystalAssignedWorkers={crystalAssignedCrew()}
          totalSlots={totalSlots()}
          basslineWorkers={basslineWorkers()}
          chorusWorkers={chorusWorkers()}
          harmonicsWorkers={harmonicsWorkers()}
          constructionWorkers={constructionWorkers()}
          firePitWorkers={firePitWorkers()}
          scavengeWorkers={scavengeWorkers()}
          waterWorkers={waterWorkers()}
          allocatedCrew={allocatedCrew()}
          maxFirePitCrew={maxFirePitCrew()}
          maxScavengeCrew={maxScavengeCrew()}
          maxWaterCrew={maxWaterCrew()}
        />
      ) : viewMode() === 'admin' ? (
        <AdminView
          catalog={catalog()}
          snapshot={snapshot()}
          simulationClient={simulationClient}
          activeConstruction={activeConstruction()}
          runtimeError={runtimeError()}
          lastSave={lastSave()}
          totalSlots={totalSlots()}
          basslineWorkers={basslineWorkers()}
          chorusWorkers={chorusWorkers()}
          harmonicsWorkers={harmonicsWorkers()}
          constructionWorkers={constructionWorkers()}
          firePitWorkers={firePitWorkers()}
          scavengeWorkers={scavengeWorkers()}
          waterWorkers={waterWorkers()}
          allocatedCrew={allocatedCrew()}
        />
      ) : (
        <DataTreeView catalog={catalog()} snapshot={snapshot()} />
      )}
    </main>
  )
}

interface SharedViewProps {
  catalog: CatalogSnapshot | null
  snapshot: SimulationSnapshot | null
  simulationClient: SimulationClient
  activeConstruction: SimulationSnapshot['activeConstruction']
}

interface DataTreeViewProps {
  catalog: CatalogSnapshot | null
  snapshot: SimulationSnapshot | null
}

interface GameViewProps extends SharedViewProps {
  constructionOptions: ConstructionOptionDef[]
  processingRecipes: ProcessingRecipeDef[]
  worldActions: WorldActionDef[]
  heroRoles: RoleDef[]
  crystalAssignedWorkers: number
  totalSlots: number
  basslineWorkers: number
  chorusWorkers: number
  harmonicsWorkers: number
  constructionWorkers: number
  firePitWorkers: number
  scavengeWorkers: number
  waterWorkers: number
  allocatedCrew: number
  maxFirePitCrew: number
  maxScavengeCrew: number
  maxWaterCrew: number
}

function GameView(props: GameViewProps) {
  return (
    <section class="game-stack" data-ui="game-view">
      <section class="game-main-grid" data-ui="game-main-grid">
        <div class="game-column game-column-left" data-ui="game-column-left">
          <section class="panel hero-overview-panel" data-ui="game-hero-panel">
            <header class="panel-head" data-ui="game-hero-header">
              <div data-ui="game-hero-header-copy">
                <p class="panel-kicker" data-ui="game-hero-kicker">{uiLabel(props.catalog, UI_PANEL_HERO, UI_COPY.hero.kicker)}</p>
              </div>
            </header>
            <div class="hero-overview-grid" data-ui="game-hero-overview-grid">
              <div class="hero-portrait-card" data-ui="game-hero-portrait-card">
                <div class="hero-portrait-frame" data-ui="game-hero-portrait-frame">
                  <div class="hero-portrait-head" data-ui="game-hero-portrait-head" />
                  <div class="hero-portrait-body" data-ui="game-hero-portrait-body" />
                </div>
              </div>
              <HeroOverviewControls
                catalog={props.catalog}
                snapshot={props.snapshot}
                simulationClient={props.simulationClient}
              />
            </div>
          </section>
        </div>

        <div class="game-column game-column-center" data-ui="game-column-center">
          {shouldShowCrystalPanel(props.snapshot, props.catalog) ? (
            <section class="panel crystal-overview-panel" data-ui="game-crystal-circle-panel">
              <header class="panel-head" data-ui="game-crystal-circle-header">
                <div data-ui="game-crystal-circle-header-copy">
                  <p class="panel-kicker" data-ui="game-crystal-circle-kicker">{stationLabel(props.catalog, STATION_CRYSTAL_CIRCLE, UI_COPY.crystal.kicker)}</p>
                </div>
                <div class="panel-head-meta" data-ui="game-crystal-circle-header-meta">
                  <span data-ui="game-crystal-circle-free-slots-label">{uiLabel(props.catalog, UI_METRIC_CRYSTAL_FREE_SLOTS, UI_COPY.crystal.freeSlots)}</span>
                  <strong data-ui="game-crystal-circle-free-slots-value">
                    {`${Math.max(0, props.totalSlots - props.crystalAssignedWorkers)} / ${props.totalSlots}`}
                  </strong>
                </div>
              </header>
              <dl class="stat-grid stat-grid-wide crystal-band-grid" data-ui="game-crystal-circle-stats">
                <CrystalBandCard
                  dataUi="game-bassline-card"
                  title={resourceLabel(props.catalog, RESOURCE_BASSLINE, UI_COPY.crystal.bands.bassline)}
                  available={roleAvailable(props.snapshot, ROLE_CRYSTAL_BASSLINE)}
                  heroAssigned={Boolean(props.snapshot && heroOnRole(props.snapshot, ROLE_CRYSTAL_BASSLINE))}
                  value={
                    props.snapshot
                      ? `${props.snapshot.resources.bassline.toFixed(1)} / ${props.snapshot.resources.basslineCap.toFixed(0)}`
                      : '--'
                  }
                  roleId={ROLE_CRYSTAL_BASSLINE}
                  crew={crewCount(props.snapshot, ROLE_CRYSTAL_BASSLINE)}
                  maxCrew={maxCrewForRole(props.snapshot, props.catalog, ROLE_CRYSTAL_BASSLINE)}
                  onSetCrew={(crew) => props.simulationClient.setRoleCrew(ROLE_CRYSTAL_BASSLINE, crew)}
                  detailRows={visibleBasslineDetailRows(props.snapshot, props.catalog)}
                />
                {shouldShowCrystalBand(props.snapshot, props.catalog, ROLE_CRYSTAL_CHORUS) ? (
                  <CrystalBandCard
                    dataUi="game-chorus-card"
                    title={resourceLabel(props.catalog, RESOURCE_CHORUS, UI_COPY.crystal.bands.chorus)}
                    available={roleAvailable(props.snapshot, ROLE_CRYSTAL_CHORUS)}
                    heroAssigned={Boolean(props.snapshot && heroOnRole(props.snapshot, ROLE_CRYSTAL_CHORUS))}
                    value={
                      props.snapshot
                        ? `${props.snapshot.resources.chorus.toFixed(1)} / ${props.snapshot.resources.chorusCap.toFixed(0)}`
                        : '--'
                    }
                    roleId={ROLE_CRYSTAL_CHORUS}
                    crew={crewCount(props.snapshot, ROLE_CRYSTAL_CHORUS)}
                    maxCrew={maxCrewForRole(props.snapshot, props.catalog, ROLE_CRYSTAL_CHORUS)}
                    onSetCrew={(crew) => props.simulationClient.setRoleCrew(ROLE_CRYSTAL_CHORUS, crew)}
                    detailRows={visibleChorusDetailRows(props.snapshot, props.catalog)}
                  />
                ) : null}
                {shouldShowCrystalBand(props.snapshot, props.catalog, ROLE_CRYSTAL_HARMONICS) ? (
                  <CrystalBandCard
                    dataUi="game-harmonics-card"
                    title={resourceLabel(props.catalog, RESOURCE_HARMONICS, UI_COPY.crystal.bands.harmonics)}
                    available={roleAvailable(props.snapshot, ROLE_CRYSTAL_HARMONICS)}
                    heroAssigned={Boolean(props.snapshot && heroOnRole(props.snapshot, ROLE_CRYSTAL_HARMONICS))}
                    value={
                      props.snapshot
                        ? `${props.snapshot.resources.harmonics.toFixed(1)} / ${props.snapshot.resources.harmonicsCap.toFixed(0)}`
                        : '--'
                    }
                    roleId={ROLE_CRYSTAL_HARMONICS}
                    crew={crewCount(props.snapshot, ROLE_CRYSTAL_HARMONICS)}
                    maxCrew={maxCrewForRole(props.snapshot, props.catalog, ROLE_CRYSTAL_HARMONICS)}
                    onSetCrew={(crew) => props.simulationClient.setRoleCrew(ROLE_CRYSTAL_HARMONICS, crew)}
                    detailRows={visibleHarmonicsDetailRows(props.snapshot, props.catalog)}
                  />
                ) : null}
              </dl>
            </section>
          ) : null}

          {activeNarrativeBeat(props.catalog, props.snapshot) ? (
            <NarrativePanel
              catalog={props.catalog}
              snapshot={props.snapshot}
              simulationClient={props.simulationClient}
              worldActions={props.worldActions}
            />
          ) : (
            <ObjectivePanel
              catalog={props.catalog}
              snapshot={props.snapshot}
              simulationClient={props.simulationClient}
              constructionOptions={props.constructionOptions}
              worldActions={props.worldActions}
            />
          )}
          <section class="game-layout" data-ui="game-layout">
          {shouldShowConstructionPanel(props.snapshot, props.catalog) ? (
            <section class="panel lower-panel-construction" data-ui="game-construction-panel">
              <header class="panel-head" data-ui="game-construction-header">
                <div data-ui="game-construction-header-copy">
                  <p class="panel-kicker" data-ui="game-construction-kicker">{uiLabel(props.catalog, 'ui.construction.kicker', UI_COPY.construction.kicker)}</p>
                  <h2 data-ui="game-construction-title">{uiLabel(props.catalog, UI_PANEL_CONSTRUCTION, UI_COPY.construction.title)}</h2>
                </div>
              </header>
              <ConstructionBanner
                catalog={props.catalog}
                dataUi="game-construction-banner"
                job={props.activeConstruction}
              />
              <div class="construction-crew-row" data-ui="game-construction-crew-row">
                <span class="control-label" data-ui="game-construction-crew-label">{uiLabel(props.catalog, UI_CONTROL_CONSTRUCTION_CREW, UI_COPY.construction.crew)}</span>
                <div class="construction-crew-controls" data-ui="game-construction-crew-controls">
                  <button
                    data-ui="game-construction-crew-decrement"
                    class="action action-secondary"
                    disabled={crewCount(props.snapshot, ROLE_CONSTRUCTION) <= 0}
                    onClick={() => props.simulationClient.setRoleCrew(ROLE_CONSTRUCTION, Math.max(0, crewCount(props.snapshot, ROLE_CONSTRUCTION) - 1))}
                  >
                    -1
                  </button>
                  <strong data-ui="game-construction-crew-value">
                    {`${crewCount(props.snapshot, ROLE_CONSTRUCTION)} / ${maxCrewForRole(props.snapshot, props.catalog, ROLE_CONSTRUCTION)}`}
                  </strong>
                  <button
                    data-ui="game-construction-crew-increment"
                    class="action action-secondary"
                    disabled={crewCount(props.snapshot, ROLE_CONSTRUCTION) >= maxCrewForRole(props.snapshot, props.catalog, ROLE_CONSTRUCTION)}
                    onClick={() =>
                      props.simulationClient.setRoleCrew(
                        ROLE_CONSTRUCTION,
                        Math.min(
                          maxCrewForRole(props.snapshot, props.catalog, ROLE_CONSTRUCTION),
                          crewCount(props.snapshot, ROLE_CONSTRUCTION) + 1,
                        ),
                      )}
                  >
                    +1
                  </button>
                </div>
              </div>
              <div class="upgrade-list" data-ui="game-construction-upgrade-list">
              <For each={props.constructionOptions.filter((option) =>
                option.group === 'crystal_upgrade' &&
                shouldShowConstructionOption(props.snapshot, props.catalog, option),
              )}>
                {(upgrade) => (
                  <button
                    data-ui={`game-construction-upgrade-${uiId(upgrade.id)}`}
                    class="upgrade-card"
                    disabled={!constructionActionState(props.snapshot, props.catalog, upgrade).enabled}
                    onClick={() => props.simulationClient.startConstruction(upgrade.id)}
                  >
                    <span data-ui={`game-construction-upgrade-${uiId(upgrade.id)}-label`}>{upgrade.label}</span>
                    <div class="upgrade-card-meta" data-ui={`game-construction-upgrade-${uiId(upgrade.id)}-meta`}>
                      <strong data-ui={`game-construction-upgrade-${uiId(upgrade.id)}-value`}>
                        {activeConstructionForOption(props.snapshot, upgrade.id)
                          ? progressCountdownLabel(
                              props.snapshot!.activeConstruction!.totalWorkSeconds,
                              props.snapshot!.activeConstruction!.remainingWorkSeconds,
                              'work',
                            )
                          : constructionActionState(props.snapshot, props.catalog, upgrade).value}
                      </strong>
                      {activeConstructionForOption(props.snapshot, upgrade.id) ? (
                        <ProgressBar
                          dataUi={`game-construction-upgrade-${uiId(upgrade.id)}-progress`}
                          progress={delayedActionProgress(
                            props.snapshot!.activeConstruction!.totalWorkSeconds,
                            props.snapshot!.activeConstruction!.remainingWorkSeconds,
                          )}
                        />
                      ) : null}
                    </div>
                  </button>
                )}
              </For>
              </div>
              <div class="upgrade-list" data-ui="game-construction-project-list">
              <For each={props.constructionOptions.filter((option) =>
                option.group === 'base_project' && shouldShowConstructionOption(props.snapshot, props.catalog, option),
              )}>
                {(project) => (
                  <button
                    data-ui={`game-construction-project-${uiId(project.id)}`}
                    class="upgrade-card"
                    disabled={!constructionActionState(props.snapshot, props.catalog, project).enabled}
                    onClick={() => props.simulationClient.startConstruction(project.id)}
                  >
                    <span data-ui={`game-construction-project-${uiId(project.id)}-label`}>
                      {project.label}
                    </span>
                    <div class="upgrade-card-meta" data-ui={`game-construction-project-${uiId(project.id)}-meta`}>
                      <strong data-ui={`game-construction-project-${uiId(project.id)}-value`}>
                        {activeConstructionForOption(props.snapshot, project.id)
                          ? progressCountdownLabel(
                              props.snapshot!.activeConstruction!.totalWorkSeconds,
                              props.snapshot!.activeConstruction!.remainingWorkSeconds,
                              'work',
                            )
                          : constructionActionState(props.snapshot, props.catalog, project).value}
                      </strong>
                      {activeConstructionForOption(props.snapshot, project.id) ? (
                        <ProgressBar
                          dataUi={`game-construction-project-${uiId(project.id)}-progress`}
                          progress={delayedActionProgress(
                            props.snapshot!.activeConstruction!.totalWorkSeconds,
                            props.snapshot!.activeConstruction!.remainingWorkSeconds,
                          )}
                        />
                      ) : null}
                    </div>
                  </button>
                )}
              </For>
              </div>
              <SystemSummaryRows
                dataUi="game-construction-summary"
                rows={[
                  {
                    key: 'source',
                    label: uiLabel(props.catalog, UI_SUMMARY_CONSTRUCTION_SOURCE, UI_COPY.common.source),
                    value: constructionSourceLabel(props.snapshot, props.catalog),
                  },
                  {
                    key: 'sink',
                    label: uiLabel(props.catalog, UI_SUMMARY_CONSTRUCTION_SINK, UI_COPY.common.sink),
                    value: constructionSinkLabel(props.snapshot, props.catalog),
                  },
                  {
                    key: 'blocker',
                    label: uiLabel(props.catalog, UI_SUMMARY_CONSTRUCTION_BLOCKER, UI_COPY.common.blocker),
                    value: constructionBlockerLabel(props.snapshot, props.catalog),
                  },
                ]}
              />
              <p class="runtime-note" data-ui="game-construction-note">
                {uiLabel(props.catalog, 'ui.construction.note', UI_COPY.construction.note)}
              </p>
            </section>
          ) : null}

          {shouldShowPowerPanel(props.snapshot, props.catalog) ? (
          <section class="panel lower-panel-production" data-ui="game-production-panel">
            <header class="panel-head" data-ui="game-production-header">
              <div data-ui="game-production-header-copy">
                <p class="panel-kicker" data-ui="game-production-kicker">{uiLabel(props.catalog, 'ui.power.kicker', UI_COPY.power.kicker)}</p>
                <h2 data-ui="game-production-title">{uiLabel(props.catalog, UI_PANEL_POWER, UI_COPY.power.title)}</h2>
              </div>
            </header>
            <dl class="stat-grid stat-grid-compact" data-ui="game-production-stats">
              <Metric
                dataUi="game-production-chorus"
                label={resourceLabel(props.catalog, RESOURCE_CHORUS, UI_COPY.crystal.bands.chorus)}
                value={
                  props.snapshot
                    ? `${props.snapshot.resources.chorus.toFixed(1)} / ${props.snapshot.resources.chorusCap.toFixed(0)}`
                    : '--'
                }
              />
              {shouldShowCrystalBand(props.snapshot, props.catalog, ROLE_CRYSTAL_HARMONICS) ? (
                <>
                  <Metric
                    dataUi="game-production-harmonics"
                    label={resourceLabel(props.catalog, RESOURCE_HARMONICS, UI_COPY.crystal.bands.harmonics)}
                    value={
                      props.snapshot
                        ? `${props.snapshot.resources.harmonics.toFixed(1)} / ${props.snapshot.resources.harmonicsCap.toFixed(0)}`
                        : '--'
                    }
                  />
                  <Metric
                    dataUi="game-production-harmonics-tier"
                    label={uiLabel(props.catalog, 'ui.power.metric.harmonics_tier', UI_COPY.power.harmonicsTier)}
                    value={harmonicsTierLabel(props.snapshot)}
                  />
                </>
              ) : null}
              <Metric
                dataUi="game-production-upkeep"
                label={uiLabel(props.catalog, UI_METRIC_POWER_ACTIVE_UPKEEP, UI_COPY.power.chorusUpkeep)}
                value={props.snapshot ? `${props.snapshot.power.activeUpkeepPerSecond.toFixed(2)}/s` : '--'}
              />
              {shouldShowLifeSupportMetric(props.snapshot, props.catalog) ? (
                <Metric
                  dataUi="game-production-life-support"
                    label={uiLabel(props.catalog, UI_METRIC_POWER_LIFE_SUPPORT, UI_COPY.power.lifeSupport)}
                  value={props.snapshot ? `${props.snapshot.power.lifeSupportUpkeepPerSecond.toFixed(2)}/s` : '--'}
                />
              ) : null}
              <Metric
                dataUi="game-production-active-staff"
                label={uiLabel(props.catalog, UI_METRIC_POWER_ACTIVE_STAFF, UI_COPY.power.activeStaff)}
                value={props.snapshot ? `${props.snapshot.power.activeStaffCount}` : '--'}
              />
              {shouldShowBrownoutMetric(props.snapshot, props.catalog) ? (
                <Metric
                  dataUi="game-production-brownout"
                  label={uiLabel(props.catalog, UI_METRIC_POWER_BROWNOUT, UI_COPY.power.brownout)}
                  value={
                    props.snapshot?.power.brownoutActive
                      ? `${Math.round(props.snapshot.power.brownoutSeverity * 100)}%`
                      : uiLabel(props.catalog, 'ui.common.stable', UI_COPY.common.stable)
                  }
                />
              ) : null}
            </dl>
            <div class="upgrade-list" data-ui="game-production-power-list">
              {shouldShowStationPowerCard(props.snapshot, props.catalog, STATION_RESONANCE_CHAMBER) ? (
                <StationPowerCard
                  catalog={props.catalog}
                  dataUi="game-production-resonance-station"
                  label={stationLabel(props.catalog, STATION_RESONANCE_CHAMBER, UI_COPY.power.resonanceChamber)}
                  built={Boolean(props.snapshot?.base.resonanceChamberBuilt)}
                  powered={stationPowered(props.snapshot, STATION_RESONANCE_CHAMBER)}
                  requested={stationRequested(props.snapshot, STATION_RESONANCE_CHAMBER)}
                  upkeepPerSecond={props.catalog?.stations.find((station) => station.id === STATION_RESONANCE_CHAMBER)?.chorusUpkeepPerSecond ?? 0}
                  onToggle={(enabled) => props.simulationClient.setStationEnabled(STATION_RESONANCE_CHAMBER, enabled)}
                />
              ) : null}
              {shouldShowStationPowerCard(props.snapshot, props.catalog, STATION_MIX_CONSOLE) ? (
                <StationPowerCard
                  catalog={props.catalog}
                  dataUi="game-production-mix-console-station"
                  label={stationLabel(props.catalog, STATION_MIX_CONSOLE, UI_COPY.power.mixConsole)}
                  built={Boolean(props.snapshot?.base.mixConsoleBuilt)}
                  powered={stationPowered(props.snapshot, STATION_MIX_CONSOLE)}
                  requested={stationRequested(props.snapshot, STATION_MIX_CONSOLE)}
                  upkeepPerSecond={props.catalog?.stations.find((station) => station.id === STATION_MIX_CONSOLE)?.chorusUpkeepPerSecond ?? 0}
                  onToggle={(enabled) => props.simulationClient.setStationEnabled(STATION_MIX_CONSOLE, enabled)}
                />
              ) : null}
            </div>
            <div class="upgrade-list" data-ui="game-production-processing-list">
              <For each={props.processingRecipes.filter((recipe) => shouldShowProcessingRecipe(props.snapshot, props.catalog, recipe))}>
                {(recipe) => (
                  <button
                    data-ui={`game-processing-${uiId(recipe.id)}`}
                    class="upgrade-card"
                    disabled={!processingActionState(props.snapshot, props.catalog, recipe).enabled}
                    onClick={() => props.simulationClient.startProcessing(recipe.id)}
                  >
                    <span data-ui={`game-processing-${uiId(recipe.id)}-label`}>{recipe.label}</span>
                    <div class="upgrade-card-meta" data-ui={`game-processing-${uiId(recipe.id)}-meta`}>
                      <strong data-ui={`game-processing-${uiId(recipe.id)}-value`}>
                        {processingActionState(props.snapshot, props.catalog, recipe).value}
                      </strong>
                      {props.snapshot?.processing.activeJobs[recipe.stationId] ? (
                        <ProgressBar
                          dataUi={`game-processing-${uiId(recipe.id)}-progress`}
                          progress={delayedActionProgress(
                            props.snapshot.processing.activeJobs[recipe.stationId].totalWorkSeconds,
                            props.snapshot.processing.activeJobs[recipe.stationId].remainingWorkSeconds,
                          )}
                        />
                      ) : null}
                    </div>
                  </button>
                )}
              </For>
            </div>
            <SystemSummaryRows
              dataUi="game-production-summary"
              rows={[
                {
                  key: 'source',
                  label: uiLabel(props.catalog, UI_SUMMARY_POWER_SOURCE, UI_COPY.common.source),
                  value: powerSourceLabel(props.snapshot, props.catalog),
                },
                {
                  key: 'sink',
                  label: uiLabel(props.catalog, UI_SUMMARY_POWER_SINK, UI_COPY.common.sink),
                  value: powerSinkLabel(props.snapshot, props.catalog),
                },
                {
                  key: 'blocker',
                  label: uiLabel(props.catalog, UI_SUMMARY_POWER_BLOCKER, UI_COPY.common.blocker),
                  value: powerBlockerLabel(props.snapshot, props.catalog),
                },
              ]}
            />
            <p class="runtime-note" data-ui="game-production-note">
              {uiLabel(props.catalog, 'ui.power.note', UI_COPY.power.note)}
            </p>
          </section>
          ) : null}

          {shouldShowBasePanel(props.snapshot, props.catalog) ? (
          <section class="panel lower-panel-base" data-ui="game-base-panel">
            <header class="panel-head" data-ui="game-base-header">
              <div data-ui="game-base-header-copy">
                <p class="panel-kicker" data-ui="game-base-kicker">{uiLabel(props.catalog, 'ui.base.kicker', UI_COPY.base.kicker)}</p>
                <h2 data-ui="game-base-title">{uiLabel(props.catalog, UI_PANEL_BASE, UI_COPY.base.title)}</h2>
              </div>
            </header>
            <WorldActionBanner
              catalog={props.catalog}
              dataUi="game-base-world-action"
              action={props.snapshot?.activeWorldAction ?? null}
            />
            <div class="controls-grid controls-grid-tight" data-ui="game-base-onboarding-actions">
              <For each={props.worldActions.filter((action) => shouldShowWorldAction(props.snapshot, props.catalog, action))}>
                {(action) => (
                  <button
                    data-ui={`game-base-world-action-${uiId(action.id)}`}
                    class="upgrade-card"
                    disabled={!worldActionState(props.snapshot, props.catalog, action).enabled}
                    onClick={() => props.simulationClient.startWorldAction(action.id)}
                  >
                    <span data-ui={`game-base-world-action-${uiId(action.id)}-label`}>{action.label}</span>
                    <div class="upgrade-card-meta" data-ui={`game-base-world-action-${uiId(action.id)}-meta`}>
                      <strong data-ui={`game-base-world-action-${uiId(action.id)}-value`}>
                        {activeWorldActionForId(props.snapshot, action.id)
                          ? progressCountdownLabel(
                              props.snapshot!.activeWorldAction!.totalSeconds,
                              props.snapshot!.activeWorldAction!.remainingSeconds,
                              's',
                            )
                          : worldActionState(props.snapshot, props.catalog, action).value}
                      </strong>
                      {activeWorldActionForId(props.snapshot, action.id) ? (
                        <ProgressBar
                          dataUi={`game-base-world-action-${uiId(action.id)}-progress`}
                          progress={delayedActionProgress(
                            props.snapshot!.activeWorldAction!.totalSeconds,
                            props.snapshot!.activeWorldAction!.remainingSeconds,
                          )}
                        />
                      ) : null}
                    </div>
                  </button>
                )}
              </For>
            </div>
            <dl class="stat-grid stat-grid-compact" data-ui="game-base-stats">
              <For each={visibleBaseMetrics(props.snapshot, props.catalog)}>
                {(metric) => (
                  <Metric dataUi={metric.dataUi} label={metric.label} value={metric.value} />
                )}
              </For>
            </dl>
            {shouldShowBaseRoleControl(props.snapshot, props.catalog, ROLE_SCAVENGE) ? (
            <div class="construction-crew-row" data-ui="game-base-scavenge-row">
              <span class="control-label" data-ui="game-base-scavenge-label">{uiLabel(props.catalog, UI_CONTROL_BASE_SCAVENGE, UI_COPY.base.scavengeCrew)}</span>
              <div class="construction-crew-controls" data-ui="game-base-scavenge-controls">
                <button
                  data-ui="game-base-scavenge-decrement"
                  class="action action-secondary"
                  disabled={crewCount(props.snapshot, ROLE_SCAVENGE) <= 0}
                  onClick={() => props.simulationClient.setRoleCrew(ROLE_SCAVENGE, Math.max(0, crewCount(props.snapshot, ROLE_SCAVENGE) - 1))}
                >
                  -1
                </button>
                <strong data-ui="game-base-scavenge-value">
                  {`${crewCount(props.snapshot, ROLE_SCAVENGE)} / ${props.maxScavengeCrew}`}
                </strong>
                <button
                  data-ui="game-base-scavenge-increment"
                  class="action action-secondary"
                  disabled={crewCount(props.snapshot, ROLE_SCAVENGE) >= props.maxScavengeCrew}
                  onClick={() => props.simulationClient.setRoleCrew(ROLE_SCAVENGE, Math.min(props.maxScavengeCrew, crewCount(props.snapshot, ROLE_SCAVENGE) + 1))}
                >
                  +1
                </button>
              </div>
            </div>
            ) : null}
            {shouldShowBaseRoleControl(props.snapshot, props.catalog, ROLE_FIRE_PIT) ? (
            <div class="construction-crew-row" data-ui="game-base-fire-pit-row">
              <span class="control-label" data-ui="game-base-fire-pit-label">{uiLabel(props.catalog, UI_CONTROL_BASE_FIRE_PIT, UI_COPY.base.firePitCrew)}</span>
              <div class="construction-crew-controls" data-ui="game-base-fire-pit-controls">
                <button
                  data-ui="game-base-fire-pit-decrement"
                  class="action action-secondary"
                  disabled={crewCount(props.snapshot, ROLE_FIRE_PIT) <= 0}
                  onClick={() => props.simulationClient.setRoleCrew(ROLE_FIRE_PIT, Math.max(0, crewCount(props.snapshot, ROLE_FIRE_PIT) - 1))}
                >
                  -1
                </button>
                <strong data-ui="game-base-fire-pit-value">
                  {`${crewCount(props.snapshot, ROLE_FIRE_PIT)} / ${props.maxFirePitCrew}`}
                </strong>
                <button
                  data-ui="game-base-fire-pit-increment"
                  class="action action-secondary"
                  disabled={crewCount(props.snapshot, ROLE_FIRE_PIT) >= props.maxFirePitCrew}
                  onClick={() => props.simulationClient.setRoleCrew(ROLE_FIRE_PIT, Math.min(props.maxFirePitCrew, crewCount(props.snapshot, ROLE_FIRE_PIT) + 1))}
                >
                  +1
                </button>
              </div>
            </div>
            ) : null}
            {shouldShowBaseRoleControl(props.snapshot, props.catalog, ROLE_WATER) ? (
            <div class="construction-crew-row" data-ui="game-base-water-row">
              <span class="control-label" data-ui="game-base-water-label">{uiLabel(props.catalog, UI_CONTROL_BASE_WATER, UI_COPY.base.waterCrew)}</span>
              <div class="construction-crew-controls" data-ui="game-base-water-controls">
                <button
                  data-ui="game-base-water-decrement"
                  class="action action-secondary"
                  disabled={crewCount(props.snapshot, ROLE_WATER) <= 0}
                  onClick={() => props.simulationClient.setRoleCrew(ROLE_WATER, Math.max(0, crewCount(props.snapshot, ROLE_WATER) - 1))}
                >
                  -1
                </button>
                <strong data-ui="game-base-water-value">
                  {`${crewCount(props.snapshot, ROLE_WATER)} / ${props.maxWaterCrew}`}
                </strong>
                <button
                  data-ui="game-base-water-increment"
                  class="action action-secondary"
                  disabled={crewCount(props.snapshot, ROLE_WATER) >= props.maxWaterCrew}
                  onClick={() => props.simulationClient.setRoleCrew(ROLE_WATER, Math.min(props.maxWaterCrew, crewCount(props.snapshot, ROLE_WATER) + 1))}
                >
                  +1
                </button>
              </div>
            </div>
            ) : null}
            {shouldShowRecruitAction(props.snapshot, props.catalog) ? (
            <div class="upgrade-list" data-ui="game-base-actions">
              <button
                data-ui="game-base-recruit-action"
                class="upgrade-card"
                disabled={!recruitActionState(props.snapshot).enabled}
                onClick={() => props.simulationClient.recruitFromSurvivorCave()}
              >
                <span data-ui="game-base-recruit-action-label">{uiLabel(props.catalog, UI_ACTION_RECRUIT, UI_COPY.base.recruitSurvivor)}</span>
                <div class="upgrade-card-meta" data-ui="game-base-recruit-action-meta">
                  <strong data-ui="game-base-recruit-action-value">
                    {props.snapshot?.recruitment.pendingRecruits.length
                      ? progressCountdownLabel(
                          props.snapshot.recruitment.pendingRecruits[0].totalSeconds,
                          props.snapshot.recruitment.pendingRecruits[0].remainingSeconds,
                          's',
                        )
                      : recruitActionState(props.snapshot).value}
                  </strong>
                  {props.snapshot?.recruitment.pendingRecruits.length ? (
                    <ProgressBar
                      dataUi="game-base-recruit-action-progress"
                      progress={delayedActionProgress(
                        props.snapshot.recruitment.pendingRecruits[0].totalSeconds,
                        props.snapshot.recruitment.pendingRecruits[0].remainingSeconds,
                      )}
                    />
                  ) : null}
                </div>
              </button>
            </div>
            ) : null}
            <div class="map-objective-row" data-ui="game-base-status-row">
              <For each={visibleBaseStatusItems(props.snapshot, props.catalog, props.firePitWorkers)}>
                {(item) => <span data-ui={item.dataUi}>{item.value}</span>}
              </For>
            </div>
            <SystemSummaryRows
              dataUi="game-base-summary"
              rows={[
                {
                  key: 'source',
                  label: uiLabel(props.catalog, UI_SUMMARY_BASE_SOURCE, UI_COPY.common.source),
                  value: baseSourceLabel(props.snapshot, props.catalog),
                },
                {
                  key: 'sink',
                  label: uiLabel(props.catalog, UI_SUMMARY_BASE_SINK, UI_COPY.common.sink),
                  value: baseSinkLabel(props.snapshot, props.catalog),
                },
                {
                  key: 'blocker',
                  label: uiLabel(props.catalog, UI_SUMMARY_BASE_BLOCKER, UI_COPY.common.blocker),
                  value: baseBlockerLabel(props.snapshot, props.catalog),
                },
              ]}
            />
            <p class="runtime-note" data-ui="game-base-note">
              {uiLabel(props.catalog, 'ui.base.note', UI_COPY.base.note)}
            </p>
          </section>
          ) : null}
          </section>
        </div>

        <div class="game-column game-column-right" data-ui="game-column-right">
          <section class="panel map-overview-panel" data-ui="game-map-panel">
            <header class="panel-head" data-ui="game-map-header">
              <div data-ui="game-map-header-copy">
                <p class="panel-kicker" data-ui="game-map-kicker">{uiLabel(props.catalog, UI_PANEL_MAP, UI_COPY.map.kicker)}</p>
              </div>
            </header>
            <div class="map-stage map-stage-compact" data-ui="game-map-stage">
              <div class="map-meta-grid map-meta-overlay" data-ui="game-map-overlay">
                <span data-ui="game-map-overlay-reach">
                  {uiLabel(props.catalog, 'ui.map.metric.reach', UI_COPY.map.reachLabel)} {props.snapshot?.bubble.reachFromBase ?? 0}
                </span>
                <span data-ui="game-map-overlay-frontier">
                  {uiLabel(props.catalog, 'ui.map.metric.frontier', UI_COPY.map.frontierLabel)} {((props.snapshot?.bubble.frontierProgress ?? 0) * 100).toFixed(0)}%
                </span>
                <span data-ui="game-map-overlay-target">
                  {`${uiLabel(props.catalog, 'ui.map.metric.target', UI_COPY.map.targetLabel)} R${props.snapshot?.bubble.targetRing ?? 0} ${((props.snapshot?.bubble.targetFrontierProgress ?? 0) * 100).toFixed(0)}%`}
                </span>
                {visibilityAllowed(props.snapshot, props.catalog, UI_MAP_CAVE_GATE) ? (
                  <span data-ui="game-map-overlay-cave-gate">
                    {uiLabel(props.catalog, 'ui.map.metric.cave_gate_in', UI_COPY.map.caveGateInLabel)} {Math.max(
                      0,
                      (props.snapshot?.objectives.reachObjectiveTarget ?? 0) -
                        (props.snapshot?.bubble.reachFromBase ?? 0),
                    )}
                  </span>
                ) : null}
                {props.snapshot &&
                (props.snapshot.bubble.stabilizedRing > props.snapshot.bubble.targetRing ||
                  (props.snapshot.bubble.stabilizedRing === props.snapshot.bubble.targetRing &&
                    props.snapshot.bubble.frontierProgress >
                      props.snapshot.bubble.targetFrontierProgress)) ? (
                  <span data-ui="game-map-overlay-shrink-warning">
                    {`${uiLabel(props.catalog, 'ui.map.metric.shrink_warning', UI_COPY.map.shrinkWarningLabel)} ${props.snapshot.bubble.holdSecondsRemaining.toFixed(1)}s`}
                  </span>
                ) : null}
              </div>
              <MapViewport catalog={props.catalog} snapshot={props.snapshot} />
            </div>
          </section>
        </div>
      </section>
    </section>
  )
}

interface ObjectivePanelProps {
  catalog: CatalogSnapshot | null
  snapshot: SimulationSnapshot | null
  simulationClient: SimulationClient
  constructionOptions: ConstructionOptionDef[]
  worldActions: WorldActionDef[]
}

interface NarrativePanelProps {
  catalog: CatalogSnapshot | null
  snapshot: SimulationSnapshot | null
  simulationClient: SimulationClient
  worldActions: WorldActionDef[]
}

interface ObjectiveView {
  currentTitle: string
  currentSummary: string
  currentStatus: string
  nextTitle: string
  blocker: string
  unlockReward: string
  ctaLabel: string | null
  ctaDisabled: boolean
  ctaKind: 'world_action' | 'construction' | 'recruit' | null
  ctaId: string | null
}

interface ObjectiveProgressView {
  title: string
  progress: number
  timeLabel: string
}

interface RunPanelProps {
  catalog: CatalogSnapshot | null
  snapshot: SimulationSnapshot | null
  lastSave: string | null
  awaySummary: AwaySummary | null
  onDownloadSave(): void
  onImportSave(payload: string): void
  onLoadAutosave(): void
  onResetRun(): void
  onDismissAwaySummary(): void
  headerMenu?: boolean
}

function NarrativePanel(props: NarrativePanelProps) {
  const [pendingChoiceId, setPendingChoiceId] = createSignal<string | null>(null)
  const beat = () => activeNarrativeBeat(props.catalog, props.snapshot)
  const selectedChoice = () => selectedNarrativeChoice(props.catalog, props.snapshot, beat(), pendingChoiceId())
  const action = () =>
    beat()?.worldActionId
      ? props.worldActions.find((candidate) => candidate.id === beat()!.worldActionId) ?? null
      : null
  const actionState = () =>
    action()
      ? worldActionState(props.snapshot, props.catalog, action()!, {
          beatId: beat()?.id ?? null,
          choiceId: pendingChoiceId(),
        })
      : null

  createEffect(() => {
    const currentBeat = beat()
    if (!currentBeat) {
      setPendingChoiceId(null)
      return
    }
    const storedChoiceId = props.snapshot?.narrative.choiceByBeat[currentBeat.id] ?? null
    if (storedChoiceId) {
      setPendingChoiceId(null)
    }
  })

  return (
    <section class="panel narrative-panel" data-ui="game-narrative-panel">
      <header class="panel-head" data-ui="game-narrative-header">
        <div data-ui="game-narrative-header-copy">
          <p class="panel-kicker" data-ui="game-narrative-kicker">
            {uiLabel(props.catalog, 'ui.narrative.kicker', UI_COPY.narrative.kicker)}
          </p>
          <h2 data-ui="game-narrative-title">
            {uiLabel(props.catalog, UI_PANEL_NARRATIVE, UI_COPY.narrative.title)}
          </h2>
        </div>
      </header>
      <Show
        when={beat()}
        fallback={
          <div class="objective-placeholder" data-ui="game-narrative-empty">
            {uiLabel(props.catalog, 'ui.objectives.no_direct_action', UI_COPY.objectives.noDirectAction)}
          </div>
        }
      >
        {(currentBeat) => (
          <div class="narrative-grid" data-ui="game-narrative-grid">
            <div class="narrative-story-card" data-ui="game-narrative-story-card">
              <strong class="objective-current-title" data-ui="game-narrative-beat-title">
                {currentBeat().label}
              </strong>
              <p class="objective-copy narrative-copy" data-ui="game-narrative-beat-body">
                {currentBeat().body}
              </p>
            </div>
            <div class="narrative-choice-card" data-ui="game-narrative-choice-card">
              <Show
                when={selectedChoice()}
                fallback={
                  <>
                    <span class="control-label" data-ui="game-narrative-choice-label">
                      {uiLabel(props.catalog, 'ui.narrative.choice_label', UI_COPY.narrative.choiceLabel)}
                    </span>
                    <div class="narrative-choice-list" data-ui="game-narrative-choice-list">
                      <For each={currentBeat().choices}>
                        {(choice) => (
                          <button
                            data-ui={`game-narrative-choice-${uiId(choice.id)}`}
                            class="upgrade-card narrative-choice-button"
                            type="button"
                            onClick={() => {
                              setPendingChoiceId(choice.id)
                              props.simulationClient.chooseStoryOption(currentBeat().id, choice.id)
                            }}
                          >
                            <span data-ui={`game-narrative-choice-${uiId(choice.id)}-label`}>{choice.label}</span>
                            <strong data-ui={`game-narrative-choice-${uiId(choice.id)}-response`}>
                              {choice.response}
                            </strong>
                          </button>
                        )}
                      </For>
                    </div>
                  </>
                }
              >
                {(choice) => (
                  <>
                    <span class="control-label" data-ui="game-narrative-selected-label">
                      {uiLabel(props.catalog, 'ui.narrative.selected_label', UI_COPY.narrative.selectedLabel)}
                    </span>
                    <strong data-ui="game-narrative-selected-choice">{choice().label}</strong>
                    <p class="objective-copy narrative-copy" data-ui="game-narrative-selected-response">
                      {choice().response}
                    </p>
                  </>
                )}
              </Show>

              <Show when={action()}>
                {(currentAction) => (
                  <div class="narrative-action-block" data-ui="game-narrative-action-block">
                    <span class="control-label" data-ui="game-narrative-action-label">
                      {uiLabel(props.catalog, 'ui.narrative.unlock_label', UI_COPY.narrative.unlockLabel)}
                    </span>
                    <strong data-ui="game-narrative-action-title">{currentAction().label}</strong>
                    <Show
                      when={activeWorldActionForId(props.snapshot, currentAction().id)}
                      fallback={
                        <button
                          data-ui="game-narrative-action-button"
                          class="action"
                          disabled={!selectedChoice() || !actionState()?.enabled}
                          onClick={() => props.simulationClient.startWorldAction(currentAction().id)}
                        >
                          {presentationCta(props.catalog, [currentBeat().id, currentAction().id], currentAction().label)}
                        </button>
                      }
                    >
                      <div class="objective-progress-block" data-ui="game-narrative-action-progress">
                        <div class="objective-progress-head" data-ui="game-narrative-action-progress-head">
                          <strong data-ui="game-narrative-action-progress-title">{currentAction().label}</strong>
                          <span data-ui="game-narrative-action-progress-time">
                            {progressCountdownLabel(
                              props.snapshot!.activeWorldAction!.totalSeconds,
                              props.snapshot!.activeWorldAction!.remainingSeconds,
                              's',
                            )}
                          </span>
                        </div>
                        <ProgressBar
                          dataUi="game-narrative-action-progress-bar"
                          progress={delayedActionProgress(
                            props.snapshot!.activeWorldAction!.totalSeconds,
                            props.snapshot!.activeWorldAction!.remainingSeconds,
                          )}
                        />
                      </div>
                    </Show>
                    <Show when={actionState() && !actionState()!.enabled && !activeWorldActionForId(props.snapshot, currentAction().id)}>
                      <div class="objective-placeholder" data-ui="game-narrative-action-state">
                        {actionState()!.value}
                      </div>
                    </Show>
                  </div>
                )}
              </Show>
            </div>
          </div>
        )}
      </Show>
    </section>
  )
}

function RunPanel(props: RunPanelProps) {
  let importInputRef: HTMLInputElement | undefined

  const savedAt = () => {
    const raw = window.localStorage.getItem(SAVE_TIMESTAMP_KEY)
    const timestamp = raw ? Number(raw) : 0
    return timestamp > 0
      ? new Date(timestamp).toLocaleTimeString()
      : uiLabel(props.catalog, 'ui.run.no_autosave', UI_COPY.run.noAutosave)
  }

  const openImportPicker = () => {
    importInputRef?.click()
  }

  const onImportFileChange = async (event: Event) => {
    const currentTarget = event.currentTarget as HTMLInputElement
    const file = currentTarget.files?.[0]
    if (!file) return
    const payload = await file.text()
    props.onImportSave(payload)
    currentTarget.value = ''
  }

  return (
    <details
      class={`panel run-panel run-menu ${props.headerMenu ? 'run-menu-header' : ''}`}
      data-ui="game-run-panel"
    >
      <summary class="run-menu-summary" data-ui="game-run-summary">
        <div class="run-menu-summary-copy" data-ui="game-run-summary-copy">
          <span class="panel-kicker" data-ui="game-run-kicker">{uiLabel(props.catalog, 'ui.run.kicker', UI_COPY.run.kicker)}</span>
          <strong data-ui="game-run-title">{uiLabel(props.catalog, UI_PANEL_RUN, UI_COPY.run.title)}</strong>
        </div>
        <div class="run-menu-summary-meta" data-ui="game-run-summary-meta">
          <span data-ui="game-run-clock">{uiLabel(props.catalog, 'ui.run.metric.clock', UI_COPY.run.clock)} {props.snapshot ? `${Math.floor(props.snapshot.clockSeconds)}s` : '--'}</span>
          <span data-ui="game-run-autosave">{uiLabel(props.catalog, 'ui.run.metric.autosave', UI_COPY.run.autosave)} {savedAt()}</span>
        </div>
      </summary>

      <div class="run-menu-body" data-ui="game-run-menu-body">
        {props.awaySummary ? (
          <div class="away-summary" data-ui="game-away-summary">
            <div class="away-summary-head" data-ui="game-away-summary-head">
              <strong data-ui="game-away-summary-title">
                {uiLabel(props.catalog, 'ui.run.away_summary', 'While you were away')} · {formatDuration(props.awaySummary.elapsedSeconds)}
              </strong>
              <button
                class="action action-secondary"
                data-ui="game-away-summary-dismiss"
                onClick={props.onDismissAwaySummary}
              >
                {uiLabel(props.catalog, 'ui.run.dismiss', UI_COPY.common.dismiss)}
              </button>
            </div>
            <div class="away-summary-grid" data-ui="game-away-summary-grid">
              <For each={props.awaySummary.resourceLines}>
                {(line) => (
                  <div class="away-summary-row" data-ui={`game-away-summary-${line.key}`}>
                    <span data-ui={`game-away-summary-${line.key}-label`}>{line.label}</span>
                    <strong data-ui={`game-away-summary-${line.key}-value`}>{line.value}</strong>
                  </div>
                )}
              </For>
              <div class="away-summary-row" data-ui="game-away-summary-reach">
                <span data-ui="game-away-summary-reach-label">{uiLabel(props.catalog, 'ui.run.metric.reach', UI_COPY.run.reach)}</span>
                <strong data-ui="game-away-summary-reach-value">
                  {signedWhole(props.awaySummary.reachDelta)}
                </strong>
              </div>
              <div class="away-summary-row" data-ui="game-away-summary-recruits">
                <span data-ui="game-away-summary-recruits-label">{uiLabel(props.catalog, 'ui.run.metric.recruits', UI_COPY.run.recruits)}</span>
                <strong data-ui="game-away-summary-recruits-value">
                  {signedWhole(props.awaySummary.recruitDelta)}
                </strong>
              </div>
            </div>
          </div>
        ) : null}

        <div class="run-actions" data-ui="game-run-actions">
          <button class="action" data-ui="game-run-download-save" onClick={props.onDownloadSave}>
            {uiLabel(props.catalog, 'ui.run.action.download_save', 'Download Save')}
          </button>
          <button
            class="action action-secondary"
            data-ui="game-run-load-autosave"
            disabled={!props.lastSave}
            onClick={props.onLoadAutosave}
          >
            {uiLabel(props.catalog, 'ui.run.action.load_autosave', UI_COPY.run.loadAutosave)}
          </button>
          <button
            class="action action-secondary"
            data-ui="game-run-import-file"
            onClick={openImportPicker}
          >
            {uiLabel(props.catalog, 'ui.run.action.import_file', 'Import Save')}
          </button>
          <button class="action action-secondary" data-ui="game-run-reset" onClick={props.onResetRun}>
            {uiLabel(props.catalog, 'ui.run.action.reset', UI_COPY.run.resetRun)}
          </button>
        </div>

        <input
          ref={importInputRef}
          class="run-import-input"
          data-ui="game-run-import-input"
          type="file"
          accept="application/json,.json"
          onChange={onImportFileChange}
        />
      </div>
    </details>
  )
}

function ObjectivePanel(props: ObjectivePanelProps) {
  const objective = () =>
    deriveObjectiveView(props.snapshot, props.catalog, props.worldActions, props.constructionOptions)
  const progress = () => objectiveProgressState(props.snapshot, props.catalog)

  const runObjectiveAction = () => {
    const current = objective()
    if (!current || !current.ctaKind || !current.ctaId || current.ctaDisabled) {
      return
    }

    if (current.ctaKind === 'world_action') {
      props.simulationClient.startWorldAction(current.ctaId)
      return
    }

    if (current.ctaKind === 'construction') {
      props.simulationClient.startConstruction(current.ctaId)
      return
    }

    props.simulationClient.recruitFromSurvivorCave()
  }

  return (
    <section class="panel objective-panel" data-ui="game-objectives-panel">
      <header class="panel-head objective-header" data-ui="game-objectives-header">
        <div data-ui="game-objectives-header-copy">
          <p class="panel-kicker" data-ui="game-objectives-kicker">{uiLabel(props.catalog, 'ui.objectives.kicker', UI_COPY.objectives.kicker)}</p>
          <h2 data-ui="game-objectives-title">{uiLabel(props.catalog, UI_PANEL_OBJECTIVES, UI_COPY.objectives.title)}</h2>
        </div>
        <div class="objective-status-chip" data-ui="game-objectives-status-chip">
          <span data-ui="game-objectives-status-chip-label">{uiLabel(props.catalog, UI_OBJECTIVE_STATUS, UI_COPY.objectives.current)}</span>
          <strong data-ui="game-objectives-status-chip-value">{objective()?.currentStatus ?? '--'}</strong>
        </div>
      </header>
      <div class="objective-grid" data-ui="game-objectives-grid">
        <div class="objective-current-card" data-ui="game-objectives-current-card">
          <span class="control-label" data-ui="game-objectives-current-label">{uiLabel(props.catalog, UI_OBJECTIVE_ACTIVE_GOAL, UI_COPY.objectives.activeGoal)}</span>
          <strong class="objective-current-title" data-ui="game-objectives-current-title">
            {objective()?.currentTitle ?? '--'}
          </strong>
          <p class="objective-copy" data-ui="game-objectives-current-summary">
            {objective()?.currentSummary ?? '--'}
          </p>
          {progress() ? (
            <div class="objective-progress-block" data-ui="game-objectives-current-progress">
              <div class="objective-progress-head" data-ui="game-objectives-current-progress-head">
                <strong data-ui="game-objectives-current-progress-title">{progress()!.title}</strong>
                <span data-ui="game-objectives-current-progress-time">{progress()!.timeLabel}</span>
              </div>
              <ProgressBar
                dataUi="game-objectives-current-progress-bar"
                progress={progress()!.progress}
              />
            </div>
          ) : null}
          {objective()?.ctaLabel ? (
            <button
              data-ui="game-objectives-current-action"
              class="action"
              disabled={objective()!.ctaDisabled}
              onClick={runObjectiveAction}
            >
              {objective()!.ctaLabel}
            </button>
          ) : (
            <div class="objective-placeholder" data-ui="game-objectives-current-placeholder">
              {uiLabel(props.catalog, 'ui.objectives.no_direct_action', UI_COPY.objectives.noDirectAction)}
            </div>
          )}
        </div>
        <div class="objective-meta-grid" data-ui="game-objectives-meta-grid">
          <div class="objective-meta-card" data-ui="game-objectives-next-card">
            <span class="control-label" data-ui="game-objectives-next-label">{uiLabel(props.catalog, UI_OBJECTIVE_NEXT, UI_COPY.objectives.afterThat)}</span>
            <strong data-ui="game-objectives-next-value">{objective()?.nextTitle ?? '--'}</strong>
          </div>
          <div class="objective-meta-card" data-ui="game-objectives-blocker-card">
            <span class="control-label" data-ui="game-objectives-blocker-label">{uiLabel(props.catalog, UI_OBJECTIVE_BLOCKER, UI_COPY.objectives.blockingThis)}</span>
            <strong data-ui="game-objectives-blocker-value">{objective()?.blocker ?? '--'}</strong>
          </div>
          <div class="objective-meta-card" data-ui="game-objectives-reward-card">
            <span class="control-label" data-ui="game-objectives-reward-label">{uiLabel(props.catalog, UI_OBJECTIVE_UNLOCK, UI_COPY.objectives.thisUnlocks)}</span>
            <strong data-ui="game-objectives-reward-value">{objective()?.unlockReward ?? '--'}</strong>
          </div>
        </div>
        <div class="objective-guidance-grid" data-ui="game-objectives-guidance-grid">
          <div class="objective-meta-card" data-ui="game-objectives-next-move-card">
            <span class="control-label" data-ui="game-objectives-next-move-label">{uiLabel(props.catalog, UI_OBJECTIVE_NEXT_MOVE, UI_COPY.objectives.doThisNext)}</span>
            <strong data-ui="game-objectives-next-move-value">
              {objectiveNextMove(props.snapshot, props.catalog, objective())}
            </strong>
          </div>
          <div class="objective-meta-card" data-ui="game-objectives-watch-card">
            <span class="control-label" data-ui="game-objectives-watch-label">{uiLabel(props.catalog, UI_OBJECTIVE_WATCH_OUT, UI_COPY.objectives.watchOut)}</span>
            <strong data-ui="game-objectives-watch-value">
              {objectiveWatchOut(props.snapshot, props.catalog)}
            </strong>
          </div>
        </div>
      </div>
    </section>
  )
}

interface AdminViewProps extends SharedViewProps {
  runtimeError: string | null
  lastSave: string | null
  totalSlots: number
  basslineWorkers: number
  chorusWorkers: number
  harmonicsWorkers: number
  constructionWorkers: number
  firePitWorkers: number
  scavengeWorkers: number
  waterWorkers: number
  allocatedCrew: number
}

function AdminView(props: AdminViewProps) {
  return (
    <section class="layout-grid" data-ui="admin-view">
      <section class="panel panel-strong" data-ui="admin-simulation-panel">
        <header class="panel-head" data-ui="admin-simulation-header">
          <div data-ui="admin-simulation-header-copy">
            <p class="panel-kicker" data-ui="admin-simulation-kicker">{uiLabel(props.catalog, 'ui.admin.simulation.kicker', UI_COPY.admin.simulation.kicker)}</p>
            <h2 data-ui="admin-simulation-title">{uiLabel(props.catalog, 'ui.admin.simulation.title', UI_COPY.admin.simulation.title)}</h2>
          </div>
          <button
            data-ui="admin-export-save"
            class="action action-secondary"
            onClick={() => props.simulationClient.exportSave()}
          >
            {uiLabel(props.catalog, 'ui.admin.simulation.action.export_save', UI_COPY.admin.simulation.exportSave)}
          </button>
        </header>

        <div class="controls-grid" data-ui="admin-time-controls">
          <button data-ui="admin-tick-10" class="action" onClick={() => props.simulationClient.tick(10)}>
            {uiLabel(props.catalog, 'ui.admin.simulation.action.tick10', UI_COPY.admin.simulation.tick10)}
          </button>
          <button data-ui="admin-tick-60" class="action" onClick={() => props.simulationClient.tick(60)}>
            {uiLabel(props.catalog, 'ui.admin.simulation.action.tick60', UI_COPY.admin.simulation.tick60)}
          </button>
          <button
            data-ui="admin-offline-1h"
            class="action action-secondary"
            onClick={() => props.simulationClient.runOfflineCatchup(3600)}
          >
            {uiLabel(props.catalog, 'ui.admin.simulation.action.offline1h', UI_COPY.admin.simulation.offline1h)}
          </button>
          <button
            data-ui="admin-offline-4h"
            class="action action-secondary"
            onClick={() => props.simulationClient.runOfflineCatchup(14400)}
          >
            {uiLabel(props.catalog, 'ui.admin.simulation.action.offline4h', UI_COPY.admin.simulation.offline4h)}
          </button>
        </div>

        <dl class="stat-grid" data-ui="admin-simulation-metrics">
          <Metric dataUi="admin-metric-clock" label={uiLabel(props.catalog, 'ui.admin.metric.clock', UI_COPY.admin.simulation.clock)} value={`${Math.round(props.snapshot?.clockSeconds ?? 0)}s`} />
          <Metric dataUi="admin-metric-lifetime-generated" label={uiLabel(props.catalog, 'ui.admin.metric.lifetime_generated', UI_COPY.admin.simulation.lifetimeGenerated)} value={(props.snapshot?.resources.lifetimeGenerated ?? 0).toFixed(1)} />
          <Metric dataUi="admin-metric-lifetime-spent" label={uiLabel(props.catalog, 'ui.admin.metric.lifetime_spent', UI_COPY.admin.simulation.lifetimeSpent)} value={(props.snapshot?.resources.lifetimeSpent ?? 0).toFixed(1)} />
          <Metric dataUi="admin-metric-crew" label={uiLabel(props.catalog, 'ui.admin.metric.crew', UI_COPY.admin.simulation.crew)} value={props.snapshot ? `${props.allocatedCrew} / ${props.snapshot.roster.totalCrew}` : '--'} />
          <Metric dataUi="admin-metric-slots" label={uiLabel(props.catalog, 'ui.admin.metric.slots', UI_COPY.admin.simulation.slots)} value={`${props.totalSlots}`} />
          <Metric dataUi="admin-metric-bassline-workers" label={resourceLabel(props.catalog, RESOURCE_BASSLINE, UI_COPY.crystal.bands.bassline)} value={`${props.basslineWorkers}`} />
          <Metric dataUi="admin-metric-chorus-workers" label={resourceLabel(props.catalog, RESOURCE_CHORUS, UI_COPY.crystal.bands.chorus)} value={`${props.chorusWorkers}`} />
          <Metric dataUi="admin-metric-harmonics-workers" label={resourceLabel(props.catalog, RESOURCE_HARMONICS, UI_COPY.crystal.bands.harmonics)} value={`${props.harmonicsWorkers}`} />
          <Metric dataUi="admin-metric-builders" label={uiLabel(props.catalog, 'ui.admin.metric.builders', UI_COPY.admin.simulation.builders)} value={`${props.constructionWorkers}`} />
          <Metric dataUi="admin-metric-fire-pit" label={uiLabel(props.catalog, 'ui.admin.metric.fire_pit', UI_COPY.power.firePit)} value={`${props.firePitWorkers}`} />
          <Metric dataUi="admin-metric-scavenge" label={uiLabel(props.catalog, UI_CONTROL_BASE_SCAVENGE, UI_COPY.base.scavengeCrew)} value={`${props.scavengeWorkers}`} />
          <Metric dataUi="admin-metric-water-crew" label={uiLabel(props.catalog, UI_CONTROL_BASE_WATER, UI_COPY.base.waterCrew)} value={`${props.waterWorkers}`} />
          <Metric
            dataUi="admin-metric-stone"
            label={resourceLabel(props.catalog, RESOURCE_STONE, UI_COPY.base.stone)}
            value={`${(props.snapshot?.resources.stone ?? 0).toFixed(0)} / ${(props.snapshot?.resources.stoneCap ?? 0).toFixed(0)}`}
          />
          <Metric
            dataUi="admin-metric-water"
            label={resourceLabel(props.catalog, RESOURCE_WATER, UI_COPY.base.water)}
            value={`${(props.snapshot?.resources.water ?? 0).toFixed(1)} / ${(props.snapshot?.resources.waterCap ?? 0).toFixed(0)}L`}
          />
          <Metric
            dataUi="admin-metric-water-stock"
            label={uiLabel(props.catalog, 'ui.admin.metric.base_water', UI_COPY.admin.simulation.baseWater)}
            value={`${(props.snapshot?.resources.baseWaterStock ?? 0).toFixed(1)} / ${(props.catalog?.balance.water.baseStockMax ?? 30).toFixed(0)}L`}
          />
          <Metric
            dataUi="admin-metric-vibes"
            label={resourceLabel(props.catalog, RESOURCE_VIBES, UI_COPY.base.vibes)}
            value={`${(props.snapshot?.resources.vibes ?? 0).toFixed(1)} / ${(props.snapshot?.resources.vibesCap ?? 0).toFixed(0)}`}
          />
          <Metric
            dataUi="admin-metric-chorus"
            label={uiLabel(props.catalog, 'ui.admin.metric.chorus_pool', UI_COPY.admin.simulation.chorusPool)}
            value={`${(props.snapshot?.resources.chorus ?? 0).toFixed(1)} / ${(props.snapshot?.resources.chorusCap ?? 0).toFixed(0)}`}
          />
          <Metric
            dataUi="admin-metric-harmonics"
            label={uiLabel(props.catalog, 'ui.admin.metric.harmonics_pool', UI_COPY.admin.simulation.harmonicsPool)}
            value={`${(props.snapshot?.resources.harmonics ?? 0).toFixed(1)} / ${(props.snapshot?.resources.harmonicsCap ?? 0).toFixed(0)}`}
          />
          <Metric
            dataUi="admin-metric-bad-vibes"
            label={uiLabel(props.catalog, 'ui.admin.metric.bad_vibes', UI_COPY.admin.simulation.badVibes)}
            value={`${(props.snapshot?.base.effectiveBadVibesRate ?? 0).toFixed(1)}/s`}
          />
          <Metric
            dataUi="admin-metric-bad-vibes-mult"
            label={uiLabel(props.catalog, 'ui.admin.metric.bad_vibes_mult', UI_COPY.admin.simulation.badVibesMult)}
            value={`x${(props.snapshot?.base.badVibesMultiplier ?? 1).toFixed(2)}`}
          />
          <Metric
            dataUi="admin-metric-pending-recruits"
            label={uiLabel(props.catalog, 'ui.admin.metric.pending_recruits', UI_COPY.admin.simulation.pendingRecruits)}
            value={`${props.snapshot?.recruitment.pendingRecruits.length ?? 0}`}
          />
          <Metric
            dataUi="admin-metric-next-recruit"
            label={uiLabel(props.catalog, 'ui.admin.metric.next_recruit', UI_COPY.admin.simulation.nextRecruit)}
            value={`${(props.snapshot?.recruitment.nextRecruitCost ?? 0).toFixed(0)} V`}
          />
          <Metric dataUi="admin-metric-reach" label={uiLabel(props.catalog, 'ui.admin.metric.reach', UI_COPY.admin.simulation.reach)} value={`Ring ${props.snapshot?.bubble.stabilizedRing ?? 0}`} />
          <Metric
            dataUi="admin-metric-frontier"
            label={uiLabel(props.catalog, 'ui.admin.metric.frontier', UI_COPY.admin.simulation.frontier)}
            value={`${((props.snapshot?.bubble.frontierProgress ?? 0) * 100).toFixed(0)}%`}
          />
          <Metric
            dataUi="admin-metric-target"
            label={uiLabel(props.catalog, 'ui.admin.metric.target', UI_COPY.admin.simulation.target)}
            value={`R${props.snapshot?.bubble.targetRing ?? 0} ${((props.snapshot?.bubble.targetFrontierProgress ?? 0) * 100).toFixed(0)}%`}
          />
          <Metric
            dataUi="admin-metric-budget"
            label={uiLabel(props.catalog, 'ui.admin.metric.budget', UI_COPY.admin.simulation.budget)}
            value={`${(props.snapshot?.bubble.fieldBudget ?? 0).toFixed(1)}`}
          />
          <Metric
            dataUi="admin-metric-power-upkeep"
            label={uiLabel(props.catalog, 'ui.admin.metric.power_upkeep', UI_COPY.admin.simulation.powerUpkeep)}
            value={`${(props.snapshot?.power.activeUpkeepPerSecond ?? 0).toFixed(2)}/s`}
          />
          <Metric
            dataUi="admin-metric-brownout"
            label={uiLabel(props.catalog, UI_METRIC_POWER_BROWNOUT, UI_COPY.power.brownout)}
            value={props.snapshot?.power.brownoutActive ? uiLabel(props.catalog, 'ui.common.brownout', UI_COPY.common.brownout) : uiLabel(props.catalog, 'ui.common.stable', UI_COPY.common.stable)}
          />
          <Metric
            dataUi="admin-metric-harmonics-tier"
            label={uiLabel(props.catalog, 'ui.admin.metric.harmonics_tier', UI_COPY.admin.simulation.harmonicsTier)}
            value={`${props.snapshot?.power.harmonicsTier ?? 0}`}
          />
          <Metric
            dataUi="admin-metric-inertia"
            label={uiLabel(props.catalog, 'ui.admin.metric.inertia', UI_COPY.admin.simulation.inertia)}
            value={`${(props.snapshot?.bubble.holdSecondsRemaining ?? 0).toFixed(1)}s`}
          />
          <Metric
            dataUi="admin-metric-degrade"
            label={uiLabel(props.catalog, 'ui.admin.metric.degrade', UI_COPY.admin.simulation.degrade)}
            value={`${(props.snapshot?.bubble.degradeSecondsAccumulated ?? 0).toFixed(1)}s`}
          />
        </dl>

        <p class="runtime-note" data-ui="admin-simulation-note">
          {uiLabel(props.catalog, 'ui.admin.simulation.note', UI_COPY.admin.simulation.note)}
        </p>

        {props.runtimeError && <p class="runtime-error" data-ui="admin-runtime-error">{props.runtimeError}</p>}
      </section>

      <section class="panel" data-ui="admin-construction-panel">
        <header class="panel-head" data-ui="admin-construction-header">
          <div data-ui="admin-construction-header-copy">
            <p class="panel-kicker" data-ui="admin-construction-kicker">{uiLabel(props.catalog, 'ui.admin.construction.kicker', UI_COPY.admin.construction.kicker)}</p>
            <h2 data-ui="admin-construction-title">{uiLabel(props.catalog, 'ui.admin.construction.title', UI_COPY.admin.construction.title)}</h2>
          </div>
        </header>
        <ConstructionBanner
          catalog={props.catalog}
          dataUi="admin-construction-banner"
          job={props.activeConstruction}
        />
      </section>

      <section class="panel" data-ui="admin-spending-panel">
        <header class="panel-head" data-ui="admin-spending-header">
          <div data-ui="admin-spending-header-copy">
            <p class="panel-kicker" data-ui="admin-spending-kicker">{uiLabel(props.catalog, 'ui.admin.spending.kicker', UI_COPY.admin.spending.kicker)}</p>
            <h2 data-ui="admin-spending-title">{uiLabel(props.catalog, 'ui.admin.spending.title', UI_COPY.admin.spending.title)}</h2>
          </div>
        </header>
        <div class="controls-grid controls-grid-tight" data-ui="admin-spending-controls">
          <button data-ui="admin-spend-10" class="action action-secondary" onClick={() => props.simulationClient.spendBassline(10)}>
            {uiLabel(props.catalog, 'ui.admin.spending.action.spend10', UI_COPY.admin.spending.spend10)}
          </button>
          <button data-ui="admin-spend-25" class="action action-secondary" onClick={() => props.simulationClient.spendBassline(25)}>
            {uiLabel(props.catalog, 'ui.admin.spending.action.spend25', UI_COPY.admin.spending.spend25)}
          </button>
          <button data-ui="admin-spend-50" class="action action-secondary" onClick={() => props.simulationClient.spendBassline(50)}>
            {uiLabel(props.catalog, 'ui.admin.spending.action.spend50', UI_COPY.admin.spending.spend50)}
          </button>
          <button
            data-ui="admin-spend-all"
            class="action action-secondary"
            onClick={() => props.simulationClient.spendBassline(props.snapshot?.resources.bassline ?? 0)}
          >
            {uiLabel(props.catalog, 'ui.admin.spending.action.spend_all', UI_COPY.admin.spending.spendAll)}
          </button>
        </div>
      </section>

      <section class="panel" data-ui="admin-diagnostics-panel">
        <header class="panel-head" data-ui="admin-diagnostics-header">
          <div data-ui="admin-diagnostics-header-copy">
            <p class="panel-kicker" data-ui="admin-diagnostics-kicker">{uiLabel(props.catalog, 'ui.admin.diagnostics.kicker', UI_COPY.admin.diagnostics.kicker)}</p>
            <h2 data-ui="admin-diagnostics-title">{uiLabel(props.catalog, 'ui.admin.diagnostics.title', UI_COPY.admin.diagnostics.title)}</h2>
          </div>
        </header>
        <ul class="notes-list" data-ui="admin-notes-list">
          <For each={props.snapshot?.notes ?? []}>
            {(note, index) => <li data-ui={`admin-notes-item-${index()}`}>{note}</li>}
          </For>
        </ul>
      </section>

      <section class="panel" data-ui="admin-persistence-panel">
        <header class="panel-head" data-ui="admin-persistence-header">
          <div data-ui="admin-persistence-header-copy">
            <p class="panel-kicker" data-ui="admin-persistence-kicker">{uiLabel(props.catalog, 'ui.admin.persistence.kicker', UI_COPY.admin.persistence.kicker)}</p>
            <h2 data-ui="admin-persistence-title">{uiLabel(props.catalog, 'ui.admin.persistence.title', UI_COPY.admin.persistence.title)}</h2>
          </div>
        </header>
        <pre class="save-preview" data-ui="admin-export-preview">{props.lastSave ?? uiLabel(props.catalog, 'ui.admin.persistence.empty', UI_COPY.admin.persistence.empty)}</pre>
      </section>
    </section>
  )
}

function DataTreeView(props: DataTreeViewProps) {
  const [filter, setFilter] = createSignal('')
  const [selectedId, setSelectedId] = createSignal<string | null>(null)
  const [relationFilter, setRelationFilter] = createSignal<RelationKind | 'all'>('all')
  const [showHidden, setShowHidden] = createSignal(false)
  const [enabledIds, setEnabledIds] = createSignal<string[]>([])
  const [detailMode, setDetailMode] = createSignal<'graph' | 'timeline'>('graph')

  const nodes = createMemo(() => buildDataTreeNodes(props.catalog))
  const filteredGroups = createMemo(() => {
    const query = filter().trim().toLowerCase()
    return nodes()
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          !query ||
          item.label.toLowerCase().includes(query) ||
          item.id.toLowerCase().includes(query) ||
          item.kindLabel.toLowerCase().includes(query),
        ),
      }))
      .filter((group) => group.items.length > 0)
  })

  createEffect(() => {
    const current = selectedId()
    const allItems = filteredGroups().flatMap((group) => group.items)
    if (!allItems.length) {
      if (current !== null) setSelectedId(null)
      return
    }
    if (!current || !allItems.some((item) => item.id === current)) {
      setSelectedId(allItems[0].id)
    }
  })

  const selectedNode = createMemo(() => findDataTreeNode(filteredGroups(), selectedId()))
  const enabledSet = createMemo(() => new Set(enabledIds()))
  const simulatedUnlockedIds = createMemo(() => directSimulatedUnlockIds(props.catalog, enabledIds()))
  const incomingRelations = createMemo(() =>
    filterDataTreeRelations(
      relationEntriesForIncoming(props.catalog, props.snapshot, selectedId(), enabledSet(), simulatedUnlockedIds()),
      relationFilter(),
      showHidden(),
    ),
  )
  const outgoingRelations = createMemo(() =>
    filterDataTreeRelations(
      relationEntriesForOutgoing(props.catalog, props.snapshot, selectedNode(), enabledSet(), simulatedUnlockedIds()),
      relationFilter(),
      showHidden(),
    ),
  )
  const graphPotentialUnlocks = createMemo(() =>
    [...simulatedUnlockedIds()]
      .filter((id) => !enabledSet().has(id))
      .map((id) => ({
        id,
        label: relationLabel(props.catalog, id),
        hidden: !visibilityAllowed(props.snapshot, props.catalog, id),
      }))
      .sort((left, right) => left.label.localeCompare(right.label)),
  )
  const selectedNodeVisible = createMemo(() =>
    selectedNode() ? visibilityAllowed(props.snapshot, props.catalog, selectedNode()!.id) : false,
  )
  const storyTimelineTracks = createMemo(() => buildStoryTimelineTracks(props.catalog, props.snapshot, enabledSet(), simulatedUnlockedIds(), selectedId()))

  const toggleEnabledNode = (id: string) => {
    setEnabledIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    )
  }

  return (
    <section class="data-tree-view" data-ui="data-tree-view">
      <section class="panel data-tree-tree-panel" data-ui="data-tree-tree-panel">
        <header class="panel-head" data-ui="data-tree-tree-header">
          <div data-ui="data-tree-tree-header-copy">
            <p class="panel-kicker" data-ui="data-tree-tree-kicker">{uiLabel(props.catalog, 'ui.data_tree.title', UI_COPY.dataTree.title)}</p>
            <h2 data-ui="data-tree-tree-title">{uiLabel(props.catalog, 'ui.data_tree.subtitle', UI_COPY.dataTree.subtitle)}</h2>
          </div>
        </header>
        <label class="data-tree-search" data-ui="data-tree-search">
          <span class="control-label" data-ui="data-tree-search-label">{uiLabel(props.catalog, 'ui.data_tree.search', UI_COPY.dataTree.search)}</span>
          <input
            data-ui="data-tree-search-input"
            class="hero-select data-tree-search-input"
            value={filter()}
            onInput={(event) => setFilter(event.currentTarget.value)}
          />
        </label>
        <div class="data-tree-groups" data-ui="data-tree-groups">
          <For each={filteredGroups()}>
            {(group) => (
              <section class="data-tree-group" data-ui={`data-tree-group-${group.id}`}>
                <h3 class="data-tree-group-title" data-ui={`data-tree-group-${group.id}-title`}>
                  {group.label}
                </h3>
                <div class="data-tree-group-list" data-ui={`data-tree-group-${group.id}-list`}>
                  <For each={group.items}>
                    {(item) => (
                      <button
                        class={`data-tree-node ${selectedId() === item.id ? 'data-tree-node-active' : ''}`}
                        data-ui={`data-tree-node-${uiId(item.id)}`}
                        onClick={() => setSelectedId(item.id)}
                      >
                        <strong data-ui={`data-tree-node-${uiId(item.id)}-label`}>{item.label}</strong>
                        <span data-ui={`data-tree-node-${uiId(item.id)}-meta`}>{item.kindLabel}</span>
                      </button>
                    )}
                  </For>
                </div>
              </section>
            )}
          </For>
          {!filteredGroups().length ? (
            <div class="data-tree-empty" data-ui="data-tree-empty">{uiLabel(props.catalog, 'ui.data_tree.empty', UI_COPY.dataTree.empty)}</div>
          ) : null}
        </div>
      </section>

      <section class="panel data-tree-detail-panel" data-ui="data-tree-detail-panel">
        <header class="panel-head" data-ui="data-tree-detail-header">
          <div data-ui="data-tree-detail-header-copy">
            <p class="panel-kicker" data-ui="data-tree-detail-kicker">{uiLabel(props.catalog, 'ui.data_tree.definition', UI_COPY.dataTree.definition)}</p>
            <h2 data-ui="data-tree-detail-title">
              {selectedNode()?.label ?? uiLabel(props.catalog, 'ui.data_tree.select_node', UI_COPY.dataTree.selectNode)}
            </h2>
          </div>
          <div class="mode-switch" data-ui="data-tree-detail-mode-switch">
            <button
              class={`mode-button ${detailMode() === 'graph' ? 'mode-button-active' : ''}`}
              data-ui="data-tree-mode-graph"
              onClick={() => setDetailMode('graph')}
            >
              {uiLabel(props.catalog, 'ui.data_tree.mode.graph', UI_COPY.dataTree.modes.graph)}
            </button>
            <button
              class={`mode-button ${detailMode() === 'timeline' ? 'mode-button-active' : ''}`}
              data-ui="data-tree-mode-timeline"
              onClick={() => setDetailMode('timeline')}
            >
              {uiLabel(props.catalog, 'ui.data_tree.mode.timeline', UI_COPY.dataTree.modes.timeline)}
            </button>
          </div>
        </header>
        {selectedNode() ? (
          <div class="data-tree-detail-grid" data-ui="data-tree-detail-grid">
            <Show
              when={detailMode() === 'graph'}
              fallback={
                <section class="data-tree-card data-tree-graph-card" data-ui="data-tree-timeline-card">
                  <div class="data-tree-graph-header" data-ui="data-tree-timeline-header">
                    <div data-ui="data-tree-timeline-header-copy">
                      <h3 data-ui="data-tree-timeline-title">{uiLabel(props.catalog, 'ui.data_tree.timeline', UI_COPY.dataTree.timeline)}</h3>
                      <p class="data-tree-graph-copy" data-ui="data-tree-timeline-copy">{uiLabel(props.catalog, 'ui.data_tree.timeline_hint', UI_COPY.dataTree.timelineHint)}</p>
                    </div>
                    <button
                      class="action action-secondary data-tree-graph-reset"
                      data-ui="data-tree-timeline-reset"
                      disabled={!enabledIds().length}
                      onClick={() => setEnabledIds([])}
                    >
                      {uiLabel(props.catalog, 'ui.data_tree.graph.reset', UI_COPY.dataTree.graphReset)}
                    </button>
                  </div>
                  <Show
                    when={storyTimelineTracks().length}
                    fallback={<div class="data-tree-empty" data-ui="data-tree-timeline-empty">{uiLabel(props.catalog, 'ui.data_tree.timeline.empty', UI_COPY.dataTree.timelineNoStory)}</div>}
                  >
                    <div class="data-tree-timeline" data-ui="data-tree-timeline">
                      <For each={storyTimelineTracks()}>
                        {(track) => (
                          <section class="data-tree-timeline-track" data-ui={`data-tree-timeline-track-${uiId(track.arc)}`}>
                            <div class="data-tree-timeline-track-header" data-ui={`data-tree-timeline-track-${uiId(track.arc)}-header`}>
                              <span class="control-label" data-ui={`data-tree-timeline-track-${uiId(track.arc)}-label`}>{uiLabel(props.catalog, 'ui.data_tree.timeline.arc', UI_COPY.dataTree.timelineArc)}</span>
                              <strong data-ui={`data-tree-timeline-track-${uiId(track.arc)}-value`}>{track.label}</strong>
                            </div>
                            <div class="data-tree-timeline-lane" data-ui={`data-tree-timeline-track-${uiId(track.arc)}-lane`}>
                              <For each={track.beats}>
                                {(beat) => (
                                  <section
                                    class={`data-tree-timeline-node ${
                                      beat.selected ? 'data-tree-timeline-node-selected' : ''
                                    } ${beat.enabled ? 'data-tree-timeline-node-enabled' : ''} ${
                                      beat.hidden ? 'data-tree-timeline-node-hidden' : ''
                                    } ${beat.simulatedUnlocked ? 'data-tree-timeline-node-simulated' : ''}`}
                                    data-ui={`data-tree-timeline-node-${uiId(beat.id)}`}
                                  >
                                    <button
                                      class="data-tree-timeline-node-select"
                                      data-ui={`data-tree-timeline-node-${uiId(beat.id)}-select`}
                                      onClick={() => setSelectedId(beat.id)}
                                    >
                                    <span class="data-tree-timeline-sequence" data-ui={`data-tree-timeline-node-${uiId(beat.id)}-sequence`}>
                                      {uiLabel(props.catalog, 'ui.data_tree.timeline.sequence', UI_COPY.dataTree.timelineSequence)} {beat.sequence}
                                    </span>
                                    <strong data-ui={`data-tree-timeline-node-${uiId(beat.id)}-label`}>{beat.label}</strong>
                                    <span data-ui={`data-tree-timeline-node-${uiId(beat.id)}-visibility`}>
                                      {beat.hidden ? uiLabel(props.catalog, 'ui.data_tree.hidden', UI_COPY.dataTree.hiddenNode) : uiLabel(props.catalog, 'ui.data_tree.visible', UI_COPY.dataTree.visibleNode)}
                                    </span>
                                    <div class="data-tree-relation-flags" data-ui={`data-tree-timeline-node-${uiId(beat.id)}-flags`}>
                                      {beat.enabled ? (
                                        <span data-ui={`data-tree-timeline-node-${uiId(beat.id)}-enabled`}>{uiLabel(props.catalog, 'ui.data_tree.graph.enabled', UI_COPY.dataTree.graphEnabled)}</span>
                                      ) : null}
                                      {beat.simulatedUnlocked ? (
                                        <span data-ui={`data-tree-timeline-node-${uiId(beat.id)}-simulated`}>{uiLabel(props.catalog, 'ui.data_tree.graph.simulated', UI_COPY.dataTree.simulatedUnlock)}</span>
                                      ) : null}
                                    </div>
                                    <span class="data-tree-timeline-node-actions" data-ui={`data-tree-timeline-node-${uiId(beat.id)}-actions`}>
                                      {beat.unlockTargets.length ? `-> ${beat.unlockTargets.join(', ')}` : uiLabel(props.catalog, 'ui.data_tree.none', UI_COPY.dataTree.none)}
                                    </span>
                                    </button>
                                    <button
                                      class={`action data-tree-timeline-enable ${
                                        beat.enabled ? 'action-secondary' : ''
                                      }`}
                                      data-ui={`data-tree-timeline-node-${uiId(beat.id)}-toggle`}
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        toggleEnabledNode(beat.id)
                                      }}
                                    >
                                      {beat.enabled ? uiLabel(props.catalog, 'ui.data_tree.graph.disable', UI_COPY.dataTree.graphDisable) : uiLabel(props.catalog, 'ui.data_tree.graph.enable', UI_COPY.dataTree.graphEnable)}
                                    </button>
                                  </section>
                                )}
                              </For>
                            </div>
                          </section>
                        )}
                      </For>
                    </div>
                  </Show>
                </section>
              }
            >
              <section class="data-tree-card data-tree-graph-card" data-ui="data-tree-graph-card">
                <div class="data-tree-graph-header" data-ui="data-tree-graph-header">
                  <div data-ui="data-tree-graph-header-copy">
                    <h3 data-ui="data-tree-graph-title">{uiLabel(props.catalog, 'ui.data_tree.graph', UI_COPY.dataTree.graph)}</h3>
                    <p class="data-tree-graph-copy" data-ui="data-tree-graph-copy">{uiLabel(props.catalog, 'ui.data_tree.graph.hint', UI_COPY.dataTree.graphHint)}</p>
                  </div>
                  <button
                    class="action action-secondary data-tree-graph-reset"
                    data-ui="data-tree-graph-reset"
                    disabled={!enabledIds().length}
                    onClick={() => setEnabledIds([])}
                  >
                    {uiLabel(props.catalog, 'ui.data_tree.graph.reset', UI_COPY.dataTree.graphReset)}
                  </button>
                </div>

                <div class="data-tree-graph-controls" data-ui="data-tree-graph-controls">
                  <div class="data-tree-filter-group" data-ui="data-tree-filter-group">
                    <For each={dataTreeFilterOptions(props.catalog)}>
                      {(option) => (
                        <button
                          class={`action action-secondary data-tree-filter-button ${
                            relationFilter() === option.id ? 'data-tree-filter-button-active' : ''
                          }`}
                          data-ui={`data-tree-filter-${option.id}`}
                          onClick={() => setRelationFilter(option.id)}
                        >
                          {option.label}
                        </button>
                      )}
                    </For>
                  </div>
                  <label class="data-tree-graph-toggle" data-ui="data-tree-graph-toggle">
                    <input
                      data-ui="data-tree-graph-toggle-input"
                      type="checkbox"
                      checked={showHidden()}
                      onChange={(event) => setShowHidden(event.currentTarget.checked)}
                    />
                    <span data-ui="data-tree-graph-toggle-label">{uiLabel(props.catalog, 'ui.data_tree.graph.show_hidden', UI_COPY.dataTree.graphShowHidden)}</span>
                  </label>
                </div>

                <div class="data-tree-graph-layout" data-ui="data-tree-graph-layout">
                  <section class="data-tree-graph-column" data-ui="data-tree-graph-incoming">
                    <span class="control-label" data-ui="data-tree-graph-incoming-label">{uiLabel(props.catalog, 'ui.data_tree.graph.incoming', UI_COPY.dataTree.graphIncoming)}</span>
                    <DataTreeRelationList
                      catalog={props.catalog}
                      dataUi="data-tree-graph-incoming-list"
                      items={incomingRelations()}
                      onSelect={setSelectedId}
                    />
                  </section>

                  <section class="data-tree-graph-focus" data-ui="data-tree-graph-focus">
                    <span class="control-label" data-ui="data-tree-graph-focus-label">{uiLabel(props.catalog, 'ui.data_tree.graph.selected', UI_COPY.dataTree.graphSelected)}</span>
                    <div
                      class={`data-tree-graph-node ${
                        enabledSet().has(selectedNode()!.id) ? 'data-tree-graph-node-enabled' : ''
                      } ${selectedNodeVisible() ? 'data-tree-graph-node-visible' : 'data-tree-graph-node-hidden'}`}
                      data-ui={`data-tree-graph-node-${uiId(selectedNode()!.id)}`}
                    >
                      <strong data-ui="data-tree-graph-node-label">{selectedNode()!.label}</strong>
                      <span data-ui="data-tree-graph-node-kind">{selectedNode()!.kindLabel}</span>
                      <span data-ui="data-tree-graph-node-visibility">
                        {selectedNodeVisible() ? uiLabel(props.catalog, 'ui.data_tree.visible', UI_COPY.dataTree.visibleNode) : uiLabel(props.catalog, 'ui.data_tree.hidden', UI_COPY.dataTree.hiddenNode)}
                      </span>
                      <button
                        class={`action data-tree-graph-enable ${
                          enabledSet().has(selectedNode()!.id) ? 'action-secondary' : ''
                        }`}
                        data-ui="data-tree-graph-enable"
                        onClick={() => toggleEnabledNode(selectedNode()!.id)}
                      >
                        {enabledSet().has(selectedNode()!.id) ? uiLabel(props.catalog, 'ui.data_tree.graph.disable', UI_COPY.dataTree.graphDisable) : uiLabel(props.catalog, 'ui.data_tree.graph.enable', UI_COPY.dataTree.graphEnable)}
                      </button>
                    </div>

                    <div class="data-tree-enabled-block" data-ui="data-tree-enabled-block">
                      <span class="control-label" data-ui="data-tree-enabled-block-label">{uiLabel(props.catalog, 'ui.data_tree.graph.enabled_nodes', UI_COPY.dataTree.graphEnabledNodes)}</span>
                      {enabledIds().length ? (
                        <div class="data-tree-chip-list" data-ui="data-tree-enabled-chip-list">
                          <For each={enabledIds()}>
                            {(id) => (
                              <button
                                class="data-tree-chip"
                                data-ui={`data-tree-enabled-chip-${uiId(id)}`}
                                onClick={() => setSelectedId(id)}
                              >
                                {relationLabel(props.catalog, id)}
                              </button>
                            )}
                          </For>
                        </div>
                      ) : (
                        <div class="data-tree-empty" data-ui="data-tree-enabled-empty">{uiLabel(props.catalog, 'ui.data_tree.graph.no_enabled', UI_COPY.dataTree.graphNoEnabled)}</div>
                      )}
                    </div>

                    <div class="data-tree-enabled-block" data-ui="data-tree-potential-unlocks">
                      <span class="control-label" data-ui="data-tree-potential-unlocks-label">{uiLabel(props.catalog, 'ui.data_tree.graph.potential_unlocks', UI_COPY.dataTree.graphPotentialUnlocks)}</span>
                      {graphPotentialUnlocks().length ? (
                        <div class="data-tree-chip-list" data-ui="data-tree-potential-unlocks-list">
                          <For each={graphPotentialUnlocks()}>
                            {(item) => (
                              <button
                                class={`data-tree-chip ${item.hidden ? 'data-tree-chip-hidden' : 'data-tree-chip-unlocked'}`}
                                data-ui={`data-tree-potential-unlock-${uiId(item.id)}`}
                                onClick={() => setSelectedId(item.id)}
                              >
                                {item.label}
                              </button>
                            )}
                          </For>
                        </div>
                      ) : (
                        <div class="data-tree-empty" data-ui="data-tree-potential-unlocks-empty">{uiLabel(props.catalog, 'ui.data_tree.graph.no_potential_unlocks', UI_COPY.dataTree.graphNoPotentialUnlocks)}</div>
                      )}
                    </div>
                  </section>

                  <section class="data-tree-graph-column" data-ui="data-tree-graph-outgoing">
                    <span class="control-label" data-ui="data-tree-graph-outgoing-label">{uiLabel(props.catalog, 'ui.data_tree.graph.outgoing', UI_COPY.dataTree.graphOutgoing)}</span>
                    <DataTreeRelationList
                      catalog={props.catalog}
                      dataUi="data-tree-graph-outgoing-list"
                      items={outgoingRelations()}
                      onSelect={setSelectedId}
                    />
                  </section>
                </div>
              </section>
            </Show>

            <section class="data-tree-card" data-ui="data-tree-detail-definition">
              <h3 data-ui="data-tree-detail-definition-title">{uiLabel(props.catalog, 'ui.data_tree.definition', UI_COPY.dataTree.definition)}</h3>
              <dl class="data-tree-kv" data-ui="data-tree-detail-definition-kv">
                <DataTreeField dataUi="data-tree-field-kind" label={uiLabel(props.catalog, 'ui.data_tree.field.kind', UI_COPY.dataTree.kind)} value={selectedNode()!.kindLabel} />
                <DataTreeField dataUi="data-tree-field-id" label={uiLabel(props.catalog, 'ui.data_tree.field.id', UI_COPY.dataTree.id)} value={selectedNode()!.id} />
                <DataTreeField dataUi="data-tree-field-label" label={uiLabel(props.catalog, 'ui.data_tree.field.label', UI_COPY.dataTree.label)} value={selectedNode()!.label} />
              </dl>
            </section>

            <section class="data-tree-card" data-ui="data-tree-detail-presentation">
              <h3 data-ui="data-tree-detail-presentation-title">{uiLabel(props.catalog, 'ui.data_tree.presentation', UI_COPY.dataTree.presentation)}</h3>
              <dl class="data-tree-kv" data-ui="data-tree-detail-presentation-kv">
                <DataTreeField
                  dataUi="data-tree-field-short-label"
                  label={uiLabel(props.catalog, 'ui.data_tree.field.short_label', UI_COPY.dataTree.shortLabel)}
                  value={presentationFor(props.catalog, selectedNode()!.id)?.shortLabel ?? uiLabel(props.catalog, 'ui.data_tree.none', UI_COPY.dataTree.none)}
                />
                <DataTreeField
                  dataUi="data-tree-field-player-hint"
                  label={uiLabel(props.catalog, 'ui.data_tree.field.player_hint', UI_COPY.dataTree.playerHint)}
                  value={presentationFor(props.catalog, selectedNode()!.id)?.playerHint ?? uiLabel(props.catalog, 'ui.data_tree.none', UI_COPY.dataTree.none)}
                />
                <DataTreeField
                  dataUi="data-tree-field-cta"
                  label={uiLabel(props.catalog, 'ui.data_tree.field.cta', UI_COPY.dataTree.cta)}
                  value={presentationFor(props.catalog, selectedNode()!.id)?.ctaCopy ?? uiLabel(props.catalog, 'ui.data_tree.none', UI_COPY.dataTree.none)}
                />
                <DataTreeField
                  dataUi="data-tree-field-risk"
                  label={uiLabel(props.catalog, 'ui.data_tree.field.risk', UI_COPY.dataTree.risk)}
                  value={presentationFor(props.catalog, selectedNode()!.id)?.primaryRiskCopy ?? uiLabel(props.catalog, 'ui.data_tree.none', UI_COPY.dataTree.none)}
                />
                <DataTreeField
                  dataUi="data-tree-field-reveal"
                  label={uiLabel(props.catalog, 'ui.data_tree.field.reveal', UI_COPY.dataTree.reveal)}
                  value={presentationFor(props.catalog, selectedNode()!.id)?.reveal ?? uiLabel(props.catalog, 'ui.data_tree.none', UI_COPY.dataTree.none)}
                />
              </dl>
            </section>

            <section class="data-tree-card" data-ui="data-tree-detail-visibility">
              <h3 data-ui="data-tree-detail-visibility-title">{uiLabel(props.catalog, 'ui.data_tree.visibility', UI_COPY.dataTree.visibility)}</h3>
              <dl class="data-tree-kv" data-ui="data-tree-detail-visibility-kv">
                <DataTreeField
                  dataUi="data-tree-field-current-state"
                  label={uiLabel(props.catalog, 'ui.data_tree.field.current_state', UI_COPY.dataTree.currentState)}
                  value={
                    visibilityAllowed(props.snapshot, props.catalog, selectedNode()!.id)
                      ? uiLabel(props.catalog, 'ui.data_tree.visible', UI_COPY.dataTree.visible)
                      : uiLabel(props.catalog, 'ui.data_tree.hidden', UI_COPY.dataTree.hidden)
                  }
                />
                <DataTreeField
                  dataUi="data-tree-field-conditions-all"
                  label={uiLabel(props.catalog, 'ui.data_tree.field.conditions_all', UI_COPY.dataTree.conditionsAll)}
                  value={visibilityConditionSummary(props.catalog, selectedNode()!.id, 'all')}
                />
                <DataTreeField
                  dataUi="data-tree-field-conditions-any"
                  label={uiLabel(props.catalog, 'ui.data_tree.field.conditions_any', UI_COPY.dataTree.conditionsAny)}
                  value={visibilityConditionSummary(props.catalog, selectedNode()!.id, 'any')}
                />
              </dl>
            </section>

            <section class="data-tree-card data-tree-relations-card" data-ui="data-tree-detail-relations">
              <h3 data-ui="data-tree-detail-relations-title">{uiLabel(props.catalog, 'ui.data_tree.relations', UI_COPY.dataTree.relations)}</h3>
              <div class="data-tree-relations-grid" data-ui="data-tree-relations-grid">
                <div class="data-tree-relation-column" data-ui="data-tree-relations-outgoing">
                  <span class="control-label" data-ui="data-tree-relations-outgoing-label">{uiLabel(props.catalog, 'ui.data_tree.outgoing', UI_COPY.dataTree.outgoing)}</span>
                  <DataTreeRelationList
                    catalog={props.catalog}
                    dataUi="data-tree-relations-outgoing-list"
                    items={outgoingRelations()}
                    onSelect={setSelectedId}
                  />
                </div>
                <div class="data-tree-relation-column" data-ui="data-tree-relations-incoming">
                  <span class="control-label" data-ui="data-tree-relations-incoming-label">{uiLabel(props.catalog, 'ui.data_tree.incoming', UI_COPY.dataTree.incoming)}</span>
                  <DataTreeRelationList
                    catalog={props.catalog}
                    dataUi="data-tree-relations-incoming-list"
                    items={incomingRelations()}
                    onSelect={setSelectedId}
                  />
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div class="data-tree-empty" data-ui="data-tree-detail-empty">{uiLabel(props.catalog, 'ui.data_tree.select_node', UI_COPY.dataTree.selectNode)}</div>
        )}
      </section>
    </section>
  )
}

interface HeroOverviewControlsProps {
  catalog: CatalogSnapshot | null
  snapshot: SimulationSnapshot | null
  simulationClient: SimulationClient
}

function HeroOverviewControls(props: HeroOverviewControlsProps) {
  const outsideContext = () => heroIsOutsideContext(props.snapshot)
  const heroMode = () =>
    props.snapshot?.roster.heroAssigned
      ? props.snapshot.roster.heroRoleId
      : 'idle'

  return (
    <div class="staffing-panel hero-controls-panel" data-ui="game-hero-controls">
      <Show
        when={!outsideContext()}
        fallback={
          <div class="staffing-grid hero-field-grid" data-ui="game-hero-field-grid">
            <div class="control-block hero-block hero-emphasis-block" data-ui="game-hero-field-status">
              <span class="control-label" data-ui="game-hero-field-status-label">{uiLabel(props.catalog, UI_STATUS_HERO, UI_COPY.hero.status)}</span>
              <div class="hero-class-value" data-ui="game-hero-field-status-value">
                <strong data-ui="game-hero-field-status-primary">
                  {heroStateLabel(props.snapshot, props.catalog)}
                </strong>
                <span data-ui="game-hero-field-status-support">
                  {heroSupportLabel(props.snapshot, props.catalog)}
                </span>
              </div>
            </div>
            <div class="control-block hero-block hero-survival-block" data-ui="game-hero-vitals">
              <span class="control-label" data-ui="game-hero-vitals-label">
                {uiLabel(props.catalog, UI_METRIC_HERO_VITALS, 'Vitals')}
              </span>
              <div class="hero-class-value" data-ui="game-hero-vitals-value">
                <strong data-ui="game-hero-vitals-percent">{heroVitalsValue(props.snapshot)}</strong>
                <span data-ui="game-hero-vitals-state">
                  {`${uiLabel(props.catalog, UI_METRIC_HERO_DEBUFF, 'Strain Tier')}: ${heroDebuffLabel(props.snapshot)}`}
                </span>
              </div>
              <ProgressBar
                dataUi="game-hero-vitals-progress"
                progress={props.snapshot?.heroSurvival.viralLoadRatio ?? 0}
              />
            </div>
            <div class="control-block hero-block" data-ui="game-hero-return-window">
              <span class="control-label" data-ui="game-hero-return-window-label">
                {uiLabel(props.catalog, UI_METRIC_HERO_RETURN_WINDOW, 'Return Window')}
              </span>
              <div class="hero-class-value" data-ui="game-hero-return-window-value">
                <strong data-ui="game-hero-return-window-primary">{heroReturnWindowLabel(props.snapshot)}</strong>
                <span data-ui="game-hero-return-window-support">
                  {props.snapshot?.heroSurvival.location === 'outside_bubble'
                    ? 'Before auto-return'
                    : 'Forced return timer'}
                </span>
              </div>
            </div>
            <div class="control-block hero-block" data-ui="game-hero-wounds">
              <span class="control-label" data-ui="game-hero-wounds-label">
                {uiLabel(props.catalog, UI_METRIC_HERO_WOUNDS, 'Wounds')}
              </span>
              <div class="hero-class-value" data-ui="game-hero-wounds-value">
                <strong data-ui="game-hero-wounds-primary">{heroWoundsLabel(props.snapshot)}</strong>
                <span data-ui="game-hero-wounds-support">
                  {`${uiLabel(props.catalog, UI_METRIC_HERO_ECHO_SCARS, 'Echo Scars')}: ${props.snapshot?.heroSurvival.echoScars ?? 0}`}
                </span>
              </div>
            </div>
          </div>
        }
      >
        <div class="control-block hero-block" data-ui="game-hero-control-block">
          <span class="control-label" data-ui="game-hero-label">{uiLabel(props.catalog, UI_CONTROL_HERO_TASK, UI_COPY.hero.task)}</span>
          <select
            data-ui="game-hero-select"
            class="hero-select"
            value={heroMode()}
            disabled={Boolean(props.snapshot?.activeWorldAction || props.snapshot?.heroSurvival.forcedReturn)}
            onChange={(event) => {
              const nextMode = event.currentTarget.value

              if (nextMode === 'idle') {
                props.simulationClient.assignHero(false)
                return
              }

              props.simulationClient.assignHero(true)
              props.simulationClient.setHeroRole(nextMode)
            }}
          >
            <option data-ui="game-hero-option-idle" value="idle">{uiLabel(props.catalog, 'ui.hero.state.idle', UI_COPY.hero.idle)}</option>
            <For each={(props.catalog?.roles ?? []).filter((role) => role.heroAllowed).sort((a, b) => a.uiOrder - b.uiOrder)}>
              {(role) => (
                <option
                  data-ui={`game-hero-option-${uiId(role.id)}`}
                  value={role.id}
                  disabled={!roleAvailable(props.snapshot, role.id)}
                >
                  {role.label}
                </option>
              )}
            </For>
          </select>
        </div>
      </Show>
      <div class="staffing-grid hero-level-grid" data-ui="game-hero-controls-grid">
        <HeroClassStat
          dataUi="game-hero-drummer"
          label={uiLabel(props.catalog, 'ui.hero.class.drummer', UI_COPY.hero.classes.drummer)}
          level={props.snapshot?.heroProgress.drummerLevel ?? 0}
          xp={props.snapshot?.heroProgress.drummerXp ?? 0}
          xpToNext={heroXpToNext(props.snapshot, props.catalog)}
        />
        <HeroClassStat
          dataUi="game-hero-vocalist"
          label={uiLabel(props.catalog, 'ui.hero.class.vocalist', UI_COPY.hero.classes.vocalist)}
          level={props.snapshot?.heroProgress.vocalistLevel ?? 0}
          xp={props.snapshot?.heroProgress.vocalistXp ?? 0}
          xpToNext={heroXpToNext(props.snapshot, props.catalog)}
        />
        <HeroClassStat
          dataUi="game-hero-synth"
          label={uiLabel(props.catalog, 'ui.hero.class.synth', UI_COPY.hero.classes.synth)}
          level={props.snapshot?.heroProgress.synthLevel ?? 0}
          xp={props.snapshot?.heroProgress.synthXp ?? 0}
          xpToNext={heroXpToNext(props.snapshot, props.catalog)}
        />
      </div>
      <Show when={!outsideContext()}>
        <div class="hero-survival-grid hero-survival-grid-base" data-ui="game-hero-survival-grid">
          <div class="control-block hero-block hero-emphasis-block" data-ui="game-hero-base-status">
            <span class="control-label" data-ui="game-hero-base-status-label">
              {uiLabel(props.catalog, UI_STATUS_HERO, UI_COPY.hero.status)}
            </span>
            <div class="hero-class-value" data-ui="game-hero-base-status-value">
              <strong data-ui="game-hero-base-status-primary">{heroStateLabel(props.snapshot, props.catalog)}</strong>
              <span data-ui="game-hero-base-status-support">{heroSupportLabel(props.snapshot, props.catalog)}</span>
            </div>
          </div>
          <div class="control-block hero-block" data-ui="game-hero-recovery">
            <span class="control-label" data-ui="game-hero-recovery-label">
              {uiLabel(props.catalog, UI_METRIC_HERO_RECOVERY, 'Recovery')}
            </span>
            <div class="hero-class-value" data-ui="game-hero-recovery-value">
              <strong data-ui="game-hero-recovery-primary">{heroRecoveryLabel(props.snapshot, props.catalog)}</strong>
              <span data-ui="game-hero-recovery-support">
                {props.snapshot?.heroSurvival.forcedReturn?.phase === 'recover_at_studio'
                  ? 'Studio-only recovery'
                  : props.snapshot?.heroSurvival.location === 'outside_bubble'
                    ? 'Outside bubble'
                    : 'Inside safety'}
              </span>
            </div>
          </div>
          <div class="control-block hero-block" data-ui="game-hero-wounds">
            <span class="control-label" data-ui="game-hero-wounds-label">
              {uiLabel(props.catalog, UI_METRIC_HERO_WOUNDS, 'Wounds')}
            </span>
            <div class="hero-class-value" data-ui="game-hero-wounds-value">
              <strong data-ui="game-hero-wounds-primary">{heroWoundsLabel(props.snapshot)}</strong>
              <span data-ui="game-hero-wounds-support">
                {`${uiLabel(props.catalog, UI_METRIC_HERO_ECHO_SCARS, 'Echo Scars')}: ${props.snapshot?.heroSurvival.echoScars ?? 0}`}
              </span>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}

function instantRecruitStock(snapshot: SimulationSnapshot) {
  return Math.max(
    0,
    Math.max(5, 30 - Math.floor(snapshot.clockSeconds / 10)) -
      snapshot.recruitment.instantRecruitsUsed,
  )
}

function crewCount(snapshot: SimulationSnapshot | null, roleId: string) {
  return snapshot?.roster.crewByRole[roleId] ?? 0
}

function heroOnRole(snapshot: SimulationSnapshot | null, roleId: string) {
  return Boolean(snapshot?.roster.heroAssigned && snapshot.roster.heroRoleId === roleId)
}

function workerCount(snapshot: SimulationSnapshot | null, roleId: string) {
  return crewCount(snapshot, roleId) + Number(heroOnRole(snapshot, roleId))
}

interface DataTreeNode {
  id: string
  label: string
  kindLabel: string
  relatedIds: string[]
}

interface DataTreeGroup {
  id: string
  label: string
  items: DataTreeNode[]
}

type RelationKind = 'unlock' | 'blocker' | 'flow' | 'access' | 'power' | 'model' | 'related'

interface DataTreeRelation {
  id: string
  label: string
  reason: string
  kind: RelationKind
  hidden: boolean
  simulatedUnlocked: boolean
  enabled: boolean
}

interface StoryTimelineBeat {
  id: string
  label: string
  sequence: number
  hidden: boolean
  enabled: boolean
  simulatedUnlocked: boolean
  selected: boolean
  unlockTargets: string[]
}

interface StoryTimelineTrack {
  arc: string
  label: string
  beats: StoryTimelineBeat[]
}

function buildDataTreeNodes(catalog: CatalogSnapshot | null): DataTreeGroup[] {
  if (!catalog) return []

  const groups: DataTreeGroup[] = [
    {
      id: 'resources',
      label: uiLabel(catalog, 'ui.data_tree.group.resources', UI_COPY.dataTree.groups.resources),
      items: catalog.resources
        .map((resource) => ({
          id: resource.id,
          label: resource.label,
          kindLabel: 'resource',
          relatedIds: entityRelatedIds(catalog, resource.id),
        }))
        .sort(sortDataTreeNodes),
    },
    {
      id: 'roles',
      label: uiLabel(catalog, 'ui.data_tree.group.roles', UI_COPY.dataTree.groups.roles),
      items: catalog.roles
        .map((role) => ({
          id: role.id,
          label: role.label,
          kindLabel: 'role',
          relatedIds: entityRelatedIds(catalog, role.id),
        }))
        .sort(sortDataTreeNodes),
    },
    {
      id: 'stations',
      label: uiLabel(catalog, 'ui.data_tree.group.stations', UI_COPY.dataTree.groups.stations),
      items: catalog.stations
        .map((station) => ({
          id: station.id,
          label: station.label,
          kindLabel: 'station',
          relatedIds: entityRelatedIds(catalog, station.id),
        }))
        .sort(sortDataTreeNodes),
    },
    {
      id: 'construction',
      label: uiLabel(catalog, 'ui.data_tree.group.construction', UI_COPY.dataTree.groups.construction),
      items: catalog.constructionOptions
        .map((option) => ({
          id: option.id,
          label: option.label,
          kindLabel: 'construction',
          relatedIds: entityRelatedIds(catalog, option.id),
        }))
        .sort(sortDataTreeNodes),
    },
    {
      id: 'processing',
      label: uiLabel(catalog, 'ui.data_tree.group.processing', UI_COPY.dataTree.groups.processing),
      items: catalog.processingRecipes
        .map((recipe) => ({
          id: recipe.id,
          label: recipe.label,
          kindLabel: 'recipe',
          relatedIds: entityRelatedIds(catalog, recipe.id),
        }))
        .sort(sortDataTreeNodes),
    },
    {
      id: 'actions',
      label: uiLabel(catalog, 'ui.data_tree.group.actions', UI_COPY.dataTree.groups.actions),
      items: catalog.worldActions
        .map((action) => ({
          id: action.id,
          label: action.label,
          kindLabel: 'action',
          relatedIds: entityRelatedIds(catalog, action.id),
        }))
        .sort(sortDataTreeNodes),
    },
    {
      id: 'story',
      label: uiLabel(catalog, 'ui.data_tree.group.story', UI_COPY.dataTree.groups.story),
      items: catalog.storyBeats
        .map((beat) => ({
          id: beat.id,
          label: beat.label,
          kindLabel: 'story',
          relatedIds: entityRelatedIds(catalog, beat.id),
        }))
        .sort(sortDataTreeNodes),
    },
    {
      id: 'flags',
      label: uiLabel(catalog, 'ui.data_tree.group.flags', UI_COPY.dataTree.groups.flags),
      items: catalog.flags
        .map((flag) => ({
          id: flag.id,
          label: flag.label,
          kindLabel: 'flag',
          relatedIds: flagRelatedIds(catalog, flag.id),
        }))
        .sort(sortDataTreeNodes),
    },
    {
      id: 'models',
      label: uiLabel(catalog, 'ui.data_tree.group.models', UI_COPY.dataTree.groups.models),
      items: catalog.models
        .map((model) => ({
          id: model.id,
          label: model.label,
          kindLabel: 'model',
          relatedIds: modelRelatedIds(catalog, model.id),
        }))
        .sort(sortDataTreeNodes),
    },
    {
      id: 'ui',
      label: uiLabel(catalog, 'ui.data_tree.group.ui', UI_COPY.dataTree.groups.ui),
      items: catalog.uiElements
        .map((element) => ({
          id: element.id,
          label: element.presentation?.shortLabel ?? element.label,
          kindLabel: 'ui',
          relatedIds: element.relatedIds.slice(),
        }))
        .sort(sortDataTreeNodes),
    },
    {
      id: 'tiles',
      label: uiLabel(catalog, 'ui.data_tree.group.tiles', UI_COPY.dataTree.groups.tiles),
      items: catalog.tiles
        .map((tile) => ({
          id: tile.id,
          label: tile.label,
          kindLabel: 'tile',
          relatedIds: entityRelatedIds(catalog, tile.id),
        }))
        .sort(sortDataTreeNodes),
    },
    {
      id: 'flora',
      label: uiLabel(catalog, 'ui.data_tree.group.flora', UI_COPY.dataTree.groups.flora),
      items: catalog.flora
        .map((flora) => ({
          id: flora.id,
          label: flora.label,
          kindLabel: 'flora',
          relatedIds: entityRelatedIds(catalog, flora.id),
        }))
        .sort(sortDataTreeNodes),
    },
    {
      id: 'structures',
      label: uiLabel(catalog, 'ui.data_tree.group.structures', UI_COPY.dataTree.groups.structures),
      items: catalog.structures
        .map((structure) => ({
          id: structure.id,
          label: structure.label,
          kindLabel: 'structure',
          relatedIds: entityRelatedIds(catalog, structure.id),
        }))
        .sort(sortDataTreeNodes),
    },
  ]

  return groups
}

function sortDataTreeNodes(left: DataTreeNode, right: DataTreeNode) {
  return left.label.localeCompare(right.label) || left.id.localeCompare(right.id)
}

function findDataTreeNode(groups: DataTreeGroup[], id: string | null) {
  if (!id) return null
  for (const group of groups) {
    const match = group.items.find((item) => item.id === id)
    if (match) return match
  }
  return null
}

function entityRelatedIds(catalog: CatalogSnapshot | null, id: string) {
  const schema = entitySchemaFor(catalog, id)
  const storyBeat = catalog?.storyBeats.find((beat) => beat.id === id)
  if (!schema && storyBeat) {
    return storyBeat.relatedIds.filter((relatedId) => relatedId !== id)
  }
  if (!schema) return []

  const ids = new Set<string>()
  schema.unlocks.forEach((entry) => entry.relatedIds.forEach((relatedId) => ids.add(relatedId)))
  schema.blockers.forEach((entry) => entry.relatedIds.forEach((relatedId) => ids.add(relatedId)))
  schema.accessRules.forEach((entry) => entry.relatedIds.forEach((relatedId) => ids.add(relatedId)))
  schema.flows.forEach((entry) => {
    ids.add(entry.itemId)
    entry.relatedIds.forEach((relatedId) => ids.add(relatedId))
  })
  schema.modelRefs.forEach((entry) => ids.add(entry.referenceId))
  if (schema.power?.resourceId) ids.add(schema.power.resourceId)

  return [...ids].filter((relatedId) => relatedId !== id)
}

function visibilityReferencesFlag(visibility: VisibilityDef | null | undefined, flagId: string) {
  if (!visibility) return false
  const conditions = [...visibility.allOf, ...visibility.anyOf]
  return conditions.some((condition) =>
    ('flag_id' in condition && condition.flag_id === flagId),
  )
}

function requirementsReferenceFlag(requirements: RequirementDef[], flagId: string) {
  return requirements.some((requirement) => 'flag_id' in requirement && requirement.flag_id === flagId)
}

function flagRelatedIds(catalog: CatalogSnapshot | null, flagId: string) {
  if (!catalog) return []

  const ids = new Set<string>()

  for (const resource of catalog.resources) {
    if (entityRelatedIds(catalog, resource.id).includes(flagId) || visibilityReferencesFlag(visibilityFor(catalog, resource.id), flagId)) {
      ids.add(resource.id)
    }
  }
  for (const role of catalog.roles) {
    if (entityRelatedIds(catalog, role.id).includes(flagId) || visibilityReferencesFlag(visibilityFor(catalog, role.id), flagId)) {
      ids.add(role.id)
    }
  }
  for (const station of catalog.stations) {
    if (
      entityRelatedIds(catalog, station.id).includes(flagId) ||
      visibilityReferencesFlag(visibilityFor(catalog, station.id), flagId) ||
      requirementsReferenceFlag(station.requirements, flagId)
    ) {
      ids.add(station.id)
    }
  }
  for (const option of catalog.constructionOptions) {
    if (
      entityRelatedIds(catalog, option.id).includes(flagId) ||
      visibilityReferencesFlag(visibilityFor(catalog, option.id), flagId) ||
      requirementsReferenceFlag(option.requirements, flagId)
    ) {
      ids.add(option.id)
    }
  }
  for (const recipe of catalog.processingRecipes) {
    if (
      entityRelatedIds(catalog, recipe.id).includes(flagId) ||
      visibilityReferencesFlag(visibilityFor(catalog, recipe.id), flagId) ||
      requirementsReferenceFlag(recipe.requirements, flagId)
    ) {
      ids.add(recipe.id)
    }
  }
  for (const action of catalog.worldActions) {
    if (
      entityRelatedIds(catalog, action.id).includes(flagId) ||
      visibilityReferencesFlag(visibilityFor(catalog, action.id), flagId) ||
      requirementsReferenceFlag(action.requirements, flagId)
    ) {
      ids.add(action.id)
    }
  }
  for (const beat of catalog.storyBeats) {
    if (beat.relatedIds.includes(flagId) || entityRelatedIds(catalog, beat.id).includes(flagId)) {
      ids.add(beat.id)
    }
  }
  for (const uiElement of catalog.uiElements) {
    if (
      uiElement.relatedIds.includes(flagId) ||
      visibilityReferencesFlag(uiElement.visibility, flagId)
    ) {
      ids.add(uiElement.id)
    }
  }

  return [...ids].filter((id) => id !== flagId).sort()
}

function modelRelatedIds(catalog: CatalogSnapshot | null, modelId: string) {
  if (!catalog) return []

  const ids = new Set<string>()
  for (const schema of catalog.entitySchemas) {
    if (schema.modelRefs.some((modelRef) => modelRef.referenceId === modelId)) {
      ids.add(schema.id)
    }
  }

  return [...ids].filter((id) => id !== modelId).sort()
}

function relationEntriesForOutgoing(
  catalog: CatalogSnapshot | null,
  snapshot: SimulationSnapshot | null,
  node: DataTreeNode | null,
  enabledSet: Set<string>,
  simulatedUnlockedIds: Set<string>,
): DataTreeRelation[] {
  if (!catalog || !node) return []
  return node.relatedIds
    .map((relatedId) => ({
      id: relatedId,
      label: relationLabel(catalog, relatedId),
      reason: relationReason(catalog, node.id, relatedId),
      kind: relationKind(catalog, node.id, relatedId),
      hidden: !visibilityAllowed(snapshot, catalog, relatedId),
      simulatedUnlocked: simulatedUnlockedIds.has(relatedId),
      enabled: enabledSet.has(relatedId),
    }))
    .sort((left, right) => left.label.localeCompare(right.label))
}

function relationEntriesForIncoming(
  catalog: CatalogSnapshot | null,
  snapshot: SimulationSnapshot | null,
  selectedId: string | null,
  enabledSet: Set<string>,
  simulatedUnlockedIds: Set<string>,
): DataTreeRelation[] {
  if (!catalog || !selectedId) return []

  const allNodes = buildDataTreeNodes(catalog).flatMap((group) => group.items)
  return allNodes
    .filter((node) => node.relatedIds.includes(selectedId))
    .map((node) => ({
      id: node.id,
      label: node.label,
      reason: relationReason(catalog, node.id, selectedId),
      kind: relationKind(catalog, node.id, selectedId),
      hidden: !visibilityAllowed(snapshot, catalog, node.id),
      simulatedUnlocked: simulatedUnlockedIds.has(selectedId) && relationKind(catalog, node.id, selectedId) === 'unlock',
      enabled: enabledSet.has(node.id),
    }))
    .sort((left, right) => left.label.localeCompare(right.label))
}

function relationLabel(catalog: CatalogSnapshot | null, id: string) {
  return labelForId(catalog, id)
}

function relationReason(catalog: CatalogSnapshot | null, sourceId: string, targetId: string) {
  return relationKindLabel(catalog, relationKind(catalog, sourceId, targetId))
}

function relationKind(catalog: CatalogSnapshot | null, sourceId: string, targetId: string): RelationKind {
  const uiElement = uiElementFor(catalog, sourceId)
  if (uiElement?.relatedIds.includes(targetId)) {
    return 'related'
  }

  const schema = entitySchemaFor(catalog, sourceId)
  if (!schema) return 'related'

  if (schema.unlocks.some((entry) => entry.relatedIds.includes(targetId))) return 'unlock'
  if (schema.blockers.some((entry) => entry.relatedIds.includes(targetId))) return 'blocker'
  if (schema.accessRules.some((entry) => entry.relatedIds.includes(targetId))) return 'access'
  if (schema.flows.some((entry) => entry.itemId === targetId || entry.relatedIds.includes(targetId))) return 'flow'
  if (schema.modelRefs.some((entry) => entry.referenceId === targetId)) return 'model'
  if (schema.power?.resourceId === targetId) return 'power'
  return 'related'
}

function relationKindLabel(catalog: CatalogSnapshot | null, kind: RelationKind) {
  switch (kind) {
    case 'unlock':
      return uiLabel(catalog, 'ui.data_tree.filter.unlock', UI_COPY.dataTree.filters.unlock)
    case 'blocker':
      return uiLabel(catalog, 'ui.data_tree.filter.blocker', UI_COPY.dataTree.filters.blocker)
    case 'flow':
      return uiLabel(catalog, 'ui.data_tree.filter.flow', UI_COPY.dataTree.filters.flow)
    case 'access':
      return uiLabel(catalog, 'ui.data_tree.filter.access', UI_COPY.dataTree.filters.access)
    case 'power':
      return uiLabel(catalog, 'ui.data_tree.filter.power', UI_COPY.dataTree.filters.power)
    case 'model':
      return uiLabel(catalog, 'ui.data_tree.filter.model', UI_COPY.dataTree.filters.model)
    case 'related':
    default:
      return uiLabel(catalog, 'ui.data_tree.filter.related', UI_COPY.dataTree.filters.related)
  }
}

function dataTreeFilterOptions(catalog: CatalogSnapshot | null): Array<{ id: RelationKind | 'all'; label: string }> {
  return [
    { id: 'all', label: uiLabel(catalog, 'ui.data_tree.filter.all', UI_COPY.dataTree.filters.all) },
    { id: 'unlock', label: uiLabel(catalog, 'ui.data_tree.filter.unlock', UI_COPY.dataTree.filters.unlock) },
    { id: 'blocker', label: uiLabel(catalog, 'ui.data_tree.filter.blocker', UI_COPY.dataTree.filters.blocker) },
    { id: 'flow', label: uiLabel(catalog, 'ui.data_tree.filter.flow', UI_COPY.dataTree.filters.flow) },
    { id: 'access', label: uiLabel(catalog, 'ui.data_tree.filter.access', UI_COPY.dataTree.filters.access) },
    { id: 'power', label: uiLabel(catalog, 'ui.data_tree.filter.power', UI_COPY.dataTree.filters.power) },
    { id: 'model', label: uiLabel(catalog, 'ui.data_tree.filter.model', UI_COPY.dataTree.filters.model) },
    { id: 'related', label: uiLabel(catalog, 'ui.data_tree.filter.related', UI_COPY.dataTree.filters.related) },
  ]
}

function filterDataTreeRelations(
  relations: DataTreeRelation[],
  relationFilter: RelationKind | 'all',
  showHidden: boolean,
) {
  return relations.filter((relation) => {
    if (!showHidden && relation.hidden) return false
    if (relationFilter === 'all') return true
    return relation.kind === relationFilter
  })
}

function directSimulatedUnlockIds(catalog: CatalogSnapshot | null, enabledIds: string[]) {
  const unlocked = new Set<string>()
  for (const id of enabledIds) {
    const schema = entitySchemaFor(catalog, id)
    if (!schema) continue
    for (const entry of schema.unlocks) {
      for (const relatedId of entry.relatedIds) {
        unlocked.add(relatedId)
      }
    }
  }
  return unlocked
}

function buildStoryTimelineTracks(
  catalog: CatalogSnapshot | null,
  snapshot: SimulationSnapshot | null,
  enabledSet: Set<string>,
  simulatedUnlockedIds: Set<string>,
  selectedId: string | null,
): StoryTimelineTrack[] {
  if (!catalog) return []

  const groups = new Map<string, StoryTimelineBeat[]>()

  for (const beat of catalog.storyBeats) {
    const schema = entitySchemaFor(catalog, beat.id)
    const unlockTargets = schema
      ? schema.unlocks
          .flatMap((entry) => entry.relatedIds)
          .filter((relatedId, index, all) => all.indexOf(relatedId) === index)
          .map((relatedId) => relationLabel(catalog, relatedId))
          .slice(0, 3)
      : []

    const nextBeat: StoryTimelineBeat = {
      id: beat.id,
      label: beat.label,
      sequence: beat.sequence,
      hidden: !visibilityAllowed(snapshot, catalog, beat.id),
      enabled: enabledSet.has(beat.id),
      simulatedUnlocked: simulatedUnlockedIds.has(beat.id),
      selected: selectedId === beat.id,
      unlockTargets,
    }

    const current = groups.get(beat.arc) ?? []
    current.push(nextBeat)
    groups.set(beat.arc, current)
  }

  return [...groups.entries()]
    .map(([arc, beats]) => ({
      arc,
      label: storyArcLabel(arc),
      beats: beats.sort((left, right) => left.sequence - right.sequence || left.label.localeCompare(right.label)),
    }))
    .sort((left, right) => storyArcOrder(left.arc) - storyArcOrder(right.arc) || left.label.localeCompare(right.label))
}

function storyArcLabel(arc: string) {
  switch (arc) {
    case 'pre_arrival':
      return 'Pre-Arrival'
    case 'base_onboarding':
      return 'Base Onboarding'
    default:
      return arc
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
  }
}

function storyArcOrder(arc: string) {
  switch (arc) {
    case 'pre_arrival':
      return 10
    case 'base_onboarding':
      return 20
    default:
      return 100
  }
}

function visibilityConditionSummary(
  catalog: CatalogSnapshot | null,
  id: string,
  mode: 'all' | 'any',
) {
  const visibility = visibilityFor(catalog, id)
  if (!visibility) return uiLabel(catalog, 'ui.data_tree.none', UI_COPY.dataTree.none)
  const conditions = mode === 'all' ? visibility.allOf : visibility.anyOf
  if (!conditions.length) return uiLabel(catalog, 'ui.data_tree.none', UI_COPY.dataTree.none)
  return conditions.map((condition) => visibilityConditionLabel(catalog, condition)).join(' · ')
}

function visibilityConditionLabel(
  catalog: CatalogSnapshot | null,
  condition: NonNullable<ReturnType<typeof visibilityFor>>['allOf'][number],
) {
  switch (condition.kind) {
    case 'always':
      return 'always'
    case 'flag_set':
      return `flag ${condition.flag_id}`
    case 'flag_unset':
      return `not ${condition.flag_id}`
    case 'resource_positive':
      return `${relationLabel(catalog, condition.resource_id)} > 0`
    case 'role_assigned':
      return `${relationLabel(catalog, condition.role_id)} assigned`
    case 'role_available':
      return `${relationLabel(catalog, condition.role_id)} available`
    case 'recruitment_enabled':
      return 'recruitment enabled'
    case 'recruitment_disabled':
      return 'recruitment disabled'
    case 'pending_recruits':
      return 'pending recruits'
    case 'recruited_any':
      return 'recruited any'
    case 'brownout_active':
      return 'brownout active'
    default:
      return uiLabel(catalog, 'ui.data_tree.none', UI_COPY.dataTree.none)
  }
}

interface DataTreeFieldProps {
  dataUi: string
  label: string
  value: string
}

function DataTreeField(props: DataTreeFieldProps) {
  return (
    <>
      <dt data-ui={`${props.dataUi}-label`}>{props.label}</dt>
      <dd data-ui={`${props.dataUi}-value`}>{props.value}</dd>
    </>
  )
}

interface DataTreeRelationListProps {
  catalog: CatalogSnapshot | null
  dataUi: string
  items: DataTreeRelation[]
  onSelect(id: string): void
}

function DataTreeRelationList(props: DataTreeRelationListProps) {
  if (!props.items.length) {
    return <div class="data-tree-empty" data-ui={`${props.dataUi}-empty`}>{uiLabel(props.catalog, 'ui.data_tree.none', UI_COPY.dataTree.none)}</div>
  }

  return (
    <div class="data-tree-relation-list" data-ui={props.dataUi}>
      <For each={props.items}>
        {(item) => (
          <button
            class={`data-tree-relation ${item.simulatedUnlocked ? 'data-tree-relation-simulated' : ''} ${
              item.hidden ? 'data-tree-relation-hidden' : ''
            } ${item.enabled ? 'data-tree-relation-enabled' : ''}`}
            data-ui={`${props.dataUi}-${uiId(item.id)}`}
            onClick={() => props.onSelect(item.id)}
          >
            <strong data-ui={`${props.dataUi}-${uiId(item.id)}-label`}>{item.label}</strong>
            <span data-ui={`${props.dataUi}-${uiId(item.id)}-reason`}>{item.reason}</span>
            <div class="data-tree-relation-flags" data-ui={`${props.dataUi}-${uiId(item.id)}-flags`}>
              <span data-ui={`${props.dataUi}-${uiId(item.id)}-flag-kind`}>{relationKindLabel(props.catalog, item.kind)}</span>
              {item.hidden ? (
                <span data-ui={`${props.dataUi}-${uiId(item.id)}-flag-hidden`}>{uiLabel(props.catalog, 'ui.data_tree.hidden', UI_COPY.dataTree.hiddenNode)}</span>
              ) : null}
              {item.enabled ? (
                <span data-ui={`${props.dataUi}-${uiId(item.id)}-flag-enabled`}>{uiLabel(props.catalog, 'ui.data_tree.graph.enabled', UI_COPY.dataTree.graphEnabled)}</span>
              ) : null}
              {item.simulatedUnlocked ? (
                <span data-ui={`${props.dataUi}-${uiId(item.id)}-flag-simulated`}>{uiLabel(props.catalog, 'ui.data_tree.graph.simulated', UI_COPY.dataTree.simulatedUnlock)}</span>
              ) : null}
            </div>
          </button>
        )}
      </For>
    </div>
  )
}

function visibleTopResources(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return []

  return TOP_RESOURCE_IDS.filter((resourceId) => shouldShowTopResource(snapshot, catalog, resourceId)).map((resourceId) => ({
    id: resourceId,
    label: topResourceLabel(catalog, resourceId),
    value: topResourceValue(snapshot, resourceId),
  }))
}

function shouldShowTopResource(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null, resourceId: string) {
  return visibilityAllowed(snapshot, catalog, resourceId)
}

function topResourceLabel(catalog: CatalogSnapshot | null, resourceId: string) {
  switch (resourceId) {
    case RESOURCE_BASSLINE:
      return resourceLabel(catalog, RESOURCE_BASSLINE, UI_COPY.crystal.bands.bassline)
    case RESOURCE_CHORUS:
      return resourceLabel(catalog, RESOURCE_CHORUS, UI_COPY.crystal.bands.chorus)
    case RESOURCE_HARMONICS:
      return resourceLabel(catalog, RESOURCE_HARMONICS, UI_COPY.crystal.bands.harmonics)
    case RESOURCE_STONE:
      return resourceLabel(catalog, RESOURCE_STONE, UI_COPY.base.stone)
    case RESOURCE_WATER:
      return resourceLabel(catalog, RESOURCE_WATER, UI_COPY.base.water)
    case RESOURCE_VIBES:
      return resourceLabel(catalog, RESOURCE_VIBES, UI_COPY.base.vibes)
    default:
      return 'Resource'
  }
}

function topResourceValue(snapshot: SimulationSnapshot, resourceId: string) {
  switch (resourceId) {
    case RESOURCE_BASSLINE:
      return `${snapshot.resources.bassline.toFixed(1)} / ${snapshot.resources.basslineCap.toFixed(0)}`
    case RESOURCE_CHORUS:
      return `${snapshot.resources.chorus.toFixed(1)} / ${snapshot.resources.chorusCap.toFixed(0)}`
    case RESOURCE_HARMONICS:
      return `${snapshot.resources.harmonics.toFixed(1)} / ${snapshot.resources.harmonicsCap.toFixed(0)}`
    case RESOURCE_STONE:
      return `${snapshot.resources.stone.toFixed(0)} / ${snapshot.resources.stoneCap.toFixed(0)}`
    case RESOURCE_WATER:
      return `${snapshot.resources.water.toFixed(1)} / ${snapshot.resources.waterCap.toFixed(0)}L`
    case RESOURCE_VIBES:
      return `${snapshot.resources.vibes.toFixed(1)} / ${snapshot.resources.vibesCap.toFixed(0)}`
    default:
      return '--'
  }
}

function shouldShowCrystalBand(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null, roleId: string) {
  return visibilityAllowed(snapshot, catalog, roleId)
}

function visibleBasslineDetailRows(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  const rows = [
    {
      key: 'output',
      label: uiLabel(catalog, UI_METRIC_CRYSTAL_OUTPUT_LEVEL, UI_COPY.crystal.output),
      value: `Lv ${snapshot?.crystalCircle.outputLevel ?? 0}`,
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_CRYSTAL_OUTPUT_LEVEL),
    },
    {
      key: 'field-polish',
      label: uiLabel(catalog, UI_METRIC_CRYSTAL_FIELD_POLISH, UI_COPY.crystal.fieldPolish),
      value: `Lv ${snapshot?.crystalCircle.fieldPolishLevel ?? 0}`,
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_CRYSTAL_FIELD_POLISH),
    },
    {
      key: 'budget',
      label: uiLabel(catalog, UI_METRIC_CRYSTAL_BUBBLE_BUDGET, UI_COPY.crystal.bubbleBudget),
      value: snapshot
        ? `${snapshot.bubble.activeCoverageCost.toFixed(1)} / ${snapshot.bubble.fieldBudget.toFixed(1)}`
        : '--',
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_CRYSTAL_BUBBLE_BUDGET),
    },
    {
      key: 'source',
      label: uiLabel(catalog, UI_METRIC_CRYSTAL_SOURCE, UI_COPY.common.source),
      value: basslineSourceLabel(snapshot, catalog),
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_CRYSTAL_SOURCE),
    },
    {
      key: 'sink',
      label: uiLabel(catalog, UI_METRIC_CRYSTAL_SINK, UI_COPY.common.sink),
      value: basslineSinkLabel(snapshot, catalog),
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_CRYSTAL_SINK),
    },
    {
      key: 'risk',
      label: uiLabel(catalog, UI_METRIC_CRYSTAL_RISK, UI_COPY.common.risk),
      value: basslineRiskLabel(snapshot),
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_CRYSTAL_RISK),
    },
  ]

  return rows.filter((row) => row.visible).map(({ visible: _visible, ...row }) => row)
}

function visibleChorusDetailRows(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  const rows = [
    {
      key: 'output',
      label: uiLabel(catalog, UI_METRIC_CRYSTAL_OUTPUT_LEVEL, UI_COPY.crystal.output),
      value: `Lv ${snapshot?.crystalCircle.outputLevel ?? 0}`,
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_CRYSTAL_OUTPUT_LEVEL),
    },
    {
      key: 'rate',
      label: uiLabel(catalog, UI_METRIC_CHORUS_RATE, UI_COPY.crystal.rate),
      value: `${snapshot?.power.chorusGenerationPerSecond.toFixed(2) ?? '0.00'}/s`,
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_CHORUS_RATE),
    },
    {
      key: 'upkeep',
      label: uiLabel(catalog, UI_METRIC_CHORUS_STATION_UPKEEP, UI_COPY.crystal.stations),
      value: `${snapshot?.power.activeUpkeepPerSecond.toFixed(2) ?? '0.00'}/s`,
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_CHORUS_STATION_UPKEEP),
    },
    {
      key: 'life-support',
      label: uiLabel(catalog, UI_METRIC_POWER_LIFE_SUPPORT, UI_COPY.crystal.lifeSupport),
      value: `${snapshot?.power.lifeSupportUpkeepPerSecond.toFixed(2) ?? '0.00'}/s`,
      visible: shouldShowLifeSupportMetric(snapshot, catalog),
    },
    {
      key: 'source',
      label: uiLabel(catalog, UI_METRIC_CHORUS_SOURCE, UI_COPY.common.source),
      value: chorusSourceLabel(snapshot, catalog),
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_CHORUS_SOURCE),
    },
    {
      key: 'sink',
      label: uiLabel(catalog, UI_METRIC_CHORUS_SINK, UI_COPY.common.sink),
      value: chorusSinkLabel(snapshot, catalog),
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_CHORUS_SINK),
    },
    {
      key: 'risk',
      label: uiLabel(catalog, UI_METRIC_CHORUS_RISK, UI_COPY.common.risk),
      value: chorusRiskLabel(snapshot, catalog),
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_CHORUS_RISK),
    },
  ]

  return rows.filter((row) => row.visible).map(({ visible: _visible, ...row }) => row)
}

function visibleHarmonicsDetailRows(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  const rows = [
    {
      key: 'output',
      label: uiLabel(catalog, UI_METRIC_CRYSTAL_OUTPUT_LEVEL, UI_COPY.crystal.output),
      value: `Lv ${snapshot?.crystalCircle.outputLevel ?? 0}`,
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_CRYSTAL_OUTPUT_LEVEL),
    },
    {
      key: 'tier',
      label: uiLabel(catalog, UI_METRIC_HARMONICS_TIER, UI_COPY.crystal.tier),
      value: harmonicsTierLabel(snapshot),
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_HARMONICS_TIER),
    },
    {
      key: 'efficiency',
      label: uiLabel(catalog, UI_METRIC_HARMONICS_EFFICIENCY, UI_COPY.crystal.boost),
      value: `x${snapshot?.power.harmonicsEfficiencyMultiplier.toFixed(2) ?? '1.00'}`,
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_HARMONICS_EFFICIENCY),
    },
    {
      key: 'source',
      label: uiLabel(catalog, UI_METRIC_HARMONICS_SOURCE, UI_COPY.common.source),
      value: harmonicsSourceLabel(snapshot, catalog),
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_HARMONICS_SOURCE),
    },
    {
      key: 'sink',
      label: uiLabel(catalog, UI_METRIC_HARMONICS_SINK, UI_COPY.common.sink),
      value: harmonicsSinkLabel(snapshot, catalog),
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_HARMONICS_SINK),
    },
    {
      key: 'risk',
      label: uiLabel(catalog, UI_METRIC_HARMONICS_RISK, UI_COPY.common.risk),
      value: harmonicsRiskLabel(snapshot, catalog),
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_HARMONICS_RISK),
    },
  ]

  return rows.filter((row) => row.visible).map(({ visible: _visible, ...row }) => row)
}

function shouldShowConstructionOption(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null, option: ConstructionOptionDef) {
  if (!snapshot) return false
  if (activeConstructionForOption(snapshot, option.id)) return true
  return visibilityAllowed(snapshot, catalog, option.id)
}

function shouldShowPowerPanel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  return visibilityAllowed(snapshot, catalog, UI_PANEL_POWER)
}

function shouldShowCrystalPanel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  return visibilityAllowed(snapshot, catalog, UI_PANEL_CRYSTAL)
}

function shouldShowConstructionPanel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  return visibilityAllowed(snapshot, catalog, UI_PANEL_CONSTRUCTION)
}

function shouldShowBasePanel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  return visibilityAllowed(snapshot, catalog, UI_PANEL_BASE)
}

function shouldShowLifeSupportMetric(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  return visibilityAllowed(snapshot, catalog, UI_METRIC_POWER_LIFE_SUPPORT)
}

function shouldShowBrownoutMetric(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  return visibilityAllowed(snapshot, catalog, UI_METRIC_POWER_BROWNOUT)
}

function shouldShowStationPowerCard(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null, stationId: string) {
  return visibilityAllowed(snapshot, catalog, stationId)
}

function shouldShowProcessingRecipe(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null, recipe: ProcessingRecipeDef) {
  if (!snapshot) return false
  return Boolean(snapshot.processing.activeJobs[recipe.stationId]) || visibilityAllowed(snapshot, catalog, recipe.id)
}

function shouldShowWorldAction(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null, action: WorldActionDef) {
  if (!snapshot) return false
  return activeWorldActionForId(snapshot, action.id) || visibilityAllowed(snapshot, catalog, action.id)
}

function activeNarrativeBeat(
  catalog: CatalogSnapshot | null,
  snapshot: SimulationSnapshot | null,
): StoryBeatDef | null {
  if (!catalog || !snapshot?.narrative.activeBeatId) return null
  return catalog.storyBeats.find((beat) => beat.id === snapshot.narrative.activeBeatId) ?? null
}

function selectedNarrativeChoice(
  catalog: CatalogSnapshot | null,
  snapshot: SimulationSnapshot | null,
  beat: StoryBeatDef | null,
  pendingChoiceId: string | null,
) {
  if (!catalog || !snapshot || !beat) return null
  const choiceId = snapshot.narrative.choiceByBeat[beat.id] ?? pendingChoiceId
  if (!choiceId) return null
  return beat.choices.find((choice) => choice.id === choiceId) ?? null
}

function visibleBaseMetrics(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return []

  const metrics = [
    {
      key: 'stone',
      dataUi: 'game-base-stone',
      label: resourceLabel(catalog, RESOURCE_STONE, UI_COPY.base.stone),
      value: `${snapshot.resources.stone.toFixed(0)} / ${snapshot.resources.stoneCap.toFixed(0)}`,
      visible: visibilityAllowed(snapshot, catalog, RESOURCE_STONE),
    },
    {
      key: 'stock',
      dataUi: 'game-base-stock',
      label: uiLabel(catalog, UI_METRIC_BASE_STONE_STOCK, UI_COPY.base.stoneStock),
      value: `${snapshot.resources.baseStoneStock.toFixed(0)}`,
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_BASE_STONE_STOCK),
    },
    {
      key: 'vibes',
      dataUi: 'game-base-vibes',
      label: resourceLabel(catalog, RESOURCE_VIBES, UI_COPY.base.vibes),
      value: `${snapshot.resources.vibes.toFixed(1)} / ${snapshot.resources.vibesCap.toFixed(0)}`,
      visible: visibilityAllowed(snapshot, catalog, RESOURCE_VIBES),
    },
    {
      key: 'water',
      dataUi: 'game-base-water',
      label: resourceLabel(catalog, RESOURCE_WATER, UI_COPY.base.water),
      value: `${snapshot.resources.water.toFixed(1)} / ${snapshot.resources.waterCap.toFixed(0)}L`,
      visible: visibilityAllowed(snapshot, catalog, RESOURCE_WATER),
    },
    {
      key: 'water-stock',
      dataUi: 'game-base-water-stock',
      label: uiLabel(catalog, UI_METRIC_BASE_WATER_STOCK, UI_COPY.base.waterStock),
      value: `${snapshot.resources.baseWaterStock.toFixed(1)} / ${(catalog?.balance.water.baseStockMax ?? 30).toFixed(0)}L`,
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_BASE_WATER_STOCK),
    },
    {
      key: 'next-recruit',
      dataUi: 'game-base-next-recruit',
      label: uiLabel(catalog, UI_METRIC_BASE_RECRUIT_COST, UI_COPY.base.recruitCost),
      value: `${snapshot.recruitment.nextRecruitCost.toFixed(0)} V`,
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_BASE_RECRUIT_COST),
    },
    {
      key: 'bunks',
      dataUi: 'game-base-bunks',
      label: uiLabel(catalog, UI_METRIC_BASE_BUNKS, UI_COPY.base.bunks),
      value: `${snapshot.base.occupantCount} / ${snapshot.base.bunksCapacity}`,
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_BASE_BUNKS),
    },
    {
      key: 'housing',
      dataUi: 'game-base-bunks-pressure',
      label: uiLabel(catalog, UI_METRIC_BASE_HOUSING, UI_COPY.base.housing),
      value: snapshot.base.missingBunks > 0 ? `${snapshot.base.missingBunks} missing` : `${snapshot.base.freeBunks} free`,
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_BASE_HOUSING),
    },
    {
      key: 'bad-vibes',
      dataUi: 'game-base-bad-vibes',
      label: uiLabel(catalog, UI_METRIC_BASE_BAD_VIBES, UI_COPY.base.moraleDrain),
      value: `${snapshot.base.effectiveBadVibesRate.toFixed(1)}/s`,
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_BASE_BAD_VIBES),
    },
    {
      key: 'crew-efficiency',
      dataUi: 'game-base-crew-efficiency',
      label: uiLabel(catalog, UI_METRIC_BASE_CREW_EFFICIENCY, UI_COPY.base.crewSpeed),
      value: `x${snapshot.base.crewEfficiencyMultiplier.toFixed(2)}`,
      visible: visibilityAllowed(snapshot, catalog, UI_METRIC_BASE_CREW_EFFICIENCY),
    },
  ]

  return metrics.filter((metric) => metric.visible)
}

function shouldShowBaseRoleControl(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null, roleId: string) {
  if (!snapshot) return false
  const uiIdForRole =
    roleId === ROLE_SCAVENGE
      ? UI_CONTROL_BASE_SCAVENGE
      : roleId === ROLE_FIRE_PIT
        ? UI_CONTROL_BASE_FIRE_PIT
        : roleId === ROLE_WATER
          ? UI_CONTROL_BASE_WATER
          : roleId

  return visibilityAllowed(snapshot, catalog, uiIdForRole)
}

function shouldShowRecruitAction(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  return visibilityAllowed(snapshot, catalog, UI_ACTION_RECRUIT)
}

function visibleBaseStatusItems(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null, firePitWorkers: number) {
  if (!snapshot) return []

  const items = [
    {
      key: 'studio',
      dataUi: 'game-base-status-studio',
      visible: visibilityAllowed(snapshot, catalog, UI_STATUS_BASE_STUDIO),
      value: snapshot.base.studioRestored
        ? UI_COPY.base.studioRestored(snapshot.base.bunksCapacity)
        : snapshot.base.studioRestoreUnlocked
          ? UI_COPY.base.studioDamagedReady
          : UI_COPY.base.studioDamagedTutorial,
    },
    {
      key: 'fire-pit',
      dataUi: 'game-base-status-fire-pit',
      visible: visibilityAllowed(snapshot, catalog, UI_STATUS_BASE_FIRE_PIT),
      value: snapshot.base.firePitBuilt
        ? UI_COPY.base.firePitBuilt(firePitWorkers)
        : UI_COPY.base.firePitNotBuilt,
    },
    {
      key: 'recruits',
      dataUi: 'game-base-status-recruits',
      visible: visibilityAllowed(snapshot, catalog, UI_STATUS_BASE_RECRUITS),
      value: UI_COPY.base.pendingInstant(snapshot.recruitment.pendingRecruits.length, instantRecruitStock(snapshot)),
    },
    {
      key: 'overcrowding',
      dataUi: 'game-base-status-overcrowding',
      visible: visibilityAllowed(snapshot, catalog, UI_STATUS_BASE_HOUSING),
      value: snapshot.base.effectiveBadVibesRate > 0
        ? UI_COPY.base.overcrowded(snapshot.base.badVibesMultiplier)
        : UI_COPY.base.housingStable,
    },
  ]

  return items.filter((item) => item.visible)
}

function roleDefFor(catalog: CatalogSnapshot | null, roleId: string) {
  return catalog?.roles.find((role) => role.id === roleId) ?? null
}

function resourceDefFor(catalog: CatalogSnapshot | null, resourceId: string) {
  return catalog?.resources.find((resource) => resource.id === resourceId) ?? null
}

function stationDefFor(catalog: CatalogSnapshot | null, stationId: string) {
  return catalog?.stations.find((station) => station.id === stationId) ?? null
}

function constructionOptionDefFor(catalog: CatalogSnapshot | null, optionId: string) {
  return catalog?.constructionOptions.find((option) => option.id === optionId) ?? null
}

function processingRecipeDefFor(catalog: CatalogSnapshot | null, recipeId: string) {
  return catalog?.processingRecipes.find((recipe) => recipe.id === recipeId) ?? null
}

function worldActionDefFor(catalog: CatalogSnapshot | null, actionId: string) {
  return catalog?.worldActions.find((action) => action.id === actionId) ?? null
}

function storyBeatDefFor(catalog: CatalogSnapshot | null, beatId: string) {
  return catalog?.storyBeats.find((beat) => beat.id === beatId) ?? null
}

function entitySchemaFor(catalog: CatalogSnapshot | null, entityId: string) {
  return catalog?.entitySchemas.find((schema) => schema.id === entityId) ?? null
}

function uiElementFor(catalog: CatalogSnapshot | null, elementId: string) {
  return catalog?.uiElements.find((element) => element.id === elementId) ?? null
}

function presentationFor(catalog: CatalogSnapshot | null, entityId: string) {
  return entitySchemaFor(catalog, entityId)?.presentation ?? uiElementFor(catalog, entityId)?.presentation ?? null
}

function visibilityFor(catalog: CatalogSnapshot | null, id: string) {
  return entitySchemaFor(catalog, id)?.visibility ?? uiElementFor(catalog, id)?.visibility ?? null
}

function presentationAllowed(reveal: 'default' | 'advanced' | 'debug') {
  return reveal !== 'debug'
}

function visibilityConditionMet(
  snapshot: SimulationSnapshot | null,
  condition: NonNullable<ReturnType<typeof visibilityFor>>['allOf'][number],
) {
  if (!snapshot) return false

  switch (condition.kind) {
    case 'always':
      return true
    case 'flag_set':
      return flagState(snapshot, condition.flag_id)
    case 'flag_unset':
      return !flagState(snapshot, condition.flag_id)
    case 'resource_positive':
      return resourceAmountForId(snapshot, condition.resource_id) > 0
    case 'viral_load_positive':
      return snapshot.heroSurvival.viralLoadRatio > 0
    case 'hero_outside_bubble':
      return snapshot.heroSurvival.location === 'outside_bubble'
    case 'hero_forced_return':
      return snapshot.heroSurvival.forcedReturn !== null
    case 'hero_recovering':
      return snapshot.heroSurvival.forcedReturn?.phase === 'recover_at_studio'
    case 'echo_scars_positive':
      return snapshot.heroSurvival.echoScars > 0
    case 'role_assigned':
      return workerCount(snapshot, condition.role_id) > 0
    case 'role_available':
      return roleAvailable(snapshot, condition.role_id)
    case 'recruitment_enabled':
      return snapshot.objectives.recruitmentEnabled
    case 'recruitment_disabled':
      return !snapshot.objectives.recruitmentEnabled
    case 'pending_recruits':
      return snapshot.recruitment.pendingRecruits.length > 0
    case 'recruited_any':
      return snapshot.recruitment.totalRecruitedThisRun > 0
    case 'brownout_active':
      return snapshot.power.brownoutActive
    default:
      return false
  }
}

function visibilityAllowed(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null, id: string) {
  const visibility = visibilityFor(catalog, id)
  if (!visibility) {
    if (catalog?.flags.some((flag) => flag.id === id) || catalog?.models.some((model) => model.id === id)) {
      return true
    }
    return false
  }

  const allSatisfied = visibility.allOf.every((condition) => visibilityConditionMet(snapshot, condition))
  const anySatisfied =
    visibility.anyOf.length === 0 ||
    visibility.anyOf.some((condition) => visibilityConditionMet(snapshot, condition))

  return allSatisfied && anySatisfied
}

const BLOCKER_PRIORITY: Record<string, number> = {
  missing_requirement: 100,
  missing_power: 90,
  missing_resource: 80,
  missing_staff: 70,
  busy: 60,
  reach_locked: 50,
  inaccessible: 40,
  out_of_bubble: 35,
  occluded: 30,
  blocked_at_cap: 20,
  offline_disabled: 10,
}

const UNLOCK_PRIORITY: Record<string, number> = {
  story: 100,
  construction: 90,
  station: 80,
  power: 70,
  reach: 60,
  processing: 50,
}

const FLOW_PRIORITY: Record<string, Record<string, number>> = {
  output: {
    while_staffed: 100,
    per_second: 90,
    passive: 80,
    on_complete: 70,
    while_powered: 60,
    per_worker_second: 50,
    on_start: 40,
    unlock: 30,
  },
  input: {
    while_powered: 100,
    per_worker_second: 90,
    on_start: 80,
    per_second: 70,
    while_staffed: 60,
    passive: 50,
    on_complete: 40,
    unlock: 30,
  },
  pressure: {
    per_second: 100,
    while_powered: 90,
    while_staffed: 80,
    passive: 70,
    on_start: 60,
    on_complete: 50,
    per_worker_second: 40,
    unlock: 30,
  },
  capacity: {
    passive: 100,
    on_complete: 90,
    unlock: 80,
    per_second: 70,
    while_powered: 60,
    while_staffed: 50,
    per_worker_second: 40,
    on_start: 30,
  },
  unlock: {
    unlock: 100,
    on_complete: 90,
    on_start: 80,
    passive: 70,
    per_second: 60,
    while_powered: 50,
    while_staffed: 40,
    per_worker_second: 30,
  },
}

function compactLabel(label: string) {
  return label.replace(/\.$/, '')
}

function schemaCandidates<T>(
  catalog: CatalogSnapshot | null,
  entityIds: string[],
  pick: (schema: CatalogSnapshot['entitySchemas'][number]) => T[],
) {
  return entityIds.flatMap((entityId, entityIndex) => {
    const schema = entitySchemaFor(catalog, entityId)
    if (!schema) return []
    return pick(schema).map((item, itemIndex) => ({
      item,
      entityIndex,
      itemIndex,
      displayPriority:
        schema.presentation && presentationAllowed(schema.presentation.reveal)
          ? schema.presentation.displayPriority
          : 0,
    }))
  })
}

function bestSchemaLabel<T extends { label: string }>(
  candidates: Array<{ item: T; entityIndex: number; itemIndex: number; displayPriority: number }>,
  priorityFor: (item: T) => number,
) {
  const ranked = candidates
    .slice()
    .sort((left, right) => {
      const displayPriorityDelta = right.displayPriority - left.displayPriority
      if (displayPriorityDelta !== 0) return displayPriorityDelta
      const priorityDelta = priorityFor(right.item) - priorityFor(left.item)
      if (priorityDelta !== 0) return priorityDelta
      const entityDelta = left.entityIndex - right.entityIndex
      if (entityDelta !== 0) return entityDelta
      const lengthDelta = left.item.label.length - right.item.label.length
      if (lengthDelta !== 0) return lengthDelta
      return left.itemIndex - right.itemIndex
    })

  return ranked[0] ? compactLabel(ranked[0].item.label) : null
}

function bestPresentationText(
  catalog: CatalogSnapshot | null,
  entityIds: string[],
  pick: (presentation: NonNullable<ReturnType<typeof presentationFor>>) => string | null,
) {
  const ranked = entityIds
    .map((entityId, entityIndex) => ({ entityId, entityIndex, presentation: presentationFor(catalog, entityId) }))
    .filter((entry): entry is { entityId: string; entityIndex: number; presentation: NonNullable<ReturnType<typeof presentationFor>> } =>
      Boolean(entry.presentation && presentationAllowed(entry.presentation.reveal)),
    )
    .map((entry) => ({
      text: pick(entry.presentation),
      entityIndex: entry.entityIndex,
      displayPriority: entry.presentation.displayPriority,
    }))
    .filter((entry): entry is { text: string; entityIndex: number; displayPriority: number } => Boolean(entry.text && entry.text.trim()))
    .sort((left, right) => {
      const priorityDelta = right.displayPriority - left.displayPriority
      if (priorityDelta !== 0) return priorityDelta
      const lengthDelta = left.text.length - right.text.length
      if (lengthDelta !== 0) return lengthDelta
      return left.entityIndex - right.entityIndex
    })

  return ranked[0]?.text ?? null
}

function presentationHint(catalog: CatalogSnapshot | null, entityIds: string[]) {
  return bestPresentationText(catalog, entityIds, (presentation) => presentation.playerHint)
}

function presentationCta(catalog: CatalogSnapshot | null, entityIds: string[], fallback: string) {
  return bestPresentationText(catalog, entityIds, (presentation) => presentation.ctaCopy) ?? fallback
}

function presentationRisk(catalog: CatalogSnapshot | null, entityIds: string[]) {
  return bestPresentationText(catalog, entityIds, (presentation) => presentation.primaryRiskCopy)
}

function uiLabel(catalog: CatalogSnapshot | null, id: string, fallback: string) {
  return presentationFor(catalog, id)?.shortLabel ?? uiElementFor(catalog, id)?.label ?? fallback
}

function resourceLabel(catalog: CatalogSnapshot | null, resourceId: string, fallback: string) {
  return presentationFor(catalog, resourceId)?.shortLabel ?? resourceDefFor(catalog, resourceId)?.label ?? fallback
}

function stationLabel(catalog: CatalogSnapshot | null, stationId: string, fallback: string) {
  return presentationFor(catalog, stationId)?.shortLabel ?? stationDefFor(catalog, stationId)?.label ?? fallback
}

function labelForId(catalog: CatalogSnapshot | null, id: string, fallback?: string) {
  return (
    presentationFor(catalog, id)?.shortLabel ??
    uiElementFor(catalog, id)?.label ??
    resourceDefFor(catalog, id)?.label ??
    roleDefFor(catalog, id)?.label ??
    stationDefFor(catalog, id)?.label ??
    constructionOptionDefFor(catalog, id)?.label ??
    processingRecipeDefFor(catalog, id)?.label ??
    worldActionDefFor(catalog, id)?.label ??
    storyBeatDefFor(catalog, id)?.label ??
    catalog?.flags.find((flag) => flag.id === id)?.label ??
    catalog?.models.find((model) => model.id === id)?.label ??
    catalog?.tiles.find((tile) => tile.id === id)?.label ??
    catalog?.flora.find((flora) => flora.id === id)?.label ??
    catalog?.structures.find((structure) => structure.id === id)?.label ??
    fallback ??
    id
  )
}

function schemaBlockerText(catalog: CatalogSnapshot | null, entityIds: string[]) {
  const candidates = schemaCandidates(catalog, entityIds, (schema) => schema?.blockers ?? [])
  return bestSchemaLabel(candidates, (blocker) => BLOCKER_PRIORITY[blocker.kind] ?? 0)
}

function schemaUnlockText(catalog: CatalogSnapshot | null, entityIds: string[]) {
  const candidates = schemaCandidates(catalog, entityIds, (schema) => schema?.unlocks ?? [])
  return bestSchemaLabel(candidates, (unlock) => UNLOCK_PRIORITY[unlock.kind] ?? 0)
}

function schemaFlowText(
  catalog: CatalogSnapshot | null,
  entityIds: string[],
  direction: 'input' | 'output' | 'capacity' | 'pressure' | 'unlock',
) {
  const candidates = schemaCandidates(catalog, entityIds, (schema) =>
    (schema?.flows ?? []).filter((flow) => flow.direction === direction),
  )
  return bestSchemaLabel(candidates, (flow) => FLOW_PRIORITY[direction][flow.cadence] ?? 0)
}

function maxCrewForRole(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null, roleId: string) {
  const role = roleDefFor(catalog, roleId)
  if (!snapshot || !role) return 0
  if (!roleAvailable(snapshot, roleId)) return 0

  const assignedElsewhere = Object.entries(snapshot.roster.crewByRole).reduce(
    (sum, [currentRoleId, crew]) => sum + (currentRoleId === roleId ? 0 : crew),
    0,
  )
  const remainingCrewIncludingCurrent = Math.max(0, snapshot.roster.totalCrew - assignedElsewhere)

  if (role.slotPool === 'crystal_circle') {
    const crystalCapacity = Math.max(
      0,
      snapshot.crystalCircle.baseSlots + snapshot.crystalCircle.slotCapacityLevel,
    )
    const usedCrystalElsewhere =
      crewCount(snapshot, ROLE_CRYSTAL_BASSLINE) +
      crewCount(snapshot, ROLE_CRYSTAL_CHORUS) +
      crewCount(snapshot, ROLE_CRYSTAL_HARMONICS) -
      crewCount(snapshot, roleId)
    return Math.min(remainingCrewIncludingCurrent, Math.max(0, crystalCapacity - usedCrystalElsewhere))
  }

  if (role.slotPool === 'fire_pit') {
    const firePitCapacity = snapshot.base.firePitBuilt
      ? Math.max(0, catalog?.balance.crystal.firePitCrewSlots ?? 2)
      : 0
    return Math.min(remainingCrewIncludingCurrent, firePitCapacity)
  }

  return remainingCrewIncludingCurrent
}

function stationPowered(snapshot: SimulationSnapshot | null, stationId: string) {
  return Boolean(snapshot?.stations?.[stationId]?.isPowered)
}

function stationRequested(snapshot: SimulationSnapshot | null, stationId: string) {
  return Boolean(snapshot?.stations?.[stationId]?.requestedEnabled)
}

interface ActionUiState {
  enabled: boolean
  value: string
}

function requirementMet(snapshot: SimulationSnapshot, requirement: { kind: 'flag_set' | 'flag_unset'; flag_id: string }) {
  const value = flagState(snapshot, requirement.flag_id)
  return requirement.kind === 'flag_set' ? value : !value
}

function requirementsMet(
  snapshot: SimulationSnapshot | null,
  requirements: Array<{ kind: 'flag_set' | 'flag_unset'; flag_id: string }>,
) {
  if (!snapshot) return false
  return requirements.every((requirement) => requirementMet(snapshot, requirement))
}

function flagState(snapshot: SimulationSnapshot, flagId: string) {
  switch (flagId) {
    case 'base.studio_restore_unlocked':
      return snapshot.base.studioRestoreUnlocked
    case 'base.studio_restored':
      return snapshot.base.studioRestored
    case 'base.fire_pit_built':
      return snapshot.base.firePitBuilt
    case 'base.resonance_chamber_built':
      return snapshot.base.resonanceChamberBuilt
    case 'base.mix_console_built':
      return snapshot.base.mixConsoleBuilt
    case 'base.workshop_built':
      return snapshot.base.workshopBuilt
    case 'base.research_booth_built':
      return snapshot.base.researchBoothBuilt
    case 'base.tutorial_investigated':
      return snapshot.base.tutorialInvestigated
    case 'base.tutorial_explored':
      return snapshot.base.tutorialExplored
    case 'base.water_collection_unlocked':
      return snapshot.base.waterCollectionUnlocked
    case 'crystal.removing_moss_unlocked':
      return snapshot.crystalCircle.removingMossUnlocked
    case 'crystal.removing_moss_completed':
      return snapshot.crystalCircle.removingMossCompleted
    case FLAG_HERO_OUTSIDE_BUBBLE:
      return snapshot.heroSurvival.location === 'outside_bubble'
    case FLAG_HERO_FORCED_RETURN_ACTIVE:
      return snapshot.heroSurvival.forcedReturn !== null
    case FLAG_HERO_RECOVERING_AT_STUDIO:
      return snapshot.heroSurvival.forcedReturn?.phase === 'recover_at_studio'
    default:
      return false
  }
}

function canAffordCost(snapshot: SimulationSnapshot | null, cost: ConstructionOptionDef['cost'] | ProcessingRecipeDef['cost']) {
  if (!snapshot) return false
  if (cost.kind === 'time_only' || cost.kind === 'drain_per_worker_second') return true
  if (cost.kind === 'upfront') {
    return resourceAmountForId(snapshot, cost.resource_id ?? '') >= (cost.amount ?? 0)
  }
  return (cost.costs ?? []).every((item) => costItemAmountForId(snapshot, item.item_id) >= item.amount)
}

function missingCostLabel(snapshot: SimulationSnapshot | null, cost: ConstructionOptionDef['cost'] | ProcessingRecipeDef['cost']) {
  if (!snapshot) return UI_COPY.common.unavailable
  if (cost.kind === 'upfront') {
    const needed = Math.max(0, (cost.amount ?? 0) - resourceAmountForId(snapshot, cost.resource_id ?? ''))
    return `Need ${needed.toFixed(0)} ${resourceShortLabel(cost.resource_id ?? '')}`
  }
  if (cost.kind === 'upfront_bundle') {
    const missing = (cost.costs ?? []).find((item) => costItemAmountForId(snapshot, item.item_id) < item.amount)
    if (missing) {
      const needed = Math.max(0, missing.amount - costItemAmountForId(snapshot, missing.item_id))
      return `Need ${needed.toFixed(0)} ${resourceShortLabel(missing.item_id)}`
    }
  }
  return UI_COPY.common.unavailable
}

function resourceAmountForId(snapshot: SimulationSnapshot, resourceId: string) {
  switch (resourceId) {
    case 'resource.bassline':
      return snapshot.resources.bassline
    case 'resource.chorus':
      return snapshot.resources.chorus
    case 'resource.harmonics':
      return snapshot.resources.harmonics
    case 'resource.stone':
      return snapshot.resources.stone
    case 'resource.water':
      return snapshot.resources.water
    case 'resource.vibes':
      return snapshot.resources.vibes
    default:
      return 0
  }
}

function costItemAmountForId(snapshot: SimulationSnapshot, itemId: string) {
  if (itemId === 'cost.skin') return snapshot.base.skins
  return resourceAmountForId(snapshot, itemId)
}

function resourceShortLabel(id: string) {
  switch (id) {
    case 'resource.bassline':
      return UI_COPY.crystal.bands.bassline
    case 'resource.chorus':
      return UI_COPY.crystal.bands.chorus
    case 'resource.harmonics':
      return UI_COPY.crystal.bands.harmonics
    case 'resource.stone':
      return UI_COPY.base.stone
    case 'resource.water':
      return UI_COPY.base.water
    case 'resource.vibes':
      return UI_COPY.base.vibes
    case 'cost.skin':
      return 'Skin'
    default:
      return 'resource'
  }
}

function constructionActionState(
  snapshot: SimulationSnapshot | null,
  catalog: CatalogSnapshot | null,
  option: ConstructionOptionDef,
) : ActionUiState {
  if (!snapshot) return { enabled: false, value: '--' }
  if (activeConstructionForOption(snapshot, option.id)) {
    return {
      enabled: false,
      value: progressCountdownLabel(
        snapshot.activeConstruction!.totalWorkSeconds,
        snapshot.activeConstruction!.remainingWorkSeconds,
        'work',
      ),
    }
  }
  if (snapshot.activeConstruction) {
    return { enabled: false, value: `Busy: ${labelForId(catalog, snapshot.activeConstruction.optionId, UI_COPY.common.currentProject)}` }
  }
  if (!requirementsMet(snapshot, option.requirements)) {
    return {
      enabled: false,
      value: schemaUnlockText(catalog, [option.id]) ?? schemaBlockerText(catalog, [option.id]) ?? UI_COPY.common.locked,
    }
  }
  if (!canAffordCost(snapshot, option.cost)) {
    return { enabled: false, value: missingCostLabel(snapshot, option.cost) }
  }
  return { enabled: true, value: optionCurrentValue(snapshot, option) }
}

function optionCurrentValue(snapshot: SimulationSnapshot, option: ConstructionOptionDef) {
  switch (option.id) {
    case 'construction.slot_capacity':
      return `${UI_COPY.hero.levelPrefix}. ${snapshot.crystalCircle.slotCapacityLevel}`
    case 'construction.output':
      return `${UI_COPY.hero.levelPrefix}. ${snapshot.crystalCircle.outputLevel}`
    case 'construction.storage':
      return `${UI_COPY.hero.levelPrefix}. ${snapshot.crystalCircle.storageLevel}`
    case 'construction.polish_field':
      return `${UI_COPY.hero.levelPrefix}. ${snapshot.crystalCircle.fieldPolishLevel}`
    case 'construction.removing_moss':
      return snapshot.crystalCircle.removingMossCompleted ? 'Done' : '10s'
    default:
      return constructionProjectStatus(snapshot, option)
  }
}

function processingActionState(
  snapshot: SimulationSnapshot | null,
  catalog: CatalogSnapshot | null,
  recipe: ProcessingRecipeDef,
): ActionUiState {
  if (!snapshot) return { enabled: false, value: '--' }
  const activeJob = snapshot.processing.activeJobs[recipe.stationId]
  if (activeJob?.recipeId === recipe.id) {
    return {
      enabled: false,
      value: progressCountdownLabel(activeJob.totalWorkSeconds, activeJob.remainingWorkSeconds, 'work'),
    }
  }
  if (activeJob) {
    return { enabled: false, value: `Busy: ${labelForId(catalog, activeJob.recipeId, 'Recipe')}` }
  }
  if (!requirementsMet(snapshot, recipe.requirements)) {
    return {
      enabled: false,
      value: schemaUnlockText(catalog, [recipe.id, recipe.stationId]) ?? schemaBlockerText(catalog, [recipe.id, recipe.stationId]) ?? UI_COPY.common.locked,
    }
  }
  if (processingLevelForRecipe(snapshot, recipe) >= recipe.maxLevel) {
    return { enabled: false, value: `Max · ${UI_COPY.hero.levelPrefix} ${recipe.maxLevel}` }
  }
  if (!stationPowered(snapshot, recipe.stationId)) {
    return { enabled: false, value: UI_COPY.common.needsPower }
  }
  if (!canAffordCost(snapshot, recipe.cost)) {
    return { enabled: false, value: missingCostLabel(snapshot, recipe.cost) }
  }
  return { enabled: true, value: `Lv ${processingLevelForRecipe(snapshot, recipe)}` }
}

function worldActionState(
  snapshot: SimulationSnapshot | null,
  catalog: CatalogSnapshot | null,
  action: WorldActionDef,
  pendingNarrativeChoice?: { beatId: string | null; choiceId: string | null },
): ActionUiState {
  if (!snapshot) return { enabled: false, value: '--' }
  const narrativeBeat = activeNarrativeBeat(catalog, snapshot)
  if (narrativeBeat) {
    if (narrativeBeat.worldActionId && narrativeBeat.worldActionId !== action.id) {
      return { enabled: false, value: `Finish ${narrativeBeat.label}` }
    }
    if (!narrativeBeat.worldActionId) {
      return { enabled: false, value: `Finish ${narrativeBeat.label}` }
    }
    const narrativeChoiceSelected =
      Boolean(snapshot.narrative.choiceByBeat[narrativeBeat.id]) ||
      (
        pendingNarrativeChoice?.beatId === narrativeBeat.id &&
        Boolean(pendingNarrativeChoice.choiceId)
      )
    if (narrativeBeat.worldActionId === action.id && narrativeBeat.choices.length > 0 && !narrativeChoiceSelected) {
      return { enabled: false, value: uiLabel(catalog, 'ui.narrative.choice_label', UI_COPY.narrative.choiceLabel) }
    }
  }
  if (activeWorldActionForId(snapshot, action.id)) {
    return {
      enabled: false,
      value: progressCountdownLabel(
        snapshot.activeWorldAction!.totalSeconds,
        snapshot.activeWorldAction!.remainingSeconds,
        's',
      ),
    }
  }
  if (snapshot.activeWorldAction) {
    return {
      enabled: false,
      value: `Busy: ${worldActionLabel(catalog, snapshot.activeWorldAction.actionId)}`,
    }
  }
  const heroLock = heroSurvivalLockLabel(snapshot)
  if (heroLock) {
    return { enabled: false, value: heroLock }
  }
  if (snapshot.activeConstruction && heroOnRole(snapshot, ROLE_CONSTRUCTION)) {
    return { enabled: false, value: UI_COPY.common.heroBuilding }
  }
  if (!requirementsMet(snapshot, action.requirements)) {
    return {
      enabled: false,
      value: schemaUnlockText(catalog, [action.id]) ?? schemaBlockerText(catalog, [action.id]) ?? UI_COPY.common.locked,
    }
  }
  return { enabled: true, value: `${Math.ceil(action.durationSeconds)}s` }
}

function recruitActionState(snapshot: SimulationSnapshot | null): ActionUiState {
  if (!snapshot) return { enabled: false, value: '--' }
  if (snapshot.recruitment.pendingRecruits.length) {
    return {
      enabled: false,
      value: progressCountdownLabel(
        snapshot.recruitment.pendingRecruits[0].totalSeconds,
        snapshot.recruitment.pendingRecruits[0].remainingSeconds,
        's',
      ),
    }
  }
  if (!snapshot.objectives.recruitmentEnabled) return { enabled: false, value: UI_COPY.common.locked }
  if (!snapshot.base.studioRestored || !snapshot.base.firePitBuilt) return { enabled: false, value: UI_COPY.base.prepBase }
  if (snapshot.resources.vibes < snapshot.recruitment.nextRecruitCost) {
    return {
      enabled: false,
      value: `Need ${(snapshot.recruitment.nextRecruitCost - snapshot.resources.vibes).toFixed(0)} Vibes`,
    }
  }
  return { enabled: true, value: UI_COPY.common.availableNow }
}

function constructionProjectStatus(snapshot: SimulationSnapshot | null, project: ConstructionOptionDef) {
  if (!snapshot) return '--'

  switch (project.id) {
    case 'project.restore_studio':
      return snapshot.base.studioRestored
        ? UI_COPY.common.restored
        : snapshot.base.studioRestoreUnlocked
          ? '600 Stone'
          : UI_COPY.common.locked
    case 'project.build_fire_pit':
      return snapshot.base.firePitBuilt ? UI_COPY.common.built : '200 Stone'
    case 'project.build_resonance_chamber':
      return snapshot.base.resonanceChamberBuilt ? UI_COPY.common.built : '320 Stone'
    case 'project.build_mix_console':
      return snapshot.base.mixConsoleBuilt ? UI_COPY.common.built : '420 Stone'
    case 'project.build_workshop':
      return snapshot.base.workshopBuilt ? UI_COPY.common.built : '260 Stone'
    case 'project.build_research_booth':
      return snapshot.base.researchBoothBuilt ? UI_COPY.common.built : '360 Stone'
    case 'construction.polish_field':
      return `Lv. ${snapshot.crystalCircle.fieldPolishLevel} · 1 Skin + 5L`
    default:
      return UI_COPY.common.availableNow
  }
}

function delayedActionProgress(totalSeconds: number, remainingSeconds: number) {
  if (totalSeconds <= 0) return 0
  const totalUnits = Math.max(1, Math.ceil(totalSeconds))
  const elapsedUnits = Math.min(
    totalUnits,
    Math.max(0, Math.ceil(totalSeconds - remainingSeconds)),
  )
  return elapsedUnits / totalUnits
}

function objectiveProgressState(
  snapshot: SimulationSnapshot | null,
  catalog: CatalogSnapshot | null,
): ObjectiveProgressView | null {
  if (!snapshot) return null

  if (snapshot.activeWorldAction) {
    return {
      title: worldActionLabel(catalog, snapshot.activeWorldAction.actionId),
      progress: delayedActionProgress(
        snapshot.activeWorldAction.totalSeconds,
        snapshot.activeWorldAction.remainingSeconds,
      ),
      timeLabel: progressCountdownLabel(
        snapshot.activeWorldAction.totalSeconds,
        snapshot.activeWorldAction.remainingSeconds,
        's',
      ),
    }
  }

  if (snapshot.activeConstruction) {
    return {
      title: labelForId(catalog, snapshot.activeConstruction.optionId, UI_COPY.common.currentProject),
      progress: delayedActionProgress(
        snapshot.activeConstruction.totalWorkSeconds,
        snapshot.activeConstruction.remainingWorkSeconds,
      ),
      timeLabel: progressCountdownLabel(
        snapshot.activeConstruction.totalWorkSeconds,
        snapshot.activeConstruction.remainingWorkSeconds,
        'work',
      ),
    }
  }

  if (snapshot.recruitment.pendingRecruits.length > 0) {
    const recruit = snapshot.recruitment.pendingRecruits[0]
    return {
      title: uiLabel(catalog, UI_ACTION_RECRUIT, UI_COPY.base.recruitSurvivor),
      progress: delayedActionProgress(recruit.totalSeconds, recruit.remainingSeconds),
      timeLabel: progressCountdownLabel(recruit.totalSeconds, recruit.remainingSeconds, 's'),
    }
  }

  return null
}

function activeConstructionForOption(snapshot: SimulationSnapshot | null, optionId: string) {
  return snapshot?.activeConstruction?.optionId === optionId
}

function activeWorldActionForId(snapshot: SimulationSnapshot | null, actionId: string) {
  return snapshot?.activeWorldAction?.actionId === actionId
}

function processingLevelForRecipe(snapshot: SimulationSnapshot, recipe: ProcessingRecipeDef) {
  const track = recipe.effects.find((effect) => effect.kind === 'increment_processing_track')?.track

  switch (track) {
    case 'resonance_calibration':
      return snapshot.processing.resonanceCalibrationLevel
    case 'mix_calibration':
      return snapshot.processing.mixCalibrationLevel
    case 'workshop_tooling':
      return snapshot.processing.workshopToolingLevel
    case 'workshop_water_condensers':
      return snapshot.processing.workshopWaterCondensersLevel
    case 'research_chorus_routing':
      return snapshot.processing.researchChorusRoutingLevel
    case 'research_harmonic_study':
      return snapshot.processing.researchHarmonicStudyLevel
    default:
      return 0
  }
}

function roleAvailable(snapshot: SimulationSnapshot | null, roleId: string) {
  if (!snapshot) return true
  if (roleId === ROLE_CRYSTAL_CHORUS) return snapshot.base.studioRestored
  if (roleId === ROLE_CRYSTAL_HARMONICS) return snapshot.base.resonanceChamberBuilt
  if (roleId === ROLE_FIRE_PIT) return snapshot.base.firePitBuilt
  return true
}

function roleAvailabilityLabel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null, roleId: string) {
  if (roleAvailable(snapshot, roleId)) return UI_COPY.common.online
  const unlockText = schemaUnlockText(catalog, [roleId])
  if (unlockText) return unlockText
  const blockerText = schemaBlockerText(catalog, [roleId])
  if (blockerText) return blockerText
  return UI_COPY.common.locked
}

function harmonicsTierLabel(snapshot: SimulationSnapshot | null) {
  const tier = snapshot?.power.harmonicsTier ?? 0
  switch (tier) {
    case 1:
      return UI_COPY.crystal.tierSoundcheck
    case 2:
      return UI_COPY.crystal.tierRehearsal
    case 3:
      return UI_COPY.crystal.tierLiveSet
    default:
      return UI_COPY.crystal.tierDormant
  }
}

function basslineSourceLabel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return '--'
  const parts: string[] = []
  if (workerCount(snapshot, ROLE_CRYSTAL_BASSLINE) > 0) parts.push(UI_COPY.crystal.crew)
  if (heroOnRole(snapshot, ROLE_CRYSTAL_BASSLINE)) parts.push(UI_COPY.crystal.hero)
  if (snapshot.crystalCircle.removingMossCompleted) parts.push(UI_COPY.crystal.moss)
  return parts.length ? parts.join(', ') : schemaFlowText(catalog, [RESOURCE_BASSLINE, ROLE_CRYSTAL_BASSLINE], 'output') ?? UI_COPY.common.noSource
}

function basslineSinkLabel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return '--'
  const sinks: string[] = []
  if (snapshot.activeConstruction?.resourceId === 'resource.bassline') sinks.push(UI_COPY.crystal.building)
  if (
    snapshot.bubble.stabilizedRing > snapshot.bubble.targetRing ||
    (snapshot.bubble.stabilizedRing === snapshot.bubble.targetRing &&
      snapshot.bubble.frontierProgress > snapshot.bubble.targetFrontierProgress)
  ) {
    sinks.push(UI_COPY.crystal.bubbleRisk)
  }
  return sinks.length ? sinks.join(', ') : schemaFlowText(catalog, [RESOURCE_BASSLINE], 'input') ?? UI_COPY.common.noSink
}

function basslineRiskLabel(snapshot: SimulationSnapshot | null) {
  if (!snapshot) return '--'
  const spareBudget = snapshot.bubble.fieldBudget - snapshot.bubble.activeCoverageCost
  if (spareBudget <= 0) return UI_COPY.crystal.belowSafeBudget
  if (spareBudget <= 5) return UI_COPY.crystal.spendCarefully
  return UI_COPY.crystal.safeBuffer(spareBudget)
}

function chorusSourceLabel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return '--'
  const parts: string[] = []
  if (workerCount(snapshot, ROLE_CRYSTAL_CHORUS) > 0) parts.push(UI_COPY.crystal.crew)
  if (heroOnRole(snapshot, ROLE_CRYSTAL_CHORUS)) parts.push(UI_COPY.crystal.hero)
  return parts.length ? parts.join(', ') : roleAvailabilityLabel(snapshot, catalog, ROLE_CRYSTAL_CHORUS)
}

function chorusSinkLabel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return '--'
  const sinks: string[] = []
  if ((snapshot.power.lifeSupportUpkeepPerSecond ?? 0) > 0) sinks.push(UI_COPY.crystal.lifeSupport)
  const poweredStations = Object.entries(snapshot.stations)
    .filter(([, station]) => station.requestedEnabled)
    .map(([stationId]) => labelForId(catalog, stationId, UI_COPY.common.currentProject))
  if (poweredStations.length) sinks.push(poweredStations.join(', '))
  return sinks.length ? sinks.join(' · ') : schemaFlowText(catalog, [RESOURCE_CHORUS], 'input') ?? UI_COPY.common.noSink
}

function chorusRiskLabel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return '--'
  if (!roleAvailable(snapshot, ROLE_CRYSTAL_CHORUS)) return roleAvailabilityLabel(snapshot, catalog, ROLE_CRYSTAL_CHORUS)
  if (snapshot.power.brownoutActive) {
    return `Brownout ${Math.round(snapshot.power.brownoutSeverity * 100)}%`
  }
  return UI_COPY.crystal.powerStable
}

function harmonicsSourceLabel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return '--'
  const parts: string[] = []
  if (workerCount(snapshot, ROLE_CRYSTAL_HARMONICS) > 0) parts.push(UI_COPY.crystal.crew)
  if (heroOnRole(snapshot, ROLE_CRYSTAL_HARMONICS)) parts.push(UI_COPY.crystal.hero)
  return parts.length ? parts.join(', ') : roleAvailabilityLabel(snapshot, catalog, ROLE_CRYSTAL_HARMONICS)
}

function harmonicsSinkLabel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return '--'
  return schemaFlowText(catalog, [RESOURCE_HARMONICS], 'pressure') ?? UI_COPY.common.noDirectAction
}

function harmonicsRiskLabel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return '--'
  if (!roleAvailable(snapshot, ROLE_CRYSTAL_HARMONICS)) return roleAvailabilityLabel(snapshot, catalog, ROLE_CRYSTAL_HARMONICS)
  if ((snapshot.power.harmonicsGenerationPerSecond ?? 0) <= 0) return UI_COPY.common.noGrowth
  return `${UI_COPY.power.harmonicsTier} ${snapshot.power.harmonicsTier}`
}

function signedAmount(value: number, digits = 1) {
  const rounded = Number(value.toFixed(digits))
  const prefix = rounded >= 0 ? '+' : ''
  return `${prefix}${rounded.toFixed(digits)}`
}

function signedWhole(value: number) {
  const rounded = Math.round(value)
  const prefix = rounded >= 0 ? '+' : ''
  return `${prefix}${rounded}`
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${remainder}s`
  return `${remainder}s`
}

function buildAwaySummary(before: SimulationSnapshot, after: SimulationSnapshot, elapsedSeconds: number): AwaySummary {
  return {
    elapsedSeconds,
    resourceLines: [
      {
        key: 'bassline',
        label: UI_COPY.crystal.bands.bassline,
        value: signedAmount(after.resources.bassline - before.resources.bassline),
      },
      {
        key: 'chorus',
        label: UI_COPY.crystal.bands.chorus,
        value: signedAmount(after.resources.chorus - before.resources.chorus),
      },
      {
        key: 'harmonics',
        label: UI_COPY.crystal.bands.harmonics,
        value: signedAmount(after.resources.harmonics - before.resources.harmonics),
      },
      {
        key: 'stone',
        label: UI_COPY.base.stone,
        value: signedAmount(after.resources.stone - before.resources.stone, 0),
      },
      {
        key: 'water',
        label: UI_COPY.base.water,
        value: `${signedAmount(after.resources.water - before.resources.water)}L`,
      },
      {
        key: 'vibes',
        label: UI_COPY.base.vibes,
        value: signedAmount(after.resources.vibes - before.resources.vibes),
      },
    ],
    recruitDelta:
      after.recruitment.totalRecruitedThisRun - before.recruitment.totalRecruitedThisRun,
    reachDelta: after.bubble.reachFromBase - before.bubble.reachFromBase,
  }
}

function roleSourceLabel(snapshot: SimulationSnapshot | null, roleId: string) {
  if (!snapshot) return ''
  const parts: string[] = []
  if (workerCount(snapshot, roleId) > 0) {
    parts.push(`${workerCount(snapshot, roleId)} ${UI_COPY.crystal.crew.toLowerCase()}`)
  }
  if (heroOnRole(snapshot, roleId)) {
    parts.push(UI_COPY.hero.kicker)
  }
  return parts.join(' + ')
}

function constructionSourceLabel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return '--'
  const source = roleSourceLabel(snapshot, ROLE_CONSTRUCTION)
  return source || schemaFlowText(catalog, [ROLE_CONSTRUCTION], 'input') || UI_COPY.common.noBuilders
}

function constructionSinkLabel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return '--'
  if (!snapshot.activeConstruction) {
    return schemaFlowText(catalog, [ROLE_CONSTRUCTION], 'input') ?? UI_COPY.common.noProject
  }
  const activeCostLabel =
    snapshot.activeConstruction.resourceId === 'resource.stone'
      ? resourceLabel(catalog, RESOURCE_STONE, UI_COPY.base.stone)
      : snapshot.activeConstruction.resourceId === 'resource.bassline'
        ? resourceLabel(catalog, RESOURCE_BASSLINE, UI_COPY.crystal.bands.bassline)
        : UI_COPY.common.timeOnly
  return `${labelForId(catalog, snapshot.activeConstruction.optionId, UI_COPY.common.currentProject)} · ${activeCostLabel}`
}

function constructionBlockerLabel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return '--'
  if (!snapshot.activeConstruction) {
      return crewCount(snapshot, ROLE_CONSTRUCTION) <= 0
      ? schemaBlockerText(catalog, [ROLE_CONSTRUCTION]) ?? UI_COPY.common.assignConstructionCrew
      : UI_COPY.common.noBlocker
  }
  if (crewCount(snapshot, ROLE_CONSTRUCTION) <= 0 && !heroOnRole(snapshot, ROLE_CONSTRUCTION)) {
    return UI_COPY.common.projectPausedNoBuilders
  }
  if (snapshot.activeConstruction.resourceId === 'resource.bassline' && snapshot.resources.bassline <= 0) {
    return UI_COPY.common.projectPausedNeedBassline
  }
  return schemaBlockerText(catalog, [snapshot.activeConstruction.optionId, ROLE_CONSTRUCTION]) ?? UI_COPY.common.noBlocker
}

function stationNamesByState(
  snapshot: SimulationSnapshot | null,
  catalog: CatalogSnapshot | null,
  predicate: (stationId: string) => boolean,
) {
  if (!snapshot || !catalog) return []
  return catalog.stations
    .filter((station) => predicate(station.id))
    .map((station) => labelForId(catalog, station.id, station.label))
}

function powerSourceLabel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return '--'
  const parts: string[] = []
  const chorus = chorusSourceLabel(snapshot, catalog)
  const harmonics = harmonicsSourceLabel(snapshot, catalog)
  if (chorus !== '--') parts.push(`${UI_COPY.crystal.bands.chorus}: ${chorus}`)
  if (harmonics !== '--') parts.push(`${UI_COPY.crystal.bands.harmonics}: ${harmonics}`)
  return parts.join(' · ') || schemaFlowText(catalog, [RESOURCE_CHORUS, RESOURCE_HARMONICS], 'output') || UI_COPY.common.noBandSource
}

function powerSinkLabel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return '--'
  const requestedStations = stationNamesByState(
    snapshot,
    catalog,
    (stationId) => stationRequested(snapshot, stationId),
  )
  const parts: string[] = []
  if (snapshot.power.lifeSupportUpkeepPerSecond > 0) {
    parts.push(UI_COPY.power.lifeSupport)
  }
  if (requestedStations.length > 0) {
    parts.push(requestedStations.join(', '))
  }
  return parts.join(' · ') || schemaFlowText(catalog, [RESOURCE_CHORUS], 'input') || UI_COPY.common.noSink
}

function powerBlockerLabel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return '--'
  if (!snapshot.base.studioRestored) return schemaUnlockText(catalog, [RESOURCE_CHORUS, ROLE_CRYSTAL_CHORUS]) ?? UI_COPY.power.unlockChorus
  if (!snapshot.base.resonanceChamberBuilt) return schemaUnlockText(catalog, [RESOURCE_HARMONICS, ROLE_CRYSTAL_HARMONICS]) ?? UI_COPY.power.unlockHarmonics
  if (snapshot.power.brownoutActive) {
    return `Brownout at ${Math.round(snapshot.power.brownoutSeverity * 100)}%`
  }
  return UI_COPY.common.powerStable
}

function baseSourceLabel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return '--'
  const parts: string[] = []
  const scavenge = roleSourceLabel(snapshot, ROLE_SCAVENGE)
  const water = roleSourceLabel(snapshot, ROLE_WATER)
  const firePit = roleSourceLabel(snapshot, ROLE_FIRE_PIT)
  if (scavenge) parts.push(`${resourceLabel(catalog, RESOURCE_STONE, UI_COPY.base.stone)}: ${scavenge}`)
  if (water) parts.push(`${resourceLabel(catalog, RESOURCE_WATER, UI_COPY.base.water)}: ${water}`)
  if (firePit) parts.push(`${resourceLabel(catalog, RESOURCE_VIBES, UI_COPY.base.vibes)}: ${firePit}`)
  return parts.join(' · ') || schemaFlowText(catalog, [ROLE_SCAVENGE, ROLE_WATER, ROLE_FIRE_PIT], 'output') || UI_COPY.common.noBaseSource
}

function baseSinkLabel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return '--'
  const parts: string[] = []
  if (snapshot.recruitment.pendingRecruits.length > 0) {
    parts.push(UI_COPY.base.recruitTravel)
  }
  if (snapshot.base.effectiveBadVibesRate > 0) {
    parts.push('Overcrowding')
  }
  if (snapshot.recruitment.totalRecruitedThisRun === 0 && snapshot.objectives.recruitmentEnabled) {
    parts.push(UI_COPY.base.nextRecruitCostSink)
  }
  return parts.join(' · ') || schemaFlowText(catalog, [RESOURCE_VIBES, RESOURCE_STONE, RESOURCE_WATER], 'input') || UI_COPY.common.noBaseSink
}

function baseBlockerLabel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return '--'
  if (snapshot.base.effectiveBadVibesRate > 0) {
    return UI_COPY.base.needMoreBunks(snapshot.base.missingBunks)
  }
  if (workerCount(snapshot, ROLE_SCAVENGE) > 0 && snapshot.resources.baseStoneStock <= 0) {
    return UI_COPY.base.stoneDepleted
  }
  if (workerCount(snapshot, ROLE_WATER) > 0 && snapshot.resources.baseWaterStock <= 0) {
    return UI_COPY.base.waterDepleted
  }
  if (
    snapshot.objectives.recruitmentEnabled &&
    snapshot.recruitment.totalRecruitedThisRun === 0 &&
    snapshot.resources.vibes < snapshot.recruitment.nextRecruitCost
  ) {
    return `Need ${(snapshot.recruitment.nextRecruitCost - snapshot.resources.vibes).toFixed(1)} more Vibes`
  }
  return schemaBlockerText(catalog, [ROLE_SCAVENGE, ROLE_WATER, ROLE_FIRE_PIT, RESOURCE_VIBES]) ?? UI_COPY.common.stable
}

function heroXpToNext(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot || !catalog) return 0
  const totalLevel =
    snapshot.heroProgress.drummerLevel +
    snapshot.heroProgress.vocalistLevel +
    snapshot.heroProgress.synthLevel
  return catalog.balance.progression.xp0 * catalog.balance.progression.xpGrowth ** totalLevel
}

function heroIsOutsideContext(snapshot: SimulationSnapshot | null) {
  if (!snapshot) return false
  return snapshot.heroSurvival.location === 'outside_bubble' || Boolean(snapshot.heroSurvival.forcedReturn)
}

function heroStateLabel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return '--'
  if (snapshot.heroSurvival.forcedReturn?.phase === 'return_to_bubble_edge') {
    return uiLabel(catalog, 'ui.hero.state.forced_return', 'Forced Return')
  }
  if (snapshot.heroSurvival.forcedReturn?.phase === 'return_to_studio') {
    return uiLabel(catalog, 'ui.hero.state.returning_to_studio', 'Returning to Studio')
  }
  if (snapshot.heroSurvival.forcedReturn?.phase === 'recover_at_studio') {
    return uiLabel(catalog, 'ui.hero.state.recovering', 'Recovering at Studio')
  }
  if (snapshot.heroSurvival.location === 'outside_bubble') {
    return uiLabel(catalog, 'ui.hero.state.outside_bubble', 'Outside Bubble')
  }
  if (snapshot.roster.heroAssigned) {
    return uiLabel(catalog, 'ui.hero.state.active', UI_COPY.hero.active)
  }
  return uiLabel(catalog, 'ui.hero.state.idle', UI_COPY.hero.idle)
}

function heroSupportLabel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return '--'
  if (snapshot.heroSurvival.forcedReturn?.phase === 'return_to_bubble_edge') {
    return 'No actions. Retreating to safety.'
  }
  if (snapshot.heroSurvival.forcedReturn?.phase === 'return_to_studio') {
    return 'No actions. Returning to the Studio.'
  }
  if (snapshot.heroSurvival.forcedReturn?.phase === 'recover_at_studio') {
    return 'No actions until Viral Load clears.'
  }
  if (snapshot.activeWorldAction) {
    return uiLabel(catalog, 'ui.hero.state.busy_world_action', UI_COPY.hero.busyWorldAction)
  }
  if (snapshot.heroSurvival.location === 'outside_bubble') {
    return 'Exposure is building Viral Load.'
  }
  return uiLabel(catalog, 'ui.hero.state.available', UI_COPY.hero.available)
}

function heroVitalsValue(snapshot: SimulationSnapshot | null) {
  if (!snapshot) return '--'
  return `${Math.round(snapshot.heroSurvival.viralLoadRatio * 100)}%`
}

function heroDebuffLabel(snapshot: SimulationSnapshot | null) {
  if (!snapshot) return '--'
  switch (snapshot.heroSurvival.debuffTier) {
    case 3:
      return 'Collapse Threshold'
    case 2:
      return 'Critical Strain'
    case 1:
      return 'Rising Strain'
    default:
      return 'Stable'
  }
}

function heroReturnWindowLabel(snapshot: SimulationSnapshot | null) {
  if (!snapshot) return '--'
  if (snapshot.heroSurvival.forcedReturn) {
    return progressCountdownLabel(
      snapshot.heroSurvival.forcedReturn.totalSeconds,
      snapshot.heroSurvival.forcedReturn.remainingSeconds,
      's',
    )
  }
  if (snapshot.heroSurvival.location !== 'outside_bubble') {
    return 'Inside safety'
  }
  if (
    !Number.isFinite(snapshot.heroSurvival.secondsUntilForcedReturn) ||
    snapshot.heroSurvival.secondsUntilForcedReturn >= 999_999
  ) {
    return '--'
  }
  return `${snapshot.heroSurvival.secondsUntilForcedReturn.toFixed(1)}s left`
}

function heroRecoveryLabel(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return '--'
  if (snapshot.heroSurvival.forcedReturn?.phase === 'recover_at_studio') {
    return progressCountdownLabel(
      snapshot.heroSurvival.forcedReturn.totalSeconds,
      snapshot.heroSurvival.forcedReturn.remainingSeconds,
      's',
    )
  }
  if (snapshot.heroSurvival.viralLoadRatio <= 0) {
    return 'Clear'
  }
  if (snapshot.heroSurvival.location === 'outside_bubble') {
    return 'Recovery blocked'
  }
  return `${(
    snapshot.heroSurvival.viralLoadRatio * (catalog?.balance.survival.recoveryTimeSeconds1To0 ?? 240)
  ).toFixed(0)}s`
}

function heroWoundsLabel(snapshot: SimulationSnapshot | null) {
  if (!snapshot) return '--'
  const wounds = snapshot.heroSurvival.wounds
  return `${wounds.woundUnitsTaken} / ${wounds.majorWoundsMax * wounds.lightWoundsPerMajor} LW`
}

function heroSurvivalLockLabel(snapshot: SimulationSnapshot | null) {
  if (!snapshot?.heroSurvival.forcedReturn) return null
  switch (snapshot.heroSurvival.forcedReturn.phase) {
    case 'return_to_bubble_edge':
      return 'Forced return'
    case 'return_to_studio':
      return 'Returning to Studio'
    case 'recover_at_studio':
      return 'Recovering at Studio'
    default:
      return 'Hero unavailable'
  }
}

function objectiveBeatTitle(catalog: CatalogSnapshot | null, beatId: string, fallback: string) {
  return labelForId(catalog, beatId, fallback)
}

function objectiveBeatSummary(
  catalog: CatalogSnapshot | null,
  beatId: string,
  fallback: string,
  relatedIds: string[] = [],
) {
  return presentationHint(catalog, [beatId, ...relatedIds]) ?? fallback
}

function objectiveBeatReward(
  catalog: CatalogSnapshot | null,
  beatId: string,
  fallback: string,
) {
  return schemaUnlockText(catalog, [beatId]) ?? fallback
}

function deriveObjectiveView(
  snapshot: SimulationSnapshot | null,
  catalog: CatalogSnapshot | null,
  worldActions: WorldActionDef[],
  constructionOptions: ConstructionOptionDef[],
): ObjectiveView {
  if (!snapshot || !catalog) {
    return {
      currentTitle: UI_COPY.objectives.loadingTitle,
      currentSummary: UI_COPY.objectives.loadingSummary,
      currentStatus: UI_COPY.common.booting,
      nextTitle: UI_COPY.objectives.loadingTitle,
      blocker: UI_COPY.common.runtimeNotReady,
      unlockReward: UI_COPY.common.initialGameState,
      ctaLabel: null,
      ctaDisabled: true,
      ctaKind: null,
      ctaId: null,
    }
  }

  const investigateAction = worldActions.find((action) => action.id === WORLD_ACTION_INVESTIGATE_BASE) ?? null
  const exploreAction = worldActions.find((action) => action.id === WORLD_ACTION_EXPLORE_BASE) ?? null
  const studioProject = constructionOptions.find((option) => option.id === 'project.restore_studio') ?? null
  const firePitProject = constructionOptions.find((option) => option.id === 'project.build_fire_pit') ?? null
  const activeWorldActionId = snapshot.activeWorldAction?.actionId ?? null
  const activeConstructionId = snapshot.activeConstruction?.optionId ?? null

  if (!snapshot.base.tutorialInvestigated || activeWorldActionId === WORLD_ACTION_INVESTIGATE_BASE) {
    return {
      currentTitle: objectiveBeatTitle(catalog, STORY_BEAT_INVESTIGATE_BASE, UI_COPY.objectives.investigateBase),
      currentSummary:
        activeWorldActionId === WORLD_ACTION_INVESTIGATE_BASE
          ? objectiveBeatSummary(catalog, STORY_BEAT_INVESTIGATE_BASE, UI_COPY.objectives.investigateSummaryActive, [WORLD_ACTION_INVESTIGATE_BASE])
          : objectiveBeatSummary(catalog, STORY_BEAT_INVESTIGATE_BASE, UI_COPY.objectives.investigateSummaryReady, [WORLD_ACTION_INVESTIGATE_BASE]),
      currentStatus:
        activeWorldActionId === WORLD_ACTION_INVESTIGATE_BASE ? UI_COPY.common.inProgress : UI_COPY.common.ready,
      nextTitle: objectiveBeatTitle(catalog, STORY_BEAT_EXPLORE_BASE, exploreAction?.label ?? UI_COPY.objectives.exploreBase),
      blocker:
        activeWorldActionId === WORLD_ACTION_INVESTIGATE_BASE
          ? UI_COPY.objectives.investigateBlockerActive
          : snapshot.roster.heroAssigned
            ? UI_COPY.objectives.investigateBlockerReady
            : UI_COPY.common.readyNow,
      unlockReward: objectiveBeatReward(catalog, STORY_BEAT_INVESTIGATE_BASE, UI_COPY.objectives.investigateReward),
      ctaLabel:
        activeWorldActionId === WORLD_ACTION_INVESTIGATE_BASE
          ? null
          : presentationCta(catalog, [STORY_BEAT_INVESTIGATE_BASE, WORLD_ACTION_INVESTIGATE_BASE], investigateAction?.label ?? UI_COPY.objectives.investigateBase),
      ctaDisabled: Boolean(activeWorldActionId),
      ctaKind: activeWorldActionId === WORLD_ACTION_INVESTIGATE_BASE ? null : 'world_action',
      ctaId: activeWorldActionId === WORLD_ACTION_INVESTIGATE_BASE ? null : WORLD_ACTION_INVESTIGATE_BASE,
    }
  }

  if (!snapshot.base.tutorialExplored || activeWorldActionId === WORLD_ACTION_EXPLORE_BASE) {
    return {
      currentTitle: objectiveBeatTitle(catalog, STORY_BEAT_EXPLORE_BASE, exploreAction?.label ?? UI_COPY.objectives.exploreBase),
      currentSummary:
        activeWorldActionId === WORLD_ACTION_EXPLORE_BASE
          ? objectiveBeatSummary(catalog, STORY_BEAT_EXPLORE_BASE, UI_COPY.objectives.exploreSummaryActive, [WORLD_ACTION_EXPLORE_BASE])
          : objectiveBeatSummary(catalog, STORY_BEAT_EXPLORE_BASE, UI_COPY.objectives.exploreSummaryReady, [WORLD_ACTION_EXPLORE_BASE]),
      currentStatus: activeWorldActionId === WORLD_ACTION_EXPLORE_BASE ? UI_COPY.common.inProgress : UI_COPY.common.ready,
      nextTitle: objectiveBeatTitle(catalog, STORY_BEAT_RESTORE_STUDIO, studioProject?.label ?? UI_COPY.objectives.restoreStudio),
      blocker:
        activeWorldActionId === WORLD_ACTION_EXPLORE_BASE
          ? UI_COPY.objectives.exploreBlockerActive
          : UI_COPY.common.readyNow,
      unlockReward: objectiveBeatReward(catalog, STORY_BEAT_EXPLORE_BASE, UI_COPY.objectives.exploreReward),
      ctaLabel:
        activeWorldActionId === WORLD_ACTION_EXPLORE_BASE
          ? null
          : presentationCta(catalog, [STORY_BEAT_EXPLORE_BASE, WORLD_ACTION_EXPLORE_BASE], exploreAction?.label ?? UI_COPY.objectives.exploreBase),
      ctaDisabled: Boolean(activeWorldActionId),
      ctaKind: activeWorldActionId === WORLD_ACTION_EXPLORE_BASE ? null : 'world_action',
      ctaId: activeWorldActionId === WORLD_ACTION_EXPLORE_BASE ? null : WORLD_ACTION_EXPLORE_BASE,
    }
  }

  if (!snapshot.base.studioRestored || activeConstructionId === 'project.restore_studio') {
    const studioStoneCost = constructionCostAmount(studioProject, 'resource.stone')
    const missingStone = Math.max(0, studioStoneCost - snapshot.resources.stone)
    const studioReady =
      activeConstructionId === null &&
      missingStone <= 0 &&
      crewCount(snapshot, ROLE_CONSTRUCTION) > 0
    return {
      currentTitle: objectiveBeatTitle(catalog, STORY_BEAT_RESTORE_STUDIO, studioProject?.label ?? UI_COPY.objectives.restoreStudio),
      currentSummary:
        activeConstructionId === 'project.restore_studio'
          ? objectiveBeatSummary(catalog, STORY_BEAT_RESTORE_STUDIO, UI_COPY.objectives.studioSummaryActive, ['project.restore_studio'])
          : objectiveBeatSummary(catalog, STORY_BEAT_RESTORE_STUDIO, UI_COPY.objectives.studioSummaryReady, ['project.restore_studio']),
      currentStatus:
        activeConstructionId === 'project.restore_studio'
          ? UI_COPY.common.inProgress
          : studioReady
            ? UI_COPY.common.ready
            : UI_COPY.common.blocked,
      nextTitle: objectiveBeatTitle(catalog, STORY_BEAT_BUILD_FIRE_PIT, firePitProject?.label ?? UI_COPY.objectives.buildFirePit),
      blocker:
        activeConstructionId === 'project.restore_studio'
          ? 'Construction is already running.'
          : missingStone > 0
            ? `Need ${missingStone.toFixed(0)} more Stone.`
            : crewCount(snapshot, ROLE_CONSTRUCTION) === 0
              ? 'Assign at least 1 Construction Crew.'
              : activeConstructionId
                ? `Finish ${labelForId(catalog, activeConstructionId, constructionLabelForId(constructionOptions, activeConstructionId))} first.`
                : UI_COPY.common.readyNow,
      unlockReward: objectiveBeatReward(catalog, STORY_BEAT_RESTORE_STUDIO, UI_COPY.objectives.studioReward),
      ctaLabel:
        activeConstructionId === 'project.restore_studio'
          ? null
          : presentationCta(catalog, [STORY_BEAT_RESTORE_STUDIO, 'project.restore_studio'], studioProject?.label ?? UI_COPY.objectives.restoreStudio),
      ctaDisabled:
        activeConstructionId !== null ||
        missingStone > 0 ||
        crewCount(snapshot, ROLE_CONSTRUCTION) === 0,
      ctaKind: activeConstructionId === 'project.restore_studio' ? null : 'construction',
      ctaId: activeConstructionId === 'project.restore_studio' ? null : 'project.restore_studio',
    }
  }

  if (!snapshot.base.firePitBuilt || activeConstructionId === 'project.build_fire_pit') {
    const firePitStoneCost = constructionCostAmount(firePitProject, 'resource.stone')
    const missingStone = Math.max(0, firePitStoneCost - snapshot.resources.stone)
    const firePitReady =
      activeConstructionId === null &&
      missingStone <= 0 &&
      crewCount(snapshot, ROLE_CONSTRUCTION) > 0
    return {
      currentTitle: objectiveBeatTitle(catalog, STORY_BEAT_BUILD_FIRE_PIT, firePitProject?.label ?? UI_COPY.objectives.buildFirePit),
      currentSummary:
        activeConstructionId === 'project.build_fire_pit'
          ? objectiveBeatSummary(catalog, STORY_BEAT_BUILD_FIRE_PIT, UI_COPY.objectives.firePitSummaryActive, ['project.build_fire_pit'])
          : objectiveBeatSummary(catalog, STORY_BEAT_BUILD_FIRE_PIT, UI_COPY.objectives.firePitSummaryReady, ['project.build_fire_pit']),
      currentStatus:
        activeConstructionId === 'project.build_fire_pit'
          ? UI_COPY.common.inProgress
          : firePitReady
            ? UI_COPY.common.ready
            : UI_COPY.common.blocked,
      nextTitle: snapshot.objectives.recruitmentEnabled
        ? objectiveBeatTitle(catalog, STORY_BEAT_FIRST_RECRUIT, UI_COPY.objectives.recruitFirstSurvivor)
        : objectiveBeatTitle(catalog, STORY_BEAT_REACH_SURVIVOR_CAVE, UI_COPY.objectives.reachSurvivorCave),
      blocker:
        activeConstructionId === 'project.build_fire_pit'
          ? 'Construction is already running.'
          : missingStone > 0
            ? `Need ${missingStone.toFixed(0)} more Stone.`
            : crewCount(snapshot, ROLE_CONSTRUCTION) === 0
              ? 'Assign at least 1 Construction Crew.'
              : activeConstructionId
                ? `Finish ${labelForId(catalog, activeConstructionId, constructionLabelForId(constructionOptions, activeConstructionId))} first.`
                : UI_COPY.common.readyNow,
      unlockReward: objectiveBeatReward(catalog, STORY_BEAT_BUILD_FIRE_PIT, UI_COPY.objectives.firePitReward),
      ctaLabel:
        activeConstructionId === 'project.build_fire_pit'
          ? null
          : presentationCta(catalog, [STORY_BEAT_BUILD_FIRE_PIT, 'project.build_fire_pit'], firePitProject?.label ?? UI_COPY.objectives.buildFirePit),
      ctaDisabled:
        activeConstructionId !== null ||
        missingStone > 0 ||
        crewCount(snapshot, ROLE_CONSTRUCTION) === 0,
      ctaKind: activeConstructionId === 'project.build_fire_pit' ? null : 'construction',
      ctaId: activeConstructionId === 'project.build_fire_pit' ? null : 'project.build_fire_pit',
    }
  }

  if (!snapshot.objectives.recruitmentEnabled) {
    const remainingReach = Math.max(
      0,
      snapshot.objectives.reachObjectiveTarget - snapshot.bubble.reachFromBase,
    )
    return {
      currentTitle: objectiveBeatTitle(catalog, STORY_BEAT_REACH_SURVIVOR_CAVE, UI_COPY.objectives.reachSurvivorCave),
      currentSummary:
        objectiveBeatSummary(catalog, STORY_BEAT_REACH_SURVIVOR_CAVE, UI_COPY.objectives.reachSummary, [RESOURCE_BASSLINE, UI_MAP_CAVE_GATE]),
      currentStatus: remainingReach > 0 ? UI_COPY.common.blocked : UI_COPY.common.ready,
      nextTitle: objectiveBeatTitle(catalog, STORY_BEAT_FIRST_RECRUIT, UI_COPY.objectives.recruitFirstSurvivor),
      blocker:
        remainingReach > 0
          ? `Need ${remainingReach} more reach from the base.`
          : UI_COPY.objectives.readyForUpdate,
      unlockReward: objectiveBeatReward(catalog, STORY_BEAT_REACH_SURVIVOR_CAVE, UI_COPY.objectives.reachReward),
      ctaLabel: null,
      ctaDisabled: true,
      ctaKind: null,
      ctaId: null,
    }
  }

  if (
    snapshot.recruitment.totalRecruitedThisRun === 0 &&
    snapshot.recruitment.pendingRecruits.length === 0
  ) {
    const missingVibes = Math.max(0, snapshot.recruitment.nextRecruitCost - snapshot.resources.vibes)
    return {
      currentTitle: objectiveBeatTitle(catalog, STORY_BEAT_FIRST_RECRUIT, UI_COPY.objectives.recruitFirstSurvivor),
      currentSummary:
        objectiveBeatSummary(catalog, STORY_BEAT_FIRST_RECRUIT, UI_COPY.objectives.recruitSummary, [UI_ACTION_RECRUIT, RESOURCE_VIBES]),
      currentStatus: missingVibes > 0 ? UI_COPY.common.blocked : UI_COPY.common.ready,
      nextTitle: objectiveBeatTitle(catalog, STORY_BEAT_AWAIT_SURVIVOR_ARRIVAL, UI_COPY.objectives.awaitArrivalTitle),
      blocker:
        missingVibes > 0 ? `Need ${missingVibes.toFixed(1)} more ${resourceLabel(catalog, RESOURCE_VIBES, UI_COPY.base.vibes)}.` : UI_COPY.common.readyNow,
      unlockReward: objectiveBeatReward(catalog, STORY_BEAT_FIRST_RECRUIT, UI_COPY.objectives.recruitReward),
      ctaLabel: presentationCta(catalog, [STORY_BEAT_FIRST_RECRUIT, UI_ACTION_RECRUIT, RESOURCE_VIBES], UI_COPY.base.recruitSurvivor),
      ctaDisabled: missingVibes > 0,
      ctaKind: 'recruit',
      ctaId: 'recruit.first_survivor',
    }
  }

  if (snapshot.recruitment.pendingRecruits.length > 0) {
    return {
      currentTitle: objectiveBeatTitle(catalog, STORY_BEAT_AWAIT_SURVIVOR_ARRIVAL, UI_COPY.objectives.awaitArrivalTitle),
      currentSummary:
        objectiveBeatSummary(catalog, STORY_BEAT_AWAIT_SURVIVOR_ARRIVAL, UI_COPY.objectives.awaitArrivalSummary, [UI_STATUS_BASE_RECRUITS]),
      currentStatus: UI_COPY.common.inProgress,
      nextTitle: objectiveBeatTitle(catalog, STORY_BEAT_STABILIZE_BASE, UI_COPY.objectives.stabilizePowerHousing),
      blocker: `${snapshot.recruitment.pendingRecruits.length} recruit pending arrival.`,
      unlockReward: objectiveBeatReward(catalog, STORY_BEAT_AWAIT_SURVIVOR_ARRIVAL, UI_COPY.objectives.awaitArrivalReward),
      ctaLabel: null,
      ctaDisabled: true,
      ctaKind: null,
      ctaId: null,
    }
  }

  return {
    currentTitle: objectiveBeatTitle(catalog, STORY_BEAT_STABILIZE_BASE, UI_COPY.objectives.stabilizeBase),
    currentSummary:
      objectiveBeatSummary(catalog, STORY_BEAT_STABILIZE_BASE, UI_COPY.objectives.stabilizeSummary, [UI_PANEL_POWER, UI_PANEL_BASE]),
    currentStatus: UI_COPY.common.open,
    nextTitle: UI_COPY.objectives.pushBands,
    blocker: currentBiggestRisk(snapshot, catalog),
    unlockReward: objectiveBeatReward(catalog, STORY_BEAT_STABILIZE_BASE, UI_COPY.objectives.stabilizeReward),
    ctaLabel: null,
    ctaDisabled: true,
    ctaKind: null,
    ctaId: null,
  }
}

function objectiveNextMove(
  snapshot: SimulationSnapshot | null,
  catalog: CatalogSnapshot | null,
  objective: ObjectiveView | undefined,
) {
  if (!snapshot || !objective) return '--'
  if (snapshot.heroSurvival.forcedReturn) {
    return 'Let the Hero finish the forced return and recovery sequence.'
  }
  if (snapshot.activeWorldAction) {
    return `Let ${worldActionLabel(catalog, snapshot.activeWorldAction.actionId)} finish.`
  }
  if (snapshot.activeConstruction) {
    return `Keep builders on ${labelForId(catalog, snapshot.activeConstruction.optionId, UI_COPY.common.currentProject)}.`
  }
  if (!snapshot.base.studioRestored) {
    if (crewCount(snapshot, ROLE_CONSTRUCTION) <= 0) {
      return schemaBlockerText(catalog, [ROLE_CONSTRUCTION]) ?? UI_COPY.objectives.moveOneBuilder
    }
    if (snapshot.resources.stone < 600) {
      return presentationHint(catalog, [ROLE_SCAVENGE, RESOURCE_STONE]) ??
        schemaFlowText(catalog, [ROLE_SCAVENGE, RESOURCE_STONE], 'output') ??
        UI_COPY.objectives.assignScavenge
    }
  }
  if (!snapshot.base.firePitBuilt) {
    if (crewCount(snapshot, ROLE_CONSTRUCTION) <= 0) {
      return schemaBlockerText(catalog, [ROLE_CONSTRUCTION]) ?? UI_COPY.objectives.keepOneBuilder
    }
    if (snapshot.resources.stone < 200) {
      return presentationHint(catalog, [ROLE_SCAVENGE, RESOURCE_STONE]) ??
        schemaFlowText(catalog, [ROLE_SCAVENGE, RESOURCE_STONE], 'output') ??
        UI_COPY.objectives.keepScavenging
    }
  }
  if (!snapshot.objectives.recruitmentEnabled) {
    if (workerCount(snapshot, ROLE_CRYSTAL_BASSLINE) <= 0 && !heroOnRole(snapshot, ROLE_CRYSTAL_BASSLINE)) {
      return presentationHint(catalog, [ROLE_CRYSTAL_BASSLINE, RESOURCE_BASSLINE]) ??
        schemaFlowText(catalog, [ROLE_CRYSTAL_BASSLINE, RESOURCE_BASSLINE], 'output') ??
        UI_COPY.objectives.assignBassline
    }
    return presentationHint(catalog, [RESOURCE_BASSLINE]) ??
      schemaFlowText(catalog, [RESOURCE_BASSLINE], 'input') ??
      UI_COPY.objectives.storeBassline
  }
  if (snapshot.recruitment.totalRecruitedThisRun === 0) {
    if (snapshot.resources.vibes < snapshot.recruitment.nextRecruitCost) {
      return workerCount(snapshot, ROLE_FIRE_PIT) > 0 || heroOnRole(snapshot, ROLE_FIRE_PIT)
        ? presentationHint(catalog, [ROLE_FIRE_PIT, RESOURCE_VIBES]) ??
          schemaFlowText(catalog, [RESOURCE_VIBES, ROLE_FIRE_PIT], 'output') ??
          UI_COPY.objectives.waitFirePit
        : presentationHint(catalog, [ROLE_FIRE_PIT, RESOURCE_VIBES]) ??
          schemaFlowText(catalog, [ROLE_FIRE_PIT, RESOURCE_VIBES], 'output') ??
          UI_COPY.objectives.assignFirePit
    }
    return presentationCta(
      catalog,
      [STORY_BEAT_FIRST_RECRUIT, UI_ACTION_RECRUIT, RESOURCE_VIBES],
      uiLabel(catalog, UI_ACTION_RECRUIT, UI_COPY.base.recruitSurvivor),
    )
  }
  if (snapshot.power.brownoutActive) {
    return presentationRisk(catalog, [RESOURCE_CHORUS]) ??
      schemaFlowText(catalog, [RESOURCE_CHORUS], 'output') ??
      UI_COPY.objectives.increaseChorus
  }
  if ((snapshot.power.harmonicsGenerationPerSecond ?? 0) <= 0) {
    return presentationHint(catalog, [ROLE_CRYSTAL_HARMONICS, RESOURCE_HARMONICS]) ??
      schemaFlowText(catalog, [ROLE_CRYSTAL_HARMONICS, RESOURCE_HARMONICS], 'output') ??
      UI_COPY.objectives.assignHarmonics
  }
    return objective.blocker === UI_COPY.objectives.noPressure
    ? UI_COPY.objectives.expandProcessing
    : objective.blocker
}

function objectiveWatchOut(snapshot: SimulationSnapshot | null, catalog: CatalogSnapshot | null) {
  if (!snapshot) return '--'
  return currentBiggestRisk(snapshot, catalog)
}

function constructionCostAmount(
  option: ConstructionOptionDef | null,
  resourceId: string,
) {
  if (!option) return 0
  if (option.cost.kind === 'upfront' && option.cost.resource_id === resourceId) {
    return option.cost.amount ?? 0
  }
  if (option.cost.kind === 'upfront_bundle') {
    return option.cost.costs?.find((cost) => cost.item_id === resourceId)?.amount ?? 0
  }
  return 0
}

function constructionLabelForId(constructionOptions: ConstructionOptionDef[], optionId: string) {
  return constructionOptions.find((option) => option.id === optionId)?.label ?? UI_COPY.common.currentProject
}

function currentBiggestRisk(snapshot: SimulationSnapshot, catalog: CatalogSnapshot | null) {
  if (snapshot.heroSurvival.forcedReturn) {
    return `Hero is locked in ${heroSurvivalLockLabel(snapshot)?.toLowerCase() ?? 'forced return'}. Viral Load is at ${Math.round(snapshot.heroSurvival.viralLoadRatio * 100)}%.`
  }
  if (snapshot.heroSurvival.location === 'outside_bubble') {
    return `Hero is outside the bubble at ${Math.round(snapshot.heroSurvival.viralLoadRatio * 100)}% Viral Load. Auto-return in ${snapshot.heroSurvival.secondsUntilForcedReturn.toFixed(1)}s if exposure continues.`
  }
  if (snapshot.power.brownoutActive) {
    return `Brownout pressure at ${Math.round(snapshot.power.brownoutSeverity * 100)}%. ${(presentationRisk(catalog, [RESOURCE_CHORUS, STATION_RESONANCE_CHAMBER, STATION_MIX_CONSOLE]) ?? schemaBlockerText(catalog, [RESOURCE_CHORUS, STATION_RESONANCE_CHAMBER, STATION_MIX_CONSOLE]) ?? '').trim()}`.trim()
  }
  if (snapshot.base.effectiveBadVibesRate > 0) {
    return `Overcrowding is generating ${snapshot.base.effectiveBadVibesRate.toFixed(1)} Bad Vibes per second. ${(presentationRisk(catalog, [RESOURCE_VIBES]) ?? schemaFlowText(catalog, [RESOURCE_VIBES], 'pressure') ?? '').trim()}`.trim()
  }
  if (
    snapshot.bubble.stabilizedRing > snapshot.bubble.targetRing ||
    (snapshot.bubble.stabilizedRing === snapshot.bubble.targetRing &&
      snapshot.bubble.frontierProgress > snapshot.bubble.targetFrontierProgress)
  ) {
    return `Bassline coverage is ahead of budget. Bubble shrink starts in ${snapshot.bubble.holdSecondsRemaining.toFixed(1)}s if spending stays high. ${(presentationRisk(catalog, [RESOURCE_BASSLINE]) ?? schemaBlockerText(catalog, [RESOURCE_BASSLINE]) ?? '').trim()}`.trim()
  }
  return UI_COPY.objectives.noPressure
}

function uiId(value: string) {
  return value.replace(/[.:]/g, '-')
}

interface StatusPillProps {
  dataUi: string
  label: string
  value: string
}

function StatusPill(props: StatusPillProps) {
  return (
    <div class="status-pill" data-ui={props.dataUi}>
      <span data-ui={`${props.dataUi}-label`}>{props.label}</span>
      <strong data-ui={`${props.dataUi}-value`}>{props.value}</strong>
    </div>
  )
}

interface SystemSummaryRowsProps {
  dataUi: string
  rows: Array<{ key: string; label: string; value: string }>
}

function SystemSummaryRows(props: SystemSummaryRowsProps) {
  return (
    <div class="system-summary-rows" data-ui={props.dataUi}>
      <For each={props.rows}>
        {(row) => (
          <div class="system-summary-row" data-ui={`${props.dataUi}-${row.key}`}>
            <span class="system-summary-label" data-ui={`${props.dataUi}-${row.key}-label`}>
              {row.label}
            </span>
            <strong class="system-summary-value" data-ui={`${props.dataUi}-${row.key}-value`}>
              {row.value}
            </strong>
          </div>
        )}
      </For>
    </div>
  )
}

interface MetricProps {
  dataUi?: string
  label: string
  value: string
  class?: string
}

interface CrystalBandCardProps {
  dataUi: string
  title: string
  available: boolean
  heroAssigned: boolean
  value: string
  roleId: string
  crew: number
  maxCrew: number
  onSetCrew(crew: number): void
  detailRows: Array<{ key: string; label: string; value: string }>
}

interface HeroClassStatProps {
  dataUi: string
  label: string
  level: number
  xp: number
  xpToNext: number
}

function CrystalBandCard(props: CrystalBandCardProps) {
  return (
    <div class="metric crystal-band-card" data-ui={props.dataUi}>
      <div class="bassline-top-row" data-ui={`${props.dataUi}-top-row`}>
        <dt class="bassline-title" data-ui={`${props.dataUi}-title`}>
          <span data-ui={`${props.dataUi}-title-label`}>{props.title}</span>
          {props.heroAssigned ? (
            <span
              class="bassline-shield"
              data-ui={`${props.dataUi}-hero-assigned`}
              aria-label={UI_COPY.crystal.heroAssignedTo(props.title)}
            >
              🛡
            </span>
          ) : null}
        </dt>
        <dd class="bassline-value" data-ui={`${props.dataUi}-value`}>
          {props.value}
        </dd>
        <div class="bassline-inline-stepper" data-ui={`${props.dataUi}-stepper`}>
          <button
            data-ui={`${props.dataUi}-stepper-decrement`}
            class="action action-secondary"
            disabled={!props.available || props.crew <= 0}
            onClick={() => props.onSetCrew(Math.max(0, props.crew - 1))}
          >
            -1
          </button>
          <strong data-ui={`${props.dataUi}-crew-value`}>{`${props.crew}`}</strong>
          <button
            data-ui={`${props.dataUi}-stepper-increment`}
            class="action action-secondary"
            disabled={!props.available || props.crew >= props.maxCrew}
            onClick={() => props.onSetCrew(props.crew + 1)}
          >
            +1
          </button>
        </div>
      </div>
      <div class="bassline-levels" data-ui={`${props.dataUi}-levels`}>
        <For each={props.detailRows}>
          {(row) => (
            <div class="bassline-level-row" data-ui={`${props.dataUi}-level-${row.key}`}>
              <span data-ui={`${props.dataUi}-level-${row.key}-label`}>{row.label}</span>
              <strong data-ui={`${props.dataUi}-level-${row.key}-value`}>{row.value}</strong>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}

function HeroClassStat(props: HeroClassStatProps) {
  return (
    <div class="control-block" data-ui={props.dataUi}>
      <span class="control-label" data-ui={`${props.dataUi}-label`}>{props.label}</span>
      <div class="hero-class-value" data-ui={`${props.dataUi}-value`}>
        <strong data-ui={`${props.dataUi}-level`}>{`${UI_COPY.hero.levelPrefix} ${props.level}`}</strong>
        <span data-ui={`${props.dataUi}-xp`}>
          {props.xpToNext > 0 ? `${props.xp.toFixed(1)} / ${props.xpToNext.toFixed(0)} ${UI_COPY.hero.xpSuffix}` : '--'}
        </span>
      </div>
    </div>
  )
}

interface StationPowerCardProps {
  catalog: CatalogSnapshot | null
  dataUi: string
  label: string
  built: boolean
  requested: boolean
  powered: boolean
  upkeepPerSecond: number
  onToggle(enabled: boolean): void
}

function StationPowerCard(props: StationPowerCardProps) {
  return (
    <div class="upgrade-card" data-ui={props.dataUi}>
      <span data-ui={`${props.dataUi}-label`}>{props.label}</span>
      <strong data-ui={`${props.dataUi}-status`}>
        {!props.built
          ? uiLabel(props.catalog, 'ui.common.not_built', UI_COPY.common.notBuilt)
          : props.powered
            ? uiLabel(props.catalog, 'ui.common.powered', UI_COPY.common.powered)
            : props.requested
              ? uiLabel(props.catalog, 'ui.common.brownout', UI_COPY.common.brownout)
              : uiLabel(props.catalog, 'ui.common.standby', UI_COPY.common.standby)}
      </strong>
      <span data-ui={`${props.dataUi}-upkeep`}>{`${props.upkeepPerSecond.toFixed(2)}/s Chorus`}</span>
      <div class="construction-crew-controls" data-ui={`${props.dataUi}-controls`}>
        <button
          data-ui={`${props.dataUi}-off`}
          class="action action-secondary"
          disabled={!props.built}
          onClick={() => props.onToggle(false)}
        >
          {uiLabel(props.catalog, 'ui.common.off', UI_COPY.common.off)}
        </button>
        <button
          data-ui={`${props.dataUi}-on`}
          class="action action-secondary"
          disabled={!props.built}
          onClick={() => props.onToggle(true)}
        >
          {uiLabel(props.catalog, 'ui.common.on', UI_COPY.common.on)}
        </button>
      </div>
    </div>
  )
}

function Metric(props: MetricProps) {
  return (
    <div class={`metric ${props.class ?? ''}`.trim()} data-ui={props.dataUi}>
      <dt data-ui={props.dataUi ? `${props.dataUi}-label` : undefined}>{props.label}</dt>
      <dd data-ui={props.dataUi ? `${props.dataUi}-value` : undefined}>{props.value}</dd>
    </div>
  )
}

interface ProgressBarProps {
  dataUi: string
  progress: number
}

function ProgressBar(props: ProgressBarProps) {
  const clamped = () => Math.max(0, Math.min(1, props.progress))
  return (
    <div class="progress-bar-shell" data-ui={props.dataUi}>
      <div class="progress-bar" data-ui={`${props.dataUi}-track`}>
        <div
          class="progress-bar-fill"
          data-ui={`${props.dataUi}-fill`}
          style={{ width: `${Math.round(clamped() * 100)}%` }}
        />
      </div>
      <strong class="progress-bar-shell-label" data-ui={`${props.dataUi}-label`}>
        {`${Math.round(clamped() * 100)}%`}
      </strong>
    </div>
  )
}

interface ConstructionBannerProps {
  catalog: CatalogSnapshot | null
  dataUi: string
  job: SimulationSnapshot['activeConstruction']
}

function ConstructionBanner(props: ConstructionBannerProps) {
  const resourceLabel = () => {
    if (!props.job || props.job.totalCost <= 0) {
      return UI_COPY.common.timeOnly
    }
    if (props.job.resourceId === 'resource.stone') return UI_COPY.common.stoneCommitted
    if (props.job.resourceId === 'resource.bassline') return UI_COPY.common.basslineConsumed
    return UI_COPY.common.costsCommitted
  }
  const kindLabel = () =>
    labelForId(props.catalog, props.job?.optionId ?? 'construction', UI_COPY.common.currentProject)

  return props.job ? (
    <div class="construction-banner" data-ui={props.dataUi}>
      <div class="construction-banner-copy" data-ui={`${props.dataUi}-copy`}>
        <strong class="construction-banner-title" data-ui={`${props.dataUi}-status`}>
          {kindLabel()}
        </strong>
        <em data-ui={`${props.dataUi}-cost`}>
          {props.job.totalCost > 0
            ? `${props.job.spentCost.toFixed(1)} / ${props.job.totalCost.toFixed(1)} ${resourceLabel()}`
            : UI_COPY.common.noResourceCost}
        </em>
      </div>
      <div class="progress-row" data-ui={`${props.dataUi}-progress-row`}>
        <ProgressBar
          dataUi={`${props.dataUi}-progress`}
          progress={delayedActionProgress(props.job.totalWorkSeconds, props.job.remainingWorkSeconds)}
        />
        <strong class="progress-time" data-ui={`${props.dataUi}-work`}>
          {progressCountdownLabel(props.job.totalWorkSeconds, props.job.remainingWorkSeconds, 'work')}
        </strong>
      </div>
    </div>
  ) : (
    <div class="construction-banner construction-idle" data-ui={props.dataUi}>
      <span data-ui={`${props.dataUi}-status`}>{UI_COPY.construction.noActive}</span>
      <strong data-ui={`${props.dataUi}-work`}>{UI_COPY.construction.statusReady}</strong>
    </div>
  )
}

interface WorldActionBannerProps {
  catalog: CatalogSnapshot | null
  dataUi: string
  action: SimulationSnapshot['activeWorldAction']
}

function WorldActionBanner(props: WorldActionBannerProps) {
  return props.action ? (
    <div class="construction-banner" data-ui={props.dataUi}>
      <div class="construction-banner-copy" data-ui={`${props.dataUi}-copy`}>
        <strong class="construction-banner-title" data-ui={`${props.dataUi}-status`}>
          {worldActionLabel(props.catalog, props.action.actionId)}
        </strong>
        <em data-ui={`${props.dataUi}-note`}>{UI_COPY.common.offlineCatchupDisabled}</em>
      </div>
      <div class="progress-row" data-ui={`${props.dataUi}-progress-row`}>
        <ProgressBar
          dataUi={`${props.dataUi}-progress`}
          progress={delayedActionProgress(props.action.totalSeconds, props.action.remainingSeconds)}
        />
        <strong class="progress-time" data-ui={`${props.dataUi}-work`}>
          {progressCountdownLabel(props.action.totalSeconds, props.action.remainingSeconds, 's')}
        </strong>
      </div>
    </div>
  ) : (
    <div class="construction-banner construction-idle" data-ui={props.dataUi}>
      <span data-ui={`${props.dataUi}-status`}>{UI_COPY.common.noWorldAction}</span>
      <strong data-ui={`${props.dataUi}-work`}>{UI_COPY.common.heroAvailable}</strong>
    </div>
  )
}

function progressCountdownLabel(total: number, remaining: number, unit: 's' | 'work') {
  const elapsed = Math.max(0, total - remaining)
  return `${Math.ceil(elapsed)}${unit} / ${Math.ceil(total)}${unit}`
}

function worldActionLabel(catalog: CatalogSnapshot | null, actionId: string) {
  return labelForId(catalog, actionId, UI_COPY.common.currentProject)
}

export default App
