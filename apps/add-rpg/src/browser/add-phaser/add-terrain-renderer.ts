import Phaser from "phaser"
import { hexCellPolygonPoints } from "@aedventure/game-renderer-phaser"
import type { Vector2 } from "@aedventure/game-topology"
import type { GameCellPlacement } from "@aedventure/game-world"
import { stateForCell, terrainForCell } from "@aedventure/add-domain"

import type { CellStyle } from "./types"

export function styleForCell(cell: GameCellPlacement): CellStyle {
  const terrain = terrainForCell(cell)
  const state = stateForCell(cell)
  if (terrain === "unknown") {
    return {
      fill: 0x74786e,
      stroke: 0x4d514a,
      alpha: 0.42,
      accent: 0xa5a88f,
      highlight: 0xc3c8a9,
      shadow: 0x1a1d17,
    }
  }
  if (state === "blocked") {
    if (terrain === "dungeon_wall") return { fill: 0x4b453d, stroke: 0x2f2a25, alpha: 0.96, accent: 0x9a7651, highlight: 0x6b5f50, shadow: 0x17130f }
    if (terrain === "base_wall") return { fill: 0x53605b, stroke: 0x33413d, alpha: 0.96, accent: 0x9bb7a4, highlight: 0x748177, shadow: 0x18211f }
    return { fill: 0x7b6048, stroke: 0x59412f, alpha: 0.94, accent: 0xb58a5c, highlight: 0xa18467, shadow: 0x25180f }
  }

  const fill =
    terrain === "river"
      ? 0x8eb8c5
      : terrain === "scrub"
        ? 0xc3b886
        : terrain === "ridge"
          ? 0xb8ad94
          : terrain === "mountain"
            ? 0x967d63
            : terrain === "dungeon_floor"
              ? 0xa89b85
              : terrain === "base_floor"
                ? 0xb9c3b4
                : 0xdedbbf
  const accent =
    terrain === "river"
      ? 0x5fb9d0
      : terrain === "scrub"
        ? 0xa58d4b
        : terrain === "ridge"
          ? 0x8c7660
          : terrain === "mountain"
            ? 0xded7c4
            : terrain === "dungeon_floor"
              ? 0xc8b889
              : terrain === "base_floor"
                ? 0x78b89a
                : 0x7cbf8c

  return {
    fill,
    stroke:
      terrain === "dungeon_floor"
        ? 0x6f6252
        : terrain === "base_floor"
          ? 0x748177
          : state === "inactive"
            ? 0x8a8c78
            : 0x5e715f,
    alpha: state === "inactive" ? 0.58 : 0.95,
    accent,
    highlight: 0xfff5d0,
    shadow: 0x1d2118,
  }
}

export function drawHexPath(
  graphics: Phaser.GameObjects.Graphics,
  center: Vector2,
  radius: number,
): void {
  const points = hexCellPolygonPoints(center, radius)
  graphics.beginPath()
  points.forEach((point, index) => {
    if (index === 0) {
      graphics.moveTo(point.x, point.y)
    } else {
      graphics.lineTo(point.x, point.y)
    }
  })
  graphics.closePath()
}
