extends VBoxContainer
class_name CollapsiblePanel

## A reusable collapsible panel component with smooth animations
## Features:
## - Animated collapse/expand with Tween
## - Rotating arrow icon
## - Customizable title and initial state

signal toggled(is_collapsed: bool)

@export var title: String = "Section":
	set(value):
		title = value
		if is_node_ready():
			_update_title()

@export var collapsed: bool = false:
	set(value):
		collapsed = value
		if is_node_ready():
			_update_collapsed_state(false)

@onready var header_button: Button = %HeaderButton
@onready var arrow_icon: TextureRect = %ArrowIcon
@onready var title_label: Label = %TitleLabel
@onready var content_container: Control = %ContentContainer

var _tween: Tween
var _original_content_size: Vector2

func _ready() -> void:
	_setup_nodes()
	_update_title()
	_update_collapsed_state(false)

func _setup_nodes() -> void:
	header_button.pressed.connect(_on_header_pressed)

	# Store original content size for animation
	if content_container:
		_original_content_size = content_container.custom_minimum_size

func _update_title() -> void:
	if title_label:
		title_label.text = title

func _update_collapsed_state(animate: bool = true) -> void:
	if not is_node_ready():
		return

	if collapsed:
		_collapse_content(animate)
	else:
		_expand_content(animate)

func _collapse_content(animate: bool = true) -> void:
	if not content_container:
		return

	# Kill any existing tween
	if _tween:
		_tween.kill()

	if animate:
		_tween = create_tween()
		_tween.set_parallel(true)
		_tween.set_trans(Tween.TRANS_CUBIC)
		_tween.set_ease(Tween.EASE_OUT)

		# Animate content container height to 0
		_tween.tween_property(content_container, "custom_minimum_size:y", 0.0, 0.3)
		_tween.tween_property(content_container, "modulate:a", 0.0, 0.2)

		# Rotate arrow icon 90 degrees (pointing right when collapsed)
		if arrow_icon:
			_tween.tween_property(arrow_icon, "rotation_degrees", -90.0, 0.3)

		await _tween.finished
		content_container.visible = false
	else:
		content_container.visible = false
		content_container.custom_minimum_size.y = 0.0
		content_container.modulate.a = 0.0
		if arrow_icon:
			arrow_icon.rotation_degrees = -90.0

func _expand_content(animate: bool = true) -> void:
	if not content_container:
		return

	content_container.visible = true

	# Kill any existing tween
	if _tween:
		_tween.kill()

	# Calculate target height based on children
	var target_height: float = 0.0
	for child in content_container.get_children():
		if child is Control and child.visible:
			target_height += child.get_combined_minimum_size().y

	# Use stored size if available, otherwise calculate
	if _original_content_size.y > 0:
		target_height = _original_content_size.y

	if animate:
		_tween = create_tween()
		_tween.set_parallel(true)
		_tween.set_trans(Tween.TRANS_CUBIC)
		_tween.set_ease(Tween.EASE_OUT)

		# Animate content container height to target
		_tween.tween_property(content_container, "custom_minimum_size:y", target_height, 0.3)
		_tween.tween_property(content_container, "modulate:a", 1.0, 0.3)

		# Rotate arrow icon to default (pointing down when expanded)
		if arrow_icon:
			_tween.tween_property(arrow_icon, "rotation_degrees", 0.0, 0.3)
	else:
		content_container.custom_minimum_size.y = target_height
		content_container.modulate.a = 1.0
		if arrow_icon:
			arrow_icon.rotation_degrees = 0.0

func _on_header_pressed() -> void:
	toggle()

## Collapse the panel
func collapse() -> void:
	if not collapsed:
		collapsed = true
		toggled.emit(true)

## Expand the panel
func expand() -> void:
	if collapsed:
		collapsed = false
		toggled.emit(false)

## Toggle between collapsed and expanded states
func toggle() -> void:
	collapsed = not collapsed
	toggled.emit(collapsed)
