import {
  compileDungeon,
  dungeonEntranceCoord,
  type DungeonBlueprint,
  type DungeonCellSpec,
} from "@aedventure/game-dungeon"
import type { CellCoord } from "@aedventure/game-topology"
import type { GameMap } from "@aedventure/game-world"

// The Studio is the first concrete dungeon. Its layout is authored as a reusable
// blueprint (see @aedventure/game-dungeon) and compiled to a neutral GameMap.
// Two variants share the same footprint and entrance so the dungeon visibly
// reflects the `studio_restored` game state.

export const STUDIO_DUNGEON_ID = "dungeon.studio"
export const STUDIO_DUNGEON_MAP_ID = "add.rpg.dungeon.studio"
const OVERWORLD_MAP_ID = "add.rpg.hex-overworld"

const EXIT_LINK = {
  idSuffix: "overworld",
  kind: "map" as const,
  targetMapId: OVERWORLD_MAP_ID,
  label: "Back to the overworld",
  targetCoord: { kind: "hex" as const, q: 0, r: 0 },
}

const WALL: DungeonCellSpec = { kind: "wall" }
const FLOOR: DungeonCellSpec = { kind: "floor" }
const ENTRANCE: DungeonCellSpec = {
  kind: "floor",
  entrance: true,
  feature: "entrance",
  link: EXIT_LINK,
}

function ratCell(instanceId: string): DungeonCellSpec {
  return {
    kind: "floor",
    feature: "creature",
    entity: {
      idSuffix: "rat",
      instanceId,
      label: "Rat",
      kind: "creature",
      visualFootprint: { unit: "cell", width: 0.35, height: 0.35 },
      sourceId: "rat",
    },
  }
}

const RAT_A = ratCell("studio-rat-a")
const RAT_B = ratCell("studio-rat-b")
const RAT_C = ratCell("studio-rat-c")

const STUDIO_RESTORED_BLUEPRINT: DungeonBlueprint = {
  id: STUDIO_DUNGEON_MAP_ID,
  label: "The Studio",
  metadata: { theme: "studio", studioState: "restored" },
  entryFacing: "up",
  grid: [
    "############",
    "#..........#",
    "#.C......E.#",
    "#..........#",
    "#....ab....#",
    "#..........#",
    "#.B......d.#",
    "#..........#",
    "#####>######",
  ],
  legend: {
    "#": WALL,
    ".": FLOOR,
    ">": ENTRANCE,
    a: RAT_A,
    b: RAT_B,
    d: RAT_C,
    C: {
      kind: "floor",
      feature: "console",
      entity: { idSuffix: "mixing-console", label: "Mixing Console", sourceId: "mixing_console" },
    },
    E: {
      kind: "floor",
      feature: "crystal",
      entity: { idSuffix: "echo-crystal", label: "Echo Crystal", sourceId: "echo_crystal" },
    },
    B: {
      kind: "floor",
      feature: "bassline",
      entity: { idSuffix: "crystal-bassline", label: "Crystal Bassline", sourceId: "crystal_bassline" },
    },
  },
  rooms: [
    {
      id: `${STUDIO_DUNGEON_MAP_ID}.live-room`,
      label: "Live Room",
      kind: "room",
      rect: { x: 1, y: 1, width: 5, height: 6 },
    },
    {
      id: `${STUDIO_DUNGEON_MAP_ID}.control-booth`,
      label: "Control Booth",
      kind: "room",
      rect: { x: 6, y: 1, width: 5, height: 6 },
    },
  ],
}

const STUDIO_RUINED_BLUEPRINT: DungeonBlueprint = {
  id: STUDIO_DUNGEON_MAP_ID,
  label: "The Studio",
  metadata: { theme: "studio", studioState: "ruined" },
  entryFacing: "up",
  grid: [
    "############",
    "#..x.....x.#",
    "#.x...c....#",
    "#....xx....#",
    "#..x....x..#",
    "#....xx....#",
    "#.x.ab..x..#",
    "#..x.d...x.#",
    "#####>######",
  ],
  legend: {
    "#": WALL,
    ".": FLOOR,
    ">": ENTRANCE,
    a: RAT_A,
    b: RAT_B,
    d: RAT_C,
    x: {
      kind: "wall",
      feature: "rubble",
      tokenId: "add.fixture.dungeon.rubble",
    },
    c: {
      kind: "floor",
      feature: "rubble",
      entity: { idSuffix: "collapsed-console", label: "Collapsed Console", sourceId: "collapsed_console" },
    },
  },
  rooms: [
    {
      id: `${STUDIO_DUNGEON_MAP_ID}.rubble`,
      label: "Collapsed Floor",
      kind: "room",
      rect: { x: 1, y: 1, width: 10, height: 7 },
    },
  ],
}

export function studioDungeonBlueprint(restored: boolean): DungeonBlueprint {
  return restored ? STUDIO_RESTORED_BLUEPRINT : STUDIO_RUINED_BLUEPRINT
}

export function studioDungeonMap(restored: boolean): GameMap {
  return compileDungeon(studioDungeonBlueprint(restored))
}

export const STUDIO_DUNGEON_ENTRANCE: CellCoord =
  dungeonEntranceCoord(STUDIO_RESTORED_BLUEPRINT) ?? { kind: "square", x: 5, y: 8 }
