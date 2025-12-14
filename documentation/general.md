# Dungeons & Drum Machines

> **"In the Silence, music isn't art. It's oxygen."**

**Dungeons & Drum Machines** is a Dystopian Idle-RPG built with **Godot 4** and **Rust**. It combines the addictive progression of incremental games (*NGU Idle*, *Candy Box*) with the survival tension of *Darkest Dungeon*, wrapped in a unique "Acoustic Survival" narrative.

## 🎵 The Concept
The world didn't end with a bang—it ended with a filter. Satellites dampen all sound on Earth. A "Silence Virus" kills anyone exposed to absolute quiet for more than 4 hours.

You play a survivor with a genetic resistance (24-hour tolerance). You must build a **Base (The Studio)** centered around a Crystal that amplifies sound, pushing back the Silence to reveal the map.

## 🛠️ Tech Stack
* **Engine:** Godot 4.x (Compatibility Renderer for Web support).
* **Core Logic:** Rust (via GDExtension) for high-performance math/simulations.
* **Audio:** Native Godot `AudioServer` for dynamic, reactive mixing.
* **Platforms:** Web (HTML5) and Mobile (Android/iOS).

## 🚀 Getting Started
1.  **Clone:** `git clone https://github.com/yourusername/dungeons-and-drum-machines.git`
2.  **Build Rust:** `cd rust_core && cargo build`
3.  **Open:** Import `project.godot` into Godot 4.3+.

## 📂 Documentation
* [**Game Specifications**](./docs/SPECIFICATIONS.md) - Mechanics, Economy, and Stats.
* [**Architecture**](./docs/ARCHITECTURE.md) - Code structure, Rust bindings, and Systems.
* [**World Bible**](./docs/LORE.md) - The Virus, The Factions, and The Silence.