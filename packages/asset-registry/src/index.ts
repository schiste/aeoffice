export type AssetApprovalStatus =
  | "target_approved"
  | "legacy_reference"
  | "placeholder_metadata"

export type LicenseAnswer = "yes" | "no" | "unknown"

export type VisualTokenKind = "floor" | "wall" | "item" | "avatar"

export type RenderLayer = "floor" | "wall" | "object" | "avatar"

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
  readonly zAnchor: VisualAssetPoint
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

export interface SemanticMapDefinition {
  readonly roomDimensions: {
    readonly width: number
    readonly height: number
  }
  readonly style: string
  readonly layers: {
    readonly walls?: readonly SemanticWallPlacement[]
    readonly furniture?: readonly SemanticFurniturePlacement[]
    readonly zones?: readonly SemanticZoneDefinition[]
  }
}

export interface SemanticWallPlacement {
  readonly x: number
  readonly y: number
  readonly type: "straight" | "corner"
}

export interface SemanticFurniturePlacement {
  readonly x: number
  readonly y: number
  readonly item: string
  readonly direction?: "north" | "south" | "east" | "west"
}

export interface SemanticZoneDefinition {
  readonly id: string
  readonly xStart: number
  readonly yStart: number
  readonly xEnd: number
  readonly yEnd: number
  readonly zoneType: "meeting_private" | "lobby" | "quiet"
}

export interface CompiledTileLayer {
  readonly name: string
  readonly width: number
  readonly height: number
  readonly gids: readonly (readonly number[])[]
}

export interface CompiledSemanticMap {
  readonly width: number
  readonly height: number
  readonly tileSize: number
  readonly layers: {
    readonly floor: CompiledTileLayer
    readonly walls: CompiledTileLayer
    readonly objects: CompiledTileLayer
  }
  readonly blockedTiles: readonly { readonly x: number; readonly y: number }[]
  readonly zones: readonly SemanticZoneDefinition[]
  readonly referencedTokenIds: readonly string[]
}

export interface PromptMapSpawnPoint {
  readonly id: "default" | "guest"
  readonly position: {
    readonly x: number
    readonly y: number
  }
}

export interface PromptMapValidation {
  readonly valid: boolean
  readonly errors: readonly string[]
  readonly blockedTileCount: number
  readonly spawnCount: number
  readonly zoneCount: number
  readonly spawnIds: readonly string[]
  readonly zoneIds: readonly string[]
}

export interface DeterministicPromptMapResult {
  readonly prompt: string
  readonly keywords: readonly string[]
  readonly definition: SemanticMapDefinition
  readonly compiled: CompiledSemanticMap
  readonly spawnPoints: readonly PromptMapSpawnPoint[]
  readonly validation: PromptMapValidation
}

export type PresetMapId = "lobby" | "meeting_room" | "lounge_cafe"

export interface PresetMapSummary {
  readonly id: PresetMapId
  readonly label: string
}

export interface PresetMapResult {
  readonly id: PresetMapId
  readonly label: string
  readonly definition: SemanticMapDefinition
  readonly compiled: CompiledSemanticMap
  readonly spawnPoints: readonly PromptMapSpawnPoint[]
  readonly validation: PromptMapValidation
}

export const presetMapSummaries: readonly PresetMapSummary[] = [
  { id: "lobby", label: "Lobby" },
  { id: "meeting_room", label: "Meeting room" },
  { id: "lounge_cafe", label: "Lounge/café" },
]

const LEGACY_SKYOFFICE_SOURCE = {
  status: "legacy_reference" as const,
  sourceUrl: "https://github.com/kevinshen56714/SkyOffice",
  author: "SkyOffice / LimeZu reference asset",
  license: "LicenseRef-LimeZu-Reference-Only",
  redistributionAllowed: "unknown" as const,
  commercialUseAllowed: "unknown" as const,
  bundledInTargetApp: false,
  notes:
    "Development reference only. Do not copy into target app bundles until legal review approves redistribution.",
}

const INTERNAL_POLISHED_SOURCE_ID = "internal.generated.office.polished_v1"
const INTERNAL_POLISHED_TILESET_ID = "tileset.internal.polished.office"
const INTERNAL_POLISHED_ATLAS_ID = "atlas.internal.office.polished_v1"
const INTERNAL_POLISHED_ATLAS_IMAGE_PATH =
  "apps/web/public/assets/internal-office-atlas@2x.png"
const INTERNAL_POLISHED_ATLAS_MANIFEST_PATH =
  "apps/web/public/assets/internal-office-atlas.manifest.json"
const INTERNAL_POLISHED_ATLAS_EXPORT_SCALE = 2

const INTERNAL_POLISHED_SOURCE = {
  status: "target_approved" as const,
  filePath: INTERNAL_POLISHED_ATLAS_MANIFEST_PATH,
  sourceUrl: "internal://aedventure/generated-office-polished/v1",
  author: "Aedventure project",
  license: "CC0-1.0",
  redistributionAllowed: "yes" as const,
  commercialUseAllowed: "yes" as const,
  bundledInTargetApp: true,
  notes:
    "Project-owned internal office visuals generated from deterministic vector instructions. No third-party image inputs are bundled.",
}

function internalAtlasFrame(
  frameId: string,
  widthTiles: number,
  heightTiles: number,
  collidable: boolean,
): VisualAssetFrameMetadata {
  const width = widthTiles * 32
  const height = heightTiles * 32

  return {
    atlasId: INTERNAL_POLISHED_ATLAS_ID,
    frameId,
    size: {
      width,
      height,
      exportScale: INTERNAL_POLISHED_ATLAS_EXPORT_SCALE,
    },
    anchor: {
      x: width / 2,
      y: height / 2,
    },
    collisionFootprint: collidable
      ? {
          x: 0,
          y: 0,
          width,
          height,
        }
      : {
          x: 0,
          y: 0,
          width: 0,
          height: 0,
        },
    visualFootprint: {
      x: 0,
      y: 0,
      width,
      height,
    },
    zAnchor: {
      x: width / 2,
      y: height,
    },
  }
}

export const starterVisualAssetCatalog: VisualAssetCatalog = {
  version: 1,
  tileSize: 32,
  sources: [
    {
      ...INTERNAL_POLISHED_SOURCE,
      id: INTERNAL_POLISHED_SOURCE_ID,
    },
    {
      ...LEGACY_SKYOFFICE_SOURCE,
      id: "legacy.skyoffice.tileset.modern_office",
      filePath:
        "legacy/skyoffice-original/client/public/assets/tileset/Modern_Office_Black_Shadow.png",
    },
    {
      ...LEGACY_SKYOFFICE_SOURCE,
      id: "legacy.skyoffice.tileset.generic",
      filePath: "legacy/skyoffice-original/client/public/assets/tileset/Generic.png",
    },
    {
      ...LEGACY_SKYOFFICE_SOURCE,
      id: "legacy.skyoffice.character.adam",
      filePath: "legacy/skyoffice-original/client/public/assets/character/adam.png",
    },
  ],
  tilesets: [
    {
      id: INTERNAL_POLISHED_TILESET_ID,
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tileWidth: 32,
      tileHeight: 32,
      columns: 32,
      atlasImagePath: INTERNAL_POLISHED_ATLAS_IMAGE_PATH,
      manifestPath: INTERNAL_POLISHED_ATLAS_MANIFEST_PATH,
      exportScale: INTERNAL_POLISHED_ATLAS_EXPORT_SCALE,
    },
    {
      id: "tileset.modern_office.reference",
      sourceId: "legacy.skyoffice.tileset.modern_office",
      tileWidth: 32,
      tileHeight: 32,
    },
    {
      id: "tileset.generic.reference",
      sourceId: "legacy.skyoffice.tileset.generic",
      tileWidth: 32,
      tileHeight: 32,
    },
  ],
  tokens: [
    {
      id: "floor.wood_parquet",
      kind: "floor",
      layer: "floor",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 12,
      widthTiles: 1,
      heightTiles: 1,
      collidable: false,
      asset: internalAtlasFrame("floor.wood_parquet", 1, 1, false),
      tags: ["cozy_wood", "office", "floor"],
    },
    {
      id: "floor.polished_concrete",
      kind: "floor",
      layer: "floor",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 13,
      widthTiles: 1,
      heightTiles: 1,
      collidable: false,
      asset: internalAtlasFrame("floor.polished_concrete", 1, 1, false),
      tags: ["modern_light", "office", "floor"],
    },
    {
      id: "floor.soft_carpet",
      kind: "floor",
      layer: "floor",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 14,
      widthTiles: 1,
      heightTiles: 1,
      collidable: false,
      asset: internalAtlasFrame("floor.soft_carpet", 1, 1, false),
      tags: ["quiet", "office", "floor"],
    },
    {
      id: "wall.wood.straight",
      kind: "wall",
      layer: "wall",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 45,
      widthTiles: 1,
      heightTiles: 1,
      collidable: true,
      asset: internalAtlasFrame("wall.wood.straight", 1, 1, true),
      tags: ["cozy_wood", "wall"],
    },
    {
      id: "wall.wood.corner",
      kind: "wall",
      layer: "wall",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 46,
      widthTiles: 1,
      heightTiles: 1,
      collidable: true,
      asset: internalAtlasFrame("wall.wood.corner", 1, 1, true),
      tags: ["cozy_wood", "wall", "corner"],
    },
    {
      id: "wall.glass.straight",
      kind: "wall",
      layer: "wall",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 47,
      widthTiles: 1,
      heightTiles: 1,
      collidable: true,
      asset: internalAtlasFrame("wall.glass.straight", 1, 1, true),
      tags: ["modern_light", "wall", "glass"],
    },
    {
      id: "wall.glass.corner",
      kind: "wall",
      layer: "wall",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 48,
      widthTiles: 1,
      heightTiles: 1,
      collidable: true,
      asset: internalAtlasFrame("wall.glass.corner", 1, 1, true),
      tags: ["modern_light", "wall", "glass", "corner"],
    },
    {
      id: "wall.neutral.straight",
      kind: "wall",
      layer: "wall",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 49,
      widthTiles: 1,
      heightTiles: 1,
      collidable: true,
      asset: internalAtlasFrame("wall.neutral.straight", 1, 1, true),
      tags: ["neutral_office", "wall", "neutral"],
    },
    {
      id: "wall.neutral.corner",
      kind: "wall",
      layer: "wall",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 50,
      widthTiles: 1,
      heightTiles: 1,
      collidable: true,
      asset: internalAtlasFrame("wall.neutral.corner", 1, 1, true),
      tags: ["neutral_office", "wall", "neutral", "corner"],
    },
    {
      id: "item.large_conference_table",
      kind: "item",
      layer: "object",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 201,
      widthTiles: 3,
      heightTiles: 2,
      collidable: true,
      asset: internalAtlasFrame("item.large_conference_table", 3, 2, true),
      tags: ["meeting", "table", "office"],
    },
    {
      id: "item.small_round_table",
      kind: "item",
      layer: "object",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 202,
      widthTiles: 2,
      heightTiles: 2,
      collidable: true,
      asset: internalAtlasFrame("item.small_round_table", 2, 2, true),
      tags: ["meeting", "table", "coffee", "office"],
    },
    {
      id: "item.office_chair",
      kind: "item",
      layer: "object",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 160,
      widthTiles: 1,
      heightTiles: 1,
      collidable: true,
      asset: internalAtlasFrame("item.office_chair", 1, 1, true),
      tags: ["meeting", "chair", "office"],
    },
    {
      id: "item.coffee_machine",
      kind: "item",
      layer: "object",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 305,
      widthTiles: 1,
      heightTiles: 1,
      collidable: true,
      asset: internalAtlasFrame("item.coffee_machine", 1, 1, true),
      tags: ["kitchen", "coffee", "office"],
    },
    {
      id: "item.plant_potted",
      kind: "item",
      layer: "object",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 306,
      widthTiles: 1,
      heightTiles: 1,
      collidable: true,
      asset: internalAtlasFrame("item.plant_potted", 1, 1, true),
      tags: ["decor", "plant", "office"],
    },
    {
      id: "item.coffee_bar",
      kind: "item",
      layer: "object",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 307,
      widthTiles: 2,
      heightTiles: 1,
      collidable: true,
      asset: internalAtlasFrame("item.coffee_bar", 2, 1, true),
      tags: ["kitchen", "coffee", "bar", "office"],
    },
    {
      id: "item.door_single",
      kind: "item",
      layer: "object",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 308,
      widthTiles: 1,
      heightTiles: 1,
      collidable: false,
      asset: internalAtlasFrame("item.door_single", 1, 1, false),
      tags: ["door", "entry", "office"],
      notes:
        "Non-collidable door token. Server collision still depends on wall openings in the compiled map.",
    },
    {
      id: "item.lounge_couch",
      kind: "item",
      layer: "object",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 309,
      widthTiles: 2,
      heightTiles: 1,
      collidable: true,
      asset: internalAtlasFrame("item.lounge_couch", 2, 1, true),
      tags: ["lounge", "couch", "sofa", "office"],
    },
    {
      id: "avatar.local_placeholder",
      kind: "avatar",
      layer: "avatar",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 2,
      widthTiles: 1,
      heightTiles: 1,
      collidable: false,
      asset: internalAtlasFrame("avatar.local_placeholder", 1, 1, false),
      tags: ["avatar", "placeholder"],
    },
    {
      id: "avatar.ember",
      kind: "avatar",
      layer: "avatar",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 20,
      widthTiles: 1,
      heightTiles: 1,
      collidable: false,
      asset: internalAtlasFrame("avatar.ember", 1, 1, false),
      tags: ["avatar", "polished", "ember"],
    },
    {
      id: "avatar.cobalt",
      kind: "avatar",
      layer: "avatar",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 21,
      widthTiles: 1,
      heightTiles: 1,
      collidable: false,
      asset: internalAtlasFrame("avatar.cobalt", 1, 1, false),
      tags: ["avatar", "polished", "cobalt"],
    },
    {
      id: "avatar.moss",
      kind: "avatar",
      layer: "avatar",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 22,
      widthTiles: 1,
      heightTiles: 1,
      collidable: false,
      asset: internalAtlasFrame("avatar.moss", 1, 1, false),
      tags: ["avatar", "polished", "moss"],
    },
    {
      id: "avatar.violet",
      kind: "avatar",
      layer: "avatar",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 23,
      widthTiles: 1,
      heightTiles: 1,
      collidable: false,
      asset: internalAtlasFrame("avatar.violet", 1, 1, false),
      tags: ["avatar", "polished", "violet"],
    },
    {
      id: "avatar.adam",
      kind: "avatar",
      layer: "avatar",
      sourceId: "legacy.skyoffice.character.adam",
      provisionalGid: 1,
      widthTiles: 1,
      heightTiles: 1,
      collidable: false,
      tags: ["avatar", "legacy_reference"],
    },
  ],
  styles: [
    {
      id: "cozy_wood",
      floorTokenId: "floor.wood_parquet",
      wallTokenIds: {
        straight: "wall.wood.straight",
        corner: "wall.wood.corner",
      },
      tags: ["cozy", "wood", "office"],
    },
    {
      id: "modern_light",
      floorTokenId: "floor.polished_concrete",
      wallTokenIds: {
        straight: "wall.glass.straight",
        corner: "wall.glass.corner",
      },
      tags: ["modern", "light", "office"],
    },
    {
      id: "quiet_carpet",
      floorTokenId: "floor.soft_carpet",
      wallTokenIds: {
        straight: "wall.neutral.straight",
        corner: "wall.neutral.corner",
      },
      tags: ["quiet", "carpet", "office"],
    },
    {
      id: "neutral_office",
      floorTokenId: "floor.polished_concrete",
      wallTokenIds: {
        straight: "wall.neutral.straight",
        corner: "wall.neutral.corner",
      },
      tags: ["neutral", "office"],
    },
  ],
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

      if (
        token.collidable &&
        (token.asset.collisionFootprint.width <= 0 ||
          token.asset.collisionFootprint.height <= 0)
      ) {
        errors.push(`Token ${token.id} collidable asset needs a collision footprint`)
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

export function compileSemanticMapDefinition(
  definition: SemanticMapDefinition,
  catalog: VisualAssetCatalog = starterVisualAssetCatalog,
): CompiledSemanticMap {
  const style = catalog.styles.find((candidate) => candidate.id === definition.style)
  if (!style) {
    throw new Error(`Unknown visual style: ${definition.style}`)
  }

  const width = definition.roomDimensions.width
  const height = definition.roomDimensions.height
  const floorToken = requireToken(catalog, style.floorTokenId)
  const floor = createLayer("floor", width, height, floorToken.provisionalGid)
  const walls = createLayer("walls", width, height, 0)
  const objects = createLayer("objects", width, height, 0)
  const blockedTiles: { x: number; y: number }[] = []
  const referencedTokenIds = new Set<string>([floorToken.id])

  for (const wall of definition.layers.walls ?? []) {
    const token = requireToken(catalog, style.wallTokenIds[wall.type])
    referencedTokenIds.add(token.id)
    paintToken(walls, token, wall.x, wall.y)
    addBlockedTiles(blockedTiles, token, wall.x, wall.y)
  }

  for (const item of definition.layers.furniture ?? []) {
    const token = requireToken(catalog, `item.${item.item}`)
    referencedTokenIds.add(token.id)
    paintToken(objects, token, item.x, item.y)
    addBlockedTiles(blockedTiles, token, item.x, item.y)
  }

  return {
    width,
    height,
    tileSize: catalog.tileSize,
    layers: {
      floor,
      walls,
      objects,
    },
    blockedTiles,
    zones: definition.layers.zones ?? [],
    referencedTokenIds: [...referencedTokenIds],
  }
}

export function compileDeterministicPromptMap(
  prompt: string,
  catalog: VisualAssetCatalog = starterVisualAssetCatalog,
): DeterministicPromptMapResult {
  const keywords = promptKeywords(prompt)
  const definition = promptToSemanticMapDefinition(prompt, keywords)
  const compiled = compileSemanticMapDefinition(definition, catalog)
  const spawnPoints = promptMapSpawnPoints(compiled)
  const validation = validatePromptMap(compiled, spawnPoints)

  return {
    prompt,
    keywords,
    definition,
    compiled,
    spawnPoints,
    validation,
  }
}

export function compilePresetMap(
  id: PresetMapId,
  catalog: VisualAssetCatalog = starterVisualAssetCatalog,
): PresetMapResult {
  const preset = presetMapDefinition(id)
  const compiled = compileSemanticMapDefinition(preset.definition, catalog)
  const spawnPoints = preset.spawnTiles.map((spawn) =>
    tileSpawnPoint(spawn.id, spawn.tile, compiled.tileSize),
  )
  const validation = validatePromptMap(compiled, spawnPoints)

  return {
    id,
    label: preset.label,
    definition: preset.definition,
    compiled,
    spawnPoints,
    validation,
  }
}

function promptToSemanticMapDefinition(
  prompt: string,
  keywords: readonly string[],
): SemanticMapDefinition {
  const seatCount = requestedSeatCount(prompt)
  const width = keywords.includes("large") || seatCount >= 10 ? 14 : 12
  const height = keywords.includes("large") || seatCount >= 10 ? 11 : 10
  const tableX = Math.floor((width - 3) / 2)
  const tableY = Math.floor((height - 2) / 2)
  const meetingZone = {
    id: "meeting-zone",
    xStart: Math.max(2, tableX - 2),
    yStart: Math.max(2, tableY - 2),
    xEnd: Math.min(width - 1, tableX + 5),
    yEnd: Math.min(height - 1, tableY + 4),
    zoneType: "meeting_private" as const,
  }

  return {
    roomDimensions: {
      width,
      height,
    },
    style: "cozy_wood",
    layers: {
      walls: perimeterWalls(
        width,
        height,
        keywords.includes("door")
          ? [{ edge: "left", offset: Math.floor(height / 2) }]
          : [],
      ),
      furniture: [
        { x: tableX, y: tableY, item: "large_conference_table" },
        ...chairPlacements(seatCount, tableX, tableY),
        ...(keywords.includes("coffee")
          ? [
              {
                x: width - (keywords.includes("bar") ? 4 : 3),
                y: 2,
                item: keywords.includes("bar")
                  ? ("coffee_bar" as const)
                  : ("coffee_machine" as const),
              },
            ]
          : []),
        ...(keywords.includes("plant")
          ? [
              { x: 2, y: 2, item: "plant_potted" as const },
              { x: width - 3, y: height - 3, item: "plant_potted" as const },
            ]
          : []),
        ...(keywords.includes("couch")
          ? [{ x: 2, y: height - 3, item: "lounge_couch" as const }]
          : []),
        ...(keywords.includes("door")
          ? [{ x: 0, y: Math.floor(height / 2), item: "door_single" as const }]
          : []),
      ],
      zones: [meetingZone],
    },
  }
}

function promptKeywords(prompt: string): readonly string[] {
  const normalized = prompt.toLowerCase()
  const keywords = new Set<string>()
  const supportedKeywords = [
    "cozy",
    "wood",
    "wooden",
    "meeting",
    "conference",
    "coffee",
    "bar",
    "plant",
    "plants",
    "couch",
    "couches",
    "sofa",
    "sofas",
    "door",
    "doors",
    "large",
  ]

  for (const keyword of supportedKeywords) {
    if (normalized.includes(keyword)) keywords.add(keyword)
  }

  const seats = requestedSeatCount(prompt)
  keywords.add(`${seats}-person`)

  if (keywords.has("conference")) keywords.add("meeting")
  if (keywords.has("wooden")) keywords.add("wood")
  if (keywords.has("bar")) keywords.add("coffee")
  if (keywords.has("plants")) keywords.add("plant")
  if (keywords.has("couches")) keywords.add("couch")
  if (keywords.has("sofa")) keywords.add("couch")
  if (keywords.has("sofas")) keywords.add("couch")
  if (keywords.has("doors")) keywords.add("door")

  return [...keywords].sort()
}

function requestedSeatCount(prompt: string): number {
  const normalized = prompt.toLowerCase()
  const match = normalized.match(/(\d+)\s*-?\s*(?:person|people|seat|seats)/)
  const requested = match ? Number(match[1]) : 6

  if (!Number.isFinite(requested)) return 6
  return Math.min(12, Math.max(2, Math.round(requested)))
}

function presetMapDefinition(id: PresetMapId): {
  readonly label: string
  readonly definition: SemanticMapDefinition
  readonly spawnTiles: readonly {
    readonly id: PromptMapSpawnPoint["id"]
    readonly tile: { readonly x: number; readonly y: number }
  }[]
} {
  switch (id) {
    case "lobby":
      return {
        label: "Lobby",
        definition: {
          roomDimensions: { width: 16, height: 10 },
          style: "modern_light",
          layers: {
            walls: perimeterWalls(16, 10, [{ edge: "bottom", offset: 2 }]),
            furniture: [
              { x: 2, y: 9, item: "door_single" },
              { x: 3, y: 3, item: "plant_potted" },
              { x: 12, y: 3, item: "plant_potted" },
              { x: 6, y: 4, item: "small_round_table" },
              { x: 5, y: 4, item: "office_chair", direction: "east" },
              { x: 8, y: 4, item: "office_chair", direction: "west" },
              { x: 11, y: 6, item: "coffee_machine" },
            ],
            zones: [
              {
                id: "lobby-zone",
                xStart: 2,
                yStart: 2,
                xEnd: 14,
                yEnd: 8,
                zoneType: "lobby",
              },
            ],
          },
        },
        spawnTiles: [
          { id: "default", tile: { x: 2, y: 7 } },
          { id: "guest", tile: { x: 6, y: 7 } },
        ],
      }
    case "meeting_room":
      return {
        label: "Meeting room",
        definition: {
          roomDimensions: { width: 14, height: 11 },
          style: "cozy_wood",
          layers: {
            walls: perimeterWalls(14, 11, [{ edge: "left", offset: 5 }]),
            furniture: [
              { x: 0, y: 5, item: "door_single" },
              { x: 5, y: 4, item: "large_conference_table" },
              ...chairPlacements(10, 5, 4),
              { x: 10, y: 2, item: "coffee_bar" },
              { x: 2, y: 2, item: "plant_potted" },
              { x: 11, y: 8, item: "plant_potted" },
            ],
            zones: [
              {
                id: "meeting-zone",
                xStart: 3,
                yStart: 2,
                xEnd: 11,
                yEnd: 8,
                zoneType: "meeting_private",
              },
            ],
          },
        },
        spawnTiles: [
          { id: "default", tile: { x: 3, y: 3 } },
          { id: "guest", tile: { x: 3, y: 6 } },
        ],
      }
    case "lounge_cafe":
      return {
        label: "Lounge/café",
        definition: {
          roomDimensions: { width: 15, height: 10 },
          style: "quiet_carpet",
          layers: {
            walls: perimeterWalls(15, 10, [{ edge: "left", offset: 6 }]),
            furniture: [
              { x: 0, y: 6, item: "door_single" },
              { x: 10, y: 2, item: "coffee_bar" },
              { x: 10, y: 6, item: "lounge_couch" },
              { x: 4, y: 3, item: "small_round_table" },
              { x: 3, y: 3, item: "office_chair", direction: "east" },
              { x: 6, y: 3, item: "office_chair", direction: "west" },
              { x: 4, y: 6, item: "small_round_table" },
              { x: 3, y: 6, item: "office_chair", direction: "east" },
              { x: 6, y: 6, item: "office_chair", direction: "west" },
              { x: 12, y: 6, item: "plant_potted" },
              { x: 2, y: 2, item: "plant_potted" },
            ],
            zones: [
              {
                id: "lounge-zone",
                xStart: 2,
                yStart: 2,
                xEnd: 13,
                yEnd: 8,
                zoneType: "quiet",
              },
            ],
          },
        },
        spawnTiles: [
          { id: "default", tile: { x: 2, y: 6 } },
          { id: "guest", tile: { x: 2, y: 5 } },
        ],
      }
  }
}

function perimeterWalls(
  width: number,
  height: number,
  openings: readonly {
    readonly edge: "top" | "bottom" | "left" | "right"
    readonly offset: number
  }[] = [],
): readonly SemanticWallPlacement[] {
  const walls: SemanticWallPlacement[] = []

  for (let x = 0; x < width; x += 1) {
    if (!hasWallOpening(openings, "top", x)) {
      walls.push({
        x,
        y: 0,
        type: x === 0 || x === width - 1 ? "corner" : "straight",
      })
    }

    if (!hasWallOpening(openings, "bottom", x)) {
      walls.push({
        x,
        y: height - 1,
        type: x === 0 || x === width - 1 ? "corner" : "straight",
      })
    }
  }

  for (let y = 1; y < height - 1; y += 1) {
    if (!hasWallOpening(openings, "left", y)) {
      walls.push({ x: 0, y, type: "straight" })
    }

    if (!hasWallOpening(openings, "right", y)) {
      walls.push({ x: width - 1, y, type: "straight" })
    }
  }

  return walls
}

function hasWallOpening(
  openings: readonly {
    readonly edge: "top" | "bottom" | "left" | "right"
    readonly offset: number
  }[],
  edge: "top" | "bottom" | "left" | "right",
  offset: number,
): boolean {
  return openings.some(
    (opening) => opening.edge === edge && opening.offset === offset,
  )
}

function chairPlacements(
  seatCount: number,
  tableX: number,
  tableY: number,
): readonly SemanticFurniturePlacement[] {
  const candidates: readonly SemanticFurniturePlacement[] = [
    { x: tableX, y: tableY - 1, item: "office_chair", direction: "south" },
    { x: tableX + 1, y: tableY - 1, item: "office_chair", direction: "south" },
    { x: tableX + 2, y: tableY - 1, item: "office_chair", direction: "south" },
    { x: tableX - 1, y: tableY - 1, item: "office_chair", direction: "south" },
    { x: tableX + 3, y: tableY - 1, item: "office_chair", direction: "south" },
    { x: tableX, y: tableY + 2, item: "office_chair", direction: "north" },
    { x: tableX + 1, y: tableY + 2, item: "office_chair", direction: "north" },
    { x: tableX + 2, y: tableY + 2, item: "office_chair", direction: "north" },
    { x: tableX - 1, y: tableY + 2, item: "office_chair", direction: "north" },
    { x: tableX + 3, y: tableY + 2, item: "office_chair", direction: "north" },
    { x: tableX - 1, y: tableY, item: "office_chair", direction: "east" },
    { x: tableX + 3, y: tableY, item: "office_chair", direction: "west" },
  ]

  return candidates.slice(0, seatCount)
}

function promptMapSpawnPoints(
  compiled: CompiledSemanticMap,
): readonly PromptMapSpawnPoint[] {
  const meetingZone = compiled.zones.find(
    (zone) => zone.zoneType === "meeting_private",
  )
  const preferredTiles = meetingZone
    ? [
        { x: meetingZone.xStart, y: meetingZone.yStart },
        { x: meetingZone.xStart, y: meetingZone.yStart + 1 },
        { x: meetingZone.xEnd - 1, y: meetingZone.yStart },
        { x: meetingZone.xStart, y: meetingZone.yEnd - 1 },
      ]
    : [
        { x: 2, y: 2 },
        { x: 2, y: 3 },
      ]
  const defaultTile = firstFreeTile(compiled, preferredTiles) ?? { x: 1, y: 1 }
  const guestTile =
    firstFreeTile(
      compiled,
      preferredTiles.filter(
        (tile) => tile.x !== defaultTile.x || tile.y !== defaultTile.y,
      ),
    ) ?? { x: defaultTile.x, y: defaultTile.y + 1 }

  return [
    tileSpawnPoint("default", defaultTile, compiled.tileSize),
    tileSpawnPoint("guest", guestTile, compiled.tileSize),
  ]
}

function firstFreeTile(
  compiled: CompiledSemanticMap,
  candidates: readonly { readonly x: number; readonly y: number }[],
): { readonly x: number; readonly y: number } | undefined {
  return candidates.find(
    (tile) =>
      tile.x >= 0 &&
      tile.y >= 0 &&
      tile.x < compiled.width &&
      tile.y < compiled.height &&
      !compiled.blockedTiles.some(
        (blockedTile) => blockedTile.x === tile.x && blockedTile.y === tile.y,
      ),
  )
}

function tileSpawnPoint(
  id: PromptMapSpawnPoint["id"],
  tile: { readonly x: number; readonly y: number },
  tileSize: number,
): PromptMapSpawnPoint {
  return {
    id,
    position: {
      x: tile.x * tileSize,
      y: tile.y * tileSize,
    },
  }
}

function validatePromptMap(
  compiled: CompiledSemanticMap,
  spawnPoints: readonly PromptMapSpawnPoint[],
): PromptMapValidation {
  const errors: string[] = []
  const blockedTileKeys = new Set<string>()

  for (const tile of compiled.blockedTiles) {
    const key = `${tile.x}:${tile.y}`

    if (blockedTileKeys.has(key)) errors.push(`Duplicate blocked tile ${key}.`)
    blockedTileKeys.add(key)

    if (
      tile.x < 0 ||
      tile.y < 0 ||
      tile.x >= compiled.width ||
      tile.y >= compiled.height
    ) {
      errors.push(`Blocked tile ${key} is outside the map.`)
    }
  }

  for (const spawn of spawnPoints) {
    const tile = {
      x: Math.floor(spawn.position.x / compiled.tileSize),
      y: Math.floor(spawn.position.y / compiled.tileSize),
    }
    const key = `${tile.x}:${tile.y}`

    if (
      tile.x < 0 ||
      tile.y < 0 ||
      tile.x >= compiled.width ||
      tile.y >= compiled.height
    ) {
      errors.push(`Spawn ${spawn.id} is outside the map.`)
    }

    if (blockedTileKeys.has(key)) {
      errors.push(`Spawn ${spawn.id} overlaps blocked tile ${key}.`)
    }
  }

  for (const zone of compiled.zones) {
    if (zone.xStart >= zone.xEnd || zone.yStart >= zone.yEnd) {
      errors.push(`Zone ${zone.id} has invalid bounds.`)
    }

    if (
      zone.xStart < 0 ||
      zone.yStart < 0 ||
      zone.xEnd > compiled.width ||
      zone.yEnd > compiled.height
    ) {
      errors.push(`Zone ${zone.id} is outside the map.`)
    }
  }

  if (compiled.blockedTiles.length === 0) errors.push("Generated map has no blocked tiles.")
  if (spawnPoints.length === 0) errors.push("Generated map has no spawn points.")
  if (compiled.zones.length === 0) errors.push("Generated map has no zones.")

  return {
    valid: errors.length === 0,
    errors,
    blockedTileCount: compiled.blockedTiles.length,
    spawnCount: spawnPoints.length,
    zoneCount: compiled.zones.length,
    spawnIds: spawnPoints.map((spawn) => spawn.id),
    zoneIds: compiled.zones.map((zone) => zone.id),
  }
}

function requireToken(
  catalog: VisualAssetCatalog,
  tokenId: string,
): VisualTokenDefinition {
  const token = catalog.tokens.find((candidate) => candidate.id === tokenId)
  if (!token) throw new Error(`Unknown visual token: ${tokenId}`)
  return token
}

function createLayer(
  name: string,
  width: number,
  height: number,
  fillGid: number,
): CompiledTileLayer {
  return {
    name,
    width,
    height,
    gids: Array.from({ length: height }, () =>
      Array.from({ length: width }, () => fillGid),
    ),
  }
}

function paintToken(
  layer: CompiledTileLayer,
  token: VisualTokenDefinition,
  x: number,
  y: number,
): void {
  ensureInsideLayer(layer, token, x, y)
  ;(layer.gids[y] as number[])[x] = token.provisionalGid
}

function addBlockedTiles(
  blockedTiles: { x: number; y: number }[],
  token: VisualTokenDefinition,
  x: number,
  y: number,
): void {
  if (!token.collidable) return

  for (let tileY = y; tileY < y + token.heightTiles; tileY += 1) {
    for (let tileX = x; tileX < x + token.widthTiles; tileX += 1) {
      blockedTiles.push({ x: tileX, y: tileY })
    }
  }
}

function ensureInsideLayer(
  layer: CompiledTileLayer,
  token: VisualTokenDefinition,
  x: number,
  y: number,
): void {
  if (
    x < 0 ||
    y < 0 ||
    x + token.widthTiles > layer.width ||
    y + token.heightTiles > layer.height
  ) {
    throw new Error(`Token ${token.id} is outside layer ${layer.name}`)
  }
}
