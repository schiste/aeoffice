extends Control

var hex_map: Node = null

@onready var hex_map_container: Control = $HexMapContainer
@onready var status_label: Label = %StatusLabel
@onready var selected_label: Label = %SelectedLabel
@onready var info_label: Label = %InfoLabel

func _ready() -> void:
	# Check if HexMap class exists (GDExtension loaded)
	if ClassDB.class_exists("HexMap"):
		status_label.text = "HexMap class found!"
		_create_hex_map()
	else:
		status_label.text = "ERROR: HexMap class not found - GDExtension not loaded"
		printerr("HexMap class not found. Check that:")
		printerr("  1. libaddgame.dylib exists in godot/bin/")
		printerr("  2. addgame.gdextension is properly configured")
		printerr("  3. You restarted Godot after adding the extension")

func _create_hex_map() -> void:
	# Dynamically create the HexMap node
	hex_map = ClassDB.instantiate("HexMap")
	if hex_map == null:
		status_label.text = "ERROR: Failed to instantiate HexMap"
		return

	hex_map.name = "HexMap"
	hex_map.set_anchors_preset(Control.PRESET_FULL_RECT)
	hex_map_container.add_child(hex_map)

	# Load the Tours region database
	var db_path = "res://maps/tours_region.db"
	var abs_path = ProjectSettings.globalize_path(db_path)
	print("Loading hex map from: ", abs_path)

	hex_map.call("load_db", abs_path)

	# Update status
	var tile_count = hex_map.call("get_tile_count")
	status_label.text = "Tiles: %d" % tile_count

	# Connect to hex selection signal
	if hex_map.has_signal("hex_selected"):
		hex_map.connect("hex_selected", _on_hex_selected)

	# Center on hex (0, 0)
	hex_map.call("center_on_hex", 0, 0)

func _on_hex_selected(q: int, r: int) -> void:
	selected_label.text = "Selected: (%d, %d)" % [q, r]
