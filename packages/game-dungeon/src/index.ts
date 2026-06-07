import {
  createSquareCoord,
  type CellCoord,
  type SquareCoord,
  type SquareDistanceMetric,
  type SquareNeighborMode,
} from "@aedventure/game-topology"
import type {
  GameCellLink,
  GameCellLinkKind,
  GameCellPlacement,
  GameEntityCollisionFootprint,
  GameEntityFootprint,
  GameEntityInteractionRadius,
  GameEntity,
  GameInteraction,
  GameLayer,
  GameMap,
  GameMetadata,
  GamePrimitiveValue,
  GameZone,
} from "@aedventure/game-world"

export const GAME_DUNGEON_PACKAGE = "@aedventure/game-dungeon"

export const DUNGEON_DEFAULT_CELL_SIZE = 34
// Terrain names the Phaser renderer already styles with dungeon motifs.
export const DUNGEON_FLOOR_TERRAIN = "dungeon_floor"
export const DUNGEON_WALL_TERRAIN = "dungeon_wall"
const DEFAULT_FLOOR_TOKEN = "dungeon.floor"
const DEFAULT_WALL_TOKEN = "dungeon.wall"

export type DungeonCellKind = "wall" | "floor"

/** A landmark/entity placed on a glyph's cell. */
export interface DungeonEntitySpec {
  readonly idSuffix: string
  readonly label: string
  readonly kind?: string
  readonly visualFootprint?: GameEntityFootprint
  readonly collisionFootprint?: GameEntityCollisionFootprint
  readonly interactionRadius?: GameEntityInteractionRadius
  readonly renderScale?: number
  readonly sourceId?: string
  readonly tags?: readonly string[]
  readonly metadata?: GameMetadata
}

/** An outgoing cell link (e.g. an exit back to the overworld). */
export interface DungeonLinkSpec {
  readonly idSuffix: string
  readonly kind?: GameCellLinkKind
  readonly targetMapId: string
  readonly label?: string
  readonly targetCoord?: CellCoord
  readonly enabled?: boolean
  readonly metadata?: GameMetadata
}

/** What a single legend glyph means. */
export interface DungeonCellSpec {
  readonly kind: DungeonCellKind
  readonly feature?: string
  readonly entrance?: boolean
  readonly tokenId?: string
  readonly terrain?: string
  readonly state?: string
  readonly entity?: DungeonEntitySpec
  readonly link?: DungeonLinkSpec
  readonly metadata?: GameMetadata
}

export interface DungeonRoomSpec {
  readonly id: string
  readonly label?: string
  readonly kind?: string
  /** Glyphs in the grid whose cells belong to this room. */
  readonly chars?: string
  readonly rect?: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }
  readonly cells?: readonly SquareCoord[]
  readonly interactionIds?: readonly string[]
  readonly metadata?: GameMetadata
}

/**
 * A reusable, app-agnostic dungeon definition. Author a dungeon as an ASCII
 * `grid` plus a `legend` mapping each glyph to a cell spec, then compile it to a
 * neutral `GameMap` with `compileDungeon`.
 */
export interface DungeonBlueprint {
  readonly id: string
  readonly label?: string
  readonly grid: readonly string[]
  readonly legend: Readonly<Record<string, DungeonCellSpec>>
  readonly cellSize?: number
  readonly neighborMode?: SquareNeighborMode
  readonly distanceMetric?: SquareDistanceMetric
  /**
   * Direction the viewer faces on entering at the entrance (e.g. "up"). Stored
   * on the compiled map's metadata and used to orient the Hero on arrival.
   */
  readonly entryFacing?: string
  readonly rooms?: readonly DungeonRoomSpec[]
  readonly interactions?: readonly GameInteraction[]
  readonly metadata?: GameMetadata
}

export interface DungeonBlueprintValidation {
  readonly valid: boolean
  readonly errors: readonly string[]
}

interface DungeonDimensions {
  readonly width: number
  readonly height: number
}

function dimensions(grid: readonly string[]): DungeonDimensions {
  return { width: grid[0]?.length ?? 0, height: grid.length }
}

function mergeMetadata(
  ...parts: ReadonlyArray<GameMetadata | undefined>
): GameMetadata | undefined {
  const merged: Record<string, GamePrimitiveValue> = {}
  let hasEntry = false
  for (const part of parts) {
    if (!part) continue
    for (const [key, value] of Object.entries(part)) {
      if (value === undefined) continue
      merged[key] = value
      hasEntry = true
    }
  }
  return hasEntry ? merged : undefined
}

/** Validate a blueprint's structural integrity before compiling. */
export function validateDungeonBlueprint(
  blueprint: DungeonBlueprint,
): DungeonBlueprintValidation {
  const errors: string[] = []

  if (blueprint.id.trim() === "") errors.push("Blueprint id must not be empty.")
  if (blueprint.grid.length === 0) errors.push("Blueprint grid must have at least one row.")

  const width = blueprint.grid[0]?.length ?? 0
  if (blueprint.grid.length > 0 && width === 0) {
    errors.push("Blueprint grid rows must not be empty.")
  }
  blueprint.grid.forEach((row, y) => {
    if (row.length !== width) {
      errors.push(`Grid row ${y} has width ${row.length}, expected ${width}.`)
    }
  })

  let entranceCount = 0
  blueprint.grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const glyph = row[x]
      const spec = blueprint.legend[glyph]
      if (!spec) {
        errors.push(`Unknown glyph "${glyph}" at (${x},${y}) is missing from the legend.`)
        continue
      }
      if (spec.entrance) {
        entranceCount += 1
        if (spec.kind === "wall") {
          errors.push(`Entrance glyph "${glyph}" at (${x},${y}) must be a floor cell.`)
        }
      }
      if (spec.entity && spec.entity.idSuffix.trim() === "") {
        errors.push(`Entity at (${x},${y}) has an empty idSuffix.`)
      }
      if (spec.link && spec.link.idSuffix.trim() === "") {
        errors.push(`Link at (${x},${y}) has an empty idSuffix.`)
      }
      if (spec.link && spec.link.targetMapId.trim() === "") {
        errors.push(`Link at (${x},${y}) has an empty targetMapId.`)
      }
    }
  })
  if (entranceCount === 0) {
    errors.push("Blueprint must mark at least one entrance cell.")
  }

  return { valid: errors.length === 0, errors }
}

/** The first entrance cell, useful for an overworld link's targetCoord. */
export function dungeonEntranceCoord(blueprint: DungeonBlueprint): SquareCoord | null {
  for (let y = 0; y < blueprint.grid.length; y += 1) {
    const row = blueprint.grid[y]
    for (let x = 0; x < row.length; x += 1) {
      if (blueprint.legend[row[x]]?.entrance) return createSquareCoord(x, y)
    }
  }
  return null
}

/** Compile a blueprint into a neutral GameMap. Assumes a valid blueprint. */
export function compileDungeon(blueprint: DungeonBlueprint): GameMap {
  const { width, height } = dimensions(blueprint.grid)
  const cells: GameCellPlacement[] = []
  const entities: GameEntity[] = []
  let entrance: SquareCoord | null = null

  for (let y = 0; y < blueprint.grid.length; y += 1) {
    const row = blueprint.grid[y]
    for (let x = 0; x < row.length; x += 1) {
      const glyph = row[x]
      const spec = blueprint.legend[glyph]
      if (!spec) {
        throw new Error(
          `compileDungeon: unknown glyph "${glyph}" at (${x},${y}) in ${blueprint.id}.`,
        )
      }
      const coord = createSquareCoord(x, y)
      const blocked = spec.kind === "wall"
      const terrain = spec.terrain ?? (blocked ? DUNGEON_WALL_TERRAIN : DUNGEON_FLOOR_TERRAIN)
      const state = spec.state ?? (blocked ? "blocked" : "stabilized")

      const links = spec.link ? [compileLink(blueprint.id, spec.link, x, y)] : undefined
      cells.push({
        coord,
        tokenId: spec.tokenId ?? (blocked ? DEFAULT_WALL_TOKEN : DEFAULT_FLOOR_TOKEN),
        blocked,
        links,
        metadata: mergeMetadata(
          { terrain, state, feature: spec.feature ?? "none" },
          spec.metadata,
        ),
      })

      if (spec.entrance && !entrance) entrance = coord

      if (spec.entity) {
        entities.push(compileEntity(blueprint.id, spec.entity, coord, spec.feature))
      } else if (spec.entrance) {
        entities.push(
          compileEntity(
            blueprint.id,
            { idSuffix: "entrance", label: "Entrance", sourceId: "entrance" },
            coord,
            spec.feature,
          ),
        )
      }
    }
  }

  // The Hero spawns at the entrance (initialCharacterCoord prefers a hero entity).
  // Not drawn as a landmark — it only marks the spawn cell and entry facing.
  if (entrance) {
    entities.push({
      id: `${blueprint.id}.entity.hero-spawn`,
      kind: "hero",
      label: "Hero",
      coord: entrance,
      metadata: blueprint.entryFacing ? { entryFacing: blueprint.entryFacing } : undefined,
    })
  }

  const layers: GameLayer[] = [
    {
      id: `${blueprint.id}.terrain`,
      kind: "terrain",
      label: `${blueprint.label ?? blueprint.id} terrain`,
      cells,
    },
    {
      id: `${blueprint.id}.collision`,
      kind: "collision",
      label: `${blueprint.label ?? blueprint.id} blockers`,
      visible: false,
      cells: cells.filter((cell) => cell.blocked),
    },
  ]

  const zones = (blueprint.rooms ?? []).map((room) => compileRoom(blueprint, room))

  return {
    id: blueprint.id,
    label: blueprint.label,
    topology: {
      kind: "square",
      cellSize: blueprint.cellSize ?? DUNGEON_DEFAULT_CELL_SIZE,
      bounds: { width, height },
      neighborMode: blueprint.neighborMode ?? "cardinal",
      distanceMetric: blueprint.distanceMetric ?? "manhattan",
    },
    layers,
    entities,
    zones,
    interactions: blueprint.interactions ?? [],
    metadata: mergeMetadata(
      {
        source: GAME_DUNGEON_PACKAGE,
        topology: "square",
        ...(entrance ? { entranceX: entrance.x, entranceY: entrance.y } : {}),
        ...(blueprint.entryFacing ? { entryFacing: blueprint.entryFacing } : {}),
      },
      blueprint.metadata,
    ),
  }
}

function compileLink(
  blueprintId: string,
  link: DungeonLinkSpec,
  x: number,
  y: number,
): GameCellLink {
  return {
    id: `${blueprintId}.link.${link.idSuffix}.${x}.${y}`,
    kind: link.kind ?? "map",
    targetMapId: link.targetMapId,
    label: link.label,
    targetCoord: link.targetCoord,
    enabled: link.enabled ?? true,
    metadata: link.metadata,
  }
}

function compileEntity(
  blueprintId: string,
  entity: DungeonEntitySpec,
  coord: SquareCoord,
  feature: string | undefined,
): GameEntity {
  return {
    // Coord-suffixed so the same legend glyph can place several entities.
    id: `${blueprintId}.entity.${entity.idSuffix}.${coord.x}.${coord.y}`,
    kind: entity.kind ?? "landmark",
    label: entity.label,
    coord,
    ...(entity.visualFootprint ? { visualFootprint: entity.visualFootprint } : {}),
    ...(entity.collisionFootprint ? { collisionFootprint: entity.collisionFootprint } : {}),
    ...(entity.interactionRadius ? { interactionRadius: entity.interactionRadius } : {}),
    ...(entity.renderScale !== undefined ? { renderScale: entity.renderScale } : {}),
    tags: entity.tags ?? ["dungeon"],
    metadata: mergeMetadata(
      { sourceId: entity.sourceId ?? entity.idSuffix, feature: feature ?? "none" },
      entity.metadata,
    ),
  }
}

function compileRoom(blueprint: DungeonBlueprint, room: DungeonRoomSpec): GameZone {
  return {
    id: room.id,
    kind: room.kind ?? "room",
    label: room.label,
    cells: roomCells(blueprint, room),
    interactionIds: room.interactionIds,
    metadata: mergeMetadata({ source: GAME_DUNGEON_PACKAGE }, room.metadata),
  }
}

function roomCells(
  blueprint: DungeonBlueprint,
  room: DungeonRoomSpec,
): readonly SquareCoord[] {
  if (room.cells && room.cells.length > 0) return room.cells

  if (room.rect) {
    const cells: SquareCoord[] = []
    for (let y = room.rect.y; y < room.rect.y + room.rect.height; y += 1) {
      for (let x = room.rect.x; x < room.rect.x + room.rect.width; x += 1) {
        cells.push(createSquareCoord(x, y))
      }
    }
    return cells
  }

  if (room.chars) {
    const wanted = new Set(room.chars.split(""))
    const cells: SquareCoord[] = []
    blueprint.grid.forEach((gridRow, y) => {
      for (let x = 0; x < gridRow.length; x += 1) {
        if (wanted.has(gridRow[x])) cells.push(createSquareCoord(x, y))
      }
    })
    return cells
  }

  return []
}
