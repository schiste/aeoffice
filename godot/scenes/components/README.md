# Collapsible and Dockable Panel System

A comprehensive panel system for Godot 4.5 featuring collapsible sections and draggable dock panels, perfect for hex map editors and other complex UI needs.

## Components

### CollapsiblePanel

A reusable collapsible section component with smooth animations.

#### Features
- Animated expand/collapse with Tween
- Rotating arrow icon indicator
- Customizable title and initial state
- Signal emission on toggle
- Smooth cubic easing transitions

#### Properties
- `title: String` - The section title displayed in the header
- `collapsed: bool` - Initial collapsed state (default: false)

#### Signals
- `toggled(is_collapsed: bool)` - Emitted when the panel is collapsed or expanded

#### Methods
- `collapse()` - Collapse the panel
- `expand()` - Expand the panel
- `toggle()` - Toggle between collapsed and expanded states

#### Usage Example

```gdscript
# In your scene
extends Control

@onready var my_section: CollapsiblePanel = $CollapsiblePanel

func _ready() -> void:
    # Set properties
    my_section.title = "My Settings"
    my_section.collapsed = false

    # Connect signals
    my_section.toggled.connect(_on_section_toggled)

func _on_section_toggled(is_collapsed: bool) -> void:
    print("Section is now: ", "collapsed" if is_collapsed else "expanded")

# Programmatic control
func collapse_section() -> void:
    my_section.collapse()

func expand_section() -> void:
    my_section.expand()
```

#### Adding Content

Content should be added as children of the `ContentContainer/Content` node in the scene tree:

```gdscript
# Get the content container
var content: Control = my_section.get_node("ContentContainer/Content")

# Add your controls
var label: Label = Label.new()
label.text = "Hello World"
content.add_child(label)
```

---

### DockPanel

A draggable, dockable panel component with minimize and close functionality.

#### Features
- Draggable header for repositioning
- Optional close and minimize buttons
- Multiple signals for panel states
- Header-only mode when minimized
- Standalone and composable design

#### Properties
- `title: String` - The panel title displayed in the header
- `closable: bool` - Show/hide close button (default: true)
- `minimizable: bool` - Show/hide minimize button (default: true)

#### Signals
- `closed()` - Emitted when the panel is closed
- `minimized()` - Emitted when the panel is minimized or restored
- `drag_started()` - Emitted when dragging begins
- `drag_ended()` - Emitted when dragging ends

#### Methods
- `toggle_minimize()` - Toggle between minimized and normal states
- `close_panel()` - Close (hide) the panel
- `open_panel()` - Open (show) the panel
- `is_minimized() -> bool` - Check if the panel is minimized
- `is_open() -> bool` - Check if the panel is visible
- `set_panel_position(pos: Vector2)` - Set the panel position
- `get_panel_position() -> Vector2` - Get the panel position
- `set_panel_size(size: Vector2)` - Set the panel size
- `get_content_container() -> Control` - Get the content area for adding custom content

#### Usage Example

```gdscript
extends Control

@onready var properties_panel: DockPanel = $DockPanel

func _ready() -> void:
    # Set properties
    properties_panel.title = "Properties"
    properties_panel.closable = true
    properties_panel.minimizable = true

    # Set initial position
    properties_panel.set_panel_position(Vector2(50, 100))

    # Connect signals
    properties_panel.closed.connect(_on_panel_closed)
    properties_panel.minimized.connect(_on_panel_minimized)
    properties_panel.drag_started.connect(_on_drag_started)
    properties_panel.drag_ended.connect(_on_drag_ended)

func _on_panel_closed() -> void:
    print("Panel closed")

func _on_panel_minimized() -> void:
    print("Panel minimized/restored")

func _on_drag_started() -> void:
    print("Started dragging")

func _on_drag_ended() -> void:
    print("Stopped dragging")
    # Save panel position
    var pos: Vector2 = properties_panel.get_panel_position()
    save_panel_position(pos)
```

#### Adding Content

Content should be added to the content area:

```gdscript
# Get the content container
var content: Control = properties_panel.get_content_container()

# Add your controls
var button: Button = Button.new()
button.text = "Click Me"
content.add_child(button)
```

---

## Combining Components

The components are designed to work together. You can nest CollapsiblePanels inside DockPanels for powerful UI layouts:

```gdscript
extends Control

@onready var dock: DockPanel = $DockPanel

func _ready() -> void:
    # Get the content container
    var content: Control = dock.get_content_container()

    # Create collapsible sections
    var terrain_section: CollapsiblePanel = preload("res://scenes/components/collapsible_panel.tscn").instantiate()
    terrain_section.title = "Terrain Settings"
    content.add_child(terrain_section)

    var visual_section: CollapsiblePanel = preload("res://scenes/components/collapsible_panel.tscn").instantiate()
    visual_section.title = "Visual Settings"
    content.add_child(visual_section)

    # Add content to sections
    var terrain_content: Control = terrain_section.get_node("ContentContainer/Content")
    var label: Label = Label.new()
    label.text = "Terrain Type:"
    terrain_content.add_child(label)
```

---

## Demo Scene

A complete demo scene is provided at `panel_demo.tscn` that shows:
- A DockPanel with three CollapsiblePanels inside
- Various UI controls (sliders, checkboxes, option buttons)
- Signal handling for both component types
- Practical hex map editor-style layout

To run the demo:
1. Open `panel_demo.tscn` in the Godot editor
2. Press F6 or click "Run Current Scene"
3. Try dragging the panel, collapsing sections, and using minimize/close buttons

---

## Styling

Both components use standard Godot themes and can be customized:

### CollapsiblePanel
- Modify the HeaderButton theme for custom button styling
- Adjust arrow icon size in the scene file
- Change animation duration in the script (default: 0.3s)
- Modify easing curves (currently using TRANS_CUBIC, EASE_OUT)

### DockPanel
- Customize PanelContainer theme for panel background
- Style HeaderContainer for custom header appearance
- Adjust button sizes and appearance
- Modify content area margins

### Example Theme Customization

```gdscript
# Custom theme for CollapsiblePanel
var panel_theme: Theme = Theme.new()
var stylebox: StyleBoxFlat = StyleBoxFlat.new()
stylebox.bg_color = Color(0.15, 0.15, 0.2)
stylebox.corner_radius_top_left = 5
stylebox.corner_radius_top_right = 5
panel_theme.set_stylebox("panel", "PanelContainer", stylebox)

my_collapsible_panel.theme = panel_theme
```

---

## Best Practices

1. **Performance**: Avoid nesting too many CollapsiblePanels (5-10 is reasonable)
2. **Animation**: The default 0.3s animation provides good feel, but can be adjusted
3. **Content Size**: For DockPanels, set `custom_minimum_size` for consistent sizing
4. **Positioning**: Save/load DockPanel positions in user settings for better UX
5. **Signals**: Connect to signals for analytics and state persistence

---

## Integration with Hex Map Editor

For a hex map editor, consider this structure:

```
Control (Root)
├── HexMapViewport (Main view)
└── UI Layer
    ├── DockPanel (Tools)
    │   ├── CollapsiblePanel (Brush Tools)
    │   ├── CollapsiblePanel (Terrain Types)
    │   └── CollapsiblePanel (Palette)
    ├── DockPanel (Properties)
    │   ├── CollapsiblePanel (Hex Properties)
    │   ├── CollapsiblePanel (Visual Settings)
    │   └── CollapsiblePanel (Metadata)
    └── DockPanel (Layers)
        └── (Layer list content)
```

---

## File Structure

```
godot/scenes/components/
├── collapsible_panel.tscn
├── collapsible_panel.gd
├── dock_panel.tscn
├── dock_panel.gd
├── panel_demo.tscn
├── panel_demo.gd
└── README.md
```

---

## License

These components are part of your project and can be freely used and modified.
