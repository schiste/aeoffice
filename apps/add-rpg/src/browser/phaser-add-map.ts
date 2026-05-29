import Phaser from "phaser"
import {
  HexCellRenderer,
  HexLandmarkRenderer,
  HexZoneRenderer,
  type HexCellRenderInfo,
  type HexLandmarkRenderInfo,
  type HexZoneRenderInfo,
} from "@aedventure/game-renderer-phaser"
import {
  createHexTopology,
  type GridTopology,
  type HexCoord,
  type Vector2,
} from "@aedventure/game-topology"
import {
  validateGameWorld,
  type GameMap,
  type GameWorld,
} from "@aedventure/game-world"

export interface AddPhaserMapInfo {
  readonly hostedBy: "phaser"
  readonly ready: boolean
  readonly renderCount: number
  readonly mapId: string | null
  readonly validationValid: boolean
  readonly validationSummary: string
  readonly rendererType: string
  readonly cellInfo: HexCellRenderInfo
  readonly zoneInfo: HexZoneRenderInfo
  readonly landmarkInfo: HexLandmarkRenderInfo
}

export class AddRpgPhaserMapHost {
  private readonly scene: AddRpgHexScene
  private readonly game: Phaser.Game

  constructor(parent: HTMLElement) {
    this.scene = new AddRpgHexScene()
    this.game = new Phaser.Game({
      type: Phaser.WEBGL,
      parent,
      backgroundColor: "#e8dfc8",
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

  getInfo(): AddPhaserMapInfo {
    return this.scene.getInfo()
  }

  destroy(): void {
    this.game.destroy(true)
  }
}

class AddRpgHexScene extends Phaser.Scene {
  private cellRenderer?: HexCellRenderer
  private zoneRenderer?: HexZoneRenderer
  private landmarkRenderer?: HexLandmarkRenderer
  private pendingWorld?: GameWorld
  private ready = false
  private renderCount = 0
  private frameCount = 0
  private lastInfo: AddPhaserMapInfo = emptyMapInfo()

  constructor() {
    super("add-rpg-hex-map")
  }

  create(): void {
    this.cellRenderer = new HexCellRenderer(this)
    this.zoneRenderer = new HexZoneRenderer(this)
    this.landmarkRenderer = new HexLandmarkRenderer(this)
    this.ready = true
    this.cameras.main.setRoundPixels(false)
    this.renderPendingWorld()
  }

  renderWorld(world: GameWorld): void {
    this.pendingWorld = world
    this.renderPendingWorld()
  }

  advanceTime(milliseconds: number): void {
    this.frameCount += Math.max(1, Math.round(milliseconds / 16))
  }

  getInfo(): AddPhaserMapInfo {
    return this.lastInfo
  }

  private renderPendingWorld(): void {
    if (!this.ready || !this.pendingWorld) return

    const world = this.pendingWorld
    const validation = validateGameWorld(world)
    const map = world.maps.find((candidate) => candidate.id === world.activeMapId) ?? world.maps[0]
    if (!map || map.topology.kind !== "hex") {
      this.lastInfo = {
        ...emptyMapInfo(),
        ready: this.ready,
        validationValid: false,
        validationSummary: "ADD world did not contain a hex map.",
      }
      return
    }

    const topology = createHexTopology({
      radius: map.topology.radius,
      bounds: map.topology.bounds,
    })
    const origin = originForMap(map, topology, this.scale.width, this.scale.height)

    const cellInfo = this.cellRenderer!.render(map, topology, {
      origin,
      depth: 0,
      palette: {
        defaultFill: 0xdbd6b7,
        alternateFill: 0xa6c4bb,
        stroke: 0x6f735f,
        blockedFill: 0x7b6048,
        alpha: 0.96,
      },
    })
    const zoneInfo = this.zoneRenderer!.render(map, topology, {
      origin,
      depth: 12,
      fillColor: 0x2c8f71,
      strokeColor: 0x1f6954,
    })
    const landmarkInfo = this.landmarkRenderer!.render(map, topology, {
      origin,
      radius: map.topology.radius,
      depth: 30,
      fillColor: 0xa95f32,
      strokeColor: 0x4a2a18,
    })

    this.renderCount += 1
    this.fitCameraToHexMap(map, topology, origin)
    this.lastInfo = {
      hostedBy: "phaser",
      ready: true,
      renderCount: this.renderCount,
      mapId: map.id,
      validationValid: validation.valid,
      validationSummary: validation.summary,
      rendererType: rendererType(this.game.renderer.type),
      cellInfo,
      zoneInfo,
      landmarkInfo,
    }
  }

  private fitCameraToHexMap(
    map: GameMap,
    topology: GridTopology<HexCoord>,
    origin: Vector2,
  ): void {
    const centers = terrainHexes(map).map((coord) => {
      const point = topology.cellToWorld(coord)
      return { x: point.x + origin.x, y: point.y + origin.y }
    })
    if (centers.length === 0) return

    const radius = map.topology.kind === "hex" ? map.topology.radius : 28
    const minX = Math.min(...centers.map((point) => point.x)) - radius * 2
    const maxX = Math.max(...centers.map((point) => point.x)) + radius * 2
    const minY = Math.min(...centers.map((point) => point.y)) - radius * 2
    const maxY = Math.max(...centers.map((point) => point.y)) + radius * 2
    const width = Math.max(1, maxX - minX)
    const height = Math.max(1, maxY - minY)
    const zoom = Math.min(
      1.35,
      Math.max(0.72, Math.min(this.scale.width / width, this.scale.height / height) * 0.86),
    )

    this.cameras.main.setBounds(minX, minY, width, height)
    this.cameras.main.setZoom(zoom)
    this.cameras.main.centerOn(minX + width / 2, minY + height / 2)
  }
}

function originForMap(
  map: GameMap,
  topology: GridTopology<HexCoord>,
  width: number,
  height: number,
): Vector2 {
  const centers = terrainHexes(map).map((coord) => topology.cellToWorld(coord))
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

function terrainHexes(map: GameMap): readonly HexCoord[] {
  return map.layers
    .flatMap((layer) => layer.cells ?? [])
    .map((cell) => cell.coord)
    .filter((coord): coord is HexCoord => coord.kind === "hex")
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
    cellInfo: {
      source: "hex_cell_renderer",
      topology: "hex",
      layerCount: 0,
      cellCount: 0,
      blockedCellCount: 0,
      radius: 28,
      depth: 0,
    },
    zoneInfo: {
      source: "hex_zone_renderer",
      topology: "hex",
      zoneCount: 0,
      zoneCellCount: 0,
      depth: 20,
    },
    landmarkInfo: {
      source: "hex_landmark_renderer",
      topology: "hex",
      landmarkCount: 0,
      labelCount: 0,
      depth: 40,
    },
  }
}
