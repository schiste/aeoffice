import {
  createSquareCoord,
  type SquareCoord,
} from "@aedventure/game-topology"
import type {
  GameCellPlacement,
  GameEntity,
  GameInteraction,
  GameMap,
  GameWorld,
  GameZone,
} from "@aedventure/game-world"

import type { CatalogSnapshot, SimulationSnapshot } from "../runtime/protocol"
import { addSnapshotToGameWorld } from "./snapshot-to-world"
import {
  addDungeonByMapId,
  SURVIVOR_CAVE_DUNGEON_MAP_ID,
} from "../dungeons/registry"
import {
  studioDungeonMap,
  STUDIO_DUNGEON_MAP_ID,
} from "../dungeons/studio"

export type AddMapMode = "overworld_hex" | "dungeon_square" | "base_square"

export const ADD_BASE_SQUARE_MAP_ID = "add.rpg.square-base-fixture"

export interface AddMapModeOption {
  readonly id: AddMapMode
  readonly label: string
  readonly topology: "hex" | "square"
  readonly fixture: boolean
}

export const ADD_MAP_MODE_OPTIONS: readonly AddMapModeOption[] = [
  { id: "overworld_hex", label: "Overworld", topology: "hex", fixture: false },
  { id: "dungeon_square", label: "Dungeon", topology: "square", fixture: true },
  { id: "base_square", label: "Base", topology: "square", fixture: true },
]

export interface CreateAddWorldOptions {
  /** Which dungeon map to load in dungeon_square mode. Defaults to the Studio. */
  readonly dungeonMapId?: string
}

export function createAddWorldForMapMode(
  mode: AddMapMode,
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
  options: CreateAddWorldOptions = {},
): GameWorld {
  if (mode === "overworld_hex") {
    return addSnapshotToGameWorld(snapshot, catalog, {
      worldId: "add.rpg.live-world",
      mapId: "add.rpg.hex-overworld",
      hexRadius: 26,
    })
  }

  const map =
    mode === "dungeon_square"
      ? dungeonMapForId(options.dungeonMapId ?? STUDIO_DUNGEON_MAP_ID, snapshot)
      : baseSquareMap()
  return {
    id: "add.rpg.live-world",
    activeMapId: map.id,
    maps: [map],
    metadata: {
      source: "add-square-fixture",
      mapMode: mode,
      runtimeAuthority: "rust-wasm",
      projectionOnly: true,
      fixture: true,
    },
  }
}

export function addMapModeLabel(mode: AddMapMode): string {
  return ADD_MAP_MODE_OPTIONS.find((option) => option.id === mode)?.label ?? mode
}

function dungeonMapForId(mapId: string, snapshot: SimulationSnapshot): GameMap {
  const registered = addDungeonByMapId(mapId)
  if (mapId === SURVIVOR_CAVE_DUNGEON_MAP_ID || registered?.mapId === SURVIVOR_CAVE_DUNGEON_MAP_ID) {
    return survivorCaveDungeonMap()
  }

  // The Studio is the canonical first dungeon; it reflects the restore state.
  // Unknown dungeon ids intentionally fall back to the Studio until their
  // blueprint is registered.
  const studio = studioDungeonMap(snapshot.base.studioRestored)
  return {
    ...studio,
    metadata: {
      ...studio.metadata,
      mapMode: "dungeon_square",
      fixture: true,
      gameplayReady: false,
    },
  }
}

function survivorCaveDungeonMap(): GameMap {
  const width = 14
  const height = 10
  const cells = squareCells(width, height, (coord) => {
    const wall =
      coord.x === 0 ||
      coord.y === 0 ||
      coord.x === width - 1 ||
      coord.y === height - 1 ||
      (coord.x === 6 && coord.y > 1 && coord.y < 7) ||
      (coord.y === 5 && coord.x > 2 && coord.x < 11)
    const doorway = (coord.x === 6 && coord.y === 4) || (coord.x === 9 && coord.y === 5)
    const blocked = wall && !doorway
    return {
      tokenId: blocked ? "add.fixture.dungeon.wall" : "add.fixture.dungeon.floor",
      blocked,
      metadata: {
        terrain: blocked ? "dungeon_wall" : "dungeon_floor",
        state: blocked ? "blocked" : "stabilized",
        feature:
          coord.x === 2 && coord.y === 4
            ? "dungeon_entrance"
            : coord.x === 11 && coord.y === 7
              ? "relic_door"
              : "none",
      },
    }
  })

  return squareMap({
    id: SURVIVOR_CAVE_DUNGEON_MAP_ID,
    label: "Survivor Cave",
    mode: "dungeon_square",
    width,
    height,
    cells,
    entities: [
      hero("add.entity.dungeon.hero-entry", "Hero", createSquareCoord(2, 4)),
      landmark(
        "add.entity.dungeon.entry",
        "Survivor Cave Mouth",
        createSquareCoord(2, 4),
        "survivor_cave_mouth",
      ),
      landmark("add.entity.dungeon.relic-door", "Relic Door", createSquareCoord(11, 7), "relic_door"),
      landmark("add.entity.dungeon.echo-crystal", "Echo Crystal", createSquareCoord(8, 3), "echo_crystal"),
    ],
    zones: [
      zone("add.zone.dungeon.entrance", "Dungeon Entry", [
        createSquareCoord(1, 3),
        createSquareCoord(2, 3),
        createSquareCoord(1, 4),
        createSquareCoord(2, 4),
      ]),
      zone("add.zone.dungeon.future-combat", "Future Encounter", [
        createSquareCoord(9, 6),
        createSquareCoord(10, 6),
        createSquareCoord(9, 7),
        createSquareCoord(10, 7),
      ]),
    ],
    gameplayReady: true,
  })
}

function baseSquareMap(): GameMap {
  const width = 12
  const height = 8
  const cells = squareCells(width, height, (coord) => {
    const wall = coord.x === 0 || coord.y === 0 || coord.x === width - 1 || coord.y === height - 1
    const blocked = wall && !(coord.x === 5 && coord.y === height - 1)
    const feature =
      coord.x === 5 && coord.y === 4
        ? "base_core"
        : coord.x === 8 && coord.y === 3
          ? "workbench"
          : "none"
    return {
      tokenId: blocked ? "add.fixture.base.wall" : "add.fixture.base.floor",
      blocked,
      metadata: {
        terrain: blocked ? "base_wall" : "base_floor",
        state: blocked ? "blocked" : "stabilized",
        feature,
      },
    }
  })

  return squareMap({
    id: ADD_BASE_SQUARE_MAP_ID,
    label: "Base Square Fixture",
    mode: "base_square",
    width,
    height,
    cells,
    entities: [
      landmark("add.entity.base.core", "Base Core", createSquareCoord(5, 4), "base_core"),
      landmark("add.entity.base.workbench", "Workbench", createSquareCoord(8, 3), "workbench"),
      landmark("add.entity.base.exit", "Overworld Exit", createSquareCoord(5, 6), "base_exit"),
    ],
    zones: [
      zone("add.zone.base.core", "Core Room", [
        createSquareCoord(4, 3),
        createSquareCoord(5, 3),
        createSquareCoord(6, 3),
        createSquareCoord(4, 4),
        createSquareCoord(5, 4),
        createSquareCoord(6, 4),
      ]),
      zone("add.zone.base.workshop", "Workshop", [
        createSquareCoord(8, 2),
        createSquareCoord(9, 2),
        createSquareCoord(8, 3),
        createSquareCoord(9, 3),
      ]),
    ],
  })
}

function squareMap(input: {
  readonly id: string
  readonly label: string
  readonly mode: AddMapMode
  readonly width: number
  readonly height: number
  readonly cells: readonly GameCellPlacement[]
  readonly entities: readonly GameEntity[]
  readonly zones: readonly GameZone[]
  readonly gameplayReady?: boolean
}): GameMap {
  const gameplayReady = input.gameplayReady ?? false
  const interactions: readonly GameInteraction[] = [
    {
      id: `add.interaction.${input.mode}.fixture-preview`,
      kind: "fixture_action",
      action: `add.fixture.${input.mode}.preview`,
      target: { kind: "map", id: input.id },
      label: gameplayReady ? "Dungeon objective" : "Preview only",
      enabled: gameplayReady,
      metadata: {
        source: "add-square-fixture",
        gameplayReady,
      },
    },
  ]

  return {
    id: input.id,
    label: input.label,
    topology: {
      kind: "square",
      cellSize: 34,
      bounds: { width: input.width, height: input.height },
      neighborMode: "cardinal",
      distanceMetric: "manhattan",
    },
    layers: [
      {
        id: `${input.id}.terrain`,
        kind: "terrain",
        label: "Square fixture terrain",
        cells: input.cells,
      },
      {
        id: `${input.id}.collision`,
        kind: "collision",
        label: "Square fixture blockers",
        visible: false,
        cells: input.cells.filter((cell) => cell.blocked),
      },
    ],
    entities: input.entities,
    zones: input.zones,
    interactions,
    metadata: {
      source: "add-square-fixture",
      mapMode: input.mode,
      fixture: true,
      gameplayReady,
    },
  }
}

function squareCells(
  width: number,
  height: number,
  describe: (coord: SquareCoord) => Omit<GameCellPlacement, "coord">,
): readonly GameCellPlacement[] {
  const cells: GameCellPlacement[] = []
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const coord = createSquareCoord(x, y)
      cells.push({ coord, ...describe(coord) })
    }
  }
  return cells
}

function landmark(
  id: string,
  label: string,
  coord: SquareCoord,
  sourceId: string,
): GameEntity {
  return {
    id,
    kind: "landmark",
    label,
    coord,
    tags: ["add", "fixture", "square"],
    metadata: { sourceId },
  }
}

function hero(id: string, label: string, coord: SquareCoord): GameEntity {
  return {
    id,
    kind: "hero",
    label,
    coord,
    tags: ["add", "playable", "square"],
    metadata: { sourceId: "dungeon_entry" },
  }
}

function zone(id: string, label: string, cells: readonly SquareCoord[]): GameZone {
  return {
    id,
    kind: "fixture_zone",
    label,
    cells,
    metadata: {
      source: "add-square-fixture",
      gameplayReady: false,
    },
  }
}
