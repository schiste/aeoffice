# Hex Map Editor - Modern UI Architecture

## Overview

The hex map editor uses a modern, integrated UI architecture with resizable docks, a SubViewport-based editor, and comprehensive tool panels.

## Main Scene

**File:** `main_editor.tscn`
**Controller:** `main_editor.gd`

This is the primary editor scene that integrates all components.

## Scene Structure

```
MainEditor (Control)
├── VBoxContainer
│   ├── MenuBar (HBoxContainer)
│   │   ├── FileMenu, EditMenu, ViewMenu, ToolsMenu
│   │   ├── ToastLabel, HexCountLabel, CoordsLabel
│   │
│   ├── MainSplit (HSplitContainer)
│   │   ├── LeftDock (VSplitContainer)
│   │   │   ├── ToolPalette (tools, terrain palette, brush, edge)
│   │   │   └── QuickActions (noise fill, smooth, ridge, stamps, export)
│   │   │
│   │   ├── CenterPanel
│   │   │   └── HexEditorViewport (SubViewportContainer)
│   │   │       └── SubViewport
│   │   │           └── HexEditor (Node2D)
│   │   │
│   │   └── RightDock (VSplitContainer)
│   │       ├── Inspector (hex properties, layers, regions)
│   │       └── MinimapPanel (interactive overview)
│   │
│   └── BottomBar (tool indicator, terrain, undo/redo, status)
│
├── DebugPanel (floating, F3 toggle)
├── LogPanel (floating, F4 toggle)
└── HelpPanel (floating, F1 toggle)
```

## Key Features

### 1. SubViewport-Based HexEditor
The HexEditor runs inside a SubViewport, allowing it to be:
- Embedded within the Control-based UI layout
- Rendered at any size independent of the container
- Properly handle input through `handle_input_locally = false`

### 2. Resizable Docks
- Left dock: Tools and quick actions
- Right dock: Inspector and minimap
- All docks can be toggled with `1` and `2` keys
- Split positions persist in `user://editor_layout.cfg`

### 3. Menu System
- **File:** New, Open, Save, Save As, Recent, Quit
- **Edit:** Undo, Redo, Copy, Paste
- **View:** Toggle docks, grid visibility, reset layout
- **Tools:** Validate, Export/Import, Noise fill, Smooth, Expand

### 4. Tool Palette
Icon-based buttons for:
- 🖌 Paint, 🪣 Fill, 🧹 Erase
- 〰 Edge, 📍 POI, 🗺 Region, ⬚ Select

### 5. Inspector Panel
- Hex coordinates and properties
- Terrain, elevation, region assignment
- Name and description fields
- Layer visibility/lock toggles
- Region management (add/edit/delete)

### 6. Minimap
Uses the existing `minimap.gd` script:
- Real-time hex visualization
- Click to jump, drag to pan
- Scroll to zoom, right-click to reset
- Viewport indicator rectangle

### 7. Theme
Uses `themes/modern_dark.tres`:
- Deep blue/slate color scheme
- Pink/magenta accents
- Rounded corners (6-8px radius)
- Drop shadows on panels

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| 1 | Toggle left dock |
| 2 | Toggle right dock |
| F1 | Toggle help panel |
| F3 | Toggle debug panel |
| F4 | Toggle log panel |
| Ctrl+S | Save |
| Ctrl+Shift+S | Save As |
| Ctrl+O | Open |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z / Ctrl+Y | Redo |
| 0-9 | Select terrain |
| [ / ] | Brush size |
| E / Shift+E | Elevation +/- |

## Legacy Scenes

The following scenes remain for reference but are not the main entry point:
- `editor_scene.tscn` - Old UI layout (tab-based left panel)
- `editor_layout.tscn` - Intermediate attempt at modern layout

## Component Library

Reusable UI components in `scenes/components/`:
- `collapsible_panel.tscn/.gd` - Animated expand/collapse sections
- `dock_panel.tscn/.gd` - Draggable, minimizable panels
- `toolbar.tscn/.gd` - Icon-based tool selector
- `ui_effects.gd` - Tween-based animations

## Minimap Implementations

Two minimap implementations exist:
1. `minimap.gd` - Custom drawing (used in main_editor)
2. `minimap_viewport.tscn/.gd` - SubViewport-based real rendering

The custom drawing approach is used by default for better performance.
