extends PanelContainer
class_name DockPanel

## A draggable, dockable panel component
## Features:
## - Draggable header for repositioning
## - Optional close and minimize buttons
## - Signals for various panel states
## - Standalone and composable design

signal closed()
signal minimized()
signal drag_started()
signal drag_ended()

@export var title: String = "Panel":
	set(value):
		title = value
		if is_node_ready():
			_update_title()

@export var closable: bool = true:
	set(value):
		closable = value
		if is_node_ready():
			_update_buttons()

@export var minimizable: bool = true:
	set(value):
		minimizable = value
		if is_node_ready():
			_update_buttons()

@onready var header_container: PanelContainer = %HeaderContainer
@onready var title_label: Label = %TitleLabel
@onready var minimize_button: Button = %MinimizeButton
@onready var close_button: Button = %CloseButton
@onready var content_area: MarginContainer = %ContentArea

var _is_dragging: bool = false
var _drag_offset: Vector2 = Vector2.ZERO
var _is_minimized: bool = false
var _cached_content_size: Vector2

func _ready() -> void:
	_setup_nodes()
	_update_title()
	_update_buttons()

func _setup_nodes() -> void:
	# Connect button signals
	if minimize_button:
		minimize_button.pressed.connect(_on_minimize_pressed)
	if close_button:
		close_button.pressed.connect(_on_close_pressed)

	# Set up header dragging
	if header_container:
		header_container.gui_input.connect(_on_header_gui_input)

func _update_title() -> void:
	if title_label:
		title_label.text = title

func _update_buttons() -> void:
	if minimize_button:
		minimize_button.visible = minimizable
	if close_button:
		close_button.visible = closable

func _on_header_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mb: InputEventMouseButton = event as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_LEFT:
			if mb.pressed:
				_start_drag(mb.position)
			else:
				_end_drag()
	elif event is InputEventMouseMotion:
		if _is_dragging:
			_update_drag(event.position)

func _start_drag(local_position: Vector2) -> void:
	_is_dragging = true
	_drag_offset = local_position
	drag_started.emit()

func _end_drag() -> void:
	if _is_dragging:
		_is_dragging = false
		drag_ended.emit()

func _update_drag(local_position: Vector2) -> void:
	if not _is_dragging:
		return

	# Calculate new global position
	var header_global_pos: Vector2 = header_container.global_position
	var mouse_global_pos: Vector2 = header_global_pos + local_position
	var new_position: Vector2 = mouse_global_pos - _drag_offset

	# Update panel position
	global_position = new_position

func _on_minimize_pressed() -> void:
	toggle_minimize()

func _on_close_pressed() -> void:
	close_panel()

## Toggle between minimized and normal states
func toggle_minimize() -> void:
	_is_minimized = not _is_minimized

	if _is_minimized:
		# Cache current size and hide content
		_cached_content_size = content_area.size
		content_area.visible = false
		custom_minimum_size.y = header_container.size.y
	else:
		# Restore content
		content_area.visible = true
		custom_minimum_size.y = 0

	minimized.emit()

## Close the panel (hides it)
func close_panel() -> void:
	visible = false
	closed.emit()

## Open/show the panel
func open_panel() -> void:
	visible = true
	if _is_minimized:
		toggle_minimize()

## Check if the panel is currently minimized
func is_minimized() -> bool:
	return _is_minimized

## Check if the panel is currently visible
func is_open() -> bool:
	return visible

## Set the panel position
func set_panel_position(pos: Vector2) -> void:
	global_position = pos

## Get the panel position
func get_panel_position() -> Vector2:
	return global_position

## Set the panel size
func set_panel_size(new_size: Vector2) -> void:
	custom_minimum_size = new_size

## Get the content area for adding custom content
func get_content_container() -> Control:
	return content_area
