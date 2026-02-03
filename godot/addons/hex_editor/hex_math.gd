## Hex Math Utilities
## Cube coordinate system for hexagonal grids (pointy-top orientation)
## Reference: https://www.redblobgames.com/grids/hexagons/
class_name HexMath

const SQRT3 := 1.7320508075688772  # sqrt(3)

## Convert cube coordinates (q, r) to pixel position
## Note: s = -q - r is implicit (cube constraint: q + r + s = 0)
static func cube_to_pixel(cube: Vector2i, size: float) -> Vector2:
	var x := size * (SQRT3 * cube.x + SQRT3 / 2.0 * cube.y)
	var y := size * (1.5 * cube.y)
	return Vector2(x, y)


## Convert pixel position to cube coordinates
static func pixel_to_cube(pixel: Vector2, size: float) -> Vector2i:
	var q := (SQRT3 / 3.0 * pixel.x - 1.0 / 3.0 * pixel.y) / size
	var r := (2.0 / 3.0 * pixel.y) / size
	return cube_round(Vector2(q, r))


## Round fractional cube coordinates to nearest hex
static func cube_round(frac: Vector2) -> Vector2i:
	var s := -frac.x - frac.y

	var q := round(frac.x)
	var r := round(frac.y)
	var s_round := round(s)

	var q_diff := abs(q - frac.x)
	var r_diff := abs(r - frac.y)
	var s_diff := abs(s_round - s)

	# Reset the component with largest diff to satisfy q + r + s = 0
	if q_diff > r_diff and q_diff > s_diff:
		q = -r - s_round
	elif r_diff > s_diff:
		r = -q - s_round
	# else: s would be reset, but we don't store s

	return Vector2i(int(q), int(r))


## Get the 6 neighboring hex coordinates
static func get_neighbors(cube: Vector2i) -> Array[Vector2i]:
	return [
		Vector2i(cube.x + 1, cube.y + 0),  # East
		Vector2i(cube.x + 1, cube.y - 1),  # Northeast
		Vector2i(cube.x + 0, cube.y - 1),  # Northwest
		Vector2i(cube.x - 1, cube.y + 0),  # West
		Vector2i(cube.x - 1, cube.y + 1),  # Southwest
		Vector2i(cube.x + 0, cube.y + 1),  # Southeast
	]


## Calculate hex distance between two cube coordinates
static func hex_distance(a: Vector2i, b: Vector2i) -> int:
	var diff := a - b
	# In cube coords: distance = (|dq| + |dr| + |ds|) / 2, where ds = -dq - dr
	var ds := -diff.x - diff.y
	return (abs(diff.x) + abs(diff.y) + abs(ds)) / 2


## Get all hexes within a given radius from center
static func get_hexes_in_radius(center: Vector2i, radius: int) -> Array[Vector2i]:
	var results: Array[Vector2i] = []
	for q in range(-radius, radius + 1):
		for r in range(max(-radius, -q - radius), min(radius, -q + radius) + 1):
			results.append(Vector2i(center.x + q, center.y + r))
	return results


## Get hexes in a ring at exact distance from center
static func get_hex_ring(center: Vector2i, radius: int) -> Array[Vector2i]:
	if radius == 0:
		return [center]

	var results: Array[Vector2i] = []
	var directions := [
		Vector2i(1, 0), Vector2i(1, -1), Vector2i(0, -1),
		Vector2i(-1, 0), Vector2i(-1, 1), Vector2i(0, 1)
	]

	# Start at center + radius * direction[4] (southwest)
	var current := Vector2i(center.x - radius, center.y + radius)

	for i in range(6):
		for _j in range(radius):
			results.append(current)
			current = current + directions[i]

	return results


## Get corner vertices of a hex for drawing (pointy-top)
static func get_hex_corners(center_pixel: Vector2, size: float) -> PackedVector2Array:
	var corners := PackedVector2Array()
	for i in range(6):
		var angle := PI / 180.0 * (60.0 * i - 30.0)  # Pointy-top: start at -30°
		corners.append(Vector2(
			center_pixel.x + size * cos(angle),
			center_pixel.y + size * sin(angle)
		))
	return corners


## Line drawing between two hexes (for line-of-sight, etc.)
static func cube_line(a: Vector2i, b: Vector2i) -> Array[Vector2i]:
	var n := hex_distance(a, b)
	if n == 0:
		return [a]

	var results: Array[Vector2i] = []
	for i in range(n + 1):
		var t := float(i) / float(n)
		var lerped := Vector2(
			a.x + (b.x - a.x) * t,
			a.y + (b.y - a.y) * t
		)
		results.append(cube_round(lerped))
	return results
