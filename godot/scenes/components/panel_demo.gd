extends Control

## Demo scene showing how to use CollapsiblePanel and DockPanel components
## This demonstrates both components working together in a practical example

@onready var demo_dock_panel: DockPanel = %DemoDockPanel
@onready var collapsible_1: CollapsiblePanel = %CollapsibleSection1
@onready var collapsible_2: CollapsiblePanel = %CollapsibleSection2
@onready var collapsible_3: CollapsiblePanel = %CollapsibleSection3

func _ready() -> void:
	_setup_demo()

func _setup_demo() -> void:
	# Connect dock panel signals
	if demo_dock_panel:
		demo_dock_panel.closed.connect(_on_dock_closed)
		demo_dock_panel.minimized.connect(_on_dock_minimized)
		demo_dock_panel.drag_started.connect(_on_drag_started)
		demo_dock_panel.drag_ended.connect(_on_drag_ended)

	# Connect collapsible panel signals
	if collapsible_1:
		collapsible_1.toggled.connect(_on_section_toggled.bind("Section 1"))
	if collapsible_2:
		collapsible_2.toggled.connect(_on_section_toggled.bind("Section 2"))
	if collapsible_3:
		collapsible_3.toggled.connect(_on_section_toggled.bind("Section 3"))

func _on_dock_closed() -> void:
	print("Dock panel closed")

func _on_dock_minimized() -> void:
	print("Dock panel minimized/restored")

func _on_drag_started() -> void:
	print("Started dragging dock panel")

func _on_drag_ended() -> void:
	print("Stopped dragging dock panel")

func _on_section_toggled(is_collapsed: bool, section_name: String) -> void:
	print("%s %s" % [section_name, "collapsed" if is_collapsed else "expanded"])
