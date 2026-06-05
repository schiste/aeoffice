export interface ResourceSnapshot {
  bassline: number
  basslineCap: number
  chorus: number
  chorusCap: number
  harmonics: number
  harmonicsCap: number
  stone: number
  stoneCap: number
  baseStoneStock: number
  water: number
  waterCap: number
  baseWaterStock: number
  vibes: number
  vibesCap: number
  lifetimeGenerated: number
  lifetimeSpent: number
}

export interface RosterSnapshot {
  heroAssigned: boolean
  heroRoleId: string
  totalCrew: number
  crewByRole: Record<string, number>
}

export interface HeroProgressSnapshot {
  drummerLevel: number
  drummerXp: number
  vocalistLevel: number
  vocalistXp: number
  synthLevel: number
  synthXp: number
}

export interface WoundTrackSnapshot {
  majorWoundsMax: number
  lightWoundsPerMajor: number
  woundUnitsTaken: number
}

export interface ForcedReturnSnapshot {
  phase: 'return_to_bubble_edge' | 'return_to_studio' | 'recover_at_studio'
  totalSeconds: number
  remainingSeconds: number
  viralLoadRatioOnTrigger: number
}

export interface HeroSurvivalSnapshot {
  sustain: number
  viralLoadRatio: number
  location: 'studio' | 'bubble' | 'outside_bubble'
  requiredTimeToReenterBubbleSeconds: number
  returnToStudioSeconds: number
  pointOfNoReturnRatio: number
  secondsUntilForcedReturn: number
  echoScars: number
  debuffTier: number
  workEfficiencyMultiplier: number
  movementSpeedMultiplier: number
  encounterRateMultiplier: number
  wounds: WoundTrackSnapshot
  forcedReturn: ForcedReturnSnapshot | null
}

export interface NarrativeSnapshot {
  activeBeatId: string | null
  completedBeatIds: string[]
  choiceByBeat: Record<string, string>
}

export interface CrystalCircleSnapshot {
  baseSlots: number
  slotCapacityLevel: number
  outputLevel: number
  storageLevel: number
  fieldPolishLevel: number
  removingMossUnlocked: boolean
  removingMossCompleted: boolean
}

export interface ProcessingJobSnapshot {
  recipeId: string
  stationId: string
  totalWorkSeconds: number
  remainingWorkSeconds: number
}

export interface ProcessingSnapshot {
  resonanceCalibrationLevel: number
  mixCalibrationLevel: number
  workshopToolingLevel: number
  workshopWaterCondensersLevel: number
  researchChorusRoutingLevel: number
  researchHarmonicStudyLevel: number
  activeJobs: Record<string, ProcessingJobSnapshot>
}

export interface BaseSnapshot {
  studioRestored: boolean
  studioRestoreUnlocked: boolean
  bunksCapacity: number
  occupantCount: number
  freeBunks: number
  missingBunks: number
  firePitBuilt: boolean
  resonanceChamberBuilt: boolean
  mixConsoleBuilt: boolean
  workshopBuilt: boolean
  researchBoothBuilt: boolean
  tutorialInvestigated: boolean
  tutorialExplored: boolean
  waterCollectionUnlocked: boolean
  skins: number
  overcrowdedSeconds: number
  badVibesMultiplier: number
  effectiveBadVibesRate: number
  crewEfficiencyMultiplier: number
}

export interface RecruitTravelSnapshot {
  totalSeconds: number
  remainingSeconds: number
}

export interface RecruitmentSnapshot {
  totalRecruitedThisRun: number
  instantRecruitsUsed: number
  pendingRecruits: RecruitTravelSnapshot[]
  nextRecruitCost: number
}

export interface PowerSnapshot {
  requestedUpkeepPerSecond: number
  activeUpkeepPerSecond: number
  lifeSupportUpkeepPerSecond: number
  brownoutActive: boolean
  brownoutSeverity: number
  activeStaffCount: number
  harmonicsTier: number
  basslineGenerationPerSecond: number
  chorusGenerationPerSecond: number
  harmonicsGenerationPerSecond: number
  harmonicsEfficiencyMultiplier: number
  basslineOutputMultiplier: number
  chorusOutputMultiplier: number
  harmonicsOutputMultiplier: number
  fieldMultiplier: number
}

export interface StationSnapshot {
  requestedEnabled: boolean
  isPowered: boolean
  powerOrder: number
}

export interface ConstructionSnapshot {
  optionId: string
  resourceId: string | null
  totalWorkSeconds: number
  remainingWorkSeconds: number
  totalCost: number
  spentCost: number
  perWorkerCostPerSecond: number
}

export interface WorldActionSnapshot {
  actionId: string
  totalSeconds: number
  remainingSeconds: number
}

export interface BubbleSnapshot {
  stabilizedRing: number
  frontierProgress: number
  targetRing: number
  targetFrontierProgress: number
  holdSecondsRemaining: number
  degradeSecondsAccumulated: number
  stabilizedHexes: number
  reachFromBase: number
  fieldBudget: number
  activeCoverageCost: number
  nextRingCost: number
}

export interface ObjectiveSnapshot {
  reachObjectiveTarget: number
  reachObjectiveMet: boolean
  survivorCaveDistance: number
  recruitmentRangeTiles: number
  recruitmentEnabled: boolean
  survivorCaveInBubble: boolean
}

export interface HexSnapshot {
  q: number
  r: number
  distance: number
  tileId: string
  state: 'inactive' | 'converting' | 'stabilized' | 'blocked'
  progress: number
}

export interface HexCoordSnapshot {
  q: number
  r: number
}

export interface SimulationSnapshot {
  schemaVersion: number
  clockSeconds: number
  resources: ResourceSnapshot
  roster: RosterSnapshot
  heroProgress: HeroProgressSnapshot
  heroSurvival: HeroSurvivalSnapshot
  narrative: NarrativeSnapshot
  crystalCircle: CrystalCircleSnapshot
  processing: ProcessingSnapshot
  base: BaseSnapshot
  power: PowerSnapshot
  stations: Record<string, StationSnapshot>
  recruitment: RecruitmentSnapshot
  bubble: BubbleSnapshot
  objectives: ObjectiveSnapshot
  discoveredCells: HexCoordSnapshot[]
  heroMap: HexCoordSnapshot
  hexes: HexSnapshot[]
  activeConstruction: ConstructionSnapshot | null
  activeWorldAction: WorldActionSnapshot | null
  notes: string[]
}

export interface ResourceDef {
  id: string
  schemaId: string
  label: string
  category: 'band' | 'material' | 'run_scoped_pool'
  baseCap: number
  capBehavior: 'overflow_lost' | 'blocked_at_cap'
  startsAt: number
}

export interface RoleDef {
  id: string
  schemaId: string
  label: string
  slotPool: 'crystal_circle' | 'fire_pit' | 'base'
  heroAllowed: boolean
  crewAllowed: boolean
  maxCrewSlots: number | null
  uiSection: string
  uiOrder: number
}

export interface StationDef {
  id: string
  schemaId: string
  label: string
  category: 'crystal' | 'social' | 'power' | 'tuning' | 'crafting' | 'research'
  chorusUpkeepPerSecond: number
  manualPower: boolean
  startsRequested: boolean
  requirements: RequirementDef[]
  uiOrder: number
}

export interface TileDef {
  id: string
  schemaId: string
  label: string
  terrain: 'plains' | 'river' | 'scrub' | 'ridge' | 'mountain'
  feature: 'none' | 'base' | 'survivor_cave'
  impedance: number
  isBlocker: boolean
  tags: TileTag[]
  floraIds: string[]
  structureIds: string[]
  dungeonIds: string[]
  buildingCapacity: number
}

export type TileTag =
  | 'base'
  | 'sanctuary'
  | 'construction_anchor'
  | 'open_ground'
  | 'water_source'
  | 'easy_propagation'
  | 'brush'
  | 'harvestable'
  | 'elevated'
  | 'high_impedance'
  | 'blocker'
  | 'wall'
  | 'landmark'
  | 'recruitment_source'

export interface FloraDef {
  id: string
  schemaId: string
  label: string
  kind: 'reeds' | 'scrub'
  tags: TileTag[]
}

export interface StructureDef {
  id: string
  schemaId: string
  label: string
  kind: 'crystal_circle' | 'base' | 'cave'
  tags: TileTag[]
}

export interface RequirementDef {
  kind: 'flag_set' | 'flag_unset'
  flag_id: string
}

export interface EffectDef {
  kind: 'set_flag' | 'add_bunks' | 'add_skins' | 'increment_crystal_track' | 'increment_processing_track'
  flag_id?: string
  value?: boolean
  amount?: number
  track?:
    | 'slot_capacity'
    | 'output'
    | 'storage'
    | 'field_polish'
    | 'resonance_calibration'
    | 'mix_calibration'
    | 'workshop_tooling'
    | 'workshop_water_condensers'
    | 'research_chorus_routing'
    | 'research_harmonic_study'
}

export interface CostItemDef {
  item_id: string
  amount: number
}

export interface CostDef {
  kind: 'upfront' | 'upfront_bundle' | 'drain_per_worker_second' | 'time_only'
  resource_id?: string
  amount?: number
  costs?: CostItemDef[]
}

export interface DurationDef {
  kind: 'fixed' | 'crystal_level_scaled'
  seconds?: number
  track?: 'slot_capacity' | 'output' | 'storage' | 'field_polish'
  base_seconds?: number
  per_level_seconds?: number
}

export interface ConstructionOptionDef {
  id: string
  schemaId: string
  label: string
  group: 'crystal_upgrade' | 'base_project'
  cost: CostDef
  duration: DurationDef
  requirements: RequirementDef[]
  effects: EffectDef[]
  uiOrder: number
}

export interface ProcessingRecipeDef {
  id: string
  schemaId: string
  label: string
  stationId: string
  cost: CostDef
  duration: DurationDef
  requirements: RequirementDef[]
  effects: EffectDef[]
  maxLevel: number
  uiOrder: number
}

export interface WorldActionDef {
  id: string
  schemaId: string
  label: string
  durationSeconds: number
  heroOnly: boolean
  offlineProgress: boolean
  heroExposure: 'studio' | 'bubble' | 'outside_bubble'
  returnToBubbleSeconds: number
  returnToStudioSeconds: number
  requirements: RequirementDef[]
  effects: EffectDef[]
  uiOrder: number
}

export interface StoryBeatDef {
  id: string
  schemaId: string
  label: string
  body: string
  arc: string
  sequence: number
  worldActionId: string | null
  choices: StoryChoiceDef[]
  relatedIds: string[]
}

export interface StoryChoiceDef {
  id: string
  label: string
  response: string
}

export interface FlagDef {
  id: string
  label: string
  group: string
}

export interface ModelDef {
  id: string
  label: string
  kind: 'cost' | 'duration' | 'progression' | 'bubble' | 'power' | 'recruitment' | 'vibes' | 'terrain' | 'storage'
}

export interface PersistenceDef {
  scope: 'save_slot' | 'run' | 'content'
  tuningAffinity: 'tuned' | 'detuned' | 'untuned'
  resetsOnTuning: boolean
}

export interface UnlockDef {
  kind: 'story' | 'construction' | 'power' | 'reach' | 'station' | 'processing'
  label: string
  relatedIds: string[]
}

export interface BlockerDef {
  kind:
    | 'missing_requirement'
    | 'missing_resource'
    | 'missing_power'
    | 'missing_staff'
    | 'blocked_at_cap'
    | 'busy'
    | 'inaccessible'
    | 'out_of_bubble'
    | 'occluded'
    | 'offline_disabled'
    | 'reach_locked'
  label: string
  relatedIds: string[]
}

export interface AccessRuleDef {
  kind:
    | 'base_only'
    | 'bubble_required'
    | 'hero_only'
    | 'hero_visited'
    | 'reach_required'
    | 'not_blocked'
    | 'power_network'
    | 'story_unlocked'
  label: string
  relatedIds: string[]
}

export interface FlowDef {
  itemId: string
  label: string
  direction: 'input' | 'output' | 'capacity' | 'pressure' | 'unlock'
  cadence:
    | 'passive'
    | 'per_second'
    | 'per_worker_second'
    | 'on_start'
    | 'on_complete'
    | 'while_powered'
    | 'while_staffed'
  relatedIds: string[]
}

export interface ModelRefDef {
  kind: 'cost' | 'duration' | 'progression' | 'bubble' | 'power' | 'recruitment' | 'vibes' | 'terrain' | 'storage'
  referenceId: string
  label: string
}

export interface PowerProfileDef {
  resourceId: string
  upkeepPerSecond: number
  manualPower: boolean
  startsRequested: boolean
  fallbackMode: 'always_on' | 'brownout_lifo' | 'manual_request' | 'immediate_off_outside_bubble'
}

export interface PresentationDef {
  shortLabel: string
  playerHint: string
  ctaCopy: string | null
  primaryRiskCopy: string | null
  displayPriority: number
  reveal: 'default' | 'advanced' | 'debug'
}

export type VisibilityConditionDef =
  | { kind: 'always' }
  | { kind: 'flag_set'; flag_id: string }
  | { kind: 'flag_unset'; flag_id: string }
  | { kind: 'resource_positive'; resource_id: string }
  | { kind: 'viral_load_positive' }
  | { kind: 'hero_outside_bubble' }
  | { kind: 'hero_forced_return' }
  | { kind: 'hero_recovering' }
  | { kind: 'echo_scars_positive' }
  | { kind: 'role_assigned'; role_id: string }
  | { kind: 'role_available'; role_id: string }
  | { kind: 'recruitment_enabled' }
  | { kind: 'recruitment_disabled' }
  | { kind: 'pending_recruits' }
  | { kind: 'recruited_any' }
  | { kind: 'brownout_active' }

export interface VisibilityDef {
  allOf: VisibilityConditionDef[]
  anyOf: VisibilityConditionDef[]
}

export interface UiElementDef {
  id: string
  label: string
  relatedIds: string[]
  visibility: VisibilityDef
  presentation: PresentationDef | null
}

export interface EntitySchemaDef {
  id: string
  entityKind:
    | 'resource'
    | 'role'
    | 'station'
    | 'construction_option'
    | 'processing_recipe'
    | 'world_action'
    | 'story_beat'
    | 'tile'
    | 'flora'
    | 'structure'
    | 'ui_surface'
  persistence: PersistenceDef | null
  unlocks: UnlockDef[]
  blockers: BlockerDef[]
  accessRules: AccessRuleDef[]
  power: PowerProfileDef | null
  flows: FlowDef[]
  modelRefs: ModelRefDef[]
  notes: string[]
  presentation: PresentationDef | null
  visibility: VisibilityDef | null
}

export interface CatalogSnapshot {
  resources: ResourceDef[]
  roles: RoleDef[]
  stations: StationDef[]
  constructionOptions: ConstructionOptionDef[]
  processingRecipes: ProcessingRecipeDef[]
  worldActions: WorldActionDef[]
  storyBeats: StoryBeatDef[]
  flags: FlagDef[]
  models: ModelDef[]
  flora: FloraDef[]
  structures: StructureDef[]
  tiles: TileDef[]
  entitySchemas: EntitySchemaDef[]
  uiElements: UiElementDef[]
  balance: BalanceSnapshot
}

export interface BalanceSnapshot {
  bubble: BubbleBalance
  crystal: CrystalBalance
  power: PowerBalance
  progression: ProgressionBalance
  survival: SurvivalBalance
  build: BuildBalance
  scavenge: ScavengeBalance
  firePit: FirePitBalance
  water: WaterBalance
  vibes: VibesBalance
  recruitment: RecruitmentBalance
  notesLimit: number
}

export interface BubbleBalance {
  holdSeconds: number
  degradeSecondsPerRing: number
  fieldKBase: number
}

export interface CrystalBalance {
  baseBasslineCap: number
  baseChorusCap: number
  baseHarmonicsCap: number
  basslineCapPerStorageLevel: number
  chorusCapPerStorageLevel: number
  harmonicsCapPerStorageLevel: number
  outputPerWorkerBase: number
  outputPerWorkerLevelBonus: number
  chorusPerWorkerBase: number
  chorusPerWorkerLevelBonus: number
  harmonicsPerWorkerBase: number
  harmonicsPerWorkerLevelBonus: number
  removingMossOutputMultiplier: number
  removingMossPassiveBasslinePerSecond: number
  fieldKBonusPerPolishLevel: number
  firePitCrewSlots: number
}

export interface PowerBalance {
  lifeSupportFreeStaff: number
  lifeSupportUpkeepPerStaffPerSecond: number
  harmonicsContinuousBonusPerUnit: number
  harmonicsContinuousBonusCap: number
  harmonicsTierOneThreshold: number
  harmonicsTierTwoThreshold: number
  harmonicsTierThreeThreshold: number
  harmonicsTierBonus: number
  basslineGenerationBonusWeight: number
  chorusGenerationBonusWeight: number
  harmonicsGenerationBonusWeight: number
  resonanceChamberFieldBonus: number
  mixConsoleHarmonicsBonus: number
  mixConsoleBrownoutTolerance: number
  tierTwoBrownoutTolerance: number
  tierThreeBrownoutTolerance: number
  tierThreeUpkeepDiscount: number
  brownoutBasslinePenaltyWeight: number
  brownoutChorusPenaltyWeight: number
  brownoutHarmonicsPenaltyWeight: number
  brownoutFieldPenaltyWeight: number
  resonanceProcessingFieldBonusPerLevel: number
  mixProcessingHarmonicsBonusPerLevel: number
  mixProcessingBrownoutTolerancePerLevel: number
  researchChorusFreeStaffPerLevel: number
  researchHarmonicsThresholdReductionPerLevel: number
}

export interface ProgressionBalance {
  levelMultiplierA: number
  xp0: number
  xpGrowth: number
}

export interface SurvivalBalance {
  heroTimeSeconds0To1: number
  normalHumanTimeSeconds0To1: number
  recoveryTimeSeconds1To0: number
  sustainBonusPerLevel: number
  tierOneThresholdRatio: number
  tierTwoThresholdRatio: number
  tierThreeThresholdRatio: number
  tierOneWorkEfficiencyMultiplier: number
  tierTwoWorkEfficiencyMultiplier: number
  tierThreeWorkEfficiencyMultiplier: number
  tierOneMovementSpeedMultiplier: number
  tierTwoMovementSpeedMultiplier: number
  tierThreeMovementSpeedMultiplier: number
  tierOneEncounterRateMultiplier: number
  tierTwoEncounterRateMultiplier: number
  tierThreeEncounterRateMultiplier: number
  recoveryBrownoutPenaltyWeight: number
  recoveryBrownoutStopThreshold: number
}

export interface ScavengeBalance {
  baseStockMax: number
  stockRatePerSecond: number
  ambientRatePerSecond: number
}

export interface FirePitBalance {
  baseVibesPerSecond: number
  staffVibesPerSecond: number
}

export interface WaterBalance {
  waterCap: number
  baseStockMax: number
  collectionRatePerSecond: number
  tileRegenPerSecond: number
  workshopWaterCapPerLevel: number
  workshopRegenBonusPerLevel: number
}

export interface BuildBalance {
  workshopToolingSpeedBonusPerLevel: number
}

export interface VibesBalance {
  negativeK: number
  badVibesBeta: number
  badVibesPow: number
  doublingTimeSeconds: number
  decayResetSeconds: number
}

export interface RecruitmentBalance {
  recruitTravelSeconds: number
  instantRecruitDelaySeconds: number
}

export type WorkerRequest =
  | { type: 'init' }
  | { type: 'reset' }
  | { type: 'tick'; seconds: number }
  | { type: 'offlineCatchup'; elapsedSeconds: number }
  | { type: 'chooseStoryOption'; beatId: string; optionId: string }
  | { type: 'assignHero'; assigned: boolean }
  | { type: 'setHeroRole'; roleId: string }
  | { type: 'setRoleCrew'; roleId: string; crew: number }
  | { type: 'setStationEnabled'; stationId: string; enabled: boolean }
  | { type: 'startWorldAction'; actionId: string }
  | { type: 'startConstruction'; optionId: string }
  | { type: 'startProcessing'; recipeId: string }
  | { type: 'recruitFromSurvivorCave' }
  | { type: 'moveHeroTo'; q: number; r: number }
  | { type: 'spendBassline'; amount: number }
  | { type: 'importSave'; payload: string }
  | { type: 'exportSave' }

export type WorkerEvent =
  | { type: 'ready'; snapshot: SimulationSnapshot; catalog: CatalogSnapshot }
  | { type: 'snapshot'; snapshot: SimulationSnapshot }
  | { type: 'save'; payload: string }
  | { type: 'error'; message: string }
