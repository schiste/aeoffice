import type { VisualAssetFrameMetadata } from "@aedventure/asset-registry"

export type Direction = "up" | "down" | "left" | "right"
export type MovementMode = "walk" | "run"

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
    readonly blockedTiles?: readonly Vector2[]
    readonly layers: {
      readonly floor: TileLayer
      readonly walls: TileLayer
      readonly objects: TileLayer
    }
    readonly zones: readonly FixtureZone[]
    readonly collisionLayers?: {
      readonly movement: {
        readonly name: "movement"
        readonly width: number
        readonly height: number
        readonly blocked: readonly (readonly boolean[])[]
        readonly blockedTiles: readonly Vector2[]
      }
    }
  }
  readonly catalog: {
    readonly tokens: readonly FixtureToken[]
  }
}

export interface RendererMapValidationInfo {
  readonly source: "renderer_preflight"
  readonly valid: boolean
  readonly mutationSafe: boolean
  readonly errors: readonly string[]
  readonly checkedLayerNames: readonly string[]
  readonly visualFootprintCount: number
  readonly collisionLayerPresent: boolean
  readonly renderFingerprint: string
}

export type RendererDevToolOverlayId =
  | "grid"
  | "collision"
  | "zones"
  | "depth"
  | "objectFootprints"
  | "spriteBounds"
  | "camera"

export type RendererDevToolOverlayState = Record<RendererDevToolOverlayId, boolean>

export interface RendererDevToolsFixtureSelectorInfo {
  readonly enabled: boolean
  readonly activeFixtureId?: string
  readonly availableFixtureIds: readonly string[]
}

export interface RendererDevToolsOptions {
  readonly gated?: boolean
  readonly enabled?: boolean
  readonly overlays?: Partial<RendererDevToolOverlayState>
  readonly fixtureSelector?: RendererDevToolsFixtureSelectorInfo
}

export interface RendererDevToolsInfo {
  readonly source: "renderer_dev_tools"
  readonly gated: boolean
  readonly enabled: boolean
  readonly overlays: RendererDevToolOverlayState
  readonly fixtureSelector: RendererDevToolsFixtureSelectorInfo
  readonly overlayObjectCounts: {
    readonly gridLineCount: number
    readonly blockedTileCount: number
    readonly zoneBoundsCount: number
    readonly depthAnchorCount: number
    readonly objectFootprintCount: number
    readonly spriteBoundsCount: number
  }
  readonly cameraReadout?: {
    readonly mode: RendererCameraMode
    readonly zoomPreset: RendererZoomPresetId
    readonly effectiveZoom: number
    readonly scrollX: number
    readonly scrollY: number
    readonly worldView: RendererCameraWorldView
  }
  readonly keyboardShortcuts: readonly string[]
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

export type RendererZoneFeedback =
  | "none"
  | "meeting_ready"
  | "private_boundary"
  | "private_access_available"
  | "portal_ready"
  | "joined"

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
  readonly feedback: RendererZoneFeedback
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

export type RendererWorldInteractionKind = "zone" | "object"

export type RendererWorldInteractionAction =
  | RendererZoneAction
  | "open_door"
  | "use_object"

export type RendererWorldInteractionPermissionState =
  | "pending"
  | "permitted"
  | "denied"

export interface RendererWorldInteractionCandidate {
  readonly id: string
  readonly kind: RendererWorldInteractionKind
  readonly targetId: string
  readonly action: RendererWorldInteractionAction
  readonly label: string
  readonly prompt: string
  readonly bounds: RendererZoneBounds
  readonly active: boolean
  readonly distancePx?: number
  readonly permission: RendererWorldInteractionPermissionState
  readonly serverPermitted: boolean
  readonly permissionReason?: string
  readonly markerVisible: boolean
}

export type RendererWorldInteractionAffordance =
  | "none"
  | "walk_nearby"
  | "checking_permission"
  | "press_e_or_tap"
  | "server_denied"

export interface RendererWorldInteractionInfo {
  readonly source: "server_permitted_world_interactions"
  readonly authority: "server_permitted_actions_only"
  readonly permissionSource: "dev_world_action_policy" | "unavailable"
  readonly state: "idle" | "pending" | "available" | "denied"
  readonly actionAffordance?: RendererWorldInteractionAffordance
  readonly hotkeyLabel?: "E"
  readonly tapLabel?: "Tap"
  readonly hoveredCandidateId?: string
  readonly selectedCandidateId?: string
  readonly presentation?: {
    readonly markerStyle: "action_marker_cards"
    readonly selectionMode: "hover_click_marker"
    readonly privateAreaFeedback:
      | "none"
      | "available"
      | "pending"
      | "denied"
  }
  readonly primaryCandidateId?: string
  readonly activeCandidateIds: readonly string[]
  readonly permittedCandidateIds: readonly string[]
  readonly deniedCandidateIds: readonly string[]
  readonly candidates: readonly RendererWorldInteractionCandidate[]
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
  readonly movementMode?: MovementMode
  readonly cameraMotion?: RendererCameraFollowMotion
  readonly entryAnimation?: "fade" | "none"
  readonly snapshotTick?: number
  readonly snapshotServerTime?: number
  readonly snapshotReceivedAtMs?: number
  readonly local: boolean
  readonly rejected?: boolean
}

export type AvatarAnimationAction = "idle" | "walk" | "run" | "turn"

export type AvatarVisualFacing =
  | "up"
  | "upRight"
  | "right"
  | "downRight"
  | "down"
  | "downLeft"
  | "left"
  | "upLeft"

export type AvatarEmoteId = "wave" | "raise_hand" | "focus"

export type AvatarCosmeticSlot =
  | "hair"
  | "face"
  | "torso"
  | "accessory"
  | "badge"

export type RendererAvatarRenderMode = "procedural_proxy" | "sprite_atlas"
export type RendererAvatarAtlasSource =
  | "runtime_generated_avatar_parts"
  | "runtime_generated_sprite_atlas"

export interface RendererAvatarSpriteAnchor {
  readonly x: number
  readonly y: number
}

export interface RendererAvatarSpriteAtlasInfo {
  readonly source: RendererAvatarAtlasSource
  readonly schemaVersion: number
  readonly atlasId: string
  readonly textureKey: string
  readonly renderMode: RendererAvatarRenderMode
  readonly frameWidth: number
  readonly frameHeight: number
  readonly frameCount: number
  readonly exportScale: number
  readonly anchor: RendererAvatarSpriteAnchor
  readonly frameKeyStrategy: "avatar_action_server_direction_frame"
  readonly serverDirectionModel: "4_way"
  readonly visualDirectionModel: "8_way"
  readonly serverDirectionCount: 4
  readonly visualFacingCount: 8
  readonly supportedStates: readonly AvatarAnimationAction[]
  readonly stateDefinitions: readonly RendererAvatarAnimationStateDefinition[]
  readonly generatedTextureSource: "runtime_canvas_sprite_frames"
  readonly cosmeticSlots: readonly AvatarCosmeticSlot[]
}

export interface RendererAvatarAnimationStateDefinition {
  readonly action: AvatarAnimationAction
  readonly frameCount: number
  readonly frameRate: number
  readonly frameDurationMs: number
  readonly durationMs: number
  readonly loop: boolean
  readonly repeat: number
  readonly blendDurationMs: number
}

export interface RendererAvatarAnimationPipelineInfo {
  readonly source: "sprite_atlas_metadata"
  readonly atlasId: string
  readonly renderer: "phaser_image_frame_swap"
  readonly frameKeyStrategy: "avatar_action_server_direction_frame"
  readonly generatedTextureSource: "runtime_canvas_sprite_frames"
  readonly serverDirectionModel: "4_way"
  readonly visualDirectionModel: "8_way"
  readonly turnBlending: "pose_blend"
  readonly emoteHooks: "renderer_emote_registry"
  readonly labelVisibilityRules: "local_always_remote_overlap_suppressed"
  readonly stateDefinitions: readonly RendererAvatarAnimationStateDefinition[]
}

export interface RendererAvatarAnimationSpriteInfo {
  readonly atlasId: string
  readonly renderMode: RendererAvatarRenderMode
  readonly framePrefix: string
  readonly frameKeys: readonly string[]
  readonly textureKeys: readonly string[]
  readonly frameCount: number
  readonly frameRate: number
  readonly frameDurationMs: number
  readonly loop: boolean
  readonly blendDurationMs: number
  readonly anchor: RendererAvatarSpriteAnchor
}

export interface RendererAvatarAnimationPreviewFixture {
  readonly id: string
  readonly avatarId: string
  readonly action: AvatarAnimationAction
  readonly serverDirection: Direction
  readonly visualFacing: AvatarVisualFacing
  readonly animationKey: string
  readonly frameKeys: readonly string[]
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

export interface RendererCameraFollowMotion {
  readonly velocity: Vector2
  readonly speedPxPerSecond: number
  readonly inputActive: boolean
  readonly correcting: boolean
  readonly movementMode: MovementMode
}

export interface RendererCameraLeadState {
  readonly enabled: boolean
  readonly active: boolean
  readonly source: "motion_snapshot" | "derived_target_delta" | "idle"
  readonly offset: Vector2
  readonly targetOffset: Vector2
  readonly velocity: Vector2
  readonly speedPxPerSecond: number
  readonly maxDistancePx: number
  readonly smoothingTimeConstantMs: number
  readonly correctionDampingActive: boolean
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
  readonly followAnchor: "leading_player_anchor" | "room_center" | "none"
  readonly lead: RendererCameraLeadState
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
  readonly staticLayerBatching: "phaser_tilemap_gpu_layers"
  readonly staticLayerBatchCount: number
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
  readonly collisionBounds: RendererDepthPlacementBounds
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
  readonly tilesetSignature?: string
  readonly tilesetReused: boolean
  readonly metadata: {
    readonly schemaVersion?: number
    readonly frameCount: number
    readonly collisionFootprintCount: number
    readonly visualFootprintCount: number
    readonly zAnchorCount: number
    readonly occlusionSplitCount: number
    readonly variantCount: number
    readonly tenantThemeTagCount: number
    readonly tenantThemeTags: readonly string[]
    readonly sourceInputCount: number
    readonly sourceLicenseValidated: boolean
    readonly atlasBuildValidated: boolean
  }
}

export interface RendererObjectPoolInfo {
  readonly activeSpriteCount: number
  readonly visibleSpriteCount: number
  readonly culledSpriteCount: number
  readonly pooledSpriteCount: number
  readonly createdSpriteCount: number
  readonly reusedSpriteCount: number
  readonly cachedTextureCount: number
  readonly createdTextureCount: number
  readonly reusedTextureCount: number
}

export interface RendererAvatarAnimationInfo {
  readonly pipeline: "sprite_atlas_metadata"
  readonly key: string
  readonly action: AvatarAnimationAction
  readonly state: AvatarAnimationAction
  readonly direction: Direction
  readonly serverDirection: Direction
  readonly visualFacing: AvatarVisualFacing
  readonly durationMs: number
  readonly sprite: RendererAvatarAnimationSpriteInfo
  readonly frameIndex: number
  readonly frameKey: string
  readonly frameRate: number
  readonly frameDurationMs: number
  readonly loop: boolean
  readonly blendDurationMs: number
  readonly poseBlendActive: boolean
}

export interface RendererRemoteInterpolationInfo {
  readonly mode: "snapshot_buffer"
  readonly source: "server_snapshot_stream"
  readonly interpolationDelayMs: number
  readonly extrapolationLimitMs: number
  readonly bufferedSnapshotCount: number
  readonly bufferedWindowMs: number
  readonly renderTimeMs: number
  readonly latestSnapshotAgeMs: number
  readonly latestSnapshotTick?: number
  readonly latestSnapshotServerTime?: number
  readonly latestSnapshotReceivedAtMs?: number
  readonly extrapolating: boolean
  readonly snapping: boolean
  readonly velocity: Vector2
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
  readonly remoteInterpolation?: RendererRemoteInterpolationInfo
  readonly movementSmoothing: {
    readonly mode:
      | "continuous_local_motion"
      | "client_prediction_reconciliation"
      | "remote_interpolation"
      | "remote_snapshot_buffer"
    readonly logicalVertexRoundMode: "off"
    readonly visualTransformIsolation: "inner_visual_root"
  }
  readonly labelVisible: boolean
  readonly labelVisibilityReason: "visible" | "overlap_suppressed"
  readonly labelPolicy: "local_always_remote_overlap_suppressed"
  readonly labelBounds: RendererDepthPlacementBounds
  readonly labelResolution: number
  readonly labelTextureFilter: "linear"
  readonly labelScreenScale: number
  readonly emoteId?: AvatarEmoteId
  readonly cosmeticSlots: readonly AvatarCosmeticSlot[]
  readonly cosmetics: Partial<Record<AvatarCosmeticSlot, string>>
}

export interface RendererAvatarInfo {
  readonly source: "renderer_runtime"
  readonly availableAvatarIds: readonly string[]
  readonly spriteAtlas: RendererAvatarSpriteAtlasInfo
  readonly animationPipeline: RendererAvatarAnimationPipelineInfo
  readonly animationStates: readonly AvatarAnimationAction[]
  readonly animationKeys: readonly string[]
  readonly animationCount: number
  readonly previewFixtures: readonly RendererAvatarAnimationPreviewFixture[]
  readonly visualDirectionModel: "server_4_way_visual_8_way"
  readonly labelVisibilityRules: "local_always_remote_overlap_suppressed"
  readonly emoteHooks: "renderer_emote_registry"
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
  readonly mapValidation: RendererMapValidationInfo
  readonly performance: RendererPerformanceInfo
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

export interface RendererPerformanceInfo {
  readonly source: "renderer_runtime"
  readonly target: {
    readonly targetFps: 60
    readonly minimumAcceptableFps: 45
    readonly targetFrameBudgetMs: 16.67
    readonly minimumFrameBudgetMs: 22.22
    readonly smokeAverageBudgetMs: 50
    readonly smokeP95BudgetMs: 90
    readonly smokeMaxBudgetMs: 250
    readonly benchmarkMaps: readonly ["20x15", "50x40", "100x80"]
    readonly documentedAt: "docs/renderer-performance-budget.md"
  }
  readonly strategy: {
    readonly tileLayerBatching: "phaser_tilemap_gpu_layers"
    readonly roomChunking: "logical_32x32_tile_chunks"
    readonly tileLayerCulling: "camera_gpu_layer"
    readonly objectCulling: "camera_worldview_margin"
    readonly objectPooling: "pooled_phaser_images"
    readonly textureReuse: "signature_reused_tileset_and_object_textures"
    readonly gameReuse: "single_phaser_game_instance"
  }
  readonly chunking: {
    readonly chunkSizeTiles: number
    readonly totalChunks: number
    readonly visibleChunks: number
    readonly visibleChunkRatio: number
  }
  readonly culling: {
    readonly cullMarginPx: number
    readonly visibleObjectSpriteCount: number
    readonly culledObjectSpriteCount: number
  }
  readonly pooling: RendererObjectPoolInfo
  readonly lifecycle: {
    readonly gameInstanceId: number
    readonly mapRenderCount: number
    readonly mapSwitchCount: number
    readonly phaserGameReused: boolean
  }
  readonly runtime: {
    readonly lastMapRenderDurationMs: number
    readonly displayObjectCount: number
    readonly textureCount: number
  }
  readonly proofs: RendererPerformanceProofInfo
}

export interface RendererPerformanceProofInfo {
  readonly mapSize: `${number}x${number}`
  readonly tileBatching: {
    readonly compatible: boolean
    readonly staticGpuLayerCount: number
    readonly staticCpuLayerCount: number
    readonly staticLayerBatchCount: number
    readonly staticTileCount: number
  }
  readonly viewportCulling: {
    readonly active: boolean
    readonly activeObjectSpriteCount: number
    readonly visibleObjectSpriteCount: number
    readonly culledObjectSpriteCount: number
    readonly culledRatio: number
  }
  readonly objectPooling: {
    readonly active: boolean
    readonly createdSpriteCount: number
    readonly reusedSpriteCount: number
    readonly pooledSpriteCount: number
    readonly reuseObserved: boolean
  }
  readonly textureReuse: {
    readonly tilesetReused: boolean
    readonly cachedTextureCount: number
    readonly createdTextureCount: number
    readonly reusedTextureCount: number
    readonly reuseObserved: boolean
  }
}
