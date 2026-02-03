## Shared terrain constants for the hex editor
## This file eliminates duplication between HexEditor and MainEditor
class_name TerrainConstants
extends RefCounted

## Terrain type definitions with visual and gameplay properties
const TERRAIN_TYPES := {
	"studio": { "color": Color(0.9, 0.7, 0.2), "impedance": 0.0, "blocker": false, "shortcut": KEY_0 },
	"plains": { "color": Color(0.6, 0.8, 0.4), "impedance": 1.0, "blocker": false, "shortcut": KEY_1 },
	"water": { "color": Color(0.3, 0.5, 0.8), "impedance": 0.1, "blocker": false, "shortcut": KEY_2 },
	"forest": { "color": Color(0.2, 0.5, 0.2), "impedance": 1.5, "blocker": false, "shortcut": KEY_3 },
	"hills": { "color": Color(0.7, 0.6, 0.4), "impedance": 2.0, "blocker": false, "shortcut": KEY_4 },
	"mountain": { "color": Color(0.5, 0.5, 0.5), "impedance": INF, "blocker": true, "shortcut": KEY_5 },
	"cave_entrance": { "color": Color(0.3, 0.2, 0.3), "impedance": 0.5, "blocker": false, "shortcut": KEY_6 },
	"swamp": { "color": Color(0.4, 0.5, 0.3), "impedance": 2.5, "blocker": false, "shortcut": KEY_7 },
	"desert": { "color": Color(0.9, 0.85, 0.6), "impedance": 1.2, "blocker": false, "shortcut": KEY_8 },
	"ruins": { "color": Color(0.6, 0.55, 0.5), "impedance": 1.8, "blocker": false, "shortcut": KEY_9 },
}

## Terrain cycle order (for UI display and click-cycling)
const TERRAIN_ORDER: Array[String] = [
	"studio", "plains", "water", "forest", "hills", "mountain",
	"cave_entrance", "swamp", "desert", "ruins"
]

## Edge feature types with visual properties
const EDGE_TYPES := {
	"river": { "color": Color(0.2, 0.4, 0.9), "width": 3.0 },
	"road": { "color": Color(0.6, 0.5, 0.3), "width": 4.0 },
	"wall": { "color": Color(0.4, 0.4, 0.4), "width": 5.0 },
}

## Edge type order (for UI display)
const EDGE_ORDER: Array[String] = ["river", "road", "wall"]

## Layer identifiers
const LAYER_TERRAIN := "terrain"
const LAYER_ELEVATION := "elevation"
const LAYER_EDGES := "edges"
const LAYER_POI := "poi"
const LAYER_REGIONS := "regions"

## Default region ID
const DEFAULT_REGION_ID := 0


## Get terrain color for a given terrain type
static func get_terrain_color(terrain: String) -> Color:
	if TERRAIN_TYPES.has(terrain):
		return TERRAIN_TYPES[terrain]["color"]
	return Color.MAGENTA  # Fallback for unknown terrain


## Get terrain impedance for a given terrain type
static func get_terrain_impedance(terrain: String) -> float:
	if TERRAIN_TYPES.has(terrain):
		return TERRAIN_TYPES[terrain]["impedance"]
	return 1.0  # Fallback


## Check if terrain is a blocker
static func is_terrain_blocker(terrain: String) -> bool:
	if TERRAIN_TYPES.has(terrain):
		return TERRAIN_TYPES[terrain]["blocker"]
	return false


## Get keyboard shortcut for a terrain type
static func get_terrain_shortcut(terrain: String) -> int:
	if TERRAIN_TYPES.has(terrain):
		return TERRAIN_TYPES[terrain]["shortcut"]
	return 0


## Get terrain index in the order array
static func get_terrain_index(terrain: String) -> int:
	return TERRAIN_ORDER.find(terrain)


## Get terrain by index
static func get_terrain_by_index(index: int) -> String:
	if index >= 0 and index < TERRAIN_ORDER.size():
		return TERRAIN_ORDER[index]
	return "plains"  # Fallback


## Get edge color for a given edge type
static func get_edge_color(edge_type: String) -> Color:
	if EDGE_TYPES.has(edge_type):
		return EDGE_TYPES[edge_type]["color"]
	return Color.WHITE


## Get edge width for a given edge type
static func get_edge_width(edge_type: String) -> float:
	if EDGE_TYPES.has(edge_type):
		return EDGE_TYPES[edge_type]["width"]
	return 2.0


## Get edge index in the order array
static func get_edge_index(edge_type: String) -> int:
	return EDGE_ORDER.find(edge_type)


## Get edge by index
static func get_edge_by_index(index: int) -> String:
	if index >= 0 and index < EDGE_ORDER.size():
		return EDGE_ORDER[index]
	return "river"  # Fallback
