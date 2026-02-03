extends Node
## UI Effects Utility Class
## Static functions for common UI animations using Tweens
## Can be used as an autoload or called directly

class_name UIEffects


## Fade in a Control node from transparent to opaque
static func fade_in(node: Control, duration: float = 0.2) -> Tween:
	if not node:
		push_error("UIEffects.fade_in: node is null")
		return null

	var tween: Tween = node.create_tween()
	tween.set_ease(Tween.EASE_OUT)
	tween.set_trans(Tween.TRANS_CUBIC)

	node.modulate.a = 0.0
	node.visible = true
	tween.tween_property(node, "modulate:a", 1.0, duration)

	return tween


## Fade out a Control node from opaque to transparent
static func fade_out(node: Control, duration: float = 0.2) -> Tween:
	if not node:
		push_error("UIEffects.fade_out: node is null")
		return null

	var tween: Tween = node.create_tween()
	tween.set_ease(Tween.EASE_IN)
	tween.set_trans(Tween.TRANS_CUBIC)

	tween.tween_property(node, "modulate:a", 0.0, duration)
	tween.tween_callback(func(): node.visible = false)

	return tween


## Slide in a Control node from a specified position
static func slide_in(node: Control, from: Vector2, duration: float = 0.3) -> Tween:
	if not node:
		push_error("UIEffects.slide_in: node is null")
		return null

	var tween: Tween = node.create_tween()
	tween.set_ease(Tween.EASE_OUT)
	tween.set_trans(Tween.TRANS_BACK)

	var original_position: Vector2 = node.position
	node.position = from
	node.visible = true
	tween.tween_property(node, "position", original_position, duration)

	return tween


## Pulse animation that scales up and back down
static func pulse(node: Control, scale_amount: float = 1.1, duration: float = 0.15) -> Tween:
	if not node:
		push_error("UIEffects.pulse: node is null")
		return null

	var tween: Tween = node.create_tween()
	tween.set_ease(Tween.EASE_OUT)
	tween.set_trans(Tween.TRANS_CUBIC)

	var original_scale: Vector2 = node.scale
	var target_scale: Vector2 = original_scale * scale_amount

	tween.tween_property(node, "scale", target_scale, duration)
	tween.tween_property(node, "scale", original_scale, duration)

	return tween


## Shake animation for error feedback or attention
static func shake(node: Control, amount: float = 5.0, duration: float = 0.3) -> Tween:
	if not node:
		push_error("UIEffects.shake: node is null")
		return null

	var tween: Tween = node.create_tween()
	tween.set_ease(Tween.EASE_IN_OUT)
	tween.set_trans(Tween.TRANS_SINE)

	var original_position: Vector2 = node.position
	var shake_count: int = 8
	var shake_duration: float = duration / float(shake_count)

	for i in range(shake_count):
		var offset: Vector2 = Vector2(
			randf_range(-amount, amount),
			randf_range(-amount, amount)
		)
		tween.tween_property(node, "position", original_position + offset, shake_duration)

	tween.tween_property(node, "position", original_position, shake_duration)

	return tween


## Flash a highlight color over a Control node
static func highlight_flash(node: Control, flash_color: Color, duration: float = 0.3) -> Tween:
	if not node:
		push_error("UIEffects.highlight_flash: node is null")
		return null

	var tween: Tween = node.create_tween()
	tween.set_ease(Tween.EASE_IN_OUT)
	tween.set_trans(Tween.TRANS_CUBIC)

	var original_modulate: Color = node.modulate

	tween.tween_property(node, "modulate", flash_color, duration * 0.3)
	tween.tween_property(node, "modulate", original_modulate, duration * 0.7)

	return tween


## Smooth scale transition
static func scale_to(node: Control, target_scale: Vector2, duration: float = 0.2) -> Tween:
	if not node:
		push_error("UIEffects.scale_to: node is null")
		return null

	var tween: Tween = node.create_tween()
	tween.set_ease(Tween.EASE_OUT)
	tween.set_trans(Tween.TRANS_CUBIC)

	tween.tween_property(node, "scale", target_scale, duration)

	return tween


## Smooth position transition
static func move_to(node: Control, target_position: Vector2, duration: float = 0.3) -> Tween:
	if not node:
		push_error("UIEffects.move_to: node is null")
		return null

	var tween: Tween = node.create_tween()
	tween.set_ease(Tween.EASE_OUT)
	tween.set_trans(Tween.TRANS_CUBIC)

	tween.tween_property(node, "position", target_position, duration)

	return tween
