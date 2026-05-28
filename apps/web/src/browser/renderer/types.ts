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
    readonly markerEffectMode: "layered_pin_pulse_shadow"
    readonly selectionMode: "hover_click_marker"
    readonly objectSelectionMode: "hover_select_target_outline"
    readonly doorPortalFeedback: "directional_beacon_and_bounds"
    readonly actionFlow: "approach_permission_confirm_execute"
    readonly touchAffordance: "large_marker_hit_area_dom_prompt"
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

export type RendererAdvancedInputPointerKind =
  | "mouse"
  | "touch"
  | "pen"
  | "unknown"

export type RendererAdvancedInputCursor =
  | "default"
  | "pointer"
  | "grab"
  | "grabbing"
  | "crosshair"

export type RendererAdvancedInputGesture =
  | "none"
  | "tap"
  | "double_tap"
  | "long_press"
  | "drag"
  | "pinch"
  | "select_object"

export interface RendererAdvancedInputInfo {
  readonly source: "phaser_input_plugin"
  readonly authority: "renderer_visual_selection_only"
  readonly enabled: boolean
  readonly features: readonly (
    | "pointer_world_coordinates"
    | "semantic_zone_hit_testing"
    | "object_hit_areas"
    | "drag_targets"
    | "cursor_state"
    | "touch_gestures"
    | "object_selection"
  )[]
  readonly pointer: {
    readonly active: boolean
    readonly kind: RendererAdvancedInputPointerKind
    readonly worldX?: number
    readonly worldY?: number
    readonly screenX?: number
    readonly screenY?: number
    readonly activePointerCount: number
    readonly primaryDown: boolean
  }
  readonly cursor: {
    readonly current: RendererAdvancedInputCursor
    readonly hoverTargetId?: string
    readonly hoverTargetKind?: "zone" | "object"
  }
  readonly hitTesting: {
    readonly zoneTargetCount: number
    readonly objectTargetCount: number
    readonly hoveredZoneId?: string
    readonly hoveredObjectId?: string
  }
  readonly selection: {
    readonly selectedObjectId?: string
    readonly selectedObjectTokenId?: string
    readonly selectableObjectCount: number
  }
  readonly drag: {
    readonly enabled: boolean
    readonly active: boolean
    readonly targetId?: string
    readonly distancePx: number
  }
  readonly touch: {
    readonly multiPointerEnabled: boolean
    readonly pinchActive: boolean
    readonly pinchScale: number
  }
  readonly gesture: {
    readonly last: RendererAdvancedInputGesture
    readonly targetId?: string
    readonly targetKind?: "zone" | "object" | "world"
    readonly durationMs: number
    readonly distancePx: number
  }
}

export type RendererPhysicsFeature =
  | "arcade_sensor_bodies"
  | "visual_collision_probes"
  | "editor_placement_preview"
  | "interaction_hit_area_validation"
  | "local_affordance_feedback"

export interface RendererPhysicsInfo {
  readonly source: "phaser_arcade_physics"
  readonly authority: "visual_probes_only"
  readonly enabled: boolean
  readonly engine: "arcade"
  readonly matterAvailable: boolean
  readonly matterEnabled: false
  readonly serverAuthorityBoundary:
    "movement_collision_permissions_remain_server_authoritative"
  readonly features: readonly RendererPhysicsFeature[]
  readonly config: {
    readonly defaultSystem: "arcade"
    readonly gravity: "none"
    readonly debug: boolean
    readonly simulationAffectsGameplay: false
  }
  readonly sensors: {
    readonly objectSensorCount: number
    readonly zoneSensorCount: number
    readonly staticBodyCount: number
    readonly dynamicProbeCount: number
  }
  readonly localProbe: {
    readonly active: boolean
    readonly x?: number
    readonly y?: number
    readonly width?: number
    readonly height?: number
    readonly overlappingObjectIds: readonly string[]
    readonly overlappingZoneIds: readonly string[]
    readonly affordance: "none" | "near_zone" | "visual_blocked"
  }
  readonly placementPreview: {
    readonly active: boolean
    readonly state: "unavailable" | "clear" | "blocked"
    readonly x?: number
    readonly y?: number
    readonly width?: number
    readonly height?: number
    readonly overlappingObjectIds: readonly string[]
    readonly overlappingZoneIds: readonly string[]
  }
}

export type RendererAudioCueId =
  | "footstep"
  | "door_open"
  | "zone_enter"
  | "blocked_movement"
  | "chat_notification"
  | "map_transition"

export type RendererAudioEventBinding =
  | "local_player_step"
  | "portal_or_door_available"
  | "zone_entered"
  | "movement_rejected"
  | "chat_delivered"
  | "map_rendered"

export interface RendererAudioInfo {
  readonly source: "phaser_sound_manager"
  readonly authority: "world_ui_audio_only"
  readonly enabled: boolean
  readonly manager: {
    readonly type: "web_audio" | "html5_audio" | "no_audio" | "unknown"
    readonly locked: boolean
    readonly muted: boolean
    readonly volume: number
    readonly pauseOnBlur: boolean
  }
  readonly assets: {
    readonly strategy: "generated_wav_data_uri"
    readonly registeredCueCount: number
    readonly decodedCueCount: number
    readonly pendingCueCount: number
    readonly failedCueCount: number
    readonly generatedCueIds: readonly RendererAudioCueId[]
    readonly decodedCueIds: readonly RendererAudioCueId[]
  }
  readonly cues: {
    readonly supportedCueIds: readonly RendererAudioCueId[]
    readonly eventBindings: readonly RendererAudioEventBinding[]
    readonly playCountByCue: Readonly<Record<RendererAudioCueId, number>>
    readonly attemptedPlayCount: number
    readonly successfulPlayCount: number
    readonly blockedByLockCount: number
    readonly skippedUnavailableCount: number
    readonly lastCueId?: RendererAudioCueId
    readonly lastCueAtMs?: number
  }
  readonly routing: {
    readonly mediaHandledOutsidePhaser: true
    readonly mediaLayer: "livekit_or_browser_media"
    readonly spatialWorldUiOnly: true
  }
  readonly policy: {
    readonly autoplay: "play_after_unlock_else_track_attempt"
    readonly footstepThrottleMs: number
    readonly maxConcurrentUiSounds: number
  }
}

export type RendererDepthEffectFeature =
  | "geometry_masks"
  | "foreground_blend_modes"
  | "glass_transparency"
  | "zone_fog_masks"
  | "label_occlusion"

export interface RendererDepthEffectsInfo {
  readonly source: "phaser_depth_effects"
  readonly authority: "visual_only"
  readonly enabled: boolean
  readonly features: readonly RendererDepthEffectFeature[]
  readonly masks: {
    readonly geometryMaskCount: number
    readonly privateZoneMaskCount: number
    readonly zoneFogMaskCount: number
    readonly labelMaskCount: number
  }
  readonly blendModes: {
    readonly foregroundSpriteCount: number
    readonly glassForegroundCount: number
    readonly transparentForegroundCount: number
    readonly appliedBlendModes: readonly ("normal" | "screen" | "multiply")[]
  }
  readonly fog: {
    readonly privateZoneCount: number
    readonly activeFogOverlayCount: number
    readonly blendMode: "multiply" | "normal"
  }
  readonly labels: {
    readonly occlusionCandidateCount: number
    readonly foregroundOccluderCount: number
    readonly occludedPlayerIds: readonly string[]
    readonly policy: "local_visible_remote_foreground_labels_dimmed"
  }
}

export type RendererEffectsQuality = "auto" | "off" | "low" | "premium"
export type RendererResolvedEffectsQuality = "off" | "low" | "premium"
export type RendererTenantLightingMode = "day" | "night" | "tenant_theme"
export type RendererParticleEffectName =
  | "coffee_steam"
  | "plant_motes"
  | "portal_shimmer"
  | "meeting_zone_activation"
  | "room_entry_transition"

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
  readonly animationMode: "static" | "ambient_particles"
  readonly disabledReason?: RendererEffectsDisableReason
  readonly capability: {
    readonly webglAvailable: boolean
    readonly contextLost: boolean
    readonly lowCapability: boolean
    readonly filtersAvailable: boolean
    readonly shadersAvailable: boolean
    readonly particlesAvailable: boolean
    readonly maxTextureSize?: number
  }
  readonly applied: {
    readonly webglFilters: readonly string[]
    readonly customWebglPipelines: readonly string[]
    readonly ambientEffects: readonly string[]
    readonly lightPass: "none" | "static_room_lights"
    readonly shadowPass: "none" | "static_corner_shadows"
    readonly shaderPass: "none" | "custom_room_lighting_shader"
    readonly floorLighting: "none" | "shader_floor_light_gradient"
    readonly zoneGlow: "none" | "custom_zone_glow_shader"
    readonly softShadows: "none" | "shader_vignette_soft_shadow"
    readonly particleEffects: readonly RendererParticleEffectName[]
    readonly selectionOutlines: "zone_renderer" | "custom_shader_ready"
    readonly hoverOutlines: "zone_renderer" | "custom_shader_ready"
    readonly tenantLighting: RendererTenantLightingMode
  }
  readonly objectCounts: {
    readonly ambientShapes: number
    readonly lightShapes: number
    readonly shadowShapes: number
    readonly shaderPasses: number
    readonly shaderObjects: number
    readonly shaderZoneUniforms: number
    readonly particleEmitters: number
    readonly particleTextures: number
    readonly coffeeSteamEmitters: number
    readonly plantMoteEmitters: number
    readonly portalShimmerEmitters: number
    readonly meetingZoneActivationEmitters: number
    readonly entryTransitionEmitters: number
    readonly particleAliveBudget: number
  }
}

export interface RenderedPlayer {
  readonly playerId: string
  readonly name: string
  readonly avatarId?: string
  readonly cosmetics?: Partial<Record<AvatarCosmeticSlot, string>>
  readonly emoteId?: AvatarEmoteId
  readonly animationPreview?: {
    readonly action: AvatarAnimationAction
    readonly visualFacing: AvatarVisualFacing
  }
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

export type AvatarAnimationTransitionReason =
  | "initial"
  | "preview_locked"
  | "idle_to_locomotion"
  | "idle_to_turn"
  | "locomotion_continue"
  | "locomotion_direction_blend"
  | "locomotion_speed_blend"
  | "locomotion_to_turn"
  | "turn_hold"
  | "turn_to_idle"
  | "locomotion_to_idle"
  | "idle_hold"
  | "identity_changed"

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
  | "real_sprite_atlas"

export type RendererAvatarFrameSource =
  | "real_atlas"
  | "runtime_generated_fallback"

export interface RendererAvatarSpriteAnchor {
  readonly x: number
  readonly y: number
}

export interface RendererAvatarAtlasFrameRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface RendererAvatarAtlasFrameEntry {
  readonly semanticFrameKey: string
  readonly atlasFrameKey: string
  readonly avatarId: string
  readonly action: AvatarAnimationAction
  readonly direction: Direction
  readonly frameIndex: number
  readonly rect?: RendererAvatarAtlasFrameRect
  readonly anchor?: RendererAvatarSpriteAnchor
}

export interface RendererAvatarAtlasStateCoverage {
  readonly action: AvatarAnimationAction
  readonly expectedFrameCount: number
  readonly manifestFrameCount: number
  readonly runtimeFallbackFrameCount: number
  readonly missingFrameCount: number
  readonly complete: boolean
}

export interface RendererAvatarAtlasImportInfo {
  readonly source: "avatar_atlas_manifest"
  readonly schemaVersion: 1
  readonly manifestPath: string
  readonly imagePath: string
  readonly requestedAtlasId: string
  readonly manifestLoaded: boolean
  readonly imageLoaded: boolean
  readonly manifestValidated: boolean
  readonly contractValidated: boolean
  readonly activeSource: RendererAvatarFrameSource
  readonly fallbackActive: boolean
  readonly frameKeyStrategy: "avatar_action_server_direction_frame"
  readonly runtimeFallbackTextureKeyStrategy:
    "semantic_frame_visual_facing_generated_texture"
  readonly expectedFrameCount: number
  readonly manifestFrameCount: number
  readonly runtimeFallbackFrameCount: number
  readonly missingFrameCount: number
  readonly unexpectedFrameCount: number
  readonly duplicateSemanticFrameCount: number
  readonly duplicateAtlasFrameCount: number
  readonly validationErrors: readonly string[]
  readonly semanticFrameKeyExample: string
  readonly supportedStates: readonly AvatarAnimationAction[]
  readonly stateCoverage: readonly RendererAvatarAtlasStateCoverage[]
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
  readonly atlasImport: RendererAvatarAtlasImportInfo
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
  readonly renderer: "phaser_animation_manager"
  readonly frameKeyStrategy: "avatar_action_server_direction_frame"
  readonly generatedTextureSource: "runtime_canvas_sprite_frames"
  readonly atlasImport: RendererAvatarAtlasImportInfo
  readonly serverDirectionModel: "4_way"
  readonly visualDirectionModel: "8_way"
  readonly turnBlending: "pose_blend"
  readonly stateMachine: "explicit_idle_walk_run_turn"
  readonly locomotionBlend: "phase_preserved_walk_run"
  readonly turnPoseMode: "anticipation_arc_recovery"
  readonly visualFacingQa: "avatar_preview_gallery_8_way"
  readonly emoteHooks: "renderer_emote_registry"
  readonly labelVisibilityRules: "local_always_remote_overlap_suppressed"
  readonly stateDefinitions: readonly RendererAvatarAnimationStateDefinition[]
  readonly atlasContract: RendererAvatarAtlasContractInfo
  readonly previewFixtureCoverage: RendererAvatarPreviewFixtureCoverageInfo
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

export interface RendererAvatarAtlasContractInfo {
  readonly source: "avatar_atlas_contract"
  readonly atlasId: string
  readonly frameKeyStrategy: "avatar_action_server_direction_frame"
  readonly serverDirectionModel: "4_way"
  readonly visualDirectionModel: "8_way"
  readonly avatarIds: readonly string[]
  readonly serverDirections: readonly Direction[]
  readonly visualFacings: readonly AvatarVisualFacing[]
  readonly states: readonly AvatarAnimationAction[]
  readonly expectedAnimationCount: number
  readonly expectedFrameCount: number
  readonly expectedPreviewFixtureCount: number
  readonly activationPolicy:
    "real_manifest_must_validate_else_runtime_generated_fallback"
}

export interface RendererAvatarPreviewFixtureCoverageInfo {
  readonly source: "avatar_preview_fixture"
  readonly qaTool: "avatar_preview_gallery"
  readonly fixtureCount: number
  readonly expectedFixtureCount: number
  readonly complete: boolean
  readonly avatarIds: readonly string[]
  readonly states: readonly AvatarAnimationAction[]
  readonly visualFacings: readonly AvatarVisualFacing[]
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

export interface RendererSecondaryCameraInfo {
  readonly id: "overview-minimap"
  readonly role: "minimap_overview"
  readonly active: boolean
  readonly visible: boolean
  readonly disabledReason?: "not_ready" | "compact_viewport"
  readonly renderTarget: "same_scene_overlay"
  readonly updatePolicy: "fit_room_on_resize_or_map_switch"
  readonly viewport: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }
  readonly worldView: RendererCameraWorldView
  readonly zoom: number
  readonly alpha: number
  readonly roundPixels: boolean
}

export interface RendererSecondaryCameraSystemInfo {
  readonly source: "phaser_camera_manager"
  readonly mode: "main_only" | "main_plus_overview"
  readonly maxCameraCount: number
  readonly totalCameraCount: number
  readonly visibleCameraCount: number
  readonly secondaryCameras: readonly RendererSecondaryCameraInfo[]
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
  readonly secondary: RendererSecondaryCameraSystemInfo
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

export type RendererTilemapFeature =
  | "tile_metadata"
  | "tile_collision_properties"
  | "tile_index_callbacks"
  | "tile_location_callbacks"
  | "animated_tile_overlays"
  | "layered_editor_metadata"

export interface RendererTilemapFeatureInfo {
  readonly source: "phaser_tilemap_runtime_features"
  readonly authority: "renderer_editor_affordances_only"
  readonly enabled: boolean
  readonly features: readonly RendererTilemapFeature[]
  readonly metadata: {
    readonly propertySchemaVersion: 1
    readonly tilePropertyCount: number
    readonly semanticTilePropertyCount: number
    readonly editorPropertyCount: number
    readonly uniqueSemanticTokenCount: number
    readonly layerNames: readonly RendererTilemapLayerInfo["name"][]
  }
  readonly collision: {
    readonly propertyCollisionTileCount: number
    readonly propertyCollisionLayerNames: readonly RendererTilemapLayerInfo["name"][]
    readonly serverAuthorityBoundary:
      "compiled_collision_layers_remain_authoritative"
  }
  readonly callbacks: {
    readonly tileIndexCallbackCount: number
    readonly tileLocationCallbackCount: number
    readonly callbackLayerNames: readonly RendererTilemapLayerInfo["name"][]
    readonly registeredSemanticIds: readonly string[]
    readonly invocationCount: number
  }
  readonly animation: {
    readonly animatedTileCount: number
    readonly animatedOverlayCount: number
    readonly animatedSemanticIds: readonly string[]
    readonly maxAnimatedTiles: number
    readonly clock: "phaser_tweens"
    readonly deterministic: false
  }
  readonly editor: {
    readonly selectableTileCount: number
    readonly tenantCustomizableTileCount: number
    readonly inspectedLayerCount: number
    readonly layeredInspectorReady: boolean
  }
}

export interface RendererStaticLayerBakeInfo {
  readonly source: "phaser_render_texture"
  readonly enabled: boolean
  readonly mode: "single_render_texture" | "disabled"
  readonly textureKey?: string
  readonly width: number
  readonly height: number
  readonly sourceLayerCount: number
  readonly bakedLayerCount: number
  readonly sourceTileCount: number
  readonly displayObjectReduction: number
  readonly skippedReason?:
    | "no_static_layers"
    | "non_webgl_renderer"
    | "texture_too_large"
    | "render_texture_unavailable"
}

export interface RendererTilemapInfo {
  readonly staticLayers: readonly RendererTilemapLayerInfo[]
  readonly staticGpuLayerCount: number
  readonly staticCpuLayerCount: number
  readonly staticTileCount: number
  readonly staticLayerBatching: "phaser_tilemap_gpu_layers"
  readonly staticLayerBatchCount: number
  readonly staticLayerBake: RendererStaticLayerBakeInfo
  readonly objectLayerMode: "sprites"
  readonly zoneLayerMode: "graphics"
  readonly avatarLayerMode: "display_objects"
  readonly labelLayerMode: "display_objects"
  readonly features: RendererTilemapFeatureInfo
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
  readonly loader: RendererAssetPackInfo
  readonly metadata: {
    readonly schemaVersion?: number
    readonly frameCount: number
    readonly collisionFootprintCount: number
    readonly visualFootprintCount: number
    readonly shadowFootprintCount: number
    readonly zAnchorCount: number
    readonly interactionAffordanceCount: number
    readonly occlusionSplitCount: number
    readonly variantCount: number
    readonly tenantThemeTagCount: number
    readonly tenantThemeTags: readonly string[]
    readonly sourceInputCount: number
    readonly sourceLicenseValidated: boolean
    readonly atlasBuildValidated: boolean
  }
}

export interface RendererAssetPackInfo {
  readonly source: "phaser_loader_asset_pack"
  readonly packKey: string
  readonly packSource: "inline_pack_object"
  readonly coreSection: string
  readonly loadedSections: readonly string[]
  readonly deferredSections: readonly string[]
  readonly tenantBundleId: string
  readonly themeBundleId: string
  readonly progress: {
    readonly started: boolean
    readonly complete: boolean
    readonly value: number
    readonly totalFiles: number
    readonly loadedFiles: number
    readonly failedFiles: number
    readonly completedKeys: readonly string[]
    readonly failedKeys: readonly string[]
  }
  readonly cache: {
    readonly jsonKeys: readonly string[]
    readonly textureKeys: readonly string[]
  }
}

export type RendererSceneStatus = "registered" | "active" | "planned"

export interface RendererSceneDescriptor {
  readonly key: string
  readonly role:
    | "preload"
    | "world_runtime"
    | "navigation"
    | "preview"
    | "editor"
    | "transition"
  readonly status: RendererSceneStatus
  readonly owns: readonly string[]
}

export interface RendererSceneManagerInfo {
  readonly source: "phaser_scene_manager"
  readonly architecture: "boot_preload_office_runtime"
  readonly bootSceneKey: "RendererLoadingScene"
  readonly worldSceneKey: "OfficeScene"
  readonly preloadOwner: "RendererLoadingScene"
  readonly transitionOwner: "RendererSceneManager"
  readonly activeSceneKey?: string
  readonly activeSceneKeys: readonly string[]
  readonly registeredSceneKeys: readonly string[]
  readonly plannedSceneKeys: readonly string[]
  readonly scenes: readonly RendererSceneDescriptor[]
}

export interface RendererObjectPoolInfo {
  readonly activeSpriteCount: number
  readonly visibleSpriteCount: number
  readonly culledSpriteCount: number
  readonly activeShadowCount: number
  readonly pooledShadowCount: number
  readonly ambientMotionSpriteCount: number
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
  readonly textureKey: string
  readonly textureFrame?: string
  readonly frameSource: RendererAvatarFrameSource
  readonly frameProgression: {
    readonly source: "phaser_animation_manager"
    readonly elapsedMs: number
    readonly rawFrameIndex: number
    readonly currentFrameIndex: number
    readonly frameCount: number
    readonly cycleDurationMs: number
    readonly normalizedCycleProgress: number
    readonly loop: boolean
  }
  readonly nativeAnimation: {
    readonly source: "phaser_animation_manager"
    readonly key: string
    readonly registered: boolean
    readonly playing: boolean
    readonly frameRate: number
    readonly repeat: number
    readonly skipMissedFrames: boolean
    readonly progress: number
    readonly currentFrameIndex: number
    readonly currentFrameTextureKey: string
    readonly currentFrameTextureFrame?: string | number
  }
  readonly frameRate: number
  readonly frameDurationMs: number
  readonly loop: boolean
  readonly blendDurationMs: number
  readonly transition: {
    readonly from: AvatarAnimationAction
    readonly to: AvatarAnimationAction
    readonly reason: AvatarAnimationTransitionReason
    readonly preserveSpritePhase: boolean
    readonly restartedSpriteClock: boolean
    readonly turnHoldActive: boolean
  }
  readonly poseBlendActive: boolean
  readonly expressiveness: {
    readonly stateMachine: "explicit_idle_walk_run_turn"
    readonly locomotionBlend: "phase_preserved_walk_run"
    readonly turnPoseMode: "anticipation_arc_recovery"
    readonly visualFacingQa: "avatar_preview_gallery_8_way"
    readonly walkRunBlendWeight: number
    readonly phaseContinuity: boolean
    readonly turnPoseActive: boolean
    readonly turnPoseProgress: number
    readonly poseBlendDurationMs: number
  }
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
  readonly labelOccludedByForeground: boolean
  readonly labelOcclusionPolicy: "local_visible_remote_foreground_labels_dimmed"
  readonly labelBounds: RendererDepthPlacementBounds
  readonly labelResolution: number
  readonly labelTextureFilter: "linear"
  readonly labelRenderBackend: "dom_overlay"
  readonly labelScreenScale: number
  readonly emoteId?: AvatarEmoteId
  readonly emoteOverlay: {
    readonly visible: boolean
    readonly anchor: "label_top_right"
    readonly x: number
    readonly y: number
    readonly size: number
    readonly scale: number
    readonly opacity: number
    readonly hook: "dom_overlay_label_anchor"
    readonly reaction: "none" | "wave_sway" | "raise_hand_lift" | "focus_pulse"
  }
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

export interface RendererTextRenderingInfo {
  readonly source: "renderer_text_quality"
  readonly policy: "antialiased_text_pixel_art_world"
  readonly worldTextResolution: number
  readonly worldTextTextureFilter: "linear"
  readonly worldTextBackends: readonly ("dom_overlay" | "phaser_text_fallback")[]
  readonly canvasCssImageRendering: string
  readonly canvasCssAntialiasingAllowed: boolean
  readonly domFontSmoothing: string
  readonly textObjectClasses: readonly (
    | "avatar_labels"
    | "emote_text"
    | "zone_labels"
    | "action_markers"
    | "debug_overlays"
  )[]
  readonly pixelArtSpritesRemainTextureFiltered: true
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
  readonly scenes: RendererSceneManagerInfo
  readonly input: RendererAdvancedInputInfo
  readonly physics: RendererPhysicsInfo
  readonly audio: RendererAudioInfo
  readonly text: RendererTextRenderingInfo
  readonly depthEffects: RendererDepthEffectsInfo
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
    readonly staticLayerBaking: "phaser_render_texture_static_architecture"
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
  readonly staticLayerBaking: {
    readonly enabled: boolean
    readonly mode: "single_render_texture" | "disabled"
    readonly sourceLayerCount: number
    readonly bakedLayerCount: number
    readonly sourceTileCount: number
    readonly displayObjectReduction: number
    readonly skippedReason?: RendererStaticLayerBakeInfo["skippedReason"]
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
