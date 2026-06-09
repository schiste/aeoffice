import type {
  CatalogSnapshot,
  CostDef,
  ProcessingRecipeDef,
  RequirementDef,
  SimulationSnapshot,
  StationDef,
} from "../runtime/protocol"
import {
  PROJECT_BUILD_FIRE_PIT,
  PROJECT_RESTORE_STUDIO,
  RESOURCE_BASSLINE,
  RESOURCE_CHORUS,
  RESOURCE_HARMONICS,
  RESOURCE_STONE,
  RESOURCE_VIBES,
  RESOURCE_WATER,
  ROLE_CONSTRUCTION,
  ROLE_CRYSTAL_BASSLINE,
  ROLE_CRYSTAL_CHORUS,
  ROLE_CRYSTAL_HARMONICS,
  ROLE_FIRE_PIT,
  ROLE_SCAVENGE,
  ROLE_WATER,
} from "./add-ids"
import {
  selectAddConstructionSummaries,
  selectAddResourceSummaries,
  selectAddRoleAssignmentSummaries,
  type AddConstructionSummary,
  type AddResourceSummary,
  type AddRoleAssignmentSummary,
} from "./ui-selectors"

export type AddBaseManagementTabId =
  | "crystal"
  | "build"
  | "power"
  | "crew"
  | "social"
  | "processing"

export interface AddBaseManagementMetric {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly detail: string
  readonly severity: "neutral" | "good" | "warning" | "danger"
}

export interface AddBaseResourceManagementSummary extends AddResourceSummary {
  readonly ratePerSecond: number
  readonly capPressure: "empty" | "room" | "near_cap" | "full"
}

export interface AddBaseRoleManagementSummary extends AddRoleAssignmentSummary {
  readonly slotPressure: "locked" | "empty" | "understaffed" | "staffed"
}

export interface AddBaseStationManagementSummary {
  readonly id: string
  readonly label: string
  readonly category: StationDef["category"]
  readonly manualPower: boolean
  readonly available: boolean
  readonly requestedEnabled: boolean
  readonly powered: boolean
  readonly upkeepPerSecond: number
  readonly blockedReason: string | null
}

export interface AddBaseProcessingManagementSummary {
  readonly id: string
  readonly label: string
  readonly stationId: string
  readonly stationLabel: string
  readonly level: number
  readonly maxLevel: number
  readonly available: boolean
  readonly enabled: boolean
  readonly inProgress: boolean
  readonly remainingSeconds: number | null
  readonly costLabel: string
  readonly blockedReason: string | null
}

export interface AddBaseManagementSection {
  readonly id: AddBaseManagementTabId
  readonly label: string
  readonly headline: string
  readonly detail: string
  readonly primaryActionId: string | null
  readonly blockedReason: string | null
  readonly metrics: readonly AddBaseManagementMetric[]
}

export interface AddBaseManagementState {
  readonly title: "The Studio"
  readonly subtitle: string
  readonly resources: readonly AddBaseResourceManagementSummary[]
  readonly roles: readonly AddBaseRoleManagementSummary[]
  readonly construction: readonly AddConstructionSummary[]
  readonly stations: readonly AddBaseStationManagementSummary[]
  readonly processing: readonly AddBaseProcessingManagementSummary[]
  readonly sections: readonly AddBaseManagementSection[]
  readonly activeConstruction: AddConstructionSummary | null
  readonly vibes: {
    readonly value: number
    readonly cap: number
    readonly badVibesMultiplier: number
    readonly recruitmentPressure: string
  }
  readonly bunks: {
    readonly capacity: number
    readonly occupied: number
    readonly free: number
    readonly missing: number
    readonly pressure: "room" | "full" | "overcrowded"
  }
  readonly recruitment: {
    readonly enabled: boolean
    readonly pending: number
    readonly nextCost: number
    readonly pressure: string
  }
  readonly power: {
    readonly requestedUpkeepPerSecond: number
    readonly activeUpkeepPerSecond: number
    readonly lifeSupportUpkeepPerSecond: number
    readonly brownoutActive: boolean
    readonly brownoutSeverity: number
  }
  readonly nextBottleneck: {
    readonly id: string
    readonly label: string
    readonly detail: string
    readonly severity: "neutral" | "warning" | "danger"
  }
  readonly recommendedAction: {
    readonly id: string
    readonly label: string
    readonly detail: string
    readonly kind:
      | "assign_role"
      | "start_construction"
      | "power_station"
      | "start_processing"
      | "recruit_survivor"
      | "wait"
    readonly targetId: string | null
    readonly enabled: boolean
  }
}

export function selectAddBaseManagementState(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): AddBaseManagementState {
  const resources = selectAddResourceSummaries(snapshot, catalog).map((resource) =>
    baseResourceSummary(snapshot, resource),
  )
  const roles = selectAddRoleAssignmentSummaries(snapshot, catalog).map(baseRoleSummary)
  const construction = selectAddConstructionSummaries(snapshot, catalog)
  const stations = catalog.stations
    .slice()
    .sort((left, right) => left.uiOrder - right.uiOrder)
    .map((station) => baseStationSummary(snapshot, station))
  const processing = catalog.processingRecipes
    .slice()
    .sort((left, right) => left.uiOrder - right.uiOrder)
    .map((recipe) => baseProcessingSummary(snapshot, catalog, recipe))
  const activeConstruction =
    construction.find((option) => option.inProgress) ?? null
  const nextBottleneck = selectNextBottleneck(snapshot, resources, roles, construction, stations)
  const recommendedAction = selectRecommendedBaseAction(
    snapshot,
    roles,
    construction,
    stations,
    processing,
  )

  return {
    title: "The Studio",
    subtitle: snapshot.base.studioRestored
      ? "A working base layer for crew, power, processing, and social pressure."
      : "A damaged base layer. Restore the Studio to unlock the main idle loop.",
    resources,
    roles,
    construction,
    stations,
    processing,
    sections: baseSections({
      snapshot,
      resources,
      roles,
      construction,
      stations,
      processing,
      activeConstruction,
      nextBottleneck,
      recommendedAction,
    }),
    activeConstruction,
    vibes: {
      value: snapshot.resources.vibes,
      cap: snapshot.resources.vibesCap,
      badVibesMultiplier: snapshot.base.badVibesMultiplier,
      recruitmentPressure: recruitmentPressureCopy(snapshot),
    },
    bunks: {
      capacity: snapshot.base.bunksCapacity,
      occupied: snapshot.base.occupantCount,
      free: snapshot.base.freeBunks,
      missing: snapshot.base.missingBunks,
      pressure:
        snapshot.base.missingBunks > 0
          ? "overcrowded"
          : snapshot.base.freeBunks <= 0
            ? "full"
            : "room",
    },
    recruitment: {
      enabled: snapshot.objectives.recruitmentEnabled,
      pending: snapshot.recruitment.pendingRecruits.length,
      nextCost: snapshot.recruitment.nextRecruitCost,
      pressure: recruitmentPressureCopy(snapshot),
    },
    power: {
      requestedUpkeepPerSecond: snapshot.power.requestedUpkeepPerSecond,
      activeUpkeepPerSecond: snapshot.power.activeUpkeepPerSecond,
      lifeSupportUpkeepPerSecond: snapshot.power.lifeSupportUpkeepPerSecond,
      brownoutActive: snapshot.power.brownoutActive,
      brownoutSeverity: snapshot.power.brownoutSeverity,
    },
    nextBottleneck,
    recommendedAction,
  }
}

function baseResourceSummary(
  snapshot: SimulationSnapshot,
  resource: AddResourceSummary,
): AddBaseResourceManagementSummary {
  const ratio = resource.cap <= 0 ? 0 : resource.value / resource.cap
  return {
    ...resource,
    ratePerSecond: resourceRatePerSecond(snapshot, resource.id),
    capPressure:
      ratio >= 1
        ? "full"
        : ratio >= 0.82
          ? "near_cap"
          : ratio <= 0.05
            ? "empty"
            : "room",
  }
}

function baseRoleSummary(role: AddRoleAssignmentSummary): AddBaseRoleManagementSummary {
  return {
    ...role,
    slotPressure: !role.available
      ? "locked"
      : role.crewAssigned <= 0 && !role.heroAssigned
        ? "empty"
        : role.crewAssigned < role.suggestedCrew
          ? "understaffed"
          : "staffed",
  }
}

function baseStationSummary(
  snapshot: SimulationSnapshot,
  station: StationDef,
): AddBaseStationManagementSummary {
  const runtime = snapshot.stations[station.id]
  const available = requirementsMet(snapshot, station.requirements)
  return {
    id: station.id,
    label: station.label,
    category: station.category,
    manualPower: station.manualPower,
    available,
    requestedEnabled: runtime?.requestedEnabled ?? station.startsRequested,
    powered: runtime?.isPowered ?? (!station.manualPower && available),
    upkeepPerSecond: station.chorusUpkeepPerSecond,
    blockedReason: available ? null : "Build or unlock this station first.",
  }
}

function baseProcessingSummary(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  recipe: ProcessingRecipeDef,
): AddBaseProcessingManagementSummary {
  const station = catalog.stations.find((candidate) => candidate.id === recipe.stationId)
  const stationRuntime = snapshot.stations[recipe.stationId]
  const job = snapshot.processing.activeJobs[recipe.stationId] ?? null
  const available = requirementsMet(snapshot, recipe.requirements)
  const level = processingLevel(snapshot, recipe.id)
  const complete = level >= recipe.maxLevel
  const stationPowered = stationRuntime?.isPowered ?? false
  const affordabilityBlocker = affordabilityBlockerForCost(snapshot, recipe.cost)
  const blockedReason = complete
    ? "Complete."
    : !available
      ? "Build the required station first."
      : job && job.recipeId !== recipe.id
        ? "That station is already processing another job."
        : !stationPowered
          ? `${station?.label ?? "Station"} needs power.`
          : affordabilityBlocker
  return {
    id: recipe.id,
    label: recipe.label,
    stationId: recipe.stationId,
    stationLabel: station?.label ?? recipe.stationId,
    level,
    maxLevel: recipe.maxLevel,
    available,
    enabled: !complete && !job && blockedReason === null,
    inProgress: job?.recipeId === recipe.id,
    remainingSeconds: job?.recipeId === recipe.id ? job.remainingWorkSeconds : null,
    costLabel: costLabel(recipe.cost),
    blockedReason,
  }
}

function baseSections(input: {
  readonly snapshot: SimulationSnapshot
  readonly resources: readonly AddBaseResourceManagementSummary[]
  readonly roles: readonly AddBaseRoleManagementSummary[]
  readonly construction: readonly AddConstructionSummary[]
  readonly stations: readonly AddBaseStationManagementSummary[]
  readonly processing: readonly AddBaseProcessingManagementSummary[]
  readonly activeConstruction: AddConstructionSummary | null
  readonly nextBottleneck: AddBaseManagementState["nextBottleneck"]
  readonly recommendedAction: AddBaseManagementState["recommendedAction"]
}): readonly AddBaseManagementSection[] {
  const bassline = resourceById(input.resources, RESOURCE_BASSLINE)
  const chorus = resourceById(input.resources, RESOURCE_CHORUS)
  const stone = resourceById(input.resources, RESOURCE_STONE)
  const vibes = resourceById(input.resources, RESOURCE_VIBES)
  const buildProject = input.construction.find((option) => option.enabled || option.inProgress)
  const poweredStations = input.stations.filter((station) => station.powered).length
  const enabledProcessing = input.processing.find((recipe) => recipe.enabled || recipe.inProgress)
  return [
    {
      id: "crystal",
      label: "Crystal",
      headline: "Keep the signal growing",
      detail: bassline?.blocker ?? "Bassline drives reach, crystal upgrades, and early expansion.",
      primaryActionId: ROLE_CRYSTAL_BASSLINE,
      blockedReason: input.roles.find((role) => role.id === ROLE_CRYSTAL_BASSLINE)?.lockedReason ?? null,
      metrics: [
        resourceMetric(bassline),
        {
          id: "field",
          label: "Reach",
          value: `${input.snapshot.bubble.reachFromBase}`,
          detail: `Target ${input.snapshot.objectives.reachObjectiveTarget}`,
          severity: input.snapshot.objectives.reachObjectiveMet ? "good" : "warning",
        },
      ],
    },
    {
      id: "build",
      label: "Build",
      headline: buildProject ? buildProject.label : "No ready project",
      detail: input.activeConstruction
        ? `${input.activeConstruction.remainingSeconds ?? 0}s remaining`
        : buildProject?.blockedReason ?? input.nextBottleneck.detail,
      primaryActionId: buildProject?.id ?? null,
      blockedReason: buildProject?.blockedReason ?? null,
      metrics: [resourceMetric(stone), roleMetric(input.roles.find((role) => role.id === ROLE_CONSTRUCTION))],
    },
    {
      id: "power",
      label: "Power",
      headline: input.snapshot.power.brownoutActive ? "Brownout active" : "Station power stable",
      detail: `${formatRate(input.snapshot.power.activeUpkeepPerSecond)} active upkeep, ${poweredStations}/${input.stations.length} stations powered.`,
      primaryActionId: input.stations.find((station) => station.manualPower && station.available)?.id ?? null,
      blockedReason: input.snapshot.power.brownoutActive ? "Chorus cannot cover all requested stations." : null,
      metrics: [
        resourceMetric(chorus),
        {
          id: "upkeep",
          label: "Upkeep",
          value: formatRate(input.snapshot.power.activeUpkeepPerSecond),
          detail: `${formatRate(input.snapshot.power.requestedUpkeepPerSecond)} requested`,
          severity: input.snapshot.power.brownoutActive ? "danger" : "neutral",
        },
      ],
    },
    {
      id: "crew",
      label: "Crew",
      headline: `${input.snapshot.roster.totalCrew} crew available`,
      detail: input.snapshot.roster.heroAssigned
        ? "Hero is assigned. Crew can cover production lanes."
        : "Assign the Hero before starting base work.",
      primaryActionId: input.roles.find((role) => role.available && role.slotPressure !== "staffed")?.id ?? null,
      blockedReason: input.snapshot.roster.heroAssigned ? null : "Hero is not assigned.",
      metrics: [
        {
          id: "crew",
          label: "Crew",
          value: `${input.snapshot.roster.totalCrew}`,
          detail: input.snapshot.roster.heroAssigned ? "Hero assigned" : "Hero idle",
          severity: input.snapshot.roster.heroAssigned ? "good" : "warning",
        },
        {
          id: "efficiency",
          label: "Efficiency",
          value: `${Math.round(input.snapshot.base.crewEfficiencyMultiplier * 100)}%`,
          detail: "Base-wide crew multiplier",
          severity: input.snapshot.base.crewEfficiencyMultiplier < 1 ? "warning" : "neutral",
        },
      ],
    },
    {
      id: "social",
      label: "Social",
      headline: input.snapshot.base.firePitBuilt ? "Fire Pit online" : "Social loop locked",
      detail: recruitmentPressureCopy(input.snapshot),
      primaryActionId: input.snapshot.objectives.recruitmentEnabled ? "recruit_survivor" : PROJECT_BUILD_FIRE_PIT,
      blockedReason: input.snapshot.objectives.recruitmentEnabled ? null : "Build the Fire Pit and reach the cave.",
      metrics: [
        resourceMetric(vibes),
        {
          id: "bunks",
          label: "Bunks",
          value: `${input.snapshot.base.freeBunks}`,
          detail: `${input.snapshot.base.occupantCount}/${input.snapshot.base.bunksCapacity} occupied`,
          severity: input.snapshot.base.missingBunks > 0 ? "danger" : input.snapshot.base.freeBunks <= 0 ? "warning" : "good",
        },
      ],
    },
    {
      id: "processing",
      label: "Processing",
      headline: enabledProcessing ? enabledProcessing.label : "No recipe ready",
      detail: enabledProcessing?.blockedReason ?? "Processing unlocks after powered stations come online.",
      primaryActionId: enabledProcessing?.id ?? null,
      blockedReason: enabledProcessing?.blockedReason ?? null,
      metrics: [
        {
          id: "jobs",
          label: "Jobs",
          value: `${Object.keys(input.snapshot.processing.activeJobs).length}`,
          detail: "Active station jobs",
          severity: Object.keys(input.snapshot.processing.activeJobs).length > 0 ? "good" : "neutral",
        },
        resourceMetric(resourceById(input.resources, RESOURCE_WATER)),
      ],
    },
  ]
}

function selectNextBottleneck(
  snapshot: SimulationSnapshot,
  resources: readonly AddBaseResourceManagementSummary[],
  roles: readonly AddBaseRoleManagementSummary[],
  construction: readonly AddConstructionSummary[],
  stations: readonly AddBaseStationManagementSummary[],
): AddBaseManagementState["nextBottleneck"] {
  if (!snapshot.roster.heroAssigned) {
    return {
      id: "hero_unassigned",
      label: "Hero is idle",
      detail: "Assign the Hero so base actions and role loops can progress.",
      severity: "warning",
    }
  }
  const readyConstruction = construction.find((option) => option.enabled)
  if (readyConstruction) {
    return {
      id: readyConstruction.id,
      label: `Ready: ${readyConstruction.label}`,
      detail: readyConstruction.costLabel,
      severity: "neutral",
    }
  }
  const resourceBlocker = resources.find((resource) => resource.blocker || resource.capPressure === "empty")
  if (resourceBlocker) {
    return {
      id: resourceBlocker.id,
      label: `${resourceBlocker.label} pressure`,
      detail: resourceBlocker.blocker ?? `${resourceBlocker.label} is empty or too low for the next step.`,
      severity: resourceBlocker.capPressure === "empty" ? "warning" : "neutral",
    }
  }
  const understaffed = roles.find((role) => role.slotPressure === "understaffed" || role.slotPressure === "empty")
  if (understaffed) {
    return {
      id: understaffed.id,
      label: `${understaffed.label} needs people`,
      detail: understaffed.lockedReason ?? "Assign crew to keep this lane productive.",
      severity: "warning",
    }
  }
  const brownout = stations.find((station) => station.requestedEnabled && !station.powered)
  if (brownout) {
    return {
      id: brownout.id,
      label: `${brownout.label} unpowered`,
      detail: "Chorus or power priority is blocking this station.",
      severity: "danger",
    }
  }
  return {
    id: "stable",
    label: "Base stable",
    detail: "No major bottleneck is blocking the current first playable loop.",
    severity: "neutral",
  }
}

function selectRecommendedBaseAction(
  snapshot: SimulationSnapshot,
  roles: readonly AddBaseRoleManagementSummary[],
  construction: readonly AddConstructionSummary[],
  stations: readonly AddBaseStationManagementSummary[],
  processing: readonly AddBaseProcessingManagementSummary[],
): AddBaseManagementState["recommendedAction"] {
  if (!snapshot.roster.heroAssigned) {
    return {
      id: "assign_hero",
      label: "Assign the Hero",
      detail: "Hero assignment unlocks meaningful base actions.",
      kind: "assign_role",
      targetId: ROLE_CRYSTAL_BASSLINE,
      enabled: true,
    }
  }
  const role = roles.find((candidate) => candidate.available && candidate.suggestedCrew > candidate.crewAssigned)
  if (role) {
    return {
      id: `staff:${role.id}`,
      label: `Staff ${role.label}`,
      detail: "Crew assignment increases production in this lane.",
      kind: "assign_role",
      targetId: role.id,
      enabled: true,
    }
  }
  const project = construction.find((option) => option.enabled)
  if (project) {
    return {
      id: `build:${project.id}`,
      label: `Start ${project.label}`,
      detail: project.costLabel,
      kind: "start_construction",
      targetId: project.id,
      enabled: true,
    }
  }
  const station = stations.find((candidate) => candidate.manualPower && candidate.available && !candidate.requestedEnabled)
  if (station) {
    return {
      id: `power:${station.id}`,
      label: `Request ${station.label}`,
      detail: "Bring the station into the power queue.",
      kind: "power_station",
      targetId: station.id,
      enabled: true,
    }
  }
  if (
    snapshot.objectives.recruitmentEnabled &&
    snapshot.resources.vibes >= snapshot.recruitment.nextRecruitCost &&
    snapshot.base.freeBunks > 0
  ) {
    return {
      id: "recruit:survivor_cave",
      label: "Recruit from Survivor Cave",
      detail: `${snapshot.recruitment.nextRecruitCost} Vibes, ${snapshot.base.freeBunks} bunks free`,
      kind: "recruit_survivor",
      targetId: "survivor_cave",
      enabled: true,
    }
  }
  const recipe = processing.find((candidate) => candidate.enabled)
  if (recipe) {
    return {
      id: `process:${recipe.id}`,
      label: `Start ${recipe.label}`,
      detail: `${recipe.stationLabel} · ${recipe.costLabel}`,
      kind: "start_processing",
      targetId: recipe.id,
      enabled: true,
    }
  }
  return {
    id: "wait",
    label: "Let the base run",
    detail: "No immediate player action is available; time or exploration should unlock the next move.",
    kind: "wait",
    targetId: null,
    enabled: false,
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
    case "base.studio_restore_unlocked":
      return snapshot.base.studioRestoreUnlocked
    case "flag.base.studio_restored":
    case "base.studio_restored":
      return snapshot.base.studioRestored
    case "flag.base.fire_pit_built":
    case "base.fire_pit_built":
      return snapshot.base.firePitBuilt
    case "flag.base.resonance_chamber_built":
    case "base.resonance_chamber_built":
      return snapshot.base.resonanceChamberBuilt
    case "flag.base.mix_console_built":
    case "base.mix_console_built":
      return snapshot.base.mixConsoleBuilt
    case "flag.base.workshop_built":
    case "base.workshop_built":
      return snapshot.base.workshopBuilt
    case "flag.base.research_booth_built":
    case "base.research_booth_built":
      return snapshot.base.researchBoothBuilt
    case "flag.base.water_collection_unlocked":
    case "base.water_collection_unlocked":
      return snapshot.base.waterCollectionUnlocked
    case "flag.base.tutorial_investigated":
    case "base.tutorial_investigated":
      return snapshot.base.tutorialInvestigated
    case "flag.base.tutorial_explored":
    case "base.tutorial_explored":
      return snapshot.base.tutorialExplored
    case "flag.crystal.removing_moss_unlocked":
    case "crystal.removing_moss_unlocked":
      return snapshot.crystalCircle.removingMossUnlocked
    case "flag.crystal.removing_moss_completed":
    case "crystal.removing_moss_completed":
      return snapshot.crystalCircle.removingMossCompleted
    default:
      return false
  }
}

function affordabilityBlockerForCost(snapshot: SimulationSnapshot, cost: CostDef): string | null {
  switch (cost.kind) {
    case "upfront": {
      const resourceId = cost.resource_id
      const amount = cost.amount ?? 0
      if (!resourceId || resourceValue(snapshot, resourceId) >= amount) return null
      return `Need ${formatAmount(amount)} ${resourceName(resourceId)}.`
    }
    case "upfront_bundle": {
      const missing = cost.costs?.find((item) => resourceValue(snapshot, item.item_id) < item.amount)
      return missing ? `Need ${formatAmount(missing.amount)} ${resourceName(missing.item_id)}.` : null
    }
    case "drain_per_worker_second":
    case "time_only":
      return null
  }
}

function resourceRatePerSecond(snapshot: SimulationSnapshot, resourceId: string): number {
  switch (resourceId) {
    case RESOURCE_BASSLINE:
      return snapshot.power.basslineGenerationPerSecond
    case RESOURCE_CHORUS:
      return snapshot.power.chorusGenerationPerSecond - snapshot.power.activeUpkeepPerSecond
    case RESOURCE_HARMONICS:
      return snapshot.power.harmonicsGenerationPerSecond
    case RESOURCE_STONE:
      return roleCrew(snapshot, ROLE_SCAVENGE) > 0 ? snapshot.resources.baseStoneStock : 0
    case RESOURCE_WATER:
      return roleCrew(snapshot, ROLE_WATER) > 0 ? snapshot.resources.baseWaterStock : 0
    case RESOURCE_VIBES:
      return snapshot.base.firePitBuilt ? Math.max(0, roleCrew(snapshot, ROLE_FIRE_PIT)) : 0
    default:
      return 0
  }
}

function roleCrew(snapshot: SimulationSnapshot, roleId: string): number {
  return Number(snapshot.roster.crewByRole[roleId] ?? 0)
}

function resourceValue(snapshot: SimulationSnapshot, resourceId: string): number {
  switch (resourceId) {
    case RESOURCE_BASSLINE:
      return snapshot.resources.bassline
    case RESOURCE_CHORUS:
      return snapshot.resources.chorus
    case RESOURCE_HARMONICS:
      return snapshot.resources.harmonics
    case RESOURCE_STONE:
      return snapshot.resources.stone
    case RESOURCE_WATER:
      return snapshot.resources.water
    case RESOURCE_VIBES:
      return snapshot.resources.vibes
    default:
      return 0
  }
}

function processingLevel(snapshot: SimulationSnapshot, recipeId: string): number {
  switch (recipeId) {
    case "recipe.resonance_field_calibration":
      return snapshot.processing.resonanceCalibrationLevel
    case "recipe.mix_signal_balancing":
      return snapshot.processing.mixCalibrationLevel
    case "recipe.workshop_builder_tools":
      return snapshot.processing.workshopToolingLevel
    case "recipe.workshop_water_condensers":
      return snapshot.processing.workshopWaterCondensersLevel
    case "recipe.research_chorus_routing":
      return snapshot.processing.researchChorusRoutingLevel
    case "recipe.research_harmonic_study":
      return snapshot.processing.researchHarmonicStudyLevel
    default:
      return 0
  }
}

function resourceById(
  resources: readonly AddBaseResourceManagementSummary[],
  resourceId: string,
): AddBaseResourceManagementSummary | undefined {
  return resources.find((resource) => resource.id === resourceId)
}

function resourceMetric(resource: AddBaseResourceManagementSummary | undefined): AddBaseManagementMetric {
  if (!resource) {
    return {
      id: "missing_resource",
      label: "Resource",
      value: "0",
      detail: "Missing resource projection",
      severity: "warning",
    }
  }
  return {
    id: resource.id,
    label: resource.label,
    value: `${formatAmount(resource.value)} / ${formatAmount(resource.cap)}`,
    detail: `${formatSignedRate(resource.ratePerSecond)} · ${resource.source}`,
    severity:
      resource.capPressure === "full"
        ? "warning"
        : resource.capPressure === "empty"
          ? "warning"
          : "neutral",
  }
}

function roleMetric(role: AddBaseRoleManagementSummary | undefined): AddBaseManagementMetric {
  if (!role) {
    return {
      id: "missing_role",
      label: "Role",
      value: "0",
      detail: "Missing role projection",
      severity: "warning",
    }
  }
  return {
    id: role.id,
    label: role.label,
    value: `${role.crewAssigned}`,
    detail: role.lockedReason ?? `${role.suggestedCrew} suggested`,
    severity: role.slotPressure === "staffed" ? "good" : role.slotPressure === "locked" ? "warning" : "neutral",
  }
}

function recruitmentPressureCopy(snapshot: SimulationSnapshot): string {
  if (!snapshot.objectives.recruitmentEnabled) return "Recruitment is locked until the cave is inside the bubble."
  if (snapshot.base.missingBunks > 0) return "Recruitment is creating overcrowding pressure."
  if (snapshot.base.freeBunks <= 0) return "Bunks are full; build housing before recruiting more."
  if (snapshot.recruitment.pendingRecruits.length > 0) return "A recruit is already traveling to the Base."
  return `Next recruit costs ${formatAmount(snapshot.recruitment.nextRecruitCost)} Vibes.`
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

function formatRate(value: number): string {
  return `${formatAmount(value)}/s`
}

function formatSignedRate(value: number): string {
  return `${value >= 0 ? "+" : ""}${formatRate(value)}`
}

function formatAmount(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}
