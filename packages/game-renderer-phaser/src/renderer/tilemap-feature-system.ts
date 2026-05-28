import Phaser from "phaser"

import {
  RENDERER_VERTEX_ROUND_MODE,
} from "./constants"
import type {
  FixtureMap,
  RendererTilemapFeatureInfo,
  RendererTilemapLayerInfo,
} from "./types"

interface TilemapFeatureOptions {
  readonly tilemap: Phaser.Tilemaps.Tilemap
  readonly fixtureMap: FixtureMap
}

type TilemapLayerName = RendererTilemapLayerInfo["name"]

const TILEMAP_FEATURE_LAYER_NAMES: readonly TilemapLayerName[] = [
  "floor",
  "walls",
]
const MAX_ANIMATED_TILE_OVERLAYS = 96
const ANIMATED_TILE_OVERLAY_DEPTH = 13

export class TilemapFeatureSystem {
  private animatedOverlays: Phaser.GameObjects.Rectangle[] = []
  private callbackInvocationCount = 0
  private info: RendererTilemapFeatureInfo = emptyTilemapFeatureInfo()

  constructor(private readonly scene: Phaser.Scene) {}

  configure(options: TilemapFeatureOptions): RendererTilemapFeatureInfo {
    this.clear()
    this.applyCollisionProperties(options.tilemap)
    const callbackInfo = this.registerTileCallbacks(options.tilemap, options.fixtureMap)
    const animationInfo = this.createAnimatedTileOverlays(options)
    const metadataInfo = this.collectMetadata(options.tilemap)

    this.info = {
      source: "phaser_tilemap_runtime_features",
      authority: "renderer_editor_affordances_only",
      enabled: true,
      features: [
        "tile_metadata",
        "tile_collision_properties",
        "tile_index_callbacks",
        "tile_location_callbacks",
        "animated_tile_overlays",
        "layered_editor_metadata",
      ],
      metadata: metadataInfo.metadata,
      collision: {
        propertyCollisionTileCount: metadataInfo.propertyCollisionTileCount,
        propertyCollisionLayerNames:
          metadataInfo.propertyCollisionTileCount > 0 ? ["walls"] : [],
        serverAuthorityBoundary:
          "compiled_collision_layers_remain_authoritative",
      },
      callbacks: {
        ...callbackInfo,
        invocationCount: this.callbackInvocationCount,
      },
      animation: animationInfo,
      editor: {
        selectableTileCount: metadataInfo.selectableTileCount,
        tenantCustomizableTileCount: metadataInfo.tenantCustomizableTileCount,
        inspectedLayerCount: metadataInfo.metadata.layerNames.length,
        layeredInspectorReady: metadataInfo.metadata.layerNames.length > 0,
      },
    }

    return this.info
  }

  clear(): void {
    this.animatedOverlays.forEach((overlay) => {
      this.scene.tweens.killTweensOf(overlay)
      overlay.destroy()
    })
    this.animatedOverlays = []
    this.callbackInvocationCount = 0
    this.info = emptyTilemapFeatureInfo()
  }

  getInfo(): RendererTilemapFeatureInfo {
    return this.info
  }

  private applyCollisionProperties(tilemap: Phaser.Tilemaps.Tilemap): void {
    tilemap.setCollisionByProperty({ collides: true }, true, true, "walls")
  }

  private registerTileCallbacks(
    tilemap: Phaser.Tilemaps.Tilemap,
    fixtureMap: FixtureMap,
  ): Pick<
    RendererTilemapFeatureInfo["callbacks"],
    | "tileIndexCallbackCount"
    | "tileLocationCallbackCount"
    | "callbackLayerNames"
    | "registeredSemanticIds"
  > {
    const wallSemanticIds = new Set<string>()
    const wallGids = new Set<number>()
    const floorLayerHasZones = fixtureMap.compiled.zones.length > 0

    tilesForLayer(tilemap, "walls").forEach((tile) => {
      if (!tile?.properties?.collides) return

      wallGids.add(tile.index)
      if (typeof tile.properties.semanticId === "string") {
        wallSemanticIds.add(tile.properties.semanticId)
      }
    })

    if (wallGids.size > 0) {
      tilemap.setTileIndexCallback(
        [...wallGids],
        this.handleTileCallback,
        this,
        "walls",
      )
    }

    fixtureMap.compiled.zones.forEach((zone) => {
      tilemap.setTileLocationCallback(
        zone.xStart,
        zone.yStart,
        Math.max(1, zone.xEnd - zone.xStart),
        Math.max(1, zone.yEnd - zone.yStart),
        this.handleTileCallback,
        this,
        "floor",
      )
    })

    return {
      tileIndexCallbackCount: wallGids.size,
      tileLocationCallbackCount: fixtureMap.compiled.zones.length,
      callbackLayerNames: [
        ...(wallGids.size > 0 ? ["walls" as const] : []),
        ...(floorLayerHasZones ? ["floor" as const] : []),
      ],
      registeredSemanticIds: [...wallSemanticIds].sort(),
    }
  }

  private createAnimatedTileOverlays(
    options: TilemapFeatureOptions,
  ): RendererTilemapFeatureInfo["animation"] {
    const animatedTiles = tilesForLayer(options.tilemap, "walls")
      .filter((tile) => tile?.properties?.animated)
      .slice(0, MAX_ANIMATED_TILE_OVERLAYS)
    const animatedSemanticIds = new Set<string>()

    animatedTiles.forEach((tile, index) => {
      if (typeof tile.properties.semanticId === "string") {
        animatedSemanticIds.add(tile.properties.semanticId)
      }

      const overlay = this.scene.add.rectangle(
        tile.pixelX + tile.width / 2,
        tile.pixelY + tile.height / 2,
        Math.max(4, tile.width - 7),
        Math.max(4, tile.height - 12),
        0xffffff,
        0.06,
      )
      overlay.setName(`animated-tile-overlay:${tile.properties.semanticId}:${tile.x},${tile.y}`)
      overlay.setDepth(ANIMATED_TILE_OVERLAY_DEPTH)
      overlay.setBlendMode(Phaser.BlendModes.SCREEN)
      overlay.setVertexRoundMode(RENDERER_VERTEX_ROUND_MODE)
      this.scene.tweens.add({
        targets: overlay,
        alpha: 0.18,
        duration: 1250 + (index % 7) * 90,
        delay: (index % 5) * 80,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      })
      this.animatedOverlays.push(overlay)
    })

    return {
      animatedTileCount: animatedTiles.length,
      animatedOverlayCount: this.animatedOverlays.length,
      animatedSemanticIds: [...animatedSemanticIds].sort(),
      maxAnimatedTiles: MAX_ANIMATED_TILE_OVERLAYS,
      clock: "phaser_tweens",
      deterministic: false,
    }
  }

  private collectMetadata(tilemap: Phaser.Tilemaps.Tilemap): {
    readonly metadata: RendererTilemapFeatureInfo["metadata"]
    readonly propertyCollisionTileCount: number
    readonly selectableTileCount: number
    readonly tenantCustomizableTileCount: number
  } {
    const layerNames: TilemapLayerName[] = []
    const semanticIds = new Set<string>()
    let tilePropertyCount = 0
    let semanticTilePropertyCount = 0
    let editorPropertyCount = 0
    let propertyCollisionTileCount = 0
    let selectableTileCount = 0
    let tenantCustomizableTileCount = 0

    TILEMAP_FEATURE_LAYER_NAMES.forEach((layerName) => {
      const tiles = tilesForLayer(tilemap, layerName)
      if (tiles.length === 0) return

      layerNames.push(layerName)
      tiles.forEach((tile) => {
        if (!tile?.properties || tile.properties.schemaVersion !== 1) return

        tilePropertyCount += 1
        if (typeof tile.properties.semanticId === "string") {
          semanticTilePropertyCount += 1
          semanticIds.add(tile.properties.semanticId)
        }
        if (tile.properties.collides) {
          propertyCollisionTileCount += 1
        }
        if (tile.properties.editorSelectable) {
          editorPropertyCount += 1
          selectableTileCount += 1
        }
        if (tile.properties.tenantCustomizable) {
          tenantCustomizableTileCount += 1
        }
      })
    })

    return {
      metadata: {
        propertySchemaVersion: 1,
        tilePropertyCount,
        semanticTilePropertyCount,
        editorPropertyCount,
        uniqueSemanticTokenCount: semanticIds.size,
        layerNames,
      },
      propertyCollisionTileCount,
      selectableTileCount,
      tenantCustomizableTileCount,
    }
  }

  private handleTileCallback(): boolean {
    this.callbackInvocationCount += 1
    return false
  }
}

export function emptyTilemapFeatureInfo(): RendererTilemapFeatureInfo {
  return {
    source: "phaser_tilemap_runtime_features",
    authority: "renderer_editor_affordances_only",
    enabled: false,
    features: [
      "tile_metadata",
      "tile_collision_properties",
      "tile_index_callbacks",
      "tile_location_callbacks",
      "animated_tile_overlays",
      "layered_editor_metadata",
    ],
    metadata: {
      propertySchemaVersion: 1,
      tilePropertyCount: 0,
      semanticTilePropertyCount: 0,
      editorPropertyCount: 0,
      uniqueSemanticTokenCount: 0,
      layerNames: [],
    },
    collision: {
      propertyCollisionTileCount: 0,
      propertyCollisionLayerNames: [],
      serverAuthorityBoundary:
        "compiled_collision_layers_remain_authoritative",
    },
    callbacks: {
      tileIndexCallbackCount: 0,
      tileLocationCallbackCount: 0,
      callbackLayerNames: [],
      registeredSemanticIds: [],
      invocationCount: 0,
    },
    animation: {
      animatedTileCount: 0,
      animatedOverlayCount: 0,
      animatedSemanticIds: [],
      maxAnimatedTiles: MAX_ANIMATED_TILE_OVERLAYS,
      clock: "phaser_tweens",
      deterministic: false,
    },
    editor: {
      selectableTileCount: 0,
      tenantCustomizableTileCount: 0,
      inspectedLayerCount: 0,
      layeredInspectorReady: false,
    },
  }
}

function tilesForLayer(
  tilemap: Phaser.Tilemaps.Tilemap,
  layerName: TilemapLayerName,
): readonly Phaser.Tilemaps.Tile[] {
  return (tilemap.getLayer(layerName)?.data ?? [])
    .flat()
    .filter((tile): tile is Phaser.Tilemaps.Tile => Boolean(tile))
}
