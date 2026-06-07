use crate::game_data::*;

const REQS_NONE: &[RequirementDef] = &[];
const REQS_REMOVING_MOSS: &[RequirementDef] = &[
    RequirementDef::FlagSet(FLAG_CRYSTAL_REMOVING_MOSS_UNLOCKED),
    RequirementDef::FlagUnset(FLAG_CRYSTAL_REMOVING_MOSS_COMPLETED),
];
const REQS_RESTORE_STUDIO: &[RequirementDef] = &[
    RequirementDef::FlagSet(FLAG_BASE_STUDIO_RESTORE_UNLOCKED),
    RequirementDef::FlagUnset(FLAG_BASE_STUDIO_RESTORED),
];
const REQS_FIELD_POLISH: &[RequirementDef] =
    &[RequirementDef::FlagSet(FLAG_BASE_TUTORIAL_EXPLORED)];
const REQS_BUILD_FIRE_PIT: &[RequirementDef] =
    &[RequirementDef::FlagUnset(FLAG_BASE_FIRE_PIT_BUILT)];
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

pub(in crate::game_data) const CONSTRUCTION_OPTIONS: &[ConstructionOptionDef] = &[
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

pub(in crate::game_data) const STATIONS: &[StationDef] = &[
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

pub(in crate::game_data) const WORLD_ACTIONS: &[WorldActionDef] = &[
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

pub(in crate::game_data) const PROCESSING_RECIPES: &[ProcessingRecipeDef] = &[
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
