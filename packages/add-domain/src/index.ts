import type { GameWorld } from "@aedventure/game-world"

export interface AddDomainBoundary {
  readonly source: "add-domain"
  readonly runtimeAuthority: "rust-wasm"
  readonly firstTargetApp: "apps/add-rpg"
}

export interface AddWorldProjection {
  readonly boundary: AddDomainBoundary
  readonly world: GameWorld
}

export const ADD_DOMAIN_BOUNDARY: AddDomainBoundary = {
  source: "add-domain",
  runtimeAuthority: "rust-wasm",
  firstTargetApp: "apps/add-rpg",
}
