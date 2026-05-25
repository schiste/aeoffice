import type { VisualAssetFrameMetadata } from "@aedventure/asset-registry"

export type Direction = "up" | "down" | "left" | "right"

export interface Vector2 {
  readonly x: number
  readonly y: number
}

export interface FixtureMap {
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

export interface TileLayer {
  readonly gids: readonly (readonly number[])[]
}

export interface FixtureToken {
  readonly id: string
  readonly kind: "floor" | "wall" | "item" | "avatar"
  readonly provisionalGid: number
  readonly widthTiles: number
  readonly heightTiles: number
  readonly asset?: VisualAssetFrameMetadata
}

export interface TileSegment {
  readonly offsetX: number
  readonly offsetY: number
  readonly widthTiles: number
  readonly heightTiles: number
}

export interface MultiTileVariantGids {
  readonly byRootGid: ReadonlyMap<number, readonly (readonly number[])[]>
  readonly allGids: readonly number[]
}

export interface FixtureZone {
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
  readonly canZoomIn: boolean
  readonly canZoomOut: boolean
  readonly scrollX: number
  readonly scrollY: number
  readonly followingPlayerId?: string
}

export type RendererTileLayerMode = "gpu" | "cpu"

export interface RendererTilemapLayerInfo {
  readonly name: "floor" | "walls"
  readonly mode: RendererTileLayerMode
  readonly width: number
  readonly height: number
  readonly populatedTileCount: number
}

export interface RendererTilemapInfo {
  readonly staticLayers: readonly RendererTilemapLayerInfo[]
  readonly staticGpuLayerCount: number
  readonly staticCpuLayerCount: number
  readonly staticTileCount: number
  readonly objectLayerMode: "sprites"
  readonly zoneLayerMode: "graphics"
  readonly avatarLayerMode: "display_objects"
  readonly labelLayerMode: "display_objects"
}

export interface RendererDepthPlacementBounds {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface RendererDepthObjectInfo {
  readonly id: string
  readonly tokenId: string
  readonly kind: FixtureToken["kind"]
  readonly layer: "object" | "wall_foreground"
  readonly depth: number
  readonly zAnchor: Vector2
  readonly bounds: RendererDepthPlacementBounds
  readonly occlusionMode: "none" | "y_sort" | "foreground"
}

export interface RendererDepthPlayerInfo {
  readonly playerId: string
  readonly name: string
  readonly local: boolean
  readonly depth: number
  readonly zAnchor: Vector2
  readonly labelBounds: RendererDepthPlacementBounds
}

export interface RendererDepthInfo {
  readonly debugOverlayEnabled: boolean
  readonly objectCount: number
  readonly foregroundObjectCount: number
  readonly playerCount: number
  readonly objects: readonly RendererDepthObjectInfo[]
  readonly players: readonly RendererDepthPlayerInfo[]
}

export interface RendererAssetPipelineInfo {
  readonly atlasId?: string
  readonly manifestPath: string
  readonly imagePath: string
  readonly primarySource: "internal_atlas" | "procedural_fallback"
  readonly atlasLoaded: boolean
  readonly manifestLoaded: boolean
  readonly renderedTokenCount: number
  readonly fallbackTokenCount: number
  readonly fallbackTokenIds: readonly string[]
  readonly exportScale?: number
  readonly retinaStrategy?: string
}

export interface RendererCapabilityInfo {
  readonly requestedRenderer: "webgl"
  readonly actualRenderer: "webgl" | "canvas" | "headless" | "unknown"
  readonly phaserVersion: string
  readonly canvas: {
    readonly width: number
    readonly height: number
    readonly clientWidth: number
    readonly clientHeight: number
  }
  readonly config: {
    readonly pixelArt: boolean
    readonly smoothPixelArt: boolean
    readonly antialias: boolean
    readonly antialiasGL: boolean
    readonly roundPixels: boolean
    readonly powerPreference: "high-performance"
    readonly clearBeforeRender: boolean
    readonly preserveDrawingBuffer: boolean
    readonly premultipliedAlpha: boolean
    readonly failIfMajorPerformanceCaveat: boolean
  }
  readonly rounding: {
    readonly globalRoundPixels: boolean
    readonly cameraRoundPixels: boolean
    readonly cameraFollowRoundsPixels: boolean
    readonly vertexRoundMode: "safeAuto"
  }
  readonly assets: RendererAssetPipelineInfo
  readonly depth: RendererDepthInfo
  readonly tilemap: RendererTilemapInfo
  readonly webgl: {
    readonly available: boolean
    readonly contextLost: boolean
    readonly contextLossCount: number
    readonly contextRestoreCount: number
    readonly recoveryReady: boolean
    readonly loseContextExtensionAvailable: boolean
    readonly maxTextures?: number
    readonly maxTextureSize?: number
    readonly drawingBufferWidth?: number
    readonly drawingBufferHeight?: number
    readonly supportedExtensionCount?: number
  }
}
