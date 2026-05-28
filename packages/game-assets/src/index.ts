export type AssetApprovalStatus =
  | "target_approved"
  | "legacy_reference"
  | "placeholder_metadata"

export type LicenseAnswer = "yes" | "no" | "unknown"

export type VisualTokenKind = "floor" | "wall" | "item" | "avatar"

export type RenderLayer = "floor" | "wall" | "object" | "avatar"

export type VisualAssetOcclusionMode = "none" | "y_sort" | "foreground"

export type VisualAssetThemeTag = string

export type VisualAssetVariantRole =
  | "default"
  | "alternate_material"
  | "theme_tint"
  | "accent"

export type VisualAssetInteractionAffordance =
  | "none"
  | "open"
  | "serve"
  | "sit"
  | "gather"
  | "decorate"
  | "inspect"

export interface VisualAssetVariantMetadata {
  readonly id: string
  readonly label: string
  readonly role: VisualAssetVariantRole
  readonly frameId: string
  readonly themeTags: readonly VisualAssetThemeTag[]
}

export interface VisualAssetSource {
  readonly id: string
  readonly status: AssetApprovalStatus
  readonly filePath?: string
  readonly sourceUrl: string
  readonly author: string
  readonly license: string
  readonly attributionText?: string
  readonly redistributionAllowed: LicenseAnswer
  readonly commercialUseAllowed: LicenseAnswer
  readonly bundledInTargetApp: boolean
  readonly notes?: string
}

export interface TilesetDefinition {
  readonly id: string
  readonly sourceId: string
  readonly tileWidth: number
  readonly tileHeight: number
  readonly columns?: number
  readonly margin?: number
  readonly spacing?: number
  readonly atlasImagePath?: string
  readonly manifestPath?: string
  readonly exportScale?: number
}

export interface VisualAssetSize {
  readonly width: number
  readonly height: number
  readonly exportScale: number
}

export interface VisualAssetPoint {
  readonly x: number
  readonly y: number
}

export interface VisualAssetFootprint {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface VisualAssetFrameMetadata {
  readonly atlasId: string
  readonly frameId: string
  readonly size: VisualAssetSize
  readonly anchor: VisualAssetPoint
  readonly collisionFootprint: VisualAssetFootprint
  readonly visualFootprint: VisualAssetFootprint
  readonly shadowFootprint: VisualAssetFootprint
  readonly zAnchor: VisualAssetPoint
  readonly interaction: VisualAssetInteractionMetadata
  readonly occlusion: VisualAssetOcclusionMetadata
  readonly themeTags: readonly VisualAssetThemeTag[]
  readonly variants: readonly VisualAssetVariantMetadata[]
}

export interface VisualAssetInteractionMetadata {
  readonly affordance: VisualAssetInteractionAffordance
  readonly label?: string
  readonly prompt?: string
  readonly radiusTiles?: number
  readonly priority?: number
}

export interface VisualAssetOcclusionMetadata {
  readonly mode: VisualAssetOcclusionMode
  readonly splitAtY?: number
  readonly foregroundFootprint?: VisualAssetFootprint
}

export interface VisualTokenDefinition {
  readonly id: string
  readonly kind: VisualTokenKind
  readonly layer: RenderLayer
  readonly sourceId: string
  readonly tilesetId?: string
  readonly provisionalGid: number
  readonly widthTiles: number
  readonly heightTiles: number
  readonly collidable: boolean
  readonly asset?: VisualAssetFrameMetadata
  readonly tags: readonly string[]
  readonly notes?: string
}

export interface VisualStyleDefinition {
  readonly id: string
  readonly floorTokenId: string
  readonly wallTokenIds: {
    readonly straight: string
    readonly corner: string
  }
  readonly tags: readonly string[]
}

export interface VisualAssetCatalog {
  readonly version: number
  readonly tileSize: number
  readonly sources: readonly VisualAssetSource[]
  readonly tilesets: readonly TilesetDefinition[]
  readonly tokens: readonly VisualTokenDefinition[]
  readonly styles: readonly VisualStyleDefinition[]
}

export interface VisualAtlasManifestFrame {
  readonly frameId: string
  readonly gid: number
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly widthTiles: number
  readonly heightTiles: number
  readonly collisionFootprint: VisualAssetFootprint
  readonly visualFootprint: VisualAssetFootprint
  readonly shadowFootprint: VisualAssetFootprint
  readonly zAnchor: VisualAssetPoint
  readonly interaction: VisualAssetInteractionMetadata
  readonly occlusion: VisualAssetOcclusionMetadata
  readonly variants: readonly VisualAssetVariantMetadata[]
}

export interface VisualAtlasManifest {
  readonly version: number
  readonly atlasId: string
  readonly tilesetId: string
  readonly tileSize: number
  readonly exportScale: number
  readonly image: {
    readonly path: string
    readonly width: number
    readonly height: number
  }
  readonly source: VisualAssetSource & {
    readonly externalImageInputs?: readonly {
      readonly path: string
      readonly license: string
      readonly sourceUrl?: string
    }[]
  }
  readonly frames: readonly VisualAtlasManifestFrame[]
  readonly checksums?: {
    readonly imageSha256?: string
  }
}

export function validateVisualAssetCatalog(
  catalog: VisualAssetCatalog,
): readonly string[] {
  const errors: string[] = []
  const sourceIds = new Set<string>()
  const sourcesById = new Map<string, VisualAssetSource>()
  const tilesetIds = new Set<string>()
  const tokenIds = new Set<string>()
  const styleIds = new Set<string>()

  for (const source of catalog.sources) {
    if (sourceIds.has(source.id)) {
      errors.push(`Duplicate source id: ${source.id}`)
    }
    sourceIds.add(source.id)
    sourcesById.set(source.id, source)

    if (
      source.bundledInTargetApp &&
      (source.status !== "target_approved" ||
        source.redistributionAllowed !== "yes" ||
        source.commercialUseAllowed !== "yes")
    ) {
      errors.push(
        `Bundled source is not approved for target distribution: ${source.id}`,
      )
    }

    if (source.bundledInTargetApp && !source.filePath) {
      errors.push(`Bundled source ${source.id} must declare a local manifest path`)
    }

    if (source.bundledInTargetApp && !source.attributionText) {
      errors.push(`Bundled source ${source.id} must declare attribution text`)
    }

    if (
      source.bundledInTargetApp &&
      !isApprovedCopyleftLicense(source.license)
    ) {
      errors.push(
        `Bundled source ${source.id} must use an approved copyleft license path`,
      )
    }
  }

  for (const tileset of catalog.tilesets) {
    if (tilesetIds.has(tileset.id)) {
      errors.push(`Duplicate tileset id: ${tileset.id}`)
    }
    tilesetIds.add(tileset.id)

    if (!sourceIds.has(tileset.sourceId)) {
      errors.push(`Tileset ${tileset.id} references unknown source ${tileset.sourceId}`)
    }
  }

  for (const token of catalog.tokens) {
    if (tokenIds.has(token.id)) {
      errors.push(`Duplicate token id: ${token.id}`)
    }
    tokenIds.add(token.id)

    if (!sourceIds.has(token.sourceId)) {
      errors.push(`Token ${token.id} references unknown source ${token.sourceId}`)
    }

    if (token.tilesetId !== undefined && !tilesetIds.has(token.tilesetId)) {
      errors.push(`Token ${token.id} references unknown tileset ${token.tilesetId}`)
    }

    const source = sourcesById.get(token.sourceId)
    if (source?.bundledInTargetApp && !token.asset) {
      errors.push(`Bundled token ${token.id} is missing atlas frame metadata`)
    }

    if (token.asset) {
      if (token.asset.frameId !== token.id) {
        errors.push(
          `Token ${token.id} atlas frame id mismatch: ${token.asset.frameId}`,
        )
      }

      if (token.asset.size.width !== token.widthTiles * catalog.tileSize) {
        errors.push(`Token ${token.id} atlas width does not match tile width`)
      }

      if (token.asset.size.height !== token.heightTiles * catalog.tileSize) {
        errors.push(`Token ${token.id} atlas height does not match tile height`)
      }

      if (token.asset.size.exportScale <= 0) {
        errors.push(`Token ${token.id} atlas export scale must be positive`)
      }

      if (
        token.asset.visualFootprint.width <= 0 ||
        token.asset.visualFootprint.height <= 0
      ) {
        errors.push(`Token ${token.id} atlas visual footprint must be positive`)
      }

      if (!pointWithinAsset(token.asset.zAnchor, token.asset.size)) {
        errors.push(`Token ${token.id} z-anchor is outside asset bounds`)
      }

      if (!footprintWithinAsset(token.asset.visualFootprint, token.asset.size)) {
        errors.push(`Token ${token.id} visual footprint is outside asset bounds`)
      }

      if (!footprintWithinAsset(token.asset.shadowFootprint, token.asset.size)) {
        errors.push(`Token ${token.id} shadow footprint is outside asset bounds`)
      }

      if (
        token.asset.collisionFootprint.width > 0 &&
        !footprintWithinAsset(token.asset.collisionFootprint, token.asset.size)
      ) {
        errors.push(`Token ${token.id} collision footprint is outside asset bounds`)
      }

      if (
        token.collidable &&
        (token.asset.collisionFootprint.width <= 0 ||
          token.asset.collisionFootprint.height <= 0)
      ) {
        errors.push(`Token ${token.id} collidable asset needs a collision footprint`)
      }

      if (
        !token.collidable &&
        (token.asset.collisionFootprint.width > 0 ||
          token.asset.collisionFootprint.height > 0)
      ) {
        errors.push(
          `Token ${token.id} non-collidable asset must not define a collision footprint`,
        )
      }

      if (
        token.asset.occlusion.mode === "foreground" &&
        !token.asset.occlusion.foregroundFootprint
      ) {
        errors.push(`Token ${token.id} foreground occlusion needs a footprint`)
      }

      if (
        token.asset.occlusion.foregroundFootprint &&
        !footprintWithinAsset(
          token.asset.occlusion.foregroundFootprint,
          token.asset.size,
        )
      ) {
        errors.push(`Token ${token.id} foreground footprint is outside asset bounds`)
      }

      if (token.asset.themeTags.length === 0) {
        errors.push(`Token ${token.id} asset must declare theme tags`)
      }

      if (token.asset.variants.length === 0) {
        errors.push(`Token ${token.id} asset must declare at least one variant`)
      }

      if (token.kind === "item") {
        if (
          token.asset.shadowFootprint.width <= 0 ||
          token.asset.shadowFootprint.height <= 0
        ) {
          errors.push(`Token ${token.id} item asset needs a shadow footprint`)
        }

        if (
          token.asset.interaction.affordance !== "none" &&
          (!token.asset.interaction.label ||
            !token.asset.interaction.prompt ||
            !token.asset.interaction.radiusTiles ||
            token.asset.interaction.radiusTiles <= 0)
        ) {
          errors.push(
            `Token ${token.id} interactive asset needs label, prompt, and radius`,
          )
        }
      }

      if (
        !token.asset.variants.some(
          (variant) =>
            variant.role === "default" && variant.frameId === token.asset?.frameId,
        )
      ) {
        errors.push(`Token ${token.id} asset variants must include a default frame`)
      }

      for (const variant of token.asset.variants) {
        if (!variant.id || !variant.label || !variant.frameId) {
          errors.push(`Token ${token.id} has an incomplete variant definition`)
        }

        if (variant.themeTags.length === 0) {
          errors.push(`Token ${token.id} variant ${variant.id} has no theme tags`)
        }
      }
    }
  }

  for (const style of catalog.styles) {
    if (styleIds.has(style.id)) {
      errors.push(`Duplicate style id: ${style.id}`)
    }
    styleIds.add(style.id)

    if (!tokenIds.has(style.floorTokenId)) {
      errors.push(`Style ${style.id} references unknown floor ${style.floorTokenId}`)
    }

    if (!tokenIds.has(style.wallTokenIds.straight)) {
      errors.push(
        `Style ${style.id} references unknown straight wall ${style.wallTokenIds.straight}`,
      )
    }

    if (!tokenIds.has(style.wallTokenIds.corner)) {
      errors.push(
        `Style ${style.id} references unknown corner wall ${style.wallTokenIds.corner}`,
      )
    }
  }

  return errors
}

export function assertNoUnapprovedBundledAssets(
  catalog: VisualAssetCatalog,
): void {
  const errors = validateVisualAssetCatalog(catalog).filter((error) =>
    error.includes("Bundled source is not approved"),
  )

  if (errors.length > 0) {
    throw new Error(errors.join("\n"))
  }
}

function isApprovedCopyleftLicense(license: string): boolean {
  if (/OGA-BY|CC-BY-[0-9]/.test(license)) return false
  return /LicenseRef-LPC-Copyleft-Mixed|CC-BY-SA|GPL|AGPL|LGPL/.test(license)
}

function pointWithinAsset(
  point: VisualAssetPoint,
  size: VisualAssetSize,
): boolean {
  return point.x >= 0 && point.y >= 0 && point.x <= size.width && point.y <= size.height
}

function footprintWithinAsset(
  footprint: VisualAssetFootprint,
  size: VisualAssetSize,
): boolean {
  return (
    footprint.x >= 0 &&
    footprint.y >= 0 &&
    footprint.width >= 0 &&
    footprint.height >= 0 &&
    footprint.x + footprint.width <= size.width &&
    footprint.y + footprint.height <= size.height
  )
}
