# Toolbar Design Comparison

## Before: Text-Based Toolbar

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Terrain: [Plains ▼] │ [Paint] [Fill] [Erase] [Edge] [POI] [Region] [Select]│
│                      │ Brush: 1 [──●────] │ Edge: [River ▼]                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Characteristics:**
- Text buttons take up significant horizontal space
- No visual grouping of related tools
- No tooltips explaining tool functionality
- Tools don't enforce mutual exclusivity
- Less modern appearance

**Total Width Estimate:** ~800px (with all buttons)

## After: Icon-Based Toolbar

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Terrain: [Plains▼] │ [🖌️] [🪣] [🗑️] │ [➖] [📍] [🗺️] │ [⬚] │ Brush:1 [──●─] │
│                                                           │ Edge: [River ▼]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Characteristics:**
- Icon buttons are more compact (32x32px)
- Clear visual grouping with separators
- Rich tooltips on hover
- ButtonGroup enforces one-tool-at-a-time selection
- Modern, professional appearance
- Easier to scan visually

**Total Width Estimate:** ~500px (35% space savings)

## Detailed Layout Structure

### New Toolbar Groups

```
[Terrain Group]  |  [Primary Tools]  |  [Feature Tools]  |  [Select]  |  [Brush]  |  [Edge]
                 |                   |                   |            |           |
Terrain: [▼]     |  🖌️ 🪣 🗑️        |  ➖ 📍 🗺️        |  ⬚         | Br:1 [▬]  | Edge:[▼]
                 |                   |                   |            |           |
                 |  Paint/Fill       |  Edge/POI         |  Selection | Size      | Type
                 |  /Erase           |  /Region          |            | control   | picker
```

### Group Spacing

```
Group 1          Sep  Group 2       Sep  Group 3       Sep  Group 4  Sep  Group 5     Sep  Group 6
┌──────────┐     ║    ┌──────┐     ║    ┌──────┐     ║    ┌────┐   ║    ┌─────┐     ║    ┌────┐
│Terrain:▼ │     ║    │🖌️🪣🗑️│     ║    │➖📍🗺️│     ║    │ ⬚  │   ║    │Br:1▬│     ║    │Ed:▼│
└──────────┘     ║    └──────┘     ║    └──────┘     ║    └────┘   ║    └─────┘     ║    └────┘
   2px sep       4px    2px sep    4px    2px sep    4px   2px     4px   4px sep     4px   4px
```

## Icon Meanings

| Icon | Tool     | Keyboard | Description                                    |
|------|----------|----------|------------------------------------------------|
| 🖌️   | Paint    | P        | Paint terrain type on hexes                    |
| 🪣   | Fill     | F        | Flood-fill adjacent hexes with same terrain    |
| 🗑️   | Erase    | X        | Delete hexes from the map                      |
| ➖   | Edge     | E        | Draw rivers, roads, or walls on hex edges      |
| 📍   | POI      | I        | Place named points of interest                 |
| 🗺️   | Region   | R        | Assign hexes to named regions                  |
| ⬚    | Select   | S        | Select multiple hexes for batch operations     |

## Tooltip Examples

When hovering over each tool button, users see:

```
┌─────────────────────────────┐
│  Paint Tool (P)             │
│  Click to paint terrain on  │
│  hexes                      │
└─────────────────────────────┘
```

```
┌─────────────────────────────┐
│  Fill Tool (F)              │
│  Click to flood-fill        │
│  adjacent hexes with same   │
│  terrain                    │
└─────────────────────────────┘
```

## Code Structure Comparison

### Before (editor_scene.tscn)
```gdscript
# Separate Button nodes, no grouping
[node name="ToolPaintBtn" type="Button"]
text = "Paint"
toggle_mode = true

[node name="ToolFillBtn" type="Button"]
text = "Fill"
toggle_mode = true
# ... 7 separate button definitions
```

**Issues:**
- No ButtonGroup = multiple tools can be selected
- Each button needs manual unique_name_in_owner tagging
- No organizational structure
- Hard to maintain consistency

### After (toolbar.tscn + toolbar.gd)
```gdscript
# Organized groups with separators
[node name="ToolsGroup" type="HBoxContainer"]
  [node name="PaintBtn"]  # Icon button with tooltip
  [node name="FillBtn"]   # Icon button with tooltip
  [node name="EraseBtn"]  # Icon button with tooltip

[node name="Sep2" type="VSeparator"]

[node name="FeaturesGroup" type="HBoxContainer"]
  # ... more tools
```

**Script:**
```gdscript
# Automatic ButtonGroup assignment
var _tool_button_group: ButtonGroup = ButtonGroup.new()

func _setup_tool_buttons() -> void:
    for btn in tool_buttons:
        btn.button_group = _tool_button_group
```

**Benefits:**
- ButtonGroup ensures mutual exclusivity
- Centralized signal handling
- Type-safe API methods
- Easy to extend with new tools

## Visual Hierarchy

### Before
```
All elements at same visual level
↓
[Label] [Dropdown] [Button] [Button] [Button] ...
```
Everything competes for attention equally.

### After
```
Primary level: Tool groups
↓
[Terrain] | [Primary Tools] | [Feature Tools] | [Select] | [Config]
           ↓
           Secondary level: Individual tools
           ↓
           [🖌️] [🪣] [🗑️]
```
Clear hierarchy: groups first, then individual tools.

## Accessibility Features

### Old Toolbar
- Text labels (good for screen readers)
- No keyboard shortcuts documented
- No tooltips

### New Toolbar
- Icons with alt text via tooltips
- Keyboard shortcuts documented in tooltips
- Screen readers can read tooltip text
- Logical tab order through groups
- Consistent button sizing (easier targets)

## Performance Comparison

| Metric                    | Old      | New      | Improvement |
|---------------------------|----------|----------|-------------|
| Horizontal space (px)     | ~800     | ~500     | 35% less    |
| Button count              | 7        | 7        | Same        |
| Node count (total)        | ~15      | ~30      | More nodes* |
| Signal connections        | Manual   | Auto     | Cleaner     |
| Type safety               | None     | Full     | Better      |

*More nodes due to organizational containers, but better structure.

## Migration Path

### Phase 1: Testing (Recommended)
1. Keep old TopBar visible
2. Add new Toolbar below it
3. Test all tools work correctly
4. Compare user experience

### Phase 2: Gradual Rollout
1. Hide old TopBar by default (visible=false)
2. Use new Toolbar as primary interface
3. Keep old as fallback for 1-2 versions

### Phase 3: Complete Migration
1. Remove old TopBar nodes
2. Delete old signal connections
3. Update documentation
4. Ship with new toolbar only

## User Testing Checklist

- [ ] All 7 tools selectable via icons
- [ ] Only one tool active at a time (ButtonGroup)
- [ ] Tooltips appear on hover
- [ ] Keyboard shortcuts still work (P, F, X, E, I, R, S)
- [ ] Terrain selector updates correctly
- [ ] Brush size slider responds to input
- [ ] Edge type selector changes edge mode
- [ ] Signals fire to parent UI correctly
- [ ] No visual glitches at different resolutions
- [ ] Emoji display correctly on target platform

## Platform Considerations

### macOS
- Emoji render well with system font
- Retina displays: icons look crisp

### Windows
- Verify emoji font support
- May need custom icons for older Windows

### Linux
- Emoji support varies by distribution
- Consider SVG icon fallbacks

## Future Enhancements

1. **Custom SVG Icons**
   - Replace emoji with professional icons
   - Better cross-platform consistency

2. **Icon Themes**
   - Light/dark mode variants
   - User-selectable icon sets

3. **Collapsed Mode**
   - Icon-only compact view
   - Expand on hover for tooltips

4. **Keyboard Shortcuts Panel**
   - Visual keyboard shortcut reference
   - Accessible via toolbar button

5. **Tool Presets**
   - Save favorite tool configurations
   - Quick-switch between presets
