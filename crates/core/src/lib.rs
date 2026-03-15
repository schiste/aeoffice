pub mod command;
pub mod game_data;
pub mod save;
pub mod simulation;
pub mod state;

pub use command::GameCommand;
pub use game_data::{
    balance_snapshot, catalog_snapshot, construction_option_def, construction_options,
    entity_schema_def, entity_schemas, flora, flora_def, presentation_def, processing_recipe_def,
    processing_recipes, recruit_cost_for_index, resource_def, resources, role_def, roles,
    station_def, stations, story_beat_def, story_beats, structure_def, structures, terrain_profile_for, tile_def, tile_id_for,
    world_action_def, world_actions, AccessRuleDef, AccessRuleKind, BalanceSnapshot, BlockerDef,
    BlockerKind, BubbleBalance, CapBehavior, CatalogSnapshot, ConstructionGroup,
    ConstructionOptionDef, CostDef, CrystalBalance, CrystalTrack, EffectDef, EntityKind,
    EntityPresentationDef, EntitySchemaDef, EntitySchemaSnapshot, EntityVisibilityDef,
    FirePitBalance, FloraDef, FloraKind, FlowCadence, FlowDef, FlowDirection, HeroExposureDef,
    ModelKind,
    ModelRefDef, PersistenceDef, PersistenceScope, PowerBalance, PowerFallbackMode,
    PowerProfileDef, PresentationDef, PresentationReveal, ProcessingRecipeDef, ProcessingTrack,
    ProgressionBalance, RecruitmentBalance, RequirementDef, ResourceCategory, ResourceDef,
    RoleDef, RoleSlotPool, ScavengeBalance, StationCategory, StationDef, StoryBeatDef, StoryChoiceDef, StructureDef,
    StructureKind, SurvivalBalance, TerrainProfile, TerrainSnapshot, TileDef, TileFeature, TileTag,
    TuningAffinity, UiElementDef, VibesBalance, VisibilityConditionDef, VisibilityDef,
    UnlockDef, UnlockKind, WaterBalance, WorldActionDef,
};
pub use save::{export_save, import_save};
pub use simulation::Simulation;
pub use state::{
    BaseState, BubbleState, ConstructionJob, CrystalCircleState, ForcedReturnPhase,
    ForcedReturnState, GameState, HeroLocationState, HeroProgressState, HeroSurvivalState,
    HexState, HexVisualState, NarrativeState, ObjectiveState, PowerState, ProcessingJob, ProcessingState,
    RecruitTravel, RecruitmentState, ResourcePools, RosterState, StationState, WorldAction, WoundTrackState,
    DEFAULT_BASE_SLOTS, DEFAULT_TOTAL_CREW, GRID_RADIUS,
};

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use super::{
        export_save, import_save,
        game_data::{
            CONSTRUCTION_OUTPUT, CONSTRUCTION_REMOVING_MOSS, CONSTRUCTION_STORAGE, PROJECT_BUILD_FIRE_PIT,
            PROJECT_RESTORE_STUDIO, RECIPE_MIX_SIGNAL_BALANCING, RECIPE_RESEARCH_CHORUS_ROUTING,
            RECIPE_RESONANCE_FIELD_CALIBRATION, RECIPE_WORKSHOP_WATER_CONDENSERS,
            ROLE_CONSTRUCTION, ROLE_CRYSTAL_BASSLINE, ROLE_CRYSTAL_CHORUS,
            ROLE_CRYSTAL_HARMONICS, ROLE_FIRE_PIT, ROLE_SCAVENGE, ROLE_WATER,
            STORY_BEAT_ENTER_THE_BUBBLE, STORY_BEAT_EXPLORE_BASE, STORY_BEAT_FIRST_GLIMPSE,
            STORY_BEAT_INVESTIGATE_BASE, STORY_BEAT_ROAD_TO_BASE,
            WORLD_ACTION_EXPLORE_BASE, WORLD_ACTION_INVESTIGATE_BASE,
        },
        ForcedReturnPhase, ForcedReturnState, GameCommand, GameState, HeroLocationState,
        Simulation,
    };

    fn advance_intro_to_investigate(simulation: &mut Simulation) {
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_ROAD_TO_BASE.to_string(),
            option_id: "story.choice.road.follow_signal".to_string(),
        });
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_FIRST_GLIMPSE.to_string(),
            option_id: "story.choice.glimpse.watch_lights".to_string(),
        });
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_ENTER_THE_BUBBLE.to_string(),
            option_id: "story.choice.bubble.trust_sound".to_string(),
        });
    }

    fn complete_intro_investigate(simulation: &mut Simulation) {
        advance_intro_to_investigate(simulation);
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_INVESTIGATE_BASE.to_string(),
            option_id: "story.choice.investigate.search_power".to_string(),
        });
        simulation.apply(GameCommand::StartWorldAction {
            action_id: WORLD_ACTION_INVESTIGATE_BASE.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 5.0 });
    }

    fn complete_intro_explore(simulation: &mut Simulation) {
        complete_intro_investigate(simulation);
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_EXPLORE_BASE.to_string(),
            option_id: "story.choice.explore.look_for_tools".to_string(),
        });
        simulation.apply(GameCommand::StartWorldAction {
            action_id: WORLD_ACTION_EXPLORE_BASE.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 10.0 });
    }

    #[test]
    fn ticking_increases_bassline() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::SetHeroAssigned { assigned: true });
        let before = simulation.state().resources.bassline;
        simulation.apply(GameCommand::Tick { seconds: 10.0 });
        assert!(simulation.state().resources.bassline > before);
    }

    #[test]
    fn every_catalog_definition_has_a_schema_entry() {
        let catalog = super::catalog_snapshot();
        let schema_ids: HashSet<&str> = catalog.entity_schemas.iter().map(|schema| schema.id).collect();

        for resource in &catalog.resources {
            assert!(schema_ids.contains(resource.schema_id), "missing schema for resource {}", resource.id);
        }
        for role in &catalog.roles {
            assert!(schema_ids.contains(role.schema_id), "missing schema for role {}", role.id);
        }
        for station in &catalog.stations {
            assert!(schema_ids.contains(station.schema_id), "missing schema for station {}", station.id);
        }
        for option in &catalog.construction_options {
            assert!(
                schema_ids.contains(option.schema_id),
                "missing schema for construction option {}",
                option.id
            );
        }
        for recipe in &catalog.processing_recipes {
            assert!(
                schema_ids.contains(recipe.schema_id),
                "missing schema for processing recipe {}",
                recipe.id
            );
        }
        for action in &catalog.world_actions {
            assert!(
                schema_ids.contains(action.schema_id),
                "missing schema for world action {}",
                action.id
            );
        }
        for beat in &catalog.story_beats {
            assert!(
                schema_ids.contains(beat.schema_id),
                "missing schema for story beat {}",
                beat.id
            );
        }
        for tile in &catalog.tiles {
            assert!(schema_ids.contains(tile.schema_id), "missing schema for tile {}", tile.id);
        }
        for flora in &catalog.flora {
            assert!(schema_ids.contains(flora.schema_id), "missing schema for flora {}", flora.id);
        }
        for structure in &catalog.structures {
            assert!(
                schema_ids.contains(structure.schema_id),
                "missing schema for structure {}",
                structure.id
            );
        }
    }

    #[test]
    fn every_player_facing_schema_has_presentation_metadata() {
        let catalog = super::catalog_snapshot();

        for schema in &catalog.entity_schemas {
            let requires_presentation = matches!(
                schema.entity_kind,
                super::EntityKind::Resource
                    | super::EntityKind::Role
                    | super::EntityKind::Station
                    | super::EntityKind::ConstructionOption
                    | super::EntityKind::ProcessingRecipe
                    | super::EntityKind::WorldAction
                    | super::EntityKind::StoryBeat
            );

            if !requires_presentation {
                continue;
            }

            let presentation = schema.presentation.as_ref().unwrap_or_else(|| {
                panic!("missing presentation metadata for schema {}", schema.id)
            });

            assert!(
                !presentation.short_label.trim().is_empty(),
                "schema {} must have a short label",
                schema.id
            );
            assert!(
                !presentation.player_hint.trim().is_empty(),
                "schema {} must have a player hint",
                schema.id
            );

            if matches!(
                schema.entity_kind,
                super::EntityKind::Role
                    | super::EntityKind::ConstructionOption
                    | super::EntityKind::ProcessingRecipe
                    | super::EntityKind::WorldAction
            ) {
                assert!(
                    presentation
                        .cta_copy
                        .map(|copy| !copy.trim().is_empty())
                        .unwrap_or(false),
                    "interactive schema {} must have CTA copy",
                    schema.id
                );
            }
        }
    }

    #[test]
    fn player_facing_entities_and_ui_elements_have_visibility_metadata() {
        let catalog = super::catalog_snapshot();

        for schema in &catalog.entity_schemas {
            let requires_visibility = matches!(
                schema.entity_kind,
                super::EntityKind::Resource
                    | super::EntityKind::Role
                    | super::EntityKind::Station
                    | super::EntityKind::ConstructionOption
                    | super::EntityKind::ProcessingRecipe
                    | super::EntityKind::WorldAction
                    | super::EntityKind::StoryBeat
            );

            if requires_visibility {
                assert!(
                    schema.visibility.is_some(),
                    "player-facing schema {} must have visibility metadata",
                    schema.id
                );
            }
        }

        for element in &catalog.ui_elements {
            assert!(
                !element.label.trim().is_empty(),
                "ui element {} must have a label",
                element.id
            );
            assert!(
                !element.visibility.any_of.is_empty() || !element.visibility.all_of.is_empty(),
                "ui element {} must declare visibility conditions",
                element.id
            );
            let presentation = element.presentation.as_ref().unwrap_or_else(|| {
                panic!("ui element {} must have presentation metadata", element.id)
            });
            assert!(
                !presentation.short_label.trim().is_empty(),
                "ui element {} must have a short label",
                element.id
            );
            assert!(
                !presentation.player_hint.trim().is_empty(),
                "ui element {} must have a player hint",
                element.id
            );
        }
    }

    #[test]
    fn every_flag_and_model_reference_resolves_to_a_catalog_node() {
        let catalog = super::catalog_snapshot();
        let flag_ids: std::collections::BTreeSet<_> =
            catalog.flags.iter().map(|flag| flag.id).collect();
        let model_ids: std::collections::BTreeSet<_> =
            catalog.models.iter().map(|model| model.id).collect();

        for schema in &catalog.entity_schemas {
            for unlock in &schema.unlocks {
                for related_id in unlock.related_ids {
                    if related_id.starts_with("base.") || related_id.starts_with("crystal.") {
                        assert!(
                            flag_ids.contains(related_id),
                            "unlock relation {} -> {} must resolve to a flag node",
                            schema.id,
                            related_id
                        );
                    }
                }
            }

            for blocker in &schema.blockers {
                for related_id in blocker.related_ids {
                    if related_id.starts_with("base.") || related_id.starts_with("crystal.") {
                        assert!(
                            flag_ids.contains(related_id),
                            "blocker relation {} -> {} must resolve to a flag node",
                            schema.id,
                            related_id
                        );
                    }
                }
            }

            for access_rule in &schema.access_rules {
                for related_id in access_rule.related_ids {
                    if related_id.starts_with("base.") || related_id.starts_with("crystal.") {
                        assert!(
                            flag_ids.contains(related_id),
                            "access relation {} -> {} must resolve to a flag node",
                            schema.id,
                            related_id
                        );
                    }
                }
            }

            for model_ref in &schema.model_refs {
                assert!(
                    model_ids.contains(model_ref.reference_id),
                    "model reference {} -> {} must resolve to a model node",
                    schema.id,
                    model_ref.reference_id
                );
            }
        }
    }

    #[test]
    fn save_round_trip_preserves_state() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_ROAD_TO_BASE.to_string(),
            option_id: "story.choice.road.follow_signal".to_string(),
        });
        let serialized = export_save(simulation.state()).expect("save should serialize");
        let restored = import_save(&serialized).expect("save should deserialize");
        assert_eq!(simulation.state(), &restored);
    }

    #[test]
    fn intro_story_progression_and_choices_persist() {
        let mut simulation = Simulation::new();

        assert_eq!(
            simulation.state().narrative.active_beat_id.as_deref(),
            Some(STORY_BEAT_ROAD_TO_BASE)
        );

        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_ROAD_TO_BASE.to_string(),
            option_id: "story.choice.road.follow_signal".to_string(),
        });
        assert_eq!(
            simulation.state().narrative.active_beat_id.as_deref(),
            Some(STORY_BEAT_FIRST_GLIMPSE)
        );

        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_FIRST_GLIMPSE.to_string(),
            option_id: "story.choice.glimpse.watch_lights".to_string(),
        });
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_ENTER_THE_BUBBLE.to_string(),
            option_id: "story.choice.bubble.trust_sound".to_string(),
        });

        assert_eq!(
            simulation.state().narrative.active_beat_id.as_deref(),
            Some(STORY_BEAT_INVESTIGATE_BASE)
        );

        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_INVESTIGATE_BASE.to_string(),
            option_id: "story.choice.investigate.search_power".to_string(),
        });
        simulation.apply(GameCommand::StartWorldAction {
            action_id: WORLD_ACTION_INVESTIGATE_BASE.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 5.0 });

        assert_eq!(
            simulation.state().narrative.active_beat_id.as_deref(),
            Some(STORY_BEAT_EXPLORE_BASE)
        );

        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_EXPLORE_BASE.to_string(),
            option_id: "story.choice.explore.look_for_tools".to_string(),
        });
        simulation.apply(GameCommand::StartWorldAction {
            action_id: WORLD_ACTION_EXPLORE_BASE.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 10.0 });

        assert_eq!(simulation.state().narrative.active_beat_id, None);
        assert_eq!(
            simulation
                .state()
                .narrative
                .choice_by_beat
                .get(STORY_BEAT_INVESTIGATE_BASE)
                .map(String::as_str),
            Some("story.choice.investigate.search_power")
        );
        assert_eq!(
            simulation
                .state()
                .narrative
                .choice_by_beat
                .get(STORY_BEAT_EXPLORE_BASE)
                .map(String::as_str),
            Some("story.choice.explore.look_for_tools")
        );
    }

    #[test]
    fn intro_story_action_requires_a_choice_first() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_ROAD_TO_BASE.to_string(),
            option_id: "story.choice.road.follow_signal".to_string(),
        });
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_FIRST_GLIMPSE.to_string(),
            option_id: "story.choice.glimpse.watch_lights".to_string(),
        });
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_ENTER_THE_BUBBLE.to_string(),
            option_id: "story.choice.bubble.trust_sound".to_string(),
        });

        simulation.apply(GameCommand::StartWorldAction {
            action_id: WORLD_ACTION_INVESTIGATE_BASE.to_string(),
        });

        assert!(simulation.state().active_world_action.is_none());
        assert_eq!(
            simulation.state().narrative.active_beat_id.as_deref(),
            Some(STORY_BEAT_INVESTIGATE_BASE)
        );
    }

    #[test]
    fn investigate_base_stays_safe() {
        let mut simulation = Simulation::new();
        advance_intro_to_investigate(&mut simulation);
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_INVESTIGATE_BASE.to_string(),
            option_id: "story.choice.investigate.search_power".to_string(),
        });
        simulation.apply(GameCommand::StartWorldAction {
            action_id: WORLD_ACTION_INVESTIGATE_BASE.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 3.0 });

        assert_eq!(simulation.state().hero_survival.location, HeroLocationState::Studio);
        assert_eq!(simulation.state().hero_survival.viral_load_ratio, 0.0);
        assert!(simulation.state().active_world_action.is_some());
    }

    #[test]
    fn explore_base_accumulates_viral_load() {
        let mut simulation = Simulation::new();
        complete_intro_investigate(&mut simulation);
        simulation.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_EXPLORE_BASE.to_string(),
            option_id: "story.choice.explore.look_for_tools".to_string(),
        });
        simulation.apply(GameCommand::StartWorldAction {
            action_id: WORLD_ACTION_EXPLORE_BASE.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 4.0 });

        assert_eq!(
            simulation.state().hero_survival.location,
            HeroLocationState::OutsideBubble
        );
        assert!(simulation.state().hero_survival.viral_load_ratio > 0.15);
        assert!(simulation.state().active_world_action.is_some());
    }

    #[test]
    fn forced_return_triggers_when_point_of_no_return_is_crossed() {
        let mut state = GameState::new();
        state.hero_survival.location = HeroLocationState::OutsideBubble;
        state.hero_survival.required_time_to_reenter_bubble_seconds = 6.0;
        state.hero_survival.return_to_studio_seconds = 4.0;
        state.hero_survival.viral_load_ratio = 0.74;
        state.roster.hero_assigned = true;

        let mut simulation = Simulation::from_state(state);
        simulation.apply(GameCommand::Tick { seconds: 0.3 });

        let forced_return = simulation
            .state()
            .hero_survival
            .forced_return
            .as_ref()
            .expect("forced return should trigger");
        assert_eq!(forced_return.phase, ForcedReturnPhase::ReturnToBubbleEdge);
        assert_eq!(simulation.state().hero_survival.echo_scars, 1);
        assert!(!simulation.state().roster.hero_assigned);
        assert_eq!(
            simulation.state().hero_survival.location,
            HeroLocationState::OutsideBubble
        );
    }

    #[test]
    fn forced_return_recovers_only_at_studio() {
        let mut return_state = GameState::new();
        return_state.hero_survival.location = HeroLocationState::Bubble;
        return_state.hero_survival.viral_load_ratio = 0.5;
        return_state.hero_survival.forced_return = Some(ForcedReturnState {
            phase: ForcedReturnPhase::ReturnToStudio,
            total_seconds: 10.0,
            remaining_seconds: 10.0,
            viral_load_ratio_on_trigger: 0.5,
        });

        let mut simulation = Simulation::from_state(return_state);
        simulation.apply(GameCommand::Tick { seconds: 5.0 });
        assert_eq!(simulation.state().hero_survival.viral_load_ratio, 0.5);
        assert_eq!(
            simulation.state().hero_survival.forced_return.as_ref().map(|state| state.phase),
            Some(ForcedReturnPhase::ReturnToStudio)
        );

        simulation.apply(GameCommand::Tick { seconds: 5.0 });
        assert_eq!(simulation.state().hero_survival.location, HeroLocationState::Studio);
        assert_eq!(
            simulation.state().hero_survival.forced_return.as_ref().map(|state| state.phase),
            Some(ForcedReturnPhase::RecoverAtStudio)
        );

        let before_recovery = simulation.state().hero_survival.viral_load_ratio;
        simulation.apply(GameCommand::Tick { seconds: 10.0 });
        assert!(simulation.state().hero_survival.viral_load_ratio < before_recovery);
    }

    #[test]
    fn offline_catchup_progresses_viral_load_while_outside() {
        let mut state = GameState::new();
        state.hero_survival.location = HeroLocationState::OutsideBubble;
        state.hero_survival.required_time_to_reenter_bubble_seconds = 2.0;
        state.hero_survival.return_to_studio_seconds = 4.0;
        let mut simulation = Simulation::from_state(state);

        simulation.apply(GameCommand::RunOfflineCatchup { elapsed_seconds: 6.0 });

        assert!(simulation.state().hero_survival.viral_load_ratio > 0.2);
    }

    #[test]
    fn viral_load_debuff_reduces_hero_world_action_speed() {
        let mut healthy = Simulation::new();
        complete_intro_investigate(&mut healthy);
        healthy.apply(GameCommand::ChooseStoryOption {
            beat_id: STORY_BEAT_EXPLORE_BASE.to_string(),
            option_id: "story.choice.explore.look_for_tools".to_string(),
        });
        healthy.apply(GameCommand::StartWorldAction {
            action_id: WORLD_ACTION_EXPLORE_BASE.to_string(),
        });
        healthy.apply(GameCommand::Tick { seconds: 1.0 });
        let healthy_remaining = healthy
            .state()
            .active_world_action
            .as_ref()
            .expect("explore should still be active")
            .remaining_seconds;

        let mut strained_state = GameState::new();
        strained_state.narrative = healthy.state().narrative.clone();
        strained_state.base = healthy.state().base.clone();
        strained_state.crystal_circle = healthy.state().crystal_circle.clone();
        strained_state.hero_survival.viral_load_ratio = 0.6;
        let mut strained = Simulation::from_state(strained_state);
        strained.apply(GameCommand::StartWorldAction {
            action_id: WORLD_ACTION_EXPLORE_BASE.to_string(),
        });
        strained.apply(GameCommand::Tick { seconds: 1.0 });
        let strained_remaining = strained
            .state()
            .active_world_action
            .as_ref()
            .expect("explore should still be active")
            .remaining_seconds;

        assert!(strained_remaining > healthy_remaining);
    }

    #[test]
    fn buying_upgrade_spends_bassline() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::SetHeroAssigned { assigned: true });
        simulation.apply(GameCommand::Tick { seconds: 120.0 });
        simulation.apply(GameCommand::StartConstruction {
            option_id: CONSTRUCTION_STORAGE.to_string(),
        });
        simulation.apply(GameCommand::SetHeroRole {
            role_id: ROLE_CONSTRUCTION.to_string(),
        });
        simulation.apply(GameCommand::SetRoleCrew {
            role_id: ROLE_CRYSTAL_BASSLINE.to_string(),
            crew: 1,
        });
        simulation.apply(GameCommand::SetRoleCrew {
            role_id: ROLE_CONSTRUCTION.to_string(),
            crew: 1,
        });
        simulation.apply(GameCommand::Tick { seconds: 10.0 });

        assert!(simulation.state().resources.lifetime_spent > 0.0);
        assert!(simulation.state().active_construction.is_some());
    }

    #[test]
    fn construction_completes_after_time_passes() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::SetHeroAssigned { assigned: true });
        simulation.apply(GameCommand::Tick { seconds: 120.0 });
        simulation.apply(GameCommand::StartConstruction {
            option_id: CONSTRUCTION_OUTPUT.to_string(),
        });
        simulation.apply(GameCommand::SetHeroRole {
            role_id: ROLE_CONSTRUCTION.to_string(),
        });
        simulation.apply(GameCommand::SetRoleCrew {
            role_id: ROLE_CRYSTAL_BASSLINE.to_string(),
            crew: 1,
        });
        simulation.apply(GameCommand::SetRoleCrew {
            role_id: ROLE_CONSTRUCTION.to_string(),
            crew: 1,
        });
        simulation.apply(GameCommand::Tick { seconds: 40.0 });

        assert_eq!(simulation.state().crystal_circle.output_level, 1);
        assert!(simulation.state().active_construction.is_none());
    }

    #[test]
    fn bubble_expands_from_stored_bassline() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::SetHeroAssigned { assigned: true });
        simulation.apply(GameCommand::SetRoleCrew {
            role_id: ROLE_CRYSTAL_BASSLINE.to_string(),
            crew: 2,
        });
        simulation.apply(GameCommand::Tick { seconds: 120.0 });

        assert!(
            simulation.state().bubble.stabilized_ring >= 1
                || simulation.state().bubble.frontier_progress > 0.0
        );
        assert!(simulation.state().bubble.target_ring >= 1);
    }

    #[test]
    fn survivor_cave_gate_opens_at_reach_three() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::SetHeroAssigned { assigned: true });
        simulation.apply(GameCommand::SetRoleCrew {
            role_id: ROLE_CRYSTAL_BASSLINE.to_string(),
            crew: 1,
        });
        simulation.apply(GameCommand::Tick { seconds: 320.0 });

        assert!(simulation.state().bubble.reach_from_base >= 3);
        assert!(simulation.state().objectives.reach_objective_met);
        assert!(simulation.state().objectives.recruitment_enabled);
    }

    #[test]
    fn studio_restore_and_fire_pit_build_use_stone() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::SetHeroRole {
            role_id: ROLE_SCAVENGE.to_string(),
        });
        complete_intro_explore(&mut simulation);
        simulation.apply(GameCommand::Tick { seconds: 10.0 });
        simulation.apply(GameCommand::StartConstruction {
            option_id: PROJECT_RESTORE_STUDIO.to_string(),
        });
        simulation.apply(GameCommand::SetHeroRole {
            role_id: ROLE_CONSTRUCTION.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 12.0 });
        simulation.apply(GameCommand::StartConstruction {
            option_id: PROJECT_BUILD_FIRE_PIT.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 4.0 });

        assert!(simulation.state().base.studio_restored);
        assert!(simulation.state().base.fire_pit_built);
        assert_eq!(simulation.state().base.bunks_capacity, 15);
        assert!(simulation.state().resources.stone < 1000.0);
    }

    #[test]
    fn recruitment_spends_vibes_and_adds_pending_travel() {
        let mut state = GameState::new();
        state.base.studio_restored = true;
        state.base.fire_pit_built = true;
        state.base.bunks_capacity = 15;
        state.objectives.survivor_cave_distance = 0;
        state.resources.vibes = 80.0;
        let mut simulation = Simulation::from_state(state);

        let before_crew = simulation.state().roster.total_crew;
        simulation.apply(GameCommand::RecruitFromSurvivorCave);

        assert!(simulation.state().resources.vibes < 100.0);
        assert_eq!(simulation.state().recruitment.pending_recruits.len(), 1);

        simulation.apply(GameCommand::Tick { seconds: 2.0 });
        assert!(simulation.state().roster.total_crew > before_crew);
    }

    #[test]
    fn investigate_explore_unlocks_studio_and_removing_moss() {
        let mut simulation = Simulation::new();
        complete_intro_explore(&mut simulation);

        assert!(simulation.state().base.tutorial_investigated);
        assert!(simulation.state().base.tutorial_explored);
        assert!(simulation.state().base.studio_restore_unlocked);
        assert!(simulation.state().crystal_circle.removing_moss_unlocked);
        assert_eq!(simulation.state().base.skins, 1);
    }

    #[test]
    fn water_collects_from_run_start() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::SetHeroRole {
            role_id: ROLE_WATER.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 1.0 });

        assert!(simulation.state().resources.water > 0.0);
        assert!(simulation.state().resources.base_water_stock < 5.0);
    }

    #[test]
    fn bad_vibes_hysteresis_grows_when_overcrowded() {
        let mut state = GameState::new();
        state.base.fire_pit_built = true;
        state.base.studio_restored = true;
        state.base.bunks_capacity = 1;
        state.roster.total_crew = 6;
        let mut simulation = Simulation::from_state(state);
        simulation.apply(GameCommand::Tick { seconds: 60.0 });

        assert!(simulation.state().base.effective_bad_vibes_rate > 0.0);
        assert!(simulation.state().base.bad_vibes_multiplier > 1.0);
    }

    #[test]
    fn chorus_life_support_scales_with_active_staff() {
        let mut state = GameState::new();
        state.base.studio_restored = true;
        state.roster.hero_assigned = true;
        state.roster.total_crew = 4;
        state
            .roster
            .crew_by_role
            .insert(ROLE_CRYSTAL_BASSLINE.to_string(), 3);

        let simulation = Simulation::from_state(state);

        assert_eq!(simulation.state().power.active_staff_count, 4);
        assert!(simulation.state().power.life_support_upkeep_per_second > 0.0);
        assert!(
            simulation.state().power.requested_upkeep_per_second
                >= simulation.state().power.life_support_upkeep_per_second
        );
    }

    #[test]
    fn hero_gains_bassline_xp_from_stored_output() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::SetHeroAssigned { assigned: true });
        simulation.apply(GameCommand::Tick { seconds: 60.0 });

        assert!(simulation.state().hero_progress.drummer_xp > 0.0);
    }

    #[test]
    fn passive_bassline_trickle_does_not_grant_xp() {
        let mut state = GameState::new();
        state.roster.hero_assigned = false;
        state.crystal_circle.removing_moss_completed = true;
        let mut simulation = Simulation::from_state(state);
        simulation.apply(GameCommand::Tick { seconds: 30.0 });

        assert_eq!(simulation.state().hero_progress.drummer_xp, 0.0);
    }

    #[test]
    fn resonance_processing_recipe_increases_field_multiplier() {
        let mut state = GameState::new();
        state.base.studio_restored = true;
        state.base.resonance_chamber_built = true;
        state.resources.chorus = 10.0;
        state.resources.stone = 500.0;
        state.resources.water = 5.0;
        let mut simulation = Simulation::from_state(state);

        simulation.apply(GameCommand::SetStationEnabled {
            station_id: "station.resonance_chamber".to_string(),
            enabled: true,
        });
        let before = simulation.state().power.field_multiplier;
        simulation.apply(GameCommand::StartProcessing {
            recipe_id: RECIPE_RESONANCE_FIELD_CALIBRATION.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 10.0 });

        assert_eq!(simulation.state().processing.resonance_calibration_level, 1);
        assert!(simulation.state().power.field_multiplier > before);
    }

    #[test]
    fn mix_processing_recipe_increases_harmonics_efficiency() {
        let mut state = GameState::new();
        state.base.studio_restored = true;
        state.base.resonance_chamber_built = true;
        state.base.mix_console_built = true;
        state.resources.chorus = 10.0;
        state.resources.stone = 800.0;
        state.resources.water = 5.0;
        let mut simulation = Simulation::from_state(state);

        simulation.apply(GameCommand::SetStationEnabled {
            station_id: "station.mix_console".to_string(),
            enabled: true,
        });
        let before = simulation.state().power.harmonics_efficiency_multiplier;
        simulation.apply(GameCommand::StartProcessing {
            recipe_id: RECIPE_MIX_SIGNAL_BALANCING.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 12.0 });

        assert_eq!(simulation.state().processing.mix_calibration_level, 1);
        assert!(simulation.state().power.harmonics_efficiency_multiplier > before);
    }

    #[test]
    fn workshop_water_condensers_increase_water_cap() {
        let mut state = GameState::new();
        state.base.studio_restored = true;
        state.base.workshop_built = true;
        state.resources.chorus = 10.0;
        state.resources.stone = 500.0;
        state.resources.water = 5.0;
        let mut simulation = Simulation::from_state(state);

        simulation.apply(GameCommand::SetStationEnabled {
            station_id: "station.workshop".to_string(),
            enabled: true,
        });
        let before = simulation.state().resources.water_cap;
        simulation.apply(GameCommand::StartProcessing {
            recipe_id: RECIPE_WORKSHOP_WATER_CONDENSERS.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 12.0 });

        assert_eq!(simulation.state().processing.workshop_water_condensers_level, 1);
        assert!(simulation.state().resources.water_cap > before);
    }

    #[test]
    fn research_chorus_routing_reduces_life_support_upkeep() {
        let mut state = GameState::new();
        state.base.studio_restored = true;
        state.base.resonance_chamber_built = true;
        state.base.research_booth_built = true;
        state.resources.chorus = 20.0;
        state.resources.stone = 500.0;
        state.resources.water = 5.0;
        state.roster.total_crew = 4;
        state
            .roster
            .crew_by_role
            .insert(ROLE_CRYSTAL_BASSLINE.to_string(), 3);
        let mut simulation = Simulation::from_state(state);

        simulation.apply(GameCommand::SetStationEnabled {
            station_id: "station.research_booth".to_string(),
            enabled: true,
        });
        let before = simulation.state().power.life_support_upkeep_per_second;
        simulation.apply(GameCommand::StartProcessing {
            recipe_id: RECIPE_RESEARCH_CHORUS_ROUTING.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 16.0 });

        assert_eq!(simulation.state().processing.research_chorus_routing_level, 1);
        assert!(simulation.state().power.life_support_upkeep_per_second < before);
    }

    #[test]
    fn harmonics_becomes_worth_staffing_after_unlock() {
        let mut state = GameState::new();
        state.base.studio_restored = true;
        state.base.resonance_chamber_built = true;
        state.roster.hero_assigned = true;
        state.roster.hero_role_id = ROLE_CRYSTAL_HARMONICS.to_string();
        let simulation = Simulation::from_state(state);

        assert!(simulation.state().power.harmonics_generation_per_second >= 0.08);
        assert!(
            simulation.state().power.harmonics_tier >= 1,
            "expected Harmonics tier 1 with Hero assigned after unlock, got generation {:.3}/s and tier {}",
            simulation.state().power.harmonics_generation_per_second,
            simulation.state().power.harmonics_tier,
        );
    }

    #[test]
    fn studio_restore_becomes_affordable_soon_after_explore() {
        let mut simulation = Simulation::new();
        complete_intro_explore(&mut simulation);
        simulation.apply(GameCommand::SetHeroRole {
            role_id: ROLE_SCAVENGE.to_string(),
        });

        let mut affordable_at = None;
        for second in 1..=20 {
            simulation.apply(GameCommand::Tick { seconds: 1.0 });
            if simulation.state().resources.stone >= 600.0 {
                affordable_at = Some(second);
                break;
            }
        }

        let affordable_at = affordable_at.expect("studio restore should become affordable after Explore");
        assert!(
            affordable_at <= 12,
            "expected Studio restore to become affordable quickly after Explore, got {affordable_at}s",
        );
    }

    #[test]
    fn one_early_chorus_assignment_offsets_life_support() {
        let mut state = GameState::new();
        state.base.studio_restored = true;
        state.roster.hero_assigned = true;
        state.roster.hero_role_id = ROLE_CRYSTAL_CHORUS.to_string();
        state.roster.total_crew = 2;
        state
            .roster
            .crew_by_role
            .insert(ROLE_CRYSTAL_BASSLINE.to_string(), 1);
        let simulation = Simulation::from_state(state);

        assert!(
            simulation.state().power.chorus_generation_per_second
                >= simulation.state().power.life_support_upkeep_per_second,
            "expected one early Chorus assignment to offset life support: generation {:.3}/s, upkeep {:.3}/s",
            simulation.state().power.chorus_generation_per_second,
            simulation.state().power.life_support_upkeep_per_second,
        );
    }

    #[test]
    fn first_recruit_pacing_stays_inside_first_session_window() {
        let mut state = GameState::new();
        state.base.studio_restored = true;
        state.base.fire_pit_built = true;
        state.base.bunks_capacity = 15;
        state.objectives.recruitment_enabled = true;
        state.objectives.reach_objective_met = true;
        state.objectives.survivor_cave_in_bubble = true;
        state.roster.crew_by_role.insert(ROLE_FIRE_PIT.to_string(), 1);
        let mut simulation = Simulation::from_state(state);

        let mut reached_at = None;
        for second in 1..=300 {
            simulation.apply(GameCommand::Tick { seconds: 1.0 });
            if simulation.state().resources.vibes >= simulation.state().recruitment.next_recruit_cost {
                reached_at = Some(second);
                break;
            }
        }

        let reached_at = reached_at.unwrap_or_else(|| {
            panic!(
                "first recruit should become affordable inside 5 minutes; vibes={:.2}, cost={:.2}",
                simulation.state().resources.vibes,
                simulation.state().recruitment.next_recruit_cost,
            )
        });
        assert!(
            (120..=300).contains(&reached_at),
            "expected first recruit affordability around 2-5 minutes after Fire Pit, got {reached_at}s",
        );
    }

    #[test]
    fn early_path_reaches_survivor_gate_in_tuning_window() {
        let mut simulation = Simulation::new();
        simulation.apply(GameCommand::SetRoleCrew {
            role_id: ROLE_CRYSTAL_BASSLINE.to_string(),
            crew: 1,
        });
        complete_intro_explore(&mut simulation);
        simulation.apply(GameCommand::StartConstruction {
            option_id: CONSTRUCTION_REMOVING_MOSS.to_string(),
        });
        simulation.apply(GameCommand::SetHeroRole {
            role_id: ROLE_CONSTRUCTION.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 10.0 });
        simulation.apply(GameCommand::SetHeroRole {
            role_id: ROLE_SCAVENGE.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 8.0 });
        simulation.apply(GameCommand::StartConstruction {
            option_id: PROJECT_RESTORE_STUDIO.to_string(),
        });
        simulation.apply(GameCommand::SetHeroRole {
            role_id: ROLE_CONSTRUCTION.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 12.0 });
        simulation.apply(GameCommand::StartConstruction {
            option_id: PROJECT_BUILD_FIRE_PIT.to_string(),
        });
        simulation.apply(GameCommand::Tick { seconds: 4.0 });
        simulation.apply(GameCommand::SetHeroRole {
            role_id: ROLE_CRYSTAL_BASSLINE.to_string(),
        });

        let mut reached_at = None;
        for step in 0..360 {
            simulation.apply(GameCommand::Tick { seconds: 1.0 });
            if simulation.state().bubble.reach_from_base >= 3 {
                reached_at = Some(step + 1);
                break;
            }
        }

        let reached_at = reached_at.unwrap_or_else(|| {
            panic!(
                "should reach Survivor Cave gate; final reach={}, bassline={:.1}, budget={:.1}, target_ring={}, frontier={:.2}",
                simulation.state().bubble.reach_from_base,
                simulation.state().resources.bassline,
                simulation.state().bubble.field_budget,
                simulation.state().bubble.target_ring,
                simulation.state().bubble.frontier_progress,
            )
        });
        let total_elapsed = 39 + reached_at;

        assert!(
            (240..=360).contains(&total_elapsed),
            "expected reach gate around 4-6 minutes, got {total_elapsed}s"
        );
    }
}
