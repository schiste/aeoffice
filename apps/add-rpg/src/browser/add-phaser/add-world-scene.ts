import Phaser from "phaser"
import { TransitionRegistry } from "@aedventure/game-animation"
import type { CellCoord, SquareCoord, Vector2 } from "@aedventure/game-topology"
import { validateGameWorld, type GameCellPlacement, type GameEntity, type GameWorld } from "@aedventure/game-world"
import {
  GameMapCellRenderer,
  WorldCellInteractionRenderer,
  WorldEntityRenderer,
  type WorldCellInteractionAffordance,
  type WorldCellInteractionSelection,
  type WorldCellInteractionZone,
  type WorldEntityRenderState,
} from "@aedventure/game-renderer-phaser"
import {
  addMapCoordKey,
  createAddCellPresentationPolicy,
  createAddTopologyNavigationPolicy,
  createAddWorldInteractionPolicy,
  displayAddCell,
  displayAddCoord,
  dungeonLinkInfo,
  dungeonLinksForCell,
  knownFactsInfo,
  presentationVisibilityStateForCell,
  stringMetadata,
  tileInteractionDetailForCoord,
  visibilityInfo,
  visibilityStateForCell,
  type AddVisibilityRenderState,
} from "@aedventure/add-domain"

import { ADD_TILE_TRAVEL_PRESENTATION } from "../travel-presentation-timing"
import {
  characterMoveKeyForKeyboardKey,
  coordsAreAdjacent,
  directionForCharacterKeys,
  entryFacingForContext,
  initialCharacterCoord,
} from "./add-character-navigation"
import { inactiveTravelRevealPreview } from "./add-fog-renderer"
import { hashCoord, setCrispText } from "./add-landmark-renderer"
import {
  authorityInfo,
  dungeonLinksForCoord,
  emptyMapInfo,
  hasDungeonLinks,
  rendererType,
  tileInteractionVisibilitySamples,
  topologyInfo,
} from "./add-map-telemetry"
import {
  centerFor,
  clamp,
  createRenderContext,
  distanceBetween,
  round,
  sameCoord,
  smoothStep,
  squareCellSize,
  squareTopLeftFor,
  visualCellRadius,
} from "./add-render-context"
import { drawHexPath } from "./add-terrain-renderer"
import {
  DEFAULT_RADIUS,
  KEY_CHORD_DELAY_MS,
  MAX_ZOOM,
  MIN_ZOOM,
  REVEAL_TRANSITION_MS,
  TRAVEL_REVEAL_HALO_FEATHER_MULTIPLIER,
  TRAVEL_REVEAL_HALO_RADIUS_MULTIPLIER,
  TRAVEL_REVEAL_TRAIL_MS,
  VISIBILITY_POLISH,
  type AddCharacterMoveDirection,
  type AddCharacterMoveKey,
  type AddCharacterTravelEvent,
  type AddPhaserMapInfo,
  type AddRpgPhaserMapHostOptions,
  type CharacterMoveStatus,
  type CharacterTravelState,
  type RenderContext,
  type TravelRevealPreview,
  type TravelRevealTrailEntry,
} from "./types"

// How long a door takes to swing open/closed (presentation only).
const DOOR_SWING_MS = 300

interface DoorVisual {
  panel: Phaser.GameObjects.Rectangle
  coord: SquareCoord
  closedRot: number
  openRot: number
  open: boolean
}

export class AddRpgHexScene extends Phaser.Scene {
  private readonly hostOptions: AddRpgPhaserMapHostOptions
  private readonly cellPresentationPolicy = createAddCellPresentationPolicy()
  private readonly worldInteractionPolicy = createAddWorldInteractionPolicy()
  private readonly navigationPolicy = createAddTopologyNavigationPolicy()
  private cellRenderer?: GameMapCellRenderer
  private cellInteractionRenderer?: WorldCellInteractionRenderer
  private characterRenderer?: WorldEntityRenderer
  private ambienceGraphics?: Phaser.GameObjects.Graphics
  private fogGraphics?: Phaser.GameObjects.Graphics
  private transitionGraphics?: Phaser.GameObjects.Graphics
  private landmarkObjects: Phaser.GameObjects.GameObject[] = []
  private readonly doorVisuals = new Map<string, DoorVisual>()
  private readonly transitions = new TransitionRegistry()
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
  private previousVisibilityStates = new Map<string, AddVisibilityRenderState>()
  private revealTransitions = new Map<string, number>()
  private travelRevealTrail = new Map<string, TravelRevealTrailEntry>()
  private characterCoord: CellCoord | null = null
  private characterPosition: Vector2 | null = null
  private characterTarget: Vector2 | null = null
  private characterTravel: CharacterTravelState | null = null
  private characterFacing: AddCharacterMoveDirection = "down"
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
    this.cellRenderer = new GameMapCellRenderer(this)
    this.cellInteractionRenderer = new WorldCellInteractionRenderer(this)
    this.characterRenderer = new WorldEntityRenderer(this)
    this.ambienceGraphics = this.add.graphics()
    this.fogGraphics = this.add.graphics()
    this.transitionGraphics = this.add.graphics()
    this.ambienceGraphics.setDepth(10)
    this.fogGraphics.setDepth(12)
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
    this.drawFog(this.context)
    this.tickDoors()
    this.drawOverlay()
    this.refreshInfo()
  }

  renderWorld(world: GameWorld): void {
    this.pendingWorld = world
    this.renderPendingWorld(false)
  }

  advanceTime(milliseconds: number): void {
    this.frameCount += Math.max(1, Math.round(milliseconds / 16))
    if (this.context) this.drawFog(this.context)
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
    const nextCoord = this.navigationPolicy.nextCoord(
      this.characterCoord,
      { direction },
      this.context.map.topology,
    )
    if (!nextCoord) {
      this.characterMoveStatus = {
        direction,
        accepted: false,
        blockedReason: "unsupported_direction",
      }
      this.refreshInfo()
      return false
    }

    const nextCell = this.context.terrainByCoord.get(addMapCoordKey(nextCoord))
    if (!nextCell) {
      this.characterMoveStatus = {
        direction,
        accepted: false,
        blockedReason: "outside_map",
      }
      this.refreshInfo()
      return false
    }
    // Bumping a closed door opens it (authoritative toggle) instead of moving;
    // the next step enters once the new snapshot marks it open.
    if (nextCell.metadata?.door === true && nextCell.metadata?.doorOpen !== true) {
      this.characterFacing = direction
      this.characterMoveStatus = {
        direction,
        accepted: false,
        blockedReason: "opening_door",
      }
      this.hostOptions.onDoorToggle?.(nextCoord)
      this.drawOverlay()
      this.refreshInfo()
      return false
    }
    if (!this.navigationPolicy.canEnterCell(nextCell)) {
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
    const destinationDetail = tileInteractionDetailForCoord(nextCoord, this.context.terrainByCoord)
    const destinationInteraction = this.worldInteractionPolicy.interactionForCell(
      nextCoord,
      nextCell,
    )
    const destinationLinks = destinationDetail?.dungeonLinks ?? []
    const destinationLabel =
      destinationDetail?.label ?? destinationInteraction?.label ?? "Unknown region"
    const destinationState =
      destinationDetail?.state === "unknown" ? "inactive" : destinationDetail?.state ?? "inactive"
    const destinationTerrain = destinationDetail?.terrain ?? "unknown"
    const exposureRisk = destinationDetail?.exposureRisk ?? "unknown"
    const travelEvent: AddCharacterTravelEvent = {
      direction,
      fromCoord,
      toCoord: nextCoord,
      fromCell: displayAddCell(fromCoord),
      toCell: displayAddCell(nextCoord),
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
      fromCoord,
      toCoord: nextCoord,
      fromCell: displayAddCell(fromCoord),
      toCell: displayAddCell(nextCoord),
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
    this.characterFacing = direction
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
      this.previousVisibilityStates.clear()
      this.revealTransitions.clear()
      this.travelRevealTrail.clear()
      this.cellInteractionRenderer?.clear()
      this.characterRenderer?.clear()
      this.doorVisuals.forEach((visual) => visual.panel.destroy())
      this.doorVisuals.clear()
      this.transitions.clear()
    }

    this.context = createRenderContext(map, this.scale.width, this.scale.height)
    this.trackVisibilityTransitions(this.context)
    this.drawTerrain(this.context)
    this.drawAmbience(this.context)
    this.drawFog(this.context)
    this.drawLandmarks(this.context)
    this.syncDoors(this.context)
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
    this.cellRenderer?.render(context.map, {
      origin: context.origin,
      depth: 0,
      presentationPolicy: this.cellPresentationPolicy,
      layerKinds: ["terrain"],
      emphasizedCoordKeys: context.bubbleEdgeCoords,
      style: "painterly",
    })
  }

  private drawLandmarks(context: RenderContext): void {
    this.landmarkObjects.forEach((object) => object.destroy())
    this.landmarkObjects = []

    for (const entity of context.map.entities) {
      if (!entity.coord || entity.coord.kind !== context.topologyKind) continue
      if (entity.kind === "hero") continue
      const cell = context.terrainByCoord.get(addMapCoordKey(entity.coord))
      if (cell && !this.cellPresentationPolicy.cellVisible(cell)) continue

      const center = centerFor(entity.coord, context)
      if (entity.kind === "creature") {
        // Live creatures only render where currently visible, never remembered.
        if (cell && presentationVisibilityStateForCell(cell) !== "visible") continue
        this.drawCreature(center, entity, squareCellSize(context))
        continue
      }
      const tags = new Set(entity.tags ?? [])
      if (tags.has("flora")) {
        this.drawFlora(center, entity)
        continue
      }
      this.drawLandmark(center, entity)
    }
  }

  private drawCreature(center: Vector2, entity: GameEntity, cellSize: number): void {
    const visualFootprint = entity.visualFootprint
    const visualWidth =
      visualFootprint?.unit === "world"
        ? visualFootprint.width
        : (visualFootprint?.width ?? 1) * cellSize
    const visualHeight =
      visualFootprint?.unit === "world"
        ? visualFootprint.height
        : (visualFootprint?.height ?? 1) * cellSize
    const renderScale = entity.renderScale ?? 1
    const bodyRx = Math.max(3, visualWidth * renderScale * 0.42)
    const bodyRy = Math.max(2.4, visualHeight * renderScale * 0.32)
    const shadow = this.add.ellipse(center.x, center.y + bodyRy * 0.8, bodyRx * 1.6, bodyRy * 0.7, 0x14110c, 0.22)
    const body = this.add.ellipse(center.x, center.y, bodyRx * 2, bodyRy * 2, 0x5a5048, 0.95)
    body.setStrokeStyle(1, 0x2c261f, 0.85)
    const belly = this.add.ellipse(center.x, center.y + bodyRy * 0.35, bodyRx * 1.05, bodyRy * 0.8, 0x8a7d6c, 0.55)
    const eye = this.add.ellipse(center.x + bodyRx * 0.5, center.y - bodyRy * 0.2, 1.5, 1.5, 0x0f0b07, 0.9)
    ;[shadow, body, belly, eye].forEach((object, index) => object.setDepth(22 + index))
    this.landmarkObjects.push(shadow, body, belly, eye)
  }

  // Build/update persistent door panels from the map's door cells and start a
  // swing transition whenever a door's open state changed since the last render.
  private syncDoors(context: RenderContext): void {
    const cellSize = squareCellSize(context)
    const seen = new Set<string>()
    for (const cell of context.terrainCells) {
      if (cell.metadata?.door !== true || cell.coord.kind !== "square") continue
      const key = addMapCoordKey(cell.coord)
      seen.add(key)
      const open = cell.metadata?.doorOpen === true
      const center = centerFor(cell.coord, context)
      const geo = this.doorGeometry(cell.coord, center, cellSize, context)
      const existing = this.doorVisuals.get(key)
      if (!existing) {
        const panel = this.add.rectangle(geo.hingeX, geo.hingeY, geo.length, geo.thickness, 0x6e4a2c)
        panel.setOrigin(0, 0.5)
        panel.setStrokeStyle(2, 0x33230f, 0.9)
        panel.setDepth(22)
        panel.setRotation(open ? geo.openRot : geo.closedRot)
        this.doorVisuals.set(key, {
          panel,
          coord: cell.coord,
          closedRot: geo.closedRot,
          openRot: geo.openRot,
          open,
        })
      } else {
        existing.panel.setPosition(geo.hingeX, geo.hingeY)
        existing.panel.setSize(geo.length, geo.thickness)
        existing.closedRot = geo.closedRot
        existing.openRot = geo.openRot
        if (existing.open !== open) {
          // Swing from wherever the panel currently is to the new target angle.
          const current = this.transitions.value(
            `door:${key}`,
            this.time.now,
            existing.open ? existing.openRot : existing.closedRot,
          )
          this.transitions.begin(`door:${key}`, {
            from: current,
            to: open ? geo.openRot : geo.closedRot,
            durationMs: DOOR_SWING_MS,
            startedAt: this.time.now,
            easing: smoothStep,
          })
          existing.open = open
        }
      }
    }
    for (const [key, visual] of this.doorVisuals) {
      if (!seen.has(key)) {
        visual.panel.destroy()
        this.doorVisuals.delete(key)
        this.transitions.delete(`door:${key}`)
      }
    }
    this.tickDoors()
  }

  // Per-frame: ease each door toward its target angle and hide doors in fog.
  private tickDoors(): void {
    const now = this.time.now
    for (const [key, visual] of this.doorVisuals) {
      const targetRot = visual.open ? visual.openRot : visual.closedRot
      visual.panel.setRotation(this.transitions.value(`door:${key}`, now, targetRot))
      const cell = this.context?.terrainByCoord.get(addMapCoordKey(visual.coord))
      visual.panel.setVisible(cell ? presentationVisibilityStateForCell(cell) !== "hidden" : true)
    }
    this.transitions.prune(now)
  }

  // A door slab spans its doorway when closed and swings a quarter-turn open.
  private doorGeometry(
    coord: SquareCoord,
    center: Vector2,
    cellSize: number,
    context: RenderContext,
  ): { hingeX: number; hingeY: number; length: number; thickness: number; closedRot: number; openRot: number } {
    const isWall = (dx: number, dy: number): boolean => {
      const neighbor = context.terrainByCoord.get(
        addMapCoordKey({ kind: "square", x: coord.x + dx, y: coord.y + dy }),
      )
      return !neighbor || neighbor.blocked === true
    }
    const length = cellSize * 0.92
    const thickness = Math.max(3, cellSize * 0.16)
    const half = cellSize / 2
    // Walls north & south → passage runs E-W → slab spans N-S, hinged at the north jamb.
    if (isWall(0, -1) && isWall(0, 1)) {
      return { hingeX: center.x, hingeY: center.y - half, length, thickness, closedRot: Math.PI / 2, openRot: 0 }
    }
    // Otherwise the passage runs N-S → slab spans E-W, hinged at the west jamb.
    return { hingeX: center.x - half, hingeY: center.y, length, thickness, closedRot: 0, openRot: -Math.PI / 2 }
  }

  private syncMainCharacter(context: RenderContext, forceReset: boolean): void {
    const currentValid =
      this.characterCoord?.kind === context.topologyKind &&
      context.terrainByCoord.has(addMapCoordKey(this.characterCoord))
    if (forceReset || !currentValid) {
      this.characterCoord = initialCharacterCoord(context)
      this.characterMoveStatus = {
        direction: null,
        accepted: null,
        blockedReason: null,
      }
      const entryFacing = entryFacingForContext(context)
      if (entryFacing) this.characterFacing = entryFacing
    }

    if (!this.characterCoord) return
    const center = centerFor(this.characterCoord, context)
    if (!this.characterPosition || forceReset) {
      this.characterPosition = center
    }
    this.characterTarget = center
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

  private updateMainCharacterObjects(): void {
    if (!this.characterRenderer || !this.characterPosition) return
    this.characterRenderer.updateEntities([this.mainCharacterRenderState()], {
      frameCount: this.frameCount,
    })
  }

  private mainCharacterRenderState(): WorldEntityRenderState {
    return {
      id: "add-main-character",
      label: "Hero",
      position: this.characterPosition ?? { x: 0, y: 0 },
      facing: this.characterFacing,
      moving: this.characterIsMoving(),
      visible: true,
      depthBase: 44,
      appearance: {
        bodyFill: 0x2f7d68,
        bodyStroke: 0x145244,
        headFill: 0xf1d0a5,
        accentFill: 0xe6a84e,
        shadowFill: 0x101815,
        labelColor: "#16221e",
        labelBackgroundColor: "rgba(255, 250, 226, 0.9)",
        labelStroke: "rgba(255, 255, 255, 0.54)",
      },
    }
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
      this.drawCaveMouthSilhouette(center, radius)
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

  private drawCaveMouthSilhouette(center: Vector2, radius: number): void {
    const backShadow = this.add.ellipse(center.x, center.y + 6, radius * 1.55, radius * 0.86, 0x17120f, 0.42)
    const arch = this.add.polygon(
      center.x,
      center.y + 1,
      [
        -radius * 0.82,
        radius * 0.36,
        -radius * 0.62,
        -radius * 0.22,
        -radius * 0.26,
        -radius * 0.58,
        radius * 0.24,
        -radius * 0.58,
        radius * 0.62,
        -radius * 0.20,
        radius * 0.82,
        radius * 0.36,
      ],
      0x201512,
      0.88,
    )
    const mouth = this.add.ellipse(center.x, center.y + 4, radius * 1.04, radius * 0.60, 0x0b0d0c, 0.86)
    const innerFade = this.add.ellipse(center.x, center.y + 5, radius * 0.68, radius * 0.34, 0x000000, 0.54)
    const rim = this.add.arc(center.x, center.y - 1, radius * 0.86, 204, 336, false, 0xe1a46a, 0.34)
    const leftStone = this.add.ellipse(center.x - radius * 0.54, center.y + 5, radius * 0.28, radius * 0.44, 0x5b3524, 0.72)
    const rightStone = this.add.ellipse(center.x + radius * 0.52, center.y + 6, radius * 0.24, radius * 0.38, 0x6a3e29, 0.66)
    const threshold = this.add.line(center.x, center.y + radius * 0.46, -radius * 0.42, 0, radius * 0.42, 0, 0xf4c477, 0.22)
    ;[backShadow, arch, mouth, innerFade, rim, leftStone, rightStone, threshold].forEach(
      (object, index) => object.setDepth(25.5 + index * 0.08),
    )
    rim.setStrokeStyle(2.2, 0xe1a46a, 0.42)
    this.landmarkObjects.push(backShadow, arch, mouth, innerFade, rim, leftStone, rightStone, threshold)
  }

  private drawAmbience(context: RenderContext): void {
    const graphics = this.ambienceGraphics
    if (!graphics) return
    graphics.clear()
    if (context.terrainCells.length === 0) return

    const phase = this.frameCount / 42
    for (const cell of context.terrainCells) {
      if (!this.cellPresentationPolicy.cellVisible(cell)) continue
      const style = this.cellPresentationPolicy.cellStyle(cell)
      if (style.activity === "inactive" || style.activity === "blocked") continue
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

  private trackVisibilityTransitions(context: RenderContext): void {
    const nextStates = new Map<string, AddVisibilityRenderState>()
    for (const cell of context.terrainCells) {
      const key = addMapCoordKey(cell.coord)
      const current = visibilityStateForCell(cell)
      const previous = this.previousVisibilityStates.get(key)
      if (previous === "hidden" && current !== "hidden") {
        this.revealTransitions.set(key, this.time.now)
      }
      nextStates.set(key, current)
    }
    this.previousVisibilityStates = nextStates
  }

  private drawFog(context: RenderContext): void {
    const graphics = this.fogGraphics
    if (!graphics) return
    graphics.clear()
    const travelRevealPreview = this.travelRevealPreviewForContext(context)

    for (const cell of context.terrainCells) {
      const key = addMapCoordKey(cell.coord)
      const visibilityState =
        (this.cellPresentationPolicy.fogStyle(cell).state as AddVisibilityRenderState | undefined) ??
        presentationVisibilityStateForCell(cell)
      const travelRevealProgress = this.travelRevealProgressForCell(
        cell,
        context,
        travelRevealPreview,
      )
      if (visibilityState === "hidden") {
        if (travelRevealProgress > 0) {
          this.drawTravelRevealPreview(graphics, cell, context, travelRevealProgress)
        }
        continue
      }
      if (cell.coord.kind === "square") {
        this.drawSquareFogCell(graphics, cell, context, visibilityState, travelRevealProgress)
      } else {
        this.drawHexFogCell(graphics, cell, context, visibilityState, travelRevealProgress)
      }
      if (travelRevealProgress > 0 && visibilityState !== "visible") {
        this.drawTravelRevealPreview(graphics, cell, context, travelRevealProgress)
      }

      const revealStartedAt = this.revealTransitions.get(key)
      if (revealStartedAt === undefined) continue
      const progress = clamp((this.time.now - revealStartedAt) / REVEAL_TRANSITION_MS, 0, 1)
      this.drawRevealTransition(graphics, cell, context, progress)
      if (progress >= 1) this.revealTransitions.delete(key)
    }

    if (travelRevealPreview.active && travelRevealPreview.center) {
      this.drawTravelRevealHalo(graphics, context, travelRevealPreview)
    }
  }

  private drawSquareFogCell(
    graphics: Phaser.GameObjects.Graphics,
    cell: GameCellPlacement,
    context: RenderContext,
    visibilityState: AddVisibilityRenderState,
    travelRevealProgress: number,
  ): void {
    const topLeft = squareTopLeftFor(cell.coord as SquareCoord, context)
    const cellSize = squareCellSize(context)
    if (visibilityState === "visible") return
    const revealFade = 1 - smoothStep(travelRevealProgress) * 0.82

    if (visibilityState === "hidden") {
      graphics.fillStyle(0x0b1110, 0.18 * revealFade)
      graphics.fillRect(topLeft.x - 2.4, topLeft.y - 2.4, cellSize + 4.8, cellSize + 4.8)
      graphics.fillStyle(0x111817, 0.34 * revealFade)
      graphics.fillRect(topLeft.x - 0.4, topLeft.y - 0.4, cellSize + 0.8, cellSize + 0.8)
      graphics.fillStyle(0x111817, 0.66 * revealFade)
      graphics.fillRect(topLeft.x + 1.5, topLeft.y + 1.5, cellSize - 3, cellSize - 3)
      graphics.lineStyle(1.2, 0x9c9275, 0.16)
      graphics.strokeRect(topLeft.x + 5, topLeft.y + 5, cellSize - 10, cellSize - 10)
      return
    }

    const alpha = (visibilityState === "stale" ? 0.38 : 0.26) * (1 - travelRevealProgress * 0.58)
    graphics.fillStyle(0x2b302b, alpha * 0.34)
    graphics.fillRect(topLeft.x - 1.8, topLeft.y - 1.8, cellSize + 3.6, cellSize + 3.6)
    graphics.fillStyle(0x3f4039, alpha)
    graphics.fillRect(topLeft.x + 1.2, topLeft.y + 1.2, cellSize - 2.4, cellSize - 2.4)
    graphics.lineStyle(1, 0xf0dfac, 0.10)
    graphics.lineBetween(topLeft.x + 5, topLeft.y + 6, topLeft.x + cellSize - 5, topLeft.y + cellSize - 6)
  }

  private drawHexFogCell(
    graphics: Phaser.GameObjects.Graphics,
    cell: GameCellPlacement,
    context: RenderContext,
    visibilityState: AddVisibilityRenderState,
    travelRevealProgress: number,
  ): void {
    if (visibilityState === "visible") return

    const center = centerFor(cell.coord, context)
    const radius = context.map.topology.kind === "hex" ? context.map.topology.radius : DEFAULT_RADIUS
    const revealFade = 1 - smoothStep(travelRevealProgress) * 0.82
    if (visibilityState === "hidden") {
      drawHexPath(graphics, center, radius + 3.2)
      graphics.fillStyle(0x0a1110, 0.14 * revealFade)
      graphics.fillPath()
      drawHexPath(graphics, center, radius + 1.4)
      graphics.fillStyle(0x0c1413, 0.26 * revealFade)
      graphics.fillPath()
      drawHexPath(graphics, center, radius - 1.3)
      graphics.fillStyle(0x0f1716, 0.68 * revealFade)
      graphics.fillPath()
      drawHexPath(graphics, { x: center.x - radius * 0.12, y: center.y - radius * 0.10 }, radius * 0.42)
      graphics.lineStyle(1.3, 0xa89c78, 0.14)
      graphics.strokePath()
      graphics.fillStyle(0xf0e4b4, 0.10)
      graphics.fillCircle(center.x + radius * 0.30, center.y - radius * 0.24, 1.8)
      return
    }

    const alpha = (visibilityState === "stale" ? 0.40 : 0.27) * (1 - travelRevealProgress * 0.58)
    drawHexPath(graphics, center, radius + 2.5)
    graphics.fillStyle(0x262d2a, alpha * 0.30)
    graphics.fillPath()
    drawHexPath(graphics, center, radius - 1.5)
    graphics.fillStyle(0x3d4139, alpha)
    graphics.fillPath()
    drawHexPath(graphics, center, radius - 6)
    graphics.lineStyle(1.1, 0xf1dfaa, visibilityState === "stale" ? 0.13 : 0.09)
    graphics.strokePath()
  }

  private drawRevealTransition(
    graphics: Phaser.GameObjects.Graphics,
    cell: GameCellPlacement,
    context: RenderContext,
    progress: number,
  ): void {
    const eased = smoothStep(progress)
    const alpha = 1 - eased
    if (cell.coord.kind === "square") {
      const topLeft = squareTopLeftFor(cell.coord as SquareCoord, context)
      const cellSize = squareCellSize(context)
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

    const center = centerFor(cell.coord, context)
    const radius = context.map.topology.kind === "hex" ? context.map.topology.radius : DEFAULT_RADIUS
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

  private drawTravelRevealPreview(
    graphics: Phaser.GameObjects.Graphics,
    cell: GameCellPlacement,
    context: RenderContext,
    progress: number,
  ): void {
    const eased = smoothStep(progress)
    const pulse = Math.sin(eased * Math.PI)
    if (cell.coord.kind === "square") {
      const topLeft = squareTopLeftFor(cell.coord as SquareCoord, context)
      const cellSize = squareCellSize(context)
      const inset = cellSize * (0.34 - eased * 0.26)
      graphics.fillStyle(0xf8e4a4, 0.05 + pulse * 0.08)
      graphics.fillRect(topLeft.x + inset, topLeft.y + inset, cellSize - inset * 2, cellSize - inset * 2)
      graphics.lineStyle(1.4, 0xf5d36c, 0.24 + pulse * 0.32)
      graphics.strokeRect(topLeft.x + inset, topLeft.y + inset, cellSize - inset * 2, cellSize - inset * 2)
      return
    }

    const center = centerFor(cell.coord, context)
    const radius = context.map.topology.kind === "hex" ? context.map.topology.radius : DEFAULT_RADIUS
    drawHexPath(graphics, center, radius * (0.34 + eased * 0.62))
    graphics.fillStyle(0xf8e4a4, 0.04 + pulse * 0.07)
    graphics.fillPath()
    drawHexPath(graphics, center, radius * (0.42 + eased * 0.58))
    graphics.lineStyle(1.6, 0xf5d36c, 0.24 + pulse * 0.34)
    graphics.strokePath()
  }

  private drawTravelRevealHalo(
    graphics: Phaser.GameObjects.Graphics,
    context: RenderContext,
    preview: TravelRevealPreview,
  ): void {
    if (!preview.center) return
    const progressAlpha = smoothStep(clamp(preview.progress / 0.22, 0, 1))
    const pulse = (Math.sin(this.frameCount / 7) + 1) / 2
    const radius = preview.radius + preview.feather * 0.42 + pulse * 1.8
    graphics.fillStyle(0xf7dda0, 0.045 * progressAlpha)
    graphics.fillCircle(preview.center.x, preview.center.y, radius)
    graphics.lineStyle(1.6, 0xf5d36c, 0.20 * progressAlpha)
    graphics.strokeCircle(preview.center.x, preview.center.y, radius * 0.72)
    if (context.topologyKind === "hex") {
      graphics.lineStyle(1.1, 0xffffff, 0.10 * progressAlpha)
      graphics.strokeCircle(preview.center.x, preview.center.y, radius * 0.42)
    }
  }

  private travelRevealPreviewForContext(context: RenderContext): TravelRevealPreview {
    const travel = this.characterTravel
    const characterCenter = this.characterPosition
    if (!travel || !characterCenter || travel.toCoord.kind !== context.topologyKind) {
      return inactiveTravelRevealPreview()
    }

    const baseRadius = visualCellRadius(context)
    const haloRadius = baseRadius * TRAVEL_REVEAL_HALO_RADIUS_MULTIPLIER
    const haloFeather = baseRadius * TRAVEL_REVEAL_HALO_FEATHER_MULTIPLIER
    const cells = new Set<string>()
    for (const cell of context.terrainCells) {
      const cellCenter = centerFor(cell.coord, context)
      const distance = distanceBetween(characterCenter, cellCenter)
      if (distance <= haloRadius + haloFeather) cells.add(addMapCoordKey(cell.coord))
    }

    return {
      active: true,
      progress: this.currentTravelProgress(),
      cells,
      destinationCell: displayAddCell(travel.toCoord),
      center: characterCenter,
      radius: haloRadius,
      feather: haloFeather,
    }
  }

  private travelRevealProgressForCell(
    cell: GameCellPlacement,
    context: RenderContext,
    preview: TravelRevealPreview,
  ): number {
    const key = addMapCoordKey(cell.coord)
    let liveProgress = 0

    if (preview.active && preview.cells.has(key) && this.characterTravel && preview.center) {
      const cellCenter = centerFor(cell.coord, context)
      const distance = distanceBetween(preview.center, cellCenter)
      const haloCoverage = clamp(
        (preview.radius + preview.feather - distance) / Math.max(1, preview.feather),
        0,
        1,
      )
      liveProgress =
        smoothStep(haloCoverage) * smoothStep(clamp(preview.progress / 0.18, 0, 1))
    }

    return this.blendTravelRevealTrail(key, liveProgress)
  }

  private blendTravelRevealTrail(key: string, liveProgress: number): number {
    const existing = this.travelRevealTrail.get(key)

    if (liveProgress > 0) {
      this.travelRevealTrail.set(key, {
        strength: liveProgress,
        updatedAtMs: this.time.now,
      })
      return liveProgress
    }

    if (!existing) return 0

    const elapsedMs = this.time.now - existing.updatedAtMs
    if (elapsedMs >= TRAVEL_REVEAL_TRAIL_MS) {
      this.travelRevealTrail.delete(key)
      return 0
    }

    const trailProgress = clamp(elapsedMs / TRAVEL_REVEAL_TRAIL_MS, 0, 1)
    const trailStrength = existing.strength * (1 - smoothStep(trailProgress))
    if (trailStrength <= 0.015) {
      this.travelRevealTrail.delete(key)
      return 0
    }
    return trailStrength
  }

  private currentTravelProgress(): number {
    if (!this.characterTravel) return 0
    return clamp(
      (this.time.now - this.characterTravel.startedAtMs) / this.characterTravel.durationMs,
      0,
      1,
    )
  }

  private drawOverlay(): void {
    const context = this.context
    if (!context) return
    this.cellInteractionRenderer?.render(context.map, {
      origin: context.origin,
      depth: 30,
      frameCount: this.frameCount,
      presentationPolicy: this.cellPresentationPolicy,
      zones: this.interactionZoneRenderStates(context),
      affordances: this.interactionAffordanceRenderStates(context),
      selections: this.interactionSelectionRenderStates(),
    })
    this.drawTransitionOverlay()
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

  private interactionSelectionRenderStates(): readonly WorldCellInteractionSelection[] {
    const selections: WorldCellInteractionSelection[] = []
    if (this.hoveredCoord && !sameCoord(this.hoveredCoord, this.selectedCoord)) {
      selections.push({
        coord: this.hoveredCoord,
        kind: "hover",
        color: 0xffffff,
        alpha: 0.7,
        lineWidth: 2,
      })
    }
    if (this.selectedCoord) {
      selections.push({
        coord: this.selectedCoord,
        kind: "selection",
        color: 0xe3a64a,
        alpha: 0.95,
        lineWidth: 3,
      })
    }
    return selections
  }

  private interactionZoneRenderStates(
    context: RenderContext,
  ): readonly WorldCellInteractionZone[] {
    return [...context.bubbleEdgeCoords]
      .map((key) => context.terrainByCoord.get(key))
      .filter((cell): cell is GameCellPlacement => Boolean(cell))
      .map((cell) => ({
        id: `bubble-edge:${addMapCoordKey(cell.coord)}`,
        coord: cell.coord,
        kind: "boundary",
        color: 0x63dcff,
        alpha: 0.20,
      }))
  }

  private interactionAffordanceRenderStates(
    context: RenderContext,
  ): readonly WorldCellInteractionAffordance[] {
    const affordances: WorldCellInteractionAffordance[] = []
    for (const cell of context.terrainCells) {
      if (!hasDungeonLinks(cell)) continue
      const links = dungeonLinksForCoord(cell.coord, context).map(dungeonLinkInfo)
      affordances.push({
        id: `portal:${addMapCoordKey(cell.coord)}`,
        coord: cell.coord,
        kind: "portal",
        label: links.map((link) => link.label).join(", ") || "Linked area",
        actionLabel: "Enter",
        enabled: links.some((link) => link.enabled),
        emphasis: "subtle",
      })
    }

    const primaryCoord = this.selectedCoord ?? this.hoveredCoord
    if (!primaryCoord) return affordances
    const primaryCell = context.terrainByCoord.get(addMapCoordKey(primaryCoord))
    const primaryInteraction = this.worldInteractionPolicy.interactionForCell(
      primaryCoord,
      primaryCell,
    )
    if (!primaryInteraction) return affordances

    const portal = primaryInteraction.metadata?.dungeonActionsVisible === true
    affordances.push({
      id: `primary:${primaryInteraction.id}`,
      coord: primaryCoord,
      kind: portal ? "portal" : "inspect",
      label: primaryInteraction.label,
      actionLabel: portal ? "Enter" : "Inspect",
      enabled: primaryInteraction.enabled,
      emphasis: "primary",
      color: portal ? 0xe3a64a : 0x2f8f63,
    })
    return affordances
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

    // Shift turns the Hero in place to look around, without stepping.
    if (event.shiftKey) {
      this.characterFacing = key
      this.refreshInfo()
      return
    }

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
    const cell = context.terrainByCoord.get(addMapCoordKey(coord))
    return cell && this.cellPresentationPolicy.cellVisible(cell) ? coord : null
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
    const hoveredDetail = this.hoveredCoord
      ? tileInteractionDetailForCoord(this.hoveredCoord, context.terrainByCoord)
      : null
    const selectedDetail = this.selectedCoord
      ? tileInteractionDetailForCoord(this.selectedCoord, context.terrainByCoord)
      : null
    const selectedInteraction =
      this.selectedCoord && context.terrainByCoord.has(addMapCoordKey(this.selectedCoord))
        ? this.worldInteractionPolicy.interactionForCell(
            this.selectedCoord,
            context.terrainByCoord.get(addMapCoordKey(this.selectedCoord)),
          )
        : null
    const travelRevealPreview = this.travelRevealPreviewForContext(context)

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
      visibility: {
        ...visibilityInfo(
          context.terrainCells,
          this.revealTransitions.size,
          travelRevealPreview,
        ),
        hiddenCellRendering: "invisible_until_known_or_travel_revealed",
        fogRendering: "phaser_visual_overlay",
        affectsAuthority: false,
      },
      character: {
        id: "add.entity.hero",
        label: "Hero",
        visible: this.characterCoord !== null && this.characterPosition !== null,
        coord: this.characterCoord ? displayAddCoord(this.characterCoord) : null,
        cell: this.characterCoord ? displayAddCell(this.characterCoord) : null,
        x: this.characterPosition ? round(this.characterPosition.x) : null,
        y: this.characterPosition ? round(this.characterPosition.y) : null,
        moving: this.characterIsMoving(),
        facing: this.characterFacing,
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
        baseCenter: context.baseCoord ? displayAddCoord(context.baseCoord) : null,
        studioLabelVisible: context.baseCoord !== null,
        survivorCave: context.survivorCaveCoord ? displayAddCoord(context.survivorCaveCoord) : null,
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
        hoveredCell: this.hoveredCoord ? displayAddCell(this.hoveredCoord) : null,
        selectedCell: this.selectedCoord ? displayAddCell(this.selectedCoord) : null,
        hoveredHex: this.hoveredCoord?.kind === "hex" ? displayAddCoord(this.hoveredCoord) : null,
        selectedHex: this.selectedCoord?.kind === "hex" ? displayAddCoord(this.selectedCoord) : null,
        selectedLabel: selectedDetail?.label ?? selectedInteraction?.label ?? null,
        hoveredDetail,
        selectedDetail,
        visibilitySamples: tileInteractionVisibilitySamples(context),
      },
      presentation: {
        terrainArt: "procedural_painterly_topology",
        bubbleEffects: "animated_halo_edge",
        landmarkSprites: "procedural_sprite_stack",
        labelRendering: "high_resolution_phaser_text",
        ambience: "subtle_motes_and_topographic_scan",
        visibilityPolish: VISIBILITY_POLISH,
        transitionState: this.transitionState,
        transitionProgress: round(this.transitionProgress),
        responsiveLayout: this.scale.width < 640 || this.scale.height < 520 ? "mobile" : "desktop",
      },
    }
  }

  private travelInfo(context: RenderContext): AddPhaserMapInfo["travel"] {
    const previewCoord = this.selectedCoord ?? this.hoveredCoord
    const previewCell = previewCoord ? context.terrainByCoord.get(addMapCoordKey(previewCoord)) : null
    const previewDetail = previewCoord
      ? tileInteractionDetailForCoord(previewCoord, context.terrainByCoord)
      : null
    const previewInteraction =
      previewCoord && previewCell
        ? this.worldInteractionPolicy.interactionForCell(previewCoord, previewCell)
        : null
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
      previewCell: previewCoord ? displayAddCell(previewCoord) : null,
      previewLabel: previewDetail?.label ?? previewInteraction?.label ?? null,
      previewAdjacent,
      previewExposureRisk: previewCell ? previewDetail?.exposureRisk ?? "unknown" : null,
      blockedReason: this.characterMoveStatus.blockedReason,
    }
  }
}
