import type { RenderedPlayer } from "./types"

export const TILESET_KEY = "semantic-fixture-tiles"
export const TILESET_NAME = "semantic-fixture-tileset"
export const AVATAR_WIDTH = 18
export const AVATAR_HEIGHT = 24
export const DEFAULT_VIEWPORT_WIDTH = 640
export const DEFAULT_VIEWPORT_HEIGHT = 360
export const MIN_VIEWPORT_WIDTH = 320
export const MIN_VIEWPORT_HEIGHT = 220
export const DEFAULT_ZOOM_FACTOR = 1.15
export const MIN_ZOOM_FACTOR = 0.75
export const MAX_ZOOM_FACTOR = 2
export const MAX_EFFECTIVE_ZOOM = 3.25
export const ZOOM_STEP = 0.1
export const CAMERA_FOLLOW_LERP = 0.14
export const CAMERA_DEADZONE_WIDTH = 42
export const CAMERA_DEADZONE_HEIGHT = 30
export const FURNITURE_DEPTH_BASE = 900
export const ZONE_DEPTH = 760
export const ZONE_LABEL_DEPTH = 765
export const OBJECT_TEXTURE_PREFIX = "semantic-fixture-object"
export const RENDERER_VERTEX_ROUND_MODE = "safeAuto" as const

export const PHASER_RENDERER_CONFIG = {
  requestedRenderer: "webgl",
  pixelArt: true,
  smoothPixelArt: false,
  antialias: false,
  antialiasGL: false,
  roundPixels: true,
  powerPreference: "high-performance",
  transparent: false,
  clearBeforeRender: true,
  preserveDrawingBuffer: false,
  premultipliedAlpha: true,
  failIfMajorPerformanceCaveat: false,
} as const

export const RENDERER_ROUNDING_DECISIONS = {
  globalRoundPixels: PHASER_RENDERER_CONFIG.roundPixels,
  cameraRoundPixels: true,
  cameraFollowRoundsPixels: true,
  vertexRoundMode: RENDERER_VERTEX_ROUND_MODE,
} as const

export const DEFAULT_RENDERED_PLAYERS: readonly RenderedPlayer[] = [
  {
    playerId: "player-1",
    name: "Browser Ada",
    avatarId: "ember",
    position: { x: 96, y: 96 },
    direction: "down",
    local: true,
  },
]
