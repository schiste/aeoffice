extends Control
## Loading Spinner Component
## Displays an animated rotating indicator for loading states

class_name LoadingSpinner

@export var rotation_speed: float = 360.0  # Degrees per second
@export var dot_count: int = 8
@export var dot_radius: float = 40.0
@export var dot_size: float = 8.0
@export var color_gradient: bool = true
@export var spinner_color: Color = Color.WHITE

@onready var spinner_container: Control = %SpinnerContainer
@onready var center_label: Label = %CenterLabel

var is_spinning: bool = false
var rotation_tween: Tween = null
var dots: Array[ColorRect] = []
var elapsed_time: float = 0.0


func _ready() -> void:
	visible = false
	_create_dots()
	set_process(false)


func _process(delta: float) -> void:
	if not is_spinning:
		return

	elapsed_time += delta

	# Rotate the spinner
	spinner_container.rotation += deg_to_rad(rotation_speed * delta)

	# Animate dot colors if using gradient
	if color_gradient:
		_update_dot_colors()


func start(message: String = "") -> void:
	if is_spinning:
		return

	is_spinning = true
	visible = true
	elapsed_time = 0.0

	if message != "":
		center_label.text = message
		center_label.visible = true
	else:
		center_label.visible = false

	# Fade in
	modulate.a = 0.0
	var fade_tween: Tween = create_tween()
	fade_tween.tween_property(self, "modulate:a", 1.0, 0.2)

	set_process(true)


func stop() -> void:
	if not is_spinning:
		return

	is_spinning = false
	set_process(false)

	# Fade out
	var fade_tween: Tween = create_tween()
	fade_tween.tween_property(self, "modulate:a", 0.0, 0.2)
	fade_tween.finished.connect(func(): visible = false)


func set_message(message: String) -> void:
	center_label.text = message
	center_label.visible = message != ""


func _create_dots() -> void:
	# Clear existing dots
	for dot in dots:
		dot.queue_free()
	dots.clear()

	# Create new dots in a circle
	var angle_step: float = TAU / float(dot_count)

	for i in range(dot_count):
		var dot: ColorRect = ColorRect.new()
		dot.custom_minimum_size = Vector2(dot_size, dot_size)
		dot.size = Vector2(dot_size, dot_size)
		dot.color = spinner_color

		# Position dot in circle
		var angle: float = angle_step * float(i)
		var x: float = cos(angle) * dot_radius
		var y: float = sin(angle) * dot_radius

		# Center the dot on its position
		dot.position = Vector2(x - dot_size * 0.5, y - dot_size * 0.5)

		spinner_container.add_child(dot)
		dots.append(dot)


func _update_dot_colors() -> void:
	for i in range(dots.size()):
		var dot: ColorRect = dots[i]

		# Create wave effect
		var phase: float = (elapsed_time * 2.0 + float(i) / float(dots.size()) * TAU)
		var alpha: float = (sin(phase) + 1.0) * 0.5  # Oscillate between 0 and 1
		alpha = lerp(0.2, 1.0, alpha)  # Clamp to minimum visibility

		var dot_color: Color = spinner_color
		dot_color.a = alpha
		dot.color = dot_color


func set_spinner_color(new_color: Color) -> void:
	spinner_color = new_color
	for dot in dots:
		dot.color = new_color


func set_rotation_speed(speed: float) -> void:
	rotation_speed = speed


func is_active() -> bool:
	return is_spinning
