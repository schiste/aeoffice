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

export * from "./runtime/client"
export * from "./runtime/protocol"
export * from "./adapters/catalog-selectors"
export * from "./adapters/command-mapping"
export * from "./adapters/snapshot-to-world"
export * from "./adapters/ui-selectors"
export * from "./adapters/world-time"
