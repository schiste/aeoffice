# AD&D Hex Map Editor

A custom hex grid map editor for Godot 4.5, using cube coordinates.

## Setup

1. Open Godot 4.5+
2. Import this project (select the `godot` folder)
3. The editor plugin should auto-enable; if not, go to Project → Project Settings → Plugins and enable "Hex Map Editor"
4. Open `scenes/editor_scene.tscn` and run (F5)

## Controls

| Action | Input |
|--------|-------|
| Paint terrain | Left-click on hex |
| Cycle terrain | Right-click on hex |
| Add new hex | Shift + Left-click |
| Pan | Middle-mouse drag |
| Zoom | Scroll wheel |
| Undo | Ctrl+Z |
| Redo | Ctrl+Shift+Z |
| Save | Ctrl+S |
| Load | Ctrl+O |

## Terrain Types

| Terrain | Impedance | Notes |
|---------|-----------|-------|
| Plains | 1.0 | Default, baseline |
| Water | 0.1 | Sound carries well |
| Forest | 1.5 | Sound absorption |
| Hills | 2.0 | Moderate obstacle |
| Mountain | ∞ | Hard blocker |
| Cave Entrance | 0.5 | Entry point |
| Swamp | 2.5 | Difficult terrain |
| Desert | 1.2 | Open, slight impedance |
| Ruins | 1.8 | Urban debris |

## File Format

Maps are saved as JSON in `maps/world.json` (v3):

```json
{
  "version": 3,
  "meta": { "kind": "save", "unix": 0, "iso": "" },
  "regions": [
    { "id": 0, "name": "Unassigned", "color": [0.9, 0.9, 0.9, 0.35] }
  ],
  "hexes": [
    {
      "q": 0,
      "r": 0,
      "terrain": "plains",
      "impedance": 1.0,
      "elevation": 0,
      "features": [],
      "region_id": 0,
      "name": "",
      "description": ""
    }
  ],
  "edges": [
    { "key": "0,0:1,0", "type": "river" }
  ]
}
```

Coordinates use cube system where `q + r + s = 0` (s is implicit: `s = -q - r`).

Notes:
- `impedance` is optional; if omitted or `null`, it is derived from `terrain` on load.
- `region_id` is optional; it defaults to `0` ("Unassigned").
- Older saves may be a raw JSON array of hex objects; the loader still supports this for now.

## Project Structure

```
godot/
├── addons/
│   └── hex_editor/
│       ├── plugin.cfg          # Plugin metadata
│       ├── hex_editor_plugin.gd # Editor dock integration
│       ├── hex_math.gd         # Cube coordinate math
│       ├── hex_editor.gd       # Main editor logic
│       └── hex_editor.tscn     # Editor node scene
├── scenes/
│   ├── editor_scene.tscn       # Main editor scene
│   └── editor_ui.gd            # UI controller
├── maps/
│   └── world.json              # Saved map data
└── project.godot               # Project config
```

## Next Steps

- [ ] Add brush size (paint multiple hexes)
- [ ] Add fill tool (flood fill terrain)
- [ ] Add layers (terrain, features, entities)
- [ ] Add chunk visualization (for large maps)
- [ ] Export to binary format for Rust
