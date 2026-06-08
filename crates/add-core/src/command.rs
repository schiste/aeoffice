use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum GameCommand {
    ChooseStoryOption { beat_id: String, option_id: String },
    SetHeroAssigned { assigned: bool },
    SetHeroRole { role_id: String },
    SetRoleCrew { role_id: String, crew: u8 },
    SetStationEnabled { station_id: String, enabled: bool },
    StartWorldAction { action_id: String },
    StartConstruction { option_id: String },
    StartProcessing { recipe_id: String },
    RecruitFromSurvivorCave,
    MoveHeroTo { q: i8, r: i8 },
    OpenDoor { key: String },
    SpendBassline { amount: f64 },
    Tick { seconds: f64 },
    RunOfflineCatchup { elapsed_seconds: f64 },
    ResetRun,
}
