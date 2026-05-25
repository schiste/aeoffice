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
} from "./constants"
import { clamp, roundTo } from "./math"
import type { AvatarFollowTarget } from "./avatar-renderer"
import type { RendererViewportState, Vector2 } from "./types"

export class CameraController {
  private viewportSize: Vector2 = {
    x: DEFAULT_VIEWPORT_WIDTH,
    y: DEFAULT_VIEWPORT_HEIGHT,
  }
  private mapSize: Vector2 = {
    x: 384,
    y: 320,
  }
  private zoomFactor = DEFAULT_ZOOM_FACTOR
  private effectiveZoom = DEFAULT_ZOOM_FACTOR
  private followingPlayerId?: string
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
  }

  setMapSize(width: number, height: number): void {
    this.mapSize = { x: width, y: height }
    this.scene.cameras.main.setBounds(0, 0, width, height)
    this.scene.cameras.main.centerOn(width / 2, height / 2)
    this.applyCameraZoom()
  }

  resizeViewport(width: number, height: number): void {
    this.viewportSize = { x: width, y: height }
    if (this.cameraReady) {
      this.scene.cameras.main.setSize(width, height)
    }
    this.applyCameraZoom()
  }

  setZoomFactor(zoomFactor: number): void {
    this.zoomFactor = clamp(zoomFactor, MIN_ZOOM_FACTOR, MAX_ZOOM_FACTOR)
    this.applyCameraZoom()
  }

  follow(target: AvatarFollowTarget | undefined): void {
    if (!target) {
      this.clearFollow()
      return
    }

    if (this.followingPlayerId === target.playerId) return

    this.followingPlayerId = target.playerId
    this.scene.cameras.main.setDeadzone(
      CAMERA_DEADZONE_WIDTH,
      CAMERA_DEADZONE_HEIGHT,
    )
    this.scene.cameras.main.startFollow(
      target.cameraTarget,
      true,
      CAMERA_FOLLOW_LERP,
      CAMERA_FOLLOW_LERP,
    )
  }

  clearFollow(): void {
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
  }

  private computeEffectiveZoom(): number {
    const fitZoom = Math.min(
      this.viewportSize.x / this.mapSize.x,
      this.viewportSize.y / this.mapSize.y,
    )

    return clamp(fitZoom * this.zoomFactor, MIN_ZOOM_FACTOR, MAX_EFFECTIVE_ZOOM)
  }
}
