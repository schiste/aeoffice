use serde::Serialize;

pub const RESOURCE_BASSLINE: &str = "resource.bassline";
pub const RESOURCE_CHORUS: &str = "resource.chorus";
pub const RESOURCE_HARMONICS: &str = "resource.harmonics";
pub const RESOURCE_STONE: &str = "resource.stone";
pub const RESOURCE_WATER: &str = "resource.water";
pub const RESOURCE_VIBES: &str = "resource.vibes";
pub const COST_ITEM_SKIN: &str = "cost.skin";

pub const FLAG_BASE_STUDIO_RESTORE_UNLOCKED: &str = "base.studio_restore_unlocked";
pub const FLAG_BASE_STUDIO_RESTORED: &str = "base.studio_restored";
pub const FLAG_BASE_FIRE_PIT_BUILT: &str = "base.fire_pit_built";
pub const FLAG_BASE_RESONANCE_CHAMBER_BUILT: &str = "base.resonance_chamber_built";
pub const FLAG_BASE_MIX_CONSOLE_BUILT: &str = "base.mix_console_built";
pub const FLAG_BASE_WORKSHOP_BUILT: &str = "base.workshop_built";
pub const FLAG_BASE_RESEARCH_BOOTH_BUILT: &str = "base.research_booth_built";
pub const FLAG_BASE_TUTORIAL_INVESTIGATED: &str = "base.tutorial_investigated";
pub const FLAG_BASE_TUTORIAL_EXPLORED: &str = "base.tutorial_explored";
pub const FLAG_BASE_WATER_COLLECTION_UNLOCKED: &str = "base.water_collection_unlocked";
pub const FLAG_CRYSTAL_REMOVING_MOSS_UNLOCKED: &str = "crystal.removing_moss_unlocked";
pub const FLAG_CRYSTAL_REMOVING_MOSS_COMPLETED: &str = "crystal.removing_moss_completed";
pub const FLAG_HERO_OUTSIDE_BUBBLE: &str = "hero.outside_bubble";
pub const FLAG_HERO_FORCED_RETURN_ACTIVE: &str = "hero.forced_return_active";
pub const FLAG_HERO_RECOVERING_AT_STUDIO: &str = "hero.recovering_at_studio";

pub const ROLE_CRYSTAL_BASSLINE: &str = "role.crystal_bassline";
pub const ROLE_CRYSTAL_CHORUS: &str = "role.crystal_chorus";
pub const ROLE_CRYSTAL_HARMONICS: &str = "role.crystal_harmonics";
pub const ROLE_CONSTRUCTION: &str = "role.construction";
pub const ROLE_FIRE_PIT: &str = "role.fire_pit";
pub const ROLE_SCAVENGE: &str = "role.scavenge";
pub const ROLE_WATER: &str = "role.water";

pub const CONSTRUCTION_SLOT_CAPACITY: &str = "construction.slot_capacity";
pub const CONSTRUCTION_OUTPUT: &str = "construction.output";
pub const CONSTRUCTION_STORAGE: &str = "construction.storage";
pub const CONSTRUCTION_REMOVING_MOSS: &str = "construction.removing_moss";
pub const CONSTRUCTION_POLISH_FIELD: &str = "construction.polish_field";
pub const PROJECT_RESTORE_STUDIO: &str = "project.restore_studio";
pub const PROJECT_BUILD_FIRE_PIT: &str = "project.build_fire_pit";
pub const PROJECT_BUILD_RESONANCE_CHAMBER: &str = "project.build_resonance_chamber";
pub const PROJECT_BUILD_MIX_CONSOLE: &str = "project.build_mix_console";
pub const PROJECT_BUILD_WORKSHOP: &str = "project.build_workshop";
pub const PROJECT_BUILD_RESEARCH_BOOTH: &str = "project.build_research_booth";
pub const RECIPE_RESONANCE_FIELD_CALIBRATION: &str = "recipe.resonance_field_calibration";
pub const RECIPE_MIX_SIGNAL_BALANCING: &str = "recipe.mix_signal_balancing";
pub const RECIPE_WORKSHOP_BUILDER_TOOLS: &str = "recipe.workshop_builder_tools";
pub const RECIPE_WORKSHOP_WATER_CONDENSERS: &str = "recipe.workshop_water_condensers";
pub const RECIPE_RESEARCH_CHORUS_ROUTING: &str = "recipe.research_chorus_routing";
pub const RECIPE_RESEARCH_HARMONIC_STUDY: &str = "recipe.research_harmonic_study";

pub const WORLD_ACTION_INVESTIGATE_BASE: &str = "world_action.investigate_base";
pub const WORLD_ACTION_EXPLORE_BASE: &str = "world_action.explore_base";

pub const STORY_BEAT_ROAD_TO_BASE: &str = "story.beat.road_to_base";
pub const STORY_BEAT_FIRST_GLIMPSE: &str = "story.beat.first_glimpse";
pub const STORY_BEAT_ENTER_THE_BUBBLE: &str = "story.beat.enter_the_bubble";
pub const STORY_BEAT_INVESTIGATE_BASE: &str = "story.beat.investigate_base";
pub const STORY_BEAT_EXPLORE_BASE: &str = "story.beat.explore_base";
pub const STORY_BEAT_RESTORE_STUDIO: &str = "story.beat.restore_studio";
pub const STORY_BEAT_BUILD_FIRE_PIT: &str = "story.beat.build_fire_pit";
pub const STORY_BEAT_REACH_SURVIVOR_CAVE: &str = "story.beat.reach_survivor_cave";
pub const STORY_BEAT_FIRST_RECRUIT: &str = "story.beat.first_recruit";
pub const STORY_BEAT_AWAIT_SURVIVOR_ARRIVAL: &str = "story.beat.await_survivor_arrival";
pub const STORY_BEAT_STABILIZE_BASE: &str = "story.beat.stabilize_base";

pub const INTRO_STORY_BEAT_IDS: &[&str] = &[
    STORY_BEAT_ROAD_TO_BASE,
    STORY_BEAT_FIRST_GLIMPSE,
    STORY_BEAT_ENTER_THE_BUBBLE,
    STORY_BEAT_INVESTIGATE_BASE,
    STORY_BEAT_EXPLORE_BASE,
];

pub const TILE_BASE_CORE: &str = "tile.base_core";
pub const TILE_PLAINS_OPEN: &str = "tile.plains_open";
pub const TILE_RIVER_SHALLOWS: &str = "tile.river_shallows";
pub const TILE_SCRUB_PATCH: &str = "tile.scrub_patch";
pub const TILE_RIDGE_LINE: &str = "tile.ridge_line";
pub const TILE_MOUNTAIN_WALL: &str = "tile.mountain_wall";
pub const TILE_SURVIVOR_CAVE: &str = "tile.survivor_cave";

pub const DUNGEON_SURVIVOR_CAVE: &str = "dungeon.survivor_cave";
pub const DUNGEON_STUDIO: &str = "dungeon.studio";

pub const FLORA_REEDS: &str = "flora.reeds";
pub const FLORA_SCRUB: &str = "flora.scrub";

pub const STRUCTURE_CRYSTAL_CIRCLE: &str = "structure.crystal_circle";
pub const STRUCTURE_BASE: &str = "structure.base";
pub const STRUCTURE_CAVE: &str = "structure.cave";

pub const STATION_CRYSTAL_CIRCLE: &str = "station.crystal_circle";
pub const STATION_FIRE_PIT: &str = "station.fire_pit";
pub const STATION_RESONANCE_CHAMBER: &str = "station.resonance_chamber";
pub const STATION_MIX_CONSOLE: &str = "station.mix_console";
pub const STATION_WORKSHOP: &str = "station.workshop";
pub const STATION_RESEARCH_BOOTH: &str = "station.research_booth";

pub const UI_PANEL_POWER: &str = "ui.panel.power";
pub const UI_PANEL_CRYSTAL: &str = "ui.panel.crystal";
pub const UI_PANEL_NARRATIVE: &str = "ui.panel.narrative";
pub const UI_PANEL_HERO: &str = "ui.panel.hero";
pub const UI_PANEL_MAP: &str = "ui.panel.map";
pub const UI_PANEL_CONSTRUCTION: &str = "ui.panel.construction";
pub const UI_PANEL_BASE: &str = "ui.panel.base";
pub const UI_PANEL_RUN: &str = "ui.panel.run";
pub const UI_PANEL_OBJECTIVES: &str = "ui.panel.objectives";
pub const UI_METRIC_CRYSTAL_FREE_SLOTS: &str = "ui.metric.crystal.free_slots";
pub const UI_METRIC_CRYSTAL_OUTPUT_LEVEL: &str = "ui.metric.crystal.output_level";
pub const UI_METRIC_CRYSTAL_FIELD_POLISH: &str = "ui.metric.crystal.field_polish";
pub const UI_METRIC_CRYSTAL_BUBBLE_BUDGET: &str = "ui.metric.crystal.bubble_budget";
pub const UI_METRIC_CRYSTAL_SOURCE: &str = "ui.metric.crystal.source";
pub const UI_METRIC_CRYSTAL_SINK: &str = "ui.metric.crystal.sink";
pub const UI_METRIC_CRYSTAL_RISK: &str = "ui.metric.crystal.risk";
pub const UI_METRIC_CHORUS_RATE: &str = "ui.metric.chorus.rate";
pub const UI_METRIC_CHORUS_STATION_UPKEEP: &str = "ui.metric.chorus.station_upkeep";
pub const UI_METRIC_CHORUS_SOURCE: &str = "ui.metric.chorus.source";
pub const UI_METRIC_CHORUS_SINK: &str = "ui.metric.chorus.sink";
pub const UI_METRIC_CHORUS_RISK: &str = "ui.metric.chorus.risk";
pub const UI_METRIC_HARMONICS_TIER: &str = "ui.metric.harmonics.tier";
pub const UI_METRIC_HARMONICS_EFFICIENCY: &str = "ui.metric.harmonics.efficiency";
pub const UI_METRIC_HARMONICS_SOURCE: &str = "ui.metric.harmonics.source";
pub const UI_METRIC_HARMONICS_SINK: &str = "ui.metric.harmonics.sink";
pub const UI_METRIC_HARMONICS_RISK: &str = "ui.metric.harmonics.risk";
pub const UI_METRIC_POWER_ACTIVE_UPKEEP: &str = "ui.metric.power.active_upkeep";
pub const UI_METRIC_POWER_ACTIVE_STAFF: &str = "ui.metric.power.active_staff";
pub const UI_METRIC_POWER_LIFE_SUPPORT: &str = "ui.metric.power.life_support";
pub const UI_METRIC_POWER_BROWNOUT: &str = "ui.metric.power.brownout";
pub const UI_SUMMARY_CONSTRUCTION_SOURCE: &str = "ui.summary.construction.source";
pub const UI_SUMMARY_CONSTRUCTION_SINK: &str = "ui.summary.construction.sink";
pub const UI_SUMMARY_CONSTRUCTION_BLOCKER: &str = "ui.summary.construction.blocker";
pub const UI_SUMMARY_POWER_SOURCE: &str = "ui.summary.power.source";
pub const UI_SUMMARY_POWER_SINK: &str = "ui.summary.power.sink";
pub const UI_SUMMARY_POWER_BLOCKER: &str = "ui.summary.power.blocker";
pub const UI_METRIC_BASE_RECRUIT_COST: &str = "ui.metric.base.recruit_cost";
pub const UI_METRIC_BASE_BUNKS: &str = "ui.metric.base.bunks";
pub const UI_METRIC_BASE_HOUSING: &str = "ui.metric.base.housing";
pub const UI_METRIC_BASE_BAD_VIBES: &str = "ui.metric.base.bad_vibes";
pub const UI_METRIC_BASE_CREW_EFFICIENCY: &str = "ui.metric.base.crew_efficiency";
pub const UI_METRIC_BASE_STONE_STOCK: &str = "ui.metric.base.stone_stock";
pub const UI_METRIC_BASE_WATER_STOCK: &str = "ui.metric.base.water_stock";
pub const UI_SUMMARY_BASE_SOURCE: &str = "ui.summary.base.source";
pub const UI_SUMMARY_BASE_SINK: &str = "ui.summary.base.sink";
pub const UI_SUMMARY_BASE_BLOCKER: &str = "ui.summary.base.blocker";
pub const UI_CONTROL_HERO_TASK: &str = "ui.control.hero.task";
pub const UI_STATUS_HERO: &str = "ui.status.hero";
pub const UI_METRIC_HERO_VITALS: &str = "ui.metric.hero.vitals";
pub const UI_METRIC_HERO_WOUNDS: &str = "ui.metric.hero.wounds";
pub const UI_METRIC_HERO_RETURN_WINDOW: &str = "ui.metric.hero.return_window";
pub const UI_METRIC_HERO_RECOVERY: &str = "ui.metric.hero.recovery";
pub const UI_METRIC_HERO_ECHO_SCARS: &str = "ui.metric.hero.echo_scars";
pub const UI_METRIC_HERO_DEBUFF: &str = "ui.metric.hero.debuff";
pub const UI_CONTROL_CONSTRUCTION_CREW: &str = "ui.control.construction.crew";
pub const UI_CONTROL_BASE_SCAVENGE: &str = "ui.control.base.scavenge";
pub const UI_CONTROL_BASE_FIRE_PIT: &str = "ui.control.base.fire_pit";
pub const UI_CONTROL_BASE_WATER: &str = "ui.control.base.water";
pub const UI_ACTION_RECRUIT: &str = "ui.action.recruit";
pub const UI_STATUS_BASE_STUDIO: &str = "ui.status.base.studio";
pub const UI_STATUS_BASE_FIRE_PIT: &str = "ui.status.base.fire_pit";
pub const UI_STATUS_BASE_RECRUITS: &str = "ui.status.base.recruits";
pub const UI_STATUS_BASE_HOUSING: &str = "ui.status.base.housing";
pub const UI_MAP_CAVE_GATE: &str = "ui.map.cave_gate";
pub const UI_OBJECTIVE_STATUS: &str = "ui.objective.status";
pub const UI_OBJECTIVE_ACTIVE_GOAL: &str = "ui.objective.active_goal";
pub const UI_OBJECTIVE_NEXT: &str = "ui.objective.next";
pub const UI_OBJECTIVE_BLOCKER: &str = "ui.objective.blocker";
pub const UI_OBJECTIVE_UNLOCK: &str = "ui.objective.unlock";
pub const UI_OBJECTIVE_NEXT_MOVE: &str = "ui.objective.next_move";
pub const UI_OBJECTIVE_WATCH_OUT: &str = "ui.objective.watch_out";

pub const TERRAIN_PLAINS_IMPEDANCE: f64 = 1.0;
pub const TERRAIN_RIVER_IMPEDANCE: f64 = 0.35;
pub const TERRAIN_SCRUB_IMPEDANCE: f64 = 1.6;
pub const TERRAIN_RIDGE_IMPEDANCE: f64 = 2.4;
pub const TERRAIN_MOUNTAIN_IMPEDANCE: f64 = 99.0;

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CapBehavior {
    OverflowLost,
    BlockedAtCap,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ResourceCategory {
    Band,
    Material,
    RunScopedPool,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RoleSlotPool {
    CrystalCircle,
    FirePit,
    Base,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ConstructionGroup {
    CrystalUpgrade,
    BaseProject,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ProcessingTrack {
    ResonanceCalibration,
    MixCalibration,
    WorkshopTooling,
    WorkshopWaterCondensers,
    ResearchChorusRouting,
    ResearchHarmonicStudy,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum StationCategory {
    Crystal,
    Social,
    Power,
    Tuning,
    Crafting,
    Research,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EntityKind {
    Resource,
    Role,
    Station,
    ConstructionOption,
    ProcessingRecipe,
    WorldAction,
    StoryBeat,
    Tile,
    Flora,
    Structure,
    UiSurface,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PersistenceScope {
    SaveSlot,
    Run,
    Content,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TuningAffinity {
    Tuned,
    Detuned,
    Untuned,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum UnlockKind {
    Story,
    Construction,
    Power,
    Reach,
    Station,
    Processing,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum BlockerKind {
    MissingRequirement,
    MissingResource,
    MissingPower,
    MissingStaff,
    BlockedAtCap,
    Busy,
    Inaccessible,
    OutOfBubble,
    Occluded,
    OfflineDisabled,
    ReachLocked,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AccessRuleKind {
    BaseOnly,
    BubbleRequired,
    HeroOnly,
    HeroVisited,
    ReachRequired,
    NotBlocked,
    PowerNetwork,
    StoryUnlocked,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FlowDirection {
    Input,
    Output,
    Capacity,
    Pressure,
    Unlock,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FlowCadence {
    Passive,
    PerSecond,
    PerWorkerSecond,
    OnStart,
    OnComplete,
    WhilePowered,
    WhileStaffed,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ModelKind {
    Cost,
    Duration,
    Progression,
    Bubble,
    Power,
    Recruitment,
    Survival,
    Vibes,
    Terrain,
    Storage,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PowerFallbackMode {
    AlwaysOn,
    BrownoutLifo,
    ManualRequest,
    ImmediateOffOutsideBubble,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PresentationReveal {
    Default,
    Advanced,
    Debug,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum VisibilityConditionDef {
    Always,
    FlagSet { flag_id: &'static str },
    FlagUnset { flag_id: &'static str },
    ResourcePositive { resource_id: &'static str },
    ViralLoadPositive,
    HeroOutsideBubble,
    HeroForcedReturn,
    HeroRecovering,
    EchoScarsPositive,
    RoleAssigned { role_id: &'static str },
    RoleAvailable { role_id: &'static str },
    RecruitmentEnabled,
    RecruitmentDisabled,
    PendingRecruits,
    RecruitedAny,
    BrownoutActive,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CostKind {
    DrainPerWorkerSecond,
    Upfront,
    UpfrontBundle,
    TimeOnly,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CrystalTrack {
    SlotCapacity,
    Output,
    Storage,
    FieldPolish,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PersistenceDef {
    pub scope: PersistenceScope,
    pub tuning_affinity: TuningAffinity,
    pub resets_on_tuning: bool,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UnlockDef {
    pub kind: UnlockKind,
    pub label: &'static str,
    pub related_ids: &'static [&'static str],
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BlockerDef {
    pub kind: BlockerKind,
    pub label: &'static str,
    pub related_ids: &'static [&'static str],
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AccessRuleDef {
    pub kind: AccessRuleKind,
    pub label: &'static str,
    pub related_ids: &'static [&'static str],
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FlowDef {
    pub item_id: &'static str,
    pub label: &'static str,
    pub direction: FlowDirection,
    pub cadence: FlowCadence,
    pub related_ids: &'static [&'static str],
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ModelRefDef {
    pub kind: ModelKind,
    pub reference_id: &'static str,
    pub label: &'static str,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PowerProfileDef {
    pub resource_id: &'static str,
    pub upkeep_per_second: f64,
    pub manual_power: bool,
    pub starts_requested: bool,
    pub fallback_mode: PowerFallbackMode,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PresentationDef {
    pub short_label: &'static str,
    pub player_hint: &'static str,
    pub cta_copy: Option<&'static str>,
    pub primary_risk_copy: Option<&'static str>,
    pub display_priority: u16,
    pub reveal: PresentationReveal,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VisibilityDef {
    pub all_of: &'static [VisibilityConditionDef],
    pub any_of: &'static [VisibilityConditionDef],
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct EntityPresentationDef {
    pub id: &'static str,
    pub short_label: &'static str,
    pub player_hint: &'static str,
    pub cta_copy: Option<&'static str>,
    pub primary_risk_copy: Option<&'static str>,
    pub display_priority: u16,
    pub reveal: PresentationReveal,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct EntityVisibilityDef {
    pub id: &'static str,
    pub all_of: &'static [VisibilityConditionDef],
    pub any_of: &'static [VisibilityConditionDef],
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EntitySchemaDef {
    pub id: &'static str,
    pub entity_kind: EntityKind,
    pub persistence: Option<PersistenceDef>,
    pub unlocks: &'static [UnlockDef],
    pub blockers: &'static [BlockerDef],
    pub access_rules: &'static [AccessRuleDef],
    pub power: Option<PowerProfileDef>,
    pub flows: &'static [FlowDef],
    pub model_refs: &'static [ModelRefDef],
    pub notes: &'static [&'static str],
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EntitySchemaSnapshot {
    pub id: &'static str,
    pub entity_kind: EntityKind,
    pub persistence: Option<PersistenceDef>,
    pub unlocks: Vec<UnlockDef>,
    pub blockers: Vec<BlockerDef>,
    pub access_rules: Vec<AccessRuleDef>,
    pub power: Option<PowerProfileDef>,
    pub flows: Vec<FlowDef>,
    pub model_refs: Vec<ModelRefDef>,
    pub notes: Vec<&'static str>,
    pub presentation: Option<PresentationDef>,
    pub visibility: Option<VisibilityDef>,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UiElementDef {
    pub id: &'static str,
    pub label: &'static str,
    pub related_ids: &'static [&'static str],
    pub visibility: VisibilityDef,
    pub presentation: Option<PresentationDef>,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RequirementDef {
    FlagSet(&'static str),
    FlagUnset(&'static str),
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum EffectDef {
    SetFlag { flag_id: &'static str, value: bool },
    AddBunks { amount: u16 },
    AddSkins { amount: u16 },
    IncrementCrystalTrack { track: CrystalTrack, amount: u8 },
    IncrementProcessingTrack { track: ProcessingTrack, amount: u8 },
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CostItemDef {
    pub item_id: &'static str,
    pub amount: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum DurationDef {
    Fixed {
        seconds: f64,
    },
    CrystalLevelScaled {
        track: CrystalTrack,
        base_seconds: f64,
        per_level_seconds: f64,
    },
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum CostDef {
    Upfront {
        resource_id: &'static str,
        amount: f64,
    },
    UpfrontBundle {
        costs: &'static [CostItemDef],
    },
    DrainPerWorkerSecond {
        resource_id: &'static str,
        amount: f64,
    },
    TimeOnly,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ResourceDef {
    pub id: &'static str,
    pub schema_id: &'static str,
    pub label: &'static str,
    pub category: ResourceCategory,
    pub base_cap: f64,
    pub cap_behavior: CapBehavior,
    pub starts_at: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RoleDef {
    pub id: &'static str,
    pub schema_id: &'static str,
    pub label: &'static str,
    pub slot_pool: RoleSlotPool,
    pub hero_allowed: bool,
    pub crew_allowed: bool,
    pub max_crew_slots: Option<u8>,
    pub ui_section: &'static str,
    pub ui_order: u8,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StationDef {
    pub id: &'static str,
    pub schema_id: &'static str,
    pub label: &'static str,
    pub category: StationCategory,
    pub chorus_upkeep_per_second: f64,
    pub manual_power: bool,
    pub starts_requested: bool,
    pub requirements: &'static [RequirementDef],
    pub ui_order: u8,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ConstructionOptionDef {
    pub id: &'static str,
    pub schema_id: &'static str,
    pub label: &'static str,
    pub group: ConstructionGroup,
    pub cost: CostDef,
    pub duration: DurationDef,
    pub requirements: &'static [RequirementDef],
    pub effects: &'static [EffectDef],
    pub ui_order: u8,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProcessingRecipeDef {
    pub id: &'static str,
    pub schema_id: &'static str,
    pub label: &'static str,
    pub station_id: &'static str,
    pub cost: CostDef,
    pub duration: DurationDef,
    pub requirements: &'static [RequirementDef],
    pub effects: &'static [EffectDef],
    pub max_level: u8,
    pub ui_order: u8,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WorldActionDef {
    pub id: &'static str,
    pub schema_id: &'static str,
    pub label: &'static str,
    pub duration_seconds: f64,
    pub hero_only: bool,
    pub offline_progress: bool,
    pub hero_exposure: HeroExposureDef,
    pub return_to_bubble_seconds: f64,
    pub return_to_studio_seconds: f64,
    pub requirements: &'static [RequirementDef],
    pub effects: &'static [EffectDef],
    pub ui_order: u8,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum HeroExposureDef {
    Studio,
    Bubble,
    OutsideBubble,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StoryChoiceDef {
    pub id: &'static str,
    pub label: &'static str,
    pub response: &'static str,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StoryBeatDef {
    pub id: &'static str,
    pub schema_id: &'static str,
    pub label: &'static str,
    pub body: &'static str,
    pub arc: &'static str,
    pub sequence: u16,
    pub world_action_id: Option<&'static str>,
    pub choices: &'static [StoryChoiceDef],
    pub related_ids: &'static [&'static str],
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FlagDef {
    pub id: &'static str,
    pub label: &'static str,
    pub group: &'static str,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ModelDef {
    pub id: &'static str,
    pub label: &'static str,
    pub kind: ModelKind,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CatalogSnapshot {
    pub resources: Vec<ResourceDef>,
    pub roles: Vec<RoleDef>,
    pub stations: Vec<StationDef>,
    pub construction_options: Vec<ConstructionOptionDef>,
    pub processing_recipes: Vec<ProcessingRecipeDef>,
    pub world_actions: Vec<WorldActionDef>,
    pub story_beats: Vec<StoryBeatDef>,
    pub flags: Vec<FlagDef>,
    pub models: Vec<ModelDef>,
    pub flora: Vec<FloraDef>,
    pub structures: Vec<StructureDef>,
    pub tiles: Vec<TileDef>,
    pub entity_schemas: Vec<EntitySchemaSnapshot>,
    pub ui_elements: Vec<UiElementDef>,
    pub balance: BalanceSnapshot,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BalanceSnapshot {
    pub bubble: BubbleBalance,
    pub crystal: CrystalBalance,
    pub power: PowerBalance,
    pub progression: ProgressionBalance,
    pub survival: SurvivalBalance,
    pub build: BuildBalance,
    pub scavenge: ScavengeBalance,
    pub fire_pit: FirePitBalance,
    pub water: WaterBalance,
    pub vibes: VibesBalance,
    pub recruitment: RecruitmentBalance,
    pub notes_limit: usize,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BubbleBalance {
    pub hold_seconds: f64,
    pub degrade_seconds_per_ring: f64,
    pub field_k_base: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CrystalBalance {
    pub base_bassline_cap: f64,
    pub base_chorus_cap: f64,
    pub base_harmonics_cap: f64,
    pub bassline_cap_per_storage_level: f64,
    pub chorus_cap_per_storage_level: f64,
    pub harmonics_cap_per_storage_level: f64,
    pub output_per_worker_base: f64,
    pub output_per_worker_level_bonus: f64,
    pub chorus_per_worker_base: f64,
    pub chorus_per_worker_level_bonus: f64,
    pub harmonics_per_worker_base: f64,
    pub harmonics_per_worker_level_bonus: f64,
    pub removing_moss_output_multiplier: f64,
    pub removing_moss_passive_bassline_per_second: f64,
    pub field_k_bonus_per_polish_level: f64,
    pub fire_pit_crew_slots: u8,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PowerBalance {
    pub life_support_free_staff: u8,
    pub life_support_upkeep_per_staff_per_second: f64,
    pub harmonics_continuous_bonus_per_unit: f64,
    pub harmonics_continuous_bonus_cap: f64,
    pub harmonics_tier_one_threshold: f64,
    pub harmonics_tier_two_threshold: f64,
    pub harmonics_tier_three_threshold: f64,
    pub harmonics_tier_bonus: f64,
    pub bassline_generation_bonus_weight: f64,
    pub chorus_generation_bonus_weight: f64,
    pub harmonics_generation_bonus_weight: f64,
    pub resonance_chamber_field_bonus: f64,
    pub mix_console_harmonics_bonus: f64,
    pub mix_console_brownout_tolerance: f64,
    pub tier_two_brownout_tolerance: f64,
    pub tier_three_brownout_tolerance: f64,
    pub tier_three_upkeep_discount: f64,
    pub brownout_bassline_penalty_weight: f64,
    pub brownout_chorus_penalty_weight: f64,
    pub brownout_harmonics_penalty_weight: f64,
    pub brownout_field_penalty_weight: f64,
    pub resonance_processing_field_bonus_per_level: f64,
    pub mix_processing_harmonics_bonus_per_level: f64,
    pub mix_processing_brownout_tolerance_per_level: f64,
    pub research_chorus_free_staff_per_level: u8,
    pub research_harmonics_threshold_reduction_per_level: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProgressionBalance {
    pub level_multiplier_a: f64,
    pub xp0: f64,
    pub xp_growth: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SurvivalBalance {
    pub hero_time_seconds_0_to_1: f64,
    pub normal_human_time_seconds_0_to_1: f64,
    pub recovery_time_seconds_1_to_0: f64,
    pub sustain_bonus_per_level: f64,
    pub tier_one_threshold_ratio: f64,
    pub tier_two_threshold_ratio: f64,
    pub tier_three_threshold_ratio: f64,
    pub tier_one_work_efficiency_multiplier: f64,
    pub tier_two_work_efficiency_multiplier: f64,
    pub tier_three_work_efficiency_multiplier: f64,
    pub tier_one_movement_speed_multiplier: f64,
    pub tier_two_movement_speed_multiplier: f64,
    pub tier_three_movement_speed_multiplier: f64,
    pub tier_one_encounter_rate_multiplier: f64,
    pub tier_two_encounter_rate_multiplier: f64,
    pub tier_three_encounter_rate_multiplier: f64,
    pub recovery_brownout_penalty_weight: f64,
    pub recovery_brownout_stop_threshold: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ScavengeBalance {
    pub base_stock_max: f64,
    pub stock_rate_per_second: f64,
    pub ambient_rate_per_second: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FirePitBalance {
    pub base_vibes_per_second: f64,
    pub staff_vibes_per_second: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WaterBalance {
    pub water_cap: f64,
    pub base_stock_max: f64,
    pub collection_rate_per_second: f64,
    pub tile_regen_per_second: f64,
    pub workshop_water_cap_per_level: f64,
    pub workshop_regen_bonus_per_level: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BuildBalance {
    pub workshop_tooling_speed_bonus_per_level: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VibesBalance {
    pub negative_k: f64,
    pub bad_vibes_beta: f64,
    pub bad_vibes_pow: f64,
    pub doubling_time_seconds: f64,
    pub decay_reset_seconds: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RecruitmentBalance {
    pub recruit_travel_seconds: f64,
    pub instant_recruit_delay_seconds: f64,
    pub good_vibes_opt_base: f64,
    pub good_vibes_opt_step: f64,
    pub t1_minutes: f64,
    pub t30_total_good_vibes: f64,
    pub t500_total_good_vibes: f64,
    pub t1000_total_good_vibes: f64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TileFeature {
    None,
    Base,
    SurvivorCave,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TileTag {
    Base,
    Sanctuary,
    ConstructionAnchor,
    OpenGround,
    WaterSource,
    EasyPropagation,
    Brush,
    Harvestable,
    Elevated,
    HighImpedance,
    Blocker,
    Wall,
    Landmark,
    RecruitmentSource,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FloraKind {
    Reeds,
    Scrub,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum StructureKind {
    CrystalCircle,
    Base,
    Cave,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TerrainProfile {
    pub terrain: TerrainSnapshot,
    pub impedance: f64,
    pub is_blocker: bool,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TileDef {
    pub id: &'static str,
    pub schema_id: &'static str,
    pub label: &'static str,
    pub terrain: TerrainSnapshot,
    pub feature: TileFeature,
    pub impedance: f64,
    pub is_blocker: bool,
    pub tags: &'static [TileTag],
    pub flora_ids: &'static [&'static str],
    pub structure_ids: &'static [&'static str],
    pub dungeon_ids: &'static [&'static str],
    pub building_capacity: u8,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FloraDef {
    pub id: &'static str,
    pub schema_id: &'static str,
    pub label: &'static str,
    pub kind: FloraKind,
    pub tags: &'static [TileTag],
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StructureDef {
    pub id: &'static str,
    pub schema_id: &'static str,
    pub label: &'static str,
    pub kind: StructureKind,
    pub tags: &'static [TileTag],
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TerrainSnapshot {
    Plains,
    River,
    Scrub,
    Ridge,
    Mountain,
}

const RESOURCES: &[ResourceDef] = &[
    ResourceDef {
        id: RESOURCE_BASSLINE,
        schema_id: RESOURCE_BASSLINE,
        label: "Bassline",
        category: ResourceCategory::Band,
        base_cap: 90.0,
        cap_behavior: CapBehavior::OverflowLost,
        starts_at: 0.0,
    },
    ResourceDef {
        id: RESOURCE_CHORUS,
        schema_id: RESOURCE_CHORUS,
        label: "Chorus",
        category: ResourceCategory::Band,
        base_cap: 60.0,
        cap_behavior: CapBehavior::OverflowLost,
        starts_at: 0.0,
    },
    ResourceDef {
        id: RESOURCE_HARMONICS,
        schema_id: RESOURCE_HARMONICS,
        label: "Harmonics",
        category: ResourceCategory::Band,
        base_cap: 40.0,
        cap_behavior: CapBehavior::OverflowLost,
        starts_at: 0.0,
    },
    ResourceDef {
        id: RESOURCE_STONE,
        schema_id: RESOURCE_STONE,
        label: "Stone",
        category: ResourceCategory::Material,
        base_cap: 1000.0,
        cap_behavior: CapBehavior::BlockedAtCap,
        starts_at: 0.0,
    },
    ResourceDef {
        id: RESOURCE_WATER,
        schema_id: RESOURCE_WATER,
        label: "Water",
        category: ResourceCategory::Material,
        base_cap: 5.0,
        cap_behavior: CapBehavior::BlockedAtCap,
        starts_at: 0.0,
    },
    ResourceDef {
        id: RESOURCE_VIBES,
        schema_id: RESOURCE_VIBES,
        label: "Vibes",
        category: ResourceCategory::RunScopedPool,
        base_cap: 100.0,
        cap_behavior: CapBehavior::OverflowLost,
        starts_at: 0.0,
    },
];

const ROLES: &[RoleDef] = &[
    RoleDef {
        id: ROLE_CRYSTAL_BASSLINE,
        schema_id: ROLE_CRYSTAL_BASSLINE,
        label: "Crystal: Bassline",
        slot_pool: RoleSlotPool::CrystalCircle,
        hero_allowed: true,
        crew_allowed: true,
        max_crew_slots: None,
        ui_section: "crystal",
        ui_order: 10,
    },
    RoleDef {
        id: ROLE_CRYSTAL_CHORUS,
        schema_id: ROLE_CRYSTAL_CHORUS,
        label: "Crystal: Chorus",
        slot_pool: RoleSlotPool::CrystalCircle,
        hero_allowed: true,
        crew_allowed: true,
        max_crew_slots: None,
        ui_section: "crystal",
        ui_order: 20,
    },
    RoleDef {
        id: ROLE_CRYSTAL_HARMONICS,
        schema_id: ROLE_CRYSTAL_HARMONICS,
        label: "Crystal: Harmonics",
        slot_pool: RoleSlotPool::CrystalCircle,
        hero_allowed: true,
        crew_allowed: true,
        max_crew_slots: None,
        ui_section: "crystal",
        ui_order: 30,
    },
    RoleDef {
        id: ROLE_CONSTRUCTION,
        schema_id: ROLE_CONSTRUCTION,
        label: "Construction",
        slot_pool: RoleSlotPool::Base,
        hero_allowed: true,
        crew_allowed: true,
        max_crew_slots: None,
        ui_section: "construction",
        ui_order: 40,
    },
    RoleDef {
        id: ROLE_FIRE_PIT,
        schema_id: ROLE_FIRE_PIT,
        label: "Fire Pit: Vibes",
        slot_pool: RoleSlotPool::FirePit,
        hero_allowed: true,
        crew_allowed: true,
        max_crew_slots: Some(2),
        ui_section: "base",
        ui_order: 30,
    },
    RoleDef {
        id: ROLE_SCAVENGE,
        schema_id: ROLE_SCAVENGE,
        label: "Base: Scavenge",
        slot_pool: RoleSlotPool::Base,
        hero_allowed: true,
        crew_allowed: true,
        max_crew_slots: None,
        ui_section: "base",
        ui_order: 40,
    },
    RoleDef {
        id: ROLE_WATER,
        schema_id: ROLE_WATER,
        label: "Base: Water",
        slot_pool: RoleSlotPool::Base,
        hero_allowed: true,
        crew_allowed: true,
        max_crew_slots: None,
        ui_section: "base",
        ui_order: 50,
    },
];

const REQS_NONE: &[RequirementDef] = &[];
const REQS_REMOVING_MOSS: &[RequirementDef] = &[
    RequirementDef::FlagSet(FLAG_CRYSTAL_REMOVING_MOSS_UNLOCKED),
    RequirementDef::FlagUnset(FLAG_CRYSTAL_REMOVING_MOSS_COMPLETED),
];
const REQS_RESTORE_STUDIO: &[RequirementDef] = &[
    RequirementDef::FlagSet(FLAG_BASE_STUDIO_RESTORE_UNLOCKED),
    RequirementDef::FlagUnset(FLAG_BASE_STUDIO_RESTORED),
];
const REQS_FIELD_POLISH: &[RequirementDef] = &[RequirementDef::FlagSet(FLAG_BASE_TUTORIAL_EXPLORED)];
const REQS_BUILD_FIRE_PIT: &[RequirementDef] = &[RequirementDef::FlagUnset(FLAG_BASE_FIRE_PIT_BUILT)];
const REQS_BUILD_RESONANCE_CHAMBER: &[RequirementDef] = &[
    RequirementDef::FlagSet(FLAG_BASE_STUDIO_RESTORED),
    RequirementDef::FlagUnset(FLAG_BASE_RESONANCE_CHAMBER_BUILT),
];
const REQS_BUILD_MIX_CONSOLE: &[RequirementDef] = &[
    RequirementDef::FlagSet(FLAG_BASE_STUDIO_RESTORED),
    RequirementDef::FlagSet(FLAG_BASE_RESONANCE_CHAMBER_BUILT),
    RequirementDef::FlagUnset(FLAG_BASE_MIX_CONSOLE_BUILT),
];
const REQS_BUILD_WORKSHOP: &[RequirementDef] = &[
    RequirementDef::FlagSet(FLAG_BASE_STUDIO_RESTORED),
    RequirementDef::FlagUnset(FLAG_BASE_WORKSHOP_BUILT),
];
const REQS_BUILD_RESEARCH_BOOTH: &[RequirementDef] = &[
    RequirementDef::FlagSet(FLAG_BASE_STUDIO_RESTORED),
    RequirementDef::FlagSet(FLAG_BASE_RESONANCE_CHAMBER_BUILT),
    RequirementDef::FlagUnset(FLAG_BASE_RESEARCH_BOOTH_BUILT),
];
const REQS_INVESTIGATE_BASE: &[RequirementDef] =
    &[RequirementDef::FlagUnset(FLAG_BASE_TUTORIAL_INVESTIGATED)];
const REQS_EXPLORE_BASE: &[RequirementDef] = &[
    RequirementDef::FlagSet(FLAG_BASE_TUTORIAL_INVESTIGATED),
    RequirementDef::FlagUnset(FLAG_BASE_TUTORIAL_EXPLORED),
];

const EFFECTS_SLOT_CAPACITY: &[EffectDef] = &[EffectDef::IncrementCrystalTrack {
    track: CrystalTrack::SlotCapacity,
    amount: 1,
}];
const EFFECTS_OUTPUT: &[EffectDef] = &[EffectDef::IncrementCrystalTrack {
    track: CrystalTrack::Output,
    amount: 1,
}];
const EFFECTS_STORAGE: &[EffectDef] = &[EffectDef::IncrementCrystalTrack {
    track: CrystalTrack::Storage,
    amount: 1,
}];
const EFFECTS_FIELD_POLISH: &[EffectDef] = &[EffectDef::IncrementCrystalTrack {
    track: CrystalTrack::FieldPolish,
    amount: 1,
}];
const EFFECTS_REMOVING_MOSS: &[EffectDef] = &[EffectDef::SetFlag {
    flag_id: FLAG_CRYSTAL_REMOVING_MOSS_COMPLETED,
    value: true,
}];
const EFFECTS_RESTORE_STUDIO: &[EffectDef] = &[
    EffectDef::SetFlag {
        flag_id: FLAG_BASE_STUDIO_RESTORED,
        value: true,
    },
    EffectDef::AddBunks { amount: 15 },
];
const EFFECTS_BUILD_FIRE_PIT: &[EffectDef] = &[EffectDef::SetFlag {
    flag_id: FLAG_BASE_FIRE_PIT_BUILT,
    value: true,
}];
const EFFECTS_BUILD_RESONANCE_CHAMBER: &[EffectDef] = &[EffectDef::SetFlag {
    flag_id: FLAG_BASE_RESONANCE_CHAMBER_BUILT,
    value: true,
}];
const EFFECTS_BUILD_MIX_CONSOLE: &[EffectDef] = &[EffectDef::SetFlag {
    flag_id: FLAG_BASE_MIX_CONSOLE_BUILT,
    value: true,
}];
const EFFECTS_BUILD_WORKSHOP: &[EffectDef] = &[EffectDef::SetFlag {
    flag_id: FLAG_BASE_WORKSHOP_BUILT,
    value: true,
}];
const EFFECTS_BUILD_RESEARCH_BOOTH: &[EffectDef] = &[EffectDef::SetFlag {
    flag_id: FLAG_BASE_RESEARCH_BOOTH_BUILT,
    value: true,
}];
const COSTS_FIELD_POLISH: &[CostItemDef] = &[
    CostItemDef {
        item_id: COST_ITEM_SKIN,
        amount: 1.0,
    },
    CostItemDef {
        item_id: RESOURCE_WATER,
        amount: 5.0,
    },
];
const COSTS_RESONANCE_FIELD_CALIBRATION: &[CostItemDef] = &[
    CostItemDef {
        item_id: RESOURCE_STONE,
        amount: 80.0,
    },
    CostItemDef {
        item_id: RESOURCE_WATER,
        amount: 1.0,
    },
];
const COSTS_MIX_SIGNAL_BALANCING: &[CostItemDef] = &[
    CostItemDef {
        item_id: RESOURCE_STONE,
        amount: 120.0,
    },
    CostItemDef {
        item_id: RESOURCE_WATER,
        amount: 2.0,
    },
];
const COSTS_WORKSHOP_BUILDER_TOOLS: &[CostItemDef] = &[
    CostItemDef {
        item_id: RESOURCE_STONE,
        amount: 100.0,
    },
    CostItemDef {
        item_id: RESOURCE_WATER,
        amount: 2.0,
    },
];
const COSTS_WORKSHOP_WATER_CONDENSERS: &[CostItemDef] = &[
    CostItemDef {
        item_id: RESOURCE_STONE,
        amount: 70.0,
    },
    CostItemDef {
        item_id: RESOURCE_WATER,
        amount: 2.0,
    },
];
const COSTS_RESEARCH_CHORUS_ROUTING: &[CostItemDef] = &[
    CostItemDef {
        item_id: RESOURCE_STONE,
        amount: 140.0,
    },
    CostItemDef {
        item_id: RESOURCE_WATER,
        amount: 1.0,
    },
];
const COSTS_RESEARCH_HARMONIC_STUDY: &[CostItemDef] = &[
    CostItemDef {
        item_id: RESOURCE_STONE,
        amount: 180.0,
    },
    CostItemDef {
        item_id: RESOURCE_WATER,
        amount: 2.0,
    },
];
const EFFECTS_INVESTIGATE_BASE: &[EffectDef] = &[EffectDef::SetFlag {
    flag_id: FLAG_BASE_TUTORIAL_INVESTIGATED,
    value: true,
}];
const EFFECTS_EXPLORE_BASE: &[EffectDef] = &[
    EffectDef::SetFlag {
        flag_id: FLAG_BASE_TUTORIAL_EXPLORED,
        value: true,
    },
    EffectDef::SetFlag {
        flag_id: FLAG_BASE_STUDIO_RESTORE_UNLOCKED,
        value: true,
    },
    EffectDef::SetFlag {
        flag_id: FLAG_CRYSTAL_REMOVING_MOSS_UNLOCKED,
        value: true,
    },
    EffectDef::SetFlag {
        flag_id: FLAG_BASE_WATER_COLLECTION_UNLOCKED,
        value: true,
    },
    EffectDef::AddSkins { amount: 1 },
];
const EFFECTS_RESONANCE_FIELD_CALIBRATION: &[EffectDef] = &[EffectDef::IncrementProcessingTrack {
    track: ProcessingTrack::ResonanceCalibration,
    amount: 1,
}];
const EFFECTS_MIX_SIGNAL_BALANCING: &[EffectDef] = &[EffectDef::IncrementProcessingTrack {
    track: ProcessingTrack::MixCalibration,
    amount: 1,
}];
const EFFECTS_WORKSHOP_BUILDER_TOOLS: &[EffectDef] = &[EffectDef::IncrementProcessingTrack {
    track: ProcessingTrack::WorkshopTooling,
    amount: 1,
}];
const EFFECTS_WORKSHOP_WATER_CONDENSERS: &[EffectDef] = &[EffectDef::IncrementProcessingTrack {
    track: ProcessingTrack::WorkshopWaterCondensers,
    amount: 1,
}];
const EFFECTS_RESEARCH_CHORUS_ROUTING: &[EffectDef] = &[EffectDef::IncrementProcessingTrack {
    track: ProcessingTrack::ResearchChorusRouting,
    amount: 1,
}];
const EFFECTS_RESEARCH_HARMONIC_STUDY: &[EffectDef] = &[EffectDef::IncrementProcessingTrack {
    track: ProcessingTrack::ResearchHarmonicStudy,
    amount: 1,
}];

const CONSTRUCTION_OPTIONS: &[ConstructionOptionDef] = &[
    ConstructionOptionDef {
        id: CONSTRUCTION_SLOT_CAPACITY,
        schema_id: CONSTRUCTION_SLOT_CAPACITY,
        label: "Slot Capacity",
        group: ConstructionGroup::CrystalUpgrade,
        cost: CostDef::DrainPerWorkerSecond {
            resource_id: RESOURCE_BASSLINE,
            amount: 0.45,
        },
        duration: DurationDef::CrystalLevelScaled {
            track: CrystalTrack::SlotCapacity,
            base_seconds: 55.0,
            per_level_seconds: 20.0,
        },
        requirements: REQS_NONE,
        effects: EFFECTS_SLOT_CAPACITY,
        ui_order: 10,
    },
    ConstructionOptionDef {
        id: CONSTRUCTION_OUTPUT,
        schema_id: CONSTRUCTION_OUTPUT,
        label: "Output",
        group: ConstructionGroup::CrystalUpgrade,
        cost: CostDef::DrainPerWorkerSecond {
            resource_id: RESOURCE_BASSLINE,
            amount: 0.45,
        },
        duration: DurationDef::CrystalLevelScaled {
            track: CrystalTrack::Output,
            base_seconds: 35.0,
            per_level_seconds: 12.0,
        },
        requirements: REQS_NONE,
        effects: EFFECTS_OUTPUT,
        ui_order: 20,
    },
    ConstructionOptionDef {
        id: CONSTRUCTION_STORAGE,
        schema_id: CONSTRUCTION_STORAGE,
        label: "Storage",
        group: ConstructionGroup::CrystalUpgrade,
        cost: CostDef::DrainPerWorkerSecond {
            resource_id: RESOURCE_BASSLINE,
            amount: 0.45,
        },
        duration: DurationDef::CrystalLevelScaled {
            track: CrystalTrack::Storage,
            base_seconds: 28.0,
            per_level_seconds: 10.0,
        },
        requirements: REQS_NONE,
        effects: EFFECTS_STORAGE,
        ui_order: 30,
    },
    ConstructionOptionDef {
        id: CONSTRUCTION_REMOVING_MOSS,
        schema_id: CONSTRUCTION_REMOVING_MOSS,
        label: "Removing Moss",
        group: ConstructionGroup::CrystalUpgrade,
        cost: CostDef::TimeOnly,
        duration: DurationDef::Fixed { seconds: 10.0 },
        requirements: REQS_REMOVING_MOSS,
        effects: EFFECTS_REMOVING_MOSS,
        ui_order: 40,
    },
    ConstructionOptionDef {
        id: CONSTRUCTION_POLISH_FIELD,
        schema_id: CONSTRUCTION_POLISH_FIELD,
        label: "Polish Crystal Base",
        group: ConstructionGroup::CrystalUpgrade,
        cost: CostDef::UpfrontBundle {
            costs: COSTS_FIELD_POLISH,
        },
        duration: DurationDef::Fixed { seconds: 4.0 },
        requirements: REQS_FIELD_POLISH,
        effects: EFFECTS_FIELD_POLISH,
        ui_order: 45,
    },
    ConstructionOptionDef {
        id: PROJECT_RESTORE_STUDIO,
        schema_id: PROJECT_RESTORE_STUDIO,
        label: "Restore Studio",
        group: ConstructionGroup::BaseProject,
        cost: CostDef::Upfront {
            resource_id: RESOURCE_STONE,
            amount: 600.0,
        },
        duration: DurationDef::Fixed { seconds: 12.0 },
        requirements: REQS_RESTORE_STUDIO,
        effects: EFFECTS_RESTORE_STUDIO,
        ui_order: 50,
    },
    ConstructionOptionDef {
        id: PROJECT_BUILD_FIRE_PIT,
        schema_id: PROJECT_BUILD_FIRE_PIT,
        label: "Build Fire Pit",
        group: ConstructionGroup::BaseProject,
        cost: CostDef::Upfront {
            resource_id: RESOURCE_STONE,
            amount: 200.0,
        },
        duration: DurationDef::Fixed { seconds: 4.0 },
        requirements: REQS_BUILD_FIRE_PIT,
        effects: EFFECTS_BUILD_FIRE_PIT,
        ui_order: 60,
    },
    ConstructionOptionDef {
        id: PROJECT_BUILD_RESONANCE_CHAMBER,
        schema_id: PROJECT_BUILD_RESONANCE_CHAMBER,
        label: "Build Resonance Chamber",
        group: ConstructionGroup::BaseProject,
        cost: CostDef::Upfront {
            resource_id: RESOURCE_STONE,
            amount: 320.0,
        },
        duration: DurationDef::Fixed { seconds: 8.0 },
        requirements: REQS_BUILD_RESONANCE_CHAMBER,
        effects: EFFECTS_BUILD_RESONANCE_CHAMBER,
        ui_order: 70,
    },
    ConstructionOptionDef {
        id: PROJECT_BUILD_MIX_CONSOLE,
        schema_id: PROJECT_BUILD_MIX_CONSOLE,
        label: "Build Mix Console",
        group: ConstructionGroup::BaseProject,
        cost: CostDef::Upfront {
            resource_id: RESOURCE_STONE,
            amount: 420.0,
        },
        duration: DurationDef::Fixed { seconds: 10.0 },
        requirements: REQS_BUILD_MIX_CONSOLE,
        effects: EFFECTS_BUILD_MIX_CONSOLE,
        ui_order: 80,
    },
    ConstructionOptionDef {
        id: PROJECT_BUILD_WORKSHOP,
        schema_id: PROJECT_BUILD_WORKSHOP,
        label: "Build Workshop",
        group: ConstructionGroup::BaseProject,
        cost: CostDef::Upfront {
            resource_id: RESOURCE_STONE,
            amount: 260.0,
        },
        duration: DurationDef::Fixed { seconds: 8.0 },
        requirements: REQS_BUILD_WORKSHOP,
        effects: EFFECTS_BUILD_WORKSHOP,
        ui_order: 90,
    },
    ConstructionOptionDef {
        id: PROJECT_BUILD_RESEARCH_BOOTH,
        schema_id: PROJECT_BUILD_RESEARCH_BOOTH,
        label: "Build Research Booth",
        group: ConstructionGroup::BaseProject,
        cost: CostDef::Upfront {
            resource_id: RESOURCE_STONE,
            amount: 360.0,
        },
        duration: DurationDef::Fixed { seconds: 10.0 },
        requirements: REQS_BUILD_RESEARCH_BOOTH,
        effects: EFFECTS_BUILD_RESEARCH_BOOTH,
        ui_order: 100,
    },
];

const STATIONS: &[StationDef] = &[
    StationDef {
        id: STATION_CRYSTAL_CIRCLE,
        schema_id: STATION_CRYSTAL_CIRCLE,
        label: "Crystal Circle",
        category: StationCategory::Crystal,
        chorus_upkeep_per_second: 0.0,
        manual_power: false,
        starts_requested: true,
        requirements: REQS_NONE,
        ui_order: 10,
    },
    StationDef {
        id: STATION_FIRE_PIT,
        schema_id: STATION_FIRE_PIT,
        label: "Fire Pit",
        category: StationCategory::Social,
        chorus_upkeep_per_second: 0.0,
        manual_power: false,
        starts_requested: true,
        requirements: &[RequirementDef::FlagSet(FLAG_BASE_FIRE_PIT_BUILT)],
        ui_order: 20,
    },
    StationDef {
        id: STATION_RESONANCE_CHAMBER,
        schema_id: STATION_RESONANCE_CHAMBER,
        label: "Resonance Chamber",
        category: StationCategory::Power,
        chorus_upkeep_per_second: 0.12,
        manual_power: true,
        starts_requested: true,
        requirements: &[RequirementDef::FlagSet(FLAG_BASE_RESONANCE_CHAMBER_BUILT)],
        ui_order: 30,
    },
    StationDef {
        id: STATION_MIX_CONSOLE,
        schema_id: STATION_MIX_CONSOLE,
        label: "Mix Console",
        category: StationCategory::Tuning,
        chorus_upkeep_per_second: 0.16,
        manual_power: true,
        starts_requested: true,
        requirements: &[RequirementDef::FlagSet(FLAG_BASE_MIX_CONSOLE_BUILT)],
        ui_order: 40,
    },
    StationDef {
        id: STATION_WORKSHOP,
        schema_id: STATION_WORKSHOP,
        label: "Workshop",
        category: StationCategory::Crafting,
        chorus_upkeep_per_second: 0.10,
        manual_power: true,
        starts_requested: true,
        requirements: &[RequirementDef::FlagSet(FLAG_BASE_WORKSHOP_BUILT)],
        ui_order: 50,
    },
    StationDef {
        id: STATION_RESEARCH_BOOTH,
        schema_id: STATION_RESEARCH_BOOTH,
        label: "Research Booth",
        category: StationCategory::Research,
        chorus_upkeep_per_second: 0.14,
        manual_power: true,
        starts_requested: true,
        requirements: &[RequirementDef::FlagSet(FLAG_BASE_RESEARCH_BOOTH_BUILT)],
        ui_order: 60,
    },
];

const WORLD_ACTIONS: &[WorldActionDef] = &[
    WorldActionDef {
        id: WORLD_ACTION_INVESTIGATE_BASE,
        schema_id: WORLD_ACTION_INVESTIGATE_BASE,
        label: "Investigate Base",
        duration_seconds: 5.0,
        hero_only: true,
        offline_progress: false,
        hero_exposure: HeroExposureDef::Studio,
        return_to_bubble_seconds: 0.0,
        return_to_studio_seconds: 0.0,
        requirements: REQS_INVESTIGATE_BASE,
        effects: EFFECTS_INVESTIGATE_BASE,
        ui_order: 10,
    },
    WorldActionDef {
        id: WORLD_ACTION_EXPLORE_BASE,
        schema_id: WORLD_ACTION_EXPLORE_BASE,
        label: "Explore Base",
        duration_seconds: 10.0,
        hero_only: true,
        offline_progress: false,
        hero_exposure: HeroExposureDef::OutsideBubble,
        return_to_bubble_seconds: 2.0,
        return_to_studio_seconds: 4.0,
        requirements: REQS_EXPLORE_BASE,
        effects: EFFECTS_EXPLORE_BASE,
        ui_order: 20,
    },
];

const STORY_CHOICES_ROAD_TO_BASE: &[StoryChoiceDef] = &[
    StoryChoiceDef {
        id: "story.choice.road.follow_signal",
        label: "Follow the low signal",
        response: "You stay on the broken road because the distant hum feels like the only promise left.",
    },
    StoryChoiceDef {
        id: "story.choice.road.keep_moving",
        label: "Keep moving through the ash",
        response: "You refuse to stop moving. If there is shelter ahead, momentum will find it first.",
    },
];

const STORY_CHOICES_FIRST_GLIMPSE: &[StoryChoiceDef] = &[
    StoryChoiceDef {
        id: "story.choice.glimpse.watch_lights",
        label: "Study the lights",
        response: "The light pulses in time with the hum. Someone built this place to keep something worse outside.",
    },
    StoryChoiceDef {
        id: "story.choice.glimpse.scan_ruins",
        label: "Scan the ruins",
        response: "The outer shell is wrecked, but the center still breathes. The Base might be dying, not dead.",
    },
];

const STORY_CHOICES_ENTER_THE_BUBBLE: &[StoryChoiceDef] = &[
    StoryChoiceDef {
        id: "story.choice.bubble.trust_sound",
        label: "Trust the sound wall",
        response: "The pressure eases as soon as you cross the edge. The Bubble is weak, but it is real.",
    },
    StoryChoiceDef {
        id: "story.choice.bubble.touch_air",
        label: "Test the air first",
        response: "Your hand trembles at the border. Inside the Bubble, the noise of the world finally steps back.",
    },
];

const STORY_CHOICES_INVESTIGATE_BASE: &[StoryChoiceDef] = &[
    StoryChoiceDef {
        id: "story.choice.investigate.search_power",
        label: "Search for surviving systems",
        response: "If anything still runs here, it will tell you what can be saved.",
    },
    StoryChoiceDef {
        id: "story.choice.investigate.trace_hum",
        label: "Trace the hum through the walls",
        response: "The sound has a source. If you can reach it, the Base might answer back.",
    },
];

const STORY_CHOICES_EXPLORE_BASE: &[StoryChoiceDef] = &[
    StoryChoiceDef {
        id: "story.choice.explore.look_for_tools",
        label: "Look for tools and salvage",
        response: "You push deeper, looking for anything that can turn ruins into repairs.",
    },
    StoryChoiceDef {
        id: "story.choice.explore.look_for_rooms",
        label: "Look for livable rooms",
        response: "If more people are coming, they will need more than a miracle. They will need a place to stay.",
    },
];

const STORY_BEATS: &[StoryBeatDef] = &[
    StoryBeatDef {
        id: STORY_BEAT_ROAD_TO_BASE,
        schema_id: STORY_BEAT_ROAD_TO_BASE,
        label: "Road to Base",
        body: "The last safe road is a scar through dead ground. Somewhere ahead, a weak musical hum is still holding back the static.",
        arc: "pre_arrival",
        sequence: 10,
        world_action_id: None,
        choices: STORY_CHOICES_ROAD_TO_BASE,
        related_ids: &[TILE_BASE_CORE, STRUCTURE_BASE],
    },
    StoryBeatDef {
        id: STORY_BEAT_FIRST_GLIMPSE,
        schema_id: STORY_BEAT_FIRST_GLIMPSE,
        label: "First Glimpse",
        body: "From the ridge, you finally see it: a broken complex wrapped in a thin blue halo. The Base is still standing for now.",
        arc: "pre_arrival",
        sequence: 20,
        world_action_id: None,
        choices: STORY_CHOICES_FIRST_GLIMPSE,
        related_ids: &[TILE_RIDGE_LINE, TILE_BASE_CORE, STRUCTURE_CRYSTAL_CIRCLE],
    },
    StoryBeatDef {
        id: STORY_BEAT_ENTER_THE_BUBBLE,
        schema_id: STORY_BEAT_ENTER_THE_BUBBLE,
        label: "Enter the Bubble",
        body: "Crossing the boundary changes everything. The pressure drops, the noise thins, and the Crystal's pulse becomes a direction instead of a warning.",
        arc: "pre_arrival",
        sequence: 30,
        world_action_id: None,
        choices: STORY_CHOICES_ENTER_THE_BUBBLE,
        related_ids: &[RESOURCE_BASSLINE, STATION_CRYSTAL_CIRCLE, TILE_BASE_CORE],
    },
    StoryBeatDef {
        id: STORY_BEAT_INVESTIGATE_BASE,
        schema_id: STORY_BEAT_INVESTIGATE_BASE,
        label: "Investigate Base",
        body: "The first sweep is about triage. Find what still works, what is beyond repair, and what the Base needs before it collapses completely.",
        arc: "base_onboarding",
        sequence: 40,
        world_action_id: Some(WORLD_ACTION_INVESTIGATE_BASE),
        choices: STORY_CHOICES_INVESTIGATE_BASE,
        related_ids: &[WORLD_ACTION_INVESTIGATE_BASE, STORY_BEAT_EXPLORE_BASE, STRUCTURE_BASE],
    },
    StoryBeatDef {
        id: STORY_BEAT_EXPLORE_BASE,
        schema_id: STORY_BEAT_EXPLORE_BASE,
        label: "Explore Base",
        body: "Now go deeper. The first repair loop is buried somewhere inside the ruin, along with the pieces you need to wake the Base back up.",
        arc: "base_onboarding",
        sequence: 50,
        world_action_id: Some(WORLD_ACTION_EXPLORE_BASE),
        choices: STORY_CHOICES_EXPLORE_BASE,
        related_ids: &[WORLD_ACTION_EXPLORE_BASE, PROJECT_RESTORE_STUDIO, CONSTRUCTION_REMOVING_MOSS, RESOURCE_WATER],
    },
    StoryBeatDef {
        id: STORY_BEAT_RESTORE_STUDIO,
        schema_id: STORY_BEAT_RESTORE_STUDIO,
        label: "Restore Studio",
        body: "The Studio is the first room worth saving. If you can bring it back, the Base can start singing again.",
        arc: "base_onboarding",
        sequence: 60,
        world_action_id: None,
        choices: &[],
        related_ids: &[PROJECT_RESTORE_STUDIO, RESOURCE_CHORUS, PROJECT_BUILD_FIRE_PIT],
    },
    StoryBeatDef {
        id: STORY_BEAT_BUILD_FIRE_PIT,
        schema_id: STORY_BEAT_BUILD_FIRE_PIT,
        label: "Build Fire Pit",
        body: "The Fire Pit is less about heat than rhythm. People gather around steady signals before they trust walls and wiring.",
        arc: "base_onboarding",
        sequence: 70,
        world_action_id: None,
        choices: &[],
        related_ids: &[PROJECT_BUILD_FIRE_PIT, STATION_FIRE_PIT, STORY_BEAT_REACH_SURVIVOR_CAVE, UI_ACTION_RECRUIT],
    },
    StoryBeatDef {
        id: STORY_BEAT_REACH_SURVIVOR_CAVE,
        schema_id: STORY_BEAT_REACH_SURVIVOR_CAVE,
        label: "Reach Survivor Cave",
        body: "If the Bubble holds long enough, its edge will brush the cave where the next survivors are hiding.",
        arc: "base_onboarding",
        sequence: 75,
        world_action_id: None,
        choices: &[],
        related_ids: &[TILE_SURVIVOR_CAVE, UI_MAP_CAVE_GATE, STORY_BEAT_FIRST_RECRUIT],
    },
    StoryBeatDef {
        id: STORY_BEAT_FIRST_RECRUIT,
        schema_id: STORY_BEAT_FIRST_RECRUIT,
        label: "First Survivor Recruited",
        body: "The first recruit is proof the Base is more than a shelter. It is becoming a place people can choose.",
        arc: "base_onboarding",
        sequence: 80,
        world_action_id: None,
        choices: &[],
        related_ids: &[UI_ACTION_RECRUIT, TILE_SURVIVOR_CAVE, UI_STATUS_BASE_RECRUITS, STORY_BEAT_AWAIT_SURVIVOR_ARRIVAL],
    },
    StoryBeatDef {
        id: STORY_BEAT_AWAIT_SURVIVOR_ARRIVAL,
        schema_id: STORY_BEAT_AWAIT_SURVIVOR_ARRIVAL,
        label: "Await Survivor Arrival",
        body: "Signal the route. Keep the Base stable. A promise only matters if someone can safely walk into it.",
        arc: "base_onboarding",
        sequence: 85,
        world_action_id: None,
        choices: &[],
        related_ids: &[UI_STATUS_BASE_RECRUITS, STORY_BEAT_STABILIZE_BASE],
    },
    StoryBeatDef {
        id: STORY_BEAT_STABILIZE_BASE,
        schema_id: STORY_BEAT_STABILIZE_BASE,
        label: "Stabilize the Base",
        body: "The Base is alive, but not safe yet. Power, morale, housing, and sound all need to hold at once now.",
        arc: "base_onboarding",
        sequence: 90,
        world_action_id: None,
        choices: &[],
        related_ids: &[RESOURCE_CHORUS, RESOURCE_HARMONICS, UI_PANEL_POWER, UI_PANEL_BASE],
    },
];

const FLAGS: &[FlagDef] = &[
    FlagDef { id: FLAG_BASE_STUDIO_RESTORE_UNLOCKED, label: "Studio Repair Unlocked", group: "base" },
    FlagDef { id: FLAG_BASE_STUDIO_RESTORED, label: "Studio Restored", group: "base" },
    FlagDef { id: FLAG_BASE_FIRE_PIT_BUILT, label: "Fire Pit Built", group: "base" },
    FlagDef { id: FLAG_BASE_RESONANCE_CHAMBER_BUILT, label: "Resonance Chamber Built", group: "base" },
    FlagDef { id: FLAG_BASE_MIX_CONSOLE_BUILT, label: "Mix Console Built", group: "base" },
    FlagDef { id: FLAG_BASE_WORKSHOP_BUILT, label: "Workshop Built", group: "base" },
    FlagDef { id: FLAG_BASE_RESEARCH_BOOTH_BUILT, label: "Research Booth Built", group: "base" },
    FlagDef { id: FLAG_BASE_TUTORIAL_INVESTIGATED, label: "Base Investigated", group: "tutorial" },
    FlagDef { id: FLAG_BASE_TUTORIAL_EXPLORED, label: "Base Explored", group: "tutorial" },
    FlagDef { id: FLAG_BASE_WATER_COLLECTION_UNLOCKED, label: "Water Collection Unlocked", group: "base" },
    FlagDef { id: FLAG_CRYSTAL_REMOVING_MOSS_UNLOCKED, label: "Removing Moss Unlocked", group: "crystal" },
    FlagDef { id: FLAG_CRYSTAL_REMOVING_MOSS_COMPLETED, label: "Removing Moss Completed", group: "crystal" },
    FlagDef { id: FLAG_HERO_OUTSIDE_BUBBLE, label: "Hero Outside Bubble", group: "hero" },
    FlagDef { id: FLAG_HERO_FORCED_RETURN_ACTIVE, label: "Forced Return Active", group: "hero" },
    FlagDef { id: FLAG_HERO_RECOVERING_AT_STUDIO, label: "Recovering At Studio", group: "hero" },
];

const PROCESSING_RECIPES: &[ProcessingRecipeDef] = &[
    ProcessingRecipeDef {
        id: RECIPE_RESONANCE_FIELD_CALIBRATION,
        schema_id: RECIPE_RESONANCE_FIELD_CALIBRATION,
        label: "Field Calibration",
        station_id: STATION_RESONANCE_CHAMBER,
        cost: CostDef::UpfrontBundle {
            costs: COSTS_RESONANCE_FIELD_CALIBRATION,
        },
        duration: DurationDef::Fixed { seconds: 10.0 },
        requirements: &[RequirementDef::FlagSet(FLAG_BASE_RESONANCE_CHAMBER_BUILT)],
        effects: EFFECTS_RESONANCE_FIELD_CALIBRATION,
        max_level: 5,
        ui_order: 10,
    },
    ProcessingRecipeDef {
        id: RECIPE_MIX_SIGNAL_BALANCING,
        schema_id: RECIPE_MIX_SIGNAL_BALANCING,
        label: "Signal Balancing",
        station_id: STATION_MIX_CONSOLE,
        cost: CostDef::UpfrontBundle {
            costs: COSTS_MIX_SIGNAL_BALANCING,
        },
        duration: DurationDef::Fixed { seconds: 12.0 },
        requirements: &[RequirementDef::FlagSet(FLAG_BASE_MIX_CONSOLE_BUILT)],
        effects: EFFECTS_MIX_SIGNAL_BALANCING,
        max_level: 5,
        ui_order: 20,
    },
    ProcessingRecipeDef {
        id: RECIPE_WORKSHOP_BUILDER_TOOLS,
        schema_id: RECIPE_WORKSHOP_BUILDER_TOOLS,
        label: "Builder Tools",
        station_id: STATION_WORKSHOP,
        cost: CostDef::UpfrontBundle {
            costs: COSTS_WORKSHOP_BUILDER_TOOLS,
        },
        duration: DurationDef::Fixed { seconds: 14.0 },
        requirements: &[RequirementDef::FlagSet(FLAG_BASE_WORKSHOP_BUILT)],
        effects: EFFECTS_WORKSHOP_BUILDER_TOOLS,
        max_level: 5,
        ui_order: 30,
    },
    ProcessingRecipeDef {
        id: RECIPE_WORKSHOP_WATER_CONDENSERS,
        schema_id: RECIPE_WORKSHOP_WATER_CONDENSERS,
        label: "Water Condensers",
        station_id: STATION_WORKSHOP,
        cost: CostDef::UpfrontBundle {
            costs: COSTS_WORKSHOP_WATER_CONDENSERS,
        },
        duration: DurationDef::Fixed { seconds: 12.0 },
        requirements: &[RequirementDef::FlagSet(FLAG_BASE_WORKSHOP_BUILT)],
        effects: EFFECTS_WORKSHOP_WATER_CONDENSERS,
        max_level: 5,
        ui_order: 40,
    },
    ProcessingRecipeDef {
        id: RECIPE_RESEARCH_CHORUS_ROUTING,
        schema_id: RECIPE_RESEARCH_CHORUS_ROUTING,
        label: "Chorus Routing",
        station_id: STATION_RESEARCH_BOOTH,
        cost: CostDef::UpfrontBundle {
            costs: COSTS_RESEARCH_CHORUS_ROUTING,
        },
        duration: DurationDef::Fixed { seconds: 16.0 },
        requirements: &[RequirementDef::FlagSet(FLAG_BASE_RESEARCH_BOOTH_BUILT)],
        effects: EFFECTS_RESEARCH_CHORUS_ROUTING,
        max_level: 5,
        ui_order: 50,
    },
    ProcessingRecipeDef {
        id: RECIPE_RESEARCH_HARMONIC_STUDY,
        schema_id: RECIPE_RESEARCH_HARMONIC_STUDY,
        label: "Harmonic Study",
        station_id: STATION_RESEARCH_BOOTH,
        cost: CostDef::UpfrontBundle {
            costs: COSTS_RESEARCH_HARMONIC_STUDY,
        },
        duration: DurationDef::Fixed { seconds: 18.0 },
        requirements: &[RequirementDef::FlagSet(FLAG_BASE_RESEARCH_BOOTH_BUILT)],
        effects: EFFECTS_RESEARCH_HARMONIC_STUDY,
        max_level: 5,
        ui_order: 60,
    },
];

const TILE_TAGS_BASE: &[TileTag] = &[TileTag::Base, TileTag::Sanctuary, TileTag::ConstructionAnchor];
const TILE_TAGS_PLAINS: &[TileTag] = &[TileTag::OpenGround];
const TILE_TAGS_RIVER: &[TileTag] = &[TileTag::WaterSource, TileTag::EasyPropagation];
const TILE_TAGS_SCRUB: &[TileTag] = &[TileTag::Brush, TileTag::Harvestable];
const TILE_TAGS_RIDGE: &[TileTag] = &[TileTag::Elevated, TileTag::HighImpedance];
const TILE_TAGS_MOUNTAIN: &[TileTag] = &[TileTag::Blocker, TileTag::Wall];
const TILE_TAGS_CAVE: &[TileTag] = &[TileTag::Landmark, TileTag::RecruitmentSource];

const FLORA: &[FloraDef] = &[
    FloraDef {
        id: FLORA_REEDS,
        schema_id: FLORA_REEDS,
        label: "Reeds",
        kind: FloraKind::Reeds,
        tags: TILE_TAGS_RIVER,
    },
    FloraDef {
        id: FLORA_SCRUB,
        schema_id: FLORA_SCRUB,
        label: "Scrub",
        kind: FloraKind::Scrub,
        tags: TILE_TAGS_SCRUB,
    },
];

const STRUCTURES: &[StructureDef] = &[
    StructureDef {
        id: STRUCTURE_CRYSTAL_CIRCLE,
        schema_id: STRUCTURE_CRYSTAL_CIRCLE,
        label: "Crystal Circle",
        kind: StructureKind::CrystalCircle,
        tags: TILE_TAGS_BASE,
    },
    StructureDef {
        id: STRUCTURE_BASE,
        schema_id: STRUCTURE_BASE,
        label: "Base",
        kind: StructureKind::Base,
        tags: TILE_TAGS_BASE,
    },
    StructureDef {
        id: STRUCTURE_CAVE,
        schema_id: STRUCTURE_CAVE,
        label: "Cave",
        kind: StructureKind::Cave,
        tags: TILE_TAGS_CAVE,
    },
];

const TILES: &[TileDef] = &[
    TileDef {
        id: TILE_BASE_CORE,
        schema_id: TILE_BASE_CORE,
        label: "Base Core",
        terrain: TerrainSnapshot::Plains,
        feature: TileFeature::Base,
        impedance: TERRAIN_PLAINS_IMPEDANCE,
        is_blocker: false,
        tags: TILE_TAGS_BASE,
        flora_ids: &[],
        structure_ids: &[STRUCTURE_CRYSTAL_CIRCLE, STRUCTURE_BASE],
        dungeon_ids: &[DUNGEON_STUDIO],
        building_capacity: 3,
    },
    TileDef {
        id: TILE_PLAINS_OPEN,
        schema_id: TILE_PLAINS_OPEN,
        label: "Open Plains",
        terrain: TerrainSnapshot::Plains,
        feature: TileFeature::None,
        impedance: TERRAIN_PLAINS_IMPEDANCE,
        is_blocker: false,
        tags: TILE_TAGS_PLAINS,
        flora_ids: &[],
        structure_ids: &[],
        dungeon_ids: &[],
        building_capacity: 1,
    },
    TileDef {
        id: TILE_RIVER_SHALLOWS,
        schema_id: TILE_RIVER_SHALLOWS,
        label: "River Shallows",
        terrain: TerrainSnapshot::River,
        feature: TileFeature::None,
        impedance: TERRAIN_RIVER_IMPEDANCE,
        is_blocker: false,
        tags: TILE_TAGS_RIVER,
        flora_ids: &[FLORA_REEDS],
        structure_ids: &[],
        dungeon_ids: &[],
        building_capacity: 0,
    },
    TileDef {
        id: TILE_SCRUB_PATCH,
        schema_id: TILE_SCRUB_PATCH,
        label: "Scrub Patch",
        terrain: TerrainSnapshot::Scrub,
        feature: TileFeature::None,
        impedance: TERRAIN_SCRUB_IMPEDANCE,
        is_blocker: false,
        tags: TILE_TAGS_SCRUB,
        flora_ids: &[FLORA_SCRUB],
        structure_ids: &[],
        dungeon_ids: &[],
        building_capacity: 1,
    },
    TileDef {
        id: TILE_RIDGE_LINE,
        schema_id: TILE_RIDGE_LINE,
        label: "Ridge Line",
        terrain: TerrainSnapshot::Ridge,
        feature: TileFeature::None,
        impedance: TERRAIN_RIDGE_IMPEDANCE,
        is_blocker: false,
        tags: TILE_TAGS_RIDGE,
        flora_ids: &[],
        structure_ids: &[],
        dungeon_ids: &[],
        building_capacity: 0,
    },
    TileDef {
        id: TILE_MOUNTAIN_WALL,
        schema_id: TILE_MOUNTAIN_WALL,
        label: "Mountain Wall",
        terrain: TerrainSnapshot::Mountain,
        feature: TileFeature::None,
        impedance: TERRAIN_MOUNTAIN_IMPEDANCE,
        is_blocker: true,
        tags: TILE_TAGS_MOUNTAIN,
        flora_ids: &[],
        structure_ids: &[],
        dungeon_ids: &[],
        building_capacity: 0,
    },
    TileDef {
        id: TILE_SURVIVOR_CAVE,
        schema_id: TILE_SURVIVOR_CAVE,
        label: "Survivor Cave",
        terrain: TerrainSnapshot::Plains,
        feature: TileFeature::SurvivorCave,
        impedance: TERRAIN_PLAINS_IMPEDANCE,
        is_blocker: false,
        tags: TILE_TAGS_CAVE,
        flora_ids: &[],
        structure_ids: &[STRUCTURE_CAVE],
        dungeon_ids: &[DUNGEON_SURVIVOR_CAVE],
        building_capacity: 0,
    },
];

const ENTITY_SCHEMAS: &[EntitySchemaDef] = &[
    EntitySchemaDef {
        id: RESOURCE_BASSLINE,
        entity_kind: EntityKind::Resource,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::SaveSlot,
            tuning_affinity: TuningAffinity::Tuned,
            resets_on_tuning: true,
        }),
        unlocks: &[],
        blockers: &[BlockerDef {
            kind: BlockerKind::BlockedAtCap,
            label: "Overflow is lost when Bassline storage is full.",
            related_ids: &[RESOURCE_BASSLINE],
        }],
        access_rules: &[],
        power: None,
        flows: &[
            FlowDef {
                item_id: RESOURCE_BASSLINE,
                label: "Crystal Bassline staffing generates stored Bassline.",
                direction: FlowDirection::Output,
                cadence: FlowCadence::PerSecond,
                related_ids: &[ROLE_CRYSTAL_BASSLINE],
            },
            FlowDef {
                item_id: RESOURCE_BASSLINE,
                label: "Removing Moss adds passive Bassline.",
                direction: FlowDirection::Output,
                cadence: FlowCadence::Passive,
                related_ids: &[CONSTRUCTION_REMOVING_MOSS],
            },
            FlowDef {
                item_id: RESOURCE_BASSLINE,
                label: "Crystal upgrades drain Bassline while builders work.",
                direction: FlowDirection::Input,
                cadence: FlowCadence::PerWorkerSecond,
                related_ids: &[
                    CONSTRUCTION_SLOT_CAPACITY,
                    CONSTRUCTION_OUTPUT,
                    CONSTRUCTION_STORAGE,
                    CONSTRUCTION_POLISH_FIELD,
                ],
            },
        ],
        model_refs: &[
            ModelRefDef {
                kind: ModelKind::Bubble,
                reference_id: "field_k_base",
                label: "Bubble coverage is budgeted from stored Bassline.",
            },
            ModelRefDef {
                kind: ModelKind::Storage,
                reference_id: "overflow_lost",
                label: "Overflow is discarded at cap.",
            },
        ],
        notes: &["Bassline is both a stored resource and the active bubble budget anchor."],
    },
    EntitySchemaDef {
        id: RESOURCE_CHORUS,
        entity_kind: EntityKind::Resource,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::SaveSlot,
            tuning_affinity: TuningAffinity::Tuned,
            resets_on_tuning: true,
        }),
        unlocks: &[UnlockDef {
            kind: UnlockKind::Construction,
            label: "Restore Studio to unlock Chorus production.",
            related_ids: &[FLAG_BASE_STUDIO_RESTORED],
        }],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::MissingRequirement,
                label: "Chorus staffing is locked until the Studio is restored.",
                related_ids: &[FLAG_BASE_STUDIO_RESTORED],
            },
            BlockerDef {
                kind: BlockerKind::BlockedAtCap,
                label: "Overflow is lost when Chorus storage is full.",
                related_ids: &[RESOURCE_CHORUS],
            },
        ],
        access_rules: &[],
        power: None,
        flows: &[
            FlowDef {
                item_id: RESOURCE_CHORUS,
                label: "Crystal Chorus staffing generates stored Chorus.",
                direction: FlowDirection::Output,
                cadence: FlowCadence::PerSecond,
                related_ids: &[ROLE_CRYSTAL_CHORUS],
            },
            FlowDef {
                item_id: RESOURCE_CHORUS,
                label: "Life support always consumes Chorus when active staff exceed the free allowance.",
                direction: FlowDirection::Input,
                cadence: FlowCadence::PerSecond,
                related_ids: &[ROLE_CRYSTAL_BASSLINE, ROLE_CRYSTAL_CHORUS, ROLE_CRYSTAL_HARMONICS, ROLE_CONSTRUCTION, ROLE_FIRE_PIT, ROLE_SCAVENGE, ROLE_WATER],
            },
            FlowDef {
                item_id: RESOURCE_CHORUS,
                label: "Manual stations consume Chorus while powered.",
                direction: FlowDirection::Input,
                cadence: FlowCadence::WhilePowered,
                related_ids: &[STATION_RESONANCE_CHAMBER, STATION_MIX_CONSOLE, STATION_WORKSHOP, STATION_RESEARCH_BOOTH],
            },
        ],
        model_refs: &[
            ModelRefDef {
                kind: ModelKind::Power,
                reference_id: "manual_station_upkeep_multiplier",
                label: "Harmonics tiers alter Chorus upkeep.",
            },
            ModelRefDef {
                kind: ModelKind::Storage,
                reference_id: "overflow_lost",
                label: "Overflow is discarded at cap.",
            },
        ],
        notes: &["Chorus is the power rail for stations and life support."],
    },
    EntitySchemaDef {
        id: RESOURCE_HARMONICS,
        entity_kind: EntityKind::Resource,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::SaveSlot,
            tuning_affinity: TuningAffinity::Tuned,
            resets_on_tuning: true,
        }),
        unlocks: &[UnlockDef {
            kind: UnlockKind::Construction,
            label: "Build Resonance Chamber to unlock Harmonics production.",
            related_ids: &[FLAG_BASE_RESONANCE_CHAMBER_BUILT],
        }],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::MissingRequirement,
                label: "Harmonics staffing is locked until the Resonance Chamber is built.",
                related_ids: &[FLAG_BASE_RESONANCE_CHAMBER_BUILT],
            },
            BlockerDef {
                kind: BlockerKind::BlockedAtCap,
                label: "Overflow is lost when Harmonics storage is full.",
                related_ids: &[RESOURCE_HARMONICS],
            },
        ],
        access_rules: &[],
        power: None,
        flows: &[
            FlowDef {
                item_id: RESOURCE_HARMONICS,
                label: "Crystal Harmonics staffing generates stored Harmonics.",
                direction: FlowDirection::Output,
                cadence: FlowCadence::PerSecond,
                related_ids: &[ROLE_CRYSTAL_HARMONICS],
            },
            FlowDef {
                item_id: RESOURCE_HARMONICS,
                label: "Harmonics feeds tier thresholds and output multipliers.",
                direction: FlowDirection::Pressure,
                cadence: FlowCadence::PerSecond,
                related_ids: &[STATION_RESONANCE_CHAMBER, STATION_MIX_CONSOLE],
            },
        ],
        model_refs: &[
            ModelRefDef {
                kind: ModelKind::Power,
                reference_id: "harmonics_tier_thresholds",
                label: "Harmonics generation rate determines the active tier.",
            },
            ModelRefDef {
                kind: ModelKind::Power,
                reference_id: "harmonics_continuous_bonus",
                label: "Continuous Harmonics output boosts efficiency before tiers.",
            },
        ],
        notes: &["Harmonics is a structural efficiency resource, not a direct upkeep pool."],
    },
    EntitySchemaDef {
        id: RESOURCE_STONE,
        entity_kind: EntityKind::Resource,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::SaveSlot,
            tuning_affinity: TuningAffinity::Untuned,
            resets_on_tuning: false,
        }),
        unlocks: &[],
        blockers: &[BlockerDef {
            kind: BlockerKind::BlockedAtCap,
            label: "Stone collection pauses at cap.",
            related_ids: &[RESOURCE_STONE],
        }],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "Base scavenging is available on the Base tile.",
            related_ids: &[ROLE_SCAVENGE],
        }],
        power: None,
        flows: &[
            FlowDef {
                item_id: RESOURCE_STONE,
                label: "Scavenge Crew gathers Stone from Base stock while online.",
                direction: FlowDirection::Output,
                cadence: FlowCadence::WhileStaffed,
                related_ids: &[ROLE_SCAVENGE],
            },
            FlowDef {
                item_id: RESOURCE_STONE,
                label: "Base projects and processing spend Stone upfront.",
                direction: FlowDirection::Input,
                cadence: FlowCadence::OnStart,
                related_ids: &[
                    PROJECT_RESTORE_STUDIO,
                    PROJECT_BUILD_FIRE_PIT,
                    PROJECT_BUILD_RESONANCE_CHAMBER,
                    PROJECT_BUILD_MIX_CONSOLE,
                    PROJECT_BUILD_WORKSHOP,
                    PROJECT_BUILD_RESEARCH_BOOTH,
                    RECIPE_RESONANCE_FIELD_CALIBRATION,
                    RECIPE_MIX_SIGNAL_BALANCING,
                    RECIPE_WORKSHOP_BUILDER_TOOLS,
                    RECIPE_WORKSHOP_WATER_CONDENSERS,
                    RECIPE_RESEARCH_CHORUS_ROUTING,
                    RECIPE_RESEARCH_HARMONIC_STUDY,
                ],
            },
        ],
        model_refs: &[ModelRefDef {
            kind: ModelKind::Storage,
            reference_id: "blocked_at_cap",
            label: "Collection pauses at cap instead of losing overflow.",
        }],
        notes: &["Stone is an untuned material and the first hard construction gate."],
    },
    EntitySchemaDef {
        id: RESOURCE_WATER,
        entity_kind: EntityKind::Resource,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::SaveSlot,
            tuning_affinity: TuningAffinity::Untuned,
            resets_on_tuning: false,
        }),
        unlocks: &[UnlockDef {
            kind: UnlockKind::Story,
            label: "Explore Base unlocks Water collection.",
            related_ids: &[FLAG_BASE_WATER_COLLECTION_UNLOCKED],
        }],
        blockers: &[BlockerDef {
            kind: BlockerKind::BlockedAtCap,
            label: "Water collection pauses at cap.",
            related_ids: &[RESOURCE_WATER],
        }],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "Water collection is a Base-tile action.",
            related_ids: &[ROLE_WATER],
        }],
        power: None,
        flows: &[
            FlowDef {
                item_id: RESOURCE_WATER,
                label: "Water Crew gathers from Base Water stock while online.",
                direction: FlowDirection::Output,
                cadence: FlowCadence::WhileStaffed,
                related_ids: &[ROLE_WATER],
            },
            FlowDef {
                item_id: RESOURCE_WATER,
                label: "Base Water stock regenerates passively.",
                direction: FlowDirection::Output,
                cadence: FlowCadence::Passive,
                related_ids: &[TILE_RIVER_SHALLOWS, TILE_BASE_CORE],
            },
            FlowDef {
                item_id: RESOURCE_WATER,
                label: "Processing and polishing consume Water upfront.",
                direction: FlowDirection::Input,
                cadence: FlowCadence::OnStart,
                related_ids: &[
                    CONSTRUCTION_POLISH_FIELD,
                    RECIPE_RESONANCE_FIELD_CALIBRATION,
                    RECIPE_MIX_SIGNAL_BALANCING,
                    RECIPE_WORKSHOP_BUILDER_TOOLS,
                    RECIPE_WORKSHOP_WATER_CONDENSERS,
                    RECIPE_RESEARCH_CHORUS_ROUTING,
                    RECIPE_RESEARCH_HARMONIC_STUDY,
                ],
            },
        ],
        model_refs: &[ModelRefDef {
            kind: ModelKind::Storage,
            reference_id: "blocked_at_cap",
            label: "Collection pauses at cap instead of losing overflow.",
        }],
        notes: &["Water is an untuned material with a separate Base stock and player pool."],
    },
    EntitySchemaDef {
        id: RESOURCE_VIBES,
        entity_kind: EntityKind::Resource,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::Run,
            tuning_affinity: TuningAffinity::Tuned,
            resets_on_tuning: true,
        }),
        unlocks: &[UnlockDef {
            kind: UnlockKind::Construction,
            label: "Build Fire Pit to start the Vibes loop.",
            related_ids: &[FLAG_BASE_FIRE_PIT_BUILT],
        }],
        blockers: &[],
        access_rules: &[],
        power: None,
        flows: &[
            FlowDef {
                item_id: RESOURCE_VIBES,
                label: "Fire Pit produces Vibes passively and from staffed crew.",
                direction: FlowDirection::Output,
                cadence: FlowCadence::PerSecond,
                related_ids: &[ROLE_FIRE_PIT, STATION_FIRE_PIT],
            },
            FlowDef {
                item_id: RESOURCE_VIBES,
                label: "Recruitment spends Vibes upfront.",
                direction: FlowDirection::Input,
                cadence: FlowCadence::OnStart,
                related_ids: &[TILE_SURVIVOR_CAVE],
            },
            FlowDef {
                item_id: RESOURCE_VIBES,
                label: "Overcrowding creates Bad Vibes pressure against the pool.",
                direction: FlowDirection::Pressure,
                cadence: FlowCadence::PerSecond,
                related_ids: &[PROJECT_BUILD_FIRE_PIT],
            },
        ],
        model_refs: &[ModelRefDef {
            kind: ModelKind::Recruitment,
            reference_id: "recruit_cost_curve_v0",
            label: "Recruit cost follows the Good Vibes curve anchors.",
        }],
        notes: &["Vibes can go negative and directly control early recruitment pacing."],
    },
    EntitySchemaDef {
        id: ROLE_CRYSTAL_BASSLINE,
        entity_kind: EntityKind::Role,
        persistence: None,
        unlocks: &[],
        blockers: &[BlockerDef {
            kind: BlockerKind::MissingStaff,
            label: "Crystal roles compete for shared free slots.",
            related_ids: &[STATION_CRYSTAL_CIRCLE],
        }],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "Crystal staffing is only available at the Base.",
            related_ids: &[STATION_CRYSTAL_CIRCLE],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: RESOURCE_BASSLINE,
            label: "Assigned staff convert time into Bassline output.",
            direction: FlowDirection::Output,
            cadence: FlowCadence::WhileStaffed,
            related_ids: &[RESOURCE_BASSLINE],
        }],
        model_refs: &[],
        notes: &["The Hero can assign here without consuming a crew slot."],
    },
    EntitySchemaDef {
        id: ROLE_CRYSTAL_CHORUS,
        entity_kind: EntityKind::Role,
        persistence: None,
        unlocks: &[UnlockDef {
            kind: UnlockKind::Construction,
            label: "Restore Studio to unlock Chorus staffing.",
            related_ids: &[FLAG_BASE_STUDIO_RESTORED],
        }],
        blockers: &[BlockerDef {
            kind: BlockerKind::MissingRequirement,
            label: "Studio must be restored before Chorus staffing exists.",
            related_ids: &[FLAG_BASE_STUDIO_RESTORED],
        }],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "Crystal staffing is only available at the Base.",
            related_ids: &[STATION_CRYSTAL_CIRCLE],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: RESOURCE_CHORUS,
            label: "Assigned staff convert time into Chorus output.",
            direction: FlowDirection::Output,
            cadence: FlowCadence::WhileStaffed,
            related_ids: &[RESOURCE_CHORUS],
        }],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: ROLE_CRYSTAL_HARMONICS,
        entity_kind: EntityKind::Role,
        persistence: None,
        unlocks: &[UnlockDef {
            kind: UnlockKind::Construction,
            label: "Build Resonance Chamber to unlock Harmonics staffing.",
            related_ids: &[FLAG_BASE_RESONANCE_CHAMBER_BUILT],
        }],
        blockers: &[BlockerDef {
            kind: BlockerKind::MissingRequirement,
            label: "Resonance Chamber must be built before Harmonics staffing exists.",
            related_ids: &[FLAG_BASE_RESONANCE_CHAMBER_BUILT],
        }],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "Crystal staffing is only available at the Base.",
            related_ids: &[STATION_CRYSTAL_CIRCLE],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: RESOURCE_HARMONICS,
            label: "Assigned staff convert time into Harmonics output.",
            direction: FlowDirection::Output,
            cadence: FlowCadence::WhileStaffed,
            related_ids: &[RESOURCE_HARMONICS],
        }],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: ROLE_CONSTRUCTION,
        entity_kind: EntityKind::Role,
        persistence: None,
        unlocks: &[],
        blockers: &[BlockerDef {
            kind: BlockerKind::Busy,
            label: "Construction crew are locked while building or restoring.",
            related_ids: &[PROJECT_RESTORE_STUDIO, PROJECT_BUILD_FIRE_PIT],
        }],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "Construction is a Base-side role.",
            related_ids: &[STRUCTURE_BASE],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: RESOURCE_BASSLINE,
            label: "Builders convert time into construction progress and may drain Bassline.",
            direction: FlowDirection::Input,
            cadence: FlowCadence::WhileStaffed,
            related_ids: &[CONSTRUCTION_SLOT_CAPACITY, CONSTRUCTION_OUTPUT, CONSTRUCTION_STORAGE],
        }],
        model_refs: &[ModelRefDef {
            kind: ModelKind::Duration,
            reference_id: "worker_blocking_construction",
            label: "Builder availability directly affects progress.",
        }],
        notes: &["Construction is a Base role and does not consume Crystal slots."],
    },
    EntitySchemaDef {
        id: ROLE_FIRE_PIT,
        entity_kind: EntityKind::Role,
        persistence: None,
        unlocks: &[UnlockDef {
            kind: UnlockKind::Construction,
            label: "Build Fire Pit to unlock Vibes staffing.",
            related_ids: &[FLAG_BASE_FIRE_PIT_BUILT],
        }],
        blockers: &[BlockerDef {
            kind: BlockerKind::MissingRequirement,
            label: "Fire Pit must be built before Vibes staffing exists.",
            related_ids: &[FLAG_BASE_FIRE_PIT_BUILT],
        }],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "Fire Pit staffing is a Base-side role.",
            related_ids: &[STATION_FIRE_PIT],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: RESOURCE_VIBES,
            label: "Fire Pit staffing increases Vibes generation.",
            direction: FlowDirection::Output,
            cadence: FlowCadence::WhileStaffed,
            related_ids: &[RESOURCE_VIBES],
        }],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: ROLE_SCAVENGE,
        entity_kind: EntityKind::Role,
        persistence: None,
        unlocks: &[],
        blockers: &[BlockerDef {
            kind: BlockerKind::BlockedAtCap,
            label: "Scavenge pauses when Stone is capped.",
            related_ids: &[RESOURCE_STONE],
        }],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "Scavenge is a Base-tile action.",
            related_ids: &[TILE_BASE_CORE],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: RESOURCE_STONE,
            label: "Scavenge Crew gathers Stone while online.",
            direction: FlowDirection::Output,
            cadence: FlowCadence::WhileStaffed,
            related_ids: &[RESOURCE_STONE],
        }],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: ROLE_WATER,
        entity_kind: EntityKind::Role,
        persistence: None,
        unlocks: &[UnlockDef {
            kind: UnlockKind::Story,
            label: "Explore Base to unlock Water collection.",
            related_ids: &[FLAG_BASE_WATER_COLLECTION_UNLOCKED],
        }],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::MissingRequirement,
                label: "Water collection is locked until the tutorial Explore completes.",
                related_ids: &[FLAG_BASE_WATER_COLLECTION_UNLOCKED],
            },
            BlockerDef {
                kind: BlockerKind::BlockedAtCap,
                label: "Water collection pauses when Water is capped.",
                related_ids: &[RESOURCE_WATER],
            },
        ],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "Water collection is a Base-tile action.",
            related_ids: &[TILE_BASE_CORE],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: RESOURCE_WATER,
            label: "Water Crew gathers Water while online.",
            direction: FlowDirection::Output,
            cadence: FlowCadence::WhileStaffed,
            related_ids: &[RESOURCE_WATER],
        }],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: STATION_CRYSTAL_CIRCLE,
        entity_kind: EntityKind::Station,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::SaveSlot,
            tuning_affinity: TuningAffinity::Tuned,
            resets_on_tuning: true,
        }),
        unlocks: &[],
        blockers: &[],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "The Crystal Circle is anchored to the Base core.",
            related_ids: &[TILE_BASE_CORE],
        }],
        power: Some(PowerProfileDef {
            resource_id: RESOURCE_CHORUS,
            upkeep_per_second: 0.0,
            manual_power: false,
            starts_requested: true,
            fallback_mode: PowerFallbackMode::AlwaysOn,
        }),
        flows: &[
            FlowDef {
                item_id: RESOURCE_BASSLINE,
                label: "Crystal slots convert staffed time into band resources.",
                direction: FlowDirection::Output,
                cadence: FlowCadence::WhileStaffed,
                related_ids: &[ROLE_CRYSTAL_BASSLINE, ROLE_CRYSTAL_CHORUS, ROLE_CRYSTAL_HARMONICS],
            },
            FlowDef {
                item_id: RESOURCE_BASSLINE,
                label: "Bubble field coverage is derived from stored Bassline.",
                direction: FlowDirection::Pressure,
                cadence: FlowCadence::Passive,
                related_ids: &[RESOURCE_BASSLINE],
            },
        ],
        model_refs: &[ModelRefDef {
            kind: ModelKind::Bubble,
            reference_id: "field_k_base",
            label: "Crystal output converts into bubble field budget.",
        }],
        notes: &["The Crystal Circle is the root station for the three-band economy."],
    },
    EntitySchemaDef {
        id: STATION_FIRE_PIT,
        entity_kind: EntityKind::Station,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::SaveSlot,
            tuning_affinity: TuningAffinity::Tuned,
            resets_on_tuning: true,
        }),
        unlocks: &[UnlockDef {
            kind: UnlockKind::Construction,
            label: "Build Fire Pit to activate the morale station.",
            related_ids: &[FLAG_BASE_FIRE_PIT_BUILT],
        }],
        blockers: &[BlockerDef {
            kind: BlockerKind::MissingRequirement,
            label: "Fire Pit station is unavailable until built.",
            related_ids: &[FLAG_BASE_FIRE_PIT_BUILT],
        }],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "The Fire Pit is a Base-side station.",
            related_ids: &[TILE_BASE_CORE],
        }],
        power: Some(PowerProfileDef {
            resource_id: RESOURCE_CHORUS,
            upkeep_per_second: 0.0,
            manual_power: false,
            starts_requested: true,
            fallback_mode: PowerFallbackMode::AlwaysOn,
        }),
        flows: &[FlowDef {
            item_id: RESOURCE_VIBES,
            label: "The Fire Pit generates Vibes.",
            direction: FlowDirection::Output,
            cadence: FlowCadence::PerSecond,
            related_ids: &[RESOURCE_VIBES, ROLE_FIRE_PIT],
        }],
        model_refs: &[],
        notes: &["The Fire Pit intentionally has no Chorus upkeep in the early game."],
    },
    EntitySchemaDef {
        id: STATION_RESONANCE_CHAMBER,
        entity_kind: EntityKind::Station,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::SaveSlot,
            tuning_affinity: TuningAffinity::Tuned,
            resets_on_tuning: true,
        }),
        unlocks: &[UnlockDef {
            kind: UnlockKind::Construction,
            label: "Build Resonance Chamber to unlock Harmonics processing.",
            related_ids: &[FLAG_BASE_RESONANCE_CHAMBER_BUILT],
        }],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::MissingRequirement,
                label: "Resonance Chamber is unavailable until built.",
                related_ids: &[FLAG_BASE_RESONANCE_CHAMBER_BUILT],
            },
            BlockerDef {
                kind: BlockerKind::MissingPower,
                label: "Processing pauses if the station browns out.",
                related_ids: &[RESOURCE_CHORUS],
            },
        ],
        access_rules: &[
            AccessRuleDef {
                kind: AccessRuleKind::BaseOnly,
                label: "The station is built at the Base.",
                related_ids: &[TILE_BASE_CORE],
            },
            AccessRuleDef {
                kind: AccessRuleKind::PowerNetwork,
                label: "The station only functions when Chorus power is available.",
                related_ids: &[RESOURCE_CHORUS],
            },
        ],
        power: Some(PowerProfileDef {
            resource_id: RESOURCE_CHORUS,
            upkeep_per_second: 0.12,
            manual_power: true,
            starts_requested: true,
            fallback_mode: PowerFallbackMode::BrownoutLifo,
        }),
        flows: &[
            FlowDef {
                item_id: RESOURCE_HARMONICS,
                label: "Unlocks Harmonics staffing and field-focused processing.",
                direction: FlowDirection::Unlock,
                cadence: FlowCadence::OnComplete,
                related_ids: &[ROLE_CRYSTAL_HARMONICS, RECIPE_RESONANCE_FIELD_CALIBRATION],
            },
            FlowDef {
                item_id: RESOURCE_CHORUS,
                label: "Draws Chorus while requested and powered.",
                direction: FlowDirection::Input,
                cadence: FlowCadence::WhilePowered,
                related_ids: &[RESOURCE_CHORUS],
            },
        ],
        model_refs: &[
            ModelRefDef {
                kind: ModelKind::Power,
                reference_id: "brownout_lifo",
                label: "Manual power requests participate in LIFO brownouts.",
            },
            ModelRefDef {
                kind: ModelKind::Bubble,
                reference_id: "resonance_chamber_field_bonus",
                label: "This station improves field conversion.",
            },
        ],
        notes: &[],
    },
    EntitySchemaDef {
        id: STATION_MIX_CONSOLE,
        entity_kind: EntityKind::Station,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::SaveSlot,
            tuning_affinity: TuningAffinity::Tuned,
            resets_on_tuning: true,
        }),
        unlocks: &[UnlockDef {
            kind: UnlockKind::Construction,
            label: "Build Mix Console after the Resonance Chamber.",
            related_ids: &[FLAG_BASE_MIX_CONSOLE_BUILT],
        }],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::MissingRequirement,
                label: "Mix Console is unavailable until built.",
                related_ids: &[FLAG_BASE_MIX_CONSOLE_BUILT],
            },
            BlockerDef {
                kind: BlockerKind::MissingPower,
                label: "Processing pauses if the station browns out.",
                related_ids: &[RESOURCE_CHORUS],
            },
        ],
        access_rules: &[
            AccessRuleDef {
                kind: AccessRuleKind::BaseOnly,
                label: "The station is built at the Base.",
                related_ids: &[TILE_BASE_CORE],
            },
            AccessRuleDef {
                kind: AccessRuleKind::PowerNetwork,
                label: "The station only functions when Chorus power is available.",
                related_ids: &[RESOURCE_CHORUS],
            },
        ],
        power: Some(PowerProfileDef {
            resource_id: RESOURCE_CHORUS,
            upkeep_per_second: 0.16,
            manual_power: true,
            starts_requested: true,
            fallback_mode: PowerFallbackMode::BrownoutLifo,
        }),
        flows: &[
            FlowDef {
                item_id: RESOURCE_CHORUS,
                label: "Draws Chorus while requested and powered.",
                direction: FlowDirection::Input,
                cadence: FlowCadence::WhilePowered,
                related_ids: &[RESOURCE_CHORUS],
            },
            FlowDef {
                item_id: RESOURCE_HARMONICS,
                label: "Raises Harmonics-side processing and brownout tolerance.",
                direction: FlowDirection::Output,
                cadence: FlowCadence::OnComplete,
                related_ids: &[RECIPE_MIX_SIGNAL_BALANCING],
            },
        ],
        model_refs: &[ModelRefDef {
            kind: ModelKind::Power,
            reference_id: "mix_console_brownout_tolerance",
            label: "The station improves tolerance to brownouts.",
        }],
        notes: &[],
    },
    EntitySchemaDef {
        id: STATION_WORKSHOP,
        entity_kind: EntityKind::Station,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::SaveSlot,
            tuning_affinity: TuningAffinity::Tuned,
            resets_on_tuning: true,
        }),
        unlocks: &[UnlockDef {
            kind: UnlockKind::Construction,
            label: "Build Workshop to unlock tools and condensers.",
            related_ids: &[FLAG_BASE_WORKSHOP_BUILT],
        }],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::MissingRequirement,
                label: "Workshop is unavailable until built.",
                related_ids: &[FLAG_BASE_WORKSHOP_BUILT],
            },
            BlockerDef {
                kind: BlockerKind::MissingPower,
                label: "Workshop processing pauses without Chorus power.",
                related_ids: &[RESOURCE_CHORUS],
            },
        ],
        access_rules: &[
            AccessRuleDef {
                kind: AccessRuleKind::BaseOnly,
                label: "The station is built at the Base.",
                related_ids: &[TILE_BASE_CORE],
            },
            AccessRuleDef {
                kind: AccessRuleKind::PowerNetwork,
                label: "The station only functions when Chorus power is available.",
                related_ids: &[RESOURCE_CHORUS],
            },
        ],
        power: Some(PowerProfileDef {
            resource_id: RESOURCE_CHORUS,
            upkeep_per_second: 0.10,
            manual_power: true,
            starts_requested: true,
            fallback_mode: PowerFallbackMode::BrownoutLifo,
        }),
        flows: &[
            FlowDef {
                item_id: RESOURCE_STONE,
                label: "Builder Tools consumes Stone and Water to improve construction speed.",
                direction: FlowDirection::Input,
                cadence: FlowCadence::OnStart,
                related_ids: &[RECIPE_WORKSHOP_BUILDER_TOOLS],
            },
            FlowDef {
                item_id: RESOURCE_WATER,
                label: "Water Condensers improve Water cap and stock regen.",
                direction: FlowDirection::Output,
                cadence: FlowCadence::OnComplete,
                related_ids: &[RECIPE_WORKSHOP_WATER_CONDENSERS],
            },
        ],
        model_refs: &[
            ModelRefDef {
                kind: ModelKind::Duration,
                reference_id: "workshop_tooling_speed_bonus_per_level",
                label: "Workshop research speeds up construction.",
            },
            ModelRefDef {
                kind: ModelKind::Storage,
                reference_id: "workshop_water_cap_per_level",
                label: "Workshop upgrades expand Water systems.",
            },
        ],
        notes: &[],
    },
    EntitySchemaDef {
        id: STATION_RESEARCH_BOOTH,
        entity_kind: EntityKind::Station,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::SaveSlot,
            tuning_affinity: TuningAffinity::Tuned,
            resets_on_tuning: true,
        }),
        unlocks: &[UnlockDef {
            kind: UnlockKind::Construction,
            label: "Build Research Booth to unlock routing and study recipes.",
            related_ids: &[FLAG_BASE_RESEARCH_BOOTH_BUILT],
        }],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::MissingRequirement,
                label: "Research Booth is unavailable until built.",
                related_ids: &[FLAG_BASE_RESEARCH_BOOTH_BUILT],
            },
            BlockerDef {
                kind: BlockerKind::MissingPower,
                label: "Research pauses without Chorus power.",
                related_ids: &[RESOURCE_CHORUS],
            },
        ],
        access_rules: &[
            AccessRuleDef {
                kind: AccessRuleKind::BaseOnly,
                label: "The station is built at the Base.",
                related_ids: &[TILE_BASE_CORE],
            },
            AccessRuleDef {
                kind: AccessRuleKind::PowerNetwork,
                label: "The station only functions when Chorus power is available.",
                related_ids: &[RESOURCE_CHORUS],
            },
        ],
        power: Some(PowerProfileDef {
            resource_id: RESOURCE_CHORUS,
            upkeep_per_second: 0.14,
            manual_power: true,
            starts_requested: true,
            fallback_mode: PowerFallbackMode::BrownoutLifo,
        }),
        flows: &[
            FlowDef {
                item_id: RESOURCE_CHORUS,
                label: "Chorus Routing reduces life-support Chorus pressure.",
                direction: FlowDirection::Output,
                cadence: FlowCadence::OnComplete,
                related_ids: &[RECIPE_RESEARCH_CHORUS_ROUTING],
            },
            FlowDef {
                item_id: RESOURCE_HARMONICS,
                label: "Harmonic Study lowers the thresholds needed for higher tiers.",
                direction: FlowDirection::Output,
                cadence: FlowCadence::OnComplete,
                related_ids: &[RECIPE_RESEARCH_HARMONIC_STUDY],
            },
        ],
        model_refs: &[
            ModelRefDef {
                kind: ModelKind::Power,
                reference_id: "research_chorus_free_staff_per_level",
                label: "Research can offset some life-support cost.",
            },
            ModelRefDef {
                kind: ModelKind::Progression,
                reference_id: "research_harmonics_threshold_reduction_per_level",
                label: "Research reduces the Harmonics tier thresholds.",
            },
        ],
        notes: &[],
    },
    EntitySchemaDef {
        id: CONSTRUCTION_SLOT_CAPACITY,
        entity_kind: EntityKind::ConstructionOption,
        persistence: None,
        unlocks: &[UnlockDef {
            kind: UnlockKind::Construction,
            label: "Completing this upgrade adds a Crystal slot.",
            related_ids: &[STATION_CRYSTAL_CIRCLE],
        }],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::MissingStaff,
                label: "Needs Construction Crew to make progress.",
                related_ids: &[ROLE_CONSTRUCTION],
            },
            BlockerDef {
                kind: BlockerKind::MissingResource,
                label: "Needs stored Bassline while builders work.",
                related_ids: &[RESOURCE_BASSLINE],
            },
        ],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "Crystal upgrades happen at the Base.",
            related_ids: &[STATION_CRYSTAL_CIRCLE],
        }],
        power: None,
        flows: &[
            FlowDef {
                item_id: RESOURCE_BASSLINE,
                label: "Drains Bassline while builders work.",
                direction: FlowDirection::Input,
                cadence: FlowCadence::PerWorkerSecond,
                related_ids: &[RESOURCE_BASSLINE],
            },
            FlowDef {
                item_id: STATION_CRYSTAL_CIRCLE,
                label: "Adds one shared Crystal slot on completion.",
                direction: FlowDirection::Output,
                cadence: FlowCadence::OnComplete,
                related_ids: &[ROLE_CRYSTAL_BASSLINE, ROLE_CRYSTAL_CHORUS, ROLE_CRYSTAL_HARMONICS],
            },
        ],
        model_refs: &[ModelRefDef {
            kind: ModelKind::Duration,
            reference_id: "crystal_level_scaled_duration",
            label: "Each upgrade level increases duration.",
        }],
        notes: &[],
    },
    EntitySchemaDef {
        id: CONSTRUCTION_OUTPUT,
        entity_kind: EntityKind::ConstructionOption,
        persistence: None,
        unlocks: &[],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::MissingStaff,
                label: "Needs Construction Crew to make progress.",
                related_ids: &[ROLE_CONSTRUCTION],
            },
            BlockerDef {
                kind: BlockerKind::MissingResource,
                label: "Needs stored Bassline while builders work.",
                related_ids: &[RESOURCE_BASSLINE],
            },
        ],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "Crystal upgrades happen at the Base.",
            related_ids: &[STATION_CRYSTAL_CIRCLE],
        }],
        power: None,
        flows: &[
            FlowDef {
                item_id: RESOURCE_BASSLINE,
                label: "Drains Bassline while builders work.",
                direction: FlowDirection::Input,
                cadence: FlowCadence::PerWorkerSecond,
                related_ids: &[RESOURCE_BASSLINE],
            },
            FlowDef {
                item_id: STATION_CRYSTAL_CIRCLE,
                label: "Raises band output on completion.",
                direction: FlowDirection::Output,
                cadence: FlowCadence::OnComplete,
                related_ids: &[RESOURCE_BASSLINE, RESOURCE_CHORUS, RESOURCE_HARMONICS],
            },
        ],
        model_refs: &[ModelRefDef {
            kind: ModelKind::Duration,
            reference_id: "crystal_level_scaled_duration",
            label: "Each upgrade level increases duration.",
        }],
        notes: &[],
    },
    EntitySchemaDef {
        id: CONSTRUCTION_STORAGE,
        entity_kind: EntityKind::ConstructionOption,
        persistence: None,
        unlocks: &[],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::MissingStaff,
                label: "Needs Construction Crew to make progress.",
                related_ids: &[ROLE_CONSTRUCTION],
            },
            BlockerDef {
                kind: BlockerKind::MissingResource,
                label: "Needs stored Bassline while builders work.",
                related_ids: &[RESOURCE_BASSLINE],
            },
        ],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "Crystal upgrades happen at the Base.",
            related_ids: &[STATION_CRYSTAL_CIRCLE],
        }],
        power: None,
        flows: &[
            FlowDef {
                item_id: RESOURCE_BASSLINE,
                label: "Drains Bassline while builders work.",
                direction: FlowDirection::Input,
                cadence: FlowCadence::PerWorkerSecond,
                related_ids: &[RESOURCE_BASSLINE],
            },
            FlowDef {
                item_id: RESOURCE_BASSLINE,
                label: "Raises band storage on completion.",
                direction: FlowDirection::Capacity,
                cadence: FlowCadence::OnComplete,
                related_ids: &[RESOURCE_BASSLINE, RESOURCE_CHORUS, RESOURCE_HARMONICS],
            },
        ],
        model_refs: &[ModelRefDef {
            kind: ModelKind::Duration,
            reference_id: "crystal_level_scaled_duration",
            label: "Each upgrade level increases duration.",
        }],
        notes: &[],
    },
    EntitySchemaDef {
        id: CONSTRUCTION_REMOVING_MOSS,
        entity_kind: EntityKind::ConstructionOption,
        persistence: None,
        unlocks: &[UnlockDef {
            kind: UnlockKind::Story,
            label: "Explore Base to unlock Removing Moss.",
            related_ids: &[FLAG_CRYSTAL_REMOVING_MOSS_UNLOCKED],
        }],
        blockers: &[BlockerDef {
            kind: BlockerKind::MissingRequirement,
            label: "Explore Base before you can clear the Crystal Circle.",
            related_ids: &[FLAG_CRYSTAL_REMOVING_MOSS_UNLOCKED],
        }],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "Crystal upgrades happen at the Base.",
            related_ids: &[STATION_CRYSTAL_CIRCLE],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: RESOURCE_BASSLINE,
            label: "Unlocks passive Bassline trickle on completion.",
            direction: FlowDirection::Output,
            cadence: FlowCadence::OnComplete,
            related_ids: &[RESOURCE_BASSLINE],
        }],
        model_refs: &[],
        notes: &["This is time-only and does not cost Stone."],
    },
    EntitySchemaDef {
        id: CONSTRUCTION_POLISH_FIELD,
        entity_kind: EntityKind::ConstructionOption,
        persistence: None,
        unlocks: &[UnlockDef {
            kind: UnlockKind::Story,
            label: "Explore Base to unlock Crystal polishing.",
            related_ids: &[FLAG_BASE_TUTORIAL_EXPLORED],
        }],
        blockers: &[BlockerDef {
            kind: BlockerKind::MissingResource,
            label: "Requires Skin and Water upfront.",
            related_ids: &[COST_ITEM_SKIN, RESOURCE_WATER],
        }],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "Crystal upgrades happen at the Base.",
            related_ids: &[STATION_CRYSTAL_CIRCLE],
        }],
        power: None,
        flows: &[
            FlowDef {
                item_id: COST_ITEM_SKIN,
                label: "Consumes Skin at start.",
                direction: FlowDirection::Input,
                cadence: FlowCadence::OnStart,
                related_ids: &[COST_ITEM_SKIN],
            },
            FlowDef {
                item_id: RESOURCE_WATER,
                label: "Consumes Water at start.",
                direction: FlowDirection::Input,
                cadence: FlowCadence::OnStart,
                related_ids: &[RESOURCE_WATER],
            },
            FlowDef {
                item_id: RESOURCE_BASSLINE,
                label: "Improves field conversion on completion.",
                direction: FlowDirection::Output,
                cadence: FlowCadence::OnComplete,
                related_ids: &[RESOURCE_BASSLINE],
            },
        ],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: PROJECT_RESTORE_STUDIO,
        entity_kind: EntityKind::ConstructionOption,
        persistence: None,
        unlocks: &[UnlockDef {
            kind: UnlockKind::Construction,
            label: "Restoring the Studio unlocks Chorus.",
            related_ids: &[FLAG_BASE_STUDIO_RESTORED],
        }],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::MissingRequirement,
                label: "Investigate and Explore the Base first.",
                related_ids: &[FLAG_BASE_STUDIO_RESTORE_UNLOCKED],
            },
            BlockerDef {
                kind: BlockerKind::MissingResource,
                label: "Requires Stone upfront.",
                related_ids: &[RESOURCE_STONE],
            },
            BlockerDef {
                kind: BlockerKind::MissingStaff,
                label: "Needs Construction Crew to make progress.",
                related_ids: &[ROLE_CONSTRUCTION],
            },
        ],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "Studio restoration happens at the Base.",
            related_ids: &[STRUCTURE_BASE],
        }],
        power: None,
        flows: &[
            FlowDef {
                item_id: RESOURCE_STONE,
                label: "Consumes Stone at start.",
                direction: FlowDirection::Input,
                cadence: FlowCadence::OnStart,
                related_ids: &[RESOURCE_STONE],
            },
            FlowDef {
                item_id: RESOURCE_CHORUS,
                label: "Unlocks Chorus staffing and bunks on completion.",
                direction: FlowDirection::Unlock,
                cadence: FlowCadence::OnComplete,
                related_ids: &[RESOURCE_CHORUS, ROLE_CRYSTAL_CHORUS],
            },
        ],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: PROJECT_BUILD_FIRE_PIT,
        entity_kind: EntityKind::ConstructionOption,
        persistence: None,
        unlocks: &[UnlockDef {
            kind: UnlockKind::Construction,
            label: "Building the Fire Pit unlocks Vibes generation.",
            related_ids: &[FLAG_BASE_FIRE_PIT_BUILT],
        }],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::MissingResource,
                label: "Requires Stone upfront.",
                related_ids: &[RESOURCE_STONE],
            },
            BlockerDef {
                kind: BlockerKind::MissingStaff,
                label: "Needs Construction Crew to make progress.",
                related_ids: &[ROLE_CONSTRUCTION],
            },
        ],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "Fire Pit construction happens at the Base.",
            related_ids: &[STRUCTURE_BASE],
        }],
        power: None,
        flows: &[
            FlowDef {
                item_id: RESOURCE_STONE,
                label: "Consumes Stone at start.",
                direction: FlowDirection::Input,
                cadence: FlowCadence::OnStart,
                related_ids: &[RESOURCE_STONE],
            },
            FlowDef {
                item_id: RESOURCE_VIBES,
                label: "Unlocks Vibes production on completion.",
                direction: FlowDirection::Unlock,
                cadence: FlowCadence::OnComplete,
                related_ids: &[RESOURCE_VIBES, ROLE_FIRE_PIT],
            },
        ],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: PROJECT_BUILD_RESONANCE_CHAMBER,
        entity_kind: EntityKind::ConstructionOption,
        persistence: None,
        unlocks: &[UnlockDef {
            kind: UnlockKind::Construction,
            label: "Building the Resonance Chamber unlocks Harmonics.",
            related_ids: &[FLAG_BASE_RESONANCE_CHAMBER_BUILT],
        }],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::MissingRequirement,
                label: "Restore the Studio first.",
                related_ids: &[FLAG_BASE_STUDIO_RESTORED],
            },
            BlockerDef {
                kind: BlockerKind::MissingResource,
                label: "Requires Stone upfront.",
                related_ids: &[RESOURCE_STONE],
            },
        ],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "Base project.",
            related_ids: &[STRUCTURE_BASE],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: RESOURCE_HARMONICS,
            label: "Unlocks Harmonics staffing and field processing.",
            direction: FlowDirection::Unlock,
            cadence: FlowCadence::OnComplete,
            related_ids: &[ROLE_CRYSTAL_HARMONICS, STATION_RESONANCE_CHAMBER],
        }],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: PROJECT_BUILD_MIX_CONSOLE,
        entity_kind: EntityKind::ConstructionOption,
        persistence: None,
        unlocks: &[UnlockDef {
            kind: UnlockKind::Construction,
            label: "Build Mix Console to unlock signal balancing.",
            related_ids: &[FLAG_BASE_MIX_CONSOLE_BUILT],
        }],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::MissingRequirement,
                label: "Requires Studio and Resonance Chamber first.",
                related_ids: &[FLAG_BASE_STUDIO_RESTORED, FLAG_BASE_RESONANCE_CHAMBER_BUILT],
            },
            BlockerDef {
                kind: BlockerKind::MissingResource,
                label: "Requires Stone upfront.",
                related_ids: &[RESOURCE_STONE],
            },
        ],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "Base project.",
            related_ids: &[STRUCTURE_BASE],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: STATION_MIX_CONSOLE,
            label: "Unlocks Mix Console processing.",
            direction: FlowDirection::Unlock,
            cadence: FlowCadence::OnComplete,
            related_ids: &[RECIPE_MIX_SIGNAL_BALANCING],
        }],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: PROJECT_BUILD_WORKSHOP,
        entity_kind: EntityKind::ConstructionOption,
        persistence: None,
        unlocks: &[UnlockDef {
            kind: UnlockKind::Construction,
            label: "Build Workshop to unlock tooling and condenser recipes.",
            related_ids: &[FLAG_BASE_WORKSHOP_BUILT],
        }],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::MissingRequirement,
                label: "Restore the Studio first.",
                related_ids: &[FLAG_BASE_STUDIO_RESTORED],
            },
            BlockerDef {
                kind: BlockerKind::MissingResource,
                label: "Requires Stone upfront.",
                related_ids: &[RESOURCE_STONE],
            },
        ],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "Base project.",
            related_ids: &[STRUCTURE_BASE],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: STATION_WORKSHOP,
            label: "Unlocks Workshop processing recipes.",
            direction: FlowDirection::Unlock,
            cadence: FlowCadence::OnComplete,
            related_ids: &[RECIPE_WORKSHOP_BUILDER_TOOLS, RECIPE_WORKSHOP_WATER_CONDENSERS],
        }],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: PROJECT_BUILD_RESEARCH_BOOTH,
        entity_kind: EntityKind::ConstructionOption,
        persistence: None,
        unlocks: &[UnlockDef {
            kind: UnlockKind::Construction,
            label: "Build Research Booth to unlock routing and study recipes.",
            related_ids: &[FLAG_BASE_RESEARCH_BOOTH_BUILT],
        }],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::MissingRequirement,
                label: "Requires Studio and Resonance Chamber first.",
                related_ids: &[FLAG_BASE_STUDIO_RESTORED, FLAG_BASE_RESONANCE_CHAMBER_BUILT],
            },
            BlockerDef {
                kind: BlockerKind::MissingResource,
                label: "Requires Stone upfront.",
                related_ids: &[RESOURCE_STONE],
            },
        ],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "Base project.",
            related_ids: &[STRUCTURE_BASE],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: STATION_RESEARCH_BOOTH,
            label: "Unlocks Research Booth processing recipes.",
            direction: FlowDirection::Unlock,
            cadence: FlowCadence::OnComplete,
            related_ids: &[RECIPE_RESEARCH_CHORUS_ROUTING, RECIPE_RESEARCH_HARMONIC_STUDY],
        }],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: RECIPE_RESONANCE_FIELD_CALIBRATION,
        entity_kind: EntityKind::ProcessingRecipe,
        persistence: None,
        unlocks: &[],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::MissingRequirement,
                label: "Requires Resonance Chamber.",
                related_ids: &[FLAG_BASE_RESONANCE_CHAMBER_BUILT],
            },
            BlockerDef {
                kind: BlockerKind::MissingPower,
                label: "Recipe pauses if the Resonance Chamber loses power.",
                related_ids: &[STATION_RESONANCE_CHAMBER],
            },
            BlockerDef {
                kind: BlockerKind::MissingResource,
                label: "Consumes Stone and Water upfront.",
                related_ids: &[RESOURCE_STONE, RESOURCE_WATER],
            },
        ],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::PowerNetwork,
            label: "Requires the Resonance Chamber to stay powered.",
            related_ids: &[STATION_RESONANCE_CHAMBER],
        }],
        power: None,
        flows: &[
            FlowDef {
                item_id: RESOURCE_STONE,
                label: "Consumes Stone at start.",
                direction: FlowDirection::Input,
                cadence: FlowCadence::OnStart,
                related_ids: &[RESOURCE_STONE],
            },
            FlowDef {
                item_id: RESOURCE_WATER,
                label: "Consumes Water at start.",
                direction: FlowDirection::Input,
                cadence: FlowCadence::OnStart,
                related_ids: &[RESOURCE_WATER],
            },
            FlowDef {
                item_id: RESOURCE_BASSLINE,
                label: "Improves field conversion on completion.",
                direction: FlowDirection::Output,
                cadence: FlowCadence::OnComplete,
                related_ids: &[RESOURCE_BASSLINE],
            },
        ],
        model_refs: &[ModelRefDef {
            kind: ModelKind::Power,
            reference_id: "resonance_processing_field_bonus_per_level",
            label: "Each level improves field conversion.",
        }],
        notes: &[],
    },
    EntitySchemaDef {
        id: RECIPE_MIX_SIGNAL_BALANCING,
        entity_kind: EntityKind::ProcessingRecipe,
        persistence: None,
        unlocks: &[],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::MissingRequirement,
                label: "Requires Mix Console.",
                related_ids: &[FLAG_BASE_MIX_CONSOLE_BUILT],
            },
            BlockerDef {
                kind: BlockerKind::MissingPower,
                label: "Recipe pauses if the Mix Console loses power.",
                related_ids: &[STATION_MIX_CONSOLE],
            },
            BlockerDef {
                kind: BlockerKind::MissingResource,
                label: "Consumes Stone and Water upfront.",
                related_ids: &[RESOURCE_STONE, RESOURCE_WATER],
            },
        ],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::PowerNetwork,
            label: "Requires the Mix Console to stay powered.",
            related_ids: &[STATION_MIX_CONSOLE],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: RESOURCE_HARMONICS,
            label: "Improves Harmonics-side efficiency on completion.",
            direction: FlowDirection::Output,
            cadence: FlowCadence::OnComplete,
            related_ids: &[RESOURCE_HARMONICS],
        }],
        model_refs: &[ModelRefDef {
            kind: ModelKind::Power,
            reference_id: "mix_processing_harmonics_bonus_per_level",
            label: "Each level improves Harmonics efficiency.",
        }],
        notes: &[],
    },
    EntitySchemaDef {
        id: RECIPE_WORKSHOP_BUILDER_TOOLS,
        entity_kind: EntityKind::ProcessingRecipe,
        persistence: None,
        unlocks: &[],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::MissingRequirement,
                label: "Requires Workshop.",
                related_ids: &[FLAG_BASE_WORKSHOP_BUILT],
            },
            BlockerDef {
                kind: BlockerKind::MissingPower,
                label: "Recipe pauses if the Workshop loses power.",
                related_ids: &[STATION_WORKSHOP],
            },
            BlockerDef {
                kind: BlockerKind::MissingResource,
                label: "Consumes Stone and Water upfront.",
                related_ids: &[RESOURCE_STONE, RESOURCE_WATER],
            },
        ],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::PowerNetwork,
            label: "Requires the Workshop to stay powered.",
            related_ids: &[STATION_WORKSHOP],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: ROLE_CONSTRUCTION,
            label: "Raises construction speed on completion.",
            direction: FlowDirection::Output,
            cadence: FlowCadence::OnComplete,
            related_ids: &[ROLE_CONSTRUCTION],
        }],
        model_refs: &[ModelRefDef {
            kind: ModelKind::Duration,
            reference_id: "workshop_tooling_speed_bonus_per_level",
            label: "Each level speeds up construction.",
        }],
        notes: &[],
    },
    EntitySchemaDef {
        id: RECIPE_WORKSHOP_WATER_CONDENSERS,
        entity_kind: EntityKind::ProcessingRecipe,
        persistence: None,
        unlocks: &[],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::MissingRequirement,
                label: "Requires Workshop.",
                related_ids: &[FLAG_BASE_WORKSHOP_BUILT],
            },
            BlockerDef {
                kind: BlockerKind::MissingPower,
                label: "Recipe pauses if the Workshop loses power.",
                related_ids: &[STATION_WORKSHOP],
            },
            BlockerDef {
                kind: BlockerKind::MissingResource,
                label: "Consumes Stone and Water upfront.",
                related_ids: &[RESOURCE_STONE, RESOURCE_WATER],
            },
        ],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::PowerNetwork,
            label: "Requires the Workshop to stay powered.",
            related_ids: &[STATION_WORKSHOP],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: RESOURCE_WATER,
            label: "Improves Water cap and stock regeneration on completion.",
            direction: FlowDirection::Capacity,
            cadence: FlowCadence::OnComplete,
            related_ids: &[RESOURCE_WATER],
        }],
        model_refs: &[ModelRefDef {
            kind: ModelKind::Storage,
            reference_id: "workshop_water_cap_per_level",
            label: "Each level expands Water capacity and stock regen.",
        }],
        notes: &[],
    },
    EntitySchemaDef {
        id: RECIPE_RESEARCH_CHORUS_ROUTING,
        entity_kind: EntityKind::ProcessingRecipe,
        persistence: None,
        unlocks: &[],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::MissingRequirement,
                label: "Requires Research Booth.",
                related_ids: &[FLAG_BASE_RESEARCH_BOOTH_BUILT],
            },
            BlockerDef {
                kind: BlockerKind::MissingPower,
                label: "Recipe pauses if the Research Booth loses power.",
                related_ids: &[STATION_RESEARCH_BOOTH],
            },
            BlockerDef {
                kind: BlockerKind::MissingResource,
                label: "Consumes Stone and Water upfront.",
                related_ids: &[RESOURCE_STONE, RESOURCE_WATER],
            },
        ],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::PowerNetwork,
            label: "Requires the Research Booth to stay powered.",
            related_ids: &[STATION_RESEARCH_BOOTH],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: RESOURCE_CHORUS,
            label: "Reduces life-support Chorus upkeep on completion.",
            direction: FlowDirection::Output,
            cadence: FlowCadence::OnComplete,
            related_ids: &[RESOURCE_CHORUS],
        }],
        model_refs: &[ModelRefDef {
            kind: ModelKind::Power,
            reference_id: "research_chorus_free_staff_per_level",
            label: "Each level offsets some Chorus life-support pressure.",
        }],
        notes: &[],
    },
    EntitySchemaDef {
        id: RECIPE_RESEARCH_HARMONIC_STUDY,
        entity_kind: EntityKind::ProcessingRecipe,
        persistence: None,
        unlocks: &[],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::MissingRequirement,
                label: "Requires Research Booth.",
                related_ids: &[FLAG_BASE_RESEARCH_BOOTH_BUILT],
            },
            BlockerDef {
                kind: BlockerKind::MissingPower,
                label: "Recipe pauses if the Research Booth loses power.",
                related_ids: &[STATION_RESEARCH_BOOTH],
            },
            BlockerDef {
                kind: BlockerKind::MissingResource,
                label: "Consumes Stone and Water upfront.",
                related_ids: &[RESOURCE_STONE, RESOURCE_WATER],
            },
        ],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::PowerNetwork,
            label: "Requires the Research Booth to stay powered.",
            related_ids: &[STATION_RESEARCH_BOOTH],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: RESOURCE_HARMONICS,
            label: "Lowers Harmonics thresholds on completion.",
            direction: FlowDirection::Output,
            cadence: FlowCadence::OnComplete,
            related_ids: &[RESOURCE_HARMONICS],
        }],
        model_refs: &[ModelRefDef {
            kind: ModelKind::Progression,
            reference_id: "research_harmonics_threshold_reduction_per_level",
            label: "Each level lowers Harmonics tier thresholds.",
        }],
        notes: &[],
    },
    EntitySchemaDef {
        id: WORLD_ACTION_INVESTIGATE_BASE,
        entity_kind: EntityKind::WorldAction,
        persistence: None,
        unlocks: &[UnlockDef {
            kind: UnlockKind::Story,
            label: "Finishing Investigate unlocks Explore.",
            related_ids: &[FLAG_BASE_TUTORIAL_INVESTIGATED],
        }],
        blockers: &[BlockerDef {
            kind: BlockerKind::OfflineDisabled,
            label: "Investigate only progresses while online.",
            related_ids: &[WORLD_ACTION_INVESTIGATE_BASE],
        }],
        access_rules: &[
            AccessRuleDef {
                kind: AccessRuleKind::BaseOnly,
                label: "This action is performed on the Base tile.",
                related_ids: &[TILE_BASE_CORE],
            },
            AccessRuleDef {
                kind: AccessRuleKind::HeroOnly,
                label: "Only the Hero can perform this action.",
                related_ids: &[WORLD_ACTION_INVESTIGATE_BASE],
            },
        ],
        power: None,
        flows: &[FlowDef {
            item_id: WORLD_ACTION_EXPLORE_BASE,
            label: "Unlocks Explore Base on completion.",
            direction: FlowDirection::Unlock,
            cadence: FlowCadence::OnComplete,
            related_ids: &[WORLD_ACTION_EXPLORE_BASE],
        }],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: WORLD_ACTION_EXPLORE_BASE,
        entity_kind: EntityKind::WorldAction,
        persistence: None,
        unlocks: &[
            UnlockDef {
                kind: UnlockKind::Story,
                label: "Unlocks Restore Studio.",
                related_ids: &[FLAG_BASE_STUDIO_RESTORE_UNLOCKED],
            },
            UnlockDef {
                kind: UnlockKind::Story,
                label: "Unlocks Removing Moss and Water collection.",
                related_ids: &[FLAG_CRYSTAL_REMOVING_MOSS_UNLOCKED, FLAG_BASE_WATER_COLLECTION_UNLOCKED],
            },
        ],
        blockers: &[BlockerDef {
            kind: BlockerKind::OfflineDisabled,
            label: "Explore only progresses while online.",
            related_ids: &[WORLD_ACTION_EXPLORE_BASE],
        }],
        access_rules: &[
            AccessRuleDef {
                kind: AccessRuleKind::BaseOnly,
                label: "This action is performed on the Base tile.",
                related_ids: &[TILE_BASE_CORE],
            },
            AccessRuleDef {
                kind: AccessRuleKind::HeroOnly,
                label: "Only the Hero can perform this action.",
                related_ids: &[WORLD_ACTION_EXPLORE_BASE],
            },
        ],
        power: None,
        flows: &[FlowDef {
            item_id: FLAG_BASE_STUDIO_RESTORE_UNLOCKED,
            label: "Unlocks restoration and the first persistent utility loops.",
            direction: FlowDirection::Unlock,
            cadence: FlowCadence::OnComplete,
            related_ids: &[PROJECT_RESTORE_STUDIO, CONSTRUCTION_REMOVING_MOSS, RESOURCE_WATER],
        }],
        model_refs: &[],
        notes: &["This action also grants the first Skin and opens the early Base economy."],
    },
    EntitySchemaDef {
        id: STORY_BEAT_ROAD_TO_BASE,
        entity_kind: EntityKind::StoryBeat,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::Content,
            tuning_affinity: TuningAffinity::Untuned,
            resets_on_tuning: false,
        }),
        unlocks: &[UnlockDef {
            kind: UnlockKind::Story,
            label: "Sets up the first glimpse of the Base.",
            related_ids: &[STORY_BEAT_FIRST_GLIMPSE, TILE_BASE_CORE],
        }],
        blockers: &[],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::StoryUnlocked,
            label: "This beat establishes the arrival path into the playable space.",
            related_ids: &[STORY_BEAT_FIRST_GLIMPSE, STRUCTURE_BASE],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: STORY_BEAT_FIRST_GLIMPSE,
            label: "Leads into the Base reveal sequence.",
            direction: FlowDirection::Unlock,
            cadence: FlowCadence::OnComplete,
            related_ids: &[STORY_BEAT_FIRST_GLIMPSE],
        }],
        model_refs: &[],
        notes: &["Pre-arrival story beat used to frame the start of the game."],
    },
    EntitySchemaDef {
        id: STORY_BEAT_FIRST_GLIMPSE,
        entity_kind: EntityKind::StoryBeat,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::Content,
            tuning_affinity: TuningAffinity::Untuned,
            resets_on_tuning: false,
        }),
        unlocks: &[UnlockDef {
            kind: UnlockKind::Story,
            label: "Frames the bubble before the player steps into it.",
            related_ids: &[STORY_BEAT_ENTER_THE_BUBBLE, STRUCTURE_CRYSTAL_CIRCLE],
        }],
        blockers: &[],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::StoryUnlocked,
            label: "The Base and Crystal Circle must already exist in the scene framing.",
            related_ids: &[TILE_RIDGE_LINE, TILE_BASE_CORE],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: STORY_BEAT_ENTER_THE_BUBBLE,
            label: "Leads into the player crossing into safety.",
            direction: FlowDirection::Unlock,
            cadence: FlowCadence::OnComplete,
            related_ids: &[STORY_BEAT_ENTER_THE_BUBBLE],
        }],
        model_refs: &[],
        notes: &["Pre-arrival story beat used for the first visual reveal of the sanctuary."],
    },
    EntitySchemaDef {
        id: STORY_BEAT_ENTER_THE_BUBBLE,
        entity_kind: EntityKind::StoryBeat,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::Content,
            tuning_affinity: TuningAffinity::Untuned,
            resets_on_tuning: false,
        }),
        unlocks: &[UnlockDef {
            kind: UnlockKind::Story,
            label: "Hands off into the first base interaction.",
            related_ids: &[STORY_BEAT_INVESTIGATE_BASE, WORLD_ACTION_INVESTIGATE_BASE],
        }],
        blockers: &[],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BubbleRequired,
            label: "This beat depends on the Crystal bubble being legible as safety.",
            related_ids: &[RESOURCE_BASSLINE, STATION_CRYSTAL_CIRCLE],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: WORLD_ACTION_INVESTIGATE_BASE,
            label: "Transitions into the first actionable world step.",
            direction: FlowDirection::Unlock,
            cadence: FlowCadence::OnComplete,
            related_ids: &[WORLD_ACTION_INVESTIGATE_BASE, STORY_BEAT_INVESTIGATE_BASE],
        }],
        model_refs: &[],
        notes: &["Pre-arrival story beat used to transition from arrival to interaction."],
    },
    EntitySchemaDef {
        id: STORY_BEAT_INVESTIGATE_BASE,
        entity_kind: EntityKind::StoryBeat,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::SaveSlot,
            tuning_affinity: TuningAffinity::Tuned,
            resets_on_tuning: true,
        }),
        unlocks: &[UnlockDef {
            kind: UnlockKind::Story,
            label: "Completing this beat opens Explore Base.",
            related_ids: &[WORLD_ACTION_EXPLORE_BASE, STORY_BEAT_EXPLORE_BASE],
        }],
        blockers: &[BlockerDef {
            kind: BlockerKind::Busy,
            label: "The Hero must be free to investigate the Base.",
            related_ids: &[WORLD_ACTION_INVESTIGATE_BASE],
        }],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "This beat happens entirely on the Base tile.",
            related_ids: &[STRUCTURE_BASE, TILE_BASE_CORE],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: WORLD_ACTION_INVESTIGATE_BASE,
            label: "Uses the Investigate Base action as its playable step.",
            direction: FlowDirection::Unlock,
            cadence: FlowCadence::WhileStaffed,
            related_ids: &[WORLD_ACTION_INVESTIGATE_BASE],
        }],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: STORY_BEAT_EXPLORE_BASE,
        entity_kind: EntityKind::StoryBeat,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::SaveSlot,
            tuning_affinity: TuningAffinity::Tuned,
            resets_on_tuning: true,
        }),
        unlocks: &[UnlockDef {
            kind: UnlockKind::Story,
            label: "Completing this beat unlocks real repairs and utilities.",
            related_ids: &[PROJECT_RESTORE_STUDIO, STORY_BEAT_RESTORE_STUDIO, CONSTRUCTION_REMOVING_MOSS, RESOURCE_WATER],
        }],
        blockers: &[BlockerDef {
            kind: BlockerKind::Busy,
            label: "The Hero must be free to explore the Base.",
            related_ids: &[WORLD_ACTION_EXPLORE_BASE],
        }],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "This beat happens entirely on the Base tile.",
            related_ids: &[STRUCTURE_BASE, TILE_BASE_CORE],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: WORLD_ACTION_EXPLORE_BASE,
            label: "Uses the Explore Base action as its playable step.",
            direction: FlowDirection::Unlock,
            cadence: FlowCadence::WhileStaffed,
            related_ids: &[WORLD_ACTION_EXPLORE_BASE],
        }],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: STORY_BEAT_RESTORE_STUDIO,
        entity_kind: EntityKind::StoryBeat,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::SaveSlot,
            tuning_affinity: TuningAffinity::Tuned,
            resets_on_tuning: true,
        }),
        unlocks: &[UnlockDef {
            kind: UnlockKind::Construction,
            label: "Restoring the Studio opens Chorus and the first power loop.",
            related_ids: &[RESOURCE_CHORUS, STATION_CRYSTAL_CIRCLE, STORY_BEAT_BUILD_FIRE_PIT, PROJECT_BUILD_FIRE_PIT],
        }],
        blockers: &[BlockerDef {
            kind: BlockerKind::MissingResource,
            label: "Stone is required before the Studio can be repaired.",
            related_ids: &[PROJECT_RESTORE_STUDIO, RESOURCE_STONE],
        }],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "The Studio is part of the Base footprint.",
            related_ids: &[STRUCTURE_BASE],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: PROJECT_RESTORE_STUDIO,
            label: "Uses the Restore Studio construction project.",
            direction: FlowDirection::Unlock,
            cadence: FlowCadence::OnComplete,
            related_ids: &[PROJECT_RESTORE_STUDIO],
        }],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: STORY_BEAT_BUILD_FIRE_PIT,
        entity_kind: EntityKind::StoryBeat,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::SaveSlot,
            tuning_affinity: TuningAffinity::Tuned,
            resets_on_tuning: true,
        }),
        unlocks: &[UnlockDef {
            kind: UnlockKind::Station,
            label: "Building the Fire Pit opens the first social output loop.",
            related_ids: &[STATION_FIRE_PIT, STORY_BEAT_FIRST_RECRUIT, UI_ACTION_RECRUIT],
        }],
        blockers: &[BlockerDef {
            kind: BlockerKind::MissingResource,
            label: "Stone is required before the Fire Pit can be built.",
            related_ids: &[PROJECT_BUILD_FIRE_PIT, RESOURCE_STONE],
        }],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "The Fire Pit is constructed in the Base camp.",
            related_ids: &[STRUCTURE_BASE, STATION_FIRE_PIT],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: PROJECT_BUILD_FIRE_PIT,
            label: "Uses the Build Fire Pit construction project.",
            direction: FlowDirection::Unlock,
            cadence: FlowCadence::OnComplete,
            related_ids: &[PROJECT_BUILD_FIRE_PIT],
        }],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: STORY_BEAT_REACH_SURVIVOR_CAVE,
        entity_kind: EntityKind::StoryBeat,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::SaveSlot,
            tuning_affinity: TuningAffinity::Tuned,
            resets_on_tuning: true,
        }),
        unlocks: &[UnlockDef {
            kind: UnlockKind::Reach,
            label: "Extending the bubble to the cave opens the first recruitment attempt.",
            related_ids: &[UI_MAP_CAVE_GATE, TILE_SURVIVOR_CAVE, STORY_BEAT_FIRST_RECRUIT, UI_ACTION_RECRUIT],
        }],
        blockers: &[BlockerDef {
            kind: BlockerKind::ReachLocked,
            label: "Stored Bassline must sustain enough bubble reach to connect to the cave.",
            related_ids: &[RESOURCE_BASSLINE, TILE_SURVIVOR_CAVE, UI_MAP_CAVE_GATE],
        }],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BubbleRequired,
            label: "This beat depends on the active bubble reaching the Survivor Cave.",
            related_ids: &[RESOURCE_BASSLINE, TILE_SURVIVOR_CAVE],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: UI_MAP_CAVE_GATE,
            label: "Uses the current bubble budget to push the frontier to the cave.",
            direction: FlowDirection::Unlock,
            cadence: FlowCadence::WhilePowered,
            related_ids: &[UI_MAP_CAVE_GATE, TILE_SURVIVOR_CAVE],
        }],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: STORY_BEAT_FIRST_RECRUIT,
        entity_kind: EntityKind::StoryBeat,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::SaveSlot,
            tuning_affinity: TuningAffinity::Tuned,
            resets_on_tuning: true,
        }),
        unlocks: &[UnlockDef {
            kind: UnlockKind::Reach,
            label: "First recruitment proves the base loop can now grow outward.",
            related_ids: &[UI_STATUS_BASE_RECRUITS, TILE_SURVIVOR_CAVE, UI_MAP_CAVE_GATE],
        }],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::ReachLocked,
                label: "The bubble must reach the Survivor Cave before recruiting.",
                related_ids: &[TILE_SURVIVOR_CAVE, UI_ACTION_RECRUIT],
            },
            BlockerDef {
                kind: BlockerKind::MissingResource,
                label: "Enough Vibes are required before a recruit will join.",
                related_ids: &[RESOURCE_VIBES, UI_ACTION_RECRUIT],
            },
        ],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::ReachRequired,
            label: "Recruitment depends on bubble reach and the Survivor Cave connection.",
            related_ids: &[TILE_SURVIVOR_CAVE, UI_MAP_CAVE_GATE],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: UI_ACTION_RECRUIT,
            label: "Uses the recruit action after the cave is in reach.",
            direction: FlowDirection::Unlock,
            cadence: FlowCadence::OnComplete,
            related_ids: &[UI_ACTION_RECRUIT],
        }],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: STORY_BEAT_AWAIT_SURVIVOR_ARRIVAL,
        entity_kind: EntityKind::StoryBeat,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::SaveSlot,
            tuning_affinity: TuningAffinity::Tuned,
            resets_on_tuning: true,
        }),
        unlocks: &[UnlockDef {
            kind: UnlockKind::Story,
            label: "The pending recruit transitions the first arc into base stabilization.",
            related_ids: &[UI_STATUS_BASE_RECRUITS, STORY_BEAT_STABILIZE_BASE],
        }],
        blockers: &[BlockerDef {
            kind: BlockerKind::Busy,
            label: "The recruit is already traveling back to the Base.",
            related_ids: &[UI_STATUS_BASE_RECRUITS],
        }],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::ReachRequired,
            label: "This beat exists only once recruitment has actually started.",
            related_ids: &[UI_ACTION_RECRUIT, UI_STATUS_BASE_RECRUITS],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: UI_STATUS_BASE_RECRUITS,
            label: "Tracks the first recruit while they travel to the Base.",
            direction: FlowDirection::Unlock,
            cadence: FlowCadence::PerSecond,
            related_ids: &[UI_STATUS_BASE_RECRUITS],
        }],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: STORY_BEAT_STABILIZE_BASE,
        entity_kind: EntityKind::StoryBeat,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::SaveSlot,
            tuning_affinity: TuningAffinity::Tuned,
            resets_on_tuning: true,
        }),
        unlocks: &[UnlockDef {
            kind: UnlockKind::Power,
            label: "The first arc hands off into a wider power, staffing, and processing game.",
            related_ids: &[UI_PANEL_POWER, UI_PANEL_BASE, RESOURCE_CHORUS, RESOURCE_HARMONICS],
        }],
        blockers: &[BlockerDef {
            kind: BlockerKind::MissingPower,
            label: "Brownouts or weak housing stability will limit this next phase.",
            related_ids: &[UI_PANEL_POWER, UI_STATUS_BASE_HOUSING],
        }],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "This beat is about optimizing the Base after the first recruit arrives.",
            related_ids: &[STRUCTURE_BASE, UI_PANEL_BASE],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: UI_PANEL_POWER,
            label: "Expands into the broader idle game of power, staffing, and processing.",
            direction: FlowDirection::Unlock,
            cadence: FlowCadence::OnComplete,
            related_ids: &[UI_PANEL_POWER, UI_PANEL_BASE],
        }],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: TILE_BASE_CORE,
        entity_kind: EntityKind::Tile,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::Content,
            tuning_affinity: TuningAffinity::Untuned,
            resets_on_tuning: false,
        }),
        unlocks: &[],
        blockers: &[],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "The Base Core anchors all starting systems.",
            related_ids: &[STRUCTURE_BASE, STRUCTURE_CRYSTAL_CIRCLE],
        }],
        power: None,
        flows: &[
            FlowDef {
                item_id: RESOURCE_STONE,
                label: "Hosts Base scavenging.",
                direction: FlowDirection::Output,
                cadence: FlowCadence::WhileStaffed,
                related_ids: &[ROLE_SCAVENGE],
            },
            FlowDef {
                item_id: RESOURCE_WATER,
                label: "Hosts Base Water collection.",
                direction: FlowDirection::Output,
                cadence: FlowCadence::WhileStaffed,
                related_ids: &[ROLE_WATER],
            },
        ],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: TILE_PLAINS_OPEN,
        entity_kind: EntityKind::Tile,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::Content,
            tuning_affinity: TuningAffinity::Untuned,
            resets_on_tuning: false,
        }),
        unlocks: &[],
        blockers: &[],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::NotBlocked,
            label: "Open terrain with no special access gate.",
            related_ids: &[TILE_PLAINS_OPEN],
        }],
        power: None,
        flows: &[],
        model_refs: &[ModelRefDef {
            kind: ModelKind::Terrain,
            reference_id: "terrain_impedance",
            label: "Plains use the baseline impedance profile.",
        }],
        notes: &[],
    },
    EntitySchemaDef {
        id: TILE_RIVER_SHALLOWS,
        entity_kind: EntityKind::Tile,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::Content,
            tuning_affinity: TuningAffinity::Untuned,
            resets_on_tuning: false,
        }),
        unlocks: &[],
        blockers: &[],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::NotBlocked,
            label: "River tiles stay traversable and propagate the bubble efficiently.",
            related_ids: &[TILE_RIVER_SHALLOWS],
        }],
        power: None,
        flows: &[FlowDef {
            item_id: RESOURCE_WATER,
            label: "The river profile supports Water theming and future harvestables.",
            direction: FlowDirection::Output,
            cadence: FlowCadence::Passive,
            related_ids: &[RESOURCE_WATER, FLORA_REEDS],
        }],
        model_refs: &[ModelRefDef {
            kind: ModelKind::Terrain,
            reference_id: "terrain_impedance",
            label: "River tiles use low impedance.",
        }],
        notes: &[],
    },
    EntitySchemaDef {
        id: TILE_SCRUB_PATCH,
        entity_kind: EntityKind::Tile,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::Content,
            tuning_affinity: TuningAffinity::Untuned,
            resets_on_tuning: false,
        }),
        unlocks: &[],
        blockers: &[],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::NotBlocked,
            label: "Scrub tiles stay accessible but cost more bubble budget.",
            related_ids: &[TILE_SCRUB_PATCH],
        }],
        power: None,
        flows: &[],
        model_refs: &[ModelRefDef {
            kind: ModelKind::Terrain,
            reference_id: "terrain_impedance",
            label: "Scrub tiles use elevated impedance.",
        }],
        notes: &[],
    },
    EntitySchemaDef {
        id: TILE_RIDGE_LINE,
        entity_kind: EntityKind::Tile,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::Content,
            tuning_affinity: TuningAffinity::Untuned,
            resets_on_tuning: false,
        }),
        unlocks: &[],
        blockers: &[],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::NotBlocked,
            label: "Ridge tiles are reachable but expensive for the bubble.",
            related_ids: &[TILE_RIDGE_LINE],
        }],
        power: None,
        flows: &[],
        model_refs: &[ModelRefDef {
            kind: ModelKind::Terrain,
            reference_id: "terrain_impedance",
            label: "Ridge tiles use high impedance.",
        }],
        notes: &[],
    },
    EntitySchemaDef {
        id: TILE_MOUNTAIN_WALL,
        entity_kind: EntityKind::Tile,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::Content,
            tuning_affinity: TuningAffinity::Untuned,
            resets_on_tuning: false,
        }),
        unlocks: &[],
        blockers: &[
            BlockerDef {
                kind: BlockerKind::Inaccessible,
                label: "Mountains are hard blockers for the bubble in the current model.",
                related_ids: &[TILE_MOUNTAIN_WALL],
            },
            BlockerDef {
                kind: BlockerKind::Occluded,
                label: "Mountains are the first terrain intended to cast shadow later.",
                related_ids: &[TILE_MOUNTAIN_WALL],
            },
        ],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::NotBlocked,
            label: "Future systems may reduce impedance or route around this blocker.",
            related_ids: &[TILE_MOUNTAIN_WALL],
        }],
        power: None,
        flows: &[],
        model_refs: &[ModelRefDef {
            kind: ModelKind::Terrain,
            reference_id: "terrain_impedance",
            label: "Mountains use blocker-level impedance.",
        }],
        notes: &[],
    },
    EntitySchemaDef {
        id: TILE_SURVIVOR_CAVE,
        entity_kind: EntityKind::Tile,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::Content,
            tuning_affinity: TuningAffinity::Untuned,
            resets_on_tuning: false,
        }),
        unlocks: &[UnlockDef {
            kind: UnlockKind::Reach,
            label: "Bubble reach unlocks recruitment at the Survivor Cave.",
            related_ids: &[RESOURCE_VIBES],
        }],
        blockers: &[BlockerDef {
            kind: BlockerKind::ReachLocked,
            label: "The cave only activates when the bubble reaches the recruitment threshold.",
            related_ids: &[RESOURCE_BASSLINE],
        }],
        access_rules: &[
            AccessRuleDef {
                kind: AccessRuleKind::ReachRequired,
                label: "Requires sufficient bubble reach from the Base.",
                related_ids: &[RESOURCE_BASSLINE],
            },
            AccessRuleDef {
                kind: AccessRuleKind::BubbleRequired,
                label: "Recruitment only opens while the cave is inside the bubble.",
                related_ids: &[RESOURCE_BASSLINE],
            },
        ],
        power: None,
        flows: &[FlowDef {
            item_id: RESOURCE_VIBES,
            label: "Recruitment spends Vibes when the cave gate is open.",
            direction: FlowDirection::Input,
            cadence: FlowCadence::OnStart,
            related_ids: &[RESOURCE_VIBES],
        }],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: FLORA_REEDS,
        entity_kind: EntityKind::Flora,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::Content,
            tuning_affinity: TuningAffinity::Untuned,
            resets_on_tuning: false,
        }),
        unlocks: &[],
        blockers: &[],
        access_rules: &[],
        power: None,
        flows: &[],
        model_refs: &[],
        notes: &["Static content tag for river-adjacent vegetation."],
    },
    EntitySchemaDef {
        id: FLORA_SCRUB,
        entity_kind: EntityKind::Flora,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::Content,
            tuning_affinity: TuningAffinity::Untuned,
            resets_on_tuning: false,
        }),
        unlocks: &[],
        blockers: &[],
        access_rules: &[],
        power: None,
        flows: &[],
        model_refs: &[],
        notes: &["Static content tag for scrub harvestables and atmosphere."],
    },
    EntitySchemaDef {
        id: STRUCTURE_CRYSTAL_CIRCLE,
        entity_kind: EntityKind::Structure,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::Content,
            tuning_affinity: TuningAffinity::Untuned,
            resets_on_tuning: false,
        }),
        unlocks: &[],
        blockers: &[],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "The Crystal Circle is fixed to the Base Core in the current prototype.",
            related_ids: &[TILE_BASE_CORE],
        }],
        power: None,
        flows: &[],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: STRUCTURE_BASE,
        entity_kind: EntityKind::Structure,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::Content,
            tuning_affinity: TuningAffinity::Untuned,
            resets_on_tuning: false,
        }),
        unlocks: &[],
        blockers: &[],
        access_rules: &[AccessRuleDef {
            kind: AccessRuleKind::BaseOnly,
            label: "The Base is the root structure of the current prototype.",
            related_ids: &[TILE_BASE_CORE],
        }],
        power: None,
        flows: &[],
        model_refs: &[],
        notes: &[],
    },
    EntitySchemaDef {
        id: STRUCTURE_CAVE,
        entity_kind: EntityKind::Structure,
        persistence: Some(PersistenceDef {
            scope: PersistenceScope::Content,
            tuning_affinity: TuningAffinity::Untuned,
            resets_on_tuning: false,
        }),
        unlocks: &[],
        blockers: &[BlockerDef {
            kind: BlockerKind::ReachLocked,
            label: "The cave matters once bubble reach is high enough.",
            related_ids: &[TILE_SURVIVOR_CAVE],
        }],
        access_rules: &[],
        power: None,
        flows: &[],
        model_refs: &[],
        notes: &[],
    },
];

const ENTITY_VISIBILITY: &[EntityVisibilityDef] = &[
    EntityVisibilityDef {
        id: RESOURCE_BASSLINE,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_CRYSTAL_REMOVING_MOSS_UNLOCKED,
            },
            VisibilityConditionDef::ResourcePositive {
                resource_id: RESOURCE_BASSLINE,
            },
        ],
    },
    EntityVisibilityDef {
        id: RESOURCE_CHORUS,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_STUDIO_RESTORED,
            },
            VisibilityConditionDef::ResourcePositive {
                resource_id: RESOURCE_CHORUS,
            },
        ],
    },
    EntityVisibilityDef {
        id: RESOURCE_HARMONICS,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_RESONANCE_CHAMBER_BUILT,
            },
            VisibilityConditionDef::ResourcePositive {
                resource_id: RESOURCE_HARMONICS,
            },
        ],
    },
    EntityVisibilityDef {
        id: RESOURCE_STONE,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_TUTORIAL_INVESTIGATED,
            },
            VisibilityConditionDef::ResourcePositive {
                resource_id: RESOURCE_STONE,
            },
        ],
    },
    EntityVisibilityDef {
        id: RESOURCE_WATER,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_TUTORIAL_EXPLORED,
            },
            VisibilityConditionDef::ResourcePositive {
                resource_id: RESOURCE_WATER,
            },
        ],
    },
    EntityVisibilityDef {
        id: RESOURCE_VIBES,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_FIRE_PIT_BUILT,
            },
            VisibilityConditionDef::RecruitmentEnabled,
            VisibilityConditionDef::ResourcePositive {
                resource_id: RESOURCE_VIBES,
            },
        ],
    },
    EntityVisibilityDef {
        id: ROLE_CRYSTAL_BASSLINE,
        all_of: &[],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: ROLE_CRYSTAL_CHORUS,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_STUDIO_RESTORED,
            },
            VisibilityConditionDef::RoleAssigned {
                role_id: ROLE_CRYSTAL_CHORUS,
            },
        ],
    },
    EntityVisibilityDef {
        id: ROLE_CRYSTAL_HARMONICS,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_RESONANCE_CHAMBER_BUILT,
            },
            VisibilityConditionDef::RoleAssigned {
                role_id: ROLE_CRYSTAL_HARMONICS,
            },
        ],
    },
    EntityVisibilityDef {
        id: ROLE_CONSTRUCTION,
        all_of: &[],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: ROLE_SCAVENGE,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_TUTORIAL_EXPLORED,
            },
            VisibilityConditionDef::RoleAssigned { role_id: ROLE_SCAVENGE },
        ],
    },
    EntityVisibilityDef {
        id: ROLE_FIRE_PIT,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_FIRE_PIT_BUILT,
            },
            VisibilityConditionDef::RoleAssigned { role_id: ROLE_FIRE_PIT },
        ],
    },
    EntityVisibilityDef {
        id: ROLE_WATER,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_WATER_COLLECTION_UNLOCKED,
            },
            VisibilityConditionDef::RoleAssigned { role_id: ROLE_WATER },
        ],
    },
    EntityVisibilityDef {
        id: CONSTRUCTION_SLOT_CAPACITY,
        all_of: &[],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: CONSTRUCTION_OUTPUT,
        all_of: &[],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: CONSTRUCTION_STORAGE,
        all_of: &[],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: CONSTRUCTION_REMOVING_MOSS,
        all_of: &[VisibilityConditionDef::FlagUnset {
            flag_id: FLAG_CRYSTAL_REMOVING_MOSS_COMPLETED,
        }],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_CRYSTAL_REMOVING_MOSS_UNLOCKED,
        }],
    },
    EntityVisibilityDef {
        id: CONSTRUCTION_POLISH_FIELD,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_TUTORIAL_EXPLORED,
        }],
    },
    EntityVisibilityDef {
        id: PROJECT_RESTORE_STUDIO,
        all_of: &[VisibilityConditionDef::FlagUnset {
            flag_id: FLAG_BASE_STUDIO_RESTORED,
        }],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_STUDIO_RESTORE_UNLOCKED,
        }],
    },
    EntityVisibilityDef {
        id: PROJECT_BUILD_FIRE_PIT,
        all_of: &[VisibilityConditionDef::FlagUnset {
            flag_id: FLAG_BASE_FIRE_PIT_BUILT,
        }],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_STUDIO_RESTORED,
        }],
    },
    EntityVisibilityDef {
        id: PROJECT_BUILD_RESONANCE_CHAMBER,
        all_of: &[VisibilityConditionDef::FlagUnset {
            flag_id: FLAG_BASE_RESONANCE_CHAMBER_BUILT,
        }],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_FIRE_PIT_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: PROJECT_BUILD_MIX_CONSOLE,
        all_of: &[VisibilityConditionDef::FlagUnset {
            flag_id: FLAG_BASE_MIX_CONSOLE_BUILT,
        }],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_RESONANCE_CHAMBER_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: PROJECT_BUILD_WORKSHOP,
        all_of: &[VisibilityConditionDef::FlagUnset {
            flag_id: FLAG_BASE_WORKSHOP_BUILT,
        }],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_STUDIO_RESTORED,
        }],
    },
    EntityVisibilityDef {
        id: PROJECT_BUILD_RESEARCH_BOOTH,
        all_of: &[VisibilityConditionDef::FlagUnset {
            flag_id: FLAG_BASE_RESEARCH_BOOTH_BUILT,
        }],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_RESONANCE_CHAMBER_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: STATION_CRYSTAL_CIRCLE,
        all_of: &[],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: STATION_FIRE_PIT,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_FIRE_PIT_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: STATION_RESONANCE_CHAMBER,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_RESONANCE_CHAMBER_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: STATION_MIX_CONSOLE,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_MIX_CONSOLE_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: STATION_WORKSHOP,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_WORKSHOP_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: STATION_RESEARCH_BOOTH,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_RESEARCH_BOOTH_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: RECIPE_RESONANCE_FIELD_CALIBRATION,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_RESONANCE_CHAMBER_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: RECIPE_MIX_SIGNAL_BALANCING,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_MIX_CONSOLE_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: RECIPE_WORKSHOP_BUILDER_TOOLS,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_WORKSHOP_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: RECIPE_WORKSHOP_WATER_CONDENSERS,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_WORKSHOP_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: RECIPE_RESEARCH_CHORUS_ROUTING,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_RESEARCH_BOOTH_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: RECIPE_RESEARCH_HARMONIC_STUDY,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_RESEARCH_BOOTH_BUILT,
        }],
    },
    EntityVisibilityDef {
        id: WORLD_ACTION_INVESTIGATE_BASE,
        all_of: &[VisibilityConditionDef::FlagUnset {
            flag_id: FLAG_BASE_TUTORIAL_INVESTIGATED,
        }],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: WORLD_ACTION_EXPLORE_BASE,
        all_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_TUTORIAL_INVESTIGATED,
            },
            VisibilityConditionDef::FlagUnset {
                flag_id: FLAG_BASE_TUTORIAL_EXPLORED,
            },
        ],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_ROAD_TO_BASE,
        all_of: &[],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_FIRST_GLIMPSE,
        all_of: &[],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_ENTER_THE_BUBBLE,
        all_of: &[],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_INVESTIGATE_BASE,
        all_of: &[VisibilityConditionDef::FlagUnset {
            flag_id: FLAG_BASE_TUTORIAL_INVESTIGATED,
        }],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_EXPLORE_BASE,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_TUTORIAL_INVESTIGATED,
        }],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_RESTORE_STUDIO,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_STUDIO_RESTORE_UNLOCKED,
        }],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_BUILD_FIRE_PIT,
        all_of: &[],
        any_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_STUDIO_RESTORED,
        }],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_REACH_SURVIVOR_CAVE,
        all_of: &[VisibilityConditionDef::FlagSet {
            flag_id: FLAG_BASE_FIRE_PIT_BUILT,
        }],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_FIRST_RECRUIT,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::RecruitmentEnabled,
            VisibilityConditionDef::RecruitedAny,
            VisibilityConditionDef::PendingRecruits,
        ],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_AWAIT_SURVIVOR_ARRIVAL,
        all_of: &[VisibilityConditionDef::PendingRecruits],
        any_of: &[VisibilityConditionDef::Always],
    },
    EntityVisibilityDef {
        id: STORY_BEAT_STABILIZE_BASE,
        all_of: &[VisibilityConditionDef::RecruitedAny],
        any_of: &[VisibilityConditionDef::Always],
    },
];

const UI_ELEMENTS: &[UiElementDef] = &[
    UiElementDef {
        id: UI_PANEL_OBJECTIVES,
        label: "Objectives",
        related_ids: &[
            STORY_BEAT_INVESTIGATE_BASE,
            STORY_BEAT_EXPLORE_BASE,
            STORY_BEAT_RESTORE_STUDIO,
            STORY_BEAT_BUILD_FIRE_PIT,
            STORY_BEAT_REACH_SURVIVOR_CAVE,
            STORY_BEAT_FIRST_RECRUIT,
            STORY_BEAT_AWAIT_SURVIVOR_ARRIVAL,
            STORY_BEAT_STABILIZE_BASE,
        ],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[VisibilityConditionDef::Always],
        },
        presentation: Some(PresentationDef {
            short_label: "Objectives",
            player_hint: "Objectives translate the current story and system state into a playable next move.",
            cta_copy: None,
            primary_risk_copy: None,
            display_priority: 900,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_OBJECTIVE_STATUS,
        label: "Current Objective",
        related_ids: &[STORY_BEAT_INVESTIGATE_BASE, STORY_BEAT_EXPLORE_BASE, STORY_BEAT_RESTORE_STUDIO, STORY_BEAT_BUILD_FIRE_PIT, STORY_BEAT_FIRST_RECRUIT],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef {
            short_label: "Current Objective",
            player_hint: "Shows where the first-session arc currently stands.",
            cta_copy: None,
            primary_risk_copy: None,
            display_priority: 899,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_OBJECTIVE_ACTIVE_GOAL,
        label: "Active Goal",
        related_ids: &[STORY_BEAT_INVESTIGATE_BASE, STORY_BEAT_EXPLORE_BASE, STORY_BEAT_RESTORE_STUDIO, STORY_BEAT_BUILD_FIRE_PIT, STORY_BEAT_FIRST_RECRUIT],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef {
            short_label: "Active Goal",
            player_hint: "The highest-priority thing the player should complete next.",
            cta_copy: None,
            primary_risk_copy: None,
            display_priority: 898,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_OBJECTIVE_NEXT,
        label: "After That",
        related_ids: &[STORY_BEAT_EXPLORE_BASE, STORY_BEAT_RESTORE_STUDIO, STORY_BEAT_BUILD_FIRE_PIT, STORY_BEAT_FIRST_RECRUIT],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef {
            short_label: "After That",
            player_hint: "Shows the next meaningful progression step after the active goal.",
            cta_copy: None,
            primary_risk_copy: None,
            display_priority: 897,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_OBJECTIVE_BLOCKER,
        label: "Blocking This",
        related_ids: &[RESOURCE_STONE, RESOURCE_VIBES, RESOURCE_BASSLINE, RESOURCE_CHORUS, TILE_SURVIVOR_CAVE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef {
            short_label: "Blocking This",
            player_hint: "Surfaces the main current gate in the first playable loop.",
            cta_copy: None,
            primary_risk_copy: None,
            display_priority: 896,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_OBJECTIVE_UNLOCK,
        label: "This Unlocks",
        related_ids: &[RESOURCE_CHORUS, RESOURCE_WATER, STATION_FIRE_PIT, UI_ACTION_RECRUIT],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef {
            short_label: "This Unlocks",
            player_hint: "Shows the next system or story layer the player will gain.",
            cta_copy: None,
            primary_risk_copy: None,
            display_priority: 895,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_OBJECTIVE_NEXT_MOVE,
        label: "Do This Next",
        related_ids: &[ROLE_SCAVENGE, ROLE_CRYSTAL_BASSLINE, PROJECT_RESTORE_STUDIO, PROJECT_BUILD_FIRE_PIT],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef {
            short_label: "Do This Next",
            player_hint: "A condensed recommendation derived from the current progression state.",
            cta_copy: None,
            primary_risk_copy: None,
            display_priority: 894,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_OBJECTIVE_WATCH_OUT,
        label: "Watch Out",
        related_ids: &[RESOURCE_BASSLINE, RESOURCE_CHORUS, RESOURCE_VIBES, UI_STATUS_BASE_HOUSING],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef {
            short_label: "Watch Out",
            player_hint: "Highlights the most important current risk in the first session.",
            cta_copy: None,
            primary_risk_copy: None,
            display_priority: 893,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_PANEL_CONSTRUCTION,
        label: "Build and Repair",
        related_ids: &[ROLE_CONSTRUCTION, CONSTRUCTION_OUTPUT, PROJECT_RESTORE_STUDIO, PROJECT_BUILD_FIRE_PIT],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_STUDIO_RESTORE_UNLOCKED,
            }],
        },
        presentation: Some(PresentationDef {
            short_label: "Construction",
            player_hint: "Construction turns staffing and resources into permanent base progress.",
            cta_copy: None,
            primary_risk_copy: Some("No builders means all progress stalls immediately."),
            display_priority: 892,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_PANEL_CRYSTAL,
        label: "Crystal Circle",
        related_ids: &[
            STATION_CRYSTAL_CIRCLE,
            RESOURCE_BASSLINE,
            RESOURCE_CHORUS,
            RESOURCE_HARMONICS,
            FLAG_CRYSTAL_REMOVING_MOSS_UNLOCKED,
        ],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[VisibilityConditionDef::FlagSet {
                flag_id: FLAG_CRYSTAL_REMOVING_MOSS_UNLOCKED,
            }],
        },
        presentation: Some(PresentationDef {
            short_label: "Crystal Circle",
            player_hint: "The Crystal is only surfaced once the overgrowth is cleared enough to uncover it.",
            cta_copy: None,
            primary_risk_copy: Some("Before the Crystal is uncovered, its full control surface stays hidden."),
            display_priority: 891,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_PANEL_HERO,
        label: "Hero",
        related_ids: &[ROLE_CRYSTAL_BASSLINE, ROLE_CRYSTAL_CHORUS, ROLE_CRYSTAL_HARMONICS, WORLD_ACTION_INVESTIGATE_BASE, WORLD_ACTION_EXPLORE_BASE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef {
            short_label: "Hero",
            player_hint: "The Hero can idle, staff a band, or leave to perform world actions.",
            cta_copy: None,
            primary_risk_copy: Some("World actions temporarily pull the Hero away from band support."),
            display_priority: 895,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_PANEL_MAP,
        label: "Map",
        related_ids: &[UI_MAP_CAVE_GATE, TILE_SURVIVOR_CAVE, RESOURCE_BASSLINE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef {
            short_label: "Map",
            player_hint: "The map shows current bubble reach and nearby progression landmarks.",
            cta_copy: None,
            primary_risk_copy: Some("If Bassline falls too low, the bubble can contract and lose reach."),
            display_priority: 894,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_METRIC_CRYSTAL_FREE_SLOTS,
        label: "Free Slots",
        related_ids: &[STATION_CRYSTAL_CIRCLE, ROLE_CRYSTAL_BASSLINE, ROLE_CRYSTAL_CHORUS, ROLE_CRYSTAL_HARMONICS],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef {
            short_label: "Free Slots",
            player_hint: "Crystal slots are shared across Bassline, Chorus, and Harmonics staffing.",
            cta_copy: None,
            primary_risk_copy: Some("No free slots means the Crystal cannot scale without upgrades."),
            display_priority: 891,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_METRIC_CRYSTAL_OUTPUT_LEVEL,
        label: "Output",
        related_ids: &[CONSTRUCTION_OUTPUT, STATION_CRYSTAL_CIRCLE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef {
            short_label: "Output",
            player_hint: "Crystal output level increases all three band tracks.",
            cta_copy: None,
            primary_risk_copy: None,
            display_priority: 890,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_METRIC_CRYSTAL_FIELD_POLISH,
        label: "Field Polish",
        related_ids: &[CONSTRUCTION_POLISH_FIELD, RESOURCE_BASSLINE],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[
                VisibilityConditionDef::FlagSet { flag_id: FLAG_BASE_TUTORIAL_EXPLORED },
                VisibilityConditionDef::FlagSet { flag_id: FLAG_CRYSTAL_REMOVING_MOSS_COMPLETED },
            ],
        },
        presentation: Some(PresentationDef {
            short_label: "Field Polish",
            player_hint: "Field Polish improves how efficiently Bassline becomes bubble coverage.",
            cta_copy: None,
            primary_risk_copy: None,
            display_priority: 889,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_METRIC_CRYSTAL_BUBBLE_BUDGET,
        label: "Bubble Budget",
        related_ids: &[RESOURCE_BASSLINE, UI_MAP_CAVE_GATE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef {
            short_label: "Bubble Budget",
            player_hint: "Shows how much active bubble coverage the current Bassline pool is sustaining.",
            cta_copy: None,
            primary_risk_copy: Some("Spending too deeply into Bassline can force the bubble to contract."),
            display_priority: 888,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_METRIC_CRYSTAL_SOURCE,
        label: "Source",
        related_ids: &[RESOURCE_BASSLINE, ROLE_CRYSTAL_BASSLINE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Source", player_hint: "Shows the primary current source for Bassline.", cta_copy: None, primary_risk_copy: None, display_priority: 887, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_METRIC_CRYSTAL_SINK,
        label: "Sink",
        related_ids: &[RESOURCE_BASSLINE, CONSTRUCTION_OUTPUT, CONSTRUCTION_STORAGE, CONSTRUCTION_SLOT_CAPACITY, CONSTRUCTION_POLISH_FIELD],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Sink", player_hint: "Shows the primary current demand on stored Bassline.", cta_copy: None, primary_risk_copy: None, display_priority: 886, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_METRIC_CRYSTAL_RISK,
        label: "Risk",
        related_ids: &[RESOURCE_BASSLINE, UI_MAP_CAVE_GATE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Risk", player_hint: "Summarizes the current bubble risk created by Bassline pressure.", cta_copy: None, primary_risk_copy: None, display_priority: 885, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_METRIC_CHORUS_RATE,
        label: "Rate",
        related_ids: &[RESOURCE_CHORUS, ROLE_CRYSTAL_CHORUS],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::FlagSet { flag_id: FLAG_BASE_STUDIO_RESTORED }] },
        presentation: Some(PresentationDef { short_label: "Rate", player_hint: "Current Chorus generation per second.", cta_copy: None, primary_risk_copy: None, display_priority: 884, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_METRIC_CHORUS_STATION_UPKEEP,
        label: "Stations",
        related_ids: &[RESOURCE_CHORUS, STATION_RESONANCE_CHAMBER, STATION_MIX_CONSOLE, STATION_WORKSHOP, STATION_RESEARCH_BOOTH],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::FlagSet { flag_id: FLAG_BASE_STUDIO_RESTORED }] },
        presentation: Some(PresentationDef { short_label: "Stations", player_hint: "Powered stations consume Chorus while active.", cta_copy: None, primary_risk_copy: None, display_priority: 883, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_METRIC_CHORUS_SOURCE,
        label: "Source",
        related_ids: &[RESOURCE_CHORUS, ROLE_CRYSTAL_CHORUS],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::FlagSet { flag_id: FLAG_BASE_STUDIO_RESTORED }] },
        presentation: Some(PresentationDef { short_label: "Source", player_hint: "Shows the primary current source for Chorus.", cta_copy: None, primary_risk_copy: None, display_priority: 882, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_METRIC_CHORUS_SINK,
        label: "Sink",
        related_ids: &[RESOURCE_CHORUS, ROLE_CONSTRUCTION, ROLE_FIRE_PIT, ROLE_SCAVENGE, ROLE_WATER, STATION_RESONANCE_CHAMBER, STATION_MIX_CONSOLE, STATION_WORKSHOP, STATION_RESEARCH_BOOTH],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::FlagSet { flag_id: FLAG_BASE_STUDIO_RESTORED }] },
        presentation: Some(PresentationDef { short_label: "Sink", player_hint: "Shows the primary current power-side Chorus demand.", cta_copy: None, primary_risk_copy: None, display_priority: 881, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_METRIC_CHORUS_RISK,
        label: "Risk",
        related_ids: &[RESOURCE_CHORUS, UI_METRIC_POWER_BROWNOUT],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::FlagSet { flag_id: FLAG_BASE_STUDIO_RESTORED }] },
        presentation: Some(PresentationDef { short_label: "Risk", player_hint: "Summarizes current brownout risk driven by Chorus pressure.", cta_copy: None, primary_risk_copy: None, display_priority: 880, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_METRIC_HARMONICS_TIER,
        label: "Tier",
        related_ids: &[RESOURCE_HARMONICS, STATION_RESONANCE_CHAMBER],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::FlagSet { flag_id: FLAG_BASE_RESONANCE_CHAMBER_BUILT }] },
        presentation: Some(PresentationDef { short_label: "Tier", player_hint: "Harmonics tier reflects how far efficiency and resilience have progressed.", cta_copy: None, primary_risk_copy: None, display_priority: 879, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_METRIC_HARMONICS_EFFICIENCY,
        label: "Boost",
        related_ids: &[RESOURCE_HARMONICS, STATION_RESONANCE_CHAMBER, STATION_MIX_CONSOLE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::FlagSet { flag_id: FLAG_BASE_RESONANCE_CHAMBER_BUILT }] },
        presentation: Some(PresentationDef { short_label: "Boost", player_hint: "Harmonics efficiency boosts the rest of the base economy.", cta_copy: None, primary_risk_copy: None, display_priority: 878, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_METRIC_HARMONICS_SOURCE,
        label: "Source",
        related_ids: &[RESOURCE_HARMONICS, ROLE_CRYSTAL_HARMONICS],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::FlagSet { flag_id: FLAG_BASE_RESONANCE_CHAMBER_BUILT }] },
        presentation: Some(PresentationDef { short_label: "Source", player_hint: "Shows the primary current source for Harmonics.", cta_copy: None, primary_risk_copy: None, display_priority: 877, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_METRIC_HARMONICS_SINK,
        label: "Sink",
        related_ids: &[RESOURCE_HARMONICS, STATION_RESONANCE_CHAMBER, STATION_MIX_CONSOLE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::FlagSet { flag_id: FLAG_BASE_RESONANCE_CHAMBER_BUILT }] },
        presentation: Some(PresentationDef { short_label: "Sink", player_hint: "Shows where Harmonics-side progress is currently being invested.", cta_copy: None, primary_risk_copy: None, display_priority: 876, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_METRIC_HARMONICS_RISK,
        label: "Risk",
        related_ids: &[RESOURCE_HARMONICS, STATION_RESONANCE_CHAMBER, STATION_MIX_CONSOLE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::FlagSet { flag_id: FLAG_BASE_RESONANCE_CHAMBER_BUILT }] },
        presentation: Some(PresentationDef { short_label: "Risk", player_hint: "Summarizes the current risk of leaving Harmonics understaffed.", cta_copy: None, primary_risk_copy: None, display_priority: 875, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_PANEL_POWER,
        label: "Power and Processing",
        related_ids: &[RESOURCE_CHORUS, RESOURCE_HARMONICS, STATION_RESONANCE_CHAMBER, STATION_MIX_CONSOLE],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_STUDIO_RESTORED,
            }],
        },
        presentation: Some(PresentationDef {
            short_label: "Power",
            player_hint: "Chorus powers the base. Harmonics improves throughput and resilience.",
            cta_copy: None,
            primary_risk_copy: Some("Brownouts will shut down the last requested powered station first."),
            display_priority: 760,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_CONTROL_HERO_TASK,
        label: "Task",
        related_ids: &[ROLE_CRYSTAL_BASSLINE, ROLE_CRYSTAL_CHORUS, ROLE_CRYSTAL_HARMONICS, WORLD_ACTION_INVESTIGATE_BASE, WORLD_ACTION_EXPLORE_BASE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef {
            short_label: "Task",
            player_hint: "Shows what the Hero is currently assigned to do.",
            cta_copy: Some("Choose Hero Task"),
            primary_risk_copy: None,
            display_priority: 868,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_STATUS_HERO,
        label: "Status",
        related_ids: &[WORLD_ACTION_INVESTIGATE_BASE, WORLD_ACTION_EXPLORE_BASE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef {
            short_label: "Status",
            player_hint: "Shows whether the Hero is idle, active, or tied up on a world action.",
            cta_copy: None,
            primary_risk_copy: None,
            display_priority: 867,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_CONTROL_CONSTRUCTION_CREW,
        label: "Construction Crew",
        related_ids: &[ROLE_CONSTRUCTION, PROJECT_RESTORE_STUDIO, PROJECT_BUILD_FIRE_PIT],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef {
            short_label: "Construction Crew",
            player_hint: "Builders determine how quickly active construction can progress.",
            cta_copy: Some("Assign Builders"),
            primary_risk_copy: Some("No builders means every construction project stalls."),
            display_priority: 866,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_SUMMARY_CONSTRUCTION_SOURCE,
        label: "Source",
        related_ids: &[ROLE_CONSTRUCTION, RESOURCE_STONE, RESOURCE_BASSLINE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Source", player_hint: "Shows the main current input feeding construction progress.", cta_copy: None, primary_risk_copy: None, display_priority: 874, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_SUMMARY_CONSTRUCTION_SINK,
        label: "Sink",
        related_ids: &[CONSTRUCTION_OUTPUT, PROJECT_RESTORE_STUDIO, PROJECT_BUILD_FIRE_PIT],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Sink", player_hint: "Shows the active current construction demand.", cta_copy: None, primary_risk_copy: None, display_priority: 873, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_SUMMARY_CONSTRUCTION_BLOCKER,
        label: "Blocker",
        related_ids: &[ROLE_CONSTRUCTION, RESOURCE_STONE, RESOURCE_BASSLINE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Blocker", player_hint: "Shows the main thing currently stopping construction from moving.", cta_copy: None, primary_risk_copy: None, display_priority: 872, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_SUMMARY_POWER_SOURCE,
        label: "Source",
        related_ids: &[RESOURCE_CHORUS, RESOURCE_HARMONICS, ROLE_CRYSTAL_CHORUS, ROLE_CRYSTAL_HARMONICS],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::FlagSet { flag_id: FLAG_BASE_STUDIO_RESTORED }] },
        presentation: Some(PresentationDef { short_label: "Source", player_hint: "Shows the main current input to the power layer.", cta_copy: None, primary_risk_copy: None, display_priority: 871, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_SUMMARY_POWER_SINK,
        label: "Sink",
        related_ids: &[RESOURCE_CHORUS, STATION_RESONANCE_CHAMBER, STATION_MIX_CONSOLE, STATION_WORKSHOP, STATION_RESEARCH_BOOTH],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::FlagSet { flag_id: FLAG_BASE_STUDIO_RESTORED }] },
        presentation: Some(PresentationDef { short_label: "Sink", player_hint: "Shows the main current Chorus demand in the power network.", cta_copy: None, primary_risk_copy: None, display_priority: 870, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_SUMMARY_POWER_BLOCKER,
        label: "Blocker",
        related_ids: &[UI_METRIC_POWER_BROWNOUT, RESOURCE_CHORUS],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::FlagSet { flag_id: FLAG_BASE_STUDIO_RESTORED }] },
        presentation: Some(PresentationDef { short_label: "Blocker", player_hint: "Shows the main current blocker in the power and processing layer.", cta_copy: None, primary_risk_copy: None, display_priority: 869, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_METRIC_POWER_ACTIVE_UPKEEP,
        label: "Chorus Upkeep",
        related_ids: &[RESOURCE_CHORUS, STATION_RESONANCE_CHAMBER, STATION_MIX_CONSOLE, STATION_WORKSHOP, STATION_RESEARCH_BOOTH],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_STUDIO_RESTORED,
            }],
        },
        presentation: Some(PresentationDef {
            short_label: "Chorus Upkeep",
            player_hint: "Shows the current Chorus upkeep from active powered stations.",
            cta_copy: None,
            primary_risk_copy: Some("High upkeep relative to Chorus income increases brownout pressure."),
            display_priority: 721,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_METRIC_POWER_ACTIVE_STAFF,
        label: "Active Staff",
        related_ids: &[ROLE_CONSTRUCTION, ROLE_FIRE_PIT, ROLE_SCAVENGE, ROLE_WATER, RESOURCE_CHORUS],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_STUDIO_RESTORED,
            }],
        },
        presentation: Some(PresentationDef {
            short_label: "Active Staff",
            player_hint: "Shows how many staffed roles are currently contributing to life support demand.",
            cta_copy: None,
            primary_risk_copy: None,
            display_priority: 720,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_METRIC_POWER_LIFE_SUPPORT,
        label: "Life Support",
        related_ids: &[RESOURCE_CHORUS],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_STUDIO_RESTORED,
            }],
        },
        presentation: Some(PresentationDef {
            short_label: "Life Support",
            player_hint: "Active staff increase Chorus upkeep through life support.",
            cta_copy: None,
            primary_risk_copy: Some("If Chorus runs thin, life support contributes to brownout pressure."),
            display_priority: 720,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_METRIC_POWER_BROWNOUT,
        label: "Brownout",
        related_ids: &[RESOURCE_CHORUS, STATION_RESONANCE_CHAMBER, STATION_MIX_CONSOLE],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[
                VisibilityConditionDef::BrownoutActive,
                VisibilityConditionDef::FlagSet {
                    flag_id: FLAG_BASE_RESONANCE_CHAMBER_BUILT,
                },
                VisibilityConditionDef::FlagSet {
                    flag_id: FLAG_BASE_MIX_CONSOLE_BUILT,
                },
            ],
        },
        presentation: Some(PresentationDef {
            short_label: "Brownout",
            player_hint: "Brownouts appear when Chorus cannot sustain all requested power and life support.",
            cta_copy: None,
            primary_risk_copy: Some("Increase Chorus or reduce powered demand to stabilize the base."),
            display_priority: 730,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_PANEL_BASE,
        label: "Base",
        related_ids: &[RESOURCE_STONE, RESOURCE_WATER, RESOURCE_VIBES, PROJECT_RESTORE_STUDIO, PROJECT_BUILD_FIRE_PIT],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_TUTORIAL_INVESTIGATED,
            }],
        },
        presentation: Some(PresentationDef {
            short_label: "Base",
            player_hint: "The Base panel gathers supplies, housing, recruitment, and social pressure.",
            cta_copy: None,
            primary_risk_copy: None,
            display_priority: 868,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_METRIC_BASE_STONE_STOCK,
        label: "Stone Stock",
        related_ids: &[RESOURCE_STONE, ROLE_SCAVENGE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::FlagSet { flag_id: FLAG_BASE_TUTORIAL_EXPLORED }] },
        presentation: Some(PresentationDef { short_label: "Stone Stock", player_hint: "Shows how much scavengable stone remains around the base.", cta_copy: None, primary_risk_copy: None, display_priority: 867, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_METRIC_BASE_WATER_STOCK,
        label: "Water Stock",
        related_ids: &[RESOURCE_WATER, ROLE_WATER],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::FlagSet { flag_id: FLAG_BASE_WATER_COLLECTION_UNLOCKED }] },
        presentation: Some(PresentationDef { short_label: "Water Stock", player_hint: "Shows how much collectable water remains in the local source.", cta_copy: None, primary_risk_copy: None, display_priority: 866, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_SUMMARY_BASE_SOURCE,
        label: "Source",
        related_ids: &[ROLE_SCAVENGE, ROLE_WATER, ROLE_FIRE_PIT, RESOURCE_STONE, RESOURCE_WATER, RESOURCE_VIBES],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Source", player_hint: "Shows the main current source feeding the Base layer.", cta_copy: None, primary_risk_copy: None, display_priority: 865, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_SUMMARY_BASE_SINK,
        label: "Sink",
        related_ids: &[PROJECT_RESTORE_STUDIO, PROJECT_BUILD_FIRE_PIT, UI_ACTION_RECRUIT],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Sink", player_hint: "Shows the main current demand on Base-side materials and Vibes.", cta_copy: None, primary_risk_copy: None, display_priority: 864, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_SUMMARY_BASE_BLOCKER,
        label: "Blocker",
        related_ids: &[RESOURCE_STONE, RESOURCE_WATER, RESOURCE_VIBES, UI_STATUS_BASE_HOUSING],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Blocker", player_hint: "Shows the main current blocker in the Base layer.", cta_copy: None, primary_risk_copy: None, display_priority: 863, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_METRIC_BASE_RECRUIT_COST,
        label: "Recruit Cost",
        related_ids: &[RESOURCE_VIBES],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[
                VisibilityConditionDef::RecruitmentEnabled,
                VisibilityConditionDef::PendingRecruits,
                VisibilityConditionDef::RecruitedAny,
            ],
        },
        presentation: Some(PresentationDef {
            short_label: "Recruit Cost",
            player_hint: "Vibes pay for new survivors once the cave route is open.",
            cta_copy: Some("Recruit Survivor"),
            primary_risk_copy: Some("If Vibes stall, crew growth stalls with them."),
            display_priority: 700,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_PANEL_RUN,
        label: "Run",
        related_ids: &[RESOURCE_BASSLINE, RESOURCE_CHORUS, RESOURCE_HARMONICS, RESOURCE_STONE, RESOURCE_WATER, RESOURCE_VIBES],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef {
            short_label: "Run",
            player_hint: "Run controls handle save/load and offline return visibility for the current play session.",
            cta_copy: None,
            primary_risk_copy: None,
            display_priority: 862,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_METRIC_BASE_BUNKS,
        label: "Bunks",
        related_ids: &[PROJECT_RESTORE_STUDIO],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_STUDIO_RESTORED,
            }],
        },
        presentation: Some(PresentationDef {
            short_label: "Bunks",
            player_hint: "The Studio provides bunks. Housing limits how fast the crew can grow safely.",
            cta_copy: None,
            primary_risk_copy: Some("If bunks run short, Bad Vibes will start building up."),
            display_priority: 690,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_METRIC_BASE_HOUSING,
        label: "Housing",
        related_ids: &[PROJECT_RESTORE_STUDIO],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_STUDIO_RESTORED,
            }],
        },
        presentation: Some(PresentationDef {
            short_label: "Housing",
            player_hint: "Housing shows whether current bunks can support everyone at the base.",
            cta_copy: None,
            primary_risk_copy: Some("Missing bunks will degrade morale and eventually crew performance."),
            display_priority: 680,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_METRIC_BASE_BAD_VIBES,
        label: "Morale Drain",
        related_ids: &[RESOURCE_VIBES, PROJECT_BUILD_FIRE_PIT],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_FIRE_PIT_BUILT,
            }],
        },
        presentation: Some(PresentationDef {
            short_label: "Morale Drain",
            player_hint: "Bad Vibes track the pressure created by overcrowding and unstable housing.",
            cta_copy: None,
            primary_risk_copy: Some("If morale drain rises, crew efficiency will fall."),
            display_priority: 670,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_METRIC_BASE_CREW_EFFICIENCY,
        label: "Crew Speed",
        related_ids: &[RESOURCE_VIBES, PROJECT_BUILD_FIRE_PIT],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_FIRE_PIT_BUILT,
            }],
        },
        presentation: Some(PresentationDef {
            short_label: "Crew Speed",
            player_hint: "Crew speed reflects how much Bad Vibes are slowing the base down.",
            cta_copy: None,
            primary_risk_copy: Some("Low crew speed slows construction, gathering, and the whole first-session arc."),
            display_priority: 660,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_CONTROL_BASE_SCAVENGE,
        label: "Scavenge Crew",
        related_ids: &[ROLE_SCAVENGE, RESOURCE_STONE],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_TUTORIAL_EXPLORED,
            }],
        },
        presentation: Some(PresentationDef {
            short_label: "Scavenge",
            player_hint: "Scavenge Crew convert the surrounding ruins into Stone for repairs and projects.",
            cta_copy: Some("Add Scavenge Crew"),
            primary_risk_copy: None,
            display_priority: 650,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_CONTROL_BASE_FIRE_PIT,
        label: "Fire Pit Crew",
        related_ids: &[ROLE_FIRE_PIT, RESOURCE_VIBES],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_FIRE_PIT_BUILT,
            }],
        },
        presentation: Some(PresentationDef {
            short_label: "Fire Pit",
            player_hint: "Fire Pit Crew turn your built fire into Vibes for recruitment.",
            cta_copy: Some("Add Fire Pit Crew"),
            primary_risk_copy: None,
            display_priority: 640,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_CONTROL_BASE_WATER,
        label: "Water Crew",
        related_ids: &[ROLE_WATER, RESOURCE_WATER],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_WATER_COLLECTION_UNLOCKED,
            }],
        },
        presentation: Some(PresentationDef {
            short_label: "Water",
            player_hint: "Water Crew collect and refill the water loop for repairs and upgrades.",
            cta_copy: Some("Add Water Crew"),
            primary_risk_copy: None,
            display_priority: 630,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_ACTION_RECRUIT,
        label: "Recruit Survivor",
        related_ids: &[RESOURCE_VIBES],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[
                VisibilityConditionDef::RecruitmentEnabled,
                VisibilityConditionDef::PendingRecruits,
                VisibilityConditionDef::RecruitedAny,
            ],
        },
        presentation: Some(PresentationDef {
            short_label: "Recruit",
            player_hint: "Recruiting survivors spends Vibes and expands your crew capacity.",
            cta_copy: Some("Recruit Survivor"),
            primary_risk_copy: Some("If Vibes are low, recruitment stalls."),
            display_priority: 620,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_STATUS_BASE_STUDIO,
        label: "Studio Status",
        related_ids: &[PROJECT_RESTORE_STUDIO],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_STUDIO_RESTORE_UNLOCKED,
            }],
        },
        presentation: Some(PresentationDef {
            short_label: "Studio",
            player_hint: "The Studio is the first major repair and unlocks housing plus Chorus.",
            cta_copy: None,
            primary_risk_copy: None,
            display_priority: 610,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_STATUS_BASE_FIRE_PIT,
        label: "Fire Pit Status",
        related_ids: &[PROJECT_BUILD_FIRE_PIT],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[
                VisibilityConditionDef::FlagSet {
                    flag_id: FLAG_BASE_FIRE_PIT_BUILT,
                },
                VisibilityConditionDef::RecruitmentEnabled,
            ],
        },
        presentation: Some(PresentationDef {
            short_label: "Fire Pit Status",
            player_hint: "The Fire Pit determines whether the Vibes loop is actually online.",
            cta_copy: None,
            primary_risk_copy: None,
            display_priority: 600,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_STATUS_BASE_RECRUITS,
        label: "Recruit Status",
        related_ids: &[RESOURCE_VIBES],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[
                VisibilityConditionDef::RecruitmentEnabled,
                VisibilityConditionDef::PendingRecruits,
                VisibilityConditionDef::RecruitedAny,
            ],
        },
        presentation: Some(PresentationDef {
            short_label: "Recruit Status",
            player_hint: "This shows pending recruits and remaining instant recruit stock.",
            cta_copy: None,
            primary_risk_copy: None,
            display_priority: 590,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_STATUS_BASE_HOUSING,
        label: "Housing Status",
        related_ids: &[PROJECT_RESTORE_STUDIO],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_STUDIO_RESTORED,
            }],
        },
        presentation: Some(PresentationDef {
            short_label: "Housing Status",
            player_hint: "Housing status warns when the crew outgrows the available bunks.",
            cta_copy: None,
            primary_risk_copy: Some("Overcrowding creates Bad Vibes over time."),
            display_priority: 580,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: UI_MAP_CAVE_GATE,
        label: "Cave Gate",
        related_ids: &[WORLD_ACTION_EXPLORE_BASE, RESOURCE_BASSLINE],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[VisibilityConditionDef::RecruitmentDisabled],
        },
        presentation: Some(PresentationDef {
            short_label: "Cave Gate",
            player_hint: "The cave route opens once the Bassline bubble reaches it safely.",
            cta_copy: None,
            primary_risk_copy: None,
            display_priority: 570,
            reveal: PresentationReveal::Default,
        }),
    },
    UiElementDef {
        id: "ui.app.eyebrow",
        label: "AD&D",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "AD&D", player_hint: "App eyebrow label.", cta_copy: None, primary_risk_copy: None, display_priority: 120, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.app.view.game",
        label: "Game View",
        related_ids: &[UI_PANEL_HERO, UI_PANEL_OBJECTIVES, UI_PANEL_RUN],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Game View", player_hint: "Player-facing view.", cta_copy: None, primary_risk_copy: None, display_priority: 119, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.app.view.admin",
        label: "Admin View",
        related_ids: &[UI_PANEL_RUN],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Admin View", player_hint: "Debug and inspection view.", cta_copy: None, primary_risk_copy: None, display_priority: 118, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.app.view.data_tree",
        label: "Data Tree",
        related_ids: &[UI_PANEL_OBJECTIVES],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Data Tree", player_hint: "Catalog and graph inspection view.", cta_copy: None, primary_risk_copy: None, display_priority: 117, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.hero.name",
        label: "The Hero",
        related_ids: &[UI_PANEL_HERO],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "The Hero", player_hint: "Current run protagonist.", cta_copy: None, primary_risk_copy: None, display_priority: 116, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.hero.class.drummer",
        label: "Drummer",
        related_ids: &[ROLE_CRYSTAL_BASSLINE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Drummer", player_hint: "Bassline-focused Hero class track.", cta_copy: None, primary_risk_copy: None, display_priority: 115, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.hero.class.vocalist",
        label: "Vocalist",
        related_ids: &[ROLE_CRYSTAL_CHORUS],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Vocalist", player_hint: "Chorus-focused Hero class track.", cta_copy: None, primary_risk_copy: None, display_priority: 114, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.hero.class.synth",
        label: "Synth",
        related_ids: &[ROLE_CRYSTAL_HARMONICS],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Synth", player_hint: "Harmonics-focused Hero class track.", cta_copy: None, primary_risk_copy: None, display_priority: 113, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_METRIC_HERO_VITALS,
        label: "Vitals Monitor",
        related_ids: &[FLAG_HERO_OUTSIDE_BUBBLE, FLAG_HERO_FORCED_RETURN_ACTIVE, FLAG_HERO_RECOVERING_AT_STUDIO],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Vitals Monitor", player_hint: "Shows current Viral Load and strain tier.", cta_copy: None, primary_risk_copy: Some("If Viral Load crosses the point of no return, forced retreat starts immediately."), display_priority: 112, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_METRIC_HERO_WOUNDS,
        label: "Wounds",
        related_ids: &[FLAG_HERO_FORCED_RETURN_ACTIVE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Wounds", player_hint: "Tracks the Hero wound pool separately from Viral Load.", cta_copy: None, primary_risk_copy: None, display_priority: 111, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_METRIC_HERO_RETURN_WINDOW,
        label: "Return Window",
        related_ids: &[FLAG_HERO_OUTSIDE_BUBBLE, FLAG_HERO_FORCED_RETURN_ACTIVE],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[
                VisibilityConditionDef::HeroOutsideBubble,
                VisibilityConditionDef::HeroForcedReturn,
                VisibilityConditionDef::ViralLoadPositive,
            ],
        },
        presentation: Some(PresentationDef { short_label: "Return Window", player_hint: "Shows how much safe margin remains before forced retreat or how long retreat will take.", cta_copy: None, primary_risk_copy: Some("A shrinking window means the Hero is almost out of safe return budget."), display_priority: 110, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_METRIC_HERO_RECOVERY,
        label: "Recovery",
        related_ids: &[FLAG_HERO_RECOVERING_AT_STUDIO, FLAG_HERO_OUTSIDE_BUBBLE],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[
                VisibilityConditionDef::HeroRecovering,
                VisibilityConditionDef::ViralLoadPositive,
            ],
        },
        presentation: Some(PresentationDef { short_label: "Recovery", player_hint: "Recovery starts only once the Hero is back in the Studio and slows during severe brownouts.", cta_copy: None, primary_risk_copy: Some("Brownouts can slow or stop recovery at the Studio."), display_priority: 109, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_METRIC_HERO_ECHO_SCARS,
        label: "Echo Scars",
        related_ids: &[FLAG_HERO_FORCED_RETURN_ACTIVE],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[
                VisibilityConditionDef::EchoScarsPositive,
                VisibilityConditionDef::HeroForcedReturn,
            ],
        },
        presentation: Some(PresentationDef { short_label: "Echo Scars", player_hint: "Forced returns leave Echo Scars behind even when the Hero survives.", cta_copy: None, primary_risk_copy: Some("Echo Scars stack and will matter more as the world layer opens up."), display_priority: 108, reveal: PresentationReveal::Advanced }),
    },
    UiElementDef {
        id: UI_METRIC_HERO_DEBUFF,
        label: "Strain Tier",
        related_ids: &[FLAG_HERO_OUTSIDE_BUBBLE],
        visibility: VisibilityDef {
            all_of: &[],
            any_of: &[
                VisibilityConditionDef::ViralLoadPositive,
                VisibilityConditionDef::HeroForcedReturn,
            ],
        },
        presentation: Some(PresentationDef { short_label: "Strain Tier", player_hint: "Viral Load thresholds reduce Hero work and movement before full forced return.", cta_copy: None, primary_risk_copy: Some("Higher strain makes the Hero slower and less effective outside safety."), display_priority: 107, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.hero.state.forced_return",
        label: "Forced Return",
        related_ids: &[FLAG_HERO_FORCED_RETURN_ACTIVE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Forced Return", player_hint: "Hero state label during automatic retreat.", cta_copy: None, primary_risk_copy: None, display_priority: 106, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.hero.state.returning_to_studio",
        label: "Returning to Studio",
        related_ids: &[FLAG_HERO_FORCED_RETURN_ACTIVE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Returning to Studio", player_hint: "Hero state label after re-entering the bubble during forced return.", cta_copy: None, primary_risk_copy: None, display_priority: 105, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.hero.state.recovering",
        label: "Recovering at Studio",
        related_ids: &[FLAG_HERO_RECOVERING_AT_STUDIO],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Recovering at Studio", player_hint: "Hero state label during Studio-bound recovery.", cta_copy: None, primary_risk_copy: None, display_priority: 104, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.hero.state.outside_bubble",
        label: "Outside Bubble",
        related_ids: &[FLAG_HERO_OUTSIDE_BUBBLE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Outside Bubble", player_hint: "Hero state label while exposed to the Silence outside safety.", cta_copy: None, primary_risk_copy: None, display_priority: 103, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.map.metric.reach",
        label: "Reach",
        related_ids: &[UI_PANEL_MAP, RESOURCE_BASSLINE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Reach", player_hint: "Current bubble reach from the base.", cta_copy: None, primary_risk_copy: None, display_priority: 112, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.map.metric.frontier",
        label: "Frontier",
        related_ids: &[UI_PANEL_MAP, RESOURCE_BASSLINE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Frontier", player_hint: "Current conversion progress at the bubble edge.", cta_copy: None, primary_risk_copy: None, display_priority: 111, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.map.metric.target",
        label: "Target",
        related_ids: &[UI_PANEL_MAP, RESOURCE_BASSLINE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Target", player_hint: "Target bubble reach from current Bassline budget.", cta_copy: None, primary_risk_copy: None, display_priority: 110, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.map.metric.cave_gate_in",
        label: "Cave Gate in",
        related_ids: &[UI_MAP_CAVE_GATE, TILE_SURVIVOR_CAVE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::RecruitmentDisabled] },
        presentation: Some(PresentationDef { short_label: "Cave Gate in", player_hint: "Remaining reach needed to open the cave route.", cta_copy: None, primary_risk_copy: None, display_priority: 109, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.map.metric.shrink_warning",
        label: "Bubble will shrink in",
        related_ids: &[RESOURCE_BASSLINE, UI_PANEL_MAP],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Bubble will shrink in", player_hint: "Countdown until the bubble contracts if budget stays too low.", cta_copy: None, primary_risk_copy: Some("Spend less Bassline or grow supply to avoid shrink."), display_priority: 108, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: UI_PANEL_NARRATIVE,
        label: "Arrival",
        related_ids: &[
            STORY_BEAT_ROAD_TO_BASE,
            STORY_BEAT_FIRST_GLIMPSE,
            STORY_BEAT_ENTER_THE_BUBBLE,
            STORY_BEAT_INVESTIGATE_BASE,
            STORY_BEAT_EXPLORE_BASE,
        ],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Arrival", player_hint: "Narrative intro panel for the first five opening beats.", cta_copy: None, primary_risk_copy: None, display_priority: 108, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.narrative.kicker",
        label: "Introduction",
        related_ids: &[UI_PANEL_NARRATIVE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Introduction", player_hint: "Narrative intro panel kicker.", cta_copy: None, primary_risk_copy: None, display_priority: 107, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.narrative.choice_label",
        label: "Choose your line",
        related_ids: &[UI_PANEL_NARRATIVE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Choose your line", player_hint: "Prompt shown before the player commits to a narrative choice.", cta_copy: None, primary_risk_copy: None, display_priority: 106, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.narrative.selected_label",
        label: "Chosen",
        related_ids: &[UI_PANEL_NARRATIVE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Chosen", player_hint: "Heading for the selected intro choice.", cta_copy: None, primary_risk_copy: None, display_priority: 105, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.narrative.unlock_label",
        label: "This sets up",
        related_ids: &[UI_PANEL_NARRATIVE, WORLD_ACTION_INVESTIGATE_BASE, WORLD_ACTION_EXPLORE_BASE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "This sets up", player_hint: "Label for the playable action unlocked by the current narrative beat.", cta_copy: None, primary_risk_copy: None, display_priority: 104, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.run.kicker",
        label: "Run",
        related_ids: &[UI_PANEL_RUN],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Run", player_hint: "Run-level save and offline controls.", cta_copy: None, primary_risk_copy: None, display_priority: 103, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.run.no_autosave",
        label: "No autosave",
        related_ids: &[UI_PANEL_RUN],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "No autosave", player_hint: "Shown before the first autosave lands.", cta_copy: None, primary_risk_copy: None, display_priority: 106, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.run.metric.clock",
        label: "Clock",
        related_ids: &[UI_PANEL_RUN],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Clock", player_hint: "Current run clock.", cta_copy: None, primary_risk_copy: None, display_priority: 105, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.run.metric.autosave",
        label: "Autosave",
        related_ids: &[UI_PANEL_RUN],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Autosave", player_hint: "Latest autosave timestamp.", cta_copy: None, primary_risk_copy: None, display_priority: 104, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.run.away_summary",
        label: "While you were away",
        related_ids: &[UI_PANEL_RUN],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "While you were away", player_hint: "Offline catch-up summary heading.", cta_copy: None, primary_risk_copy: None, display_priority: 103, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.run.dismiss",
        label: "Dismiss",
        related_ids: &[UI_PANEL_RUN],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Dismiss", player_hint: "Dismiss the offline summary.", cta_copy: Some("Dismiss"), primary_risk_copy: None, display_priority: 102, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.run.metric.reach",
        label: "Reach",
        related_ids: &[UI_PANEL_RUN, RESOURCE_BASSLINE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Reach", player_hint: "Offline reach delta.", cta_copy: None, primary_risk_copy: None, display_priority: 101, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.run.metric.recruits",
        label: "Recruits",
        related_ids: &[UI_PANEL_RUN, UI_ACTION_RECRUIT],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Recruits", player_hint: "Offline recruit delta.", cta_copy: None, primary_risk_copy: None, display_priority: 100, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.run.action.save_now",
        label: "Save Now",
        related_ids: &[UI_PANEL_RUN],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Save Now", player_hint: "Export the current save.", cta_copy: Some("Save Now"), primary_risk_copy: None, display_priority: 99, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.run.action.load_autosave",
        label: "Load Autosave",
        related_ids: &[UI_PANEL_RUN],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Load Autosave", player_hint: "Load the browser autosave.", cta_copy: Some("Load Autosave"), primary_risk_copy: None, display_priority: 98, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.run.action.load_text",
        label: "Load Text",
        related_ids: &[UI_PANEL_RUN],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Load Text", player_hint: "Import a pasted save payload.", cta_copy: Some("Load Text"), primary_risk_copy: None, display_priority: 97, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.run.action.reset",
        label: "Reset Run",
        related_ids: &[UI_PANEL_RUN],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Reset Run", player_hint: "Reset the current run to a fresh state.", cta_copy: Some("Reset Run"), primary_risk_copy: Some("This clears current run progress."), display_priority: 96, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.run.metric.save_payload",
        label: "Save Payload",
        related_ids: &[UI_PANEL_RUN],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Save Payload", player_hint: "Raw serialized save text.", cta_copy: None, primary_risk_copy: None, display_priority: 95, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.title",
        label: "Data Tree",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Data Tree", player_hint: "Catalog navigation heading.", cta_copy: None, primary_risk_copy: None, display_priority: 94, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.subtitle",
        label: "Catalog, schemas, and UI surfaces",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Catalog, schemas, and UI surfaces", player_hint: "Data Tree subtitle.", cta_copy: None, primary_risk_copy: None, display_priority: 93, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.search",
        label: "Filter nodes",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Filter nodes", player_hint: "Search input label for the data tree.", cta_copy: None, primary_risk_copy: None, display_priority: 92, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.empty",
        label: "No nodes match the current filter.",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "No nodes match the current filter.", player_hint: "Shown when the Data Tree is filtered to nothing.", cta_copy: None, primary_risk_copy: None, display_priority: 91, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.definition",
        label: "Definition",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Definition", player_hint: "Selected node definition section.", cta_copy: None, primary_risk_copy: None, display_priority: 90, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.select_node",
        label: "Select a node",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Select a node", player_hint: "Shown when no Data Tree node is selected.", cta_copy: None, primary_risk_copy: None, display_priority: 89, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.mode.graph",
        label: "Graph",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Graph", player_hint: "Relation graph mode.", cta_copy: None, primary_risk_copy: None, display_priority: 88, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.mode.timeline",
        label: "Timeline",
        related_ids: &[STORY_BEAT_INVESTIGATE_BASE, STORY_BEAT_STABILIZE_BASE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Timeline", player_hint: "Story-beat timeline mode.", cta_copy: None, primary_risk_copy: None, display_priority: 87, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.graph",
        label: "Graph",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Graph", player_hint: "Graph section title.", cta_copy: None, primary_risk_copy: None, display_priority: 86, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.graph.hint",
        label: "Inspect incoming and outgoing relations around the selected node.",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Inspect incoming and outgoing relations around the selected node.", player_hint: "Graph help text.", cta_copy: None, primary_risk_copy: None, display_priority: 85, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.graph.reset",
        label: "Reset Graph",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Reset Graph", player_hint: "Clear local graph simulation state.", cta_copy: Some("Reset Graph"), primary_risk_copy: None, display_priority: 84, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.timeline",
        label: "Timeline",
        related_ids: &[STORY_BEAT_INVESTIGATE_BASE, STORY_BEAT_STABILIZE_BASE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Timeline", player_hint: "Story-beat timeline section title.", cta_copy: None, primary_risk_copy: None, display_priority: 83, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.timeline_hint",
        label: "Browse progression beats by arc and sequence.",
        related_ids: &[STORY_BEAT_INVESTIGATE_BASE, STORY_BEAT_STABILIZE_BASE],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Browse progression beats by arc and sequence.", player_hint: "Timeline help text.", cta_copy: None, primary_risk_copy: None, display_priority: 82, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.timeline.empty",
        label: "No story beats are available for the current filter.",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "No story beats are available for the current filter.", player_hint: "Empty state for story timeline.", cta_copy: None, primary_risk_copy: None, display_priority: 81, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.timeline.arc",
        label: "Arc",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Arc", player_hint: "Story arc label.", cta_copy: None, primary_risk_copy: None, display_priority: 80, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.timeline.sequence",
        label: "Sequence",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Sequence", player_hint: "Story beat sequence label.", cta_copy: None, primary_risk_copy: None, display_priority: 79, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.visible",
        label: "Visible",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Visible", player_hint: "Visibility state label.", cta_copy: None, primary_risk_copy: None, display_priority: 78, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.hidden",
        label: "Hidden",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Hidden", player_hint: "Visibility state label.", cta_copy: None, primary_risk_copy: None, display_priority: 77, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.none",
        label: "None",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "None", player_hint: "Empty relation/value label.", cta_copy: None, primary_risk_copy: None, display_priority: 76, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.graph.enabled",
        label: "Enabled",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Enabled", player_hint: "Graph enabled-state marker.", cta_copy: None, primary_risk_copy: None, display_priority: 75, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.graph.simulated",
        label: "Simulated Unlock",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Simulated Unlock", player_hint: "Graph simulated-unlock marker.", cta_copy: None, primary_risk_copy: None, display_priority: 74, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.graph.enable",
        label: "Enable Node",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Enable Node", player_hint: "Enable a node in the local graph simulation.", cta_copy: Some("Enable Node"), primary_risk_copy: None, display_priority: 73, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.graph.disable",
        label: "Disable Node",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Disable Node", player_hint: "Disable a node in the local graph simulation.", cta_copy: Some("Disable Node"), primary_risk_copy: None, display_priority: 72, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.graph.show_hidden",
        label: "Show hidden nodes",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Show hidden nodes", player_hint: "Toggle hidden nodes in the graph.", cta_copy: None, primary_risk_copy: None, display_priority: 71, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.graph.incoming",
        label: "Incoming",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Incoming", player_hint: "Incoming relation column label.", cta_copy: None, primary_risk_copy: None, display_priority: 70, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.graph.selected",
        label: "Selected",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Selected", player_hint: "Selected-node column label.", cta_copy: None, primary_risk_copy: None, display_priority: 69, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.graph.enabled_nodes",
        label: "Enabled Nodes",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Enabled Nodes", player_hint: "Enabled-nodes list label.", cta_copy: None, primary_risk_copy: None, display_priority: 68, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.graph.no_enabled",
        label: "No nodes enabled",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "No nodes enabled", player_hint: "Empty state for enabled nodes.", cta_copy: None, primary_risk_copy: None, display_priority: 67, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.graph.potential_unlocks",
        label: "Potential Unlocks",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Potential Unlocks", player_hint: "Potential unlocks list label.", cta_copy: None, primary_risk_copy: None, display_priority: 66, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.graph.no_potential_unlocks",
        label: "No potential unlocks",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "No potential unlocks", player_hint: "Empty state for potential unlocks.", cta_copy: None, primary_risk_copy: None, display_priority: 65, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.graph.outgoing",
        label: "Outgoing",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Outgoing", player_hint: "Outgoing relation column label.", cta_copy: None, primary_risk_copy: None, display_priority: 64, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.field.kind",
        label: "Kind",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Kind", player_hint: "Definition field label.", cta_copy: None, primary_risk_copy: None, display_priority: 63, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.field.id",
        label: "ID",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "ID", player_hint: "Definition field label.", cta_copy: None, primary_risk_copy: None, display_priority: 62, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.field.label",
        label: "Label",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Label", player_hint: "Definition field label.", cta_copy: None, primary_risk_copy: None, display_priority: 61, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.group.resources",
        label: "Resources",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Resources", player_hint: "Data Tree group label.", cta_copy: None, primary_risk_copy: None, display_priority: 60, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.group.roles",
        label: "Roles",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Roles", player_hint: "Data Tree group label.", cta_copy: None, primary_risk_copy: None, display_priority: 59, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.group.stations",
        label: "Stations",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Stations", player_hint: "Data Tree group label.", cta_copy: None, primary_risk_copy: None, display_priority: 58, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.group.construction",
        label: "Construction",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Construction", player_hint: "Data Tree group label.", cta_copy: None, primary_risk_copy: None, display_priority: 57, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.group.processing",
        label: "Processing",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Processing", player_hint: "Data Tree group label.", cta_copy: None, primary_risk_copy: None, display_priority: 56, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.group.actions",
        label: "World Actions",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "World Actions", player_hint: "Data Tree group label.", cta_copy: None, primary_risk_copy: None, display_priority: 55, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.group.story",
        label: "Story Beats",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Story Beats", player_hint: "Data Tree group label.", cta_copy: None, primary_risk_copy: None, display_priority: 54, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.group.flags",
        label: "State Flags",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "State Flags", player_hint: "Data Tree group label.", cta_copy: None, primary_risk_copy: None, display_priority: 53, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.group.models",
        label: "Models",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Models", player_hint: "Data Tree group label.", cta_copy: None, primary_risk_copy: None, display_priority: 52, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.group.ui",
        label: "UI Surfaces",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "UI Surfaces", player_hint: "Data Tree group label.", cta_copy: None, primary_risk_copy: None, display_priority: 51, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.group.tiles",
        label: "Tiles",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Tiles", player_hint: "Data Tree group label.", cta_copy: None, primary_risk_copy: None, display_priority: 50, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.group.flora",
        label: "Flora",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Flora", player_hint: "Data Tree group label.", cta_copy: None, primary_risk_copy: None, display_priority: 49, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.group.structures",
        label: "Structures",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Structures", player_hint: "Data Tree group label.", cta_copy: None, primary_risk_copy: None, display_priority: 48, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.filter.all",
        label: "All",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "All", player_hint: "Relation filter label.", cta_copy: None, primary_risk_copy: None, display_priority: 47, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.filter.unlock",
        label: "Unlocks",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Unlocks", player_hint: "Relation filter label.", cta_copy: None, primary_risk_copy: None, display_priority: 46, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.filter.blocker",
        label: "Blockers",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Blockers", player_hint: "Relation filter label.", cta_copy: None, primary_risk_copy: None, display_priority: 45, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.filter.flow",
        label: "Flows",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Flows", player_hint: "Relation filter label.", cta_copy: None, primary_risk_copy: None, display_priority: 44, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.filter.access",
        label: "Access",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Access", player_hint: "Relation filter label.", cta_copy: None, primary_risk_copy: None, display_priority: 43, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.filter.power",
        label: "Power",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Power", player_hint: "Relation filter label.", cta_copy: None, primary_risk_copy: None, display_priority: 42, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.filter.model",
        label: "Models",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Models", player_hint: "Relation filter label.", cta_copy: None, primary_risk_copy: None, display_priority: 41, reveal: PresentationReveal::Default }),
    },
    UiElementDef {
        id: "ui.data_tree.filter.related",
        label: "Related",
        related_ids: &[],
        visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] },
        presentation: Some(PresentationDef { short_label: "Related", player_hint: "Relation filter label.", cta_copy: None, primary_risk_copy: None, display_priority: 40, reveal: PresentationReveal::Default }),
    },
    UiElementDef { id: "ui.construction.kicker", label: "Construction", related_ids: &[UI_PANEL_CONSTRUCTION], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Construction", player_hint: "Construction panel kicker.", cta_copy: None, primary_risk_copy: None, display_priority: 39, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.construction.note", label: "Build, repair, and queue the next permanent base milestone here.", related_ids: &[UI_PANEL_CONSTRUCTION], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Build, repair, and queue the next permanent base milestone here.", player_hint: "Construction panel note.", cta_copy: None, primary_risk_copy: None, display_priority: 38, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.power.kicker", label: "Power", related_ids: &[UI_PANEL_POWER], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Power", player_hint: "Power panel kicker.", cta_copy: None, primary_risk_copy: None, display_priority: 37, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.power.metric.harmonics_tier", label: "Harmonics Tier", related_ids: &[UI_METRIC_HARMONICS_TIER], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Harmonics Tier", player_hint: "Power panel metric label.", cta_copy: None, primary_risk_copy: None, display_priority: 36, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.power.note", label: "Power the stations you need, watch Chorus drain, and avoid brownouts.", related_ids: &[UI_PANEL_POWER], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Power the stations you need, watch Chorus drain, and avoid brownouts.", player_hint: "Power panel note.", cta_copy: None, primary_risk_copy: None, display_priority: 35, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.base.kicker", label: "Base", related_ids: &[UI_PANEL_BASE], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Base", player_hint: "Base panel kicker.", cta_copy: None, primary_risk_copy: None, display_priority: 34, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.base.note", label: "Gather supplies, manage housing pressure, and prepare recruitment.", related_ids: &[UI_PANEL_BASE], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Gather supplies, manage housing pressure, and prepare recruitment.", player_hint: "Base panel note.", cta_copy: None, primary_risk_copy: None, display_priority: 33, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.objectives.kicker", label: "Objectives", related_ids: &[UI_PANEL_OBJECTIVES], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Objectives", player_hint: "Objectives panel kicker.", cta_copy: None, primary_risk_copy: None, display_priority: 32, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.objectives.no_direct_action", label: "No direct action", related_ids: &[UI_PANEL_OBJECTIVES], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "No direct action", player_hint: "Shown when the current objective is passive.", cta_copy: None, primary_risk_copy: None, display_priority: 31, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.admin.simulation.kicker", label: "Simulation", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Simulation", player_hint: "Admin simulation section kicker.", cta_copy: None, primary_risk_copy: None, display_priority: 30, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.admin.simulation.title", label: "Simulation Controls", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Simulation Controls", player_hint: "Admin simulation section title.", cta_copy: None, primary_risk_copy: None, display_priority: 29, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.admin.simulation.action.export_save", label: "Export Save", related_ids: &[UI_PANEL_RUN], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Export Save", player_hint: "Admin export action.", cta_copy: Some("Export Save"), primary_risk_copy: None, display_priority: 28, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.admin.simulation.action.tick10", label: "Tick 10s", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Tick 10s", player_hint: "Advance runtime by 10 seconds.", cta_copy: Some("Tick 10s"), primary_risk_copy: None, display_priority: 27, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.admin.simulation.action.tick60", label: "Tick 60s", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Tick 60s", player_hint: "Advance runtime by 60 seconds.", cta_copy: Some("Tick 60s"), primary_risk_copy: None, display_priority: 26, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.admin.simulation.action.offline1h", label: "Offline 1h", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Offline 1h", player_hint: "Simulate one hour offline.", cta_copy: Some("Offline 1h"), primary_risk_copy: None, display_priority: 25, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.admin.simulation.action.offline4h", label: "Offline 4h", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Offline 4h", player_hint: "Simulate four hours offline.", cta_copy: Some("Offline 4h"), primary_risk_copy: None, display_priority: 24, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.admin.construction.kicker", label: "Construction", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Construction", player_hint: "Admin construction section kicker.", cta_copy: None, primary_risk_copy: None, display_priority: 23, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.admin.construction.title", label: "Construction State", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Construction State", player_hint: "Admin construction section title.", cta_copy: None, primary_risk_copy: None, display_priority: 22, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.admin.spending.kicker", label: "Spending", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Spending", player_hint: "Admin spending section kicker.", cta_copy: None, primary_risk_copy: None, display_priority: 21, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.admin.spending.title", label: "Manual Spending", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Manual Spending", player_hint: "Admin spending section title.", cta_copy: None, primary_risk_copy: None, display_priority: 20, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.admin.spending.action.spend10", label: "Spend 10", related_ids: &[RESOURCE_BASSLINE], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Spend 10", player_hint: "Admin spend action.", cta_copy: Some("Spend 10"), primary_risk_copy: None, display_priority: 19, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.admin.spending.action.spend25", label: "Spend 25", related_ids: &[RESOURCE_BASSLINE], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Spend 25", player_hint: "Admin spend action.", cta_copy: Some("Spend 25"), primary_risk_copy: None, display_priority: 18, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.admin.spending.action.spend50", label: "Spend 50", related_ids: &[RESOURCE_BASSLINE], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Spend 50", player_hint: "Admin spend action.", cta_copy: Some("Spend 50"), primary_risk_copy: None, display_priority: 17, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.admin.spending.action.spend_all", label: "Spend All", related_ids: &[RESOURCE_BASSLINE], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Spend All", player_hint: "Admin spend action.", cta_copy: Some("Spend All"), primary_risk_copy: None, display_priority: 16, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.admin.diagnostics.kicker", label: "Diagnostics", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Diagnostics", player_hint: "Admin diagnostics section kicker.", cta_copy: None, primary_risk_copy: None, display_priority: 15, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.admin.diagnostics.title", label: "Diagnostics", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Diagnostics", player_hint: "Admin diagnostics section title.", cta_copy: None, primary_risk_copy: None, display_priority: 14, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.admin.persistence.kicker", label: "Persistence", related_ids: &[UI_PANEL_RUN], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Persistence", player_hint: "Admin persistence section kicker.", cta_copy: None, primary_risk_copy: None, display_priority: 13, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.admin.persistence.title", label: "Save Preview", related_ids: &[UI_PANEL_RUN], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Save Preview", player_hint: "Admin persistence section title.", cta_copy: None, primary_risk_copy: None, display_priority: 12, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.admin.persistence.empty", label: "No save exported yet.", related_ids: &[UI_PANEL_RUN], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "No save exported yet.", player_hint: "Admin save preview empty state.", cta_copy: None, primary_risk_copy: None, display_priority: 11, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.data_tree.field.short_label", label: "Short Label", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Short Label", player_hint: "Data Tree field label.", cta_copy: None, primary_risk_copy: None, display_priority: 10, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.data_tree.field.player_hint", label: "Player Hint", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Player Hint", player_hint: "Data Tree field label.", cta_copy: None, primary_risk_copy: None, display_priority: 9, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.data_tree.field.cta", label: "CTA", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "CTA", player_hint: "Data Tree field label.", cta_copy: None, primary_risk_copy: None, display_priority: 8, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.data_tree.field.risk", label: "Risk", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Risk", player_hint: "Data Tree field label.", cta_copy: None, primary_risk_copy: None, display_priority: 7, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.data_tree.field.reveal", label: "Reveal", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Reveal", player_hint: "Data Tree field label.", cta_copy: None, primary_risk_copy: None, display_priority: 6, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.data_tree.visibility", label: "Visibility", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Visibility", player_hint: "Data Tree section title.", cta_copy: None, primary_risk_copy: None, display_priority: 5, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.data_tree.field.current_state", label: "Current State", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Current State", player_hint: "Data Tree field label.", cta_copy: None, primary_risk_copy: None, display_priority: 4, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.data_tree.field.conditions_all", label: "Conditions (all)", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Conditions (all)", player_hint: "Data Tree field label.", cta_copy: None, primary_risk_copy: None, display_priority: 3, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.data_tree.field.conditions_any", label: "Conditions (any)", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Conditions (any)", player_hint: "Data Tree field label.", cta_copy: None, primary_risk_copy: None, display_priority: 2, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.data_tree.relations", label: "Relations", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Relations", player_hint: "Data Tree section title.", cta_copy: None, primary_risk_copy: None, display_priority: 1, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.data_tree.outgoing", label: "Outgoing", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Outgoing", player_hint: "Relation column label.", cta_copy: None, primary_risk_copy: None, display_priority: 1, reveal: PresentationReveal::Default }) },
    UiElementDef { id: "ui.data_tree.incoming", label: "Incoming", related_ids: &[], visibility: VisibilityDef { all_of: &[], any_of: &[VisibilityConditionDef::Always] }, presentation: Some(PresentationDef { short_label: "Incoming", player_hint: "Relation column label.", cta_copy: None, primary_risk_copy: None, display_priority: 1, reveal: PresentationReveal::Default }) },
];

const ENTITY_PRESENTATIONS: &[EntityPresentationDef] = &[
    EntityPresentationDef {
        id: RESOURCE_BASSLINE,
        short_label: "Bassline",
        player_hint: "Stored Bassline holds the bubble open and feeds Crystal upgrades.",
        cta_copy: None,
        primary_risk_copy: Some("Spending too far into Bassline budget will put bubble coverage at risk."),
        display_priority: 1000,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: RESOURCE_CHORUS,
        short_label: "Chorus",
        player_hint: "Chorus is the power rail for stations and life support.",
        cta_copy: None,
        primary_risk_copy: Some("If Chorus falls behind upkeep, brownouts will start unpowering requested stations."),
        display_priority: 990,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: RESOURCE_HARMONICS,
        short_label: "Harmonics",
        player_hint: "Harmonics boosts Crystal efficiency, field strength, and power tolerance.",
        cta_copy: None,
        primary_risk_copy: Some("Ignoring Harmonics leaves the base efficient only on paper and fragile under pressure."),
        display_priority: 980,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: RESOURCE_STONE,
        short_label: "Stone",
        player_hint: "Stone is the first hard gate for restoring the base and building stations.",
        cta_copy: None,
        primary_risk_copy: Some("If Stone stock runs dry, construction and processing stall immediately."),
        display_priority: 970,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: RESOURCE_WATER,
        short_label: "Water",
        player_hint: "Water supports polishing and advanced processing once the base starts opening up.",
        cta_copy: None,
        primary_risk_copy: Some("Low Water slows advanced improvements even when the rest of the economy looks healthy."),
        display_priority: 960,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: RESOURCE_VIBES,
        short_label: "Vibes",
        player_hint: "Vibes are the social fuel for early recruitment.",
        cta_copy: None,
        primary_risk_copy: Some("Bad Vibes from overcrowding will push recruitment farther away."),
        display_priority: 950,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: ROLE_CRYSTAL_BASSLINE,
        short_label: "Bassline Crew",
        player_hint: "Assign Bassline staff when you need safer reach or Crystal upgrades.",
        cta_copy: Some("Assign Bassline Crew"),
        primary_risk_copy: Some("Too little Bassline output leaves the bubble vulnerable to spending."),
        display_priority: 900,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: ROLE_CRYSTAL_CHORUS,
        short_label: "Chorus Crew",
        player_hint: "Assign Chorus staff when power pressure or brownouts begin to appear.",
        cta_copy: Some("Assign Chorus Crew"),
        primary_risk_copy: Some("Without Chorus staffing, power demand will outgrow supply quickly."),
        display_priority: 890,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: ROLE_CRYSTAL_HARMONICS,
        short_label: "Harmonics Crew",
        player_hint: "Assign Harmonics staff when the base needs better efficiency, tiers, and tolerance.",
        cta_copy: Some("Assign Harmonics Crew"),
        primary_risk_copy: Some("No Harmonics means weaker output multipliers and less brownout protection."),
        display_priority: 880,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: ROLE_CONSTRUCTION,
        short_label: "Construction Crew",
        player_hint: "Builders turn time into finished projects and upgrades.",
        cta_copy: Some("Assign Builders"),
        primary_risk_copy: Some("Projects stop cold when no builders are assigned."),
        display_priority: 870,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: ROLE_FIRE_PIT,
        short_label: "Fire Pit Crew",
        player_hint: "Fire Pit staff accelerate Vibes generation for recruitment.",
        cta_copy: Some("Assign Fire Pit Crew"),
        primary_risk_copy: Some("No one on the Fire Pit means slower recruitment and weaker morale recovery."),
        display_priority: 860,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: ROLE_SCAVENGE,
        short_label: "Scavenge Crew",
        player_hint: "Scavenge crew turns Base stock into Stone for repairs and builds.",
        cta_copy: Some("Assign Scavenge Crew"),
        primary_risk_copy: Some("If scavengers sit idle, the base starves for Stone."),
        display_priority: 850,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: ROLE_WATER,
        short_label: "Water Crew",
        player_hint: "Water crew gathers Water for polishing and processing.",
        cta_copy: Some("Assign Water Crew"),
        primary_risk_copy: Some("Without Water collection, several processing upgrades stay locked behind shortages."),
        display_priority: 840,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STATION_CRYSTAL_CIRCLE,
        short_label: "Crystal Circle",
        player_hint: "The Crystal Circle is the root of the three-band economy.",
        cta_copy: None,
        primary_risk_copy: Some("Understaffing the Crystal Circle makes every other system feel starved."),
        display_priority: 830,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STATION_FIRE_PIT,
        short_label: "Fire Pit",
        player_hint: "The Fire Pit starts the Vibes loop and opens early recruitment.",
        cta_copy: None,
        primary_risk_copy: Some("Delaying the Fire Pit delays recruitment and the first real growth jump."),
        display_priority: 820,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STATION_RESONANCE_CHAMBER,
        short_label: "Resonance Chamber",
        player_hint: "The Resonance Chamber strengthens field conversion and opens Harmonics processing.",
        cta_copy: None,
        primary_risk_copy: Some("If this station browns out, field efficiency and tuning-side growth fall behind."),
        display_priority: 810,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STATION_MIX_CONSOLE,
        short_label: "Mix Console",
        player_hint: "The Mix Console helps stabilize power pressure and improves Harmonics-side efficiency.",
        cta_copy: None,
        primary_risk_copy: Some("When the Mix Console is offline, brownout tolerance shrinks."),
        display_priority: 800,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: STATION_WORKSHOP,
        short_label: "Workshop",
        player_hint: "The Workshop turns gathered materials into faster building and better Water handling.",
        cta_copy: None,
        primary_risk_copy: Some("A dark Workshop means slower build throughput and weaker Water scaling."),
        display_priority: 790,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: STATION_RESEARCH_BOOTH,
        short_label: "Research Booth",
        player_hint: "The Research Booth reduces Chorus pressure and makes Harmonics tiers easier to reach.",
        cta_copy: None,
        primary_risk_copy: Some("Without Research, life-support Chorus pressure stays higher than it needs to be."),
        display_priority: 780,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: CONSTRUCTION_SLOT_CAPACITY,
        short_label: "Slot Capacity",
        player_hint: "More Crystal slots let the three bands scale together.",
        cta_copy: Some("Upgrade Slots"),
        primary_risk_copy: Some("Skipping slot upgrades caps Crystal growth early."),
        display_priority: 760,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: CONSTRUCTION_OUTPUT,
        short_label: "Output",
        player_hint: "Output upgrades raise the raw productivity of Crystal staffing.",
        cta_copy: Some("Upgrade Output"),
        primary_risk_copy: Some("Low output makes every assignment feel weaker than it should."),
        display_priority: 750,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: CONSTRUCTION_STORAGE,
        short_label: "Storage",
        player_hint: "Storage upgrades widen your safe spending window.",
        cta_copy: Some("Upgrade Storage"),
        primary_risk_copy: Some("Low storage increases overflow loss and narrows your budget buffer."),
        display_priority: 740,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: CONSTRUCTION_REMOVING_MOSS,
        short_label: "Removing Moss",
        player_hint: "Removing Moss is the first cleanup upgrade and a small passive Bassline improvement.",
        cta_copy: Some("Clear Moss"),
        primary_risk_copy: Some("Until Moss is cleared, early Bassline growth stays weaker than intended."),
        display_priority: 730,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: CONSTRUCTION_POLISH_FIELD,
        short_label: "Polish Crystal Base",
        player_hint: "Field polish makes stored Bassline go farther.",
        cta_copy: Some("Polish Crystal"),
        primary_risk_copy: Some("Ignoring field polish leaves reach more expensive than it needs to be."),
        display_priority: 720,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: PROJECT_RESTORE_STUDIO,
        short_label: "Restore Studio",
        player_hint: "Restore the Studio to bring Chorus online and open the first real power loop.",
        cta_copy: Some("Restore Studio"),
        primary_risk_copy: Some("Without the Studio, Chorus remains locked and the base stays one-dimensional."),
        display_priority: 710,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: PROJECT_BUILD_FIRE_PIT,
        short_label: "Build Fire Pit",
        player_hint: "Build the Fire Pit to begin generating Vibes and preparing recruitment.",
        cta_copy: Some("Build Fire Pit"),
        primary_risk_copy: Some("Without the Fire Pit, the run cannot enter the first crew-growth loop."),
        display_priority: 700,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: PROJECT_BUILD_RESONANCE_CHAMBER,
        short_label: "Build Resonance Chamber",
        player_hint: "Build the Resonance Chamber to unlock Harmonics and better field efficiency.",
        cta_copy: Some("Build Resonance Chamber"),
        primary_risk_copy: Some("No Resonance Chamber means Harmonics stays locked and efficiency lags."),
        display_priority: 690,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: PROJECT_BUILD_MIX_CONSOLE,
        short_label: "Build Mix Console",
        player_hint: "Build the Mix Console to improve Harmonics-side stability and brownout tolerance.",
        cta_copy: Some("Build Mix Console"),
        primary_risk_copy: Some("Skipping the Mix Console leaves advanced power tuning blunt."),
        display_priority: 680,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: PROJECT_BUILD_WORKSHOP,
        short_label: "Build Workshop",
        player_hint: "Build the Workshop to turn Stone and Water into practical production upgrades.",
        cta_copy: Some("Build Workshop"),
        primary_risk_copy: Some("Without a Workshop, gathered materials stay underused."),
        display_priority: 670,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: PROJECT_BUILD_RESEARCH_BOOTH,
        short_label: "Build Research Booth",
        player_hint: "Build the Research Booth to make the power curve less punishing.",
        cta_copy: Some("Build Research Booth"),
        primary_risk_copy: Some("Without Research, Chorus pressure stays harsher than necessary."),
        display_priority: 660,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: RECIPE_RESONANCE_FIELD_CALIBRATION,
        short_label: "Field Calibration",
        player_hint: "Calibration makes the current Bassline budget cover more ground.",
        cta_copy: Some("Run Calibration"),
        primary_risk_copy: Some("Skipping calibration makes bubble expansion more expensive."),
        display_priority: 640,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: RECIPE_MIX_SIGNAL_BALANCING,
        short_label: "Signal Balancing",
        player_hint: "Signal balancing improves Harmonics efficiency and brownout tolerance.",
        cta_copy: Some("Balance Signal"),
        primary_risk_copy: Some("Without signal balancing, advanced power management stays brittle."),
        display_priority: 630,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: RECIPE_WORKSHOP_BUILDER_TOOLS,
        short_label: "Builder Tools",
        player_hint: "Builder Tools make every construction assignment hit harder.",
        cta_copy: Some("Craft Builder Tools"),
        primary_risk_copy: Some("No builder tooling means longer waits on every project."),
        display_priority: 620,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: RECIPE_WORKSHOP_WATER_CONDENSERS,
        short_label: "Water Condensers",
        player_hint: "Water Condensers expand Water capacity and refill it faster.",
        cta_copy: Some("Build Condensers"),
        primary_risk_copy: Some("Without condensers, Water becomes a repeated bottleneck."),
        display_priority: 610,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: RECIPE_RESEARCH_CHORUS_ROUTING,
        short_label: "Chorus Routing",
        player_hint: "Chorus Routing lowers life-support pressure on the power rail.",
        cta_copy: Some("Research Routing"),
        primary_risk_copy: Some("Ignoring Chorus Routing leaves staffing more power-hungry than it needs to be."),
        display_priority: 600,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: RECIPE_RESEARCH_HARMONIC_STUDY,
        short_label: "Harmonic Study",
        player_hint: "Harmonic Study brings Harmonics tiers online faster.",
        cta_copy: Some("Study Harmonics"),
        primary_risk_copy: Some("Without Harmonic Study, tier unlocks arrive later than the rest of the economy wants."),
        display_priority: 590,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: WORLD_ACTION_INVESTIGATE_BASE,
        short_label: "Investigate Base",
        player_hint: "The first investigation reveals what still works in the ruins.",
        cta_copy: Some("Investigate Base"),
        primary_risk_copy: None,
        display_priority: 570,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: WORLD_ACTION_EXPLORE_BASE,
        short_label: "Explore Base",
        player_hint: "Exploring deeper unlocks real repairs and the first upgrade loop.",
        cta_copy: Some("Explore Base"),
        primary_risk_copy: None,
        display_priority: 560,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_ROAD_TO_BASE,
        short_label: "Road to Base",
        player_hint: "Sets up the arrival path before the player reaches the sanctuary.",
        cta_copy: None,
        primary_risk_copy: None,
        display_priority: 555,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_FIRST_GLIMPSE,
        short_label: "First Glimpse",
        player_hint: "Frames the first distant view of the Base and Crystal Circle.",
        cta_copy: None,
        primary_risk_copy: None,
        display_priority: 554,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_ENTER_THE_BUBBLE,
        short_label: "Enter the Bubble",
        player_hint: "Transitions the player from exposed arrival into the Base sanctuary.",
        cta_copy: None,
        primary_risk_copy: Some("If this beat is unclear, the game loses its first sense of safety."),
        display_priority: 553,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_INVESTIGATE_BASE,
        short_label: "Investigate Beat",
        player_hint: "The first playable story beat: inspect the ruins and establish the immediate situation.",
        cta_copy: Some("Investigate Base"),
        primary_risk_copy: None,
        display_priority: 552,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_EXPLORE_BASE,
        short_label: "Explore Beat",
        player_hint: "The first exploratory beat: uncover repairs, water access, and the upgrade loop.",
        cta_copy: Some("Explore Base"),
        primary_risk_copy: None,
        display_priority: 551,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_RESTORE_STUDIO,
        short_label: "Restore Studio Beat",
        player_hint: "Marks the moment the Base becomes a real three-band machine.",
        cta_copy: Some("Restore Studio"),
        primary_risk_copy: Some("Without the Studio, Chorus and most power interactions stay locked."),
        display_priority: 550,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_BUILD_FIRE_PIT,
        short_label: "Build Fire Pit Beat",
        player_hint: "Turns the Base from simple recovery into a place that can attract new survivors.",
        cta_copy: Some("Build Fire Pit"),
        primary_risk_copy: Some("No Fire Pit means no real social growth loop."),
        display_priority: 549,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_REACH_SURVIVOR_CAVE,
        short_label: "Reach Cave Beat",
        player_hint: "Push the bubble far enough to connect the Survivor Cave to the Base.",
        cta_copy: None,
        primary_risk_copy: Some("If Bassline spending outruns field budget, the cave connection will stay out of reach."),
        display_priority: 548,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_FIRST_RECRUIT,
        short_label: "First Recruit Beat",
        player_hint: "Completes the first growth arc: the Base proves it can reach and keep someone new.",
        cta_copy: Some("Recruit Survivor"),
        primary_risk_copy: Some("If this beat lands too late, the first session feels static."),
        display_priority: 547,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_AWAIT_SURVIVOR_ARRIVAL,
        short_label: "Arrival Beat",
        player_hint: "Hold the Base together while the first recruit travels back.",
        cta_copy: None,
        primary_risk_copy: Some("This beat falls flat if the Base destabilizes before the recruit arrives."),
        display_priority: 546,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_STABILIZE_BASE,
        short_label: "Stabilize Beat",
        player_hint: "Transition from first success into a wider optimization game of power, staffing, and housing.",
        cta_copy: None,
        primary_risk_copy: Some("If power, morale, or housing collapse here, the first session loses momentum."),
        display_priority: 545,
        reveal: PresentationReveal::Default,
    },
];

const BALANCE: BalanceSnapshot = BalanceSnapshot {
    bubble: BubbleBalance {
        hold_seconds: 10.0,
        degrade_seconds_per_ring: 10.0,
        field_k_base: 0.36,
    },
    crystal: CrystalBalance {
        base_bassline_cap: 90.0,
        base_chorus_cap: 60.0,
        base_harmonics_cap: 40.0,
        bassline_cap_per_storage_level: 60.0,
        chorus_cap_per_storage_level: 45.0,
        harmonics_cap_per_storage_level: 30.0,
        output_per_worker_base: 0.14,
        output_per_worker_level_bonus: 0.08,
        chorus_per_worker_base: 0.12,
        chorus_per_worker_level_bonus: 0.06,
        harmonics_per_worker_base: 0.085,
        harmonics_per_worker_level_bonus: 0.045,
        removing_moss_output_multiplier: 1.1,
        removing_moss_passive_bassline_per_second: 0.04,
        field_k_bonus_per_polish_level: 0.01,
        fire_pit_crew_slots: 2,
    },
    power: PowerBalance {
        life_support_free_staff: 2,
        life_support_upkeep_per_staff_per_second: 0.028,
        harmonics_continuous_bonus_per_unit: 0.2,
        harmonics_continuous_bonus_cap: 0.45,
        harmonics_tier_one_threshold: 0.075,
        harmonics_tier_two_threshold: 0.22,
        harmonics_tier_three_threshold: 0.5,
        harmonics_tier_bonus: 0.10,
        bassline_generation_bonus_weight: 0.5,
        chorus_generation_bonus_weight: 0.7,
        harmonics_generation_bonus_weight: 0.35,
        resonance_chamber_field_bonus: 0.22,
        mix_console_harmonics_bonus: 0.15,
        mix_console_brownout_tolerance: 0.15,
        tier_two_brownout_tolerance: 0.12,
        tier_three_brownout_tolerance: 0.18,
        tier_three_upkeep_discount: 0.15,
        brownout_bassline_penalty_weight: 0.25,
        brownout_chorus_penalty_weight: 0.2,
        brownout_harmonics_penalty_weight: 0.35,
        brownout_field_penalty_weight: 0.4,
        resonance_processing_field_bonus_per_level: 0.03,
        mix_processing_harmonics_bonus_per_level: 0.03,
        mix_processing_brownout_tolerance_per_level: 0.03,
        research_chorus_free_staff_per_level: 1,
        research_harmonics_threshold_reduction_per_level: 0.08,
    },
    progression: ProgressionBalance {
        level_multiplier_a: 0.2,
        xp0: 50.0,
        xp_growth: 1.28,
    },
    survival: SurvivalBalance {
        hero_time_seconds_0_to_1: 24.0,
        normal_human_time_seconds_0_to_1: 4.0,
        recovery_time_seconds_1_to_0: 240.0,
        sustain_bonus_per_level: 0.05,
        tier_one_threshold_ratio: 0.5,
        tier_two_threshold_ratio: 0.8,
        tier_three_threshold_ratio: 0.95,
        tier_one_work_efficiency_multiplier: 0.9,
        tier_two_work_efficiency_multiplier: 0.72,
        tier_three_work_efficiency_multiplier: 0.5,
        tier_one_movement_speed_multiplier: 0.92,
        tier_two_movement_speed_multiplier: 0.75,
        tier_three_movement_speed_multiplier: 0.55,
        tier_one_encounter_rate_multiplier: 1.1,
        tier_two_encounter_rate_multiplier: 1.25,
        tier_three_encounter_rate_multiplier: 1.5,
        recovery_brownout_penalty_weight: 1.1,
        recovery_brownout_stop_threshold: 0.9,
    },
    build: BuildBalance {
        workshop_tooling_speed_bonus_per_level: 0.12,
    },
    scavenge: ScavengeBalance {
        base_stock_max: 10_000.0,
        stock_rate_per_second: 100.0,
        ambient_rate_per_second: 1.0,
    },
    fire_pit: FirePitBalance {
        base_vibes_per_second: 0.06,
        staff_vibes_per_second: 0.075,
    },
    water: WaterBalance {
        water_cap: 5.0,
        base_stock_max: 30.0,
        collection_rate_per_second: 2.0,
        tile_regen_per_second: 0.003,
        workshop_water_cap_per_level: 5.0,
        workshop_regen_bonus_per_level: 0.0015,
    },
    vibes: VibesBalance {
        negative_k: 144.0,
        bad_vibes_beta: 236.0,
        bad_vibes_pow: 2.0,
        doubling_time_seconds: 180.0,
        decay_reset_seconds: 60.0,
    },
    recruitment: RecruitmentBalance {
        recruit_travel_seconds: 6.0,
        instant_recruit_delay_seconds: 1.0,
        good_vibes_opt_base: 1.0,
        good_vibes_opt_step: 0.3,
        t1_minutes: 0.4,
        t30_total_good_vibes: 1200.0,
        t500_total_good_vibes: 60_000.0,
        t1000_total_good_vibes: 207_510.0,
    },
    notes_limit: 8,
};

pub fn catalog_snapshot() -> CatalogSnapshot {
    CatalogSnapshot {
        resources: RESOURCES.to_vec(),
        roles: ROLES.to_vec(),
        stations: STATIONS.to_vec(),
        construction_options: CONSTRUCTION_OPTIONS.to_vec(),
        processing_recipes: PROCESSING_RECIPES.to_vec(),
        world_actions: WORLD_ACTIONS.to_vec(),
        story_beats: STORY_BEATS.to_vec(),
        flags: FLAGS.to_vec(),
        models: model_snapshot(),
        flora: FLORA.to_vec(),
        structures: STRUCTURES.to_vec(),
        tiles: TILES.to_vec(),
        entity_schemas: ENTITY_SCHEMAS.iter().map(entity_schema_snapshot).collect(),
        ui_elements: UI_ELEMENTS.to_vec(),
        balance: BALANCE,
    }
}

pub fn resources() -> &'static [ResourceDef] {
    RESOURCES
}

pub fn resource_def(id: &str) -> Option<&'static ResourceDef> {
    RESOURCES.iter().find(|resource| resource.id == id)
}

pub fn roles() -> &'static [RoleDef] {
    ROLES
}

pub fn construction_options() -> &'static [ConstructionOptionDef] {
    CONSTRUCTION_OPTIONS
}

pub fn world_actions() -> &'static [WorldActionDef] {
    WORLD_ACTIONS
}

pub fn story_beats() -> &'static [StoryBeatDef] {
    STORY_BEATS
}

pub fn story_beat_def(id: &str) -> Option<&'static StoryBeatDef> {
    STORY_BEATS.iter().find(|beat| beat.id == id)
}

pub fn flags() -> &'static [FlagDef] {
    FLAGS
}

pub fn processing_recipes() -> &'static [ProcessingRecipeDef] {
    PROCESSING_RECIPES
}

pub fn stations() -> &'static [StationDef] {
    STATIONS
}

pub fn flora() -> &'static [FloraDef] {
    FLORA
}

pub fn structures() -> &'static [StructureDef] {
    STRUCTURES
}

pub fn entity_schemas() -> &'static [EntitySchemaDef] {
    ENTITY_SCHEMAS
}

pub fn entity_schema_def(id: &str) -> Option<&'static EntitySchemaDef> {
    ENTITY_SCHEMAS.iter().find(|schema| schema.id == id)
}

pub fn presentation_def(id: &str) -> Option<&'static EntityPresentationDef> {
    ENTITY_PRESENTATIONS.iter().find(|presentation| presentation.id == id)
}

pub fn visibility_def(id: &str) -> Option<&'static EntityVisibilityDef> {
    ENTITY_VISIBILITY.iter().find(|visibility| visibility.id == id)
}

fn presentation_snapshot(id: &str) -> Option<PresentationDef> {
    presentation_def(id).map(|presentation| PresentationDef {
        short_label: presentation.short_label,
        player_hint: presentation.player_hint,
        cta_copy: presentation.cta_copy,
        primary_risk_copy: presentation.primary_risk_copy,
        display_priority: presentation.display_priority,
        reveal: presentation.reveal,
    })
}

fn visibility_snapshot(id: &str) -> Option<VisibilityDef> {
    visibility_def(id).map(|visibility| VisibilityDef {
        all_of: visibility.all_of,
        any_of: visibility.any_of,
    })
}

fn entity_schema_snapshot(schema: &EntitySchemaDef) -> EntitySchemaSnapshot {
    EntitySchemaSnapshot {
        id: schema.id,
        entity_kind: schema.entity_kind,
        persistence: schema.persistence,
        unlocks: schema.unlocks.to_vec(),
        blockers: schema.blockers.to_vec(),
        access_rules: schema.access_rules.to_vec(),
        power: schema.power,
        flows: schema.flows.to_vec(),
        model_refs: schema.model_refs.to_vec(),
        notes: schema.notes.to_vec(),
        presentation: presentation_snapshot(schema.id),
        visibility: visibility_snapshot(schema.id),
    }
}

fn model_snapshot() -> Vec<ModelDef> {
    let mut seen = std::collections::BTreeSet::new();
    let mut models = Vec::new();

    for schema in ENTITY_SCHEMAS {
        for model_ref in schema.model_refs {
            if seen.insert(model_ref.reference_id) {
                models.push(ModelDef {
                    id: model_ref.reference_id,
                    label: model_ref.label,
                    kind: model_ref.kind,
                });
            }
        }
    }

    models
}

pub fn role_def(id: &str) -> Option<&'static RoleDef> {
    ROLES.iter().find(|role| role.id == id)
}

pub fn construction_option_def(id: &str) -> Option<&'static ConstructionOptionDef> {
    CONSTRUCTION_OPTIONS.iter().find(|option| option.id == id)
}

pub fn world_action_def(id: &str) -> Option<&'static WorldActionDef> {
    WORLD_ACTIONS.iter().find(|action| action.id == id)
}

pub fn processing_recipe_def(id: &str) -> Option<&'static ProcessingRecipeDef> {
    PROCESSING_RECIPES.iter().find(|recipe| recipe.id == id)
}

pub fn station_def(id: &str) -> Option<&'static StationDef> {
    STATIONS.iter().find(|station| station.id == id)
}

pub fn tile_def(id: &str) -> Option<&'static TileDef> {
    TILES.iter().find(|tile| tile.id == id)
}

pub fn flora_def(id: &str) -> Option<&'static FloraDef> {
    FLORA.iter().find(|flora| flora.id == id)
}

pub fn structure_def(id: &str) -> Option<&'static StructureDef> {
    STRUCTURES.iter().find(|structure| structure.id == id)
}

pub fn balance_snapshot() -> BalanceSnapshot {
    BALANCE
}

pub fn terrain_profile_for(q: i8, r: i8, distance: u8, survivor_cave_q: i8, survivor_cave_r: i8) -> TerrainProfile {
    if distance == 0 || (q == survivor_cave_q && r == survivor_cave_r) {
        return TerrainProfile {
            terrain: TerrainSnapshot::Plains,
            impedance: TERRAIN_PLAINS_IMPEDANCE,
            is_blocker: false,
        };
    }

    if r == -2 && (-1..=2).contains(&q) {
        return TerrainProfile {
            terrain: TerrainSnapshot::River,
            impedance: TERRAIN_RIVER_IMPEDANCE,
            is_blocker: false,
        };
    }

    if q <= -3 && r >= 1 {
        return TerrainProfile {
            terrain: TerrainSnapshot::Mountain,
            impedance: TERRAIN_MOUNTAIN_IMPEDANCE,
            is_blocker: true,
        };
    }

    if q >= 2 && r >= 2 {
        return TerrainProfile {
            terrain: TerrainSnapshot::Ridge,
            impedance: TERRAIN_RIDGE_IMPEDANCE,
            is_blocker: false,
        };
    }

    if q <= 0 && r <= -3 {
        return TerrainProfile {
            terrain: TerrainSnapshot::Scrub,
            impedance: TERRAIN_SCRUB_IMPEDANCE,
            is_blocker: false,
        };
    }

    TerrainProfile {
        terrain: TerrainSnapshot::Plains,
        impedance: TERRAIN_PLAINS_IMPEDANCE,
        is_blocker: false,
    }
}

pub fn tile_id_for(q: i8, r: i8, distance: u8, survivor_cave_q: i8, survivor_cave_r: i8) -> &'static str {
    if distance == 0 {
        return TILE_BASE_CORE;
    }
    if q == survivor_cave_q && r == survivor_cave_r {
        return TILE_SURVIVOR_CAVE;
    }
    if r == -2 && (-1..=2).contains(&q) {
        return TILE_RIVER_SHALLOWS;
    }
    if q <= -3 && r >= 1 {
        return TILE_MOUNTAIN_WALL;
    }
    if q >= 2 && r >= 2 {
        return TILE_RIDGE_LINE;
    }
    if q <= 0 && r <= -3 {
        return TILE_SCRUB_PATCH;
    }
    TILE_PLAINS_OPEN
}

pub fn recruit_cost_for_index(index: u16) -> f64 {
    let balance = BALANCE.recruitment;
    let i = f64::from(index.max(1));
    let good_vibes_opt_per_tick =
        balance.good_vibes_opt_base + balance.good_vibes_opt_step * (i - 1.0);
    let t30 = balance.t30_total_good_vibes
        / ((balance.good_vibes_opt_base + balance.good_vibes_opt_step * 29.0) * 60.0);
    let t500 = balance.t500_total_good_vibes
        / ((balance.good_vibes_opt_base + balance.good_vibes_opt_step * 499.0) * 60.0);
    let t1000 = balance.t1000_total_good_vibes
        / ((balance.good_vibes_opt_base + balance.good_vibes_opt_step * 999.0) * 60.0);

    let minutes = if i <= 30.0 {
        let progress = (i - 1.0) / 29.0;
        balance.t1_minutes + (t30 - balance.t1_minutes) * progress.powi(2)
    } else if i <= 500.0 {
        t30 + (t500 - t30) * ((i - 30.0) / 470.0)
    } else {
        let k_time = 500.0 / (t1000 / t500).ln();
        t500 * ((i - 500.0) / k_time).exp()
    };

    (good_vibes_opt_per_tick * 60.0 * minutes).ceil()
}
