# Toolbar Component Integration Guide

## Overview

The new icon-based toolbar (`toolbar.tscn` + `toolbar.gd`) provides a compact, modern interface for the hex map editor. This guide explains how to integrate it into the existing `editor_scene.tscn`.

## Features

1. **Icon-based buttons** instead of text labels for tools
2. **Visual grouping** with separators between related tools
3. **Tooltips** explaining each tool's function and keyboard shortcuts
4. **ButtonGroup** for mutually exclusive tool selection
5. **Compact design** saving horizontal space
6. **Type-safe GDScript** with explicit typing throughout

## Tool Organization

The toolbar groups tools into logical sections:

### Primary Tools (Paint/Fill/Erase)
- 🖌️ Paint Tool (P) - Paint terrain on hexes
- 🪣 Fill Tool (F) - Flood-fill adjacent hexes
- 🗑️ Erase Tool (X) - Delete hexes

### Feature Tools (Edge/POI/Region)
- ➖ Edge Tool (E) - Place rivers, roads, walls
- 📍 POI Tool (I) - Place named locations
- 🗺️ Region Tool (R) - Assign hexes to regions

### Selection Tool
- ⬚ Select Tool (S) - Multi-hex selection

### Configuration
- Terrain selector dropdown
- Brush size slider with label
- Edge type selector dropdown

## Integration Steps

### Option 1: Replace TopBar (Recommended)

Replace the current TopBar in `editor_scene.tscn`:

```gdscript
# In editor_scene.tscn, replace lines 28-204 with:

[node name="TopBar" parent="CanvasLayer/UI" instance=ExtResource("X_toolbar")]
layout_mode = 1
anchors_preset = 10
anchor_right = 1.0
offset_bottom = 40.0
grow_horizontal = 2
```

Where `X_toolbar` is a new ExtResource pointing to the toolbar scene:
```
[ext_resource type="PackedScene" path="res://scenes/components/toolbar.tscn" id="X_toolbar"]
```

### Option 2: Side-by-side Comparison

Add the new toolbar alongside the old one for testing:

```gdscript
[node name="TopBarOld" type="HBoxContainer" parent="CanvasLayer/UI"]
visible = false
# ... existing TopBar configuration ...

[node name="TopBarNew" parent="CanvasLayer/UI" instance=ExtResource("X_toolbar")]
layout_mode = 1
anchors_preset = 10
anchor_right = 1.0
offset_bottom = 40.0
grow_horizontal = 2
```

## Connecting Signals in editor_ui.gd

Update `editor_ui.gd` to connect to the new toolbar signals:

```gdscript
# In _ready() function
var toolbar: HBoxContainer = $TopBar  # or however you access it

# Connect tool changes
toolbar.tool_changed.connect(_on_tool_changed)
toolbar.terrain_changed.connect(_on_terrain_changed)
toolbar.brush_size_changed.connect(_on_brush_size_changed)
toolbar.edge_type_changed.connect(_on_edge_type_changed)

# Handler methods
func _on_tool_changed(tool_name: String) -> void:
	# Update editor state based on selected tool
	hex_editor.set_tool(tool_name)
	_update_status_bar()

func _on_terrain_changed(terrain_id: int) -> void:
	hex_editor.current_terrain = terrain_id

func _on_brush_size_changed(size: int) -> void:
	hex_editor.brush_size = size
	_update_status_bar()

func _on_edge_type_changed(edge_id: int) -> void:
	hex_editor.current_edge_type = edge_id
```

## Public API Methods

The toolbar provides these methods for programmatic control:

```gdscript
# Tool selection
toolbar.set_active_tool("paint")  # "paint", "fill", "erase", etc.
var current_tool: String = toolbar.get_active_tool()

# Configuration
toolbar.set_terrain(2)  # Set terrain by ID
var terrain_id: int = toolbar.get_selected_terrain()

toolbar.set_brush_size(3)
var brush_size: int = toolbar.get_brush_size()

toolbar.set_edge_type(1)  # Road
var edge_type: int = toolbar.get_edge_type()
```

## Keyboard Shortcuts

The toolbar tooltips document these shortcuts (implement in your input handler):

- **P** - Paint tool
- **F** - Fill tool
- **X** - Erase tool
- **E** - Edge tool
- **I** - POI tool
- **R** - Region tool
- **S** - Select tool
- **0-9** - Select terrain
- **[ / ]** - Decrease/increase brush size

## Styling Notes

The toolbar uses these settings for compactness:

- **Separation**: 4px between major groups, 2px within groups
- **Button size**: 32x32px minimum for icon buttons
- **Slider width**: 80px minimum for brush slider

To customize styling, adjust `theme_override_constants/separation` in the scene file.

## Unicode Emoji Fallbacks

The current implementation uses Unicode emoji as icons:
- 🖌️ Paint
- 🪣 Fill
- 🗑️ Erase
- ➖ Edge
- 📍 POI
- 🗺️ Region
- ⬚ Select

### Upgrading to Editor Icons

To use Godot's built-in editor icons (when running as an EditorPlugin):

1. Convert the toolbar to an EditorPlugin or Tool script
2. Access `EditorInterface` via `get_editor_interface()`
3. Load icons via `get_theme_icon()`:

```gdscript
func _load_editor_icons() -> void:
	if Engine.is_editor_hint():
		var editor: EditorInterface = get_editor_interface()
		var base_control: Control = editor.get_base_control()

		_paint_btn.icon = base_control.get_theme_icon("Edit", "EditorIcons")
		_fill_btn.icon = base_control.get_theme_icon("Bucket", "EditorIcons")
		_erase_btn.icon = base_control.get_theme_icon("Remove", "EditorIcons")
		_edge_btn.icon = base_control.get_theme_icon("CurveLinear", "EditorIcons")
		_poi_btn.icon = base_control.get_theme_icon("Pin", "EditorIcons")
		_region_btn.icon = base_control.get_theme_icon("WorldEnvironment", "EditorIcons")
		_select_btn.icon = base_control.get_theme_icon("ToolSelect", "EditorIcons")

		# Clear emoji text when icons are loaded
		for btn: Button in [_paint_btn, _fill_btn, _erase_btn, _edge_btn, _poi_btn, _region_btn, _select_btn]:
			btn.text = ""
```

## Migration Checklist

- [ ] Add toolbar scene as ExtResource to editor_scene.tscn
- [ ] Replace or supplement TopBar with toolbar instance
- [ ] Update editor_ui.gd to connect toolbar signals
- [ ] Test all tool selections work correctly
- [ ] Test terrain/brush/edge selectors
- [ ] Verify keyboard shortcuts still work
- [ ] Update status bar to reflect toolbar state
- [ ] Test with different UI scales
- [ ] Remove old TopBar nodes if using replacement approach

## Troubleshooting

**Issue**: Buttons don't stay pressed
- **Solution**: Verify `button_group` is properly assigned in `_setup_tool_buttons()`

**Issue**: Signals not firing
- **Solution**: Check that `_connect_signals()` is called in `_ready()`

**Issue**: Emoji not displaying
- **Solution**: Ensure editor uses a font with emoji support, or switch to editor icons

**Issue**: Tooltips not showing
- **Solution**: Verify `tooltip_text` properties in toolbar.tscn

## Future Enhancements

1. **Custom icon theme** - Replace emoji with SVG/PNG icons
2. **Tool presets** - Save/load tool configurations
3. **Contextual UI** - Show/hide groups based on active tool
4. **Icon size options** - Small/medium/large button sizes
5. **Horizontal/vertical layouts** - Support vertical toolbar placement
