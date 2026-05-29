import Phaser from "phaser"
import type {
  GridTopology,
  HexCoord,
  Vector2 as TopologyVector2,
} from "@aedventure/game-topology"
import type { GameCellPlacement, GameMap } from "@aedventure/game-world"
import { hexCellCenter, hexCellPolygonPoints } from "./hex-geometry"

export interface HexCellRenderOptions {
  readonly origin?: TopologyVector2
  readonly radius?: number
  readonly depth?: number
  readonly palette?: HexCellPalette
}

export interface HexCellPalette {
  readonly defaultFill: number
  readonly alternateFill: number
  readonly stroke: number
  readonly blockedFill: number
  readonly alpha: number
}

export interface HexCellRenderInfo {
  readonly source: "hex_cell_renderer"
  readonly topology: "hex"
  readonly layerCount: number
  readonly cellCount: number
  readonly blockedCellCount: number
  readonly radius: number
  readonly depth: number
}

const DEFAULT_HEX_RADIUS = 28
const DEFAULT_HEX_CELL_DEPTH = 0
const DEFAULT_HEX_CELL_PALETTE: HexCellPalette = {
  defaultFill: 0xdde7d0,
  alternateFill: 0xeadfc5,
  stroke: 0xa9b1a2,
  blockedFill: 0x8b6748,
  alpha: 1,
}

export class HexCellRenderer {
  private graphics?: Phaser.GameObjects.Graphics
  private lastInfo: HexCellRenderInfo = emptyHexCellRenderInfo()

  constructor(private readonly scene: Phaser.Scene) {}

  render(
    map: GameMap,
    topology: GridTopology<HexCoord>,
    options: HexCellRenderOptions = {},
  ): HexCellRenderInfo {
    this.clear()
    const radius = options.radius ?? hexRadiusFromMap(map) ?? DEFAULT_HEX_RADIUS
    const origin = options.origin ?? { x: 0, y: 0 }
    const palette = options.palette ?? DEFAULT_HEX_CELL_PALETTE
    const depth = options.depth ?? DEFAULT_HEX_CELL_DEPTH
    const graphics = this.scene.add.graphics()
    graphics.setDepth(depth)
    this.graphics = graphics

    let cellCount = 0
    let blockedCellCount = 0
    for (const layer of map.layers) {
      for (const cell of layer.cells ?? []) {
        if (cell.coord.kind !== "hex") continue

        cellCount += 1
        if (cell.blocked) blockedCellCount += 1
        const center = hexCellCenter(cell.coord, topology, origin)
        const fill = cell.blocked ? palette.blockedFill : fillForCell(cell, palette)
        drawHexPath(graphics, center, radius)
        graphics.fillStyle(fill, palette.alpha)
        graphics.fillPath()
        drawHexPath(graphics, center, radius)
        graphics.lineStyle(1, palette.stroke, 0.88)
        graphics.strokePath()
      }
    }

    this.lastInfo = {
      source: "hex_cell_renderer",
      topology: "hex",
      layerCount: map.layers.length,
      cellCount,
      blockedCellCount,
      radius,
      depth,
    }
    return this.lastInfo
  }

  clear(): void {
    this.graphics?.destroy()
    this.graphics = undefined
    this.lastInfo = emptyHexCellRenderInfo()
  }

  getInfo(): HexCellRenderInfo {
    return this.lastInfo
  }
}

export { hexCellCenter, hexCellPolygonPoints } from "./hex-geometry"

export function drawHexPath(
  graphics: Phaser.GameObjects.Graphics,
  center: TopologyVector2,
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

export function emptyHexCellRenderInfo(): HexCellRenderInfo {
  return {
    source: "hex_cell_renderer",
    topology: "hex",
    layerCount: 0,
    cellCount: 0,
    blockedCellCount: 0,
    radius: DEFAULT_HEX_RADIUS,
    depth: DEFAULT_HEX_CELL_DEPTH,
  }
}

function fillForCell(cell: GameCellPlacement, palette: HexCellPalette): number {
  if (cell.tokenId?.includes("path")) return palette.alternateFill
  if (cell.tokenId?.includes("water")) return 0x9cc8d2
  if (cell.tokenId?.includes("stone")) return 0xc8c1b4
  return palette.defaultFill
}

function hexRadiusFromMap(map: GameMap): number | undefined {
  return map.topology.kind === "hex" ? map.topology.radius : undefined
}
