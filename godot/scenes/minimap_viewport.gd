extends SubViewportContainer
## Minimap Viewport - SubViewport-based minimap that renders actual hex editor content
##
## Features:
## - Renders the actual HexEditor content via SubViewport
## - Camera follows/mirrors main editor but zoomed out to show entire map
## - Click to jump to location
## - Scroll wheel to zoom the minimap
## - Viewport indicator rectangle showing what's visible in main view
## - Syncs with map_changed signal

@onready var sub_viewport: SubViewport = $SubViewport
@onready var minimap_camera: Camera2D = $SubViewport/MinimapCamera
@onready var viewport_indicator: Node2D = $SubViewport/ViewportIndicator

var hex_editor: HexEditor = null
var minimap_hex_editor: HexEditor = null  # Duplicate HexEditor for rendering in viewport

# Minimap state
var zoom_level: float = 1.0
var _is_dragging: bool = false
var _drag_start: Vector2 = Vector2.ZERO
var _drag_camera_start: Vector2 = Vector2.ZERO

# Map bounds (computed from hex_editor.map_data)
var _map_center: Vector2 = Vector2.ZERO
var _map_size: Vector2 = Vector2.ZERO
var _bounds_dirty: bool = true


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP

	# Configure SubViewport
	if sub_viewport:
		sub_viewport.transparent_bg = true
		sub_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS

	# Try to find HexEditor
	_try_find_hex_editor.call_deferred()


func _process(_delta: float) -> void:
	if hex_editor and minimap_camera:
		_update_minimap_camera()
		_update_viewport_indicator()


func set_hex_editor(editor: HexEditor) -> void:
	if hex_editor == editor:
		return

	# Disconnect old signals
	if hex_editor:
		if hex_editor.map_changed.is_connected(_on_map_changed):
			hex_editor.map_changed.disconnect(_on_map_changed)

	hex_editor = editor

	# Connect new signals
	if hex_editor:
		if not hex_editor.map_changed.is_connected(_on_map_changed):
			hex_editor.map_changed.connect(_on_map_changed)

		# Reparent HexEditor to SubViewport if needed
		_setup_viewport_rendering()

	_bounds_dirty = true
	_update_map_bounds()


func _try_find_hex_editor() -> void:
	var candidate: HexEditor = get_node_or_null("/root/EditorScene/HexEditor") as HexEditor
	if not candidate:
		candidate = get_node_or_null("../../../../../HexEditor") as HexEditor
	if candidate:
		set_hex_editor(candidate)


func _setup_viewport_rendering() -> void:
	if not hex_editor or not sub_viewport:
		return

	# Clean up existing minimap HexEditor if any
	if minimap_hex_editor:
		minimap_hex_editor.queue_free()
		minimap_hex_editor = null

	# Create a new HexEditor instance for the minimap
	minimap_hex_editor = HexEditor.new()
	minimap_hex_editor.name = "MinimapHexEditor"
	minimap_hex_editor.auto_center_in_viewport = false
	minimap_hex_editor.show_coords = false
	minimap_hex_editor.show_grid = false

	# Copy map data from the main editor
	minimap_hex_editor.map_data = hex_editor.map_data.duplicate(true)
	minimap_hex_editor.edge_data = hex_editor.edge_data.duplicate(true)
	minimap_hex_editor.regions = hex_editor.regions.duplicate(true)
	minimap_hex_editor.hex_size = hex_editor.hex_size

	# Position at viewport origin (camera will handle positioning)
	minimap_hex_editor.global_position = Vector2.ZERO

	# Add to SubViewport
	sub_viewport.add_child(minimap_hex_editor)

	# Move minimap_hex_editor behind the camera and viewport indicator
	sub_viewport.move_child(minimap_hex_editor, 0)

	# Force redraw
	minimap_hex_editor.queue_redraw()


func _on_map_changed() -> void:
	_bounds_dirty = true
	_update_map_bounds()

	# Sync map data to minimap HexEditor
	if minimap_hex_editor and hex_editor:
		minimap_hex_editor.map_data = hex_editor.map_data.duplicate(true)
		minimap_hex_editor.edge_data = hex_editor.edge_data.duplicate(true)
		minimap_hex_editor.regions = hex_editor.regions.duplicate(true)
		minimap_hex_editor.queue_redraw()


func _update_map_bounds() -> void:
	if not hex_editor or hex_editor.map_data.is_empty():
		_bounds_dirty = false
		return

	var min_pos: Vector2 = Vector2(INF, INF)
	var max_pos: Vector2 = Vector2(-INF, -INF)

	for coord in hex_editor.map_data.keys():
		var pixel: Vector2 = HexMath.cube_to_pixel(coord, hex_editor.hex_size)
		min_pos.x = min(min_pos.x, pixel.x)
		min_pos.y = min(min_pos.y, pixel.y)
		max_pos.x = max(max_pos.x, pixel.x)
		max_pos.y = max(max_pos.y, pixel.y)

	# Add padding for hex size
	var padding: float = hex_editor.hex_size * 2.0
	min_pos -= Vector2(padding, padding)
	max_pos += Vector2(padding, padding)

	_map_center = (min_pos + max_pos) / 2.0
	_map_size = max_pos - min_pos
	_bounds_dirty = false


func _update_minimap_camera() -> void:
	if not minimap_camera or not hex_editor:
		return

	if _bounds_dirty:
		_update_map_bounds()

	# Position camera to show entire map
	minimap_camera.position = _map_center

	# Calculate zoom to fit entire map in viewport
	if _map_size.x > 0 and _map_size.y > 0:
		var viewport_size: Vector2 = Vector2(sub_viewport.size)
		var scale_x: float = viewport_size.x / _map_size.x
		var scale_y: float = viewport_size.y / _map_size.y
		var base_zoom: float = min(scale_x, scale_y) * 0.9  # 0.9 for margin

		minimap_camera.zoom = Vector2.ONE * base_zoom * zoom_level


func _update_viewport_indicator() -> void:
	if not viewport_indicator or not hex_editor:
		return

	# Pass hex_editor reference to viewport indicator
	if viewport_indicator.has_method("set_hex_editor"):
		viewport_indicator.set_hex_editor(hex_editor)

	# The viewport indicator will be drawn by the ViewportIndicator node
	viewport_indicator.queue_redraw()


func _gui_input(event: InputEvent) -> void:
	if not hex_editor:
		return

	# Handle mouse motion for dragging
	if event is InputEventMouseMotion:
		var motion: InputEventMouseMotion = event as InputEventMouseMotion

		if _is_dragging:
			# Convert minimap drag to main editor camera movement
			var delta: Vector2 = motion.position - _drag_start
			var viewport_to_world: float = _map_size.x / size.x
			var world_delta: Vector2 = delta * viewport_to_world / zoom_level
			hex_editor.camera_offset = _drag_camera_start - world_delta
			hex_editor.queue_redraw()

	# Handle scroll wheel for zoom
	if event is InputEventMouseButton:
		var mb: InputEventMouseButton = event as InputEventMouseButton

		if mb.button_index == MOUSE_BUTTON_WHEEL_UP and mb.pressed:
			zoom_level = clamp(zoom_level * 1.15, 0.5, 3.0)
			accept_event()
			return

		if mb.button_index == MOUSE_BUTTON_WHEEL_DOWN and mb.pressed:
			zoom_level = clamp(zoom_level / 1.15, 0.5, 3.0)
			accept_event()
			return

		# Left click - jump to location or start drag
		if mb.button_index == MOUSE_BUTTON_LEFT:
			if mb.pressed:
				_is_dragging = true
				_drag_start = mb.position
				_drag_camera_start = hex_editor.camera_offset
				accept_event()
			else:
				if _is_dragging:
					var drag_distance: float = mb.position.distance_to(_drag_start)
					if drag_distance < 5.0:
						# It was a click, not a drag - jump to location
						_jump_to_position(mb.position)
					_is_dragging = false
				accept_event()

		# Right click - reset zoom
		if mb.button_index == MOUSE_BUTTON_RIGHT and mb.pressed:
			zoom_level = 1.0
			accept_event()


func _jump_to_position(minimap_pos: Vector2) -> void:
	if not hex_editor or not sub_viewport:
		return

	# Convert minimap position to world position
	var viewport_rect: Rect2 = Rect2(Vector2.ZERO, size)
	var normalized_pos: Vector2 = minimap_pos / size

	# Map to world space
	var world_pos: Vector2 = _map_center + (normalized_pos - Vector2(0.5, 0.5)) * _map_size / zoom_level

	# Convert to hex coordinate
	var hex_coord: Vector2i = HexMath.pixel_to_cube(world_pos, hex_editor.hex_size)

	# Center view on this hex
	if hex_editor.has_method("center_view_on_hex"):
		hex_editor.center_view_on_hex(hex_coord)


func _notification(what: int) -> void:
	if what == NOTIFICATION_MOUSE_EXIT:
		_is_dragging = false


## Reset minimap view to default zoom
func reset_view() -> void:
	zoom_level = 1.0
	_bounds_dirty = true
