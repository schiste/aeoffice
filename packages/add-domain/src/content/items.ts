import type { Item } from "@aedventure/game-content"

// Authored content: inventory/loot items. Greenfield catalog (no sim mechanic
// yet) authored against the neutral Item schema, ready to wire into inventory.
export const ITEMS: readonly Item[] = [
  { id: "item.scrap_metal", label: "Scrap Metal", stackable: true, maxStack: 99, tags: ["material", "salvage"] },
  { id: "item.ration", label: "Ration", stackable: true, maxStack: 20, tags: ["consumable", "food"] },
  { id: "item.echo_shard", label: "Echo Shard", stackable: true, maxStack: 50, tags: ["crystal", "crafting"] },
  { id: "item.field_kit", label: "Field Kit", stackable: false, tags: ["tool"] },
]

export function itemById(id: string): Item | undefined {
  return ITEMS.find((item) => item.id === id)
}
