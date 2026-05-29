export interface Vector2 {
  readonly x: number
  readonly y: number
}

export interface SquareCoord {
  readonly kind: "square"
  readonly x: number
  readonly y: number
}

export interface HexCoord {
  readonly kind: "hex"
  readonly q: number
  readonly r: number
}

export type CellCoord = SquareCoord | HexCoord

export interface GridTopology<TCoord extends CellCoord> {
  readonly kind: TCoord["kind"]
  cellToWorld(coord: TCoord): Vector2
  worldToCell(point: Vector2): TCoord | null
  neighbors(coord: TCoord): readonly TCoord[]
  distance(a: TCoord, b: TCoord): number
}

export const GAME_TOPOLOGY_PACKAGE = "@aedventure/game-topology"
