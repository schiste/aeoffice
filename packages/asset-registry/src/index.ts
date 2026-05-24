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

export const starterVisualAssetCatalog: VisualAssetCatalog = {
  version: 1,
  tileSize: 32,
  sources: [
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
      sourceId: "legacy.skyoffice.tileset.modern_office",
      tilesetId: "tileset.modern_office.reference",
      provisionalGid: 12,
      widthTiles: 1,
      heightTiles: 1,
      collidable: false,
      tags: ["cozy_wood", "office", "floor"],
    },
    {
      id: "wall.wood.straight",
      kind: "wall",
      layer: "wall",
      sourceId: "legacy.skyoffice.tileset.modern_office",
      tilesetId: "tileset.modern_office.reference",
      provisionalGid: 45,
      widthTiles: 1,
      heightTiles: 1,
      collidable: true,
      tags: ["cozy_wood", "wall"],
    },
    {
      id: "wall.wood.corner",
      kind: "wall",
      layer: "wall",
      sourceId: "legacy.skyoffice.tileset.modern_office",
      tilesetId: "tileset.modern_office.reference",
      provisionalGid: 46,
      widthTiles: 1,
      heightTiles: 1,
      collidable: true,
      tags: ["cozy_wood", "wall", "corner"],
    },
    {
      id: "item.large_conference_table",
      kind: "item",
      layer: "object",
      sourceId: "legacy.skyoffice.tileset.modern_office",
      tilesetId: "tileset.modern_office.reference",
      provisionalGid: 201,
      widthTiles: 3,
      heightTiles: 2,
      collidable: true,
      tags: ["meeting", "table", "office"],
    },
    {
      id: "item.office_chair",
      kind: "item",
      layer: "object",
      sourceId: "legacy.skyoffice.tileset.modern_office",
      tilesetId: "tileset.modern_office.reference",
      provisionalGid: 160,
      widthTiles: 1,
      heightTiles: 1,
      collidable: true,
      tags: ["meeting", "chair", "office"],
    },
    {
      id: "item.coffee_machine",
      kind: "item",
      layer: "object",
      sourceId: "legacy.skyoffice.tileset.generic",
      tilesetId: "tileset.generic.reference",
      provisionalGid: 305,
      widthTiles: 1,
      heightTiles: 1,
      collidable: true,
      tags: ["kitchen", "coffee", "office"],
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
  ],
}

export function validateVisualAssetCatalog(
  catalog: VisualAssetCatalog,
): readonly string[] {
  const errors: string[] = []
  const sourceIds = new Set<string>()
  const tilesetIds = new Set<string>()
  const tokenIds = new Set<string>()
  const styleIds = new Set<string>()

  for (const source of catalog.sources) {
    if (sourceIds.has(source.id)) {
      errors.push(`Duplicate source id: ${source.id}`)
    }
    sourceIds.add(source.id)

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
