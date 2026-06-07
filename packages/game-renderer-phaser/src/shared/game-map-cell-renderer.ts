import Phaser from "phaser"
import {
  createHexTopology,
  createSquareTopology,
  type GridTopology,
  type HexCoord,
  type SquareCoord,
  type Vector2,
} from "@aedventure/game-topology"
import type { GameCellPlacement, GameMap } from "@aedventure/game-world"

import {
  DEFAULT_CELL_PRESENTATION_POLICY,
  type CellPresentationPolicy,
} from "../renderer/policies"
import { drawHexPath, hexCellCenter } from "../hex/hex-cell-renderer"

export interface GameMapCellRenderOptions {
  readonly origin?: Vector2
  readonly depth?: number
  readonly presentationPolicy?: CellPresentationPolicy
}

export interface GameMapCellRenderInfo {
  readonly source: "game_map_cell_renderer"
  readonly topology: GameMap["topology"]["kind"] | "unsupported"
  readonly layerCount: number
  readonly cellCount: number
  readonly visibleCellCount: number
  readonly foggedCellCount: number
  readonly blockedCellCount: number
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

    for (const layer of map.layers) {
      if (layer.visible === false) continue
      for (const cell of layer.cells ?? []) {
        if (cell.coord.kind !== map.topology.kind) continue
        cellCount += 1
        if (cell.blocked) blockedCellCount += 1

        if (!policy.cellVisible(cell)) continue
        visibleCellCount += 1
        const style = policy.cellStyle(cell)
        if (cell.coord.kind === "hex" && hexTopology && map.topology.kind === "hex") {
          drawHexCell(terrainGraphics, cell, hexTopology, map.topology.radius, style)
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
  }
}

function drawHexCell(
  graphics: Phaser.GameObjects.Graphics,
  cell: GameCellPlacement,
  topology: GridTopology<HexCoord>,
  radius: number,
  style: ReturnType<CellPresentationPolicy["cellStyle"]>,
): void {
  const center = hexCellCenter(cell.coord as HexCoord, topology)
  drawHexPath(graphics, center, radius)
  graphics.fillStyle(style.fill, style.alpha)
  graphics.fillPath()
  drawHexPath(graphics, center, radius)
  graphics.lineStyle(1, style.stroke, 0.72)
  graphics.strokePath()
}

function drawSquareCell(
  graphics: Phaser.GameObjects.Graphics,
  cell: GameCellPlacement,
  topology: GridTopology<SquareCoord>,
  cellSize: number,
  style: ReturnType<CellPresentationPolicy["cellStyle"]>,
): void {
  const topLeft = topology.cellToWorld(cell.coord as SquareCoord)
  graphics.fillStyle(style.fill, style.alpha)
  graphics.fillRect(topLeft.x, topLeft.y, cellSize, cellSize)
  graphics.lineStyle(1, style.stroke, 0.72)
  graphics.strokeRect(topLeft.x, topLeft.y, cellSize, cellSize)
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
