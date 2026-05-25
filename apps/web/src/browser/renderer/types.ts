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

export type RendererZoneKind =
  | "meeting"
  | "private"
  | "portal"
  | "lobby"
  | "quiet"
  | "generic"

export type RendererZoneAvailability =
  | "passive"
  | "hovered"
  | "available"
  | "joined"

export type RendererZoneAction = "join_meeting" | "enter_private" | "enter_portal"

export interface RendererZoneBounds {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface RendererZoneInteractionState {
  readonly activeZoneIds: readonly string[]
  readonly availableActionZoneIds?: readonly string[]
  readonly joinedZoneIds?: readonly string[]
}

export interface RendererZoneInfo {
  readonly id: string
  readonly zoneType: string
  readonly kind: RendererZoneKind
  readonly bounds: RendererZoneBounds
  readonly active: boolean
  readonly hovered: boolean
  readonly availability: RendererZoneAvailability
  readonly availableAction?: RendererZoneAction
  readonly label: string
  readonly labelVisible: boolean
  readonly labelScale: number
  readonly markerVisible: boolean
  readonly debugVisible: boolean
}

export interface RendererZonePresentationInfo {
  readonly source: "compiled_map"
  readonly zoneCount: number
  readonly hoveredZoneId?: string
  readonly activeZoneIds: readonly string[]
  readonly availableActionZoneIds: readonly string[]
  readonly joinedZoneIds: readonly string[]
  readonly debugOverlayEnabled: boolean
  readonly zones: readonly RendererZoneInfo[]
}

export type RendererEffectsQuality = "auto" | "off" | "low" | "premium"
export type RendererResolvedEffectsQuality = "off" | "low" | "premium"
export type RendererTenantLightingMode = "day" | "night" | "tenant_theme"

export type RendererEffectsDisableReason =
  | "forced_off"
  | "not_webgl"
  | "context_lost"
  | "low_capability"

export interface RendererEffectsOptions {
  readonly enabled?: boolean
  readonly quality?: RendererEffectsQuality
  readonly tenantLighting?: RendererTenantLightingMode
  readonly lowCapabilityOverride?: boolean
}

export interface RendererEffectsInfo {
  readonly source: "renderer_runtime"
  readonly authority: "visual_only"
  readonly requested: {
    readonly enabled: boolean
    readonly quality: RendererEffectsQuality
    readonly tenantLighting: RendererTenantLightingMode
  }
  readonly enabled: boolean
  readonly quality: RendererResolvedEffectsQuality
  readonly deterministic: boolean
  readonly animationMode: "static"
  readonly disabledReason?: RendererEffectsDisableReason
  readonly capability: {
    readonly webglAvailable: boolean
    readonly contextLost: boolean
    readonly lowCapability: boolean
    readonly filtersAvailable: boolean
    readonly maxTextureSize?: number
  }
  readonly applied: {
    readonly webglFilters: readonly string[]
    readonly ambientEffects: readonly string[]
    readonly lightPass: "none" | "static_room_lights"
    readonly shadowPass: "none" | "static_corner_shadows"
    readonly selectionOutlines: "zone_renderer"
    readonly hoverOutlines: "zone_renderer"
    readonly tenantLighting: RendererTenantLightingMode
  }
  readonly objectCounts: {
    readonly ambientShapes: number
    readonly lightShapes: number
    readonly shadowShapes: number
  }
}

export interface RenderedPlayer {
  readonly playerId: string
  readonly name: string
  readonly avatarId?: string
  readonly cosmetics?: Partial<Record<AvatarCosmeticSlot, string>>
  readonly emoteId?: AvatarEmoteId
  readonly position: Vector2
  readonly direction: Direction
  readonly local: boolean
  readonly rejected?: boolean
}

export type AvatarAnimationAction = "idle" | "walk"

export type AvatarEmoteId = "wave" | "raise_hand" | "focus"

export type AvatarCosmeticSlot =
  | "hair"
  | "face"
  | "torso"
  | "accessory"
  | "badge"

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

export type RendererCameraMode = "follow_player" | "fit_room"

export type RendererZoomPresetId =
  | "room"
  | "standard"
  | "near"
  | "focus"
  | "custom"

export interface RendererCameraDeadzone {
  readonly width: number
  readonly height: number
}

export interface RendererCameraWorldView {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface RendererCameraState {
  readonly mode: RendererCameraMode
  readonly zoomPreset: RendererZoomPresetId
  readonly zoomFactor: number
  readonly defaultZoomFactor: number
  readonly effectiveZoom: number
  readonly minZoomFactor: number
  readonly maxZoomFactor: number
  readonly canZoomIn: boolean
  readonly canZoomOut: boolean
  readonly viewportWidth: number
  readonly viewportHeight: number
  readonly mapWidth: number
  readonly mapHeight: number
  readonly scrollX: number
  readonly scrollY: number
  readonly worldView: RendererCameraWorldView
  readonly deadzone: RendererCameraDeadzone
  readonly followLerp: number
  readonly followAnchor: "stable_player_anchor" | "room_center" | "none"
  readonly followingPlayerId?: string
  readonly localPlayerVisible: boolean
  readonly localPlayerViewportPosition?: Vector2
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
  readonly labelVisible: boolean
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

export interface RendererAvatarAnimationInfo {
  readonly key: string
  readonly action: AvatarAnimationAction
  readonly direction: Direction
  readonly durationMs: number
}

export interface RendererAvatarPlayerInfo {
  readonly playerId: string
  readonly name: string
  readonly avatarId: string
  readonly local: boolean
  readonly direction: Direction
  readonly currentPosition: Vector2
  readonly targetPosition: Vector2
  readonly animation: RendererAvatarAnimationInfo
  readonly interpolationProfile: "local" | "remote"
  readonly interpolationActive: boolean
  readonly labelVisible: boolean
  readonly labelVisibilityReason: "visible" | "overlap_suppressed"
  readonly labelBounds: RendererDepthPlacementBounds
  readonly emoteId?: AvatarEmoteId
  readonly cosmeticSlots: readonly AvatarCosmeticSlot[]
  readonly cosmetics: Partial<Record<AvatarCosmeticSlot, string>>
}

export interface RendererAvatarInfo {
  readonly source: "renderer_runtime"
  readonly availableAvatarIds: readonly string[]
  readonly animationKeys: readonly string[]
  readonly animationCount: number
  readonly emoteIds: readonly AvatarEmoteId[]
  readonly interpolationProfiles: readonly ("local" | "remote")[]
  readonly cosmeticSlots: readonly AvatarCosmeticSlot[]
  readonly players: readonly RendererAvatarPlayerInfo[]
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
  readonly effects: RendererEffectsInfo
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
