class_name HexMapData
extends Resource

const DEFAULT_REGION_ID := 0

var map_data: Dictionary = {} # Vector2i -> Dictionary
var edge_data: Dictionary = {} # String -> Dictionary
var regions: Dictionary = { DEFAULT_REGION_ID: { "name": "Unassigned", "color": Color(0.9, 0.9, 0.9, 0.35) } }


static func load_runtime(path: String) -> HexMapData:
	var data := HexMapData.new()
	var err: Error = data.import_runtime(path)
	if err != OK:
		return null
	return data


func clear() -> void:
	map_data.clear()
	edge_data.clear()
	regions = { DEFAULT_REGION_ID: { "name": "Unassigned", "color": Color(0.9, 0.9, 0.9, 0.35) } }


func has_hex(coord: Vector2i) -> bool:
	return map_data.has(coord)


func get_hex(coord: Vector2i) -> Dictionary:
	return map_data.get(coord, {})


func get_edge_type(a: Vector2i, b: Vector2i) -> String:
	var key := _edge_key(a, b)
	if not edge_data.has(key):
		return ""
	return str((edge_data[key] as Dictionary).get("type", ""))


func import_runtime(path: String) -> Error:
	if path.to_lower().ends_with(".hxb"):
		return _import_runtime_binary(path)
	return _import_runtime_json(path)


func _import_runtime_json(path: String) -> Error:
	var file: FileAccess = FileAccess.open(path, FileAccess.READ)
	if file == null:
		return FileAccess.get_open_error()
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	file.close()
	if parsed == null or not (parsed is Dictionary):
		return ERR_PARSE_ERROR

	var root: Dictionary = parsed as Dictionary
	var terrain_table: Array = root.get("terrain_table", [])
	var edge_table: Array = root.get("edge_table", ["river", "road", "wall"])

	clear()

	for reg in root.get("regions", []):
		if not (reg is Array) or (reg as Array).size() < 3:
			continue
		var row: Array = reg as Array
		var rid: int = int(row[0])
		if rid == DEFAULT_REGION_ID:
			continue
		regions[rid] = { "name": str(row[1]), "color": _array_to_color(row[2]) }

	for h in root.get("hexes", []):
		if not (h is Array) or (h as Array).size() < 5:
			continue
		var row: Array = h as Array
		var q: int = int(row[0])
		var r: int = int(row[1])
		var tid: int = int(row[2])
		var tname: String = str(terrain_table[tid]) if tid >= 0 and tid < terrain_table.size() else "plains"
		var elev: int = int(row[3])
		var rid2: int = int(row[4])
		if not regions.has(rid2):
			rid2 = DEFAULT_REGION_ID
		var nm: String = str(row[5]) if row.size() > 5 else ""
		var desc: String = str(row[6]) if row.size() > 6 else ""
		var features: Array = row[7] if row.size() > 7 and row[7] is Array else []
		map_data[Vector2i(q, r)] = {
			"terrain": tname,
			"elevation": elev,
			"region_id": rid2,
			"name": nm,
			"description": desc,
			"features": features,
		}

	for e in root.get("edges", []):
		if not (e is Array) or (e as Array).size() < 5:
			continue
		var row2: Array = e as Array
		var a := Vector2i(int(row2[0]), int(row2[1]))
		var b := Vector2i(int(row2[2]), int(row2[3]))
		var eid: int = int(row2[4])
		var etype: String = str(edge_table[eid]) if eid >= 0 and eid < edge_table.size() else "river"
		edge_data[_edge_key(a, b)] = { "type": etype }

	return OK


func _import_runtime_binary(path: String) -> Error:
	var file: FileAccess = FileAccess.open(path, FileAccess.READ)
	if file == null:
		return FileAccess.get_open_error()
	var header := file.get_buffer(4).get_string_from_utf8()
	if header != "HXB1":
		file.close()
		return ERR_FILE_UNRECOGNIZED
	var _ver := int(file.get_32())

	clear()

	var hex_count := int(file.get_32())
	for _i in range(hex_count):
		var q := int(file.get_32())
		var r := int(file.get_32())
		var tid := int(file.get_8())
		var elev_raw := int(file.get_8())
		var elev := elev_raw - 256 if elev_raw > 127 else elev_raw
		var rid := int(file.get_16())
		if rid != DEFAULT_REGION_ID and not regions.has(rid):
			regions[rid] = { "name": "Region %d" % rid, "color": _region_color_from_id(rid) }

		var tname: String = "plains"
		var order: Array = HexEditor.TERRAIN_ORDER
		if tid >= 0 and tid < order.size():
			tname = str(order[tid])
		map_data[Vector2i(q, r)] = {
			"terrain": tname,
			"elevation": elev,
			"region_id": rid,
			"name": "",
			"description": "",
		}

	var edge_count := int(file.get_32())
	for _j in range(edge_count):
		var q1 := int(file.get_32())
		var r1 := int(file.get_32())
		var q2 := int(file.get_32())
		var r2 := int(file.get_32())
		var eid := int(file.get_8())
		var etype: String = "river"
		if eid == 1:
			etype = "road"
		elif eid == 2:
			etype = "wall"
		edge_data[_edge_key(Vector2i(q1, r1), Vector2i(q2, r2))] = { "type": etype }

	file.close()
	return OK


func _edge_key(a: Vector2i, b: Vector2i) -> String:
	var coords: Array = [[a.x, a.y], [b.x, b.y]]
	coords.sort()
	return "%d,%d:%d,%d" % [coords[0][0], coords[0][1], coords[1][0], coords[1][1]]


func _array_to_color(value: Variant) -> Color:
	if value is Array and (value as Array).size() >= 3:
		var arr: Array = value as Array
		var r: float = float(arr[0])
		var g: float = float(arr[1])
		var b: float = float(arr[2])
		var a: float = float(arr[3]) if arr.size() >= 4 else 1.0
		return Color(r, g, b, a)
	return Color(1, 1, 1, 0.35)


func _region_color_from_id(region_id: int) -> Color:
	var hue := fmod(float(region_id) * 0.137, 1.0)
	return Color.from_hsv(hue, 0.6, 0.9, 0.35)
