import type {
  CatalogSnapshot,
  CostDef,
  ProcessingRecipeDef,
  RequirementDef,
  RoleDef,
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
import { BALANCE } from "../content/balance"
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
  readonly gainPerSecond: number
  readonly spendPerSecond: number
  readonly netPerSecond: number
  readonly capPressure: "empty" | "room" | "near_cap" | "full"
  readonly timeToCapSeconds: number | null
  readonly productionZeroReason: string | null
  readonly nextAffordability: AddBaseResourceAffordability | null
}

export interface AddBaseRoleManagementSummary extends AddRoleAssignmentSummary {
  readonly slotPool: RoleDef["slotPool"]
  readonly heroAllowed: boolean
  readonly crewAllowed: boolean
  readonly maxCrewSlots: number | null
  readonly outputResourceId: string | null
  readonly outputResourceLabel: string | null
  readonly currentNetPerSecond: number
  readonly nextWorkerDeltaPerSecond: number
  readonly pressureCopy: string
  readonly slotPressure: "locked" | "empty" | "understaffed" | "staffed"
}

export type AddBaseStaffingPresetId =
  | "balanced"
  | "push_reach"
  | "gather_stone"
  | "recover_power"

export interface AddBaseStaffingPreset {
  readonly id: AddBaseStaffingPresetId
  readonly label: string
  readonly detail: string
  readonly enabled: boolean
  readonly disabledReason: string | null
  readonly heroRoleId: string
  readonly crewByRole: Record<string, number>
  readonly expectedFocus: string
}

export interface AddBaseStaffingSlotPool {
  readonly id: RoleDef["slotPool"]
  readonly label: string
  readonly occupied: number
  readonly capacity: number
  readonly free: number
  readonly pressure: "locked" | "empty" | "room" | "full"
  readonly detail: string
}

export interface AddBaseStaffingProjection {
  readonly freeCrew: number
  readonly assignedCrew: number
  readonly totalCrew: number
  readonly heroRoleId: string
  readonly heroRoleLabel: string
  readonly heroAssigned: boolean
  readonly heroTaskOptions: readonly {
    readonly roleId: string
    readonly label: string
    readonly available: boolean
    readonly lockedReason: string | null
  }[]
  readonly slotPools: readonly AddBaseStaffingSlotPool[]
  readonly presets: readonly AddBaseStaffingPreset[]
  readonly currentPresetId: AddBaseStaffingPresetId | null
  readonly visibleImpact: {
    readonly rateSummary: string
    readonly riskSummary: string
    readonly bottleneckSummary: string
  }
}

export interface AddBaseResourceAffordability {
  readonly targetId: string
  readonly targetLabel: string
  readonly requiredAmount: number
  readonly missingAmount: number
  readonly timeToAffordSeconds: number | null
  readonly reason: string
}

export interface AddBaseEconomyStalledSystem {
  readonly id: string
  readonly label: string
  readonly reason: string
  readonly severity: "info" | "warning" | "danger"
  readonly relatedResourceId: string | null
}

export interface AddBaseEconomyLimitingResource {
  readonly resourceId: string
  readonly resourceLabel: string
  readonly targetId: string
  readonly targetLabel: string
  readonly missingAmount: number
  readonly timeToAffordSeconds: number | null
  readonly copy: string
}

export interface AddBaseEconomyWaitForecast {
  readonly horizonSeconds: number
  readonly label: "1m" | "5m" | "30m"
  readonly summary: string
  readonly resourceDeltas: readonly {
    readonly id: string
    readonly label: string
    readonly delta: number
    readonly valueAfter: number
    readonly capReached: boolean
  }[]
}

export interface AddBaseEconomyOfflinePreview {
  readonly enabled: boolean
  readonly summary: string
  readonly caveat: string
}

export interface AddBaseEconomyProjection {
  readonly limitingResource: AddBaseEconomyLimitingResource | null
  readonly stalledSystems: readonly AddBaseEconomyStalledSystem[]
  readonly waitForecasts: readonly AddBaseEconomyWaitForecast[]
  readonly offlinePreview: AddBaseEconomyOfflinePreview
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
  readonly staffing: AddBaseStaffingProjection
  readonly construction: readonly AddConstructionSummary[]
  readonly stations: readonly AddBaseStationManagementSummary[]
  readonly processing: readonly AddBaseProcessingManagementSummary[]
  readonly economy: AddBaseEconomyProjection
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
  let resources = selectAddResourceSummaries(snapshot, catalog).map((resource) =>
    baseResourceSummary(snapshot, resource),
  )
  const roleDefsById = new Map(catalog.roles.map((role) => [role.id, role]))
  const roles = selectAddRoleAssignmentSummaries(snapshot, catalog).map((role) =>
    baseRoleSummary(snapshot, resources, role, roleDefsById.get(role.id)),
  )
  const construction = selectAddConstructionSummaries(snapshot, catalog)
  const stations = catalog.stations
    .slice()
    .sort((left, right) => left.uiOrder - right.uiOrder)
    .map((station) => baseStationSummary(snapshot, station))
  const processing = catalog.processingRecipes
    .slice()
    .sort((left, right) => left.uiOrder - right.uiOrder)
    .map((recipe) => baseProcessingSummary(snapshot, catalog, recipe))
  const affordabilityByResourceId = selectAffordabilityByResourceId(
    snapshot,
    catalog,
    resources,
    construction,
    processing,
  )
  resources = resources.map((resource) => ({
    ...resource,
    nextAffordability: affordabilityByResourceId.get(resource.id) ?? null,
  }))
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
  const economy = selectBaseEconomyProjection(
    snapshot,
    resources,
    roles,
    construction,
    stations,
    processing,
  )
  const staffing = selectBaseStaffingProjection(snapshot, roles, resources, nextBottleneck)

  return {
    title: "The Studio",
    subtitle: snapshot.base.studioRestored
      ? "A working base layer for crew, power, processing, and social pressure."
      : "A damaged base layer. Restore the Studio to unlock the main idle loop.",
    resources,
    roles,
    staffing,
    construction,
    stations,
    processing,
    economy,
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
  const flow = resourceFlow(snapshot, resource.id)
  const netPerSecond = flow.gainPerSecond - flow.spendPerSecond
  return {
    ...resource,
    ratePerSecond: netPerSecond,
    gainPerSecond: flow.gainPerSecond,
    spendPerSecond: flow.spendPerSecond,
    netPerSecond,
    capPressure:
      ratio >= 1
        ? "full"
        : ratio >= 0.82
          ? "near_cap"
          : ratio <= 0.05
            ? "empty"
            : "room",
    timeToCapSeconds:
      netPerSecond > 0 && resource.cap > resource.value
        ? (resource.cap - resource.value) / netPerSecond
        : null,
    productionZeroReason: productionZeroReason(snapshot, resource, flow.gainPerSecond),
    nextAffordability: null,
  }
}

function baseRoleSummary(
  snapshot: SimulationSnapshot,
  resources: readonly AddBaseResourceManagementSummary[],
  role: AddRoleAssignmentSummary,
  roleDef: RoleDef | undefined,
): AddBaseRoleManagementSummary {
  const outputResourceId = resourceForRole(role.id)
  const outputResource = outputResourceId ? resourceById(resources, outputResourceId) : null
  const nextWorkerDeltaPerSecond = role.available
    ? roleNextWorkerDeltaPerSecond(snapshot, role.id)
    : 0
  const currentNetPerSecond = outputResource?.netPerSecond ?? 0
  const slotPressure = !role.available
    ? "locked"
    : role.crewAssigned <= 0 && !role.heroAssigned
      ? "empty"
      : role.crewAssigned < role.suggestedCrew
        ? "understaffed"
        : "staffed"
  return {
    ...role,
    slotPool: roleDef?.slotPool ?? "base",
    heroAllowed: roleDef?.heroAllowed ?? true,
    crewAllowed: roleDef?.crewAllowed ?? true,
    maxCrewSlots: roleDef?.maxCrewSlots ?? null,
    outputResourceId,
    outputResourceLabel: outputResource?.label ?? null,
    currentNetPerSecond,
    nextWorkerDeltaPerSecond,
    pressureCopy: rolePressureCopy(role, slotPressure, outputResource?.label ?? null, nextWorkerDeltaPerSecond),
    slotPressure,
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

function selectBaseStaffingProjection(
  snapshot: SimulationSnapshot,
  roles: readonly AddBaseRoleManagementSummary[],
  resources: readonly AddBaseResourceManagementSummary[],
  nextBottleneck: AddBaseManagementState["nextBottleneck"],
): AddBaseStaffingProjection {
  const assignedCrew = roles.reduce((total, role) => total + role.crewAssigned, 0)
  const freeCrew = Math.max(0, snapshot.roster.totalCrew - assignedCrew)
  const heroRole = roles.find((role) => role.id === snapshot.roster.heroRoleId) ?? roles[0]
  const presets = staffingPresetSpecs().map((preset) =>
    buildStaffingPreset(snapshot, roles, preset),
  )
  return {
    freeCrew,
    assignedCrew,
    totalCrew: snapshot.roster.totalCrew,
    heroRoleId: snapshot.roster.heroRoleId,
    heroRoleLabel: heroRole?.label ?? "No task",
    heroAssigned: snapshot.roster.heroAssigned,
    heroTaskOptions: roles.map((role) => ({
      roleId: role.id,
      label: role.label,
      available: role.available && role.heroAllowed,
      lockedReason: role.heroAllowed ? role.lockedReason : "Hero cannot take this task.",
    })),
    slotPools: staffingSlotPools(snapshot, roles, freeCrew),
    presets,
    currentPresetId: presets.find((preset) => staffingPresetMatches(snapshot, preset))?.id ?? null,
    visibleImpact: {
      rateSummary: staffingRateSummary(resources),
      riskSummary: staffingRiskSummary(snapshot),
      bottleneckSummary: nextBottleneck.detail,
    },
  }
}

function staffingSlotPools(
  snapshot: SimulationSnapshot,
  roles: readonly AddBaseRoleManagementSummary[],
  freeCrew: number,
): readonly AddBaseStaffingSlotPool[] {
  return [
    slotPoolPressure("crystal_circle", "Crystal slots", crystalSlotCapacity(snapshot), roles, freeCrew),
    slotPoolPressure("fire_pit", "Fire Pit seats", firePitSlotCapacity(snapshot), roles, freeCrew),
    slotPoolPressure("base", "Base crew", snapshot.roster.totalCrew, roles, freeCrew),
  ]
}

function slotPoolPressure(
  id: RoleDef["slotPool"],
  label: string,
  capacity: number,
  roles: readonly AddBaseRoleManagementSummary[],
  freeCrew: number,
): AddBaseStaffingSlotPool {
  const occupied = roles
    .filter((role) => role.slotPool === id)
    .reduce((total, role) => total + role.crewAssigned, 0)
  const free = id === "base"
    ? freeCrew
    : Math.max(0, Math.min(capacity - occupied, freeCrew))
  const pressure =
    capacity <= 0
      ? "locked"
      : occupied <= 0
        ? "empty"
        : free <= 0
          ? "full"
          : "room"
  return {
    id,
    label,
    occupied,
    capacity,
    free,
    pressure,
    detail:
      pressure === "locked"
        ? `${label} are not available yet.`
        : pressure === "full"
          ? `${label} are full; moving workers here requires freeing capacity.`
          : `${free} ${free === 1 ? "worker" : "workers"} can still move into this pool.`,
  }
}

function staffingPresetSpecs(): readonly {
  readonly id: AddBaseStaffingPresetId
  readonly label: string
  readonly detail: string
  readonly heroRoleId: string
  readonly priority: readonly [string, number][]
  readonly requiresRoleId: string | null
  readonly expectedFocus: string
}[] {
  return [
    {
      id: "balanced",
      label: "Balanced",
      detail: "Keep reach, building, and survival lanes moving.",
      heroRoleId: ROLE_CRYSTAL_BASSLINE,
      priority: [
        [ROLE_CRYSTAL_BASSLINE, 1],
        [ROLE_SCAVENGE, 1],
        [ROLE_CONSTRUCTION, 1],
        [ROLE_FIRE_PIT, 1],
        [ROLE_WATER, 1],
        [ROLE_CRYSTAL_CHORUS, 1],
      ],
      requiresRoleId: null,
      expectedFocus: "Broad progress with no single lane pushed too hard.",
    },
    {
      id: "push_reach",
      label: "Push reach",
      detail: "Prioritize Bassline so the bubble can stretch farther.",
      heroRoleId: ROLE_CRYSTAL_BASSLINE,
      priority: [
        [ROLE_CRYSTAL_BASSLINE, 4],
        [ROLE_FIRE_PIT, 1],
        [ROLE_SCAVENGE, 1],
      ],
      requiresRoleId: ROLE_CRYSTAL_BASSLINE,
      expectedFocus: "More Bassline and bubble reach pressure relief.",
    },
    {
      id: "gather_stone",
      label: "Gather stone",
      detail: "Push Scavenge and builders for Studio restoration and early projects.",
      heroRoleId: ROLE_SCAVENGE,
      priority: [
        [ROLE_SCAVENGE, 3],
        [ROLE_CONSTRUCTION, 1],
        [ROLE_CRYSTAL_BASSLINE, 1],
      ],
      requiresRoleId: ROLE_SCAVENGE,
      expectedFocus: "More Stone income, with some building throughput.",
    },
    {
      id: "recover_power",
      label: "Recover power",
      detail: "Move effort into Chorus so powered stations stop browning out.",
      heroRoleId: ROLE_CRYSTAL_CHORUS,
      priority: [
        [ROLE_CRYSTAL_CHORUS, 3],
        [ROLE_CRYSTAL_BASSLINE, 1],
        [ROLE_FIRE_PIT, 1],
      ],
      requiresRoleId: ROLE_CRYSTAL_CHORUS,
      expectedFocus: "More Chorus generation and less brownout pressure.",
    },
  ]
}

function buildStaffingPreset(
  snapshot: SimulationSnapshot,
  roles: readonly AddBaseRoleManagementSummary[],
  spec: ReturnType<typeof staffingPresetSpecs>[number],
): AddBaseStaffingPreset {
  const requiredRole = spec.requiresRoleId
    ? roles.find((role) => role.id === spec.requiresRoleId)
    : null
  const heroRole = roles.find((role) => role.id === spec.heroRoleId)
  const disabledReason =
    requiredRole && !requiredRole.available
      ? requiredRole.lockedReason ?? `${requiredRole.label} is locked.`
      : heroRole && !heroRole.available
        ? heroRole.lockedReason ?? `${heroRole.label} is locked.`
        : null
  return {
    id: spec.id,
    label: spec.label,
    detail: spec.detail,
    enabled: disabledReason === null,
    disabledReason,
    heroRoleId: disabledReason === null ? spec.heroRoleId : snapshot.roster.heroRoleId,
    crewByRole: disabledReason === null ? presetCrewTargets(snapshot, roles, spec.priority) : emptyCrewTargets(roles),
    expectedFocus: spec.expectedFocus,
  }
}

function presetCrewTargets(
  snapshot: SimulationSnapshot,
  roles: readonly AddBaseRoleManagementSummary[],
  priority: readonly [string, number][],
): Record<string, number> {
  const targets = emptyCrewTargets(roles)
  let remainingCrew = snapshot.roster.totalCrew
  let remainingCrystalSlots = crystalSlotCapacity(snapshot)
  let remainingFirePitSlots = firePitSlotCapacity(snapshot)
  priority.forEach(([roleId, desired]) => {
    const role = roles.find((candidate) => candidate.id === roleId)
    if (!role?.available || !role.crewAllowed || desired <= 0 || remainingCrew <= 0) return
    const roleLimit = role.maxCrewSlots ?? remainingCrew
    const poolLimit =
      role.slotPool === "crystal_circle"
        ? remainingCrystalSlots
        : role.slotPool === "fire_pit"
          ? remainingFirePitSlots
          : remainingCrew
    const assigned = Math.max(0, Math.min(desired, roleLimit, poolLimit, remainingCrew))
    targets[role.id] = assigned
    remainingCrew -= assigned
    if (role.slotPool === "crystal_circle") remainingCrystalSlots -= assigned
    if (role.slotPool === "fire_pit") remainingFirePitSlots -= assigned
  })
  return targets
}

function emptyCrewTargets(
  roles: readonly AddBaseRoleManagementSummary[],
): Record<string, number> {
  return Object.fromEntries(roles.map((role) => [role.id, 0]))
}

function staffingPresetMatches(
  snapshot: SimulationSnapshot,
  preset: AddBaseStaffingPreset,
): boolean {
  if (!preset.enabled) return false
  if (snapshot.roster.heroAssigned && snapshot.roster.heroRoleId !== preset.heroRoleId) return false
  return Object.entries(preset.crewByRole).every(
    ([roleId, crew]) => roleCrew(snapshot, roleId) === crew,
  )
}

function crystalSlotCapacity(snapshot: SimulationSnapshot): number {
  return snapshot.crystalCircle.baseSlots + snapshot.crystalCircle.slotCapacityLevel
}

function firePitSlotCapacity(snapshot: SimulationSnapshot): number {
  return snapshot.base.firePitBuilt ? BALANCE.crystal.firePitCrewSlots : 0
}

function staffingRateSummary(
  resources: readonly AddBaseResourceManagementSummary[],
): string {
  const strongest = resources
    .filter((resource) => Math.abs(resource.netPerSecond) > 0.001)
    .sort((left, right) => Math.abs(right.netPerSecond) - Math.abs(left.netPerSecond))[0]
  if (!strongest) return "No resource rate is moving with the current staffing."
  return `${strongest.label} is moving most: ${formatSignedRate(strongest.netPerSecond)}.`
}

function staffingRiskSummary(snapshot: SimulationSnapshot): string {
  if (snapshot.power.brownoutActive) {
    return `Brownout is active; recovery is slowed by ${formatAmount(snapshot.power.brownoutSeverity)} severity.`
  }
  if (snapshot.heroSurvival.viralLoadRatio >= 0.5) {
    return `Hero work efficiency is reduced by viral load at ${formatAmount(snapshot.heroSurvival.viralLoadRatio * 100)}%.`
  }
  return "No immediate staffing risk is active."
}

function roleNextWorkerDeltaPerSecond(
  snapshot: SimulationSnapshot,
  roleId: string,
): number {
  const efficiency = snapshot.base.crewEfficiencyMultiplier
  switch (roleId) {
    case ROLE_CRYSTAL_BASSLINE:
      return snapshot.power.basslineOutputMultiplier * BALANCE.crystal.outputPerWorkerBase * efficiency
    case ROLE_CRYSTAL_CHORUS:
      return snapshot.power.chorusOutputMultiplier * BALANCE.crystal.chorusPerWorkerBase * efficiency
    case ROLE_CRYSTAL_HARMONICS:
      return snapshot.power.harmonicsOutputMultiplier * BALANCE.crystal.harmonicsPerWorkerBase * efficiency
    case ROLE_SCAVENGE:
      return (snapshot.resources.baseStoneStock > 0
        ? BALANCE.scavenge.stockRatePerSecond
        : BALANCE.scavenge.ambientRatePerSecond) * efficiency
    case ROLE_WATER:
      return snapshot.base.waterCollectionUnlocked ? BALANCE.water.collectionRatePerSecond * efficiency : 0
    case ROLE_FIRE_PIT:
      return snapshot.base.firePitBuilt ? BALANCE.firePit.staffVibesPerSecond * efficiency : 0
    case ROLE_CONSTRUCTION:
      return snapshot.activeConstruction?.perWorkerCostPerSecond ?? 0
    default:
      return 0
  }
}

function rolePressureCopy(
  role: AddRoleAssignmentSummary,
  pressure: AddBaseRoleManagementSummary["slotPressure"],
  outputResourceLabel: string | null,
  nextWorkerDeltaPerSecond: number,
): string {
  if (role.lockedReason) return role.lockedReason
  if (pressure === "empty") return `${role.label} is idle.`
  if (pressure === "understaffed") return `${role.label} can use more crew.`
  if (outputResourceLabel && nextWorkerDeltaPerSecond > 0) {
    return `Next worker changes ${outputResourceLabel} by ${formatSignedRate(nextWorkerDeltaPerSecond)}.`
  }
  return `${role.label} is covered.`
}

interface AddBaseAffordabilityTarget {
  readonly id: string
  readonly label: string
  readonly cost: CostDef
  readonly blockedReason: string | null
}

function selectAffordabilityByResourceId(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  resources: readonly AddBaseResourceManagementSummary[],
  construction: readonly AddConstructionSummary[],
  processing: readonly AddBaseProcessingManagementSummary[],
): Map<string, AddBaseResourceAffordability> {
  const resourceByIdMap = new Map(resources.map((resource) => [resource.id, resource]))
  const result = new Map<string, AddBaseResourceAffordability>()
  affordabilityTargets(snapshot, catalog, construction, processing).forEach((target) => {
    missingCostItems(snapshot, target.cost).forEach((item) => {
      if (result.has(item.resourceId)) return
      const resource = resourceByIdMap.get(item.resourceId)
      if (!resource) return
      const timeToAffordSeconds =
        resource.netPerSecond > 0 ? item.missingAmount / resource.netPerSecond : null
      result.set(item.resourceId, {
        targetId: target.id,
        targetLabel: target.label,
        requiredAmount: item.requiredAmount,
        missingAmount: item.missingAmount,
        timeToAffordSeconds,
        reason:
          target.blockedReason ??
          `${resource.label} is blocking ${target.label}.`,
      })
    })
  })
  return result
}

function affordabilityTargets(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  construction: readonly AddConstructionSummary[],
  processing: readonly AddBaseProcessingManagementSummary[],
): readonly AddBaseAffordabilityTarget[] {
  const constructionTargets = catalog.constructionOptions
    .slice()
    .sort((left, right) => left.uiOrder - right.uiOrder)
    .flatMap((option) => {
      const summary = construction.find((candidate) => candidate.id === option.id)
      if (!summary || summary.complete || summary.inProgress) return []
      if (!requirementsMet(snapshot, option.requirements)) return []
      return [{ id: option.id, label: option.label, cost: option.cost, blockedReason: summary.blockedReason }]
    })
  const processingTargets = catalog.processingRecipes
    .slice()
    .sort((left, right) => left.uiOrder - right.uiOrder)
    .flatMap((recipe) => {
      const summary = processing.find((candidate) => candidate.id === recipe.id)
      if (!summary || summary.inProgress || summary.level >= summary.maxLevel) return []
      if (!requirementsMet(snapshot, recipe.requirements)) return []
      return [{ id: recipe.id, label: recipe.label, cost: recipe.cost, blockedReason: summary.blockedReason }]
    })
  const recruitmentTargets =
    snapshot.objectives.recruitmentEnabled && snapshot.base.freeBunks > 0
      ? [
          {
            id: "recruit:survivor_cave",
            label: "Recruit Survivor",
            cost: {
              kind: "upfront" as const,
              resource_id: RESOURCE_VIBES,
              amount: snapshot.recruitment.nextRecruitCost,
            },
            blockedReason:
              snapshot.resources.vibes >= snapshot.recruitment.nextRecruitCost
                ? null
                : "Vibes are blocking recruitment.",
          },
        ]
      : []
  return [...constructionTargets, ...processingTargets, ...recruitmentTargets]
}

function missingCostItems(
  snapshot: SimulationSnapshot,
  cost: CostDef,
): readonly { readonly resourceId: string; readonly requiredAmount: number; readonly missingAmount: number }[] {
  switch (cost.kind) {
    case "upfront": {
      const resourceId = cost.resource_id
      const requiredAmount = cost.amount ?? 0
      if (!resourceId || !resourceId.startsWith("resource.")) return []
      const missingAmount = Math.max(0, requiredAmount - resourceValue(snapshot, resourceId))
      return missingAmount > 0 ? [{ resourceId, requiredAmount, missingAmount }] : []
    }
    case "upfront_bundle":
      return (
        cost.costs
          ?.filter((item) => item.item_id.startsWith("resource."))
          .map((item) => ({
            resourceId: item.item_id,
            requiredAmount: item.amount,
            missingAmount: Math.max(0, item.amount - resourceValue(snapshot, item.item_id)),
          }))
          .filter((item) => item.missingAmount > 0) ?? []
      )
    case "drain_per_worker_second":
    case "time_only":
      return []
  }
}

function selectBaseEconomyProjection(
  snapshot: SimulationSnapshot,
  resources: readonly AddBaseResourceManagementSummary[],
  roles: readonly AddBaseRoleManagementSummary[],
  construction: readonly AddConstructionSummary[],
  stations: readonly AddBaseStationManagementSummary[],
  processing: readonly AddBaseProcessingManagementSummary[],
): AddBaseEconomyProjection {
  const limitingResource = selectLimitingResource(resources)
  return {
    limitingResource,
    stalledSystems: selectStalledSystems(snapshot, resources, roles, construction, stations, processing),
    waitForecasts: [60, 300, 1800].map((seconds) =>
      waitForecast(resources, limitingResource, seconds),
    ),
    offlinePreview: {
      enabled: true,
      summary: limitingResource
        ? `Offline preview will track whether ${limitingResource.resourceLabel} catches up for ${limitingResource.targetLabel}.`
        : "Offline preview will use current resource flow to estimate what changes while away.",
      caveat: "Preview uses current rates; the Rust/WASM runtime remains authoritative on reload.",
    },
  }
}

function selectLimitingResource(
  resources: readonly AddBaseResourceManagementSummary[],
): AddBaseEconomyLimitingResource | null {
  const resource = resources.find((candidate) => candidate.nextAffordability)
  const affordability = resource?.nextAffordability
  if (!resource || !affordability) return null
  return {
    resourceId: resource.id,
    resourceLabel: resource.label,
    targetId: affordability.targetId,
    targetLabel: affordability.targetLabel,
    missingAmount: affordability.missingAmount,
    timeToAffordSeconds: affordability.timeToAffordSeconds,
    copy:
      affordability.timeToAffordSeconds === null
        ? `${resource.label} is blocking ${affordability.targetLabel}. ${resource.productionZeroReason ?? "Production is stalled."}`
        : `${resource.label} is blocking ${affordability.targetLabel}; ${formatDuration(affordability.timeToAffordSeconds)} at current flow.`,
  }
}

function selectStalledSystems(
  snapshot: SimulationSnapshot,
  resources: readonly AddBaseResourceManagementSummary[],
  roles: readonly AddBaseRoleManagementSummary[],
  construction: readonly AddConstructionSummary[],
  stations: readonly AddBaseStationManagementSummary[],
  processing: readonly AddBaseProcessingManagementSummary[],
): readonly AddBaseEconomyStalledSystem[] {
  const stalledResources: AddBaseEconomyStalledSystem[] = resources.flatMap<AddBaseEconomyStalledSystem>((resource) =>
    resource.productionZeroReason
      ? [
          {
            id: `resource:${resource.id}`,
            label: resource.label,
            reason: resource.productionZeroReason,
            severity: resource.capPressure === "full" ? "warning" as const : "info" as const,
            relatedResourceId: resource.id,
          },
        ]
      : [],
  )
  const stalledRoles: AddBaseEconomyStalledSystem[] = roles.flatMap<AddBaseEconomyStalledSystem>((role) =>
    role.available && role.slotPressure === "empty"
      ? [
          {
            id: `role:${role.id}`,
            label: role.label,
            reason: `${role.label} has no crew assigned.`,
            severity: "info" as const,
            relatedResourceId: resourceForRole(role.id),
          },
        ]
      : role.lockedReason
        ? [
            {
              id: `role:${role.id}`,
              label: role.label,
              reason: role.lockedReason,
              severity: "warning" as const,
              relatedResourceId: resourceForRole(role.id),
            },
          ]
        : [],
  )
  const stalledConstruction: AddBaseEconomyStalledSystem[] = construction.flatMap<AddBaseEconomyStalledSystem>((option) =>
    !option.complete && !option.inProgress && option.blockedReason
      ? [
          {
            id: `construction:${option.id}`,
            label: option.label,
            reason: option.blockedReason,
            severity: "warning" as const,
            relatedResourceId: resourceIdFromCopy(option.blockedReason),
          },
        ]
      : [],
  )
  const stalledStations: AddBaseEconomyStalledSystem[] = stations.flatMap<AddBaseEconomyStalledSystem>((station) =>
    station.requestedEnabled && !station.powered
      ? [
          {
            id: `station:${station.id}`,
            label: station.label,
            reason: station.blockedReason ?? `${station.label} is requested but not powered.`,
            severity: "danger" as const,
            relatedResourceId: RESOURCE_CHORUS,
          },
        ]
      : station.blockedReason
        ? [
            {
              id: `station:${station.id}`,
              label: station.label,
              reason: station.blockedReason,
              severity: "warning" as const,
              relatedResourceId: RESOURCE_CHORUS,
            },
          ]
        : [],
  )
  const stalledProcessing: AddBaseEconomyStalledSystem[] = processing.flatMap<AddBaseEconomyStalledSystem>((recipe) =>
    !recipe.inProgress && !recipe.enabled && recipe.blockedReason && recipe.blockedReason !== "Complete."
      ? [
          {
            id: `processing:${recipe.id}`,
            label: recipe.label,
            reason: recipe.blockedReason,
            severity: "warning" as const,
            relatedResourceId: resourceIdFromCopy(recipe.blockedReason),
          },
        ]
      : [],
  )
  const recruitmentStall = recruitmentStallReason(snapshot)
  return [
    ...stalledResources,
    ...stalledRoles,
    ...stalledConstruction,
    ...stalledStations,
    ...stalledProcessing,
    ...(recruitmentStall
      ? [
          {
            id: "recruitment",
            label: "Recruitment",
            reason: recruitmentStall.reason,
            severity: recruitmentStall.severity,
            relatedResourceId: recruitmentStall.relatedResourceId,
          },
        ]
      : []),
  ]
}

function waitForecast(
  resources: readonly AddBaseResourceManagementSummary[],
  limitingResource: AddBaseEconomyLimitingResource | null,
  horizonSeconds: number,
): AddBaseEconomyWaitForecast {
  const resourceDeltas = resources.map((resource) => {
    const rawValueAfter = resource.value + resource.netPerSecond * horizonSeconds
    const valueAfter = Math.max(0, resource.cap > 0 ? Math.min(resource.cap, rawValueAfter) : rawValueAfter)
    return {
      id: resource.id,
      label: resource.label,
      delta: valueAfter - resource.value,
      valueAfter,
      capReached: resource.cap > 0 && valueAfter >= resource.cap,
    }
  })
  const limitingDelta = limitingResource
    ? resourceDeltas.find((delta) => delta.id === limitingResource.resourceId)
    : null
  return {
    horizonSeconds,
    label: horizonSeconds === 60 ? "1m" : horizonSeconds === 300 ? "5m" : "30m",
    summary:
      limitingResource && limitingDelta
        ? waitForecastLimitingCopy(limitingResource, limitingDelta, horizonSeconds)
        : waitForecastGeneralCopy(resourceDeltas),
    resourceDeltas,
  }
}

function waitForecastLimitingCopy(
  limitingResource: AddBaseEconomyLimitingResource,
  delta: AddBaseEconomyWaitForecast["resourceDeltas"][number],
  horizonSeconds: number,
): string {
  if (delta.delta >= limitingResource.missingAmount) {
    return `${limitingResource.targetLabel} becomes affordable within ${formatDuration(horizonSeconds)}.`
  }
  const stillMissing = limitingResource.missingAmount - Math.max(0, delta.delta)
  return `${formatAmount(stillMissing)} ${limitingResource.resourceLabel} still missing after ${formatDuration(horizonSeconds)}.`
}

function waitForecastGeneralCopy(
  deltas: readonly AddBaseEconomyWaitForecast["resourceDeltas"][number][],
): string {
  const best = deltas
    .filter((delta) => delta.delta > 0)
    .sort((left, right) => right.delta - left.delta)[0]
  if (!best) return "No resource stock improves at current assignments."
  return `${best.label} changes most: ${formatSignedAmount(best.delta)}.`
}

function recruitmentStallReason(snapshot: SimulationSnapshot): {
  readonly reason: string
  readonly severity: "info" | "warning" | "danger"
  readonly relatedResourceId: string | null
} | null {
  if (!snapshot.objectives.recruitmentEnabled) {
    return {
      reason: "Recruitment is locked until the Survivor Cave is inside the bubble.",
      severity: "warning",
      relatedResourceId: RESOURCE_BASSLINE,
    }
  }
  if (snapshot.base.missingBunks > 0 || snapshot.base.freeBunks <= 0) {
    return {
      reason: "Recruitment is blocked by bunks.",
      severity: "danger",
      relatedResourceId: null,
    }
  }
  if (snapshot.recruitment.pendingRecruits.length > 0) {
    return {
      reason: "A recruit is already traveling to the Base.",
      severity: "info",
      relatedResourceId: null,
    }
  }
  if (snapshot.resources.vibes < snapshot.recruitment.nextRecruitCost) {
    return {
      reason: `Need ${formatAmount(snapshot.recruitment.nextRecruitCost)} Vibes to recruit.`,
      severity: "warning",
      relatedResourceId: RESOURCE_VIBES,
    }
  }
  return null
}

function resourceForRole(roleId: string): string | null {
  switch (roleId) {
    case ROLE_CRYSTAL_BASSLINE:
      return RESOURCE_BASSLINE
    case ROLE_CRYSTAL_CHORUS:
      return RESOURCE_CHORUS
    case ROLE_CRYSTAL_HARMONICS:
      return RESOURCE_HARMONICS
    case ROLE_SCAVENGE:
      return RESOURCE_STONE
    case ROLE_WATER:
      return RESOURCE_WATER
    case ROLE_FIRE_PIT:
      return RESOURCE_VIBES
    default:
      return null
  }
}

function resourceIdFromCopy(copy: string): string | null {
  if (copy.includes("Bassline")) return RESOURCE_BASSLINE
  if (copy.includes("Chorus")) return RESOURCE_CHORUS
  if (copy.includes("Harmonics")) return RESOURCE_HARMONICS
  if (copy.includes("Stone")) return RESOURCE_STONE
  if (copy.includes("Water")) return RESOURCE_WATER
  if (copy.includes("Vibes")) return RESOURCE_VIBES
  return null
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

function resourceFlow(
  snapshot: SimulationSnapshot,
  resourceId: string,
): { readonly gainPerSecond: number; readonly spendPerSecond: number } {
  const constructionSpend = constructionSpendPerSecond(snapshot, resourceId)
  switch (resourceId) {
    case RESOURCE_BASSLINE:
      return {
        gainPerSecond: cappedGain(
          snapshot.power.basslineGenerationPerSecond,
          snapshot.resources.bassline,
          snapshot.resources.basslineCap,
        ),
        spendPerSecond: constructionSpend,
      }
    case RESOURCE_CHORUS:
      return {
        gainPerSecond: cappedGain(
          snapshot.power.chorusGenerationPerSecond,
          snapshot.resources.chorus,
          snapshot.resources.chorusCap,
        ),
        spendPerSecond: snapshot.power.activeUpkeepPerSecond + constructionSpend,
      }
    case RESOURCE_HARMONICS:
      return {
        gainPerSecond: cappedGain(
          snapshot.power.harmonicsGenerationPerSecond,
          snapshot.resources.harmonics,
          snapshot.resources.harmonicsCap,
        ),
        spendPerSecond: constructionSpend,
      }
    case RESOURCE_STONE:
      return {
        gainPerSecond: cappedGain(
          stoneGainPerSecond(snapshot),
          snapshot.resources.stone,
          snapshot.resources.stoneCap,
        ),
        spendPerSecond: constructionSpend,
      }
    case RESOURCE_WATER:
      return {
        gainPerSecond: cappedGain(
          waterGainPerSecond(snapshot),
          snapshot.resources.water,
          snapshot.resources.waterCap,
        ),
        spendPerSecond: constructionSpend,
      }
    case RESOURCE_VIBES:
      return {
        gainPerSecond: cappedGain(
          vibesGainPerSecond(snapshot),
          snapshot.resources.vibes,
          snapshot.resources.vibesCap,
        ),
        spendPerSecond: snapshot.base.effectiveBadVibesRate + constructionSpend,
      }
    default:
      return { gainPerSecond: 0, spendPerSecond: 0 }
  }
}

function constructionSpendPerSecond(snapshot: SimulationSnapshot, resourceId: string): number {
  const job = snapshot.activeConstruction
  if (!job || job.resourceId !== resourceId) return 0
  return effectiveRoleWorkers(snapshot, ROLE_CONSTRUCTION) * job.perWorkerCostPerSecond
}

function cappedGain(gainPerSecond: number, value: number, cap: number): number {
  return cap > 0 && value >= cap ? 0 : Math.max(0, gainPerSecond)
}

function stoneGainPerSecond(snapshot: SimulationSnapshot): number {
  const workers = effectiveRoleWorkers(snapshot, ROLE_SCAVENGE)
  if (workers <= 0) return 0
  return snapshot.resources.baseStoneStock > 0
    ? BALANCE.scavenge.stockRatePerSecond * workers
    : BALANCE.scavenge.ambientRatePerSecond * workers
}

function waterGainPerSecond(snapshot: SimulationSnapshot): number {
  if (!snapshot.base.waterCollectionUnlocked) return 0
  const workers = effectiveRoleWorkers(snapshot, ROLE_WATER)
  if (workers <= 0 || snapshot.resources.baseWaterStock <= 0) return 0
  return BALANCE.water.collectionRatePerSecond * workers
}

function vibesGainPerSecond(snapshot: SimulationSnapshot): number {
  if (!snapshot.base.firePitBuilt) return 0
  return (
    BALANCE.firePit.baseVibesPerSecond +
    effectiveRoleWorkers(snapshot, ROLE_FIRE_PIT) * BALANCE.firePit.staffVibesPerSecond
  )
}

function effectiveRoleWorkers(snapshot: SimulationSnapshot, roleId: string): number {
  const crewWorkers = roleCrew(snapshot, roleId) * snapshot.base.crewEfficiencyMultiplier
  const heroWorker =
    snapshot.roster.heroAssigned && snapshot.roster.heroRoleId === roleId
      ? snapshot.base.crewEfficiencyMultiplier * snapshot.heroSurvival.workEfficiencyMultiplier
      : 0
  return crewWorkers + heroWorker
}

function productionZeroReason(
  snapshot: SimulationSnapshot,
  resource: AddResourceSummary,
  gainPerSecond: number,
): string | null {
  if (gainPerSecond > 0) return null
  if (resource.value >= resource.cap && resource.cap > 0) {
    return `${resource.label} is full. More production is currently wasted.`
  }
  if (resource.blocker) return resource.blocker
  switch (resource.id) {
    case RESOURCE_BASSLINE:
      return "Assign Hero or crew to Crystal Bassline to generate Bassline."
    case RESOURCE_CHORUS:
      return snapshot.base.studioRestored
        ? "Assign Hero or crew to Crystal Chorus to generate Chorus."
        : "Restore the Studio to unlock Chorus."
    case RESOURCE_HARMONICS:
      return snapshot.base.resonanceChamberBuilt
        ? "Assign Hero or crew to Crystal Harmonics to generate Harmonics."
        : "Build the Resonance Chamber to unlock Harmonics."
    case RESOURCE_STONE:
      return roleCrew(snapshot, ROLE_SCAVENGE) > 0 || snapshot.roster.heroRoleId === ROLE_SCAVENGE
        ? "Stone storage or local stock is blocking Scavenge output."
        : "Assign Scavenge crew or Hero to gather Stone."
    case RESOURCE_WATER:
      if (!snapshot.base.waterCollectionUnlocked) return "Explore the Base to unlock water collection."
      if (snapshot.resources.baseWaterStock <= 0) return "Base water stock is empty and must regenerate."
      return "Assign Water crew or Hero to collect Water."
    case RESOURCE_VIBES:
      return snapshot.base.firePitBuilt
        ? "Fire Pit is active, but Bad Vibes are canceling current Vibes gain."
        : "Build the Fire Pit to generate Vibes."
    default:
      return "No current production source is active."
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

function formatSignedAmount(value: number): string {
  return `${value >= 0 ? "+" : ""}${formatAmount(value)}`
}

function formatAmount(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "unknown time"
  if (seconds < 60) return `${Math.ceil(seconds)}s`
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainderMinutes = minutes % 60
  return remainderMinutes > 0 ? `${hours}h ${remainderMinutes}m` : `${hours}h`
}
