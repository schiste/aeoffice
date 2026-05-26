import Phaser from "phaser"

import { ZONE_LABEL_DEPTH } from "./constants"
import { roundTo } from "./math"
import type {
  RendererAdvancedInputCursor,
  RendererAdvancedInputGesture,
  RendererAdvancedInputInfo,
  RendererAdvancedInputPointerKind,
  RendererDepthObjectInfo,
  RendererZoneInfo,
} from "./types"

interface AdvancedInputPluginOptions {
  readonly onHoveredZoneChange?: (zoneId: string | undefined) => void
}

interface PointerStart {
  readonly x: number
  readonly y: number
  readonly startedAtMs: number
}

interface ObjectHitTarget {
  readonly id: string
  readonly tokenId: string
  readonly zone: Phaser.GameObjects.Zone
}

interface ActivePointer {
  readonly x: number
  readonly y: number
}

const DOUBLE_TAP_MS = 280
const LONG_PRESS_MS = 460
const TAP_DISTANCE_PX = 10

export class AdvancedInputPlugin {
  private bound = false
  private options: AdvancedInputPluginOptions = {}
  private zones: readonly RendererZoneInfo[] = []
  private objectTargets: ObjectHitTarget[] = []
  private pointerStarts = new Map<number, PointerStart>()
  private activePointers = new Map<number, ActivePointer>()
  private currentCursor: RendererAdvancedInputCursor = "default"
  private pointerKind: RendererAdvancedInputPointerKind = "unknown"
  private pointerActive = false
  private primaryDown = false
  private screenX?: number
  private screenY?: number
  private worldX?: number
  private worldY?: number
  private hoveredZoneId?: string
  private hoveredObjectId?: string
  private selectedObjectId?: string
  private selectedObjectTokenId?: string
  private dragTargetId?: string
  private dragDistancePx = 0
  private dragStart?: ActivePointer
  private pinchStartDistance = 0
  private pinchScale = 1
  private lastTapAtMs = 0
  private lastGesture: RendererAdvancedInputInfo["gesture"] = {
    last: "none",
    durationMs: 0,
    distancePx: 0,
  }

  constructor(private readonly scene: Phaser.Scene) {}

  bind(options: AdvancedInputPluginOptions = {}): void {
    this.options = options
    if (this.bound) return

    this.bound = true
    this.scene.input.addPointer(2)
    this.scene.input.on("pointermove", this.handlePointerMove, this)
    this.scene.input.on("pointerdown", this.handlePointerDown, this)
    this.scene.input.on("pointerup", this.handlePointerUp, this)
    this.scene.input.on("pointerupoutside", this.handlePointerUp, this)
    this.scene.input.on("pointerout", this.handlePointerOut, this)
    this.scene.input.on("dragstart", this.handleDragStart, this)
    this.scene.input.on("drag", this.handleDrag, this)
    this.scene.input.on("dragend", this.handleDragEnd, this)
  }

  clearMapTargets(): void {
    this.objectTargets.forEach((target) => target.zone.destroy())
    this.objectTargets = []
    this.zones = []
    this.hoveredZoneId = undefined
    this.hoveredObjectId = undefined
    this.selectedObjectId = undefined
    this.selectedObjectTokenId = undefined
    this.dragTargetId = undefined
    this.dragDistancePx = 0
    this.setCursor("default")
    this.options.onHoveredZoneChange?.(undefined)
  }

  setZones(zones: readonly RendererZoneInfo[]): void {
    this.zones = zones
    this.updateHoveredZoneFromPointer()
    this.refreshCursor()
  }

  setObjects(objects: readonly RendererDepthObjectInfo[]): void {
    this.objectTargets.forEach((target) => target.zone.destroy())
    this.objectTargets = objects
      .filter((object) => object.layer === "object")
      .map((object) => this.createObjectHitTarget(object))
    this.refreshCursor()
  }

  getInfo(): RendererAdvancedInputInfo {
    return {
      source: "phaser_input_plugin",
      authority: "renderer_visual_selection_only",
      enabled: this.bound,
      features: [
        "pointer_world_coordinates",
        "semantic_zone_hit_testing",
        "object_hit_areas",
        "drag_targets",
        "cursor_state",
        "touch_gestures",
        "object_selection",
      ],
      pointer: {
        active: this.pointerActive,
        kind: this.pointerKind,
        worldX: this.worldX,
        worldY: this.worldY,
        screenX: this.screenX,
        screenY: this.screenY,
        activePointerCount: this.activePointers.size,
        primaryDown: this.primaryDown,
      },
      cursor: {
        current: this.currentCursor,
        hoverTargetId: this.hoveredObjectId ?? this.hoveredZoneId,
        hoverTargetKind: this.hoveredObjectId
          ? "object"
          : this.hoveredZoneId
            ? "zone"
            : undefined,
      },
      hitTesting: {
        zoneTargetCount: this.zones.length,
        objectTargetCount: this.objectTargets.length,
        hoveredZoneId: this.hoveredZoneId,
        hoveredObjectId: this.hoveredObjectId,
      },
      selection: {
        selectedObjectId: this.selectedObjectId,
        selectedObjectTokenId: this.selectedObjectTokenId,
        selectableObjectCount: this.objectTargets.length,
      },
      drag: {
        enabled: true,
        active: Boolean(this.dragTargetId),
        targetId: this.dragTargetId,
        distancePx: roundTo(this.dragDistancePx, 2),
      },
      touch: {
        multiPointerEnabled: true,
        pinchActive: this.activePointers.size >= 2 && this.pinchStartDistance > 0,
        pinchScale: roundTo(this.pinchScale, 3),
      },
      gesture: this.lastGesture,
    }
  }

  private createObjectHitTarget(
    object: RendererDepthObjectInfo,
  ): ObjectHitTarget {
    const bounds = object.bounds
    const zone = this.scene.add.zone(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      bounds.width,
      bounds.height,
    )

    zone.setName(`input:${object.id}`)
    zone.setDepth(ZONE_LABEL_DEPTH + 4)
    zone.setSize(bounds.width, bounds.height)
    zone.setInteractive()
    this.scene.input.setDraggable(zone, true)
    zone.on("pointerover", () => this.setHoveredObject(object.id))
    zone.on("pointerout", () => this.setHoveredObject(undefined))
    zone.on("pointerdown", () => this.selectObject(object.id, object.tokenId))

    return {
      id: object.id,
      tokenId: object.tokenId,
      zone,
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    this.recordPointer(pointer, true)
    if (pointer.isDown || this.pointerStarts.has(pointer.id)) {
      this.updateActivePointer(pointer)
    }
    this.updateHoveredZoneFromPointer()
    this.updatePinchGesture()
    this.refreshCursor()
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    this.recordPointer(pointer, true)
    this.primaryDown = true
    this.pointerStarts.set(pointer.id, {
      x: pointer.x,
      y: pointer.y,
      startedAtMs: performance.now(),
    })
    this.updateActivePointer(pointer)
    this.updatePinchGesture()
    this.refreshCursor()
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    this.recordPointer(pointer, false)
    this.primaryDown = this.activePointers.size > 1
    const start = this.pointerStarts.get(pointer.id)
    this.pointerStarts.delete(pointer.id)
    this.activePointers.delete(pointer.id)
    this.updatePinchGesture()

    if (start && !this.dragTargetId) {
      const now = performance.now()
      const distance = pointDistance(start.x, start.y, pointer.x, pointer.y)
      const duration = now - start.startedAtMs
      const targetId = this.hoveredObjectId ?? this.hoveredZoneId
      const targetKind = this.hoveredObjectId
        ? "object"
        : this.hoveredZoneId
          ? "zone"
          : "world"

      this.lastGesture = {
        last: tapGesture(now, this.lastTapAtMs, duration, distance),
        targetId,
        targetKind,
        durationMs: Math.round(duration),
        distancePx: roundTo(distance, 2),
      }
      if (distance <= TAP_DISTANCE_PX) {
        this.lastTapAtMs = now
      }
    }

    this.refreshCursor()
  }

  private handlePointerOut(): void {
    this.pointerActive = false
    this.setHoveredZone(undefined)
    this.setHoveredObject(undefined)
    this.refreshCursor()
  }

  private handleDragStart(
    pointer: Phaser.Input.Pointer,
    target: Phaser.GameObjects.GameObject,
  ): void {
    const hitTarget = this.objectTargetFor(target)
    if (!hitTarget) return

    this.dragTargetId = hitTarget.id
    this.dragDistancePx = 0
    this.dragStart = { x: pointer.x, y: pointer.y }
    this.selectObject(hitTarget.id, hitTarget.tokenId)
    this.lastGesture = {
      last: "drag",
      targetId: hitTarget.id,
      targetKind: "object",
      durationMs: 0,
      distancePx: 0,
    }
    this.refreshCursor()
  }

  private handleDrag(
    pointer: Phaser.Input.Pointer,
    target: Phaser.GameObjects.GameObject,
  ): void {
    const hitTarget = this.objectTargetFor(target)
    if (!hitTarget || !this.dragStart) return

    this.dragDistancePx = pointDistance(
      this.dragStart.x,
      this.dragStart.y,
      pointer.x,
      pointer.y,
    )
    this.lastGesture = {
      last: "drag",
      targetId: hitTarget.id,
      targetKind: "object",
      durationMs: 0,
      distancePx: roundTo(this.dragDistancePx, 2),
    }
  }

  private handleDragEnd(
    _pointer: Phaser.Input.Pointer,
    target: Phaser.GameObjects.GameObject,
  ): void {
    const hitTarget = this.objectTargetFor(target)
    this.lastGesture = {
      last: "drag",
      targetId: hitTarget?.id ?? this.dragTargetId,
      targetKind: "object",
      durationMs: 0,
      distancePx: roundTo(this.dragDistancePx, 2),
    }
    this.dragTargetId = undefined
    this.dragStart = undefined
    this.refreshCursor()
  }

  private recordPointer(pointer: Phaser.Input.Pointer, active: boolean): void {
    this.pointerActive = active
    this.pointerKind = pointerKind(pointer)
    this.screenX = Math.round(pointer.x)
    this.screenY = Math.round(pointer.y)
    this.worldX = roundTo(pointer.worldX, 2)
    this.worldY = roundTo(pointer.worldY, 2)
  }

  private updateActivePointer(pointer: Phaser.Input.Pointer): void {
    this.activePointers.set(pointer.id, { x: pointer.x, y: pointer.y })
  }

  private updateHoveredZoneFromPointer(): void {
    if (this.worldX === undefined || this.worldY === undefined) return
    this.setHoveredZone(this.zoneIdAt(this.worldX, this.worldY))
  }

  private updatePinchGesture(): void {
    const pointers = [...this.activePointers.values()]
    if (pointers.length < 2) {
      this.pinchStartDistance = 0
      this.pinchScale = 1
      return
    }

    const distance = pointDistance(
      pointers[0].x,
      pointers[0].y,
      pointers[1].x,
      pointers[1].y,
    )
    if (this.pinchStartDistance <= 0) {
      this.pinchStartDistance = distance
    }
    this.pinchScale = this.pinchStartDistance > 0
      ? distance / this.pinchStartDistance
      : 1
    this.lastGesture = {
      last: "pinch",
      targetKind: "world",
      durationMs: 0,
      distancePx: roundTo(distance, 2),
    }
  }

  private setHoveredZone(zoneId: string | undefined): void {
    if (this.hoveredZoneId === zoneId) return
    this.hoveredZoneId = zoneId
    this.options.onHoveredZoneChange?.(zoneId)
  }

  private setHoveredObject(objectId: string | undefined): void {
    if (this.hoveredObjectId === objectId) return
    this.hoveredObjectId = objectId
    this.refreshCursor()
  }

  private selectObject(objectId: string, tokenId: string): void {
    this.selectedObjectId = objectId
    this.selectedObjectTokenId = tokenId
    this.lastGesture = {
      last: "select_object",
      targetId: objectId,
      targetKind: "object",
      durationMs: 0,
      distancePx: 0,
    }
    this.refreshCursor()
  }

  private zoneIdAt(worldX: number, worldY: number): string | undefined {
    return this.zones.find((zone) => {
      const bounds = zone.bounds
      return (
        worldX >= bounds.x &&
        worldX < bounds.x + bounds.width &&
        worldY >= bounds.y &&
        worldY < bounds.y + bounds.height
      )
    })?.id
  }

  private objectTargetFor(
    target: Phaser.GameObjects.GameObject,
  ): ObjectHitTarget | undefined {
    return this.objectTargets.find((entry) => entry.zone === target)
  }

  private refreshCursor(): void {
    if (this.dragTargetId) {
      this.setCursor("grabbing")
    } else if (this.hoveredObjectId) {
      this.setCursor("grab")
    } else if (this.hoveredZoneId) {
      this.setCursor("pointer")
    } else {
      this.setCursor("default")
    }
  }

  private setCursor(cursor: RendererAdvancedInputCursor): void {
    if (this.currentCursor === cursor) return
    this.currentCursor = cursor
    this.scene.input.setDefaultCursor(cursor)
  }
}

function pointDistance(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): number {
  return Math.hypot(endX - startX, endY - startY)
}

function pointerKind(
  pointer: Phaser.Input.Pointer,
): RendererAdvancedInputPointerKind {
  const pointerType = (pointer as { pointerType?: unknown }).pointerType
  if (pointerType === "mouse" || pointerType === "touch" || pointerType === "pen") {
    return pointerType
  }
  if ((pointer as { wasTouch?: unknown }).wasTouch === true) return "touch"
  return "unknown"
}

function tapGesture(
  nowMs: number,
  lastTapAtMs: number,
  durationMs: number,
  distancePx: number,
): RendererAdvancedInputGesture {
  if (distancePx > TAP_DISTANCE_PX) return "drag"
  if (durationMs >= LONG_PRESS_MS) return "long_press"
  if (nowMs - lastTapAtMs <= DOUBLE_TAP_MS) return "double_tap"
  return "tap"
}
