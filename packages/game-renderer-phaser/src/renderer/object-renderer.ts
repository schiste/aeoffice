import Phaser from "phaser"

import {
  drawTokenFrameWithFallback,
  type RuntimeAssetAtlas,
} from "./asset-atlas"
import {
  OBJECT_TEXTURE_PREFIX,
  RENDERER_VERTEX_ROUND_MODE,
} from "./constants"
import { depthObjectInfo, objectDepth } from "./depth"
import { OBJECT_CULL_MARGIN_PX } from "./performance-info"
import type {
  FixtureToken,
  RendererDepthObjectInfo,
  RendererObjectPoolInfo,
  RendererCameraWorldView,
  TileLayer,
} from "./types"

interface ObjectSpriteRecord {
  readonly sprite: Phaser.GameObjects.Image
  readonly shadow?: Phaser.GameObjects.Ellipse
  readonly bounds: Phaser.Geom.Rectangle
}

export class ObjectRenderer {
  private readonly objectTextureKeys = new Set<string>()
  private readonly activeSprites: ObjectSpriteRecord[] = []
  private readonly spritePool: Phaser.GameObjects.Image[] = []
  private readonly shadowPool: Phaser.GameObjects.Ellipse[] = []
  private createdSpriteCount = 0
  private reusedSpriteCount = 0
  private createdTextureCount = 0
  private reusedTextureCount = 0
  private visibleSpriteCount = 0
  private culledSpriteCount = 0
  private ambientMotionSpriteCount = 0

  constructor(private readonly scene: Phaser.Scene) {}

  releaseActiveSprites(): void {
    this.activeSprites.forEach(({ sprite, shadow }) => {
      this.scene.tweens.killTweensOf(sprite)
      sprite.setVisible(false)
      sprite.setActive(false)
      sprite.setAngle(0)
      sprite.setAlpha(1)
      sprite.clearTint()
      sprite.setBlendMode(Phaser.BlendModes.NORMAL)
      sprite.setName("pooled-object-sprite")
      this.spritePool.push(sprite)
      if (shadow) {
        this.scene.tweens.killTweensOf(shadow)
        shadow.setVisible(false)
        shadow.setActive(false)
        shadow.setAlpha(1)
        shadow.setScale(1)
        shadow.setName("pooled-object-shadow")
        this.shadowPool.push(shadow)
      }
    })
    this.activeSprites.length = 0
    this.visibleSpriteCount = 0
    this.culledSpriteCount = 0
    this.ambientMotionSpriteCount = 0
  }

  paintObjectSprites(
    layer: TileLayer,
    tokens: readonly FixtureToken[],
    tokensByGid: ReadonlyMap<number, FixtureToken>,
    tileSize: number,
    atlas: RuntimeAssetAtlas | undefined,
  ): readonly RendererDepthObjectInfo[] {
    const objectTextureKeys = this.createTokenTextures(
      tokens,
      tileSize,
      atlas,
      (token) => token.kind === "item",
    )
    const depthObjects: RendererDepthObjectInfo[] = []

    layer.gids.forEach((row, y) => {
      row.forEach((gid, x) => {
        if (gid <= 0) return

        const token = tokensByGid.get(gid)
        if (!token) return

        const textureKey = objectTextureKeys.get(gid)
        if (!textureKey) return

        const width = token.widthTiles * tileSize
        const height = token.heightTiles * tileSize
        const centerX = x * tileSize + width / 2
        const centerY = y * tileSize + height / 2
        const id = `furniture:${token.id}:${x},${y}`
        const depth = objectDepth(x, y, tileSize, token)
        const shadow = this.acquireShadow()
        const sprite = this.acquireSprite(textureKey)

        this.configureObjectShadow(shadow, token, x, y, tileSize, depth)
        sprite.setName(id)
        sprite.setPosition(centerX, centerY)
        sprite.setOrigin(0.5, 0.5)
        sprite.setVertexRoundMode(RENDERER_VERTEX_ROUND_MODE)
        sprite.setDepth(depth)
        sprite.setData("depth", depth)
        sprite.setData("zAnchor", token.asset?.zAnchor)
        sprite.setAlpha(1)
        sprite.clearTint()
        sprite.setBlendMode(Phaser.BlendModes.NORMAL)
        if (this.applyAmbientMotion(sprite, token.id, x, y)) {
          this.ambientMotionSpriteCount += 1
        }
        this.activeSprites.push({
          sprite,
          shadow,
          bounds: new Phaser.Geom.Rectangle(
            x * tileSize,
            y * tileSize,
            width,
            height,
          ),
        })
        depthObjects.push(depthObjectInfo(id, token, "object", x, y, tileSize))
      })
    })

    return depthObjects
  }

  paintWallForegroundSprites(
    layer: TileLayer,
    tokens: readonly FixtureToken[],
    tokensByGid: ReadonlyMap<number, FixtureToken>,
    tileSize: number,
    atlas: RuntimeAssetAtlas | undefined,
  ): readonly RendererDepthObjectInfo[] {
    const textureKeys = this.createTokenTextures(
      tokens,
      tileSize,
      atlas,
      (token) => token.kind === "wall" && token.asset?.occlusion.mode === "foreground",
    )
    const depthObjects: RendererDepthObjectInfo[] = []

    layer.gids.forEach((row, y) => {
      row.forEach((gid, x) => {
        if (gid <= 0) return

        const token = tokensByGid.get(gid)
        if (!token || token.asset?.occlusion.mode !== "foreground") return

        const textureKey = textureKeys.get(gid)
        if (!textureKey) return

        const width = token.widthTiles * tileSize
        const height = token.heightTiles * tileSize
        const centerX = x * tileSize + width / 2
        const centerY = y * tileSize + height / 2
        const id = `wall-foreground:${token.id}:${x},${y}`
        const depth = objectDepth(x, y, tileSize, token)
        const sprite = this.acquireSprite(textureKey)

        sprite.setName(id)
        sprite.setPosition(centerX, centerY)
        sprite.setOrigin(0.5, 0.5)
        sprite.setVertexRoundMode(RENDERER_VERTEX_ROUND_MODE)
        sprite.setDepth(depth)
        sprite.setData("depth", depth)
        sprite.setData("zAnchor", token.asset.zAnchor)
        this.applyForegroundDepthTreatment(sprite, token.id)
        if (this.applyAmbientMotion(sprite, token.id, x, y)) {
          this.ambientMotionSpriteCount += 1
        }
        this.activeSprites.push({
          sprite,
          bounds: new Phaser.Geom.Rectangle(
            x * tileSize,
            y * tileSize,
            width,
            height,
          ),
        })
        depthObjects.push(depthObjectInfo(id, token, "wall_foreground", x, y, tileSize))
      })
    })

    return depthObjects
  }

  updateViewportCulling(worldView: RendererCameraWorldView): void {
    const cullingBounds = new Phaser.Geom.Rectangle(
      worldView.x - OBJECT_CULL_MARGIN_PX,
      worldView.y - OBJECT_CULL_MARGIN_PX,
      worldView.width + OBJECT_CULL_MARGIN_PX * 2,
      worldView.height + OBJECT_CULL_MARGIN_PX * 2,
    )
    let visibleSpriteCount = 0
    let culledSpriteCount = 0

    this.activeSprites.forEach(({ sprite, shadow, bounds }) => {
      const visible = Phaser.Geom.Intersects.RectangleToRectangle(
        cullingBounds,
        bounds,
      )
      sprite.setVisible(visible)
      sprite.setActive(visible)
      shadow?.setVisible(visible)
      shadow?.setActive(visible)
      if (visible) {
        visibleSpriteCount += 1
      } else {
        culledSpriteCount += 1
      }
    })

    this.visibleSpriteCount = visibleSpriteCount
    this.culledSpriteCount = culledSpriteCount
  }

  getPoolInfo(): RendererObjectPoolInfo {
    return {
      activeSpriteCount: this.activeSprites.length,
      visibleSpriteCount: this.visibleSpriteCount,
      culledSpriteCount: this.culledSpriteCount,
      activeShadowCount: this.activeSprites.filter(({ shadow }) => Boolean(shadow))
        .length,
      pooledShadowCount: this.shadowPool.length,
      ambientMotionSpriteCount: this.ambientMotionSpriteCount,
      pooledSpriteCount: this.spritePool.length,
      createdSpriteCount: this.createdSpriteCount,
      reusedSpriteCount: this.reusedSpriteCount,
      cachedTextureCount: this.objectTextureKeys.size,
      createdTextureCount: this.createdTextureCount,
      reusedTextureCount: this.reusedTextureCount,
    }
  }

  clearObjectTextures(): void {
    this.objectTextureKeys.forEach((textureKey) => {
      if (this.scene.textures.exists(textureKey)) {
        this.scene.textures.remove(textureKey)
      }
    })
    this.objectTextureKeys.clear()
  }

  private acquireSprite(textureKey: string): Phaser.GameObjects.Image {
    const pooledSprite = this.spritePool.pop()

    if (pooledSprite) {
      this.scene.tweens.killTweensOf(pooledSprite)
      pooledSprite.setTexture(textureKey)
      pooledSprite.setVisible(true)
      pooledSprite.setActive(true)
      pooledSprite.setAngle(0)
      pooledSprite.setAlpha(1)
      pooledSprite.clearTint()
      pooledSprite.setBlendMode(Phaser.BlendModes.NORMAL)
      this.reusedSpriteCount += 1
      return pooledSprite
    }

    const sprite = this.scene.add.image(0, 0, textureKey)
    this.createdSpriteCount += 1
    return sprite
  }

  private acquireShadow(): Phaser.GameObjects.Ellipse {
    const pooledShadow = this.shadowPool.pop()

    if (pooledShadow) {
      pooledShadow.setVisible(true)
      pooledShadow.setActive(true)
      pooledShadow.setScale(1)
      pooledShadow.setAlpha(1)
      return pooledShadow
    }

    return this.scene.add.ellipse(0, 0, 24, 8, 0x1b211e, 0.14)
  }

  private configureObjectShadow(
    shadow: Phaser.GameObjects.Ellipse,
    token: FixtureToken,
    tileX: number,
    tileY: number,
    tileSize: number,
    depth: number,
  ): void {
    const width = token.widthTiles * tileSize
    const height = token.heightTiles * tileSize
    const visualFootprint = token.asset?.visualFootprint
    const zAnchor = token.asset?.zAnchor
    const shadowFootprint = token.asset?.shadowFootprint
    const metadataShadow =
      shadowFootprint && shadowFootprint.width > 0 && shadowFootprint.height > 0
        ? shadowFootprint
        : undefined
    const shadowWidth =
      metadataShadow?.width ??
      clampNumber(
        (visualFootprint?.width ?? width) * objectShadowWidthRatio(token.id),
        tileSize * 0.46,
        Math.max(tileSize * 0.7, width * 0.94),
      )
    const shadowHeight =
      metadataShadow?.height ??
      clampNumber(
        (visualFootprint?.height ?? height) * objectShadowHeightRatio(token.id),
        5,
        Math.max(8, tileSize * 0.42),
      )
    const centerX =
      tileX * tileSize +
      (metadataShadow
        ? metadataShadow.x + metadataShadow.width / 2
        : (zAnchor?.x ?? width / 2))
    const centerY =
      tileY * tileSize +
      (metadataShadow
        ? metadataShadow.y + metadataShadow.height / 2
        : (zAnchor?.y ?? height - tileSize * 0.12))

    shadow.setName(`shadow:${token.id}:${tileX},${tileY}`)
    shadow.setPosition(centerX + objectShadowOffsetX(token.id), centerY - 1)
    shadow.setSize(shadowWidth, shadowHeight)
    shadow.setDisplaySize(shadowWidth, shadowHeight)
    shadow.setFillStyle(0x1b211e, objectShadowAlpha(token.id))
    shadow.setDepth(depth - 0.72)
    shadow.setBlendMode(Phaser.BlendModes.MULTIPLY)
  }

  private applyAmbientMotion(
    sprite: Phaser.GameObjects.Image,
    tokenId: string,
    tileX: number,
    tileY: number,
  ): boolean {
    if (!ambientMotionToken(tokenId)) return false

    this.scene.tweens.add({
      targets: sprite,
      y: sprite.y - 1.15,
      duration: 1700 + ((tileX * 137 + tileY * 83) % 520),
      delay: (tileX * 97 + tileY * 53) % 420,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    })
    return true
  }

  private applyForegroundDepthTreatment(
    sprite: Phaser.GameObjects.Image,
    tokenId: string,
  ): void {
    if (tokenId.toLowerCase().includes("glass")) {
      sprite.setAlpha(0.68)
      sprite.setTint(0xdff8ff)
      sprite.setBlendMode(Phaser.BlendModes.SCREEN)
      sprite.setData("depthEffect", "glass_transparent_foreground")
      return
    }

    sprite.setAlpha(0.96)
    sprite.clearTint()
    sprite.setBlendMode(Phaser.BlendModes.NORMAL)
    sprite.setData("depthEffect", "solid_foreground_occluder")
  }

  private createTokenTextures(
    tokens: readonly FixtureToken[],
    tileSize: number,
    atlas: RuntimeAssetAtlas | undefined,
    shouldCreateTexture: (token: FixtureToken) => boolean,
  ): ReadonlyMap<number, string> {
    const textureKeysByGid = new Map<number, string>()
    const fallbackTokenIds = new Set<string>()

    tokens.forEach((token) => {
      if (!shouldCreateTexture(token)) return

      const textureKey = objectTextureKey(token, tileSize, atlas)
      if (this.scene.textures.exists(textureKey)) {
        this.reusedTextureCount += 1
        this.objectTextureKeys.add(textureKey)
        textureKeysByGid.set(token.provisionalGid, textureKey)
        return
      }

      const width = token.widthTiles * tileSize
      const height = token.heightTiles * tileSize
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext("2d")

      if (!context) {
        throw new Error(`Unable to create object texture for ${token.id}.`)
      }

      for (let offsetY = 0; offsetY < token.heightTiles; offsetY += 1) {
        for (let offsetX = 0; offsetX < token.widthTiles; offsetX += 1) {
          drawTokenFrameWithFallback(
            context,
            atlas,
            token,
            offsetX * tileSize,
            offsetY * tileSize,
            tileSize,
            {
              offsetX,
              offsetY,
              widthTiles: token.widthTiles,
              heightTiles: token.heightTiles,
            },
            fallbackTokenIds,
          )
        }
      }

      this.scene.textures.addCanvas(textureKey, canvas)
      this.objectTextureKeys.add(textureKey)
      textureKeysByGid.set(token.provisionalGid, textureKey)
      this.createdTextureCount += 1
    })

    return textureKeysByGid
  }
}

function objectTextureKey(
  token: FixtureToken,
  tileSize: number,
  atlas: RuntimeAssetAtlas | undefined,
): string {
  return [
    OBJECT_TEXTURE_PREFIX,
    atlas?.manifest.atlasId ?? "procedural",
    tileSize,
    token.provisionalGid,
    token.asset?.frameId ?? token.id,
  ].join("-")
}

function ambientMotionToken(tokenId: string): boolean {
  return (
    tokenId.includes("plant") ||
    tokenId.includes("coffee") ||
    tokenId.includes("water_cooler")
  )
}

function objectShadowAlpha(tokenId: string): number {
  if (tokenId.includes("door")) return 0.1
  if (tokenId.includes("chair")) return 0.13
  if (tokenId.includes("plant")) return 0.15
  if (tokenId.includes("coffee_machine")) return 0.16
  return 0.18
}

function objectShadowWidthRatio(tokenId: string): number {
  if (tokenId.includes("chair")) return 0.82
  if (tokenId.includes("plant")) return 0.72
  if (tokenId.includes("door")) return 0.68
  if (tokenId.includes("coffee_machine")) return 0.78
  return 0.86
}

function objectShadowHeightRatio(tokenId: string): number {
  if (tokenId.includes("table")) return 0.26
  if (tokenId.includes("couch")) return 0.32
  if (tokenId.includes("chair")) return 0.3
  return 0.28
}

function objectShadowOffsetX(tokenId: string): number {
  if (tokenId.includes("door")) return 1
  if (tokenId.includes("chair")) return 0.5
  return 0
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
