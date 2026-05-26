import type {
  AvatarAnimationAction,
  AvatarVisualFacing,
  Direction,
  RendererAvatarAtlasFrameEntry,
  RendererAvatarAtlasFrameRect,
  RendererAvatarAtlasImportInfo,
  RendererAvatarAnimationStateDefinition,
  RendererAvatarFrameSource,
  RendererAvatarSpriteAnchor,
} from "./types"

export const AVATAR_ATLAS_MANIFEST_SCHEMA_VERSION = 1
export const AVATAR_ATLAS_MANIFEST_PATH =
  "/assets/avatar-atlases/internal-avatar-atlas-v1/manifest.json"
export const AVATAR_ATLAS_IMAGE_PATH =
  "/assets/avatar-atlases/internal-avatar-atlas-v1/atlas.png"

export interface AvatarAtlasManifestLicense {
  readonly spdx: string
  readonly source: string
  readonly attribution?: string
}

export interface AvatarAtlasManifestFrame
  extends RendererAvatarAtlasFrameEntry {
  readonly rect: RendererAvatarAtlasFrameRect
}

export interface AvatarAtlasManifest {
  readonly schemaVersion: 1
  readonly atlasId: string
  readonly textureKey: string
  readonly imagePath: string
  readonly frameWidth: number
  readonly frameHeight: number
  readonly exportScale: number
  readonly anchor: RendererAvatarSpriteAnchor
  readonly frameKeyStrategy: "avatar_action_server_direction_frame"
  readonly serverDirectionModel: "4_way"
  readonly visualDirectionModel: "8_way"
  readonly license: AvatarAtlasManifestLicense
  readonly frames: readonly AvatarAtlasManifestFrame[]
}

export interface AvatarAtlasManifestValidationResult {
  readonly valid: boolean
  readonly manifestFrameCount: number
  readonly expectedFrameCount: number
  readonly missingFrameCount: number
  readonly errors: readonly string[]
}

export interface AvatarAtlasManifestLookup {
  readonly manifest: AvatarAtlasManifest
  readonly framesBySemanticKey: ReadonlyMap<string, AvatarAtlasManifestFrame>
}

export interface ResolvedAvatarFrameTexture {
  readonly source: RendererAvatarFrameSource
  readonly semanticFrameKey: string
  readonly textureKey: string
  readonly textureFrame?: string
  readonly visualFacing: AvatarVisualFacing
}

export function buildAvatarAtlasImportInfo(options: {
  readonly atlasId: string
  readonly supportedStates: readonly AvatarAnimationAction[]
  readonly expectedFrameEntries: readonly RendererAvatarAtlasFrameEntry[]
  readonly manifest?: AvatarAtlasManifest
}): RendererAvatarAtlasImportInfo {
  const validation = options.manifest
    ? validateAvatarAtlasManifest(options.manifest, options.expectedFrameEntries)
    : fallbackValidation(options.expectedFrameEntries)

  return {
    source: "avatar_atlas_manifest",
    schemaVersion: AVATAR_ATLAS_MANIFEST_SCHEMA_VERSION,
    manifestPath: AVATAR_ATLAS_MANIFEST_PATH,
    imagePath: AVATAR_ATLAS_IMAGE_PATH,
    requestedAtlasId: options.atlasId,
    manifestLoaded: Boolean(options.manifest),
    imageLoaded: false,
    manifestValidated: Boolean(options.manifest && validation.valid),
    contractValidated: validation.valid,
    activeSource: options.manifest && validation.valid
      ? "real_atlas"
      : "runtime_generated_fallback",
    fallbackActive: !(options.manifest && validation.valid),
    frameKeyStrategy: "avatar_action_server_direction_frame",
    runtimeFallbackTextureKeyStrategy:
      "semantic_frame_visual_facing_generated_texture",
    expectedFrameCount: validation.expectedFrameCount,
    manifestFrameCount: validation.manifestFrameCount,
    runtimeFallbackFrameCount: validation.expectedFrameCount,
    missingFrameCount: validation.missingFrameCount,
    validationErrors: validation.errors,
    semanticFrameKeyExample:
      options.expectedFrameEntries[0]?.semanticFrameKey ?? "",
    supportedStates: options.supportedStates,
  }
}

export function buildExpectedAvatarAtlasFrameEntries(options: {
  readonly atlasId: string
  readonly avatarIds: readonly string[]
  readonly directions: readonly Direction[]
  readonly stateDefinitions: readonly RendererAvatarAnimationStateDefinition[]
}): readonly RendererAvatarAtlasFrameEntry[] {
  return options.avatarIds.flatMap((avatarId) =>
    options.stateDefinitions.flatMap((state) =>
      options.directions.flatMap((direction) =>
        Array.from({ length: state.frameCount }, (_, frameIndex) => {
          const semanticFrameKey = avatarSemanticFrameKey({
            atlasId: options.atlasId,
            avatarId,
            action: state.action,
            direction,
            frameIndex,
          })

          return {
            semanticFrameKey,
            atlasFrameKey: semanticFrameKey,
            avatarId,
            action: state.action,
            direction,
            frameIndex,
          }
        }),
      ),
    ),
  )
}

export function avatarSemanticFrameKey(options: {
  readonly atlasId: string
  readonly avatarId: string
  readonly action: AvatarAnimationAction
  readonly direction: Direction
  readonly frameIndex: number
}): string {
  return `${options.atlasId}/frames/${options.avatarId}/${options.action}/${options.direction}/${String(options.frameIndex).padStart(2, "0")}`
}

export function validateAvatarAtlasManifest(
  manifest: AvatarAtlasManifest,
  expectedFrames: readonly RendererAvatarAtlasFrameEntry[],
): AvatarAtlasManifestValidationResult {
  const errors: string[] = []

  if (manifest.schemaVersion !== AVATAR_ATLAS_MANIFEST_SCHEMA_VERSION) {
    errors.push(
      `Unsupported avatar atlas schema version ${manifest.schemaVersion}.`,
    )
  }
  if (manifest.frameKeyStrategy !== "avatar_action_server_direction_frame") {
    errors.push(`Unsupported frame key strategy ${manifest.frameKeyStrategy}.`)
  }
  if (manifest.serverDirectionModel !== "4_way") {
    errors.push(`Unsupported server direction model ${manifest.serverDirectionModel}.`)
  }
  if (manifest.visualDirectionModel !== "8_way") {
    errors.push(`Unsupported visual direction model ${manifest.visualDirectionModel}.`)
  }
  if (manifest.frameWidth <= 0 || manifest.frameHeight <= 0) {
    errors.push("Avatar atlas frame dimensions must be positive.")
  }
  if (manifest.exportScale <= 0) {
    errors.push("Avatar atlas export scale must be positive.")
  }
  if (!manifest.license.spdx || !manifest.license.source) {
    errors.push("Avatar atlas license metadata is required.")
  }

  const frameMap = createFrameMap(manifest.frames)
  const missingFrames = expectedFrames.filter(
    (expected) => !frameMap.has(expected.semanticFrameKey),
  )

  if (missingFrames.length > 0) {
    errors.push(
      `Avatar atlas is missing ${missingFrames.length} expected semantic frames.`,
    )
  }

  manifest.frames.forEach((frame) => {
    if (frame.rect.width <= 0 || frame.rect.height <= 0) {
      errors.push(`Frame ${frame.semanticFrameKey} has invalid dimensions.`)
    }
    if (frame.frameIndex < 0) {
      errors.push(`Frame ${frame.semanticFrameKey} has an invalid frame index.`)
    }
  })

  return {
    valid: errors.length === 0,
    manifestFrameCount: manifest.frames.length,
    expectedFrameCount: expectedFrames.length,
    missingFrameCount: missingFrames.length,
    errors,
  }
}

export function createAvatarAtlasManifestLookup(
  manifest: AvatarAtlasManifest,
): AvatarAtlasManifestLookup {
  return {
    manifest,
    framesBySemanticKey: createFrameMap(manifest.frames),
  }
}

export function resolveAvatarFrameTexture(options: {
  readonly semanticFrameKey: string
  readonly visualFacing: AvatarVisualFacing
  readonly lookup?: AvatarAtlasManifestLookup
}): ResolvedAvatarFrameTexture {
  const manifestFrame = options.lookup?.framesBySemanticKey.get(
    options.semanticFrameKey,
  )

  if (manifestFrame && options.lookup) {
    return {
      source: "real_atlas",
      semanticFrameKey: options.semanticFrameKey,
      textureKey: options.lookup.manifest.textureKey,
      textureFrame: manifestFrame.atlasFrameKey,
      visualFacing: options.visualFacing,
    }
  }

  return {
    source: "runtime_generated_fallback",
    semanticFrameKey: options.semanticFrameKey,
    textureKey: generatedAvatarFallbackTextureKey(
      options.semanticFrameKey,
      options.visualFacing,
    ),
    visualFacing: options.visualFacing,
  }
}

export function generatedAvatarFallbackTextureKey(
  semanticFrameKey: string,
  visualFacing: AvatarVisualFacing,
): string {
  return `${semanticFrameKey}::generated::${visualFacing}`
}

function fallbackValidation(
  expectedFrames: readonly RendererAvatarAtlasFrameEntry[],
): AvatarAtlasManifestValidationResult {
  return {
    valid: true,
    manifestFrameCount: 0,
    expectedFrameCount: expectedFrames.length,
    missingFrameCount: 0,
    errors: [],
  }
}

function createFrameMap(
  frames: readonly AvatarAtlasManifestFrame[],
): Map<string, AvatarAtlasManifestFrame> {
  const frameMap = new Map<string, AvatarAtlasManifestFrame>()

  frames.forEach((frame) => {
    frameMap.set(frame.semanticFrameKey, frame)
  })

  return frameMap
}
