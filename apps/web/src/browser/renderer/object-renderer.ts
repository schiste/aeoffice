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
  readonly bounds: Phaser.Geom.Rectangle
}

export class ObjectRenderer {
  private readonly objectTextureKeys = new Set<string>()
  private readonly activeSprites: ObjectSpriteRecord[] = []
  private readonly spritePool: Phaser.GameObjects.Image[] = []
  private createdSpriteCount = 0
  private reusedSpriteCount = 0
  private createdTextureCount = 0
  private reusedTextureCount = 0
  private visibleSpriteCount = 0
  private culledSpriteCount = 0

  constructor(private readonly scene: Phaser.Scene) {}

  releaseActiveSprites(): void {
    this.activeSprites.forEach(({ sprite }) => {
      sprite.setVisible(false)
      sprite.setActive(false)
      sprite.setName("pooled-object-sprite")
      this.spritePool.push(sprite)
    })
    this.activeSprites.length = 0
    this.visibleSpriteCount = 0
    this.culledSpriteCount = 0
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
        const sprite = this.acquireSprite(textureKey)

        sprite.setName(id)
        sprite.setPosition(centerX, centerY)
        sprite.setOrigin(0.5, 0.5)
        sprite.setVertexRoundMode(RENDERER_VERTEX_ROUND_MODE)
        sprite.setDepth(depth)
        sprite.setData("depth", depth)
        sprite.setData("zAnchor", token.asset?.zAnchor)
        this.activeSprites.push({
          sprite,
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

    this.activeSprites.forEach(({ sprite, bounds }) => {
      const visible = Phaser.Geom.Intersects.RectangleToRectangle(
        cullingBounds,
        bounds,
      )
      sprite.setVisible(visible)
      sprite.setActive(visible)
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
      pooledSprite.setTexture(textureKey)
      pooledSprite.setVisible(true)
      pooledSprite.setActive(true)
      this.reusedSpriteCount += 1
      return pooledSprite
    }

    const sprite = this.scene.add.image(0, 0, textureKey)
    this.createdSpriteCount += 1
    return sprite
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
