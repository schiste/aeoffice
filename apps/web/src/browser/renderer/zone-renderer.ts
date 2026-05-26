import Phaser from "phaser"

import { ZONE_DEPTH, ZONE_LABEL_DEPTH } from "./constants"
import { clamp, roundTo } from "./math"
import type {
  FixtureZone,
  RendererZoneAction,
  RendererZoneAvailability,
  RendererZoneBounds,
  RendererZoneFeedback,
  RendererZoneInfo,
  RendererZoneInteractionState,
  RendererZoneKind,
  RendererZonePresentationInfo,
} from "./types"

interface ZoneLabelView {
  readonly zoneId: string
  readonly text: Phaser.GameObjects.Text
  readonly back: Phaser.GameObjects.Rectangle
}

interface ZoneMarkerView {
  readonly zoneId: string
  readonly container: Phaser.GameObjects.Container
}

const LABEL_SCREEN_SCALE_MIN = 0.72
const LABEL_SCREEN_SCALE_MAX = 1.18

export class ZoneRenderer {
  private zoneGraphics?: Phaser.GameObjects.Graphics
  private debugGraphics?: Phaser.GameObjects.Graphics
  private zoneLabels: ZoneLabelView[] = []
  private actionMarkers: ZoneMarkerView[] = []
  private zones: readonly FixtureZone[] = []
  private activeZoneIds = new Set<string>()
  private availableActionZoneIds = new Set<string>()
  private joinedZoneIds = new Set<string>()
  private hoveredZoneId?: string
  private debugOverlayEnabled = zoneDebugEnabled()
  private tileSize = 32

  constructor(private readonly scene: Phaser.Scene) {}

  bindPointerInput(): void {
    this.scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.setHoveredZoneId(this.zoneIdAt(pointer.worldX, pointer.worldY))
    })
    this.scene.input.on("pointerout", () => {
      this.setHoveredZoneId(undefined)
    })
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, () => {
      this.updateZoomScaledElements()
    })
  }

  reset(zones: readonly FixtureZone[], tileSize: number): void {
    this.clear()
    this.zones = zones
    this.tileSize = tileSize
    this.hoveredZoneId = undefined
    this.redrawZones()
  }

  setActiveZones(zoneIds: readonly string[]): void {
    this.setInteractionState({
      activeZoneIds: zoneIds,
      availableActionZoneIds: zoneIds.filter((zoneId) =>
        this.isActionZone(zoneId),
      ),
    })
  }

  setInteractionState(state: RendererZoneInteractionState): void {
    this.activeZoneIds = new Set(state.activeZoneIds)
    this.availableActionZoneIds = new Set(state.availableActionZoneIds ?? [])
    this.joinedZoneIds = new Set(state.joinedZoneIds ?? [])
    this.redrawZones()
  }

  setDebugOverlayEnabled(enabled: boolean): void {
    this.debugOverlayEnabled = enabled
    this.redrawZones()
  }

  clear(): void {
    this.destroyDisplayObjects()
  }

  getZoneInfo(): RendererZonePresentationInfo {
    return {
      source: "compiled_map",
      zoneCount: this.zones.length,
      hoveredZoneId: this.hoveredZoneId,
      activeZoneIds: [...this.activeZoneIds],
      availableActionZoneIds: [...this.availableActionZoneIds],
      joinedZoneIds: [...this.joinedZoneIds],
      debugOverlayEnabled: this.debugOverlayEnabled,
      zones: this.zones.map((zone) => this.zoneInfo(zone)),
    }
  }

  private redrawZones(): void {
    this.destroyDisplayObjects()
    this.zoneGraphics = this.scene.add.graphics()
    this.zoneGraphics.setDepth(ZONE_DEPTH)
    if (this.debugOverlayEnabled) {
      this.debugGraphics = this.scene.add.graphics()
      this.debugGraphics.setDepth(ZONE_LABEL_DEPTH + 5)
    }

    this.zones.forEach((zone) => this.drawZone(zone))
    this.updateZoomScaledElements()
  }

  private destroyDisplayObjects(): void {
    this.zoneGraphics?.destroy()
    this.debugGraphics?.destroy()
    this.zoneLabels.forEach((label) => {
      label.text.destroy()
      label.back.destroy()
    })
    this.actionMarkers.forEach((marker) => marker.container.destroy(true))
    this.zoneGraphics = undefined
    this.debugGraphics = undefined
    this.zoneLabels = []
    this.actionMarkers = []
  }

  private drawZone(zone: FixtureZone): void {
    const info = this.zoneInfo(zone)
    const style = zoneStyle(info.kind)
    const graphics = this.zoneGraphics

    if (!graphics) return

    graphics.fillStyle(style.color, zoneFillAlpha(info.availability))
    graphics.fillRoundedRect(
      info.bounds.x,
      info.bounds.y,
      info.bounds.width,
      info.bounds.height,
      6,
    )
    graphics.lineStyle(
      zoneLineWidth(info.availability),
      style.color,
      zoneLineAlpha(info.availability),
    )
    graphics.strokeRoundedRect(
      info.bounds.x,
      info.bounds.y,
      info.bounds.width,
      info.bounds.height,
      6,
    )
    this.drawCornerTicks(info.bounds, style.color, info.availability)
    if (info.kind === "private") {
      this.drawPrivateAreaFeedback(info.bounds, style.color, info.feedback)
    }
    if (info.kind === "portal") {
      this.drawPortalThreshold(info.bounds, style.color, info.availability)
    }

    if (info.active || info.hovered || info.availability === "joined") {
      graphics.lineStyle(9, style.color, info.availability === "joined" ? 0.22 : 0.14)
      graphics.strokeRoundedRect(
        info.bounds.x - 4,
        info.bounds.y - 4,
        info.bounds.width + 8,
        info.bounds.height + 8,
        8,
      )
    }

    if (info.labelVisible) {
      this.createZoneLabel(info, style)
    }
    if (info.markerVisible) {
      this.createActionMarker(info, style)
    }
    if (this.debugOverlayEnabled) {
      this.drawDebugBounds(info)
    }
  }

  private drawCornerTicks(
    bounds: RendererZoneBounds,
    color: number,
    availability: RendererZoneAvailability,
  ): void {
    const graphics = this.zoneGraphics
    if (!graphics) return

    const tick = clamp(Math.min(bounds.width, bounds.height) * 0.16, 10, 24)
    graphics.lineStyle(
      availability === "passive" ? 2 : 3,
      color,
      availability === "passive" ? 0.42 : 0.82,
    )
    graphics.beginPath()
    graphics.moveTo(bounds.x, bounds.y + tick)
    graphics.lineTo(bounds.x, bounds.y)
    graphics.lineTo(bounds.x + tick, bounds.y)
    graphics.moveTo(bounds.x + bounds.width - tick, bounds.y)
    graphics.lineTo(bounds.x + bounds.width, bounds.y)
    graphics.lineTo(bounds.x + bounds.width, bounds.y + tick)
    graphics.moveTo(bounds.x, bounds.y + bounds.height - tick)
    graphics.lineTo(bounds.x, bounds.y + bounds.height)
    graphics.lineTo(bounds.x + tick, bounds.y + bounds.height)
    graphics.moveTo(bounds.x + bounds.width - tick, bounds.y + bounds.height)
    graphics.lineTo(bounds.x + bounds.width, bounds.y + bounds.height)
    graphics.lineTo(bounds.x + bounds.width, bounds.y + bounds.height - tick)
    graphics.strokePath()
  }

  private drawPrivateAreaFeedback(
    bounds: RendererZoneBounds,
    color: number,
    feedback: RendererZoneFeedback,
  ): void {
    const graphics = this.zoneGraphics
    if (!graphics) return

    const alpha = feedback === "private_access_available" ? 0.22 : 0.11
    const spacing = 14
    graphics.lineStyle(1, color, alpha)
    graphics.beginPath()
    for (let x = bounds.x - bounds.height; x < bounds.x + bounds.width; x += spacing) {
      graphics.moveTo(x, bounds.y + bounds.height)
      graphics.lineTo(x + bounds.height, bounds.y)
    }
    graphics.strokePath()

    if (feedback === "private_access_available") {
      graphics.lineStyle(4, color, 0.18)
      graphics.strokeRoundedRect(
        bounds.x + 5,
        bounds.y + 5,
        bounds.width - 10,
        bounds.height - 10,
        5,
      )
    }
  }

  private drawPortalThreshold(
    bounds: RendererZoneBounds,
    color: number,
    availability: RendererZoneAvailability,
  ): void {
    const graphics = this.zoneGraphics
    if (!graphics) return

    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    const alpha = availability === "available" ? 0.84 : 0.42
    const width = clamp(bounds.width * 0.52, 18, 44)
    const height = clamp(bounds.height * 0.62, 18, 44)

    graphics.lineStyle(3, color, alpha)
    graphics.beginPath()
    graphics.moveTo(centerX - width / 2, centerY + height / 2)
    graphics.lineTo(centerX - width / 2, centerY - height / 2)
    graphics.lineTo(centerX + width / 2, centerY - height / 2)
    graphics.lineTo(centerX + width / 2, centerY + height / 2)
    graphics.strokePath()
    graphics.fillStyle(color, availability === "available" ? 0.16 : 0.08)
    graphics.fillRoundedRect(
      centerX - width / 2 + 4,
      centerY - height / 2 + 4,
      width - 8,
      height - 8,
      4,
    )
  }

  private createZoneLabel(
    info: RendererZoneInfo,
    style: ReturnType<typeof zoneStyle>,
  ): void {
    const label = this.scene.add.text(0, 0, info.label, {
      color: style.textColor,
      fontFamily: "Aptos, Segoe UI, sans-serif",
      fontSize: "9px",
      fontStyle: "800",
      align: "center",
    })
    label.setOrigin(0.5, 0.5)
    label.setDepth(ZONE_LABEL_DEPTH)
    const back = this.scene.add.rectangle(
      0,
      0,
      label.width + 12,
      17,
      0xfffdf7,
      info.active ? 0.94 : 0.82,
    )
    back.setStrokeStyle(1, style.color, info.active ? 0.7 : 0.42)
    back.setDepth(ZONE_LABEL_DEPTH - 1)
    const y = info.bounds.y + 12
    const x = clamp(
      info.bounds.x + info.bounds.width / 2,
      info.bounds.x + back.width / 2 + 7,
      info.bounds.x + info.bounds.width - back.width / 2 - 7,
    )

    label.setPosition(x, y)
    back.setPosition(x, y)
    this.zoneLabels.push({ zoneId: info.id, text: label, back })
  }

  private createActionMarker(
    info: RendererZoneInfo,
    style: ReturnType<typeof zoneStyle>,
  ): void {
    const marker = this.scene.add.container(
      info.bounds.x + info.bounds.width - 18,
      info.bounds.y + info.bounds.height / 2,
    )
    marker.setDepth(ZONE_LABEL_DEPTH + 2)
    const halo = this.scene.add.ellipse(0, 0, 28, 28, style.color, 0.14)
    const back = this.scene.add.ellipse(0, 0, 20, 20, 0xfffdf7, 0.96)
    back.setStrokeStyle(1, style.color, 0.76)
    const glyph = this.scene.add.text(0, -1, actionGlyph(info.availableAction), {
      color: style.textColor,
      fontFamily: "Aptos, Segoe UI, sans-serif",
      fontSize: "12px",
      fontStyle: "800",
      align: "center",
    })
    glyph.setOrigin(0.5, 0.5)
    marker.add([halo, back, glyph])
    this.actionMarkers.push({ zoneId: info.id, container: marker })
  }

  private drawDebugBounds(info: RendererZoneInfo): void {
    const graphics = this.debugGraphics
    if (!graphics) return

    graphics.lineStyle(1, 0xd7892c, 0.95)
    graphics.strokeRect(
      info.bounds.x,
      info.bounds.y,
      info.bounds.width,
      info.bounds.height,
    )
    graphics.fillStyle(0xd7892c, 0.18)
    graphics.fillCircle(info.bounds.x, info.bounds.y, 3)
    graphics.fillCircle(
      info.bounds.x + info.bounds.width,
      info.bounds.y + info.bounds.height,
      3,
    )
  }

  private updateZoomScaledElements(): void {
    const zoom = this.scene.cameras.main.zoom || 1
    const scale = roundTo(clamp(1 / zoom, LABEL_SCREEN_SCALE_MIN, LABEL_SCREEN_SCALE_MAX), 2)

    this.zoneLabels.forEach((label) => {
      label.text.setScale(scale)
      label.back.setScale(scale)
    })
    this.actionMarkers.forEach((marker) => {
      marker.container.setScale(scale)
    })
  }

  private setHoveredZoneId(zoneId: string | undefined): void {
    if (this.hoveredZoneId === zoneId) return
    this.hoveredZoneId = zoneId
    this.redrawZones()
  }

  private zoneIdAt(worldX: number, worldY: number): string | undefined {
    return this.zones.find((zone) => {
      const bounds = zoneBounds(zone, this.tileSize)
      return (
        worldX >= bounds.x &&
        worldX < bounds.x + bounds.width &&
        worldY >= bounds.y &&
        worldY < bounds.y + bounds.height
      )
    })?.id
  }

  private zoneInfo(zone: FixtureZone): RendererZoneInfo {
    const active = this.activeZoneIds.has(zone.id)
    const hovered = this.hoveredZoneId === zone.id
    const joined = this.joinedZoneIds.has(zone.id)
    const actionZone = this.availableActionZoneIds.has(zone.id)
    const kind = zoneKind(zone)
    const availableAction = actionZone ? zoneAction(kind) : undefined
    const availability: RendererZoneAvailability = joined
      ? "joined"
      : active && actionZone
        ? "available"
        : hovered
          ? "hovered"
          : "passive"

    return {
      id: zone.id,
      zoneType: zone.zoneType,
      kind,
      bounds: zoneBounds(zone, this.tileSize),
      active,
      hovered,
      availability,
      availableAction,
      feedback: zoneFeedback(kind, availability, active, availableAction),
      label: zoneLabel(zone, availability, availableAction, active, kind),
      labelVisible:
        active ||
        hovered ||
        joined ||
        kind === "meeting" ||
        kind === "portal" ||
        this.debugOverlayEnabled,
      labelScale: roundTo(
        clamp(
          1 / (this.scene.cameras.main.zoom || 1),
          LABEL_SCREEN_SCALE_MIN,
          LABEL_SCREEN_SCALE_MAX,
        ),
        2,
      ),
      markerVisible: Boolean(availableAction) || joined,
      debugVisible: this.debugOverlayEnabled,
    }
  }

  private isActionZone(zoneId: string): boolean {
    const zone = this.zones.find((candidate) => candidate.id === zoneId)
    if (!zone) return false
    return zoneAction(zoneKind(zone)) !== undefined
  }
}

function zoneBounds(zone: FixtureZone, tileSize: number): RendererZoneBounds {
  return {
    x: zone.xStart * tileSize,
    y: zone.yStart * tileSize,
    width: (zone.xEnd - zone.xStart) * tileSize,
    height: (zone.yEnd - zone.yStart) * tileSize,
  }
}

function zoneKind(zone: FixtureZone): RendererZoneKind {
  const raw = `${zone.zoneType} ${zone.id}`.toLowerCase()

  if (raw.includes("meeting")) return "meeting"
  if (raw.includes("portal") || raw.includes("door")) return "portal"
  if (raw.includes("private")) return "private"
  if (raw.includes("lobby")) return "lobby"
  if (raw.includes("quiet")) return "quiet"
  return "generic"
}

function zoneAction(kind: RendererZoneKind): RendererZoneAction | undefined {
  if (kind === "meeting") return "join_meeting"
  if (kind === "private") return "enter_private"
  if (kind === "portal") return "enter_portal"
  return undefined
}

function zoneStyle(kind: RendererZoneKind): {
  readonly color: number
  readonly textColor: string
} {
  switch (kind) {
    case "meeting":
      return { color: 0x2f8f63, textColor: "#0f4f38" }
    case "private":
      return { color: 0x755aa5, textColor: "#44305f" }
    case "portal":
      return { color: 0x316f9f, textColor: "#1d4260" }
    case "lobby":
      return { color: 0x2f7c83, textColor: "#1e5f55" }
    case "quiet":
      return { color: 0xa66f19, textColor: "#6b440d" }
    case "generic":
      return { color: 0x6f7d78, textColor: "#3c4945" }
  }
}

function zoneFillAlpha(availability: RendererZoneAvailability): number {
  switch (availability) {
    case "joined":
      return 0.2
    case "available":
      return 0.18
    case "hovered":
      return 0.12
    case "passive":
      return 0.045
  }
}

function zoneLineAlpha(availability: RendererZoneAvailability): number {
  switch (availability) {
    case "joined":
      return 0.95
    case "available":
      return 0.86
    case "hovered":
      return 0.72
    case "passive":
      return 0.32
  }
}

function zoneLineWidth(availability: RendererZoneAvailability): number {
  return availability === "passive" ? 1 : 2
}

function zoneLabel(
  zone: FixtureZone,
  availability: RendererZoneAvailability,
  availableAction: RendererZoneAction | undefined,
  active: boolean,
  kind: RendererZoneKind,
): string {
  if (availability === "joined") return "Call joined"
  if (availableAction === "join_meeting") return "Join call"
  if (availableAction === "enter_private") return "Private access"
  if (availableAction === "enter_portal") return "Door ready"
  if (active && kind === "private") return "Private area"
  if (active && kind === "portal") return "Door"
  return readableZoneLabel(zone)
}

function zoneFeedback(
  kind: RendererZoneKind,
  availability: RendererZoneAvailability,
  active: boolean,
  availableAction: RendererZoneAction | undefined,
): RendererZoneFeedback {
  if (availability === "joined") return "joined"
  if (availableAction === "join_meeting") return "meeting_ready"
  if (availableAction === "enter_private") return "private_access_available"
  if (availableAction === "enter_portal") return "portal_ready"
  if (active && kind === "private") return "private_boundary"
  return "none"
}

function actionGlyph(action: RendererZoneAction | undefined): string {
  switch (action) {
    case "join_meeting":
      return "Call"
    case "enter_private":
      return "Lock"
    case "enter_portal":
      return "Door"
    default:
      return "Go"
  }
}

function readableZoneLabel(zone: FixtureZone): string {
  return zone.id
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function zoneDebugEnabled(): boolean {
  try {
    const params = new URLSearchParams(window.location.search)
    return params.get("zoneDebug") === "1" ||
      window.localStorage.getItem("aedventure.zoneDebug") === "1"
  } catch {
    return false
  }
}
