import Phaser from "phaser"
import type { CellCoord } from "@aedventure/game-topology"

export function setCrispText(text: Phaser.GameObjects.Text): void {
  const deviceScale = typeof window === "undefined" ? 2 : Math.min(3, Math.max(2, window.devicePixelRatio || 2))
  const target = text as Phaser.GameObjects.Text & {
    setResolution?: (resolution: number) => Phaser.GameObjects.Text
  }
  target.setResolution?.(deviceScale)
}

export function hashCoord(coord: CellCoord): number {
  const first = coord.kind === "hex" ? coord.q : coord.x
  const second = coord.kind === "hex" ? coord.r : coord.y
  const value = Math.imul(first + 97, 73856093) ^ Math.imul(second - 31, 19349663)
  return Math.abs(value)
}
