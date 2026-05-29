import Phaser from "phaser"
import type {
  GridTopology,
  HexCoord,
  Vector2 as TopologyVector2,
} from "@aedventure/game-topology"
import type { GameMap, GameZone } from "@aedventure/game-world"
import { drawHexPath, hexCellCenter } from "./hex-cell-renderer"

export interface HexZoneRenderOptions {
  readonly origin?: TopologyVector2
  readonly radius?: number
  readonly depth?: number
  readonly fillColor?: number
  readonly strokeColor?: number
}

export interface HexZoneRenderInfo {
  readonly source: "hex_zone_renderer"
  readonly topology: "hex"
  readonly zoneCount: number
  readonly zoneCellCount: number
  readonly depth: number
}

const DEFAULT_HEX_ZONE_DEPTH = 20

export class HexZoneRenderer {
  private graphics?: Phaser.GameObjects.Graphics
  private lastInfo: HexZoneRenderInfo = emptyHexZoneRenderInfo()

  constructor(private readonly scene: Phaser.Scene) {}

  render(
    map: GameMap,
    topology: GridTopology<HexCoord>,
    options: HexZoneRenderOptions = {},
  ): HexZoneRenderInfo {
    this.clear()
    const graphics = this.scene.add.graphics()
    const radius = options.radius ?? (map.topology.kind === "hex" ? map.topology.radius : 28)
    const origin = options.origin ?? { x: 0, y: 0 }
    const depth = options.depth ?? DEFAULT_HEX_ZONE_DEPTH
    graphics.setDepth(depth)
    this.graphics = graphics

    let zoneCellCount = 0
    for (const zone of map.zones) {
      zoneCellCount += this.drawZone(zone, topology, {
        ...options,
        origin,
        radius,
      })
    }

    this.lastInfo = {
      source: "hex_zone_renderer",
      topology: "hex",
      zoneCount: map.zones.length,
      zoneCellCount,
      depth,
    }
    return this.lastInfo
  }

  clear(): void {
    this.graphics?.destroy()
    this.graphics = undefined
    this.lastInfo = emptyHexZoneRenderInfo()
  }

  getInfo(): HexZoneRenderInfo {
    return this.lastInfo
  }

  private drawZone(
    zone: GameZone,
    topology: GridTopology<HexCoord>,
    options: Required<Pick<HexZoneRenderOptions, "origin" | "radius">> &
      HexZoneRenderOptions,
  ): number {
    const graphics = this.graphics
    if (!graphics) return 0

    let cellCount = 0
    for (const coord of zone.cells) {
      if (coord.kind !== "hex") continue
      cellCount += 1
      const center = hexCellCenter(coord, topology, options.origin)
      drawHexPath(graphics, center, options.radius - 4)
      graphics.fillStyle(options.fillColor ?? 0x36a383, 0.18)
      graphics.fillPath()
      drawHexPath(graphics, center, options.radius - 4)
      graphics.lineStyle(2, options.strokeColor ?? 0x276f60, 0.68)
      graphics.strokePath()
    }
    return cellCount
  }
}

export function emptyHexZoneRenderInfo(): HexZoneRenderInfo {
  return {
    source: "hex_zone_renderer",
    topology: "hex",
    zoneCount: 0,
    zoneCellCount: 0,
    depth: DEFAULT_HEX_ZONE_DEPTH,
  }
}
