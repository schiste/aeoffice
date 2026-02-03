extends HBoxContainer
## Icon-based toolbar for hex map editor tools
##
## Provides a compact, icon-based interface for tool selection with:
## - Tool buttons grouped by function (Paint/Fill/Erase, Edge/POI/Region, Select)
## - Mutually exclusive tool selection via ButtonGroup
## - Tooltips explaining each tool
## - Signals for tool changes and configuration updates

# Signals
signal tool_changed(tool_name: String)
signal terrain_changed(terrain_id: int)
signal brush_size_changed(size: int)
signal edge_type_changed(edge_id: int)

# Tool names enum
enum Tool {
	PAINT,
	FILL,
	ERASE,
	EDGE,
	POI,
	REGION,
	SELECT
}

# Current active tool
var _current_tool: Tool = Tool.PAINT

# ButtonGroup for mutually exclusive tool selection
var _tool_button_group: ButtonGroup = ButtonGroup.new()

# Tool button references
@onready var _paint_btn: Button = %PaintBtn
@onready var _fill_btn: Button = %FillBtn
@onready var _erase_btn: Button = %EraseBtn
@onready var _edge_btn: Button = %EdgeBtn
@onready var _poi_btn: Button = %PoiBtn
@onready var _region_btn: Button = %RegionBtn
@onready var _select_btn: Button = %SelectBtn

# Other UI references
@onready var _terrain_selector: OptionButton = %TerrainSelector
@onready var _brush_label: Label = %BrushLabel
@onready var _brush_slider: HSlider = %BrushSlider
@onready var _edge_selector: OptionButton = %EdgeSelector


func _ready() -> void:
	_setup_tool_buttons()
	_connect_signals()
	_try_load_editor_icons()


func _setup_tool_buttons() -> void:
	"""Configure tool buttons with ButtonGroup for mutual exclusivity."""
	var tool_buttons: Array[Button] = [
		_paint_btn,
		_fill_btn,
		_erase_btn,
		_edge_btn,
		_poi_btn,
		_region_btn,
		_select_btn
	]

	for btn: Button in tool_buttons:
		btn.button_group = _tool_button_group


func _connect_signals() -> void:
	"""Connect UI element signals to handlers."""
	# Tool buttons
	_paint_btn.toggled.connect(_on_tool_toggled.bind("paint", Tool.PAINT))
	_fill_btn.toggled.connect(_on_tool_toggled.bind("fill", Tool.FILL))
	_erase_btn.toggled.connect(_on_tool_toggled.bind("erase", Tool.ERASE))
	_edge_btn.toggled.connect(_on_tool_toggled.bind("edge", Tool.EDGE))
	_poi_btn.toggled.connect(_on_tool_toggled.bind("poi", Tool.POI))
	_region_btn.toggled.connect(_on_tool_toggled.bind("region", Tool.REGION))
	_select_btn.toggled.connect(_on_tool_toggled.bind("select", Tool.SELECT))

	# Other controls
	_terrain_selector.item_selected.connect(_on_terrain_selected)
	_brush_slider.value_changed.connect(_on_brush_size_changed)
	_edge_selector.item_selected.connect(_on_edge_type_selected)


func _try_load_editor_icons() -> void:
	"""Attempt to load Godot editor icons for tool buttons.

	Falls back to Unicode emoji if editor icons are unavailable.
	This method tries to access EditorInterface, which is only available
	when running in the Godot editor with EditorPlugin context.
	"""
	# Note: EditorInterface is only available in EditorPlugin context
	# For now, we use Unicode emoji as fallbacks
	# In a full EditorPlugin implementation, you would access icons via:
	# var editor_interface: EditorInterface = get_editor_interface()
	# var icon: Texture2D = editor_interface.get_base_control().get_theme_icon("Edit", "EditorIcons")

	# Map tools to potential editor icon names
	var icon_mapping: Dictionary = {
		"paint": "Edit",
		"fill": "Bucket",
		"erase": "Remove",
		"edge": "CurveLinear",
		"poi": "Pin",
		"region": "WorldEnvironment",
		"select": "ToolSelect"
	}

	# For standalone scene, keep Unicode emoji
	# If running as EditorPlugin, icons would be loaded here
	pass


func _on_tool_toggled(pressed: bool, tool_name: String, tool_enum: Tool) -> void:
	"""Handle tool button toggle events."""
	if pressed:
		_current_tool = tool_enum
		tool_changed.emit(tool_name)


func _on_terrain_selected(index: int) -> void:
	"""Handle terrain selector change."""
	var terrain_id: int = _terrain_selector.get_item_id(index)
	terrain_changed.emit(terrain_id)


func _on_brush_size_changed(value: float) -> void:
	"""Handle brush size slider change."""
	var size: int = int(value)
	_brush_label.text = "Brush: %d" % size
	brush_size_changed.emit(size)


func _on_edge_type_selected(index: int) -> void:
	"""Handle edge type selector change."""
	var edge_id: int = _edge_selector.get_item_id(index)
	edge_type_changed.emit(edge_id)


# Public API methods


func set_active_tool(tool_name: String) -> void:
	"""Programmatically set the active tool.

	Args:
		tool_name: One of "paint", "fill", "erase", "edge", "poi", "region", "select"
	"""
	match tool_name.to_lower():
		"paint":
			_paint_btn.button_pressed = true
		"fill":
			_fill_btn.button_pressed = true
		"erase":
			_erase_btn.button_pressed = true
		"edge":
			_edge_btn.button_pressed = true
		"poi":
			_poi_btn.button_pressed = true
		"region":
			_region_btn.button_pressed = true
		"select":
			_select_btn.button_pressed = true
		_:
			push_warning("Unknown tool name: %s" % tool_name)


func get_active_tool() -> String:
	"""Get the currently active tool name."""
	match _current_tool:
		Tool.PAINT:
			return "paint"
		Tool.FILL:
			return "fill"
		Tool.ERASE:
			return "erase"
		Tool.EDGE:
			return "edge"
		Tool.POI:
			return "poi"
		Tool.REGION:
			return "region"
		Tool.SELECT:
			return "select"
		_:
			return "paint"


func get_selected_terrain() -> int:
	"""Get the currently selected terrain ID."""
	var index: int = _terrain_selector.selected
	return _terrain_selector.get_item_id(index)


func get_brush_size() -> int:
	"""Get the current brush size value."""
	return int(_brush_slider.value)


func get_edge_type() -> int:
	"""Get the currently selected edge type ID."""
	var index: int = _edge_selector.selected
	return _edge_selector.get_item_id(index)


func set_brush_size(size: int) -> void:
	"""Set the brush size programmatically."""
	_brush_slider.value = clamp(size, _brush_slider.min_value, _brush_slider.max_value)


func set_terrain(terrain_id: int) -> void:
	"""Set the selected terrain programmatically."""
	for i: int in _terrain_selector.item_count:
		if _terrain_selector.get_item_id(i) == terrain_id:
			_terrain_selector.selected = i
			break


func set_edge_type(edge_id: int) -> void:
	"""Set the selected edge type programmatically."""
	for i: int in _edge_selector.item_count:
		if _edge_selector.get_item_id(i) == edge_id:
			_edge_selector.selected = i
			break
