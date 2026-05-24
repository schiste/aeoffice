import Phaser from "phaser"

export type Direction = "up" | "down" | "left" | "right"

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

export interface RenderedPlayer {
  readonly playerId: string
  readonly name: string
  readonly position: Vector2
  readonly direction: Direction
  readonly local: boolean
  readonly rejected?: boolean
}

export interface RendererViewportState {
  readonly viewportWidth: number
  readonly viewportHeight: number
  readonly mapWidth: number
  readonly mapHeight: number
  readonly zoomFactor: number
  readonly effectiveZoom: number
  readonly scrollX: number
  readonly scrollY: number
  readonly followingPlayerId?: string
}

const TILESET_KEY = "semantic-fixture-tiles"
const TILESET_NAME = "semantic-fixture-tileset"
const AVATAR_WIDTH = 18
const AVATAR_HEIGHT = 24
const AVATAR_DEPTH_BASE = 1000
const DEFAULT_VIEWPORT_WIDTH = 640
const DEFAULT_VIEWPORT_HEIGHT = 360
const MIN_VIEWPORT_WIDTH = 320
const MIN_VIEWPORT_HEIGHT = 220
const DEFAULT_ZOOM_FACTOR = 1.15
const MIN_ZOOM_FACTOR = 0.75
const MAX_ZOOM_FACTOR = 2
const MAX_EFFECTIVE_ZOOM = 3.25

export class PhaserOfficeRenderer {
  private readonly scene: OfficeScene
  private readonly game: Phaser.Game
  private readonly ready: Promise<OfficeScene>
  private readonly resizeObserver: ResizeObserver
  private zoomFactor = DEFAULT_ZOOM_FACTOR
  private players: readonly RenderedPlayer[] = [
    {
      playerId: "player-1",
      name: "Browser Ada",
      position: { x: 96, y: 96 },
      direction: "down",
      local: true,
    },
  ]

  constructor(private readonly parent: HTMLElement) {
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
      width: DEFAULT_VIEWPORT_WIDTH,
      height: DEFAULT_VIEWPORT_HEIGHT,
      backgroundColor: "#e7edf0",
      banner: false,
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.NONE,
      },
      scene: this.scene,
    })
    this.resizeObserver = new ResizeObserver(() => this.resizeToParent())
    this.resizeObserver.observe(parent)
    this.resizeToParent()
  }

  renderMap(fixtureMap: FixtureMap): void {
    void this.ready.then((scene) => {
      scene.renderFixtureMap(fixtureMap, this.players)
    })
  }

  updatePlayers(players: readonly RenderedPlayer[]): void {
    this.players = players
    void this.ready.then((scene) => {
      scene.updatePlayers(players)
    })
  }

  zoomIn(): RendererViewportState {
    return this.setZoomFactor(this.zoomFactor + 0.15)
  }

  zoomOut(): RendererViewportState {
    return this.setZoomFactor(this.zoomFactor - 0.15)
  }

  resetZoom(): RendererViewportState {
    return this.setZoomFactor(DEFAULT_ZOOM_FACTOR)
  }

  getViewportState(): RendererViewportState {
    return this.scene.getViewportState()
  }

  async advanceTime(): Promise<void> {
    await this.ready
  }

  destroy(): void {
    this.resizeObserver.disconnect()
    this.game.destroy(true)
  }

  private setZoomFactor(zoomFactor: number): RendererViewportState {
    this.zoomFactor = clamp(zoomFactor, MIN_ZOOM_FACTOR, MAX_ZOOM_FACTOR)
    this.scene.setZoomFactor(this.zoomFactor)
    return this.getViewportState()
  }

  private resizeToParent(): void {
    const rect = this.parent.getBoundingClientRect()
    const width = Math.max(
      MIN_VIEWPORT_WIDTH,
      Math.round(rect.width || this.parent.clientWidth || DEFAULT_VIEWPORT_WIDTH),
    )
    const height = Math.max(
      MIN_VIEWPORT_HEIGHT,
      Math.round(rect.height || this.parent.clientHeight || DEFAULT_VIEWPORT_HEIGHT),
    )

    this.game.scale.resize(width, height)
    this.scene.resizeViewport(width, height)
    this.scene.setZoomFactor(this.zoomFactor)
  }

  private resolveReady: (scene: OfficeScene) => void = () => undefined
}

class OfficeScene extends Phaser.Scene {
  private readonly avatars = new Map<string, AvatarView>()
  private zoneGraphics?: Phaser.GameObjects.Graphics
  private activeMap?: Phaser.Tilemaps.Tilemap
  private viewportSize: Vector2 = {
    x: DEFAULT_VIEWPORT_WIDTH,
    y: DEFAULT_VIEWPORT_HEIGHT,
  }
  private mapSize: Vector2 = {
    x: 384,
    y: 320,
  }
  private zoomFactor = DEFAULT_ZOOM_FACTOR
  private effectiveZoom = DEFAULT_ZOOM_FACTOR
  private followingPlayerId?: string
  private cameraReady = false

  constructor(private readonly onReady: (scene: OfficeScene) => void) {
    super({ key: "OfficeScene" })
  }

  create(): void {
    this.cameraReady = true
    this.cameras.main.setBackgroundColor("#e7edf0")
    this.cameras.main.roundPixels = true
    this.cameras.main.setSize(this.viewportSize.x, this.viewportSize.y)
    this.applyCameraZoom()
    this.onReady(this)
  }

  renderFixtureMap(
    fixtureMap: FixtureMap,
    players: readonly RenderedPlayer[],
  ): void {
    const tileSize = fixtureMap.compiled.tileSize
    const widthInPixels = fixtureMap.compiled.width * tileSize
    const heightInPixels = fixtureMap.compiled.height * tileSize
    this.mapSize = {
      x: widthInPixels,
      y: heightInPixels,
    }

    this.avatars.forEach((avatar) => avatar.destroy())
    this.avatars.clear()
    this.followingPlayerId = undefined
    this.cameras.main.stopFollow()
    this.children.removeAll(true)
    this.activeMap = this.make.tilemap({
      tileWidth: tileSize,
      tileHeight: tileSize,
      width: fixtureMap.compiled.width,
      height: fixtureMap.compiled.height,
    })
    this.cameras.main.setBounds(0, 0, widthInPixels, heightInPixels)
    this.cameras.main.centerOn(widthInPixels / 2, heightInPixels / 2)
    this.applyCameraZoom()

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
    this.updatePlayers(players)
  }

  updatePlayers(players: readonly RenderedPlayer[]): void {
    const visiblePlayerIds = new Set(players.map((player) => player.playerId))

    this.avatars.forEach((avatar, playerId) => {
      if (visiblePlayerIds.has(playerId)) return
      avatar.destroy()
      this.avatars.delete(playerId)
    })
    if (this.followingPlayerId && !visiblePlayerIds.has(this.followingPlayerId)) {
      this.followingPlayerId = undefined
      this.cameras.main.stopFollow()
    }

    players.forEach((player) => {
      let avatar = this.avatars.get(player.playerId)

      if (!avatar) {
        avatar = new AvatarView(this, player)
        this.avatars.set(player.playerId, avatar)
      }

      avatar.update(player)
      if (player.local) {
        this.followPlayer(player.playerId, avatar)
      }
    })
  }

  resizeViewport(width: number, height: number): void {
    this.viewportSize = { x: width, y: height }
    if (this.cameraReady) {
      this.cameras.main.setSize(width, height)
    }
    this.applyCameraZoom()
  }

  setZoomFactor(zoomFactor: number): void {
    this.zoomFactor = clamp(zoomFactor, MIN_ZOOM_FACTOR, MAX_ZOOM_FACTOR)
    this.applyCameraZoom()
  }

  getViewportState(): RendererViewportState {
    const camera = this.cameraReady ? this.cameras.main : undefined

    return {
      viewportWidth: Math.round(this.viewportSize.x),
      viewportHeight: Math.round(this.viewportSize.y),
      mapWidth: Math.round(this.mapSize.x),
      mapHeight: Math.round(this.mapSize.y),
      zoomFactor: roundTo(this.zoomFactor, 2),
      effectiveZoom: roundTo(this.effectiveZoom, 2),
      scrollX: Math.round(camera?.scrollX ?? 0),
      scrollY: Math.round(camera?.scrollY ?? 0),
      followingPlayerId: this.followingPlayerId,
    }
  }

  private followPlayer(playerId: string, avatar: AvatarView): void {
    if (this.followingPlayerId === playerId) return

    this.followingPlayerId = playerId
    this.cameras.main.startFollow(avatar.focusTarget, true, 0.2, 0.2)
  }

  private applyCameraZoom(): void {
    this.effectiveZoom = this.computeEffectiveZoom()

    if (!this.cameraReady) return

    const camera = this.cameras.main
    camera.setZoom(this.effectiveZoom)
    camera.setBounds(0, 0, this.mapSize.x, this.mapSize.y)
  }

  private computeEffectiveZoom(): number {
    const fitZoom = Math.min(
      this.viewportSize.x / this.mapSize.x,
      this.viewportSize.y / this.mapSize.y,
    )

    return clamp(fitZoom * this.zoomFactor, MIN_ZOOM_FACTOR, MAX_EFFECTIVE_ZOOM)
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

}

class AvatarView {
  readonly focusTarget: Phaser.GameObjects.Container
  private readonly shadow: Phaser.GameObjects.Ellipse
  private readonly torso: Phaser.GameObjects.Ellipse
  private readonly head: Phaser.GameObjects.Ellipse
  private readonly facing: Phaser.GameObjects.Triangle
  private readonly labelBack: Phaser.GameObjects.Rectangle
  private readonly label: Phaser.GameObjects.Text
  private idleTween?: Phaser.Tweens.Tween
  private walkTween?: Phaser.Tweens.Tween
  private positionTween?: Phaser.Tweens.Tween
  private rejectionTween?: Phaser.Tweens.Tween
  private lastPosition: Vector2
  private lastDirection: Direction
  private local: boolean

  constructor(
    private readonly scene: Phaser.Scene,
    player: RenderedPlayer,
  ) {
    this.local = player.local
    this.lastPosition = player.position
    this.lastDirection = player.direction
    this.focusTarget = scene.add.container(player.position.x, player.position.y)
    this.focusTarget.setName(`avatar:${player.playerId}`)

    this.shadow = scene.add.ellipse(0, 14, 18, 6, 0x172026, 0.2)
    this.torso = scene.add.ellipse(0, 2, AVATAR_WIDTH, AVATAR_HEIGHT, 0xc8493c, 1)
    this.head = scene.add.ellipse(0, -10, 13, 13, 0xffd3a3, 1)
    this.facing = scene.add.triangle(0, -10, 0, -4, 5, 4, -5, 4, 0x172026, 0.9)
    this.label = scene.add.text(0, -31, player.name, {
      color: "#172026",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "10px",
      fontStyle: "700",
      align: "center",
    })
    this.label.setOrigin(0.5, 0.5)
    this.labelBack = scene.add.rectangle(
      0,
      -31,
      this.label.width + 10,
      15,
      0xffffff,
      0.86,
    )
    this.labelBack.setStrokeStyle(1, player.local ? 0xc8493c : 0x2f6fc8, 0.65)

    this.focusTarget.add([
      this.shadow,
      this.torso,
      this.head,
      this.facing,
      this.labelBack,
      this.label,
    ])
    this.startIdleTween()
    this.update(player)
  }

  update(player: RenderedPlayer): void {
    const moved =
      player.position.x !== this.lastPosition.x ||
      player.position.y !== this.lastPosition.y
    const identityChanged = player.local !== this.local

    this.local = player.local
    this.label.setText(player.name)
    this.labelBack.setSize(this.label.width + 10, 15)
    this.labelBack.setStrokeStyle(1, player.local ? 0xc8493c : 0x2f6fc8, 0.65)
    this.torso.setFillStyle(player.local ? 0xc8493c : 0x2f6fc8, 1)
    this.focusTarget.setDepth(AVATAR_DEPTH_BASE + player.position.y)
    this.setFacing(player.direction)

    if (moved || identityChanged || player.direction !== this.lastDirection) {
      this.interpolateTo(player.position)
      this.startWalkTween()
    } else if (!this.walkTween?.isPlaying()) {
      this.startIdleTween()
    }

    if (player.rejected) {
      this.showRejected(player.direction)
    }

    this.lastPosition = player.position
    this.lastDirection = player.direction
  }

  destroy(): void {
    this.idleTween?.stop()
    this.walkTween?.stop()
    this.positionTween?.stop()
    this.rejectionTween?.stop()
    this.focusTarget.destroy(true)
  }

  private interpolateTo(position: Vector2): void {
    this.positionTween?.stop()
    this.positionTween = this.scene.tweens.add({
      targets: this.focusTarget,
      x: position.x,
      y: position.y,
      duration: 135,
      ease: "Sine.easeOut",
    })
  }

  private showRejected(direction: Direction): void {
    this.rejectionTween?.stop()
    this.positionTween?.stop()
    this.focusTarget.setPosition(this.lastPosition.x, this.lastPosition.y)
    this.torso.setStrokeStyle(2, 0xffd166, 1)
    this.rejectionTween = this.scene.tweens.add({
      targets: this.focusTarget,
      x: this.focusTarget.x + facingNudgeX(direction),
      y: this.focusTarget.y + facingNudgeY(direction),
      duration: 45,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeOut",
      onComplete: () => this.torso.setStrokeStyle(0, 0xffffff, 0),
    })
  }

  private setFacing(direction: Direction): void {
    const rotations: Record<Direction, number> = {
      down: Math.PI,
      left: Math.PI / 2,
      right: -Math.PI / 2,
      up: 0,
    }

    this.facing.setRotation(rotations[direction])
    this.facing.setPosition(
      direction === "left" ? -5 : direction === "right" ? 5 : 0,
      direction === "up" ? -15 : direction === "down" ? -5 : -10,
    )
    this.facing.setAlpha(direction === "up" ? 0.45 : 0.9)
  }

  private startIdleTween(): void {
    if (this.idleTween?.isPlaying()) return

    this.walkTween?.stop()
    this.focusTarget.setScale(1, 1)
    this.idleTween = this.scene.tweens.add({
      targets: this.focusTarget,
      scaleY: 1.03,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    })
  }

  private startWalkTween(): void {
    this.idleTween?.stop()
    this.walkTween?.stop()
    this.focusTarget.setScale(1, 1)
    this.walkTween = this.scene.tweens.add({
      targets: this.focusTarget,
      scaleX: 1.05,
      scaleY: 0.95,
      duration: 120,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
      onComplete: () => this.startIdleTween(),
    })
  }
}

function facingNudgeX(direction: Direction): number {
  if (direction === "left") return -4
  if (direction === "right") return 4
  return 0
}

function facingNudgeY(direction: Direction): number {
  if (direction === "up") return -4
  if (direction === "down") return 4
  return 0
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function roundTo(value: number, digits: number): number {
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
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
