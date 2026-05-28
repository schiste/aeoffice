import Phaser from "phaser"

import { drawSemanticTile } from "./semantic-tiles"
import type {
  FixtureToken,
  RendererAssetPackConfig,
  RendererAssetPackInfo,
  RendererAssetPipelineInfo,
  TileSegment,
} from "./types"

export const DEFAULT_ASSET_PACK_KEY = "aedventure.renderer.core-pack"
export const DEFAULT_ASSET_PACK_SECTION = "core-assets"
export const DEFAULT_ATLAS_MANIFEST_CACHE_KEY = "aedventure.renderer.atlas.manifest"
export const DEFAULT_ATLAS_IMAGE_TEXTURE_KEY = "aedventure.renderer.atlas.image"
export const DEFAULT_ASSET_BUNDLE_ID = "bundle.default"
export const DEFAULT_THEME_BUNDLE_ID = "theme.default.polished_v1"

export const DEFAULT_RENDERER_ASSET_PACK_CONFIG: RendererAssetPackConfig = {
  packKey: DEFAULT_ASSET_PACK_KEY,
  coreSection: DEFAULT_ASSET_PACK_SECTION,
  manifestCacheKey: DEFAULT_ATLAS_MANIFEST_CACHE_KEY,
  imageTextureKey: DEFAULT_ATLAS_IMAGE_TEXTURE_KEY,
  manifestPath: "assets/renderer-atlas.manifest.json",
  imagePath: "assets/renderer-atlas@2x.png",
  assetBundleId: DEFAULT_ASSET_BUNDLE_ID,
  themeBundleId: DEFAULT_THEME_BUNDLE_ID,
  deferredSections: ["avatar-atlas", "theme-bundle"],
}

export interface RuntimeAtlasManifest {
  readonly schemaVersion: number
  readonly atlasId: string
  readonly sourceId: string
  readonly tilesetId: string
  readonly source: {
    readonly license: string
    readonly redistributionAllowed: "yes" | "no" | "unknown"
    readonly commercialUseAllowed: "yes" | "no" | "unknown"
    readonly bundledInTargetApp: boolean
    readonly externalImageInputs: readonly {
      readonly id: string
      readonly license: string
      readonly sha256: string
      readonly creditsSha256?: string
    }[]
  }
  readonly image: {
    readonly path: string
    readonly width: number
    readonly height: number
    readonly tileSize: number
    readonly exportScale: number
    readonly retinaStrategy: string
  }
  readonly frames: readonly RuntimeAtlasFrame[]
}

export interface RuntimeAtlasFrame {
  readonly id: string
  readonly tokenId: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly size: {
    readonly width: number
    readonly height: number
    readonly exportScale: number
  }
  readonly occlusion?: {
    readonly mode: "none" | "y_sort" | "foreground"
    readonly splitAtY?: number
    readonly foregroundFootprint?: {
      readonly x: number
      readonly y: number
      readonly width: number
      readonly height: number
    }
  }
  readonly collisionFootprint?: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }
  readonly visualFootprint?: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }
  readonly shadowFootprint?: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }
  readonly zAnchor?: {
    readonly x: number
    readonly y: number
  }
  readonly interaction?: {
    readonly affordance: string
    readonly label?: string
    readonly prompt?: string
    readonly radiusTiles?: number
    readonly priority?: number
  }
  readonly themeTags?: readonly string[]
  readonly variants?: readonly {
    readonly id: string
    readonly role: string
    readonly frameId: string
    readonly themeTags: readonly string[]
  }[]
}

export interface RuntimeAssetAtlas {
  readonly manifest: RuntimeAtlasManifest
  readonly image: CanvasImageSource
  readonly framesByTokenId: ReadonlyMap<string, RuntimeAtlasFrame>
}

export function emptyAssetPipelineInfo(
  config: RendererAssetPackConfig = DEFAULT_RENDERER_ASSET_PACK_CONFIG,
): RendererAssetPipelineInfo {
  return {
    manifestPath: atlasManifestPath(config),
    imagePath: atlasImagePath(config),
    primarySource: "procedural_fallback",
    atlasLoaded: false,
    manifestLoaded: false,
    renderedTokenCount: 0,
    fallbackTokenCount: 0,
    fallbackTokenIds: [],
    tilesetReused: false,
    loader: emptyAssetPackInfo(config),
    metadata: emptyAssetMetadataInfo(),
  }
}

export function assetPipelineInfoFromRender(
  atlas: RuntimeAssetAtlas | undefined,
  renderedTokenCount: number,
  fallbackTokenIds: ReadonlySet<string>,
  options: {
    readonly tilesetSignature?: string
    readonly tilesetReused?: boolean
    readonly loader?: RendererAssetPackInfo
    readonly assetPackConfig?: RendererAssetPackConfig
  } = {},
): RendererAssetPipelineInfo {
  const config = options.assetPackConfig ?? DEFAULT_RENDERER_ASSET_PACK_CONFIG

  return {
    atlasId: atlas?.manifest.atlasId,
    manifestPath: atlasManifestPath(config),
    imagePath: atlas ? appAssetUrl(atlas.manifest.image.path) : atlasImagePath(config),
    primarySource:
      atlas && fallbackTokenIds.size === 0 ? "internal_atlas" : "procedural_fallback",
    atlasLoaded: Boolean(atlas),
    manifestLoaded: Boolean(atlas?.manifest),
    renderedTokenCount,
    fallbackTokenCount: fallbackTokenIds.size,
    fallbackTokenIds: [...fallbackTokenIds].sort(),
    exportScale: atlas?.manifest.image.exportScale,
    retinaStrategy: atlas?.manifest.image.retinaStrategy,
    tilesetSignature: options.tilesetSignature,
    tilesetReused: options.tilesetReused ?? false,
    loader: options.loader ?? emptyAssetPackInfo(config),
    metadata: assetMetadataInfo(atlas?.manifest),
  }
}

export function drawTokenFrame(
  context: CanvasRenderingContext2D,
  atlas: RuntimeAssetAtlas | undefined,
  token: FixtureToken,
  x: number,
  y: number,
  tileSize: number,
  segment: TileSegment,
): boolean {
  if (!atlas) return false

  const frame = atlas.framesByTokenId.get(token.asset?.frameId ?? token.id)
  if (!frame) return false

  const scale = frame.size.exportScale
  const sourceX = frame.x + segment.offsetX * tileSize * scale
  const sourceY = frame.y + segment.offsetY * tileSize * scale
  const sourceWidth = tileSize * scale
  const sourceHeight = tileSize * scale

  context.drawImage(
    atlas.image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    tileSize,
    tileSize,
  )

  return true
}

export function drawTokenFrameWithFallback(
  context: CanvasRenderingContext2D,
  atlas: RuntimeAssetAtlas | undefined,
  token: FixtureToken,
  x: number,
  y: number,
  tileSize: number,
  segment: TileSegment,
  fallbackTokenIds: Set<string>,
): void {
  const drawn = drawTokenFrame(context, atlas, token, x, y, tileSize, segment)
  if (drawn) return

  fallbackTokenIds.add(token.id)
  drawSemanticTile(context, token, x, y, tileSize, segment)
}

export function rendererAssetPackData(
  config: RendererAssetPackConfig = DEFAULT_RENDERER_ASSET_PACK_CONFIG,
): Record<
  string,
  Phaser.Types.Loader.FileTypes.PackFileSection
> {
  return {
    [config.coreSection]: {
      files: [
        {
          type: "json",
          key: config.manifestCacheKey,
          url: atlasManifestPath(config),
        } as Phaser.Types.Loader.FileConfig,
        {
          type: "image",
          key: config.imageTextureKey,
          url: atlasImagePath(config),
        } as Phaser.Types.Loader.FileConfig,
      ],
    },
  }
}

export function runtimeAssetAtlasFromLoadedAssets(
  scene: Phaser.Scene,
  config: RendererAssetPackConfig = DEFAULT_RENDERER_ASSET_PACK_CONFIG,
): RuntimeAssetAtlas | undefined {
  const manifest = scene.cache.json.get(
    config.manifestCacheKey,
  ) as RuntimeAtlasManifest | undefined

  if (!manifest || !scene.textures.exists(config.imageTextureKey)) {
    return undefined
  }

  const texture = scene.textures.get(config.imageTextureKey)
  const image = texture.getSourceImage() as CanvasImageSource

  if (!hasDrawableImageSize(image)) {
    return undefined
  }

  return {
    manifest,
    image,
    framesByTokenId: new Map(
      manifest.frames.map((frame) => [frame.tokenId, frame]),
    ),
  }
}

function hasDrawableImageSize(
  image: CanvasImageSource,
): image is CanvasImageSource {
  return (
    typeof (image as { width?: unknown }).width === "number" &&
    typeof (image as { height?: unknown }).height === "number"
  )
}

export function emptyAssetPackInfo(
  config: RendererAssetPackConfig = DEFAULT_RENDERER_ASSET_PACK_CONFIG,
): RendererAssetPackInfo {
  return {
    source: "phaser_loader_asset_pack",
    packKey: config.packKey,
    packSource: "inline_pack_object",
    coreSection: config.coreSection,
    loadedSections: [],
    deferredSections: config.deferredSections ?? [],
    tenantBundleId: config.assetBundleId,
    themeBundleId: config.themeBundleId,
    progress: {
      started: false,
      complete: false,
      value: 0,
      totalFiles: 0,
      loadedFiles: 0,
      failedFiles: 0,
      completedKeys: [],
      failedKeys: [],
    },
    cache: {
      jsonKeys: [],
      textureKeys: [],
    },
  }
}

export function atlasManifestPath(
  config: RendererAssetPackConfig = DEFAULT_RENDERER_ASSET_PACK_CONFIG,
): string {
  return appAssetUrl(config.manifestPath)
}

export function atlasImagePath(
  config: RendererAssetPackConfig = DEFAULT_RENDERER_ASSET_PACK_CONFIG,
): string {
  return appAssetUrl(config.imagePath)
}

export function appAssetUrl(filePath: string): string {
  if (/^https?:\/\//.test(filePath)) return filePath

  const normalizedFilePath = filePath.replace(/^\/+/, "")
  if (normalizedFilePath.startsWith("assets/")) {
    return `${appBasePath()}${normalizedFilePath}`
  }

  return `${appBasePath()}assets/${normalizedFilePath}`
}

export function appBasePath(): string {
  const appPathMatch = window.location.pathname.match(/^(.*\/app)(?:\/|$)/)
  return appPathMatch ? `${appPathMatch[1]}/` : "/app/"
}

function assetMetadataInfo(
  manifest: RuntimeAtlasManifest | undefined,
): RendererAssetPipelineInfo["metadata"] {
  if (!manifest) return emptyAssetMetadataInfo()

  const themeTags = new Set<string>()
  let collisionFootprintCount = 0
  let visualFootprintCount = 0
  let shadowFootprintCount = 0
  let zAnchorCount = 0
  let interactionAffordanceCount = 0
  let occlusionSplitCount = 0
  let variantCount = 0

  manifest.frames.forEach((frame) => {
    if (frame.collisionFootprint) collisionFootprintCount += 1
    if (frame.visualFootprint) visualFootprintCount += 1
    if (frame.shadowFootprint) shadowFootprintCount += 1
    if (frame.zAnchor) zAnchorCount += 1
    if (frame.interaction?.affordance && frame.interaction.affordance !== "none") {
      interactionAffordanceCount += 1
    }
    if (frame.occlusion?.splitAtY !== undefined) occlusionSplitCount += 1
    frame.themeTags?.forEach((tag) => themeTags.add(tag))
    frame.variants?.forEach((variant) => {
      variantCount += 1
      variant.themeTags.forEach((tag) => themeTags.add(tag))
    })
  })

  return {
    schemaVersion: manifest.schemaVersion,
    frameCount: manifest.frames.length,
    collisionFootprintCount,
    visualFootprintCount,
    shadowFootprintCount,
    zAnchorCount,
    interactionAffordanceCount,
    occlusionSplitCount,
    variantCount,
    tenantThemeTagCount: themeTags.size,
    tenantThemeTags: [...themeTags].sort(),
    sourceInputCount: manifest.source.externalImageInputs.length,
    sourceLicenseValidated:
      manifest.source.redistributionAllowed === "yes" &&
      manifest.source.commercialUseAllowed === "yes" &&
      manifest.source.bundledInTargetApp === true &&
      manifest.source.externalImageInputs.every((input) =>
        /CC-BY-SA|GPL/.test(input.license),
      ),
    atlasBuildValidated:
      manifest.schemaVersion >= 1 &&
      manifest.frames.every(
        (frame) =>
          Boolean(frame.collisionFootprint) &&
          Boolean(frame.visualFootprint) &&
          Boolean(frame.shadowFootprint) &&
          Boolean(frame.zAnchor) &&
          Boolean(frame.interaction) &&
          Boolean(frame.themeTags?.length) &&
          Boolean(frame.variants?.length),
      ),
  }
}

function emptyAssetMetadataInfo(): RendererAssetPipelineInfo["metadata"] {
  return {
    frameCount: 0,
    collisionFootprintCount: 0,
    visualFootprintCount: 0,
    shadowFootprintCount: 0,
    zAnchorCount: 0,
    interactionAffordanceCount: 0,
    occlusionSplitCount: 0,
    variantCount: 0,
    tenantThemeTagCount: 0,
    tenantThemeTags: [],
    sourceInputCount: 0,
    sourceLicenseValidated: false,
    atlasBuildValidated: false,
  }
}
