import Phaser from "phaser"
import { hexCellPolygonPoints } from "@aedventure/game-renderer-phaser"
import {
  createHexTopology,
  createSquareTopology,
  type CellCoord,
  type GridTopology,
  type HexCoord,
  type SquareCoord,
  type Vector2,
} from "@aedventure/game-topology"
import {
  validateGameWorld,
  type GameCellPlacement,
  type GameEntity,
  type GameMap,
  type GameWorld,
} from "@aedventure/game-world"

type AddCellState = "inactive" | "converting" | "stabilized" | "blocked"
type AddTopologyKind = "hex" | "square"
type AddTerrain =
  | "plains"
  | "river"
  | "scrub"
  | "ridge"
  | "mountain"
  | "dungeon_floor"
  | "dungeon_wall"
  | "base_floor"
  | "base_wall"
  | "unknown"
type AddFeature = "none" | "base" | "survivor_cave" | string

export interface AddPhaserMapInfo {
  readonly hostedBy: "phaser"
  readonly ready: boolean
  readonly renderCount: number
  readonly mapId: string | null
  readonly validationValid: boolean
  readonly validationSummary: string
  readonly rendererType: string
  readonly topology: {
    readonly kind: AddTopologyKind | "unknown"
    readonly mapMode: string | null
    readonly fixture: boolean
    readonly radius: number | null
    readonly cellSize: number | null
  }
  readonly authority: {
    readonly rules: "rust_wasm_snapshot"
    readonly phaser: "visual_projection_only"
    readonly mutatesSimulation: false
  }
  readonly cells: {
    readonly total: number
    readonly inactive: number
    readonly converting: number
    readonly stabilized: number
    readonly blocked: number
    readonly bubbleEdge: number
  }
  readonly landmarks: {
    readonly baseCenter: string | null
    readonly studioLabelVisible: boolean
    readonly survivorCave: string | null
    readonly survivorCaveVisible: boolean
    readonly renderedCount: number
  }
  readonly camera: {
    readonly mode: "fit" | "interactive_pan_zoom"
    readonly zoom: number
    readonly scrollX: number
    readonly scrollY: number
  }
  readonly interaction: {
    readonly hoverEnabled: true
    readonly selectEnabled: true
    readonly hoveredCell: string | null
    readonly selectedCell: string | null
    readonly hoveredHex: string | null
    readonly selectedHex: string | null
    readonly selectedLabel: string | null
  }
}

interface RenderContext {
  readonly map: GameMap
  readonly topologyKind: AddTopologyKind
  readonly hexTopology: GridTopology<HexCoord> | null
  readonly squareTopology: GridTopology<SquareCoord> | null
  readonly origin: Vector2
  readonly terrainCells: readonly GameCellPlacement[]
  readonly terrainByCoord: ReadonlyMap<string, GameCellPlacement>
  readonly stateCounts: StateCounts
  readonly bubbleEdgeCoords: ReadonlySet<string>
  readonly baseCoord: CellCoord | null
  readonly survivorCaveCoord: CellCoord | null
}

interface StateCounts {
  readonly inactive: number
  readonly converting: number
  readonly stabilized: number
  readonly blocked: number
}

const DEFAULT_RADIUS = 28
const MIN_ZOOM = 0.55
const MAX_ZOOM = 2.2

export class AddRpgPhaserMapHost {
  private readonly scene: AddRpgHexScene
  private readonly game: Phaser.Game

  constructor(parent: HTMLElement) {
    this.scene = new AddRpgHexScene()
    this.game = new Phaser.Game({
      type: Phaser.WEBGL,
      parent,
      backgroundColor: "#e6dec2",
      transparent: true,
      width: parent.clientWidth || 720,
      height: parent.clientHeight || 520,
      render: {
        antialias: true,
        roundPixels: false,
        pixelArt: false,
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        parent,
        width: parent.clientWidth || 720,
        height: parent.clientHeight || 520,
      },
      scene: this.scene,
    })
  }

  renderWorld(world: GameWorld): void {
    this.scene.renderWorld(world)
  }

  advanceTime(milliseconds = 16): void {
    this.scene.advanceTime(milliseconds)
  }

  zoomBy(factor: number): void {
    this.scene.zoomBy(factor)
  }

  resetCamera(): void {
    this.scene.resetCamera()
  }

  getInfo(): AddPhaserMapInfo {
    return this.scene.getInfo()
  }

  destroy(): void {
    this.game.destroy(true)
  }
}

class AddRpgHexScene extends Phaser.Scene {
  private terrainGraphics?: Phaser.GameObjects.Graphics
  private overlayGraphics?: Phaser.GameObjects.Graphics
  private landmarkObjects: Phaser.GameObjects.GameObject[] = []
  private pendingWorld?: GameWorld
  private context?: RenderContext
  private ready = false
  private renderCount = 0
  private frameCount = 0
  private cameraInitialized = false
  private hoveredCoord: CellCoord | null = null
  private selectedCoord: CellCoord | null = null
  private lastRenderedMapId: string | null = null
  private dragging = false
  private dragMoved = false
  private dragStartScreen: Vector2 = { x: 0, y: 0 }
  private dragStartScroll: Vector2 = { x: 0, y: 0 }
  private lastInfo: AddPhaserMapInfo = emptyMapInfo()

  constructor() {
    super("add-rpg-hex-map")
  }

  create(): void {
    this.terrainGraphics = this.add.graphics()
    this.overlayGraphics = this.add.graphics()
    this.terrainGraphics.setDepth(0)
    this.overlayGraphics.setDepth(30)
    this.ready = true
    this.cameras.main.setRoundPixels(false)
    this.input.on("pointermove", this.onPointerMove, this)
    this.input.on("pointerdown", this.onPointerDown, this)
    this.input.on("pointerup", this.onPointerUp, this)
    this.input.on("wheel", this.onWheel, this)
    this.scale.on("resize", this.onResize, this)
    this.renderPendingWorld(true)
  }

  renderWorld(world: GameWorld): void {
    this.pendingWorld = world
    this.renderPendingWorld(false)
  }

  advanceTime(milliseconds: number): void {
    this.frameCount += Math.max(1, Math.round(milliseconds / 16))
    this.drawOverlay()
    this.refreshInfo()
  }

  zoomBy(factor: number): void {
    const camera = this.cameras.main
    camera.setZoom(clamp(camera.zoom * factor, MIN_ZOOM, MAX_ZOOM))
    this.refreshInfo()
  }

  resetCamera(): void {
    if (!this.context) return
    this.fitCameraToContext(this.context)
    this.refreshInfo()
  }

  getInfo(): AddPhaserMapInfo {
    this.refreshInfo()
    return this.lastInfo
  }

  private renderPendingWorld(forceCameraFit: boolean): void {
    if (!this.ready || !this.pendingWorld) return

    const world = this.pendingWorld
    const validation = validateGameWorld(world)
    const map = world.maps.find((candidate) => candidate.id === world.activeMapId) ?? world.maps[0]
    if (!map || (map.topology.kind !== "hex" && map.topology.kind !== "square")) {
      this.lastInfo = {
        ...emptyMapInfo(),
        ready: this.ready,
        validationValid: false,
        validationSummary: "ADD world did not contain a supported map topology.",
      }
      return
    }

    if (this.lastRenderedMapId !== map.id) {
      this.hoveredCoord = null
      this.selectedCoord = null
      this.cameraInitialized = false
      this.lastRenderedMapId = map.id
    }

    this.context = createRenderContext(map, this.scale.width, this.scale.height)
    this.drawTerrain(this.context)
    this.drawLandmarks(this.context)
    this.drawOverlay()
    this.renderCount += 1

    if (forceCameraFit || !this.cameraInitialized) {
      this.fitCameraToContext(this.context)
      this.cameraInitialized = true
    }

    this.refreshInfo(validation.summary, validation.valid)
  }

  private drawTerrain(context: RenderContext): void {
    const graphics = this.terrainGraphics
    if (!graphics) return
    graphics.clear()

    for (const cell of context.terrainCells) {
      const center = centerFor(cell.coord, context)
      const state = stateForCell(cell)
      const style = styleForCell(cell)

      if (cell.coord.kind === "square") {
        const topLeft = squareTopLeftFor(cell.coord, context)
        const cellSize = squareCellSize(context)
        graphics.fillStyle(style.fill, style.alpha)
        graphics.fillRect(topLeft.x + 1.2, topLeft.y + 1.2, cellSize - 2.4, cellSize - 2.4)
        if (state === "stabilized" || state === "converting") {
          graphics.fillStyle(state === "stabilized" ? 0x73b99a : 0x66a6c8, state === "stabilized" ? 0.14 : 0.16)
          graphics.fillRect(topLeft.x + 4, topLeft.y + 4, cellSize - 8, cellSize - 8)
        }
        graphics.lineStyle(1, style.stroke, state === "blocked" ? 0.68 : 0.42)
        graphics.strokeRect(topLeft.x + 1.2, topLeft.y + 1.2, cellSize - 2.4, cellSize - 2.4)
        if (state !== "inactive" && state !== "blocked") {
          graphics.fillStyle(0x2b5f50, 0.38)
          graphics.fillCircle(center.x, center.y, 2.4)
        }
        continue
      }

      const radius = context.map.topology.kind === "hex" ? context.map.topology.radius : DEFAULT_RADIUS
      drawHexPath(graphics, center, radius - 1.2)
      graphics.fillStyle(style.fill, style.alpha)
      graphics.fillPath()

      const progress = progressForCell(cell)
      if (state === "stabilized" || state === "converting") {
        drawHexPath(graphics, center, radius - 4)
        graphics.fillStyle(state === "stabilized" ? 0x5fbf9a : 0x66a6c8, state === "stabilized" ? 0.23 : 0.08 + progress * 0.26)
        graphics.fillPath()
      }

      const coordKeyValue = coordKey(cell.coord)
      const edge = context.bubbleEdgeCoords.has(coordKeyValue)
      drawHexPath(graphics, center, radius - (edge ? 2.2 : 1.2))
      graphics.lineStyle(edge ? 3 : 1, edge ? 0x1f7fdd : style.stroke, edge ? 0.92 : 0.56)
      graphics.strokePath()

      if (state !== "inactive" && state !== "blocked") {
        graphics.fillStyle(edge ? 0x1f7fdd : 0x2b5f50, edge ? 0.85 : 0.46)
        graphics.fillCircle(center.x, center.y, edge ? 3.8 : 2.3)
      }
    }
  }

  private drawLandmarks(context: RenderContext): void {
    this.landmarkObjects.forEach((object) => object.destroy())
    this.landmarkObjects = []

    for (const entity of context.map.entities) {
      if (!entity.coord || entity.coord.kind !== context.topologyKind) continue
      if (entity.kind === "hero") continue

      const center = centerFor(entity.coord, context)
      const tags = new Set(entity.tags ?? [])
      if (tags.has("flora")) {
        this.drawFlora(center, entity)
        continue
      }
      this.drawLandmark(center, entity)
    }
  }

  private drawFlora(center: Vector2, entity: GameEntity): void {
    const color = (entity.tags ?? []).includes("scrub") ? 0xa76737 : 0x6f9476
    const dot = this.add.ellipse(center.x, center.y + 3, 10, 5, color, 0.7)
    dot.setDepth(20)
    this.landmarkObjects.push(dot)
  }

  private drawLandmark(center: Vector2, entity: GameEntity): void {
    const sourceId = String(entity.metadata?.sourceId ?? "")
    const isCave = sourceId.includes("cave")
    const isFixture = (entity.tags ?? []).includes("fixture")
    const isBase = !isFixture && (sourceId.includes("base") || sourceId.includes("crystal_circle"))
    const radius = isCave ? 13 : isBase ? 15 : 11
    const fill = isCave ? 0x8a4c2f : isBase ? 0x2f7d68 : 0xa05f2d
    const stroke = isCave ? 0x432315 : isBase ? 0x114538 : 0x5f371d
    const shadow = this.add.ellipse(center.x, center.y + 14, radius * 1.6, 7, 0x1f1b14, 0.18)
    shadow.setDepth(24)
    const marker = this.add.polygon(
      center.x,
      center.y,
      isCave
        ? [0, -radius, radius, 0, 0, radius, -radius, 0]
        : [0, -radius, radius * 0.9, -3, radius * 0.5, radius, -radius * 0.5, radius, -radius * 0.9, -3],
      fill,
      0.96,
    )
    marker.setStrokeStyle(2, stroke, 0.86)
    marker.setDepth(25)
    this.landmarkObjects.push(shadow, marker)

    if (!isCave && !isBase && !isFixture) return
    const labelText = isCave
      ? "Survivor Cave"
      : isFixture
        ? entity.label ?? "Fixture"
        : isBase
          ? "Studio"
          : entity.label ?? "Fixture"
    const label = this.add.text(center.x, center.y + 28, labelText, {
      color: "#1f2a25",
      fontFamily: "Aptos, Segoe UI, sans-serif",
      fontSize: "12px",
      fontStyle: "800",
      align: "center",
      backgroundColor: "rgba(255, 250, 226, 0.70)",
      padding: { x: 4, y: 2 },
    })
    label.setOrigin(0.5, 0.5)
    label.setDepth(26)
    this.landmarkObjects.push(label)
  }

  private drawOverlay(): void {
    const graphics = this.overlayGraphics
    const context = this.context
    if (!graphics || !context) return
    graphics.clear()

    if (this.hoveredCoord) {
      this.drawSelectionCell(this.hoveredCoord, 0xffffff, 0.7, 2)
    }
    if (this.selectedCoord) {
      this.drawSelectionCell(this.selectedCoord, 0xe3a64a, 0.95, 3)
    }
  }

  private drawSelectionCell(
    coord: CellCoord,
    color: number,
    alpha: number,
    lineWidth: number,
  ): void {
    if (!this.overlayGraphics || !this.context) return
    if (coord.kind === "square") {
      const topLeft = squareTopLeftFor(coord, this.context)
      const cellSize = squareCellSize(this.context)
      this.overlayGraphics.lineStyle(lineWidth, color, alpha)
      this.overlayGraphics.strokeRect(topLeft.x, topLeft.y, cellSize, cellSize)
      return
    }

    const radius = this.context.map.topology.kind === "hex" ? this.context.map.topology.radius : DEFAULT_RADIUS
    drawHexPath(this.overlayGraphics, centerFor(coord, this.context), radius + 1.8)
    this.overlayGraphics.lineStyle(lineWidth, color, alpha)
    this.overlayGraphics.strokePath()
  }

  private fitCameraToContext(context: RenderContext): void {
    const camera = this.cameras.main
    const centers = context.terrainCells.map((cell) => centerFor(cell.coord, context))
    if (centers.length === 0) return

    const padding =
      context.topologyKind === "hex"
        ? (context.map.topology.kind === "hex" ? context.map.topology.radius : DEFAULT_RADIUS) * 2
        : squareCellSize(context) * 1.5
    const minX = Math.min(...centers.map((point) => point.x)) - padding
    const maxX = Math.max(...centers.map((point) => point.x)) + padding
    const minY = Math.min(...centers.map((point) => point.y)) - padding
    const maxY = Math.max(...centers.map((point) => point.y)) + padding
    const width = Math.max(1, maxX - minX)
    const height = Math.max(1, maxY - minY)
    const zoom = Math.min(
      1.45,
      Math.max(0.64, Math.min(this.scale.width / width, this.scale.height / height) * 0.9),
    )
    camera.setBounds(minX, minY, width, height)
    camera.setZoom(zoom)
    camera.centerOn(minX + width / 2, minY + height / 2)
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    this.dragging = true
    this.dragMoved = false
    this.dragStartScreen = { x: pointer.x, y: pointer.y }
    this.dragStartScroll = {
      x: this.cameras.main.scrollX,
      y: this.cameras.main.scrollY,
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.dragging) {
      const dx = pointer.x - this.dragStartScreen.x
      const dy = pointer.y - this.dragStartScreen.y
      if (Math.abs(dx) + Math.abs(dy) > 3) this.dragMoved = true
      this.cameras.main.scrollX = this.dragStartScroll.x - dx / this.cameras.main.zoom
      this.cameras.main.scrollY = this.dragStartScroll.y - dy / this.cameras.main.zoom
      this.refreshInfo()
      return
    }

    const nextHover = this.coordAtPointer(pointer)
    if (sameCoord(nextHover, this.hoveredCoord)) return
    this.hoveredCoord = nextHover
    this.drawOverlay()
    this.refreshInfo()
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    this.dragging = false
    if (!this.dragMoved) {
      this.selectedCoord = this.coordAtPointer(pointer)
      this.drawOverlay()
    }
    this.refreshInfo()
  }

  private onWheel(
    pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number,
  ): void {
    const camera = this.cameras.main
    const before = camera.getWorldPoint(pointer.x, pointer.y)
    camera.setZoom(clamp(camera.zoom * (deltaY > 0 ? 0.9 : 1.1), MIN_ZOOM, MAX_ZOOM))
    const after = camera.getWorldPoint(pointer.x, pointer.y)
    camera.scrollX += before.x - after.x
    camera.scrollY += before.y - after.y
    this.refreshInfo()
  }

  private onResize(): void {
    this.renderPendingWorld(true)
  }

  private coordAtPointer(pointer: Phaser.Input.Pointer): CellCoord | null {
    const context = this.context
    if (!context) return null
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    const localPoint = {
      x: worldPoint.x - context.origin.x,
      y: worldPoint.y - context.origin.y,
    }
    const coord =
      context.topologyKind === "hex"
        ? context.hexTopology?.worldToCell(localPoint)
        : context.squareTopology?.worldToCell(localPoint)
    if (!coord) return null
    return context.terrainByCoord.has(coordKey(coord)) ? coord : null
  }

  private refreshInfo(summary = this.lastInfo.validationSummary, valid = this.lastInfo.validationValid): void {
    const context = this.context
    const camera = this.cameras.main
    if (!context) {
      this.lastInfo = {
        ...emptyMapInfo(),
        ready: this.ready,
        renderCount: this.renderCount,
        rendererType: rendererType(this.game.renderer.type),
      }
      return
    }

    this.lastInfo = {
      hostedBy: "phaser",
      ready: this.ready,
      renderCount: this.renderCount,
      mapId: context.map.id,
      validationValid: valid,
      validationSummary: summary,
      rendererType: rendererType(this.game.renderer.type),
      topology: topologyInfo(context),
      authority: authorityInfo(),
      cells: {
        total: context.terrainCells.length,
        inactive: context.stateCounts.inactive,
        converting: context.stateCounts.converting,
        stabilized: context.stateCounts.stabilized,
        blocked: context.stateCounts.blocked,
        bubbleEdge: context.bubbleEdgeCoords.size,
      },
      landmarks: {
        baseCenter: context.baseCoord ? displayCoord(context.baseCoord) : null,
        studioLabelVisible: context.baseCoord !== null,
        survivorCave: context.survivorCaveCoord ? displayCoord(context.survivorCaveCoord) : null,
        survivorCaveVisible: context.survivorCaveCoord !== null,
        renderedCount: this.landmarkObjects.length,
      },
      camera: {
        mode: this.cameraInitialized ? "interactive_pan_zoom" : "fit",
        zoom: round(camera.zoom),
        scrollX: round(camera.scrollX),
        scrollY: round(camera.scrollY),
      },
      interaction: {
        hoverEnabled: true,
        selectEnabled: true,
        hoveredCell: this.hoveredCoord ? displayCell(this.hoveredCoord) : null,
        selectedCell: this.selectedCoord ? displayCell(this.selectedCoord) : null,
        hoveredHex: this.hoveredCoord?.kind === "hex" ? displayCoord(this.hoveredCoord) : null,
        selectedHex: this.selectedCoord?.kind === "hex" ? displayCoord(this.selectedCoord) : null,
        selectedLabel: this.selectedCoord ? labelForCoord(this.selectedCoord, context) : null,
      },
    }
  }
}

function createRenderContext(map: GameMap, width: number, height: number): RenderContext {
  const terrainCells = terrainCellsFor(map)
  const hexTopology =
    map.topology.kind === "hex"
      ? createHexTopology({
          radius: map.topology.radius,
          bounds: map.topology.bounds,
        })
      : null
  const squareTopology =
    map.topology.kind === "square"
      ? createSquareTopology({
          cellSize: map.topology.cellSize,
          bounds: map.topology.bounds,
          neighborMode: map.topology.neighborMode,
          distanceMetric: map.topology.distanceMetric,
        })
      : null
  const origin = originForCells(terrainCells, map, hexTopology, squareTopology, width, height)
  const terrainByCoord = new Map(
    terrainCells.map((cell) => [coordKey(cell.coord), cell]),
  )
  const stateCounts = countStates(terrainCells)
  const bubbleEdgeCoords = new Set(
    terrainCells
      .filter((cell) => cell.coord.kind === "hex" && isBubbleEdgeCell(cell, map))
      .map((cell) => coordKey(cell.coord)),
  )
  const baseCell = terrainCells.find((cell) => isBaseFeature(featureForCell(cell)))
  const caveCell = terrainCells.find((cell) => featureForCell(cell) === "survivor_cave")

  return {
    map,
    topologyKind: map.topology.kind,
    hexTopology,
    squareTopology,
    origin,
    terrainCells,
    terrainByCoord,
    stateCounts,
    bubbleEdgeCoords,
    baseCoord: baseCell?.coord ?? null,
    survivorCaveCoord: caveCell?.coord ?? null,
  }
}

function terrainCellsFor(map: GameMap): readonly GameCellPlacement[] {
  return map.layers.find((layer) => layer.kind === "terrain")?.cells ?? []
}

function originForCells(
  cells: readonly GameCellPlacement[],
  map: GameMap,
  hexTopology: GridTopology<HexCoord> | null,
  squareTopology: GridTopology<SquareCoord> | null,
  width: number,
  height: number,
): Vector2 {
  const centers = cells
    .filter((cell) => cell.coord.kind === map.topology.kind)
    .map((cell) => {
      if (cell.coord.kind === "hex" && hexTopology) return hexTopology.cellToWorld(cell.coord)
      if (cell.coord.kind === "square" && squareTopology) {
        const topLeft = squareTopology.cellToWorld(cell.coord)
        const offset = map.topology.kind === "square" ? map.topology.cellSize / 2 : 0
        return {
          x: topLeft.x + offset,
          y: topLeft.y + offset,
        }
      }
      return { x: 0, y: 0 }
    })
  if (centers.length === 0) return { x: width / 2, y: height / 2 }

  const minX = Math.min(...centers.map((point) => point.x))
  const maxX = Math.max(...centers.map((point) => point.x))
  const minY = Math.min(...centers.map((point) => point.y))
  const maxY = Math.max(...centers.map((point) => point.y))
  return {
    x: width / 2 - (minX + maxX) / 2,
    y: height / 2 - (minY + maxY) / 2,
  }
}

function countStates(cells: readonly GameCellPlacement[]): StateCounts {
  return cells.reduce<StateCounts>(
    (counts, cell) => {
      const state = stateForCell(cell)
      return {
        inactive: counts.inactive + (state === "inactive" ? 1 : 0),
        converting: counts.converting + (state === "converting" ? 1 : 0),
        stabilized: counts.stabilized + (state === "stabilized" ? 1 : 0),
        blocked: counts.blocked + (state === "blocked" ? 1 : 0),
      }
    },
    { inactive: 0, converting: 0, stabilized: 0, blocked: 0 },
  )
}

function isBubbleEdgeCell(cell: GameCellPlacement, map: GameMap): boolean {
  const state = stateForCell(cell)
  const distance = numberMetadata(cell, "distance")
  const stabilizedRing = numberMetadata(map, "stabilizedRing")
  if (distance === undefined || stabilizedRing === undefined) return false
  return (
    (state === "stabilized" && distance === stabilizedRing) ||
    (state === "converting" && distance === stabilizedRing + 1)
  )
}

function styleForCell(cell: GameCellPlacement): { fill: number; stroke: number; alpha: number } {
  const terrain = terrainForCell(cell)
  const state = stateForCell(cell)
  if (state === "blocked") {
    if (terrain === "dungeon_wall") return { fill: 0x4b453d, stroke: 0x2f2a25, alpha: 0.96 }
    if (terrain === "base_wall") return { fill: 0x53605b, stroke: 0x33413d, alpha: 0.96 }
    return { fill: 0x7b6048, stroke: 0x59412f, alpha: 0.94 }
  }

  const base =
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

  return {
    fill: base,
    stroke:
      terrain === "dungeon_floor"
        ? 0x6f6252
        : terrain === "base_floor"
          ? 0x748177
          : state === "inactive"
            ? 0x8a8c78
            : 0x5e715f,
    alpha: state === "inactive" ? 0.58 : 0.95,
  }
}

function stateForCell(cell: GameCellPlacement): AddCellState {
  const value = cell.metadata?.state
  return value === "inactive" ||
    value === "converting" ||
    value === "stabilized" ||
    value === "blocked"
    ? value
    : cell.blocked
      ? "blocked"
      : "inactive"
}

function terrainForCell(cell: GameCellPlacement): AddTerrain {
  const value = cell.metadata?.terrain
  return value === "plains" ||
    value === "river" ||
    value === "scrub" ||
    value === "ridge" ||
    value === "mountain" ||
    value === "dungeon_floor" ||
    value === "dungeon_wall" ||
    value === "base_floor" ||
    value === "base_wall"
    ? value
    : "unknown"
}

function featureForCell(cell: GameCellPlacement): AddFeature {
  const value = cell.metadata?.feature
  return typeof value === "string" ? value : "none"
}

function progressForCell(cell: GameCellPlacement): number {
  return clamp(numberMetadata(cell, "progress") ?? 0, 0, 1)
}

function labelForCoord(coord: CellCoord, context: RenderContext): string | null {
  const cell = context.terrainByCoord.get(coordKey(coord))
  if (!cell) return null
  const feature = featureForCell(cell)
  if (feature === "base") return "Studio"
  if (feature === "base_core") return "Base Core"
  if (feature === "survivor_cave") return "Survivor Cave"
  if (feature !== "none") return titleCase(feature)
  return `${titleCase(stateForCell(cell))} ${titleCase(terrainForCell(cell))}`
}

function centerFor(coord: CellCoord, context: RenderContext): Vector2 {
  if (coord.kind === "square") {
    const topLeft = squareTopLeftFor(coord, context)
    const offset = squareCellSize(context) / 2
    return {
      x: topLeft.x + offset,
      y: topLeft.y + offset,
    }
  }

  if (!context.hexTopology) return context.origin
  const point = context.hexTopology.cellToWorld(coord)
  return {
    x: point.x + context.origin.x,
    y: point.y + context.origin.y,
  }
}

function squareTopLeftFor(coord: SquareCoord, context: RenderContext): Vector2 {
  if (!context.squareTopology) return context.origin
  const point = context.squareTopology.cellToWorld(coord)
  return {
    x: point.x + context.origin.x,
    y: point.y + context.origin.y,
  }
}

function squareCellSize(context: RenderContext): number {
  return context.map.topology.kind === "square" ? context.map.topology.cellSize : 32
}

function drawHexPath(
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

function numberMetadata(
  item: Pick<GameCellPlacement | GameMap, "metadata">,
  key: string,
): number | undefined {
  const value = item.metadata?.[key]
  return typeof value === "number" ? value : undefined
}

function authorityInfo(): AddPhaserMapInfo["authority"] {
  return {
    rules: "rust_wasm_snapshot",
    phaser: "visual_projection_only",
    mutatesSimulation: false,
  }
}

function topologyInfo(context: RenderContext): AddPhaserMapInfo["topology"] {
  return {
    kind: context.topologyKind,
    mapMode: typeof context.map.metadata?.mapMode === "string" ? context.map.metadata.mapMode : null,
    fixture: context.map.metadata?.fixture === true,
    radius: context.map.topology.kind === "hex" ? context.map.topology.radius : null,
    cellSize: context.map.topology.kind === "square" ? context.map.topology.cellSize : null,
  }
}

function isBaseFeature(feature: AddFeature): boolean {
  return feature === "base" || feature === "base_core"
}

function sameCoord(a: CellCoord | null, b: CellCoord | null): boolean {
  if (!a || !b || a.kind !== b.kind) return a === b
  return a.kind === "hex" && b.kind === "hex"
    ? a.q === b.q && a.r === b.r
    : a.kind === "square" && b.kind === "square" && a.x === b.x && a.y === b.y
}

function coordKey(coord: CellCoord): string {
  return coord.kind === "hex" ? `hex:${coord.q}:${coord.r}` : `square:${coord.x}:${coord.y}`
}

function displayCell(coord: CellCoord): string {
  return `${coord.kind}:${displayCoord(coord)}`
}

function displayCoord(coord: CellCoord): string {
  return coord.kind === "hex" ? serializeHex(coord) : `${coord.x},${coord.y}`
}

function serializeHex(coord: HexCoord): string {
  return `${coord.q},${coord.r}`
}

function titleCase(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1).replace("_", " ")}`
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function rendererType(type: number): string {
  if (type === Phaser.WEBGL) return "webgl"
  if (type === Phaser.CANVAS) return "canvas"
  return "unknown"
}

function emptyMapInfo(): AddPhaserMapInfo {
  return {
    hostedBy: "phaser",
    ready: false,
    renderCount: 0,
    mapId: null,
    validationValid: false,
    validationSummary: "Map has not rendered yet.",
    rendererType: "unknown",
    topology: {
      kind: "unknown",
      mapMode: null,
      fixture: false,
      radius: null,
      cellSize: null,
    },
    authority: authorityInfo(),
    cells: {
      total: 0,
      inactive: 0,
      converting: 0,
      stabilized: 0,
      blocked: 0,
      bubbleEdge: 0,
    },
    landmarks: {
      baseCenter: null,
      studioLabelVisible: false,
      survivorCave: null,
      survivorCaveVisible: false,
      renderedCount: 0,
    },
    camera: {
      mode: "fit",
      zoom: 1,
      scrollX: 0,
      scrollY: 0,
    },
    interaction: {
      hoverEnabled: true,
      selectEnabled: true,
      hoveredCell: null,
      selectedCell: null,
      hoveredHex: null,
      selectedHex: null,
      selectedLabel: null,
    },
  }
}
