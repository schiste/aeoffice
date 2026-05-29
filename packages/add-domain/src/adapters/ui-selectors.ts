import type {
  CatalogSnapshot,
  ResourceDef,
  SimulationSnapshot,
  StoryBeatDef,
  WorldActionDef,
} from "../runtime/protocol"

export interface AddResourceSummary {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly cap: number
  readonly category: ResourceDef["category"]
}

export interface AddObjectiveSummary {
  readonly reachTarget: number
  readonly reachMet: boolean
  readonly survivorCaveDistance: number
  readonly recruitmentEnabled: boolean
  readonly survivorCaveInBubble: boolean
}

export interface AddWorldActionSummary {
  readonly id: string
  readonly label: string
  readonly enabled: boolean
  readonly durationSeconds: number
  readonly heroOnly: boolean
}

export interface AddUiState {
  readonly resources: readonly AddResourceSummary[]
  readonly objective: AddObjectiveSummary
  readonly activeStoryBeat: StoryBeatDef | null
  readonly availableWorldActions: readonly AddWorldActionSummary[]
  readonly notes: readonly string[]
}

export function selectAddUiState(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): AddUiState {
  return {
    resources: selectAddResourceSummaries(snapshot, catalog),
    objective: selectAddObjectiveSummary(snapshot),
    activeStoryBeat: selectActiveStoryBeat(snapshot, catalog),
    availableWorldActions: selectAddWorldActionSummaries(snapshot, catalog),
    notes: snapshot.notes,
  }
}

export function selectAddResourceSummaries(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly AddResourceSummary[] {
  return catalog.resources.map((resource) => ({
    id: resource.id,
    label: resource.label,
    value: resourceValue(snapshot, resource.id),
    cap: resourceCap(snapshot, resource.id, resource.baseCap),
    category: resource.category,
  }))
}

export function selectAddObjectiveSummary(
  snapshot: SimulationSnapshot,
): AddObjectiveSummary {
  return {
    reachTarget: snapshot.objectives.reachObjectiveTarget,
    reachMet: snapshot.objectives.reachObjectiveMet,
    survivorCaveDistance: snapshot.objectives.survivorCaveDistance,
    recruitmentEnabled: snapshot.objectives.recruitmentEnabled,
    survivorCaveInBubble: snapshot.objectives.survivorCaveInBubble,
  }
}

export function selectActiveStoryBeat(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): StoryBeatDef | null {
  const activeBeatId = snapshot.narrative.activeBeatId
  if (!activeBeatId) return null
  return catalog.storyBeats.find((beat) => beat.id === activeBeatId) ?? null
}

export function selectAddWorldActionSummaries(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly AddWorldActionSummary[] {
  return catalog.worldActions.map((action) => ({
    id: action.id,
    label: action.label,
    durationSeconds: action.durationSeconds,
    heroOnly: action.heroOnly,
    enabled: worldActionEnabled(snapshot, action),
  }))
}

function worldActionEnabled(
  snapshot: SimulationSnapshot,
  action: WorldActionDef,
): boolean {
  if (snapshot.activeWorldAction) return false
  if (action.heroOnly && !snapshot.roster.heroAssigned) return false
  if (
    action.heroExposure === "bubble" &&
    snapshot.heroSurvival.location === "outside_bubble"
  ) {
    return false
  }
  return true
}

function resourceValue(snapshot: SimulationSnapshot, resourceId: string): number {
  switch (resourceId) {
    case "resource.bassline":
      return snapshot.resources.bassline
    case "resource.chorus":
      return snapshot.resources.chorus
    case "resource.harmonics":
      return snapshot.resources.harmonics
    case "resource.stone":
      return snapshot.resources.stone
    case "resource.water":
      return snapshot.resources.water
    case "resource.vibes":
      return snapshot.resources.vibes
    default:
      return 0
  }
}

function resourceCap(
  snapshot: SimulationSnapshot,
  resourceId: string,
  fallbackCap: number,
): number {
  switch (resourceId) {
    case "resource.bassline":
      return snapshot.resources.basslineCap
    case "resource.chorus":
      return snapshot.resources.chorusCap
    case "resource.harmonics":
      return snapshot.resources.harmonicsCap
    case "resource.stone":
      return snapshot.resources.stoneCap
    case "resource.water":
      return snapshot.resources.waterCap
    case "resource.vibes":
      return snapshot.resources.vibesCap
    default:
      return fallbackCap
  }
}
