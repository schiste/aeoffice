use crate::state::GameState;

pub fn export_save(state: &GameState) -> Result<String, serde_json::Error> {
    serde_json::to_string_pretty(state)
}

pub fn import_save(raw: &str) -> Result<GameState, serde_json::Error> {
    serde_json::from_str(raw)
}
