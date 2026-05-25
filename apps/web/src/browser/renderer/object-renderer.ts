import Phaser from "phaser"

import {
  drawTokenFrameWithFallback,
  type RuntimeAssetAtlas,
} from "./asset-atlas"
import { OBJECT_TEXTURE_PREFIX, RENDERER_VERTEX_ROUND_MODE } from "./constants"
import { depthObjectInfo, objectDepth } from "./depth"
import type { FixtureToken, RendererDepthObjectInfo, TileLayer } from "./types"

export class ObjectRenderer {
  private readonly objectTextureKeys = new Set<string>()

  constructor(private readonly scene: Phaser.Scene) {}

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
        const sprite = this.scene.add.image(centerX, centerY, textureKey)
        const id = `furniture:${token.id}:${x},${y}`
        const depth = objectDepth(x, y, tileSize, token)

        sprite.setName(id)
        sprite.setOrigin(0.5, 0.5)
        sprite.setVertexRoundMode(RENDERER_VERTEX_ROUND_MODE)
        sprite.setDepth(depth)
        sprite.setData("depth", depth)
        sprite.setData("zAnchor", token.asset?.zAnchor)
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
        const sprite = this.scene.add.image(centerX, centerY, textureKey)

        sprite.setName(id)
        sprite.setOrigin(0.5, 0.5)
        sprite.setVertexRoundMode(RENDERER_VERTEX_ROUND_MODE)
        sprite.setDepth(depth)
        sprite.setData("depth", depth)
        sprite.setData("zAnchor", token.asset.zAnchor)
        depthObjects.push(depthObjectInfo(id, token, "wall_foreground", x, y, tileSize))
      })
    })

    return depthObjects
  }

  clearObjectTextures(): void {
    this.objectTextureKeys.forEach((textureKey) => {
      if (this.scene.textures.exists(textureKey)) {
        this.scene.textures.remove(textureKey)
      }
    })
    this.objectTextureKeys.clear()
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

      const textureKey = `${OBJECT_TEXTURE_PREFIX}-${token.provisionalGid}`
      if (this.scene.textures.exists(textureKey)) {
        this.scene.textures.remove(textureKey)
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
    })

    return textureKeysByGid
  }
}
