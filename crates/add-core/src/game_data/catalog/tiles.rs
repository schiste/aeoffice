use crate::game_data::*;

const TILE_TAGS_BASE: &[TileTag] = &[
    TileTag::Base,
    TileTag::Sanctuary,
    TileTag::ConstructionAnchor,
];
const TILE_TAGS_PLAINS: &[TileTag] = &[TileTag::OpenGround];
const TILE_TAGS_RIVER: &[TileTag] = &[TileTag::WaterSource, TileTag::EasyPropagation];
const TILE_TAGS_SCRUB: &[TileTag] = &[TileTag::Brush, TileTag::Harvestable];
const TILE_TAGS_RIDGE: &[TileTag] = &[TileTag::Elevated, TileTag::HighImpedance];
const TILE_TAGS_MOUNTAIN: &[TileTag] = &[TileTag::Blocker, TileTag::Wall];
const TILE_TAGS_CAVE: &[TileTag] = &[TileTag::Landmark, TileTag::RecruitmentSource];

pub(in crate::game_data) const FLORA: &[FloraDef] = &[
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

pub(in crate::game_data) const STRUCTURES: &[StructureDef] = &[
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

pub(in crate::game_data) const TILES: &[TileDef] = &[
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
