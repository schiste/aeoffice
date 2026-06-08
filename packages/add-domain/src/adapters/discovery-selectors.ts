import type { CatalogSnapshot, ResourceSnapshot, SimulationSnapshot } from "../runtime/protocol"
import {
  RESOURCE_BASSLINE,
  RESOURCE_STONE,
  RESOURCE_VIBES,
  WORLD_ACTION_EXPLORE_BASE,
  WORLD_ACTION_INVESTIGATE_BASE,
} from "./add-ids"
import type {
  AddDungeonLinkInfo,
  AddTileInteractionDetail,
  AddTravelExposureRisk,
} from "./map-presentation"
import {
  selectAddFirstPlayableSummary,
  type AddFirstPlayableAction,
} from "./first-playable-script"
import {
  selectAddWorldTime,
  type AddDaylightPhase,
} from "./world-time"

export type AddDiscoveryPhase = "movement" | "choose_tile" | "enter_dungeon" | "act"

export interface AddDiscoveryMovementEvent {
  readonly fromCell: string
  readonly toCell: string
  readonly destinationLabel: string
  readonly exposureRisk: AddTravelExposureRisk
  readonly gameMinutes: number
  readonly discoveredBefore: number
  readonly discoveredAfter: number
  readonly toxicityBefore: number
  readonly toxicityAfter: number
}

export interface AddDiscoveryTravelInput {
  readonly active: boolean
  readonly phase: "idle" | "preview" | "traveling" | "arrived"
  readonly previewCell: string | null
  readonly destinationLabel: string | null
  readonly exposureRisk: string | null
  readonly previewAdjacent: boolean
  readonly gameMinutes: number
}

export interface AddDiscoverySelectorInput {
  readonly snapshot: SimulationSnapshot
  readonly catalog: CatalogSnapshot
  readonly heroCell: string | null
  readonly selectedTile: AddTileInteractionDetail | null
  readonly previewTile: AddTileInteractionDetail | null
  readonly heroDungeonLinks: readonly AddDungeonLinkInfo[]
  readonly selectedDungeonLinks: readonly AddDungeonLinkInfo[]
  readonly travel: AddDiscoveryTravelInput
  readonly lastMovement: AddDiscoveryMovementEvent | null
}

export interface AddDiscoverySummary {
  readonly phase: AddDiscoveryPhase
  readonly headline: string
  readonly detail: string
  readonly movement: AddDiscoveryMovementSummary
  readonly movementConsequences: AddDiscoveryMovementConsequences
  readonly tileChoices: readonly AddDiscoveryTileChoice[]
  readonly selectedTile: AddDiscoverySelectedTileDecision | null
  readonly dungeonEntry: AddDiscoveryDungeonEntry | null
  readonly resourceLinks: readonly AddDiscoveryResourceLink[]
  readonly actionLinks: readonly AddDiscoveryActionLink[]
}

export interface AddDiscoveryMovementSummary {
  readonly title: string
  readonly body: string
  readonly risk: string | null
  readonly gameMinutes: number | null
  readonly discoveredDelta: number
  readonly toxicityDelta: number
}

export type AddMovementSafetySeverity = "safe" | "watch" | "danger" | "critical"
export type AddMovementTimeRiskModifier = "low" | "normal" | "elevated"

export interface AddDiscoveryMovementConsequences {
  readonly active: boolean
  readonly viralLoad: {
    readonly before: number | null
    readonly after: number
    readonly delta: number
    readonly percent: number
    readonly copy: string
  }
  readonly timeOfDay: {
    readonly localTime: string
    readonly phase: AddDaylightPhase
    readonly daylightRatio: number
    readonly copy: string
    readonly riskModifier: AddMovementTimeRiskModifier
  }
  readonly safety: {
    readonly severity: AddMovementSafetySeverity
    readonly headline: string
    readonly detail: string
    readonly secondsUntilForcedReturn: number
    readonly pointOfNoReturnRatio: number
    readonly forcedReturnPhase: string | null
  }
  readonly warnings: readonly string[]
  readonly futureAuthority: "automatic_return_thresholds_later"
}

export interface AddDiscoveryTileChoice {
  readonly id: string
  readonly label: string
  readonly cell: string
  readonly visibility: AddTileInteractionDetail["visibility"]
  readonly infoLevel: AddTileInteractionDetail["knownInfoLevel"]
  readonly risk: AddTravelExposureRisk
  readonly adjacent: boolean
  readonly dungeonCount: number
  readonly copy: string
}

export type AddDiscoveryTileUsefulnessLevel = "high" | "medium" | "low" | "unknown"

export interface AddDiscoverySelectedTileDecision {
  readonly cell: string
  readonly label: string
  readonly visibility: AddTileInteractionDetail["visibility"]
  readonly travel: {
    readonly gameMinutes: number
    readonly standingHere: boolean
    readonly adjacent: boolean
    readonly canTravelNow: boolean
    readonly risk: AddTravelExposureRisk
    readonly copy: string
  }
  readonly facts: {
    readonly known: readonly string[]
    readonly unknown: readonly string[]
  }
  readonly dungeonLinks: {
    readonly count: number
    readonly labels: readonly string[]
    readonly enterableHere: boolean
    readonly copy: string
  }
  readonly usefulness: {
    readonly level: AddDiscoveryTileUsefulnessLevel
    readonly reasons: readonly string[]
  }
}

export interface AddDiscoveryDungeonEntry {
  readonly label: string
  readonly targetMapId: string
  readonly source: "hero_tile" | "selected_tile"
  readonly enabled: boolean
  readonly reason: string | null
}

export interface AddDiscoveryResourceLink {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly target: number | null
  readonly copy: string
  readonly relevant: boolean
}

export interface AddDiscoveryActionLink {
  readonly id: string
  readonly label: string
  readonly kind: "first_playable" | "world_action" | "recruitment" | "dungeon_entry"
  readonly enabled: boolean
  readonly reason: string | null
  readonly action: AddFirstPlayableAction | null
}

export function selectAddDiscoverySummary(
  input: AddDiscoverySelectorInput,
): AddDiscoverySummary {
  const dungeonEntry = dungeonEntryFor(input)
  const actionLinks = actionLinksFor(input, dungeonEntry)
  const movement = movementSummaryFor(input)
  const movementConsequences = movementConsequencesFor(input)
  const tileChoices = tileChoicesFor(input)
  const selectedTile = selectedTileDecisionFor(input)
  const phase = phaseFor(input, dungeonEntry, actionLinks)

  return {
    phase,
    headline: headlineFor(phase, dungeonEntry, input),
    detail: detailFor(phase, movement, dungeonEntry, input),
    movement,
    movementConsequences,
    tileChoices,
    selectedTile,
    dungeonEntry,
    resourceLinks: resourceLinksFor(input.snapshot, input.catalog),
    actionLinks,
  }
}

function movementConsequencesFor(
  input: AddDiscoverySelectorInput,
): AddDiscoveryMovementConsequences {
  const time = selectAddWorldTime(input.snapshot)
  const survival = input.snapshot.heroSurvival
  const before = input.lastMovement?.toxicityBefore ?? null
  const after = input.lastMovement?.toxicityAfter ?? survival.viralLoadRatio
  const delta = input.lastMovement
    ? Math.max(0, input.lastMovement.toxicityAfter - input.lastMovement.toxicityBefore)
    : 0
  const safety = movementSafetyFor(survival)
  const timeOfDay = movementTimeOfDayFor(time)
  const warnings = movementWarningsFor({
    delta,
    location: survival.location,
    safety,
    timeOfDay,
  })

  return {
    active: input.travel.active || input.lastMovement !== null,
    viralLoad: {
      before,
      after,
      delta,
      percent: ratioPercent(after),
      copy: viralLoadCopy(before, after, delta),
    },
    timeOfDay,
    safety,
    warnings,
    futureAuthority: "automatic_return_thresholds_later",
  }
}

function movementTimeOfDayFor(
  time: ReturnType<typeof selectAddWorldTime>,
): AddDiscoveryMovementConsequences["timeOfDay"] {
  switch (time.daylightPhase) {
    case "night":
      return {
        localTime: time.localTime,
        phase: time.daylightPhase,
        daylightRatio: time.daylightRatio,
        riskModifier: "elevated",
        copy: `Night travel at ${time.localTime} makes routes harder to read and should feel riskier.`,
      }
    case "dawn":
      return {
        localTime: time.localTime,
        phase: time.daylightPhase,
        daylightRatio: time.daylightRatio,
        riskModifier: "normal",
        copy: `Dawn at ${time.localTime} gives partial visibility while the day opens.`,
      }
    case "dusk":
      return {
        localTime: time.localTime,
        phase: time.daylightPhase,
        daylightRatio: time.daylightRatio,
        riskModifier: "normal",
        copy: `Dusk at ${time.localTime} is still readable, but the safe scouting window is closing.`,
      }
    case "day":
      return {
        localTime: time.localTime,
        phase: time.daylightPhase,
        daylightRatio: time.daylightRatio,
        riskModifier: "low",
        copy: `Daylight at ${time.localTime} is the safest scouting window for crossing regions.`,
      }
  }
}

function movementSafetyFor(
  survival: SimulationSnapshot["heroSurvival"],
): AddDiscoveryMovementConsequences["safety"] {
  const forcedReturnPhase = survival.forcedReturn?.phase ?? null
  const secondsUntilForcedReturn = Math.max(0, survival.secondsUntilForcedReturn)
  const pointOfNoReturnRatio = Math.max(0.01, survival.pointOfNoReturnRatio)
  const viralPressure = survival.viralLoadRatio / pointOfNoReturnRatio
  const returnPressure =
    survival.requiredTimeToReenterBubbleSeconds > 0
      ? survival.requiredTimeToReenterBubbleSeconds / Math.max(1, secondsUntilForcedReturn)
      : 0
  let severity: AddMovementSafetySeverity = "safe"

  if (forcedReturnPhase) {
    severity = "critical"
  } else if (
    viralPressure >= 0.85 ||
    (secondsUntilForcedReturn > 0 && secondsUntilForcedReturn <= 900) ||
    returnPressure >= 0.75
  ) {
    severity = "danger"
  } else if (
    survival.location === "outside_bubble" ||
    viralPressure >= 0.55 ||
    returnPressure >= 0.35
  ) {
    severity = "watch"
  }

  return {
    severity,
    headline: safetyHeadline(severity),
    detail: safetyDetail(severity, survival, viralPressure),
    secondsUntilForcedReturn,
    pointOfNoReturnRatio,
    forcedReturnPhase,
  }
}

function movementWarningsFor(options: {
  readonly delta: number
  readonly location: SimulationSnapshot["heroSurvival"]["location"]
  readonly safety: AddDiscoveryMovementConsequences["safety"]
  readonly timeOfDay: AddDiscoveryMovementConsequences["timeOfDay"]
}): readonly string[] {
  const warnings: string[] = []

  if (options.delta > 0.0005) {
    warnings.push(`Viral load rose by ${formatPercent(options.delta)} during the crossing.`)
  }
  if (options.timeOfDay.riskModifier === "elevated") {
    warnings.push("Night crossings should carry heavier scouting and encounter pressure.")
  } else if (options.timeOfDay.phase === "dusk") {
    warnings.push("Dusk means the next crossing may happen after the safe daylight window.")
  }
  if (options.location === "outside_bubble") {
    warnings.push("The Hero is outside the bubble; every extra region should feel like commitment.")
  }
  if (options.safety.severity === "danger") {
    warnings.push("You are pushing far enough that return pressure should become part of the choice.")
  }
  if (options.safety.severity === "critical") {
    warnings.push("Forced-return pressure is active; automatic return thresholds remain a later rule gate.")
  }

  return warnings.slice(0, 4)
}

function viralLoadCopy(before: number | null, after: number, delta: number): string {
  if (before === null) {
    return `Current viral load is ${formatPercent(after)} before the next crossing.`
  }
  if (delta > 0.0005) {
    return `The crossing pushed viral load from ${formatPercent(before)} to ${formatPercent(after)}.`
  }
  return `Viral load stayed near ${formatPercent(after)} during this crossing.`
}

function safetyHeadline(severity: AddMovementSafetySeverity): string {
  switch (severity) {
    case "safe":
      return "Return route stable"
    case "watch":
      return "Watch the distance from safety"
    case "danger":
      return "Return pressure is rising"
    case "critical":
      return "Forced return pressure"
  }
}

function safetyDetail(
  severity: AddMovementSafetySeverity,
  survival: SimulationSnapshot["heroSurvival"],
  viralPressure: number,
): string {
  if (severity === "critical") {
    return `The runtime reports ${survival.forcedReturn?.phase ?? "forced-return pressure"}; later rules can turn this into automatic return.`
  }
  if (severity === "danger") {
    return `Viral pressure is ${formatPercent(Math.min(1, viralPressure))} of the current point-of-no-return budget.`
  }
  if (severity === "watch") {
    return "The Hero is far enough from safety that the next move should be a deliberate commitment."
  }
  return "The Hero can still return before survival pressure becomes the main problem."
}

function phaseFor(
  input: AddDiscoverySelectorInput,
  dungeonEntry: AddDiscoveryDungeonEntry | null,
  actionLinks: readonly AddDiscoveryActionLink[],
): AddDiscoveryPhase {
  if (input.travel.active || input.lastMovement) return "movement"
  if (dungeonEntry?.enabled) return "enter_dungeon"
  if (input.selectedTile || input.previewTile) return "choose_tile"
  if (actionLinks.some((link) => link.enabled)) return "act"
  return "choose_tile"
}

function headlineFor(
  phase: AddDiscoveryPhase,
  dungeonEntry: AddDiscoveryDungeonEntry | null,
  input: AddDiscoverySelectorInput,
): string {
  if (phase === "movement" && input.travel.active) return "Crossing the region"
  if (phase === "movement") return "Movement changed the map"
  if (phase === "enter_dungeon") return `Open ${dungeonEntry?.label ?? "the next area"}`
  if (phase === "act") return "Turn discovery into progress"
  return "Choose what to inspect next"
}

function detailFor(
  phase: AddDiscoveryPhase,
  movement: AddDiscoveryMovementSummary,
  dungeonEntry: AddDiscoveryDungeonEntry | null,
  input: AddDiscoverySelectorInput,
): string {
  if (phase === "movement") return movement.body
  if (phase === "enter_dungeon" && dungeonEntry) {
    return `${dungeonEntry.label} is linked from a discovered tile. Enter when you want to switch from overworld scouting into interior exploration.`
  }
  if (phase === "act") {
    return "Use the current available action to convert revealed information into resources, reach, construction, or recruitment."
  }
  if (input.previewTile?.visibility === "hidden") {
    return "Unknown regions can be crossed, but they hide exact terrain, danger, and dungeon links until discovered."
  }
  return "Select or hover a nearby revealed tile to compare travel risk, static facts, and possible links."
}

function movementSummaryFor(input: AddDiscoverySelectorInput): AddDiscoveryMovementSummary {
  if (input.travel.active) {
    return {
      title: "Travel in progress",
      body: `${input.travel.destinationLabel ?? "The next tile"} is consuming one crossing step. Watch the clock and fog halo resolve before choosing again.`,
      risk: input.travel.exposureRisk,
      gameMinutes: null,
      discoveredDelta: 0,
      toxicityDelta: 0,
    }
  }

  const movement = input.lastMovement
  if (movement) {
    const discoveredDelta = Math.max(0, movement.discoveredAfter - movement.discoveredBefore)
    const toxicityDelta = Math.max(0, movement.toxicityAfter - movement.toxicityBefore)
    return {
      title: `Arrived at ${movement.destinationLabel}`,
      body:
        discoveredDelta > 0
          ? `${movement.gameMinutes} minutes passed and ${discoveredDelta} nearby region${discoveredDelta === 1 ? "" : "s"} became readable.`
          : `${movement.gameMinutes} minutes passed. The nearby region was already known.`,
      risk: movement.exposureRisk,
      gameMinutes: movement.gameMinutes,
      discoveredDelta,
      toxicityDelta,
    }
  }

  return {
    title: "Scout one step at a time",
    body: "Each overworld tile crossing spends an hour and reveals the Hero's immediate surroundings.",
    risk: input.travel.exposureRisk,
    gameMinutes: 60,
    discoveredDelta: 0,
    toxicityDelta: 0,
  }
}

function tileChoicesFor(input: AddDiscoverySelectorInput): readonly AddDiscoveryTileChoice[] {
  const choices: AddDiscoveryTileChoice[] = []
  addTileChoice(choices, "selected", input.selectedTile, input.travel.previewAdjacent)
  if (input.previewTile?.cell !== input.selectedTile?.cell) {
    addTileChoice(choices, "preview", input.previewTile, input.travel.previewAdjacent)
  }
  if (choices.length === 0 && input.lastMovement) {
    choices.push({
      id: "arrival",
      label: input.lastMovement.destinationLabel,
      cell: input.lastMovement.toCell,
      visibility: "visible",
      infoLevel: "full_current",
      risk: input.lastMovement.exposureRisk,
      adjacent: false,
      dungeonCount: 0,
      copy: "Arrival tile: use the newly revealed surroundings to choose the next step.",
    })
  }
  return choices.slice(0, 2)
}

function addTileChoice(
  choices: AddDiscoveryTileChoice[],
  id: string,
  tile: AddTileInteractionDetail | null,
  adjacent: boolean,
): void {
  if (!tile) return
  choices.push({
    id,
    label: tile.label,
    cell: tile.cell,
    visibility: tile.visibility,
    infoLevel: tile.knownInfoLevel,
    risk: tile.exposureRisk,
    adjacent,
    dungeonCount: tile.dungeonLinks.length,
    copy:
      tile.visibility === "hidden"
        ? "Hidden: exact facts and dungeon links stay concealed until the Hero reveals it."
        : tile.dungeonLinks.length > 0
          ? "Known link: this tile can open a deeper area."
          : tile.travelCopy,
  })
}

function dungeonEntryFor(input: AddDiscoverySelectorInput): AddDiscoveryDungeonEntry | null {
  const heroLink = input.heroDungeonLinks.find((link) => link.enabled)
  if (heroLink) {
    return {
      label: heroLink.label,
      targetMapId: heroLink.targetMapId,
      source: "hero_tile",
      enabled: true,
      reason: null,
    }
  }

  const selectedLink = input.selectedDungeonLinks.find((link) => link.enabled)
  if (selectedLink) {
    return {
      label: selectedLink.label,
      targetMapId: selectedLink.targetMapId,
      source: "selected_tile",
      enabled: false,
      reason: "Move the Hero onto this linked tile to enter.",
    }
  }

  const lockedLink = [...input.heroDungeonLinks, ...input.selectedDungeonLinks][0]
  if (!lockedLink) return null
  return {
    label: lockedLink.label,
    targetMapId: lockedLink.targetMapId,
    source: "selected_tile",
    enabled: false,
    reason: "Move onto a discovered, open linked tile first.",
  }
}

function selectedTileDecisionFor(
  input: AddDiscoverySelectorInput,
): AddDiscoverySelectedTileDecision | null {
  const tile = input.selectedTile
  if (!tile) return null

  const standingHere = input.heroCell === tile.cell
  const adjacent =
    !standingHere && input.travel.previewAdjacent && input.travel.previewCell === tile.cell
  const canTravelNow = adjacent && tile.visibility !== "hidden"
  const known = knownFactRows(tile)
  const unknown = unknownFactRows(tile)
  const usefulnessReasons = usefulnessReasonsFor(input, tile)
  return {
    cell: tile.cell,
    label: conciseTileLabel(tile.label),
    visibility: tile.visibility,
    travel: {
      gameMinutes: input.travel.gameMinutes,
      standingHere,
      adjacent,
      canTravelNow,
      risk: tile.exposureRisk,
      copy: travelDecisionCopy(tile, standingHere, adjacent, canTravelNow),
    },
    facts: {
      known,
      unknown,
    },
    dungeonLinks: {
      count: tile.dungeonLinks.length,
      labels: tile.dungeonLinks.map((link) => link.label),
      enterableHere: input.heroDungeonLinks.some(
        (link) => link.enabled && tile.dungeonLinks.some((tileLink) => tileLink.id === link.id),
      ),
      copy: dungeonDecisionCopy(tile, input.heroDungeonLinks),
    },
    usefulness: {
      level: usefulnessLevelFor(tile, usefulnessReasons),
      reasons: usefulnessReasons,
    },
  }
}

function knownFactRows(tile: AddTileInteractionDetail): readonly string[] {
  if (tile.visibility === "hidden") return []
  const rows = [`Terrain: ${titleCase(tile.terrain.replaceAll("_", " "))}`]
  if (tile.knownInfoLevel === "full_current") {
    rows.push(`Current state: ${titleCase(tile.state.replaceAll("_", " "))}`)
    rows.push(`Toxicity: ${titleCase(tile.exposureRisk.replaceAll("_", " "))}`)
  }
  if (tile.dungeonLinks.length > 0) {
    rows.push(`${tile.dungeonLinks.length} dungeon link${tile.dungeonLinks.length === 1 ? "" : "s"} known`)
  }
  return rows.slice(0, 4)
}

function unknownFactRows(tile: AddTileInteractionDetail): readonly string[] {
  if (tile.visibility === "hidden") {
    return ["Exact terrain", "toxicity risk", "dungeon links", "resource value"]
  }
  if (tile.knownInfoLevel === "known_static") {
    return ["Current toxicity", "active threats", "fresh resource state"]
  }
  return tile.dungeonLinks.length === 0
    ? ["No interior link is currently known here"]
    : ["Interior details remain unknown until entered"]
}

function travelDecisionCopy(
  tile: AddTileInteractionDetail,
  standingHere: boolean,
  adjacent: boolean,
  canTravelNow: boolean,
): string {
  if (standingHere) {
    return "The Hero is already here; use local links or choose the next adjacent region."
  }
  if (tile.visibility === "hidden") {
    return "Travel may be possible, but the destination is not readable yet."
  }
  if (canTravelNow) {
    return "Adjacent destination: crossing consumes one in-game hour."
  }
  if (!adjacent) {
    return "Select an adjacent revealed tile or move closer before crossing."
  }
  return "The tile is readable, but movement is not currently available."
}

function dungeonDecisionCopy(
  tile: AddTileInteractionDetail,
  heroLinks: readonly AddDungeonLinkInfo[],
): string {
  if (tile.visibility === "hidden") return "Dungeon links are hidden until discovery."
  if (tile.dungeonLinks.length === 0) return "No dungeon entrance is known on this tile."
  const enterable = tile.dungeonLinks.some((tileLink) =>
    heroLinks.some((heroLink) => heroLink.enabled && heroLink.id === tileLink.id),
  )
  return enterable
    ? "The Hero is standing on this entrance and can enter now."
    : "Move the Hero onto this linked tile to enter."
}

function usefulnessReasonsFor(
  input: AddDiscoverySelectorInput,
  tile: AddTileInteractionDetail,
): readonly string[] {
  if (tile.visibility === "hidden") return ["Unknown region: useful mainly as a scouting choice."]

  const firstPlayable = selectAddFirstPlayableSummary(input.snapshot, input.catalog)
  const currentStep = firstPlayable.currentStepId
  const reasons: string[] = []
  if (tile.dungeonLinks.length > 0) {
    reasons.push("Opens an interior map or future dungeon objective.")
  }
  if (tile.feature === "survivor_cave") {
    reasons.push("Relevant to Survivor Cave entry and recruitment progression.")
  }
  if (tile.feature === "base" || tile.feature === "base_core") {
    reasons.push("Relevant to Base actions, repairs, and early resource loops.")
  }
  if (tile.terrain === "river") reasons.push("Likely relevant to water collection later.")
  if (tile.terrain === "scrub") reasons.push("Likely relevant to scavenging and material pressure.")
  if (tile.exposureRisk === "studio" || tile.exposureRisk === "safe_field") {
    reasons.push("Low-risk staging tile for the next move.")
  }
  if (
    (currentStep === "bubble-reach" || currentStep === "unlock-recruitment") &&
    tile.dungeonLinks.length > 0
  ) {
    reasons.push("Directly supports the current first-playable reach objective.")
  }
  if (
    (currentStep === "generate-resources" || currentStep === "restore-studio") &&
    (tile.feature === "base" || tile.feature === "base_core" || tile.terrain === "scrub")
  ) {
    reasons.push("Supports the current resource and repair objective.")
  }
  if (reasons.length === 0) {
    reasons.push("Useful for map knowledge and choosing a safer future route.")
  }
  return reasons.slice(0, 3)
}

function usefulnessLevelFor(
  tile: AddTileInteractionDetail,
  reasons: readonly string[],
): AddDiscoveryTileUsefulnessLevel {
  if (tile.visibility === "hidden") return "unknown"
  if (tile.dungeonLinks.length > 0 || tile.feature === "survivor_cave") return "high"
  if (reasons.length > 1 || tile.feature === "base" || tile.feature === "base_core") return "medium"
  return "low"
}

function conciseTileLabel(label: string): string {
  return label.replace(/\s*->.*$/, "")
}

function resourceLinksFor(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly AddDiscoveryResourceLink[] {
  const firstPlayable = selectAddFirstPlayableSummary(snapshot, catalog)
  const currentStep = firstPlayable.currentStepId
  return [
    resourceLink(catalog, snapshot.resources, RESOURCE_STONE, {
      target: 600,
      relevant: currentStep === "generate-resources" || currentStep === "restore-studio",
      copy: "Stone turns exploration into Studio repairs and early construction.",
    }),
    resourceLink(catalog, snapshot.resources, RESOURCE_BASSLINE, {
      target: snapshot.objectives.reachObjectiveTarget,
      relevant: currentStep === "bubble-reach" || currentStep === "unlock-recruitment",
      copy: "Bassline pushes the bubble outward, revealing safer choices and recruitment reach.",
    }),
    resourceLink(catalog, snapshot.resources, RESOURCE_VIBES, {
      target: snapshot.recruitment.nextRecruitCost,
      relevant: currentStep === "recruit-once",
      copy: "Vibes pay the first survivor recruitment cost once the cave is in reach.",
    }),
  ]
}

function resourceLink(
  catalog: CatalogSnapshot,
  resources: ResourceSnapshot,
  id: string,
  options: {
    readonly target: number | null
    readonly relevant: boolean
    readonly copy: string
  },
): AddDiscoveryResourceLink {
  return {
    id,
    label: catalog.resources.find((resource) => resource.id === id)?.label ?? id,
    value: resourceValue(resources, id),
    target: options.target,
    copy: options.copy,
    relevant: options.relevant,
  }
}

function actionLinksFor(
  input: AddDiscoverySelectorInput,
  dungeonEntry: AddDiscoveryDungeonEntry | null,
): readonly AddDiscoveryActionLink[] {
  const firstPlayable = selectAddFirstPlayableSummary(input.snapshot, input.catalog)
  const activeStep = firstPlayable.steps.find((step) => step.active)
  const links: AddDiscoveryActionLink[] = []

  if (activeStep?.actionLabel) {
    links.push({
      id: `first-playable:${activeStep.id}`,
      label: activeStep.actionLabel,
      kind: "first_playable",
      enabled: Boolean(activeStep.action),
      reason: activeStep.action ? null : activeStep.detail,
      action: activeStep.action,
    })
  }

  const worldAction = input.catalog.worldActions.find(
    (action) =>
      action.id === WORLD_ACTION_INVESTIGATE_BASE || action.id === WORLD_ACTION_EXPLORE_BASE,
  )
  if (worldAction) {
    const enabled = input.snapshot.activeWorldAction === null && input.snapshot.roster.heroAssigned
    links.push({
      id: `world-action:${worldAction.id}`,
      label: worldAction.label,
      kind: "world_action",
      enabled,
      reason: enabled ? null : "Assign the Hero and finish any active action first.",
      action: {
        type: "start_world_action",
        actionId: worldAction.id,
      },
    })
  }

  if (input.snapshot.objectives.recruitmentEnabled) {
    links.push({
      id: "recruitment:survivor-cave",
      label: "Recruit survivor",
      kind: "recruitment",
      enabled: input.snapshot.resources.vibes >= input.snapshot.recruitment.nextRecruitCost,
      reason:
        input.snapshot.resources.vibes >= input.snapshot.recruitment.nextRecruitCost
          ? null
          : "Generate enough Vibes for the next recruit.",
      action: { type: "recruit_from_survivor_cave" },
    })
  }

  if (dungeonEntry) {
    const dungeonLink: AddDiscoveryActionLink = {
      id: `dungeon:${dungeonEntry.targetMapId}`,
      label: `Enter ${dungeonEntry.label}`,
      kind: "dungeon_entry",
      enabled: dungeonEntry.enabled,
      reason: dungeonEntry.reason,
      action: null,
    }
    if (dungeonEntry.enabled) links.unshift(dungeonLink)
    else links.push(dungeonLink)
  }

  return links.slice(0, 4)
}

function resourceValue(resources: ResourceSnapshot, id: string): number {
  switch (id) {
    case RESOURCE_BASSLINE:
      return resources.bassline
    case RESOURCE_STONE:
      return resources.stone
    case RESOURCE_VIBES:
      return resources.vibes
    default:
      return 0
  }
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ")
}

function ratioPercent(value: number): number {
  return Math.round(Math.max(0, value) * 1000) / 10
}

function formatPercent(value: number): string {
  return `${ratioPercent(value)}%`
}
