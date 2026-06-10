import type { GameMap } from "@aedventure/game-world"

import {
  STUDIO_DUNGEON_ENTRANCE,
  STUDIO_DUNGEON_ID,
  STUDIO_DUNGEON_MAP_ID,
} from "../dungeons/studio"
import { buildAreaMap, type AreaDefinition } from "./build-area-map"

export const STUDIO_GROUNDS_AREA_ID = "area.studio_grounds"
export const STUDIO_GROUNDS_AREA_MAP_ID = "add.rpg.area.studio-grounds"

// The Studio Grounds: the honeycomb around the dairy-farm Studio. The Hero spawns
// at the centre; one cell to the north is the Studio dungeon entrance.
const STUDIO_GROUNDS_DEFINITION: AreaDefinition = {
  id: STUDIO_GROUNDS_AREA_ID,
  mapId: STUDIO_GROUNDS_AREA_MAP_ID,
  label: "Studio Grounds",
  radius: 4,
  entryCoord: { q: 0, r: 0 },
  cells: [
    {
      q: 0,
      r: -3,
      feature: "dungeon",
      label: "The Studio",
      links: [
        {
          id: `${STUDIO_GROUNDS_AREA_ID}.link.${STUDIO_DUNGEON_ID}`,
          kind: "dungeon",
          targetMapId: STUDIO_DUNGEON_MAP_ID,
          targetCoord: STUDIO_DUNGEON_ENTRANCE,
          label: "The Studio",
          enabled: true,
        },
      ],
    },
  ],
}

export function studioGroundsAreaMap(): GameMap {
  return buildAreaMap(STUDIO_GROUNDS_DEFINITION)
}
