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
  readonly destinationLabel: string | null
  readonly exposureRisk: string | null
  readonly previewAdjacent: boolean
}

export interface AddDiscoverySelectorInput {
  readonly snapshot: SimulationSnapshot
  readonly catalog: CatalogSnapshot
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
  readonly tileChoices: readonly AddDiscoveryTileChoice[]
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
  const tileChoices = tileChoicesFor(input)
  const phase = phaseFor(input, dungeonEntry, actionLinks)

  return {
    phase,
    headline: headlineFor(phase, dungeonEntry, input),
    detail: detailFor(phase, movement, dungeonEntry, input),
    movement,
    tileChoices,
    dungeonEntry,
    resourceLinks: resourceLinksFor(input.snapshot, input.catalog),
    actionLinks,
  }
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
