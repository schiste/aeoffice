import type {
  CatalogSnapshot,
  ConstructionOptionDef,
  CostDef,
  RequirementDef,
  ResourceDef,
  RoleDef,
  SimulationSnapshot,
  StoryBeatDef,
  WorldActionDef,
} from "../runtime/protocol"
import { selectAddWorldTime, type AddWorldTimeSummary } from "./world-time"

const RESOURCE_BASSLINE = "resource.bassline"
const RESOURCE_CHORUS = "resource.chorus"
const RESOURCE_HARMONICS = "resource.harmonics"
const RESOURCE_STONE = "resource.stone"
const RESOURCE_WATER = "resource.water"
const RESOURCE_VIBES = "resource.vibes"

const ROLE_CRYSTAL_BASSLINE = "role.crystal_bassline"
const ROLE_CRYSTAL_CHORUS = "role.crystal_chorus"
const ROLE_CRYSTAL_HARMONICS = "role.crystal_harmonics"
const ROLE_CONSTRUCTION = "role.construction"
const ROLE_FIRE_PIT = "role.fire_pit"
const ROLE_SCAVENGE = "role.scavenge"
const ROLE_WATER = "role.water"

const PROJECT_RESTORE_STUDIO = "project.restore_studio"
const PROJECT_BUILD_FIRE_PIT = "project.build_fire_pit"

const WORLD_ACTION_INVESTIGATE_BASE = "world_action.investigate_base"
const WORLD_ACTION_EXPLORE_BASE = "world_action.explore_base"

const PRE_ARRIVAL_STORY_BEATS = new Set([
  "story.beat.road_to_base",
  "story.beat.first_glimpse",
  "story.beat.enter_the_bubble",
])

export interface AddResourceSummary {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly cap: number
  readonly category: ResourceDef["category"]
  readonly source: string
  readonly sink: string
  readonly blocker: string | null
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
  readonly blockedReason: string | null
}

export interface AddRoleAssignmentSummary {
  readonly id: string
  readonly label: string
  readonly available: boolean
  readonly heroAssigned: boolean
  readonly crewAssigned: number
  readonly suggestedCrew: number
  readonly lockedReason: string | null
}

export interface AddConstructionSummary {
  readonly id: string
  readonly label: string
  readonly complete: boolean
  readonly enabled: boolean
  readonly inProgress: boolean
  readonly remainingSeconds: number | null
  readonly costLabel: string
  readonly blockedReason: string | null
}

export type AddFirstPlayableAction =
  | { readonly type: "choose_story_option"; readonly beatId: string; readonly optionId: string }
  | { readonly type: "assign_hero"; readonly assigned: boolean }
  | { readonly type: "set_hero_role"; readonly roleId: string }
  | { readonly type: "set_role_crew"; readonly roleId: string; readonly crew: number }
  | { readonly type: "start_world_action"; readonly actionId: string }
  | { readonly type: "start_construction"; readonly optionId: string }
  | { readonly type: "tick"; readonly seconds: number }
  | { readonly type: "recruit_from_survivor_cave" }

export interface AddFirstPlayableStep {
  readonly id: string
  readonly label: string
  readonly complete: boolean
  readonly active: boolean
  readonly detail: string
  readonly actionLabel: string | null
  readonly action: AddFirstPlayableAction | null
}

export interface AddFirstPlayableSummary {
  readonly complete: boolean
  readonly completedCount: number
  readonly totalCount: number
  readonly currentStepId: string | null
  readonly steps: readonly AddFirstPlayableStep[]
}

export interface AddUiState {
  readonly worldTime: AddWorldTimeSummary
  readonly resources: readonly AddResourceSummary[]
  readonly objective: AddObjectiveSummary
  readonly activeStoryBeat: StoryBeatDef | null
  readonly availableWorldActions: readonly AddWorldActionSummary[]
  readonly roleAssignments: readonly AddRoleAssignmentSummary[]
  readonly constructionOptions: readonly AddConstructionSummary[]
  readonly firstPlayable: AddFirstPlayableSummary
  readonly notes: readonly string[]
}

export function selectAddUiState(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): AddUiState {
  return {
    worldTime: selectAddWorldTime(snapshot),
    resources: selectAddResourceSummaries(snapshot, catalog),
    objective: selectAddObjectiveSummary(snapshot),
    activeStoryBeat: selectActiveStoryBeat(snapshot, catalog),
    availableWorldActions: selectAddWorldActionSummaries(snapshot, catalog),
    roleAssignments: selectAddRoleAssignmentSummaries(snapshot, catalog),
    constructionOptions: selectAddConstructionSummaries(snapshot, catalog),
    firstPlayable: selectAddFirstPlayableSummary(snapshot, catalog),
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
    ...resourceFlowCopy(snapshot, resource.id),
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
    enabled: worldActionBlockedReason(snapshot, action) === null,
    blockedReason: worldActionBlockedReason(snapshot, action),
  }))
}

export function selectAddRoleAssignmentSummaries(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly AddRoleAssignmentSummary[] {
  return catalog.roles.map((role) => {
    const available = roleAvailable(snapshot, role.id)
    return {
      id: role.id,
      label: role.label,
      available,
      heroAssigned: snapshot.roster.heroAssigned && snapshot.roster.heroRoleId === role.id,
      crewAssigned: roleCrew(snapshot, role.id),
      suggestedCrew: suggestedCrewForRole(snapshot, role),
      lockedReason: available ? null : roleLockedReason(snapshot, role.id),
    }
  })
}

export function selectAddConstructionSummaries(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): readonly AddConstructionSummary[] {
  return catalog.constructionOptions.map((option) => constructionSummary(snapshot, option))
}

export function selectAddFirstPlayableSummary(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): AddFirstPlayableSummary {
  const activeBeat = selectActiveStoryBeat(snapshot, catalog)
  const stepsWithoutActive: Omit<AddFirstPlayableStep, "active">[] = [
    preArrivalStep(snapshot, activeBeat),
    heroAndCrewStep(snapshot),
    investigateStep(snapshot, activeBeat),
    exploreStep(snapshot, activeBeat),
    generateResourcesStep(snapshot),
    restoreStudioStep(snapshot),
    buildFirePitStep(snapshot),
    bubbleReachStep(snapshot),
    unlockRecruitmentStep(snapshot),
    recruitOnceStep(snapshot),
  ]
  const currentStepId = stepsWithoutActive.find((step) => !step.complete)?.id ?? null
  const steps = stepsWithoutActive.map((step) => ({
    ...step,
    active: step.id === currentStepId,
  }))
  return {
    complete: currentStepId === null,
    completedCount: steps.filter((step) => step.complete).length,
    totalCount: steps.length,
    currentStepId,
    steps,
  }
}

function worldActionBlockedReason(
  snapshot: SimulationSnapshot,
  action: WorldActionDef,
): string | null {
  if (snapshot.activeWorldAction) return "Another world action is already running."
  if (action.heroOnly && !snapshot.roster.heroAssigned) return "Assign the Hero first."
  if (
    action.heroExposure === "bubble" &&
    snapshot.heroSurvival.location === "outside_bubble"
  ) {
    return "Hero must be back inside the bubble."
  }
  return null
}

function roleAvailable(snapshot: SimulationSnapshot, roleId: string): boolean {
  switch (roleId) {
    case ROLE_CRYSTAL_CHORUS:
      return snapshot.base.studioRestored
    case ROLE_CRYSTAL_HARMONICS:
      return snapshot.base.resonanceChamberBuilt
    case ROLE_FIRE_PIT:
      return snapshot.base.firePitBuilt
    default:
      return true
  }
}

function roleCrew(snapshot: SimulationSnapshot, roleId: string): number {
  const crewByRole = snapshot.roster.crewByRole as
    | Record<string, number>
    | Map<string, number>
    | undefined
  if (!crewByRole) return 0
  if (typeof (crewByRole as Map<string, number>).get === "function") {
    return Number((crewByRole as Map<string, number>).get(roleId) ?? 0)
  }
  return Number((crewByRole as Record<string, number>)[roleId] ?? 0)
}

function roleHasWorker(snapshot: SimulationSnapshot, roleId: string): boolean {
  return (
    roleCrew(snapshot, roleId) > 0 ||
    (snapshot.roster.heroAssigned && snapshot.roster.heroRoleId === roleId)
  )
}

function storyChoiceSelected(snapshot: SimulationSnapshot, beatId: string): boolean {
  const choiceByBeat = snapshot.narrative.choiceByBeat as
    | Record<string, string>
    | Map<string, string>
    | undefined
  if (!choiceByBeat) return false
  if (typeof (choiceByBeat as Map<string, string>).has === "function") {
    return (choiceByBeat as Map<string, string>).has(beatId)
  }
  return Boolean((choiceByBeat as Record<string, string>)[beatId])
}

function roleLockedReason(snapshot: SimulationSnapshot, roleId: string): string | null {
  switch (roleId) {
    case ROLE_CRYSTAL_CHORUS:
      return snapshot.base.studioRestored ? null : "Restore the Studio to unlock Chorus."
    case ROLE_CRYSTAL_HARMONICS:
      return snapshot.base.resonanceChamberBuilt
        ? null
        : "Build the Resonance Chamber to unlock Harmonics."
    case ROLE_FIRE_PIT:
      return snapshot.base.firePitBuilt ? null : "Build the Fire Pit to staff Vibes."
    default:
      return null
  }
}

function suggestedCrewForRole(snapshot: SimulationSnapshot, role: RoleDef): number {
  if (!roleAvailable(snapshot, role.id)) return 0
  if (role.id === ROLE_FIRE_PIT) return snapshot.base.firePitBuilt ? 1 : 0
  if (role.id === ROLE_SCAVENGE) return Math.min(2, snapshot.roster.totalCrew)
  if (role.id === ROLE_CONSTRUCTION) return Math.min(2, snapshot.roster.totalCrew)
  if (role.id === ROLE_CRYSTAL_BASSLINE) return Math.min(2, snapshot.roster.totalCrew)
  if (role.id === ROLE_WATER) return snapshot.base.waterCollectionUnlocked ? 1 : 0
  return Math.min(role.maxCrewSlots ?? snapshot.roster.totalCrew, snapshot.roster.totalCrew)
}

function constructionSummary(
  snapshot: SimulationSnapshot,
  option: ConstructionOptionDef,
): AddConstructionSummary {
  const complete = constructionComplete(snapshot, option.id)
  const inProgress = snapshot.activeConstruction?.optionId === option.id
  const requirementBlocker = constructionRequirementBlocker(snapshot, option)
  const affordabilityBlocker = constructionAffordabilityBlocker(snapshot, option)
  const busyBlocker =
    snapshot.activeConstruction && !inProgress ? "Another project is already in progress." : null
  const blockedReason = complete
    ? "Complete."
    : busyBlocker ?? requirementBlocker ?? affordabilityBlocker
  return {
    id: option.id,
    label: option.label,
    complete,
    enabled: !complete && !inProgress && blockedReason === null,
    inProgress,
    remainingSeconds: inProgress ? snapshot.activeConstruction?.remainingWorkSeconds ?? null : null,
    costLabel: costLabel(option.cost),
    blockedReason,
  }
}

function constructionComplete(snapshot: SimulationSnapshot, optionId: string): boolean {
  switch (optionId) {
    case PROJECT_RESTORE_STUDIO:
      return snapshot.base.studioRestored
    case PROJECT_BUILD_FIRE_PIT:
      return snapshot.base.firePitBuilt
    default:
      return false
  }
}

function constructionRequirementBlocker(
  snapshot: SimulationSnapshot,
  option: ConstructionOptionDef,
): string | null {
  if (requirementsMet(snapshot, option.requirements)) return null
  if (option.id === PROJECT_RESTORE_STUDIO) return "Explore the Base to unlock Studio restoration."
  return "Requirements are not met yet."
}

function constructionAffordabilityBlocker(
  snapshot: SimulationSnapshot,
  option: ConstructionOptionDef,
): string | null {
  switch (option.cost.kind) {
    case "upfront": {
      const amount = option.cost.amount ?? 0
      const resourceId = option.cost.resource_id
      if (!resourceId || resourceValue(snapshot, resourceId) >= amount) return null
      return `Need ${formatAmount(amount)} ${resourceName(resourceId)}.`
    }
    case "upfront_bundle": {
      const missing = option.cost.costs?.find(
        (cost) => resourceValue(snapshot, cost.item_id) < cost.amount,
      )
      return missing
        ? `Need ${formatAmount(missing.amount)} ${resourceName(missing.item_id)}.`
        : null
    }
    default:
      return null
  }
}

function requirementsMet(
  snapshot: SimulationSnapshot,
  requirements: readonly RequirementDef[],
): boolean {
  return requirements.every((requirement) => {
    switch (requirement.kind) {
      case "flag_set":
        return flagValue(snapshot, requirement.flag_id)
      case "flag_unset":
        return !flagValue(snapshot, requirement.flag_id)
    }
  })
}

function flagValue(snapshot: SimulationSnapshot, flagId: string): boolean {
  switch (flagId) {
    case "flag.base.studio_restore_unlocked":
      return snapshot.base.studioRestoreUnlocked
    case "flag.base.studio_restored":
      return snapshot.base.studioRestored
    case "flag.base.fire_pit_built":
      return snapshot.base.firePitBuilt
    case "flag.base.resonance_chamber_built":
      return snapshot.base.resonanceChamberBuilt
    case "flag.base.mix_console_built":
      return snapshot.base.mixConsoleBuilt
    case "flag.base.workshop_built":
      return snapshot.base.workshopBuilt
    case "flag.base.research_booth_built":
      return snapshot.base.researchBoothBuilt
    case "flag.base.tutorial_investigated":
      return snapshot.base.tutorialInvestigated
    case "flag.base.tutorial_explored":
      return snapshot.base.tutorialExplored
    case "flag.base.water_collection_unlocked":
      return snapshot.base.waterCollectionUnlocked
    case "flag.crystal.removing_moss_unlocked":
      return snapshot.crystalCircle.removingMossUnlocked
    case "flag.crystal.removing_moss_completed":
      return snapshot.crystalCircle.removingMossCompleted
    default:
      return false
  }
}

function preArrivalStep(
  snapshot: SimulationSnapshot,
  activeBeat: StoryBeatDef | null,
): Omit<AddFirstPlayableStep, "active"> {
  const complete = !activeBeat || !PRE_ARRIVAL_STORY_BEATS.has(activeBeat.id)
  return {
    id: "reach-base",
    label: "Reach the Base",
    complete,
    detail: complete
      ? "The Hero has crossed into the Base arc."
      : activeBeat.body,
    ...storyChoiceAction(snapshot, activeBeat),
  }
}

function heroAndCrewStep(snapshot: SimulationSnapshot): Omit<AddFirstPlayableStep, "active"> {
  const heroBusy = Boolean(snapshot.activeWorldAction)
  const crewReady =
    roleCrew(snapshot, ROLE_CRYSTAL_BASSLINE) > 0 ||
    roleCrew(snapshot, ROLE_SCAVENGE) > 0 ||
    snapshot.base.tutorialInvestigated
  const complete = (snapshot.roster.heroAssigned || heroBusy) && crewReady
  if (!snapshot.roster.heroAssigned && !heroBusy) {
    return {
      id: "assign-hero-crew",
      label: "Assign Hero and crew",
      complete,
      detail: "Put the Hero on duty so the Base can start producing and acting.",
      actionLabel: "Assign Hero",
      action: { type: "assign_hero", assigned: true },
    }
  }
  if (roleCrew(snapshot, ROLE_CRYSTAL_BASSLINE) < 1) {
    return {
      id: "assign-hero-crew",
      label: "Assign Hero and crew",
      complete,
      detail: "Put at least one crew member on Bassline to make the bubble visible.",
      actionLabel: "Assign Bassline crew",
      action: { type: "set_role_crew", roleId: ROLE_CRYSTAL_BASSLINE, crew: 1 },
    }
  }
  return {
    id: "assign-hero-crew",
    label: "Assign Hero and crew",
    complete,
    detail: "Hero and crew are contributing to the first loop.",
    actionLabel: null,
    action: null,
  }
}

function investigateStep(
  snapshot: SimulationSnapshot,
  activeBeat: StoryBeatDef | null,
): Omit<AddFirstPlayableStep, "active"> {
  const complete = snapshot.base.tutorialInvestigated
  return {
    id: "investigate-base",
    label: "Investigate the Base",
    complete,
    detail: complete
      ? "The first sweep identified what can still run."
      : "Choose how to investigate, then send the Hero through the first sweep.",
    ...worldActionStepAction(snapshot, activeBeat, WORLD_ACTION_INVESTIGATE_BASE, "Start Investigate Base"),
  }
}

function exploreStep(
  snapshot: SimulationSnapshot,
  activeBeat: StoryBeatDef | null,
): Omit<AddFirstPlayableStep, "active"> {
  const complete = snapshot.base.tutorialExplored
  return {
    id: "explore-base",
    label: "Explore deeper",
    complete,
    detail: complete
      ? "Studio restoration, water, and moss cleanup are unlocked."
      : "Explore the ruin to unlock the first repair projects.",
    ...worldActionStepAction(snapshot, activeBeat, WORLD_ACTION_EXPLORE_BASE, "Start Explore Base"),
  }
}

function generateResourcesStep(snapshot: SimulationSnapshot): Omit<AddFirstPlayableStep, "active"> {
  const complete = snapshot.resources.stone >= 600 && snapshot.resources.bassline > 0
  if (snapshot.resources.stone < 600) {
    if (snapshot.roster.heroRoleId !== ROLE_SCAVENGE || !snapshot.roster.heroAssigned) {
      return {
        id: "generate-resources",
        label: "Generate first resources",
        complete,
        detail: "Gather Stone for the Studio and keep Bassline visible for bubble reach.",
        actionLabel: "Send Hero scavenging",
        action: { type: "set_hero_role", roleId: ROLE_SCAVENGE },
      }
    }
    if (roleCrew(snapshot, ROLE_SCAVENGE) < 1) {
      return {
        id: "generate-resources",
        label: "Generate first resources",
        complete,
        detail: "Crew scavenging makes the first construction costs readable quickly.",
        actionLabel: "Assign Scavenge crew",
        action: { type: "set_role_crew", roleId: ROLE_SCAVENGE, crew: 2 },
      }
    }
    return {
      id: "generate-resources",
      label: "Generate first resources",
      complete,
      detail: `Stone ${formatAmount(snapshot.resources.stone)} / 600 for Studio restoration.`,
      actionLabel: "Gather resources",
      action: { type: "tick", seconds: 8 },
    }
  }
  if (snapshot.resources.bassline <= 0) {
    return {
      id: "generate-resources",
      label: "Generate first resources",
      complete,
      detail: "Bassline is the visible pressure behind bubble reach.",
      actionLabel: "Generate Bassline",
      action: { type: "tick", seconds: 8 },
    }
  }
  return {
    id: "generate-resources",
    label: "Generate first resources",
    complete,
    detail: "The Base has enough Stone and Bassline to make the next choice meaningful.",
    actionLabel: null,
    action: null,
  }
}

function restoreStudioStep(snapshot: SimulationSnapshot): Omit<AddFirstPlayableStep, "active"> {
  const complete = snapshot.base.studioRestored
  return constructionStep(
    snapshot,
    "restore-studio",
    "Restore the Studio",
    complete,
    PROJECT_RESTORE_STUDIO,
    "Start Studio restoration",
    "The Studio opens Chorus and turns the Base into a real home.",
  )
}

function buildFirePitStep(snapshot: SimulationSnapshot): Omit<AddFirstPlayableStep, "active"> {
  const complete = snapshot.base.firePitBuilt
  return constructionStep(
    snapshot,
    "build-fire-pit",
    "Build the Fire Pit",
    complete,
    PROJECT_BUILD_FIRE_PIT,
    "Start Fire Pit",
    "The Fire Pit creates Vibes, which make recruitment possible.",
  )
}

function bubbleReachStep(snapshot: SimulationSnapshot): Omit<AddFirstPlayableStep, "active"> {
  const complete = snapshot.objectives.reachObjectiveMet
  if (!complete && snapshot.roster.heroRoleId !== ROLE_CRYSTAL_BASSLINE) {
    return {
      id: "bubble-reach",
      label: "Understand bubble reach",
      complete,
      detail: `Reach ${snapshot.bubble.reachFromBase} / ${snapshot.objectives.reachObjectiveTarget}; Bassline expands the field.`,
      actionLabel: "Send Hero to Bassline",
      action: { type: "set_hero_role", roleId: ROLE_CRYSTAL_BASSLINE },
    }
  }
  if (!complete && roleCrew(snapshot, ROLE_CRYSTAL_BASSLINE) < 2) {
    if (roleCrew(snapshot, ROLE_SCAVENGE) > 0) {
      return {
        id: "bubble-reach",
        label: "Understand bubble reach",
        complete,
        detail: "Move the scavenging crew back to Bassline so the bubble can expand.",
        actionLabel: "Free Bassline crew",
        action: { type: "set_role_crew", roleId: ROLE_SCAVENGE, crew: 0 },
      }
    }
    if (roleCrew(snapshot, ROLE_CONSTRUCTION) > 0) {
      return {
        id: "bubble-reach",
        label: "Understand bubble reach",
        complete,
        detail: "Move builders back to Bassline so the bubble can expand.",
        actionLabel: "Free Bassline crew",
        action: { type: "set_role_crew", roleId: ROLE_CONSTRUCTION, crew: 0 },
      }
    }
    return {
      id: "bubble-reach",
      label: "Understand bubble reach",
      complete,
      detail: "More Bassline staff make bubble reach climb faster.",
      actionLabel: "Assign Bassline crew",
      action: { type: "set_role_crew", roleId: ROLE_CRYSTAL_BASSLINE, crew: 2 },
    }
  }
  return {
    id: "bubble-reach",
    label: "Understand bubble reach",
    complete,
    detail: complete
      ? "The bubble reached the first target ring."
      : `Reach ${snapshot.bubble.reachFromBase} / ${snapshot.objectives.reachObjectiveTarget}; field budget ${formatAmount(snapshot.bubble.fieldBudget)}.`,
    actionLabel: complete ? null : "Let the bubble expand",
    action: complete ? null : { type: "tick", seconds: 120 },
  }
}

function unlockRecruitmentStep(snapshot: SimulationSnapshot): Omit<AddFirstPlayableStep, "active"> {
  const complete = snapshot.objectives.recruitmentEnabled
  return {
    id: "unlock-recruitment",
    label: "Unlock recruitment",
    complete,
    detail: complete
      ? "The Survivor Cave is close enough to recruit from."
      : `Recruitment opens when the bubble closes the cave gap. Current reach ${snapshot.bubble.reachFromBase}; cave distance ${snapshot.objectives.survivorCaveDistance}.`,
    actionLabel: complete ? null : "Hold the field",
    action: complete ? null : { type: "tick", seconds: 120 },
  }
}

function recruitOnceStep(snapshot: SimulationSnapshot): Omit<AddFirstPlayableStep, "active"> {
  const complete =
    snapshot.recruitment.totalRecruitedThisRun > 0 || snapshot.roster.totalCrew > 2
  if (!complete && !snapshot.objectives.recruitmentEnabled) {
    return {
      id: "recruit-once",
      label: "Recruit once",
      complete,
      detail: "Recruitment is waiting on bubble reach.",
      actionLabel: null,
      action: null,
    }
  }
  if (!complete && snapshot.resources.vibes < snapshot.recruitment.nextRecruitCost) {
    if (snapshot.base.firePitBuilt && roleCrew(snapshot, ROLE_FIRE_PIT) < 1) {
      if (roleCrew(snapshot, ROLE_CRYSTAL_BASSLINE) > 1) {
        return {
          id: "recruit-once",
          label: "Recruit once",
          complete,
          detail: "Free one crew member from Bassline so the Fire Pit can start producing Vibes.",
          actionLabel: "Free Fire Pit crew",
          action: { type: "set_role_crew", roleId: ROLE_CRYSTAL_BASSLINE, crew: 1 },
        }
      }
      if (roleCrew(snapshot, ROLE_SCAVENGE) > 0) {
        return {
          id: "recruit-once",
          label: "Recruit once",
          complete,
          detail: "Move a scavenger into Fire Pit duty to start the recruitment loop.",
          actionLabel: "Free Fire Pit crew",
          action: { type: "set_role_crew", roleId: ROLE_SCAVENGE, crew: 0 },
        }
      }
      if (roleCrew(snapshot, ROLE_CONSTRUCTION) > 0) {
        return {
          id: "recruit-once",
          label: "Recruit once",
          complete,
          detail: "Move a builder into Fire Pit duty to start the recruitment loop.",
          actionLabel: "Free Fire Pit crew",
          action: { type: "set_role_crew", roleId: ROLE_CONSTRUCTION, crew: 0 },
        }
      }
      return {
        id: "recruit-once",
        label: "Recruit once",
        complete,
        detail: `Need ${formatAmount(snapshot.recruitment.nextRecruitCost)} Vibes for the first recruit.`,
        actionLabel: "Assign Fire Pit crew",
        action: { type: "set_role_crew", roleId: ROLE_FIRE_PIT, crew: 1 },
      }
    }
    return {
      id: "recruit-once",
      label: "Recruit once",
      complete,
      detail: `Vibes ${formatAmount(snapshot.resources.vibes)} / ${formatAmount(snapshot.recruitment.nextRecruitCost)} for the first recruit.`,
      actionLabel: "Build Vibes",
      action: { type: "tick", seconds: 120 },
    }
  }
  if (!complete) {
    return {
      id: "recruit-once",
      label: "Recruit once",
      complete,
      detail: "The cave is in reach and Vibes can pay the first recruitment cost.",
      actionLabel: "Recruit survivor",
      action: { type: "recruit_from_survivor_cave" },
    }
  }
  return {
    id: "recruit-once",
    label: "Recruit once",
    complete,
    detail: "The first recruit is committed and the run has opened into growth.",
    actionLabel: null,
    action: null,
  }
}

function worldActionStepAction(
  snapshot: SimulationSnapshot,
  activeBeat: StoryBeatDef | null,
  actionId: string,
  startLabel: string,
): Pick<AddFirstPlayableStep, "actionLabel" | "action"> {
  if (snapshot.activeWorldAction?.actionId === actionId) {
    return {
      actionLabel: "Advance action",
      action: { type: "tick", seconds: snapshot.activeWorldAction.remainingSeconds + 0.25 },
    }
  }
  const choice = storyChoiceAction(snapshot, activeBeat)
  if (activeBeat?.worldActionId === actionId && choice.action) return choice
  if (!snapshot.roster.heroAssigned) {
    return {
      actionLabel: "Assign Hero",
      action: { type: "assign_hero", assigned: true },
    }
  }
  return {
    actionLabel: startLabel,
    action: { type: "start_world_action", actionId },
  }
}

function storyChoiceAction(
  snapshot: SimulationSnapshot,
  activeBeat: StoryBeatDef | null,
): Pick<AddFirstPlayableStep, "actionLabel" | "action"> {
  if (!activeBeat || activeBeat.choices.length === 0) {
    return { actionLabel: null, action: null }
  }
  if (storyChoiceSelected(snapshot, activeBeat.id)) {
    return { actionLabel: null, action: null }
  }
  const firstChoice = activeBeat.choices[0]
  return {
    actionLabel: firstChoice.label,
    action: {
      type: "choose_story_option",
      beatId: activeBeat.id,
      optionId: firstChoice.id,
    },
  }
}

function constructionStep(
  snapshot: SimulationSnapshot,
  id: string,
  label: string,
  complete: boolean,
  optionId: string,
  startLabel: string,
  copy: string,
): Omit<AddFirstPlayableStep, "active"> {
  if (complete) {
    return {
      id,
      label,
      complete,
      detail: `${label} is complete.`,
      actionLabel: null,
      action: null,
    }
  }
  if (snapshot.activeConstruction?.optionId === optionId) {
    if (snapshot.roster.heroRoleId !== ROLE_CONSTRUCTION || !snapshot.roster.heroAssigned) {
      return {
        id,
        label,
        complete,
        detail: copy,
        actionLabel: "Send Hero to build",
        action: { type: "set_hero_role", roleId: ROLE_CONSTRUCTION },
      }
    }
    if (!roleHasWorker(snapshot, ROLE_CONSTRUCTION)) {
      return {
        id,
        label,
        complete,
        detail: copy,
        actionLabel: "Assign build crew",
        action: { type: "set_role_crew", roleId: ROLE_CONSTRUCTION, crew: 2 },
      }
    }
    return {
      id,
      label,
      complete,
      detail: `${copy} Remaining ${formatAmount(snapshot.activeConstruction.remainingWorkSeconds)}s.`,
      actionLabel: "Advance construction",
      action: { type: "tick", seconds: snapshot.activeConstruction.remainingWorkSeconds + 0.5 },
    }
  }
  return {
    id,
    label,
    complete,
    detail: copy,
    actionLabel: startLabel,
    action: { type: "start_construction", optionId },
  }
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

function resourceFlowCopy(
  snapshot: SimulationSnapshot,
  resourceId: string,
): Pick<AddResourceSummary, "source" | "sink" | "blocker"> {
  switch (resourceId) {
    case RESOURCE_BASSLINE:
      return {
        source: "Crystal Bassline staff",
        sink: "Bubble field budget and crystal upgrades",
        blocker:
          snapshot.resources.bassline >= snapshot.resources.basslineCap
            ? "Storage is full."
            : null,
      }
    case RESOURCE_CHORUS:
      return {
        source: "Studio-restored Chorus staff",
        sink: "Life support and powered stations",
        blocker: snapshot.base.studioRestored ? null : "Restore the Studio to unlock Chorus.",
      }
    case RESOURCE_HARMONICS:
      return {
        source: "Resonance Harmonics staff",
        sink: "Efficiency tiers and brownout resilience",
        blocker: snapshot.base.resonanceChamberBuilt
          ? null
          : "Build the Resonance Chamber to unlock Harmonics.",
      }
    case RESOURCE_STONE:
      return {
        source: "Scavenge role",
        sink: "Studio, Fire Pit, and base construction",
        blocker:
          snapshot.resources.stone >= snapshot.resources.stoneCap ? "Storage is full." : null,
      }
    case RESOURCE_WATER:
      return {
        source: "Water role after Base exploration",
        sink: "Processing and field polish projects",
        blocker: snapshot.base.waterCollectionUnlocked
          ? null
          : "Explore the Base to unlock water collection.",
      }
    case RESOURCE_VIBES:
      return {
        source: "Built Fire Pit and Fire Pit crew",
        sink: "Recruitment and overcrowding pressure",
        blocker: snapshot.base.firePitBuilt ? null : "Build the Fire Pit to generate Vibes.",
      }
    default:
      return {
        source: "Runtime economy",
        sink: "Base progression",
        blocker: null,
      }
  }
}

function costLabel(cost: CostDef): string {
  switch (cost.kind) {
    case "upfront":
      return `${formatAmount(cost.amount ?? 0)} ${resourceName(cost.resource_id ?? "")}`
    case "upfront_bundle":
      return (
        cost.costs
          ?.map((item) => `${formatAmount(item.amount)} ${resourceName(item.item_id)}`)
          .join(", ") ?? "Bundled cost"
      )
    case "drain_per_worker_second":
      return `${formatAmount(cost.amount ?? 0)} ${resourceName(cost.resource_id ?? "")} / worker sec`
    case "time_only":
      return "Time only"
  }
}

function resourceName(resourceId: string): string {
  switch (resourceId) {
    case RESOURCE_BASSLINE:
      return "Bassline"
    case RESOURCE_CHORUS:
      return "Chorus"
    case RESOURCE_HARMONICS:
      return "Harmonics"
    case RESOURCE_STONE:
      return "Stone"
    case RESOURCE_WATER:
      return "Water"
    case RESOURCE_VIBES:
      return "Vibes"
    default:
      return resourceId
  }
}

function formatAmount(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
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
