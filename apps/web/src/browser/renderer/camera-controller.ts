import Phaser from "phaser"

import {
  CAMERA_DEADZONE_HEIGHT,
  CAMERA_DEADZONE_WIDTH,
  CAMERA_FOLLOW_LERP,
  DEFAULT_VIEWPORT_HEIGHT,
  DEFAULT_VIEWPORT_WIDTH,
  DEFAULT_ZOOM_FACTOR,
  MAX_EFFECTIVE_ZOOM,
  MAX_ZOOM_FACTOR,
  MIN_ZOOM_FACTOR,
  MOBILE_DEFAULT_ZOOM_FACTOR,
  MOBILE_VIEWPORT_WIDTH,
} from "./constants"
import { clamp, roundTo } from "./math"
import type { AvatarFollowTarget } from "./avatar-renderer"
import type {
  RendererCameraDeadzone,
  RendererCameraMode,
  RendererCameraState,
  RendererViewportState,
  RendererZoomPresetId,
  Vector2,
} from "./types"

export class CameraController {
  private viewportSize: Vector2 = {
    x: DEFAULT_VIEWPORT_WIDTH,
    y: DEFAULT_VIEWPORT_HEIGHT,
  }
  private mapSize: Vector2 = {
    x: 384,
    y: 320,
  }
  private mode: RendererCameraMode = "follow_player"
  private zoomPreset: RendererZoomPresetId = "standard"
  private zoomFactor = DEFAULT_ZOOM_FACTOR
  private effectiveZoom = DEFAULT_ZOOM_FACTOR
  private followingPlayerId?: string
  private followTarget?: AvatarFollowTarget
  private deadzone: RendererCameraDeadzone = {
    width: CAMERA_DEADZONE_WIDTH,
    height: CAMERA_DEADZONE_HEIGHT,
  }
  private cameraReady = false

  constructor(private readonly scene: Phaser.Scene) {}

  markReady(): void {
    this.cameraReady = true
    this.scene.cameras.main.setBackgroundColor("#e7edf0")
    // The world uses 32px semantic tiles and generated pixel-art textures. Keep
    // camera rounding enabled so WebGL sampling stays aligned during follow/zoom.
    this.scene.cameras.main.roundPixels = true
    this.scene.cameras.main.setSize(this.viewportSize.x, this.viewportSize.y)
    this.applyCameraZoom()
    this.applyDeadzone()
  }

  setMapSize(width: number, height: number): void {
    this.mapSize = { x: width, y: height }
    this.scene.cameras.main.setBounds(0, 0, width, height)
    this.applyCameraZoom()
    this.applyCameraMode()
  }

  resizeViewport(width: number, height: number): void {
    this.viewportSize = { x: width, y: height }
    if (this.cameraReady) {
      this.scene.cameras.main.setSize(width, height)
    }
    if (this.zoomPreset !== "custom") {
      this.zoomFactor = this.zoomFactorForPreset(this.zoomPreset)
    }
    this.applyCameraZoom()
    this.applyDeadzone()
  }

  setZoomFactor(zoomFactor: number): void {
    this.zoomPreset = "custom"
    this.zoomFactor = clamp(zoomFactor, MIN_ZOOM_FACTOR, MAX_ZOOM_FACTOR)
    this.applyCameraZoom()
  }

  setZoomPreset(zoomPreset: RendererZoomPresetId): void {
    this.zoomPreset = zoomPreset
    this.zoomFactor = this.zoomFactorForPreset(zoomPreset)
    if (zoomPreset === "room") {
      this.mode = "fit_room"
    }
    this.applyCameraZoom()
    this.applyCameraMode()
  }

  setCameraMode(mode: RendererCameraMode): void {
    this.mode = mode
    if (mode === "fit_room") {
      this.zoomPreset = "room"
      this.zoomFactor = this.zoomFactorForPreset("room")
      this.applyCameraZoom()
    } else if (this.zoomPreset === "room") {
      this.zoomPreset = "standard"
      this.zoomFactor = this.zoomFactorForPreset("standard")
      this.applyCameraZoom()
    }
    this.applyCameraMode()
  }

  follow(target: AvatarFollowTarget | undefined): void {
    this.followTarget = target
    if (!target) {
      this.clearFollow()
      return
    }

    if (this.mode === "fit_room") {
      this.centerRoom()
      return
    }

    if (this.followingPlayerId === target.playerId) return

    this.followingPlayerId = target.playerId
    this.applyDeadzone()
    this.scene.cameras.main.startFollow(
      target.cameraTarget,
      true,
      CAMERA_FOLLOW_LERP,
      CAMERA_FOLLOW_LERP,
    )
  }

  clearFollow(): void {
    this.followTarget = undefined
    this.stopCameraFollow()
  }

  private stopCameraFollow(): void {
    this.followingPlayerId = undefined
    this.scene.cameras.main.stopFollow()
  }

  getViewportState(): RendererViewportState {
    const camera = this.cameraReady ? this.scene.cameras.main : undefined

    return {
      viewportWidth: Math.round(this.viewportSize.x),
      viewportHeight: Math.round(this.viewportSize.y),
      mapWidth: Math.round(this.mapSize.x),
      mapHeight: Math.round(this.mapSize.y),
      zoomFactor: roundTo(this.zoomFactor, 2),
      effectiveZoom: roundTo(this.effectiveZoom, 2),
      canZoomIn: this.zoomFactor < MAX_ZOOM_FACTOR,
      canZoomOut: this.zoomFactor > MIN_ZOOM_FACTOR,
      scrollX: Math.round(camera?.scrollX ?? 0),
      scrollY: Math.round(camera?.scrollY ?? 0),
      followingPlayerId: this.followingPlayerId,
    }
  }

  getCameraState(): RendererCameraState {
    const camera = this.cameraReady ? this.scene.cameras.main : undefined
    const worldView = camera?.worldView ?? {
      x: 0,
      y: 0,
      width: this.viewportSize.x / this.effectiveZoom,
      height: this.viewportSize.y / this.effectiveZoom,
    }
    const localPlayerViewportPosition = this.followTarget && camera
      ? this.projectWorldToViewport({
          x: this.followTarget.cameraTarget.x,
          y: this.followTarget.cameraTarget.y,
        })
      : undefined

    return {
      mode: this.mode,
      zoomPreset: this.zoomPreset,
      zoomFactor: roundTo(this.zoomFactor, 2),
      defaultZoomFactor: roundTo(this.defaultZoomFactor(), 2),
      effectiveZoom: roundTo(this.effectiveZoom, 2),
      minZoomFactor: MIN_ZOOM_FACTOR,
      maxZoomFactor: MAX_ZOOM_FACTOR,
      canZoomIn: this.zoomFactor < MAX_ZOOM_FACTOR,
      canZoomOut: this.zoomFactor > MIN_ZOOM_FACTOR,
      viewportWidth: Math.round(this.viewportSize.x),
      viewportHeight: Math.round(this.viewportSize.y),
      mapWidth: Math.round(this.mapSize.x),
      mapHeight: Math.round(this.mapSize.y),
      scrollX: Math.round(camera?.scrollX ?? 0),
      scrollY: Math.round(camera?.scrollY ?? 0),
      worldView: {
        x: roundTo(worldView.x, 2),
        y: roundTo(worldView.y, 2),
        width: roundTo(worldView.width, 2),
        height: roundTo(worldView.height, 2),
      },
      deadzone: this.deadzone,
      followLerp: CAMERA_FOLLOW_LERP,
      followAnchor:
        this.mode === "fit_room"
          ? "room_center"
          : this.followTarget
            ? "stable_player_anchor"
            : "none",
      followingPlayerId: this.followingPlayerId,
      localPlayerVisible: localPlayerViewportPosition
        ? pointInsideViewport(localPlayerViewportPosition, this.viewportSize)
        : false,
      localPlayerViewportPosition,
    }
  }

  getCameraRoundPixels(): boolean {
    return this.scene.cameras.main.roundPixels
  }

  projectWorldToViewport(point: Vector2): Vector2 {
    const camera = this.scene.cameras.main
    const worldView = camera.worldView

    return {
      x: Math.round((point.x - worldView.x) * camera.zoom),
      y: Math.round((point.y - worldView.y) * camera.zoom),
    }
  }

  private applyCameraZoom(): void {
    this.effectiveZoom = this.computeEffectiveZoom()

    if (!this.cameraReady) return

    const camera = this.scene.cameras.main
    camera.setZoom(this.effectiveZoom)
    camera.setBounds(0, 0, this.mapSize.x, this.mapSize.y)
    if (this.mode === "fit_room") {
      this.centerRoom()
    }
  }

  private computeEffectiveZoom(): number {
    const fitZoom = Math.min(
      this.viewportSize.x / this.mapSize.x,
      this.viewportSize.y / this.mapSize.y,
    )

    return clamp(fitZoom * this.zoomFactor, MIN_ZOOM_FACTOR, MAX_EFFECTIVE_ZOOM)
  }

  private applyCameraMode(): void {
    if (!this.cameraReady) return

    if (this.mode === "fit_room") {
      this.stopCameraFollow()
      this.centerRoom()
      return
    }

    const target = this.followTarget
    if (target) {
      this.followingPlayerId = undefined
      this.follow(target)
      return
    }

    this.centerRoom()
  }

  private applyDeadzone(): void {
    this.deadzone = this.computeDeadzone()
    if (!this.cameraReady) return

    this.scene.cameras.main.setDeadzone(this.deadzone.width, this.deadzone.height)
  }

  private computeDeadzone(): RendererCameraDeadzone {
    const mobile = this.viewportSize.x <= MOBILE_VIEWPORT_WIDTH
    const widthRatio = mobile ? 0.34 : 0.22
    const heightRatio = mobile ? 0.28 : 0.18

    return {
      width: Math.round(
        clamp(
          this.viewportSize.x * widthRatio,
          mobile ? 84 : 96,
          mobile ? 150 : 220,
        ),
      ),
      height: Math.round(
        clamp(
          this.viewportSize.y * heightRatio,
          mobile ? 64 : 70,
          mobile ? 120 : 160,
        ),
      ),
    }
  }

  private zoomFactorForPreset(zoomPreset: RendererZoomPresetId): number {
    switch (zoomPreset) {
      case "room":
        return this.viewportSize.x <= MOBILE_VIEWPORT_WIDTH ? 0.86 : 0.9
      case "standard":
        return this.defaultZoomFactor()
      case "near":
        return this.viewportSize.x <= MOBILE_VIEWPORT_WIDTH ? 1.16 : 1.35
      case "focus":
        return this.viewportSize.x <= MOBILE_VIEWPORT_WIDTH ? 1.34 : 1.65
      case "custom":
        return this.zoomFactor
    }
  }

  private defaultZoomFactor(): number {
    return this.viewportSize.x <= MOBILE_VIEWPORT_WIDTH
      ? MOBILE_DEFAULT_ZOOM_FACTOR
      : DEFAULT_ZOOM_FACTOR
  }

  private centerRoom(): void {
    if (!this.cameraReady) return

    this.scene.cameras.main.centerOn(this.mapSize.x / 2, this.mapSize.y / 2)
  }
}

function pointInsideViewport(point: Vector2, viewportSize: Vector2): boolean {
  return (
    point.x >= 0 &&
    point.y >= 0 &&
    point.x <= viewportSize.x &&
    point.y <= viewportSize.y
  )
}
