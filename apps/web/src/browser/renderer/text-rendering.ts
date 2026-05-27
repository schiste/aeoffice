import Phaser from "phaser"

export const WORLD_TEXT_RESOLUTION = 4
export const WORLD_TEXT_TEXTURE_FILTER = "linear" as const
export const WORLD_TEXT_POLICY = "antialiased_text_pixel_art_world" as const
export const WORLD_TEXT_OBJECT_CLASSES = [
  "avatar_labels",
  "emote_text",
  "zone_labels",
  "action_markers",
  "debug_overlays",
] as const

export function applyCrispWorldText<T extends Phaser.GameObjects.Text>(
  text: T,
): T {
  text.setResolution(WORLD_TEXT_RESOLUTION)
  text.texture.setFilter(Phaser.Textures.FilterMode.LINEAR)
  return text
}
