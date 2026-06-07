import {
  createSquareCoord,
  createSquareTopology,
  serializeCellCoord,
  type SquareCoord,
} from "@aedventure/game-topology"
import {
  createVisibilityMap,
  getVisibilityState,
  markVisibleAsStale,
  revealFieldOfView,
  type VisibilityMap,
} from "@aedventure/game-visibility"
import type { GameCellPlacement, GameMap, GameMetadata } from "@aedventure/game-world"

// Dungeon FOV tunables: a forward cone limited by walls, with remembered memory.
// The immediate front/left/right squares (the cone's near base) are always lit.
export const DUNGEON_FOV_RADIUS = 7
export const DUNGEON_FOV_CONE_HALF_ANGLE_DEG = 45
export const DUNGEON_FOV_PERIPHERAL_RADIUS = 1

const FACING_DELTAS: Readonly<Record<string, { readonly x: number; readonly y: number }>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  north_east: { x: 1, y: -1 },
  north_west: { x: -1, y: -1 },
  south_east: { x: 1, y: 1 },
  south_west: { x: -1, y: 1 },
}

export interface DungeonFieldOfViewResult {
  readonly map: GameMap
  readonly visibility: VisibilityMap
}

export function emptyDungeonVisibility(): VisibilityMap {
  return createVisibilityMap()
}

/**
 * Compute the Hero's wall-occluded directional cone FOV over a square dungeon map
 * and return the map with per-cell `visibilityState` metadata (which the existing
 * fog renderer consumes), plus the updated visibility map (remembered memory).
 * No-op for non-square maps or when the Hero coord is unknown.
 */
export function applyDungeonFieldOfView(
  map: GameMap,
  heroCell: string | null,
  facing: string | null,
  priorVisibility: VisibilityMap,
): DungeonFieldOfViewResult {
  const origin = parseSquareCoord(heroCell)
  if (map.topology.kind !== "square" || !origin) {
    return { map, visibility: priorVisibility }
  }

  const topology = createSquareTopology({
    cellSize: map.topology.cellSize,
    origin: map.topology.origin,
    bounds: map.topology.bounds,
    neighborMode: map.topology.neighborMode,
    distanceMetric: map.topology.distanceMetric,
  })

  const opaque = blockedCellKeys(map)
  const facingDelta = facing ? FACING_DELTAS[facing] : undefined
  const facingToward = facingDelta
    ? createSquareCoord(origin.x + facingDelta.x, origin.y + facingDelta.y)
    : undefined

  const visibility = revealFieldOfView(
    markVisibleAsStale(priorVisibility),
    topology,
    {
      origin,
      radius: DUNGEON_FOV_RADIUS,
      isOpaque: (coord) => opaque.has(serializeCellCoord(coord)),
      facingToward,
      coneHalfAngleDeg: facingToward ? DUNGEON_FOV_CONE_HALF_ANGLE_DEG : undefined,
      peripheralRadius: facingToward ? DUNGEON_FOV_PERIPHERAL_RADIUS : 0,
    },
    "visible",
  )

  return { map: withVisibilityState(map, visibility), visibility }
}

function blockedCellKeys(map: GameMap): ReadonlySet<string> {
  const blocked = new Set<string>()
  for (const layer of map.layers) {
    for (const cell of layer.cells ?? []) {
      if (cell.blocked) blocked.add(serializeCellCoord(cell.coord))
    }
  }
  return blocked
}

function withVisibilityState(map: GameMap, visibility: VisibilityMap): GameMap {
  return {
    ...map,
    layers: map.layers.map((layer) =>
      layer.cells
        ? {
            ...layer,
            cells: layer.cells.map((cell) => withCellVisibilityState(cell, visibility)),
          }
        : layer,
    ),
  }
}

function withCellVisibilityState(
  cell: GameCellPlacement,
  visibility: VisibilityMap,
): GameCellPlacement {
  const metadata: GameMetadata = {
    ...(cell.metadata ?? {}),
    visibilityState: getVisibilityState(visibility, cell.coord),
  }
  return { ...cell, metadata }
}

function parseSquareCoord(cell: string | null): SquareCoord | null {
  if (!cell) return null
  const match = /(-?\d+)[^\d-]+(-?\d+)/.exec(cell)
  return match ? createSquareCoord(Number(match[1]), Number(match[2])) : null
}
