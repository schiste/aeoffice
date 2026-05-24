import Phaser from "phaser"

interface Vector2 {
  readonly x: number
  readonly y: number
}

interface FixtureMap {
  readonly definition: {
    readonly style: string
  }
  readonly compiled: {
    readonly width: number
    readonly height: number
    readonly tileSize: number
    readonly layers: {
      readonly floor: TileLayer
      readonly walls: TileLayer
      readonly objects: TileLayer
    }
    readonly zones: readonly FixtureZone[]
  }
  readonly catalog: {
    readonly tokens: readonly FixtureToken[]
  }
}

interface TileLayer {
  readonly gids: readonly (readonly number[])[]
}

interface FixtureToken {
  readonly id: string
  readonly kind: "floor" | "wall" | "item" | "avatar"
  readonly provisionalGid: number
  readonly widthTiles: number
  readonly heightTiles: number
}

interface FixtureZone {
  readonly id: string
  readonly xStart: number
  readonly yStart: number
  readonly xEnd: number
  readonly yEnd: number
  readonly zoneType: string
}

interface CompanionState {
  readonly joined: boolean
  readonly position: Vector2
}

const TILESET_KEY = "semantic-fixture-tiles"
const TILESET_NAME = "semantic-fixture-tileset"
const PLAYER_MARKER_SIZE = 16

export class PhaserOfficeRenderer {
  private readonly scene: OfficeScene
  private readonly game: Phaser.Game
  private readonly ready: Promise<OfficeScene>
  private localPlayerPosition: Vector2 = { x: 96, y: 64 }
  private companionState: CompanionState = {
    joined: false,
    position: { x: 96, y: 96 },
  }

  constructor(parent: HTMLElement) {
    parent.classList.add("phaser-world-host")
    this.scene = new OfficeScene((scene) => {
      this.resolveReady(scene)
    })
    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve
    })
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: 384,
      height: 320,
      backgroundColor: "#e7edf0",
      banner: false,
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: this.scene,
    })
  }

  renderMap(fixtureMap: FixtureMap): void {
    void this.ready.then((scene) => {
      scene.renderFixtureMap(
        fixtureMap,
        this.localPlayerPosition,
        this.companionState,
      )
    })
  }

  updateLocalPlayer(position: Vector2): void {
    this.localPlayerPosition = position
    void this.ready.then((scene) => {
      scene.updateLocalPlayer(position)
    })
  }

  updateCompanion(state: CompanionState): void {
    this.companionState = state
    void this.ready.then((scene) => {
      scene.updateCompanion(state)
    })
  }

  async advanceTime(): Promise<void> {
    await this.ready
  }

  destroy(): void {
    this.game.destroy(true)
  }

  private resolveReady: (scene: OfficeScene) => void = () => undefined
}

class OfficeScene extends Phaser.Scene {
  private localPlayer?: Phaser.GameObjects.Ellipse
  private companion?: Phaser.GameObjects.Ellipse
  private zoneGraphics?: Phaser.GameObjects.Graphics
  private activeMap?: Phaser.Tilemaps.Tilemap

  constructor(private readonly onReady: (scene: OfficeScene) => void) {
    super({ key: "OfficeScene" })
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#e7edf0")
    this.onReady(this)
  }

  renderFixtureMap(
    fixtureMap: FixtureMap,
    localPlayerPosition: Vector2,
    companionState: CompanionState,
  ): void {
    const tileSize = fixtureMap.compiled.tileSize
    const widthInPixels = fixtureMap.compiled.width * tileSize
    const heightInPixels = fixtureMap.compiled.height * tileSize

    this.children.removeAll(true)
    this.activeMap = this.make.tilemap({
      tileWidth: tileSize,
      tileHeight: tileSize,
      width: fixtureMap.compiled.width,
      height: fixtureMap.compiled.height,
    })
    this.game.scale.resize(widthInPixels, heightInPixels)
    this.cameras.main.setBounds(0, 0, widthInPixels, heightInPixels)
    this.cameras.main.centerOn(widthInPixels / 2, heightInPixels / 2)

    const multiTileFillGids = createMultiTileFillGids(fixtureMap.catalog.tokens)

    this.installSemanticTileset(fixtureMap, multiTileFillGids)
    const tileset = this.activeMap.addTilesetImage(
      TILESET_NAME,
      TILESET_KEY,
      tileSize,
      tileSize,
      0,
      0,
      0,
    )

    if (!tileset) {
      throw new Error("Unable to create Phaser semantic tileset.")
    }

    const tokensByGid = new Map(
      fixtureMap.catalog.tokens.map((token) => [token.provisionalGid, token]),
    )

    this.paintTileLayer(
      "floor",
      fixtureMap.compiled.layers.floor,
      tileset,
      tokensByGid,
      multiTileFillGids,
      0,
    )
    this.paintTileLayer(
      "walls",
      fixtureMap.compiled.layers.walls,
      tileset,
      tokensByGid,
      multiTileFillGids,
      10,
    )
    this.paintTileLayer(
      "objects",
      fixtureMap.compiled.layers.objects,
      tileset,
      tokensByGid,
      multiTileFillGids,
      20,
    )
    this.renderZones(fixtureMap.compiled.zones, tileSize)
    this.localPlayer = this.createPlayerMarker(0xc8493c, "Local player")
    this.companion = this.createPlayerMarker(0x2f6fc8, "Demo companion")

    this.updateLocalPlayer(localPlayerPosition)
    this.updateCompanion(companionState)
  }

  updateLocalPlayer(position: Vector2): void {
    this.localPlayer?.setPosition(
      position.x + PLAYER_MARKER_SIZE / 2,
      position.y + PLAYER_MARKER_SIZE / 2,
    )
  }

  updateCompanion(state: CompanionState): void {
    if (!this.companion) return

    this.companion.setVisible(state.joined)
    this.companion.setPosition(
      state.position.x + PLAYER_MARKER_SIZE / 2,
      state.position.y + PLAYER_MARKER_SIZE / 2,
    )
  }

  private installSemanticTileset(
    fixtureMap: FixtureMap,
    multiTileFillGids: ReadonlyMap<number, number>,
  ): void {
    if (this.textures.exists(TILESET_KEY)) {
      this.textures.remove(TILESET_KEY)
    }

    const tileSize = fixtureMap.compiled.tileSize
    const maxGid = Math.max(
      0,
      ...fixtureMap.catalog.tokens.map((token) => token.provisionalGid),
      ...multiTileFillGids.values(),
    )
    const columns = Math.min(32, Math.max(1, Math.ceil(Math.sqrt(maxGid + 1))))
    const rows = Math.ceil((maxGid + 1) / columns)
    const canvas = document.createElement("canvas")
    canvas.width = columns * tileSize
    canvas.height = rows * tileSize
    const context = canvas.getContext("2d")

    if (!context) {
      throw new Error("Unable to create semantic tileset canvas.")
    }

    fixtureMap.catalog.tokens.forEach((token) => {
      const frameX = (token.provisionalGid % columns) * tileSize
      const frameY = Math.floor(token.provisionalGid / columns) * tileSize
      drawSemanticTile(context, token, frameX, frameY, tileSize, true)

      const fillGid = multiTileFillGids.get(token.provisionalGid)
      if (fillGid !== undefined) {
        const fillFrameX = (fillGid % columns) * tileSize
        const fillFrameY = Math.floor(fillGid / columns) * tileSize
        drawSemanticTile(context, token, fillFrameX, fillFrameY, tileSize, false)
      }
    })

    this.textures.addCanvas(TILESET_KEY, canvas)
  }

  private paintTileLayer(
    name: string,
    layer: TileLayer,
    tileset: Phaser.Tilemaps.Tileset,
    tokensByGid: ReadonlyMap<number, FixtureToken>,
    multiTileFillGids: ReadonlyMap<number, number>,
    depth: number,
  ): void {
    if (!this.activeMap) return

    const phaserLayer = this.activeMap.createBlankLayer(name, tileset)

    if (!phaserLayer) {
      throw new Error(`Unable to create Phaser tile layer ${name}.`)
    }

    phaserLayer.setDepth(depth)
    layer.gids.forEach((row, y) => {
      row.forEach((gid, x) => {
        if (gid <= 0) return
        const token = tokensByGid.get(gid)
        const widthTiles = token?.widthTiles ?? 1
        const heightTiles = token?.heightTiles ?? 1
        const fillGid = multiTileFillGids.get(gid) ?? gid

        for (let offsetY = 0; offsetY < heightTiles; offsetY += 1) {
          for (let offsetX = 0; offsetX < widthTiles; offsetX += 1) {
            const tileGid = offsetX === 0 && offsetY === 0 ? gid : fillGid
            phaserLayer.putTileAt(tileGid, x + offsetX, y + offsetY, false)
          }
        }
      })
    })
  }

  private renderZones(
    zones: readonly FixtureZone[],
    tileSize: number,
  ): void {
    this.zoneGraphics = this.add.graphics()
    this.zoneGraphics.setDepth(30)
    zones.forEach((zone) => {
      const x = zone.xStart * tileSize
      const y = zone.yStart * tileSize
      const width = (zone.xEnd - zone.xStart) * tileSize
      const height = (zone.yEnd - zone.yStart) * tileSize

      this.zoneGraphics?.fillStyle(0x2f7c83, 0.14)
      this.zoneGraphics?.fillRect(x, y, width, height)
      this.zoneGraphics?.lineStyle(2, 0x2f7c83, 0.72)
      this.zoneGraphics?.strokeRect(x, y, width, height)
    })
  }

  private createPlayerMarker(
    color: number,
    name: string,
  ): Phaser.GameObjects.Ellipse {
    const marker = this.add.ellipse(
      0,
      0,
      PLAYER_MARKER_SIZE,
      PLAYER_MARKER_SIZE,
      color,
      1,
    )
    marker.setName(name)
    marker.setDepth(40)
    marker.setStrokeStyle(2, 0xffffff, 1)
    return marker
  }
}

function drawSemanticTile(
  context: CanvasRenderingContext2D,
  token: FixtureToken,
  x: number,
  y: number,
  tileSize: number,
  showLabel: boolean,
): void {
  const style = styleForToken(token)
  context.fillStyle = style.fill
  context.fillRect(x, y, tileSize, tileSize)
  context.strokeStyle = style.stroke
  context.lineWidth = 1
  context.strokeRect(x + 0.5, y + 0.5, tileSize - 1, tileSize - 1)

  if (token.kind === "floor") {
    context.strokeStyle = "rgba(117, 79, 42, 0.22)"
    context.beginPath()
    context.moveTo(x, y + tileSize / 2)
    context.lineTo(x + tileSize, y + tileSize / 2)
    context.moveTo(x + tileSize / 2, y)
    context.lineTo(x + tileSize / 2, y + tileSize)
    context.stroke()
    return
  }

  if (token.kind === "wall") {
    context.fillStyle = "rgba(23, 32, 38, 0.20)"
    context.fillRect(x, y + tileSize - 7, tileSize, 7)
    return
  }

  if (token.kind === "item" && showLabel) {
    context.fillStyle = "rgba(255, 247, 234, 0.92)"
    context.font = "700 8px sans-serif"
    context.textAlign = "center"
    context.textBaseline = "middle"
    context.fillText(labelForToken(token.id), x + tileSize / 2, y + tileSize / 2)
  }
}

function styleForToken(token: FixtureToken): {
  readonly fill: string
  readonly stroke: string
} {
  if (token.kind === "floor") {
    return { fill: "#d7b57c", stroke: "rgba(117, 79, 42, 0.25)" }
  }

  if (token.kind === "wall") {
    return { fill: "#6f777b", stroke: "#555f63" }
  }

  if (token.kind === "item") {
    return { fill: "#8b5f3d", stroke: "#65462f" }
  }

  return { fill: "#c8493c", stroke: "#ffffff" }
}

function labelForToken(tokenId: string): string {
  if (tokenId.includes("conference_table")) return "TABLE"
  if (tokenId.includes("chair")) return "SEAT"
  if (tokenId.includes("coffee")) return "CAFE"
  return "ITEM"
}

function createMultiTileFillGids(
  tokens: readonly FixtureToken[],
): ReadonlyMap<number, number> {
  const maxGid = Math.max(0, ...tokens.map((token) => token.provisionalGid))
  const fillGids = new Map<number, number>()

  tokens.forEach((token) => {
    if (token.widthTiles <= 1 && token.heightTiles <= 1) return
    fillGids.set(token.provisionalGid, maxGid + fillGids.size + 1)
  })

  return fillGids
}
