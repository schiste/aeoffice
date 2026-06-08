import type { Perk } from "@aedventure/game-content"

// Authored content: hero perks/traits. Greenfield catalog (no sim mechanic yet)
// authored against the neutral Perk schema, ready to wire into hero progression.
// `requires` references other perk ids (validated against this catalog).
export const PERKS: readonly Perk[] = [
  { id: "perk.scavenger", label: "Scavenger", description: "Salvage yields more scrap from ruins.", tags: ["economy"] },
  { id: "perk.steady_hands", label: "Steady Hands", description: "Construction and repairs complete faster.", tags: ["construction"] },
  { id: "perk.crystal_attuned", label: "Crystal Attuned", description: "Crystal stations generate more while staffed.", requires: ["perk.steady_hands"], tags: ["crystal"] },
  { id: "perk.field_medic", label: "Field Medic", description: "The Hero recovers from exposure faster.", tags: ["survival"] },
]

export function perkById(id: string): Perk | undefined {
  return PERKS.find((perk) => perk.id === id)
}
