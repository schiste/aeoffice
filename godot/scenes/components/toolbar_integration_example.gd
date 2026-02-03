extends Control
## Example integration of the new toolbar component into editor_ui.gd
##
## This file demonstrates how to:
## 1. Instance the toolbar scene
## 2. Connect toolbar signals to editor functionality
## 3. Handle tool state changes
## 4. Synchronize toolbar state with editor state

# Reference to the toolbar component
@onready var toolbar: HBoxContainer = $TopBar  # Or wherever you place it

# Reference to the hex editor
@onready var hex_editor: Node2D = $"../HexEditor"

# Current editor state
var _current_tool: String = "paint"
var _current_terrain: int = 0
var _current_brush_size: int = 1
var _current_edge_type: int = 0


func _ready() -> void:
	_connect_toolbar_signals()
	_setup_initial_toolbar_state()
	_setup_keyboard_shortcuts()


func _connect_toolbar_signals() -> void:
	"""Connect all toolbar signals to their handlers."""
	toolbar.tool_changed.connect(_on_toolbar_tool_changed)
	toolbar.terrain_changed.connect(_on_toolbar_terrain_changed)
	toolbar.brush_size_changed.connect(_on_toolbar_brush_size_changed)
	toolbar.edge_type_changed.connect(_on_toolbar_edge_type_changed)


func _setup_initial_toolbar_state() -> void:
	"""Initialize toolbar to match editor defaults."""
	toolbar.set_active_tool("paint")
	toolbar.set_terrain(0)  # Studio
	toolbar.set_brush_size(1)
	toolbar.set_edge_type(0)  # River


func _setup_keyboard_shortcuts() -> void:
	"""Set up keyboard shortcuts for tool selection."""
	# These would be implemented in _input() or _unhandled_input()
	pass


# Signal handlers


func _on_toolbar_tool_changed(tool_name: String) -> void:
	"""Handle tool selection change from toolbar.

	Args:
		tool_name: One of "paint", "fill", "erase", "edge", "poi", "region", "select"
	"""
	_current_tool = tool_name

	# Update hex editor tool mode
	if hex_editor and hex_editor.has_method("set_tool"):
		hex_editor.set_tool(tool_name)

	# Update UI feedback
	_update_status_bar()

	# Show/hide tool-specific panels
	match tool_name:
		"poi":
			_show_poi_panel()
		"region":
			_show_region_panel()
		"select":
			_show_selection_panel()
		_:
			_hide_special_panels()

	# Log for debugging
	print("Tool changed to: %s" % tool_name)


func _on_toolbar_terrain_changed(terrain_id: int) -> void:
	"""Handle terrain selection change from toolbar.

	Args:
		terrain_id: The ID of the selected terrain type (0-9)
	"""
	_current_terrain = terrain_id

	# Update hex editor
	if hex_editor and hex_editor.has_method("set_terrain"):
		hex_editor.current_terrain = terrain_id

	_update_status_bar()
	print("Terrain changed to: %d" % terrain_id)


func _on_toolbar_brush_size_changed(size: int) -> void:
	"""Handle brush size change from toolbar.

	Args:
		size: Brush size value (1-5)
	"""
	_current_brush_size = size

	# Update hex editor
	if hex_editor and hex_editor.has_method("set_brush_size"):
		hex_editor.brush_size = size

	_update_status_bar()
	print("Brush size changed to: %d" % size)


func _on_toolbar_edge_type_changed(edge_id: int) -> void:
	"""Handle edge type selection change from toolbar.

	Args:
		edge_id: The ID of the selected edge type (0=River, 1=Road, 2=Wall)
	"""
	_current_edge_type = edge_id

	# Update hex editor
	if hex_editor and hex_editor.has_method("set_edge_type"):
		hex_editor.current_edge_type = edge_id

	var edge_names: PackedStringArray = ["River", "Road", "Wall"]
	print("Edge type changed to: %s" % edge_names[edge_id])


# UI update methods


func _update_status_bar() -> void:
	"""Update the status bar with current tool/brush info."""
	var status_label: Label = %StatusLabel
	if not status_label:
		return

	var terrain_names: PackedStringArray = [
		"Studio", "Plains", "Water", "Forest", "Hills",
		"Mountain", "Cave Entrance", "Swamp", "Desert", "Ruins"
	]

	var tool_display: String = _current_tool.capitalize()
	var terrain_display: String = terrain_names[_current_terrain]

	status_label.text = "world.json | [%s] %s | Brush:%d" % [
		tool_display,
		terrain_display if _current_tool == "paint" else "",
		_current_brush_size
	]


func _show_poi_panel() -> void:
	"""Show POI editor panel when POI tool is selected."""
	var poi_panel: PanelContainer = %PoiPanel
	if poi_panel:
		poi_panel.visible = true


func _show_region_panel() -> void:
	"""Show region editor panel when Region tool is selected."""
	# Implementation depends on your UI layout
	pass


func _show_selection_panel() -> void:
	"""Show selection tools panel when Select tool is active."""
	# Implementation depends on your UI layout
	pass


func _hide_special_panels() -> void:
	"""Hide tool-specific panels when switching to basic tools."""
	var poi_panel: PanelContainer = %PoiPanel
	if poi_panel:
		poi_panel.visible = false
	# Hide other special panels as needed


# Keyboard shortcut handling


func _input(event: InputEvent) -> void:
	"""Handle keyboard shortcuts for tool selection."""
	if not event is InputEventKey:
		return

	var key_event: InputEventKey = event as InputEventKey
	if not key_event.pressed or key_event.echo:
		return

	# Tool shortcuts (no modifiers)
	if not key_event.ctrl_pressed and not key_event.shift_pressed and not key_event.alt_pressed:
		match key_event.keycode:
			KEY_P:
				toolbar.set_active_tool("paint")
				get_viewport().set_input_as_handled()
			KEY_F:
				toolbar.set_active_tool("fill")
				get_viewport().set_input_as_handled()
			KEY_X:
				toolbar.set_active_tool("erase")
				get_viewport().set_input_as_handled()
			KEY_E:
				toolbar.set_active_tool("edge")
				get_viewport().set_input_as_handled()
			KEY_I:
				toolbar.set_active_tool("poi")
				get_viewport().set_input_as_handled()
			KEY_R:
				toolbar.set_active_tool("region")
				get_viewport().set_input_as_handled()
			KEY_S:
				toolbar.set_active_tool("select")
				get_viewport().set_input_as_handled()

			# Terrain selection (0-9)
			KEY_0, KEY_1, KEY_2, KEY_3, KEY_4, KEY_5, KEY_6, KEY_7, KEY_8, KEY_9:
				var terrain_id: int = key_event.keycode - KEY_0
				if terrain_id < 10:  # Assuming 10 terrain types
					toolbar.set_terrain(terrain_id)
					get_viewport().set_input_as_handled()

			# Brush size adjustment
			KEY_BRACKETLEFT:  # [
				var new_size: int = max(1, _current_brush_size - 1)
				toolbar.set_brush_size(new_size)
				get_viewport().set_input_as_handled()
			KEY_BRACKETRIGHT:  # ]
				var new_size: int = min(5, _current_brush_size + 1)
				toolbar.set_brush_size(new_size)
				get_viewport().set_input_as_handled()


# Public API for external control


func get_toolbar() -> HBoxContainer:
	"""Get reference to the toolbar component."""
	return toolbar


func sync_toolbar_state(tool: String, terrain: int, brush_size: int, edge_type: int) -> void:
	"""Synchronize toolbar state with external editor state.

	Useful when loading a saved editor session or undo/redo operations.

	Args:
		tool: Tool name to activate
		terrain: Terrain ID to select
		brush_size: Brush size to set
		edge_type: Edge type to select
	"""
	toolbar.set_active_tool(tool)
	toolbar.set_terrain(terrain)
	toolbar.set_brush_size(brush_size)
	toolbar.set_edge_type(edge_type)

	# Update internal state
	_current_tool = tool
	_current_terrain = terrain
	_current_brush_size = brush_size
	_current_edge_type = edge_type

	_update_status_bar()


func get_editor_state() -> Dictionary:
	"""Get current editor state from toolbar.

	Returns:
		Dictionary with keys: tool, terrain, brush_size, edge_type
	"""
	return {
		"tool": toolbar.get_active_tool(),
		"terrain": toolbar.get_selected_terrain(),
		"brush_size": toolbar.get_brush_size(),
		"edge_type": toolbar.get_edge_type()
	}


# Example: Saving and loading editor state


func save_editor_state() -> void:
	"""Save current editor state to user preferences or file."""
	var state: Dictionary = get_editor_state()

	# Save to ConfigFile or JSON
	var config: ConfigFile = ConfigFile.new()
	config.set_value("editor", "tool", state.tool)
	config.set_value("editor", "terrain", state.terrain)
	config.set_value("editor", "brush_size", state.brush_size)
	config.set_value("editor", "edge_type", state.edge_type)
	config.save("user://editor_state.cfg")

	print("Editor state saved")


func load_editor_state() -> void:
	"""Load editor state from user preferences or file."""
	var config: ConfigFile = ConfigFile.new()
	var err: Error = config.load("user://editor_state.cfg")

	if err != OK:
		print("No saved editor state found")
		return

	var tool: String = config.get_value("editor", "tool", "paint")
	var terrain: int = config.get_value("editor", "terrain", 0)
	var brush_size: int = config.get_value("editor", "brush_size", 1)
	var edge_type: int = config.get_value("editor", "edge_type", 0)

	sync_toolbar_state(tool, terrain, brush_size, edge_type)
	print("Editor state loaded")


# Example: Undo/Redo integration


func _on_undo_performed() -> void:
	"""Called when undo is performed - resync toolbar if tool changed."""
	# Get state from undo manager
	var restored_state: Dictionary = {}  # Get from your undo system

	if restored_state.has("tool"):
		toolbar.set_active_tool(restored_state.tool)
	if restored_state.has("terrain"):
		toolbar.set_terrain(restored_state.terrain)
	if restored_state.has("brush_size"):
		toolbar.set_brush_size(restored_state.brush_size)


func _on_redo_performed() -> void:
	"""Called when redo is performed - resync toolbar if tool changed."""
	# Same as undo, get state from redo stack
	pass
