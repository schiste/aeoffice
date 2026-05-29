import type { CellCoord } from "@aedventure/game-topology"

export type GameMapTopologyKind = CellCoord["kind"]

export interface GameWorld {
  readonly id: string
  readonly maps: readonly GameMap[]
}

export interface GameMap {
  readonly id: string
  readonly topology: GameMapTopologyKind
  readonly layers: readonly GameLayer[]
  readonly entities: readonly GameEntity[]
  readonly zones: readonly GameZone[]
}

export interface GameLayer {
  readonly id: string
  readonly kind: "terrain" | "objects" | "overlay"
}

export interface GameEntity {
  readonly id: string
  readonly kind: string
  readonly coord?: CellCoord
}

export interface GameZone {
  readonly id: string
  readonly kind: string
  readonly cells: readonly CellCoord[]
}

export const GAME_WORLD_PACKAGE = "@aedventure/game-world"
