import Phaser from "phaser"

import { drawSemanticTile } from "./semantic-tiles"
import type {
  FixtureToken,
  RendererAssetPackInfo,
  RendererAssetPipelineInfo,
  TileSegment,
} from "./types"

const ATLAS_MANIFEST_FILE = "assets/internal-office-atlas.manifest.json"
const ATLAS_IMAGE_FILE = "assets/internal-office-atlas@2x.png"
export const OFFICE_ASSET_PACK_KEY = "aedventure.office.core-pack"
export const OFFICE_ASSET_PACK_SECTION = "core-office"
export const OFFICE_ATLAS_MANIFEST_CACHE_KEY = "aedventure.office.atlas.manifest"
export const OFFICE_ATLAS_IMAGE_TEXTURE_KEY = "aedventure.office.atlas.image"
export const TENANT_DEFAULT_BUNDLE_ID = "tenant.default"
export const OFFICE_POLISHED_THEME_BUNDLE_ID = "theme.office.polished_v1"

export interface InternalOfficeAtlasManifest {
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
  readonly frames: readonly InternalOfficeAtlasFrame[]
}

export interface InternalOfficeAtlasFrame {
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
  readonly zAnchor?: {
    readonly x: number
    readonly y: number
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
  readonly manifest: InternalOfficeAtlasManifest
  readonly image: CanvasImageSource
  readonly framesByTokenId: ReadonlyMap<string, InternalOfficeAtlasFrame>
}

export function emptyAssetPipelineInfo(): RendererAssetPipelineInfo {
  return {
    manifestPath: atlasManifestPath(),
    imagePath: atlasImagePath(),
    primarySource: "procedural_fallback",
    atlasLoaded: false,
    manifestLoaded: false,
    renderedTokenCount: 0,
    fallbackTokenCount: 0,
    fallbackTokenIds: [],
    tilesetReused: false,
    loader: emptyAssetPackInfo(),
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
  } = {},
): RendererAssetPipelineInfo {
  return {
    atlasId: atlas?.manifest.atlasId,
    manifestPath: atlasManifestPath(),
    imagePath: atlas ? appAssetUrl(atlas.manifest.image.path) : atlasImagePath(),
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
    loader: options.loader ?? emptyAssetPackInfo(),
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

export function internalOfficeAssetPackData(): Record<
  string,
  Phaser.Types.Loader.FileTypes.PackFileSection
> {
  return {
    [OFFICE_ASSET_PACK_SECTION]: {
      files: [
        {
          type: "json",
          key: OFFICE_ATLAS_MANIFEST_CACHE_KEY,
          url: atlasManifestPath(),
        } as Phaser.Types.Loader.FileConfig,
        {
          type: "image",
          key: OFFICE_ATLAS_IMAGE_TEXTURE_KEY,
          url: atlasImagePath(),
        } as Phaser.Types.Loader.FileConfig,
      ],
    },
  }
}

export function runtimeAssetAtlasFromLoadedAssets(
  scene: Phaser.Scene,
): RuntimeAssetAtlas | undefined {
  const manifest = scene.cache.json.get(
    OFFICE_ATLAS_MANIFEST_CACHE_KEY,
  ) as InternalOfficeAtlasManifest | undefined

  if (!manifest || !scene.textures.exists(OFFICE_ATLAS_IMAGE_TEXTURE_KEY)) {
    return undefined
  }

  const texture = scene.textures.get(OFFICE_ATLAS_IMAGE_TEXTURE_KEY)
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

export function emptyAssetPackInfo(): RendererAssetPackInfo {
  return {
    source: "phaser_loader_asset_pack",
    packKey: OFFICE_ASSET_PACK_KEY,
    packSource: "inline_pack_object",
    coreSection: OFFICE_ASSET_PACK_SECTION,
    loadedSections: [],
    deferredSections: ["avatar-atlas", "tenant-theme"],
    tenantBundleId: TENANT_DEFAULT_BUNDLE_ID,
    themeBundleId: OFFICE_POLISHED_THEME_BUNDLE_ID,
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

export function atlasManifestPath(): string {
  return appAssetUrl(ATLAS_MANIFEST_FILE)
}

export function atlasImagePath(): string {
  return appAssetUrl(ATLAS_IMAGE_FILE)
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
  manifest: InternalOfficeAtlasManifest | undefined,
): RendererAssetPipelineInfo["metadata"] {
  if (!manifest) return emptyAssetMetadataInfo()

  const themeTags = new Set<string>()
  let collisionFootprintCount = 0
  let visualFootprintCount = 0
  let zAnchorCount = 0
  let occlusionSplitCount = 0
  let variantCount = 0

  manifest.frames.forEach((frame) => {
    if (frame.collisionFootprint) collisionFootprintCount += 1
    if (frame.visualFootprint) visualFootprintCount += 1
    if (frame.zAnchor) zAnchorCount += 1
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
    zAnchorCount,
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
          Boolean(frame.zAnchor) &&
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
    zAnchorCount: 0,
    occlusionSplitCount: 0,
    variantCount: 0,
    tenantThemeTagCount: 0,
    tenantThemeTags: [],
    sourceInputCount: 0,
    sourceLicenseValidated: false,
    atlasBuildValidated: false,
  }
}
