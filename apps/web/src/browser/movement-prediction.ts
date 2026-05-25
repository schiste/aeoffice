import {
  type CollisionMap,
  type Size,
  simulateMovement,
} from "@aedventure/map-engine"
import {
  directionForMovementVector,
  type Direction,
  type MovementMode,
  type MovementVector,
} from "@aedventure/protocol"

interface Vector2 {
  readonly x: number
  readonly y: number
}

export type MovementPredictionOutcome =
  | "idle"
  | "predicted"
  | "confirmed"
  | "corrected"
  | "client_blocked"
  | "server_rejected"

export interface ClientMovementPrediction {
  readonly seq: number
  readonly direction: Direction
  readonly movementMode: MovementMode
  readonly requestedVector: MovementVector
  readonly appliedVector: MovementVector
  readonly from: Vector2
  readonly attempted: Vector2
  readonly target: Vector2
  readonly startedAtMs: number
  readonly deltaMs: number
  readonly distance: number
  readonly speedPxPerSecond: number
  readonly blockedLocally: boolean
  readonly collisionSlide: boolean
}

export interface MovementPredictionState {
  active?: ClientMovementPrediction
  last?: ClientMovementPrediction
  lastSentAtMs?: number
  totalPredicted: number
  totalConfirmed: number
  totalCorrected: number
  totalClientBlocked: number
  totalServerRejected: number
  lastOutcome: MovementPredictionOutcome
  lastCorrectionPx?: number
}

export interface CreateClientMovementPredictionInput {
  readonly seq: number
  readonly vector: MovementVector
  readonly direction?: Direction
  readonly movementMode?: MovementMode
  readonly from: Vector2
  readonly map: CollisionMap
  readonly lastSentAtMs?: number
  readonly nowMs: number
  readonly playerSize?: Size
  readonly speedPxPerSecond?: number
  readonly runSpeedPxPerSecond?: number
}

export const CLIENT_WALK_SPEED_PX_PER_SECOND = 88
export const CLIENT_RUN_SPEED_PX_PER_SECOND = 148
export const CLIENT_PREDICTION_SPEED_PX_PER_SECOND =
  CLIENT_WALK_SPEED_PX_PER_SECOND
export const CLIENT_MOVEMENT_FRAME_MS = 60
export const CLIENT_PREDICTION_MAX_STEP_MS = CLIENT_MOVEMENT_FRAME_MS
export const CLIENT_PREDICTION_PLAYER_SIZE: Size = {
  width: 16,
  height: 16,
}
export const CLIENT_PREDICTION_POSITION_EPSILON_PX = 1.75

export function initialMovementPredictionState(): MovementPredictionState {
  return {
    active: undefined,
    last: undefined,
    lastSentAtMs: undefined,
    totalPredicted: 0,
    totalConfirmed: 0,
    totalCorrected: 0,
    totalClientBlocked: 0,
    totalServerRejected: 0,
    lastOutcome: "idle",
    lastCorrectionPx: undefined,
  }
}

export function createClientMovementPrediction(
  input: CreateClientMovementPredictionInput,
): ClientMovementPrediction {
  const playerSize = input.playerSize ?? CLIENT_PREDICTION_PLAYER_SIZE
  const speedPxPerSecond =
    movementSpeedPxPerSecond(input.movementMode ?? "walk", input)
  const deltaMs = movementPredictionDeltaMs(input.lastSentAtMs, input.nowMs)
  const distance = (speedPxPerSecond * deltaMs) / 1000
  const result = simulateMovement({
    current: input.from,
    vector: input.vector,
    seq: input.seq,
    map: input.map,
    playerSize,
    speedPxPerSecond,
    deltaMs,
  })

  return {
    seq: input.seq,
    direction: input.direction ?? directionForMovementVector(input.vector),
    movementMode: input.movementMode ?? "walk",
    requestedVector: result.requestedVector,
    appliedVector: result.appliedVector,
    from: input.from,
    attempted: result.attemptedPosition,
    target: result.position,
    startedAtMs: input.nowMs,
    deltaMs,
    distance,
    speedPxPerSecond,
    blockedLocally: !result.accepted,
    collisionSlide: result.collisionSlide,
  }
}

function movementSpeedPxPerSecond(
  movementMode: MovementMode,
  input: Pick<
    CreateClientMovementPredictionInput,
    "speedPxPerSecond" | "runSpeedPxPerSecond"
  >,
): number {
  if (movementMode === "run") {
    return input.runSpeedPxPerSecond ?? CLIENT_RUN_SPEED_PX_PER_SECOND
  }

  return input.speedPxPerSecond ?? CLIENT_WALK_SPEED_PX_PER_SECOND
}

export function movementPredictionCorrectionPx(
  prediction: ClientMovementPrediction,
  authoritativePosition: Vector2,
): number {
  const deltaX = authoritativePosition.x - prediction.target.x
  const deltaY = authoritativePosition.y - prediction.target.y
  return Math.hypot(deltaX, deltaY)
}

export function movementPredictionMatches(
  prediction: ClientMovementPrediction,
  authoritativePosition: Vector2,
): boolean {
  return (
    movementPredictionCorrectionPx(prediction, authoritativePosition) <=
    CLIENT_PREDICTION_POSITION_EPSILON_PX
  )
}

function movementPredictionDeltaMs(
  lastSentAtMs: number | undefined,
  nowMs: number,
): number {
  const previousSentAtMs = lastSentAtMs ?? nowMs - CLIENT_PREDICTION_MAX_STEP_MS
  return Math.max(
    0,
    Math.min(nowMs - previousSentAtMs, CLIENT_PREDICTION_MAX_STEP_MS),
  )
}
