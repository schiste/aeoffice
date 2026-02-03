extends ColorRect
## Minimap - Interactive overview of the entire hex map
##
## Features:
## - Click to jump to location
## - Drag to pan the main view
## - Scroll wheel to zoom minimap
## - Real-time viewport indicator
## - Edge/river/road visualization
## - Region overlay toggle
## - Selection sync with main editor
## - POI markers
## - Hover info tooltip

var hex_editor: Node2D = null


func _obj_has_property(obj: Object, prop: StringName) -> bool:
	if obj == null:
		return false
	for entry in obj.get_property_list():
		if entry is Dictionary and StringName((entry as Dictionary).get("name", "")) == prop:
			return true
	return false


func _get_map_data() -> Dictionary:
	if not hex_editor:
		return {}
	if not _obj_has_property(hex_editor, &"map_data"):
		return {}
	var v: Variant = hex_editor.get(&"map_data")
	return v if v is Dictionary else {}


func _get_edge_data() -> Dictionary:
	if not hex_editor:
		return {}
	if not _obj_has_property(hex_editor, &"edge_data"):
		return {}
	var v: Variant = hex_editor.get(&"edge_data")
	return v if v is Dictionary else {}


func _get_regions() -> Dictionary:
	if not hex_editor:
		return {}
	if not _obj_has_property(hex_editor, &"regions"):
		return {}
	var v: Variant = hex_editor.get(&"regions")
	return v if v is Dictionary else {}


func _get_hex_size() -> float:
	if not hex_editor:
		return 0.0
	if not _obj_has_property(hex_editor, &"hex_size"):
		return 0.0
	return float(hex_editor.get(&"hex_size"))


func _get_camera_offset() -> Vector2:
	if not hex_editor:
		return Vector2.ZERO
	if not _obj_has_property(hex_editor, &"camera_offset"):
		return Vector2.ZERO
	var v: Variant = hex_editor.get(&"camera_offset")
	return v if v is Vector2 else Vector2.ZERO


func _set_camera_offset(v: Vector2) -> void:
	if not hex_editor:
		return
	if not _obj_has_property(hex_editor, &"camera_offset"):
		return
	hex_editor.set(&"camera_offset", v)


func _get_has_selection() -> bool:
	if not hex_editor:
		return false
	if not _obj_has_property(hex_editor, &"has_selection"):
		return false
	return bool(hex_editor.get(&"has_selection"))


func _get_selected_hex() -> Vector2i:
	if not hex_editor:
		return Vector2i.ZERO
	if not _obj_has_property(hex_editor, &"selected_hex"):
		return Vector2i.ZERO
	var v: Variant = hex_editor.get(&"selected_hex")
	return v if v is Vector2i else Vector2i.ZERO


func _get_selection_dict() -> Dictionary:
	if not hex_editor:
		return {}
	if not _obj_has_property(hex_editor, &"selection"):
		return {}
	var v: Variant = hex_editor.get(&"selection")
	return v if v is Dictionary else {}

# Projection state
var _min_pos: Vector2 = Vector2.ZERO
var _max_pos: Vector2 = Vector2.ZERO
var _map_scale: float = 1.0
var _offset: Vector2 = Vector2.ZERO
var _projection_ready: bool = false

# Zoom and pan
var zoom: float = 1.0
var _pan_offset: Vector2 = Vector2.ZERO
var _is_dragging: bool = false
var _drag_start: Vector2 = Vector2.ZERO
var _drag_camera_start: Vector2 = Vector2.ZERO

# Display modes
var show_edges: bool = true
var show_regions: bool = false
var show_poi: bool = true

# Hover state
var _hovered_hex: Vector2i = Vector2i.ZERO
var _has_hover: bool = false

# Cached studio location
var _studio_coord: Vector2i = Vector2i.ZERO
var _has_studio: bool = false

# Update throttling
var _needs_full_redraw: bool = true
var _viewport_dirty: bool = true


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	if hex_editor == null:
		_try_find_hex_editor.call_deferred()


func _process(_delta: float) -> void:
	# Redraw viewport indicator every frame for smooth tracking
	if hex_editor and _viewport_dirty:
		queue_redraw()
		_viewport_dirty = false


func set_hex_editor(editor: Node2D) -> void:
	if hex_editor == editor:
		return

	# Disconnect old signals
	if hex_editor:
		var cb_map := Callable(self, "_on_map_changed")
		var cb_sel := Callable(self, "_on_hex_selected")
		if hex_editor.has_signal(&"map_changed") and hex_editor.is_connected(&"map_changed", cb_map):
			hex_editor.disconnect(&"map_changed", cb_map)
		if hex_editor.has_signal(&"hex_selected") and hex_editor.is_connected(&"hex_selected", cb_sel):
			hex_editor.disconnect(&"hex_selected", cb_sel)

	hex_editor = editor

	# Connect new signals
	if hex_editor:
		# If the HexEditor script failed to compile/load, the node may exist but the API won't.
		if not _obj_has_property(hex_editor, &"map_data"):
			push_warning("Minimap: HexEditor node found but script/API missing (did HexEditor fail to compile?)")
			hex_editor = null
		else:
			var cb_map2 := Callable(self, "_on_map_changed")
			var cb_sel2 := Callable(self, "_on_hex_selected")
			if hex_editor.has_signal(&"map_changed") and not hex_editor.is_connected(&"map_changed", cb_map2):
				hex_editor.connect(&"map_changed", cb_map2)
			if hex_editor.has_signal(&"hex_selected") and not hex_editor.is_connected(&"hex_selected", cb_sel2):
				hex_editor.connect(&"hex_selected", cb_sel2)

	_projection_ready = false
	_needs_full_redraw = true
	_find_studio()
	queue_redraw()


func _try_find_hex_editor() -> void:
	# Try new main_editor scene path first
	var candidate: Node2D = get_node_or_null("/root/MainEditor/VBoxContainer/MainSplit/CenterPanel/HexEditorViewport/SubViewport/HexEditor") as Node2D
	if not candidate:
		# Try old scene path
		candidate = get_node_or_null("/root/EditorScene/HexEditor") as Node2D
	if not candidate:
		# Try relative path
		candidate = get_node_or_null("../../../../../HexEditor") as Node2D
	if candidate:
		set_hex_editor(candidate)


func _on_map_changed() -> void:
	_projection_ready = false
	_needs_full_redraw = true
	_find_studio()
	queue_redraw()


func _on_hex_selected(_coord: Vector2i) -> void:
	queue_redraw()


func _find_studio() -> void:
	_has_studio = false
	if not hex_editor:
		return
	var map_data: Dictionary = _get_map_data()
	for coord in map_data.keys():
		var terrain: String = (map_data[coord] as Dictionary).get("terrain", "")
		if terrain == "studio":
			_studio_coord = coord as Vector2i
			_has_studio = true
			break


func _compute_projection() -> bool:
	_projection_ready = false
	var map_data: Dictionary = _get_map_data()
	if not hex_editor or map_data.is_empty():
		return false

	_min_pos = Vector2(INF, INF)
	_max_pos = Vector2(-INF, -INF)

	for coord in map_data.keys():
		var p: Vector2 = HexMath.cube_to_pixel(coord, 1.0)
		_min_pos.x = min(_min_pos.x, p.x)
		_min_pos.y = min(_min_pos.y, p.y)
		_max_pos.x = max(_max_pos.x, p.x)
		_max_pos.y = max(_max_pos.y, p.y)

	var span := _max_pos - _min_pos
	if span.x <= 0.0001 or span.y <= 0.0001:
		return false

	# Add margin for hex radius
	var margin := 1.5
	var padded_span := span + Vector2(margin * 2.0, margin * 2.0)

	var scale_x: float = size.x / padded_span.x
	var scale_y: float = size.y / padded_span.y
	_map_scale = min(scale_x, scale_y) * zoom

	# Center the map in the minimap
	var scaled_span := span * _map_scale
	_offset = Vector2(
		(size.x - scaled_span.x) / 2.0,
		(size.y - scaled_span.y) / 2.0
	) - _min_pos * _map_scale + _pan_offset

	_projection_ready = true
	return true


func _world_to_minimap(coord: Vector2i) -> Vector2:
	var unit_pos: Vector2 = HexMath.cube_to_pixel(coord, 1.0)
	return unit_pos * _map_scale + _offset


func _minimap_to_world(pos: Vector2) -> Vector2i:
	var unit_pos: Vector2 = (pos - _offset) / _map_scale
	return HexMath.pixel_to_cube(unit_pos, 1.0)


func _draw() -> void:
	if not hex_editor:
		return

	if not _projection_ready and not _compute_projection():
		# Draw empty state
		draw_string(ThemeDB.fallback_font, Vector2(10, size.y / 2), "No map data", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(0.5, 0.5, 0.5))
		return

	var hex_radius: float = maxf(1.5, _map_scale * 0.85)

	# Clip drawing to minimap bounds
	# Draw background (already set by ColorRect color)

	# 1. Draw hexes
	_draw_hexes(hex_radius)

	# 2. Draw edges (rivers, roads, walls)
	if show_edges:
		_draw_edges()

	# 3. Draw region borders
	if show_regions:
		_draw_region_borders()

	# 4. Draw POI markers
	if show_poi:
		_draw_poi_markers(hex_radius)

	# 5. Draw studio marker
	if _has_studio:
		_draw_studio_marker(hex_radius)

	# 6. Draw selection highlight
	_draw_selection(hex_radius)

	# 7. Draw hover highlight
	if _has_hover:
		_draw_hover(hex_radius)

	# 8. Draw viewport indicator
	_draw_viewport_indicator()

	# 9. Draw minimap border
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.4, 0.4, 0.45, 0.8), false, 1.0)


func _draw_hexes(hex_radius: float) -> void:
	var map_data: Dictionary = _get_map_data()
	var regions: Dictionary = _get_regions()
	for coord in map_data.keys():
		var hex_data: Dictionary = map_data[coord]
		var terrain: String = hex_data.get("terrain", "plains")
		var base_color: Color = TerrainConstants.get_terrain_color(terrain)

		# Apply elevation shading
		var elevation: int = hex_data.get("elevation", 0)
		var color := base_color
		if elevation != 0:
			var shade: float = clampf(float(elevation) * 0.03, -0.3, 0.3)
			color = base_color.lightened(shade) if elevation > 0 else base_color.darkened(-shade)

		# Apply region tint if showing regions
		if show_regions:
			var region_id: int = hex_data.get("region_id", 0)
			if region_id != 0:
				var region_color: Color = regions.get(region_id, {}).get("color", Color.TRANSPARENT)
				color = color.blend(Color(region_color.r, region_color.g, region_color.b, 0.4))

		var hex_center := _world_to_minimap(coord)

		# Only draw if within bounds (with margin)
		if hex_center.x < -hex_radius or hex_center.x > size.x + hex_radius:
			continue
		if hex_center.y < -hex_radius or hex_center.y > size.y + hex_radius:
			continue

		var hex_points := HexMath.get_hex_corners(hex_center, hex_radius)
		draw_colored_polygon(hex_points, color)

		# Draw subtle hex outline for definition
		if hex_radius > 3:
			for i in range(6):
				draw_line(hex_points[i], hex_points[(i + 1) % 6], Color(0, 0, 0, 0.15), 1.0)


func _draw_edges() -> void:
	var edge_data: Dictionary = _get_edge_data()
	if edge_data.is_empty():
		return

	for edge_key in edge_data.keys():
		var edge_info: Dictionary = edge_data[edge_key]
		var edge_type: String = edge_info.get("type", "river")

		# Parse edge key to get coordinates
		var parts: PackedStringArray = edge_key.split(":")
		if parts.size() != 2:
			continue

		var coords1: PackedStringArray = parts[0].split(",")
		var coords2: PackedStringArray = parts[1].split(",")
		if coords1.size() != 2 or coords2.size() != 2:
			continue

		var hex1 := Vector2i(int(coords1[0]), int(coords1[1]))
		var hex2 := Vector2i(int(coords2[0]), int(coords2[1]))

		var pos1 := _world_to_minimap(hex1)
		var pos2 := _world_to_minimap(hex2)
		var mid := (pos1 + pos2) / 2.0

		# Calculate perpendicular for edge line
		var dir := (pos2 - pos1).normalized()
		var perp := Vector2(-dir.y, dir.x)
		var edge_len := _map_scale * 0.4

		var edge_color: Color = TerrainConstants.get_edge_color(edge_type)
		var edge_width: float = maxf(1.0, TerrainConstants.get_edge_width(edge_type) * _map_scale * 0.05)

		draw_line(mid - perp * edge_len, mid + perp * edge_len, edge_color, edge_width)


func _draw_region_borders() -> void:
	# Draw borders between different regions
	var map_data: Dictionary = _get_map_data()
	for coord in map_data.keys():
		var hex_data: Dictionary = map_data[coord]
		var region_id: int = hex_data.get("region_id", 0)

		var hex_center := _world_to_minimap(coord)
		var neighbors := HexMath.get_neighbors(coord)

		for i in range(6):
			var neighbor := neighbors[i]
			if not map_data.has(neighbor):
				continue

			var neighbor_region: int = (map_data[neighbor] as Dictionary).get("region_id", 0)
			if neighbor_region != region_id:
				# Draw border segment
				var hex_points := HexMath.get_hex_corners(hex_center, _map_scale * 0.85)
				var p1 := hex_points[i]
				var p2 := hex_points[(i + 1) % 6]
				draw_line(p1, p2, Color(1, 1, 1, 0.6), 2.0)


func _draw_poi_markers(hex_radius: float) -> void:
	var map_data: Dictionary = _get_map_data()
	for coord in map_data.keys():
		var hex_data: Dictionary = map_data[coord]
		var hex_name: String = hex_data.get("name", "")
		if hex_name.is_empty():
			continue

		var hex_center := _world_to_minimap(coord)

		# Skip if outside bounds
		if hex_center.x < 0 or hex_center.x > size.x or hex_center.y < 0 or hex_center.y > size.y:
			continue

		# Draw POI dot
		var poi_radius: float = maxf(2.0, hex_radius * 0.5)
		draw_circle(hex_center, poi_radius + 1, Color(0, 0, 0, 0.5))  # Shadow
		draw_circle(hex_center, poi_radius, Color(1, 0.85, 0.2))  # Gold marker


func _draw_studio_marker(hex_radius: float) -> void:
	var studio_center := _world_to_minimap(_studio_coord)

	# Skip if outside bounds
	if studio_center.x < 0 or studio_center.x > size.x or studio_center.y < 0 or studio_center.y > size.y:
		return

	var marker_radius: float = maxf(3.0, hex_radius * 0.7)

	# Pulsing effect would require _process, keep it simple
	draw_circle(studio_center, marker_radius + 2, Color(0, 0, 0, 0.4))  # Shadow
	draw_circle(studio_center, marker_radius, Color(1, 1, 1, 0.95))  # White outer
	draw_circle(studio_center, marker_radius * 0.6, Color(1, 0.85, 0.2))  # Gold inner


func _draw_selection(hex_radius: float) -> void:
	if not _get_has_selection():
		return

	# Draw selected hex highlight
	var selected_hex: Vector2i = _get_selected_hex()
	var sel_center := _world_to_minimap(selected_hex)
	if sel_center.x < 0 or sel_center.x > size.x or sel_center.y < 0 or sel_center.y > size.y:
		return

	var sel_points := HexMath.get_hex_corners(sel_center, hex_radius * 1.1)
	for i in range(6):
		draw_line(sel_points[i], sel_points[(i + 1) % 6], Color.YELLOW, 2.0)

	# Also highlight multi-selection if any
	var selection: Dictionary = _get_selection_dict()
	if not selection.is_empty():
		for coord in selection.keys():
			if coord == selected_hex:
				continue
			var sel_pos := _world_to_minimap(coord)
			if sel_pos.x < 0 or sel_pos.x > size.x or sel_pos.y < 0 or sel_pos.y > size.y:
				continue
			draw_circle(sel_pos, hex_radius * 0.4, Color(1, 1, 0, 0.6))


func _draw_hover(_hex_radius: float) -> void:
	var hover_center := _world_to_minimap(_hovered_hex)
	if hover_center.x < 0 or hover_center.x > size.x or hover_center.y < 0 or hover_center.y > size.y:
		return

	# Draw subtle hover indicator
	draw_circle(hover_center, 3, Color(1, 1, 1, 0.5))


func _draw_viewport_indicator() -> void:
	var hex_size: float = _get_hex_size()
	if hex_size <= 0.0:
		return

	# Calculate viewport corners in world space
	var vp: Viewport = hex_editor.get_viewport() if hex_editor else null
	var viewport_size: Vector2 = vp.get_visible_rect().size if vp else get_viewport_rect().size
	var cam: Vector2 = _get_camera_offset()

	# Get the four corners of what's visible in the main editor
	var corners_world: Array[Vector2] = [
		-cam,
		Vector2(viewport_size.x, 0) - cam,
		viewport_size - cam,
		Vector2(0, viewport_size.y) - cam
	]

	# Convert to minimap space
	var corners_minimap: PackedVector2Array = PackedVector2Array()
	for corner in corners_world:
		var hex_coord := HexMath.pixel_to_cube(corner, hex_size)
		var minimap_pos := _world_to_minimap(hex_coord)
		corners_minimap.append(minimap_pos)

	# Draw viewport rectangle
	var view_color := Color(1, 1, 1, 0.35)
	var border_color := Color(1, 1, 1, 0.7)

	# Fill
	draw_colored_polygon(corners_minimap, Color(1, 1, 1, 0.08))

	# Border
	for i in range(4):
		draw_line(corners_minimap[i], corners_minimap[(i + 1) % 4], border_color, 1.5)


func _gui_input(event: InputEvent) -> void:
	if not hex_editor:
		return

	# Mouse motion for hover
	if event is InputEventMouseMotion:
		var motion := event as InputEventMouseMotion
		_viewport_dirty = true
		if _is_dragging:
			# Drag to pan the main editor view
			var delta := motion.position - _drag_start
			var world_delta: Vector2 = delta / _map_scale * _get_hex_size()
			_set_camera_offset(_drag_camera_start - world_delta)
			hex_editor.queue_redraw()
		else:
			# Update hover
			if _projection_ready:
				_hovered_hex = _minimap_to_world(motion.position)
				_has_hover = _get_map_data().has(_hovered_hex)
				queue_redraw()

	# Scroll wheel zoom
	if event is InputEventMouseButton:
		var mb := event as InputEventMouseButton

		if mb.button_index == MOUSE_BUTTON_WHEEL_UP and mb.pressed:
			zoom = clampf(zoom * 1.15, 0.3, 5.0)
			_projection_ready = false
			queue_redraw()
			accept_event()
			return

		if mb.button_index == MOUSE_BUTTON_WHEEL_DOWN and mb.pressed:
			zoom = clampf(zoom / 1.15, 0.3, 5.0)
			_projection_ready = false
			queue_redraw()
			accept_event()
			return

		# Left click - jump to location or start drag
			if mb.button_index == MOUSE_BUTTON_LEFT:
				if mb.pressed:
					_is_dragging = true
					_drag_start = mb.position
					_drag_camera_start = _get_camera_offset()
					accept_event()
			else:
				if _is_dragging:
					var drag_distance := mb.position.distance_to(_drag_start)
					if drag_distance < 5.0:
						# It was a click, not a drag - jump to location
						_jump_to_position(mb.position)
					_is_dragging = false
				accept_event()

		# Right click - reset zoom
		if mb.button_index == MOUSE_BUTTON_RIGHT and mb.pressed:
			zoom = 1.0
			_pan_offset = Vector2.ZERO
			_projection_ready = false
			queue_redraw()
			accept_event()

		# Middle click - center on studio
		if mb.button_index == MOUSE_BUTTON_MIDDLE and mb.pressed:
			if _has_studio and hex_editor.has_method("center_view_on_hex"):
				hex_editor.center_view_on_hex(_studio_coord)
			accept_event()


func _jump_to_position(pos: Vector2) -> void:
	if not _projection_ready and not _compute_projection():
		return

	var clicked_hex := _minimap_to_world(pos)
	if hex_editor.has_method("center_view_on_hex"):
		hex_editor.center_view_on_hex(clicked_hex)


func _notification(what: int) -> void:
	if what == NOTIFICATION_MOUSE_EXIT:
		_has_hover = false
		_is_dragging = false
		queue_redraw()


## Toggle edge display
func toggle_edges() -> void:
	show_edges = not show_edges
	queue_redraw()


## Toggle region overlay
func toggle_regions() -> void:
	show_regions = not show_regions
	queue_redraw()


## Toggle POI markers
func toggle_poi() -> void:
	show_poi = not show_poi
	queue_redraw()


## Center minimap view on a specific hex
func center_on_hex(coord: Vector2i) -> void:
	if not _projection_ready and not _compute_projection():
		return

	var target_pos := _world_to_minimap(coord)
	var center := size / 2.0
	_pan_offset = center - target_pos + _pan_offset
	_projection_ready = false
	queue_redraw()


## Reset minimap view
func reset_view() -> void:
	zoom = 1.0
	_pan_offset = Vector2.ZERO
	_projection_ready = false
	queue_redraw()


## Alias for reset_view (compatibility)
func reset_zoom() -> void:
	reset_view()
