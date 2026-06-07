import Phaser from "phaser"
import {
  createHexTopology,
  createSquareTopology,
  serializeCellCoord,
  type CellCoord,
  type HexCoord,
  type SquareCoord,
  type Vector2,
} from "@aedventure/game-topology"
import type { GameCellPlacement, GameMap } from "@aedventure/game-world"

import { hexCellCenter } from "../hex/hex-cell-renderer"
import { drawHexPath } from "../hex/hex-cell-renderer"
import {
  DEFAULT_CELL_PRESENTATION_POLICY,
  type CellPresentationPolicy,
} from "../renderer/policies"
import { applyCrispWorldText } from "../renderer/text-rendering"

export type WorldCellInteractionSelectionKind = "hover" | "selection"
export type WorldCellInteractionZoneKind = "boundary" | "area"
export type WorldCellInteractionAffordanceKind = "inspect" | "portal" | "door" | "action"
export type WorldCellInteractionAffordanceEmphasis = "subtle" | "primary"

export interface WorldCellInteractionSelection {
  readonly coord: CellCoord
  readonly kind: WorldCellInteractionSelectionKind
  readonly color?: number
  readonly alpha?: number
  readonly lineWidth?: number
}

export interface WorldCellInteractionZone {
  readonly id: string
  readonly coord: CellCoord
  readonly kind?: WorldCellInteractionZoneKind
  readonly color?: number
  readonly alpha?: number
}

export interface WorldCellInteractionAffordance {
  readonly id: string
  readonly coord: CellCoord
  readonly kind: WorldCellInteractionAffordanceKind
  readonly label?: string
  readonly actionLabel?: string
  readonly enabled?: boolean
  readonly emphasis?: WorldCellInteractionAffordanceEmphasis
  readonly color?: number
  readonly textColor?: string
}

export interface WorldCellInteractionRenderOptions {
  readonly origin?: Vector2
  readonly depth?: number
  readonly frameCount?: number
  readonly presentationPolicy?: CellPresentationPolicy
  readonly selections?: readonly WorldCellInteractionSelection[]
  readonly zones?: readonly WorldCellInteractionZone[]
  readonly affordances?: readonly WorldCellInteractionAffordance[]
}

export interface WorldCellInteractionRendererInfo {
  readonly source: "world_cell_interaction_renderer"
  readonly topology: GameMap["topology"]["kind"] | "unsupported"
  readonly selectionCount: number
  readonly hoverCount: number
  readonly zoneCellCount: number
  readonly affordanceCount: number
  readonly visibleAffordanceCount: number
  readonly primaryMarkerCount: number
  readonly symbolicGlyphCount: number
  readonly crispText: true
}

interface CellGeometryProjector {
  readonly topologyKind: "hex" | "square"
  cellCenter(coord: CellCoord): Vector2 | null
  squareTopLeft(coord: CellCoord): Vector2 | null
}

interface ResolvedAffordanceStyle {
  readonly color: number
  readonly textColor: string
  readonly enabled: boolean
}

const DEFAULT_DEPTH = 30
const DEFAULT_HEX_RADIUS = 28

export class WorldCellInteractionRenderer {
  private graphics?: Phaser.GameObjects.Graphics
  private markerObjects: Phaser.GameObjects.Container[] = []
  private lastInfo: WorldCellInteractionRendererInfo = emptyWorldCellInteractionRendererInfo()

  constructor(private readonly scene: Phaser.Scene) {}

  render(
    map: GameMap,
    options: WorldCellInteractionRenderOptions = {},
  ): WorldCellInteractionRendererInfo {
    this.clear()
    const graphics = this.scene.add.graphics()
    const depth = options.depth ?? DEFAULT_DEPTH
    graphics.setDepth(depth)
    this.graphics = graphics

    const projector = projectorForMap(map, options.origin ?? map.topology.origin ?? { x: 0, y: 0 })
    if (!projector) {
      this.lastInfo = emptyWorldCellInteractionRendererInfo()
      return this.lastInfo
    }

    const policy = options.presentationPolicy ?? DEFAULT_CELL_PRESENTATION_POLICY
    const cellsByCoord = visibleCellsByCoord(map, policy)
    const frameCount = options.frameCount ?? 0
    let hoverCount = 0
    let selectionCount = 0
    let zoneCellCount = 0
    let visibleAffordanceCount = 0
    let primaryMarkerCount = 0
    let symbolicGlyphCount = 0

    for (const zone of options.zones ?? []) {
      if (!cellsByCoord.has(serializeCellCoord(zone.coord))) continue
      drawZoneCell(graphics, zone, map, projector, frameCount)
      zoneCellCount += 1
    }

    for (const affordance of options.affordances ?? []) {
      if (!cellsByCoord.has(serializeCellCoord(affordance.coord))) continue
      const center = projector.cellCenter(affordance.coord)
      if (!center) continue
      visibleAffordanceCount += 1
      if (affordance.emphasis === "primary") {
        this.drawPrimaryMarker(affordance, center, depth + 8, frameCount)
        primaryMarkerCount += 1
      } else {
        drawSymbolicAffordance(graphics, affordance, center, cellVisualSize(map))
        symbolicGlyphCount += 1
      }
    }

    for (const selection of options.selections ?? []) {
      if (!cellsByCoord.has(serializeCellCoord(selection.coord))) continue
      drawSelectionCell(graphics, selection, map, projector)
      if (selection.kind === "hover") hoverCount += 1
      if (selection.kind === "selection") selectionCount += 1
    }

    this.lastInfo = {
      source: "world_cell_interaction_renderer",
      topology: map.topology.kind === "hex" || map.topology.kind === "square"
        ? map.topology.kind
        : "unsupported",
      selectionCount,
      hoverCount,
      zoneCellCount,
      affordanceCount: options.affordances?.length ?? 0,
      visibleAffordanceCount,
      primaryMarkerCount,
      symbolicGlyphCount,
      crispText: true,
    }
    return this.lastInfo
  }

  clear(): void {
    this.graphics?.destroy()
    this.graphics = undefined
    this.markerObjects.forEach((object) => object.destroy(true))
    this.markerObjects = []
    this.lastInfo = emptyWorldCellInteractionRendererInfo()
  }

  getInfo(): WorldCellInteractionRendererInfo {
    return this.lastInfo
  }

  private drawPrimaryMarker(
    affordance: WorldCellInteractionAffordance,
    center: Vector2,
    depth: number,
    frameCount: number,
  ): void {
    const style = styleForAffordance(affordance)
    const pulse = (Math.sin(frameCount / 13) + 1) / 2
    const y = center.y - 32 - pulse * 1.6
    const container = this.scene.add.container(center.x, y)
    container.setDepth(depth)
    container.setName(`world-cell-action:${affordance.id}`)

    const labelText = compactLabel(affordance.actionLabel ?? affordance.label ?? "Action")
    const label = this.scene.add.text(0, -4, labelText, {
      color: style.textColor,
      fontFamily: "Aptos, Segoe UI, sans-serif",
      fontSize: "11px",
      fontStyle: "800",
      align: "center",
      backgroundColor: "rgba(255, 250, 226, 0.92)",
      stroke: "rgba(255, 255, 255, 0.52)",
      strokeThickness: 2,
      padding: { x: 7, y: 4 },
    })
    applyCrispWorldText(label)
    label.setOrigin(0.5, 0.5)
    const width = Math.max(46, label.width + 12)
    const shadow = this.scene.add.ellipse(0, 17, width * 0.68, 8, 0x161915, 0.18)
    const halo = this.scene.add.ellipse(0, 3, width, 28, style.color, style.enabled ? 0.12 : 0.07)
    halo.setStrokeStyle(1.5, style.color, style.enabled ? 0.32 : 0.18)
    const stem = this.scene.add.rectangle(0, 19, 3, 11, style.color, style.enabled ? 0.72 : 0.42)
    const dot = this.scene.add.ellipse(0, 26, 8, 8, style.color, style.enabled ? 0.86 : 0.48)
    dot.setStrokeStyle(1, 0xfffdf7, style.enabled ? 0.72 : 0.36)
    container.add([shadow, halo, stem, dot, label])
    this.markerObjects.push(container)
  }
}

export function emptyWorldCellInteractionRendererInfo(): WorldCellInteractionRendererInfo {
  return {
    source: "world_cell_interaction_renderer",
    topology: "unsupported",
    selectionCount: 0,
    hoverCount: 0,
    zoneCellCount: 0,
    affordanceCount: 0,
    visibleAffordanceCount: 0,
    primaryMarkerCount: 0,
    symbolicGlyphCount: 0,
    crispText: true,
  }
}

function projectorForMap(map: GameMap, origin: Vector2): CellGeometryProjector | null {
  if (map.topology.kind === "hex") {
    const topology = createHexTopology({
      radius: map.topology.radius,
      bounds: map.topology.bounds,
      origin,
    })
    return {
      topologyKind: "hex",
      cellCenter: (coord) => coord.kind === "hex" ? hexCellCenter(coord, topology) : null,
      squareTopLeft: () => null,
    }
  }

  if (map.topology.kind === "square") {
    const cellSize = map.topology.cellSize
    const topology = createSquareTopology({
      cellSize,
      bounds: map.topology.bounds,
      neighborMode: map.topology.neighborMode,
      distanceMetric: map.topology.distanceMetric,
      origin,
    })
    return {
      topologyKind: "square",
      cellCenter: (coord) => {
        if (coord.kind !== "square") return null
        const topLeft = topology.cellToWorld(coord)
        return {
          x: topLeft.x + cellSize / 2,
          y: topLeft.y + cellSize / 2,
        }
      },
      squareTopLeft: (coord) => coord.kind === "square" ? topology.cellToWorld(coord) : null,
    }
  }

  return null
}

function visibleCellsByCoord(
  map: GameMap,
  policy: CellPresentationPolicy,
): ReadonlyMap<string, GameCellPlacement> {
  const cells = new Map<string, GameCellPlacement>()
  for (const layer of map.layers) {
    if (layer.visible === false) continue
    for (const cell of layer.cells ?? []) {
      if (cell.coord.kind !== map.topology.kind) continue
      if (!policy.cellVisible(cell)) continue
      cells.set(serializeCellCoord(cell.coord), cell)
    }
  }
  return cells
}

function drawZoneCell(
  graphics: Phaser.GameObjects.Graphics,
  zone: WorldCellInteractionZone,
  map: GameMap,
  projector: CellGeometryProjector,
  frameCount: number,
): void {
  const color = zone.color ?? 0x63dcff
  const pulse = (Math.sin(frameCount / 18) + 1) / 2
  const alpha = zone.alpha ?? 0.20
  if (zone.coord.kind === "hex" && map.topology.kind === "hex") {
    const center = projector.cellCenter(zone.coord)
    if (!center) return
    drawHexPath(graphics, center, map.topology.radius + 1.5 + pulse * 3.2)
    graphics.lineStyle(1.2, color, alpha + pulse * 0.20)
    graphics.strokePath()
    drawHexPath(graphics, center, map.topology.radius - 5)
    graphics.fillStyle(color, 0.035 + pulse * 0.035)
    graphics.fillPath()
    return
  }

  if (zone.coord.kind === "square" && map.topology.kind === "square") {
    const topLeft = projector.squareTopLeft(zone.coord)
    if (!topLeft) return
    const inset = 4 - pulse * 1.2
    graphics.lineStyle(1.2, color, alpha + pulse * 0.16)
    graphics.strokeRect(
      topLeft.x + inset,
      topLeft.y + inset,
      map.topology.cellSize - inset * 2,
      map.topology.cellSize - inset * 2,
    )
  }
}

function drawSelectionCell(
  graphics: Phaser.GameObjects.Graphics,
  selection: WorldCellInteractionSelection,
  map: GameMap,
  projector: CellGeometryProjector,
): void {
  const selected = selection.kind === "selection"
  const color = selection.color ?? (selected ? 0xe3a64a : 0xffffff)
  const alpha = selection.alpha ?? (selected ? 0.95 : 0.7)
  const lineWidth = selection.lineWidth ?? (selected ? 3 : 2)

  if (selection.coord.kind === "hex" && map.topology.kind === "hex") {
    const center = projector.cellCenter(selection.coord)
    if (!center) return
    drawHexPath(graphics, center, map.topology.radius + 1.8)
    graphics.lineStyle(lineWidth, color, alpha)
    graphics.strokePath()
    return
  }

  if (selection.coord.kind === "square" && map.topology.kind === "square") {
    const topLeft = projector.squareTopLeft(selection.coord)
    if (!topLeft) return
    graphics.lineStyle(lineWidth, color, alpha)
    graphics.strokeRect(topLeft.x, topLeft.y, map.topology.cellSize, map.topology.cellSize)
  }
}

function drawSymbolicAffordance(
  graphics: Phaser.GameObjects.Graphics,
  affordance: WorldCellInteractionAffordance,
  center: Vector2,
  size: number,
): void {
  if (affordance.kind === "portal") {
    drawPortalGlyph(graphics, center, size, styleForAffordance(affordance))
    return
  }

  if (affordance.kind === "door") {
    drawDoorGlyph(graphics, center, size, styleForAffordance(affordance))
    return
  }

  drawInspectGlyph(graphics, center, size, styleForAffordance(affordance))
}

function drawPortalGlyph(
  graphics: Phaser.GameObjects.Graphics,
  center: Vector2,
  size: number,
  style: ResolvedAffordanceStyle,
): void {
  const width = Math.max(11, size * 0.42)
  const height = Math.max(12, size * 0.48)
  const y = center.y + size * 0.08
  graphics.fillStyle(0x1e1612, 0.34)
  graphics.fillEllipse(center.x, y + height * 0.54, width * 1.45, height * 0.42)
  graphics.fillStyle(style.color, style.enabled ? 0.88 : 0.48)
  graphics.fillTriangle(
    center.x - width * 0.62,
    y + height * 0.12,
    center.x,
    y - height * 0.58,
    center.x + width * 0.62,
    y + height * 0.12,
  )
  graphics.fillRect(center.x - width * 0.55, y + height * 0.04, width * 1.1, height * 0.54)
  graphics.lineStyle(2.2, 0x4b2a1d, style.enabled ? 0.82 : 0.46)
  graphics.strokeTriangle(
    center.x - width * 0.62,
    y + height * 0.12,
    center.x,
    y - height * 0.58,
    center.x + width * 0.62,
    y + height * 0.12,
  )
  graphics.strokeRect(center.x - width * 0.55, y + height * 0.04, width * 1.1, height * 0.54)
  graphics.fillStyle(0x241611, style.enabled ? 0.78 : 0.48)
  graphics.fillEllipse(center.x, y + height * 0.18, width * 0.54, height * 0.55)
  graphics.lineStyle(1.2, 0xf0b95d, style.enabled ? 0.55 : 0.24)
  graphics.strokeEllipse(center.x, y + height * 0.18, width * 0.62, height * 0.64)
}

function drawDoorGlyph(
  graphics: Phaser.GameObjects.Graphics,
  center: Vector2,
  size: number,
  style: ResolvedAffordanceStyle,
): void {
  const width = Math.max(10, size * 0.34)
  const height = Math.max(13, size * 0.48)
  graphics.fillStyle(0x161915, 0.18)
  graphics.fillEllipse(center.x, center.y + height * 0.54, width * 1.7, height * 0.34)
  graphics.fillStyle(style.color, style.enabled ? 0.74 : 0.40)
  graphics.fillRect(center.x - width / 2, center.y - height / 2, width, height)
  graphics.lineStyle(1.5, 0xfff1c6, style.enabled ? 0.36 : 0.16)
  graphics.strokeRect(center.x - width / 2, center.y - height / 2, width, height)
  graphics.fillStyle(0xfff1c6, style.enabled ? 0.84 : 0.38)
  graphics.fillCircle(center.x + width * 0.25, center.y + 1, 1.6)
}

function drawInspectGlyph(
  graphics: Phaser.GameObjects.Graphics,
  center: Vector2,
  size: number,
  style: ResolvedAffordanceStyle,
): void {
  const radius = Math.max(5, size * 0.12)
  graphics.fillStyle(0x161915, 0.16)
  graphics.fillEllipse(center.x, center.y + radius * 1.7, radius * 2.3, radius * 0.72)
  graphics.fillStyle(style.color, style.enabled ? 0.72 : 0.38)
  graphics.fillCircle(center.x, center.y, radius)
  graphics.lineStyle(1.4, 0xfffdf7, style.enabled ? 0.72 : 0.28)
  graphics.strokeCircle(center.x, center.y, radius)
}

function styleForAffordance(affordance: WorldCellInteractionAffordance): ResolvedAffordanceStyle {
  const enabled = affordance.enabled !== false
  const color =
    affordance.color ??
    (affordance.kind === "portal"
      ? 0x9b5637
      : affordance.kind === "door"
        ? 0x8c5a2f
        : 0x2f8f63)
  return {
    color,
    textColor: affordance.textColor ?? (enabled ? "#18342a" : "#6f624d"),
    enabled,
  }
}

function cellVisualSize(map: GameMap): number {
  if (map.topology.kind === "hex") return map.topology.radius * 1.72
  if (map.topology.kind === "square") return map.topology.cellSize
  return DEFAULT_HEX_RADIUS
}

function compactLabel(label: string): string {
  const trimmed = label.trim()
  if (trimmed.length <= 24) return trimmed
  return `${trimmed.slice(0, 22)}...`
}
