extends Control
## EditorLayout - Main layout manager for the hex map editor
## Manages resizable docks, panel visibility, and layout persistence

# Menu references
@onready var file_menu: MenuButton = %FileMenu
@onready var edit_menu: MenuButton = %EditMenu
@onready var view_menu: MenuButton = %ViewMenu
@onready var tools_menu: MenuButton = %ToolsMenu

# Main layout containers
@onready var main_split: HSplitContainer = %MainSplit
@onready var left_dock: VSplitContainer = %LeftDock
@onready var right_dock: VSplitContainer = %RightDock
@onready var center_area: Control = %CenterArea

# Left dock panels
@onready var tool_palette: PanelContainer = %ToolPalette
@onready var quick_actions: PanelContainer = %QuickActions
@onready var terrain_palette: GridContainer = %TerrainPalette

# Right dock panels
@onready var inspector: PanelContainer = %Inspector
@onready var minimap: PanelContainer = %Minimap

# Bottom bar
@onready var bottom_bar: HBoxContainer = %BottomBar
@onready var tool_indicator: Label = %ToolIndicator
@onready var terrain_selector: OptionButton = %TerrainSelector
@onready var brush_size: HSlider = %BrushSize
@onready var brush_label: Label = %BrushLabel
@onready var status_info: Label = %StatusInfo

# Inspector controls
@onready var inspector_coords_label: Label = %CoordsLabel
@onready var inspector_terrain_selector: OptionButton = get_node("%Inspector/VBox/ScrollContainer/PropertiesVBox/TerrainSelector")
@onready var inspector_elevation_label: Label = %ElevationLabel
@onready var inspector_elevation_slider: HSlider = %ElevationSlider
@onready var inspector_region_selector: OptionButton = get_node("%Inspector/VBox/ScrollContainer/PropertiesVBox/RegionSelector")
@onready var inspector_name_edit: LineEdit = %NameEdit
@onready var inspector_desc_edit: TextEdit = %DescEdit
@onready var inspector_apply_btn: Button = %ApplyBtn

# Minimap controls
@onready var minimap_rect: ColorRect = %MinimapRect
@onready var minimap_reset_zoom_btn: Button = %ResetZoomBtn
@onready var minimap_center_btn: Button = %CenterBtn

# Tool buttons
@onready var tool_paint_btn: Button = %ToolPaintBtn
@onready var tool_fill_btn: Button = %ToolFillBtn
@onready var tool_erase_btn: Button = %ToolEraseBtn
@onready var tool_edge_btn: Button = %ToolEdgeBtn
@onready var tool_poi_btn: Button = %ToolPoiBtn
@onready var tool_region_btn: Button = %ToolRegionBtn
@onready var tool_select_btn: Button = %ToolSelectBtn

# Quick action buttons
@onready var expand_btn: Button = %ExpandBtn
@onready var noise_fill_btn: Button = %NoiseFillBtn
@onready var smooth_elevation_btn: Button = %SmoothElevationBtn
@onready var ridge_btn: Button = %RidgeBtn
@onready var river_btn: Button = %RiverBtn
@onready var save_stamp_btn: Button = %SaveStampBtn
@onready var load_stamp_btn: Button = %LoadStampBtn

# Configuration
const CONFIG_PATH: String = "user://editor_layout.cfg"
const DEFAULT_LEFT_DOCK_WIDTH: int = 220
const DEFAULT_RIGHT_DOCK_WIDTH: int = 250
const DEFAULT_TOOL_PALETTE_HEIGHT: int = 400
const DEFAULT_INSPECTOR_HEIGHT: int = 400

# State
var config: ConfigFile = ConfigFile.new()
var left_dock_visible: bool = true
var right_dock_visible: bool = true


func _ready() -> void:
	_setup_menus()
	_load_layout_config()
	_connect_signals()
	_setup_keyboard_shortcuts()


func _setup_menus() -> void:
	# Connect menu item selections
	file_menu.get_popup().id_pressed.connect(_on_file_menu_id_pressed)
	edit_menu.get_popup().id_pressed.connect(_on_edit_menu_id_pressed)
	view_menu.get_popup().id_pressed.connect(_on_view_menu_id_pressed)
	tools_menu.get_popup().id_pressed.connect(_on_tools_menu_id_pressed)


func _connect_signals() -> void:
	# Brush size slider
	brush_size.value_changed.connect(_on_brush_size_changed)

	# Split container resizing - save on change
	main_split.dragged.connect(_on_split_dragged.bind("main_split"))
	left_dock.dragged.connect(_on_split_dragged.bind("left_dock"))
	right_dock.dragged.connect(_on_split_dragged.bind("right_dock"))


func _setup_keyboard_shortcuts() -> void:
	# Keyboard shortcuts are handled via menu accelerators and _unhandled_key_input
	pass


func _unhandled_key_input(event: InputEvent) -> void:
	if event.is_pressed() and not event.is_echo():
		# Toggle left dock (key: 1)
		if event.keycode == KEY_1:
			toggle_left_dock()
			get_viewport().set_input_as_handled()

		# Toggle right dock (key: 2)
		elif event.keycode == KEY_2:
			toggle_right_dock()
			get_viewport().set_input_as_handled()


# Menu callbacks
func _on_file_menu_id_pressed(id: int) -> void:
	match id:
		0: # New Map
			file_menu_new_map_requested.emit()
		1: # Open
			file_menu_open_requested.emit()
		2: # Save
			file_menu_save_requested.emit()
		3: # Save As
			file_menu_save_as_requested.emit()
		4: # Recent
			pass # Submenu handled elsewhere
		6: # Quit
			file_menu_quit_requested.emit()


func _on_edit_menu_id_pressed(id: int) -> void:
	match id:
		0: # Undo
			edit_menu_undo_requested.emit()
		1: # Redo
			edit_menu_redo_requested.emit()
		3: # Copy
			edit_menu_copy_requested.emit()
		4: # Paste
			edit_menu_paste_requested.emit()


func _on_view_menu_id_pressed(id: int) -> void:
	match id:
		0: # Toggle Left Dock
			toggle_left_dock()
		1: # Toggle Right Dock
			toggle_right_dock()
		3: # Show Grid
			var popup: PopupMenu = view_menu.get_popup()
			var current: bool = popup.is_item_checked(3)
			popup.set_item_checked(3, not current)
			view_menu_toggle_grid.emit(not current)
		4: # Show Coordinates
			var popup: PopupMenu = view_menu.get_popup()
			var current: bool = popup.is_item_checked(4)
			popup.set_item_checked(4, not current)
			view_menu_toggle_coords.emit(not current)
		5: # Show Hex Grid
			var popup: PopupMenu = view_menu.get_popup()
			var current: bool = popup.is_item_checked(5)
			popup.set_item_checked(5, not current)
			view_menu_toggle_hex_grid.emit(not current)
		7: # Reset Layout
			reset_layout()


func _on_tools_menu_id_pressed(id: int) -> void:
	match id:
		0: # Validate Map
			tools_menu_validate_requested.emit()
		2: # Export Runtime
			tools_menu_export_requested.emit()
		3: # Import Runtime
			tools_menu_import_requested.emit()
		5: # Noise Fill
			tools_menu_noise_fill_requested.emit()


func _on_brush_size_changed(value: float) -> void:
	brush_label.text = "Brush: %d" % int(value)
	brush_size_changed.emit(int(value))


func _on_split_dragged(offset: int, split_name: String) -> void:
	# Save split positions when dragged
	_save_layout_config()


# Panel visibility management
func toggle_left_dock() -> void:
	left_dock_visible = not left_dock_visible
	left_dock.visible = left_dock_visible
	_save_layout_config()


func toggle_right_dock() -> void:
	right_dock_visible = not right_dock_visible
	right_dock.visible = right_dock_visible
	_save_layout_config()


func set_left_dock_visible(visible: bool) -> void:
	left_dock_visible = visible
	left_dock.visible = visible
	_save_layout_config()


func set_right_dock_visible(visible: bool) -> void:
	right_dock_visible = visible
	right_dock.visible = visible
	_save_layout_config()


# Layout persistence
func _load_layout_config() -> void:
	var err: Error = config.load(CONFIG_PATH)
	if err != OK:
		# Config doesn't exist, use defaults
		_apply_default_layout()
		return

	# Load dock visibility
	left_dock_visible = config.get_value("layout", "left_dock_visible", true)
	right_dock_visible = config.get_value("layout", "right_dock_visible", true)
	left_dock.visible = left_dock_visible
	right_dock.visible = right_dock_visible

	# Load split positions
	var main_split_offset: int = config.get_value("layout", "main_split_offset", DEFAULT_LEFT_DOCK_WIDTH)
	var left_dock_split_offset: int = config.get_value("layout", "left_dock_split_offset", DEFAULT_TOOL_PALETTE_HEIGHT)
	var right_dock_split_offset: int = config.get_value("layout", "right_dock_split_offset", DEFAULT_INSPECTOR_HEIGHT)

	# Apply split offsets (needs to be deferred to ensure proper layout)
	await get_tree().process_frame
	main_split.split_offset = main_split_offset
	left_dock.split_offset = left_dock_split_offset
	right_dock.split_offset = right_dock_split_offset


func _save_layout_config() -> void:
	# Save dock visibility
	config.set_value("layout", "left_dock_visible", left_dock_visible)
	config.set_value("layout", "right_dock_visible", right_dock_visible)

	# Save split positions
	config.set_value("layout", "main_split_offset", main_split.split_offset)
	config.set_value("layout", "left_dock_split_offset", left_dock.split_offset)
	config.set_value("layout", "right_dock_split_offset", right_dock.split_offset)

	var err: Error = config.save(CONFIG_PATH)
	if err != OK:
		push_error("Failed to save layout config: " + error_string(err))


func _apply_default_layout() -> void:
	left_dock_visible = true
	right_dock_visible = true
	left_dock.visible = true
	right_dock.visible = true

	# Set default split positions
	await get_tree().process_frame
	main_split.split_offset = DEFAULT_LEFT_DOCK_WIDTH
	left_dock.split_offset = DEFAULT_TOOL_PALETTE_HEIGHT
	right_dock.split_offset = DEFAULT_INSPECTOR_HEIGHT


func reset_layout() -> void:
	_apply_default_layout()
	_save_layout_config()
	layout_reset.emit()


# Public API for updating UI elements
func set_tool_indicator(tool_name: String) -> void:
	tool_indicator.text = "Tool: " + tool_name


func set_status_info(hex_count: int, hover_coords: Vector2i) -> void:
	status_info.text = "Hexes: %d | Hover: (%d, %d)" % [hex_count, hover_coords.x, hover_coords.y]


func update_inspector_hex(coords: Vector2i, terrain: String, elevation: int, region: String, hex_name: String, description: String) -> void:
	inspector_coords_label.text = "Coords: (%d, %d)" % [coords.x, coords.y]
	# Terrain selector update would need terrain list index
	inspector_elevation_label.text = "Elevation: %d" % elevation
	inspector_elevation_slider.value = elevation
	# Region selector update would need region list index
	inspector_name_edit.text = hex_name
	inspector_desc_edit.text = description


func clear_inspector() -> void:
	inspector_coords_label.text = "Coords: None"
	inspector_elevation_label.text = "Elevation: 0"
	inspector_elevation_slider.value = 0
	inspector_name_edit.text = ""
	inspector_desc_edit.text = ""


func get_center_area() -> Control:
	return center_area


# Signals for menu actions
signal file_menu_new_map_requested()
signal file_menu_open_requested()
signal file_menu_save_requested()
signal file_menu_save_as_requested()
signal file_menu_quit_requested()

signal edit_menu_undo_requested()
signal edit_menu_redo_requested()
signal edit_menu_copy_requested()
signal edit_menu_paste_requested()

signal view_menu_toggle_grid(enabled: bool)
signal view_menu_toggle_coords(enabled: bool)
signal view_menu_toggle_hex_grid(enabled: bool)

signal tools_menu_validate_requested()
signal tools_menu_export_requested()
signal tools_menu_import_requested()
signal tools_menu_noise_fill_requested()

signal brush_size_changed(size: int)
signal layout_reset()
