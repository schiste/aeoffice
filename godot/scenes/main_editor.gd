extends Control
## MainEditor - Unified controller for the modern hex map editor interface
##
## This script integrates:
## - Menu bar with File/Edit/View/Tools menus
## - Dockable left panel (tools, terrain palette, quick actions)
## - Dockable right panel (inspector, layers, minimap)
## - SubViewport-based HexEditor in center
## - Contextual bottom bar
## - Layout persistence

# Use shared terrain constants to eliminate duplication with HexEditor
const TERRAINS := TerrainConstants.TERRAIN_ORDER
const EDGE_TYPES := TerrainConstants.EDGE_ORDER
const CONFIG_PATH := "user://editor_layout.cfg"
const RECENTS_PATH := "user://recent_maps.json"
const SETTINGS_PATH := "user://hex_editor_settings.json"
const AUTOSAVE_LATEST_PATH := "user://maps/autosave/world_autosave_001.json"

# UI scenes
const TOAST_SCENE: PackedScene = preload("res://scenes/components/toast_notification.tscn")
const COMMAND_PALETTE_SCENE: PackedScene = preload("res://scenes/components/command_palette.tscn")
const SETTINGS_DIALOG_SCENE: PackedScene = preload("res://scenes/components/settings_dialog.tscn")

# Input actions (user-rebindable)
const ACTION_DEFS: Array[Dictionary] = [
	{"id": "hexeditor.command_palette", "title": "Command Palette", "binding": {"keycode": KEY_K, "ctrl": true}},
	{"id": "hexeditor.settings", "title": "Settings", "binding": {"keycode": KEY_COMMA, "ctrl": true}},
	{"id": "hexeditor.help", "title": "Help", "binding": {"keycode": KEY_F1}},
	{"id": "hexeditor.toggle_left_dock", "title": "Toggle Left Dock", "binding": {"keycode": KEY_1, "ctrl": true}},
	{"id": "hexeditor.toggle_right_dock", "title": "Toggle Right Dock", "binding": {"keycode": KEY_2, "ctrl": true}},
	{"id": "hexeditor.save", "title": "Save", "binding": {"keycode": KEY_S, "ctrl": true}},
	{"id": "hexeditor.save_as", "title": "Save As…", "binding": {"keycode": KEY_S, "ctrl": true, "shift": true}},
	{"id": "hexeditor.open", "title": "Open…", "binding": {"keycode": KEY_O, "ctrl": true}},
	{"id": "hexeditor.undo", "title": "Undo", "binding": {"keycode": KEY_Z, "ctrl": true}},
	{"id": "hexeditor.redo", "title": "Redo", "binding": {"keycode": KEY_Z, "ctrl": true, "shift": true}},
	{"id": "hexeditor.copy", "title": "Copy Selection", "binding": {"keycode": KEY_C, "ctrl": true}},
	{"id": "hexeditor.cut", "title": "Cut Selection", "binding": {"keycode": KEY_X, "ctrl": true}},
	{"id": "hexeditor.paste_stamp", "title": "Paste Stamp", "binding": {"keycode": KEY_V, "ctrl": true, "shift": true}},
	{"id": "hexeditor.validate", "title": "Validate Map", "binding": {"keycode": KEY_V, "ctrl": true}},
]

# Core reference
var hex_editor: Node2D = null

# Layout state
var config: ConfigFile = ConfigFile.new()
var left_dock_visible: bool = true
var right_dock_visible: bool = true
var _recent_paths: Array[String] = []

# Settings
var _ui_scale: float = 1.0
var _high_contrast: bool = false
var _bindings: Dictionary = {} # action_id -> binding dict
var _base_theme: Theme = null
var _high_contrast_theme: Theme = null
var _terrain_opacity: float = 1.0
var _basemap_opacity: float = 0.85

# Dialogs
var _save_dialog: FileDialog = null
var _load_dialog: FileDialog = null
var _export_dialog: FileDialog = null
var _import_dialog: FileDialog = null
var _stamp_save_dialog: FileDialog = null
var _stamp_load_dialog: FileDialog = null
var _help_visible: bool = false
var _autosave_dialog: ConfirmationDialog = null
var _settings_dialog: SettingsDialog = null

# Toast
var _toast_timer: Timer = null
var _toast_node: ToastNotification = null
var _command_palette: CommandPalette = null
var _recent_popup: PopupMenu = null

# Right dock tabs / issues
var _right_tabs: TabContainer = null
var _issues_list: ItemList = null
var _issues_meta: Array[Dictionary] = [] # each: {kind:String, coord:Vector2i, edge_key:String}

# History dropdown
var _history_selector: OptionButton = null
var _suppress_history_select: bool = false

# Log
var log_history: Array[String] = []
const MAX_LOG_LINES := 50

# ============================================================================
# NODE REFERENCES
# ============================================================================

# Menu bar
@onready var file_menu: MenuButton = %FileMenu
@onready var edit_menu: MenuButton = %EditMenu
@onready var view_menu: MenuButton = %ViewMenu
@onready var tools_menu: MenuButton = %ToolsMenu
@onready var toast_label: Label = %ToastLabel
@onready var hex_count_label: Label = %HexCountLabel
@onready var coords_label: Label = %CoordsLabel

# Layout containers
@onready var main_split: HSplitContainer = %MainSplit
@onready var left_dock: VSplitContainer = %LeftDock
@onready var right_dock: VSplitContainer = %RightDock
@onready var center_panel: Panel = %CenterPanel
var center_right_split: HSplitContainer = null

const DEFAULT_LEFT_DOCK_WIDTH := 240
const DEFAULT_RIGHT_DOCK_WIDTH := 280
const DEFAULT_TOOL_PALETTE_HEIGHT := 300
const DEFAULT_RIGHT_DOCK_SPLIT := 350
@onready var hex_editor_viewport: SubViewportContainer = %HexEditorViewport
@onready var sub_viewport: SubViewport = %SubViewport

# Tool buttons
@onready var tool_paint_btn: Button = %ToolPaintBtn
@onready var tool_fill_btn: Button = %ToolFillBtn
@onready var tool_erase_btn: Button = %ToolEraseBtn
@onready var tool_edge_btn: Button = %ToolEdgeBtn
@onready var tool_poi_btn: Button = %ToolPoiBtn
@onready var tool_region_btn: Button = %ToolRegionBtn
@onready var tool_select_btn: Button = %ToolSelectBtn

# Terrain and brush
@onready var brush_label: Label = %BrushLabel
@onready var brush_slider: HSlider = %BrushSlider
@onready var edge_selector: OptionButton = %EdgeSelector
@onready var terrain_selector: OptionButton = %TerrainSelector

# Quick actions
@onready var noise_fill_btn: Button = %NoiseFillBtn
@onready var smooth_elevation_btn: Button = %SmoothElevationBtn
@onready var ridge_btn: Button = %RidgeBtn
@onready var river_btn: Button = %RiverBtn
@onready var save_stamp_btn: Button = %SaveStampBtn
@onready var load_stamp_btn: Button = %LoadStampBtn
@onready var export_btn: Button = %ExportBtn
@onready var import_btn: Button = %ImportBtn

# Inspector
@onready var coords_info_label: Label = %CoordsInfoLabel
@onready var hex_name_label: Label = %HexNameLabel
@onready var hex_desc_label: Label = %HexDescLabel
@onready var osm_data_text: RichTextLabel = %OSMDataText

# Minimap
@onready var minimap_rect: ColorRect = %MinimapRect
@onready var reset_zoom_btn: Button = %ResetZoomBtn
@onready var center_btn: Button = %CenterBtn
@onready var go_studio_btn: Button = %GoStudioBtn

# Bottom bar
@onready var tool_indicator: Label = %ToolIndicator
@onready var undo_btn: Button = %UndoBtn
@onready var redo_btn: Button = %RedoBtn
@onready var status_label: Label = %StatusLabel

# Floating panels
@onready var debug_panel: PanelContainer = %DebugPanel
@onready var debug_label: Label = %DebugLabel
@onready var log_panel: PanelContainer = %LogPanel
@onready var log_text: RichTextLabel = %LogText
@onready var help_panel: PanelContainer = $HelpPanel
@onready var floating_minimap: PanelContainer = %FloatingMinimap
@onready var floating_minimap_rect: ColorRect = %FloatingMinimapRect
@onready var floating_minimap_close_btn: Button = %CloseBtn
@onready var shortcuts_hint: Label = %ShortcutsHint
@onready var bottom_bar: HBoxContainer = %BottomBar
@onready var help_label: Label = $HelpPanel/HelpLabel


# ============================================================================
# LIFECYCLE
# ============================================================================

func _ready() -> void:
	_base_theme = theme
	_load_settings()
	_init_toast()
	_init_input_actions()
	_apply_ui_scale()
	_apply_high_contrast()
	_load_recent_maps()

	# Find HexEditor - it's inside the SubViewport
	hex_editor = %HexEditor as Node2D
	if not hex_editor:
		push_error("MainEditor: Could not find HexEditor node")
	else:
		# If the HexEditor script failed to compile/load, the node may exist but the API won't.
		if not hex_editor.has_method("load_map") or not _obj_has_property(hex_editor, &"map_data"):
			push_error("MainEditor: HexEditor node found but script/API missing (did HexEditor fail to compile?)")
			hex_editor = null
		else:
			if _obj_has_property(hex_editor, &"terrain_opacity"):
				hex_editor.set(&"terrain_opacity", _terrain_opacity)
			if _obj_has_property(hex_editor, &"basemap_opacity"):
				hex_editor.set(&"basemap_opacity", _basemap_opacity)

	_log("MainEditor initializing...")
	_ensure_split_hierarchy()
	_ensure_right_tabs()
	_ensure_history_dropdown()
	_init_command_palette()
	_init_settings_dialog()
	_extend_menus()

	# Connect all signals
	_connect_menu_signals()
	_connect_tool_signals()
	_connect_inspector_signals()
	_connect_layer_signals()
	_connect_action_signals()
	_connect_hex_editor_signals()
	_connect_minimap_signals()
	_connect_layout_signals()
	_connect_floating_minimap_signals()

	# Setup UI
	_sync_ui_from_editor()
	_apply_tool_icons()
	_update_help_text()
	_refresh_history_dropdown()

	# Update viewport size
	_update_viewport_size()
	get_viewport().size_changed.connect(_on_viewport_resized)

	# Initialize layout after a frame to ensure proper sizing
	_initialize_layout.call_deferred()
	_maybe_prompt_restore_autosave.call_deferred()

	_log("MainEditor ready")

	# Show log panel by default for debugging (can be toggled with F4 or View menu)
	if log_panel:
		log_panel.visible = true
		_update_panel_menu_checks()


func _maybe_prompt_restore_autosave() -> void:
	if not hex_editor:
		return
	if _autosave_dialog != null:
		return
	if not FileAccess.file_exists(AUTOSAVE_LATEST_PATH):
		return

	var autosave_mtime: int = int(FileAccess.get_modified_time(AUTOSAVE_LATEST_PATH))
	var map_mtime: int = 0
	if hex_editor.map_path != "" and FileAccess.file_exists(hex_editor.map_path):
		map_mtime = int(FileAccess.get_modified_time(hex_editor.map_path))
	if autosave_mtime <= map_mtime:
		return

	var autosave_iso: String = ""
	var file: FileAccess = FileAccess.open(AUTOSAVE_LATEST_PATH, FileAccess.READ)
	if file != null:
		var parsed: Variant = JSON.parse_string(file.get_as_text())
		if parsed is Dictionary:
			var meta: Dictionary = (parsed as Dictionary).get("meta", {})
			autosave_iso = str(meta.get("iso", ""))
		file.close()

	_autosave_dialog = ConfirmationDialog.new()
	_autosave_dialog.title = "Autosave Found"
	_autosave_dialog.get_ok_button().text = "Restore"
	_autosave_dialog.get_cancel_button().text = "Ignore"
	_autosave_dialog.dialog_text = "A newer autosave was found (%s%s). Restore it?" % [
		AUTOSAVE_LATEST_PATH.get_file(),
		(" @ " + autosave_iso) if autosave_iso != "" else ""
	]
	_autosave_dialog.confirmed.connect(_on_autosave_restore_confirmed)
	_autosave_dialog.popup_hide.connect(_on_autosave_dialog_closed)
	add_child(_autosave_dialog)
	_autosave_dialog.popup_centered(Vector2(700, 260))


func _on_autosave_restore_confirmed() -> void:
	if not hex_editor:
		return
	var err: Error = hex_editor.load_map(AUTOSAVE_LATEST_PATH)
	if err == OK:
		_toast("Restored autosave")
		_update_hex_count()
	else:
		_toast("Failed to restore autosave")


func _on_autosave_dialog_closed() -> void:
	if _autosave_dialog:
		_autosave_dialog.queue_free()
		_autosave_dialog = null


func _initialize_layout() -> void:
	# Load saved layout or apply defaults
	var err: Error = config.load(CONFIG_PATH)
	if err == OK:
		left_dock_visible = config.get_value("layout", "left_dock_visible", true)
		right_dock_visible = config.get_value("layout", "right_dock_visible", true)
		left_dock.visible = left_dock_visible
		right_dock.visible = right_dock_visible

		# Apply saved split offsets after a frame
		await get_tree().process_frame
		main_split.split_offset = int(config.get_value("layout", "main_split", DEFAULT_LEFT_DOCK_WIDTH))
		left_dock.split_offset = int(config.get_value("layout", "left_split", DEFAULT_TOOL_PALETTE_HEIGHT))
		right_dock.split_offset = int(config.get_value("layout", "right_split", DEFAULT_RIGHT_DOCK_SPLIT))
		if center_right_split:
			var viewport_w: int = int(get_viewport_rect().size.x)
			var default_center_w: int = max(500, viewport_w - main_split.split_offset - DEFAULT_RIGHT_DOCK_WIDTH)
			center_right_split.split_offset = int(config.get_value("layout", "center_split", default_center_w))
	else:
		# First time setup - use sensible defaults
		await get_tree().process_frame
		main_split.split_offset = DEFAULT_LEFT_DOCK_WIDTH
		left_dock.split_offset = DEFAULT_TOOL_PALETTE_HEIGHT
		right_dock.split_offset = DEFAULT_RIGHT_DOCK_SPLIT
		if center_right_split:
			var viewport_w2: int = int(get_viewport_rect().size.x)
			center_right_split.split_offset = max(500, viewport_w2 - main_split.split_offset - DEFAULT_RIGHT_DOCK_WIDTH)

	# Update floating minimap visibility
	_update_floating_minimap_visibility()


func _process(_delta: float) -> void:
	if not hex_editor:
		return

	# Update hover coordinates
	if hex_editor.has_hover:
		var coord: Vector2i = hex_editor.hovered_hex
		var hex_data: Dictionary = hex_editor.get_hex(coord)
		var terrain: String = hex_data.get("terrain", "---")
		var elevation: int = hex_data.get("elevation", 0)
		coords_label.text = "(%d, %d) %s e:%+d" % [coord.x, coord.y, terrain, elevation]
	else:
		coords_label.text = "Hover: --"

	# Update status bar
	_update_status_bar()

	# Update debug panel if visible
	if debug_panel.visible:
		_update_debug_panel()


func _input(event: InputEvent) -> void:
	# Close help panel on any key
	if _help_visible and event is InputEventKey and event.pressed:
		help_panel.visible = false
		_help_visible = false
		get_viewport().set_input_as_handled()
		return

	# Global debug toggles should work even when SubViewport consumes input.
	if event is InputEventKey and event.pressed and not event.is_echo():
		var key_event: InputEventKey = event as InputEventKey
		if key_event.keycode == KEY_F3:
			_toggle_debug_panel()
			get_viewport().set_input_as_handled()
			return
		if key_event.keycode == KEY_F4:
			_toggle_log_panel()
			get_viewport().set_input_as_handled()
			return


func _unhandled_key_input(event: InputEvent) -> void:
	if not event.is_pressed() or event.is_echo():
		return

	if event.is_action_pressed("hexeditor.command_palette"):
		_open_command_palette()
		get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("hexeditor.settings"):
		_open_settings()
		get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("hexeditor.help"):
		_toggle_help()
		get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("hexeditor.toggle_left_dock"):
		toggle_left_dock()
		get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("hexeditor.toggle_right_dock"):
		toggle_right_dock()
		get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("hexeditor.save_as"):
		_on_save_as()
		get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("hexeditor.save"):
		_on_save()
		get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("hexeditor.open"):
		_on_open()
		get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("hexeditor.undo"):
		_on_undo_pressed()
		get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("hexeditor.redo"):
		_on_redo_pressed()
		get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("hexeditor.copy"):
		_on_copy()
		get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("hexeditor.cut"):
		if hex_editor and hex_editor.has_method("cut_selection"):
			hex_editor.cut_selection()
		get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("hexeditor.paste_stamp"):
		if hex_editor and hex_editor.has_method("paste_stamp"):
			hex_editor.paste_stamp()
		get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("hexeditor.validate"):
		_on_validate()
		get_viewport().set_input_as_handled()
		return

	if event is InputEventKey and event.pressed and not event.is_echo():
		var key_event: InputEventKey = event as InputEventKey
		match key_event.keycode:
			KEY_F3:
				_toggle_debug_panel()
				get_viewport().set_input_as_handled()
			KEY_F4:
				_toggle_log_panel()
				get_viewport().set_input_as_handled()


# ============================================================================
# CONNECTION HELPERS
# ============================================================================

func _connect_menu_signals() -> void:
	file_menu.get_popup().id_pressed.connect(_on_file_menu_id_pressed)
	edit_menu.get_popup().id_pressed.connect(_on_edit_menu_id_pressed)
	view_menu.get_popup().id_pressed.connect(_on_view_menu_id_pressed)
	tools_menu.get_popup().id_pressed.connect(_on_tools_menu_id_pressed)


func _connect_tool_signals() -> void:
	tool_paint_btn.pressed.connect(_on_tool_pressed.bind(0))
	tool_fill_btn.pressed.connect(_on_tool_pressed.bind(1))
	tool_erase_btn.pressed.connect(_on_tool_pressed.bind(2))
	tool_edge_btn.pressed.connect(_on_tool_pressed.bind(3))
	tool_poi_btn.pressed.connect(_on_tool_pressed.bind(4))
	tool_region_btn.pressed.connect(_on_tool_pressed.bind(5))
	tool_select_btn.pressed.connect(_on_tool_pressed.bind(6))

	brush_slider.value_changed.connect(_on_brush_size_changed)
	edge_selector.item_selected.connect(_on_edge_selected)
	terrain_selector.item_selected.connect(_on_terrain_selected)


func _connect_inspector_signals() -> void:
	pass  # Inspector is now read-only for OSM data display


func _connect_layer_signals() -> void:
	pass  # Layer controls removed - using defaults


func _connect_action_signals() -> void:
	noise_fill_btn.pressed.connect(_on_noise_fill_pressed)
	smooth_elevation_btn.pressed.connect(_on_smooth_elevation_pressed)
	ridge_btn.pressed.connect(_on_ridge_pressed)
	river_btn.pressed.connect(_on_river_pressed)
	save_stamp_btn.pressed.connect(_on_save_stamp_pressed)
	load_stamp_btn.pressed.connect(_on_load_stamp_pressed)
	export_btn.pressed.connect(_on_export_pressed)
	import_btn.pressed.connect(_on_import_pressed)

	undo_btn.pressed.connect(_on_undo_pressed)
	redo_btn.pressed.connect(_on_redo_pressed)


func _connect_hex_editor_signals() -> void:
	if not hex_editor:
		return

	if hex_editor.has_signal("map_changed"):
		hex_editor.map_changed.connect(_on_map_changed)
	if hex_editor.has_signal("log_message"):
		hex_editor.log_message.connect(_log)
	if hex_editor.has_signal("hex_selected"):
		hex_editor.hex_selected.connect(_on_hex_selected)
	if hex_editor.has_signal("validation_result"):
		hex_editor.validation_result.connect(_on_validation_result)

	# Provide hex_editor to minimap
	if minimap_rect and minimap_rect.has_method("set_hex_editor"):
		minimap_rect.set_hex_editor(hex_editor)


func _connect_minimap_signals() -> void:
	reset_zoom_btn.pressed.connect(_on_minimap_reset_zoom)
	center_btn.pressed.connect(_on_minimap_center)
	go_studio_btn.pressed.connect(_on_minimap_go_studio)


func _connect_layout_signals() -> void:
	main_split.dragged.connect(_on_split_dragged.bind("main"))
	left_dock.dragged.connect(_on_split_dragged.bind("left"))
	right_dock.dragged.connect(_on_split_dragged.bind("right"))
	if center_right_split:
		center_right_split.dragged.connect(_on_split_dragged.bind("center"))


# ============================================================================
# MENU HANDLERS
# ============================================================================

func _on_file_menu_id_pressed(id: int) -> void:
	print("[MainEditor] File menu pressed with id: %d" % id)
	match id:
		0:
			_on_new_map()
		1:
			print("[MainEditor] Calling _on_open()")
			_on_open()
		2:
			_on_save()
		3:
			_on_save_as()
		4:
			_show_recent_popup()
		6:
			get_tree().quit()


func _on_edit_menu_id_pressed(id: int) -> void:
	match id:
		0: _on_undo_pressed()
		1: _on_redo_pressed()
		3: _on_copy()
		4: _on_paste()


func _on_view_menu_id_pressed(id: int) -> void:
	var popup := view_menu.get_popup()
	match id:
		0:
			toggle_left_dock()
		1:
			toggle_right_dock()
		3:
			# Show Grid
			var checked := not popup.is_item_checked(3)
			popup.set_item_checked(3, checked)
			if hex_editor:
				hex_editor.show_grid = checked
		4:
			# Show Coordinates
			var checked := not popup.is_item_checked(4)
			popup.set_item_checked(4, checked)
			if hex_editor:
				hex_editor.show_coords = checked
		5:
			# Show Hex Grid
			var checked := not popup.is_item_checked(5)
			popup.set_item_checked(5, checked)
			if hex_editor:
				hex_editor.show_hex_grid = checked
		7:
			_reset_layout()
		9:
			_toggle_help()
		10:
			_open_settings()
		11:
			_open_command_palette()
		12:
			# Show Basemap
			var idx := popup.get_item_index(12)
			if idx >= 0:
				var checked2 := not popup.is_item_checked(idx)
				popup.set_item_checked(idx, checked2)
				if hex_editor and _obj_has_property(hex_editor, &"show_basemap"):
					hex_editor.set(&"show_basemap", checked2)
		13:
			_toggle_log_panel()
		14:
			_toggle_debug_panel()
		15:
			_toggle_floating_minimap()


func _on_tools_menu_id_pressed(id: int) -> void:
	match id:
		0: _on_validate()
		2: _on_export_pressed()
		3: _on_import_pressed()
		5: _on_noise_fill_pressed()
		6: _on_smooth_elevation_pressed()
		7: _on_expand_map()


# ============================================================================
# TOOL HANDLERS
# ============================================================================

func _on_tool_pressed(tool_id: int) -> void:
	if not hex_editor:
		return

	hex_editor.current_tool = tool_id
	_update_tool_buttons()
	_update_tool_indicator()


func _update_tool_buttons() -> void:
	if not hex_editor:
		return

	var current: int = hex_editor.current_tool
	tool_paint_btn.button_pressed = (current == 0)
	tool_fill_btn.button_pressed = (current == 1)
	tool_erase_btn.button_pressed = (current == 2)
	tool_edge_btn.button_pressed = (current == 3)
	tool_poi_btn.button_pressed = (current == 4)
	tool_region_btn.button_pressed = (current == 5)
	tool_select_btn.button_pressed = (current == 6)


func _update_tool_indicator() -> void:
	if not hex_editor:
		return

	var tool_names := ["Paint", "Fill", "Erase", "Edge", "POI", "Region", "Select"]
	var idx: int = hex_editor.current_tool
	if idx >= 0 and idx < tool_names.size():
		tool_indicator.text = "Tool: %s" % tool_names[idx]


func _on_brush_size_changed(value: float) -> void:
	if hex_editor:
		hex_editor.brush_size = int(value)
	_update_brush_label()


func _on_edge_selected(index: int) -> void:
	if hex_editor and index >= 0 and index < EDGE_TYPES.size():
		hex_editor.current_edge_type = EDGE_TYPES[index]


func _on_terrain_selected(index: int) -> void:
	if hex_editor and index >= 0 and index < TERRAINS.size():
		hex_editor.current_terrain = TERRAINS[index]


# ============================================================================
# INSPECTOR
# ============================================================================

func _on_hex_selected(coord: Vector2i) -> void:
	if not hex_editor:
		return

	var hex_data: Dictionary = hex_editor.get_hex(coord)

	# Update coords
	coords_info_label.text = "Coords: (%d, %d)" % [coord.x, coord.y]

	# Update name and description
	var hex_name: String = str(hex_data.get("name", ""))
	var hex_desc: String = str(hex_data.get("description", ""))
	if hex_name_label:
		hex_name_label.text = hex_name if hex_name != "" else "(Unnamed)"
	if hex_desc_label:
		hex_desc_label.text = hex_desc

	# Update OSM data display
	_update_osm_data_display(hex_data)


func _update_osm_data_display(hex_data: Dictionary) -> void:
	if not osm_data_text:
		return

	var text := ""

	# Hex basic data
	var terrain: String = str(hex_data.get("terrain", "unknown"))
	var elevation: int = int(hex_data.get("elevation", 0))
	var impedance: Variant = hex_data.get("impedance", null)
	var hex_features: Variant = hex_data.get("features", [])

	text += "[b]Hex Data:[/b]\n"
	text += "  Terrain: [color=lime]%s[/color]\n" % terrain.capitalize()
	text += "  Elevation: %d\n" % elevation
	if impedance != null:
		text += "  Impedance: %.1f\n" % float(impedance)

	# Hex-level features (simplified from OSM)
	if hex_features is Array and (hex_features as Array).size() > 0:
		var feat_list: Array = hex_features as Array
		text += "  Tags: %s\n" % ", ".join(feat_list)

	# OSM datalayer
	var datalayer: Variant = hex_data.get("datalayer", null)
	if not (datalayer is Dictionary) or (datalayer as Dictionary).is_empty():
		osm_data_text.clear()
		osm_data_text.append_text(text + "\n[color=gray]No detailed OSM data[/color]")
		return

	var osm_dict: Dictionary = datalayer as Dictionary
	var osm: Variant = osm_dict.get("osm", null)
	if not (osm is Dictionary) or (osm as Dictionary).is_empty():
		osm_data_text.clear()
		osm_data_text.append_text(text + "\n[color=gray]No detailed OSM data[/color]")
		return

	var osm_data: Dictionary = osm as Dictionary

	# Infrastructure
	var has_road: bool = osm_data.get("has_road", false)
	var has_railway: bool = osm_data.get("has_railway", false)
	var has_water: bool = osm_data.get("has_water", false)
	var has_forest: bool = osm_data.get("has_forest", false)
	var has_farmland: bool = osm_data.get("has_farmland", false)
	var has_urban: bool = osm_data.get("has_urban", false)
	var building_count: int = int(osm_data.get("building_count", 0))

	text += "\n[b]Infrastructure:[/b]\n"
	var infra_items: Array[String] = []
	if has_road:
		infra_items.append("[color=green]Road[/color]")
	if has_railway:
		infra_items.append("[color=orange]Railway[/color]")
	if has_water:
		infra_items.append("[color=cyan]Water[/color]")
	if building_count > 0:
		infra_items.append("Buildings: %d" % building_count)
	if infra_items.size() > 0:
		text += "  %s\n" % ", ".join(infra_items)
	else:
		text += "  [color=gray]None[/color]\n"

	# Land Cover
	text += "\n[b]Land Cover:[/b]\n"
	var land_items: Array[String] = []
	if has_forest:
		land_items.append("[color=green]Forest[/color]")
	if has_farmland:
		land_items.append("[color=yellow]Farmland[/color]")
	if has_urban:
		land_items.append("[color=gray]Urban[/color]")
	if land_items.size() > 0:
		text += "  %s\n" % ", ".join(land_items)
	else:
		text += "  [color=gray]None detected[/color]\n"

	# Landuse details
	var landuse: Variant = osm_data.get("landuse", [])
	if landuse is Array and (landuse as Array).size() > 0:
		text += "\n[b]Landuse Types:[/b]\n"
		for lu in landuse:
			text += "  %s\n" % str(lu)

	# Natural features
	var natural: Variant = osm_data.get("natural", [])
	if natural is Array and (natural as Array).size() > 0:
		text += "\n[b]Natural Features:[/b]\n"
		for nf in natural:
			text += "  %s\n" % str(nf)

	# OSM Features (detailed)
	var features: Variant = osm_data.get("features", [])
	if features is Array and (features as Array).size() > 0:
		text += "\n[b]All OSM Tags (%d):[/b]\n" % (features as Array).size()
		var unique_features := {}
		for f in features:
			var f_str: String = str(f)
			unique_features[f_str] = unique_features.get(f_str, 0) + 1
		for f_key in unique_features.keys():
			var count: int = unique_features[f_key]
			if count > 1:
				text += "  %s [color=gray](x%d)[/color]\n" % [f_key, count]
			else:
				text += "  %s\n" % f_key

	# Places
	var places: Variant = osm_data.get("places", [])
	if places is Array and (places as Array).size() > 0:
		var places_arr: Array = places as Array
		text += "\n[b]Places (%d):[/b]\n" % places_arr.size()
		for p in places_arr:
			if not (p is Dictionary):
				continue
			var p_dict: Dictionary = p as Dictionary
			var pname: String = str(p_dict.get("name", "Unknown"))
			var ptype: String = str(p_dict.get("type", ""))
			var pop: String = str(p_dict.get("population", ""))
			text += "  [color=yellow]%s[/color]" % pname
			if ptype != "":
				text += " [color=gray](%s)[/color]" % ptype
			if pop != "" and pop != "0":
				text += " [color=white]pop: %s[/color]" % pop
			text += "\n"

	# Historic features
	var historic: Variant = osm_data.get("historic", [])
	if historic is Array and (historic as Array).size() > 0:
		var historic_arr: Array = historic as Array
		text += "\n[b]Historic Sites (%d):[/b]\n" % historic_arr.size()
		for h in historic_arr:
			if not (h is Dictionary):
				continue
			var h_dict: Dictionary = h as Dictionary
			var hname: String = str(h_dict.get("name", ""))
			var htype: String = str(h_dict.get("type", ""))
			if hname != "":
				text += "  [color=orange]%s[/color] [color=gray](%s)[/color]\n" % [hname, htype]
			else:
				text += "  [color=gray]%s[/color]\n" % htype

	# Tourism features
	var tourism: Variant = osm_data.get("tourism", [])
	if tourism is Array and (tourism as Array).size() > 0:
		var tourism_arr: Array = tourism as Array
		text += "\n[b]Tourism (%d):[/b]\n" % tourism_arr.size()
		for t in tourism_arr:
			if not (t is Dictionary):
				continue
			var t_dict: Dictionary = t as Dictionary
			var tname: String = str(t_dict.get("name", ""))
			var ttype: String = str(t_dict.get("type", ""))
			if tname != "":
				text += "  [color=lime]%s[/color] [color=gray](%s)[/color]\n" % [tname, ttype]
			else:
				text += "  [color=gray]%s[/color]\n" % ttype

	# Amenities
	var amenities: Variant = osm_data.get("amenities", [])
	if amenities is Array and (amenities as Array).size() > 0:
		var amenities_arr: Array = amenities as Array
		text += "\n[b]Amenities (%d):[/b]\n" % amenities_arr.size()
		for a in amenities_arr:
			if not (a is Dictionary):
				continue
			var a_dict: Dictionary = a as Dictionary
			var aname: String = str(a_dict.get("name", ""))
			var atype: String = str(a_dict.get("type", ""))
			if aname != "":
				text += "  [color=cyan]%s[/color] [color=gray](%s)[/color]\n" % [aname, atype]
			else:
				text += "  [color=gray]%s[/color]\n" % atype

	# Leisure areas
	var leisure: Variant = osm_data.get("leisure", [])
	if leisure is Array and (leisure as Array).size() > 0:
		var leisure_arr: Array = leisure as Array
		text += "\n[b]Leisure (%d):[/b]\n" % leisure_arr.size()
		for l in leisure_arr:
			if not (l is Dictionary):
				continue
			var l_dict: Dictionary = l as Dictionary
			var lname: String = str(l_dict.get("name", ""))
			var ltype: String = str(l_dict.get("type", ""))
			if lname != "":
				text += "  [color=green]%s[/color] [color=gray](%s)[/color]\n" % [lname, ltype]
			else:
				text += "  [color=gray]%s[/color]\n" % ltype

	# Natural point features (peaks, springs, etc.)
	var natural_points: Variant = osm_data.get("natural_points", [])
	if natural_points is Array and (natural_points as Array).size() > 0:
		var np_arr: Array = natural_points as Array
		text += "\n[b]Natural Points (%d):[/b]\n" % np_arr.size()
		for np in np_arr:
			if not (np is Dictionary):
				continue
			var np_dict: Dictionary = np as Dictionary
			var npname: String = str(np_dict.get("name", ""))
			var nptype: String = str(np_dict.get("type", ""))
			var ele: String = str(np_dict.get("elevation", ""))
			if npname != "":
				text += "  [color=magenta]%s[/color] [color=gray](%s)[/color]" % [npname, nptype]
			else:
				text += "  [color=gray]%s[/color]" % nptype
			if ele != "":
				text += " [color=white]%sm[/color]" % ele
			text += "\n"

	osm_data_text.clear()
	osm_data_text.append_text(text)


func _refresh_regions_ui() -> void:
	if not hex_editor:
		return
	pass  # Region UI removed


func _sync_layers_ui() -> void:
	pass  # Layer UI removed


# ============================================================================
# MINIMAP
# ============================================================================

func _on_minimap_reset_zoom() -> void:
	if minimap_rect and minimap_rect.has_method("reset_zoom"):
		minimap_rect.reset_zoom()


func _on_minimap_center() -> void:
	if hex_editor and hex_editor.has_method("center_view_on_studio"):
		hex_editor.center_view_on_studio()


func _on_minimap_go_studio() -> void:
	if hex_editor and hex_editor.has_method("center_view_on_studio"):
		hex_editor.center_view_on_studio()
		_toast("Centered on Studio")


# ============================================================================
# QUICK ACTIONS
# ============================================================================

func _on_noise_fill_pressed() -> void:
	if hex_editor:
		hex_editor.apply_noise_fill(int(Time.get_unix_time_from_system()) % 100000)
		_toast("Noise fill applied")


func _on_smooth_elevation_pressed() -> void:
	if hex_editor:
		hex_editor.smooth_elevation()
		_toast("Elevation smoothed")


func _on_ridge_pressed() -> void:
	if hex_editor:
		hex_editor.create_ridge_from_selection()


func _on_river_pressed() -> void:
	if hex_editor:
		hex_editor.create_river_from_selection()


func _on_save_stamp_pressed() -> void:
	if not hex_editor:
		return
	if _stamp_save_dialog == null:
		_stamp_save_dialog = FileDialog.new()
		_stamp_save_dialog.file_mode = FileDialog.FILE_MODE_SAVE_FILE
		_stamp_save_dialog.access = FileDialog.ACCESS_FILESYSTEM
		_stamp_save_dialog.filters = PackedStringArray(["*.stamp.json ; Stamp JSON"])
		_stamp_save_dialog.file_selected.connect(_on_stamp_save_selected)
		add_child(_stamp_save_dialog)
	_stamp_save_dialog.popup_centered(Vector2(800, 600))


func _on_stamp_save_selected(path: String) -> void:
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
		_stamp_load_dialog.file_selected.connect(_on_stamp_load_selected)
		add_child(_stamp_load_dialog)
	_stamp_load_dialog.popup_centered(Vector2(800, 600))


func _on_stamp_load_selected(path: String) -> void:
	if hex_editor:
		hex_editor.import_stamp(path)
		_toast("Stamp loaded: %s" % path.get_file())


func _on_export_pressed() -> void:
	if not hex_editor:
		return
	if _export_dialog == null:
		_export_dialog = FileDialog.new()
		_export_dialog.file_mode = FileDialog.FILE_MODE_SAVE_FILE
		_export_dialog.access = FileDialog.ACCESS_FILESYSTEM
		_export_dialog.filters = PackedStringArray(["*.json ; Runtime JSON", "*.hxb ; Hex Binary"])
		_export_dialog.file_selected.connect(_on_export_selected)
		add_child(_export_dialog)
	_export_dialog.popup_centered(Vector2(800, 600))


func _on_export_selected(path: String) -> void:
	if hex_editor:
		hex_editor.export_runtime(path)
		_toast("Exported: %s" % path.get_file())


func _on_import_pressed() -> void:
	if not hex_editor:
		return
	if _import_dialog == null:
		_import_dialog = FileDialog.new()
		_import_dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE
		_import_dialog.access = FileDialog.ACCESS_FILESYSTEM
		_import_dialog.filters = PackedStringArray(["*.json ; Runtime JSON", "*.hxb ; Hex Binary"])
		_import_dialog.file_selected.connect(_on_import_selected)
		add_child(_import_dialog)
	_import_dialog.popup_centered(Vector2(800, 600))


func _on_import_selected(path: String) -> void:
	if hex_editor:
		hex_editor.import_runtime(path)
		_toast("Imported: %s" % path.get_file())


# ============================================================================
# FILE OPERATIONS
# ============================================================================

func _on_new_map() -> void:
	if hex_editor:
		hex_editor.clear_map()
		hex_editor.map_path = ""
		_toast("New map created")


func _on_open() -> void:
	print("[MainEditor] _on_open() called")
	if _load_dialog == null:
		print("[MainEditor] Creating new FileDialog for loading")
		_load_dialog = FileDialog.new()
		_load_dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE
		_load_dialog.access = FileDialog.ACCESS_FILESYSTEM
		_load_dialog.filters = PackedStringArray(["*.json ; JSON Map Files"])
		_load_dialog.file_selected.connect(_on_load_selected)
		_load_dialog.title = "Open Map"
		_load_dialog.use_native_dialog = false
		_load_dialog.initial_position = Window.WINDOW_INITIAL_POSITION_CENTER_MAIN_WINDOW_SCREEN
		add_child(_load_dialog)
		print("[MainEditor] FileDialog created and added to scene tree")

	# Set initial directory - try multiple fallbacks
	var maps_dir: String = ""

	# First try: last used path
	if hex_editor and hex_editor.map_path != "":
		var last_dir: String = hex_editor.map_path.get_base_dir()
		if last_dir != "" and DirAccess.dir_exists_absolute(last_dir):
			maps_dir = last_dir

	# Second try: res://maps
	if maps_dir == "":
		var res_maps: String = ProjectSettings.globalize_path("res://maps")
		if DirAccess.dir_exists_absolute(res_maps):
			maps_dir = res_maps

	# Third try: user://maps (create if needed)
	if maps_dir == "":
		var user_maps: String = ProjectSettings.globalize_path("user://maps")
		if not DirAccess.dir_exists_absolute(user_maps):
			var err := DirAccess.make_dir_recursive_absolute(user_maps)
			if err != OK:
				_log("Failed to create user://maps directory")
		if DirAccess.dir_exists_absolute(user_maps):
			maps_dir = user_maps

	# Final fallback: user data directory
	if maps_dir == "":
		maps_dir = OS.get_user_data_dir()

	_load_dialog.current_dir = maps_dir
	print("[MainEditor] Opening file dialog in: %s" % maps_dir)

	# Ensure dialog is in scene tree
	if not _load_dialog.is_inside_tree():
		print("[MainEditor] ERROR: Dialog is not in scene tree!")
		add_child(_load_dialog)

	# Show the dialog with explicit size (workaround for Godot 4.5 popup issues)
	_load_dialog.size = Vector2i(800, 600)
	_load_dialog.popup_centered(Vector2i(800, 600))
	print("[MainEditor] popup_centered called, dialog visible=%s, in_tree=%s" % [str(_load_dialog.visible), str(_load_dialog.is_inside_tree())])


func _on_load_selected(path: String) -> void:
	if not hex_editor:
		_toast_error("No hex editor available")
		return

	if not FileAccess.file_exists(path):
		_toast_error("File not found: %s" % path.get_file())
		return

	var error: Error = hex_editor.load_map(path)
	if error == OK:
		hex_editor.map_path = path
		_add_recent(path)
		_update_status_bar()
		_toast_success("Loaded: %s (%d hexes)" % [path.get_file(), hex_editor.map_data.size()])
	else:
		_toast_error("Failed to load: %s (Error %d)" % [path.get_file(), error])


func _on_save() -> void:
	if not hex_editor:
		_toast_error("No hex editor available")
		return
	if hex_editor.map_path == "":
		_on_save_as()
		return

	var error: Error = hex_editor.save_map(hex_editor.map_path)
	if error == OK:
		_add_recent(hex_editor.map_path)
		_update_status_bar()
		_toast_success("Saved: %s (%d hexes)" % [hex_editor.map_path.get_file(), hex_editor.map_data.size()])
	else:
		_toast_error("Failed to save: %s (Error %d)" % [hex_editor.map_path.get_file(), error])


func _on_save_as() -> void:
	if _save_dialog == null:
		_save_dialog = FileDialog.new()
		_save_dialog.file_mode = FileDialog.FILE_MODE_SAVE_FILE
		_save_dialog.access = FileDialog.ACCESS_FILESYSTEM
		_save_dialog.filters = PackedStringArray(["*.json ; JSON Map Files"])
		_save_dialog.file_selected.connect(_on_save_selected)
		_save_dialog.title = "Save Map As"
		_save_dialog.use_native_dialog = false  # Use Godot's built-in dialog for reliability
		add_child(_save_dialog)

	# Set initial directory - try multiple fallbacks
	var maps_dir: String = ""

	# First try: current file's directory
	if hex_editor and hex_editor.map_path != "":
		var last_dir: String = hex_editor.map_path.get_base_dir()
		if last_dir != "" and DirAccess.dir_exists_absolute(last_dir):
			maps_dir = last_dir
		_save_dialog.current_file = hex_editor.map_path.get_file()
	else:
		_save_dialog.current_file = "untitled.json"

	# Second try: res://maps
	if maps_dir == "":
		var res_maps: String = ProjectSettings.globalize_path("res://maps")
		if DirAccess.dir_exists_absolute(res_maps):
			maps_dir = res_maps

	# Third try: user://maps (create if needed)
	if maps_dir == "":
		var user_maps: String = ProjectSettings.globalize_path("user://maps")
		if not DirAccess.dir_exists_absolute(user_maps):
			DirAccess.make_dir_recursive_absolute(user_maps)
		if DirAccess.dir_exists_absolute(user_maps):
			maps_dir = user_maps

	# Final fallback: user data directory
	if maps_dir == "":
		maps_dir = OS.get_user_data_dir()

	_save_dialog.current_dir = maps_dir
	_log("Opening save dialog in: %s" % maps_dir)
	_save_dialog.popup_centered(Vector2i(800, 600))


func _on_save_selected(path: String) -> void:
	if not hex_editor:
		_toast_error("No hex editor available")
		return

	# Ensure .json extension
	if not path.ends_with(".json"):
		path += ".json"

	var error: Error = hex_editor.save_map(path)
	if error == OK:
		hex_editor.map_path = path
		_add_recent(path)
		_update_status_bar()
		_toast_success("Saved: %s (%d hexes)" % [path.get_file(), hex_editor.map_data.size()])
	else:
		_toast_error("Failed to save: %s (Error %d)" % [path.get_file(), error])


func _on_undo_pressed() -> void:
	if hex_editor:
		hex_editor.undo()


func _on_redo_pressed() -> void:
	if hex_editor:
		hex_editor.redo()


func _on_copy() -> void:
	if hex_editor and hex_editor.has_method("copy_selection"):
		hex_editor.copy_selection()


func _on_paste() -> void:
	if hex_editor and hex_editor.has_method("paste_stamp"):
		hex_editor.paste_stamp()


func _on_validate() -> void:
	if hex_editor:
		hex_editor.validate_map()


func _on_validation_result(issues: Array) -> void:
	_set_issues(issues)
	var passed: bool = false
	if issues.size() == 1:
		passed = str(issues[0]).begins_with("Map validation passed")
	if passed:
		_toast("Validation passed!", ToastNotification.ToastType.SUCCESS)
	else:
		_toast("Found %d issues" % issues.size(), ToastNotification.ToastType.WARNING)


func _on_expand_map() -> void:
	if hex_editor:
		hex_editor.expand_map()
		_toast("Map expanded")


# ============================================================================
# HEX EDITOR EVENTS
# ============================================================================

func _on_map_changed() -> void:
	_update_hex_count()
	_refresh_regions_ui()
	_sync_layers_ui()
	_refresh_history_dropdown()


func _update_hex_count() -> void:
	if hex_editor:
		hex_count_label.text = "Hexes: %d" % hex_editor.get_hex_count()


# ============================================================================
# LAYOUT MANAGEMENT
# ============================================================================

func toggle_left_dock() -> void:
	left_dock_visible = not left_dock_visible
	left_dock.visible = left_dock_visible
	_update_floating_minimap_visibility()
	_save_layout_config()


func toggle_right_dock() -> void:
	right_dock_visible = not right_dock_visible
	right_dock.visible = right_dock_visible
	_update_floating_minimap_visibility()
	_save_layout_config()


func _update_floating_minimap_visibility() -> void:
	# Show floating minimap when right dock is hidden
	var should_show := not right_dock_visible
	if floating_minimap:
		floating_minimap.visible = should_show
		# Also update the shortcut hint position
		if shortcuts_hint:
			if should_show:
				shortcuts_hint.offset_top = -244.0  # Move up to make room for minimap
			else:
				shortcuts_hint.offset_top = -24.0


func _connect_floating_minimap_signals() -> void:
	if floating_minimap_close_btn:
		floating_minimap_close_btn.pressed.connect(_on_floating_minimap_close)
	# Connect floating minimap to hex editor
	if floating_minimap_rect and floating_minimap_rect.has_method("set_hex_editor"):
		floating_minimap_rect.set_hex_editor(hex_editor)


func _on_floating_minimap_close() -> void:
	if floating_minimap:
		floating_minimap.visible = false


func _on_split_dragged(_offset: int, _name: String) -> void:
	_save_layout_config()


func _reset_layout() -> void:
	left_dock_visible = true
	right_dock_visible = true
	left_dock.visible = true
	right_dock.visible = true

	await get_tree().process_frame
	main_split.split_offset = DEFAULT_LEFT_DOCK_WIDTH
	left_dock.split_offset = DEFAULT_TOOL_PALETTE_HEIGHT
	right_dock.split_offset = DEFAULT_RIGHT_DOCK_SPLIT
	if center_right_split:
		var viewport_w: int = int(get_viewport_rect().size.x)
		center_right_split.split_offset = max(500, viewport_w - main_split.split_offset - DEFAULT_RIGHT_DOCK_WIDTH)

	_update_floating_minimap_visibility()
	_save_layout_config()
	_toast("Layout reset")


func _save_layout_config() -> void:
	config.set_value("layout", "left_dock_visible", left_dock_visible)
	config.set_value("layout", "right_dock_visible", right_dock_visible)
	config.set_value("layout", "main_split", main_split.split_offset)
	config.set_value("layout", "left_split", left_dock.split_offset)
	config.set_value("layout", "right_split", right_dock.split_offset)
	if center_right_split:
		config.set_value("layout", "center_split", center_right_split.split_offset)
	config.save(CONFIG_PATH)


func _ensure_split_hierarchy() -> void:
	# Godot SplitContainers only support 2 direct children. `MainSplit` was authored with 3
	# (LeftDock, CenterPanel, RightDock) which causes them to overlap at runtime.
	# Fix by nesting CenterPanel + RightDock in a secondary HSplitContainer.
	if not main_split or not left_dock or not center_panel or not right_dock:
		return

	# Reuse existing node if already present (future-proof if scene is updated).
	for c in main_split.get_children():
		if c is HSplitContainer and c.name == "CenterRightSplit":
			center_right_split = c as HSplitContainer
			return

	if main_split.get_child_count() <= 2:
		return

	center_right_split = HSplitContainer.new()
	center_right_split.name = "CenterRightSplit"
	center_right_split.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	center_right_split.size_flags_vertical = Control.SIZE_EXPAND_FILL

	# Remove CenterPanel and RightDock from MainSplit and reparent them.
	if center_panel.get_parent() == main_split:
		main_split.remove_child(center_panel)
	if right_dock.get_parent() == main_split:
		main_split.remove_child(right_dock)

	main_split.add_child(center_right_split)
	main_split.move_child(center_right_split, 1)
	center_right_split.add_child(center_panel)
	center_right_split.add_child(right_dock)


# ============================================================================
# VIEWPORT SIZING
# ============================================================================

func _update_viewport_size() -> void:
	if not sub_viewport or not center_panel:
		return

	# Set SubViewport size to match the center panel
	var panel_size := center_panel.size
	sub_viewport.size = Vector2i(int(panel_size.x), int(panel_size.y))

	# Update HexEditor position to center of viewport
	if hex_editor:
		hex_editor.position = panel_size / 2.0


func _on_viewport_resized() -> void:
	# Defer to ensure layout is complete
	_update_viewport_size.call_deferred()


# ============================================================================
# SYNC UI FROM EDITOR
# ============================================================================

func _sync_ui_from_editor() -> void:
	if not hex_editor:
		return

	# Sync view menu checkboxes
	var popup := view_menu.get_popup()
	popup.set_item_checked(3, hex_editor.show_grid)
	popup.set_item_checked(4, hex_editor.show_coords)
	popup.set_item_checked(5, hex_editor.show_hex_grid)
	var basemap_idx := popup.get_item_index(12)
	if basemap_idx >= 0 and _obj_has_property(hex_editor, &"show_basemap"):
		popup.set_item_checked(basemap_idx, bool(hex_editor.get(&"show_basemap")))

	# Sync brush
	brush_slider.value = float(hex_editor.brush_size)
	_update_brush_label()

	# Sync terrain
	var idx := TERRAINS.find(hex_editor.current_terrain)
	if idx >= 0:
		terrain_selector.select(idx)

	# Sync edge
	var edge_idx := EDGE_TYPES.find(hex_editor.current_edge_type)
	if edge_idx >= 0:
		edge_selector.select(edge_idx)

	# Sync layers and regions
	_sync_layers_ui()
	_refresh_regions_ui()

	# Update tool buttons
	_update_tool_buttons()
	_update_tool_indicator()
	_update_hex_count()


# ============================================================================
# STATUS BAR
# ============================================================================

func _update_status_bar() -> void:
	if not hex_editor:
		return

	var unsaved := "*" if hex_editor.has_unsaved_changes else ""
	var map_file := str(hex_editor.map_path).get_file() if hex_editor.map_path != "" else "untitled"
	var last_save: String = hex_editor.last_save_time if hex_editor.last_save_time != "" else "never"

	status_label.text = "%s%s | Last save: %s" % [unsaved, map_file, last_save]


# ============================================================================
# DEBUG PANEL
# ============================================================================

func _update_debug_panel() -> void:
	if not hex_editor:
		return

	var bounds: Rect2i = hex_editor.get_map_bounds()

	debug_label.text = """=== HEX EDITOR DEBUG ===
Hexes: %d | Edges: %d
Bounds: q[%d,%d] r[%d,%d]
Camera: (%.0f, %.0f)
Hex size: %.1f px
Tool: %s | Brush: %d
Terrain: %s
Hover: (%d, %d) %s
Selected: (%d, %d) %s
Undo: %d | Redo: %d""" % [
		hex_editor.map_data.size(),
		hex_editor.edge_data.size(),
		bounds.position.x, bounds.position.x + bounds.size.x - 1,
		bounds.position.y, bounds.position.y + bounds.size.y - 1,
		hex_editor.camera_offset.x, hex_editor.camera_offset.y,
		hex_editor.hex_size,
		["Paint", "Fill", "Erase", "Edge", "POI", "Region", "Select"][hex_editor.current_tool],
		hex_editor.brush_size,
		hex_editor.current_terrain,
		hex_editor.hovered_hex.x, hex_editor.hovered_hex.y,
		str(hex_editor.has_hover),
		hex_editor.selected_hex.x, hex_editor.selected_hex.y,
		str(hex_editor.has_selection),
		hex_editor.get_history_index(),
		max(0, hex_editor.get_history_labels().size() - 1 - hex_editor.get_history_index())
	]


# ============================================================================
# HELP
# ============================================================================

func _toggle_help() -> void:
	_help_visible = not _help_visible
	help_panel.visible = _help_visible
	if _help_visible:
		_update_help_text()


func _toggle_log_panel() -> void:
	if log_panel:
		log_panel.visible = not log_panel.visible
		_update_panel_menu_checks()


func _toggle_debug_panel() -> void:
	if debug_panel:
		debug_panel.visible = not debug_panel.visible
		_update_panel_menu_checks()


func _toggle_floating_minimap() -> void:
	if floating_minimap:
		floating_minimap.visible = not floating_minimap.visible
		_update_panel_menu_checks()


func _update_panel_menu_checks() -> void:
	if not view_menu:
		return
	var popup: PopupMenu = view_menu.get_popup()
	# Update Log Panel check (id 13)
	var log_idx: int = popup.get_item_index(13)
	if log_idx >= 0 and log_panel:
		popup.set_item_checked(log_idx, log_panel.visible)
	# Update Debug Panel check (id 14)
	var debug_idx: int = popup.get_item_index(14)
	if debug_idx >= 0 and debug_panel:
		popup.set_item_checked(debug_idx, debug_panel.visible)
	# Update Floating Minimap check (id 15)
	var minimap_idx: int = popup.get_item_index(15)
	if minimap_idx >= 0 and floating_minimap:
		popup.set_item_checked(minimap_idx, floating_minimap.visible)


# ============================================================================
# TOAST & LOGGING
# ============================================================================

func _init_toast() -> void:
	if _toast_node != null:
		return
	var inst: Node = TOAST_SCENE.instantiate()
	_toast_node = inst as ToastNotification
	add_child(inst)
	if toast_label:
		toast_label.visible = false


func _toast(text: String, type: int = ToastNotification.ToastType.INFO, seconds: float = 2.5) -> void:
	ToastNotification.show_toast(text, type, seconds)


func _toast_success(text: String, seconds: float = 2.5) -> void:
	_toast(text, ToastNotification.ToastType.SUCCESS, seconds)


func _toast_error(text: String, seconds: float = 4.0) -> void:
	_toast(text, ToastNotification.ToastType.ERROR, seconds)
	_log("ERROR: " + text)


func _toast_warning(text: String, seconds: float = 3.0) -> void:
	_toast(text, ToastNotification.ToastType.WARNING, seconds)


func _log(message: String) -> void:
	var time_str := Time.get_time_string_from_system().substr(0, 8)
	var full_msg := "[%s] %s" % [time_str, message]
	print("[MainEditor] ", full_msg)

	log_history.append(full_msg)
	if log_history.size() > MAX_LOG_LINES:
		log_history.pop_front()

	if log_text:
		var combined := ""
		for msg in log_history:
			combined += msg + "\n"
		log_text.text = combined


# ============================================================================
# RECENT FILES
# ============================================================================

func _load_recent_maps() -> void:
	_recent_paths.clear()
	if not FileAccess.file_exists(RECENTS_PATH):
		return
	var f: FileAccess = FileAccess.open(RECENTS_PATH, FileAccess.READ)
	if f == null:
		return
	var parsed: Variant = JSON.parse_string(f.get_as_text())
	f.close()
	if parsed is Array:
		for p in parsed:
			_recent_paths.append(str(p))


func _save_recent_maps() -> void:
	var f: FileAccess = FileAccess.open(RECENTS_PATH, FileAccess.WRITE)
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


# ============================================================================
# SETTINGS (UI SCALE / HIGH CONTRAST / SHORTCUTS)
# ============================================================================

func _load_settings() -> void:
	_ui_scale = 1.0
	_high_contrast = false
	_bindings.clear()
	_terrain_opacity = 0.0
	_basemap_opacity = 0.85

	if not FileAccess.file_exists(SETTINGS_PATH):
		return
	var f: FileAccess = FileAccess.open(SETTINGS_PATH, FileAccess.READ)
	if f == null:
		return
	var parsed: Variant = JSON.parse_string(f.get_as_text())
	f.close()
	if not (parsed is Dictionary):
		return

	var d: Dictionary = parsed as Dictionary
	_ui_scale = float(d.get("ui_scale", 1.0))
	_high_contrast = bool(d.get("high_contrast", false))
	_terrain_opacity = float(d.get("terrain_opacity", 0.0))
	_basemap_opacity = float(d.get("basemap_opacity", 0.85))
	var binds_v: Variant = d.get("bindings", {})
	if binds_v is Dictionary:
		_bindings = (binds_v as Dictionary).duplicate(true)


func _save_settings() -> void:
	var payload: Dictionary = {
		"ui_scale": _ui_scale,
		"high_contrast": _high_contrast,
		"terrain_opacity": _terrain_opacity,
		"basemap_opacity": _basemap_opacity,
		"bindings": _bindings,
	}
	var f: FileAccess = FileAccess.open(SETTINGS_PATH, FileAccess.WRITE)
	if f == null:
		return
	f.store_string(JSON.stringify(payload))
	f.close()


func _apply_ui_scale() -> void:
	_ui_scale = clampf(_ui_scale, 0.75, 1.5)

	# Prefer engine-level DPI scaling when available; fall back to local scaling.
	var win: Window = get_window()
	if win:
		var has_prop: bool = false
		for p in win.get_property_list():
			if p is Dictionary and str((p as Dictionary).get("name", "")) == "content_scale_factor":
				has_prop = true
				break
		if has_prop:
			win.set("content_scale_factor", _ui_scale)
			return

	# Fallback (rare): scale the root UI container.
	var root_ui: Control = get_node_or_null("VBoxContainer") as Control
	if root_ui:
		root_ui.scale = Vector2(_ui_scale, _ui_scale)


func _apply_high_contrast() -> void:
	if _base_theme == null:
		_base_theme = theme
	if not _high_contrast:
		theme = _base_theme
		return

	if _high_contrast_theme == null and _base_theme != null:
		_high_contrast_theme = (_base_theme.duplicate(true) as Theme)
		var bright: Color = Color(1, 1, 1, 1)
		var dim: Color = Color(0.75, 0.75, 0.75, 1)
		for t in ["Label", "Button", "CheckBox", "OptionButton", "LineEdit", "TextEdit", "RichTextLabel"]:
			_high_contrast_theme.set_color("font_color", t, bright)
			_high_contrast_theme.set_color("font_color_disabled", t, dim)

	theme = _high_contrast_theme if _high_contrast_theme != null else _base_theme


# ============================================================================
# INPUT ACTIONS / BINDINGS
# ============================================================================

func _init_input_actions() -> void:
	for def in ACTION_DEFS:
		var action_id: String = str(def.get("id", ""))
		if action_id == "":
			continue
		if not InputMap.has_action(action_id):
			InputMap.add_action(action_id)

		var binding: Dictionary = {}
		if _bindings.has(action_id) and _bindings[action_id] is Dictionary:
			binding = (_bindings[action_id] as Dictionary).duplicate(true)
		else:
			var default_v: Variant = def.get("binding", {})
			if default_v is Dictionary:
				binding = (default_v as Dictionary).duplicate(true)
		_bindings[action_id] = binding.duplicate(true)

		InputMap.action_erase_events(action_id)
		if binding.has("keycode"):
			var ev: InputEventKey = _binding_to_event(binding)
			InputMap.action_add_event(action_id, ev)


func _binding_to_event(binding: Dictionary) -> InputEventKey:
	var ev: InputEventKey = InputEventKey.new()
	ev.keycode = int(binding.get("keycode", 0))
	ev.ctrl_pressed = bool(binding.get("ctrl", false))
	ev.shift_pressed = bool(binding.get("shift", false))
	ev.alt_pressed = bool(binding.get("alt", false))
	ev.meta_pressed = bool(binding.get("meta", false))
	return ev


func _binding_to_string(binding_v: Variant) -> String:
	if not (binding_v is Dictionary):
		return ""
	var b: Dictionary = binding_v as Dictionary
	if not b.has("keycode"):
		return ""
	var parts: Array[String] = []
	if bool(b.get("ctrl", false)):
		parts.append("Ctrl")
	if bool(b.get("shift", false)):
		parts.append("Shift")
	if bool(b.get("alt", false)):
		parts.append("Alt")
	if bool(b.get("meta", false)):
		parts.append("Meta")
	parts.append(OS.get_keycode_string(int(b.get("keycode", 0))))
	return "+".join(parts)


# ============================================================================
# COMMAND PALETTE
# ============================================================================

func _init_command_palette() -> void:
	if _command_palette != null:
		return
	var inst: Node = COMMAND_PALETTE_SCENE.instantiate()
	_command_palette = inst as CommandPalette
	add_child(inst)
	if _command_palette:
		_command_palette.action_chosen.connect(_on_palette_action_chosen)


func _open_command_palette() -> void:
	if _command_palette == null:
		_init_command_palette()
	if _command_palette == null:
		return
	_command_palette.open(_build_palette_actions())


func _build_palette_actions() -> Array[Dictionary]:
	var actions: Array[Dictionary] = []
	actions.append({"id": "file.new", "title": "File: New Map"})
	actions.append({"id": "file.open", "title": "File: Open…", "subtitle": _binding_to_string(_bindings.get("hexeditor.open", {}))})
	actions.append({"id": "file.save", "title": "File: Save", "subtitle": _binding_to_string(_bindings.get("hexeditor.save", {}))})
	actions.append({"id": "file.save_as", "title": "File: Save As…", "subtitle": _binding_to_string(_bindings.get("hexeditor.save_as", {}))})
	actions.append({"id": "file.export", "title": "File: Export Runtime…"})
	actions.append({"id": "file.import", "title": "File: Import Runtime…"})
	actions.append({"id": "edit.undo", "title": "Edit: Undo", "subtitle": _binding_to_string(_bindings.get("hexeditor.undo", {}))})
	actions.append({"id": "edit.redo", "title": "Edit: Redo", "subtitle": _binding_to_string(_bindings.get("hexeditor.redo", {}))})
	actions.append({"id": "edit.copy", "title": "Edit: Copy Selection", "subtitle": _binding_to_string(_bindings.get("hexeditor.copy", {}))})
	actions.append({"id": "edit.cut", "title": "Edit: Cut Selection", "subtitle": _binding_to_string(_bindings.get("hexeditor.cut", {}))})
	actions.append({"id": "edit.paste_stamp", "title": "Edit: Paste Stamp", "subtitle": _binding_to_string(_bindings.get("hexeditor.paste_stamp", {}))})
	actions.append({"id": "tools.validate", "title": "Tools: Validate Map", "subtitle": _binding_to_string(_bindings.get("hexeditor.validate", {}))})
	actions.append({"id": "tools.noise", "title": "Tools: Noise Fill"})
	actions.append({"id": "tools.smooth", "title": "Tools: Smooth Elevation"})
	actions.append({"id": "tools.ridge", "title": "Tools: Ridge From Selection"})
	actions.append({"id": "tools.river", "title": "Tools: River From Selection"})
	actions.append({"id": "view.toggle_left", "title": "View: Toggle Left Dock"})
	actions.append({"id": "view.toggle_right", "title": "View: Toggle Right Dock"})
	actions.append({"id": "view.reset_layout", "title": "View: Reset Layout"})
	actions.append({"id": "view.help", "title": "View: Help", "subtitle": _binding_to_string(_bindings.get("hexeditor.help", {}))})
	actions.append({"id": "view.settings", "title": "View: Settings…", "subtitle": _binding_to_string(_bindings.get("hexeditor.settings", {}))})
	return actions


func _on_palette_action_chosen(action_id: String) -> void:
	match action_id:
		"file.new": _on_new_map()
		"file.open": _on_open()
		"file.save": _on_save()
		"file.save_as": _on_save_as()
		"file.export": _on_export_pressed()
		"file.import": _on_import_pressed()
		"edit.undo": _on_undo_pressed()
		"edit.redo": _on_redo_pressed()
		"edit.copy": _on_copy()
		"edit.cut":
			if hex_editor and hex_editor.has_method("cut_selection"):
				hex_editor.cut_selection()
		"edit.paste_stamp":
			if hex_editor and hex_editor.has_method("paste_stamp"):
				hex_editor.paste_stamp()
		"tools.validate": _on_validate()
		"tools.noise": _on_noise_fill_pressed()
		"tools.smooth": _on_smooth_elevation_pressed()
		"tools.ridge": _on_ridge_pressed()
		"tools.river": _on_river_pressed()
		"view.toggle_left": toggle_left_dock()
		"view.toggle_right": toggle_right_dock()
		"view.reset_layout": _reset_layout()
		"view.help": _toggle_help()
		"view.settings": _open_settings()
		_:
			_toast("Unknown action: %s" % action_id, ToastNotification.ToastType.WARNING)


# ============================================================================
# SETTINGS DIALOG
# ============================================================================

func _init_settings_dialog() -> void:
	if _settings_dialog != null:
		return
	var inst: Node = SETTINGS_DIALOG_SCENE.instantiate()
	_settings_dialog = inst as SettingsDialog
	add_child(inst)
	if _settings_dialog:
		_settings_dialog.settings_applied.connect(_on_settings_applied)


func _open_settings() -> void:
	if _settings_dialog == null:
		_init_settings_dialog()
	if _settings_dialog == null:
		return
	_settings_dialog.open_with(_ui_scale, _high_contrast, ACTION_DEFS, _bindings, _terrain_opacity, _basemap_opacity)

	
func _on_settings_applied(ui_scale: float, high_contrast: bool, bindings: Dictionary, terrain_opacity: float, basemap_opacity: float) -> void:
	_ui_scale = ui_scale
	_high_contrast = high_contrast
	_bindings = bindings.duplicate(true)
	_terrain_opacity = terrain_opacity
	_basemap_opacity = basemap_opacity
	_init_input_actions()
	_apply_ui_scale()
	_apply_high_contrast()
	_update_help_text()
	_save_settings()
	if hex_editor:
		if _obj_has_property(hex_editor, &"terrain_opacity"):
			hex_editor.set(&"terrain_opacity", _terrain_opacity)
		if _obj_has_property(hex_editor, &"basemap_opacity"):
			hex_editor.set(&"basemap_opacity", _basemap_opacity)
	_toast("Settings applied", ToastNotification.ToastType.SUCCESS)


func _obj_has_property(obj: Object, prop: StringName) -> bool:
	if obj == null:
		return false
	for entry in obj.get_property_list():
		if entry is Dictionary and StringName((entry as Dictionary).get("name", "")) == prop:
			return true
	return false


# ============================================================================
# MENU EXTENSIONS
# ============================================================================

func _extend_menus() -> void:
	print("[MainEditor] _extend_menus called")
	if view_menu == null:
		print("[MainEditor] ERROR: view_menu is null!")
		return
	var view_popup: PopupMenu = view_menu.get_popup()
	if view_popup == null:
		print("[MainEditor] ERROR: view_popup is null!")
		return
	print("[MainEditor] View menu has %d items before extension" % view_popup.get_item_count())
	var has_basemap: bool = false
	var has_settings: bool = false
	var has_palette: bool = false
	var has_log_panel: bool = false
	var has_debug_panel: bool = false
	var has_floating_minimap: bool = false
	for i in range(view_popup.get_item_count()):
		var iid: int = view_popup.get_item_id(i)
		if iid == 12:
			has_basemap = true
		if iid == 10:
			has_settings = true
		if iid == 11:
			has_palette = true
		if iid == 13:
			has_log_panel = true
		if iid == 14:
			has_debug_panel = true
		if iid == 15:
			has_floating_minimap = true
	if not has_basemap or not has_settings or not has_palette:
		view_popup.add_separator()
		if not has_basemap:
			view_popup.add_check_item("Show Basemap", 12)
		if not has_settings:
			view_popup.add_item("Settings…", 10)
		if not has_palette:
			view_popup.add_item("Command Palette…", 11)
	# Add panel toggles
		if not has_log_panel or not has_debug_panel or not has_floating_minimap:
			view_popup.add_separator()
			if not has_log_panel:
				view_popup.add_check_item("Console Log", 13)
				print("[MainEditor] Added Console Log menu item")
			if not has_debug_panel:
				view_popup.add_check_item("Debug Panel", 14)
				print("[MainEditor] Added Debug Panel menu item")
		if not has_floating_minimap:
			view_popup.add_check_item("Floating Minimap", 15)
			print("[MainEditor] Added Floating Minimap menu item")
	print("[MainEditor] View menu has %d items after extension" % view_popup.get_item_count())


# ============================================================================
# TOOL ICONS
# ============================================================================

func _apply_tool_icons() -> void:
	var icons: Dictionary = {
		tool_paint_btn: "res://assets/icons/paint.svg",
		tool_fill_btn: "res://assets/icons/fill.svg",
		tool_erase_btn: "res://assets/icons/erase.svg",
		tool_edge_btn: "res://assets/icons/edge.svg",
		tool_poi_btn: "res://assets/icons/poi.svg",
		tool_region_btn: "res://assets/icons/region.svg",
		tool_select_btn: "res://assets/icons/select.svg",
	}
	for btn_v in icons.keys():
		if not (btn_v is Button):
			continue
		var btn: Button = btn_v as Button
		var path: String = str(icons[btn_v])
		var tex: Texture2D = load(path) as Texture2D
		if tex == null:
			continue
		btn.icon = tex
		btn.text = ""
		btn.expand_icon = true


# ============================================================================
# BRUSH HUD
# ============================================================================

func _update_brush_label() -> void:
	var bs: int = int(brush_slider.value) if brush_slider else (hex_editor.brush_size if hex_editor else 1)
	var radius: int = max(0, bs - 1)
	var affected: int = 1 + 3 * radius * (radius + 1)
	if brush_label:
		brush_label.text = "Brush: %d (radius %d, affects %d)" % [bs, radius, affected]


# ============================================================================
# RIGHT DOCK TABS / ISSUES
# ============================================================================

func _ensure_right_tabs() -> void:
	if right_dock == null:
		return
	if _right_tabs != null and is_instance_valid(_right_tabs):
		return

	var existing: Node = right_dock.get_node_or_null("RightTabs")
	if existing is TabContainer:
		_right_tabs = existing as TabContainer
		_issues_list = _right_tabs.find_child("IssuesList", true, false) as ItemList
		if _issues_list and not _issues_list.item_activated.is_connected(_on_issue_activated):
			_issues_list.item_activated.connect(_on_issue_activated)
		return

	var inspector: Control = right_dock.get_node_or_null("Inspector") as Control
	if inspector == null:
		return

	_right_tabs = TabContainer.new()
	_right_tabs.name = "RightTabs"
	_right_tabs.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_right_tabs.size_flags_vertical = Control.SIZE_EXPAND_FILL

	right_dock.remove_child(inspector)
	right_dock.add_child(_right_tabs)
	right_dock.move_child(_right_tabs, 0)
	_right_tabs.add_child(inspector)

	# Issues tab
	var issues_panel: PanelContainer = PanelContainer.new()
	issues_panel.name = "Issues"
	var vbox: VBoxContainer = VBoxContainer.new()
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_theme_constant_override("separation", 6)
	issues_panel.add_child(vbox)

	var header: HBoxContainer = HBoxContainer.new()
	vbox.add_child(header)
	var title: Label = Label.new()
	title.text = "Validation Issues"
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title)
	var validate_btn: Button = Button.new()
	validate_btn.text = "Validate"
	validate_btn.pressed.connect(_on_validate)
	header.add_child(validate_btn)

	_issues_list = ItemList.new()
	_issues_list.name = "IssuesList"
	_issues_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_issues_list.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_issues_list.allow_reselect = true
	_issues_list.item_activated.connect(_on_issue_activated)
	vbox.add_child(_issues_list)

	_right_tabs.add_child(issues_panel)
	_right_tabs.set_tab_title(0, "Inspector")
	_right_tabs.set_tab_title(1, "Issues")


func _set_issues(issues: Array) -> void:
	_ensure_right_tabs()
	if _issues_list == null:
		return
	_issues_list.clear()
	_issues_meta.clear()

	var actionable: int = 0
	for issue_v in issues:
		var issue: String = str(issue_v)
		var meta: Dictionary = _parse_issue_metadata(issue)
		var display: String = issue
		if meta.get("kind", "") == "orphan":
			var c: Vector2i = meta.get("coord", Vector2i.ZERO)
			display = "Orphan hex at (%d, %d)" % [c.x, c.y]
		elif meta.get("kind", "") == "edge_missing":
			display = "Edge connects to missing hex: %s" % str(meta.get("edge_key", ""))

		_issues_list.add_item(display)
		_issues_meta.append(meta)
		if meta.has("kind"):
			actionable += 1

	if _right_tabs:
		_right_tabs.set_tab_title(1, "Issues" if actionable == 0 else ("Issues (%d)" % actionable))
	if actionable > 0 and _right_tabs:
		_right_tabs.current_tab = 1


func _parse_issue_metadata(issue: String) -> Dictionary:
	if issue.begins_with("ORPHAN|"):
		var parts1: PackedStringArray = issue.split("|", false, 2)
		if parts1.size() >= 2:
			var cr: PackedStringArray = parts1[1].split(",", false, 2)
			if cr.size() == 2:
				var q: int = int(cr[0])
				var r: int = int(cr[1])
				return {"kind": "orphan", "coord": Vector2i(q, r)}
	if issue.begins_with("EDGE_MISSING|"):
		var parts2: PackedStringArray = issue.split("|", false, 2)
		if parts2.size() >= 2:
			return {"kind": "edge_missing", "edge_key": String(parts2[1])}
	return {}


func _on_issue_activated(index: int) -> void:
	if index < 0 or index >= _issues_meta.size():
		return
	if not hex_editor:
		return
	var meta: Dictionary = _issues_meta[index]
	var kind: String = str(meta.get("kind", ""))
	if kind == "orphan":
		var coord: Vector2i = meta.get("coord", Vector2i.ZERO)
		hex_editor.center_view_on_hex(coord)
	elif kind == "edge_missing":
		var edge_key: String = str(meta.get("edge_key", ""))
		var ab: Array[Vector2i] = hex_editor.edge_key_to_coords(edge_key)
		if ab.size() == 2:
			hex_editor.center_view_on_hex(ab[0])


# ============================================================================
# HISTORY DROPDOWN
# ============================================================================

func _ensure_history_dropdown() -> void:
	if _history_selector != null and is_instance_valid(_history_selector):
		return
	if bottom_bar == null:
		return

	_history_selector = OptionButton.new()
	_history_selector.name = "HistorySelector"
	_history_selector.custom_minimum_size = Vector2(260, 0)
	_history_selector.tooltip_text = "History (jump to any undo state)"
	_history_selector.item_selected.connect(_on_history_selected)
	bottom_bar.add_child(_history_selector)

	var idx: int = bottom_bar.get_children().find(redo_btn)
	if idx >= 0:
		bottom_bar.move_child(_history_selector, idx + 1)


func _refresh_history_dropdown() -> void:
	if _history_selector == null or not hex_editor:
		return
	var labels: Array[String] = hex_editor.get_history_labels()
	var cur: int = hex_editor.get_history_index()

	_suppress_history_select = true
	_history_selector.clear()
	for i in range(labels.size()):
		_history_selector.add_item("%d: %s" % [i, labels[i]], i)
	var sel_idx: int = _history_selector.get_item_index(cur)
	if sel_idx >= 0:
		_history_selector.select(sel_idx)
	_suppress_history_select = false


func _on_history_selected(index: int) -> void:
	if _suppress_history_select:
		return
	if not hex_editor or _history_selector == null:
		return
	var target: int = int(_history_selector.get_item_id(index))
	hex_editor.jump_to_history(target)


# ============================================================================
# RECENTS POPUP
# ============================================================================

func _show_recent_popup() -> void:
	if _recent_paths.is_empty():
		_toast("No recent maps", ToastNotification.ToastType.INFO)
		return

	if _recent_popup == null:
		_recent_popup = PopupMenu.new()
		_recent_popup.id_pressed.connect(_on_recent_popup_id_pressed)
		add_child(_recent_popup)

	_recent_popup.clear()
	for i in range(_recent_paths.size()):
		var path: String = _recent_paths[i]
		_recent_popup.add_item(path.get_file(), i)
		_recent_popup.set_item_tooltip(i, path)

	_recent_popup.position = file_menu.global_position + Vector2(0, file_menu.size.y)
	_recent_popup.popup()


func _on_recent_popup_id_pressed(id: int) -> void:
	if id < 0 or id >= _recent_paths.size():
		return
	_on_load_selected(_recent_paths[id])


# ============================================================================
# HELP TEXT
# ============================================================================

func _update_help_text() -> void:
	var help_key: String = _binding_to_string(_bindings.get("hexeditor.help", {}))
	if help_key == "":
		help_key = "F1"

	if shortcuts_hint:
		var left_key: String = _binding_to_string(_bindings.get("hexeditor.toggle_left_dock", {}))
		var right_key: String = _binding_to_string(_bindings.get("hexeditor.toggle_right_dock", {}))
		var palette_key: String = _binding_to_string(_bindings.get("hexeditor.command_palette", {}))
		shortcuts_hint.text = "%s: Help | %s/%s: Toggle Docks | %s: Palette" % [
			help_key,
			left_key if left_key != "" else "?",
			right_key if right_key != "" else "?",
			palette_key if palette_key != "" else "?"
		]

	if help_label == null:
		return

	var lines: Array[String] = []
	lines.append("Keyboard Shortcuts")
	lines.append("")
	lines.append("Map Navigation:")
	lines.append("  Middle-drag / Alt+drag: Pan")
	lines.append("  Scroll / Pinch: Zoom")
	lines.append("")
	lines.append("Global:")
	lines.append("  %s: Command Palette" % _binding_to_string(_bindings.get("hexeditor.command_palette", {})))
	lines.append("  %s: Settings" % _binding_to_string(_bindings.get("hexeditor.settings", {})))
	lines.append("  %s: Help" % help_key)
	lines.append("")
	lines.append("Edit:")
	lines.append("  %s: Undo" % _binding_to_string(_bindings.get("hexeditor.undo", {})))
	lines.append("  %s: Redo" % _binding_to_string(_bindings.get("hexeditor.redo", {})))
	lines.append("  %s: Copy selection" % _binding_to_string(_bindings.get("hexeditor.copy", {})))
	lines.append("  %s: Cut selection" % _binding_to_string(_bindings.get("hexeditor.cut", {})))
	lines.append("  %s: Paste stamp" % _binding_to_string(_bindings.get("hexeditor.paste_stamp", {})))
	lines.append("")
	lines.append("File:")
	lines.append("  %s: Save" % _binding_to_string(_bindings.get("hexeditor.save", {})))
	lines.append("  %s: Save As…" % _binding_to_string(_bindings.get("hexeditor.save_as", {})))
	lines.append("  %s: Open…" % _binding_to_string(_bindings.get("hexeditor.open", {})))
	lines.append("  %s: Validate map" % _binding_to_string(_bindings.get("hexeditor.validate", {})))
	lines.append("")
	lines.append("Panels:")
	lines.append("  F3: Toggle Debug Panel")
	lines.append("  F4: Toggle Log Panel")
	lines.append("")
	lines.append("Press any key to close…")
	help_label.text = "\n".join(lines)
