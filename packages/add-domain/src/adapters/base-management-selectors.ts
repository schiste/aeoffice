import type {
  CatalogSnapshot,
  ConstructionOptionDef,
  CostDef,
  DurationDef,
  EffectDef,
  ExpeditionRisk,
  ExpeditionTargetDef,
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
  | "expeditions"
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

export type AddBaseSocialPressureStatus =
  | "locked"
  | "ready"
  | "waiting_vibes"
  | "pending_arrival"
  | "housing_tight"
  | "overcrowded"

export interface AddBaseSocialPendingRecruit {
  readonly id: string
  readonly label: string
  readonly remainingSeconds: number
  readonly totalSeconds: number
  readonly progressPercent: number
  readonly arrivalCopy: string
}

export interface AddBaseSocialPressureProjection {
  readonly status: AddBaseSocialPressureStatus
  readonly headline: string
  readonly detail: string
  readonly vibes: {
    readonly value: number
    readonly cap: number
    readonly gainPerSecond: number
    readonly lossPerSecond: number
    readonly netPerSecond: number
    readonly explanation: string
    readonly lossExplanation: string
    readonly timeToNextRecruitSeconds: number | null
  }
  readonly housing: {
    readonly capacity: number
    readonly occupied: number
    readonly free: number
    readonly missing: number
    readonly pressure: "room" | "full" | "overcrowded"
    readonly overcrowdedSeconds: number
    readonly warning: string
  }
  readonly recruitment: {
    readonly enabled: boolean
    readonly pendingCount: number
    readonly nextCost: number
    readonly canAfford: boolean
    readonly canRecruitNow: boolean
    readonly blocker: string | null
    readonly costProjection: string
  }
  readonly pendingArrivals: readonly AddBaseSocialPendingRecruit[]
  readonly supportForecast: {
    readonly canSupport: boolean
    readonly status: "supported" | "tight" | "overcrowded" | "locked" | "unaffordable" | "pending"
    readonly bunksAfterArrival: number
    readonly missingBunksAfterArrival: number
    readonly vibesAfterCommit: number
    readonly copy: string
    readonly warning: string | null
  }
}

export interface AddBaseExpeditionTarget {
  readonly id: string
  readonly label: string
  readonly durationSeconds: number
  readonly durationLabel: string
  readonly requiredCrew: number
  readonly requiredBubbleReach: number
  readonly risk: ExpeditionRisk
  readonly riskLabel: string
  readonly requiredSupportCopy: string
  readonly expectedLootCopy: string
  readonly playerHint: string
  readonly enabled: boolean
  readonly disabledReason: string | null
}

export interface AddBaseExpeditionJob {
  readonly id: number
  readonly targetId: string
  readonly label: string
  readonly assignedCrew: number
  readonly durationSeconds: number
  readonly remainingSeconds: number
  readonly progressPercent: number
  readonly risk: ExpeditionRisk
  readonly riskLabel: string
  readonly returnCopy: string
}

export interface AddBaseExpeditionReport {
  readonly id: number
  readonly targetId: string
  readonly label: string
  readonly assignedCrew: number
  readonly durationSeconds: number
  readonly risk: ExpeditionRisk
  readonly rewardCopy: string
  readonly woundCopy: string
  readonly clueCopy: string
}

export interface AddBaseExpeditionProjection {
  readonly summary: string
  readonly availableCrew: number
  readonly assignedCrew: number
  readonly activeCount: number
  readonly completedReportCount: number
  readonly totalWounds: number
  readonly totalClues: number
  readonly totalDungeonLeads: number
  readonly targets: readonly AddBaseExpeditionTarget[]
  readonly activeJobs: readonly AddBaseExpeditionJob[]
  readonly reports: readonly AddBaseExpeditionReport[]
  readonly recommendedTargetId: string | null
}

export type AddBaseConstructionCategory =
  | "repair"
  | "crystal"
  | "station"
  | "housing"
  | "support"

export interface AddBaseConstructionProjectCard extends AddConstructionSummary {
  readonly category: AddBaseConstructionCategory
  readonly categoryLabel: string
  readonly assignedWorkers: number
  readonly requiredWorkers: number
  readonly progressPercent: number
  readonly estimatedCompletionSeconds: number | null
  readonly missingResource: string | null
  readonly resultPreview: string
  readonly futureEconomyChange: string
  readonly basslineRisk: {
    readonly severity: "none" | "watch" | "high"
    readonly copy: string
  }
}

export interface AddBaseConstructionCategoryGroup {
  readonly id: AddBaseConstructionCategory
  readonly label: string
  readonly projects: readonly AddBaseConstructionProjectCard[]
}

export interface AddBaseConstructionProjection {
  readonly summary: string
  readonly activeJob: AddBaseConstructionProjectCard | null
  readonly projects: readonly AddBaseConstructionProjectCard[]
  readonly groups: readonly AddBaseConstructionCategoryGroup[]
  readonly assignedWorkers: number
  readonly workerThroughputPerSecond: number
  readonly readyProjectCount: number
  readonly blockedProjectCount: number
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
  readonly brownoutPriority: number | null
  readonly blockedReason: string | null
}

export type AddBaseStationMachineStatus =
  | "built"
  | "locked"
  | "powered"
  | "browned_out"
  | "off"

export interface AddBaseStationMachineRecipe {
  readonly id: string
  readonly label: string
  readonly level: number
  readonly maxLevel: number
  readonly enabled: boolean
  readonly inProgress: boolean
  readonly blockedReason: string | null
  readonly costLabel: string
}

export interface AddBaseStationMachineCard {
  readonly id: string
  readonly label: string
  readonly group:
    | "crystal"
    | "studio"
    | "social"
    | "field"
    | "tuning"
    | "workshop"
    | "research"
  readonly status: AddBaseStationMachineStatus
  readonly built: boolean
  readonly locked: boolean
  readonly powered: boolean
  readonly brownedOut: boolean
  readonly requestedEnabled: boolean
  readonly manualPower: boolean
  readonly chorusUpkeepPerSecond: number
  readonly brownoutPriority: number | null
  readonly currentJob: {
    readonly id: string
    readonly label: string
    readonly remainingSeconds: number
  } | null
  readonly availableRecipes: readonly AddBaseStationMachineRecipe[]
  readonly outputEffect: string
  readonly blockedReason: string | null
  readonly brownoutPriorityCopy: string
  readonly canTogglePower: boolean
}

export interface AddBaseStationMachineGroup {
  readonly id: AddBaseStationMachineCard["group"]
  readonly label: string
  readonly cards: readonly AddBaseStationMachineCard[]
}

export interface AddBaseStationMachineProjection {
  readonly groups: readonly AddBaseStationMachineGroup[]
  readonly cards: readonly AddBaseStationMachineCard[]
  readonly poweredCount: number
  readonly brownedOutCount: number
  readonly activeJobCount: number
  readonly requestedUpkeepPerSecond: number
  readonly activeUpkeepPerSecond: number
  readonly summary: string
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
  readonly buildLoop: AddBaseConstructionProjection
  readonly stations: readonly AddBaseStationManagementSummary[]
  readonly processing: readonly AddBaseProcessingManagementSummary[]
  readonly stationMachine: AddBaseStationMachineProjection
  readonly economy: AddBaseEconomyProjection
  readonly socialPressure: AddBaseSocialPressureProjection
  readonly expeditions: AddBaseExpeditionProjection
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
      | "start_expedition"
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
  const economy = selectBaseEconomyProjection(
    snapshot,
    resources,
    roles,
    construction,
    stations,
    processing,
  )
  const staffing = selectBaseStaffingProjection(snapshot, roles, resources, nextBottleneck)
  const stationMachine = selectBaseStationMachineProjection(
    snapshot,
    stations,
    processing,
    construction,
  )
  const buildLoop = selectBaseConstructionProjection(
    snapshot,
    catalog,
    construction,
  )
  const socialPressure = selectBaseSocialPressureProjection(snapshot)
  const expeditions = selectBaseExpeditionProjection(snapshot, catalog)
  const recommendedAction = selectRecommendedBaseAction(
    snapshot,
    roles,
    construction,
    stations,
    processing,
    expeditions,
  )

  return {
    title: "The Studio",
    subtitle: snapshot.base.studioRestored
      ? "A working base layer for crew, power, processing, and social pressure."
      : "A damaged base layer. Restore the Studio to unlock the main idle loop.",
    resources,
    roles,
    staffing,
    construction,
    buildLoop,
    stations,
    processing,
    stationMachine,
    economy,
    socialPressure,
    expeditions,
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
      expeditions,
    }),
    activeConstruction,
    vibes: {
      value: socialPressure.vibes.value,
      cap: socialPressure.vibes.cap,
      badVibesMultiplier: snapshot.base.badVibesMultiplier,
      recruitmentPressure: socialPressure.detail,
    },
    bunks: {
      capacity: socialPressure.housing.capacity,
      occupied: socialPressure.housing.occupied,
      free: socialPressure.housing.free,
      missing: socialPressure.housing.missing,
      pressure: socialPressure.housing.pressure,
    },
    recruitment: {
      enabled: socialPressure.recruitment.enabled,
      pending: socialPressure.recruitment.pendingCount,
      nextCost: socialPressure.recruitment.nextCost,
      pressure: socialPressure.detail,
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
    brownoutPriority: station.manualPower ? runtime?.powerOrder ?? null : null,
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

function selectBaseConstructionProjection(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  construction: readonly AddConstructionSummary[],
): AddBaseConstructionProjection {
  const assignedWorkers = constructionAssignedWorkers(snapshot)
  const workerThroughputPerSecond = constructionWorkerThroughput(snapshot)
  const projects = catalog.constructionOptions
    .slice()
    .sort((left, right) => left.uiOrder - right.uiOrder)
    .map((option) =>
      constructionProjectCard(snapshot, construction, option, assignedWorkers, workerThroughputPerSecond),
    )
  const groups = constructionCategoryOrder()
    .map((category) => ({
      id: category.id,
      label: category.label,
      projects: projects.filter((project) => project.category === category.id),
    }))
    .filter((group) => group.projects.length > 0)
  const activeJob = projects.find((project) => project.inProgress) ?? null
  const readyProjectCount = projects.filter((project) => project.enabled).length
  const blockedProjectCount = projects.filter(
    (project) => !project.complete && !project.inProgress && !project.enabled,
  ).length
  return {
    summary: activeJob
      ? `${activeJob.label} is ${Math.round(activeJob.progressPercent)}% complete; ${formatSeconds(activeJob.estimatedCompletionSeconds)} estimated.`
      : readyProjectCount > 0
        ? `${readyProjectCount} build ${readyProjectCount === 1 ? "choice is" : "choices are"} ready.`
        : `${blockedProjectCount} build ${blockedProjectCount === 1 ? "choice is" : "choices are"} waiting on resources or unlocks.`,
    activeJob,
    projects,
    groups,
    assignedWorkers,
    workerThroughputPerSecond,
    readyProjectCount,
    blockedProjectCount,
  }
}

function constructionProjectCard(
  snapshot: SimulationSnapshot,
  construction: readonly AddConstructionSummary[],
  option: ConstructionOptionDef,
  assignedWorkers: number,
  workerThroughputPerSecond: number,
): AddBaseConstructionProjectCard {
  const summary = construction.find((candidate) => candidate.id === option.id) ?? {
    id: option.id,
    label: option.label,
    complete: false,
    enabled: false,
    inProgress: false,
    remainingSeconds: null,
    costLabel: costLabel(option.cost),
    blockedReason: "Missing construction summary.",
  }
  const active = snapshot.activeConstruction?.optionId === option.id ? snapshot.activeConstruction : null
  const totalWorkSeconds = active?.totalWorkSeconds ?? constructionDurationSeconds(snapshot, option.duration)
  const remainingWorkSeconds = active?.remainingWorkSeconds ?? totalWorkSeconds
  const category = constructionCategoryFor(option)
  return {
    ...summary,
    category,
    categoryLabel: constructionCategoryLabel(category),
    assignedWorkers,
    requiredWorkers: constructionRequiredWorkers(option),
    progressPercent: summary.complete
      ? 100
      : summary.inProgress && totalWorkSeconds > 0
        ? Math.max(0, Math.min(100, ((totalWorkSeconds - remainingWorkSeconds) / totalWorkSeconds) * 100))
        : 0,
    estimatedCompletionSeconds:
      summary.complete
        ? 0
        : workerThroughputPerSecond > 0
          ? remainingWorkSeconds / workerThroughputPerSecond
          : null,
    missingResource: constructionMissingResourceCopy(snapshot, option),
    resultPreview: constructionResultPreview(snapshot, option),
    futureEconomyChange: constructionFutureEconomyChange(snapshot, option),
    basslineRisk: constructionBasslineRisk(snapshot, option, active),
  }
}

function constructionAssignedWorkers(snapshot: SimulationSnapshot): number {
  return roleCrew(snapshot, ROLE_CONSTRUCTION) +
    (snapshot.roster.heroAssigned && snapshot.roster.heroRoleId === ROLE_CONSTRUCTION ? 1 : 0)
}

function constructionWorkerThroughput(snapshot: SimulationSnapshot): number {
  const crewThroughput = roleCrew(snapshot, ROLE_CONSTRUCTION) * snapshot.base.crewEfficiencyMultiplier
  const heroThroughput =
    snapshot.roster.heroAssigned && snapshot.roster.heroRoleId === ROLE_CONSTRUCTION
      ? snapshot.base.crewEfficiencyMultiplier * snapshot.heroSurvival.workEfficiencyMultiplier
      : 0
  return crewThroughput + heroThroughput
}

function constructionDurationSeconds(
  snapshot: SimulationSnapshot,
  duration: DurationDef,
): number {
  const baseDuration =
    duration.kind === "fixed"
      ? duration.seconds ?? 0
      : (duration.base_seconds ?? 0) +
        constructionCrystalTrackLevel(snapshot, duration.track) * (duration.per_level_seconds ?? 0)
  const toolingMultiplier = Math.max(
    0.2,
    Math.min(1, 1 - snapshot.processing.workshopToolingLevel * BALANCE.build.workshopToolingSpeedBonusPerLevel),
  )
  return baseDuration * toolingMultiplier
}

function constructionCrystalTrackLevel(
  snapshot: SimulationSnapshot,
  track: DurationDef["track"] | undefined,
): number {
  switch (track) {
    case "slot_capacity":
      return snapshot.crystalCircle.slotCapacityLevel
    case "output":
      return snapshot.crystalCircle.outputLevel
    case "storage":
      return snapshot.crystalCircle.storageLevel
    case "field_polish":
      return snapshot.crystalCircle.fieldPolishLevel
    default:
      return 0
  }
}

function constructionCategoryFor(option: ConstructionOptionDef): AddBaseConstructionCategory {
  if ([PROJECT_RESTORE_STUDIO, "construction.removing_moss"].includes(option.id)) return "repair"
  if (option.id === "project.expand_bunks") return "housing"
  if (
    [
      PROJECT_BUILD_FIRE_PIT,
      "project.build_resonance_chamber",
      "project.build_mix_console",
      "project.build_workshop",
      "project.build_research_booth",
    ].includes(option.id)
  ) {
    return "station"
  }
  if (option.group === "crystal_upgrade" && option.id !== "construction.storage") return "crystal"
  return "support"
}

function constructionCategoryLabel(category: AddBaseConstructionCategory): string {
  switch (category) {
    case "repair":
      return "Repair"
    case "crystal":
      return "Crystal"
    case "station":
      return "Station"
    case "housing":
      return "Housing"
    case "support":
      return "Support"
  }
}

function constructionCategoryOrder(): readonly {
  readonly id: AddBaseConstructionCategory
  readonly label: string
}[] {
  return [
    { id: "repair", label: "Repair" },
    { id: "crystal", label: "Crystal" },
    { id: "station", label: "Station" },
    { id: "housing", label: "Housing" },
    { id: "support", label: "Support" },
  ]
}

function constructionRequiredWorkers(option: ConstructionOptionDef): number {
  if (option.cost.kind === "drain_per_worker_second") return 1
  if (option.group === "base_project") return 1
  return 1
}

function constructionMissingResourceCopy(
  snapshot: SimulationSnapshot,
  option: ConstructionOptionDef,
): string | null {
  if (option.cost.kind === "drain_per_worker_second") {
    return resourceValue(snapshot, option.cost.resource_id ?? "") <= 0
      ? `${resourceName(option.cost.resource_id ?? "")} is empty; builders will pause.`
      : null
  }
  const missing = missingCostItems(snapshot, option.cost)[0]
  return missing
    ? `Missing ${formatAmount(missing.missingAmount)} ${resourceName(missing.resourceId)}.`
    : null
}

function constructionBasslineRisk(
  snapshot: SimulationSnapshot,
  option: ConstructionOptionDef,
  active: SimulationSnapshot["activeConstruction"],
): AddBaseConstructionProjectCard["basslineRisk"] {
  const drainsBassline =
    option.cost.kind === "drain_per_worker_second" && option.cost.resource_id === RESOURCE_BASSLINE
  const upfrontBassline =
    option.cost.kind === "upfront" && option.cost.resource_id === RESOURCE_BASSLINE
  if (!drainsBassline && !upfrontBassline) {
    return {
      severity: "none",
      copy: "Does not spend Bassline directly.",
    }
  }
  const remainingCost = active
    ? Math.max(0, active.totalCost - active.spentCost)
    : constructionDurationSeconds(snapshot, option.duration) * (option.cost.amount ?? 0)
  if (snapshot.resources.bassline <= 0) {
    return {
      severity: "high",
      copy: "Bassline is empty; construction will pause and bubble pressure may rise.",
    }
  }
  if (snapshot.resources.bassline < remainingCost) {
    return {
      severity: "watch",
      copy: `May spend ${formatAmount(remainingCost)} Bassline before finishing.`,
    }
  }
  return {
    severity: "watch",
    copy: `Spends stored Bassline while builders work; current stock can cover this estimate.`,
  }
}

function constructionResultPreview(
  snapshot: SimulationSnapshot,
  option: ConstructionOptionDef,
): string {
  if (option.id === PROJECT_RESTORE_STUDIO) return "Unlocks Chorus, Studio recovery, and 15 bunks."
  if (option.id === PROJECT_BUILD_FIRE_PIT) return "Unlocks Vibes, morale, and recruitment support."
  if (option.id === "project.build_resonance_chamber") return "Unlocks Harmonics and field-efficiency processing."
  if (option.id === "project.build_mix_console") return "Unlocks brownout tolerance and signal balancing."
  if (option.id === "project.build_workshop") return "Unlocks builder tools and safer water improvements."
  if (option.id === "project.build_research_booth") return "Unlocks Chorus routing and Harmonic study."
  const effect = option.effects[0]
  if (!effect) return "No visible economy effect is described yet."
  return effectPreview(snapshot, effect)
}

function constructionFutureEconomyChange(
  snapshot: SimulationSnapshot,
  option: ConstructionOptionDef,
): string {
  const category = constructionCategoryFor(option)
  switch (category) {
    case "repair":
      return "Repairs open new base systems and remove early blockers."
    case "crystal":
      return "Crystal work changes signal income, capacity, or bubble efficiency."
    case "station":
      return "Station builds unlock new powered modules and recipe lanes."
    case "housing":
      return `Housing raises crew capacity; current free bunks: ${snapshot.base.freeBunks}.`
    case "support":
      return "Support work improves storage, water, field reach, or future construction speed."
  }
}

function effectPreview(snapshot: SimulationSnapshot, effect: EffectDef): string {
  switch (effect.kind) {
    case "add_bunks":
      return `Adds ${effect.amount ?? 0} bunks for recruitment and overcrowding relief.`
    case "add_skins":
      return `Adds ${effect.amount ?? 0} Skin for cosmetic or repair-side costs.`
    case "set_flag":
      return flagEffectPreview(effect.flag_id ?? "")
    case "increment_crystal_track":
      return crystalTrackEffectPreview(snapshot, effect.track, effect.amount ?? 1)
    case "increment_processing_track":
      return processingTrackEffectPreview(snapshot, effect.track, effect.amount ?? 1)
  }
}

function flagEffectPreview(flagId: string): string {
  switch (flagId) {
    case "base.studio_restored":
      return "Restores the Studio and unlocks the Chorus/base layer."
    case "base.fire_pit_built":
      return "Builds the Fire Pit and unlocks Vibes production."
    case "base.resonance_chamber_built":
      return "Builds the Resonance Chamber and unlocks Harmonics work."
    case "base.mix_console_built":
      return "Builds the Mix Console and unlocks signal balancing."
    case "base.workshop_built":
      return "Builds the Workshop and unlocks construction/water upgrades."
    case "base.research_booth_built":
      return "Builds the Research Booth and unlocks advanced routing."
    case "crystal.removing_moss_completed":
      return "Clears the Crystal base and improves passive Bassline."
    default:
      return "Unlocks a future base condition."
  }
}

function crystalTrackEffectPreview(
  snapshot: SimulationSnapshot,
  track: EffectDef["track"] | undefined,
  amount: number,
): string {
  switch (track) {
    case "slot_capacity":
      return `Adds ${amount} Crystal slot; current level ${snapshot.crystalCircle.slotCapacityLevel}.`
    case "output":
      return `Raises band output; current output level ${snapshot.crystalCircle.outputLevel}.`
    case "storage":
      return `Raises band storage caps; current storage level ${snapshot.crystalCircle.storageLevel}.`
    case "field_polish":
      return `Improves Bassline-to-bubble efficiency; current polish level ${snapshot.crystalCircle.fieldPolishLevel}.`
    default:
      return "Improves the Crystal Circle."
  }
}

function processingTrackEffectPreview(
  snapshot: SimulationSnapshot,
  track: EffectDef["track"] | undefined,
  amount: number,
): string {
  switch (track) {
    case "workshop_tooling":
      return `Speeds future construction; current tooling level ${snapshot.processing.workshopToolingLevel}.`
    case "workshop_water_condensers":
      return `Improves Water cap and regeneration; current condenser level ${snapshot.processing.workshopWaterCondensersLevel}.`
    case "research_chorus_routing":
      return `Improves Chorus routing and life-support headroom; current routing level ${snapshot.processing.researchChorusRoutingLevel}.`
    case "research_harmonic_study":
      return `Improves Harmonics thresholds; current study level ${snapshot.processing.researchHarmonicStudyLevel}.`
    case "resonance_calibration":
      return `Improves field efficiency; current calibration level ${snapshot.processing.resonanceCalibrationLevel}.`
    case "mix_calibration":
      return `Improves signal balance and brownout tolerance; current mix level ${snapshot.processing.mixCalibrationLevel}.`
    default:
      return `Improves station processing by ${amount}.`
  }
}

function formatSeconds(seconds: number | null): string {
  if (seconds === null) return "stalled"
  if (seconds <= 0) return "complete"
  if (seconds < 60) return `${Math.ceil(seconds)}s`
  return `${Math.ceil(seconds / 60)}m`
}

function selectBaseStationMachineProjection(
  snapshot: SimulationSnapshot,
  stations: readonly AddBaseStationManagementSummary[],
  processing: readonly AddBaseProcessingManagementSummary[],
  construction: readonly AddConstructionSummary[],
): AddBaseStationMachineProjection {
  const cards = [
    syntheticStudioStationCard(snapshot, construction),
    ...stations.map((station) =>
      stationMachineCard(snapshot, station, processing, construction),
    ),
  ]
  const groups = stationMachineGroupOrder().map((group) => ({
    id: group.id,
    label: group.label,
    cards: cards.filter((card) => card.group === group.id),
  })).filter((group) => group.cards.length > 0)
  const poweredCount = cards.filter((card) => card.powered).length
  const brownedOutCount = cards.filter((card) => card.brownedOut).length
  const activeJobCount = cards.filter((card) => card.currentJob !== null).length
  return {
    groups,
    cards,
    poweredCount,
    brownedOutCount,
    activeJobCount,
    requestedUpkeepPerSecond: snapshot.power.requestedUpkeepPerSecond,
    activeUpkeepPerSecond: snapshot.power.activeUpkeepPerSecond,
    summary:
      brownedOutCount > 0
        ? `${brownedOutCount} station ${brownedOutCount === 1 ? "is" : "are"} browned out.`
        : `${poweredCount} station ${poweredCount === 1 ? "is" : "are"} powered; ${activeJobCount} job ${activeJobCount === 1 ? "is" : "are"} running.`,
  }
}

function stationMachineCard(
  snapshot: SimulationSnapshot,
  station: AddBaseStationManagementSummary,
  processing: readonly AddBaseProcessingManagementSummary[],
  construction: readonly AddConstructionSummary[],
): AddBaseStationMachineCard {
  const stationProcessing = processing.filter((recipe) => recipe.stationId === station.id)
  const stationConstruction = construction.filter((option) =>
    constructionStationId(option.id) === station.id || stationUpgradeOwner(option.id) === station.id,
  )
  const activeRecipe = stationProcessing.find((recipe) => recipe.inProgress)
  const activeConstruction = stationConstruction.find((option) => option.inProgress)
  const currentJob = activeRecipe
    ? {
        id: activeRecipe.id,
        label: activeRecipe.label,
        remainingSeconds: activeRecipe.remainingSeconds ?? 0,
      }
    : activeConstruction
      ? {
          id: activeConstruction.id,
          label: activeConstruction.label,
          remainingSeconds: activeConstruction.remainingSeconds ?? 0,
        }
      : null
  const brownedOut = station.available && station.requestedEnabled && !station.powered
  return {
    id: station.id,
    label: station.label,
    group: stationGroupFor(station.id, station.category),
    status: stationStatus(station, brownedOut),
    built: station.available,
    locked: !station.available,
    powered: station.powered,
    brownedOut,
    requestedEnabled: station.requestedEnabled,
    manualPower: station.manualPower,
    chorusUpkeepPerSecond: station.upkeepPerSecond,
    brownoutPriority: station.brownoutPriority,
    currentJob,
    availableRecipes: [
      ...stationConstruction.map(constructionMachineRecipe),
      ...stationProcessing.map(processingMachineRecipe),
    ],
    outputEffect: stationOutputEffect(snapshot, station.id),
    blockedReason:
      station.blockedReason ??
      (brownedOut ? `${station.label} is requested but Chorus cannot power it.` : null),
    brownoutPriorityCopy: brownoutPriorityCopy(station),
    canTogglePower: station.manualPower && station.available,
  }
}

function syntheticStudioStationCard(
  snapshot: SimulationSnapshot,
  construction: readonly AddConstructionSummary[],
): AddBaseStationMachineCard {
  const studioConstruction = construction.filter((option) =>
    [
      PROJECT_RESTORE_STUDIO,
      PROJECT_BUILD_FIRE_PIT,
      "project.build_resonance_chamber",
      "project.build_mix_console",
      "project.build_workshop",
      "project.build_research_booth",
    ].includes(option.id),
  )
  const activeConstruction = studioConstruction.find((option) => option.inProgress)
  return {
    id: "station.studio",
    label: "Studio",
    group: "studio",
    status: snapshot.base.studioRestored ? "built" : "locked",
    built: snapshot.base.studioRestored,
    locked: !snapshot.base.studioRestored,
    powered: true,
    brownedOut: false,
    requestedEnabled: true,
    manualPower: false,
    chorusUpkeepPerSecond: 0,
    brownoutPriority: null,
    currentJob: activeConstruction
      ? {
          id: activeConstruction.id,
          label: activeConstruction.label,
          remainingSeconds: activeConstruction.remainingSeconds ?? 0,
        }
      : null,
    availableRecipes: studioConstruction.map(constructionMachineRecipe),
    outputEffect: snapshot.base.studioRestored
      ? `Chorus unlocked, ${snapshot.base.bunksCapacity} bunks, recovery at Studio.`
      : "Restore the Studio to unlock Chorus, housing, and recovery.",
    blockedReason: snapshot.base.studioRestored
      ? null
      : "Studio restoration is the first base-machine bottleneck.",
    brownoutPriorityCopy: "Core shelter stays available; it is not in the Chorus brownout queue.",
    canTogglePower: false,
  }
}

function constructionMachineRecipe(
  option: AddConstructionSummary,
): AddBaseStationMachineRecipe {
  return {
    id: option.id,
    label: option.label,
    level: option.complete ? 1 : 0,
    maxLevel: 1,
    enabled: option.enabled,
    inProgress: option.inProgress,
    blockedReason: option.blockedReason,
    costLabel: option.costLabel,
  }
}

function processingMachineRecipe(
  recipe: AddBaseProcessingManagementSummary,
): AddBaseStationMachineRecipe {
  return {
    id: recipe.id,
    label: recipe.label,
    level: recipe.level,
    maxLevel: recipe.maxLevel,
    enabled: recipe.enabled,
    inProgress: recipe.inProgress,
    blockedReason: recipe.blockedReason,
    costLabel: recipe.costLabel,
  }
}

function stationStatus(
  station: AddBaseStationManagementSummary,
  brownedOut: boolean,
): AddBaseStationMachineStatus {
  if (!station.available) return "locked"
  if (brownedOut) return "browned_out"
  if (station.powered) return "powered"
  if (!station.requestedEnabled) return "off"
  return "built"
}

function stationGroupFor(
  stationId: string,
  category: StationDef["category"],
): AddBaseStationMachineCard["group"] {
  switch (stationId) {
    case "station.crystal_circle":
      return "crystal"
    case "station.fire_pit":
      return "social"
    case "station.resonance_chamber":
      return "field"
    case "station.mix_console":
      return "tuning"
    case "station.workshop":
      return "workshop"
    case "station.research_booth":
      return "research"
    default:
      return category === "social" ? "social" : "studio"
  }
}

function stationMachineGroupOrder(): readonly {
  readonly id: AddBaseStationMachineCard["group"]
  readonly label: string
}[] {
  return [
    { id: "crystal", label: "Crystal Circle" },
    { id: "studio", label: "Studio" },
    { id: "social", label: "Fire Pit" },
    { id: "field", label: "Resonance Chamber" },
    { id: "tuning", label: "Mix Console" },
    { id: "workshop", label: "Workshop" },
    { id: "research", label: "Research Booth" },
  ]
}

function constructionStationId(constructionId: string): string | null {
  switch (constructionId) {
    case PROJECT_BUILD_FIRE_PIT:
      return "station.fire_pit"
    case "project.build_resonance_chamber":
      return "station.resonance_chamber"
    case "project.build_mix_console":
      return "station.mix_console"
    case "project.build_workshop":
      return "station.workshop"
    case "project.build_research_booth":
      return "station.research_booth"
    default:
      return null
  }
}

function stationUpgradeOwner(constructionId: string): string | null {
  return constructionId.startsWith("construction.") ? "station.crystal_circle" : null
}

function stationOutputEffect(snapshot: SimulationSnapshot, stationId: string): string {
  switch (stationId) {
    case "station.crystal_circle":
      return `Band production: ${formatSignedRate(snapshot.power.basslineGenerationPerSecond)} Bassline, ${formatSignedRate(snapshot.power.chorusGenerationPerSecond)} Chorus, ${formatSignedRate(snapshot.power.harmonicsGenerationPerSecond)} Harmonics.`
    case "station.fire_pit":
      return snapshot.base.firePitBuilt
        ? `Vibes, morale, recruitment; ${snapshot.base.freeBunks} bunks free.`
        : "Build Fire Pit to unlock Vibes, morale, and recruitment support."
    case "station.resonance_chamber":
      return `Field efficiency +${formatAmount(snapshot.processing.resonanceCalibrationLevel * BALANCE.power.resonanceProcessingFieldBonusPerLevel)} from calibration.`
    case "station.mix_console":
      return `Harmonics processing and brownout tolerance level ${snapshot.processing.mixCalibrationLevel}.`
    case "station.workshop":
      return `Construction tooling level ${snapshot.processing.workshopToolingLevel}; water condenser level ${snapshot.processing.workshopWaterCondensersLevel}.`
    case "station.research_booth":
      return `Chorus routing level ${snapshot.processing.researchChorusRoutingLevel}; harmonic study level ${snapshot.processing.researchHarmonicStudyLevel}.`
    default:
      return "Station output is not yet described."
  }
}

function brownoutPriorityCopy(station: AddBaseStationManagementSummary): string {
  if (!station.manualPower) return "Always-on station; no brownout priority."
  if (!station.requestedEnabled) return "Not requested, so it is outside the brownout queue."
  if (station.brownoutPriority === null) return "Requested; runtime priority will appear when power queue is active."
  return `Brownout priority ${station.brownoutPriority}; later requested stations brown out first.`
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
  readonly expeditions: AddBaseExpeditionProjection
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
      id: "expeditions",
      label: "Expeditions",
      headline: input.expeditions.summary,
      detail:
        input.expeditions.recommendedTargetId
          ? "Send free crew on a long-duration job while the Hero explores manually."
          : "Expeditions need free crew and enough bubble support.",
      primaryActionId: input.expeditions.recommendedTargetId,
      blockedReason:
        input.expeditions.recommendedTargetId === null
          ? input.expeditions.targets.find((target) => target.disabledReason)?.disabledReason ?? null
          : null,
      metrics: [
        {
          id: "expedition-free-crew",
          label: "Free crew",
          value: `${input.expeditions.availableCrew}`,
          detail: `${input.expeditions.assignedCrew} already away`,
          severity: input.expeditions.availableCrew > 0 ? "good" : "warning",
        },
        {
          id: "expedition-reports",
          label: "Reports",
          value: `${input.expeditions.completedReportCount}`,
          detail: `${input.expeditions.totalClues} clues, ${input.expeditions.totalDungeonLeads} leads`,
          severity: input.expeditions.completedReportCount > 0 ? "good" : "neutral",
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
  expeditions: AddBaseExpeditionProjection,
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
  const expedition = expeditions.targets.find((target) => target.id === expeditions.recommendedTargetId)
  if (expedition) {
    return {
      id: `expedition:${expedition.id}`,
      label: `Send ${expedition.label}`,
      detail: `${expedition.durationLabel}, ${expedition.requiredCrew} crew, ${expedition.riskLabel}`,
      kind: "start_expedition",
      targetId: expedition.id,
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
          ?.filter((item) => costItemResourceId(item).startsWith("resource."))
          .map((item) => ({
            resourceId: costItemResourceId(item),
            requiredAmount: item.amount,
            missingAmount: Math.max(0, item.amount - resourceValue(snapshot, costItemResourceId(item))),
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

function selectBaseExpeditionProjection(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): AddBaseExpeditionProjection {
  const targetById = new Map(catalog.expeditionTargets.map((target) => [target.id, target]))
  const assignedCrew = snapshot.expeditions.activeJobs.reduce(
    (total, job) => total + job.assignedCrew,
    0,
  )
  const availableCrew = availableExpeditionCrew(snapshot)
  const targets = catalog.expeditionTargets
    .slice()
    .sort((left, right) => left.uiOrder - right.uiOrder)
    .map((target) => expeditionTargetProjection(snapshot, target, availableCrew))
  const activeJobs = snapshot.expeditions.activeJobs
    .slice()
    .sort((left, right) => left.remainingSeconds - right.remainingSeconds)
    .map((job) => {
      const target = targetById.get(job.targetId)
      const totalSeconds = Math.max(1, job.durationSeconds)
      const remainingSeconds = Math.max(0, job.remainingSeconds)
      return {
        id: job.id,
        targetId: job.targetId,
        label: target?.label ?? job.targetId,
        assignedCrew: job.assignedCrew,
        durationSeconds: job.durationSeconds,
        remainingSeconds,
        progressPercent: Math.max(0, Math.min(100, ((totalSeconds - remainingSeconds) / totalSeconds) * 100)),
        risk: job.risk,
        riskLabel: riskLabel(job.risk),
        returnCopy:
          remainingSeconds <= 0
            ? "Returning now"
            : `Returns in ${formatDuration(remainingSeconds)}.`,
      }
    })
  const reports = snapshot.expeditions.completedReports
    .slice()
    .reverse()
    .map((report) => {
      const target = targetById.get(report.targetId)
      return {
        id: report.id,
        targetId: report.targetId,
        label: target?.label ?? report.targetId,
        assignedCrew: report.assignedCrew,
        durationSeconds: report.durationSeconds,
        risk: report.risk,
        rewardCopy: expeditionRewardCopy({
          stone: report.stoneGained,
          water: report.waterGained,
          vibes: report.vibesGained,
          wounds: report.wounds,
          clues: report.clues,
          dungeonLeads: report.dungeonLeads,
        }),
        woundCopy:
          report.wounds > 0
            ? `${report.wounds} wound ${report.wounds === 1 ? "reported" : "reported"}`
            : "No wounds reported",
        clueCopy:
          report.clues > 0 || report.dungeonLeads > 0
            ? `${report.clues} clue(s), ${report.dungeonLeads} dungeon lead(s)`
            : "No new leads",
      }
    })
  const recommendedTargetId = targets.find((target) => target.enabled)?.id ?? null
  return {
    summary:
      activeJobs.length > 0
        ? `${activeJobs.length} expedition ${activeJobs.length === 1 ? "is" : "are"} in the field.`
        : recommendedTargetId
          ? "Free crew can take a parallel field job."
          : "No expedition is ready right now.",
    availableCrew,
    assignedCrew,
    activeCount: activeJobs.length,
    completedReportCount: reports.length,
    totalWounds: snapshot.expeditions.totalWounds,
    totalClues: snapshot.expeditions.totalClues,
    totalDungeonLeads: snapshot.expeditions.totalDungeonLeads,
    targets,
    activeJobs,
    reports,
    recommendedTargetId,
  }
}

function expeditionTargetProjection(
  snapshot: SimulationSnapshot,
  target: ExpeditionTargetDef,
  availableCrew: number,
): AddBaseExpeditionTarget {
  const disabledReason = expeditionTargetBlocker(snapshot, target, availableCrew)
  return {
    id: target.id,
    label: target.label,
    durationSeconds: target.durationSeconds,
    durationLabel: formatDuration(target.durationSeconds),
    requiredCrew: target.requiredCrew,
    requiredBubbleReach: target.requiredBubbleReach,
    risk: target.risk,
    riskLabel: riskLabel(target.risk),
    requiredSupportCopy: expeditionSupportCopy(target),
    expectedLootCopy: expeditionRewardCopy(target.expectedLoot),
    playerHint: target.playerHint,
    enabled: disabledReason === null,
    disabledReason,
  }
}

function expeditionTargetBlocker(
  snapshot: SimulationSnapshot,
  target: ExpeditionTargetDef,
  availableCrew: number,
): string | null {
  if (target.support.requiresStudioRestored && !snapshot.base.studioRestored) {
    return "Restore the Studio first."
  }
  if (target.support.requiresFirePit && !snapshot.base.firePitBuilt) {
    return "Build the Fire Pit for field support."
  }
  if (snapshot.bubble.reachFromBase < target.requiredBubbleReach) {
    return `Needs bubble reach ${target.requiredBubbleReach}; current reach is ${snapshot.bubble.reachFromBase}.`
  }
  if (availableCrew < target.requiredCrew) {
    return `Needs ${target.requiredCrew} free crew; ${availableCrew} available.`
  }
  return null
}

function availableExpeditionCrew(snapshot: SimulationSnapshot): number {
  const roleCrewTotal = Object.values(snapshot.roster.crewByRole).reduce(
    (total, crew) => total + crew,
    0,
  )
  const expeditionCrewTotal = snapshot.expeditions.activeJobs.reduce(
    (total, job) => total + job.assignedCrew,
    0,
  )
  return Math.max(0, snapshot.roster.totalCrew - roleCrewTotal - expeditionCrewTotal)
}

function expeditionSupportCopy(target: ExpeditionTargetDef): string {
  const requirements = [
    target.requiredBubbleReach > 0 ? `Reach ${target.requiredBubbleReach}` : "Local route",
    target.support.requiresStudioRestored ? "Restored Studio" : null,
    target.support.requiresFirePit ? "Fire Pit support" : null,
  ].filter((item): item is string => item !== null)
  return requirements.join(" · ")
}

function expeditionRewardCopy(reward: {
  readonly stone: number
  readonly water: number
  readonly vibes: number
  readonly wounds: number
  readonly clues: number
  readonly dungeonLeads: number
}): string {
  const parts = [
    reward.stone > 0 ? `${formatAmount(reward.stone)} Stone` : null,
    reward.water > 0 ? `${formatAmount(reward.water)} Water` : null,
    reward.vibes > 0 ? `${formatAmount(reward.vibes)} Vibes` : null,
    reward.clues > 0 ? `${reward.clues} clue(s)` : null,
    reward.dungeonLeads > 0 ? `${reward.dungeonLeads} dungeon lead(s)` : null,
    reward.wounds > 0 ? `${reward.wounds} wound risk` : null,
  ].filter((item): item is string => item !== null)
  return parts.length > 0 ? parts.join(" · ") : "Scout report only"
}

function riskLabel(risk: ExpeditionRisk): string {
  switch (risk) {
    case "low":
      return "Low risk"
    case "medium":
      return "Medium risk"
    case "high":
      return "High risk"
  }
}

function selectBaseSocialPressureProjection(
  snapshot: SimulationSnapshot,
): AddBaseSocialPressureProjection {
  const vibesGain = vibesGainPerSecond(snapshot)
  const vibesLoss = snapshot.base.effectiveBadVibesRate
  const vibesNet = vibesGain - vibesLoss
  const missingVibes = Math.max(0, snapshot.recruitment.nextRecruitCost - snapshot.resources.vibes)
  const timeToNextRecruitSeconds =
    missingVibes <= 0 ? 0 : vibesNet > 0 ? missingVibes / vibesNet : null
  const pendingArrivals = snapshot.recruitment.pendingRecruits
    .slice()
    .sort((left, right) => left.remainingSeconds - right.remainingSeconds)
    .map((recruit, index) => pendingRecruitProjection(recruit, index))
  const supportForecast = recruitSupportForecast(snapshot)
  const status = socialPressureStatus(snapshot, supportForecast)
  return {
    status,
    headline: socialPressureHeadline(status),
    detail: socialPressureDetail(snapshot, supportForecast, timeToNextRecruitSeconds),
    vibes: {
      value: snapshot.resources.vibes,
      cap: snapshot.resources.vibesCap,
      gainPerSecond: vibesGain,
      lossPerSecond: vibesLoss,
      netPerSecond: vibesNet,
      explanation: vibesGainExplanation(snapshot, vibesGain),
      lossExplanation: vibesLossExplanation(snapshot, vibesLoss),
      timeToNextRecruitSeconds,
    },
    housing: {
      capacity: snapshot.base.bunksCapacity,
      occupied: snapshot.base.occupantCount,
      free: snapshot.base.freeBunks,
      missing: snapshot.base.missingBunks,
      pressure: housingPressure(snapshot),
      overcrowdedSeconds: snapshot.base.overcrowdedSeconds,
      warning: housingWarning(snapshot, supportForecast),
    },
    recruitment: {
      enabled: snapshot.objectives.recruitmentEnabled,
      pendingCount: pendingArrivals.length,
      nextCost: snapshot.recruitment.nextRecruitCost,
      canAfford: snapshot.resources.vibes >= snapshot.recruitment.nextRecruitCost,
      canRecruitNow: supportForecast.canSupport &&
        snapshot.objectives.recruitmentEnabled &&
        pendingArrivals.length === 0 &&
        snapshot.resources.vibes >= snapshot.recruitment.nextRecruitCost,
      blocker: recruitmentBlocker(snapshot, supportForecast),
      costProjection: recruitmentCostProjection(snapshot, timeToNextRecruitSeconds),
    },
    pendingArrivals,
    supportForecast,
  }
}

function pendingRecruitProjection(
  recruit: SimulationSnapshot["recruitment"]["pendingRecruits"][number],
  index: number,
): AddBaseSocialPendingRecruit {
  const totalSeconds = Math.max(1, recruit.totalSeconds)
  const remainingSeconds = Math.max(0, recruit.remainingSeconds)
  const progressPercent = Math.max(0, Math.min(100, ((totalSeconds - remainingSeconds) / totalSeconds) * 100))
  return {
    id: `pending_recruit_${index + 1}`,
    label: `Recruit ${index + 1}`,
    remainingSeconds,
    totalSeconds,
    progressPercent,
    arrivalCopy:
      remainingSeconds <= 0
        ? "Arriving now"
        : `Arrives in ${formatDuration(remainingSeconds)}.`,
  }
}

function recruitSupportForecast(
  snapshot: SimulationSnapshot,
): AddBaseSocialPressureProjection["supportForecast"] {
  const bunksAfterArrival = snapshot.base.freeBunks - 1
  const missingBunksAfterArrival = Math.max(0, -bunksAfterArrival)
  const vibesAfterCommit = snapshot.resources.vibes - snapshot.recruitment.nextRecruitCost
  if (!snapshot.objectives.recruitmentEnabled) {
    return {
      canSupport: false,
      status: "locked",
      bunksAfterArrival,
      missingBunksAfterArrival,
      vibesAfterCommit,
      copy: "Recruitment is still locked; first connect the Survivor Cave to the bubble.",
      warning: "No recruit can be committed until the cave gate is open.",
    }
  }
  if (snapshot.recruitment.pendingRecruits.length > 0) {
    return {
      canSupport: false,
      status: "pending",
      bunksAfterArrival,
      missingBunksAfterArrival,
      vibesAfterCommit,
      copy: "A recruit is already traveling; let them arrive before committing another.",
      warning: "Recruitment is intentionally paced one arrival at a time.",
    }
  }
  if (snapshot.resources.vibes < snapshot.recruitment.nextRecruitCost) {
    return {
      canSupport: false,
      status: "unaffordable",
      bunksAfterArrival,
      missingBunksAfterArrival,
      vibesAfterCommit,
      copy: `Need ${formatAmount(snapshot.recruitment.nextRecruitCost)} Vibes before recruiting.`,
      warning: "Fire Pit output or Vibes storage is the current blocker.",
    }
  }
  if (snapshot.base.missingBunks > 0 || missingBunksAfterArrival > 0) {
    return {
      canSupport: false,
      status: "overcrowded",
      bunksAfterArrival,
      missingBunksAfterArrival,
      vibesAfterCommit,
      copy: `This recruit would leave ${missingBunksAfterArrival || snapshot.base.missingBunks} missing bunk(s).`,
      warning: "Build bunks before adding more people or Bad Vibes pressure will grow.",
    }
  }
  if (bunksAfterArrival === 0) {
    return {
      canSupport: true,
      status: "tight",
      bunksAfterArrival,
      missingBunksAfterArrival,
      vibesAfterCommit,
      copy: "The base can support this recruit, but bunks will be full afterward.",
      warning: "Plan housing before the next recruitment.",
    }
  }
  return {
    canSupport: true,
    status: "supported",
    bunksAfterArrival,
    missingBunksAfterArrival,
    vibesAfterCommit,
    copy: `The base can support this recruit and keep ${bunksAfterArrival} bunk(s) free.`,
    warning: null,
  }
}

function socialPressureStatus(
  snapshot: SimulationSnapshot,
  supportForecast: AddBaseSocialPressureProjection["supportForecast"],
): AddBaseSocialPressureStatus {
  if (!snapshot.objectives.recruitmentEnabled) return "locked"
  if (snapshot.base.missingBunks > 0) return "overcrowded"
  if (snapshot.recruitment.pendingRecruits.length > 0) return "pending_arrival"
  if (snapshot.resources.vibes < snapshot.recruitment.nextRecruitCost) return "waiting_vibes"
  if (supportForecast.status === "tight") return "housing_tight"
  return "ready"
}

function socialPressureHeadline(status: AddBaseSocialPressureStatus): string {
  switch (status) {
    case "locked":
      return "Recruitment loop locked"
    case "ready":
      return "Recruitment ready"
    case "waiting_vibes":
      return "Vibes are building"
    case "pending_arrival":
      return "Recruit traveling"
    case "housing_tight":
      return "Recruitment is possible but tight"
    case "overcrowded":
      return "Overcrowding pressure"
  }
}

function socialPressureDetail(
  snapshot: SimulationSnapshot,
  supportForecast: AddBaseSocialPressureProjection["supportForecast"],
  timeToNextRecruitSeconds: number | null,
): string {
  if (snapshot.recruitment.pendingRecruits.length > 0) {
    const next = snapshot.recruitment.pendingRecruits
      .slice()
      .sort((left, right) => left.remainingSeconds - right.remainingSeconds)[0]
    return next ? `Next recruit arrives in ${formatDuration(next.remainingSeconds)}.` : supportForecast.copy
  }
  if (timeToNextRecruitSeconds === null) return supportForecast.copy
  if (timeToNextRecruitSeconds > 0) {
    return `${supportForecast.copy} At current Vibes flow, recruitment is ${formatDuration(timeToNextRecruitSeconds)} away.`
  }
  return supportForecast.copy
}

function vibesGainExplanation(snapshot: SimulationSnapshot, vibesGain: number): string {
  if (!snapshot.base.firePitBuilt) return "Build the Fire Pit to start producing Vibes."
  const firePitWorkers = effectiveRoleWorkers(snapshot, ROLE_FIRE_PIT)
  return firePitWorkers > 0
    ? `Fire Pit produces ${formatRate(vibesGain)} with ${formatAmount(firePitWorkers)} effective worker(s).`
    : `Fire Pit produces ${formatRate(vibesGain)} passively; assign Fire Pit crew to increase it.`
}

function vibesLossExplanation(snapshot: SimulationSnapshot, vibesLoss: number): string {
  if (vibesLoss <= 0) return "No Bad Vibes loss is active."
  return `${formatRate(vibesLoss)} Bad Vibes from ${snapshot.base.missingBunks} missing bunk(s); multiplier ${formatAmount(snapshot.base.badVibesMultiplier)}.`
}

function housingPressure(snapshot: SimulationSnapshot): AddBaseSocialPressureProjection["housing"]["pressure"] {
  if (snapshot.base.missingBunks > 0) return "overcrowded"
  if (snapshot.base.freeBunks <= 0) return "full"
  return "room"
}

function housingWarning(
  snapshot: SimulationSnapshot,
  supportForecast: AddBaseSocialPressureProjection["supportForecast"],
): string {
  if (snapshot.base.missingBunks > 0) {
    return `${snapshot.base.missingBunks} bunk(s) missing; Bad Vibes pressure is rising.`
  }
  if (snapshot.base.freeBunks <= 0) return "Bunks are full; recruitment will create overcrowding."
  if (supportForecast.status === "tight") return "One recruit fits, but housing will be full afterward."
  return `${snapshot.base.freeBunks} bunk(s) free for future recruitment.`
}

function recruitmentBlocker(
  snapshot: SimulationSnapshot,
  supportForecast: AddBaseSocialPressureProjection["supportForecast"],
): string | null {
  if (supportForecast.canSupport) return null
  return supportForecast.warning ?? supportForecast.copy
}

function recruitmentCostProjection(
  snapshot: SimulationSnapshot,
  timeToNextRecruitSeconds: number | null,
): string {
  if (snapshot.resources.vibes >= snapshot.recruitment.nextRecruitCost) {
    return `Recruit now for ${formatAmount(snapshot.recruitment.nextRecruitCost)} Vibes; ${formatAmount(snapshot.resources.vibes - snapshot.recruitment.nextRecruitCost)} Vibes remain.`
  }
  if (timeToNextRecruitSeconds === null) {
    return `${formatAmount(snapshot.recruitment.nextRecruitCost - snapshot.resources.vibes)} Vibes missing and current net Vibes is not positive.`
  }
  return `${formatAmount(snapshot.recruitment.nextRecruitCost - snapshot.resources.vibes)} Vibes missing; ready in ${formatDuration(timeToNextRecruitSeconds)} at current flow.`
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
      const missing = cost.costs?.find((item) => resourceValue(snapshot, costItemResourceId(item)) < item.amount)
      return missing ? `Need ${formatAmount(missing.amount)} ${resourceName(costItemResourceId(missing))}.` : null
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
          ?.map((item) => `${formatAmount(item.amount)} ${resourceName(costItemResourceId(item))}`)
          .join(", ") ?? "Bundled cost"
      )
    case "drain_per_worker_second":
      return `${formatAmount(cost.amount ?? 0)} ${resourceName(cost.resource_id ?? "")} / worker sec`
    case "time_only":
      return "Time only"
  }
}

function costItemResourceId(item: { readonly item_id?: string; readonly itemId?: string }): string {
  return item.item_id ?? item.itemId ?? ""
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
