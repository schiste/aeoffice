import type {
  VisualAssetCatalog,
  VisualAssetFootprint,
  VisualAssetFrameMetadata,
  VisualAssetInteractionMetadata,
  VisualAssetOcclusionMode,
  VisualAssetPoint,
  VisualAssetThemeTag,
  VisualAssetVariantMetadata,
  VisualTokenDefinition,
} from "@aedventure/game-assets"

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

export type MapDefinitionInterface = SemanticMapDefinition

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
  readonly renderLayers: {
    readonly floor: CompiledTileLayer
    readonly walls: CompiledTileLayer
    readonly objects: CompiledTileLayer
  }
  readonly layers: {
    readonly floor: CompiledTileLayer
    readonly walls: CompiledTileLayer
    readonly objects: CompiledTileLayer
  }
  readonly collisionLayers: {
    readonly movement: CompiledCollisionLayer
  }
  readonly blockedTiles: readonly { readonly x: number; readonly y: number }[]
  readonly zones: readonly SemanticZoneDefinition[]
  readonly referencedTokenIds: readonly string[]
}

export interface CompiledCollisionLayer {
  readonly name: "movement"
  readonly width: number
  readonly height: number
  readonly blocked: readonly (readonly boolean[])[]
  readonly blockedTiles: readonly { readonly x: number; readonly y: number }[]
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
  readonly checks: readonly PromptMapValidationCheck[]
  readonly summary: string
  readonly blockedTileCount: number
  readonly spawnCount: number
  readonly zoneCount: number
  readonly spawnIds: readonly string[]
  readonly zoneIds: readonly string[]
}

export interface PromptMapValidationCheck {
  readonly id:
    | "collision_layer"
    | "spawn_clearance"
    | "zone_bounds"
    | "blocked_tiles"
    | "compiler_output"
  readonly status: "pass" | "fail"
  readonly message: string
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

interface InternalAtlasFrameOptions {
  readonly collisionFootprint?: VisualAssetFootprint
  readonly visualFootprint?: VisualAssetFootprint
  readonly shadowFootprint?: VisualAssetFootprint
  readonly zAnchor?: VisualAssetPoint
  readonly interaction?: VisualAssetInteractionMetadata
  readonly occlusionSplitAtY?: number
  readonly foregroundFootprint?: VisualAssetFootprint
  readonly themeTags?: readonly VisualAssetThemeTag[]
  readonly variants?: readonly VisualAssetVariantMetadata[]
}

const INTERNAL_POLISHED_SOURCE = {
  status: "target_approved" as const,
  filePath: INTERNAL_POLISHED_ATLAS_MANIFEST_PATH,
  sourceUrl: "internal://aedventure/copyleft-lpc-office-polished/v1",
  author: "LPC/OpenGameArt contributors and Aedventure project",
  license: "LicenseRef-LPC-Copyleft-Mixed",
  attributionText:
    "Generated atlas derived from bundled LPC copyleft source sheets. See apps/web/public/assets/internal-office-atlas.manifest.json and assets/ASSET_MANIFEST.md.",
  redistributionAllowed: "yes" as const,
  commercialUseAllowed: "yes" as const,
  bundledInTargetApp: true,
  notes:
    "Deterministic office atlas generated from LPC/OpenGameArt copyleft source sheets plus project-owned overlays. No SkyOffice or LimeZu assets are bundled.",
}

function internalAtlasFrame(
  frameId: string,
  widthTiles: number,
  heightTiles: number,
  collidable: boolean,
  occlusionMode: VisualAssetOcclusionMode = "none",
  options: InternalAtlasFrameOptions = {},
): VisualAssetFrameMetadata {
  const width = widthTiles * 32
  const height = heightTiles * 32
  const themeTags = options.themeTags ?? defaultThemeTags(frameId)
  const foregroundFootprint = {
    x: 0,
    y: options.occlusionSplitAtY ?? 0,
    width,
    height: height - (options.occlusionSplitAtY ?? 0),
  }

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
    collisionFootprint:
      options.collisionFootprint ??
      (collidable
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
          }),
    visualFootprint: options.visualFootprint ?? {
      x: 0,
      y: 0,
      width,
      height,
    },
    shadowFootprint: options.shadowFootprint ?? defaultShadowFootprint(frameId, width, height),
    zAnchor: options.zAnchor ?? {
      x: width / 2,
      y: height,
    },
    interaction: options.interaction ?? {
      affordance: "none",
    },
    occlusion:
      occlusionMode === "foreground"
        ? {
            mode: occlusionMode,
            splitAtY: options.occlusionSplitAtY ?? 0,
            foregroundFootprint: options.foregroundFootprint ?? foregroundFootprint,
          }
        : {
            mode: occlusionMode,
          },
    themeTags,
    variants: options.variants ?? defaultVariants(frameId, themeTags),
  }
}

function defaultShadowFootprint(
  frameId: string,
  width: number,
  height: number,
): VisualAssetFootprint {
  if (frameId.startsWith("floor.")) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  const shadowWidth = Math.max(12, Math.round(width * 0.72))
  const shadowHeight = Math.max(4, Math.round(height * 0.16))

  return {
    x: Math.round((width - shadowWidth) / 2),
    y: Math.max(0, height - shadowHeight - 2),
    width: shadowWidth,
    height: shadowHeight,
  }
}

function defaultVariants(
  frameId: string,
  themeTags: readonly VisualAssetThemeTag[],
): readonly VisualAssetVariantMetadata[] {
  const variants: VisualAssetVariantMetadata[] = [
    {
      id: `${frameId}.default`,
      label: "Default",
      role: "default",
      frameId,
      themeTags,
    },
  ]

  if (themeTags.includes("brandable")) {
    variants.push({
      id: `${frameId}.theme_tint`,
      label: "Theme tint",
      role: "theme_tint",
      frameId,
      themeTags,
    })
  }

  return variants
}

function defaultThemeTags(frameId: string): readonly VisualAssetThemeTag[] {
  if (frameId.startsWith("floor.wood") || frameId.startsWith("wall.wood")) {
    return ["cozy_wood", "brandable"]
  }

  if (frameId.startsWith("wall.glass") || frameId.includes("concrete")) {
    return ["modern_light", "brandable"]
  }

  if (frameId.includes("neutral")) return ["neutral_office", "brandable"]
  if (frameId.includes("carpet")) return ["quiet_carpet", "brandable"]
  if (frameId.includes("conference") || frameId.includes("chair")) {
    return ["meeting", "brandable"]
  }

  if (frameId.includes("coffee")) return ["kitchen", "brandable"]
  if (frameId.includes("plant")) return ["biophilic", "brandable"]
  if (frameId.includes("door")) return ["entry", "brandable"]
  if (frameId.includes("couch")) return ["lounge", "brandable"]
  if (frameId.startsWith("avatar.")) return ["avatar", "brandable"]

  return ["neutral_office", "brandable"]
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
      asset: internalAtlasFrame("wall.wood.straight", 1, 1, true, "foreground", {
        occlusionSplitAtY: 12,
      }),
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
      asset: internalAtlasFrame("wall.wood.corner", 1, 1, true, "foreground", {
        occlusionSplitAtY: 12,
      }),
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
      asset: internalAtlasFrame("wall.glass.straight", 1, 1, true, "foreground", {
        occlusionSplitAtY: 12,
      }),
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
      asset: internalAtlasFrame("wall.glass.corner", 1, 1, true, "foreground", {
        occlusionSplitAtY: 12,
      }),
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
      asset: internalAtlasFrame("wall.neutral.straight", 1, 1, true, "foreground", {
        occlusionSplitAtY: 12,
      }),
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
      asset: internalAtlasFrame("wall.neutral.corner", 1, 1, true, "foreground", {
        occlusionSplitAtY: 12,
      }),
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
      asset: internalAtlasFrame("item.large_conference_table", 3, 2, true, "y_sort", {
        collisionFootprint: { x: 8, y: 18, width: 80, height: 38 },
        visualFootprint: { x: 0, y: 4, width: 96, height: 58 },
        shadowFootprint: { x: 8, y: 50, width: 80, height: 10 },
        zAnchor: { x: 48, y: 58 },
        interaction: {
          affordance: "gather",
          label: "Conference table",
          prompt: "Use meeting table",
          radiusTiles: 1.4,
          priority: 30,
        },
        themeTags: ["meeting", "cozy_wood", "brandable"],
      }),
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
      asset: internalAtlasFrame("item.small_round_table", 2, 2, true, "y_sort", {
        collisionFootprint: { x: 8, y: 18, width: 48, height: 36 },
        visualFootprint: { x: 0, y: 1, width: 64, height: 62 },
        shadowFootprint: { x: 11, y: 48, width: 42, height: 10 },
        zAnchor: { x: 32, y: 58 },
        interaction: {
          affordance: "gather",
          label: "Table",
          prompt: "Use table",
          radiusTiles: 1.1,
          priority: 28,
        },
        themeTags: ["meeting", "lounge", "brandable"],
      }),
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
      asset: internalAtlasFrame("item.office_chair", 1, 1, true, "y_sort", {
        collisionFootprint: { x: 7, y: 12, width: 18, height: 16 },
        visualFootprint: { x: 5, y: 6, width: 22, height: 22 },
        shadowFootprint: { x: 7, y: 21, width: 18, height: 5 },
        zAnchor: { x: 16, y: 28 },
        interaction: {
          affordance: "sit",
          label: "Chair",
          prompt: "Sit down",
          radiusTiles: 0.9,
          priority: 16,
        },
        themeTags: ["meeting", "brandable"],
      }),
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
      asset: internalAtlasFrame("item.coffee_machine", 1, 1, true, "y_sort", {
        collisionFootprint: { x: 9, y: 8, width: 14, height: 18 },
        visualFootprint: { x: 7, y: 5, width: 18, height: 23 },
        shadowFootprint: { x: 8, y: 23, width: 16, height: 5 },
        zAnchor: { x: 16, y: 27 },
        interaction: {
          affordance: "serve",
          label: "Coffee machine",
          prompt: "Brew coffee",
          radiusTiles: 1,
          priority: 35,
        },
        themeTags: ["kitchen", "brandable"],
      }),
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
      asset: internalAtlasFrame("item.plant_potted", 1, 1, true, "y_sort", {
        collisionFootprint: { x: 8, y: 18, width: 16, height: 10 },
        visualFootprint: { x: 5, y: 4, width: 22, height: 25 },
        shadowFootprint: { x: 7, y: 22, width: 18, height: 6 },
        zAnchor: { x: 16, y: 28 },
        interaction: {
          affordance: "decorate",
          label: "Plant",
          prompt: "Inspect plant",
          radiusTiles: 0.9,
          priority: 10,
        },
        themeTags: ["biophilic", "brandable"],
      }),
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
      asset: internalAtlasFrame("item.coffee_bar", 2, 1, true, "y_sort", {
        collisionFootprint: { x: 4, y: 10, width: 56, height: 18 },
        visualFootprint: { x: 0, y: 6, width: 64, height: 24 },
        shadowFootprint: { x: 6, y: 23, width: 52, height: 6 },
        zAnchor: { x: 32, y: 29 },
        interaction: {
          affordance: "serve",
          label: "Coffee bar",
          prompt: "Use coffee bar",
          radiusTiles: 1.35,
          priority: 36,
        },
        themeTags: ["kitchen", "lounge", "brandable"],
      }),
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
      asset: internalAtlasFrame("item.door_single", 1, 1, false, "y_sort", {
        visualFootprint: { x: 7, y: 4, width: 18, height: 24 },
        shadowFootprint: { x: 6, y: 25, width: 20, height: 5 },
        zAnchor: { x: 16, y: 29 },
        interaction: {
          affordance: "open",
          label: "Door",
          prompt: "Open door",
          radiusTiles: 1,
          priority: 55,
        },
        themeTags: ["entry", "brandable"],
      }),
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
      asset: internalAtlasFrame("item.lounge_couch", 2, 1, true, "y_sort", {
        collisionFootprint: { x: 3, y: 11, width: 58, height: 16 },
        visualFootprint: { x: 0, y: 7, width: 64, height: 22 },
        shadowFootprint: { x: 4, y: 22, width: 56, height: 6 },
        zAnchor: { x: 32, y: 28 },
        interaction: {
          affordance: "sit",
          label: "Couch",
          prompt: "Sit on couch",
          radiusTiles: 1.25,
          priority: 20,
        },
        themeTags: ["lounge", "quiet_carpet", "brandable"],
      }),
      tags: ["lounge", "couch", "sofa", "office"],
    },
    {
      id: "item.modular_work_desk",
      kind: "item",
      layer: "object",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 310,
      widthTiles: 2,
      heightTiles: 1,
      collidable: true,
      asset: internalAtlasFrame("item.modular_work_desk", 2, 1, true, "y_sort", {
        collisionFootprint: { x: 4, y: 10, width: 56, height: 18 },
        visualFootprint: { x: 0, y: 5, width: 64, height: 25 },
        shadowFootprint: { x: 6, y: 23, width: 52, height: 7 },
        zAnchor: { x: 32, y: 29 },
        interaction: {
          affordance: "gather",
          label: "Work desk",
          prompt: "Use desk",
          radiusTiles: 1.15,
          priority: 26,
        },
        themeTags: ["meeting", "neutral_office", "brandable"],
      }),
      tags: ["desk", "workstation", "meeting", "office"],
    },
    {
      id: "item.whiteboard_wall",
      kind: "item",
      layer: "object",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 311,
      widthTiles: 2,
      heightTiles: 1,
      collidable: true,
      asset: internalAtlasFrame("item.whiteboard_wall", 2, 1, true, "y_sort", {
        collisionFootprint: { x: 3, y: 6, width: 58, height: 22 },
        visualFootprint: { x: 2, y: 2, width: 60, height: 26 },
        shadowFootprint: { x: 6, y: 25, width: 52, height: 5 },
        zAnchor: { x: 32, y: 30 },
        interaction: {
          affordance: "inspect",
          label: "Whiteboard",
          prompt: "Use whiteboard",
          radiusTiles: 1.2,
          priority: 32,
        },
        themeTags: ["meeting", "modern_light", "brandable"],
      }),
      tags: ["meeting", "whiteboard", "presentation", "office"],
    },
    {
      id: "item.armchair_lounge",
      kind: "item",
      layer: "object",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 312,
      widthTiles: 1,
      heightTiles: 1,
      collidable: true,
      asset: internalAtlasFrame("item.armchair_lounge", 1, 1, true, "y_sort", {
        collisionFootprint: { x: 6, y: 11, width: 20, height: 17 },
        visualFootprint: { x: 3, y: 5, width: 26, height: 24 },
        shadowFootprint: { x: 6, y: 24, width: 20, height: 5 },
        zAnchor: { x: 16, y: 29 },
        interaction: {
          affordance: "sit",
          label: "Armchair",
          prompt: "Sit in armchair",
          radiusTiles: 1,
          priority: 21,
        },
        themeTags: ["lounge", "quiet_carpet", "brandable"],
      }),
      tags: ["lounge", "chair", "armchair", "office"],
    },
    {
      id: "item.bookshelf_low",
      kind: "item",
      layer: "object",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 313,
      widthTiles: 2,
      heightTiles: 1,
      collidable: true,
      asset: internalAtlasFrame("item.bookshelf_low", 2, 1, true, "y_sort", {
        collisionFootprint: { x: 3, y: 8, width: 58, height: 20 },
        visualFootprint: { x: 0, y: 2, width: 64, height: 27 },
        shadowFootprint: { x: 5, y: 24, width: 54, height: 6 },
        zAnchor: { x: 32, y: 29 },
        interaction: {
          affordance: "inspect",
          label: "Bookshelf",
          prompt: "Browse shelf",
          radiusTiles: 1,
          priority: 14,
        },
        themeTags: ["lounge", "neutral_office", "brandable"],
      }),
      tags: ["lounge", "bookshelf", "storage", "office"],
    },
    {
      id: "item.floor_lamp",
      kind: "item",
      layer: "object",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 314,
      widthTiles: 1,
      heightTiles: 1,
      collidable: true,
      asset: internalAtlasFrame("item.floor_lamp", 1, 1, true, "y_sort", {
        collisionFootprint: { x: 12, y: 20, width: 8, height: 8 },
        visualFootprint: { x: 9, y: 2, width: 14, height: 27 },
        shadowFootprint: { x: 9, y: 25, width: 14, height: 5 },
        zAnchor: { x: 16, y: 29 },
        interaction: {
          affordance: "inspect",
          label: "Floor lamp",
          prompt: "Adjust lamp",
          radiusTiles: 0.9,
          priority: 12,
        },
        themeTags: ["lounge", "neutral_office", "brandable"],
      }),
      tags: ["lounge", "lamp", "lighting", "office"],
    },
    {
      id: "item.side_table",
      kind: "item",
      layer: "object",
      sourceId: INTERNAL_POLISHED_SOURCE_ID,
      tilesetId: INTERNAL_POLISHED_TILESET_ID,
      provisionalGid: 315,
      widthTiles: 1,
      heightTiles: 1,
      collidable: true,
      asset: internalAtlasFrame("item.side_table", 1, 1, true, "y_sort", {
        collisionFootprint: { x: 6, y: 12, width: 20, height: 14 },
        visualFootprint: { x: 4, y: 8, width: 24, height: 20 },
        shadowFootprint: { x: 6, y: 24, width: 20, height: 5 },
        zAnchor: { x: 16, y: 28 },
        interaction: {
          affordance: "inspect",
          label: "Side table",
          prompt: "Use side table",
          radiusTiles: 0.9,
          priority: 15,
        },
        themeTags: ["lounge", "cozy_wood", "brandable"],
      }),
      tags: ["lounge", "table", "side-table", "office"],
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
      asset: internalAtlasFrame("avatar.local_placeholder", 1, 1, false, "none", {
        visualFootprint: { x: 7, y: 1, width: 18, height: 28 },
        zAnchor: { x: 16, y: 28 },
      }),
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
      asset: internalAtlasFrame("avatar.ember", 1, 1, false, "none", {
        visualFootprint: { x: 7, y: 1, width: 18, height: 28 },
        zAnchor: { x: 16, y: 28 },
      }),
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
      asset: internalAtlasFrame("avatar.cobalt", 1, 1, false, "none", {
        visualFootprint: { x: 7, y: 1, width: 18, height: 28 },
        zAnchor: { x: 16, y: 28 },
      }),
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
      asset: internalAtlasFrame("avatar.moss", 1, 1, false, "none", {
        visualFootprint: { x: 7, y: 1, width: 18, height: 28 },
        zAnchor: { x: 16, y: 28 },
      }),
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
      asset: internalAtlasFrame("avatar.violet", 1, 1, false, "none", {
        visualFootprint: { x: 7, y: 1, width: 18, height: 28 },
        zAnchor: { x: 16, y: 28 },
      }),
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
    renderLayers: {
      floor,
      walls,
      objects,
    },
    layers: {
      floor,
      walls,
      objects,
    },
    collisionLayers: {
      movement: createMovementCollisionLayer(width, height, blockedTiles),
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
  const style = promptStyle(keywords)
  const wantsLounge = keywords.includes("couch") || keywords.includes("lounge")
  const wantsDesk =
    keywords.includes("desk") ||
    keywords.includes("workspace") ||
    keywords.includes("workstation")
  const wantsBooks = keywords.includes("bookshelf") || keywords.includes("library")
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
    style,
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
        { x: 2, y: 1, item: "whiteboard_wall" as const },
        { x: width - 4, y: height - 3, item: "side_table" as const },
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
        ...(keywords.includes("plant") || !wantsLounge
          ? [
              { x: 2, y: 2, item: "plant_potted" as const },
              { x: width - 3, y: height - 4, item: "plant_potted" as const },
            ]
          : []),
        ...(wantsLounge
          ? [
              { x: 2, y: height - 3, item: "lounge_couch" as const },
              { x: 4, y: height - 3, item: "armchair_lounge" as const },
              { x: 2, y: height - 4, item: "floor_lamp" as const },
            ]
          : []),
        ...(wantsDesk
          ? [
              {
                x: wantsLounge ? width - 6 : 2,
                y: height - 4,
                item: "modular_work_desk" as const,
              },
              {
                x: wantsLounge ? width - 4 : 4,
                y: height - 4,
                item: "office_chair" as const,
              },
            ]
          : []),
        ...(wantsBooks
          ? [{ x: width - 5, y: 1, item: "bookshelf_low" as const }]
          : []),
        ...(keywords.includes("door")
          ? [{ x: 0, y: Math.floor(height / 2), item: "door_single" as const }]
          : []),
      ],
      zones: [meetingZone],
    },
  }
}

function promptStyle(keywords: readonly string[]): string {
  if (keywords.includes("quiet") || keywords.includes("lounge")) return "quiet_carpet"
  if (keywords.includes("modern") || keywords.includes("glass")) return "modern_light"
  if (keywords.includes("neutral")) return "neutral_office"
  return "cozy_wood"
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
    "lounge",
    "quiet",
    "modern",
    "glass",
    "neutral",
    "desk",
    "desks",
    "workspace",
    "workstation",
    "whiteboard",
    "bookshelf",
    "library",
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
  if (keywords.has("desks")) keywords.add("desk")
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
              { x: 10, y: 2, item: "bookshelf_low" },
              { x: 13, y: 6, item: "floor_lamp" },
              { x: 6, y: 4, item: "small_round_table" },
              { x: 5, y: 4, item: "office_chair", direction: "east" },
              { x: 8, y: 4, item: "office_chair", direction: "west" },
              { x: 5, y: 6, item: "modular_work_desk" },
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
              { x: 2, y: 1, item: "whiteboard_wall" },
              { x: 5, y: 4, item: "large_conference_table" },
              ...chairPlacements(10, 5, 4),
              { x: 10, y: 2, item: "coffee_bar" },
              { x: 10, y: 8, item: "side_table" },
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
              { x: 2, y: 7, item: "bookshelf_low" },
              { x: 13, y: 3, item: "floor_lamp" },
              { x: 10, y: 6, item: "lounge_couch" },
              { x: 12, y: 5, item: "armchair_lounge" },
              { x: 9, y: 5, item: "side_table" },
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
        type:
          x === 0 ||
          x === width - 1 ||
          hasWallOpening(openings, "top", x - 1) ||
          hasWallOpening(openings, "top", x + 1)
            ? "corner"
            : "straight",
      })
    }

    if (!hasWallOpening(openings, "bottom", x)) {
      walls.push({
        x,
        y: height - 1,
        type:
          x === 0 ||
          x === width - 1 ||
          hasWallOpening(openings, "bottom", x - 1) ||
          hasWallOpening(openings, "bottom", x + 1)
            ? "corner"
            : "straight",
      })
    }
  }

  for (let y = 1; y < height - 1; y += 1) {
    if (!hasWallOpening(openings, "left", y)) {
      walls.push({
        x: 0,
        y,
        type:
          hasWallOpening(openings, "left", y - 1) ||
          hasWallOpening(openings, "left", y + 1)
            ? "corner"
            : "straight",
      })
    }

    if (!hasWallOpening(openings, "right", y)) {
      walls.push({
        x: width - 1,
        y,
        type:
          hasWallOpening(openings, "right", y - 1) ||
          hasWallOpening(openings, "right", y + 1)
            ? "corner"
            : "straight",
      })
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
  const checks: PromptMapValidationCheck[] = []
  const blockedTileKeys = new Set<string>()
  const fail = (id: PromptMapValidationCheck["id"], message: string) => {
    errors.push(message)
    checks.push({ id, status: "fail", message })
  }
  const pass = (id: PromptMapValidationCheck["id"], message: string) => {
    checks.push({ id, status: "pass", message })
  }

  for (const tile of compiled.blockedTiles) {
    const key = `${tile.x}:${tile.y}`

    if (blockedTileKeys.has(key)) {
      fail("blocked_tiles", `Duplicate blocked tile ${key}.`)
    }
    blockedTileKeys.add(key)

    if (
      tile.x < 0 ||
      tile.y < 0 ||
      tile.x >= compiled.width ||
      tile.y >= compiled.height
    ) {
      fail("blocked_tiles", `Blocked tile ${key} is outside the map.`)
    }
  }

  if (blockedTileKeys.size === compiled.blockedTiles.length) {
    pass(
      "blocked_tiles",
      `${compiled.blockedTiles.length} blocked movement tiles are unique and in bounds.`,
    )
  }

  const collisionBlockedCount = compiled.collisionLayers.movement.blocked.reduce(
    (total, row) =>
      total + row.reduce((rowTotal, blocked) => rowTotal + (blocked ? 1 : 0), 0),
    0,
  )
  if (
    compiled.collisionLayers.movement.width !== compiled.width ||
    compiled.collisionLayers.movement.height !== compiled.height ||
    collisionBlockedCount !== blockedTileKeys.size
  ) {
    fail(
      "collision_layer",
      "Movement collision layer does not match compiled blocked tiles.",
    )
  } else {
    pass(
      "collision_layer",
      `Movement collision layer matches ${collisionBlockedCount} blocked tiles.`,
    )
  }

  if (
    compiled.renderLayers.floor.width === compiled.width &&
    compiled.renderLayers.walls.width === compiled.width &&
    compiled.renderLayers.objects.width === compiled.width &&
    compiled.renderLayers.floor.height === compiled.height &&
    compiled.renderLayers.walls.height === compiled.height &&
    compiled.renderLayers.objects.height === compiled.height
  ) {
    pass(
      "compiler_output",
      "Compiler emitted renderer-agnostic render layers, collision layer, and zones.",
    )
  } else {
    fail(
      "compiler_output",
      "Compiled render layer dimensions do not match the map dimensions.",
    )
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
      fail("spawn_clearance", `Spawn ${spawn.id} is outside the map.`)
    }

    if (blockedTileKeys.has(key)) {
      fail("spawn_clearance", `Spawn ${spawn.id} overlaps blocked tile ${key}.`)
    }
  }
  if (
    spawnPoints.length > 0 &&
    !checks.some(
      (check) => check.id === "spawn_clearance" && check.status === "fail",
    )
  ) {
    pass(
      "spawn_clearance",
      `${spawnPoints.length} entry spots are clear and inside the room.`,
    )
  }

  for (const zone of compiled.zones) {
    if (zone.xStart >= zone.xEnd || zone.yStart >= zone.yEnd) {
      fail("zone_bounds", `Zone ${zone.id} has invalid bounds.`)
    }

    if (
      zone.xStart < 0 ||
      zone.yStart < 0 ||
      zone.xEnd > compiled.width ||
      zone.yEnd > compiled.height
    ) {
      fail("zone_bounds", `Zone ${zone.id} is outside the map.`)
    }
  }
  if (
    compiled.zones.length > 0 &&
    !checks.some((check) => check.id === "zone_bounds" && check.status === "fail")
  ) {
    pass(
      "zone_bounds",
      `${compiled.zones.length} interaction zones are inside the room bounds.`,
    )
  }

  if (compiled.blockedTiles.length === 0) {
    fail("blocked_tiles", "Generated map has no blocked tiles.")
  }
  if (spawnPoints.length === 0) {
    fail("spawn_clearance", "Generated map has no spawn points.")
  }
  if (compiled.zones.length === 0) {
    fail("zone_bounds", "Generated map has no zones.")
  }

  return {
    valid: errors.length === 0,
    errors,
    checks,
    summary:
      errors.length === 0
        ? "Map preflight passed: render layers, movement collision, spawn points, and zones are consistent."
        : `Map preflight failed: ${errors.join(" ")}`,
    blockedTileCount: compiled.blockedTiles.length,
    spawnCount: spawnPoints.length,
    zoneCount: compiled.zones.length,
    spawnIds: spawnPoints.map((spawn) => spawn.id),
    zoneIds: compiled.zones.map((zone) => zone.id),
  }
}

function createMovementCollisionLayer(
  width: number,
  height: number,
  blockedTiles: readonly { readonly x: number; readonly y: number }[],
): CompiledCollisionLayer {
  const blocked = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => false),
  )

  for (const tile of blockedTiles) {
    if (tile.x < 0 || tile.y < 0 || tile.x >= width || tile.y >= height) {
      continue
    }

    blocked[tile.y][tile.x] = true
  }

  return {
    name: "movement",
    width,
    height,
    blocked,
    blockedTiles,
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
