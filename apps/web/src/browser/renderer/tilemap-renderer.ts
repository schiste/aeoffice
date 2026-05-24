import Phaser from "phaser"

import { RENDERER_VERTEX_ROUND_MODE, TILESET_KEY } from "./constants"
import { drawSemanticTile } from "./semantic-tiles"
import type {
  FixtureMap,
  FixtureToken,
  MultiTileVariantGids,
  TileLayer,
} from "./types"

export class TilemapRenderer {
  constructor(private readonly scene: Phaser.Scene) {}

  installSemanticTileset(
    fixtureMap: FixtureMap,
    multiTileVariantGids: MultiTileVariantGids,
  ): void {
    if (this.scene.textures.exists(TILESET_KEY)) {
      this.scene.textures.remove(TILESET_KEY)
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

    this.scene.textures.addCanvas(TILESET_KEY, canvas)
  }

  paintTileLayer(
    tilemap: Phaser.Tilemaps.Tilemap,
    name: string,
    layer: TileLayer,
    tileset: Phaser.Tilemaps.Tileset,
    tokensByGid: ReadonlyMap<number, FixtureToken>,
    multiTileVariantGids: ReadonlyMap<number, readonly (readonly number[])[]>,
    depth: number,
  ): void {
    const phaserLayer = tilemap.createBlankLayer(name, tileset)

    if (!phaserLayer) {
      throw new Error(`Unable to create Phaser tile layer ${name}.`)
    }

    phaserLayer.setDepth(depth)
    // Keep Phaser 4 vertex rounding in its conservative `safeAuto` mode:
    // translated, unscaled tile vertices round with the rounded camera, while
    // transformed objects avoid the wobble that full rounding can introduce.
    phaserLayer.setVertexRoundMode(RENDERER_VERTEX_ROUND_MODE)
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
}
