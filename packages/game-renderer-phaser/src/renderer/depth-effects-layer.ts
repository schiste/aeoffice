import Phaser from "phaser"

import { ZONE_DEPTH } from "./constants"
import type {
  RendererDepthEffectsInfo,
  RendererDepthInfo,
  RendererDepthObjectInfo,
  RendererDepthPlacementBounds,
  RendererZoneInfo,
} from "./types"

interface DepthEffectsMapOptions {
  readonly objects: readonly RendererDepthObjectInfo[]
  readonly zones: readonly RendererZoneInfo[]
  readonly mapBounds: {
    readonly width: number
    readonly height: number
  }
}

const PRIVATE_FOG_COLOR = 0x2b2443
const PRIVATE_FOG_ALPHA = 0.1
const PRIVATE_FOG_STROKE_ALPHA = 0.24

export class DepthEffectsLayer {
  private fogGraphics?: Phaser.GameObjects.Graphics
  private maskGraphics?: Phaser.GameObjects.Graphics
  private geometryMask?: Phaser.Display.Masks.GeometryMask
  private mapObjects: readonly RendererDepthObjectInfo[] = []
  private mapZones: readonly RendererZoneInfo[] = []
  private info: RendererDepthEffectsInfo = emptyDepthEffectsInfo()

  constructor(private readonly scene: Phaser.Scene) {}

  renderMap(options: DepthEffectsMapOptions): void {
    this.clear()
    this.mapObjects = options.objects
    this.mapZones = options.zones
    this.drawPrivateZoneFog(options)
    this.info = this.infoForDepth(undefined)
  }

  updateDepthInfo(depthInfo: RendererDepthInfo): readonly string[] {
    this.info = this.infoForDepth(depthInfo)
    return this.info.labels.occludedPlayerIds
  }

  clear(): void {
    this.geometryMask?.destroy()
    this.fogGraphics?.destroy()
    this.maskGraphics?.destroy()
    this.geometryMask = undefined
    this.fogGraphics = undefined
    this.maskGraphics = undefined
    this.mapObjects = []
    this.mapZones = []
    this.info = emptyDepthEffectsInfo()
  }

  getInfo(): RendererDepthEffectsInfo {
    return this.info
  }

  private drawPrivateZoneFog(options: DepthEffectsMapOptions): void {
    const privateZones = privateMaskZones(options.zones)
    const maskZones = privateZones.length > 0 ? privateZones : options.zones

    if (maskZones.length === 0) return

    this.maskGraphics = this.scene.make.graphics(undefined, false)
    this.maskGraphics.fillStyle(0xffffff, 1)
    maskZones.forEach((zone) => {
      this.maskGraphics?.fillRoundedRect(
        zone.bounds.x,
        zone.bounds.y,
        zone.bounds.width,
        zone.bounds.height,
        8,
      )
    })
    this.geometryMask = this.maskGraphics.createGeometryMask()

    this.fogGraphics = this.scene.add.graphics()
    this.fogGraphics.setDepth(ZONE_DEPTH + 1)
    this.fogGraphics.setBlendMode(Phaser.BlendModes.MULTIPLY)
    this.fogGraphics.fillStyle(
      PRIVATE_FOG_COLOR,
      privateZones.length > 0 ? PRIVATE_FOG_ALPHA : 0.035,
    )
    this.fogGraphics.fillRect(
      0,
      0,
      options.mapBounds.width,
      options.mapBounds.height,
    )
    this.fogGraphics.setMask(this.geometryMask)

    privateZones.forEach((zone) => {
      this.fogGraphics?.lineStyle(2, 0x755aa5, PRIVATE_FOG_STROKE_ALPHA)
      this.fogGraphics?.strokeRoundedRect(
        zone.bounds.x + 3,
        zone.bounds.y + 3,
        Math.max(0, zone.bounds.width - 6),
        Math.max(0, zone.bounds.height - 6),
        7,
      )
    })
  }

  private infoForDepth(
    depthInfo: RendererDepthInfo | undefined,
  ): RendererDepthEffectsInfo {
    const foregroundObjects = this.mapObjects.filter(
      (object) => object.layer === "wall_foreground" ||
        object.occlusionMode === "foreground",
    )
    const glassForegroundCount = foregroundObjects.filter((object) =>
      isGlassForeground(object),
    ).length
    const transparentForegroundCount = glassForegroundCount
    const privateZoneCount = privateMaskZones(this.mapZones).length
    const occludedPlayerIds = depthInfo
      ? foregroundLabelOcclusions(depthInfo.players, foregroundObjects)
      : []

    return {
      source: "phaser_depth_effects",
      authority: "visual_only",
      enabled: true,
      features: [
        "geometry_masks",
        "foreground_blend_modes",
        "glass_transparency",
        "zone_fog_masks",
        "label_occlusion",
      ],
      masks: {
        geometryMaskCount: this.geometryMask ? 1 : 0,
        privateZoneMaskCount: privateZoneCount,
        zoneFogMaskCount: this.fogGraphics ? 1 : 0,
        labelMaskCount: foregroundObjects.length > 0 ? 1 : 0,
      },
      blendModes: {
        foregroundSpriteCount: foregroundObjects.length,
        glassForegroundCount,
        transparentForegroundCount,
        appliedBlendModes: appliedBlendModes(
          foregroundObjects.length,
          glassForegroundCount,
        ),
      },
      fog: {
        privateZoneCount,
        activeFogOverlayCount: this.fogGraphics ? 1 : 0,
        blendMode: "multiply",
      },
      labels: {
        occlusionCandidateCount: occludedPlayerIds.length,
        foregroundOccluderCount: foregroundObjects.length,
        occludedPlayerIds,
        policy: "local_visible_remote_foreground_labels_dimmed",
      },
    }
  }
}

function emptyDepthEffectsInfo(): RendererDepthEffectsInfo {
  return {
    source: "phaser_depth_effects",
    authority: "visual_only",
    enabled: true,
    features: [
      "geometry_masks",
      "foreground_blend_modes",
      "glass_transparency",
      "zone_fog_masks",
      "label_occlusion",
    ],
    masks: {
      geometryMaskCount: 0,
      privateZoneMaskCount: 0,
      zoneFogMaskCount: 0,
      labelMaskCount: 0,
    },
    blendModes: {
      foregroundSpriteCount: 0,
      glassForegroundCount: 0,
      transparentForegroundCount: 0,
      appliedBlendModes: [],
    },
    fog: {
      privateZoneCount: 0,
      activeFogOverlayCount: 0,
      blendMode: "multiply",
    },
    labels: {
      occlusionCandidateCount: 0,
      foregroundOccluderCount: 0,
      occludedPlayerIds: [],
      policy: "local_visible_remote_foreground_labels_dimmed",
    },
  }
}

function privateMaskZones(
  zones: readonly RendererZoneInfo[],
): readonly RendererZoneInfo[] {
  return zones.filter((zone) => {
    const raw = `${zone.zoneType} ${zone.id}`.toLowerCase()

    return zone.kind === "private" || raw.includes("private")
  })
}

function foregroundLabelOcclusions(
  players: readonly RendererDepthInfo["players"][number][],
  foregroundObjects: readonly RendererDepthObjectInfo[],
): readonly string[] {
  return players
    .filter((player) => {
      if (player.local || !player.labelVisible) return false

      return foregroundObjects.some((object) =>
        rectangleOverlaps(player.labelBounds, object.bounds, 3),
      )
    })
    .map((player) => player.playerId)
}

function rectangleOverlaps(
  first: RendererDepthPlacementBounds,
  second: RendererDepthPlacementBounds,
  padding: number,
): boolean {
  return !(
    first.x + first.width + padding < second.x ||
    second.x + second.width + padding < first.x ||
    first.y + first.height + padding < second.y ||
    second.y + second.height + padding < first.y
  )
}

function isGlassForeground(object: RendererDepthObjectInfo): boolean {
  return object.tokenId.toLowerCase().includes("glass")
}

function appliedBlendModes(
  foregroundCount: number,
  glassForegroundCount: number,
): readonly ("normal" | "screen" | "multiply")[] {
  const modes: ("normal" | "screen" | "multiply")[] = []

  if (foregroundCount > 0) modes.push("normal")
  if (glassForegroundCount > 0) modes.push("screen")

  return modes
}
