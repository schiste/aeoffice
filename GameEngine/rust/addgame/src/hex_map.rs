use godot::prelude::*;
use godot::classes::{Control, IControl, InputEvent, InputEventMouseButton, InputEventMouseMotion, ThemeDb};
use godot::global::MouseButton;
use godot::obj::BaseMut;
use rusqlite::{Connection, Result as SqlResult};
use std::collections::HashMap;
use std::f32::consts::PI;

/// Hex tile data loaded from SQLite
#[derive(Clone, Debug)]
pub struct HexTile {
    pub q: i32,
    pub r: i32,
    pub terrain: String,
    pub name: String,
    pub has_road: bool,
    pub has_water: bool,
    pub has_forest: bool,
}

/// Data needed to draw a single hex
struct HexDrawData {
    screen_pos: Vector2,
    fill_color: Color,
    is_selected: bool,
    name: String,
}

/// HexMap is the main game view node - renders hex grid and handles selection
#[derive(GodotClass)]
#[class(base=Control)]
pub struct HexMap {
    base: Base<Control>,

    /// Hex size in pixels (center to corner)
    #[export]
    hex_size: f32,

    /// Path to SQLite database
    #[export]
    db_path: GString,

    /// Camera offset for panning
    camera_offset: Vector2,

    /// Zoom level
    zoom: f32,

    /// Currently selected hex (q, r)
    selected_hex: Option<(i32, i32)>,

    /// Loaded hex tiles
    tiles: HashMap<(i32, i32), HexTile>,

    /// Is panning active
    is_panning: bool,

    /// Last mouse position for panning
    last_mouse_pos: Vector2,
}

#[godot_api]
impl IControl for HexMap {
    fn init(base: Base<Control>) -> Self {
        Self {
            base,
            hex_size: 60.0,
            db_path: GString::new(),
            camera_offset: Vector2::ZERO,
            zoom: 1.0,
            selected_hex: None,
            tiles: HashMap::new(),
            is_panning: false,
            last_mouse_pos: Vector2::ZERO,
        }
    }

    fn ready(&mut self) {
        // Load tiles if db_path is set
        if !self.db_path.is_empty() {
            self.load_from_db();
        }
    }

    fn draw(&mut self) {
        let size = self.base().get_size();
        let center = size / 2.0 + self.camera_offset;
        let hex_size = self.hex_size;
        let zoom = self.zoom;
        let selected_hex = self.selected_hex;

        // First pass: collect all draw data without borrowing self mutably
        let mut draw_list: Vec<HexDrawData> = Vec::new();

        for ((q, r), tile) in &self.tiles {
            let pixel_pos = hex_to_pixel_static(hex_size, *q, *r);
            let screen_pos = (pixel_pos * zoom) + center;

            // Skip if off-screen
            if screen_pos.x < -hex_size * zoom * 2.0
                || screen_pos.x > size.x + hex_size * zoom * 2.0
                || screen_pos.y < -hex_size * zoom * 2.0
                || screen_pos.y > size.y + hex_size * zoom * 2.0
            {
                continue;
            }

            let fill_color = terrain_color_static(&tile.terrain, tile);
            let is_selected = selected_hex == Some((*q, *r));

            draw_list.push(HexDrawData {
                screen_pos,
                fill_color,
                is_selected,
                name: tile.name.clone(),
            });
        }

        // Collect selected hex info
        let selected_info: Option<String> = if let Some((q, r)) = selected_hex {
            self.tiles.get(&(q, r)).map(|tile| {
                format!("Selected: ({}, {}) - {} - {}", q, r, tile.terrain, tile.name)
            })
        } else {
            None
        };

        // Second pass: actually draw
        for data in draw_list {
            draw_hex_static(
                &mut self.base_mut(),
                data.screen_pos,
                data.fill_color,
                data.is_selected,
                hex_size * zoom,
            );

            // Draw hex name if it has one and zoom is high enough
            if !data.name.is_empty() && zoom > 0.5 {
                if let Some(font) = ThemeDb::singleton().get_fallback_font() {
                    let text_pos = data.screen_pos - Vector2::new(hex_size * zoom * 0.4, -5.0);
                    self.base_mut().draw_string(&font, text_pos, &data.name);
                }
            }
        }

        // Draw selected hex info in top-left corner
        if let Some(info) = selected_info {
            if let Some(font) = ThemeDb::singleton().get_fallback_font() {
                self.base_mut().draw_string(&font, Vector2::new(10.0, 30.0), &info);
            }
        }
    }

    fn gui_input(&mut self, event: Gd<InputEvent>) {
        // Handle mouse button events
        if let Ok(mouse_event) = event.clone().try_cast::<InputEventMouseButton>() {
            let button_index = mouse_event.get_button_index();
            let pressed = mouse_event.is_pressed();
            let position = mouse_event.get_position();

            match button_index {
                // Left click - select hex
                MouseButton::LEFT => {
                    if pressed {
                        self.handle_click(position);
                    }
                }
                // Middle click - start/stop panning
                MouseButton::MIDDLE => {
                    self.is_panning = pressed;
                    self.last_mouse_pos = position;
                }
                // Scroll wheel - zoom
                MouseButton::WHEEL_UP => {
                    if pressed {
                        self.zoom = (self.zoom * 1.1).min(3.0);
                        self.base_mut().queue_redraw();
                    }
                }
                MouseButton::WHEEL_DOWN => {
                    if pressed {
                        self.zoom = (self.zoom / 1.1).max(0.2);
                        self.base_mut().queue_redraw();
                    }
                }
                _ => {}
            }
        }

        // Handle mouse motion for panning
        if let Ok(motion_event) = event.try_cast::<InputEventMouseMotion>() {
            if self.is_panning {
                let delta = motion_event.get_position() - self.last_mouse_pos;
                self.camera_offset += delta;
                self.last_mouse_pos = motion_event.get_position();
                self.base_mut().queue_redraw();
            }
        }
    }
}

#[godot_api]
impl HexMap {
    /// Signal emitted when a hex is selected
    #[signal]
    fn hex_selected(q: i32, r: i32);

    /// Load hex data from SQLite database
    #[func]
    fn load_db(&mut self, path: GString) {
        self.db_path = path;
        self.load_from_db();
        self.base_mut().queue_redraw();
    }

    /// Get the currently selected hex coordinates, or (-999, -999) if none
    #[func]
    fn get_selected_hex(&self) -> Vector2i {
        match self.selected_hex {
            Some((q, r)) => Vector2i::new(q, r),
            None => Vector2i::new(-999, -999),
        }
    }

    /// Center the view on a specific hex
    #[func]
    fn center_on_hex(&mut self, q: i32, r: i32) {
        let pixel_pos = hex_to_pixel_static(self.hex_size, q, r);
        let size = self.base().get_size();
        self.camera_offset = -pixel_pos * self.zoom + size / 2.0 - size / 2.0;
        self.base_mut().queue_redraw();
    }

    /// Set zoom level
    #[func]
    fn set_zoom(&mut self, level: f32) {
        self.zoom = level.clamp(0.2, 3.0);
        self.base_mut().queue_redraw();
    }

    /// Get tile count
    #[func]
    fn get_tile_count(&self) -> i32 {
        self.tiles.len() as i32
    }
}

impl HexMap {
    /// Handle click to select a hex
    fn handle_click(&mut self, screen_pos: Vector2) {
        let size = self.base().get_size();
        let center = size / 2.0 + self.camera_offset;

        // Convert screen position to world position
        let world_pos = (screen_pos - center) / self.zoom;

        // Convert to hex coordinates
        let (q, r) = pixel_to_hex_static(self.hex_size, world_pos);

        // Check if this hex exists
        if self.tiles.contains_key(&(q, r)) {
            self.selected_hex = Some((q, r));
            self.base_mut().emit_signal("hex_selected", &[q.to_variant(), r.to_variant()]);
        } else {
            self.selected_hex = None;
        }

        self.base_mut().queue_redraw();
    }

    /// Load tiles from SQLite database
    fn load_from_db(&mut self) {
        let path = self.db_path.to_string();
        if path.is_empty() {
            godot_warn!("HexMap: No database path set");
            return;
        }

        match load_tiles_from_sqlite(&path) {
            Ok(tiles) => {
                godot_print!("HexMap: Loaded {} tiles from {}", tiles.len(), path);
                self.tiles = tiles;
            }
            Err(e) => {
                godot_error!("HexMap: Failed to load database: {}", e);
            }
        }
    }
}

/// Convert axial hex coordinates to pixel position (static version)
fn hex_to_pixel_static(hex_size: f32, q: i32, r: i32) -> Vector2 {
    // Pointy-top hex layout
    let x = hex_size * (3.0_f32.sqrt() * q as f32 + 3.0_f32.sqrt() / 2.0 * r as f32);
    let y = hex_size * (3.0 / 2.0 * r as f32);
    Vector2::new(x, y)
}

/// Convert pixel position to axial hex coordinates (static version)
fn pixel_to_hex_static(hex_size: f32, pixel: Vector2) -> (i32, i32) {
    // Inverse of hex_to_pixel for pointy-top
    let q = (3.0_f32.sqrt() / 3.0 * pixel.x - 1.0 / 3.0 * pixel.y) / hex_size;
    let r = (2.0 / 3.0 * pixel.y) / hex_size;

    // Round to nearest hex (cube coordinate rounding)
    let s = -q - r;

    let mut rq = q.round();
    let mut rr = r.round();
    let rs = s.round();

    let q_diff = (rq - q).abs();
    let r_diff = (rr - r).abs();
    let s_diff = (rs - s).abs();

    if q_diff > r_diff && q_diff > s_diff {
        rq = -rr - rs;
    } else if r_diff > s_diff {
        rr = -rq - rs;
    }

    (rq as i32, rr as i32)
}

/// Get terrain color (static version)
fn terrain_color_static(terrain: &str, tile: &HexTile) -> Color {
    // Base color from terrain type
    let base_color = match terrain {
        "forest" => Color::from_rgb(0.2, 0.5, 0.2),
        "water" => Color::from_rgb(0.2, 0.4, 0.8),
        "hills" => Color::from_rgb(0.6, 0.5, 0.3),
        "mountains" => Color::from_rgb(0.5, 0.5, 0.5),
        "urban" | "city" => Color::from_rgb(0.6, 0.6, 0.6),
        "village" => Color::from_rgb(0.7, 0.6, 0.5),
        "farmland" => Color::from_rgb(0.8, 0.7, 0.4),
        _ => Color::from_rgb(0.5, 0.6, 0.4), // plains default
    };

    // Modify based on features
    let mut color = base_color;
    if tile.has_water {
        color = color.lerp(Color::from_rgb(0.3, 0.5, 0.8), 0.3);
    }
    if tile.has_forest {
        color = color.lerp(Color::from_rgb(0.2, 0.4, 0.2), 0.2);
    }
    if tile.has_road {
        color = color.lerp(Color::from_rgb(0.6, 0.5, 0.4), 0.1);
    }

    color
}

/// Draw a single hex at screen position (static version)
fn draw_hex_static(
    base: &mut BaseMut<HexMap>,
    center: Vector2,
    fill_color: Color,
    is_selected: bool,
    scaled_size: f32,
) {
    // Generate hex vertices (pointy-top)
    let mut points = PackedVector2Array::new();
    for i in 0..6 {
        let angle = PI / 180.0 * (60.0 * i as f32 - 30.0);
        let x = center.x + scaled_size * angle.cos();
        let y = center.y + scaled_size * angle.sin();
        points.push(Vector2::new(x, y));
    }

    // Draw filled hex
    base.draw_colored_polygon(&points, fill_color);

    // Draw outline
    let outline_color = if is_selected {
        Color::from_rgb(1.0, 0.8, 0.0) // Gold for selected
    } else {
        Color::from_rgba(0.0, 0.0, 0.0, 0.3)
    };
    let outline_width = if is_selected { 3.0 } else { 1.0 };

    // Draw outline by connecting vertices
    for i in 0..6 {
        let next = (i + 1) % 6;
        if let (Some(p1), Some(p2)) = (points.get(i), points.get(next)) {
            base.draw_line_ex(p1, p2, outline_color)
                .width(outline_width)
                .done();
        }
    }
}

/// Load tiles from SQLite file (static version)
fn load_tiles_from_sqlite(path: &str) -> SqlResult<HashMap<(i32, i32), HexTile>> {
    let conn = Connection::open(path)?;

    let mut stmt = conn.prepare(
        "SELECT q, r, terrain, name, has_road, has_water, has_forest FROM hexes"
    )?;

    let tiles_iter = stmt.query_map([], |row| {
        Ok(HexTile {
            q: row.get(0)?,
            r: row.get(1)?,
            terrain: row.get(2)?,
            name: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
            has_road: row.get::<_, i32>(4)? != 0,
            has_water: row.get::<_, i32>(5)? != 0,
            has_forest: row.get::<_, i32>(6)? != 0,
        })
    })?;

    let mut tiles = HashMap::new();
    for tile_result in tiles_iter {
        let tile = tile_result?;
        tiles.insert((tile.q, tile.r), tile);
    }

    Ok(tiles)
}
