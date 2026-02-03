extends AcceptDialog
class_name SettingsDialog

signal settings_applied(ui_scale: float, high_contrast: bool, bindings: Dictionary, terrain_opacity: float, basemap_opacity: float)

@onready var tabs: TabContainer = %Tabs
@onready var ui_scale_slider: HSlider = %UiScaleSlider
@onready var ui_scale_value: Label = %UiScaleValue
@onready var high_contrast_check: CheckBox = %HighContrastCheck
@onready var terrain_opacity_slider: HSlider = %TerrainOpacitySlider
@onready var terrain_opacity_value: Label = %TerrainOpacityValue
@onready var basemap_opacity_slider: HSlider = %BasemapOpacitySlider
@onready var basemap_opacity_value: Label = %BasemapOpacityValue

@onready var shortcuts_list: ItemList = %ShortcutsList
@onready var rebind_hint: Label = %RebindHint
@onready var reset_shortcuts_btn: Button = %ResetShortcutsBtn

var _action_titles: Dictionary = {} # action_id -> title
var _bindings: Dictionary = {} # action_id -> {keycode, ctrl, shift, alt, meta}
var _rebinding_action: String = ""


func _ready() -> void:
	confirmed.connect(_on_confirmed)
	canceled.connect(_on_canceled)
	if ui_scale_slider:
		ui_scale_slider.value_changed.connect(_on_ui_scale_changed)
	if terrain_opacity_slider:
		terrain_opacity_slider.value_changed.connect(_on_terrain_opacity_changed)
	if basemap_opacity_slider:
		basemap_opacity_slider.value_changed.connect(_on_basemap_opacity_changed)
	if reset_shortcuts_btn:
		reset_shortcuts_btn.pressed.connect(_on_reset_shortcuts_pressed)
	if shortcuts_list:
		shortcuts_list.item_activated.connect(_on_shortcut_activated)


func open_with(current_scale: float, high_contrast: bool, actions: Array[Dictionary], bindings: Dictionary, terrain_opacity: float, basemap_opacity: float) -> void:
	_action_titles.clear()
	_bindings = bindings.duplicate(true)
	_rebinding_action = ""
	if rebind_hint:
		rebind_hint.text = "Double-click an action to rebind."

	if ui_scale_slider:
		ui_scale_slider.value = current_scale
	_on_ui_scale_changed(current_scale)
	if high_contrast_check:
		high_contrast_check.button_pressed = high_contrast
	if terrain_opacity_slider:
		terrain_opacity_slider.value = terrain_opacity
	_on_terrain_opacity_changed(terrain_opacity)
	if basemap_opacity_slider:
		basemap_opacity_slider.value = basemap_opacity
	_on_basemap_opacity_changed(basemap_opacity)

	for a in actions:
		var id: String = str(a.get("id", ""))
		if id == "":
			continue
		_action_titles[id] = str(a.get("title", id))

	_refresh_shortcuts_list()
	popup_centered(Vector2i(760, 520))


func is_rebinding() -> bool:
	return _rebinding_action != ""


func _on_ui_scale_changed(value: float) -> void:
	if ui_scale_value:
		ui_scale_value.text = "%.0f%%" % (value * 100.0)


func _on_terrain_opacity_changed(value: float) -> void:
	if terrain_opacity_value:
		terrain_opacity_value.text = "%.0f%%" % (value * 100.0)


func _on_basemap_opacity_changed(value: float) -> void:
	if basemap_opacity_value:
		basemap_opacity_value.text = "%.0f%%" % (value * 100.0)


func _refresh_shortcuts_list() -> void:
	if not shortcuts_list:
		return
	shortcuts_list.clear()
	var ids: Array = _action_titles.keys()
	ids.sort()
	for id in ids:
		var aid: String = str(id)
		var title: String = str(_action_titles[aid])
		var binding_str: String = _binding_to_string(_bindings.get(aid, {}))
		shortcuts_list.add_item("%s\t%s" % [title, binding_str])


func _on_shortcut_activated(index: int) -> void:
	var ids: Array = _action_titles.keys()
	ids.sort()
	if index < 0 or index >= ids.size():
		return
	_rebinding_action = str(ids[index])
	if rebind_hint:
		rebind_hint.text = "Press a key combo for: %s (Esc to cancel)" % str(_action_titles.get(_rebinding_action, _rebinding_action))


func _on_reset_shortcuts_pressed() -> void:
	# Leave actual defaults to the caller; here we just clear so caller can repopulate.
	_bindings.clear()
	_refresh_shortcuts_list()
	if rebind_hint:
		rebind_hint.text = "Shortcuts reset (will apply defaults on save)."


func set_binding(action_id: String, binding: Dictionary) -> void:
	if action_id == "":
		return
	_bindings[action_id] = binding.duplicate(true)
	_refresh_shortcuts_list()


func clear_binding(action_id: String) -> void:
	_bindings.erase(action_id)
	_refresh_shortcuts_list()


func _unhandled_key_input(event: InputEvent) -> void:
	if not visible:
		return
	if not is_rebinding():
		return
	if event is InputEventKey and event.pressed and not event.is_echo():
		var k: InputEventKey = event as InputEventKey
		if k.keycode == KEY_ESCAPE:
			_rebinding_action = ""
			if rebind_hint:
				rebind_hint.text = "Double-click an action to rebind."
			get_viewport().set_input_as_handled()
			return

		var binding: Dictionary = {
			"keycode": int(k.keycode),
			"ctrl": bool(k.ctrl_pressed),
			"shift": bool(k.shift_pressed),
			"alt": bool(k.alt_pressed),
			"meta": bool(k.meta_pressed),
		}
		set_binding(_rebinding_action, binding)
		_rebinding_action = ""
		if rebind_hint:
			rebind_hint.text = "Double-click an action to rebind."
		get_viewport().set_input_as_handled()


func _on_confirmed() -> void:
	var scale: float = float(ui_scale_slider.value) if ui_scale_slider else 1.0
	var hc: bool = bool(high_contrast_check.button_pressed) if high_contrast_check else false
	var terrain_op: float = float(terrain_opacity_slider.value) if terrain_opacity_slider else 1.0
	var basemap_op: float = float(basemap_opacity_slider.value) if basemap_opacity_slider else 0.85
	settings_applied.emit(scale, hc, _bindings.duplicate(true), terrain_op, basemap_op)


func _on_canceled() -> void:
	_rebinding_action = ""


func _binding_to_string(binding: Variant) -> String:
	if not (binding is Dictionary):
		return ""
	var b: Dictionary = binding as Dictionary
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
