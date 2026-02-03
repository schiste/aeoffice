@tool
## Hex Editor Plugin - Integrates the hex map editor into Godot's editor
extends EditorPlugin

const HexEditorScene := preload("res://addons/hex_editor/hex_editor.tscn")

var editor_instance: Control
var dock: Control


func _enter_tree() -> void:
	# Create the dock UI
	dock = _create_dock()
	add_control_to_dock(DOCK_SLOT_RIGHT_UL, dock)
	print("Hex Editor plugin loaded")


func _exit_tree() -> void:
	if dock:
		remove_control_from_docks(dock)
		dock.queue_free()
	print("Hex Editor plugin unloaded")


func _create_dock() -> Control:
	var container := VBoxContainer.new()
	container.name = "HexEditor"
	container.custom_minimum_size = Vector2(200, 300)

	# Title
	var title := Label.new()
	title.text = "Hex Map Editor"
	title.add_theme_font_size_override("font_size", 16)
	container.add_child(title)

	# Separator
	container.add_child(HSeparator.new())

	# Terrain selector
	var terrain_label := Label.new()
	terrain_label.text = "Terrain Brush:"
	container.add_child(terrain_label)

	var terrain_selector := OptionButton.new()
	terrain_selector.name = "TerrainSelector"
	for terrain in ["plains", "water", "forest", "hills", "mountain", "cave_entrance", "swamp", "desert", "ruins"]:
		terrain_selector.add_item(terrain.capitalize(), terrain_selector.item_count)
	terrain_selector.selected = 0
	terrain_selector.item_selected.connect(_on_terrain_selected)
	container.add_child(terrain_selector)

	container.add_child(HSeparator.new())

	# Display options
	var options_label := Label.new()
	options_label.text = "Display:"
	container.add_child(options_label)

	var show_grid_check := CheckBox.new()
	show_grid_check.name = "ShowGridCheck"
	show_grid_check.text = "Show Grid"
	show_grid_check.button_pressed = true
	show_grid_check.toggled.connect(_on_show_grid_toggled)
	container.add_child(show_grid_check)

	var show_coords_check := CheckBox.new()
	show_coords_check.name = "ShowCoordsCheck"
	show_coords_check.text = "Show Coordinates"
	show_coords_check.button_pressed = false
	show_coords_check.toggled.connect(_on_show_coords_toggled)
	container.add_child(show_coords_check)

	container.add_child(HSeparator.new())

	# Actions
	var actions_label := Label.new()
	actions_label.text = "Actions:"
	container.add_child(actions_label)

	var expand_btn := Button.new()
	expand_btn.text = "Expand Map"
	expand_btn.pressed.connect(_on_expand_pressed)
	container.add_child(expand_btn)

	var save_btn := Button.new()
	save_btn.text = "Save Map (Ctrl+S)"
	save_btn.pressed.connect(_on_save_pressed)
	container.add_child(save_btn)

	var load_btn := Button.new()
	load_btn.text = "Load Map (Ctrl+O)"
	load_btn.pressed.connect(_on_load_pressed)
	container.add_child(load_btn)

	container.add_child(HSeparator.new())

	# Info
	var info_label := Label.new()
	info_label.name = "InfoLabel"
	info_label.text = "Hexes: 0"
	container.add_child(info_label)

	# Help text
	var help_label := Label.new()
	help_label.text = """
Controls:
• Left-click: Paint terrain
• Right-click: Cycle terrain
• Shift+click: Add new hex
• Middle-drag: Pan
• Scroll: Zoom
• Ctrl+Z: Undo
• Ctrl+Shift+Z: Redo"""
	help_label.add_theme_font_size_override("font_size", 11)
	container.add_child(help_label)

	return container


func _on_terrain_selected(index: int) -> void:
	var terrains := ["plains", "water", "forest", "hills", "mountain", "cave_entrance", "swamp", "desert", "ruins"]
	var hex_editor := _get_hex_editor()
	if hex_editor:
		hex_editor.current_terrain = terrains[index]


func _on_show_grid_toggled(pressed: bool) -> void:
	var hex_editor := _get_hex_editor()
	if hex_editor:
		hex_editor.show_grid = pressed


func _on_show_coords_toggled(pressed: bool) -> void:
	var hex_editor := _get_hex_editor()
	if hex_editor:
		hex_editor.show_coords = pressed


func _on_expand_pressed() -> void:
	var hex_editor := _get_hex_editor()
	if hex_editor:
		hex_editor.expand_map()
		_update_info()


func _on_save_pressed() -> void:
	var hex_editor := _get_hex_editor()
	if hex_editor:
		hex_editor.save_map(hex_editor.map_path)


func _on_load_pressed() -> void:
	var hex_editor := _get_hex_editor()
	if hex_editor:
		hex_editor.load_map(hex_editor.map_path)
		_update_info()


func _get_hex_editor() -> Node:
	# Try to find HexEditor in the current scene
	var edited_scene := get_editor_interface().get_edited_scene_root()
	if edited_scene:
		var hex_editor := edited_scene.find_child("HexEditor", true, false)
		if hex_editor:
			return hex_editor
	return null


func _update_info() -> void:
	var hex_editor := _get_hex_editor()
	var info_label := dock.find_child("InfoLabel", true, false) as Label
	if hex_editor and info_label:
		info_label.text = "Hexes: %d" % hex_editor.get_hex_count()
