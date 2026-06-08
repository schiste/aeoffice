use serde::Serialize;

mod catalog;
use catalog::{
    CONSTRUCTION_OPTIONS, FLAGS, FLORA, PROCESSING_RECIPES, RESOURCES, ROLES, STATIONS,
    STORY_BEATS, STRUCTURES, TILES, UI_ELEMENTS, WORLD_ACTIONS,
};

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
                related_ids: &[
                    ROLE_CRYSTAL_BASSLINE,
                    ROLE_CRYSTAL_CHORUS,
                    ROLE_CRYSTAL_HARMONICS,
                    ROLE_CONSTRUCTION,
                    ROLE_FIRE_PIT,
                    ROLE_SCAVENGE,
                    ROLE_WATER,
                ],
            },
            FlowDef {
                item_id: RESOURCE_CHORUS,
                label: "Manual stations consume Chorus while powered.",
                direction: FlowDirection::Input,
                cadence: FlowCadence::WhilePowered,
                related_ids: &[
                    STATION_RESONANCE_CHAMBER,
                    STATION_MIX_CONSOLE,
                    STATION_WORKSHOP,
                    STATION_RESEARCH_BOOTH,
                ],
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
            related_ids: &[
                CONSTRUCTION_SLOT_CAPACITY,
                CONSTRUCTION_OUTPUT,
                CONSTRUCTION_STORAGE,
            ],
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
                related_ids: &[
                    ROLE_CRYSTAL_BASSLINE,
                    ROLE_CRYSTAL_CHORUS,
                    ROLE_CRYSTAL_HARMONICS,
                ],
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
                related_ids: &[
                    ROLE_CRYSTAL_BASSLINE,
                    ROLE_CRYSTAL_CHORUS,
                    ROLE_CRYSTAL_HARMONICS,
                ],
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
            related_ids: &[
                RECIPE_WORKSHOP_BUILDER_TOOLS,
                RECIPE_WORKSHOP_WATER_CONDENSERS,
            ],
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
            related_ids: &[
                RECIPE_RESEARCH_CHORUS_ROUTING,
                RECIPE_RESEARCH_HARMONIC_STUDY,
            ],
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
                related_ids: &[
                    FLAG_CRYSTAL_REMOVING_MOSS_UNLOCKED,
                    FLAG_BASE_WATER_COLLECTION_UNLOCKED,
                ],
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
            related_ids: &[
                PROJECT_RESTORE_STUDIO,
                CONSTRUCTION_REMOVING_MOSS,
                RESOURCE_WATER,
            ],
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
            related_ids: &[
                PROJECT_RESTORE_STUDIO,
                STORY_BEAT_RESTORE_STUDIO,
                CONSTRUCTION_REMOVING_MOSS,
                RESOURCE_WATER,
            ],
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
            related_ids: &[
                RESOURCE_CHORUS,
                STATION_CRYSTAL_CIRCLE,
                STORY_BEAT_BUILD_FIRE_PIT,
                PROJECT_BUILD_FIRE_PIT,
            ],
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
            related_ids: &[
                STATION_FIRE_PIT,
                STORY_BEAT_FIRST_RECRUIT,
                UI_ACTION_RECRUIT,
            ],
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
            related_ids: &[
                UI_MAP_CAVE_GATE,
                TILE_SURVIVOR_CAVE,
                STORY_BEAT_FIRST_RECRUIT,
                UI_ACTION_RECRUIT,
            ],
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
            related_ids: &[
                UI_STATUS_BASE_RECRUITS,
                TILE_SURVIVOR_CAVE,
                UI_MAP_CAVE_GATE,
            ],
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
            related_ids: &[
                UI_PANEL_POWER,
                UI_PANEL_BASE,
                RESOURCE_CHORUS,
                RESOURCE_HARMONICS,
            ],
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
            VisibilityConditionDef::RoleAssigned {
                role_id: ROLE_SCAVENGE,
            },
        ],
    },
    EntityVisibilityDef {
        id: ROLE_FIRE_PIT,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_FIRE_PIT_BUILT,
            },
            VisibilityConditionDef::RoleAssigned {
                role_id: ROLE_FIRE_PIT,
            },
        ],
    },
    EntityVisibilityDef {
        id: ROLE_WATER,
        all_of: &[],
        any_of: &[
            VisibilityConditionDef::FlagSet {
                flag_id: FLAG_BASE_WATER_COLLECTION_UNLOCKED,
            },
            VisibilityConditionDef::RoleAssigned {
                role_id: ROLE_WATER,
            },
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


const ENTITY_PRESENTATIONS: &[EntityPresentationDef] = &[
    EntityPresentationDef {
        id: RESOURCE_BASSLINE,
        short_label: "Bassline",
        player_hint: "Stored Bassline holds the bubble open and feeds Crystal upgrades.",
        cta_copy: None,
        primary_risk_copy: Some(
            "Spending too far into Bassline budget will put bubble coverage at risk.",
        ),
        display_priority: 1000,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: RESOURCE_CHORUS,
        short_label: "Chorus",
        player_hint: "Chorus is the power rail for stations and life support.",
        cta_copy: None,
        primary_risk_copy: Some(
            "If Chorus falls behind upkeep, brownouts will start unpowering requested stations.",
        ),
        display_priority: 990,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: RESOURCE_HARMONICS,
        short_label: "Harmonics",
        player_hint: "Harmonics boosts Crystal efficiency, field strength, and power tolerance.",
        cta_copy: None,
        primary_risk_copy: Some(
            "Ignoring Harmonics leaves the base efficient only on paper and fragile under pressure.",
        ),
        display_priority: 980,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: RESOURCE_STONE,
        short_label: "Stone",
        player_hint: "Stone is the first hard gate for restoring the base and building stations.",
        cta_copy: None,
        primary_risk_copy: Some(
            "If Stone stock runs dry, construction and processing stall immediately.",
        ),
        display_priority: 970,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: RESOURCE_WATER,
        short_label: "Water",
        player_hint: "Water supports polishing and advanced processing once the base starts opening up.",
        cta_copy: None,
        primary_risk_copy: Some(
            "Low Water slows advanced improvements even when the rest of the economy looks healthy.",
        ),
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
        primary_risk_copy: Some(
            "Too little Bassline output leaves the bubble vulnerable to spending.",
        ),
        display_priority: 900,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: ROLE_CRYSTAL_CHORUS,
        short_label: "Chorus Crew",
        player_hint: "Assign Chorus staff when power pressure or brownouts begin to appear.",
        cta_copy: Some("Assign Chorus Crew"),
        primary_risk_copy: Some(
            "Without Chorus staffing, power demand will outgrow supply quickly.",
        ),
        display_priority: 890,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: ROLE_CRYSTAL_HARMONICS,
        short_label: "Harmonics Crew",
        player_hint: "Assign Harmonics staff when the base needs better efficiency, tiers, and tolerance.",
        cta_copy: Some("Assign Harmonics Crew"),
        primary_risk_copy: Some(
            "No Harmonics means weaker output multipliers and less brownout protection.",
        ),
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
        primary_risk_copy: Some(
            "No one on the Fire Pit means slower recruitment and weaker morale recovery.",
        ),
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
        primary_risk_copy: Some(
            "Without Water collection, several processing upgrades stay locked behind shortages.",
        ),
        display_priority: 840,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STATION_CRYSTAL_CIRCLE,
        short_label: "Crystal Circle",
        player_hint: "The Crystal Circle is the root of the three-band economy.",
        cta_copy: None,
        primary_risk_copy: Some(
            "Understaffing the Crystal Circle makes every other system feel starved.",
        ),
        display_priority: 830,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STATION_FIRE_PIT,
        short_label: "Fire Pit",
        player_hint: "The Fire Pit starts the Vibes loop and opens early recruitment.",
        cta_copy: None,
        primary_risk_copy: Some(
            "Delaying the Fire Pit delays recruitment and the first real growth jump.",
        ),
        display_priority: 820,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STATION_RESONANCE_CHAMBER,
        short_label: "Resonance Chamber",
        player_hint: "The Resonance Chamber strengthens field conversion and opens Harmonics processing.",
        cta_copy: None,
        primary_risk_copy: Some(
            "If this station browns out, field efficiency and tuning-side growth fall behind.",
        ),
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
        primary_risk_copy: Some(
            "A dark Workshop means slower build throughput and weaker Water scaling.",
        ),
        display_priority: 790,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: STATION_RESEARCH_BOOTH,
        short_label: "Research Booth",
        player_hint: "The Research Booth reduces Chorus pressure and makes Harmonics tiers easier to reach.",
        cta_copy: None,
        primary_risk_copy: Some(
            "Without Research, life-support Chorus pressure stays higher than it needs to be.",
        ),
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
        primary_risk_copy: Some(
            "Low storage increases overflow loss and narrows your budget buffer.",
        ),
        display_priority: 740,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: CONSTRUCTION_REMOVING_MOSS,
        short_label: "Removing Moss",
        player_hint: "Removing Moss is the first cleanup upgrade and a small passive Bassline improvement.",
        cta_copy: Some("Clear Moss"),
        primary_risk_copy: Some(
            "Until Moss is cleared, early Bassline growth stays weaker than intended.",
        ),
        display_priority: 730,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: CONSTRUCTION_POLISH_FIELD,
        short_label: "Polish Crystal Base",
        player_hint: "Field polish makes stored Bassline go farther.",
        cta_copy: Some("Polish Crystal"),
        primary_risk_copy: Some(
            "Ignoring field polish leaves reach more expensive than it needs to be.",
        ),
        display_priority: 720,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: PROJECT_RESTORE_STUDIO,
        short_label: "Restore Studio",
        player_hint: "Restore the Studio to bring Chorus online and open the first real power loop.",
        cta_copy: Some("Restore Studio"),
        primary_risk_copy: Some(
            "Without the Studio, Chorus remains locked and the base stays one-dimensional.",
        ),
        display_priority: 710,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: PROJECT_BUILD_FIRE_PIT,
        short_label: "Build Fire Pit",
        player_hint: "Build the Fire Pit to begin generating Vibes and preparing recruitment.",
        cta_copy: Some("Build Fire Pit"),
        primary_risk_copy: Some(
            "Without the Fire Pit, the run cannot enter the first crew-growth loop.",
        ),
        display_priority: 700,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: PROJECT_BUILD_RESONANCE_CHAMBER,
        short_label: "Build Resonance Chamber",
        player_hint: "Build the Resonance Chamber to unlock Harmonics and better field efficiency.",
        cta_copy: Some("Build Resonance Chamber"),
        primary_risk_copy: Some(
            "No Resonance Chamber means Harmonics stays locked and efficiency lags.",
        ),
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
        primary_risk_copy: Some(
            "Without signal balancing, advanced power management stays brittle.",
        ),
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
        primary_risk_copy: Some(
            "Ignoring Chorus Routing leaves staffing more power-hungry than it needs to be.",
        ),
        display_priority: 600,
        reveal: PresentationReveal::Advanced,
    },
    EntityPresentationDef {
        id: RECIPE_RESEARCH_HARMONIC_STUDY,
        short_label: "Harmonic Study",
        player_hint: "Harmonic Study brings Harmonics tiers online faster.",
        cta_copy: Some("Study Harmonics"),
        primary_risk_copy: Some(
            "Without Harmonic Study, tier unlocks arrive later than the rest of the economy wants.",
        ),
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
        primary_risk_copy: Some(
            "If this beat is unclear, the game loses its first sense of safety.",
        ),
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
        primary_risk_copy: Some(
            "Without the Studio, Chorus and most power interactions stay locked.",
        ),
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
        primary_risk_copy: Some(
            "If Bassline spending outruns field budget, the cave connection will stay out of reach.",
        ),
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
        primary_risk_copy: Some(
            "This beat falls flat if the Base destabilizes before the recruit arrives.",
        ),
        display_priority: 546,
        reveal: PresentationReveal::Default,
    },
    EntityPresentationDef {
        id: STORY_BEAT_STABILIZE_BASE,
        short_label: "Stabilize Beat",
        player_hint: "Transition from first success into a wider optimization game of power, staffing, and housing.",
        cta_copy: None,
        primary_risk_copy: Some(
            "If power, morale, or housing collapse here, the first session loses momentum.",
        ),
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
    ENTITY_PRESENTATIONS
        .iter()
        .find(|presentation| presentation.id == id)
}

pub fn visibility_def(id: &str) -> Option<&'static EntityVisibilityDef> {
    ENTITY_VISIBILITY
        .iter()
        .find(|visibility| visibility.id == id)
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

pub fn terrain_profile_for(
    q: i8,
    r: i8,
    distance: u8,
    survivor_cave_q: i8,
    survivor_cave_r: i8,
) -> TerrainProfile {
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

pub fn tile_id_for(
    q: i8,
    r: i8,
    distance: u8,
    survivor_cave_q: i8,
    survivor_cave_r: i8,
) -> &'static str {
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
