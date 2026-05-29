import Phaser from "phaser"
import type {
  GridTopology,
  HexCoord,
  Vector2 as TopologyVector2,
} from "@aedventure/game-topology"
import type { GameEntity, GameMap } from "@aedventure/game-world"
import { hexCellCenter } from "./hex-cell-renderer"

export interface HexLandmarkRenderOptions {
  readonly origin?: TopologyVector2
  readonly radius?: number
  readonly depth?: number
  readonly fillColor?: number
  readonly strokeColor?: number
}

export interface HexLandmarkRenderInfo {
  readonly source: "hex_landmark_renderer"
  readonly topology: "hex"
  readonly landmarkCount: number
  readonly labelCount: number
  readonly depth: number
}

const DEFAULT_HEX_LANDMARK_DEPTH = 40

export class HexLandmarkRenderer {
  private readonly objects: Phaser.GameObjects.GameObject[] = []
  private lastInfo: HexLandmarkRenderInfo = emptyHexLandmarkRenderInfo()

  constructor(private readonly scene: Phaser.Scene) {}

  render(
    map: GameMap,
    topology: GridTopology<HexCoord>,
    options: HexLandmarkRenderOptions = {},
  ): HexLandmarkRenderInfo {
    this.clear()
    const origin = options.origin ?? { x: 0, y: 0 }
    const depth = options.depth ?? DEFAULT_HEX_LANDMARK_DEPTH
    let landmarkCount = 0
    let labelCount = 0

    for (const entity of map.entities) {
      if (entity.coord?.kind !== "hex") continue
      landmarkCount += 1
      const center = hexCellCenter(entity.coord, topology, origin)
      this.drawLandmark(entity, center, {
        ...options,
        depth,
      })
      if (entity.label) labelCount += 1
    }

    this.lastInfo = {
      source: "hex_landmark_renderer",
      topology: "hex",
      landmarkCount,
      labelCount,
      depth,
    }
    return this.lastInfo
  }

  clear(): void {
    this.objects.forEach((object) => object.destroy())
    this.objects.length = 0
    this.lastInfo = emptyHexLandmarkRenderInfo()
  }

  getInfo(): HexLandmarkRenderInfo {
    return this.lastInfo
  }

  private drawLandmark(
    entity: GameEntity,
    center: TopologyVector2,
    options: HexLandmarkRenderOptions & { readonly depth: number },
  ): void {
    const shadow = this.scene.add.ellipse(
      center.x,
      center.y + 15,
      (options.radius ?? 28) * 0.72,
      9,
      0x1f1b14,
      0.16,
    )
    shadow.setDepth(options.depth - 1)
    const marker = this.scene.add.polygon(
      center.x,
      center.y,
      [
        0,
        -17,
        14,
        -4,
        9,
        15,
        -9,
        15,
        -14,
        -4,
      ],
      options.fillColor ?? 0xa05f2d,
      0.96,
    )
    marker.setStrokeStyle(2, options.strokeColor ?? 0x5f371d, 0.84)
    marker.setDepth(options.depth)
    this.objects.push(shadow, marker)

    if (!entity.label) return
    const label = this.scene.add.text(center.x, center.y + 29, entity.label, {
      color: "#2f241a",
      fontFamily: "Aptos, Segoe UI, sans-serif",
      fontSize: "11px",
      fontStyle: "800",
      align: "center",
    })
    label.setOrigin(0.5, 0.5)
    label.setDepth(options.depth + 1)
    this.objects.push(label)
  }
}

export function emptyHexLandmarkRenderInfo(): HexLandmarkRenderInfo {
  return {
    source: "hex_landmark_renderer",
    topology: "hex",
    landmarkCount: 0,
    labelCount: 0,
    depth: DEFAULT_HEX_LANDMARK_DEPTH,
  }
}
