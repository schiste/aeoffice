extends Control
## Editor UI - Connects toolbar buttons to HexEditor with full feature set

const TERRAINS := ["studio", "plains", "water", "forest", "hills", "mountain", "cave_entrance", "swamp", "desert", "ruins"]
const EDGE_TYPES := ["river", "road", "wall"]

var hex_editor: Node2D = null
@onready var left_tabs: TabContainer = $LeftPanel/LeftTabs

# Top bar elements
@onready var terrain_selector: OptionButton = %TerrainSelector
@onready var show_grid_check: CheckBox = %ShowGridCheck
@onready var show_coords_check: CheckBox = %ShowCoordsCheck
@onready var show_hex_grid_check: CheckBox = %ShowHexGridCheck
@onready var hex_count_label: Label = %HexCountLabel
@onready var coords_label: Label = %CoordsLabel
@onready var recent_selector: OptionButton = %RecentSelector
@onready var help_btn: Button = %HelpBtn
@onready var toast_label: Label = %ToastLabel
@onready var save_as_btn: Button = %SaveAsBtn

# Tool buttons
@onready var tool_paint_btn: Button = %ToolPaintBtn
@onready var tool_fill_btn: Button = %ToolFillBtn
@onready var tool_erase_btn: Button = %ToolEraseBtn
@onready var tool_edge_btn: Button = %ToolEdgeBtn
@onready var tool_poi_btn: Button = %ToolPoiBtn
@onready var tool_region_btn: Button = %ToolRegionBtn
@onready var tool_select_btn: Button = %ToolSelectBtn

# Brush size
@onready var brush_size_label: Label = %BrushSizeLabel
@onready var brush_size_slider: HSlider = %BrushSizeSlider

# Edge selector
@onready var edge_selector: OptionButton = %EdgeSelector

# Panels
@onready var debug_label: Label = %DebugLabel
@onready var log_text: RichTextLabel = %LogText
@onready var status_label: Label = %StatusLabel

# POI Panel
@onready var poi_panel: PanelContainer = %PoiPanel
@onready var poi_name_edit: LineEdit = %PoiNameEdit
@onready var poi_desc_edit: TextEdit = %PoiDescEdit
@onready var poi_save_btn: Button = %PoiSaveBtn

# Minimap
@onready var minimap_rect: ColorRect = %MinimapRect

# Terrain palette
@onready var terrain_palette: GridContainer = %TerrainPalette

# Tools/Actions
@onready var noise_fill_btn: Button = %NoiseFillBtn
@onready var smooth_elevation_btn: Button = %SmoothElevationBtn
@onready var ridge_btn: Button = %RidgeBtn
@onready var river_btn: Button = %RiverBtn
@onready var export_btn: Button = %ExportBtn
@onready var import_map_btn: Button = %ImportMapBtn
@onready var save_stamp_btn: Button = %SaveStampBtn
@onready var load_stamp_btn: Button = %LoadStampBtn
@onready var ui_scale_slider: HSlider = %UiScaleSlider
@onready var high_contrast_check: CheckBox = %HighContrastCheck

# Inspector
@onready var inspector_terrain_selector: OptionButton = %InspectorTerrainSelector
@onready var inspector_elev_label: Label = %InspectorElevationLabel
@onready var inspector_elev_slider: HSlider = %InspectorElevationSlider
@onready var inspector_region_selector: OptionButton = %InspectorRegionSelector
@onready var inspector_name_edit: LineEdit = %InspectorNameEdit
@onready var inspector_desc_edit: TextEdit = %InspectorDescEdit
@onready var inspector_apply_btn: Button = %InspectorApplyBtn

# Layers
@onready var terrain_layer_visible: CheckBox = %TerrainLayerVisible
@onready var terrain_layer_lock: CheckBox = %TerrainLayerLock
@onready var elevation_layer_visible: CheckBox = %ElevationLayerVisible
@onready var elevation_layer_lock: CheckBox = %ElevationLayerLock
@onready var edges_layer_visible: CheckBox = %EdgesLayerVisible
@onready var edges_layer_lock: CheckBox = %EdgesLayerLock
@onready var poi_layer_visible: CheckBox = %PoiLayerVisible
@onready var poi_layer_lock: CheckBox = %PoiLayerLock
@onready var regions_layer_visible: CheckBox = %RegionsLayerVisible
@onready var regions_layer_lock: CheckBox = %RegionsLayerLock

# Regions
@onready var region_selector: OptionButton = %RegionSelector
@onready var region_name_edit: LineEdit = %RegionNameEdit
@onready var region_color_picker: ColorPickerButton = %RegionColorPicker
@onready var region_add_btn: Button = %RegionAddBtn
@onready var region_delete_btn: Button = %RegionDeleteBtn
@onready var region_goto_btn: Button = %RegionGoToBtn
@onready var region_apply_btn: Button = %RegionApplyBtn

# History
@onready var history_selector: OptionButton = %HistorySelector
@onready var undo_btn: Button = %UndoBtn
@onready var redo_btn: Button = %RedoBtn

# Validation
@onready var validate_btn2: Button = %ValidateBtn2
@onready var validation_text: RichTextLabel = %ValidationText

# Log history
var log_history: Array[String] = []
const MAX_LOG_LINES := 50

# File logging
var log_file: FileAccess = null
var log_file_path: String = ""
var _validation_dialog: AcceptDialog = null
var _autosave_dialog: ConfirmationDialog = null
var _save_dialog: FileDialog = null
var _load_dialog: FileDialog = null
var _export_dialog: FileDialog = null
var _import_runtime_dialog: FileDialog = null
var _stamp_save_dialog: FileDialog = null
var _stamp_load_dialog: FileDialog = null
var _help_dialog: AcceptDialog = null
var _toast_timer: Timer = null
var _recent_paths: Array[String] = []
const _RECENTS_PATH := "user://recent_maps.json"
const _SETTINGS_PATH := "user://hex_editor_settings.json"
const _AUTOSAVE_LATEST_PATH := "user://maps/autosave/world_autosave_001.json"


func _ready() -> void:
	# Initialize file logging
	_init_log_file()
	_init_toast()
	_load_recent_maps()
	_refresh_recent_selector()
	_load_settings()

	# Log to both print() and our log panel
	print("[EditorUI] _ready() starting...")
	_on_log_message("EditorUI _ready() starting...")

	# Defer hex_editor finding to ensure all nodes are ready
	_find_hex_editor.call_deferred()

	# Connect UI elements that don't depend on hex_editor
	_connect_ui_signals()


func _init_log_file() -> void:
	# Store logs in user:// so running the tool doesn't dirty the repo.
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("user://logs"))

	# Create log file with timestamp
	var datetime: Dictionary = Time.get_datetime_dict_from_system()
	log_file_path = "user://logs/session_%04d%02d%02d_%02d%02d%02d.log" % [
		datetime["year"], datetime["month"], datetime["day"],
		datetime["hour"], datetime["minute"], datetime["second"]
	]

	log_file = FileAccess.open(log_file_path, FileAccess.WRITE)
	if log_file:
		log_file.store_line("=== Hex Editor Session Log ===")
		log_file.store_line("Started: %s" % Time.get_datetime_string_from_system())
		log_file.store_line("================================\n")
		log_file.flush()
		print("[EditorUI] Log file created: ", log_file_path)
	else:
		print("[EditorUI] WARNING: Could not create log file")


func _exit_tree() -> void:
	# Close log file when scene exits
	if log_file:
		log_file.store_line("\n================================")
		log_file.store_line("Session ended: %s" % Time.get_datetime_string_from_system())
		log_file.close()
		log_file = null


func _find_hex_editor() -> void:
	# Find hex_editor - try multiple paths
	_on_log_message("Searching for HexEditor node...")
	print("[EditorUI] Searching for HexEditor...")

	# Try relative path first (UI -> CanvasLayer -> EditorScene -> HexEditor)
	hex_editor = get_node_or_null("../../HexEditor") as Node2D
	if hex_editor:
		_on_log_message("Found via ../../HexEditor")
		print("[EditorUI] Found via ../../HexEditor")
	else:
		_on_log_message("Not found at ../../HexEditor, trying absolute...")
		# Try absolute path
		hex_editor = get_node_or_null("/root/EditorScene/HexEditor") as Node2D
		if hex_editor:
			_on_log_message("Found via /root/EditorScene/HexEditor")
			print("[EditorUI] Found via /root/EditorScene/HexEditor")

	if not hex_editor:
		_on_log_message("ERROR: HexEditor not found!")
		print("[EditorUI] ERROR: Could not find HexEditor node!")
		# Print scene tree for debugging
		print("[EditorUI] My path: ", get_path())
		print("[EditorUI] Parent: ", get_parent().name if get_parent() else "null")
		if get_parent():
			print("[EditorUI] Parent's parent: ", get_parent().get_parent().name if get_parent().get_parent() else "null")
	else:
		_on_log_message("HexEditor found: %s (map_data size: %d)" % [hex_editor.name, hex_editor.map_data.size()])
		print("[EditorUI] HexEditor found with %d hexes" % hex_editor.map_data.size())

	# Connect hex_editor signals now that we have the reference
	_connect_hex_editor_signals()

	# Setup terrain palette (needs hex_editor for colors)
	_setup_terrain_palette()

	# Sync UI to current editor state (in case map/tool state came from a loaded file).
	_sync_ui_from_editor()

	# Update initial state
	_update_tool_buttons()
	_update_hex_count()
	_maybe_prompt_restore_autosave()

	_on_log_message("Editor UI initialization complete")


func _sync_ui_from_editor() -> void:
	if not hex_editor:
		return

	if show_grid_check:
		show_grid_check.button_pressed = hex_editor.show_grid
	if show_coords_check:
		show_coords_check.button_pressed = hex_editor.show_coords
	if show_hex_grid_check:
		show_hex_grid_check.button_pressed = hex_editor.show_hex_grid

	if brush_size_slider:
		brush_size_slider.value = float(hex_editor.brush_size)
	if brush_size_label:
		brush_size_label.text = "Brush: %d (%d)" % [hex_editor.brush_size, _brush_affected_count(hex_editor.brush_size)]

	if terrain_selector:
		var idx := TERRAINS.find(hex_editor.current_terrain)
		if idx >= 0:
			terrain_selector.select(idx)

	if edge_selector:
		var edge_idx := EDGE_TYPES.find(hex_editor.current_edge_type)
		if edge_idx >= 0:
			edge_selector.select(edge_idx)

	_setup_inspector_selectors()
	_refresh_regions_ui()
	_refresh_history_ui()
	_sync_layers_ui()


func _connect_ui_signals() -> void:

	# Connect basic signals
	if terrain_selector:
		terrain_selector.item_selected.connect(_on_terrain_selected)
	if show_grid_check:
		show_grid_check.toggled.connect(_on_show_grid_toggled)
	if show_coords_check:
		show_coords_check.toggled.connect(_on_show_coords_toggled)
	if show_hex_grid_check:
		show_hex_grid_check.toggled.connect(_on_show_hex_grid_toggled)
	if recent_selector:
		recent_selector.item_selected.connect(_on_recent_selected)
	if help_btn:
		help_btn.pressed.connect(_on_help_pressed)

	# Connect tool buttons
	if tool_paint_btn:
		tool_paint_btn.pressed.connect(_on_tool_paint)
	if tool_fill_btn:
		tool_fill_btn.pressed.connect(_on_tool_fill)
	if tool_erase_btn:
		tool_erase_btn.pressed.connect(_on_tool_erase)
	if tool_edge_btn:
		tool_edge_btn.pressed.connect(_on_tool_edge)
	if tool_poi_btn:
		tool_poi_btn.pressed.connect(_on_tool_poi)
	if tool_region_btn:
		tool_region_btn.pressed.connect(_on_tool_region)
	if tool_select_btn:
		tool_select_btn.pressed.connect(_on_tool_select)

	# Connect brush size
	if brush_size_slider:
		brush_size_slider.value_changed.connect(_on_brush_size_changed)

	# Connect edge selector
	if edge_selector:
		edge_selector.item_selected.connect(_on_edge_selected)

	# Connect action buttons
	var expand_btn := get_node_or_null("TopBar/ExpandBtn") as Button
	var save_btn := get_node_or_null("TopBar/SaveBtn") as Button
	var load_btn := get_node_or_null("TopBar/LoadBtn") as Button
	var validate_btn := get_node_or_null("TopBar/ValidateBtn") as Button
	var import_btn := get_node_or_null("TopBar/ImportBtn") as Button

	if expand_btn:
		expand_btn.pressed.connect(_on_expand_pressed)
	if save_btn:
		save_btn.pressed.connect(_on_save_pressed)
	if save_as_btn:
		save_as_btn.pressed.connect(_on_save_as_pressed)
	if load_btn:
		load_btn.pressed.connect(_on_load_pressed)
	if validate_btn:
		validate_btn.pressed.connect(_on_validate_pressed)
	if import_btn:
		import_btn.pressed.connect(_on_import_pressed)

	# Connect POI panel
	if poi_save_btn:
		poi_save_btn.pressed.connect(_on_poi_save)

	# Hide POI panel initially
	if poi_panel:
		poi_panel.visible = false

	# Inspector
	if inspector_elev_slider:
		inspector_elev_slider.value_changed.connect(_on_inspector_elevation_changed)
	if inspector_apply_btn:
		inspector_apply_btn.pressed.connect(_on_inspector_apply)

	# Layers
	if terrain_layer_visible:
		terrain_layer_visible.toggled.connect(_on_layer_visibility.bind("terrain"))
	if elevation_layer_visible:
		elevation_layer_visible.toggled.connect(_on_layer_visibility.bind("elevation"))
	if edges_layer_visible:
		edges_layer_visible.toggled.connect(_on_layer_visibility.bind("edges"))
	if poi_layer_visible:
		poi_layer_visible.toggled.connect(_on_layer_visibility.bind("poi"))
	if regions_layer_visible:
		regions_layer_visible.toggled.connect(_on_layer_visibility.bind("regions"))

	if terrain_layer_lock:
		terrain_layer_lock.toggled.connect(_on_layer_lock.bind("terrain"))
	if elevation_layer_lock:
		elevation_layer_lock.toggled.connect(_on_layer_lock.bind("elevation"))
	if edges_layer_lock:
		edges_layer_lock.toggled.connect(_on_layer_lock.bind("edges"))
	if poi_layer_lock:
		poi_layer_lock.toggled.connect(_on_layer_lock.bind("poi"))
	if regions_layer_lock:
		regions_layer_lock.toggled.connect(_on_layer_lock.bind("regions"))

	# Regions
	if region_selector:
		region_selector.item_selected.connect(_on_region_selected)
	if region_add_btn:
		region_add_btn.pressed.connect(_on_region_add)
	if region_delete_btn:
		region_delete_btn.pressed.connect(_on_region_delete)
	if region_apply_btn:
		region_apply_btn.pressed.connect(_on_region_apply)
	if region_goto_btn:
		region_goto_btn.pressed.connect(_on_region_goto)

	# History
	if history_selector:
		history_selector.item_selected.connect(_on_history_selected)
	if undo_btn:
		undo_btn.pressed.connect(_on_undo_pressed)
	if redo_btn:
		redo_btn.pressed.connect(_on_redo_pressed)

	# Validation
	if validate_btn2:
		validate_btn2.pressed.connect(_on_validate_pressed)
	if validation_text:
		validation_text.meta_clicked.connect(_on_validation_meta_clicked)

	# Actions
	if noise_fill_btn:
		noise_fill_btn.pressed.connect(_on_noise_fill_pressed)
	if smooth_elevation_btn:
		smooth_elevation_btn.pressed.connect(_on_smooth_elevation_pressed)
	if ridge_btn:
		ridge_btn.pressed.connect(_on_ridge_pressed)
	if river_btn:
		river_btn.pressed.connect(_on_river_pressed)
	if export_btn:
		export_btn.pressed.connect(_on_export_pressed)
	if import_map_btn:
		import_map_btn.pressed.connect(_on_import_map_pressed)
	if save_stamp_btn:
		save_stamp_btn.pressed.connect(_on_save_stamp_pressed)
	if load_stamp_btn:
		load_stamp_btn.pressed.connect(_on_load_stamp_pressed)
	if ui_scale_slider:
		ui_scale_slider.value_changed.connect(_on_ui_scale_changed)
	if high_contrast_check:
		high_contrast_check.toggled.connect(_on_high_contrast_toggled)

	# Reusable save/load dialogs (resource paths inside the project)
	if _save_dialog == null:
		_save_dialog = FileDialog.new()
		_save_dialog.file_mode = FileDialog.FILE_MODE_SAVE_FILE
		_save_dialog.access = FileDialog.ACCESS_RESOURCES
		_save_dialog.filters = PackedStringArray(["*.json ; JSON Map Files"])
		_save_dialog.file_selected.connect(_on_save_file_selected)
		add_child(_save_dialog)

	if _load_dialog == null:
		_load_dialog = FileDialog.new()
		_load_dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE
		_load_dialog.access = FileDialog.ACCESS_RESOURCES
		_load_dialog.filters = PackedStringArray(["*.json ; JSON Map Files"])
		_load_dialog.file_selected.connect(_on_load_file_selected)
		add_child(_load_dialog)


func _connect_hex_editor_signals() -> void:
	# Connect to hex_editor signals
	if hex_editor:
		_on_log_message("Connecting hex_editor signals...")
		print("[EditorUI] Connecting signals...")
		if hex_editor.has_signal("map_changed"):
			hex_editor.map_changed.connect(_on_map_changed)
			_on_log_message("  Connected map_changed")
		if hex_editor.has_signal("log_message"):
			hex_editor.log_message.connect(_on_log_message)
			_on_log_message("  Connected log_message")
		if hex_editor.has_signal("hex_selected"):
			hex_editor.hex_selected.connect(_on_hex_selected)
			_on_log_message("  Connected hex_selected")
		if hex_editor.has_signal("validation_result"):
			hex_editor.validation_result.connect(_on_validation_result)
			_on_log_message("  Connected validation_result")
		_on_log_message("Signal connections complete!")
	else:
		_on_log_message("WARNING: Cannot connect hex_editor signals - hex_editor is null!")

	# Provide the hex_editor reference to the minimap for stable wiring.
	if minimap_rect and minimap_rect.has_method("set_hex_editor"):
		minimap_rect.set_hex_editor(hex_editor)
	_on_map_changed()


func _process(_delta: float) -> void:
	if not hex_editor:
		# Still update debug label to show error state
		if debug_label:
			debug_label.text = "ERROR: hex_editor is null\nCheck scene structure."
		return

	# Update hover coordinates display
	if hex_editor.has_hover:
		var coord: Vector2i = hex_editor.hovered_hex
		var hex_data: Dictionary = hex_editor.get_hex(coord)
		var terrain: String = hex_data.get("terrain", "---")
		var elevation: int = hex_data.get("elevation", 0)
		coords_label.text = "(%d, %d) %s e:%+d" % [coord.x, coord.y, terrain, elevation]
	else:
		coords_label.text = "Hover: --"

	# Update debug info
	_update_debug_panel()

	# Update status bar
	_update_status_bar()

	# Update minimap
	_update_minimap()


func _update_debug_panel() -> void:
	if not debug_label:
		return

	# Show error state if hex_editor not found
	if not hex_editor:
		debug_label.text = """ERROR: HexEditor not found!

Tried paths:
  ../../HexEditor
  /root/EditorScene/HexEditor

Check scene tree structure.
UI node path: %s""" % get_path()
		return

	var bounds: Rect2i = hex_editor.get_map_bounds()
	var terrain_counts: Dictionary = hex_editor.get_terrain_counts()

	# Build terrain breakdown string
	var terrain_str := ""
	for terrain in terrain_counts.keys():
		terrain_str += "\n  %s: %d" % [terrain, terrain_counts[terrain]]

	# Get mouse position info
	var mouse_pos: Vector2 = get_viewport().get_mouse_position()
	var local_mouse: Vector2 = Vector2.ZERO
	if hex_editor:
		local_mouse = hex_editor.get_local_mouse_position()

	debug_label.text = """=== HEX EDITOR DEBUG ===
Hexes: %d | Edges: %d
Map bounds: q[%d,%d] r[%d,%d]

Camera offset: (%.0f, %.0f)
Hex size: %.1f px
Zoom range: 10-100

Current tool: %s
Brush size: %d
Current terrain: %s

Hover hex: (%d, %d)
Has hover: %s
Has selection: %s
Selected: (%d, %d)

Mouse (screen): (%.0f, %.0f)
Mouse (local): (%.0f, %.0f)

	Undo steps: %d
	Redo steps: %d
	Unsaved: %s

Terrain breakdown:%s""" % [
		hex_editor.map_data.size(),
		hex_editor.edge_data.size(),
		bounds.position.x, bounds.position.x + bounds.size.x - 1,
		bounds.position.y, bounds.position.y + bounds.size.y - 1,
		hex_editor.camera_offset.x,
		hex_editor.camera_offset.y,
		hex_editor.hex_size,
		_get_tool_name(hex_editor.current_tool),
		hex_editor.brush_size,
		hex_editor.current_terrain,
		hex_editor.hovered_hex.x, hex_editor.hovered_hex.y,
		str(hex_editor.has_hover),
		str(hex_editor.has_selection),
		hex_editor.selected_hex.x, hex_editor.selected_hex.y,
		mouse_pos.x, mouse_pos.y,
		local_mouse.x, local_mouse.y,
		hex_editor.get_history_index(),
		max(0, hex_editor.get_history_labels().size() - 1 - hex_editor.get_history_index()),
		str(hex_editor.has_unsaved_changes),
		terrain_str
	]


func _update_status_bar() -> void:
	if not status_label or not hex_editor:
		return

	var unsaved_marker: String = "*" if hex_editor.has_unsaved_changes else ""
	var last_save: String = hex_editor.last_save_time if hex_editor.last_save_time != "" else "never"
	var map_file: String = str(hex_editor.map_path).get_file()

	status_label.text = "%s%s | %d hexes | Last save: %s | [%s] Brush:%d | Terrain:%s" % [
		unsaved_marker,
		map_file,
		hex_editor.map_data.size(),
		last_save,
		_get_tool_name(hex_editor.current_tool),
		hex_editor.brush_size,
		hex_editor.current_terrain
	]


func _update_minimap() -> void:
	if not minimap_rect or not hex_editor:
		return

	# Trigger minimap redraw
	minimap_rect.queue_redraw()


func _get_tool_name(tool: int) -> String:
	match tool:
		0: return "Paint"
		1: return "Fill"
		2: return "Erase"
		3: return "Edge"
		4: return "POI"
		5: return "Region"
		6: return "Select"
		_: return "Unknown"


func _setup_terrain_palette() -> void:
	if not terrain_palette:
		return

	# Clear existing children
	for child in terrain_palette.get_children():
		child.queue_free()

	# Create terrain buttons
	for i in range(TERRAINS.size()):
		var terrain: String = TERRAINS[i]
		var btn := Button.new()
		btn.custom_minimum_size = Vector2(60, 30)
		btn.text = "%d:%s" % [i, terrain.substr(0, 3).capitalize()]

		# Get terrain color from hex_editor
		if hex_editor and hex_editor.TERRAIN_TYPES.has(terrain):
			var color: Color = hex_editor.TERRAIN_TYPES[terrain]["color"]
			var style := StyleBoxFlat.new()
			style.bg_color = color
			style.border_width_bottom = 2
			style.border_width_top = 2
			style.border_width_left = 2
			style.border_width_right = 2
			style.border_color = Color(0, 0, 0, 0.5)
			btn.add_theme_stylebox_override("normal", style)

		btn.pressed.connect(_on_palette_terrain_selected.bind(i))
		terrain_palette.add_child(btn)


func _on_palette_terrain_selected(index: int) -> void:
	if hex_editor and index >= 0 and index < TERRAINS.size():
		hex_editor.current_terrain = TERRAINS[index]
		terrain_selector.select(index)
		_on_log_message("Terrain: %s" % TERRAINS[index])


func _on_terrain_selected(index: int) -> void:
	if hex_editor and index >= 0 and index < TERRAINS.size():
		hex_editor.current_terrain = TERRAINS[index]


func _on_show_grid_toggled(pressed: bool) -> void:
	if hex_editor:
		hex_editor.show_grid = pressed


func _on_show_coords_toggled(pressed: bool) -> void:
	if hex_editor:
		hex_editor.show_coords = pressed


func _on_show_hex_grid_toggled(pressed: bool) -> void:
	if hex_editor:
		hex_editor.show_hex_grid = pressed


func _on_tool_paint() -> void:
	if hex_editor:
		hex_editor.current_tool = hex_editor.ToolMode.PAINT
		_update_tool_buttons()
		if poi_panel:
			poi_panel.visible = false


func _on_tool_fill() -> void:
	if hex_editor:
		hex_editor.current_tool = hex_editor.ToolMode.FILL
		_update_tool_buttons()
		if poi_panel:
			poi_panel.visible = false


func _on_tool_erase() -> void:
	if hex_editor:
		hex_editor.current_tool = hex_editor.ToolMode.ERASE
		_update_tool_buttons()
		if poi_panel:
			poi_panel.visible = false


func _on_tool_edge() -> void:
	if hex_editor:
		hex_editor.current_tool = hex_editor.ToolMode.EDGE
		_update_tool_buttons()
		if poi_panel:
			poi_panel.visible = false


func _on_tool_poi() -> void:
	if hex_editor:
		hex_editor.current_tool = hex_editor.ToolMode.POI
		_update_tool_buttons()
		if poi_panel:
			poi_panel.visible = true
		if left_tabs:
			left_tabs.current_tab = 1  # Inspector


func _on_tool_region() -> void:
	if hex_editor:
		hex_editor.current_tool = hex_editor.ToolMode.REGION
		_update_tool_buttons()
		if poi_panel:
			poi_panel.visible = false
		if left_tabs:
			left_tabs.current_tab = 3  # Regions


func _on_tool_select() -> void:
	if hex_editor:
		hex_editor.current_tool = hex_editor.ToolMode.SELECT
		_update_tool_buttons()
		if poi_panel:
			poi_panel.visible = false
		if left_tabs:
			left_tabs.current_tab = 4  # History


func _update_tool_buttons() -> void:
	if not hex_editor:
		return

	var current: int = hex_editor.current_tool
	if tool_paint_btn:
		tool_paint_btn.button_pressed = (current == hex_editor.ToolMode.PAINT)
	if tool_fill_btn:
		tool_fill_btn.button_pressed = (current == hex_editor.ToolMode.FILL)
	if tool_erase_btn:
		tool_erase_btn.button_pressed = (current == hex_editor.ToolMode.ERASE)
	if tool_edge_btn:
		tool_edge_btn.button_pressed = (current == hex_editor.ToolMode.EDGE)
	if tool_poi_btn:
		tool_poi_btn.button_pressed = (current == hex_editor.ToolMode.POI)
	if tool_region_btn:
		tool_region_btn.button_pressed = (current == hex_editor.ToolMode.REGION)
	if tool_select_btn:
		tool_select_btn.button_pressed = (current == hex_editor.ToolMode.SELECT)


func _on_brush_size_changed(value: float) -> void:
	if hex_editor:
		hex_editor.brush_size = int(value)
	if brush_size_label:
		var size_i := int(value)
		brush_size_label.text = "Brush: %d (%d)" % [size_i, _brush_affected_count(size_i)]


func _brush_affected_count(brush_size_value: int) -> int:
	# brush_size is a UI "diameter" concept; editor uses radius = brush_size-1
	var r: int = maxi(0, brush_size_value - 1)
	return 1 + 3 * r * (r + 1)


func _on_edge_selected(index: int) -> void:
	if hex_editor and index >= 0 and index < EDGE_TYPES.size():
		hex_editor.current_edge_type = EDGE_TYPES[index]


func _on_expand_pressed() -> void:
	if hex_editor:
		hex_editor.expand_map()


func _on_save_pressed() -> void:
	if hex_editor:
		if hex_editor.map_path == "":
			_on_save_as_pressed()
			return
		DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(hex_editor.map_path.get_base_dir()))
		hex_editor.save_map(hex_editor.map_path)
		_add_recent(hex_editor.map_path)
		_toast("Saved: %s" % hex_editor.map_path.get_file())
		_update_status_bar()


func _on_save_as_pressed() -> void:
	if not hex_editor:
		return
	if _save_dialog == null:
		_save_dialog = FileDialog.new()
		_save_dialog.file_mode = FileDialog.FILE_MODE_SAVE_FILE
		_save_dialog.access = FileDialog.ACCESS_RESOURCES
		_save_dialog.filters = PackedStringArray(["*.json ; JSON Map Files"])
		_save_dialog.file_selected.connect(_on_save_file_selected)
		add_child(_save_dialog)
	_save_dialog.popup_centered(Vector2(800, 600))


func _on_load_pressed() -> void:
	if hex_editor:
		if _load_dialog:
			_load_dialog.popup_centered(Vector2(800, 600))
		else:
			hex_editor.load_map(hex_editor.map_path)


func _on_save_file_selected(path: String) -> void:
	if not hex_editor:
		return
	hex_editor.map_path = path
	hex_editor.save_map(path)
	_add_recent(path)
	_toast("Saved: %s" % path.get_file())
	_update_status_bar()


func _on_load_file_selected(path: String) -> void:
	if not hex_editor:
		return
	hex_editor.map_path = path
	hex_editor.load_map(path)
	_add_recent(path)
	_toast("Loaded: %s" % path.get_file())


func _on_validate_pressed() -> void:
	if hex_editor:
		hex_editor.validate_map()


func _on_validation_result(issues: Array) -> void:
	# Signal payload may be Array[String] but arrives as Array.
	if validation_text:
		var combined := ""
		for raw in issues:
			var issue := str(raw)
			if issue.begins_with("ORPHAN|"):
				var coord_str := issue.trim_prefix("ORPHAN|")
				combined += "[url=hex:%s]Orphan %s[/url]\n" % [coord_str, coord_str]
			elif issue.begins_with("EDGE_MISSING|"):
				var key := issue.trim_prefix("EDGE_MISSING|")
				combined += "[url=edge:%s]Missing edge %s[/url]\n" % [key, key]
			else:
				combined += issue + "\n"
		validation_text.text = combined.strip_edges()
	# If the user is already on the Validate tab, don't spam a modal.
	if not left_tabs or left_tabs.current_tab != 5:
		_show_validation_dialog(issues)
	else:
		_toast("Validation updated")


func _show_validation_dialog(issues: Array) -> void:
	if issues.is_empty():
		return
	if _validation_dialog == null:
		_validation_dialog = AcceptDialog.new()
		_validation_dialog.title = "Map Validation"
		add_child(_validation_dialog)

	var combined := ""
	for issue in issues:
		combined += str(issue) + "\n"
	_validation_dialog.dialog_text = combined.strip_edges()
	_validation_dialog.popup_centered(Vector2(700, 400))


func _on_import_pressed() -> void:
	# Open file dialog for image import
	var dialog := FileDialog.new()
	dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	dialog.access = FileDialog.ACCESS_FILESYSTEM
	dialog.filters = PackedStringArray(["*.png ; PNG Images", "*.jpg ; JPEG Images"])
	dialog.file_selected.connect(_on_import_file_selected)
	add_child(dialog)
	dialog.popup_centered(Vector2(800, 600))


func _on_import_file_selected(path: String) -> void:
	if hex_editor:
		# Use terrain colors as mapping
		var color_mapping := {}
		for terrain in hex_editor.TERRAIN_TYPES.keys():
			color_mapping[terrain] = hex_editor.TERRAIN_TYPES[terrain]["color"]
		hex_editor.import_from_image(path, color_mapping)


func _on_hex_selected(coord: Vector2i) -> void:
	if not hex_editor or not poi_panel:
		return

	var hex_data: Dictionary = hex_editor.get_hex(coord)
	if poi_name_edit:
		poi_name_edit.text = hex_data.get("name", "")
	if poi_desc_edit:
		poi_desc_edit.text = hex_data.get("description", "")

	poi_panel.visible = (hex_editor.current_tool == hex_editor.ToolMode.POI)
	if left_tabs:
		left_tabs.current_tab = 1  # Inspector

	# Inspector fields
	if inspector_terrain_selector:
		var terrain: String = String(hex_data.get("terrain", "plains"))
		var idx: int = TERRAINS.find(terrain)
		if idx >= 0:
			inspector_terrain_selector.select(idx)
	if inspector_elev_slider:
		inspector_elev_slider.value = float(int(hex_data.get("elevation", 0)))
	if inspector_elev_label:
		inspector_elev_label.text = "Elevation: %d" % int(hex_data.get("elevation", 0))
	if inspector_name_edit:
		inspector_name_edit.text = hex_data.get("name", "")
	if inspector_desc_edit:
		inspector_desc_edit.text = hex_data.get("description", "")

	_refresh_regions_ui()
	if inspector_region_selector:
		var rid: int = int(hex_data.get("region_id", 0))
		var region_idx: int = inspector_region_selector.get_item_index(rid)
		if region_idx >= 0:
			inspector_region_selector.select(region_idx)


func _on_poi_save() -> void:
	if not hex_editor or not hex_editor.has_selection:
		return

	var poi_name := poi_name_edit.text if poi_name_edit else ""
	var poi_desc := poi_desc_edit.text if poi_desc_edit else ""

	hex_editor.set_poi_data(hex_editor.selected_hex, poi_name, poi_desc)


func _update_hex_count() -> void:
	if hex_editor:
		hex_count_label.text = "Hexes: %d" % hex_editor.get_hex_count()


func _on_log_message(message: String) -> void:
	# Add timestamp
	var time_str := Time.get_time_string_from_system().substr(0, 8)
	var full_msg := "[%s] %s" % [time_str, message]

	# Write to log file
	if log_file:
		log_file.store_line(full_msg)
		log_file.flush()

	log_history.append(full_msg)
	if log_history.size() > MAX_LOG_LINES:
		log_history.pop_front()

	# Update RichTextLabel - use text = instead of append_text due to Godot 4.x bug
	if log_text:
		var combined := ""
		for msg in log_history:
			combined += msg + "\n"
		log_text.text = combined
		# Use call_deferred to scroll to bottom without blocking
		_scroll_log_to_bottom.call_deferred()

	# Lightweight toast hints for key events
	if message.begins_with("Saved ") or message.begins_with("Loaded ") or message.begins_with("Exported ") or message.begins_with("Imported "):
		_toast(message)
		if hex_editor and (message.begins_with("Saved ") or message.begins_with("Loaded ")):
			_add_recent(hex_editor.map_path)


func _scroll_log_to_bottom() -> void:
	if log_text:
		var scroll := log_text.get_v_scroll_bar()
		if scroll:
			scroll.value = scroll.max_value


func _on_map_changed() -> void:
	_update_hex_count()
	_refresh_history_ui()
	_refresh_regions_ui()
	_sync_layers_ui()


func _setup_inspector_selectors() -> void:
	if inspector_terrain_selector and inspector_terrain_selector.item_count == 0:
		for terrain in TERRAINS:
			inspector_terrain_selector.add_item(terrain.capitalize())


func _sync_layers_ui() -> void:
	if not hex_editor:
		return
	if terrain_layer_visible:
		terrain_layer_visible.button_pressed = hex_editor.is_layer_visible("terrain")
	if elevation_layer_visible:
		elevation_layer_visible.button_pressed = hex_editor.is_layer_visible("elevation")
	if edges_layer_visible:
		edges_layer_visible.button_pressed = hex_editor.is_layer_visible("edges")
	if poi_layer_visible:
		poi_layer_visible.button_pressed = hex_editor.is_layer_visible("poi")
	if regions_layer_visible:
		regions_layer_visible.button_pressed = hex_editor.is_layer_visible("regions")

	if terrain_layer_lock:
		terrain_layer_lock.button_pressed = hex_editor.is_layer_locked("terrain")
	if elevation_layer_lock:
		elevation_layer_lock.button_pressed = hex_editor.is_layer_locked("elevation")
	if edges_layer_lock:
		edges_layer_lock.button_pressed = hex_editor.is_layer_locked("edges")
	if poi_layer_lock:
		poi_layer_lock.button_pressed = hex_editor.is_layer_locked("poi")
	if regions_layer_lock:
		regions_layer_lock.button_pressed = hex_editor.is_layer_locked("regions")


func _refresh_regions_ui() -> void:
	if not hex_editor:
		return
	var region_list: Array[Dictionary] = hex_editor.get_regions_list()

	if region_selector:
		region_selector.clear()
		for reg in region_list:
			var rid: int = int(reg["id"])
			region_selector.add_item("%d: %s" % [rid, reg["name"]], rid)
		var sel_idx := region_selector.get_item_index(hex_editor.current_region_id)
		if sel_idx >= 0:
			region_selector.select(sel_idx)

	if inspector_region_selector:
		inspector_region_selector.clear()
		for reg in region_list:
			var rid2: int = int(reg["id"])
			inspector_region_selector.add_item("%d: %s" % [rid2, reg["name"]], rid2)

	# Sync editable fields for current region brush
	for reg in region_list:
		if int(reg["id"]) == hex_editor.current_region_id:
			if region_name_edit:
				region_name_edit.text = str(reg["name"])
			if region_color_picker:
				region_color_picker.color = reg["color"]
			break


func _refresh_history_ui() -> void:
	if not hex_editor or not history_selector:
		return
	var labels: Array[String] = hex_editor.get_history_labels()
	var current_index: int = hex_editor.get_history_index()

	history_selector.clear()
	for i in range(labels.size()):
		history_selector.add_item("%d: %s" % [i, labels[i]], i)
	if current_index >= 0:
		var idx := history_selector.get_item_index(current_index)
		if idx >= 0:
			history_selector.select(idx)


func _on_layer_visibility(pressed: bool, layer: String) -> void:
	if hex_editor:
		hex_editor.set_layer_visible(layer, pressed)


func _on_layer_lock(pressed: bool, layer: String) -> void:
	if hex_editor:
		hex_editor.set_layer_locked(layer, pressed)


func _on_region_selected(_index: int) -> void:
	if not hex_editor or not region_selector:
		return
	var rid: int = int(region_selector.get_selected_id())
	hex_editor.set_current_region(rid)
	_refresh_regions_ui()


func _on_region_add() -> void:
	if not hex_editor:
		return
	var name: String = ""
	if region_name_edit:
		name = region_name_edit.text.strip_edges()
	if name == "":
		name = "Region %d" % (hex_editor.get_regions_list().size())

	var color: Color = Color(0.9, 0.3, 0.3, 0.35)
	if region_color_picker:
		color = region_color_picker.color

	var rid: int = int(hex_editor.add_region(name, color))
	hex_editor.set_current_region(rid)
	_refresh_regions_ui()


func _on_region_delete() -> void:
	if not hex_editor or not region_selector:
		return
	var rid: int = int(region_selector.get_selected_id())
	hex_editor.delete_region(rid)
	hex_editor.set_current_region(0)
	_refresh_regions_ui()


func _on_region_apply() -> void:
	if not hex_editor or not region_selector:
		return
	var rid: int = int(region_selector.get_selected_id())
	if region_name_edit:
		hex_editor.set_region_name(rid, region_name_edit.text)
	if region_color_picker:
		hex_editor.set_region_color(rid, region_color_picker.color)
	_refresh_regions_ui()


func _on_region_goto() -> void:
	if not hex_editor:
		return
	var rid: int = hex_editor.current_region_id
	if region_selector:
		rid = int(region_selector.get_selected_id())

	var coords: Array[Vector2i] = []
	var sum_q: int = 0
	var sum_r: int = 0
	for coord in hex_editor.map_data.keys():
		var hex_data: Dictionary = hex_editor.map_data[coord]
		if int(hex_data.get("region_id", 0)) == rid:
			coords.append(coord)
			sum_q += coord.x
			sum_r += coord.y
	if coords.is_empty():
		_toast("Region has no hexes")
		return

	var avg_q: float = float(sum_q) / float(coords.size())
	var avg_r: float = float(sum_r) / float(coords.size())
	var guess: Vector2i = Vector2i(int(round(avg_q)), int(round(avg_r)))

	var best: Vector2i = coords[0]
	var best_dist: int = 1 << 30
	for c in coords:
		var d: int = absi(c.x - guess.x) + absi(c.y - guess.y)
		if d < best_dist:
			best_dist = d
			best = c

	hex_editor.center_view_on_hex(best)
	_toast("Centered on region %d" % rid)


func _maybe_prompt_restore_autosave() -> void:
	if _autosave_dialog != null:
		return
	if not FileAccess.file_exists(_AUTOSAVE_LATEST_PATH):
		return
	if not hex_editor:
		return

	var autosave_mtime: int = int(FileAccess.get_modified_time(_AUTOSAVE_LATEST_PATH))
	var map_mtime: int = 0
	if hex_editor.map_path != "" and FileAccess.file_exists(hex_editor.map_path):
		map_mtime = int(FileAccess.get_modified_time(hex_editor.map_path))
	if autosave_mtime <= map_mtime:
		return

	var autosave_label: String = _AUTOSAVE_LATEST_PATH.get_file()
	var autosave_iso: String = ""
	var f: FileAccess = FileAccess.open(_AUTOSAVE_LATEST_PATH, FileAccess.READ)
	if f:
		var parsed: Variant = JSON.parse_string(f.get_as_text())
		f.close()
		if parsed is Dictionary:
			var meta: Dictionary = parsed.get("meta", {})
			autosave_iso = str(meta.get("iso", ""))

	_autosave_dialog = ConfirmationDialog.new()
	_autosave_dialog.title = "Autosave Found"
	_autosave_dialog.get_ok_button().text = "Restore"
	_autosave_dialog.get_cancel_button().text = "Ignore"
	_autosave_dialog.dialog_text = "A newer autosave was found (%s%s). Restore it?" % [
		autosave_label,
		(" @ " + autosave_iso) if autosave_iso != "" else ""
	]
	_autosave_dialog.confirmed.connect(_on_autosave_restore_confirmed)
	_autosave_dialog.popup_hide.connect(_on_autosave_dialog_closed)
	add_child(_autosave_dialog)
	_autosave_dialog.popup_centered(Vector2(700, 260))


func _on_autosave_restore_confirmed() -> void:
	if hex_editor:
		hex_editor.load_map(_AUTOSAVE_LATEST_PATH)
		hex_editor.has_unsaved_changes = true
		_sync_ui_from_editor()
		_toast("Restored autosave")


func _on_autosave_dialog_closed() -> void:
	if _autosave_dialog:
		_autosave_dialog.queue_free()
		_autosave_dialog = null


func _on_history_selected(_index: int) -> void:
	if not hex_editor or not history_selector:
		return
	var idx: int = int(history_selector.get_selected_id())
	hex_editor.jump_to_history(idx)


func _on_undo_pressed() -> void:
	if hex_editor:
		hex_editor.undo()


func _on_redo_pressed() -> void:
	if hex_editor:
		hex_editor.redo()


func _on_inspector_elevation_changed(value: float) -> void:
	if inspector_elev_label:
		inspector_elev_label.text = "Elevation: %d" % int(value)


func _on_inspector_apply() -> void:
	if not hex_editor or not hex_editor.has_selection:
		return
	var coord: Vector2i = hex_editor.selected_hex

	var terrain := "plains"
	if inspector_terrain_selector:
		var terrain_index := inspector_terrain_selector.selected
		if terrain_index >= 0 and terrain_index < TERRAINS.size():
			terrain = TERRAINS[terrain_index]

	var elev := int(inspector_elev_slider.value) if inspector_elev_slider else 0
	var rid: int = int(inspector_region_selector.get_selected_id()) if inspector_region_selector else 0
	var nm := inspector_name_edit.text if inspector_name_edit else ""
	var desc := inspector_desc_edit.text if inspector_desc_edit else ""

	hex_editor.apply_hex_inspector(coord, terrain, elev, rid, nm, desc)


func _on_noise_fill_pressed() -> void:
	if hex_editor:
		hex_editor.apply_noise_fill(int(Time.get_unix_time_from_system()) % 100000)


func _on_smooth_elevation_pressed() -> void:
	if hex_editor:
		hex_editor.smooth_elevation()


func _on_ridge_pressed() -> void:
	if hex_editor:
		hex_editor.create_ridge_from_selection()


func _on_river_pressed() -> void:
	if hex_editor:
		hex_editor.create_river_from_selection()


func _on_export_pressed() -> void:
	if not hex_editor:
		return
	if _export_dialog == null:
		_export_dialog = FileDialog.new()
		_export_dialog.file_mode = FileDialog.FILE_MODE_SAVE_FILE
		_export_dialog.access = FileDialog.ACCESS_FILESYSTEM
		_export_dialog.filters = PackedStringArray(["*.json ; Runtime JSON", "*.hxb ; Hex Binary"])
		_export_dialog.file_selected.connect(_on_export_file_selected)
		add_child(_export_dialog)
	_export_dialog.popup_centered(Vector2(800, 600))


func _on_export_file_selected(path: String) -> void:
	if hex_editor:
		hex_editor.export_runtime(path)
		_toast("Exported: %s" % path.get_file())


func _on_import_map_pressed() -> void:
	if not hex_editor:
		return
	if _import_runtime_dialog == null:
		_import_runtime_dialog = FileDialog.new()
		_import_runtime_dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE
		_import_runtime_dialog.access = FileDialog.ACCESS_FILESYSTEM
		_import_runtime_dialog.filters = PackedStringArray(["*.json ; Runtime JSON", "*.hxb ; Hex Binary"])
		_import_runtime_dialog.file_selected.connect(_on_import_runtime_file_selected)
		add_child(_import_runtime_dialog)
	_import_runtime_dialog.popup_centered(Vector2(800, 600))


func _on_import_runtime_file_selected(path: String) -> void:
	if hex_editor:
		hex_editor.import_runtime(path)
		_toast("Imported: %s" % path.get_file())


func _on_save_stamp_pressed() -> void:
	if not hex_editor:
		return
	if _stamp_save_dialog == null:
		_stamp_save_dialog = FileDialog.new()
		_stamp_save_dialog.file_mode = FileDialog.FILE_MODE_SAVE_FILE
		_stamp_save_dialog.access = FileDialog.ACCESS_FILESYSTEM
		_stamp_save_dialog.filters = PackedStringArray(["*.stamp.json ; Stamp JSON"])
		_stamp_save_dialog.file_selected.connect(_on_stamp_save_file_selected)
		add_child(_stamp_save_dialog)
	_stamp_save_dialog.popup_centered(Vector2(800, 600))


func _on_stamp_save_file_selected(path: String) -> void:
	if hex_editor:
		hex_editor.export_stamp(path)
		_toast("Stamp saved: %s" % path.get_file())


func _on_load_stamp_pressed() -> void:
	if not hex_editor:
		return
	if _stamp_load_dialog == null:
		_stamp_load_dialog = FileDialog.new()
		_stamp_load_dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE
		_stamp_load_dialog.access = FileDialog.ACCESS_FILESYSTEM
		_stamp_load_dialog.filters = PackedStringArray(["*.stamp.json ; Stamp JSON"])
		_stamp_load_dialog.file_selected.connect(_on_stamp_load_file_selected)
		add_child(_stamp_load_dialog)
	_stamp_load_dialog.popup_centered(Vector2(800, 600))


func _on_stamp_load_file_selected(path: String) -> void:
	if hex_editor:
		hex_editor.import_stamp(path)
		_toast("Stamp loaded: %s" % path.get_file())


func _on_validation_meta_clicked(meta: Variant) -> void:
	if not hex_editor:
		return
	var s := str(meta)
	if s.begins_with("hex:"):
		var coord_str := s.trim_prefix("hex:")
		var parts := coord_str.split(",")
		if parts.size() == 2:
			hex_editor.center_view_on_hex(Vector2i(int(parts[0]), int(parts[1])))
	elif s.begins_with("edge:"):
		var key := s.trim_prefix("edge:")
		var endpoints: Array[Vector2i] = []
		endpoints = hex_editor.edge_key_to_coords(key)
		if endpoints.size() == 2:
			var mid := Vector2i(int(round((endpoints[0].x + endpoints[1].x) / 2.0)), int(round((endpoints[0].y + endpoints[1].y) / 2.0)))
			hex_editor.center_view_on_hex(mid)


func _init_toast() -> void:
	if _toast_timer == null:
		_toast_timer = Timer.new()
		_toast_timer.one_shot = true
		_toast_timer.timeout.connect(func() -> void:
			if toast_label:
				toast_label.text = ""
		)
		add_child(_toast_timer)


func _toast(text: String, seconds: float = 2.0) -> void:
	if not toast_label:
		return
	toast_label.text = text
	if _toast_timer:
		_toast_timer.start(seconds)


func _load_recent_maps() -> void:
	_recent_paths.clear()
	if not FileAccess.file_exists(_RECENTS_PATH):
		return
	var f: FileAccess = FileAccess.open(_RECENTS_PATH, FileAccess.READ)
	if f == null:
		return
	var parsed: Variant = JSON.parse_string(f.get_as_text())
	f.close()
	if parsed is Array:
		for p in parsed:
			_recent_paths.append(str(p))


func _save_recent_maps() -> void:
	var f: FileAccess = FileAccess.open(_RECENTS_PATH, FileAccess.WRITE)
	if f == null:
		return
	f.store_string(JSON.stringify(_recent_paths))
	f.close()


func _add_recent(path: String) -> void:
	_recent_paths.erase(path)
	_recent_paths.push_front(path)
	while _recent_paths.size() > 12:
		_recent_paths.pop_back()
	_save_recent_maps()
	_refresh_recent_selector()


func _refresh_recent_selector() -> void:
	if not recent_selector:
		return
	recent_selector.clear()
	for i in range(_recent_paths.size()):
		var p := _recent_paths[i]
		recent_selector.add_item(p.get_file(), i)


func _on_recent_selected(index: int) -> void:
	if not hex_editor:
		return
	if index < 0 or index >= _recent_paths.size():
		return
	var path := _recent_paths[index]
	hex_editor.map_path = path
	hex_editor.load_map(path)
	_toast("Loaded: %s" % path.get_file())


func _on_help_pressed() -> void:
	if _help_dialog == null:
		_help_dialog = AcceptDialog.new()
		_help_dialog.title = "Shortcuts"
		add_child(_help_dialog)
	_help_dialog.dialog_text = """Map
  Left click: tool action
  Right click: cycle terrain / pick region brush
  Middle drag / Alt+drag: pan
  Scroll / pinch: zoom

Tools
  Paint / Fill / Erase / Edge / POI / Region / Select (top bar)
  E / Shift+E: elevation +/-
  [ / ]: brush size
  0-9: terrain palette

Selection + Stamps
  Select tool: click or drag-box (Shift adds)
  Cmd/Ctrl+C: copy selection as stamp
  Cmd/Ctrl+Shift+V: paste stamp at hovered hex
  Cmd/Ctrl+X: cut selection
  R / Shift+R: rotate stamp CW/CCW
  M: mirror stamp

Save
  Cmd/Ctrl+S: save
  Cmd/Ctrl+O: load
  Cmd/Ctrl+V: validate
"""
	_help_dialog.popup_centered(Vector2(700, 520))


func _load_settings() -> void:
	if not FileAccess.file_exists(_SETTINGS_PATH):
		return
	var f: FileAccess = FileAccess.open(_SETTINGS_PATH, FileAccess.READ)
	if f == null:
		return
	var parsed: Variant = JSON.parse_string(f.get_as_text())
	f.close()
	if parsed is Dictionary:
		var ui_scale: float = float((parsed as Dictionary).get("ui_scale", 1.0))
		if ui_scale_slider:
			ui_scale_slider.value = ui_scale
		_apply_ui_scale(ui_scale)
		var hc: bool = bool((parsed as Dictionary).get("high_contrast", false))
		if high_contrast_check:
			high_contrast_check.button_pressed = hc
		_apply_high_contrast(hc)


func _save_settings() -> void:
	var payload: Dictionary = {
		"ui_scale": ui_scale_slider.value if ui_scale_slider else 1.0,
		"high_contrast": high_contrast_check.button_pressed if high_contrast_check else false,
	}
	var f: FileAccess = FileAccess.open(_SETTINGS_PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(payload))
		f.close()


func _on_ui_scale_changed(value: float) -> void:
	_apply_ui_scale(value)
	_save_settings()


func _apply_ui_scale(value: float) -> void:
	var s: float = float(clamp(value, 0.8, 1.4))
	$TopBar.scale = Vector2(s, s)
	$StatusBar.scale = Vector2(s, s)
	$LeftPanel.scale = Vector2(s, s)
	$HelpPanel.scale = Vector2(s, s)
	$DebugPanel.scale = Vector2(s, s)
	$LogPanel.scale = Vector2(s, s)


func _on_high_contrast_toggled(pressed: bool) -> void:
	_apply_high_contrast(pressed)
	_save_settings()


func _apply_high_contrast(enabled: bool) -> void:
	if enabled:
		add_theme_color_override("font_color", Color(1, 1, 1))
		add_theme_color_override("font_color_disabled", Color(0.7, 0.7, 0.7))
		add_theme_color_override("font_outline_color", Color(0, 0, 0, 1))
		add_theme_constant_override("outline_size", 2)
	else:
		remove_theme_color_override("font_color")
		remove_theme_color_override("font_color_disabled")
		remove_theme_color_override("font_outline_color")
		remove_theme_constant_override("outline_size")
