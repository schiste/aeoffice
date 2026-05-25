import Phaser from "phaser"

import {
  assetPipelineInfoFromRender,
  drawTokenFrameWithFallback,
  type RuntimeAssetAtlas,
} from "./asset-atlas"
import { RENDERER_VERTEX_ROUND_MODE, TILESET_KEY } from "./constants"
import type {
  FixtureMap,
  FixtureToken,
  MultiTileVariantGids,
  RendererAssetPipelineInfo,
  RendererTilemapLayerInfo,
  TileLayer,
} from "./types"

export class TilemapRenderer {
  constructor(private readonly scene: Phaser.Scene) {}

  installSemanticTileset(
    fixtureMap: FixtureMap,
    multiTileVariantGids: MultiTileVariantGids,
    atlas: RuntimeAssetAtlas | undefined,
  ): RendererAssetPipelineInfo {
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

    const fallbackTokenIds = new Set<string>()
    fixtureMap.catalog.tokens.forEach((token) => {
      const frameX = (token.provisionalGid % columns) * tileSize
      const frameY = Math.floor(token.provisionalGid / columns) * tileSize
      drawTokenFrameWithFallback(
        context,
        atlas,
        token,
        frameX,
        frameY,
        tileSize,
        {
          offsetX: 0,
          offsetY: 0,
          widthTiles: token.widthTiles,
          heightTiles: token.heightTiles,
        },
        fallbackTokenIds,
      )

      const variantGrid = multiTileVariantGids.byRootGid.get(
        token.provisionalGid,
      )
      variantGrid?.forEach((row, offsetY) => {
        row.forEach((variantGid, offsetX) => {
          if (offsetX === 0 && offsetY === 0) return

          const variantFrameX = (variantGid % columns) * tileSize
          const variantFrameY = Math.floor(variantGid / columns) * tileSize
          drawTokenFrameWithFallback(
            context,
            atlas,
            token,
            variantFrameX,
            variantFrameY,
            tileSize,
            {
              offsetX,
              offsetY,
              widthTiles: token.widthTiles,
              heightTiles: token.heightTiles,
            },
            fallbackTokenIds,
          )
        })
      })
    })

    this.scene.textures.addCanvas(TILESET_KEY, canvas)
    return assetPipelineInfoFromRender(
      atlas,
      fixtureMap.catalog.tokens.length,
      fallbackTokenIds,
    )
  }

  paintStaticTileLayer(
    tilemap: Phaser.Tilemaps.Tilemap,
    name: RendererTilemapLayerInfo["name"],
    layer: TileLayer,
    tileset: Phaser.Tilemaps.Tileset,
    tokensByGid: ReadonlyMap<number, FixtureToken>,
    multiTileVariantGids: ReadonlyMap<number, readonly (readonly number[])[]>,
    depth: number,
  ): RendererTilemapLayerInfo {
    const phaserLayer = tilemap.createBlankLayer(name, tileset)

    if (!phaserLayer) {
      throw new Error(`Unable to create Phaser tile layer ${name}.`)
    }

    phaserLayer.setDepth(depth)
    phaserLayer.setVertexRoundMode(RENDERER_VERTEX_ROUND_MODE)
    const populatedTileCount = this.populateLayer(
      phaserLayer,
      layer,
      tokensByGid,
      multiTileVariantGids,
    )
    const gpuLayer = this.promoteBlankLayerToGpu(tilemap, name, tileset, depth)

    if (gpuLayer) {
      return {
        name,
        mode: "gpu",
        width: layer.gids[0]?.length ?? 0,
        height: layer.gids.length,
        populatedTileCount,
      }
    }

    return {
      name,
      mode: "cpu",
      width: layer.gids[0]?.length ?? 0,
      height: layer.gids.length,
      populatedTileCount,
    }
  }

  private populateLayer(
    phaserLayer: Phaser.Tilemaps.TilemapLayer,
    layer: TileLayer,
    tokensByGid: ReadonlyMap<number, FixtureToken>,
    multiTileVariantGids: ReadonlyMap<number, readonly (readonly number[])[]>,
  ): number {
    let populatedTileCount = 0

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
            populatedTileCount += 1
          }
        }
      })
    })

    return populatedTileCount
  }

  private promoteBlankLayerToGpu(
    tilemap: Phaser.Tilemaps.Tilemap,
    name: RendererTilemapLayerInfo["name"],
    tileset: Phaser.Tilemaps.Tileset,
    depth: number,
  ): Phaser.Tilemaps.TilemapGPULayer | undefined {
    if (this.scene.renderer.type !== Phaser.WEBGL) return undefined
    if (tilemap.width > 4096 || tilemap.height > 4096) return undefined

    const existingLayer = tilemap.getLayer(name)?.tilemapLayer
    existingLayer?.destroy(false)
    const gpuLayer = tilemap.createLayer(name, tileset, 0, 0, true) as
      | Phaser.Tilemaps.TilemapLayer
      | Phaser.Tilemaps.TilemapGPULayer
      | null

    if (!gpuLayer) {
      const fallbackLayer = tilemap.createLayer(name, tileset, 0, 0, false)
      fallbackLayer?.setDepth(depth)
      fallbackLayer?.setVertexRoundMode(RENDERER_VERTEX_ROUND_MODE)
      return undefined
    }

    if (!isTilemapGpuLayer(gpuLayer)) {
      gpuLayer.setDepth(depth)
      gpuLayer.setVertexRoundMode(RENDERER_VERTEX_ROUND_MODE)
      return undefined
    }

    gpuLayer.setDepth(depth)
    // Keep Phaser 4 vertex rounding in its conservative `safeAuto` mode:
    // translated, unscaled tile vertices round with the rounded camera, while
    // transformed objects avoid the wobble that full rounding can introduce.
    gpuLayer.setVertexRoundMode(RENDERER_VERTEX_ROUND_MODE)

    return gpuLayer
  }
}

function isTilemapGpuLayer(
  layer: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer,
): layer is Phaser.Tilemaps.TilemapGPULayer {
  return layer.type === "TilemapGPULayer"
}
