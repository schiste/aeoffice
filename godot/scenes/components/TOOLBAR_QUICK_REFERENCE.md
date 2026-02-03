# Toolbar Quick Reference

## File Locations

| File | Path | Description |
|------|------|-------------|
| Scene | `/godot/scenes/components/toolbar.tscn` | Toolbar UI layout |
| Script | `/godot/scenes/components/toolbar.gd` | Toolbar logic and API |
| Integration | `/godot/scenes/components/TOOLBAR_INTEGRATION.md` | Full integration guide |
| Comparison | `/godot/scenes/components/TOOLBAR_COMPARISON.md` | Before/after design comparison |
| Example | `/godot/scenes/components/toolbar_integration_example.gd` | Integration code example |

## Quick Integration (3 Steps)

### 1. Add to Scene
Edit `editor_scene.tscn`, add ExtResource:
```gdscript
[ext_resource type="PackedScene" path="res://scenes/components/toolbar.tscn" id="5_toolbar"]
```

Replace TopBar node:
```gdscript
[node name="TopBar" parent="CanvasLayer/UI" instance=ExtResource("5_toolbar")]
layout_mode = 1
anchors_preset = 10
anchor_right = 1.0
offset_bottom = 40.0
grow_horizontal = 2
```

### 2. Connect Signals
In `editor_ui.gd` `_ready()`:
```gdscript
var toolbar = $CanvasLayer/UI/TopBar
toolbar.tool_changed.connect(_on_tool_changed)
toolbar.terrain_changed.connect(_on_terrain_changed)
toolbar.brush_size_changed.connect(_on_brush_size_changed)
toolbar.edge_type_changed.connect(_on_edge_type_changed)
```

### 3. Implement Handlers
```gdscript
func _on_tool_changed(tool_name: String) -> void:
    hex_editor.set_tool(tool_name)
    _update_status_bar()

func _on_terrain_changed(terrain_id: int) -> void:
    hex_editor.current_terrain = terrain_id

func _on_brush_size_changed(size: int) -> void:
    hex_editor.brush_size = size

func _on_edge_type_changed(edge_id: int) -> void:
    hex_editor.current_edge_type = edge_id
```

## API Cheat Sheet

### Signals
```gdscript
tool_changed(tool_name: String)      # Emitted when tool button clicked
terrain_changed(terrain_id: int)     # Emitted when terrain selected
brush_size_changed(size: int)        # Emitted when brush slider moved
edge_type_changed(edge_id: int)      # Emitted when edge type selected
```

### Getters
```gdscript
toolbar.get_active_tool() -> String        # "paint", "fill", "erase", etc.
toolbar.get_selected_terrain() -> int      # 0-9
toolbar.get_brush_size() -> int            # 1-5
toolbar.get_edge_type() -> int             # 0=River, 1=Road, 2=Wall
```

### Setters
```gdscript
toolbar.set_active_tool("paint")     # Activate tool programmatically
toolbar.set_terrain(2)               # Set terrain to Water
toolbar.set_brush_size(3)            # Set brush size to 3
toolbar.set_edge_type(1)             # Set edge type to Road
```

## Tool Names

| Display | Internal | Enum | Keyboard | Icon |
|---------|----------|------|----------|------|
| Paint   | `"paint"`   | `Tool.PAINT`   | P | 🖌️ |
| Fill    | `"fill"`    | `Tool.FILL`    | F | 🪣 |
| Erase   | `"erase"`   | `Tool.ERASE`   | X | 🗑️ |
| Edge    | `"edge"`    | `Tool.EDGE`    | E | ➖ |
| POI     | `"poi"`     | `Tool.POI`     | I | 📍 |
| Region  | `"region"`  | `Tool.REGION`  | R | 🗺️ |
| Select  | `"select"`  | `Tool.SELECT`  | S | ⬚ |

## Terrain IDs

| ID | Name | Keyboard |
|----|------|----------|
| 0  | Studio | 0 |
| 1  | Plains | 1 |
| 2  | Water | 2 |
| 3  | Forest | 3 |
| 4  | Hills | 4 |
| 5  | Mountain | 5 |
| 6  | Cave Entrance | 6 |
| 7  | Swamp | 7 |
| 8  | Desert | 8 |
| 9  | Ruins | 9 |

## Edge Type IDs

| ID | Name |
|----|------|
| 0  | River |
| 1  | Road |
| 2  | Wall |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| P | Select Paint tool |
| F | Select Fill tool |
| X | Select Erase tool |
| E | Select Edge tool |
| I | Select POI tool |
| R | Select Region tool |
| S | Select Select tool |
| 0-9 | Select terrain type |
| [ | Decrease brush size |
| ] | Increase brush size |

## Common Patterns

### Pattern 1: Tool State Synchronization
```gdscript
func _on_load_map(map_data: Dictionary) -> void:
    # Restore toolbar state from saved data
    toolbar.set_active_tool(map_data.get("last_tool", "paint"))
    toolbar.set_terrain(map_data.get("last_terrain", 0))
    toolbar.set_brush_size(map_data.get("last_brush_size", 1))
```

### Pattern 2: Contextual Tool Switching
```gdscript
func _on_hex_right_clicked(hex: HexCell) -> void:
    # Auto-switch to inspector when right-clicking hex
    if toolbar.get_active_tool() != "select":
        toolbar.set_active_tool("select")
```

### Pattern 3: Tool-Specific UI
```gdscript
func _on_tool_changed(tool_name: String) -> void:
    # Show/hide panels based on active tool
    %PoiPanel.visible = (tool_name == "poi")
    %RegionPanel.visible = (tool_name == "region")
    %SelectionPanel.visible = (tool_name == "select")
```

### Pattern 4: Keyboard Override
```gdscript
func _input(event: InputEvent) -> void:
    if event is InputEventKey and event.pressed:
        match event.keycode:
            KEY_P: toolbar.set_active_tool("paint")
            KEY_F: toolbar.set_active_tool("fill")
            # ... etc
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Multiple tools selected at once | ButtonGroup not assigned - check `_setup_tool_buttons()` |
| Signals not firing | Missing signal connections in `_connect_signals()` |
| Emoji not showing | Font lacks emoji support - use editor icons instead |
| Tooltips not appearing | Check `tooltip_text` in toolbar.tscn |
| Tool state desync | Call `toolbar.set_active_tool()` to force resync |

## Testing Checklist

### Functional Tests
- [ ] Click each tool button - only one selected at a time
- [ ] Change terrain - signal fires with correct ID
- [ ] Move brush slider - label updates, signal fires
- [ ] Change edge type - signal fires with correct ID
- [ ] Press keyboard shortcuts - tools activate correctly

### Integration Tests
- [ ] Tool changes reflected in hex editor
- [ ] Status bar updates on tool/terrain change
- [ ] Undo/redo maintains toolbar state
- [ ] Save/load preserves toolbar state
- [ ] Multiple maps remember independent toolbar states

### Visual Tests
- [ ] Icons display correctly on all platforms
- [ ] Tooltips appear on hover with correct text
- [ ] Separators visible between groups
- [ ] Buttons highlight when active
- [ ] Layout doesn't break at different window sizes

## Performance Notes

- ButtonGroup: O(1) mutual exclusivity enforcement
- Signal emission: Direct, no queuing
- Node count: ~30 nodes total (lightweight)
- Memory footprint: <1KB for toolbar instance
- Update frequency: Only on user interaction (not per-frame)

## Extension Points

### Adding New Tools
1. Add button node in toolbar.tscn
2. Add to `_tool_button_group` in toolbar.gd
3. Add enum value to `Tool`
4. Connect toggled signal in `_connect_signals()`
5. Add case to `set_active_tool()` and `get_active_tool()`

### Adding New Terrain Types
1. Add item to TerrainSelector in toolbar.tscn
2. Update terrain ID mapping in editor
3. Add keyboard shortcut if using 0-9 keys

### Custom Icons
1. Create 32x32px icon images
2. Load in `_try_load_editor_icons()`
3. Assign to button.icon property
4. Clear button.text when icon loaded

## Dependencies

- Godot 4.5+
- GDScript with static typing
- No external plugins required
- Works in both editor and standalone runtime

## License Compatibility

- Scene file: Godot scene format (MIT-compatible)
- Script file: Standard GDScript (MIT-compatible)
- Unicode emoji: Unicode Standard (free to use)
- Integration with existing AD&D project structure

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-16 | Initial icon-based toolbar design |

## Support

For issues or questions:
1. Check TOOLBAR_INTEGRATION.md for detailed guide
2. Review toolbar_integration_example.gd for code samples
3. Inspect toolbar.gd for API documentation
4. Test with panel_demo.tscn for isolated testing

## Next Steps

After integration:
1. Test all tools work correctly
2. Verify keyboard shortcuts
3. Check tooltip text accuracy
4. Test on target platforms (macOS/Windows/Linux)
5. Consider upgrading emoji to custom icons
6. Add tool-specific keyboard shortcuts (Shift+P for options, etc.)
7. Implement tool presets (favorite configurations)
8. Add toolbar position options (top/bottom/side)
