import Phaser from "phaser"

import { OBJECT_TEXTURE_PREFIX } from "./constants"
import { furnitureDepth } from "./depth"
import { drawSemanticTile } from "./semantic-tiles"
import type { FixtureToken, TileLayer } from "./types"

export class ObjectRenderer {
  private readonly objectTextureKeys = new Set<string>()

  constructor(private readonly scene: Phaser.Scene) {}

  paintObjectSprites(
    layer: TileLayer,
    tokens: readonly FixtureToken[],
    tokensByGid: ReadonlyMap<number, FixtureToken>,
    tileSize: number,
  ): void {
    const objectTextureKeys = this.createObjectTextures(tokens, tileSize)

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
        const bottomY = (y + token.heightTiles) * tileSize
        const sprite = this.scene.add.image(centerX, centerY, textureKey)
        sprite.setName(`furniture:${token.id}:${x},${y}`)
        sprite.setOrigin(0.5, 0.5)
        sprite.setDepth(furnitureDepth(bottomY, token))
        sprite.setData("bottomY", bottomY)
      })
    })
  }

  clearObjectTextures(): void {
    this.objectTextureKeys.forEach((textureKey) => {
      if (this.scene.textures.exists(textureKey)) {
        this.scene.textures.remove(textureKey)
      }
    })
    this.objectTextureKeys.clear()
  }

  private createObjectTextures(
    tokens: readonly FixtureToken[],
    tileSize: number,
  ): ReadonlyMap<number, string> {
    const textureKeysByGid = new Map<number, string>()

    tokens.forEach((token) => {
      if (token.kind !== "item") return

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
          drawSemanticTile(
            context,
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
