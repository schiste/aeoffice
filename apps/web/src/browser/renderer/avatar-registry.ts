import type {
  AvatarAnimationAction,
  AvatarCosmeticSlot,
  AvatarEmoteId,
  AvatarVisualFacing,
  Direction,
  RendererAvatarAtlasFrameEntry,
  RenderedPlayer,
  RendererAvatarAnimationPreviewFixture,
  RendererAvatarAnimationPipelineInfo,
  RendererAvatarAnimationSpriteInfo,
  RendererAvatarAnimationStateDefinition,
  RendererAvatarSpriteAtlasInfo,
} from "./types"
import {
  avatarSemanticFrameKey,
  buildAvatarAtlasImportInfo,
  buildExpectedAvatarAtlasFrameEntries,
} from "./avatar-atlas-manifest"

export interface AvatarPalette {
  readonly torso: number
  readonly torsoDark: number
  readonly head: number
  readonly accent: number
  readonly hair: number
}

export interface AvatarAppearanceMetadata {
  readonly id: string
  readonly label: string
  readonly tokenId: string
  readonly palette: AvatarPalette
  readonly cosmeticSlots: readonly AvatarCosmeticSlot[]
}

export interface AvatarPoseDefinition {
  readonly facingRotation: number
  readonly facingX: number
  readonly facingY: number
  readonly facingAlpha: number
  readonly hairX: number
  readonly hairY: number
  readonly leftFootX: number
  readonly rightFootX: number
  readonly labelY: number
}

export interface AvatarAnimationDefinition {
  readonly key: string
  readonly avatarId: string
  readonly action: AvatarAnimationAction
  readonly direction: Direction
  readonly durationMs: number
  readonly repeat: number
  readonly sprite: RendererAvatarAnimationSpriteInfo
  readonly bodyScaleX: number
  readonly bodyScaleY: number
  readonly footScaleX: number
  readonly footScaleY: number
  readonly pose: AvatarPoseDefinition
}

export interface AvatarInterpolationProfile {
  readonly id: "local" | "remote"
  readonly msPerPixel: number
  readonly minDurationMs: number
  readonly maxDurationMs: number
  readonly easing: string
  readonly positionEpsilon: number
}

export interface AvatarEmoteDefinition {
  readonly id: AvatarEmoteId
  readonly glyph: string
  readonly durationMs: number
}

export const AVATAR_IDS = ["ember", "cobalt", "moss", "violet"] as const

export const AVATAR_COSMETIC_SLOTS: readonly AvatarCosmeticSlot[] = [
  "hair",
  "face",
  "torso",
  "accessory",
  "badge",
]

export const AVATAR_EMOTE_IDS: readonly AvatarEmoteId[] = [
  "wave",
  "raise_hand",
  "focus",
]

export const AVATAR_ANIMATION_STATES: readonly AvatarAnimationAction[] = [
  "idle",
  "walk",
  "run",
  "turn",
]

export const AVATAR_ANIMATION_STATE_DEFINITIONS: readonly RendererAvatarAnimationStateDefinition[] =
  [
    {
      action: "idle",
      frameCount: 4,
      frameRate: 2,
      frameDurationMs: 500,
      durationMs: 1100,
      loop: true,
      repeat: -1,
      blendDurationMs: 96,
    },
    {
      action: "walk",
      frameCount: 6,
      frameRate: 9,
      frameDurationMs: 111,
      durationMs: 105,
      loop: true,
      repeat: 2,
      blendDurationMs: 96,
    },
    {
      action: "run",
      frameCount: 8,
      frameRate: 12,
      frameDurationMs: 83,
      durationMs: 82,
      loop: true,
      repeat: 2,
      blendDurationMs: 72,
    },
    {
      action: "turn",
      frameCount: 4,
      frameRate: 8,
      frameDurationMs: 125,
      durationMs: 145,
      loop: false,
      repeat: 0,
      blendDurationMs: 138,
    },
  ]

export const AVATAR_VISUAL_FACING_DIRECTIONS: readonly AvatarVisualFacing[] = [
  "up",
  "upRight",
  "right",
  "downRight",
  "down",
  "downLeft",
  "left",
  "upLeft",
]

const AVATAR_SPRITE_ATLAS_ID = "internal-avatar-atlas-v1"
const AVATAR_SERVER_DIRECTIONS: readonly Direction[] = [
  "up",
  "down",
  "left",
  "right",
]
const AVATAR_ATLAS_EXPECTED_FRAMES: readonly RendererAvatarAtlasFrameEntry[] =
  buildExpectedAvatarAtlasFrameEntries({
    atlasId: AVATAR_SPRITE_ATLAS_ID,
    avatarIds: AVATAR_IDS,
    directions: AVATAR_SERVER_DIRECTIONS,
    stateDefinitions: AVATAR_ANIMATION_STATE_DEFINITIONS,
  })
const AVATAR_ATLAS_IMPORT = buildAvatarAtlasImportInfo({
  atlasId: AVATAR_SPRITE_ATLAS_ID,
  supportedStates: AVATAR_ANIMATION_STATES,
  expectedFrameEntries: AVATAR_ATLAS_EXPECTED_FRAMES,
})

const AVATAR_SPRITE_ATLAS: RendererAvatarSpriteAtlasInfo = {
  source: "runtime_generated_sprite_atlas",
  schemaVersion: 1,
  atlasId: AVATAR_SPRITE_ATLAS_ID,
  textureKey: "internal-avatar-atlas-v1-runtime-generated",
  renderMode: "sprite_atlas",
  frameWidth: 32,
  frameHeight: 42,
  frameCount: AVATAR_ATLAS_EXPECTED_FRAMES.length,
  exportScale: 2,
  anchor: {
    x: 0.5,
    y: 0.86,
  },
  frameKeyStrategy: "avatar_action_server_direction_frame",
  serverDirectionModel: "4_way",
  visualDirectionModel: "8_way",
  serverDirectionCount: 4,
  visualFacingCount: 8,
  supportedStates: AVATAR_ANIMATION_STATES,
  stateDefinitions: AVATAR_ANIMATION_STATE_DEFINITIONS,
  generatedTextureSource: "runtime_canvas_sprite_frames",
  atlasImport: AVATAR_ATLAS_IMPORT,
  cosmeticSlots: AVATAR_COSMETIC_SLOTS,
}

const AVATAR_APPEARANCES: Record<string, AvatarAppearanceMetadata> = {
  ember: {
    id: "ember",
    label: "Ember",
    tokenId: "avatar.ember",
    palette: {
      torso: 0xc45b40,
      torsoDark: 0x873727,
      head: 0xffd3a3,
      accent: 0xf6a04f,
      hair: 0x5a3323,
    },
    cosmeticSlots: AVATAR_COSMETIC_SLOTS,
  },
  cobalt: {
    id: "cobalt",
    label: "Cobalt",
    tokenId: "avatar.cobalt",
    palette: {
      torso: 0x316f9f,
      torsoDark: 0x1d4260,
      head: 0xf0c7a1,
      accent: 0x9dc7e4,
      hair: 0x273748,
    },
    cosmeticSlots: AVATAR_COSMETIC_SLOTS,
  },
  moss: {
    id: "moss",
    label: "Moss",
    tokenId: "avatar.moss",
    palette: {
      torso: 0x3c8759,
      torsoDark: 0x24543a,
      head: 0xd7b38e,
      accent: 0xa7d18f,
      hair: 0x473522,
    },
    cosmeticSlots: AVATAR_COSMETIC_SLOTS,
  },
  violet: {
    id: "violet",
    label: "Violet",
    tokenId: "avatar.violet",
    palette: {
      torso: 0x755aa5,
      torsoDark: 0x49336f,
      head: 0xe0b995,
      accent: 0xc8b4f2,
      hair: 0x332444,
    },
    cosmeticSlots: AVATAR_COSMETIC_SLOTS,
  },
}

const DIRECTION_POSES: Record<Direction, AvatarPoseDefinition> = {
  up: {
    facingRotation: 0,
    facingX: 0,
    facingY: -15,
    facingAlpha: 0.18,
    hairX: 0,
    hairY: -12,
    leftFootX: -5,
    rightFootX: 5,
    labelY: -32,
  },
  down: {
    facingRotation: Math.PI,
    facingX: 0,
    facingY: -5,
    facingAlpha: 0.86,
    hairX: 0,
    hairY: -14,
    leftFootX: -5,
    rightFootX: 5,
    labelY: -33,
  },
  left: {
    facingRotation: Math.PI / 2,
    facingX: -5,
    facingY: -10,
    facingAlpha: 0.86,
    hairX: -3,
    hairY: -14,
    leftFootX: -5,
    rightFootX: 3,
    labelY: -32,
  },
  right: {
    facingRotation: -Math.PI / 2,
    facingX: 5,
    facingY: -10,
    facingAlpha: 0.86,
    hairX: 3,
    hairY: -14,
    leftFootX: -3,
    rightFootX: 5,
    labelY: -32,
  },
}

export const AVATAR_INTERPOLATION_PROFILES: Record<
  "local" | "remote",
  AvatarInterpolationProfile
> = {
  local: {
    id: "local",
    msPerPixel: 15.6,
    minDurationMs: 54,
    maxDurationMs: 180,
    easing: "Linear",
    positionEpsilon: 0.35,
  },
  remote: {
    id: "remote",
    msPerPixel: 17.8,
    minDurationMs: 95,
    maxDurationMs: 260,
    easing: "Sine.easeInOut",
    positionEpsilon: 0.75,
  },
}

const AVATAR_EMOTES: Record<AvatarEmoteId, AvatarEmoteDefinition> = {
  wave: {
    id: "wave",
    glyph: "!",
    durationMs: 780,
  },
  raise_hand: {
    id: "raise_hand",
    glyph: "?",
    durationMs: 900,
  },
  focus: {
    id: "focus",
    glyph: ".",
    durationMs: 650,
  },
}

const ANIMATION_REGISTRY = buildAnimationRegistry()
const ANIMATION_PREVIEW_FIXTURES = buildAnimationPreviewFixtures()

export function avatarAppearance(avatarId: string): AvatarAppearanceMetadata {
  return AVATAR_APPEARANCES[resolveAvatarId(avatarId)]
}

export function avatarAnimationDefinition(
  avatarId: string,
  direction: Direction,
  action: AvatarAnimationAction,
): AvatarAnimationDefinition {
  return ANIMATION_REGISTRY.get(animationKey(avatarId, action, direction)) ??
    ANIMATION_REGISTRY.get(animationKey("ember", action, direction))!
}

export function avatarEmoteDefinition(
  emoteId: AvatarEmoteId,
): AvatarEmoteDefinition {
  return AVATAR_EMOTES[emoteId]
}

export function avatarInterpolationProfile(
  local: boolean,
): AvatarInterpolationProfile {
  return local
    ? AVATAR_INTERPOLATION_PROFILES.local
    : AVATAR_INTERPOLATION_PROFILES.remote
}

export function avatarAnimationKeys(): readonly string[] {
  return [...ANIMATION_REGISTRY.keys()]
}

export function avatarAnimationStates(): readonly AvatarAnimationAction[] {
  return AVATAR_ANIMATION_STATES
}

export function avatarSpriteAtlasMetadata(): RendererAvatarSpriteAtlasInfo {
  return AVATAR_SPRITE_ATLAS
}

export function avatarAnimationPipelineMetadata(): RendererAvatarAnimationPipelineInfo {
  return {
    source: "sprite_atlas_metadata",
    atlasId: AVATAR_SPRITE_ATLAS.atlasId,
    renderer: "phaser_image_frame_swap",
    frameKeyStrategy: AVATAR_SPRITE_ATLAS.frameKeyStrategy,
    generatedTextureSource: AVATAR_SPRITE_ATLAS.generatedTextureSource,
    atlasImport: AVATAR_SPRITE_ATLAS.atlasImport,
    serverDirectionModel: AVATAR_SPRITE_ATLAS.serverDirectionModel,
    visualDirectionModel: AVATAR_SPRITE_ATLAS.visualDirectionModel,
    turnBlending: "pose_blend",
    emoteHooks: "renderer_emote_registry",
    labelVisibilityRules: "local_always_remote_overlap_suppressed",
    stateDefinitions: AVATAR_ANIMATION_STATE_DEFINITIONS,
  }
}

export function avatarAnimationPreviewFixtures(): readonly RendererAvatarAnimationPreviewFixture[] {
  return ANIMATION_PREVIEW_FIXTURES
}

export function resolveAvatarId(avatarId: string | undefined): string {
  return avatarId && AVATAR_APPEARANCES[avatarId] ? avatarId : "ember"
}

export function fallbackAvatarId(player: RenderedPlayer): string {
  return player.local ? "ember" : "cobalt"
}

function buildAnimationRegistry(): Map<string, AvatarAnimationDefinition> {
  const registry = new Map<string, AvatarAnimationDefinition>()

  AVATAR_IDS.forEach((avatarId) => {
    AVATAR_ANIMATION_STATES.forEach((action) => {
      AVATAR_SERVER_DIRECTIONS.forEach((direction) => {
        registry.set(animationKey(avatarId, action, direction), {
          key: animationKey(avatarId, action, direction),
          avatarId,
          action,
          direction,
          durationMs: animationStateDefinition(action).durationMs,
          repeat: animationStateDefinition(action).repeat,
          sprite: animationSpriteMetadata(avatarId, action, direction),
          bodyScaleX:
            action === "idle"
              ? 1
              : action === "run"
                ? 1.07
                : action === "turn"
                  ? 1.025
                  : 1.045,
          bodyScaleY:
            action === "idle"
              ? 1.025
              : action === "run"
                ? 0.93
                : action === "turn"
                  ? 0.985
                  : 0.955,
          footScaleX:
            action === "idle"
              ? 1
              : action === "run"
                ? 1.28
                : action === "turn"
                  ? 1.08
                  : 1.18,
          footScaleY:
            action === "idle"
              ? 1
              : action === "run"
                ? 0.74
                : action === "turn"
                  ? 0.92
                  : 0.82,
          pose: DIRECTION_POSES[direction],
        })
      })
    })
  })

  return registry
}

function buildAnimationPreviewFixtures(): RendererAvatarAnimationPreviewFixture[] {
  return AVATAR_IDS.flatMap((avatarId) =>
    AVATAR_ANIMATION_STATES.flatMap((action) =>
      AVATAR_VISUAL_FACING_DIRECTIONS.map((visualFacing) => {
        const serverDirection = serverDirectionForVisualFacing(visualFacing)
        const definition = avatarAnimationDefinition(
          avatarId,
          serverDirection,
          action,
        )

        return {
          id: `${avatarId}.${action}.${visualFacing}`,
          avatarId,
          action,
          serverDirection,
          visualFacing,
          animationKey: definition.key,
          frameKeys: definition.sprite.frameKeys,
        }
      }),
    ),
  )
}

function animationSpriteMetadata(
  avatarId: string,
  action: AvatarAnimationAction,
  direction: Direction,
): RendererAvatarAnimationSpriteInfo {
  const state = animationStateDefinition(action)
  const resolvedAvatarId = resolveAvatarId(avatarId)
  const framePrefix = `${AVATAR_SPRITE_ATLAS.atlasId}/frames/${resolvedAvatarId}/${action}/${direction}`
  const frameKeys = Array.from(
    { length: state.frameCount },
    (_, frameIndex) =>
      avatarSemanticFrameKey({
        atlasId: AVATAR_SPRITE_ATLAS.atlasId,
        avatarId: resolvedAvatarId,
        action,
        direction,
        frameIndex,
      }),
  )

  return {
    atlasId: AVATAR_SPRITE_ATLAS.atlasId,
    renderMode: AVATAR_SPRITE_ATLAS.renderMode,
    framePrefix,
    frameKeys,
    textureKeys: frameKeys,
    frameCount: state.frameCount,
    frameRate: state.frameRate,
    frameDurationMs: state.frameDurationMs,
    loop: state.loop,
    blendDurationMs: state.blendDurationMs,
    anchor: AVATAR_SPRITE_ATLAS.anchor,
  }
}

function animationStateDefinition(
  action: AvatarAnimationAction,
): RendererAvatarAnimationStateDefinition {
  return AVATAR_ANIMATION_STATE_DEFINITIONS.find(
    (definition) => definition.action === action,
  )!
}

function serverDirectionForVisualFacing(
  visualFacing: AvatarVisualFacing,
): Direction {
  if (visualFacing === "up" || visualFacing === "upLeft") return "up"
  if (visualFacing === "right" || visualFacing === "upRight") return "right"
  if (visualFacing === "left" || visualFacing === "downLeft") return "left"
  return "down"
}

function animationKey(
  avatarId: string,
  action: AvatarAnimationAction,
  direction: Direction,
): string {
  return `${resolveAvatarId(avatarId)}_${action}_${direction}`
}
