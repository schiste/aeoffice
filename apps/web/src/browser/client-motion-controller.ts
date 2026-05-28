import {
  type CollisionMap,
  type Size,
  simulateMovement,
} from "@aedventure/game-core"
import {
  directionForMovementVector,
  type Direction,
  type MovementMode,
  type MovementVector,
} from "@aedventure/game-protocol"

import {
  DEFAULT_MOVEMENT_FEEL,
  movementCollisionBodySize,
  movementCollisionSlideOptions,
  type MovementFeelTuning,
} from "./movement-feel"

interface Vector2 {
  readonly x: number
  readonly y: number
}

export interface ClientMotionIntent {
  readonly vector: MovementVector
  readonly direction: Direction
  readonly movementMode: MovementMode
}

export interface ClientMotionStepInput {
  readonly nowMs: number
  readonly intent?: ClientMotionIntent
  readonly map?: CollisionMap
  readonly playerSize?: Size
}

export interface ClientMotionReconcileOptions {
  readonly rejected?: boolean
  readonly force?: boolean
}

export interface ClientMotionSnapshot {
  readonly active: boolean
  readonly inputActive: boolean
  readonly correcting: boolean
  readonly position: Vector2
  readonly velocity: Vector2
  readonly speedPxPerSecond: number
  readonly targetSpeedPxPerSecond: number
  readonly direction: Direction
  readonly movementMode: MovementMode
  readonly lastFrameDeltaMs: number
  readonly correctionPx: number
}

export class ClientMotionController {
  private position: Vector2 = { x: 0, y: 0 }
  private velocity: Vector2 = { x: 0, y: 0 }
  private correction: Vector2 = { x: 0, y: 0 }
  private direction: Direction = "down"
  private movementMode: MovementMode = "walk"
  private lastFrameAtMs?: number
  private lastFrameDeltaMs = 0
  private currentTargetSpeedPxPerSecond = 0
  private inputActive = false
  private initialized = false
  private feel: MovementFeelTuning = DEFAULT_MOVEMENT_FEEL

  constructor(feel: MovementFeelTuning = DEFAULT_MOVEMENT_FEEL) {
    this.feel = feel
  }

  setFeel(feel: MovementFeelTuning): void {
    this.feel = feel
  }

  getFeel(): MovementFeelTuning {
    return this.feel
  }

  reset(position: Vector2, direction: Direction = "down"): void {
    this.position = position
    this.velocity = { x: 0, y: 0 }
    this.correction = { x: 0, y: 0 }
    this.direction = direction
    this.movementMode = "walk"
    this.lastFrameAtMs = undefined
    this.lastFrameDeltaMs = 0
    this.currentTargetSpeedPxPerSecond = 0
    this.inputActive = false
    this.initialized = true
  }

  reconcile(
    authoritativePosition: Vector2,
    options: ClientMotionReconcileOptions = {},
  ): void {
    if (!this.initialized) {
      this.reset(authoritativePosition)
      return
    }

    const correction = subtract(authoritativePosition, this.position)
    const correctionPx = magnitude(correction)

    if (
      options.force ||
      options.rejected ||
      correctionPx >= this.feel.hardCorrectionThresholdPx
    ) {
      this.position = authoritativePosition
      this.velocity = { x: 0, y: 0 }
      this.correction = { x: 0, y: 0 }
      return
    }

    if (correctionPx <= this.feel.softCorrectionThresholdPx) {
      this.correction = { x: 0, y: 0 }
      return
    }

    this.correction = correction
  }

  step(input: ClientMotionStepInput): { changed: boolean; snapshot: ClientMotionSnapshot } {
    if (!this.initialized) {
      this.reset({ x: 0, y: 0 })
    }

    const previousPosition = this.position
    const previousVelocity = this.velocity
    const previousDirection = this.direction
    const previousMode = this.movementMode
    const intent = input.intent
    const deltaMs = this.frameDeltaMs(input.nowMs, Boolean(intent))
    const targetVector = intent ? normalizeVector(intent.vector) : { x: 0, y: 0 }
    const targetIntensity = intent ? movementVectorIntensity(intent.vector) : 0
    const targetSpeedPxPerSecond = intent
      ? movementSpeedPxPerSecond(intent.movementMode, this.feel) * targetIntensity
      : 0
    this.currentTargetSpeedPxPerSecond = targetSpeedPxPerSecond
    const targetVelocity = {
      x: targetVector.x * targetSpeedPxPerSecond,
      y: targetVector.y * targetSpeedPxPerSecond,
    }
    const velocityBlend = smoothingFactor(
      deltaMs,
      intent && isTurning(this.velocity, targetVelocity)
        ? this.feel.turnResponseTimeConstantMs
        : intent
          ? this.feel.accelerationTimeConstantMs
          : this.feel.decelerationTimeConstantMs,
    )

    this.inputActive = Boolean(intent)
    this.velocity = {
      x: lerp(this.velocity.x, targetVelocity.x, velocityBlend),
      y: lerp(this.velocity.y, targetVelocity.y, velocityBlend),
    }

    if (
      !intent &&
      magnitude(this.velocity) <= this.feel.stopVelocityEpsilonPxPerSecond
    ) {
      this.velocity = { x: 0, y: 0 }
    }

    if (intent) {
      this.direction = intent.direction
      this.movementMode = intent.movementMode
    }

    this.applyVelocity(deltaMs, input.map, input.playerSize)
    this.applyCorrection(deltaMs)

    const changed =
      distanceBetween(previousPosition, this.position) > 0.01 ||
      distanceBetween(previousVelocity, this.velocity) > 0.01 ||
      previousDirection !== this.direction ||
      previousMode !== this.movementMode ||
      this.isCorrecting()

    return {
      changed,
      snapshot: this.snapshot(),
    }
  }

  snapshot(): ClientMotionSnapshot {
    const speedPxPerSecond = magnitude(this.velocity)

    return {
      active:
        this.inputActive ||
        speedPxPerSecond > this.feel.stopVelocityEpsilonPxPerSecond ||
        this.isCorrecting(),
      inputActive: this.inputActive,
      correcting: this.isCorrecting(),
      position: this.position,
      velocity: this.velocity,
      speedPxPerSecond: Number(speedPxPerSecond.toFixed(2)),
      targetSpeedPxPerSecond: Number(this.currentTargetSpeedPxPerSecond.toFixed(2)),
      direction: this.direction,
      movementMode: this.movementMode,
      lastFrameDeltaMs: Number(this.lastFrameDeltaMs.toFixed(2)),
      correctionPx: Number(magnitude(this.correction).toFixed(2)),
    }
  }

  renderedPosition(fallback: Vector2): Vector2 {
    return this.initialized ? this.position : fallback
  }

  renderedDirection(fallback: Direction): Direction {
    return this.initialized ? this.direction : fallback
  }

  renderedMovementMode(fallback: MovementMode): MovementMode {
    return this.initialized ? this.movementMode : fallback
  }

  private frameDeltaMs(nowMs: number, activeInput: boolean): number {
    const previousFrameAtMs = this.lastFrameAtMs
    this.lastFrameAtMs = nowMs

    if (previousFrameAtMs === undefined) {
      this.lastFrameDeltaMs = 1000 / 60
      return this.lastFrameDeltaMs
    }

    const rawDeltaMs = nowMs - previousFrameAtMs
    this.lastFrameDeltaMs = rawDeltaMs <= 0 && activeInput
      ? 1000 / 120
      : Math.max(0, Math.min(rawDeltaMs, this.feel.frameStepLimitMs))
    return this.lastFrameDeltaMs
  }

  private applyVelocity(
    deltaMs: number,
    map: CollisionMap | undefined,
    playerSize: Size | undefined,
  ): void {
    const speedPxPerSecond = magnitude(this.velocity)
    if (speedPxPerSecond <= this.feel.stopVelocityEpsilonPxPerSecond) return

    const vector = normalizeVector(this.velocity)

    if (!map) {
      this.position = {
        x: this.position.x + vector.x * speedPxPerSecond * deltaMs / 1000,
        y: this.position.y + vector.y * speedPxPerSecond * deltaMs / 1000,
      }
      if (!this.inputActive) {
        this.direction = directionForMovementVector(vector)
      }
      return
    }

    const result = simulateMovement({
      current: this.position,
      vector,
      seq: 0,
      map,
      playerSize: playerSize ?? movementCollisionBodySize(this.feel),
      speedPxPerSecond,
      deltaMs,
      collisionSlide: movementCollisionSlideOptions(this.feel),
    })

    if (!result.accepted) {
      this.velocity = { x: 0, y: 0 }
      return
    }

    this.position = result.position
    if (
      !this.inputActive &&
      (result.appliedVector.x !== 0 || result.appliedVector.y !== 0)
    ) {
      this.direction = directionForMovementVector(result.appliedVector)
    }
    if (result.collisionSlide) {
      this.velocity = {
        x:
          result.appliedVector.x *
          speedPxPerSecond *
          this.feel.collisionSlideSpeedScale,
        y:
          result.appliedVector.y *
          speedPxPerSecond *
          this.feel.collisionSlideSpeedScale,
      }
    }
  }

  private applyCorrection(deltaMs: number): void {
    if (!this.isCorrecting()) return

    const blend = smoothingFactor(
      deltaMs,
      this.inputActive
        ? this.feel.activeCorrectionTimeConstantMs
        : this.feel.idleCorrectionTimeConstantMs,
    )
    const step = {
      x: this.correction.x * blend,
      y: this.correction.y * blend,
    }

    this.position = {
      x: this.position.x + step.x,
      y: this.position.y + step.y,
    }
    this.correction = {
      x: this.correction.x - step.x,
      y: this.correction.y - step.y,
    }

    if (magnitude(this.correction) <= this.feel.correctionEpsilonPx) {
      this.correction = { x: 0, y: 0 }
    }
  }

  private isCorrecting(): boolean {
    return magnitude(this.correction) > this.feel.correctionEpsilonPx
  }
}

function movementSpeedPxPerSecond(
  movementMode: MovementMode,
  feel: MovementFeelTuning,
): number {
  return movementMode === "run"
    ? feel.runSpeedPxPerSecond
    : feel.walkSpeedPxPerSecond
}

function normalizeVector(vector: MovementVector): MovementVector {
  const length = magnitude(vector)
  if (length === 0) return { x: 0, y: 0 }

  return {
    x: vector.x / length,
    y: vector.y / length,
  }
}

function movementVectorIntensity(vector: MovementVector): number {
  return Math.min(1, magnitude(vector))
}

function smoothingFactor(deltaMs: number, timeConstantMs: number): number {
  if (timeConstantMs <= 0) return 1
  return 1 - Math.exp(-deltaMs / timeConstantMs)
}

function isTurning(velocity: Vector2, targetVelocity: Vector2): boolean {
  const speed = magnitude(velocity)
  const targetSpeed = magnitude(targetVelocity)

  if (speed <= 0 || targetSpeed <= 0) return false

  const dot =
    (velocity.x * targetVelocity.x + velocity.y * targetVelocity.y) /
    (speed * targetSpeed)
  return dot < 0.985
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount
}

function subtract(a: Vector2, b: Vector2): Vector2 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  }
}

function magnitude(vector: Vector2): number {
  return Math.hypot(vector.x, vector.y)
}

function distanceBetween(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
