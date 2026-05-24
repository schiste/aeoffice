import Phaser from "phaser"

import { ZONE_DEPTH, ZONE_LABEL_DEPTH } from "./constants"
import { clamp } from "./math"
import type { FixtureZone } from "./types"

export class ZoneRenderer {
  private zoneGraphics?: Phaser.GameObjects.Graphics
  private zoneLabels: Phaser.GameObjects.Text[] = []
  private zones: readonly FixtureZone[] = []
  private activeZoneIds = new Set<string>()
  private hoveredZoneId?: string
  private tileSize = 32

  constructor(private readonly scene: Phaser.Scene) {}

  bindPointerInput(): void {
    this.scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.setHoveredZoneId(this.zoneIdAt(pointer.worldX, pointer.worldY))
    })
    this.scene.input.on("pointerout", () => {
      this.setHoveredZoneId(undefined)
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
    this.activeZoneIds = new Set(zoneIds)
    this.redrawZones()
  }

  clear(): void {
    this.zoneGraphics?.destroy()
    this.zoneLabels.forEach((label) => label.destroy())
    this.zoneGraphics = undefined
    this.zoneLabels = []
  }

  private redrawZones(): void {
    this.clear()
    this.zoneGraphics = this.scene.add.graphics()
    this.zoneGraphics.setDepth(ZONE_DEPTH)
    this.zones.forEach((zone) => {
      const active = this.activeZoneIds.has(zone.id)
      const hovered = this.hoveredZoneId === zone.id
      const meetingZone = zone.zoneType.includes("meeting")
      const x = zone.xStart * this.tileSize
      const y = zone.yStart * this.tileSize
      const width = (zone.xEnd - zone.xStart) * this.tileSize
      const height = (zone.yEnd - zone.yStart) * this.tileSize
      const fillAlpha = active ? 0.24 : hovered ? 0.15 : meetingZone ? 0.08 : 0.05
      const lineAlpha = active ? 1 : hovered ? 0.82 : meetingZone ? 0.5 : 0.34
      const lineWidth = active ? 3 : hovered ? 3 : meetingZone ? 2 : 1
      const color = active
        ? 0x2f8f63
        : hovered
          ? 0x4b9a70
          : meetingZone
            ? 0x2f8f63
            : 0x2f7c83

      if (active) {
        this.zoneGraphics?.lineStyle(10, color, 0.13)
        this.zoneGraphics?.strokeRect(x - 4, y - 4, width + 8, height + 8)
        this.zoneGraphics?.lineStyle(6, color, 0.18)
        this.zoneGraphics?.strokeRect(x - 2, y - 2, width + 4, height + 4)
      } else if (meetingZone) {
        this.zoneGraphics?.lineStyle(5, color, 0.08)
        this.zoneGraphics?.strokeRect(x - 2, y - 2, width + 4, height + 4)
      }
      this.zoneGraphics?.fillStyle(color, fillAlpha)
      this.zoneGraphics?.fillRect(x, y, width, height)
      this.zoneGraphics?.lineStyle(lineWidth, color, lineAlpha)
      this.zoneGraphics?.strokeRect(x, y, width, height)
      if (active || hovered) {
        const labelCopy =
          active && meetingZone ? "Join call available" : readableZoneLabel(zone)
        const label = this.scene.add.text(x, y + 7, labelCopy, {
          color: active ? "#0f4f38" : "#1e5f55",
          fontFamily: "Aptos, Segoe UI, sans-serif",
          fontSize: "9px",
          fontStyle: "700",
          backgroundColor: "rgba(255,253,247,0.82)",
          padding: { x: 5, y: 3 },
        })
        label.setPosition(
          clamp(
            x + width / 2 - label.width / 2,
            x + 8,
            x + width - label.width - 8,
          ),
          y + 7,
        )
        label.setDepth(ZONE_LABEL_DEPTH)
        label.setAlpha(active ? 1 : 0.88)
        this.zoneLabels.push(label)
      }
    })
  }

  private setHoveredZoneId(zoneId: string | undefined): void {
    if (this.hoveredZoneId === zoneId) return
    this.hoveredZoneId = zoneId
    this.redrawZones()
  }

  private zoneIdAt(worldX: number, worldY: number): string | undefined {
    return this.zones.find((zone) => {
      const x = zone.xStart * this.tileSize
      const y = zone.yStart * this.tileSize
      const width = (zone.xEnd - zone.xStart) * this.tileSize
      const height = (zone.yEnd - zone.yStart) * this.tileSize
      return worldX >= x && worldX < x + width && worldY >= y && worldY < y + height
    })?.id
  }
}

function readableZoneLabel(zone: FixtureZone): string {
  return zone.id
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
