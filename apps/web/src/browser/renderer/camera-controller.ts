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
import { SecondaryCameraController } from "./secondary-camera-controller"
import type { AvatarFollowTarget } from "./avatar-renderer"
import type {
  RendererCameraDeadzone,
  RendererCameraFollowMotion,
  RendererCameraLeadState,
  RendererCameraMode,
  RendererCameraState,
  RendererViewportState,
  RendererZoomPresetId,
  Vector2,
} from "./types"

const CAMERA_WALK_LEAD_MAX_PX = 22
const CAMERA_RUN_LEAD_MAX_PX = 42
const CAMERA_LEAD_ACTIVE_SMOOTHING_MS = 105
const CAMERA_LEAD_IDLE_SMOOTHING_MS = 210
const CAMERA_LEAD_CORRECTION_DAMPING = 0.22
const CAMERA_LEAD_SPEED_EPSILON = 6
const CAMERA_DERIVED_SAMPLE_MAX_DELTA_MS = 80

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
  private leadAnchor?: Phaser.GameObjects.Zone
  private leadOffset: Vector2 = { x: 0, y: 0 }
  private targetLeadOffset: Vector2 = { x: 0, y: 0 }
  private followVelocity: Vector2 = { x: 0, y: 0 }
  private followSpeedPxPerSecond = 0
  private leadSource: RendererCameraLeadState["source"] = "idle"
  private leadSmoothingTimeConstantMs = CAMERA_LEAD_IDLE_SMOOTHING_MS
  private leadCorrectionDampingActive = false
  private lastFollowSample?: {
    readonly position: Vector2
    readonly timeMs: number
  }
  private deadzone: RendererCameraDeadzone = {
    width: CAMERA_DEADZONE_WIDTH,
    height: CAMERA_DEADZONE_HEIGHT,
  }
  private cameraReady = false
  private readonly secondaryCameraController: SecondaryCameraController

  constructor(private readonly scene: Phaser.Scene) {
    this.secondaryCameraController = new SecondaryCameraController(scene)
  }

  markReady(): void {
    this.cameraReady = true
    this.ensureLeadAnchor()
    this.scene.cameras.main.setBackgroundColor("#e7edf0")
    // The world uses 32px semantic tiles and generated pixel-art textures. Keep
    // camera rounding enabled so WebGL sampling stays aligned during follow/zoom.
    this.scene.cameras.main.roundPixels = true
    this.scene.cameras.main.setSize(this.viewportSize.x, this.viewportSize.y)
    this.applyCameraZoom()
    this.applyDeadzone()
    this.secondaryCameraController.markReady(this.viewportSize, this.mapSize)
  }

  setMapSize(width: number, height: number): void {
    this.mapSize = { x: width, y: height }
    this.scene.cameras.main.setBounds(0, 0, width, height)
    this.applyCameraZoom()
    this.applyCameraMode()
    this.secondaryCameraController.setMapSize(width, height)
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
    this.secondaryCameraController.resizeViewport(width, height)
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
    const leadAnchor = this.ensureLeadAnchor()
    leadAnchor.setPosition(target.cameraTarget.x, target.cameraTarget.y)
    this.leadOffset = { x: 0, y: 0 }
    this.targetLeadOffset = { x: 0, y: 0 }
    this.lastFollowSample = {
      position: {
        x: target.cameraTarget.x,
        y: target.cameraTarget.y,
      },
      timeMs: this.scene.time.now,
    }
    this.applyDeadzone()
    this.scene.cameras.main.startFollow(
      leadAnchor,
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
    this.resetLead()
  }

  updateFrame(deltaMs: number): void {
    if (!this.cameraReady || this.mode !== "follow_player") return

    const target = this.followTarget
    if (!target) {
      this.resetLead()
      return
    }

    const leadAnchor = this.ensureLeadAnchor()
    const targetPosition = {
      x: target.cameraTarget.x,
      y: target.cameraTarget.y,
    }
    const motion = this.motionForTarget(target.motion, targetPosition, deltaMs)
    const targetLead = this.computeTargetLead(motion)
    const smoothingMs = targetLead.active
      ? CAMERA_LEAD_ACTIVE_SMOOTHING_MS
      : CAMERA_LEAD_IDLE_SMOOTHING_MS
    const blend = smoothingFactor(deltaMs, smoothingMs)

    this.leadOffset = {
      x: lerp(this.leadOffset.x, targetLead.offset.x, blend),
      y: lerp(this.leadOffset.y, targetLead.offset.y, blend),
    }
    if (
      vectorMagnitude(targetLead.offset) < 0.5 &&
      vectorMagnitude(this.leadOffset) < 0.5
    ) {
      this.leadOffset = { x: 0, y: 0 }
    }

    this.targetLeadOffset = targetLead.offset
    this.followVelocity = motion.velocity
    this.followSpeedPxPerSecond = motion.speedPxPerSecond
    this.leadSource = motion.source
    this.leadSmoothingTimeConstantMs = smoothingMs
    this.leadCorrectionDampingActive = targetLead.correctionDampingActive
    leadAnchor.setPosition(
      targetPosition.x + this.leadOffset.x,
      targetPosition.y + this.leadOffset.y,
    )
    this.lastFollowSample = {
      position: targetPosition,
      timeMs: this.scene.time.now,
    }
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
            ? "leading_player_anchor"
            : "none",
      lead: this.getLeadState(),
      secondary: this.secondaryCameraController.getInfo(),
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
    const widthRatio = mobile ? 0.31 : 0.19
    const heightRatio = mobile ? 0.24 : 0.16

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

  private ensureLeadAnchor(): Phaser.GameObjects.Zone {
    if (this.leadAnchor) return this.leadAnchor

    this.leadAnchor = this.scene.add.zone(0, 0, 2, 2)
    this.leadAnchor.setName("camera-leading-anchor")
    this.leadAnchor.setVisible(false)
    return this.leadAnchor
  }

  private resetLead(): void {
    this.leadOffset = { x: 0, y: 0 }
    this.targetLeadOffset = { x: 0, y: 0 }
    this.followVelocity = { x: 0, y: 0 }
    this.followSpeedPxPerSecond = 0
    this.leadSource = "idle"
    this.leadSmoothingTimeConstantMs = CAMERA_LEAD_IDLE_SMOOTHING_MS
    this.leadCorrectionDampingActive = false
    this.lastFollowSample = undefined
  }

  private motionForTarget(
    motion: RendererCameraFollowMotion | undefined,
    targetPosition: Vector2,
    deltaMs: number,
  ): RendererCameraFollowMotion & {
    readonly source: RendererCameraLeadState["source"]
  } {
    if (motion) {
      return {
        ...motion,
        source: "motion_snapshot",
      }
    }

    const sample = this.lastFollowSample
    const sampleDeltaMs = sample
      ? clamp(
          this.scene.time.now - sample.timeMs,
          0,
          CAMERA_DERIVED_SAMPLE_MAX_DELTA_MS,
        )
      : clamp(deltaMs, 0, CAMERA_DERIVED_SAMPLE_MAX_DELTA_MS)
    const safeDeltaSeconds = Math.max(sampleDeltaMs, 1000 / 120) / 1000
    const velocity = sample
      ? {
          x: (targetPosition.x - sample.position.x) / safeDeltaSeconds,
          y: (targetPosition.y - sample.position.y) / safeDeltaSeconds,
        }
      : { x: 0, y: 0 }
    const speedPxPerSecond = vectorMagnitude(velocity)

    return {
      velocity,
      speedPxPerSecond,
      inputActive: speedPxPerSecond > CAMERA_LEAD_SPEED_EPSILON,
      correcting: false,
      movementMode: "walk",
      source: speedPxPerSecond > CAMERA_LEAD_SPEED_EPSILON
        ? "derived_target_delta"
        : "idle",
    }
  }

  private computeTargetLead(motion: RendererCameraFollowMotion & {
    readonly source: RendererCameraLeadState["source"]
  }): {
    readonly active: boolean
    readonly offset: Vector2
    readonly correctionDampingActive: boolean
  } {
    const maxDistancePx = this.maxLeadDistancePx(motion.movementMode)
    const speedRatio = clamp(
      motion.speedPxPerSecond / (motion.movementMode === "run" ? 148 : 88),
      0,
      1,
    )
    const correctionDampingActive = motion.correcting && !motion.inputActive
    const correctionScale = correctionDampingActive
      ? CAMERA_LEAD_CORRECTION_DAMPING
      : motion.correcting
        ? 0.62
        : 1
    const active =
      motion.speedPxPerSecond > CAMERA_LEAD_SPEED_EPSILON &&
      vectorMagnitude(motion.velocity) > CAMERA_LEAD_SPEED_EPSILON
    const distancePx = active
      ? maxDistancePx * speedRatio * correctionScale
      : 0
    const normal = active ? normalizeVector(motion.velocity) : { x: 0, y: 0 }

    return {
      active,
      offset: {
        x: normal.x * distancePx,
        y: normal.y * distancePx,
      },
      correctionDampingActive,
    }
  }

  private maxLeadDistancePx(
    movementMode: RendererCameraFollowMotion["movementMode"],
  ): number {
    return movementMode === "run" ? CAMERA_RUN_LEAD_MAX_PX : CAMERA_WALK_LEAD_MAX_PX
  }

  private getLeadState(): RendererCameraLeadState {
    const movementMode = this.followTarget?.motion?.movementMode ?? "walk"

    return {
      enabled: this.mode === "follow_player" && Boolean(this.followTarget),
      active: vectorMagnitude(this.leadOffset) >= 1,
      source: this.leadSource,
      offset: roundedVector(this.leadOffset),
      targetOffset: roundedVector(this.targetLeadOffset),
      velocity: roundedVector(this.followVelocity),
      speedPxPerSecond: roundTo(this.followSpeedPxPerSecond, 2),
      maxDistancePx: this.maxLeadDistancePx(movementMode),
      smoothingTimeConstantMs: this.leadSmoothingTimeConstantMs,
      correctionDampingActive: this.leadCorrectionDampingActive,
    }
  }
}

function smoothingFactor(deltaMs: number, timeConstantMs: number): number {
  if (timeConstantMs <= 0) return 1
  return 1 - Math.exp(-Math.max(0, deltaMs) / timeConstantMs)
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount
}

function vectorMagnitude(vector: Vector2): number {
  return Math.hypot(vector.x, vector.y)
}

function normalizeVector(vector: Vector2): Vector2 {
  const length = vectorMagnitude(vector)
  if (length === 0) return { x: 0, y: 0 }

  return {
    x: vector.x / length,
    y: vector.y / length,
  }
}

function roundedVector(vector: Vector2): Vector2 {
  return {
    x: roundTo(vector.x, 2),
    y: roundTo(vector.y, 2),
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
