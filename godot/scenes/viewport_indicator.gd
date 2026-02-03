extends Node2D
## Viewport Indicator - Draws a rectangle showing what's visible in the main editor
##
## This node is rendered in the SubViewport and shows the current viewport bounds

var hex_editor: Node2D = null


func _obj_has_property(obj: Object, prop: StringName) -> bool:
	if obj == null:
		return false
	for entry in obj.get_property_list():
		if entry is Dictionary and StringName((entry as Dictionary).get("name", "")) == prop:
			return true
	return false


func _ready() -> void:
	# Try to find HexEditor from parent
	_try_find_hex_editor.call_deferred()


func _process(_delta: float) -> void:
	if hex_editor:
		queue_redraw()


func set_hex_editor(editor: Node2D) -> void:
	hex_editor = editor


func _try_find_hex_editor() -> void:
	# Try to find HexEditor in the scene tree (best-effort; this node is optional).
	var candidate: Node2D = get_node_or_null("/root/MainEditor/VBoxContainer/MainSplit/CenterPanel/HexEditorViewport/SubViewport/HexEditor") as Node2D
	if not candidate:
		candidate = get_node_or_null("/root/EditorScene/HexEditor") as Node2D
	if candidate:
		hex_editor = candidate


func _draw() -> void:
	if not hex_editor:
		return

	# Get the main viewport size
	var main_viewport: Viewport = hex_editor.get_viewport()
	if not main_viewport:
		return

	var viewport_size: Vector2 = main_viewport.get_visible_rect().size
	var cam: Vector2 = Vector2.ZERO
	if _obj_has_property(hex_editor, &"camera_offset"):
		var v: Variant = hex_editor.get(&"camera_offset")
		if v is Vector2:
			cam = v

	# Calculate the corners of what's visible in the main editor (in world space)
	var corners_world: Array[Vector2] = [
		-cam,
		Vector2(viewport_size.x, 0) - cam,
		viewport_size - cam,
		Vector2(0, viewport_size.y) - cam
	]

	# Convert to hex coordinates and back to get pixel positions relative to HexEditor
	var corners_pixels: PackedVector2Array = PackedVector2Array()
	var hex_size: float = 0.0
	if _obj_has_property(hex_editor, &"hex_size"):
		hex_size = float(hex_editor.get(&"hex_size"))
	if hex_size <= 0.0:
		return
	for corner_world in corners_world:
		var hex_coord: Vector2i = HexMath.pixel_to_cube(corner_world, hex_size)
		var pixel_pos: Vector2 = HexMath.cube_to_pixel(hex_coord, hex_size)
		corners_pixels.append(pixel_pos)

	# Draw the viewport indicator rectangle
	var view_color: Color = Color(1, 1, 1, 0.15)
	var border_color: Color = Color(1, 1, 1, 0.8)

	# Fill
	draw_colored_polygon(corners_pixels, view_color)

	# Border
	for i in range(4):
		draw_line(corners_pixels[i], corners_pixels[(i + 1) % 4], border_color, 2.0)

	# Optional: Draw corner markers for better visibility
	for corner in corners_pixels:
		draw_circle(corner, 3.0, border_color)
