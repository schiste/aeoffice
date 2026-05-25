import type {
  AvatarAnimationAction,
  AvatarCosmeticSlot,
  AvatarEmoteId,
  Direction,
  RenderedPlayer,
} from "./types"

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

export function resolveAvatarId(avatarId: string | undefined): string {
  return avatarId && AVATAR_APPEARANCES[avatarId] ? avatarId : "ember"
}

export function fallbackAvatarId(player: RenderedPlayer): string {
  return player.local ? "ember" : "cobalt"
}

function buildAnimationRegistry(): Map<string, AvatarAnimationDefinition> {
  const registry = new Map<string, AvatarAnimationDefinition>()
  const actions: readonly AvatarAnimationAction[] = ["idle", "walk", "run"]
  const directions: readonly Direction[] = ["up", "down", "left", "right"]

  AVATAR_IDS.forEach((avatarId) => {
    actions.forEach((action) => {
      directions.forEach((direction) => {
        registry.set(animationKey(avatarId, action, direction), {
          key: animationKey(avatarId, action, direction),
          avatarId,
          action,
          direction,
          durationMs: animationDurationMs(action),
          repeat: action === "idle" ? -1 : 2,
          bodyScaleX: action === "idle" ? 1 : action === "run" ? 1.07 : 1.045,
          bodyScaleY: action === "idle" ? 1.025 : action === "run" ? 0.93 : 0.955,
          footScaleX: action === "idle" ? 1 : action === "run" ? 1.28 : 1.18,
          footScaleY: action === "idle" ? 1 : action === "run" ? 0.74 : 0.82,
          pose: DIRECTION_POSES[direction],
        })
      })
    })
  })

  return registry
}

function animationDurationMs(action: AvatarAnimationAction): number {
  if (action === "run") return 82
  if (action === "walk") return 105
  return 1100
}

function animationKey(
  avatarId: string,
  action: AvatarAnimationAction,
  direction: Direction,
): string {
  return `${resolveAvatarId(avatarId)}_${action}_${direction}`
}
