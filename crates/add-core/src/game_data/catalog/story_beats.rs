use crate::game_data::*;

const STORY_CHOICES_ROAD_TO_BASE: &[StoryChoiceDef] = &[
    StoryChoiceDef {
        id: "story.choice.road.follow_signal",
        label: "Follow the low signal",
        response: "You stay on the broken road because the distant hum feels like the only promise left.",
    },
    StoryChoiceDef {
        id: "story.choice.road.keep_moving",
        label: "Keep moving through the ash",
        response: "You refuse to stop moving. If there is shelter ahead, momentum will find it first.",
    },
];

const STORY_CHOICES_FIRST_GLIMPSE: &[StoryChoiceDef] = &[
    StoryChoiceDef {
        id: "story.choice.glimpse.watch_lights",
        label: "Study the lights",
        response: "The light pulses in time with the hum. Someone built this place to keep something worse outside.",
    },
    StoryChoiceDef {
        id: "story.choice.glimpse.scan_ruins",
        label: "Scan the ruins",
        response: "The outer shell is wrecked, but the center still breathes. The Base might be dying, not dead.",
    },
];

const STORY_CHOICES_ENTER_THE_BUBBLE: &[StoryChoiceDef] = &[
    StoryChoiceDef {
        id: "story.choice.bubble.trust_sound",
        label: "Trust the sound wall",
        response: "The pressure eases as soon as you cross the edge. The Bubble is weak, but it is real.",
    },
    StoryChoiceDef {
        id: "story.choice.bubble.touch_air",
        label: "Test the air first",
        response: "Your hand trembles at the border. Inside the Bubble, the noise of the world finally steps back.",
    },
];

const STORY_CHOICES_INVESTIGATE_BASE: &[StoryChoiceDef] = &[
    StoryChoiceDef {
        id: "story.choice.investigate.search_power",
        label: "Search for surviving systems",
        response: "If anything still runs here, it will tell you what can be saved.",
    },
    StoryChoiceDef {
        id: "story.choice.investigate.trace_hum",
        label: "Trace the hum through the walls",
        response: "The sound has a source. If you can reach it, the Base might answer back.",
    },
];

const STORY_CHOICES_EXPLORE_BASE: &[StoryChoiceDef] = &[
    StoryChoiceDef {
        id: "story.choice.explore.look_for_tools",
        label: "Look for tools and salvage",
        response: "You push deeper, looking for anything that can turn ruins into repairs.",
    },
    StoryChoiceDef {
        id: "story.choice.explore.look_for_rooms",
        label: "Look for livable rooms",
        response: "If more people are coming, they will need more than a miracle. They will need a place to stay.",
    },
];

pub(in crate::game_data) const STORY_BEATS: &[StoryBeatDef] = &[
    StoryBeatDef {
        id: STORY_BEAT_ROAD_TO_BASE,
        schema_id: STORY_BEAT_ROAD_TO_BASE,
        label: "Road to Base",
        body: "The last safe road is a scar through dead ground. Somewhere ahead, a weak musical hum is still holding back the static.",
        arc: "pre_arrival",
        sequence: 10,
        world_action_id: None,
        choices: STORY_CHOICES_ROAD_TO_BASE,
        related_ids: &[TILE_BASE_CORE, STRUCTURE_BASE],
    },
    StoryBeatDef {
        id: STORY_BEAT_FIRST_GLIMPSE,
        schema_id: STORY_BEAT_FIRST_GLIMPSE,
        label: "First Glimpse",
        body: "From the ridge, you finally see it: a broken complex wrapped in a thin blue halo. The Base is still standing for now.",
        arc: "pre_arrival",
        sequence: 20,
        world_action_id: None,
        choices: STORY_CHOICES_FIRST_GLIMPSE,
        related_ids: &[TILE_RIDGE_LINE, TILE_BASE_CORE, STRUCTURE_CRYSTAL_CIRCLE],
    },
    StoryBeatDef {
        id: STORY_BEAT_ENTER_THE_BUBBLE,
        schema_id: STORY_BEAT_ENTER_THE_BUBBLE,
        label: "Enter the Bubble",
        body: "Crossing the boundary changes everything. The pressure drops, the noise thins, and the Crystal's pulse becomes a direction instead of a warning.",
        arc: "pre_arrival",
        sequence: 30,
        world_action_id: None,
        choices: STORY_CHOICES_ENTER_THE_BUBBLE,
        related_ids: &[RESOURCE_BASSLINE, STATION_CRYSTAL_CIRCLE, TILE_BASE_CORE],
    },
    StoryBeatDef {
        id: STORY_BEAT_INVESTIGATE_BASE,
        schema_id: STORY_BEAT_INVESTIGATE_BASE,
        label: "Investigate Base",
        body: "The first sweep is about triage. Find what still works, what is beyond repair, and what the Base needs before it collapses completely.",
        arc: "base_onboarding",
        sequence: 40,
        world_action_id: Some(WORLD_ACTION_INVESTIGATE_BASE),
        choices: STORY_CHOICES_INVESTIGATE_BASE,
        related_ids: &[
            WORLD_ACTION_INVESTIGATE_BASE,
            STORY_BEAT_EXPLORE_BASE,
            STRUCTURE_BASE,
        ],
    },
    StoryBeatDef {
        id: STORY_BEAT_EXPLORE_BASE,
        schema_id: STORY_BEAT_EXPLORE_BASE,
        label: "Explore Base",
        body: "Now go deeper. The first repair loop is buried somewhere inside the ruin, along with the pieces you need to wake the Base back up.",
        arc: "base_onboarding",
        sequence: 50,
        world_action_id: Some(WORLD_ACTION_EXPLORE_BASE),
        choices: STORY_CHOICES_EXPLORE_BASE,
        related_ids: &[
            WORLD_ACTION_EXPLORE_BASE,
            PROJECT_RESTORE_STUDIO,
            CONSTRUCTION_REMOVING_MOSS,
            RESOURCE_WATER,
        ],
    },
    StoryBeatDef {
        id: STORY_BEAT_RESTORE_STUDIO,
        schema_id: STORY_BEAT_RESTORE_STUDIO,
        label: "Restore Studio",
        body: "The Studio is the first room worth saving. If you can bring it back, the Base can start singing again.",
        arc: "base_onboarding",
        sequence: 60,
        world_action_id: None,
        choices: &[],
        related_ids: &[
            PROJECT_RESTORE_STUDIO,
            RESOURCE_CHORUS,
            PROJECT_BUILD_FIRE_PIT,
        ],
    },
    StoryBeatDef {
        id: STORY_BEAT_BUILD_FIRE_PIT,
        schema_id: STORY_BEAT_BUILD_FIRE_PIT,
        label: "Build Fire Pit",
        body: "The Fire Pit is less about heat than rhythm. People gather around steady signals before they trust walls and wiring.",
        arc: "base_onboarding",
        sequence: 70,
        world_action_id: None,
        choices: &[],
        related_ids: &[
            PROJECT_BUILD_FIRE_PIT,
            STATION_FIRE_PIT,
            STORY_BEAT_REACH_SURVIVOR_CAVE,
            UI_ACTION_RECRUIT,
        ],
    },
    StoryBeatDef {
        id: STORY_BEAT_REACH_SURVIVOR_CAVE,
        schema_id: STORY_BEAT_REACH_SURVIVOR_CAVE,
        label: "Reach Survivor Cave",
        body: "If the Bubble holds long enough, its edge will brush the cave where the next survivors are hiding.",
        arc: "base_onboarding",
        sequence: 75,
        world_action_id: None,
        choices: &[],
        related_ids: &[
            TILE_SURVIVOR_CAVE,
            UI_MAP_CAVE_GATE,
            STORY_BEAT_FIRST_RECRUIT,
        ],
    },
    StoryBeatDef {
        id: STORY_BEAT_FIRST_RECRUIT,
        schema_id: STORY_BEAT_FIRST_RECRUIT,
        label: "First Survivor Recruited",
        body: "The first recruit is proof the Base is more than a shelter. It is becoming a place people can choose.",
        arc: "base_onboarding",
        sequence: 80,
        world_action_id: None,
        choices: &[],
        related_ids: &[
            UI_ACTION_RECRUIT,
            TILE_SURVIVOR_CAVE,
            UI_STATUS_BASE_RECRUITS,
            STORY_BEAT_AWAIT_SURVIVOR_ARRIVAL,
        ],
    },
    StoryBeatDef {
        id: STORY_BEAT_AWAIT_SURVIVOR_ARRIVAL,
        schema_id: STORY_BEAT_AWAIT_SURVIVOR_ARRIVAL,
        label: "Await Survivor Arrival",
        body: "Signal the route. Keep the Base stable. A promise only matters if someone can safely walk into it.",
        arc: "base_onboarding",
        sequence: 85,
        world_action_id: None,
        choices: &[],
        related_ids: &[UI_STATUS_BASE_RECRUITS, STORY_BEAT_STABILIZE_BASE],
    },
    StoryBeatDef {
        id: STORY_BEAT_STABILIZE_BASE,
        schema_id: STORY_BEAT_STABILIZE_BASE,
        label: "Stabilize the Base",
        body: "The Base is alive, but not safe yet. Power, morale, housing, and sound all need to hold at once now.",
        arc: "base_onboarding",
        sequence: 90,
        world_action_id: None,
        choices: &[],
        related_ids: &[
            RESOURCE_CHORUS,
            RESOURCE_HARMONICS,
            UI_PANEL_POWER,
            UI_PANEL_BASE,
        ],
    },
];
