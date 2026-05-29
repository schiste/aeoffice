# Game Data Model

## Purpose

The game now uses a three-layer data model:

1. Design references in `documentation/`
2. Static implementation catalog in `crates/core/src/game_data.rs`
3. Mutable runtime state in `crates/core/src/state.rs`

This split keeps the design ambitious and expressive while giving the runtime a small, typed, stable schema.

## Layer Split

### Design References

These files remain the broad source material for mechanics, pacing, and content intent:

- `documentation/object-templates.json`
- `documentation/scaling-models.json`
- `mechanics/specifications.md`

They are not loaded directly by the runtime.

### Static Catalog

`crates/core/src/game_data.rs` defines the current implementation catalog.

It owns:

- resource IDs and metadata
- staffing role IDs and metadata
- construction option IDs and metadata
- world action IDs and metadata
- state-flag IDs and metadata
- shared model IDs and metadata
- flora definitions
- structure definitions
- tile definitions and tile metadata
- balance snapshots and mechanic constants
- requirements
- effects
- duration and cost models
- entity schemas

This is the only place where the game enumerates what actions and buildables exist.

The catalog is now split internally into two static layers:

- thin object definitions, such as `ResourceDef`, `RoleDef`, `StationDef`, `ConstructionOptionDef`, `ProcessingRecipeDef`, `WorldActionDef`, `TileDef`, `FloraDef`, and `StructureDef`
- richer `EntitySchemaDef` entries, referenced by `schema_id`

The thin object definitions answer:

- what this thing is called
- how it is grouped in the current product
- what runtime ID it uses
- what immediate implementation metadata it needs

The schema layer answers:

- how it persists
- what unlocks it
- what blocks it
- how it is accessed
- what flows it creates
- what power profile it has
- what model families it participates in
- how it should be presented to the player

This gives the runtime a clean bridge between the design language and the live implementation catalog without bloating runtime state.

The catalog now also exposes a typed balance layer. That means the simulation does not need to hide pacing values as file-local constants.

Catalog snapshots also attach presentation metadata to schemas when it exists.
That gives the UI explicit player-facing copy without forcing runtime state to carry display concerns.

Catalog snapshots now also attach visibility metadata.
That lets the UI decide whether something should render by reading catalog rules instead of inventing ad hoc conditions in components.

Catalog snapshots now also expose first-class `flags` and `models`.
These exist so graph/navigation tools do not have to fall back to opaque raw IDs when a requirement, unlock, visibility rule, or formula family points at:

- a progression state flag such as `base.studio_restored`
- a shared model reference such as a bubble/power/duration formula ID

That means the catalog graph can stay traversable even when the relation target is not a runtime object like a station or resource.

It also now owns reusable content-shaping helpers for:

- terrain impedance presets
- tile archetype selection
- recruitment cost progression

And it now owns a reusable schema vocabulary for:

- `PersistenceDef`
- `UnlockDef`
- `BlockerDef`
- `AccessRuleDef`
- `FlowDef`
- `PowerProfileDef`
- `ModelRefDef`
- `PresentationDef`

And two explicit graph-facing metadata families:

- `FlagDef`
- `ModelDef`

That keeps state generation and pacing formulas out of ad hoc runtime code.

The typed balance layer now also includes `SurvivalBalance`.
That makes Hero survival tuning data-driven instead of burying exposure/recovery thresholds inside simulation-local constants.

### Runtime State

`crates/core/src/state.rs` stores the live run state.

It owns:

- resource amounts
- crew totals and role allocations
- Hero assignment
- Hero survival state
- narrative beat progression and stored story choices
- current construction job
- current world action
- bubble state
- objectives
- map hex state

Runtime state references catalog entries by ID.

Examples:

- `roster.hero_role_id`
- `roster.crew_by_role`
- `hero_survival.viral_load_ratio`
- `hero_survival.location`
- `hero_survival.forced_return`
- `narrative.active_beat_id`
- `narrative.choice_by_beat`
- `active_construction.option_id`
- `active_world_action.action_id`
- `hexes[*].tile_id`

Runtime state never owns the static schema metadata directly.
It points at catalog definitions, and catalog definitions point at schemas.

Hero survival is intentionally stored as runtime state rather than as ad hoc UI/session state.

`HeroSurvivalState` currently carries:

- Viral Load ratio
- current safety location
- return-to-safety timing
- point-of-no-return threshold
- forced-return state
- Echo Scars
- debuff tier and active multipliers
- wound track

That keeps the current onboarding survival loop compatible with future world travel, safe spots, combat injuries, and Infirmary-style recovery systems.

Tiles are now split the same way:

- `TileDef` in the catalog owns static metadata such as terrain, blocker state, landmarks, tags, flora, structures, and future building capacity.
- `HexState` owns only dynamic per-run state such as position, conversion state, and progress.

Tile content metadata should now grow through catalog definitions:

- `FloraDef`
- `StructureDef`
- typed `TileTag`

That gives future forests, buildings, landmarks, and harvestables a clean place in the schema before they become active mechanics.

### Commands and Systems

`crates/core/src/command.rs` and `crates/core/src/simulation.rs` are the execution layer.

The command API is now ID-based:

- `SetHeroRole { role_id }`
- `SetRoleCrew { role_id, crew }`
- `StartConstruction { option_id }`
- `StartWorldAction { action_id }`

The simulation resolves those IDs through the catalog, validates requirements, applies costs, and mutates runtime state.

## Schema Layer

`EntitySchemaDef` is the design-facing shape of the current runtime catalog.

It is meant to answer the richer questions the older design documents already implied:

- What exactly blocks this thing?
- Does it require power?
- Is it base-only or bubble-only?
- Does it survive Tuning?
- What resources or pressures flow through it?
- Which shared balance models does it participate in?

This is the current structure:

- `id`
- `entity_kind`
- `persistence`
- `unlocks`
- `blockers`
- `access_rules`
- `power`
- `flows`
- `model_refs`
- `notes`

Catalog snapshots extend that schema with optional `presentation` metadata for player-facing entities.

### Story beats as content

Story beats are now more than labels for the timeline.

`StoryBeatDef` can carry:

- `label`
- `body`
- `arc`
- `sequence`
- `world_action_id`
- `choices`
- `related_ids`

This lets the same catalog entry drive:

- the Data Tree timeline
- the opening narrative onboarding
- story-linked action handoffs such as `Investigate Base` and `Explore Base`

Story choices are also runtime state now. They are stored in the save even when they do not yet change mechanics.
That keeps the narrative layer structurally real from the start instead of treating early choices as temporary UI-only copy.

### Typed blockers

Blockers are now modeled as typed content, not a single boolean.

Examples:

- `missing_requirement`
- `missing_resource`
- `missing_power`
- `missing_staff`
- `blocked_at_cap`
- `busy`
- `inaccessible`
- `out_of_bubble`
- `occluded`
- `offline_disabled`
- `reach_locked`

This matches the intent already present in the design docs: blockers are not one thing, they are a family of operational constraints.

### Typed access

Access rules are also first-class:

- `base_only`
- `bubble_required`
- `hero_only`
- `hero_visited`
- `reach_required`
- `not_blocked`
- `power_network`
- `story_unlocked`

This is the beginning of the future world/exploration schema, but it is already useful on the base side today.

### Typed flows

Flows let one schema explain how it participates in the economy:

- what item moves
- whether that movement is an `input`, `output`, `capacity`, `pressure`, or `unlock`
- whether it happens `passively`, `per_second`, `per_worker_second`, `on_start`, `on_complete`, `while_powered`, or `while_staffed`

This is the right place to document resource causality before every UI surface needs to infer it separately.

### Model references

`ModelRefDef` lets schemas point at shared balance families instead of pretending every formula is local.

Examples:

- bubble budget
- recruitment cost curve
- overflow behavior
- harmonics threshold model
- brownout tolerance model

This keeps the catalog expressive without forcing live balance formulas into every object definition.

### Presentation metadata

The schema layer is intentionally richer than the player UI.

That is the right direction.

The model should know more than the interface shows, and the interface should select only the most useful message for the current context.

`PresentationDef` currently carries:

- `short_label`
- `player_hint`
- `cta_copy`
- `primary_risk_copy`
- `display_priority`
- `reveal`
- `visibility`

This is used by the web UI to:

- replace engineering labels with player labels
- rank alternative hints
- choose a single CTA label
- choose a single risk explanation
- hide advanced/debug presentation data unless needed
- hide player-facing elements until their catalog visibility rules say they are relevant

## UI Surfaces

Not every visible thing in the game is a domain entity like a resource, role, or station.
Some player-facing surfaces are synthetic:

- panel-level sections
- derived metrics
- status chips
- contextual actions

Those now live in the catalog as `ui_elements`.

Examples:

- `ui.panel.power`
- `ui.metric.base.bunks`
- `ui.action.recruit`
- `ui.status.base.recruits`

This keeps the contract consistent:

- entity visibility lives with entity schemas
- synthetic UI visibility lives in catalog UI elements
- the frontend reads both through the same selector layer

## Why This Model

This structure is meant to optimize for evolution:

- adding a new construction option should mostly be a catalog addition
- retuning pacing should mostly be a balance change
- UI lists should come from the catalog, not hardcoded arrays
- saves should remain about current state, not embedded design metadata
- simulation logic stays authoritative in Rust
- blockers and access rules should become data before they become special-case runtime flags
- frontend surfaces should be able to render from the schema instead of inventing their own explanations

## Current Scope

The catalog currently covers:

- resources
- roles
- Crystal Circle upgrades
- base projects
- processing recipes
- onboarding world actions
- stations and their power categories
- typed balance layers for power, water, build speed, progression, and recruitment
- tiles, flora, structures, and tile tags
- rich entity schemas for blockers, access, persistence, flows, power, and model references

It does not yet cover every future game concept. When new systems are added, they should follow the same pattern instead of introducing new frontend-only lists or duplicated enums.

## Next Evolution

The next step is not to add more ad hoc fields.
It is to keep extending the schema layer until the rest of the design vocabulary fits inside it cleanly.

The main future targets are:

- destination schemas
- expedition schemas
- relay / loudspeaker schemas
- exploration object schemas
- encounter schemas
- Tuning persistence schemas

The standard should remain:

- static content in the catalog
- rich semantics in entity schemas
- mutable truth in runtime state
