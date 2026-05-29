# In-Game Content

> **Player-facing content.** Everything in this folder may be seen by players during gameplay.

This folder contains source files for content that appears in the game itself — dialog, quests, item descriptions, tutorials, etc.

**Important:** Do not include spoilers for hidden lore (the conspiracy, The Unplugged connection, etc.) unless the content is specifically gated behind late-game discoveries.

---

## Folder Structure

| Folder | Purpose |
|--------|---------|
| `dialog/` | NPC conversations, barks, ambient text |
| `quests/` | Quest definitions, objectives, rewards |
| `items/` | Item names, descriptions, flavor text |
| `encounters/` | Enemy introductions, combat dialogue, event text |
| `tutorials/` | Onboarding text, tooltips, help entries |
| `achievements/` | Unlock names, descriptions, celebration text |
| `notifications/` | System messages, alerts, warnings |
| `codex/` | In-game encyclopedia (player-discoverable lore) |

---

## Guidelines

1. **Tone:** Dark humor, pragmatic survival, occasional hope. Avoid grimdark despair.
2. **Length:** Keep individual entries concise. Players are tapping through on mobile.
3. **Mystery:** Imply more than you explain. Reference the past obliquely.
4. **Consistency:** Use terms from `/lore/thesaurus.md` — but only the player-facing ones.

---

## Cross-Reference

- World-building & internal canon: `/lore/`
- Terminology definitions: `/lore/thesaurus.md`
- Naming rules: `/lore/naming_conventions.md`
- Writing style: `/lore/tone_guide.md`
- Game mechanics: `/mechanics/specifications.md`
