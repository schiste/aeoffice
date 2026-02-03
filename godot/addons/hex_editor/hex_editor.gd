## Hex Map Editor - Main drawing and interaction component
## Paint terrain on a cube-coordinate hex grid, save/load to JSON
## Note: Removed @tool annotation to ensure proper input handling in game
class_name HexEditor
extends Node2D

signal map_changed
signal hex_selected(coord: Vector2i)
signal log_message(message: String)
signal validation_result(issues: Array)

# Use shared constants from TerrainConstants
const LAYER_TERRAIN := TerrainConstants.LAYER_TERRAIN
const LAYER_ELEVATION := TerrainConstants.LAYER_ELEVATION
const LAYER_EDGES := TerrainConstants.LAYER_EDGES
const LAYER_POI := TerrainConstants.LAYER_POI
const LAYER_REGIONS := TerrainConstants.LAYER_REGIONS

const DEFAULT_REGION_ID := TerrainConstants.DEFAULT_REGION_ID

## Terrain types with their properties (from shared constants)
const TERRAIN_TYPES := TerrainConstants.TERRAIN_TYPES

## Terrain cycle order for click-cycling (from shared constants)
const TERRAIN_ORDER := TerrainConstants.TERRAIN_ORDER

## Edge feature types (from shared constants)
const EDGE_TYPES := TerrainConstants.EDGE_TYPES

## Hex size in pixels (distance from center to corner)
@export var hex_size: float = 32.0:
	set(value):
		hex_size = value
		queue_redraw()

## Keep this node centered in the viewport (supports resizes / non-1080p screens)
@export var auto_center_in_viewport: bool = true

## Show coordinate labels on hexes
@export var show_coords: bool = false:
	set(value):
		show_coords = value
		queue_redraw()

## Show grid lines
@export var show_grid: bool = true:
	set(value):
		show_grid = value
		queue_redraw()

## Show elevation shading
@export var show_elevation: bool = true:
	set(value):
		show_elevation = value
		queue_redraw()

## Show edge features
@export var show_edges: bool = false:
	set(value):
		show_edges = value
		queue_redraw()

## Show POI markers
@export var show_poi: bool = false:
	set(value):
		show_poi = value
		queue_redraw()

## Show region borders
@export var show_regions: bool = false:
	set(value):
		show_regions = value
		queue_redraw()

## Show background hex grid (infinite grid for orientation)
@export var show_hex_grid: bool = true:
	set(value):
		show_hex_grid = value
		queue_redraw()

## Show imported basemap (if map meta provides one)
@export var show_basemap: bool = true:
	set(value):
		show_basemap = value
		queue_redraw()

## Opacity for terrain fill (use < 1.0 to see basemap under the hex colors, 0 to hide)
@export_range(0.0, 1.0, 0.05) var terrain_opacity: float = 0.0:
	set(value):
		terrain_opacity = clampf(value, 0.0, 1.0)
		queue_redraw()

## Opacity for basemap texture
@export_range(0.0, 1.0, 0.05) var basemap_opacity: float = 0.85:
	set(value):
		basemap_opacity = clampf(value, 0.0, 1.0)
		queue_redraw()

## Current terrain brush
@export_enum("studio", "plains", "water", "forest", "hills", "mountain", "cave_entrance", "swamp", "desert", "ruins")
var current_terrain: String = "plains"

## Current tool mode
enum ToolMode { PAINT, FILL, ERASE, EDGE, POI, REGION, SELECT }
var current_tool: ToolMode = ToolMode.SELECT:
	set(value):
		if current_tool == value:
			return
		current_tool = value
		# Cancel any in-progress edge placement when switching tools.
		is_drawing_edge = false
		queue_redraw()

## Brush size (radius in hexes)
var brush_size: int = 1:
	set(value):
		brush_size = int(clamp(value, 1, 20))
		queue_redraw()

## Current edge type for edge tool
var current_edge_type: String = "river"

## Map data: Dictionary[Vector2i, Dictionary]
## Each hex stores: { "terrain": String, "impedance": float, "features": Array, "elevation": int, "name": String, "description": String, "region_id": int }
var map_data: Dictionary = {}

## Edge data: Dictionary[String, Dictionary] - key is "q1,r1:q2,r2" sorted
## Each edge stores: { "type": String }
var edge_data: Dictionary = {}

## Region definitions: Dictionary[int, Dictionary]
## Each region stores: { "name": String, "color": Color }
var regions: Dictionary = {
	DEFAULT_REGION_ID: { "name": "Unassigned", "color": Color(0.9, 0.9, 0.9, 0.35) }
}

## Current region brush
var current_region_id: int = DEFAULT_REGION_ID

## Layer visibility + locks (enforced for edits)
var layer_visible: Dictionary = {
	LAYER_TERRAIN: true,
	LAYER_ELEVATION: true,
	LAYER_EDGES: true,
	LAYER_POI: true,
	LAYER_REGIONS: true,
}

var layer_locked: Dictionary = {
	LAYER_TERRAIN: false,
	LAYER_ELEVATION: false,
	LAYER_EDGES: false,
	LAYER_POI: false,
	LAYER_REGIONS: false,
}

## Terrain limits: Dictionary[String, int] - max hex count per terrain type
## If a terrain is not in this dict or value is 0, it has no limit
var terrain_limits: Dictionary = {}

## Currently hovered hex (for highlight)
var hovered_hex: Vector2i = Vector2i.ZERO
var has_hover: bool = false

## Selected hex for POI editing
var selected_hex: Vector2i = Vector2i.ZERO
var has_selection: bool = false

## Multi-selection (used by select + stamps)
var selection: Dictionary = {} # Vector2i -> true
var is_box_selecting: bool = false
var box_select_start_world: Vector2 = Vector2.ZERO
var box_select_end_world: Vector2 = Vector2.ZERO

## Clipboard stamp (for copy/paste + transforms)
var stamp_hexes: Array[Dictionary] = []
var stamp_edges: Array[Dictionary] = []
var has_stamp: bool = false

var _box_select_moved: bool = false
const _BOX_SELECT_MIN_PX := 6.0
var _box_select_additive: bool = false

## Undo/redo history (diff-based, supports jump-to-state)
const MAX_HISTORY := 200
var history_labels: Array[String] = []
var history_index: int = 0 # current state index (0 = base)
var _history_base_state: Dictionary = {}
var _history_commands: Array[Dictionary] = [] # each: {label, hex_before/after, edge_before/after, region_before/after, limits_before/after}

var _history_pending: bool = false
var _history_pending_label: String = ""
var _history_hex_before: Dictionary = {} # Vector2i -> Dictionary|null
var _history_edge_before: Dictionary = {} # String -> Dictionary|null
var _history_region_before: Dictionary = {} # int -> Dictionary|null
var _history_limits_before: Dictionary = {} # String -> int|null

## Camera/pan state
var camera_offset: Vector2 = Vector2.ZERO
var is_panning: bool = false
var pan_start: Vector2 = Vector2.ZERO

@export var debug_input_logs: bool = false

## Autosave state
var autosave_timer: float = 0.0
const AUTOSAVE_INTERVAL := 120.0  # 2 minutes
const MAX_AUTOSAVE_VERSIONS := 10
var has_unsaved_changes: bool = false
var last_save_time: String = ""

## Current working map path (used by keyboard shortcuts / UI).
@export var map_path: String = "res://maps/world.json"

## Stores arbitrary metadata from the map file (preserved on save/autosave)
var map_meta: Dictionary = {}

## Basemap rendering info (loaded from `meta.basemap`)
var basemap_texture: Texture2D = null  # For single-image basemap (legacy)
var basemap_radius_m: float = 0.0
var import_hex_size_m: float = 0.0

## Tile-based basemap (new format)
var basemap_tiles: Dictionary = {}  # Key: "x_y" -> Texture2D
var basemap_tile_meta: Dictionary = {}  # Metadata from JSON
var basemap_is_tiled: bool = false

## Stats for debug panel
var terrain_counts: Dictionary = {}
var map_bounds: Rect2i = Rect2i()

## Edge drawing state
var edge_start_hex: Vector2i = Vector2i.ZERO
var is_drawing_edge: bool = false


func _ready() -> void:
	print("[HexEditor] _ready() called")
	if auto_center_in_viewport:
		global_position = get_viewport_rect().size * 0.5

	layer_visible[LAYER_ELEVATION] = show_elevation
	layer_visible[LAYER_EDGES] = show_edges
	layer_visible[LAYER_POI] = show_poi
	layer_visible[LAYER_REGIONS] = show_regions

	# Try to load existing map, otherwise create starter
	var load_result := load_map(map_path)
	if load_result != OK or map_data.is_empty():
		_create_starter_map()
		_reset_history("Initial (starter)")
	else:
		_reset_history("Initial (loaded)")
	_update_stats()
	print("[HexEditor] Ready with %d hexes, position=%s" % [map_data.size(), global_position])
	_log("HexEditor ready. Hex count: %d" % map_data.size())


func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_SIZE_CHANGED and auto_center_in_viewport:
		global_position = get_viewport_rect().size * 0.5
		queue_redraw()


func _process(delta: float) -> void:
	if not is_visible_in_tree():
		return

	# Hover tracking (frame-based so it stays responsive even during UI interactions)
	var new_hover := _pixel_to_cube(get_local_mouse_position() - camera_offset)
	if not has_hover or new_hover != hovered_hex:
		hovered_hex = new_hover
		has_hover = true
		queue_redraw()

	# Autosave timer
	if has_unsaved_changes:
		autosave_timer += delta
		if autosave_timer >= AUTOSAVE_INTERVAL:
			_autosave()
			autosave_timer = 0.0


func _create_starter_map() -> void:
	# Create The Studio at origin plus surrounding hexes
	map_data[Vector2i(0, 0)] = {
		"terrain": "studio",
		"impedance": 0.0,
		"features": ["base", "crystal"],
		"elevation": 0,
		"name": "The Studio",
		"description": "The heart of the Base. The Crystal resonates here, creating the bubble that keeps the Silence at bay.",
		"region_id": DEFAULT_REGION_ID
	}
	# Add a ring of plains around it
	for coord in _get_neighbors(Vector2i.ZERO):
		map_data[coord] = {
			"terrain": "plains",
			"impedance": 1.0,
			"features": [],
			"elevation": 0,
			"name": "",
			"description": "",
			"region_id": DEFAULT_REGION_ID
		}
	queue_redraw()
	_log("Created starter map with %d hexes" % map_data.size())


func _get_neighbors(cube: Vector2i) -> Array[Vector2i]:
	return HexMath.get_neighbors(cube)


## Get hexes within a radius (for brush)
func _get_hexes_in_radius(center: Vector2i, radius: int) -> Array[Vector2i]:
	if radius <= 0:
		return [center]
	return HexMath.get_hexes_in_radius(center, radius)


## Get edge key from two hex coordinates (sorted for consistency)
func _get_edge_key(hex1: Vector2i, hex2: Vector2i) -> String:
	var coords: Array = [[hex1.x, hex1.y], [hex2.x, hex2.y]]
	coords.sort()
	return "%d,%d:%d,%d" % [coords[0][0], coords[0][1], coords[1][0], coords[1][1]]


## Draw background hex grid covering the visible area
func _draw_background_grid() -> void:
	# Get viewport bounds in pixel coordinates
	var viewport_size := get_viewport_rect().size

	# Calculate visible area in world coordinates (accounting for camera offset)
	var margin := hex_size * 2  # Extra hexes beyond viewport edge
	var top_left := to_local(Vector2.ZERO) - camera_offset - Vector2(margin, margin)
	var bottom_right := to_local(viewport_size) - camera_offset + Vector2(margin, margin)

	# Convert to hex coordinate bounds
	var tl_hex := _pixel_to_cube(top_left)
	var br_hex := _pixel_to_cube(bottom_right)

	# Expand bounds slightly
	var min_q: int = tl_hex.x - 2
	var max_q: int = br_hex.x + 2
	var min_r: int = tl_hex.y - 2
	var max_r: int = br_hex.y + 2

	# Draw grid hexes
	var grid_color := Color(0.7, 0.7, 0.75, 0.4)  # Light grey

	for q in range(min_q, max_q + 1):
		for r in range(min_r, max_r + 1):
			var coord := Vector2i(q, r)
			# Skip if this hex already has map data (will be drawn filled)
			if map_data.has(coord):
				continue

			var pixel_pos := _cube_to_pixel(coord) + camera_offset
			var corners := _get_hex_corners(pixel_pos, hex_size * 0.95)

			# Draw outline only
			for i in range(6):
				draw_line(corners[i], corners[(i + 1) % 6], grid_color, 1.0)


func _draw() -> void:
	_draw_basemap()
	# Draw background hex grid first (infinite grid for orientation)
	if show_hex_grid:
		_draw_background_grid()

	# Draw all hexes
	for coord in map_data.keys():
		_draw_hex(coord)

	# Draw edge features
	if show_edges and bool(layer_visible.get(LAYER_EDGES, true)):
		for edge_key in edge_data.keys():
			_draw_edge(edge_key)

	# Draw region borders
	if show_regions and bool(layer_visible.get(LAYER_REGIONS, true)):
		_draw_region_borders()

	# Draw brush preview
	if has_hover and current_tool == ToolMode.PAINT and brush_size > 1:
		for coord in _get_hexes_in_radius(hovered_hex, brush_size - 1):
			if coord != hovered_hex:
				_draw_hex_outline(coord, Color(1, 1, 1, 0.3), 1.0)

	# Draw erase brush preview
	if has_hover and current_tool == ToolMode.ERASE and brush_size > 1:
		for coord in _get_hexes_in_radius(hovered_hex, brush_size - 1):
			if coord != hovered_hex:
				_draw_hex_outline(coord, Color(1, 0.3, 0.3, 0.4), 1.0)

	# Draw hover highlight
	if has_hover:
		var hover_color := Color.WHITE
		if current_tool == ToolMode.ERASE:
			hover_color = Color.RED
		elif current_tool == ToolMode.EDGE and is_drawing_edge:
			hover_color = Color.CYAN
		_draw_hex_outline(hovered_hex, hover_color, 2.0)

	# Draw selection highlight
	if has_selection:
		_draw_hex_outline(selected_hex, Color.YELLOW, 3.0)

	# Draw multi-selection
	if not selection.is_empty():
		for coord in selection.keys():
			_draw_hex_outline(coord, Color(0.2, 0.85, 1.0, 0.9), 2.0)

	# Draw box selection rectangle (in world space)
	if is_box_selecting:
		var a := box_select_start_world + camera_offset
		var b := box_select_end_world + camera_offset
		var rect := Rect2(a, b - a).abs()
		draw_rect(rect, Color(0.2, 0.85, 1.0, 0.15), true)
		draw_rect(rect, Color(0.2, 0.85, 1.0, 0.6), false, 2.0)

	# Draw edge preview
	if is_drawing_edge and has_hover:
		var start_pixel := _cube_to_pixel(edge_start_hex) + camera_offset
		var end_pixel := _cube_to_pixel(hovered_hex) + camera_offset
		var edge_props: Dictionary = EDGE_TYPES.get(current_edge_type, EDGE_TYPES["river"])
		draw_line(start_pixel, end_pixel, edge_props["color"].lightened(0.3), edge_props["width"], true)


func _draw_hex(coord: Vector2i) -> void:
	var pixel_pos := _cube_to_pixel(coord) + camera_offset
	var corners := _get_hex_corners(pixel_pos, hex_size * 0.95)  # Slight gap between hexes

	# Get hex data for POI and elevation
	var hex_data: Dictionary = map_data.get(coord, {})

	# Only draw terrain fill if opacity > 0
	if terrain_opacity > 0.001:
		var terrain: String = hex_data.get("terrain", "plains")
		var color: Color
		if bool(layer_visible.get(LAYER_TERRAIN, true)):
			color = TERRAIN_TYPES.get(terrain, TERRAIN_TYPES["plains"])["color"]
		else:
			color = Color(0.12, 0.12, 0.14, 1.0)

		# Apply elevation shading
		if show_elevation and bool(layer_visible.get(LAYER_ELEVATION, true)):
			var elevation: int = hex_data.get("elevation", 0)
			if elevation > 0:
				color = color.lightened(elevation * 0.08)
			elif elevation < 0:
				color = color.darkened(-elevation * 0.1)

		# Draw filled hex
		var effective_opacity: float = terrain_opacity
		if show_basemap and (basemap_texture != null or basemap_is_tiled):
			effective_opacity *= 0.75
		if effective_opacity < 0.999:
			color.a *= effective_opacity
		draw_colored_polygon(corners, color)

	# Draw grid outline
	if show_grid:
		for i in range(6):
			draw_line(corners[i], corners[(i + 1) % 6], Color(0, 0, 0, 0.3), 1.0)

	# Draw POI marker if hex has a name
	if show_poi and bool(layer_visible.get(LAYER_POI, true)):
		var hex_name: String = hex_data.get("name", "")
		if hex_name != "":
			# Draw a small diamond marker
			var marker_size: float = hex_size * 0.25
			var marker_points := PackedVector2Array([
				pixel_pos + Vector2(0, -marker_size),
				pixel_pos + Vector2(marker_size, 0),
				pixel_pos + Vector2(0, marker_size),
				pixel_pos + Vector2(-marker_size, 0),
			])
			draw_colored_polygon(marker_points, Color(1, 0.8, 0, 0.9))
			draw_polyline(marker_points + PackedVector2Array([marker_points[0]]), Color(0.3, 0.2, 0), 1.5)

	# Draw coordinate label
	if show_coords:
		var label := "(%d,%d)" % [coord.x, coord.y]
		draw_string(
			ThemeDB.fallback_font,
			pixel_pos - Vector2(20, -5),
			label,
			HORIZONTAL_ALIGNMENT_CENTER,
			-1,
			10,
			Color(0, 0, 0, 0.7)
		)

	# Draw elevation label
	if show_elevation and bool(layer_visible.get(LAYER_ELEVATION, true)):
		var elevation: int = hex_data.get("elevation", 0)
		if elevation != 0:
			var elev_label := "%+d" % elevation
			draw_string(
				ThemeDB.fallback_font,
				pixel_pos + Vector2(-8, 15),
				elev_label,
				HORIZONTAL_ALIGNMENT_CENTER,
				-1,
				9,
				Color(0, 0, 0, 0.5)
			)


func _draw_basemap() -> void:
	if not show_basemap:
		return
	if basemap_opacity <= 0.001:
		return
	if import_hex_size_m <= 0.0:
		return

	if basemap_is_tiled:
		_draw_basemap_tiles()
	else:
		_draw_basemap_single()


func _draw_basemap_single() -> void:
	"""Draw legacy single-image basemap."""
	if basemap_texture == null:
		return
	if basemap_radius_m <= 0.0:
		return

	var editor_px_per_m: float = hex_size / import_hex_size_m
	var half: float = basemap_radius_m * editor_px_per_m
	var rect := Rect2(camera_offset + Vector2(-half, -half), Vector2(half * 2.0, half * 2.0))
	draw_texture_rect(basemap_texture, rect, false, Color(1, 1, 1, basemap_opacity))


func _draw_basemap_tiles() -> void:
	"""Draw tile-based basemap with on-demand loading."""
	if basemap_tile_meta.is_empty():
		return

	var grid: Dictionary = basemap_tile_meta.get("grid", {})
	var cols: int = int(grid.get("cols", 0))
	var rows: int = int(grid.get("rows", 0))
	var tile_size_px: int = int(basemap_tile_meta.get("tile_size", 256))

	if cols <= 0 or rows <= 0:
		return

	# Calculate editor scale
	var editor_px_per_m: float = hex_size / import_hex_size_m
	var radius_m: float = float(basemap_tile_meta.get("radius_m", 0.0))
	if radius_m <= 0.0:
		return

	# Total basemap size in pixels (in editor space)
	var total_width_m: float = radius_m * 2.0  # Approximate
	var total_height_m: float = radius_m * 2.0
	# More accurate: use bounds if available
	var bounds: Dictionary = basemap_tile_meta.get("bounds", {})
	if not bounds.is_empty():
		var center_lat: float = float(basemap_tile_meta.get("center_lat", 0.0))
		var center_lon: float = float(basemap_tile_meta.get("center_lon", 0.0))
		var top_lat: float = float(bounds.get("top_lat", center_lat))
		var bottom_lat: float = float(bounds.get("bottom_lat", center_lat))
		var left_lon: float = float(bounds.get("left_lon", center_lon))
		var right_lon: float = float(bounds.get("right_lon", center_lon))
		# Convert to meters (approximate)
		total_height_m = abs(top_lat - bottom_lat) * 111000.0
		total_width_m = abs(right_lon - left_lon) * 111000.0 * cos(deg_to_rad(center_lat))

	var total_width_editor: float = total_width_m * editor_px_per_m
	var total_height_editor: float = total_height_m * editor_px_per_m
	var tile_width_editor: float = total_width_editor / cols
	var tile_height_editor: float = total_height_editor / rows

	# Calculate viewport bounds in world space to determine visible tiles
	var viewport_size := get_viewport_rect().size
	var view_left: float = -camera_offset.x - viewport_size.x * 0.5
	var view_right: float = -camera_offset.x + viewport_size.x * 0.5
	var view_top: float = -camera_offset.y - viewport_size.y * 0.5
	var view_bottom: float = -camera_offset.y + viewport_size.y * 0.5

	# Basemap origin (top-left corner in world space)
	var basemap_origin := Vector2(-total_width_editor * 0.5, -total_height_editor * 0.5)

	# Draw only visible tiles
	for ty in range(rows):
		for tx in range(cols):
			var tile_left: float = basemap_origin.x + tx * tile_width_editor
			var tile_right: float = tile_left + tile_width_editor
			var tile_top: float = basemap_origin.y + ty * tile_height_editor
			var tile_bottom: float = tile_top + tile_height_editor

			# Skip tiles outside viewport
			if tile_right < view_left or tile_left > view_right:
				continue
			if tile_bottom < view_top or tile_top > view_bottom:
				continue

			# Load tile on demand
			var tile_key := "%d_%d" % [tx, ty]
			var tex: Texture2D = _get_or_load_tile(tx, ty)
			if tex == null:
				continue

			# Draw tile
			var rect := Rect2(
				camera_offset + Vector2(tile_left, tile_top),
				Vector2(tile_width_editor, tile_height_editor)
			)
			draw_texture_rect(tex, rect, false, Color(1, 1, 1, basemap_opacity))


func _get_or_load_tile(tx: int, ty: int) -> Texture2D:
	"""Load a basemap tile on demand, caching it."""
	var tile_key := "%d_%d" % [tx, ty]

	# Return cached tile
	if basemap_tiles.has(tile_key):
		return basemap_tiles[tile_key]

	# Load tile from disk
	var tiles_dir: String = basemap_tile_meta.get("tiles_dir", "")
	if tiles_dir == "":
		return null

	var tile_path := "%s/tile_%d_%d.png" % [tiles_dir, tx, ty]
	if not ResourceLoader.exists(tile_path):
		return null

	var tex: Texture2D = load(tile_path) as Texture2D
	if tex != null:
		basemap_tiles[tile_key] = tex

	return tex


func _draw_edge(edge_key: String) -> void:
	var ab: Array[Vector2i] = _edge_key_to_coords(edge_key)
	if ab.size() != 2:
		return
	var hex1: Vector2i = ab[0]
	var hex2: Vector2i = ab[1]

	var pixel1 := _cube_to_pixel(hex1) + camera_offset
	var pixel2 := _cube_to_pixel(hex2) + camera_offset
	var midpoint := (pixel1 + pixel2) / 2.0

	var edge_info: Dictionary = edge_data[edge_key]
	var edge_type: String = edge_info.get("type", "river")
	var edge_props: Dictionary = EDGE_TYPES.get(edge_type, EDGE_TYPES["river"])

	# Find the shared edge between the two hexes
	var corners1 := _get_hex_corners(pixel1, hex_size)
	var corners2 := _get_hex_corners(pixel2, hex_size)

	# Find closest corners to draw on the actual edge
	var min_dist: float = INF
	var edge_start: Vector2 = Vector2.ZERO
	var edge_end: Vector2 = Vector2.ZERO

	for i in range(6):
		for j in range(6):
			var dist: float = corners1[i].distance_to(corners2[j])
			if dist < min_dist:
				min_dist = dist
				edge_start = corners1[i]
				edge_end = corners1[(i + 1) % 6]

	draw_line(edge_start, edge_end, edge_props["color"], edge_props["width"], true)


func _get_region_id(coord: Vector2i) -> int:
	if not map_data.has(coord):
		return DEFAULT_REGION_ID
	return int(map_data[coord].get("region_id", DEFAULT_REGION_ID))


func _get_region_color(region_id: int) -> Color:
	var reg: Dictionary = regions.get(region_id, regions[DEFAULT_REGION_ID])
	var fallback: Color = Color(1, 1, 1, 0.35)
	var c_val: Variant = reg.get("color", fallback)
	if c_val is Color:
		return c_val as Color
	return fallback

func _get_region_name(region_id: int) -> String:
	var reg: Dictionary = regions.get(region_id, regions[DEFAULT_REGION_ID])
	return str(reg.get("name", ""))


func _set_region_id(coord: Vector2i, region_id: int) -> void:
	if not map_data.has(coord):
		return
	if bool(layer_locked.get(LAYER_REGIONS, false)):
		_log("Regions layer is locked")
		return
	var new_id: int = region_id if regions.has(region_id) else DEFAULT_REGION_ID
	if int(map_data[coord].get("region_id", DEFAULT_REGION_ID)) == new_id:
		return

	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Set region")
	_history_track_hex(coord)
	map_data[coord]["region_id"] = new_id
	if owns_history:
		_mark_changed("Set region")


func _toggle_selection(coord: Vector2i, additive: bool) -> void:
	if not map_data.has(coord):
		return
	if not additive:
		selection.clear()
	if selection.has(coord):
		selection.erase(coord)
	else:
		selection[coord] = true

	if selection.is_empty():
		has_selection = false
		selected_hex = Vector2i.ZERO
		queue_redraw()
		return

	# Keep single-selection (inspector) in sync.
	selected_hex = coord if selection.has(coord) else selection.keys()[0]
	has_selection = true
	hex_selected.emit(selected_hex)
	queue_redraw()


func _apply_box_selection(additive: bool) -> void:
	if not additive:
		selection.clear()

	var rect := Rect2(box_select_start_world, box_select_end_world - box_select_start_world).abs()
	for coord in map_data.keys():
		var center := _cube_to_pixel(coord)
		if rect.has_point(center):
			selection[coord] = true

	if selection.is_empty():
		has_selection = false
		selected_hex = Vector2i.ZERO
		return

	selected_hex = selection.keys()[0]
	has_selection = true
	hex_selected.emit(selected_hex)


func _copy_selection_to_stamp() -> void:
	if selection.is_empty():
		_log("Nothing selected to copy")
		return

	var anchor: Vector2i = selected_hex if has_selection else selection.keys()[0]

	stamp_hexes.clear()
	stamp_edges.clear()

	# Hex payload
	for coord in selection.keys():
		var hex_data: Dictionary = map_data.get(coord, {})
		stamp_hexes.append({
			"dq": coord.x - anchor.x,
			"dr": coord.y - anchor.y,
			"terrain": hex_data.get("terrain", "plains"),
			"elevation": int(hex_data.get("elevation", 0)),
			"region_id": int(hex_data.get("region_id", DEFAULT_REGION_ID)),
			"name": hex_data.get("name", ""),
			"description": hex_data.get("description", ""),
			"features": hex_data.get("features", []),
		})

	# Edge payload (only edges fully within selection)
	var selected_lookup: Dictionary = selection
	for edge_key in edge_data.keys():
		var endpoints: Array[Vector2i] = _edge_key_to_coords(edge_key)
		if endpoints.size() != 2:
			continue
		var a: Vector2i = endpoints[0]
		var b: Vector2i = endpoints[1]
		if not selected_lookup.has(a) or not selected_lookup.has(b):
			continue
		stamp_edges.append({
			"dq1": a.x - anchor.x,
			"dr1": a.y - anchor.y,
			"dq2": b.x - anchor.x,
			"dr2": b.y - anchor.y,
			"type": edge_data[edge_key].get("type", "river"),
		})

	has_stamp = true
	_log("Copied stamp: %d hexes, %d edges" % [stamp_hexes.size(), stamp_edges.size()])


func _paste_stamp(target: Vector2i) -> void:
	if not has_stamp:
		return

	var changed := false
	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Paste stamp")

	for item in stamp_hexes:
		var coord := Vector2i(int(item["dq"]) + target.x, int(item["dr"]) + target.y)
		var existed: bool = map_data.has(coord)
		if not existed:
			if bool(layer_locked.get(LAYER_TERRAIN, false)):
				continue
			_history_track_hex(coord)
			map_data[coord] = {
				"terrain": "plains",
				"impedance": 1.0,
				"features": [],
				"elevation": 0,
				"name": "",
				"description": "",
				"region_id": DEFAULT_REGION_ID
			}
			existed = true
			changed = true

		var hex_data: Dictionary = map_data[coord]

		if not bool(layer_locked.get(LAYER_TERRAIN, false)):
			var terrain: String = item.get("terrain", "plains")
			var terrain_data: Dictionary = TERRAIN_TYPES.get(terrain, TERRAIN_TYPES["plains"])
			if str(hex_data.get("terrain", "")) != terrain or float(hex_data.get("impedance", 0.0)) != float(terrain_data["impedance"]) or hex_data.get("features", []) != item.get("features", []):
				_history_track_hex(coord)
				hex_data["terrain"] = terrain
				hex_data["impedance"] = terrain_data["impedance"]
				hex_data["features"] = item.get("features", [])
				changed = true

		if not bool(layer_locked.get(LAYER_ELEVATION, false)):
			var new_e: int = int(item.get("elevation", 0))
			if int(hex_data.get("elevation", 0)) != new_e:
				_history_track_hex(coord)
				hex_data["elevation"] = new_e
				changed = true

		if not bool(layer_locked.get(LAYER_REGIONS, false)):
			var rid := int(item.get("region_id", DEFAULT_REGION_ID))
			var new_rid: int = rid if regions.has(rid) else DEFAULT_REGION_ID
			if int(hex_data.get("region_id", DEFAULT_REGION_ID)) != new_rid:
				_history_track_hex(coord)
				hex_data["region_id"] = new_rid
				changed = true

		if not bool(layer_locked.get(LAYER_POI, false)):
			var new_name := str(item.get("name", ""))
			var new_desc := str(item.get("description", ""))
			if str(hex_data.get("name", "")) != new_name or str(hex_data.get("description", "")) != new_desc:
				_history_track_hex(coord)
				hex_data["name"] = new_name
				hex_data["description"] = new_desc
				changed = true

		map_data[coord] = hex_data

	if not bool(layer_locked.get(LAYER_EDGES, false)):
		for edge in stamp_edges:
			var a := Vector2i(int(edge["dq1"]) + target.x, int(edge["dr1"]) + target.y)
			var b := Vector2i(int(edge["dq2"]) + target.x, int(edge["dr2"]) + target.y)
			if not map_data.has(a) or not map_data.has(b):
				continue
				if b not in _get_neighbors(a):
					continue
				var key := _get_edge_key(a, b)
				var etype := str(edge.get("type", "river"))
				var existing: Dictionary = edge_data.get(key, {})
				if not edge_data.has(key) or str(existing.get("type", "")) != etype:
					_history_track_edge(key)
					edge_data[key] = { "type": etype }
					changed = true

	if changed:
		if owns_history:
			_mark_changed("Paste stamp")
		_log("Pasted stamp at (%d,%d)" % [target.x, target.y])
	elif owns_history:
		_history_cancel()


func _cut_selection() -> void:
	if selection.is_empty():
		return
	if bool(layer_locked.get(LAYER_TERRAIN, false)):
		_log("Terrain layer is locked")
		return

	var to_delete: Array[Vector2i] = []
	for coord in selection.keys():
		if map_data.get(coord, {}).get("terrain", "") == "studio":
			continue
		to_delete.append(coord)

	if to_delete.is_empty():
		return

	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Cut selection")

	for coord in to_delete:
		_history_track_hex(coord)
		map_data.erase(coord)

	# Remove any edges connected to deleted hexes.
	var edges_to_remove: Array[String] = []
	var to_delete_set: Dictionary = {}
	for c in to_delete:
		to_delete_set[c] = true
	for edge_key in edge_data.keys():
		var ab: Array[Vector2i] = _edge_key_to_coords(edge_key)
		if ab.size() != 2:
			continue
			if to_delete_set.has(ab[0]) or to_delete_set.has(ab[1]):
				edges_to_remove.append(edge_key)
	for edge_key in edges_to_remove:
		_history_track_edge(edge_key)
		edge_data.erase(edge_key)

	selection.clear()
	has_selection = false
	if owns_history:
		_mark_changed("Cut selection")


func _rotate_stamp(clockwise: bool) -> void:
	if not has_stamp:
		return
	for item in stamp_hexes:
		var q: int = int(item["dq"])
		var r: int = int(item["dr"])
		var nq: int
		var nr: int
		if clockwise:
			nq = -r
			nr = q + r
		else:
			nq = q + r
			nr = -q
		item["dq"] = nq
		item["dr"] = nr

	for edge in stamp_edges:
		var q1: int = int(edge["dq1"])
		var r1: int = int(edge["dr1"])
		var q2: int = int(edge["dq2"])
		var r2: int = int(edge["dr2"])

		var nq1: int
		var nr1: int
		var nq2: int
		var nr2: int

		if clockwise:
			nq1 = -r1
			nr1 = q1 + r1
			nq2 = -r2
			nr2 = q2 + r2
		else:
			nq1 = q1 + r1
			nr1 = -q1
			nq2 = q2 + r2
			nr2 = -q2

		edge["dq1"] = nq1
		edge["dr1"] = nr1
		edge["dq2"] = nq2
		edge["dr2"] = nr2

	_log("Rotated stamp %s" % ("CW" if clockwise else "CCW"))


func _mirror_stamp(primary: bool) -> void:
	# primary = reflect across q axis (swap r<->s); secondary = reflect across r axis (swap q<->s)
	if not has_stamp:
		return
	for item in stamp_hexes:
		var q: int = int(item["dq"])
		var r: int = int(item["dr"])
		if primary:
			item["dq"] = q
			item["dr"] = -q - r
		else:
			item["dq"] = -q - r
			item["dr"] = r

	for edge in stamp_edges:
		var q1: int = int(edge["dq1"])
		var r1: int = int(edge["dr1"])
		var q2: int = int(edge["dq2"])
		var r2: int = int(edge["dr2"])
		if primary:
			edge["dq1"] = q1
			edge["dr1"] = -q1 - r1
			edge["dq2"] = q2
			edge["dr2"] = -q2 - r2
		else:
			edge["dq1"] = -q1 - r1
			edge["dr1"] = r1
			edge["dq2"] = -q2 - r2
			edge["dr2"] = r2

	_log("Mirrored stamp")


func _edge_key_to_coords(edge_key: String) -> Array[Vector2i]:
	var parts := edge_key.split(":")
	if parts.size() != 2:
		var empty: Array[Vector2i] = []
		return empty
	var c1 := parts[0].split(",")
	var c2 := parts[1].split(",")
	if c1.size() != 2 or c2.size() != 2:
		var empty2: Array[Vector2i] = []
		return empty2
	return [Vector2i(int(c1[0]), int(c1[1])), Vector2i(int(c2[0]), int(c2[1]))]


func _draw_region_borders() -> void:
	var drawn: Dictionary = {}
	for coord in map_data.keys():
		var region_a := _get_region_id(coord)
		for neighbor in _get_neighbors(coord):
			if not map_data.has(neighbor):
				continue
			var region_b := _get_region_id(neighbor)
			if region_a == region_b:
				continue

			var edge_key := _get_edge_key(coord, neighbor)
			if drawn.has(edge_key):
				continue
			drawn[edge_key] = true

			var pixel1 := _cube_to_pixel(coord) + camera_offset
			var pixel2 := _cube_to_pixel(neighbor) + camera_offset

			var corners1 := _get_hex_corners(pixel1, hex_size)
			var corners2 := _get_hex_corners(pixel2, hex_size)

			var min_dist: float = INF
			var border_start: Vector2 = Vector2.ZERO
			var border_end: Vector2 = Vector2.ZERO
			for i in range(6):
				for j in range(6):
					var dist: float = corners1[i].distance_to(corners2[j])
					if dist < min_dist:
						min_dist = dist
						border_start = corners1[i]
						border_end = corners1[(i + 1) % 6]

			var c1: Color = _get_region_color(region_a)
			c1.a = 0.85
			var c2: Color = _get_region_color(region_b)
			c2.a = 0.85
			var border_color: Color = c1.lerp(c2, 0.5)
			draw_line(border_start, border_end, border_color, 3.0, true)


## Convert cube coordinates to pixel position (pointy-top hex)
func _cube_to_pixel(cube: Vector2i) -> Vector2:
	return HexMath.cube_to_pixel(cube, hex_size)


## Get corner vertices of a hex for drawing (pointy-top)
func _get_hex_corners(center_pixel: Vector2, size: float) -> PackedVector2Array:
	return HexMath.get_hex_corners(center_pixel, size)


## Convert pixel to cube coordinates (for mouse clicks)
func _pixel_to_cube(pixel: Vector2) -> Vector2i:
	return HexMath.pixel_to_cube(pixel, hex_size)


## Round fractional cube coordinates to nearest hex
func _cube_round(frac: Vector2) -> Vector2i:
	return HexMath.cube_round(frac)


func _draw_hex_outline(coord: Vector2i, color: Color, width: float) -> void:
	var pixel_pos := _cube_to_pixel(coord) + camera_offset
	var corners := _get_hex_corners(pixel_pos, hex_size)

	for i in range(6):
		draw_line(corners[i], corners[(i + 1) % 6], color, width)


func _input(event: InputEvent) -> void:
	# Use _input for mouse motion so hover tracking always works
	# regardless of UI state
	if not is_visible_in_tree():
		return

	# Mouse motion - always track hover position
	if event is InputEventMouseMotion:
		var local_pos := get_local_mouse_position() - camera_offset
		hovered_hex = _pixel_to_cube(local_pos)
		has_hover = true

		# Handle panning
		if is_panning:
			camera_offset += event.relative
		queue_redraw()


func _unhandled_input(event: InputEvent) -> void:
	# Use _unhandled_input for clicks so UI elements get first priority
	if not is_visible_in_tree():
		return

	# Mouse motion - update hover and handle panning (backup)
	if event is InputEventMouseMotion:
		var local_pos := get_local_mouse_position() - camera_offset
		hovered_hex = _pixel_to_cube(local_pos)
		has_hover = true  # Always show hover for adding new hexes

		if is_box_selecting:
			box_select_end_world = local_pos
			if box_select_end_world.distance_to(box_select_start_world) > _BOX_SELECT_MIN_PX:
				_box_select_moved = true

		# Handle panning (Option/Alt + drag OR middle mouse)
		if is_panning:
			camera_offset += event.relative
		queue_redraw()

	# Handle pan gesture (two-finger drag on trackpad/Magic Mouse)
	if event is InputEventPanGesture:
		camera_offset -= event.delta * 20.0
		queue_redraw()

	# Handle magnify gesture (pinch to zoom on trackpad/Magic Mouse)
	if event is InputEventMagnifyGesture:
		var zoom_factor: float = event.factor
		hex_size = clamp(hex_size * zoom_factor, 1.0, 1000.0)
		queue_redraw()

	# Mouse button
	if event is InputEventMouseButton:
		var local_pos := get_local_mouse_position() - camera_offset
		var clicked_hex := _pixel_to_cube(local_pos)

		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				if debug_input_logs:
					_log("LEFT CLICK: hex=(%d,%d) exists=%s tool=%s" % [clicked_hex.x, clicked_hex.y, map_data.has(clicked_hex), ToolMode.keys()[current_tool]])
					_log("  Modifiers: alt=%s ctrl=%s shift=%s" % [event.alt_pressed, event.ctrl_pressed, event.shift_pressed])
				# Option/Alt + click = start panning (for Magic Mouse)
				if event.alt_pressed:
					is_panning = true
					if debug_input_logs:
						_log("  -> Starting pan")
				else:
					if current_tool == ToolMode.SELECT:
						is_box_selecting = true
						_box_select_moved = false
						_box_select_additive = event.shift_pressed
						box_select_start_world = local_pos
						box_select_end_world = local_pos
						queue_redraw()
					else:
						_handle_left_click(clicked_hex, event)
			else:
				is_panning = false
				is_drawing_edge = false
				if is_box_selecting and current_tool == ToolMode.SELECT:
					is_box_selecting = false
					if _box_select_moved:
						_apply_box_selection(_box_select_additive)
					else:
						_toggle_selection(clicked_hex, _box_select_additive)
					queue_redraw()

		elif event.button_index == MOUSE_BUTTON_RIGHT:
			if event.pressed:
				if debug_input_logs:
					_log("RIGHT CLICK at hex (%d,%d)" % [clicked_hex.x, clicked_hex.y])
				_handle_right_click(clicked_hex)

		elif event.button_index == MOUSE_BUTTON_MIDDLE:
			is_panning = event.pressed
			if debug_input_logs:
				_log("MIDDLE MOUSE: panning=%s" % is_panning)

		# Zoom with scroll wheel
		elif event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			hex_size = min(hex_size * 1.1, 1000.0)
			if debug_input_logs:
				_log("Scroll UP: hex_size=%.1f" % hex_size)

		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			hex_size = max(hex_size / 1.1, 1.0)
			if debug_input_logs:
				_log("Scroll DOWN: hex_size=%.1f" % hex_size)

	# Keyboard shortcuts
	if event is InputEventKey and event.pressed:
		var cmd_pressed: bool = event.ctrl_pressed or event.meta_pressed  # meta = Cmd on Mac

		# Cmd shortcuts
		if cmd_pressed and event.keycode == KEY_Z:
			if event.shift_pressed:
				redo()
			else:
				undo()
		elif cmd_pressed and event.keycode == KEY_S:
			save_map(map_path)
		elif cmd_pressed and event.keycode == KEY_O:
			load_map(map_path)
		elif cmd_pressed and event.keycode == KEY_V:
			if event.shift_pressed:
				if has_stamp and has_hover:
					_paste_stamp(hovered_hex)
			else:
				# Cmd+V: Validate map
				validate_map()
		elif cmd_pressed and event.keycode == KEY_C:
			_copy_selection_to_stamp()
		elif cmd_pressed and event.keycode == KEY_X:
			_cut_selection()

		# Number keys for terrain selection (without modifiers)
		elif not cmd_pressed and not event.shift_pressed:
			for terrain_name in TERRAIN_TYPES.keys():
				if event.keycode == TERRAIN_TYPES[terrain_name]["shortcut"]:
					current_terrain = terrain_name
					_log("Terrain: %s" % terrain_name)
					break

		# Bracket keys for brush size
		if event.keycode == KEY_BRACKETLEFT:
			brush_size = max(1, brush_size - 1)
			if debug_input_logs:
				_log("Brush size: %d" % brush_size)
		elif event.keycode == KEY_BRACKETRIGHT:
			brush_size = min(5, brush_size + 1)
			if debug_input_logs:
				_log("Brush size: %d" % brush_size)

		# E key for elevation adjustment on hovered hex
		if event.keycode == KEY_E and has_hover and map_data.has(hovered_hex):
			var change: int = 1 if not event.shift_pressed else -1
			_adjust_elevation(hovered_hex, change)

		# Stamp transforms
		if event.keycode == KEY_R and has_stamp:
			_rotate_stamp(not event.shift_pressed)
		if event.keycode == KEY_M and has_stamp:
			_mirror_stamp(not event.shift_pressed)

			# Delete/Backspace for erasing
			if event.keycode == KEY_DELETE or event.keycode == KEY_BACKSPACE:
				if current_tool == ToolMode.SELECT and not selection.is_empty():
					selection.clear()
					has_selection = false
					selected_hex = Vector2i.ZERO
					queue_redraw()
				elif has_hover:
					_delete_hex(hovered_hex)


func _handle_left_click(coord: Vector2i, event: InputEventMouseButton) -> void:
	match current_tool:
		ToolMode.PAINT:
			if event.ctrl_pressed and map_data.has(coord):
				# Ctrl+click: Cycle terrain
				_handle_right_click(coord)
			elif map_data.has(coord):
				# Normal click on existing hex: Paint with brush
				_paint_with_brush(coord)
			else:
				# Click on empty space: Add new hex with current terrain
				_add_hex(coord, current_terrain)

		ToolMode.FILL:
			if map_data.has(coord):
				_flood_fill(coord, current_terrain)

		ToolMode.ERASE:
			_erase_with_brush(coord)

		ToolMode.EDGE:
			if not is_drawing_edge:
				edge_start_hex = coord
				is_drawing_edge = true
			else:
				_add_edge(edge_start_hex, coord, current_edge_type)
				is_drawing_edge = false

		ToolMode.POI:
			if map_data.has(coord):
				selected_hex = coord
				has_selection = true
				hex_selected.emit(coord)
				queue_redraw()

		ToolMode.REGION:
			if bool(layer_locked.get(LAYER_REGIONS, false)):
				_log("Regions layer is locked")
				return
			if not map_data.has(coord):
				if event.shift_pressed:
					_add_hex(coord, current_terrain)
				else:
					return
			_paint_region_with_brush(coord, current_region_id)

		ToolMode.SELECT:
			if not map_data.has(coord):
				return
			_toggle_selection(coord, event.shift_pressed)


func _handle_right_click(coord: Vector2i) -> void:
	if current_tool == ToolMode.REGION and map_data.has(coord):
		current_region_id = _get_region_id(coord)
		_log("Region brush: %s" % _get_region_name(current_region_id))
		return

	if current_tool == ToolMode.EDGE:
		if bool(layer_locked.get(LAYER_EDGES, false)):
			_log("Edges layer is locked")
			return
		# Remove edge
		for neighbor in _get_neighbors(coord):
			var edge_key := _get_edge_key(coord, neighbor)
			if edge_data.has(edge_key):
				var owns_history := false
				if not _history_pending:
					owns_history = true
					_history_begin("Remove edge")
				_history_track_edge(edge_key)
				edge_data.erase(edge_key)
				if owns_history:
					_mark_changed("Remove edge")
				_log("Removed edge at %s" % edge_key)
				return
	elif map_data.has(coord):
		if bool(layer_locked.get(LAYER_TERRAIN, false)):
			_log("Terrain layer is locked")
			return
		# Right-click: Cycle through terrain types
		var current: String = map_data[coord].get("terrain", "plains")
		var idx: int = TERRAIN_ORDER.find(current)
		var next_idx: int = (idx + 1) % TERRAIN_ORDER.size()
		_set_terrain(coord, TERRAIN_ORDER[next_idx])


func _paint_with_brush(center: Vector2i) -> void:
	if bool(layer_locked.get(LAYER_TERRAIN, false)):
		_log("Terrain layer is locked")
		return

	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Paint terrain")

	var hexes: Array[Vector2i] = _get_hexes_in_radius(center, brush_size - 1)
	var painted_count := 0
	var limit_blocked := false
	var remaining: int = get_terrain_remaining(current_terrain)
	var limited: bool = remaining >= 0

	for coord in hexes:
		if map_data.has(coord):
			var old_terrain: String = map_data[coord].get("terrain", "plains")
			# Skip if already the target terrain
			if old_terrain == current_terrain:
				continue
			# Check if we can add more of this terrain type
			# (painting over a different terrain increases the target terrain count)
			if limited and remaining <= 0:
				limit_blocked = true
				continue
			var terrain_data: Dictionary = TERRAIN_TYPES.get(current_terrain, TERRAIN_TYPES["plains"])
			_history_track_hex(coord)
			map_data[coord]["terrain"] = current_terrain
			map_data[coord]["impedance"] = terrain_data["impedance"]
			painted_count += 1
			if limited:
				remaining -= 1

	if painted_count > 0:
		if owns_history:
			_mark_changed("Paint terrain")
	elif owns_history:
		_history_cancel()
	if limit_blocked:
		_log("Some hexes not painted - %s limit of %d reached" % [current_terrain, terrain_limits.get(current_terrain, 0)])


func _erase_with_brush(center: Vector2i) -> void:
	if bool(layer_locked.get(LAYER_TERRAIN, false)):
		_log("Terrain layer is locked")
		return

	var hexes: Array[Vector2i] = _get_hexes_in_radius(center, brush_size - 1)
	var to_delete: Array[Vector2i] = []
	for coord in hexes:
		if not map_data.has(coord):
			continue
		# Don't delete The Studio
		if map_data[coord].get("terrain", "") == "studio":
			continue
		to_delete.append(coord)

	if to_delete.is_empty():
		return

	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Erase hexes")

	for coord2 in to_delete:
		_history_track_hex(coord2)
		map_data.erase(coord2)
		# Keep selection state consistent
		if selection.has(coord2):
			selection.erase(coord2)
		if selected_hex == coord2:
			selected_hex = Vector2i.ZERO

	# Remove any edges connected to deleted hexes.
	var to_delete_set: Dictionary = {}
	for c in to_delete:
		to_delete_set[c] = true
	var edges_to_remove: Array[String] = []
	for edge_key in edge_data.keys():
		var ab: Array[Vector2i] = _edge_key_to_coords(edge_key)
		if ab.size() != 2:
			continue
		if to_delete_set.has(ab[0]) or to_delete_set.has(ab[1]):
			edges_to_remove.append(edge_key)
	for edge_key2 in edges_to_remove:
		_history_track_edge(edge_key2)
		edge_data.erase(edge_key2)

	if selection.is_empty():
		has_selection = false
		selected_hex = Vector2i.ZERO
	else:
		has_selection = true
		selected_hex = selection.keys()[0]
		hex_selected.emit(selected_hex)

	if owns_history:
		_mark_changed("Erase hexes")


func _paint_region_with_brush(center: Vector2i, region_id: int) -> void:
	if bool(layer_locked.get(LAYER_REGIONS, false)):
		_log("Regions layer is locked")
		return
	if not regions.has(region_id):
		region_id = DEFAULT_REGION_ID

	var changed: bool = false
	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Paint region")

	var hexes: Array[Vector2i] = _get_hexes_in_radius(center, brush_size - 1)
	for coord in hexes:
		if not map_data.has(coord):
			continue
		if int(map_data[coord].get("region_id", DEFAULT_REGION_ID)) == region_id:
			continue
		_history_track_hex(coord)
		map_data[coord]["region_id"] = region_id
		changed = true
	if changed:
		if owns_history:
			_mark_changed("Paint region")
	elif owns_history:
		_history_cancel()


func _flood_fill(start: Vector2i, new_terrain: String) -> void:
	if not map_data.has(start):
		return
	if bool(layer_locked.get(LAYER_TERRAIN, false)):
		_log("Terrain layer is locked")
		return

	var old_terrain: String = map_data[start].get("terrain", "plains")
	if old_terrain == new_terrain:
		return

	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Flood fill")

	var to_fill: Array[Vector2i] = [start]
	var filled: Dictionary = {}
	var limit_blocked := false
	var remaining: int = get_terrain_remaining(new_terrain)
	var limited: bool = remaining >= 0

	while not to_fill.is_empty():
		var coord: Vector2i = to_fill.pop_back()
		if filled.has(coord):
			continue
		if not map_data.has(coord):
			continue
		if map_data[coord].get("terrain", "") != old_terrain:
			continue

		# Check terrain limit before filling
		if limited and remaining <= 0:
			limit_blocked = true
			break

		filled[coord] = true
		var terrain_data: Dictionary = TERRAIN_TYPES.get(new_terrain, TERRAIN_TYPES["plains"])
		_history_track_hex(coord)
		map_data[coord]["terrain"] = new_terrain
		map_data[coord]["impedance"] = terrain_data["impedance"]
		if limited:
			remaining -= 1

		for neighbor in _get_neighbors(coord):
			if not filled.has(neighbor):
				to_fill.append(neighbor)

	if filled.size() > 0:
		if owns_history:
			_mark_changed("Flood fill")
		_log("Flood filled %d hexes with %s" % [filled.size(), new_terrain])
	elif owns_history:
		_history_cancel()
	if limit_blocked:
		_log("Flood fill stopped - %s limit of %d reached" % [new_terrain, terrain_limits.get(new_terrain, 0)])


func _add_hex(coord: Vector2i, terrain: String) -> void:
	if map_data.has(coord):
		return

	if bool(layer_locked.get(LAYER_TERRAIN, false)):
		_log("Terrain layer is locked")
		return

	# Check terrain limit
	if is_terrain_at_limit(terrain):
		_log("Cannot add %s hex - limit of %d reached" % [terrain, terrain_limits[terrain]])
		return

	var terrain_data: Dictionary = TERRAIN_TYPES.get(terrain, TERRAIN_TYPES["plains"])
	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Add hex")
	_history_track_hex(coord)
	map_data[coord] = {
		"terrain": terrain,
		"impedance": terrain_data["impedance"],
		"features": [],
		"elevation": 0,
		"name": "",
		"description": "",
		"region_id": DEFAULT_REGION_ID
	}
	if owns_history:
		_mark_changed("Add hex")


func _delete_hex(coord: Vector2i) -> void:
	if not map_data.has(coord):
		return

	# Don't delete The Studio
	if map_data[coord].get("terrain", "") == "studio":
		_log("Cannot delete The Studio!")
		return

	# Deleting affects terrain + all attached layers.
	if bool(layer_locked.get(LAYER_TERRAIN, false)):
		_log("Terrain layer is locked")
		return

	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Delete hex")

	_history_track_hex(coord)
	map_data.erase(coord)

	# Keep selection state consistent.
	if selection.has(coord):
		selection.erase(coord)
	if selected_hex == coord:
		if selection.is_empty():
			has_selection = false
			selected_hex = Vector2i.ZERO
		else:
			selected_hex = selection.keys()[0]
			has_selection = true
			hex_selected.emit(selected_hex)

	# Also remove any edges connected to this hex
	var edges_to_remove: Array[String] = []
	for edge_key in edge_data.keys():
		var ab: Array[Vector2i] = _edge_key_to_coords(edge_key)
		if ab.size() != 2:
			continue
			if ab[0] == coord or ab[1] == coord:
				edges_to_remove.append(edge_key)
	for edge_key in edges_to_remove:
		_history_track_edge(edge_key)
		edge_data.erase(edge_key)
	if owns_history:
		_mark_changed("Delete hex")
	_log("Deleted hex at (%d, %d)" % [coord.x, coord.y])


func _add_edge(hex1: Vector2i, hex2: Vector2i, edge_type: String) -> void:
	if bool(layer_locked.get(LAYER_EDGES, false)):
		_log("Edges layer is locked")
		return
	if not map_data.has(hex1) or not map_data.has(hex2):
		_log("Both endpoints must exist to add an edge")
		return
	# Only allow edges between adjacent hexes
	if hex2 not in _get_neighbors(hex1):
		_log("Can only add edges between adjacent hexes")
		return

	var edge_key := _get_edge_key(hex1, hex2)
	var existing: Dictionary = edge_data.get(edge_key, {})
	if edge_data.has(edge_key) and str(existing.get("type", "")) == edge_type:
		return

	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Add edge")
	_history_track_edge(edge_key)
	edge_data[edge_key] = { "type": edge_type }
	if owns_history:
		_mark_changed("Add edge")
	_log("Added %s edge" % edge_type)


func _set_terrain(coord: Vector2i, terrain: String) -> void:
	if not map_data.has(coord):
		return
	if bool(layer_locked.get(LAYER_TERRAIN, false)):
		_log("Terrain layer is locked")
		return

	var old_terrain: String = map_data[coord].get("terrain", "")
	if old_terrain == terrain:
		return
	if is_terrain_at_limit(terrain):
		_log("Cannot set %s - limit of %d reached" % [terrain, terrain_limits.get(terrain, 0)])
		return

	var terrain_data: Dictionary = TERRAIN_TYPES.get(terrain, TERRAIN_TYPES["plains"])
	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Set terrain")
	_history_track_hex(coord)
	map_data[coord]["terrain"] = terrain
	map_data[coord]["impedance"] = terrain_data["impedance"]
	if owns_history:
		_mark_changed("Set terrain")


func _adjust_elevation(coord: Vector2i, change: int) -> void:
	if not map_data.has(coord):
		return
	if bool(layer_locked.get(LAYER_ELEVATION, false)):
		_log("Elevation layer is locked")
		return

	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Adjust elevation")
	_history_track_hex(coord)

	var current_elevation: int = map_data[coord].get("elevation", 0)
	map_data[coord]["elevation"] = clampi(current_elevation + change, -5, 5)
	if owns_history:
		_mark_changed("Adjust elevation")
	_log("Elevation at (%d,%d): %d" % [coord.x, coord.y, map_data[coord]["elevation"]])


## Set POI data for selected hex
func set_poi_data(coord: Vector2i, poi_name: String, description: String) -> void:
	if not map_data.has(coord):
		return
	if bool(layer_locked.get(LAYER_POI, false)):
		_log("POI layer is locked")
		return
	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Update POI")
	_history_track_hex(coord)
	map_data[coord]["name"] = poi_name
	map_data[coord]["description"] = description

	if owns_history:
		_mark_changed("Update POI")
	_log("Updated POI: %s" % poi_name)

func _snapshot_state() -> Dictionary:
	return {
		"map_data": map_data.duplicate(true),
		"edge_data": edge_data.duplicate(true),
		"regions": regions.duplicate(true),
		"terrain_limits": terrain_limits.duplicate(true),
	}


func _restore_state(state: Dictionary) -> void:
	map_data = state.get("map_data", {})
	edge_data = state.get("edge_data", {})
	regions = state.get("regions", {
		DEFAULT_REGION_ID: { "name": "Unassigned", "color": Color(0.9, 0.9, 0.9, 0.35) }
	})
	terrain_limits = state.get("terrain_limits", {})
	_update_stats()
	queue_redraw()
	map_changed.emit()


func _history_begin(label: String) -> void:
	_history_pending = true
	_history_pending_label = label
	_history_hex_before.clear()
	_history_edge_before.clear()
	_history_region_before.clear()
	_history_limits_before.clear()


func _history_cancel() -> void:
	_history_pending = false
	_history_pending_label = ""
	_history_hex_before.clear()
	_history_edge_before.clear()
	_history_region_before.clear()
	_history_limits_before.clear()


func _history_track_hex(coord: Vector2i) -> void:
	if not _history_pending:
		return
	if _history_hex_before.has(coord):
		return
	if map_data.has(coord):
		_history_hex_before[coord] = (map_data[coord] as Dictionary).duplicate(true)
	else:
		_history_hex_before[coord] = null


func _history_track_edge(edge_key: String) -> void:
	if not _history_pending:
		return
	if _history_edge_before.has(edge_key):
		return
	if edge_data.has(edge_key):
		_history_edge_before[edge_key] = (edge_data[edge_key] as Dictionary).duplicate(true)
	else:
		_history_edge_before[edge_key] = null


func _history_track_region(region_id: int) -> void:
	if not _history_pending:
		return
	if _history_region_before.has(region_id):
		return
	if regions.has(region_id):
		_history_region_before[region_id] = (regions[region_id] as Dictionary).duplicate(true)
	else:
		_history_region_before[region_id] = null


func _history_track_limit(terrain: String) -> void:
	if not _history_pending:
		return
	if _history_limits_before.has(terrain):
		return
	if terrain_limits.has(terrain):
		_history_limits_before[terrain] = int(terrain_limits[terrain])
	else:
		_history_limits_before[terrain] = null


func _apply_diff(kind: String, diff: Dictionary) -> void:
	var before_key: String = "%s_before" % kind
	var after_key: String = "%s_after" % kind
	var table: Dictionary
	match kind:
		"hex":
			table = map_data
		"edge":
			table = edge_data
		"region":
			table = regions
		_:
			return

	var payload: Dictionary = diff.get(after_key, {}) if diff.has(after_key) else diff.get(before_key, {})
	for k in payload.keys():
		var v: Variant = payload[k]
		if v == null:
			table.erase(k)
		else:
			if v is Dictionary:
				table[k] = (v as Dictionary).duplicate(true)
			else:
				table[k] = v


func _build_state_at(index: int) -> Dictionary:
	var state: Dictionary = _history_base_state.duplicate(true)
	var base_map: Dictionary = state.get("map_data", {})
	var base_edge: Dictionary = state.get("edge_data", {})
	var base_regions: Dictionary = state.get("regions", {})
	var base_limits: Dictionary = state.get("terrain_limits", {})

	var steps: int = clampi(index, 0, _history_commands.size())
	for i in range(steps):
		var cmd: Dictionary = _history_commands[i]
		var hex_after: Dictionary = cmd.get("hex_after", {})
		var edge_after: Dictionary = cmd.get("edge_after", {})
		var region_after: Dictionary = cmd.get("region_after", {})
		var limits_after: Dictionary = cmd.get("limits_after", {})
		for k in hex_after.keys():
			var v: Variant = hex_after[k]
			if v == null:
				base_map.erase(k)
			else:
				base_map[k] = (v as Dictionary).duplicate(true) if v is Dictionary else v
		for k2 in edge_after.keys():
			var v2: Variant = edge_after[k2]
			if v2 == null:
				base_edge.erase(k2)
			else:
				base_edge[k2] = (v2 as Dictionary).duplicate(true) if v2 is Dictionary else v2
		for k3 in region_after.keys():
			var v3: Variant = region_after[k3]
			if v3 == null:
				base_regions.erase(k3)
			else:
				base_regions[k3] = (v3 as Dictionary).duplicate(true) if v3 is Dictionary else v3
		for k4 in limits_after.keys():
			var v4: Variant = limits_after[k4]
			if v4 == null:
				base_limits.erase(k4)
			else:
				base_limits[k4] = int(v4)

	state["map_data"] = base_map
	state["edge_data"] = base_edge
	state["regions"] = base_regions
	state["terrain_limits"] = base_limits
	return state


func _history_commit(label: String) -> void:
	if not _history_pending:
		# Fallback: derive a full diff against the recorded current history state.
		var before_state: Dictionary = _build_state_at(history_index)
		var before_map: Dictionary = before_state.get("map_data", {})
		var before_edge: Dictionary = before_state.get("edge_data", {})
		var before_regions: Dictionary = before_state.get("regions", {})
		var before_limits: Dictionary = before_state.get("terrain_limits", {})

		var hex_before: Dictionary = {}
		var edge_before: Dictionary = {}
		var region_before: Dictionary = {}
		var limits_before: Dictionary = {}

		var keys_hex: Dictionary = {}
		for k in before_map.keys():
			keys_hex[k] = true
		for k2 in map_data.keys():
			keys_hex[k2] = true
		for k3 in keys_hex.keys():
			var b: Variant = before_map.get(k3, null)
			var a: Variant = map_data.get(k3, null)
			if b == null and a == null:
				continue
			if b == null or a == null or b != a:
				hex_before[k3] = (b as Dictionary).duplicate(true) if b is Dictionary else b

		var keys_edge: Dictionary = {}
		for e in before_edge.keys():
			keys_edge[e] = true
		for e2 in edge_data.keys():
			keys_edge[e2] = true
		for e3 in keys_edge.keys():
			var b2: Variant = before_edge.get(e3, null)
			var a2: Variant = edge_data.get(e3, null)
			if b2 == null and a2 == null:
				continue
			if b2 == null or a2 == null or b2 != a2:
				edge_before[e3] = (b2 as Dictionary).duplicate(true) if b2 is Dictionary else b2

		var keys_region: Dictionary = {}
		for r in before_regions.keys():
			keys_region[r] = true
		for r2 in regions.keys():
			keys_region[r2] = true
		for r3 in keys_region.keys():
			var b3: Variant = before_regions.get(r3, null)
			var a3: Variant = regions.get(r3, null)
			if b3 == null and a3 == null:
				continue
			if b3 == null or a3 == null or b3 != a3:
				region_before[r3] = (b3 as Dictionary).duplicate(true) if b3 is Dictionary else b3

		var keys_limits: Dictionary = {}
		for t in before_limits.keys():
			keys_limits[t] = true
		for t2 in terrain_limits.keys():
			keys_limits[t2] = true
		for t3 in keys_limits.keys():
			var b4: Variant = before_limits.get(t3, null)
			var a4: Variant = terrain_limits.get(t3, null)
			if b4 == null and a4 == null:
				continue
			if b4 == null or a4 == null or int(b4) != int(a4):
				limits_before[str(t3)] = null if b4 == null else int(b4)

		if hex_before.is_empty() and edge_before.is_empty() and region_before.is_empty() and limits_before.is_empty():
			return

		_history_pending = true
		_history_pending_label = label
		_history_hex_before = hex_before
		_history_edge_before = edge_before
		_history_region_before = region_before
		_history_limits_before = limits_before

	_history_pending = false

	var hex_after: Dictionary = {}
	for coord in _history_hex_before.keys():
		if map_data.has(coord):
			hex_after[coord] = (map_data[coord] as Dictionary).duplicate(true)
		else:
			hex_after[coord] = null

	var edge_after: Dictionary = {}
	for ek in _history_edge_before.keys():
		if edge_data.has(ek):
			edge_after[ek] = (edge_data[ek] as Dictionary).duplicate(true)
		else:
			edge_after[ek] = null

	var region_after: Dictionary = {}
	for rid in _history_region_before.keys():
		if regions.has(rid):
			region_after[rid] = (regions[rid] as Dictionary).duplicate(true)
		else:
			region_after[rid] = null

	var limits_after: Dictionary = {}
	for tname in _history_limits_before.keys():
		if terrain_limits.has(tname):
			limits_after[tname] = int(terrain_limits[tname])
		else:
			limits_after[tname] = null

	if _history_hex_before.is_empty() and _history_edge_before.is_empty() and _history_region_before.is_empty() and _history_limits_before.is_empty():
		return

	# Drop redo tail if user had undone.
	if history_index < history_labels.size() - 1:
		_history_commands.resize(history_index)
		history_labels.resize(history_index + 1)

	var cmd: Dictionary = {
		"label": label,
		"hex_before": _history_hex_before.duplicate(true),
		"hex_after": hex_after,
		"edge_before": _history_edge_before.duplicate(true),
		"edge_after": edge_after,
		"region_before": _history_region_before.duplicate(true),
		"region_after": region_after,
		"limits_before": _history_limits_before.duplicate(true),
		"limits_after": limits_after,
	}

	_history_commands.append(cmd)
	history_labels.append(label)
	history_index = history_labels.size() - 1

	# Trim oldest, merging it into base snapshot so current state stays the same.
	if _history_commands.size() > MAX_HISTORY:
		var oldest: Dictionary = _history_commands.pop_front()
		var base_map: Dictionary = _history_base_state.get("map_data", {})
		var base_edge: Dictionary = _history_base_state.get("edge_data", {})
		var base_regions: Dictionary = _history_base_state.get("regions", {})
		var base_limits: Dictionary = _history_base_state.get("terrain_limits", {})
		for k in (oldest.get("hex_after", {}) as Dictionary).keys():
			var v: Variant = (oldest.get("hex_after", {}) as Dictionary)[k]
			if v == null:
				base_map.erase(k)
			else:
				base_map[k] = (v as Dictionary).duplicate(true) if v is Dictionary else v
		for k2 in (oldest.get("edge_after", {}) as Dictionary).keys():
			var v2: Variant = (oldest.get("edge_after", {}) as Dictionary)[k2]
			if v2 == null:
				base_edge.erase(k2)
			else:
				base_edge[k2] = (v2 as Dictionary).duplicate(true) if v2 is Dictionary else v2
		for k3 in (oldest.get("region_after", {}) as Dictionary).keys():
			var v3: Variant = (oldest.get("region_after", {}) as Dictionary)[k3]
			if v3 == null:
				base_regions.erase(k3)
			else:
				base_regions[k3] = (v3 as Dictionary).duplicate(true) if v3 is Dictionary else v3
		for k4 in (oldest.get("limits_after", {}) as Dictionary).keys():
			var v4: Variant = (oldest.get("limits_after", {}) as Dictionary)[k4]
			if v4 == null:
				base_limits.erase(k4)
			else:
				base_limits[k4] = int(v4)
		_history_base_state["map_data"] = base_map
		_history_base_state["edge_data"] = base_edge
		_history_base_state["regions"] = base_regions
		_history_base_state["terrain_limits"] = base_limits
		if history_labels.size() > 1:
			history_labels.remove_at(1)
		history_index = max(0, history_index - 1)


func _reset_history(label: String) -> void:
	_history_base_state = _snapshot_state()
	_history_commands.clear()
	history_labels = [label]
	history_index = 0


func get_history_labels() -> Array[String]:
	return history_labels


func get_history_index() -> int:
	return history_index


func jump_to_history(index: int) -> void:
	if index < 0 or index >= history_labels.size():
		return
	if index == history_index:
		return
	_restore_state(_history_base_state)
	for i in range(index):
		var cmd: Dictionary = _history_commands[i]
		var hex_after: Dictionary = cmd.get("hex_after", {})
		var edge_after: Dictionary = cmd.get("edge_after", {})
		var region_after: Dictionary = cmd.get("region_after", {})
		var limits_after: Dictionary = cmd.get("limits_after", {})
		for k in hex_after.keys():
			var v: Variant = hex_after[k]
			if v == null:
				map_data.erase(k)
			else:
				map_data[k] = (v as Dictionary).duplicate(true) if v is Dictionary else v
		for k2 in edge_after.keys():
			var v2: Variant = edge_after[k2]
			if v2 == null:
				edge_data.erase(k2)
			else:
				edge_data[k2] = (v2 as Dictionary).duplicate(true) if v2 is Dictionary else v2
		for k3 in region_after.keys():
			var v3: Variant = region_after[k3]
			if v3 == null:
				regions.erase(k3)
			else:
				regions[k3] = (v3 as Dictionary).duplicate(true) if v3 is Dictionary else v3
		for k4 in limits_after.keys():
			var v4: Variant = limits_after[k4]
			if v4 == null:
				terrain_limits.erase(k4)
			else:
				terrain_limits[k4] = int(v4)
	history_index = index
	_update_stats()
	queue_redraw()
	map_changed.emit()
	has_unsaved_changes = true


func undo() -> void:
	if history_index <= 0:
		_log("Nothing to undo")
		return
	var cmd: Dictionary = _history_commands[history_index - 1]
	var hex_before: Dictionary = cmd.get("hex_before", {})
	var edge_before: Dictionary = cmd.get("edge_before", {})
	var region_before: Dictionary = cmd.get("region_before", {})
	var limits_before: Dictionary = cmd.get("limits_before", {})
	for k in hex_before.keys():
		var v: Variant = hex_before[k]
		if v == null:
			map_data.erase(k)
		else:
			map_data[k] = (v as Dictionary).duplicate(true) if v is Dictionary else v
	for k2 in edge_before.keys():
		var v2: Variant = edge_before[k2]
		if v2 == null:
			edge_data.erase(k2)
		else:
			edge_data[k2] = (v2 as Dictionary).duplicate(true) if v2 is Dictionary else v2
	for k3 in region_before.keys():
		var v3: Variant = region_before[k3]
		if v3 == null:
			regions.erase(k3)
		else:
			regions[k3] = (v3 as Dictionary).duplicate(true) if v3 is Dictionary else v3
	for k4 in limits_before.keys():
		var v4: Variant = limits_before[k4]
		if v4 == null:
			terrain_limits.erase(k4)
		else:
			terrain_limits[k4] = int(v4)
	history_index -= 1
	_update_stats()
	queue_redraw()
	map_changed.emit()
	has_unsaved_changes = true
	_log("Undo: %s" % history_labels[history_index])


func redo() -> void:
	if history_index >= _history_commands.size():
		_log("Nothing to redo")
		return
	var cmd: Dictionary = _history_commands[history_index]
	var hex_after: Dictionary = cmd.get("hex_after", {})
	var edge_after: Dictionary = cmd.get("edge_after", {})
	var region_after: Dictionary = cmd.get("region_after", {})
	var limits_after: Dictionary = cmd.get("limits_after", {})
	for k in hex_after.keys():
		var v: Variant = hex_after[k]
		if v == null:
			map_data.erase(k)
		else:
			map_data[k] = (v as Dictionary).duplicate(true) if v is Dictionary else v
	for k2 in edge_after.keys():
		var v2: Variant = edge_after[k2]
		if v2 == null:
			edge_data.erase(k2)
		else:
			edge_data[k2] = (v2 as Dictionary).duplicate(true) if v2 is Dictionary else v2
	for k3 in region_after.keys():
		var v3: Variant = region_after[k3]
		if v3 == null:
			regions.erase(k3)
		else:
			regions[k3] = (v3 as Dictionary).duplicate(true) if v3 is Dictionary else v3
	for k4 in limits_after.keys():
		var v4: Variant = limits_after[k4]
		if v4 == null:
			terrain_limits.erase(k4)
		else:
			terrain_limits[k4] = int(v4)
	history_index += 1
	_update_stats()
	queue_redraw()
	map_changed.emit()
	has_unsaved_changes = true
	_log("Redo: %s" % history_labels[history_index])


## Save map to JSON file
func save_map(path: String, mark_saved: bool = true) -> Error:
	var save_data: Array = []

	var coords: Array = map_data.keys()
	coords.sort_custom(func(a, b) -> bool:
		if a.y == b.y:
			return a.x < b.x
		return a.y < b.y
	)

	for coord in coords:
		var hex_data: Dictionary = map_data[coord]
		var terrain: String = hex_data.get("terrain", "plains")
		var terrain_data: Dictionary = TERRAIN_TYPES.get(terrain, TERRAIN_TYPES["plains"])
		var impedance_val: float = float(hex_data.get("impedance", terrain_data["impedance"]))

		var hex_save := {
			"q": coord.x,
			"r": coord.y,
			"terrain": terrain,
			"impedance": null if impedance_val == INF else impedance_val,
			"features": hex_data.get("features", []),
			"elevation": hex_data.get("elevation", 0),
		}
		# Preserve optional per-hex datalayer payload (e.g. OSM import metadata)
		var dl_v: Variant = hex_data.get("datalayer", null)
		if dl_v is Dictionary and not (dl_v as Dictionary).is_empty():
			hex_save["datalayer"] = dl_v
		# Only save name/description if set
		if hex_data.get("name", "") != "":
			hex_save["name"] = hex_data["name"]
		if hex_data.get("description", "") != "":
			hex_save["description"] = hex_data["description"]
		var region_id := int(hex_data.get("region_id", DEFAULT_REGION_ID))
		if region_id != DEFAULT_REGION_ID:
			hex_save["region_id"] = region_id
		save_data.append(hex_save)

	# Save edges
	var edges_array: Array = []
	var edge_keys: Array = edge_data.keys()
	edge_keys.sort()
	for edge_key in edge_keys:
		edges_array.append({
			"key": edge_key,
			"type": edge_data[edge_key].get("type", "river")
		})

	var region_ids: Array = regions.keys()
	region_ids.sort()
	var regions_array: Array = []
	for region_id in region_ids:
		var reg: Dictionary = regions[region_id]
		regions_array.append({
			"id": int(region_id),
			"name": reg.get("name", ""),
			"color": _color_to_array(_get_region_color(int(region_id))),
		})

	var now_unix: int = int(Time.get_unix_time_from_system())
	var now_iso: String = Time.get_datetime_string_from_system()

	var meta_out: Dictionary = map_meta.duplicate(true)
	meta_out["kind"] = "save" if mark_saved else "autosave"
	meta_out["unix"] = now_unix
	meta_out["iso"] = now_iso

	var full_save := {
		"version": 4,
		"meta": meta_out,
		"regions": regions_array,
		"hexes": save_data,
		"edges": edges_array,
		"terrain_limits": terrain_limits.duplicate(),
	}

	var json_string := JSON.stringify(full_save, "\t")
	var file: FileAccess = FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		_log("ERROR: Failed to save to %s" % path)
		return FileAccess.get_open_error()

	file.store_string(json_string)
	file.close()

	map_meta = meta_out.duplicate(true)

	if mark_saved:
		has_unsaved_changes = false
		last_save_time = now_iso
		_log("Saved %d hexes to %s" % [map_data.size(), path])
	else:
		_log("Autosaved %d hexes to %s" % [map_data.size(), path])
	return OK


## Load map from JSON file
func load_map(path: String) -> Error:
	var file: FileAccess = FileAccess.open(path, FileAccess.READ)
	if file == null:
		_log("Failed to load: %s" % path)
		return FileAccess.get_open_error()

	var json_string := file.get_as_text()
	file.close()

	var parsed: Variant = JSON.parse_string(json_string)
	if parsed == null:
		_log("ERROR: Failed to parse JSON")
		return ERR_PARSE_ERROR

	map_data.clear()
	edge_data.clear()
	terrain_limits.clear()
	regions = {
		DEFAULT_REGION_ID: { "name": "Unassigned", "color": Color(0.9, 0.9, 0.9, 0.35) }
	}
	map_meta = {}
	basemap_texture = null
	basemap_radius_m = 0.0
	import_hex_size_m = 0.0
	basemap_tiles.clear()
	basemap_tile_meta.clear()
	basemap_is_tiled = false

	# Handle both old format (array) and new format (object with hexes/edges)
	var hexes_array: Array
	var load_kind: String = "save"
	var meta_iso: String = ""
	if parsed is Array:
		hexes_array = parsed
	else:
		var parsed_dict: Dictionary = parsed as Dictionary
		hexes_array = parsed_dict.get("hexes", [])
		var meta: Dictionary = parsed_dict.get("meta", {})
		load_kind = str(meta.get("kind", "save"))
		meta_iso = str(meta.get("iso", ""))
		map_meta = meta.duplicate(true)
		_load_basemap_from_meta(map_meta)
		# Load regions
		var regions_array: Array = parsed_dict.get("regions", [])
		for region in regions_array:
			var region_id: int = int(region.get("id", DEFAULT_REGION_ID))
			if region_id == DEFAULT_REGION_ID:
				continue
			var region_color: Color = _array_to_color(region.get("color", []))
			regions[region_id] = {
				"name": region.get("name", ""),
				"color": region_color
			}
		# Load edges
		var edges_array: Array = parsed_dict.get("edges", [])
		for edge in edges_array:
			edge_data[edge["key"]] = { "type": edge.get("type", "river") }
		# Load terrain limits (version 4+)
		var limits_dict: Dictionary = parsed_dict.get("terrain_limits", {})
		for terrain_key in limits_dict.keys():
			var limit_val: int = int(limits_dict[terrain_key])
			if limit_val > 0:
				terrain_limits[str(terrain_key)] = limit_val

	for hex in hexes_array:
		var coord := Vector2i(int(hex["q"]), int(hex["r"]))
		var terrain: String = hex.get("terrain", "plains")
		var terrain_data: Dictionary = TERRAIN_TYPES.get(terrain, TERRAIN_TYPES["plains"])
		var impedance: float = float(terrain_data.get("impedance", 1.0))
		if hex.has("impedance") and hex["impedance"] != null:
			impedance = float(hex["impedance"])
		var rid: int = int(hex.get("region_id", DEFAULT_REGION_ID))
		if not regions.has(rid):
			rid = DEFAULT_REGION_ID
		var datalayer_v: Variant = hex.get("datalayer", {})
		var datalayer: Dictionary = datalayer_v as Dictionary if datalayer_v is Dictionary else {}
		map_data[coord] = {
			"terrain": terrain,
			"impedance": impedance,
			"features": hex.get("features", []),
			"elevation": int(hex.get("elevation", 0)),
			"name": hex.get("name", ""),
			"description": hex.get("description", ""),
			"region_id": rid,
			"datalayer": datalayer,
		}

	has_unsaved_changes = (load_kind == "autosave")
	last_save_time = meta_iso if meta_iso != "" else Time.get_datetime_string_from_system()
	_update_stats()
	_reset_history("Load map")
	queue_redraw()
	map_changed.emit()
	_log("Loaded %d hexes from %s" % [map_data.size(), path])
	return OK


func _load_basemap_from_meta(meta: Dictionary) -> void:
	# Reset all basemap state
	basemap_texture = null
	basemap_radius_m = 0.0
	import_hex_size_m = 0.0
	basemap_tiles.clear()
	basemap_tile_meta.clear()
	basemap_is_tiled = false

	if meta.is_empty():
		return

	# Load hex size (needed for both formats)
	var hex_meta_v: Variant = meta.get("hex", null)
	if hex_meta_v is Dictionary:
		var hex_meta: Dictionary = hex_meta_v as Dictionary
		if hex_meta.has("size_m"):
			import_hex_size_m = float(hex_meta.get("size_m", 0.0))
		elif hex_meta.has("across_flats_m"):
			import_hex_size_m = float(hex_meta.get("across_flats_m", 0.0)) / sqrt(3.0)

	var basemap_v: Variant = meta.get("basemap", null)
	if not (basemap_v is Dictionary):
		return
	var bm: Dictionary = basemap_v as Dictionary

	# Check if this is a tiled basemap or legacy single-image
	var basemap_type: String = str(bm.get("type", ""))
	if basemap_type == "tiles":
		# Tile-based basemap
		basemap_is_tiled = true
		basemap_tile_meta = bm.duplicate(true)
		basemap_radius_m = float(bm.get("radius_m", 0.0))
		var grid: Dictionary = bm.get("grid", {})
		_log("Loaded tiled basemap: %s (%dx%d tiles)" % [
			bm.get("tiles_dir", ""),
			grid.get("cols", 0),
			grid.get("rows", 0)
		])
	else:
		# Legacy single-image basemap
		var p: String = str(bm.get("path", ""))
		basemap_radius_m = float(bm.get("radius_m", 0.0))
		if p == "" or basemap_radius_m <= 0.0:
			return
		var tex: Texture2D = load(p) as Texture2D
		if tex != null:
			basemap_texture = tex
			_log("Loaded basemap: %s (%dx%d)" % [p, tex.get_width(), tex.get_height()])


## Autosave with versioning
func _autosave() -> void:
	var autosave_dir := "user://maps/autosave"
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(autosave_dir))

	# Rotate autosaves: delete oldest, then shift N-1 -> N, ..., 1 -> 2.
	var oldest := "%s/world_autosave_%03d.json" % [autosave_dir, MAX_AUTOSAVE_VERSIONS]
	if FileAccess.file_exists(oldest):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(oldest))

	for i in range(MAX_AUTOSAVE_VERSIONS - 1, 0, -1):
		var src := "%s/world_autosave_%03d.json" % [autosave_dir, i]
		var dst := "%s/world_autosave_%03d.json" % [autosave_dir, i + 1]
		if FileAccess.file_exists(src):
			DirAccess.rename_absolute(ProjectSettings.globalize_path(src), ProjectSettings.globalize_path(dst))

	# Save current as autosave_001 without clearing the "unsaved" flag.
	var autosave_path := "%s/world_autosave_%03d.json" % [autosave_dir, 1]
	save_map(autosave_path, false)


## Expand map by adding hexes around existing edges
func expand_map(radius: int = 1) -> void:
	if bool(layer_locked.get(LAYER_TERRAIN, false)):
		_log("Terrain layer is locked")
		return

	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Expand map")

	var rings := int(clamp(radius, 1, 50))
	var added_total := 0
	var remaining: int = get_terrain_remaining("plains")
	var limited: bool = remaining >= 0
	var limit_blocked := false

	for _i in range(rings):
		var new_hexes: Array[Vector2i] = []

		# Find all hexes adjacent to existing map that aren't in the map
		for coord in map_data.keys():
			for neighbor in _get_neighbors(coord):
				if not map_data.has(neighbor) and neighbor not in new_hexes:
					new_hexes.append(neighbor)

		# Add them as plains
		var added_in_ring := 0
		for coord in new_hexes:
			if limited and remaining <= 0:
				limit_blocked = true
				break
			_history_track_hex(coord)
			map_data[coord] = {
				"terrain": "plains",
				"impedance": 1.0,
				"features": [],
				"elevation": 0,
				"name": "",
				"description": "",
				"region_id": DEFAULT_REGION_ID
			}
			added_in_ring += 1
			if limited:
				remaining -= 1

		added_total += added_in_ring
		if limit_blocked:
			break

	if added_total > 0:
		if owns_history:
			_mark_changed("Expand map")
		_log("Expanded map by %d hexes" % added_total)
	elif owns_history:
		_history_cancel()
	if limit_blocked:
		_log("Expand stopped - plains limit of %d reached" % terrain_limits.get("plains", 0))


## Validate map for issues
func validate_map() -> Array[String]:
	var issues: Array[String] = []

	# Check for studio
	var has_studio := false
	for coord in map_data.keys():
		if map_data[coord].get("terrain", "") == "studio":
			has_studio = true
			break
	if not has_studio:
		issues.append("WARNING: No Studio hex found!")

	# Check for orphan hexes (not connected to main landmass)
	if not map_data.is_empty():
		var start_coord: Vector2i = map_data.keys()[0]
		for coord in map_data.keys():
			if map_data[coord].get("terrain", "") == "studio":
				start_coord = coord
				break
		var connected: Dictionary = {}
		var to_check: Array[Vector2i] = [start_coord]

		while not to_check.is_empty():
			var coord: Vector2i = to_check.pop_back()
			if connected.has(coord):
				continue
			if not map_data.has(coord):
				continue
			connected[coord] = true
			for neighbor in _get_neighbors(coord):
				if map_data.has(neighbor) and not connected.has(neighbor):
					to_check.append(neighbor)

		var orphan_count: int = map_data.size() - connected.size()
		if orphan_count > 0:
			issues.append("WARNING: %d orphan hexes (disconnected from main map)" % orphan_count)
			var shown := 0
			for coord in map_data.keys():
				if connected.has(coord):
					continue
				issues.append("ORPHAN|%d,%d" % [coord.x, coord.y])
				shown += 1
				if shown >= 25:
					break

	# Check for edges pointing to non-existent hexes
	for edge_key in edge_data.keys():
		var ab: Array[Vector2i] = _edge_key_to_coords(edge_key)
		if ab.size() != 2:
			issues.append("WARNING: Invalid edge key: %s" % edge_key)
			continue
		var hex1: Vector2i = ab[0]
		var hex2: Vector2i = ab[1]
		if not map_data.has(hex1) or not map_data.has(hex2):
			issues.append("WARNING: Edge %s connects to missing hex" % edge_key)
			issues.append("EDGE_MISSING|%s" % edge_key)

	if issues.is_empty():
		issues.append("Map validation passed!")

	for issue in issues:
		_log(issue)

	validation_result.emit(issues)
	return issues


## Update terrain statistics
func _update_stats() -> void:
	terrain_counts.clear()
	if map_data.is_empty():
		map_bounds = Rect2i()
		return

	var keys: Array = map_data.keys()
	var first: Vector2i = keys[0]
	var min_q: int = first.x
	var max_q: int = first.x
	var min_r: int = first.y
	var max_r: int = first.y

	for coord in map_data.keys():
		var terrain: String = map_data[coord].get("terrain", "plains")
		terrain_counts[terrain] = terrain_counts.get(terrain, 0) + 1
		min_q = min(min_q, coord.x)
		max_q = max(max_q, coord.x)
		min_r = min(min_r, coord.y)
		max_r = max(max_r, coord.y)

	map_bounds = Rect2i(min_q, min_r, max_q - min_q + 1, max_r - min_r + 1)


## Log a message
func _log(message: String) -> void:
	print("[HexEditor] ", message)
	log_message.emit(message)


func _mark_changed(label: String) -> void:
	has_unsaved_changes = true
	_update_stats()
	_history_commit(label)
	queue_redraw()
	map_changed.emit()


## Get hex data at coordinate
func get_hex(coord: Vector2i) -> Dictionary:
	return map_data.get(coord, {})

func set_hex_terrain(coord: Vector2i, terrain: String) -> void:
	_set_terrain(coord, terrain)


func set_hex_elevation(coord: Vector2i, elevation: int) -> void:
	if not map_data.has(coord):
		return
	if bool(layer_locked.get(LAYER_ELEVATION, false)):
		_log("Elevation layer is locked")
		return
	var new_e: int = clampi(int(elevation), -5, 5)
	if int(map_data[coord].get("elevation", 0)) == new_e:
		return
	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Set elevation")
	_history_track_hex(coord)
	map_data[coord]["elevation"] = new_e
	if owns_history:
		_mark_changed("Set elevation")


func set_hex_region(coord: Vector2i, region_id: int) -> void:
	_set_region_id(coord, region_id)

func apply_hex_inspector(coord: Vector2i, terrain: String, elevation: int, region_id: int, name: String, description: String) -> void:
	if not map_data.has(coord):
		return

	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Edit hex")
	_history_track_hex(coord)

	var changed := false
	var hex_data: Dictionary = map_data[coord]

	if not bool(layer_locked.get(LAYER_TERRAIN, false)):
		var old_t: String = hex_data.get("terrain", "plains")
		if old_t != terrain:
			var terrain_data: Dictionary = TERRAIN_TYPES.get(terrain, TERRAIN_TYPES["plains"])
			hex_data["terrain"] = terrain
			hex_data["impedance"] = terrain_data["impedance"]
			changed = true

	if not bool(layer_locked.get(LAYER_ELEVATION, false)):
		var new_e: int = clampi(int(elevation), -5, 5)
		if int(hex_data.get("elevation", 0)) != new_e:
			hex_data["elevation"] = new_e
			changed = true

	if not bool(layer_locked.get(LAYER_REGIONS, false)):
		var new_r := region_id if regions.has(region_id) else DEFAULT_REGION_ID
		if int(hex_data.get("region_id", DEFAULT_REGION_ID)) != new_r:
			hex_data["region_id"] = new_r
			changed = true

	if not bool(layer_locked.get(LAYER_POI, false)):
		if str(hex_data.get("name", "")) != name or str(hex_data.get("description", "")) != description:
			hex_data["name"] = name
			hex_data["description"] = description
			changed = true

	map_data[coord] = hex_data

	if changed:
		if owns_history:
			_mark_changed("Edit hex")
	elif owns_history:
		_history_cancel()


func get_selected_coords() -> Array[Vector2i]:
	var coords: Array[Vector2i] = []
	for coord in selection.keys():
		coords.append(coord)
	coords.sort_custom(func(a: Vector2i, b: Vector2i) -> bool:
		if a.y == b.y:
			return a.x < b.x
		return a.y < b.y
	)
	if has_selection and selection.has(selected_hex):
		var idx := coords.find(selected_hex)
		if idx > 0:
			coords.remove_at(idx)
			coords.insert(0, selected_hex)
	return coords


func edge_key_to_coords(edge_key: String) -> Array[Vector2i]:
	return _edge_key_to_coords(edge_key)


## Check if coordinate exists in map
func has_hex(coord: Vector2i) -> bool:
	return map_data.has(coord)


## Get total hex count
func get_hex_count() -> int:
	return map_data.size()


## Get terrain counts for stats
func get_terrain_counts() -> Dictionary:
	return terrain_counts


## Set a terrain limit (0 or missing means unlimited)
func set_terrain_limit(terrain: String, max_count: int) -> void:
	var key: String = terrain
	var prev: Variant = terrain_limits.get(key, null)
	var next: Variant = null if max_count <= 0 else int(max_count)
	if prev == null and next == null:
		return
	if prev != null and next != null and int(prev) == int(next):
		return

	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Set terrain limit")
	_history_track_limit(key)

	if max_count <= 0:
		terrain_limits.erase(key)
	else:
		terrain_limits[key] = int(max_count)

	if owns_history:
		_mark_changed("Set terrain limit")


## Get terrain limit (0 means unlimited)
func get_terrain_limit(terrain: String) -> int:
	return terrain_limits.get(terrain, 0)


## Check if terrain has a limit set
func has_terrain_limit(terrain: String) -> bool:
	return terrain_limits.has(terrain) and terrain_limits[terrain] > 0


## Check if terrain is at or over its limit
func is_terrain_at_limit(terrain: String) -> bool:
	if not has_terrain_limit(terrain):
		return false
	var current_count: int = terrain_counts.get(terrain, 0)
	return current_count >= terrain_limits[terrain]


## Get remaining count for a terrain (returns -1 if unlimited)
func get_terrain_remaining(terrain: String) -> int:
	if not has_terrain_limit(terrain):
		return -1
	var current_count: int = terrain_counts.get(terrain, 0)
	return max(0, terrain_limits[terrain] - current_count)


## Get all terrain limits as dictionary
func get_terrain_limits() -> Dictionary:
	return terrain_limits.duplicate()


## Get map bounds
func get_map_bounds() -> Rect2i:
	return map_bounds


func is_layer_visible(layer: String) -> bool:
	return bool(layer_visible.get(layer, true))


func set_layer_visible(layer: String, visible: bool) -> void:
	layer_visible[layer] = visible
	match layer:
		LAYER_ELEVATION:
			show_elevation = visible
		LAYER_EDGES:
			show_edges = visible
		LAYER_POI:
			show_poi = visible
		LAYER_REGIONS:
			show_regions = visible
		_:
			queue_redraw()


func is_layer_locked(layer: String) -> bool:
	return bool(layer_locked.get(layer, false))


func set_layer_locked(layer: String, locked: bool) -> void:
	layer_locked[layer] = locked


func get_regions_list() -> Array[Dictionary]:
	var ids: Array = regions.keys()
	ids.sort()
	var out: Array[Dictionary] = []
	for id in ids:
		var rid: int = int(id)
		out.append({
			"id": rid,
			"name": _get_region_name(rid),
			"color": _get_region_color(rid),
		})
	return out


func add_region(name: String, color: Color) -> int:
	if bool(layer_locked.get(LAYER_REGIONS, false)):
		_log("Regions layer is locked")
		return DEFAULT_REGION_ID
	var ids: Array = regions.keys()
	var max_id := DEFAULT_REGION_ID
	for id in ids:
		max_id = max(max_id, int(id))
	var new_id := max_id + 1
	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Add region")
	_history_track_region(new_id)
	regions[new_id] = { "name": name, "color": color }
	if owns_history:
		_mark_changed("Add region")
	return new_id


func delete_region(region_id: int) -> void:
	if region_id == DEFAULT_REGION_ID:
		return
	if not regions.has(region_id):
		return
	if bool(layer_locked.get(LAYER_REGIONS, false)):
		_log("Regions layer is locked")
		return
	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Delete region")
	_history_track_region(region_id)
	regions.erase(region_id)
	for coord in map_data.keys():
		if _get_region_id(coord) == region_id:
			_history_track_hex(coord)
			map_data[coord]["region_id"] = DEFAULT_REGION_ID
	if owns_history:
		_mark_changed("Delete region")


func set_region_name(region_id: int, name: String) -> void:
	if not regions.has(region_id):
		return
	if bool(layer_locked.get(LAYER_REGIONS, false)):
		_log("Regions layer is locked")
		return
	if str(regions[region_id].get("name", "")) == name:
		return
	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Edit region")
	_history_track_region(region_id)
	regions[region_id]["name"] = name
	if owns_history:
		_mark_changed("Edit region")


func set_region_color(region_id: int, color: Color) -> void:
	if not regions.has(region_id):
		return
	if bool(layer_locked.get(LAYER_REGIONS, false)):
		_log("Regions layer is locked")
		return
	var existing: Variant = regions[region_id].get("color", null)
	if existing is Color and (existing as Color) == color:
		return
	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Edit region")
	_history_track_region(region_id)
	regions[region_id]["color"] = color
	if owns_history:
		_mark_changed("Edit region")


func set_current_region(region_id: int) -> void:
	if regions.has(region_id):
		current_region_id = region_id


## Public cube<->pixel helpers (used by minimap/UI)
func cube_to_pixel(cube: Vector2i) -> Vector2:
	return _cube_to_pixel(cube)


func pixel_to_cube(pixel: Vector2) -> Vector2i:
	return _pixel_to_cube(pixel)


## Center the view so a given hex appears at the viewport center.
func center_view_on_hex(coord: Vector2i) -> void:
	var viewport_center := get_viewport_rect().size * 0.5
	camera_offset = viewport_center - global_position - _cube_to_pixel(coord)
	queue_redraw()


func smooth_elevation() -> void:
	if bool(layer_locked.get(LAYER_ELEVATION, false)):
		_log("Elevation layer is locked")
		return
	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Smooth elevation")
	var targets: Array[Vector2i] = get_selected_coords()
	var use_all := targets.is_empty()

	var new_values: Dictionary = {}
	for coord in map_data.keys():
		if not use_all and coord not in targets:
			continue
		var sum := int(map_data[coord].get("elevation", 0))
		var count := 1
		for n in _get_neighbors(coord):
			if map_data.has(n):
				sum += int(map_data[n].get("elevation", 0))
				count += 1
		new_values[coord] = clamp(int(round(float(sum) / float(count))), -5, 5)

	var changed_count := 0
	for coord2 in new_values.keys():
		var new_e: int = int(new_values[coord2])
		if int(map_data[coord2].get("elevation", 0)) == new_e:
			continue
		_history_track_hex(coord2)
		map_data[coord2]["elevation"] = new_e
		changed_count += 1

	if changed_count > 0:
		if owns_history:
			_mark_changed("Smooth elevation")
	elif owns_history:
		_history_cancel()


func create_ridge_from_selection() -> void:
	if bool(layer_locked.get(LAYER_TERRAIN, false)) and bool(layer_locked.get(LAYER_ELEVATION, false)):
		_log("Terrain/elevation layers are locked")
		return
	var coords: Array[Vector2i] = get_selected_coords()
	if coords.size() < 2:
		_log("Select 2 hexes for ridge")
		return
	var a := coords[0]
	var b := coords[1]
	var line := HexMath.cube_line(a, b)
	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Create ridge")
	var changed := false
	for coord in line:
		if not map_data.has(coord):
			continue
		var needs_change := false
		if not bool(layer_locked.get(LAYER_TERRAIN, false)) and str(map_data[coord].get("terrain", "")) != "mountain":
			needs_change = true
		if not bool(layer_locked.get(LAYER_ELEVATION, false)) and int(map_data[coord].get("elevation", 0)) != 4:
			needs_change = true
		if not needs_change:
			continue
		_history_track_hex(coord)
		if not bool(layer_locked.get(LAYER_TERRAIN, false)):
			map_data[coord]["terrain"] = "mountain"
			map_data[coord]["impedance"] = TERRAIN_TYPES["mountain"]["impedance"]
		if not bool(layer_locked.get(LAYER_ELEVATION, false)):
			map_data[coord]["elevation"] = 4
		changed = true
	if changed:
		if owns_history:
			_mark_changed("Create ridge")
	elif owns_history:
		_history_cancel()


func create_river_from_selection() -> void:
	if bool(layer_locked.get(LAYER_EDGES, false)):
		_log("Edges layer is locked")
		return
	var coords: Array[Vector2i] = get_selected_coords()
	if coords.size() < 2:
		_log("Select 2 hexes for river")
		return
	var start := coords[0]
	var goal := coords[1]
	if not map_data.has(start) or not map_data.has(goal):
		_log("Both endpoints must exist")
		return

	# Dijkstra on existing hex graph with downhill preference.
	var dist: Dictionary = {}
	var prev: Dictionary = {}
	var open: Array[Vector2i] = [start]
	dist[start] = 0.0

	while not open.is_empty():
		# pick lowest dist (small maps; OK)
		var best_i := 0
		var best_d := float(dist.get(open[0], INF))
		for i in range(1, open.size()):
			var d := float(dist.get(open[i], INF))
			if d < best_d:
				best_d = d
				best_i = i
		var current: Vector2i = open.pop_at(best_i)

		if current == goal:
			break

		var cur_e := int(map_data[current].get("elevation", 0))
		for n in _get_neighbors(current):
			if not map_data.has(n):
				continue
			var n_hex: Dictionary = map_data[n]
			var n_terrain: String = n_hex.get("terrain", "plains")
			var n_td: Dictionary = TERRAIN_TYPES.get(n_terrain, TERRAIN_TYPES["plains"])
			if bool(n_td.get("blocker", false)):
				continue
			var n_e: int = int(map_data[n].get("elevation", 0))
			var uphill: int = maxi(0, n_e - cur_e)
			var terrain_imp: float = float(map_data[n].get("impedance", 1.0))
			if terrain_imp == INF:
				continue
			var step_cost: float = 1.0 + float(uphill) * 5.0 + minf(5.0, terrain_imp)
			var nd: float = best_d + step_cost
			if nd < float(dist.get(n, INF)):
				dist[n] = nd
				prev[n] = current
				if n not in open:
					open.append(n)

	if not prev.has(goal) and start != goal:
		_log("No path for river")
		return

	var path: Array[Vector2i] = [goal]
	var cur := goal
	while cur != start:
		cur = prev[cur]
		path.append(cur)
	path.reverse()

	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Create river")
	var changed := false
	for i in range(path.size() - 1):
		var a := path[i]
		var b := path[i + 1]
		var key := _get_edge_key(a, b)
		var existing: Dictionary = edge_data.get(key, {})
		if edge_data.has(key) and str(existing.get("type", "")) == "river":
			continue
		_history_track_edge(key)
		edge_data[key] = { "type": "river" }
		changed = true

	if changed:
		if owns_history:
			_mark_changed("Create river")
	elif owns_history:
		_history_cancel()


func apply_noise_fill(seed: int) -> void:
	if bool(layer_locked.get(LAYER_TERRAIN, false)) and bool(layer_locked.get(LAYER_ELEVATION, false)):
		_log("Terrain/elevation layers are locked")
		return
	var owns_history := false
	if not _history_pending:
		owns_history = true
		_history_begin("Noise fill")

	var noise := FastNoiseLite.new()
	noise.seed = seed
	noise.frequency = 0.06
	noise.noise_type = FastNoiseLite.TYPE_SIMPLEX

	var targets: Array[Vector2i] = get_selected_coords()
	var use_all := targets.is_empty()

	var changed := false
	for coord in map_data.keys():
		if not use_all and coord not in targets:
			continue
		if map_data[coord].get("terrain", "") == "studio":
			continue

		var p := HexMath.cube_to_pixel(coord, 1.0)
		var v := noise.get_noise_2d(p.x, p.y)
		var will_change := false

		if not bool(layer_locked.get(LAYER_TERRAIN, false)):
			var t := "plains"
			if v < -0.45:
				t = "water"
			elif v < -0.15:
				t = "plains"
			elif v < 0.15:
				t = "forest"
			elif v < 0.45:
				t = "hills"
			else:
				t = "mountain"
			var td: Dictionary = TERRAIN_TYPES.get(t, TERRAIN_TYPES["plains"])
			if str(map_data[coord].get("terrain", "")) != t or float(map_data[coord].get("impedance", 0.0)) != float(td["impedance"]):
				will_change = true
			if not bool(layer_locked.get(LAYER_ELEVATION, false)):
				var new_e: int = clampi(int(round(v * 5.0)), -5, 5)
				if int(map_data[coord].get("elevation", 0)) != new_e:
					will_change = true
			if will_change:
				_history_track_hex(coord)
				map_data[coord]["terrain"] = t
				map_data[coord]["impedance"] = td["impedance"]
				if not bool(layer_locked.get(LAYER_ELEVATION, false)):
					map_data[coord]["elevation"] = clampi(int(round(v * 5.0)), -5, 5)
				changed = true
		elif not bool(layer_locked.get(LAYER_ELEVATION, false)):
			var new_e2: int = clampi(int(round(v * 5.0)), -5, 5)
			if int(map_data[coord].get("elevation", 0)) != new_e2:
				_history_track_hex(coord)
				map_data[coord]["elevation"] = new_e2
				changed = true

	if changed:
		if owns_history:
			_mark_changed("Noise fill")
	elif owns_history:
		_history_cancel()


func export_runtime(path: String) -> Error:
	if path.to_lower().ends_with(".hxb"):
		return _export_runtime_binary(path)
	return _export_runtime_json(path)


func import_runtime(path: String) -> Error:
	if path.to_lower().ends_with(".hxb"):
		return _import_runtime_binary(path)
	return _import_runtime_json(path)


func export_stamp(path: String) -> Error:
	if not has_stamp:
		_log("No stamp to export (copy a selection first)")
		return ERR_UNAVAILABLE
	var payload := {
		"version": 1,
		"hexes": stamp_hexes,
		"edges": stamp_edges,
	}
	var file: FileAccess = FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		return FileAccess.get_open_error()
	file.store_string(JSON.stringify(payload, "\t"))
	file.close()
	_log("Exported stamp: %s" % path)
	return OK


func import_stamp(path: String) -> Error:
	var file: FileAccess = FileAccess.open(path, FileAccess.READ)
	if file == null:
		return FileAccess.get_open_error()
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	file.close()
	if parsed == null or not (parsed is Dictionary):
		return ERR_PARSE_ERROR
	var d: Dictionary = parsed as Dictionary
	stamp_hexes = d.get("hexes", [])
	stamp_edges = d.get("edges", [])
	for item in stamp_hexes:
		if item.has("region_id"):
			var rid := int(item["region_id"])
			if not regions.has(rid):
				item["region_id"] = DEFAULT_REGION_ID
	has_stamp = true
	_log("Imported stamp: %s (%d hexes)" % [path, stamp_hexes.size()])
	return OK


func _export_runtime_json(path: String) -> Error:
	var terrain_table: Array[String] = TERRAIN_ORDER.duplicate()
	var edge_table: Array[String] = ["river", "road", "wall"]

	var coords: Array = map_data.keys()
	coords.sort_custom(func(a, b) -> bool:
		if a.y == b.y:
			return a.x < b.x
		return a.y < b.y
	)

	var hexes_out: Array = []
	for coord in coords:
		var hex: Dictionary = map_data[coord]
		var tname: String = hex.get("terrain", "plains")
		var tid := terrain_table.find(tname)
		if tid < 0:
			tid = terrain_table.find("plains")
		var dl_v: Variant = hex.get("datalayer", {})
		var dl: Dictionary = dl_v as Dictionary if dl_v is Dictionary else {}
		hexes_out.append([
			coord.x,
			coord.y,
			tid,
			int(hex.get("elevation", 0)),
			int(hex.get("region_id", DEFAULT_REGION_ID)),
			hex.get("name", ""),
			hex.get("description", ""),
			hex.get("features", []),
			dl,
		])

	var edges_out: Array = []
	var edge_keys: Array = edge_data.keys()
	edge_keys.sort()
	for ek in edge_keys:
		var ab: Array[Vector2i] = _edge_key_to_coords(ek)
		if ab.size() != 2:
			continue
		var etype: String = edge_data[ek].get("type", "river")
		var eid := edge_table.find(etype)
		if eid < 0:
			eid = 0
		edges_out.append([ab[0].x, ab[0].y, ab[1].x, ab[1].y, eid])

	var regions_out: Array = []
	var ids: Array = regions.keys()
	ids.sort()
	for id in ids:
		var rid: int = int(id)
		var reg: Dictionary = regions[rid]
		regions_out.append([rid, reg.get("name", ""), _color_to_array(_get_region_color(rid))])

	var payload := {
		"version": 3,
		"terrain_table": terrain_table,
		"edge_table": edge_table,
		"regions": regions_out,
		"hexes": hexes_out,
		"edges": edges_out,
	}

	var file: FileAccess = FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		return FileAccess.get_open_error()
	file.store_string(JSON.stringify(payload, "\t"))
	file.close()
	_log("Exported runtime JSON: %s" % path)
	return OK


func _import_runtime_json(path: String) -> Error:
	var file: FileAccess = FileAccess.open(path, FileAccess.READ)
	if file == null:
		return FileAccess.get_open_error()
	var json_string := file.get_as_text()
	file.close()
	var parsed: Variant = JSON.parse_string(json_string)
	if parsed == null or not (parsed is Dictionary):
		return ERR_PARSE_ERROR
	var d: Dictionary = parsed as Dictionary
	var ver: int = int(d.get("version", 2))

	var terrain_table: Array = d.get("terrain_table", TERRAIN_ORDER)
	var edge_table: Array = d.get("edge_table", ["river", "road", "wall"])

	map_data.clear()
	edge_data.clear()
	regions = { DEFAULT_REGION_ID: { "name": "Unassigned", "color": Color(0.9, 0.9, 0.9, 0.35) } }
	terrain_limits.clear()

	for reg in d.get("regions", []):
		var rid: int = int(reg[0])
		if rid == DEFAULT_REGION_ID:
			continue
		regions[rid] = { "name": reg[1], "color": _array_to_color(reg[2]) }

	for h in d.get("hexes", []):
		if not (h is Array):
			continue
		var arr: Array = h as Array
		if ver <= 2 and arr.size() < 8:
			continue
		if ver >= 3 and arr.size() < 9:
			continue

		var q: int = int(arr[0])
		var r: int = int(arr[1])
		var tid: int = int(arr[2])
		var tname: String = str(terrain_table[tid]) if tid >= 0 and tid < terrain_table.size() else "plains"
		var td: Dictionary = TERRAIN_TYPES.get(tname, TERRAIN_TYPES["plains"])
		var hex_rid: int = int(arr[4])
		if not regions.has(hex_rid):
			hex_rid = DEFAULT_REGION_ID
		var features: Array = arr[7] if arr.size() > 7 and arr[7] is Array else []
		var datalayer: Dictionary = {}
		if ver >= 3 and arr.size() > 8 and arr[8] is Dictionary:
			datalayer = arr[8] as Dictionary
		map_data[Vector2i(q, r)] = {
			"terrain": tname,
			"impedance": td.get("impedance", 1.0),
			"features": features,
			"elevation": int(arr[3]),
			"region_id": hex_rid,
			"name": str(arr[5]),
			"description": str(arr[6]),
			"datalayer": datalayer,
		}

	for e in d.get("edges", []):
		var a := Vector2i(int(e[0]), int(e[1]))
		var b := Vector2i(int(e[2]), int(e[3]))
		var eid: int = int(e[4])
		var etype: String = str(edge_table[eid]) if eid >= 0 and eid < edge_table.size() else "river"
		edge_data[_get_edge_key(a, b)] = { "type": etype }

	_update_stats()
	_reset_history("Import runtime")
	has_unsaved_changes = true
	queue_redraw()
	map_changed.emit()
	_log("Imported runtime JSON: %s (%d hexes)" % [path, map_data.size()])
	return OK


func _export_runtime_binary(path: String) -> Error:
	var file: FileAccess = FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		return FileAccess.get_open_error()

	# Header
	file.store_buffer("HXB1".to_utf8_buffer())
	file.store_32(1) # version

	var coords: Array = map_data.keys()
	coords.sort_custom(func(a, b) -> bool:
		if a.y == b.y:
			return a.x < b.x
		return a.y < b.y
	)

	file.store_32(coords.size())
	for coord in coords:
		var hex: Dictionary = map_data[coord]
		var tname: String = hex.get("terrain", "plains")
		var tid: int = TERRAIN_ORDER.find(tname)
		if tid < 0:
			tid = 0
		file.store_32(coord.x)
		file.store_32(coord.y)
		file.store_8(tid)
		file.store_8(int(hex.get("elevation", 0)) & 0xFF)
		file.store_16(int(hex.get("region_id", DEFAULT_REGION_ID)) & 0xFFFF)

	file.store_32(edge_data.size())
	for ek in edge_data.keys():
		var ab: Array[Vector2i] = _edge_key_to_coords(ek)
		if ab.size() != 2:
			continue
		var etype: String = edge_data[ek].get("type", "river")
		var eid := ["river", "road", "wall"].find(etype)
		if eid < 0:
			eid = 0
		file.store_32(ab[0].x)
		file.store_32(ab[0].y)
		file.store_32(ab[1].x)
		file.store_32(ab[1].y)
		file.store_8(eid)

	file.close()
	_log("Exported runtime binary: %s" % path)
	return OK


func _import_runtime_binary(path: String) -> Error:
	var file: FileAccess = FileAccess.open(path, FileAccess.READ)
	if file == null:
		return FileAccess.get_open_error()
	var header := file.get_buffer(4).get_string_from_utf8()
	if header != "HXB1":
		file.close()
		return ERR_FILE_UNRECOGNIZED
	var _ver := int(file.get_32())

	map_data.clear()
	edge_data.clear()
	regions = { DEFAULT_REGION_ID: { "name": "Unassigned", "color": Color(0.9, 0.9, 0.9, 0.35) } }
	terrain_limits.clear()

	var hex_count := int(file.get_32())
	for _i in range(hex_count):
		var q := int(file.get_32())
		var r := int(file.get_32())
		var tid := int(file.get_8())
		var elev_raw := int(file.get_8())
		var elev := elev_raw - 256 if elev_raw > 127 else elev_raw
		var rid := int(file.get_16())
		if rid != DEFAULT_REGION_ID and not regions.has(rid):
			regions[rid] = { "name": "Region %d" % rid, "color": _region_color_from_id(rid) }
		var tname: String = "plains"
		if tid >= 0 and tid < TERRAIN_ORDER.size():
			tname = TERRAIN_ORDER[tid]
		var td: Dictionary = TERRAIN_TYPES.get(tname, TERRAIN_TYPES["plains"])
		map_data[Vector2i(q, r)] = {
			"terrain": tname,
			"impedance": td.get("impedance", 1.0),
			"features": [],
			"elevation": elev,
			"region_id": rid,
			"name": "",
			"description": "",
		}

	var edge_count := int(file.get_32())
	for _j in range(edge_count):
		var q1 := int(file.get_32())
		var r1 := int(file.get_32())
		var q2 := int(file.get_32())
		var r2 := int(file.get_32())
		var eid := int(file.get_8())
		var etype: String = "river"
		if eid == 1:
			etype = "road"
		elif eid == 2:
			etype = "wall"
		edge_data[_get_edge_key(Vector2i(q1, r1), Vector2i(q2, r2))] = { "type": etype }

	file.close()
	_update_stats()
	_reset_history("Import runtime")
	has_unsaved_changes = true
	queue_redraw()
	map_changed.emit()
	_log("Imported runtime binary: %s (%d hexes)" % [path, map_data.size()])
	return OK


## Import map from image
func import_from_image(image_path: String, color_mapping: Dictionary) -> Error:
	if bool(layer_locked.get(LAYER_TERRAIN, false)):
		_log("Terrain layer is locked")
		return ERR_UNAVAILABLE

	var image := Image.load_from_file(image_path)
	if image == null:
		_log("ERROR: Failed to load image: %s" % image_path)
		return ERR_FILE_CANT_READ

	map_data.clear()
	edge_data.clear()
	regions = { DEFAULT_REGION_ID: { "name": "Unassigned", "color": Color(0.9, 0.9, 0.9, 0.35) } }
	terrain_limits.clear()
	current_region_id = DEFAULT_REGION_ID
	selection.clear()
	has_selection = false
	selected_hex = Vector2i.ZERO

	var width: int = image.get_width()
	var height: int = image.get_height()

	for y in range(height):
		for x in range(width):
			var pixel_color := image.get_pixel(x, y)
			if pixel_color.a < 0.5:
				continue  # Skip transparent pixels

			# Find closest terrain color
			var best_terrain := "plains"
			var best_dist := INF
			for terrain_name in color_mapping.keys():
				var terrain_color: Color = color_mapping[terrain_name]
				var dist: float = _color_distance(pixel_color, terrain_color)
				if dist < best_dist:
					best_dist = dist
					best_terrain = terrain_name

			# Convert pixel coords to hex coords (offset coordinates)
			var q: int = x - width / 2
			var r: int = y - height / 2 - (x - width / 2) / 2

			var terrain_data: Dictionary = TERRAIN_TYPES.get(best_terrain, TERRAIN_TYPES["plains"])
			map_data[Vector2i(q, r)] = {
				"terrain": best_terrain,
				"impedance": terrain_data["impedance"],
				"features": [],
				"elevation": 0,
				"name": "",
				"description": "",
				"region_id": DEFAULT_REGION_ID
			}

	has_unsaved_changes = true
	_update_stats()
	_reset_history("Import image")
	queue_redraw()
	map_changed.emit()
	_log("Imported %d hexes from image" % map_data.size())
	return OK


func _color_distance(c1: Color, c2: Color) -> float:
	return sqrt(pow(c1.r - c2.r, 2) + pow(c1.g - c2.g, 2) + pow(c1.b - c2.b, 2))


func _color_to_array(c: Color) -> Array:
	return [c.r, c.g, c.b, c.a]


func _array_to_color(value) -> Color:
	if value is Array and value.size() >= 3:
		var r: float = float(value[0])
		var g: float = float(value[1])
		var b: float = float(value[2])
		var a: float = float(value[3]) if value.size() >= 4 else 1.0
		return Color(r, g, b, a)
	return Color(1, 1, 1, 0.35)


func _region_color_from_id(region_id: int) -> Color:
	var hue := fmod(float(region_id) * 0.137, 1.0)
	return Color.from_hsv(hue, 0.6, 0.9, 0.35)
