# Dungeons & Drum Machines

> **"In the Silence, music isn't art. It's oxygen."**

**Dungeons & Drum Machines** is a Dystopian Idle-RPG built with **Godot 4** and **Rust**. It combines the addictive progression of incremental games (*NGU Idle*, *Candy Box*) with the survival tension of *Darkest Dungeon*, wrapped in a unique "Acoustic Survival" narrative.

## 🎵 The Concept
The world didn't end with a bang—it ended with a filter. Satellites dampen all sound on Earth. A "Silence Virus" kills anyone exposed to absolute quiet for more than 4 hours.

You play a survivor with a genetic resistance (24-hour tolerance). You must build a **Base (The Studio)** centered around a Crystal that amplifies sound, pushing back the Silence to reveal the map.

Outside the Base, you explore the world through **map exploration, quests, enigmas, and expeditions** (with both **manual** and **auto** play modes). Combat is **real-time** and **cooldown-based** (actions recharge over time). The Base is the primary source of sound output, produced by the crew, their equipment, and artifacts. This sound is treated as three base resources (low/mid/high band) that affect the Crystal field differently. Later progression unlocks **forward safe spots** during exploration, which are also used to unlock expedition destinations (temporarily or permanently). Expeditions can run in parallel, and they use the same crew pool as the Base (a tradeoff between exploration income and Base output).

## 🧭 Game Dynamics (Core Loops)
* **Staff the Base:** Assign staff to the Crystal Circle and stations to generate and spend `Bassline` (reach), `Chorus` (power), and `Harmonics` (efficiency).
* **Expand the Bubble:** `Bassline` grows the safe radius (Amplitude), revealing more of the map over time; a 2-phase inertia prevents instant collapse when output drops.
* **Explore Manually:** The Hero pushes beyond safety (real-time cooldown combat + enigmas) and uses safe spots (including the Base) to rest and reduce Viral Load.
* **Run Auto Expeditions:** Expeditions are crew-only, parallel, time-based resource runs that never fail, but can slow/stall during brownouts and can be recalled for partial loot.
* **Manage Tradeoffs:** Sending staff out reduces Base output; exceeding `Chorus` capacity causes brownouts, station penalties, and staff inactivity, which can cascade into smaller reach and unstable safe spots.
* **Ascend (Late Game):** Cash in accumulated Harmonics to permanently raise `Harmonics Level` at the cost of a hard reset (Crystal shutdown + all crew die); restart with no crew but big generation bonuses and new unlocks.

## 🛠️ Tech Stack
* **Engine:** Godot 4.x (Compatibility Renderer for Web support).
* **Core Logic:** Rust (via GDExtension) for high-performance math/simulations.
* **Audio:** Native Godot `AudioServer` for dynamic, reactive mixing.
* **Platforms:** Web (HTML5) and Mobile (Android/iOS).

## 🚀 Getting Started
1.  **Clone:** `git clone https://github.com/schiste/adnd.git`
2.  **Build Rust:** `cd rust_core && cargo build`
3.  **Open:** Import `project.godot` into Godot 4.3+.

## 📂 Documentation
* [**Game Specifications**](../mechanics/specifications.md) - Mechanics, Economy, and Stats.
* [**World Bible**](../lore/lore.md) - The Virus, The Silence, and the world.
