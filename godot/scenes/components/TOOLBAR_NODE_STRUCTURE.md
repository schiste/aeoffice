# Toolbar Node Structure

## Complete Node Hierarchy

```
Toolbar (HBoxContainer) [script: toolbar.gd]
├── TerrainGroup (HBoxContainer)
│   ├── TerrainLabel (Label) "Terrain:"
│   └── TerrainSelector (OptionButton) %TerrainSelector
│       ├── Studio (0)
│       ├── Plains (1)
│       ├── Water (2)
│       ├── Forest (3)
│       ├── Hills (4)
│       ├── Mountain (5)
│       ├── Cave Entrance (6)
│       ├── Swamp (7)
│       ├── Desert (8)
│       └── Ruins (9)
│
├── Sep1 (VSeparator)
│
├── ToolsGroup (HBoxContainer)
│   ├── PaintBtn (Button) %PaintBtn [🖌️]
│   │   ├── toggle_mode: true
│   │   ├── button_pressed: true
│   │   ├── button_group: _tool_button_group
│   │   └── tooltip: "Paint Tool (P)\nClick to paint terrain on hexes"
│   │
│   ├── FillBtn (Button) %FillBtn [🪣]
│   │   ├── toggle_mode: true
│   │   ├── button_group: _tool_button_group
│   │   └── tooltip: "Fill Tool (F)\nClick to flood-fill adjacent hexes..."
│   │
│   └── EraseBtn (Button) %EraseBtn [🗑️]
│       ├── toggle_mode: true
│       ├── button_group: _tool_button_group
│       └── tooltip: "Erase Tool (X)\nClick to delete hexes"
│
├── Sep2 (VSeparator)
│
├── FeaturesGroup (HBoxContainer)
│   ├── EdgeBtn (Button) %EdgeBtn [➖]
│   │   ├── toggle_mode: true
│   │   ├── button_group: _tool_button_group
│   │   └── tooltip: "Edge Tool (E)\nClick on hex edges to place rivers..."
│   │
│   ├── PoiBtn (Button) %PoiBtn [📍]
│   │   ├── toggle_mode: true
│   │   ├── button_group: _tool_button_group
│   │   └── tooltip: "Point of Interest Tool (I)\nClick to place named locations"
│   │
│   └── RegionBtn (Button) %RegionBtn [🗺️]
│       ├── toggle_mode: true
│       ├── button_group: _tool_button_group
│       └── tooltip: "Region Tool (R)\nClick to assign hexes to regions"
│
├── Sep3 (VSeparator)
│
├── SelectGroup (HBoxContainer)
│   └── SelectBtn (Button) %SelectBtn [⬚]
│       ├── toggle_mode: true
│       ├── button_group: _tool_button_group
│       └── tooltip: "Select Tool (S)\nClick to select hexes for multi-hex operations"
│
├── Sep4 (VSeparator)
│
├── BrushGroup (HBoxContainer)
│   ├── BrushLabel (Label) %BrushLabel "Brush: 1"
│   └── BrushSlider (HSlider) %BrushSlider
│       ├── min_value: 1.0
│       ├── max_value: 5.0
│       └── value: 1.0
│
├── Sep5 (VSeparator)
│
└── EdgeTypeGroup (HBoxContainer)
    ├── EdgeLabel (Label) "Edge:"
    └── EdgeSelector (OptionButton) %EdgeSelector
        ├── River (0)
        ├── Road (1)
        └── Wall (2)
```

## Node Properties

### Root Node: Toolbar
```gdscript
type: HBoxContainer
script: toolbar.gd
theme_override_constants/separation: 4
```

### Tool Buttons (Common Properties)
```gdscript
type: Button
custom_minimum_size: Vector2(32, 32)
toggle_mode: true
button_group: _tool_button_group (assigned in script)
unique_name_in_owner: true
```

### Separators
```gdscript
type: VSeparator
# Creates visual divider between groups
```

### Sliders
```gdscript
type: HSlider
custom_minimum_size: Vector2(80, 0)
```

## Script Variables

### @onready References
```gdscript
@onready var _paint_btn: Button = %PaintBtn
@onready var _fill_btn: Button = %FillBtn
@onready var _erase_btn: Button = %EraseBtn
@onready var _edge_btn: Button = %EdgeBtn
@onready var _poi_btn: Button = %PoiBtn
@onready var _region_btn: Button = %RegionBtn
@onready var _select_btn: Button = %SelectBtn
@onready var _terrain_selector: OptionButton = %TerrainSelector
@onready var _brush_label: Label = %BrushLabel
@onready var _brush_slider: HSlider = %BrushSlider
@onready var _edge_selector: OptionButton = %EdgeSelector
```

### Button Group
```gdscript
var _tool_button_group: ButtonGroup = ButtonGroup.new()
# Assigned to all tool buttons in _setup_tool_buttons()
# Ensures mutual exclusivity
```

## Signal Flow

```
User Action → Node Event → Script Handler → Signal Emission → Parent Script
     │            │              │                 │                │
     ↓            ↓              ↓                 ↓                ↓
Click Paint → toggled(true) → _on_tool_toggled → tool_changed → editor_ui.gd
Click Terrain → item_selected → _on_terrain_selected → terrain_changed
Move Slider → value_changed → _on_brush_size_changed → brush_size_changed
```

## Layout Measurements

```
┌────────────────────────────────────────────────────────────────────┐
│ [Terrain: ▼] │ [32][32][32] │ [32][32][32] │ [32] │ [Br:1][80] │  │
│   ~100px      │    ~100px    │    ~100px    │ 32px │   ~120px   │  │
│               4px            4px            4px    4px          4px│
│                                                                    │
│ Total estimated width: ~500px (varies with font/spacing)          │
└────────────────────────────────────────────────────────────────────┘
```

### Spacing Details
- Between major groups: 4px (VSeparator)
- Within groups: 2px (HBoxContainer separation)
- Button size: 32x32px minimum
- Slider width: 80px minimum
- Height: 32-40px depending on content

## Comparison with Old TopBar

### Old Structure (Simplified)
```
TopBar (HBoxContainer)
├── TerrainLabel
├── TerrainSelector
├── Separator1
├── ToolPaintBtn (text: "Paint")
├── ToolFillBtn (text: "Fill")
├── ToolEraseBtn (text: "Erase")
├── ToolEdgeBtn (text: "Edge")
├── ToolPoiBtn (text: "POI")
├── ToolRegionBtn (text: "Region")
├── ToolSelectBtn (text: "Select")
├── Separator2
├── BrushSizeLabel
├── BrushSizeSlider
├── Separator3
├── EdgeLabel
├── EdgeSelector
├── ... (many more nodes)
└── StatusLabel
```

**Issues:**
- Flat structure, no grouping
- No ButtonGroup (tools not mutually exclusive)
- Longer text takes more space
- No tooltips
- ~800px width

### New Structure (Improved)
```
Toolbar (HBoxContainer)
├── TerrainGroup (HBoxContainer)
├── Sep1
├── ToolsGroup (HBoxContainer)
│   └── [Paint/Fill/Erase buttons]
├── Sep2
├── FeaturesGroup (HBoxContainer)
│   └── [Edge/POI/Region buttons]
├── Sep3
├── SelectGroup (HBoxContainer)
├── Sep4
├── BrushGroup (HBoxContainer)
├── Sep5
└── EdgeTypeGroup (HBoxContainer)
```

**Benefits:**
- Hierarchical grouping
- ButtonGroup ensures single selection
- Icons save space
- Rich tooltips
- ~500px width (35% savings)

## Memory Layout

```
Toolbar Instance
├── Script Instance (~1-2KB)
│   ├── _tool_button_group (ButtonGroup resource ~100 bytes)
│   ├── @onready references (11 node paths ~1KB)
│   └── Enum and state variables (~100 bytes)
│
└── Scene Nodes (~28 nodes)
    ├── 6 HBoxContainers (~600 bytes)
    ├── 7 Buttons (~2KB)
    ├── 5 VSeparators (~500 bytes)
    ├── 4 Labels (~400 bytes)
    ├── 2 OptionButtons (~800 bytes)
    └── 1 HSlider (~400 bytes)

Total: ~5-7KB per toolbar instance (very lightweight)
```

## Scene File Size

```
toolbar.tscn: ~4KB (formatted text)
toolbar.gd: ~6KB (with comments)
Total: ~10KB
```

Compared to inline nodes in editor_scene.tscn: ~3KB
**Difference**: +7KB for better organization and reusability

## Extensibility Points

### Adding a New Tool Button

**1. Add to Scene (toolbar.tscn)**
```gdscript
[node name="NewToolBtn" type="Button" parent="ToolsGroup"]
unique_name_in_owner = true
custom_minimum_size = Vector2(32, 32)
layout_mode = 2
tooltip_text = "New Tool (N)\nDoes something cool"
toggle_mode = true
text = "🔧"
```

**2. Add to Script (toolbar.gd)**
```gdscript
# At top with other @onready vars
@onready var _new_tool_btn: Button = %NewToolBtn

# In Tool enum
enum Tool {
    PAINT,
    FILL,
    ERASE,
    EDGE,
    POI,
    REGION,
    SELECT,
    NEW_TOOL  # <-- Add here
}

# In _setup_tool_buttons()
var tool_buttons: Array[Button] = [
    _paint_btn,
    # ... other buttons
    _new_tool_btn  # <-- Add here
]

# In _connect_signals()
_new_tool_btn.toggled.connect(_on_tool_toggled.bind("new_tool", Tool.NEW_TOOL))

# In set_active_tool()
match tool_name.to_lower():
    # ... other cases
    "new_tool":
        _new_tool_btn.button_pressed = true

# In get_active_tool()
match _current_tool:
    # ... other cases
    Tool.NEW_TOOL:
        return "new_tool"
```

### Adding a New Configuration Option

Example: Add a "Grid Snap" checkbox

**1. Add to Scene**
```gdscript
[node name="Sep6" type="VSeparator" parent="."]

[node name="OptionsGroup" type="HBoxContainer" parent="."]

[node name="GridSnapCheck" type="CheckBox" parent="OptionsGroup"]
unique_name_in_owner = true
text = "Snap"
tooltip_text = "Snap to grid when placing"
```

**2. Add to Script**
```gdscript
signal grid_snap_changed(enabled: bool)

@onready var _grid_snap_check: CheckBox = %GridSnapCheck

func _connect_signals() -> void:
    # ... other connections
    _grid_snap_check.toggled.connect(_on_grid_snap_toggled)

func _on_grid_snap_toggled(enabled: bool) -> void:
    grid_snap_changed.emit(enabled)

func get_grid_snap() -> bool:
    return _grid_snap_check.button_pressed

func set_grid_snap(enabled: bool) -> void:
    _grid_snap_check.button_pressed = enabled
```

## Debugging

### Inspector View
When selected in editor, you'll see:
```
Toolbar (HBoxContainer)
├── Script: toolbar.gd
├── Layout → Layout Mode: Anchors
├── Theme Overrides
│   └── Constants
│       └── separation: 4
└── Signals
    ├── tool_changed(String)
    ├── terrain_changed(int)
    ├── brush_size_changed(int)
    └── edge_type_changed(int)
```

### Runtime Inspection
```gdscript
# In debugger, evaluate:
$Toolbar.get_child_count()  # Should be 13 (6 groups + 5 separators + terrain/brush/edge groups)
$Toolbar/ToolsGroup.get_child_count()  # Should be 3 (Paint, Fill, Erase)
$Toolbar._tool_button_group.get_pressed_button()  # Active tool button
```

## Best Practices

1. **Always use unique_name_in_owner** for referenced nodes
2. **Use ButtonGroup** for mutually exclusive buttons
3. **Provide tooltips** for all interactive elements
4. **Group related controls** in HBoxContainers
5. **Use VSeparators** for visual grouping
6. **Type all variables** for type safety
7. **Document all public methods** with docstrings
8. **Emit signals** for state changes, don't call parent directly

---

This structure provides a clean, maintainable, and extensible toolbar component for the hex map editor!
