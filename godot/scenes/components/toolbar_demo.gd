extends Control
## Demo scene for testing the toolbar component
##
## Provides interactive testing of:
## - Tool selection via buttons
## - Terrain/brush/edge configuration
## - Signal emission verification
## - API method testing
## - State management

# UI references
@onready var toolbar: HBoxContainer = $VBox/ToolbarContainer/Toolbar
@onready var output_text: RichTextLabel = %OutputText
@onready var tool_label: Label = %ToolLabel
@onready var terrain_label: Label = %TerrainLabel
@onready var brush_label: Label = %BrushLabel
@onready var edge_label: Label = %EdgeLabel

# Test control buttons
@onready var set_paint_btn: Button = $VBox/ControlsPanel/VBox/ButtonRow/SetPaintBtn
@onready var set_fill_btn: Button = $VBox/ControlsPanel/VBox/ButtonRow/SetFillBtn
@onready var set_brush_3_btn: Button = $VBox/ControlsPanel/VBox/ButtonRow/SetBrush3Btn
@onready var set_terrain_water_btn: Button = $VBox/ControlsPanel/VBox/ButtonRow/SetTerrainWaterBtn
@onready var get_state_btn: Button = $VBox/ControlsPanel/VBox/ButtonRow/GetStateBtn
@onready var clear_log_btn: Button = $VBox/ControlsPanel/VBox/ButtonRow/ClearLogBtn

# Terrain names for display
const TERRAIN_NAMES: PackedStringArray = [
	"Studio", "Plains", "Water", "Forest", "Hills",
	"Mountain", "Cave Entrance", "Swamp", "Desert", "Ruins"
]

# Edge type names for display
const EDGE_NAMES: PackedStringArray = ["River", "Road", "Wall"]


func _ready() -> void:
	_connect_toolbar_signals()
	_connect_test_buttons()
	_log_message("Toolbar demo initialized", "info")
	_log_message("Click toolbar buttons or use test controls below", "info")
	_update_state_display()


func _connect_toolbar_signals() -> void:
	"""Connect all toolbar signals for testing."""
	toolbar.tool_changed.connect(_on_toolbar_tool_changed)
	toolbar.terrain_changed.connect(_on_toolbar_terrain_changed)
	toolbar.brush_size_changed.connect(_on_toolbar_brush_size_changed)
	toolbar.edge_type_changed.connect(_on_toolbar_edge_type_changed)


func _connect_test_buttons() -> void:
	"""Connect test control buttons."""
	set_paint_btn.pressed.connect(_on_set_paint_pressed)
	set_fill_btn.pressed.connect(_on_set_fill_pressed)
	set_brush_3_btn.pressed.connect(_on_set_brush_3_pressed)
	set_terrain_water_btn.pressed.connect(_on_set_terrain_water_pressed)
	get_state_btn.pressed.connect(_on_get_state_pressed)
	clear_log_btn.pressed.connect(_on_clear_log_pressed)


# Toolbar signal handlers


func _on_toolbar_tool_changed(tool_name: String) -> void:
	"""Handle tool change from toolbar."""
	_log_message("SIGNAL: tool_changed('%s')" % tool_name, "signal")
	_update_state_display()


func _on_toolbar_terrain_changed(terrain_id: int) -> void:
	"""Handle terrain change from toolbar."""
	var terrain_name: String = TERRAIN_NAMES[terrain_id] if terrain_id < TERRAIN_NAMES.size() else "Unknown"
	_log_message("SIGNAL: terrain_changed(%d) -> %s" % [terrain_id, terrain_name], "signal")
	_update_state_display()


func _on_toolbar_brush_size_changed(size: int) -> void:
	"""Handle brush size change from toolbar."""
	_log_message("SIGNAL: brush_size_changed(%d)" % size, "signal")
	_update_state_display()


func _on_toolbar_edge_type_changed(edge_id: int) -> void:
	"""Handle edge type change from toolbar."""
	var edge_name: String = EDGE_NAMES[edge_id] if edge_id < EDGE_NAMES.size() else "Unknown"
	_log_message("SIGNAL: edge_type_changed(%d) -> %s" % [edge_id, edge_name], "signal")
	_update_state_display()


# Test button handlers


func _on_set_paint_pressed() -> void:
	"""Test: Set tool to Paint via API."""
	_log_message("API: toolbar.set_active_tool('paint')", "api")
	toolbar.set_active_tool("paint")


func _on_set_fill_pressed() -> void:
	"""Test: Set tool to Fill via API."""
	_log_message("API: toolbar.set_active_tool('fill')", "api")
	toolbar.set_active_tool("fill")


func _on_set_brush_3_pressed() -> void:
	"""Test: Set brush size to 3 via API."""
	_log_message("API: toolbar.set_brush_size(3)", "api")
	toolbar.set_brush_size(3)


func _on_set_terrain_water_pressed() -> void:
	"""Test: Set terrain to Water (ID 2) via API."""
	_log_message("API: toolbar.set_terrain(2)", "api")
	toolbar.set_terrain(2)


func _on_get_state_pressed() -> void:
	"""Test: Get all current state via API."""
	var tool: String = toolbar.get_active_tool()
	var terrain: int = toolbar.get_selected_terrain()
	var brush: int = toolbar.get_brush_size()
	var edge: int = toolbar.get_edge_type()

	_log_message("API: Getting current state...", "api")
	_log_message("  get_active_tool() = '%s'" % tool, "result")
	_log_message("  get_selected_terrain() = %d" % terrain, "result")
	_log_message("  get_brush_size() = %d" % brush, "result")
	_log_message("  get_edge_type() = %d" % edge, "result")


func _on_clear_log_pressed() -> void:
	"""Clear the output log."""
	output_text.clear()
	_log_message("Log cleared", "info")


# UI update methods


func _update_state_display() -> void:
	"""Update the current state display labels."""
	var tool: String = toolbar.get_active_tool()
	var terrain: int = toolbar.get_selected_terrain()
	var brush: int = toolbar.get_brush_size()
	var edge: int = toolbar.get_edge_type()

	var terrain_name: String = TERRAIN_NAMES[terrain] if terrain < TERRAIN_NAMES.size() else "Unknown"
	var edge_name: String = EDGE_NAMES[edge] if edge < EDGE_NAMES.size() else "Unknown"

	tool_label.text = "Tool: %s" % tool
	terrain_label.text = "Terrain: %s (%d)" % [terrain_name, terrain]
	brush_label.text = "Brush: %d" % brush
	edge_label.text = "Edge: %s (%d)" % [edge_name, edge]


func _log_message(message: String, type: String = "info") -> void:
	"""Add a message to the output log with color coding.

	Args:
		message: The message text
		type: Message type - "info", "signal", "api", "result", "error"
	"""
	var color: String
	var prefix: String

	match type:
		"info":
			color = "gray"
			prefix = "[INFO]"
		"signal":
			color = "yellow"
			prefix = "[SIGNAL]"
		"api":
			color = "cyan"
			prefix = "[API]"
		"result":
			color = "green"
			prefix = "[RESULT]"
		"error":
			color = "red"
			prefix = "[ERROR]"
		_:
			color = "white"
			prefix = "[LOG]"

	var timestamp: String = Time.get_time_string_from_system()
	var formatted_message: String = "[color=%s]%s %s %s[/color]\n" % [color, timestamp, prefix, message]

	output_text.append_text(formatted_message)


# Keyboard shortcut testing


func _input(event: InputEvent) -> void:
	"""Test keyboard shortcuts for tool selection."""
	if not event is InputEventKey:
		return

	var key_event: InputEventKey = event as InputEventKey
	if not key_event.pressed or key_event.echo:
		return

	# Tool shortcuts (no modifiers)
	if not key_event.ctrl_pressed and not key_event.shift_pressed and not key_event.alt_pressed:
		match key_event.keycode:
			KEY_P:
				_log_message("KEYBOARD: P pressed -> Paint tool", "info")
				toolbar.set_active_tool("paint")
				get_viewport().set_input_as_handled()
			KEY_F:
				_log_message("KEYBOARD: F pressed -> Fill tool", "info")
				toolbar.set_active_tool("fill")
				get_viewport().set_input_as_handled()
			KEY_X:
				_log_message("KEYBOARD: X pressed -> Erase tool", "info")
				toolbar.set_active_tool("erase")
				get_viewport().set_input_as_handled()
			KEY_E:
				_log_message("KEYBOARD: E pressed -> Edge tool", "info")
				toolbar.set_active_tool("edge")
				get_viewport().set_input_as_handled()
			KEY_I:
				_log_message("KEYBOARD: I pressed -> POI tool", "info")
				toolbar.set_active_tool("poi")
				get_viewport().set_input_as_handled()
			KEY_R:
				_log_message("KEYBOARD: R pressed -> Region tool", "info")
				toolbar.set_active_tool("region")
				get_viewport().set_input_as_handled()
			KEY_S:
				_log_message("KEYBOARD: S pressed -> Select tool", "info")
				toolbar.set_active_tool("select")
				get_viewport().set_input_as_handled()

			# Terrain selection (0-9)
			KEY_0, KEY_1, KEY_2, KEY_3, KEY_4, KEY_5, KEY_6, KEY_7, KEY_8, KEY_9:
				var terrain_id: int = key_event.keycode - KEY_0
				if terrain_id < TERRAIN_NAMES.size():
					_log_message("KEYBOARD: %d pressed -> %s terrain" % [terrain_id, TERRAIN_NAMES[terrain_id]], "info")
					toolbar.set_terrain(terrain_id)
					get_viewport().set_input_as_handled()

			# Brush size adjustment
			KEY_BRACKETLEFT:  # [
				var current_size: int = toolbar.get_brush_size()
				var new_size: int = max(1, current_size - 1)
				_log_message("KEYBOARD: [ pressed -> Brush size %d" % new_size, "info")
				toolbar.set_brush_size(new_size)
				get_viewport().set_input_as_handled()
			KEY_BRACKETRIGHT:  # ]
				var current_size: int = toolbar.get_brush_size()
				var new_size: int = min(5, current_size + 1)
				_log_message("KEYBOARD: ] pressed -> Brush size %d" % new_size, "info")
				toolbar.set_brush_size(new_size)
				get_viewport().set_input_as_handled()


# Automated test sequence (optional)


func _run_automated_tests() -> void:
	"""Run an automated test sequence (call this if needed)."""
	_log_message("=== Starting Automated Test Sequence ===", "info")

	await get_tree().create_timer(1.0).timeout
	_log_message("Test 1: Cycle through all tools", "info")
	for tool in ["paint", "fill", "erase", "edge", "poi", "region", "select"]:
		toolbar.set_active_tool(tool)
		await get_tree().create_timer(0.5).timeout

	await get_tree().create_timer(1.0).timeout
	_log_message("Test 2: Cycle through terrains", "info")
	for terrain_id in range(TERRAIN_NAMES.size()):
		toolbar.set_terrain(terrain_id)
		await get_tree().create_timer(0.3).timeout

	await get_tree().create_timer(1.0).timeout
	_log_message("Test 3: Adjust brush size", "info")
	for size in range(1, 6):
		toolbar.set_brush_size(size)
		await get_tree().create_timer(0.3).timeout

	await get_tree().create_timer(1.0).timeout
	_log_message("Test 4: Cycle edge types", "info")
	for edge_id in range(EDGE_NAMES.size()):
		toolbar.set_edge_type(edge_id)
		await get_tree().create_timer(0.5).timeout

	_log_message("=== Automated Test Sequence Complete ===", "info")


# Uncomment to run automated tests on startup
# func _ready() -> void:
# 	super._ready()
# 	_run_automated_tests()
