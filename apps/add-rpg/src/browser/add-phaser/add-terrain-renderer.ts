import Phaser from "phaser"
import { hexCellPolygonPoints } from "@aedventure/game-renderer-phaser"
import type { Vector2 } from "@aedventure/game-topology"

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
