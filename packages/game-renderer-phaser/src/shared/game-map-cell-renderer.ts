import Phaser from "phaser"
import {
  createHexTopology,
  createSquareTopology,
  serializeCellCoord,
  type GridTopology,
  type HexCoord,
  type SquareCoord,
  type Vector2,
} from "@aedventure/game-topology"
import type { GameCellPlacement, GameLayerKind, GameMap } from "@aedventure/game-world"

import {
  DEFAULT_CELL_PRESENTATION_POLICY,
  type CellPresentationPolicy,
} from "../renderer/policies"
import { drawHexPath, hexCellCenter } from "../hex/hex-cell-renderer"

export interface GameMapCellRenderOptions {
  readonly origin?: Vector2
  readonly depth?: number
  readonly presentationPolicy?: CellPresentationPolicy
  readonly layerKinds?: readonly GameLayerKind[]
  readonly emphasizedCoordKeys?: ReadonlySet<string>
  readonly style?: "simple" | "painterly"
}

export interface GameMapCellRenderInfo {
  readonly source: "game_map_cell_renderer"
  readonly topology: GameMap["topology"]["kind"] | "unsupported"
  readonly layerCount: number
  readonly cellCount: number
  readonly visibleCellCount: number
  readonly foggedCellCount: number
  readonly blockedCellCount: number
  readonly emphasizedCellCount: number
}

export class GameMapCellRenderer {
  private terrainGraphics?: Phaser.GameObjects.Graphics
  private fogGraphics?: Phaser.GameObjects.Graphics
  private lastInfo: GameMapCellRenderInfo = emptyGameMapCellRenderInfo()

  constructor(private readonly scene: Phaser.Scene) {}

  render(map: GameMap, options: GameMapCellRenderOptions = {}): GameMapCellRenderInfo {
    this.clear()
    const terrainGraphics = this.scene.add.graphics()
    const fogGraphics = this.scene.add.graphics()
    const depth = options.depth ?? 0
    terrainGraphics.setDepth(depth)
    fogGraphics.setDepth(depth + 12)
    this.terrainGraphics = terrainGraphics
    this.fogGraphics = fogGraphics

    const policy = options.presentationPolicy ?? DEFAULT_CELL_PRESENTATION_POLICY
    const origin = options.origin ?? map.topology.origin ?? { x: 0, y: 0 }
    const hexTopology =
      map.topology.kind === "hex"
        ? createHexTopology({
            radius: map.topology.radius,
            bounds: map.topology.bounds,
            origin,
          })
        : null
    const squareTopology =
      map.topology.kind === "square"
        ? createSquareTopology({
            cellSize: map.topology.cellSize,
            bounds: map.topology.bounds,
            neighborMode: map.topology.neighborMode,
            distanceMetric: map.topology.distanceMetric,
            origin,
          })
        : null

    let cellCount = 0
    let visibleCellCount = 0
    let foggedCellCount = 0
    let blockedCellCount = 0
    let emphasizedCellCount = 0
    const layerKinds = new Set(options.layerKinds ?? ["terrain"])
    const styleMode = options.style ?? "simple"

    for (const layer of map.layers) {
      if (layer.visible === false) continue
      if (!layerKinds.has(layer.kind)) continue
      for (const cell of layer.cells ?? []) {
        if (cell.coord.kind !== map.topology.kind) continue
        cellCount += 1
        if (cell.blocked) blockedCellCount += 1

        if (!policy.cellVisible(cell)) continue
        visibleCellCount += 1
        const style = policy.cellStyle(cell)
        const emphasized = options.emphasizedCoordKeys?.has(serializeCellCoord(cell.coord)) === true
        if (emphasized) emphasizedCellCount += 1

        if (cell.coord.kind === "hex" && hexTopology && map.topology.kind === "hex") {
          drawHexCell(
            terrainGraphics,
            cell,
            hexTopology,
            map.topology.radius,
            style,
            emphasized,
            styleMode,
          )
        } else if (
          cell.coord.kind === "square" &&
          squareTopology &&
          map.topology.kind === "square"
        ) {
          drawSquareCell(
            terrainGraphics,
            cell,
            squareTopology,
            map.topology.cellSize,
            style,
            emphasized,
            styleMode,
          )
        }

        const fog = policy.fogStyle(cell)
        if (!fog.visible || fog.alpha <= 0) continue
        foggedCellCount += 1
        if (cell.coord.kind === "hex" && hexTopology && map.topology.kind === "hex") {
          drawHexFog(fogGraphics, cell.coord, hexTopology, map.topology.radius, fog.fill, fog.alpha)
        } else if (
          cell.coord.kind === "square" &&
          squareTopology &&
          map.topology.kind === "square"
        ) {
          drawSquareFog(
            fogGraphics,
            cell.coord,
            squareTopology,
            map.topology.cellSize,
            fog.fill,
            fog.alpha,
          )
        }
      }
    }

    this.lastInfo = {
      source: "game_map_cell_renderer",
      topology: map.topology.kind,
      layerCount: map.layers.length,
      cellCount,
      visibleCellCount,
      foggedCellCount,
      blockedCellCount,
      emphasizedCellCount,
    }
    return this.lastInfo
  }

  clear(): void {
    this.terrainGraphics?.destroy()
    this.fogGraphics?.destroy()
    this.terrainGraphics = undefined
    this.fogGraphics = undefined
    this.lastInfo = emptyGameMapCellRenderInfo()
  }

  getInfo(): GameMapCellRenderInfo {
    return this.lastInfo
  }
}

export function emptyGameMapCellRenderInfo(): GameMapCellRenderInfo {
  return {
    source: "game_map_cell_renderer",
    topology: "unsupported",
    layerCount: 0,
    cellCount: 0,
    visibleCellCount: 0,
    foggedCellCount: 0,
    blockedCellCount: 0,
    emphasizedCellCount: 0,
  }
}

function drawHexCell(
  graphics: Phaser.GameObjects.Graphics,
  cell: GameCellPlacement,
  topology: GridTopology<HexCoord>,
  radius: number,
  style: ReturnType<CellPresentationPolicy["cellStyle"]>,
  emphasized: boolean,
  styleMode: "simple" | "painterly",
): void {
  const center = hexCellCenter(cell.coord as HexCoord, topology)
  if (styleMode === "painterly") {
    drawHexPath(graphics, { x: center.x + 2, y: center.y + 4 }, radius - 1.2)
    graphics.fillStyle(style.shadow, style.activity === "inactive" ? 0.10 : 0.18)
    graphics.fillPath()

    drawHexPath(graphics, center, radius - 1.2)
    graphics.fillStyle(style.fill, style.alpha)
    graphics.fillPath()

    drawHexPath(graphics, { x: center.x - 2, y: center.y - 2 }, radius - 7)
    graphics.fillStyle(style.highlight, style.activity === "inactive" ? 0.08 : 0.15)
    graphics.fillPath()

    if (style.activity === "active" || style.activity === "transitioning") {
      drawHexPath(graphics, center, radius - 4)
      graphics.fillStyle(
        style.accent,
        style.activity === "active" ? 0.20 : 0.08 + style.activityProgress * 0.30,
      )
      graphics.fillPath()
    }

    drawCellMotif(graphics, center, radius, style)
    drawHexPath(graphics, center, radius - (emphasized ? 2.2 : 1.2))
    graphics.lineStyle(
      emphasized ? 2.4 : 1.2,
      emphasized ? 0x45c8ff : style.stroke,
      emphasized ? 0.88 : 0.52,
    )
    graphics.strokePath()

    if (style.activity !== "inactive" && style.activity !== "blocked") {
      graphics.fillStyle(emphasized ? 0x45c8ff : style.accent, emphasized ? 0.82 : 0.48)
      graphics.fillCircle(center.x, center.y, emphasized ? 3.8 : 2.4)
    }
    return
  }

  drawHexPath(graphics, center, radius)
  graphics.fillStyle(style.fill, style.alpha)
  graphics.fillPath()
  drawHexPath(graphics, center, radius)
  graphics.lineStyle(emphasized ? 2.2 : 1, emphasized ? 0x45c8ff : style.stroke, 0.72)
  graphics.strokePath()
}

function drawSquareCell(
  graphics: Phaser.GameObjects.Graphics,
  cell: GameCellPlacement,
  topology: GridTopology<SquareCoord>,
  cellSize: number,
  style: ReturnType<CellPresentationPolicy["cellStyle"]>,
  emphasized: boolean,
  styleMode: "simple" | "painterly",
): void {
  const topLeft = topology.cellToWorld(cell.coord as SquareCoord)
  const center = {
    x: topLeft.x + cellSize / 2,
    y: topLeft.y + cellSize / 2,
  }

  if (styleMode === "painterly") {
    graphics.fillStyle(style.shadow, style.activity === "blocked" ? 0.24 : 0.13)
    graphics.fillRect(topLeft.x + 2.8, topLeft.y + 4.2, cellSize - 3.4, cellSize - 3.4)
    graphics.fillStyle(style.fill, style.alpha)
    graphics.fillRect(topLeft.x + 1.2, topLeft.y + 1.2, cellSize - 2.4, cellSize - 2.4)

    graphics.fillStyle(style.highlight, style.activity === "inactive" ? 0.08 : 0.14)
    graphics.fillRect(
      topLeft.x + 3.8,
      topLeft.y + 3.8,
      cellSize - 7.6,
      Math.max(5, cellSize * 0.28),
    )

    if (style.activity === "active" || style.activity === "transitioning") {
      graphics.fillStyle(style.accent, style.activity === "active" ? 0.12 : 0.18)
      graphics.fillRect(topLeft.x + 5.4, topLeft.y + 5.4, cellSize - 10.8, cellSize - 10.8)
    }

    if (style.motif === "wall") {
      graphics.lineStyle(1.2, 0x1f211d, 0.26)
      for (let offset = 7; offset < cellSize - 4; offset += 9) {
        graphics.lineBetween(
          topLeft.x + offset,
          topLeft.y + 4,
          topLeft.x + offset - 7,
          topLeft.y + cellSize - 5,
        )
      }
    } else if (style.motif === "floor") {
      graphics.lineStyle(1, style.stroke, 0.18)
      graphics.lineBetween(topLeft.x + 6, center.y, topLeft.x + cellSize - 6, center.y)
      graphics.lineBetween(center.x, topLeft.y + 6, center.x, topLeft.y + cellSize - 6)
    }

    graphics.lineStyle(
      emphasized ? 2 : 1.2,
      emphasized ? 0x45c8ff : style.stroke,
      emphasized ? 0.88 : style.activity === "blocked" ? 0.72 : 0.42,
    )
    graphics.strokeRect(topLeft.x + 1.2, topLeft.y + 1.2, cellSize - 2.4, cellSize - 2.4)
    if (style.activity !== "inactive" && style.activity !== "blocked") {
      graphics.fillStyle(emphasized ? 0x45c8ff : style.accent, emphasized ? 0.78 : 0.52)
      graphics.fillCircle(center.x, center.y, emphasized ? 3.4 : 2.4)
    }
    return
  }

  graphics.fillStyle(style.fill, style.alpha)
  graphics.fillRect(topLeft.x, topLeft.y, cellSize, cellSize)
  graphics.lineStyle(emphasized ? 2 : 1, emphasized ? 0x45c8ff : style.stroke, 0.72)
  graphics.strokeRect(topLeft.x, topLeft.y, cellSize, cellSize)
}

function drawCellMotif(
  graphics: Phaser.GameObjects.Graphics,
  center: Vector2,
  radius: number,
  style: ReturnType<CellPresentationPolicy["cellStyle"]>,
): void {
  if (style.motif === "water") {
    graphics.lineStyle(3.2, 0xc8ecf0, 0.52)
    graphics.lineBetween(center.x - radius * 0.45, center.y + 3, center.x + radius * 0.36, center.y - 4)
    graphics.lineStyle(1.4, 0x508fa4, 0.56)
    graphics.lineBetween(center.x - radius * 0.5, center.y + 7, center.x + radius * 0.42, center.y)
    return
  }
  if (style.motif === "vegetation") {
    graphics.fillStyle(0x7d8c55, 0.45)
    graphics.fillCircle(center.x - 7, center.y + 4, 2.3)
    graphics.fillCircle(center.x + 6, center.y - 3, 1.9)
    graphics.fillCircle(center.x + 2, center.y + 8, 1.6)
    return
  }
  if (style.motif === "ridge" || style.motif === "peak") {
    graphics.lineStyle(1.4, 0x6e604e, 0.42)
    graphics.lineBetween(center.x - 9, center.y + 6, center.x, center.y - 8)
    graphics.lineBetween(center.x, center.y - 8, center.x + 9, center.y + 5)
    if (style.motif === "peak") {
      graphics.fillStyle(0xf0ead0, 0.42)
      graphics.fillTriangle(center.x - 3, center.y - 3, center.x, center.y - 8, center.x + 3, center.y - 3)
    }
    return
  }
  if (style.activity === "blocked") {
    graphics.lineStyle(1, style.stroke, 0.25)
    graphics.lineBetween(center.x - 9, center.y - 5, center.x + 9, center.y + 5)
    graphics.lineBetween(center.x - 8, center.y + 6, center.x + 8, center.y - 6)
  }
}

function drawHexFog(
  graphics: Phaser.GameObjects.Graphics,
  coord: HexCoord,
  topology: GridTopology<HexCoord>,
  radius: number,
  fill: number,
  alpha: number,
): void {
  drawHexPath(graphics, hexCellCenter(coord, topology), radius)
  graphics.fillStyle(fill, alpha)
  graphics.fillPath()
}

function drawSquareFog(
  graphics: Phaser.GameObjects.Graphics,
  coord: SquareCoord,
  topology: GridTopology<SquareCoord>,
  cellSize: number,
  fill: number,
  alpha: number,
): void {
  const topLeft = topology.cellToWorld(coord)
  graphics.fillStyle(fill, alpha)
  graphics.fillRect(topLeft.x, topLeft.y, cellSize, cellSize)
}
