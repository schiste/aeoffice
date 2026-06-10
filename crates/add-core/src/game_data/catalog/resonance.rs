use crate::game_data::{
    RESONANCE_MATERIAL_ECHO_SHARDS, RESONANCE_MATERIAL_HARMONIC_RESIDUE,
    RESONANCE_MATERIAL_SIGNAL_SCRAP, ResonanceEffectDef, ResonanceMaterialCostDef,
    ResonanceRecipeDef, ResonanceTuningTrackDef, STATION_CRYSTAL_CIRCLE, STATION_MIX_CONSOLE,
    STATION_RESEARCH_BOOTH, STATION_RESONANCE_CHAMBER,
};

pub(crate) const RESONANCE_RECIPES: &[ResonanceRecipeDef] = &[
    ResonanceRecipeDef {
        id: "resonance.recipe.bassline_overtone",
        label: "Bassline Overtone",
        station_id: STATION_CRYSTAL_CIRCLE,
        duration_seconds: 45.0,
        costs: &[
            ResonanceMaterialCostDef {
                material_id: RESONANCE_MATERIAL_ECHO_SHARDS,
                amount: 1,
            },
            ResonanceMaterialCostDef {
                material_id: RESONANCE_MATERIAL_SIGNAL_SCRAP,
                amount: 1,
            },
        ],
        effect: ResonanceEffectDef::IncrementTuning {
            track: ResonanceTuningTrackDef::Bassline,
            amount: 1,
        },
        ui_order: 10,
        player_hint: "Fold field echoes back into the Crystal so Bassline workers push reach harder.",
    },
    ResonanceRecipeDef {
        id: "resonance.recipe.chorus_carrier",
        label: "Chorus Carrier",
        station_id: STATION_MIX_CONSOLE,
        duration_seconds: 60.0,
        costs: &[
            ResonanceMaterialCostDef {
                material_id: RESONANCE_MATERIAL_SIGNAL_SCRAP,
                amount: 2,
            },
            ResonanceMaterialCostDef {
                material_id: RESONANCE_MATERIAL_HARMONIC_RESIDUE,
                amount: 1,
            },
        ],
        effect: ResonanceEffectDef::IncrementTuning {
            track: ResonanceTuningTrackDef::Chorus,
            amount: 1,
        },
        ui_order: 20,
        player_hint: "Use recovered carrier noise to make Chorus power and life support less starved.",
    },
    ResonanceRecipeDef {
        id: "resonance.recipe.harmonic_lattice",
        label: "Harmonic Lattice",
        station_id: STATION_RESEARCH_BOOTH,
        duration_seconds: 75.0,
        costs: &[
            ResonanceMaterialCostDef {
                material_id: RESONANCE_MATERIAL_ECHO_SHARDS,
                amount: 1,
            },
            ResonanceMaterialCostDef {
                material_id: RESONANCE_MATERIAL_HARMONIC_RESIDUE,
                amount: 2,
            },
        ],
        effect: ResonanceEffectDef::IncrementTuning {
            track: ResonanceTuningTrackDef::Harmonics,
            amount: 1,
        },
        ui_order: 30,
        player_hint: "Turn the strangest residues into Harmonics stability for advanced base scaling.",
    },
    ResonanceRecipeDef {
        id: "resonance.recipe.field_attunement",
        label: "Field Attunement",
        station_id: STATION_RESONANCE_CHAMBER,
        duration_seconds: 90.0,
        costs: &[
            ResonanceMaterialCostDef {
                material_id: RESONANCE_MATERIAL_ECHO_SHARDS,
                amount: 2,
            },
            ResonanceMaterialCostDef {
                material_id: RESONANCE_MATERIAL_SIGNAL_SCRAP,
                amount: 2,
            },
        ],
        effect: ResonanceEffectDef::IncrementExpeditionSupport { amount: 1 },
        ui_order: 40,
        player_hint: "Tune staging and field response so future expeditions return faster and cleaner.",
    },
];
