extends Button
## Enhanced Button with hover and press animations
## Provides smooth visual feedback for user interactions

class_name HoverButton

@export var hover_scale: float = 1.05
@export var press_scale: float = 0.95
@export var animation_duration: float = 0.15
@export var hover_color: Color = Color(1.2, 1.2, 1.2, 1.0)
@export var press_color: Color = Color(0.9, 0.9, 0.9, 1.0)
@export var enable_scale_animation: bool = true
@export var enable_color_animation: bool = true

var original_scale: Vector2 = Vector2.ONE
var original_modulate: Color = Color.WHITE
var is_hovering: bool = false
var is_pressing: bool = false
var active_tween: Tween = null


func _ready() -> void:
	original_scale = scale
	original_modulate = modulate

	# Connect signals
	mouse_entered.connect(_on_mouse_entered)
	mouse_exited.connect(_on_mouse_exited)
	button_down.connect(_on_button_down)
	button_up.connect(_on_button_up)
	focus_entered.connect(_on_focus_entered)
	focus_exited.connect(_on_focus_exited)


func _on_mouse_entered() -> void:
	is_hovering = true
	_animate_hover()


func _on_mouse_exited() -> void:
	is_hovering = false
	if not is_pressing:
		_animate_normal()


func _on_button_down() -> void:
	is_pressing = true
	_animate_press()


func _on_button_up() -> void:
	is_pressing = false
	if is_hovering:
		_animate_hover()
	else:
		_animate_normal()


func _on_focus_entered() -> void:
	if not is_hovering:
		_animate_hover()


func _on_focus_exited() -> void:
	if not is_hovering and not is_pressing:
		_animate_normal()


func _animate_hover() -> void:
	_cancel_active_tween()

	active_tween = create_tween()
	active_tween.set_parallel(true)
	active_tween.set_ease(Tween.EASE_OUT)
	active_tween.set_trans(Tween.TRANS_CUBIC)

	if enable_scale_animation:
		active_tween.tween_property(self, "scale", original_scale * hover_scale, animation_duration)

	if enable_color_animation:
		active_tween.tween_property(self, "modulate", hover_color, animation_duration)


func _animate_press() -> void:
	_cancel_active_tween()

	active_tween = create_tween()
	active_tween.set_parallel(true)
	active_tween.set_ease(Tween.EASE_OUT)
	active_tween.set_trans(Tween.TRANS_CUBIC)

	if enable_scale_animation:
		active_tween.tween_property(self, "scale", original_scale * press_scale, animation_duration * 0.5)

	if enable_color_animation:
		active_tween.tween_property(self, "modulate", press_color, animation_duration * 0.5)


func _animate_normal() -> void:
	_cancel_active_tween()

	active_tween = create_tween()
	active_tween.set_parallel(true)
	active_tween.set_ease(Tween.EASE_OUT)
	active_tween.set_trans(Tween.TRANS_CUBIC)

	if enable_scale_animation:
		active_tween.tween_property(self, "scale", original_scale, animation_duration)

	if enable_color_animation:
		active_tween.tween_property(self, "modulate", original_modulate, animation_duration)


func _cancel_active_tween() -> void:
	if active_tween and active_tween.is_valid():
		active_tween.kill()
		active_tween = null


func set_sound_effect(hover_sound: AudioStream, press_sound: AudioStream) -> void:
	# Hook for adding sound effects
	# Connect to an AudioStreamPlayer node if sounds are provided
	pass


func reset_to_original() -> void:
	_cancel_active_tween()
	scale = original_scale
	modulate = original_modulate
	is_hovering = false
	is_pressing = false
