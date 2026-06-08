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

import { drawHexPath, hexCellCenter } from "../hex/hex-cell-renderer"
import {
  DEFAULT_CELL_PRESENTATION_POLICY,
  type CellPresentationPolicy,
  type FogVisualStyle,
  type FogVisualTreatment,
} from "../renderer/policies"

export interface WorldFogTravelRevealPreview {
  readonly active: boolean
  readonly progress: number
  readonly cells: ReadonlySet<string>
  readonly destinationCell: string | null
  readonly center: Vector2 | null
  readonly radius: number
  readonly feather: number
}

export interface WorldFogRenderOptions {
  readonly origin?: Vector2
  readonly depth?: number
  readonly presentationPolicy?: CellPresentationPolicy
  readonly layerKinds?: readonly GameLayerKind[]
  readonly nowMs?: number
  readonly frameCount?: number
  readonly transitionDurationMs?: number
  readonly travelRevealTrailMs?: number
  readonly travelRevealPreview?: WorldFogTravelRevealPreview
  readonly style?: "simple" | "soft"
}

export interface WorldFogRendererInfo {
  readonly source: "world_fog_renderer"
  readonly topology: GameMap["topology"]["kind"] | "unsupported"
  readonly cellCount: number
  readonly foggedCellCount: number
  readonly concealedCellCount: number
  readonly rememberedCellCount: number
  readonly revealTransitionCount: number
  readonly travelRevealPreviewActive: boolean
  readonly travelRevealPreviewCellCount: number
  readonly travelRevealTrailCellCount: number
}

interface FogGeometry {
  readonly hexTopology: GridTopology<HexCoord> | null
  readonly squareTopology: GridTopology<SquareCoord> | null
}

interface TravelRevealTrailEntry {
  readonly strength: number
  readonly updatedAtMs: number
}

const DEFAULT_REVEAL_TRANSITION_MS = 1100
const DEFAULT_TRAVEL_REVEAL_TRAIL_MS = 560

export class WorldFogRenderer {
  private graphics?: Phaser.GameObjects.Graphics
  private previousTreatments = new Map<string, FogVisualTreatment>()
  private revealTransitions = new Map<string, number>()
  private travelRevealTrail = new Map<string, TravelRevealTrailEntry>()
  private lastInfo: WorldFogRendererInfo = emptyWorldFogRendererInfo()

  constructor(private readonly scene: Phaser.Scene) {}

  render(map: GameMap, options: WorldFogRenderOptions = {}): WorldFogRendererInfo {
    const graphics = this.ensureGraphics(options.depth ?? 12)
    graphics.clear()

    const geometry = geometryForMap(map, options.origin ?? map.topology.origin ?? { x: 0, y: 0 })
    if (!geometry) {
      this.lastInfo = emptyWorldFogRendererInfo()
      return this.lastInfo
    }

    const policy = options.presentationPolicy ?? DEFAULT_CELL_PRESENTATION_POLICY
    const layerKinds = new Set(options.layerKinds ?? ["terrain"])
    const nowMs = options.nowMs ?? this.scene.time.now
    const frameCount = options.frameCount ?? 0
    const transitionDurationMs = options.transitionDurationMs ?? DEFAULT_REVEAL_TRANSITION_MS
    const travelRevealTrailMs = options.travelRevealTrailMs ?? DEFAULT_TRAVEL_REVEAL_TRAIL_MS
    const travelRevealPreview = options.travelRevealPreview ?? inactiveTravelRevealPreview()
    const styleMode = options.style ?? "soft"

    let cellCount = 0
    let foggedCellCount = 0
    let concealedCellCount = 0
    let rememberedCellCount = 0
    const nextTreatments = new Map<string, FogVisualTreatment>()

    for (const layer of map.layers) {
      if (layer.visible === false) continue
      if (!layerKinds.has(layer.kind)) continue
      for (const cell of layer.cells ?? []) {
        if (cell.coord.kind !== map.topology.kind) continue
        cellCount += 1

        const key = serializeCellCoord(cell.coord)
        const fog = policy.fogStyle(cell)
        const treatment = treatmentForFog(fog)
        nextTreatments.set(key, treatment)
        this.trackRevealTransition(key, treatment, nowMs)

        if (treatment === "concealed") concealedCellCount += 1
        if (treatment === "remembered") rememberedCellCount += 1

        const travelRevealProgress = this.travelRevealProgressForCell(
          cell,
          geometry,
          map,
          travelRevealPreview,
          nowMs,
          travelRevealTrailMs,
        )

        if (treatment === "concealed") {
          if (fog.visible && fog.alpha > 0) {
            foggedCellCount += 1
            drawFogCell(graphics, cell, geometry, map, fog, treatment, travelRevealProgress, styleMode)
          }
          if (travelRevealProgress > 0) {
            drawTravelRevealPreview(graphics, cell, geometry, map, travelRevealProgress)
          }
          continue
        }

        if (treatment === "remembered") {
          if (fog.visible && fog.alpha > 0) {
            foggedCellCount += 1
            drawFogCell(graphics, cell, geometry, map, fog, treatment, travelRevealProgress, styleMode)
          }
          if (travelRevealProgress > 0) {
            drawTravelRevealPreview(graphics, cell, geometry, map, travelRevealProgress)
          }
        }

        const revealStartedAt = this.revealTransitions.get(key)
        if (revealStartedAt === undefined) continue
        const progress = clamp((nowMs - revealStartedAt) / transitionDurationMs, 0, 1)
        drawRevealTransition(graphics, cell, geometry, map, progress)
        if (progress >= 1) this.revealTransitions.delete(key)
      }
    }

    this.previousTreatments = nextTreatments

    if (travelRevealPreview.active && travelRevealPreview.center) {
      drawTravelRevealHalo(graphics, map, travelRevealPreview, frameCount)
    }

    this.lastInfo = {
      source: "world_fog_renderer",
      topology: map.topology.kind,
      cellCount,
      foggedCellCount,
      concealedCellCount,
      rememberedCellCount,
      revealTransitionCount: this.revealTransitions.size,
      travelRevealPreviewActive: travelRevealPreview.active,
      travelRevealPreviewCellCount: travelRevealPreview.cells.size,
      travelRevealTrailCellCount: this.travelRevealTrail.size,
    }
    return this.lastInfo
  }

  clear(): void {
    this.graphics?.destroy()
    this.graphics = undefined
    this.previousTreatments.clear()
    this.revealTransitions.clear()
    this.travelRevealTrail.clear()
    this.lastInfo = emptyWorldFogRendererInfo()
  }

  getInfo(): WorldFogRendererInfo {
    return this.lastInfo
  }

  private ensureGraphics(depth: number): Phaser.GameObjects.Graphics {
    if (!this.graphics) {
      this.graphics = this.scene.add.graphics()
    }
    this.graphics.setDepth(depth)
    return this.graphics
  }

  private trackRevealTransition(key: string, treatment: FogVisualTreatment, nowMs: number): void {
    const previous = this.previousTreatments.get(key)
    if (previous === "concealed" && treatment !== "concealed") {
      this.revealTransitions.set(key, nowMs)
    }
  }

  private travelRevealProgressForCell(
    cell: GameCellPlacement,
    geometry: FogGeometry,
    map: GameMap,
    preview: WorldFogTravelRevealPreview,
    nowMs: number,
    trailDurationMs: number,
  ): number {
    const key = serializeCellCoord(cell.coord)
    let liveProgress = 0

    if (preview.active && preview.cells.has(key) && preview.center) {
      const cellCenter = centerForCell(cell, geometry, map)
      const distance = distanceBetween(preview.center, cellCenter)
      const haloCoverage = clamp(
        (preview.radius + preview.feather - distance) / Math.max(1, preview.feather),
        0,
        1,
      )
      liveProgress =
        smoothStep(haloCoverage) * smoothStep(clamp(preview.progress / 0.18, 0, 1))
    }

    return this.blendTravelRevealTrail(key, liveProgress, nowMs, trailDurationMs)
  }

  private blendTravelRevealTrail(
    key: string,
    liveProgress: number,
    nowMs: number,
    trailDurationMs: number,
  ): number {
    const existing = this.travelRevealTrail.get(key)

    if (liveProgress > 0) {
      this.travelRevealTrail.set(key, {
        strength: liveProgress,
        updatedAtMs: nowMs,
      })
      return liveProgress
    }

    if (!existing) return 0

    const elapsedMs = nowMs - existing.updatedAtMs
    if (elapsedMs >= trailDurationMs) {
      this.travelRevealTrail.delete(key)
      return 0
    }

    const trailProgress = clamp(elapsedMs / trailDurationMs, 0, 1)
    const trailStrength = existing.strength * (1 - smoothStep(trailProgress))
    if (trailStrength <= 0.015) {
      this.travelRevealTrail.delete(key)
      return 0
    }
    return trailStrength
  }
}

export function emptyWorldFogRendererInfo(): WorldFogRendererInfo {
  return {
    source: "world_fog_renderer",
    topology: "unsupported",
    cellCount: 0,
    foggedCellCount: 0,
    concealedCellCount: 0,
    rememberedCellCount: 0,
    revealTransitionCount: 0,
    travelRevealPreviewActive: false,
    travelRevealPreviewCellCount: 0,
    travelRevealTrailCellCount: 0,
  }
}

function geometryForMap(map: GameMap, origin: Vector2): FogGeometry | null {
  if (map.topology.kind === "hex") {
    return {
      hexTopology: createHexTopology({
        radius: map.topology.radius,
        bounds: map.topology.bounds,
        origin,
      }),
      squareTopology: null,
    }
  }
  if (map.topology.kind === "square") {
    return {
      hexTopology: null,
      squareTopology: createSquareTopology({
        cellSize: map.topology.cellSize,
        bounds: map.topology.bounds,
        neighborMode: map.topology.neighborMode,
        distanceMetric: map.topology.distanceMetric,
        origin,
      }),
    }
  }
  return null
}

function inactiveTravelRevealPreview(): WorldFogTravelRevealPreview {
  return {
    active: false,
    progress: 0,
    cells: new Set(),
    destinationCell: null,
    center: null,
    radius: 0,
    feather: 0,
  }
}

function treatmentForFog(fog: FogVisualStyle): FogVisualTreatment {
  if (fog.treatment) return fog.treatment
  if (!fog.visible || fog.alpha <= 0) return "none"
  if (fog.state === "hidden") return "concealed"
  return "remembered"
}

function drawFogCell(
  graphics: Phaser.GameObjects.Graphics,
  cell: GameCellPlacement,
  geometry: FogGeometry,
  map: GameMap,
  fog: FogVisualStyle,
  treatment: FogVisualTreatment,
  travelRevealProgress: number,
  styleMode: "simple" | "soft",
): void {
  if (styleMode === "simple") {
    drawSimpleFogCell(graphics, cell, geometry, map, fog, travelRevealProgress)
    return
  }
  if (cell.coord.kind === "square") {
    drawSoftSquareFogCell(graphics, cell, geometry, map, fog, treatment, travelRevealProgress)
  } else {
    drawSoftHexFogCell(graphics, cell, geometry, map, fog, treatment, travelRevealProgress)
  }
}

function drawSimpleFogCell(
  graphics: Phaser.GameObjects.Graphics,
  cell: GameCellPlacement,
  geometry: FogGeometry,
  map: GameMap,
  fog: FogVisualStyle,
  travelRevealProgress: number,
): void {
  const alpha = fog.alpha * (1 - travelRevealProgress * 0.58)
  if (cell.coord.kind === "square" && geometry.squareTopology && map.topology.kind === "square") {
    const topLeft = geometry.squareTopology.cellToWorld(cell.coord as SquareCoord)
    graphics.fillStyle(fog.fill, alpha)
    graphics.fillRect(topLeft.x, topLeft.y, map.topology.cellSize, map.topology.cellSize)
    return
  }
  if (cell.coord.kind === "hex" && geometry.hexTopology && map.topology.kind === "hex") {
    drawHexPath(graphics, hexCellCenter(cell.coord as HexCoord, geometry.hexTopology), map.topology.radius)
    graphics.fillStyle(fog.fill, alpha)
    graphics.fillPath()
  }
}

function drawSoftSquareFogCell(
  graphics: Phaser.GameObjects.Graphics,
  cell: GameCellPlacement,
  geometry: FogGeometry,
  map: GameMap,
  fog: FogVisualStyle,
  treatment: FogVisualTreatment,
  travelRevealProgress: number,
): void {
  if (!geometry.squareTopology || map.topology.kind !== "square") return
  const topLeft = geometry.squareTopology.cellToWorld(cell.coord as SquareCoord)
  const cellSize = map.topology.cellSize
  const revealFade = 1 - smoothStep(travelRevealProgress) * 0.82

  if (treatment === "concealed") {
    graphics.fillStyle(0x0b1110, fog.alpha * 0.22 * revealFade)
    graphics.fillRect(topLeft.x - 2.4, topLeft.y - 2.4, cellSize + 4.8, cellSize + 4.8)
    graphics.fillStyle(fog.fill, fog.alpha * 0.42 * revealFade)
    graphics.fillRect(topLeft.x - 0.4, topLeft.y - 0.4, cellSize + 0.8, cellSize + 0.8)
    graphics.fillStyle(fog.fill, fog.alpha * 0.80 * revealFade)
    graphics.fillRect(topLeft.x + 1.5, topLeft.y + 1.5, cellSize - 3, cellSize - 3)
    graphics.lineStyle(1.2, 0x9c9275, 0.16)
    graphics.strokeRect(topLeft.x + 5, topLeft.y + 5, cellSize - 10, cellSize - 10)
    return
  }

  const alpha = fog.alpha * (1 - travelRevealProgress * 0.58)
  graphics.fillStyle(0x2b302b, alpha * 0.34)
  graphics.fillRect(topLeft.x - 1.8, topLeft.y - 1.8, cellSize + 3.6, cellSize + 3.6)
  graphics.fillStyle(fog.fill, alpha)
  graphics.fillRect(topLeft.x + 1.2, topLeft.y + 1.2, cellSize - 2.4, cellSize - 2.4)
  graphics.lineStyle(1, 0xf0dfac, 0.10)
  graphics.lineBetween(topLeft.x + 5, topLeft.y + 6, topLeft.x + cellSize - 5, topLeft.y + cellSize - 6)
}

function drawSoftHexFogCell(
  graphics: Phaser.GameObjects.Graphics,
  cell: GameCellPlacement,
  geometry: FogGeometry,
  map: GameMap,
  fog: FogVisualStyle,
  treatment: FogVisualTreatment,
  travelRevealProgress: number,
): void {
  if (!geometry.hexTopology || map.topology.kind !== "hex") return
  const center = hexCellCenter(cell.coord as HexCoord, geometry.hexTopology)
  const radius = map.topology.radius
  const revealFade = 1 - smoothStep(travelRevealProgress) * 0.82

  if (treatment === "concealed") {
    drawHexPath(graphics, center, radius + 3.2)
    graphics.fillStyle(0x0a1110, fog.alpha * 0.17 * revealFade)
    graphics.fillPath()
    drawHexPath(graphics, center, radius + 1.4)
    graphics.fillStyle(fog.fill, fog.alpha * 0.32 * revealFade)
    graphics.fillPath()
    drawHexPath(graphics, center, radius - 1.3)
    graphics.fillStyle(fog.fill, fog.alpha * 0.83 * revealFade)
    graphics.fillPath()
    drawHexPath(graphics, { x: center.x - radius * 0.12, y: center.y - radius * 0.10 }, radius * 0.42)
    graphics.lineStyle(1.3, 0xa89c78, 0.14)
    graphics.strokePath()
    graphics.fillStyle(0xf0e4b4, 0.10)
    graphics.fillCircle(center.x + radius * 0.30, center.y - radius * 0.24, 1.8)
    return
  }

  const alpha = fog.alpha * (1 - travelRevealProgress * 0.58)
  drawHexPath(graphics, center, radius + 2.5)
  graphics.fillStyle(0x262d2a, alpha * 0.30)
  graphics.fillPath()
  drawHexPath(graphics, center, radius - 1.5)
  graphics.fillStyle(fog.fill, alpha)
  graphics.fillPath()
  drawHexPath(graphics, center, radius - 6)
  graphics.lineStyle(1.1, 0xf1dfaa, fog.state === "stale" ? 0.13 : 0.09)
  graphics.strokePath()
}

function drawRevealTransition(
  graphics: Phaser.GameObjects.Graphics,
  cell: GameCellPlacement,
  geometry: FogGeometry,
  map: GameMap,
  progress: number,
): void {
  const eased = smoothStep(progress)
  const alpha = 1 - eased
  if (cell.coord.kind === "square" && geometry.squareTopology && map.topology.kind === "square") {
    const topLeft = geometry.squareTopology.cellToWorld(cell.coord as SquareCoord)
    const cellSize = map.topology.cellSize
    graphics.fillStyle(0xf6e5a9, 0.16 * alpha)
    graphics.fillRect(topLeft.x + cellSize * 0.16, topLeft.y + cellSize * 0.16, cellSize * 0.68, cellSize * 0.68)
    for (let ring = 0; ring < 3; ring += 1) {
      const ringProgress = clamp(eased - ring * 0.16, 0, 1)
      const inset = cellSize * (0.24 - ringProgress * 0.22)
      graphics.lineStyle(1.4 + ring * 0.8, 0xf9d978, (0.44 - ring * 0.10) * alpha)
      graphics.strokeRect(topLeft.x + inset, topLeft.y + inset, cellSize - inset * 2, cellSize - inset * 2)
    }
    return
  }

  if (cell.coord.kind !== "hex" || !geometry.hexTopology || map.topology.kind !== "hex") return
  const center = hexCellCenter(cell.coord as HexCoord, geometry.hexTopology)
  const radius = map.topology.radius
  drawHexPath(graphics, center, radius * (0.32 + eased * 0.58))
  graphics.fillStyle(0xf9e4a1, 0.13 * alpha)
  graphics.fillPath()
  for (let ring = 0; ring < 3; ring += 1) {
    const ringProgress = clamp(eased - ring * 0.15, 0, 1)
    drawHexPath(graphics, center, radius * (0.40 + ringProgress * (0.72 + ring * 0.10)))
    graphics.lineStyle(2.2 - ring * 0.35, 0xf5d36c, (0.52 - ring * 0.12) * alpha)
    graphics.strokePath()
  }
}

function drawTravelRevealPreview(
  graphics: Phaser.GameObjects.Graphics,
  cell: GameCellPlacement,
  geometry: FogGeometry,
  map: GameMap,
  progress: number,
): void {
  const eased = smoothStep(progress)
  const pulse = Math.sin(eased * Math.PI)
  if (cell.coord.kind === "square" && geometry.squareTopology && map.topology.kind === "square") {
    const topLeft = geometry.squareTopology.cellToWorld(cell.coord as SquareCoord)
    const cellSize = map.topology.cellSize
    const inset = cellSize * (0.34 - eased * 0.26)
    graphics.fillStyle(0xf8e4a4, 0.05 + pulse * 0.08)
    graphics.fillRect(topLeft.x + inset, topLeft.y + inset, cellSize - inset * 2, cellSize - inset * 2)
    graphics.lineStyle(1.4, 0xf5d36c, 0.24 + pulse * 0.32)
    graphics.strokeRect(topLeft.x + inset, topLeft.y + inset, cellSize - inset * 2, cellSize - inset * 2)
    return
  }

  if (cell.coord.kind !== "hex" || !geometry.hexTopology || map.topology.kind !== "hex") return
  const center = hexCellCenter(cell.coord as HexCoord, geometry.hexTopology)
  const radius = map.topology.radius
  drawHexPath(graphics, center, radius * (0.34 + eased * 0.62))
  graphics.fillStyle(0xf8e4a4, 0.04 + pulse * 0.07)
  graphics.fillPath()
  drawHexPath(graphics, center, radius * (0.42 + eased * 0.58))
  graphics.lineStyle(1.6, 0xf5d36c, 0.24 + pulse * 0.34)
  graphics.strokePath()
}

function drawTravelRevealHalo(
  graphics: Phaser.GameObjects.Graphics,
  map: GameMap,
  preview: WorldFogTravelRevealPreview,
  frameCount: number,
): void {
  if (!preview.center) return
  const progressAlpha = smoothStep(clamp(preview.progress / 0.22, 0, 1))
  const pulse = (Math.sin(frameCount / 7) + 1) / 2
  const radius = preview.radius + preview.feather * 0.42 + pulse * 1.8
  graphics.fillStyle(0xf7dda0, 0.045 * progressAlpha)
  graphics.fillCircle(preview.center.x, preview.center.y, radius)
  graphics.lineStyle(1.6, 0xf5d36c, 0.20 * progressAlpha)
  graphics.strokeCircle(preview.center.x, preview.center.y, radius * 0.72)
  if (map.topology.kind === "hex") {
    graphics.lineStyle(1.1, 0xffffff, 0.10 * progressAlpha)
    graphics.strokeCircle(preview.center.x, preview.center.y, radius * 0.42)
  }
}

function centerForCell(cell: GameCellPlacement, geometry: FogGeometry, map: GameMap): Vector2 {
  if (cell.coord.kind === "square" && geometry.squareTopology && map.topology.kind === "square") {
    const topLeft = geometry.squareTopology.cellToWorld(cell.coord as SquareCoord)
    return {
      x: topLeft.x + map.topology.cellSize / 2,
      y: topLeft.y + map.topology.cellSize / 2,
    }
  }
  if (cell.coord.kind === "hex" && geometry.hexTopology) {
    return hexCellCenter(cell.coord as HexCoord, geometry.hexTopology)
  }
  return { x: 0, y: 0 }
}

function distanceBetween(first: Vector2, second: Vector2): number {
  const dx = first.x - second.x
  const dy = first.y - second.y
  return Math.sqrt(dx * dx + dy * dy)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function smoothStep(value: number): number {
  const clamped = clamp(value, 0, 1)
  return clamped * clamped * (3 - 2 * clamped)
}
