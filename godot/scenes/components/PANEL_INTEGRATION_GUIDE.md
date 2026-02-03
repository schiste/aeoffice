# Panel System Integration Guide

This guide shows how to integrate the CollapsiblePanel and DockPanel components with your hex map editor.

## Quick Start

### 1. Basic Setup

Create a main editor scene with panels:

```gdscript
# hex_map_editor.gd
extends Control

@onready var tools_panel: DockPanel = $ToolsPanel
@onready var properties_panel: DockPanel = $PropertiesPanel

func _ready() -> void:
    _setup_panels()

func _setup_panels() -> void:
    # Configure tools panel
    tools_panel.title = "Tools"
    tools_panel.set_panel_position(Vector2(20, 80))
    tools_panel.closable = true
    tools_panel.minimizable = true

    # Configure properties panel
    properties_panel.title = "Properties"
    properties_panel.set_panel_position(Vector2(900, 80))
    properties_panel.closable = true
    properties_panel.minimizable = true

    # Connect signals
    tools_panel.closed.connect(_on_tools_panel_closed)
    properties_panel.closed.connect(_on_properties_panel_closed)
```

### 2. Adding Collapsible Sections

Add CollapsiblePanels to organize content within DockPanels:

```gdscript
func _setup_tools_panel() -> void:
    var content: Control = tools_panel.get_content_container()

    # Create brush tools section
    var brush_section: CollapsiblePanel = preload("res://scenes/components/collapsible_panel.tscn").instantiate()
    brush_section.title = "Brush Tools"
    brush_section.collapsed = false
    content.add_child(brush_section)

    # Add brush controls
    var brush_content: Control = brush_section.get_node("ContentContainer/Content")
    var brush_size_label: Label = Label.new()
    brush_size_label.text = "Brush Size:"
    brush_content.add_child(brush_size_label)

    var brush_slider: HSlider = HSlider.new()
    brush_slider.min_value = 1
    brush_slider.max_value = 10
    brush_slider.value = 1
    brush_slider.value_changed.connect(_on_brush_size_changed)
    brush_content.add_child(brush_slider)

    # Create terrain types section
    var terrain_section: CollapsiblePanel = preload("res://scenes/components/collapsible_panel.tscn").instantiate()
    terrain_section.title = "Terrain Types"
    terrain_section.collapsed = false
    content.add_child(terrain_section)

    # Add terrain controls
    var terrain_content: Control = terrain_section.get_node("ContentContainer/Content")
    _populate_terrain_types(terrain_content)
```

### 3. Integration with Toolbar

Combine panels with the existing Toolbar component:

```gdscript
# hex_map_editor.gd
@onready var main_toolbar: Toolbar = $Toolbar
@onready var side_panel: DockPanel = $SidePanel

func _setup_toolbar_integration() -> void:
    # Add toolbar buttons that control panels
    main_toolbar.add_button("tools", "Tools Panel", _toggle_tools_panel)
    main_toolbar.add_button("properties", "Properties", _toggle_properties_panel)
    main_toolbar.add_button("layers", "Layers", _toggle_layers_panel)

func _toggle_tools_panel() -> void:
    if tools_panel.is_open():
        tools_panel.close_panel()
    else:
        tools_panel.open_panel()

func _toggle_properties_panel() -> void:
    if properties_panel.is_open():
        properties_panel.close_panel()
    else:
        properties_panel.open_panel()
```

### 4. Saving Panel State

Save and restore panel positions and states:

```gdscript
const SETTINGS_PATH: String = "user://editor_layout.cfg"

func save_panel_layout() -> void:
    var config: ConfigFile = ConfigFile.new()

    # Save tools panel
    config.set_value("tools_panel", "position", tools_panel.get_panel_position())
    config.set_value("tools_panel", "visible", tools_panel.is_open())
    config.set_value("tools_panel", "minimized", tools_panel.is_minimized())

    # Save properties panel
    config.set_value("properties_panel", "position", properties_panel.get_panel_position())
    config.set_value("properties_panel", "visible", properties_panel.is_open())
    config.set_value("properties_panel", "minimized", properties_panel.is_minimized())

    # Save collapsible states
    var terrain_section: CollapsiblePanel = %TerrainSection
    config.set_value("sections", "terrain_collapsed", terrain_section.collapsed)

    config.save(SETTINGS_PATH)

func load_panel_layout() -> void:
    var config: ConfigFile = ConfigFile.new()
    var err: Error = config.load(SETTINGS_PATH)

    if err != OK:
        return

    # Restore tools panel
    if config.has_section("tools_panel"):
        var pos: Vector2 = config.get_value("tools_panel", "position", Vector2(20, 80))
        tools_panel.set_panel_position(pos)

        var visible: bool = config.get_value("tools_panel", "visible", true)
        if not visible:
            tools_panel.close_panel()

    # Restore properties panel
    if config.has_section("properties_panel"):
        var pos: Vector2 = config.get_value("properties_panel", "position", Vector2(900, 80))
        properties_panel.set_panel_position(pos)

    # Restore collapsible states
    if config.has_section("sections"):
        var terrain_collapsed: bool = config.get_value("sections", "terrain_collapsed", false)
        %TerrainSection.collapsed = terrain_collapsed

func _ready() -> void:
    _setup_panels()
    load_panel_layout()

func _notification(what: int) -> void:
    if what == NOTIFICATION_WM_CLOSE_REQUEST:
        save_panel_layout()
```

### 5. Dynamic Content Updates

Update panel content based on hex selection:

```gdscript
signal hex_selected(hex_coords: Vector2i, hex_data: Dictionary)

func _on_hex_selected(coords: Vector2i, data: Dictionary) -> void:
    _update_properties_panel(coords, data)

func _update_properties_panel(coords: Vector2i, data: Dictionary) -> void:
    # Get the properties content container
    var content: Control = properties_panel.get_content_container()

    # Clear existing content
    for child in content.get_children():
        child.queue_free()

    # Create hex info section
    var info_section: CollapsiblePanel = preload("res://scenes/components/collapsible_panel.tscn").instantiate()
    info_section.title = "Hex Information"
    info_section.collapsed = false
    content.add_child(info_section)

    var info_content: Control = info_section.get_node("ContentContainer/Content")

    # Add coordinates
    var coords_label: Label = Label.new()
    coords_label.text = "Coordinates: %s" % coords
    info_content.add_child(coords_label)

    # Add terrain type
    var terrain_label: Label = Label.new()
    terrain_label.text = "Terrain: %s" % data.get("terrain", "Unknown")
    info_content.add_child(terrain_label)

    # Add height
    var height_label: Label = Label.new()
    height_label.text = "Height: %d" % data.get("height", 0)
    info_content.add_child(height_label)

    # Create modifiers section
    if data.has("modifiers") and data.modifiers.size() > 0:
        var modifiers_section: CollapsiblePanel = preload("res://scenes/components/collapsible_panel.tscn").instantiate()
        modifiers_section.title = "Modifiers"
        modifiers_section.collapsed = true
        content.add_child(modifiers_section)

        var modifiers_content: Control = modifiers_section.get_node("ContentContainer/Content")
        for modifier in data.modifiers:
            var mod_label: Label = Label.new()
            mod_label.text = "• %s" % modifier
            modifiers_content.add_child(mod_label)
```

### 6. Keyboard Shortcuts

Add keyboard shortcuts to toggle panels:

```gdscript
func _input(event: InputEvent) -> void:
    if event is InputEventKey and event.pressed:
        match event.keycode:
            KEY_T:
                if event.ctrl_pressed:
                    _toggle_tools_panel()
                    accept_event()
            KEY_P:
                if event.ctrl_pressed:
                    _toggle_properties_panel()
                    accept_event()
            KEY_L:
                if event.ctrl_pressed:
                    _toggle_layers_panel()
                    accept_event()
```

### 7. Responsive Layout

Make panels responsive to window resizing:

```gdscript
func _ready() -> void:
    get_viewport().size_changed.connect(_on_viewport_resized)

func _on_viewport_resized() -> void:
    var viewport_size: Vector2 = get_viewport_rect().size

    # Clamp panel positions to visible area
    _clamp_panel_to_viewport(tools_panel, viewport_size)
    _clamp_panel_to_viewport(properties_panel, viewport_size)

func _clamp_panel_to_viewport(panel: DockPanel, viewport_size: Vector2) -> void:
    var pos: Vector2 = panel.get_panel_position()
    var panel_size: Vector2 = panel.size

    # Ensure panel is at least partially visible
    pos.x = clamp(pos.x, 0, viewport_size.x - 50)
    pos.y = clamp(pos.y, 0, viewport_size.y - 50)

    panel.set_panel_position(pos)
```

## Complete Example Scene Structure

```
HexMapEditor (Control)
├── Toolbar
│   └── Buttons for panel toggles
├── HexMapViewport
│   └── Main hex map rendering area
├── ToolsPanel (DockPanel)
│   └── Content
│       ├── BrushToolsSection (CollapsiblePanel)
│       │   └── Brush controls
│       ├── TerrainTypesSection (CollapsiblePanel)
│       │   └── Terrain palette
│       └── PaintSettingsSection (CollapsiblePanel)
│           └── Paint options
├── PropertiesPanel (DockPanel)
│   └── Content
│       ├── HexInfoSection (CollapsiblePanel)
│       │   └── Selected hex data
│       ├── ModifiersSection (CollapsiblePanel)
│       │   └── Hex modifiers
│       └── MetadataSection (CollapsiblePanel)
│           └── Additional data
└── LayersPanel (DockPanel)
    └── Content
        └── Layer list with controls
```

## Best Practices

1. **Panel Positioning**: Start panels at safe default positions (not 0,0)
2. **State Persistence**: Always save/load panel states for better UX
3. **Signal Handling**: Use signals to coordinate between panels and main editor
4. **Content Updates**: Clear and rebuild panel content efficiently
5. **Keyboard Shortcuts**: Provide shortcuts for quick panel access
6. **Responsive Design**: Handle window resizing gracefully
7. **Performance**: Avoid updating panels every frame; update on events only

## Tips

- Use `%` (unique name) for nodes you need to reference frequently
- Connect panel signals to update other UI elements
- Consider using themes for consistent styling across panels
- Group related CollapsiblePanels within the same DockPanel
- Start with commonly-used sections expanded, others collapsed
- Use tooltips on buttons and controls for better discoverability
