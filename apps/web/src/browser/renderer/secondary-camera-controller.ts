import Phaser from "phaser"

import { clamp, roundTo } from "./math"
import type {
  RendererSecondaryCameraInfo,
  RendererSecondaryCameraSystemInfo,
  Vector2,
} from "./types"

const OVERVIEW_CAMERA_NAME = "overview-minimap"
const OVERVIEW_MARGIN_PX = 12
const OVERVIEW_MIN_WIDTH_PX = 112
const OVERVIEW_MAX_WIDTH_PX = 184
const OVERVIEW_MIN_VIEWPORT_WIDTH_PX = 540
const OVERVIEW_MIN_VIEWPORT_HEIGHT_PX = 360
const OVERVIEW_ASPECT_RATIO = 0.62
const OVERVIEW_WORLD_PADDING_RATIO = 0.92
const OVERVIEW_MIN_ZOOM = 0.04
const OVERVIEW_ALPHA = 0.88

export class SecondaryCameraController {
  private viewportSize: Vector2 = { x: 640, y: 360 }
  private mapSize: Vector2 = { x: 384, y: 320 }
  private overviewCamera?: Phaser.Cameras.Scene2D.Camera
  private ready = false
  private active = false
  private disabledReason: RendererSecondaryCameraInfo["disabledReason"] =
    "not_ready"

  constructor(private readonly scene: Phaser.Scene) {}

  markReady(viewportSize: Vector2, mapSize: Vector2): void {
    this.ready = true
    this.viewportSize = viewportSize
    this.mapSize = mapSize
    this.ensureOverviewCamera()
    this.reflow()
  }

  setMapSize(width: number, height: number): void {
    this.mapSize = { x: width, y: height }
    this.reflow()
  }

  resizeViewport(width: number, height: number): void {
    this.viewportSize = { x: width, y: height }
    this.reflow()
  }

  getInfo(): RendererSecondaryCameraSystemInfo {
    const cameraManager = (
      this.scene as Phaser.Scene & {
        cameras?: Phaser.Cameras.Scene2D.CameraManager
      }
    ).cameras

    return {
      source: "phaser_camera_manager",
      mode: this.active ? "main_plus_overview" : "main_only",
      maxCameraCount: 31,
      totalCameraCount: cameraManager?.getTotal() ?? 0,
      visibleCameraCount: cameraManager?.getTotal(true) ?? 0,
      secondaryCameras: [this.overviewInfo()],
    }
  }

  private ensureOverviewCamera(): Phaser.Cameras.Scene2D.Camera {
    if (this.overviewCamera) return this.overviewCamera

    const camera = this.scene.cameras.add(
      0,
      0,
      OVERVIEW_MIN_WIDTH_PX,
      Math.round(OVERVIEW_MIN_WIDTH_PX * OVERVIEW_ASPECT_RATIO),
      false,
      OVERVIEW_CAMERA_NAME,
    )
    camera.roundPixels = true
    camera.setAlpha(OVERVIEW_ALPHA)
    camera.setBackgroundColor("rgba(18, 42, 40, 0.68)")
    camera.visible = false
    this.overviewCamera = camera
    return camera
  }

  private reflow(): void {
    if (!this.ready) return

    const camera = this.ensureOverviewCamera()
    const enabled = this.shouldEnableOverview()
    this.active = enabled
    this.disabledReason = enabled ? undefined : "compact_viewport"
    camera.visible = enabled

    const viewport = this.overviewViewport()
    camera.setViewport(viewport.x, viewport.y, viewport.width, viewport.height)
    camera.setBounds(0, 0, this.mapSize.x, this.mapSize.y)
    camera.setZoom(this.overviewZoom(viewport))
    camera.centerOn(this.mapSize.x / 2, this.mapSize.y / 2)
  }

  private shouldEnableOverview(): boolean {
    return (
      this.ready &&
      this.viewportSize.x >= OVERVIEW_MIN_VIEWPORT_WIDTH_PX &&
      this.viewportSize.y >= OVERVIEW_MIN_VIEWPORT_HEIGHT_PX &&
      this.mapSize.x > 0 &&
      this.mapSize.y > 0
    )
  }

  private overviewViewport(): RendererSecondaryCameraInfo["viewport"] {
    const width = Math.round(
      clamp(
        this.viewportSize.x * 0.22,
        OVERVIEW_MIN_WIDTH_PX,
        OVERVIEW_MAX_WIDTH_PX,
      ),
    )
    const height = Math.round(width * OVERVIEW_ASPECT_RATIO)

    return {
      x: Math.max(
        OVERVIEW_MARGIN_PX,
        this.viewportSize.x - width - OVERVIEW_MARGIN_PX,
      ),
      y: OVERVIEW_MARGIN_PX,
      width,
      height,
    }
  }

  private overviewZoom(
    viewport: RendererSecondaryCameraInfo["viewport"],
  ): number {
    return roundTo(
      Math.max(
        OVERVIEW_MIN_ZOOM,
        Math.min(
          viewport.width / this.mapSize.x,
          viewport.height / this.mapSize.y,
        ) * OVERVIEW_WORLD_PADDING_RATIO,
      ),
      3,
    )
  }

  private overviewInfo(): RendererSecondaryCameraInfo {
    const camera = this.overviewCamera
    const viewport = camera
      ? {
          x: Math.round(camera.x),
          y: Math.round(camera.y),
          width: Math.round(camera.width),
          height: Math.round(camera.height),
        }
      : this.overviewViewport()
    const worldView = camera?.worldView ?? {
      x: 0,
      y: 0,
      width: this.mapSize.x,
      height: this.mapSize.y,
    }

    return {
      id: OVERVIEW_CAMERA_NAME,
      role: "minimap_overview",
      active: this.active,
      visible: camera?.visible ?? false,
      disabledReason: this.disabledReason,
      renderTarget: "same_scene_overlay",
      updatePolicy: "fit_room_on_resize_or_map_switch",
      viewport,
      worldView: {
        x: roundTo(worldView.x, 2),
        y: roundTo(worldView.y, 2),
        width: roundTo(worldView.width, 2),
        height: roundTo(worldView.height, 2),
      },
      zoom: roundTo(camera?.zoom ?? this.overviewZoom(viewport), 3),
      alpha: OVERVIEW_ALPHA,
      roundPixels: camera?.roundPixels ?? true,
    }
  }
}
