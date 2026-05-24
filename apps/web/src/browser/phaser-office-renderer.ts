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

interface TileSegment {
  readonly offsetX: number
  readonly offsetY: number
  readonly widthTiles: number
  readonly heightTiles: number
}

interface MultiTileVariantGids {
  readonly byRootGid: ReadonlyMap<number, readonly (readonly number[])[]>
  readonly allGids: readonly number[]
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
  readonly avatarId?: string
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
const AVATAR_STYLES: Record<
  string,
  {
    readonly torso: number
    readonly torsoDark: number
    readonly head: number
    readonly accent: number
    readonly hair: number
  }
> = {
  ember: {
    torso: 0xc45b40,
    torsoDark: 0x873727,
    head: 0xffd3a3,
    accent: 0xf6a04f,
    hair: 0x5a3323,
  },
  cobalt: {
    torso: 0x316f9f,
    torsoDark: 0x1d4260,
    head: 0xf0c7a1,
    accent: 0x9dc7e4,
    hair: 0x273748,
  },
  moss: {
    torso: 0x3c8759,
    torsoDark: 0x24543a,
    head: 0xd7b38e,
    accent: 0xa7d18f,
    hair: 0x473522,
  },
  violet: {
    torso: 0x755aa5,
    torsoDark: 0x49336f,
    head: 0xe0b995,
    accent: 0xc8b4f2,
    hair: 0x332444,
  },
  companion: {
    torso: 0x316f9f,
    torsoDark: 0x1d4260,
    head: 0xf0c7a1,
    accent: 0x9dc7e4,
    hair: 0x273748,
  },
}

export class PhaserOfficeRenderer {
  private readonly scene: OfficeScene
  private readonly game: Phaser.Game
  private readonly ready: Promise<OfficeScene>
  private readonly resizeObserver: ResizeObserver
  private zoomFactor = DEFAULT_ZOOM_FACTOR
  private activeZoneIds: readonly string[] = []
  private players: readonly RenderedPlayer[] = [
    {
      playerId: "player-1",
      name: "Browser Ada",
      avatarId: "ember",
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

  setActiveZones(zoneIds: readonly string[]): void {
    this.activeZoneIds = [...zoneIds]
    void this.ready.then((scene) => {
      scene.setActiveZones(this.activeZoneIds)
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
  private zones: readonly FixtureZone[] = []
  private activeZoneIds = new Set<string>()
  private tileSize = 32
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
    this.zoneGraphics = undefined
    this.zones = fixtureMap.compiled.zones
    this.tileSize = tileSize
    this.activeMap = this.make.tilemap({
      tileWidth: tileSize,
      tileHeight: tileSize,
      width: fixtureMap.compiled.width,
      height: fixtureMap.compiled.height,
    })
    this.cameras.main.setBounds(0, 0, widthInPixels, heightInPixels)
    this.cameras.main.centerOn(widthInPixels / 2, heightInPixels / 2)
    this.applyCameraZoom()

    const multiTileVariantGids = createMultiTileVariantGids(
      fixtureMap.catalog.tokens,
    )

    this.installSemanticTileset(fixtureMap, multiTileVariantGids)
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
      multiTileVariantGids.byRootGid,
      0,
    )
    this.paintTileLayer(
      "walls",
      fixtureMap.compiled.layers.walls,
      tileset,
      tokensByGid,
      multiTileVariantGids.byRootGid,
      10,
    )
    this.paintTileLayer(
      "objects",
      fixtureMap.compiled.layers.objects,
      tileset,
      tokensByGid,
      multiTileVariantGids.byRootGid,
      20,
    )
    this.redrawZones()
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

  setActiveZones(zoneIds: readonly string[]): void {
    this.activeZoneIds = new Set(zoneIds)
    this.redrawZones()
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
    multiTileVariantGids: MultiTileVariantGids,
  ): void {
    if (this.textures.exists(TILESET_KEY)) {
      this.textures.remove(TILESET_KEY)
    }

    const tileSize = fixtureMap.compiled.tileSize
    const maxGid = Math.max(
      0,
      ...fixtureMap.catalog.tokens.map((token) => token.provisionalGid),
      ...multiTileVariantGids.allGids,
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
      drawSemanticTile(context, token, frameX, frameY, tileSize, {
        offsetX: 0,
        offsetY: 0,
        widthTiles: token.widthTiles,
        heightTiles: token.heightTiles,
      })

      const variantGrid = multiTileVariantGids.byRootGid.get(
        token.provisionalGid,
      )
      variantGrid?.forEach((row, offsetY) => {
        row.forEach((variantGid, offsetX) => {
          if (offsetX === 0 && offsetY === 0) return

          const variantFrameX = (variantGid % columns) * tileSize
          const variantFrameY = Math.floor(variantGid / columns) * tileSize
          drawSemanticTile(context, token, variantFrameX, variantFrameY, tileSize, {
            offsetX,
            offsetY,
            widthTiles: token.widthTiles,
            heightTiles: token.heightTiles,
          })
        })
      })
    })

    this.textures.addCanvas(TILESET_KEY, canvas)
  }

  private paintTileLayer(
    name: string,
    layer: TileLayer,
    tileset: Phaser.Tilemaps.Tileset,
    tokensByGid: ReadonlyMap<number, FixtureToken>,
    multiTileVariantGids: ReadonlyMap<number, readonly (readonly number[])[]>,
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
        const variantGrid = multiTileVariantGids.get(gid)

        for (let offsetY = 0; offsetY < heightTiles; offsetY += 1) {
          for (let offsetX = 0; offsetX < widthTiles; offsetX += 1) {
            const tileGid = variantGrid?.[offsetY]?.[offsetX] ?? gid
            phaserLayer.putTileAt(tileGid, x + offsetX, y + offsetY, false)
          }
        }
      })
    })
  }

  private redrawZones(): void {
    this.zoneGraphics?.destroy()
    this.zoneGraphics = this.add.graphics()
    this.zoneGraphics.setDepth(30)
    this.zones.forEach((zone) => {
      const active = this.activeZoneIds.has(zone.id)
      const x = zone.xStart * this.tileSize
      const y = zone.yStart * this.tileSize
      const width = (zone.xEnd - zone.xStart) * this.tileSize
      const height = (zone.yEnd - zone.yStart) * this.tileSize

      this.zoneGraphics?.fillStyle(active ? 0x2f8f63 : 0x2f7c83, active ? 0.24 : 0.1)
      this.zoneGraphics?.fillRect(x, y, width, height)
      this.zoneGraphics?.lineStyle(active ? 3 : 2, active ? 0x2f8f63 : 0x2f7c83, active ? 0.96 : 0.58)
      this.zoneGraphics?.strokeRect(x, y, width, height)
    })
  }

}

class AvatarView {
  readonly focusTarget: Phaser.GameObjects.Container
  private readonly shadow: Phaser.GameObjects.Ellipse
  private readonly leftFoot: Phaser.GameObjects.Ellipse
  private readonly rightFoot: Phaser.GameObjects.Ellipse
  private readonly torso: Phaser.GameObjects.Ellipse
  private readonly head: Phaser.GameObjects.Ellipse
  private readonly hair: Phaser.GameObjects.Ellipse
  private readonly facing: Phaser.GameObjects.Triangle
  private readonly labelBack: Phaser.GameObjects.Rectangle
  private readonly label: Phaser.GameObjects.Text
  private idleTween?: Phaser.Tweens.Tween
  private walkTween?: Phaser.Tweens.Tween
  private positionTween?: Phaser.Tweens.Tween
  private rejectionTween?: Phaser.Tweens.Tween
  private lastPosition: Vector2
  private lastDirection: Direction
  private avatarId: string
  private local: boolean

  constructor(
    private readonly scene: Phaser.Scene,
    player: RenderedPlayer,
  ) {
    this.local = player.local
    this.avatarId = player.avatarId ?? fallbackAvatarId(player)
    this.lastPosition = player.position
    this.lastDirection = player.direction
    this.focusTarget = scene.add.container(player.position.x, player.position.y)
    this.focusTarget.setName(`avatar:${player.playerId}`)
    const style = avatarStyle(this.avatarId)

    this.shadow = scene.add.ellipse(0, 15, 20, 7, 0x20201d, 0.18)
    this.leftFoot = scene.add.ellipse(-5, 12, 7, 5, style.torsoDark, 1)
    this.rightFoot = scene.add.ellipse(5, 12, 7, 5, style.torsoDark, 1)
    this.torso = scene.add.ellipse(0, 2, AVATAR_WIDTH, AVATAR_HEIGHT, style.torso, 1)
    this.torso.setStrokeStyle(1, style.torsoDark, 0.55)
    this.head = scene.add.ellipse(0, -10, 13, 13, style.head, 1)
    this.hair = scene.add.ellipse(0, -14, 12, 6, style.hair, 1)
    this.facing = scene.add.triangle(0, -9, 0, -4, 4, 3, -4, 3, style.accent, 0.86)
    this.label = scene.add.text(0, -31, player.name, {
      color: "#20201d",
      fontFamily: "Aptos, Segoe UI, sans-serif",
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
    this.labelBack.setStrokeStyle(1, style.torso, 0.65)

    this.focusTarget.add([
      this.shadow,
      this.leftFoot,
      this.rightFoot,
      this.torso,
      this.head,
      this.hair,
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
    const nextAvatarId = player.avatarId ?? fallbackAvatarId(player)
    const identityChanged =
      player.local !== this.local ||
      player.name !== this.label.text ||
      nextAvatarId !== this.avatarId
    const style = avatarStyle(nextAvatarId)

    this.local = player.local
    this.avatarId = nextAvatarId
    this.label.setText(player.name)
    this.labelBack.setSize(this.label.width + 10, 15)
    this.labelBack.setStrokeStyle(1, style.torso, 0.65)
    this.leftFoot.setFillStyle(style.torsoDark, 1)
    this.rightFoot.setFillStyle(style.torsoDark, 1)
    this.torso.setFillStyle(style.torso, 1)
    this.torso.setStrokeStyle(1, style.torsoDark, 0.55)
    this.head.setFillStyle(style.head, 1)
    this.hair.setFillStyle(style.hair, 1)
    this.facing.setFillStyle(style.accent, 0.86)
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
    const style = avatarStyle(this.avatarId)
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
      onComplete: () => this.torso.setStrokeStyle(1, style.torsoDark, 0.55),
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
    this.facing.setAlpha(direction === "up" ? 0.18 : 0.86)
    this.hair.setPosition(
      direction === "left" ? -3 : direction === "right" ? 3 : 0,
      direction === "up" ? -12 : -14,
    )
    this.leftFoot.setPosition(direction === "right" ? -3 : -5, 12)
    this.rightFoot.setPosition(direction === "left" ? 3 : 5, 12)
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

function fallbackAvatarId(player: RenderedPlayer): string {
  return player.local ? "ember" : "companion"
}

function avatarStyle(avatarId: string): {
  readonly torso: number
  readonly torsoDark: number
  readonly head: number
  readonly accent: number
  readonly hair: number
} {
  return AVATAR_STYLES[avatarId] ?? AVATAR_STYLES.ember
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
  segment: TileSegment,
): void {
  if (token.kind === "floor") {
    drawPolishedFloor(context, token, x, y, tileSize)
    return
  }

  if (token.kind === "wall") {
    drawPolishedWall(context, token, x, y, tileSize)
    return
  }

  if (token.kind === "item") {
    drawPolishedItem(context, token, x, y, tileSize, segment)
    return
  }

  drawAvatarSwatchTile(context, token, x, y, tileSize)
}

function drawPolishedFloor(
  context: CanvasRenderingContext2D,
  token: FixtureToken,
  x: number,
  y: number,
  tileSize: number,
): void {
  if (token.id.includes("wood")) {
    context.fillStyle = "#cfa56c"
    context.fillRect(x, y, tileSize, tileSize)
    context.fillStyle = "rgba(106, 64, 35, 0.13)"
    context.fillRect(x, y + 7, tileSize, 2)
    context.fillRect(x, y + 23, tileSize, 2)
    context.strokeStyle = "rgba(85, 52, 28, 0.28)"
    context.lineWidth = 1
    for (let row = 0; row < 4; row += 1) {
      const top = y + row * 8 + 0.5
      context.beginPath()
      context.moveTo(x, top)
      context.lineTo(x + tileSize, top)
      context.stroke()
      const seam = x + ((row % 2 === 0 ? 14 : 24))
      context.beginPath()
      context.moveTo(seam + 0.5, top)
      context.lineTo(seam + 0.5, top + 8)
      context.stroke()
    }
    context.fillStyle = "rgba(255, 238, 196, 0.18)"
    context.fillRect(x + 2, y + 2, tileSize - 4, 3)
    return
  }

  if (token.id.includes("concrete")) {
    context.fillStyle = "#cbd3d1"
    context.fillRect(x, y, tileSize, tileSize)
    context.strokeStyle = "rgba(97, 111, 112, 0.28)"
    context.lineWidth = 1
    context.strokeRect(x + 0.5, y + 0.5, tileSize - 1, tileSize - 1)
    context.fillStyle = "rgba(255, 255, 255, 0.22)"
    context.fillRect(x + 3, y + 3, 6, 1)
    context.fillRect(x + 20, y + 13, 5, 1)
    context.fillStyle = "rgba(77, 91, 91, 0.16)"
    context.fillRect(x + 11, y + 8, 2, 2)
    context.fillRect(x + 25, y + 24, 2, 2)
    return
  }

  context.fillStyle = "#94b2a2"
  context.fillRect(x, y, tileSize, tileSize)
  context.strokeStyle = "rgba(49, 85, 65, 0.2)"
  context.lineWidth = 1
  for (let offset = 0; offset <= tileSize; offset += 8) {
    context.beginPath()
    context.moveTo(x + offset + 0.5, y)
    context.lineTo(x + offset + 0.5, y + tileSize)
    context.moveTo(x, y + offset + 0.5)
    context.lineTo(x + tileSize, y + offset + 0.5)
    context.stroke()
  }
  context.fillStyle = "rgba(255, 255, 255, 0.08)"
  context.fillRect(x, y, tileSize, tileSize / 2)
}

function drawPolishedWall(
  context: CanvasRenderingContext2D,
  token: FixtureToken,
  x: number,
  y: number,
  tileSize: number,
): void {
  if (token.id.includes("glass")) {
    context.fillStyle = "#98c8ce"
    context.fillRect(x, y, tileSize, tileSize)
    context.fillStyle = "rgba(232, 250, 255, 0.52)"
    context.fillRect(x + 3, y + 3, tileSize - 6, tileSize - 12)
    context.fillStyle = "rgba(48, 101, 112, 0.34)"
    context.fillRect(x, y + tileSize - 9, tileSize, 9)
    context.strokeStyle = "#487f88"
    context.lineWidth = 2
    context.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2)
    context.strokeStyle = "rgba(255, 255, 255, 0.72)"
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(x + 7, y + 4)
    context.lineTo(x + 20, y + 18)
    context.moveTo(x + 17, y + 3)
    context.lineTo(x + 27, y + 13)
    context.stroke()
    return
  }

  if (token.id.includes("neutral")) {
    context.fillStyle = "#d7d1c4"
    context.fillRect(x, y, tileSize, tileSize)
    context.fillStyle = "#ece7dc"
    context.fillRect(x + 2, y + 2, tileSize - 4, 14)
    context.fillStyle = "#b6aa97"
    context.fillRect(x, y + tileSize - 8, tileSize, 8)
    context.strokeStyle = "rgba(98, 88, 74, 0.35)"
    context.lineWidth = 1
    context.strokeRect(x + 0.5, y + 0.5, tileSize - 1, tileSize - 1)
    return
  }

  context.fillStyle = "#8e6843"
  context.fillRect(x, y, tileSize, tileSize)
  context.fillStyle = "#b98756"
  context.fillRect(x + 2, y + 2, tileSize - 4, 12)
  context.fillStyle = "#6e4b31"
  context.fillRect(x, y + tileSize - 9, tileSize, 9)
  context.strokeStyle = "rgba(63, 38, 22, 0.34)"
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(x + 10.5, y + 2)
  context.lineTo(x + 10.5, y + tileSize - 9)
  context.moveTo(x + 21.5, y + 2)
  context.lineTo(x + 21.5, y + tileSize - 9)
  context.stroke()
}

function drawPolishedItem(
  context: CanvasRenderingContext2D,
  token: FixtureToken,
  x: number,
  y: number,
  tileSize: number,
  segment: TileSegment,
): void {
  context.clearRect(x, y, tileSize, tileSize)

  if (token.id.includes("large_conference_table")) {
    drawSegmentedObject(context, x, y, tileSize, segment, (originX, originY, width, height) => {
      drawSoftShadow(context, originX + width / 2, originY + height - 9, width - 16, 10)
      context.fillStyle = "#6d5c3a"
      fillRoundedRect(context, originX + 8, originY + 12, width - 16, height - 22, 5)
      context.fillStyle = "#9d8757"
      fillRoundedRect(context, originX + 12, originY + 15, width - 24, height - 30, 3)
      context.fillStyle = "rgba(255, 245, 210, 0.3)"
      context.fillRect(originX + 17, originY + 18, width - 34, 4)
      context.strokeStyle = "rgba(74, 57, 35, 0.28)"
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(originX + width / 3, originY + 17)
      context.lineTo(originX + width / 3, originY + height - 18)
      context.moveTo(originX + (width * 2) / 3, originY + 17)
      context.lineTo(originX + (width * 2) / 3, originY + height - 18)
      context.stroke()
      context.fillStyle = "#4b3d27"
      context.fillRect(originX + 16, originY + height - 17, 6, 8)
      context.fillRect(originX + width - 22, originY + height - 17, 6, 8)
    })
    return
  }

  if (token.id.includes("plant")) {
    drawSoftShadow(context, x + 16, y + 25, 18, 6)
    context.fillStyle = "#8a6648"
    fillRoundedRect(context, x + 10, y + 20, 12, 7, 2)
    context.fillStyle = "#2e7d52"
    context.beginPath()
    context.arc(x + 16, y + 14, 8, 0, Math.PI * 2)
    context.arc(x + 10, y + 15, 5, 0, Math.PI * 2)
    context.arc(x + 22, y + 14, 5, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = "#48a36e"
    context.beginPath()
    context.arc(x + 14, y + 11, 4, 0, Math.PI * 2)
    context.fill()
    return
  }

  if (token.id.includes("door")) {
    drawSoftShadow(context, x + 16, y + 28, 20, 5)
    context.fillStyle = "#9a633d"
    fillRoundedRect(context, x + 7, y + 4, 18, 24, 2)
    context.fillStyle = "#b87a4f"
    context.fillRect(x + 10, y + 7, 5, 18)
    context.strokeStyle = "rgba(73, 43, 23, 0.42)"
    context.lineWidth = 1
    strokeRoundedRect(context, x + 7.5, y + 4.5, 17, 23, 2)
    context.fillStyle = "#efc86d"
    context.beginPath()
    context.arc(x + 21, y + 17, 2, 0, Math.PI * 2)
    context.fill()
    return
  }

  if (token.id.includes("coffee_bar")) {
    drawSegmentedObject(context, x, y, tileSize, segment, (originX, originY, width) => {
      drawSoftShadow(context, originX + width / 2, originY + 25, width - 12, 6)
      context.fillStyle = "#6b4b34"
      fillRoundedRect(context, originX + 4, originY + 9, width - 8, 15, 4)
      context.fillStyle = "#d8c4a2"
      fillRoundedRect(context, originX + 7, originY + 10, width - 14, 4, 2)
      context.fillStyle = "#2f4d49"
      fillRoundedRect(context, originX + 10, originY + 15, 12, 6, 2)
      context.fillStyle = "#f9f6ef"
      context.fillRect(originX + width - 19, originY + 15, 6, 6)
      context.fillStyle = "#efc86d"
      context.fillRect(originX + width - 28, originY + 16, 5, 4)
      context.fillStyle = "rgba(255, 255, 255, 0.3)"
      context.fillRect(originX + 10, originY + 10, width - 26, 1)
    })
    return
  }

  if (token.id.includes("coffee_machine")) {
    drawSoftShadow(context, x + 16, y + 26, 16, 5)
    context.fillStyle = "#42545a"
    fillRoundedRect(context, x + 9, y + 7, 14, 18, 3)
    context.fillStyle = "#d9e7e4"
    context.fillRect(x + 12, y + 10, 8, 5)
    context.fillStyle = "#24745f"
    context.fillRect(x + 12, y + 17, 8, 4)
    context.fillStyle = "#d8c4a2"
    context.fillRect(x + 14, y + 22, 4, 2)
    return
  }

  if (token.id.includes("chair")) {
    drawSoftShadow(context, x + 16, y + 24, 18, 5)
    context.fillStyle = "#5b6f6d"
    fillRoundedRect(context, x + 8, y + 8, 16, 9, 3)
    context.fillStyle = "#344947"
    fillRoundedRect(context, x + 10, y + 16, 12, 7, 2)
    context.fillStyle = "#2c3837"
    context.fillRect(x + 10, y + 23, 3, 4)
    context.fillRect(x + 19, y + 23, 3, 4)
    return
  }

  if (token.id.includes("couch")) {
    drawSegmentedObject(context, x, y, tileSize, segment, (originX, originY, width) => {
      drawSoftShadow(context, originX + width / 2, originY + 25, width - 8, 6)
      context.fillStyle = "#6b806d"
      fillRoundedRect(context, originX + 3, originY + 10, width - 6, 13, 5)
      context.fillStyle = "#49604f"
      fillRoundedRect(context, originX + 7, originY + 18, width - 14, 6, 3)
      context.fillStyle = "#d9b77c"
      fillRoundedRect(context, originX + 10, originY + 13, 11, 6, 2)
      context.fillStyle = "#5e7664"
      fillRoundedRect(context, originX + 25, originY + 13, width - 48, 6, 2)
      context.fillStyle = "#34483b"
      context.fillRect(originX + 7, originY + 24, 4, 4)
      context.fillRect(originX + width - 11, originY + 24, 4, 4)
    })
    return
  }

  if (token.id.includes("round_table")) {
    drawSegmentedObject(context, x, y, tileSize, segment, (originX, originY, width, height) => {
      const centerX = originX + width / 2
      const centerY = originY + height / 2 - 2
      const radius = Math.min(width, height) * 0.3
      drawSoftShadow(context, centerX, centerY + radius - 1, radius * 1.8, 9)
      context.fillStyle = "#74563d"
      context.beginPath()
      context.arc(centerX, centerY + 2, radius + 3, 0, Math.PI * 2)
      context.fill()
      context.fillStyle = "#b78755"
      context.beginPath()
      context.arc(centerX, centerY, radius, 0, Math.PI * 2)
      context.fill()
      context.fillStyle = "rgba(255, 238, 196, 0.3)"
      fillRoundedRect(context, centerX - radius / 2, centerY - radius / 2, radius, 4, 2)
    })
    return
  }

  drawSegmentedObject(context, x, y, tileSize, segment, (originX, originY, width, height) => {
    drawSoftShadow(context, originX + width / 2, originY + height - 7, width - 8, 6)
    context.fillStyle = "#6d5c3a"
    fillRoundedRect(context, originX + 2, originY + 8, width - 4, height - 17, 3)
    context.fillStyle = "#9d8757"
    context.fillRect(originX + 5, originY + 11, width - 10, 4)
    context.fillStyle = "rgba(255, 245, 210, 0.3)"
    context.fillRect(originX + 8, originY + 15, width - 16, height - 27)
  })
}

function drawAvatarSwatchTile(
  context: CanvasRenderingContext2D,
  token: FixtureToken,
  x: number,
  y: number,
  tileSize: number,
): void {
  const swatch = token.id.includes("cobalt")
    ? "#316f9f"
    : token.id.includes("moss")
      ? "#3c8759"
      : token.id.includes("violet")
        ? "#755aa5"
        : "#c45b40"
  drawSoftShadow(context, x + 16, y + 25, 18, 5)
  context.fillStyle = swatch
  context.beginPath()
  context.arc(x + tileSize / 2, y + 15, 9, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = "#f0c7a1"
  context.beginPath()
  context.arc(x + tileSize / 2, y + 8, 6, 0, Math.PI * 2)
  context.fill()
}

function drawSoftShadow(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
): void {
  context.fillStyle = "rgba(32, 32, 29, 0.18)"
  context.beginPath()
  context.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2)
  context.fill()
}

function fillRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  roundedRectPath(context, x, y, width, height, radius)
  context.fill()
}

function strokeRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  roundedRectPath(context, x, y, width, height, radius)
  context.stroke()
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const resolvedRadius = Math.min(radius, width / 2, height / 2)

  context.beginPath()
  context.moveTo(x + resolvedRadius, y)
  context.lineTo(x + width - resolvedRadius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + resolvedRadius)
  context.lineTo(x + width, y + height - resolvedRadius)
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - resolvedRadius,
    y + height,
  )
  context.lineTo(x + resolvedRadius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - resolvedRadius)
  context.lineTo(x, y + resolvedRadius)
  context.quadraticCurveTo(x, y, x + resolvedRadius, y)
  context.closePath()
}

function drawSegmentedObject(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  tileSize: number,
  segment: TileSegment,
  draw: (
    originX: number,
    originY: number,
    width: number,
    height: number,
  ) => void,
): void {
  context.save()
  context.beginPath()
  context.rect(x, y, tileSize, tileSize)
  context.clip()
  draw(
    x - segment.offsetX * tileSize,
    y - segment.offsetY * tileSize,
    segment.widthTiles * tileSize,
    segment.heightTiles * tileSize,
  )
  context.restore()
}

function createMultiTileVariantGids(
  tokens: readonly FixtureToken[],
): MultiTileVariantGids {
  const maxGid = Math.max(0, ...tokens.map((token) => token.provisionalGid))
  const byRootGid = new Map<number, readonly (readonly number[])[]>()
  const allGids: number[] = []
  let nextGid = maxGid + 1

  tokens.forEach((token) => {
    if (token.widthTiles <= 1 && token.heightTiles <= 1) return

    const rows: number[][] = []
    for (let offsetY = 0; offsetY < token.heightTiles; offsetY += 1) {
      const row: number[] = []
      for (let offsetX = 0; offsetX < token.widthTiles; offsetX += 1) {
        if (offsetX === 0 && offsetY === 0) {
          row.push(token.provisionalGid)
          continue
        }
        row.push(nextGid)
        allGids.push(nextGid)
        nextGid += 1
      }
      rows.push(row)
    }
    byRootGid.set(token.provisionalGid, rows)
  })

  return {
    byRootGid,
    allGids,
  }
}
