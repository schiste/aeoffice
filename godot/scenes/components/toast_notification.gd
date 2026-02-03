extends PanelContainer
## Toast Notification System
## Shows temporary notification messages with auto-dismiss
## Can queue multiple toasts and display them sequentially

class_name ToastNotification

enum ToastType {
	INFO,
	SUCCESS,
	WARNING,
	ERROR
}

const DEFAULT_DURATION: float = 3.0
const SLIDE_DURATION: float = 0.3
const FADE_DURATION: float = 0.2

static var instance: ToastNotification = null
static var toast_queue: Array[Dictionary] = []
static var is_showing: bool = false

@onready var label: Label = %MessageLabel
@onready var icon: TextureRect = %IconRect
@onready var background_panel: StyleBoxFlat = get_theme_stylebox("panel").duplicate()

var active_tween: Tween = null
var dismiss_timer: Timer = null


func _ready() -> void:
	instance = self
	visible = false
	modulate.a = 0.0

	# Create dismiss timer
	dismiss_timer = Timer.new()
	dismiss_timer.one_shot = true
	dismiss_timer.timeout.connect(_on_dismiss_timer_timeout)
	add_child(dismiss_timer)

	# Set up initial position (off screen, top right)
	set_anchors_preset(Control.PRESET_TOP_RIGHT)
	position = Vector2(0, -100)

	# Process any queued toasts
	_process_queue()


## Static method to show a toast from anywhere
static func show_toast(message: String, type: ToastType = ToastType.INFO, duration: float = DEFAULT_DURATION) -> void:
	var toast_data: Dictionary = {
		"message": message,
		"type": type,
		"duration": duration
	}

	toast_queue.append(toast_data)

	if instance and not is_showing:
		instance._process_queue()


## Static convenience methods
static func info(message: String, duration: float = DEFAULT_DURATION) -> void:
	show_toast(message, ToastType.INFO, duration)


static func success(message: String, duration: float = DEFAULT_DURATION) -> void:
	show_toast(message, ToastType.SUCCESS, duration)


static func warning(message: String, duration: float = DEFAULT_DURATION) -> void:
	show_toast(message, ToastType.WARNING, duration)


static func error(message: String, duration: float = DEFAULT_DURATION) -> void:
	show_toast(message, ToastType.ERROR, duration)


func _process_queue() -> void:
	if is_showing or toast_queue.is_empty():
		return

	var toast_data: Dictionary = toast_queue.pop_front()
	_show_toast_internal(toast_data["message"], toast_data["type"], toast_data["duration"])


func _show_toast_internal(message: String, type: ToastType, duration: float) -> void:
	is_showing = true

	# Set message
	label.text = message

	# Set color based on type
	var bg_color: Color = _get_color_for_type(type)
	var style: StyleBoxFlat = get_theme_stylebox("panel").duplicate()
	style.bg_color = bg_color
	add_theme_stylebox_override("panel", style)

	# Set icon (if using icons)
	_set_icon_for_type(type)

	# Calculate target position (offset from top right)
	var target_pos: Vector2 = Vector2(-size.x - 20, 20)

	# Animate in
	visible = true
	_cancel_active_tween()

	active_tween = create_tween()
	active_tween.set_parallel(true)
	active_tween.set_ease(Tween.EASE_OUT)
	active_tween.set_trans(Tween.TRANS_BACK)

	active_tween.tween_property(self, "position", target_pos, SLIDE_DURATION)
	active_tween.tween_property(self, "modulate:a", 1.0, FADE_DURATION)

	# Start dismiss timer
	dismiss_timer.start(duration)


func _on_dismiss_timer_timeout() -> void:
	_hide_toast()


func _hide_toast() -> void:
	_cancel_active_tween()

	active_tween = create_tween()
	active_tween.set_parallel(true)
	active_tween.set_ease(Tween.EASE_IN)
	active_tween.set_trans(Tween.TRANS_CUBIC)

	var hide_pos: Vector2 = Vector2(20, position.y)
	active_tween.tween_property(self, "position", hide_pos, SLIDE_DURATION)
	active_tween.tween_property(self, "modulate:a", 0.0, FADE_DURATION)

	active_tween.finished.connect(_on_hide_finished)


func _on_hide_finished() -> void:
	visible = false
	is_showing = false
	position = Vector2(0, -100)

	# Process next toast in queue
	_process_queue()


func _cancel_active_tween() -> void:
	if active_tween and active_tween.is_valid():
		active_tween.kill()
		active_tween = null


func _get_color_for_type(type: ToastType) -> Color:
	match type:
		ToastType.INFO:
			return Color(0.2, 0.4, 0.8, 0.95)  # Blue
		ToastType.SUCCESS:
			return Color(0.2, 0.7, 0.3, 0.95)  # Green
		ToastType.WARNING:
			return Color(0.9, 0.7, 0.2, 0.95)  # Orange
		ToastType.ERROR:
			return Color(0.8, 0.2, 0.2, 0.95)  # Red
		_:
			return Color(0.3, 0.3, 0.3, 0.95)  # Gray


func _set_icon_for_type(type: ToastType) -> void:
	# Placeholder for icon setting
	# If you have icon resources, set them here based on type
	if icon:
		icon.visible = false


func _gui_input(event: InputEvent) -> void:
	# Allow clicking to dismiss
	if event is InputEventMouseButton:
		if event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
			dismiss_timer.stop()
			_hide_toast()
