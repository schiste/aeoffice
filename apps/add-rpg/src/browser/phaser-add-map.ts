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
  type GameCellLink,
  type GameEntity,
  type GameMap,
  type GameWorld,
} from "@aedventure/game-world"

import { ADD_TILE_TRAVEL_PRESENTATION } from "./travel-presentation-timing"

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
type AddTravelExposureRisk = "studio" | "safe_field" | "fringe" | "toxic" | "unknown"
type AddCharacterMoveDirection =
  | "up"
  | "right"
  | "down"
  | "left"
  | "north_east"
  | "north_west"
  | "south_east"
  | "south_west"
type AddCharacterMoveKey = "up" | "right" | "down" | "left" | "north_east" | "south_west"

interface AddDungeonLinkInfo {
  readonly id: string
  readonly kind: string
  readonly label: string
  readonly targetMapId: string
  readonly targetCoord: string | null
  readonly enabled: boolean
}

export interface AddCharacterTravelEvent {
  readonly direction: AddCharacterMoveDirection
  readonly fromCoord: CellCoord
  readonly toCoord: CellCoord
  readonly fromCell: string
  readonly toCell: string
  readonly destinationLabel: string
  readonly destinationState: AddCellState
  readonly destinationTerrain: AddTerrain
  readonly exposureRisk: AddTravelExposureRisk
  readonly dungeonLinksAtDestination: readonly AddDungeonLinkInfo[]
}

export interface AddRpgPhaserMapHostOptions {
  readonly onBeforeCharacterTravel?: (event: AddCharacterTravelEvent) => boolean | Promise<boolean>
  readonly onCharacterTravel?: (event: AddCharacterTravelEvent) => void
}

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
  readonly dungeonLinks: {
    readonly total: number
    readonly cellsWithLinks: number
    readonly selected: readonly AddDungeonLinkInfo[]
  }
  readonly knownFacts: {
    readonly hiddenCells: number
    readonly discoveredCells: number
    readonly visibleCells: number
    readonly staleCells: number
    readonly exactTerrainKnownCells: number
    readonly dynamicRiskKnownCells: number
    readonly vagueTravelLabels: number
    readonly sampleHiddenTravelLabel: string | null
  }
  readonly character: {
    readonly id: string
    readonly label: string
    readonly visible: boolean
    readonly coord: string | null
    readonly cell: string | null
    readonly x: number | null
    readonly y: number | null
    readonly moving: boolean
    readonly lastMoveDirection: string | null
    readonly lastMoveAccepted: boolean | null
    readonly blockedReason: string | null
    readonly dungeonLinksAtCell: readonly AddDungeonLinkInfo[]
    readonly authority: "browser_navigation_triggers_rust_time"
  }
  readonly travel: {
    readonly costGameMinutes: number
    readonly costRuntimeSeconds: number
    readonly presentationDurationMs: number
    readonly clockStepMs: number
    readonly active: boolean
    readonly progress: number
    readonly direction: string | null
    readonly fromCell: string | null
    readonly toCell: string | null
    readonly destinationLabel: string | null
    readonly destinationState: AddCellState | null
    readonly destinationTerrain: AddTerrain | null
    readonly exposureRisk: AddTravelExposureRisk | null
    readonly previewCell: string | null
    readonly previewLabel: string | null
    readonly previewAdjacent: boolean
    readonly previewExposureRisk: AddTravelExposureRisk | null
    readonly blockedReason: string | null
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
  readonly presentation: {
    readonly terrainArt: "procedural_painterly_topology"
    readonly bubbleEffects: "animated_halo_edge"
    readonly landmarkSprites: "procedural_sprite_stack"
    readonly labelRendering: "high_resolution_phaser_text"
    readonly ambience: "subtle_motes_and_topographic_scan"
    readonly transitionState: "idle" | "entering"
    readonly transitionProgress: number
    readonly responsiveLayout: "desktop" | "mobile"
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

interface CharacterObjectSet {
  readonly shadow: Phaser.GameObjects.Ellipse
  readonly body: Phaser.GameObjects.Ellipse
  readonly head: Phaser.GameObjects.Ellipse
  readonly scarf: Phaser.GameObjects.Triangle
  readonly label: Phaser.GameObjects.Text
}

interface CharacterMoveStatus {
  readonly direction: string | null
  readonly accepted: boolean | null
  readonly blockedReason: string | null
}

interface CharacterTravelState {
  readonly direction: AddCharacterMoveDirection
  readonly fromCell: string
  readonly toCell: string
  readonly destinationLabel: string
  readonly destinationState: AddCellState
  readonly destinationTerrain: AddTerrain
  readonly exposureRisk: AddTravelExposureRisk
  readonly startedAtMs: number
  readonly durationMs: number
  readonly fromPosition: Vector2
  readonly toPosition: Vector2
}

interface StateCounts {
  readonly inactive: number
  readonly converting: number
  readonly stabilized: number
  readonly blocked: number
}

interface CellStyle {
  readonly fill: number
  readonly stroke: number
  readonly alpha: number
  readonly accent: number
  readonly highlight: number
  readonly shadow: number
}

const DEFAULT_RADIUS = 28
const MIN_ZOOM = 0.55
const MAX_ZOOM = 2.2
const KEY_CHORD_DELAY_MS = 55

export class AddRpgPhaserMapHost {
  private readonly scene: AddRpgHexScene
  private readonly game: Phaser.Game

  constructor(parent: HTMLElement, options: AddRpgPhaserMapHostOptions = {}) {
    this.scene = new AddRpgHexScene(options)
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

  moveMainCharacter(direction: AddCharacterMoveDirection): Promise<boolean> {
    return this.scene.moveMainCharacter(direction)
  }

  setTravelLocked(locked: boolean): void {
    this.scene.setTravelLocked(locked)
  }

  getInfo(): AddPhaserMapInfo {
    return this.scene.getInfo()
  }

  destroy(): void {
    this.game.destroy(true)
  }
}

class AddRpgHexScene extends Phaser.Scene {
  private readonly hostOptions: AddRpgPhaserMapHostOptions
  private terrainGraphics?: Phaser.GameObjects.Graphics
  private ambienceGraphics?: Phaser.GameObjects.Graphics
  private overlayGraphics?: Phaser.GameObjects.Graphics
  private transitionGraphics?: Phaser.GameObjects.Graphics
  private landmarkObjects: Phaser.GameObjects.GameObject[] = []
  private characterObjects?: CharacterObjectSet
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
  private transitionState: "idle" | "entering" = "idle"
  private transitionProgress = 1
  private characterCoord: CellCoord | null = null
  private characterPosition: Vector2 | null = null
  private characterTarget: Vector2 | null = null
  private characterTravel: CharacterTravelState | null = null
  private travelRuntimeLocked = false
  private travelPromptLocked = false
  private characterMoveStatus: CharacterMoveStatus = {
    direction: null,
    accepted: null,
    blockedReason: null,
  }
  private readonly heldCharacterKeys = new Set<AddCharacterMoveKey>()
  private readonly pendingCharacterKeys = new Set<AddCharacterMoveKey>()
  private pendingCharacterMoveTimer: number | null = null
  private lastInfo: AddPhaserMapInfo = emptyMapInfo()

  constructor(options: AddRpgPhaserMapHostOptions) {
    super("add-rpg-hex-map")
    this.hostOptions = options
  }

  create(): void {
    this.terrainGraphics = this.add.graphics()
    this.ambienceGraphics = this.add.graphics()
    this.overlayGraphics = this.add.graphics()
    this.transitionGraphics = this.add.graphics()
    this.terrainGraphics.setDepth(0)
    this.ambienceGraphics.setDepth(10)
    this.overlayGraphics.setDepth(30)
    this.transitionGraphics.setDepth(80)
    this.transitionGraphics.setScrollFactor(0)
    this.ready = true
    this.cameras.main.setRoundPixels(false)
    this.input.on("pointermove", this.onPointerMove, this)
    this.input.on("pointerdown", this.onPointerDown, this)
    this.input.on("pointerup", this.onPointerUp, this)
    this.input.on("wheel", this.onWheel, this)
    this.input.keyboard?.on("keydown", this.onKeyDown, this)
    this.input.keyboard?.on("keyup", this.onKeyUp, this)
    this.scale.on("resize", this.onResize, this)
    this.renderPendingWorld(true)
  }

  update(_time: number, delta: number): void {
    if (!this.ready || !this.context) return
    this.frameCount += Math.max(1, Math.round(delta / 16))
    if (this.transitionState === "entering") {
      this.transitionProgress = clamp(this.transitionProgress + delta / 520, 0, 1)
      if (this.transitionProgress >= 1) this.transitionState = "idle"
    }
    this.updateMainCharacter(delta)
    this.drawAmbience(this.context)
    this.drawOverlay()
    this.refreshInfo()
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

  async moveMainCharacter(direction: AddCharacterMoveDirection): Promise<boolean> {
    if (!this.context) {
      this.characterMoveStatus = {
        direction,
        accepted: false,
        blockedReason: "map_not_ready",
      }
      this.refreshInfo()
      return false
    }

    this.syncMainCharacter(this.context, false)
    if (this.travelRuntimeLocked || this.travelPromptLocked || this.characterIsMoving()) {
      this.characterMoveStatus = {
        direction,
        accepted: false,
        blockedReason: "travel_in_progress",
      }
      this.refreshInfo()
      return false
    }
    if (!this.characterCoord) {
      this.characterMoveStatus = {
        direction,
        accepted: false,
        blockedReason: "no_character_coord",
      }
      this.refreshInfo()
      return false
    }

    const fromCoord = this.characterCoord
    const nextCoord = nextCharacterCoord(this.characterCoord, direction, this.context)
    if (!nextCoord) {
      this.characterMoveStatus = {
        direction,
        accepted: false,
        blockedReason: "unsupported_direction",
      }
      this.refreshInfo()
      return false
    }

    const nextCell = this.context.terrainByCoord.get(coordKey(nextCoord))
    if (!nextCell) {
      this.characterMoveStatus = {
        direction,
        accepted: false,
        blockedReason: "outside_map",
      }
      this.refreshInfo()
      return false
    }
    if (nextCell.blocked || stateForCell(nextCell) === "blocked") {
      this.characterMoveStatus = {
        direction,
        accepted: false,
        blockedReason: "blocked_tile",
      }
      this.drawOverlay()
      this.refreshInfo()
      return false
    }

    const fromPosition = this.characterPosition ?? centerFor(fromCoord, this.context)
    const toPosition = centerFor(nextCoord, this.context)
    const destinationLinks = dungeonLinksForCell(nextCell).map(dungeonLinkInfo)
    const destinationLabel = labelForCoord(nextCoord, this.context) ?? "Unknown tile"
    const destinationState = stateForCell(nextCell)
    const destinationTerrain = terrainForCell(nextCell)
    const exposureRisk = exposureRiskForCell(nextCell)
    const travelEvent: AddCharacterTravelEvent = {
      direction,
      fromCoord,
      toCoord: nextCoord,
      fromCell: displayCell(fromCoord),
      toCell: displayCell(nextCoord),
      destinationLabel,
      destinationState,
      destinationTerrain,
      exposureRisk,
      dungeonLinksAtDestination: destinationLinks,
    }

    this.travelPromptLocked = true
    let approved = true
    try {
      approved = (await this.hostOptions.onBeforeCharacterTravel?.(travelEvent)) !== false
    } finally {
      this.travelPromptLocked = false
    }
    if (!approved) {
      this.characterMoveStatus = {
        direction,
        accepted: false,
        blockedReason: "travel_declined",
      }
      this.drawOverlay()
      this.refreshInfo()
      return false
    }

    this.characterCoord = nextCoord
    this.characterPosition = fromPosition
    this.characterTarget = toPosition
    this.characterTravel = {
      direction,
      fromCell: displayCell(fromCoord),
      toCell: displayCell(nextCoord),
      destinationLabel,
      destinationState,
      destinationTerrain,
      exposureRisk,
      startedAtMs: this.time.now,
      durationMs: ADD_TILE_TRAVEL_PRESENTATION.durationMs,
      fromPosition,
      toPosition,
    }
    this.selectedCoord = nextCoord
    this.characterMoveStatus = {
      direction,
      accepted: true,
      blockedReason: null,
    }
    this.drawOverlay()
    this.refreshInfo()
    this.hostOptions.onCharacterTravel?.(travelEvent)
    return true
  }

  setTravelLocked(locked: boolean): void {
    this.travelRuntimeLocked = locked
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

    const mapChanged = this.lastRenderedMapId !== map.id
    if (mapChanged) {
      this.hoveredCoord = null
      this.selectedCoord = null
      this.characterCoord = null
      this.characterPosition = null
      this.characterTarget = null
      this.cameraInitialized = false
      this.lastRenderedMapId = map.id
      this.transitionState = "entering"
      this.transitionProgress = 0
    }

    this.context = createRenderContext(map, this.scale.width, this.scale.height)
    this.drawTerrain(this.context)
    this.drawAmbience(this.context)
    this.drawLandmarks(this.context)
    this.syncMainCharacter(this.context, mapChanged)
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
        this.drawSquareTerrainCell(graphics, cell, context, center, style)
        continue
      }

      this.drawHexTerrainCell(graphics, cell, context, center, style)
    }
  }

  private drawSquareTerrainCell(
    graphics: Phaser.GameObjects.Graphics,
    cell: GameCellPlacement,
    context: RenderContext,
    center: Vector2,
    style: CellStyle,
  ): void {
    const topLeft = squareTopLeftFor(cell.coord as SquareCoord, context)
    const cellSize = squareCellSize(context)
    const state = stateForCell(cell)
    const terrain = terrainForCell(cell)

    graphics.fillStyle(style.shadow, state === "blocked" ? 0.24 : 0.13)
    graphics.fillRect(topLeft.x + 2.8, topLeft.y + 4.2, cellSize - 3.4, cellSize - 3.4)
    graphics.fillStyle(style.fill, style.alpha)
    graphics.fillRect(topLeft.x + 1.2, topLeft.y + 1.2, cellSize - 2.4, cellSize - 2.4)

    graphics.fillStyle(style.highlight, state === "inactive" ? 0.08 : 0.14)
    graphics.fillRect(topLeft.x + 3.8, topLeft.y + 3.8, cellSize - 7.6, Math.max(5, cellSize * 0.28))

    if (state === "stabilized" || state === "converting") {
      graphics.fillStyle(style.accent, state === "stabilized" ? 0.12 : 0.18)
      graphics.fillRect(topLeft.x + 5.4, topLeft.y + 5.4, cellSize - 10.8, cellSize - 10.8)
    }

    if (terrain === "dungeon_wall" || terrain === "base_wall") {
      graphics.lineStyle(1.2, 0x1f211d, 0.26)
      for (let offset = 7; offset < cellSize - 4; offset += 9) {
        graphics.lineBetween(topLeft.x + offset, topLeft.y + 4, topLeft.x + offset - 7, topLeft.y + cellSize - 5)
      }
    } else if (terrain === "dungeon_floor" || terrain === "base_floor") {
      graphics.lineStyle(1, style.stroke, 0.18)
      graphics.lineBetween(topLeft.x + 6, center.y, topLeft.x + cellSize - 6, center.y)
      graphics.lineBetween(center.x, topLeft.y + 6, center.x, topLeft.y + cellSize - 6)
    }

    graphics.lineStyle(1.2, style.stroke, state === "blocked" ? 0.72 : 0.42)
    graphics.strokeRect(topLeft.x + 1.2, topLeft.y + 1.2, cellSize - 2.4, cellSize - 2.4)
    if (state !== "inactive" && state !== "blocked") {
      graphics.fillStyle(style.accent, 0.52)
      graphics.fillCircle(center.x, center.y, 2.4)
    }
    if (hasDungeonLinks(cell)) this.drawDungeonLinkGlyph(graphics, center, cellSize * 0.62)
  }

  private drawHexTerrainCell(
    graphics: Phaser.GameObjects.Graphics,
    cell: GameCellPlacement,
    context: RenderContext,
    center: Vector2,
    style: CellStyle,
  ): void {
    const radius = context.map.topology.kind === "hex" ? context.map.topology.radius : DEFAULT_RADIUS
    const state = stateForCell(cell)
    const progress = progressForCell(cell)
    const edge = context.bubbleEdgeCoords.has(coordKey(cell.coord))

    drawHexPath(graphics, { x: center.x + 2, y: center.y + 4 }, radius - 1.2)
    graphics.fillStyle(style.shadow, state === "inactive" ? 0.10 : 0.18)
    graphics.fillPath()
    drawHexPath(graphics, center, radius - 1.2)
    graphics.fillStyle(style.fill, style.alpha)
    graphics.fillPath()
    drawHexPath(graphics, { x: center.x - 2, y: center.y - 2 }, radius - 7)
    graphics.fillStyle(style.highlight, state === "inactive" ? 0.08 : 0.15)
    graphics.fillPath()

    if (state === "stabilized" || state === "converting") {
      drawHexPath(graphics, center, radius - 4)
      graphics.fillStyle(style.accent, state === "stabilized" ? 0.20 : 0.08 + progress * 0.30)
      graphics.fillPath()
    }

    this.drawTerrainMotif(graphics, cell, center, radius, style)
    drawHexPath(graphics, center, radius - (edge ? 2.2 : 1.2))
    graphics.lineStyle(edge ? 2.4 : 1.2, edge ? 0x45c8ff : style.stroke, edge ? 0.88 : 0.52)
    graphics.strokePath()

    if (state !== "inactive" && state !== "blocked") {
      graphics.fillStyle(edge ? 0x45c8ff : style.accent, edge ? 0.82 : 0.48)
      graphics.fillCircle(center.x, center.y, edge ? 3.8 : 2.4)
    }
    if (hasDungeonLinks(cell)) this.drawDungeonLinkGlyph(graphics, center, radius * 0.86)
  }

  private drawDungeonLinkGlyph(
    graphics: Phaser.GameObjects.Graphics,
    center: Vector2,
    size: number,
  ): void {
    const width = Math.max(11, size * 0.42)
    const height = Math.max(12, size * 0.48)
    const y = center.y + size * 0.08
    graphics.fillStyle(0x1e1612, 0.34)
    graphics.fillEllipse(center.x, y + height * 0.54, width * 1.45, height * 0.42)
    graphics.fillStyle(0x9b5637, 0.88)
    graphics.fillTriangle(
      center.x - width * 0.62,
      y + height * 0.12,
      center.x,
      y - height * 0.58,
      center.x + width * 0.62,
      y + height * 0.12,
    )
    graphics.fillRect(center.x - width * 0.55, y + height * 0.04, width * 1.1, height * 0.54)
    graphics.lineStyle(2.2, 0x4b2a1d, 0.82)
    graphics.strokeTriangle(
      center.x - width * 0.62,
      y + height * 0.12,
      center.x,
      y - height * 0.58,
      center.x + width * 0.62,
      y + height * 0.12,
    )
    graphics.strokeRect(center.x - width * 0.55, y + height * 0.04, width * 1.1, height * 0.54)
    graphics.fillStyle(0x241611, 0.78)
    graphics.fillEllipse(center.x, y + height * 0.18, width * 0.54, height * 0.55)
    graphics.lineStyle(1.2, 0xf0b95d, 0.55)
    graphics.strokeEllipse(center.x, y + height * 0.18, width * 0.62, height * 0.64)
  }

  private drawTerrainMotif(
    graphics: Phaser.GameObjects.Graphics,
    cell: GameCellPlacement,
    center: Vector2,
    radius: number,
    style: CellStyle,
  ): void {
    const terrain = terrainForCell(cell)
    if (terrain === "river") {
      graphics.lineStyle(3.2, 0xc8ecf0, 0.52)
      graphics.lineBetween(center.x - radius * 0.45, center.y + 3, center.x + radius * 0.36, center.y - 4)
      graphics.lineStyle(1.4, 0x508fa4, 0.56)
      graphics.lineBetween(center.x - radius * 0.5, center.y + 7, center.x + radius * 0.42, center.y)
      return
    }
    if (terrain === "scrub") {
      graphics.fillStyle(0x7d8c55, 0.45)
      graphics.fillCircle(center.x - 7, center.y + 4, 2.3)
      graphics.fillCircle(center.x + 6, center.y - 3, 1.9)
      graphics.fillCircle(center.x + 2, center.y + 8, 1.6)
      return
    }
    if (terrain === "ridge" || terrain === "mountain") {
      graphics.lineStyle(1.4, 0x6e604e, 0.42)
      graphics.lineBetween(center.x - 9, center.y + 6, center.x, center.y - 8)
      graphics.lineBetween(center.x, center.y - 8, center.x + 9, center.y + 5)
      if (terrain === "mountain") {
        graphics.fillStyle(0xf0ead0, 0.42)
        graphics.fillTriangle(center.x - 3, center.y - 3, center.x, center.y - 8, center.x + 3, center.y - 3)
      }
      return
    }
    if (stateForCell(cell) === "blocked") {
      graphics.lineStyle(1, style.stroke, 0.25)
      graphics.lineBetween(center.x - 9, center.y - 5, center.x + 9, center.y + 5)
      graphics.lineBetween(center.x - 8, center.y + 6, center.x + 8, center.y - 6)
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

  private syncMainCharacter(context: RenderContext, forceReset: boolean): void {
    const currentValid =
      this.characterCoord?.kind === context.topologyKind &&
      context.terrainByCoord.has(coordKey(this.characterCoord))
    if (forceReset || !currentValid) {
      this.characterCoord = initialCharacterCoord(context)
      this.characterMoveStatus = {
        direction: null,
        accepted: null,
        blockedReason: null,
      }
    }

    if (!this.characterCoord) return
    const center = centerFor(this.characterCoord, context)
    if (!this.characterPosition || forceReset) {
      this.characterPosition = center
    }
    this.characterTarget = center
    this.ensureMainCharacterObjects()
    this.updateMainCharacterObjects()
  }

  private updateMainCharacter(delta: number): void {
    if (!this.context) return
    this.syncMainCharacter(this.context, false)
    if (!this.characterPosition || !this.characterTarget) return

    if (this.characterTravel) {
      const rawProgress = clamp(
        (this.time.now - this.characterTravel.startedAtMs) / this.characterTravel.durationMs,
        0,
        1,
      )
      const eased = smoothStep(rawProgress)
      this.characterPosition = {
        x: Phaser.Math.Linear(
          this.characterTravel.fromPosition.x,
          this.characterTravel.toPosition.x,
          eased,
        ),
        y: Phaser.Math.Linear(
          this.characterTravel.fromPosition.y,
          this.characterTravel.toPosition.y,
          eased,
        ),
      }
      if (rawProgress >= 1) {
        this.characterPosition = this.characterTravel.toPosition
        this.characterTravel = null
      }
      this.updateMainCharacterObjects()
      return
    }

    const distance = distanceBetween(this.characterPosition, this.characterTarget)
    if (distance <= 0.25) {
      this.characterPosition = this.characterTarget
      this.updateMainCharacterObjects()
      return
    }

    const travel = Math.min(1, delta / 145)
    this.characterPosition = {
      x: Phaser.Math.Linear(this.characterPosition.x, this.characterTarget.x, travel),
      y: Phaser.Math.Linear(this.characterPosition.y, this.characterTarget.y, travel),
    }
    this.updateMainCharacterObjects()
  }

  private ensureMainCharacterObjects(): void {
    if (this.characterObjects) return

    const shadow = this.add.ellipse(0, 0, 24, 8, 0x101815, 0.25)
    const body = this.add.ellipse(0, 0, 18, 22, 0x2f7d68, 0.98)
    const head = this.add.ellipse(0, 0, 12, 12, 0xf1d0a5, 0.98)
    const scarf = this.add.triangle(0, 0, 0, -8, 14, 0, 0, 8, 0xe6a84e, 0.96)
    const label = this.add.text(0, 0, "Hero", {
      color: "#16221e",
      fontFamily: "Aptos, Segoe UI, sans-serif",
      fontSize: "12px",
      fontStyle: "800",
      align: "center",
      backgroundColor: "rgba(255, 250, 226, 0.9)",
      stroke: "rgba(255, 255, 255, 0.54)",
      strokeThickness: 2,
      padding: { x: 6, y: 3 },
    })
    setCrispText(label)
    label.setOrigin(0.5, 0.5)

    shadow.setDepth(44)
    body.setDepth(45)
    head.setDepth(46)
    scarf.setDepth(47)
    label.setDepth(48)
    this.characterObjects = { shadow, body, head, scarf, label }
  }

  private updateMainCharacterObjects(): void {
    if (!this.characterObjects || !this.characterPosition) return
    const { x, y } = this.characterPosition
    const bob = Math.sin(this.frameCount / 5) * (this.characterIsMoving() ? 1.8 : 0.5)
    this.characterObjects.shadow.setPosition(x, y + 14)
    this.characterObjects.body.setPosition(x, y + 2 + bob)
    this.characterObjects.head.setPosition(x, y - 12 + bob)
    this.characterObjects.scarf.setPosition(x + 7, y + 1 + bob)
    this.characterObjects.label.setPosition(x, y - 36 + bob * 0.35)
  }

  private characterIsMoving(): boolean {
    if (this.characterTravel) return true
    if (!this.characterPosition || !this.characterTarget) return false
    return distanceBetween(this.characterPosition, this.characterTarget) > 0.35
  }

  private drawFlora(center: Vector2, entity: GameEntity): void {
    const scrub = (entity.tags ?? []).includes("scrub")
    const shadow = this.add.ellipse(center.x, center.y + 8, 13, 5, 0x1d2118, 0.14)
    const trunk = this.add.rectangle(center.x, center.y + 4, 3, 10, scrub ? 0x8f5c35 : 0x6b573f, 0.72)
    const crown = this.add.ellipse(center.x, center.y - 1, scrub ? 11 : 13, scrub ? 7 : 11, scrub ? 0xa97745 : 0x5f946f, 0.78)
    const highlight = this.add.ellipse(center.x - 3, center.y - 4, 4, 3, 0xe2d7a3, 0.20)
    ;[shadow, trunk, crown, highlight].forEach((object, index) => object.setDepth(18 + index))
    this.landmarkObjects.push(shadow, trunk, crown, highlight)
  }

  private drawLandmark(center: Vector2, entity: GameEntity): void {
    const sourceId = String(entity.metadata?.sourceId ?? "")
    const isCave = sourceId.includes("cave")
    const isFixture = (entity.tags ?? []).includes("fixture")
    const isBase = !isFixture && (sourceId.includes("base") || sourceId.includes("crystal_circle"))
    const isCrystal = sourceId.includes("crystal")
    const isDoor = sourceId.includes("door") || sourceId.includes("gate") || sourceId.includes("exit")
    const radius = isCave ? 13 : isBase ? 15 : 11
    const fill = isCave ? 0x8a4c2f : isBase ? 0x2f7d68 : 0xa05f2d
    const stroke = isCave ? 0x432315 : isBase ? 0x114538 : 0x5f371d
    const shadow = this.add.ellipse(center.x, center.y + 14, radius * 1.6, 7, 0x1f1b14, 0.18)
    shadow.setDepth(24)
    const markerPoints = isCave
      ? [0, -radius, radius, 0, 0, radius, -radius, 0]
      : isDoor
        ? [-radius * 0.72, radius, -radius * 0.72, -radius * 0.36, 0, -radius, radius * 0.72, -radius * 0.36, radius * 0.72, radius]
        : [0, -radius, radius * 0.9, -3, radius * 0.5, radius, -radius * 0.5, radius, -radius * 0.9, -3]
    const marker = this.add.polygon(center.x, center.y, markerPoints, fill, 0.96)
    marker.setStrokeStyle(2, stroke, 0.86)
    marker.setDepth(25)
    this.landmarkObjects.push(shadow, marker)

    if (isBase || isCrystal) {
      const glow = this.add.ellipse(center.x, center.y + 1, radius * 1.65, radius * 1.2, 0x84e4d3, isBase ? 0.15 : 0.22)
      const core = this.add.polygon(center.x, center.y - 3, [0, -9, 6, 0, 0, 11, -6, 0], isBase ? 0x7de5cb : 0x88d8ff, 0.94)
      glow.setDepth(23)
      core.setDepth(26)
      core.setStrokeStyle(1.4, 0xffffff, 0.58)
      this.landmarkObjects.push(glow, core)
    } else if (isCave) {
      const mouth = this.add.ellipse(center.x, center.y + 2, radius * 1.05, radius * 0.62, 0x2b1b14, 0.72)
      const ridge = this.add.arc(center.x, center.y - 1, radius * 0.82, 205, 335, false, 0xd28a52, 0.26)
      mouth.setDepth(26)
      ridge.setDepth(27)
      this.landmarkObjects.push(mouth, ridge)
    } else if (isDoor) {
      const seam = this.add.line(center.x, center.y + 2, 0, -8, 0, 10, 0x3b2b21, 0.7)
      seam.setDepth(27)
      this.landmarkObjects.push(seam)
    }

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
      backgroundColor: "rgba(255, 250, 226, 0.86)",
      stroke: "rgba(255, 255, 255, 0.42)",
      strokeThickness: 2,
      padding: { x: 6, y: 3 },
    })
    setCrispText(label)
    label.setShadow(0, 1, "rgba(255, 255, 255, 0.65)", 0, true, true)
    label.setOrigin(0.5, 0.5)
    label.setDepth(26)
    this.landmarkObjects.push(label)
  }

  private drawAmbience(context: RenderContext): void {
    const graphics = this.ambienceGraphics
    if (!graphics) return
    graphics.clear()
    if (context.terrainCells.length === 0) return

    const phase = this.frameCount / 42
    for (const cell of context.terrainCells) {
      const state = stateForCell(cell)
      if (state === "inactive" || state === "blocked") continue
      const center = centerFor(cell.coord, context)
      const seed = hashCoord(cell.coord)
      const drift = Math.sin(phase + seed * 0.07)
      const alpha = 0.08 + (seed % 7) * 0.012
      graphics.fillStyle(0xf6e8ad, alpha)
      graphics.fillCircle(center.x + ((seed % 9) - 4) + drift * 1.5, center.y - 10 + ((seed % 5) - 2), 1.2)
    }

    if (context.topologyKind === "hex") {
      graphics.lineStyle(1, 0x315f63, 0.05)
      for (let offset = -120; offset < this.scale.width + 180; offset += 44) {
        graphics.lineBetween(context.origin.x + offset, context.origin.y - 240, context.origin.x + offset + 180, context.origin.y + this.scale.height + 120)
      }
    }
  }

  private drawOverlay(): void {
    const graphics = this.overlayGraphics
    const context = this.context
    if (!graphics || !context) return
    graphics.clear()

    this.drawBubbleEffects(context)
    if (this.hoveredCoord) {
      this.drawSelectionCell(this.hoveredCoord, 0xffffff, 0.7, 2)
    }
    if (this.selectedCoord) {
      this.drawSelectionCell(this.selectedCoord, 0xe3a64a, 0.95, 3)
    }
    this.drawTransitionOverlay()
  }

  private drawBubbleEffects(context: RenderContext): void {
    const graphics = this.overlayGraphics
    if (!graphics || context.topologyKind !== "hex") return
    const radius = context.map.topology.kind === "hex" ? context.map.topology.radius : DEFAULT_RADIUS
    const pulse = (Math.sin(this.frameCount / 18) + 1) / 2

    for (const key of context.bubbleEdgeCoords) {
      const cell = context.terrainByCoord.get(key)
      if (!cell || cell.coord.kind !== "hex") continue
      const center = centerFor(cell.coord, context)
      drawHexPath(graphics, center, radius + 1.5 + pulse * 3.2)
      graphics.lineStyle(1.2, 0x63dcff, 0.20 + pulse * 0.20)
      graphics.strokePath()
      drawHexPath(graphics, center, radius - 5)
      graphics.fillStyle(0x7ee6ff, 0.035 + pulse * 0.035)
      graphics.fillPath()
    }
  }

  private drawTransitionOverlay(): void {
    const graphics = this.transitionGraphics
    if (!graphics) return
    graphics.clear()
    if (this.transitionState === "idle") return

    const remaining = 1 - this.transitionProgress
    graphics.fillStyle(0x0f1b18, 0.34 * remaining)
    graphics.fillRect(0, 0, this.scale.width, this.scale.height)
    graphics.fillStyle(0xf4dd99, 0.16 * remaining)
    graphics.fillRect(0, 0, this.scale.width, Math.max(4, this.scale.height * 0.08 * remaining))
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
    const focusCoord = initialCharacterCoord(context) ?? context.baseCoord
    const focus = focusCoord ? centerFor(focusCoord, context) : {
      x: minX + width / 2,
      y: minY + height / 2,
    }
    camera.setZoom(zoom)
    const visibleWidth = this.scale.width / zoom
    const visibleHeight = this.scale.height / zoom
    camera.setBounds(
      minX - visibleWidth / 2,
      minY - visibleHeight / 2,
      width + visibleWidth,
      height + visibleHeight,
    )
    camera.centerOn(focus.x, focus.y)
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

  private onKeyDown(event: KeyboardEvent): void {
    const key = characterMoveKeyForKeyboardKey(event.key)
    if (!key) return
    event.preventDefault()
    this.heldCharacterKeys.add(key)
    if (!event.repeat) this.pendingCharacterKeys.add(key)

    if (event.repeat) {
      return
    }

    this.scheduleCharacterMove()
  }

  private onKeyUp(event: KeyboardEvent): void {
    const key = characterMoveKeyForKeyboardKey(event.key)
    if (!key) return
    event.preventDefault()
    this.heldCharacterKeys.delete(key)
  }

  private scheduleCharacterMove(): void {
    if (this.pendingCharacterMoveTimer !== null) return
    this.pendingCharacterMoveTimer = window.setTimeout(() => {
      this.pendingCharacterMoveTimer = null
      this.executeCharacterMoveFromKeys()
    }, KEY_CHORD_DELAY_MS)
  }

  private executeCharacterMoveFromKeys(): void {
    const direction = directionForCharacterKeys(
      new Set([...this.pendingCharacterKeys, ...this.heldCharacterKeys]),
      this.context?.topologyKind ?? "hex",
    )
    this.pendingCharacterKeys.clear()
    if (!direction) return
    void this.moveMainCharacter(direction)
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
      dungeonLinks: {
        total: context.terrainCells.reduce(
          (count, cell) => count + dungeonLinksForCell(cell).length,
          0,
        ),
        cellsWithLinks: context.terrainCells.filter(hasDungeonLinks).length,
        selected: this.selectedCoord
          ? dungeonLinksForCoord(this.selectedCoord, context).map(dungeonLinkInfo)
          : [],
      },
      knownFacts: knownFactsInfo(context.terrainCells),
      character: {
        id: "add.entity.hero",
        label: "Hero",
        visible: this.characterCoord !== null && this.characterPosition !== null,
        coord: this.characterCoord ? displayCoord(this.characterCoord) : null,
        cell: this.characterCoord ? displayCell(this.characterCoord) : null,
        x: this.characterPosition ? round(this.characterPosition.x) : null,
        y: this.characterPosition ? round(this.characterPosition.y) : null,
        moving: this.characterIsMoving(),
        lastMoveDirection: this.characterMoveStatus.direction,
        lastMoveAccepted: this.characterMoveStatus.accepted,
        blockedReason: this.characterMoveStatus.blockedReason,
        dungeonLinksAtCell: this.characterCoord
          ? dungeonLinksForCoord(this.characterCoord, context).map(dungeonLinkInfo)
          : [],
        authority: "browser_navigation_triggers_rust_time",
      },
      travel: this.travelInfo(context),
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
      presentation: {
        terrainArt: "procedural_painterly_topology",
        bubbleEffects: "animated_halo_edge",
        landmarkSprites: "procedural_sprite_stack",
        labelRendering: "high_resolution_phaser_text",
        ambience: "subtle_motes_and_topographic_scan",
        transitionState: this.transitionState,
        transitionProgress: round(this.transitionProgress),
        responsiveLayout: this.scale.width < 640 || this.scale.height < 520 ? "mobile" : "desktop",
      },
    }
  }

  private travelInfo(context: RenderContext): AddPhaserMapInfo["travel"] {
    const previewCoord = this.selectedCoord ?? this.hoveredCoord
    const previewCell = previewCoord ? context.terrainByCoord.get(coordKey(previewCoord)) : null
    const previewAdjacent =
      this.characterCoord !== null && previewCoord !== null
        ? coordsAreAdjacent(this.characterCoord, previewCoord, context)
        : false
    const activeTravel = this.characterTravel
    const rawProgress = activeTravel
      ? clamp((this.time.now - activeTravel.startedAtMs) / activeTravel.durationMs, 0, 1)
      : 0

    return {
      costGameMinutes: ADD_TILE_TRAVEL_PRESENTATION.visibleGameMinutes,
      costRuntimeSeconds: ADD_TILE_TRAVEL_PRESENTATION.runtimeSeconds,
      presentationDurationMs: ADD_TILE_TRAVEL_PRESENTATION.durationMs,
      clockStepMs: ADD_TILE_TRAVEL_PRESENTATION.msPerVisibleMinute,
      active: activeTravel !== null || this.travelRuntimeLocked,
      progress: round(rawProgress),
      direction: activeTravel?.direction ?? this.characterMoveStatus.direction,
      fromCell: activeTravel?.fromCell ?? null,
      toCell: activeTravel?.toCell ?? null,
      destinationLabel: activeTravel?.destinationLabel ?? null,
      destinationState: activeTravel?.destinationState ?? null,
      destinationTerrain: activeTravel?.destinationTerrain ?? null,
      exposureRisk: activeTravel?.exposureRisk ?? null,
      previewCell: previewCoord ? displayCell(previewCoord) : null,
      previewLabel: previewCoord ? labelForCoord(previewCoord, context) : null,
      previewAdjacent,
      previewExposureRisk: previewCell ? exposureRiskForCell(previewCell) : null,
      blockedReason: this.characterMoveStatus.blockedReason,
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
  const baseCell = cells.find((cell) => isBaseFeature(featureForCell(cell)))
  if (baseCell?.coord.kind === "hex" && hexTopology) {
    const point = hexTopology.cellToWorld(baseCell.coord)
    return {
      x: width / 2 - point.x,
      y: height / 2 - point.y,
    }
  }
  if (baseCell?.coord.kind === "square" && squareTopology) {
    const point = squareTopology.cellToWorld(baseCell.coord)
    const offset = map.topology.kind === "square" ? map.topology.cellSize / 2 : 0
    return {
      x: width / 2 - point.x - offset,
      y: height / 2 - point.y - offset,
    }
  }

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

function styleForCell(cell: GameCellPlacement): CellStyle {
  const terrain = terrainForCell(cell)
  const state = stateForCell(cell)
  if (terrain === "unknown") {
    return {
      fill: 0x74786e,
      stroke: 0x4d514a,
      alpha: 0.42,
      accent: 0xa5a88f,
      highlight: 0xc3c8a9,
      shadow: 0x1a1d17,
    }
  }
  if (state === "blocked") {
    if (terrain === "dungeon_wall") return { fill: 0x4b453d, stroke: 0x2f2a25, alpha: 0.96, accent: 0x9a7651, highlight: 0x6b5f50, shadow: 0x17130f }
    if (terrain === "base_wall") return { fill: 0x53605b, stroke: 0x33413d, alpha: 0.96, accent: 0x9bb7a4, highlight: 0x748177, shadow: 0x18211f }
    return { fill: 0x7b6048, stroke: 0x59412f, alpha: 0.94, accent: 0xb58a5c, highlight: 0xa18467, shadow: 0x25180f }
  }

  const fill =
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
  const accent =
    terrain === "river"
      ? 0x5fb9d0
      : terrain === "scrub"
        ? 0xa58d4b
        : terrain === "ridge"
          ? 0x8c7660
          : terrain === "mountain"
            ? 0xded7c4
            : terrain === "dungeon_floor"
              ? 0xc8b889
              : terrain === "base_floor"
                ? 0x78b89a
                : 0x7cbf8c

  return {
    fill,
    stroke:
      terrain === "dungeon_floor"
        ? 0x6f6252
        : terrain === "base_floor"
          ? 0x748177
          : state === "inactive"
            ? 0x8a8c78
            : 0x5e715f,
    alpha: state === "inactive" ? 0.58 : 0.95,
    accent,
    highlight: 0xfff5d0,
    shadow: 0x1d2118,
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

function exposureRiskForCell(cell: GameCellPlacement): AddTravelExposureRisk {
  const knownRisk = stringMetadata(cell, "travelRisk")
  if (
    knownRisk === "studio" ||
    knownRisk === "safe_field" ||
    knownRisk === "fringe" ||
    knownRisk === "toxic" ||
    knownRisk === "unknown"
  ) {
    return knownRisk
  }
  const feature = featureForCell(cell)
  const state = stateForCell(cell)
  if (isBaseFeature(feature)) return "studio"
  if (state === "stabilized") return "safe_field"
  if (state === "converting") return "fringe"
  return "toxic"
}

function labelForCoord(coord: CellCoord, context: RenderContext): string | null {
  const cell = context.terrainByCoord.get(coordKey(coord))
  if (!cell) return null
  const dungeonLinks = dungeonLinksForCell(cell)
  const knownLabel = stringMetadata(cell, "label")
  const vagueTravelLabel = stringMetadata(cell, "vagueTravelLabel")
  if (knownLabel) {
    if (dungeonLinks.length === 0) return knownLabel
    return `${knownLabel} -> ${dungeonLinks.map((link) => link.label ?? link.id).join(", ")}`
  }
  if (vagueTravelLabel) return vagueTravelLabel

  const feature = featureForCell(cell)
  const baseLabel =
    feature === "base"
      ? "Studio"
      : feature === "base_core"
        ? "Base Core"
        : feature === "survivor_cave"
          ? "Survivor Cave"
          : feature !== "none"
            ? titleCase(feature)
            : `${titleCase(stateForCell(cell))} ${titleCase(terrainForCell(cell))}`

  if (dungeonLinks.length === 0) return baseLabel
  return `${baseLabel} -> ${dungeonLinks.map((link) => link.label ?? link.id).join(", ")}`
}

function knownFactsInfo(cells: readonly GameCellPlacement[]): AddPhaserMapInfo["knownFacts"] {
  let hiddenCells = 0
  let discoveredCells = 0
  let visibleCells = 0
  let staleCells = 0
  let exactTerrainKnownCells = 0
  let dynamicRiskKnownCells = 0
  let vagueTravelLabels = 0
  let sampleHiddenTravelLabel: string | null = null

  for (const cell of cells) {
    const visibilityState = stringMetadata(cell, "visibilityState")
    if (visibilityState === "hidden") hiddenCells += 1
    if (visibilityState === "discovered") discoveredCells += 1
    if (visibilityState === "visible") visibleCells += 1
    if (visibilityState === "stale") staleCells += 1
    if (cell.metadata?.exactTerrainKnown === true) exactTerrainKnownCells += 1
    if (cell.metadata?.dynamicRiskKnown === true) dynamicRiskKnownCells += 1

    const vagueLabel = stringMetadata(cell, "vagueTravelLabel")
    if (vagueLabel && visibilityState === "hidden") {
      vagueTravelLabels += 1
      if (!sampleHiddenTravelLabel) sampleHiddenTravelLabel = vagueLabel
    }
  }

  return {
    hiddenCells,
    discoveredCells,
    visibleCells,
    staleCells,
    exactTerrainKnownCells,
    dynamicRiskKnownCells,
    vagueTravelLabels,
    sampleHiddenTravelLabel,
  }
}

function initialCharacterCoord(context: RenderContext): CellCoord | null {
  const hero = context.map.entities.find((entity) => entity.kind === "hero" && entity.coord)
  if (
    hero?.coord &&
    hero.coord.kind === context.topologyKind &&
    context.terrainByCoord.has(coordKey(hero.coord))
  ) {
    return hero.coord
  }
  if (context.baseCoord && context.terrainByCoord.has(coordKey(context.baseCoord))) {
    return context.baseCoord
  }
  return (
    context.terrainCells.find((cell) => !cell.blocked && stateForCell(cell) !== "blocked")
      ?.coord ?? null
  )
}

function coordsAreAdjacent(a: CellCoord, b: CellCoord, context: RenderContext): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === "hex" && b.kind === "hex" && context.hexTopology) {
    return context.hexTopology.distance(a, b) === 1
  }
  if (a.kind === "square" && b.kind === "square" && context.squareTopology) {
    return context.squareTopology.distance(a, b) === 1
  }
  return false
}

function nextCharacterCoord(
  coord: CellCoord,
  direction: AddCharacterMoveDirection,
  context: RenderContext,
): CellCoord | null {
  if (coord.kind === "square" && context.squareTopology) {
    const next =
      direction === "up" || direction === "north_west"
        ? { kind: "square" as const, x: coord.x, y: coord.y - 1 }
        : direction === "right" || direction === "north_east"
          ? { kind: "square" as const, x: coord.x + 1, y: coord.y }
          : direction === "down" || direction === "south_east"
            ? { kind: "square" as const, x: coord.x, y: coord.y + 1 }
          : direction === "left" || direction === "south_west"
              ? { kind: "square" as const, x: coord.x - 1, y: coord.y }
              : null
    return next && context.squareTopology.inBounds(next) ? next : null
  }

  if (coord.kind === "hex" && context.hexTopology) {
    const next =
      direction === "up" || direction === "north_west"
        ? { kind: "hex" as const, q: coord.q, r: coord.r - 1 }
        : direction === "north_east"
          ? { kind: "hex" as const, q: coord.q + 1, r: coord.r - 1 }
          : direction === "right"
            ? { kind: "hex" as const, q: coord.q + 1, r: coord.r }
            : direction === "down" || direction === "south_east"
              ? { kind: "hex" as const, q: coord.q, r: coord.r + 1 }
              : direction === "south_west"
                ? { kind: "hex" as const, q: coord.q - 1, r: coord.r + 1 }
                : direction === "left"
                  ? { kind: "hex" as const, q: coord.q - 1, r: coord.r }
                  : null
    return next && context.hexTopology.inBounds(next) ? next : null
  }

  return null
}

function characterMoveKeyForKeyboardKey(key: string): AddCharacterMoveKey | null {
  switch (key) {
    case "ArrowUp":
    case "w":
    case "W":
      return "up"
    case "ArrowRight":
    case "d":
    case "D":
      return "right"
    case "ArrowDown":
    case "s":
    case "S":
      return "down"
    case "ArrowLeft":
    case "a":
    case "A":
      return "left"
    case "e":
    case "E":
      return "north_east"
    case "q":
    case "Q":
      return "south_west"
    default:
      return null
  }
}

function directionForCharacterKeys(
  keys: ReadonlySet<AddCharacterMoveKey>,
  topologyKind: AddTopologyKind,
): AddCharacterMoveDirection | null {
  const up = keys.has("up")
  const right = keys.has("right")
  const down = keys.has("down")
  const left = keys.has("left")

  if (topologyKind === "hex") {
    if (up && right) return "north_east"
    if (up && left) return "north_west"
    if (down && right) return "south_east"
    if (down && left) return "south_west"
    if (keys.has("north_east")) return "north_east"
    if (keys.has("south_west")) return "south_west"
    if (right) return "right"
    if (left) return "left"
    if (up) return "north_west"
    if (down) return "south_east"
    return null
  }

  if (up) return "up"
  if (right || keys.has("north_east")) return "right"
  if (down) return "down"
  if (left || keys.has("south_west")) return "left"
  return null
}

function hasDungeonLinks(cell: GameCellPlacement): boolean {
  return dungeonLinksForCell(cell).length > 0
}

function dungeonLinksForCell(cell: GameCellPlacement): readonly GameCellLink[] {
  return (cell.links ?? []).filter((link) => link.kind === "dungeon")
}

function dungeonLinksForCoord(
  coord: CellCoord,
  context: RenderContext,
): readonly GameCellLink[] {
  const cell = context.terrainByCoord.get(coordKey(coord))
  return cell ? dungeonLinksForCell(cell) : []
}

function dungeonLinkInfo(link: GameCellLink): AddDungeonLinkInfo {
  return {
    id: link.id,
    kind: link.kind,
    label: link.label ?? link.id,
    targetMapId: link.targetMapId,
    targetCoord: link.targetCoord ? displayCell(link.targetCoord) : null,
    enabled: link.enabled ?? true,
  }
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

function setCrispText(text: Phaser.GameObjects.Text): void {
  const deviceScale = typeof window === "undefined" ? 2 : Math.min(3, Math.max(2, window.devicePixelRatio || 2))
  const target = text as Phaser.GameObjects.Text & {
    setResolution?: (resolution: number) => Phaser.GameObjects.Text
  }
  target.setResolution?.(deviceScale)
}

function hashCoord(coord: CellCoord): number {
  const first = coord.kind === "hex" ? coord.q : coord.x
  const second = coord.kind === "hex" ? coord.r : coord.y
  const value = Math.imul(first + 97, 73856093) ^ Math.imul(second - 31, 19349663)
  return Math.abs(value)
}

function distanceBetween(a: Vector2, b: Vector2): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function numberMetadata(
  item: Pick<GameCellPlacement | GameMap, "metadata">,
  key: string,
): number | undefined {
  const value = item.metadata?.[key]
  return typeof value === "number" ? value : undefined
}

function stringMetadata(
  item: Pick<GameCellPlacement | GameMap, "metadata">,
  key: string,
): string | undefined {
  const value = item.metadata?.[key]
  return typeof value === "string" ? value : undefined
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

function smoothStep(value: number): number {
  const clamped = clamp(value, 0, 1)
  return clamped * clamped * (3 - 2 * clamped)
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
    dungeonLinks: {
      total: 0,
      cellsWithLinks: 0,
      selected: [],
    },
    knownFacts: {
      hiddenCells: 0,
      discoveredCells: 0,
      visibleCells: 0,
      staleCells: 0,
      exactTerrainKnownCells: 0,
      dynamicRiskKnownCells: 0,
      vagueTravelLabels: 0,
      sampleHiddenTravelLabel: null,
    },
    character: {
      id: "add.entity.hero",
      label: "Hero",
      visible: false,
      coord: null,
      cell: null,
      x: null,
      y: null,
      moving: false,
      lastMoveDirection: null,
      lastMoveAccepted: null,
      blockedReason: null,
      dungeonLinksAtCell: [],
      authority: "browser_navigation_triggers_rust_time",
    },
    travel: {
      costGameMinutes: ADD_TILE_TRAVEL_PRESENTATION.visibleGameMinutes,
      costRuntimeSeconds: ADD_TILE_TRAVEL_PRESENTATION.runtimeSeconds,
      presentationDurationMs: ADD_TILE_TRAVEL_PRESENTATION.durationMs,
      clockStepMs: ADD_TILE_TRAVEL_PRESENTATION.msPerVisibleMinute,
      active: false,
      progress: 0,
      direction: null,
      fromCell: null,
      toCell: null,
      destinationLabel: null,
      destinationState: null,
      destinationTerrain: null,
      exposureRisk: null,
      previewCell: null,
      previewLabel: null,
      previewAdjacent: false,
      previewExposureRisk: null,
      blockedReason: null,
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
    presentation: {
      terrainArt: "procedural_painterly_topology",
      bubbleEffects: "animated_halo_edge",
      landmarkSprites: "procedural_sprite_stack",
      labelRendering: "high_resolution_phaser_text",
      ambience: "subtle_motes_and_topographic_scan",
      transitionState: "idle",
      transitionProgress: 1,
      responsiveLayout: "desktop",
    },
  }
}
