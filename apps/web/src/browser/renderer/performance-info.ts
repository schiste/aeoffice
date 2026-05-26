import { roundTo } from "./math"
import type {
  RendererAssetPipelineInfo,
  RendererCameraState,
  RendererObjectPoolInfo,
  RendererPerformanceInfo,
  RendererTilemapInfo,
} from "./types"

const CHUNK_SIZE_TILES = 32
const TILE_SIZE_FALLBACK = 32
export const OBJECT_CULL_MARGIN_PX = 96

export function rendererPerformanceInfo(options: {
  readonly gameInstanceId: number
  readonly mapRenderCount: number
  readonly mapSwitchCount: number
  readonly lastMapRenderDurationMs: number
  readonly displayObjectCount: number
  readonly textureCount: number
  readonly camera: RendererCameraState
  readonly tileSize?: number
  readonly objectPool: RendererObjectPoolInfo
  readonly tilemap: RendererTilemapInfo
  readonly assets: RendererAssetPipelineInfo
}): RendererPerformanceInfo {
  const tileSize = options.tileSize ?? TILE_SIZE_FALLBACK
  const chunking = chunkInfo(options.camera, tileSize)
  const mapWidthTiles = Math.max(1, Math.ceil(options.camera.mapWidth / tileSize))
  const mapHeightTiles = Math.max(1, Math.ceil(options.camera.mapHeight / tileSize))

  return {
    source: "renderer_runtime",
    target: {
      targetFps: 60,
      minimumAcceptableFps: 45,
      targetFrameBudgetMs: 16.67,
      minimumFrameBudgetMs: 22.22,
      smokeAverageBudgetMs: 50,
      smokeP95BudgetMs: 90,
      smokeMaxBudgetMs: 250,
      benchmarkMaps: ["20x15", "50x40", "100x80"],
      documentedAt: "docs/renderer-performance-budget.md",
    },
    strategy: {
      tileLayerBatching: "phaser_tilemap_gpu_layers",
      roomChunking: "logical_32x32_tile_chunks",
      tileLayerCulling: "camera_gpu_layer",
      objectCulling: "camera_worldview_margin",
      objectPooling: "pooled_phaser_images",
      textureReuse: "signature_reused_tileset_and_object_textures",
      gameReuse: "single_phaser_game_instance",
    },
    chunking,
    culling: {
      cullMarginPx: OBJECT_CULL_MARGIN_PX,
      visibleObjectSpriteCount: options.objectPool.visibleSpriteCount,
      culledObjectSpriteCount: options.objectPool.culledSpriteCount,
    },
    pooling: options.objectPool,
    lifecycle: {
      gameInstanceId: options.gameInstanceId,
      mapRenderCount: options.mapRenderCount,
      mapSwitchCount: options.mapSwitchCount,
      phaserGameReused: true,
    },
    runtime: {
      lastMapRenderDurationMs: roundTo(options.lastMapRenderDurationMs, 2),
      displayObjectCount: options.displayObjectCount,
      textureCount: options.textureCount,
    },
    proofs: {
      mapSize: `${mapWidthTiles}x${mapHeightTiles}`,
      tileBatching: {
        compatible: options.tilemap.staticGpuLayerCount >= 2,
        staticGpuLayerCount: options.tilemap.staticGpuLayerCount,
        staticCpuLayerCount: options.tilemap.staticCpuLayerCount,
        staticLayerBatchCount: options.tilemap.staticLayerBatchCount,
        staticTileCount: options.tilemap.staticTileCount,
      },
      viewportCulling: {
        active:
          options.objectPool.activeSpriteCount ===
          options.objectPool.visibleSpriteCount +
            options.objectPool.culledSpriteCount,
        activeObjectSpriteCount: options.objectPool.activeSpriteCount,
        visibleObjectSpriteCount: options.objectPool.visibleSpriteCount,
        culledObjectSpriteCount: options.objectPool.culledSpriteCount,
        culledRatio: roundTo(
          options.objectPool.culledSpriteCount /
            Math.max(1, options.objectPool.activeSpriteCount),
          3,
        ),
      },
      objectPooling: {
        active: true,
        createdSpriteCount: options.objectPool.createdSpriteCount,
        reusedSpriteCount: options.objectPool.reusedSpriteCount,
        pooledSpriteCount: options.objectPool.pooledSpriteCount,
        reuseObserved: options.objectPool.reusedSpriteCount > 0,
      },
      textureReuse: {
        tilesetReused: options.assets.tilesetReused,
        cachedTextureCount: options.objectPool.cachedTextureCount,
        createdTextureCount: options.objectPool.createdTextureCount,
        reusedTextureCount: options.objectPool.reusedTextureCount,
        reuseObserved:
          options.assets.tilesetReused ||
          options.objectPool.reusedTextureCount > 0,
      },
    },
  }
}

function chunkInfo(
  camera: RendererCameraState,
  tileSize: number,
): RendererPerformanceInfo["chunking"] {
  const mapWidthTiles = Math.max(1, Math.ceil(camera.mapWidth / tileSize))
  const mapHeightTiles = Math.max(1, Math.ceil(camera.mapHeight / tileSize))
  const chunkColumns = Math.ceil(mapWidthTiles / CHUNK_SIZE_TILES)
  const chunkRows = Math.ceil(mapHeightTiles / CHUNK_SIZE_TILES)
  const totalChunks = chunkColumns * chunkRows
  const visibleStartX = Math.max(
    0,
    Math.floor(camera.worldView.x / tileSize / CHUNK_SIZE_TILES),
  )
  const visibleStartY = Math.max(
    0,
    Math.floor(camera.worldView.y / tileSize / CHUNK_SIZE_TILES),
  )
  const visibleEndX = Math.min(
    chunkColumns - 1,
    Math.floor(
      (camera.worldView.x + camera.worldView.width) /
        tileSize /
        CHUNK_SIZE_TILES,
    ),
  )
  const visibleEndY = Math.min(
    chunkRows - 1,
    Math.floor(
      (camera.worldView.y + camera.worldView.height) /
        tileSize /
        CHUNK_SIZE_TILES,
    ),
  )
  const visibleChunks = Math.max(
    1,
    (visibleEndX - visibleStartX + 1) * (visibleEndY - visibleStartY + 1),
  )

  return {
    chunkSizeTiles: CHUNK_SIZE_TILES,
    totalChunks,
    visibleChunks,
    visibleChunkRatio: roundTo(visibleChunks / totalChunks, 3),
  }
}
