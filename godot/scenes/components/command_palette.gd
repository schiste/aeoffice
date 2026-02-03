extends PanelContainer
class_name CommandPalette

signal action_chosen(action_id: String)

@onready var search_edit: LineEdit = %SearchEdit
@onready var results_list: ItemList = %ResultsList

var _actions: Array[Dictionary] = [] # [{id:String,title:String,subtitle:String}]
var _filtered_action_ids: Array[String] = []


func _ready() -> void:
	visible = false
	if search_edit:
		search_edit.text_changed.connect(_on_query_changed)
		search_edit.text_submitted.connect(func(_t: String) -> void:
			_choose_current()
		)
	if results_list:
		results_list.item_activated.connect(func(_idx: int) -> void:
			_choose_current()
		)


func open(actions: Array[Dictionary]) -> void:
	_actions = actions
	visible = true
	_refresh("")
	if search_edit:
		search_edit.text = ""
		search_edit.grab_focus()


func close() -> void:
	visible = false


func is_open() -> bool:
	return visible


func _on_query_changed(query: String) -> void:
	_refresh(query)


func _refresh(query: String) -> void:
	var q: String = query.strip_edges().to_lower()
	_filtered_action_ids.clear()
	if results_list:
		results_list.clear()

	var scored: Array[Dictionary] = []
	for a in _actions:
		var id: String = str(a.get("id", ""))
		if id == "":
			continue
		var title: String = str(a.get("title", id))
		var subtitle: String = str(a.get("subtitle", ""))
		var hay: String = (title + " " + subtitle).to_lower()
		if q != "" and hay.find(q) == -1 and _fuzzy_score(q, hay) <= 0:
			continue
		var score: int = 0 if q == "" else max((1000 - hay.find(q)) if hay.find(q) >= 0 else 0, _fuzzy_score(q, hay))
		scored.append({ "id": id, "title": title, "subtitle": subtitle, "score": score })

	scored.sort_custom(func(a1: Dictionary, a2: Dictionary) -> bool:
		return int(a1.get("score", 0)) > int(a2.get("score", 0))
	)

	for row in scored:
		var rid: String = str(row.get("id", ""))
		var rtitle: String = str(row.get("title", rid))
		var rsub: String = str(row.get("subtitle", ""))
		_filtered_action_ids.append(rid)
		if results_list:
			var txt: String = rtitle if rsub == "" else ("%s — %s" % [rtitle, rsub])
			results_list.add_item(txt)

	if results_list and results_list.item_count > 0:
		results_list.select(0)


func _fuzzy_score(needle: String, haystack: String) -> int:
	# Simple ordered-subsequence scoring.
	if needle == "":
		return 0
	var n: int = 0
	var score: int = 0
	for i in range(haystack.length()):
		if n >= needle.length():
			break
		if haystack[i] == needle[n]:
			score += 10
			n += 1
	return score if n == needle.length() else 0


func _choose_current() -> void:
	if not results_list:
		return
	var idx: int = results_list.get_selected_items()[0] if results_list.get_selected_items().size() > 0 else -1
	if idx < 0 or idx >= _filtered_action_ids.size():
		return
	var id: String = _filtered_action_ids[idx]
	action_chosen.emit(id)
	close()


func _unhandled_key_input(event: InputEvent) -> void:
	if not visible:
		return
	if event is InputEventKey and event.pressed and not event.is_echo():
		var k: InputEventKey = event as InputEventKey
		if k.keycode == KEY_ESCAPE:
			close()
			get_viewport().set_input_as_handled()
			return
		if k.keycode == KEY_ENTER or k.keycode == KEY_KP_ENTER:
			_choose_current()
			get_viewport().set_input_as_handled()
			return
