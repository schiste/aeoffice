import { drawSemanticTile } from "./semantic-tiles"
import type {
  FixtureToken,
  RendererAssetPipelineInfo,
  TileSegment,
} from "./types"

const ATLAS_MANIFEST_FILE = "assets/internal-office-atlas.manifest.json"
const ATLAS_IMAGE_FILE = "assets/internal-office-atlas@2x.png"

export interface InternalOfficeAtlasManifest {
  readonly schemaVersion: number
  readonly atlasId: string
  readonly sourceId: string
  readonly tilesetId: string
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
}

export interface RuntimeAssetAtlas {
  readonly manifest: InternalOfficeAtlasManifest
  readonly image: HTMLImageElement
  readonly framesByTokenId: ReadonlyMap<string, InternalOfficeAtlasFrame>
}

let atlasPromise: Promise<RuntimeAssetAtlas | undefined> | undefined

export function loadInternalOfficeAtlas(): Promise<RuntimeAssetAtlas | undefined> {
  atlasPromise ??= loadAtlas()
  return atlasPromise
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
  }
}

export function assetPipelineInfoFromRender(
  atlas: RuntimeAssetAtlas | undefined,
  renderedTokenCount: number,
  fallbackTokenIds: ReadonlySet<string>,
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

async function loadAtlas(): Promise<RuntimeAssetAtlas | undefined> {
  try {
    const manifestResponse = await fetch(atlasManifestPath(), {
      cache: "force-cache",
    })
    if (!manifestResponse.ok) return undefined

    const manifest = (await manifestResponse.json()) as InternalOfficeAtlasManifest
    const image = await loadImage(appAssetUrl(manifest.image.path || ATLAS_IMAGE_FILE))

    return {
      manifest,
      image,
      framesByTokenId: new Map(
        manifest.frames.map((frame) => [frame.tokenId, frame]),
      ),
    }
  } catch {
    return undefined
  }
}

function atlasManifestPath(): string {
  return appAssetUrl(ATLAS_MANIFEST_FILE)
}

function atlasImagePath(): string {
  return appAssetUrl(ATLAS_IMAGE_FILE)
}

function appAssetUrl(filePath: string): string {
  if (/^https?:\/\//.test(filePath)) return filePath

  const normalizedFilePath = filePath.replace(/^\/+/, "")
  if (normalizedFilePath.startsWith("assets/")) {
    return `${appBasePath()}${normalizedFilePath}`
  }

  return `${appBasePath()}assets/${normalizedFilePath}`
}

function appBasePath(): string {
  const appPathMatch = window.location.pathname.match(/^(.*\/app)(?:\/|$)/)
  return appPathMatch ? `${appPathMatch[1]}/` : "/app/"
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = "async"
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Unable to load asset atlas ${src}.`))
    image.src = src
  })
}
