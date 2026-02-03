use godot::prelude::*;

mod hex_map;

struct AddGame;

#[gdextension]
unsafe impl ExtensionLibrary for AddGame {}
