import {
  collidesWithMap,
  moveByDirection,
  type CollisionMap,
  type Size,
} from "@aedventure/map-engine"

type Direction = "up" | "down" | "left" | "right"

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
  readonly from: Vector2
  readonly attempted: Vector2
  readonly target: Vector2
  readonly startedAtMs: number
  readonly deltaMs: number
  readonly distance: number
  readonly blockedLocally: boolean
}

export interface MovementPredictionState {
  active?: ClientMovementPrediction
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
  readonly direction: Direction
  readonly from: Vector2
  readonly map: CollisionMap
  readonly lastSentAtMs?: number
  readonly nowMs: number
  readonly playerSize?: Size
  readonly speedPxPerSecond?: number
}

export const CLIENT_PREDICTION_SPEED_PX_PER_SECOND = 64
export const CLIENT_PREDICTION_MAX_STEP_MS = 250
export const CLIENT_PREDICTION_PLAYER_SIZE: Size = {
  width: 16,
  height: 16,
}
export const CLIENT_PREDICTION_POSITION_EPSILON_PX = 1.75

export function initialMovementPredictionState(): MovementPredictionState {
  return {
    active: undefined,
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
    input.speedPxPerSecond ?? CLIENT_PREDICTION_SPEED_PX_PER_SECOND
  const deltaMs = movementPredictionDeltaMs(input.lastSentAtMs, input.nowMs)
  const distance = (speedPxPerSecond * deltaMs) / 1000
  const attempted = moveByDirection(input.from, input.direction, distance)
  const blockedLocally = collidesWithMap(input.map, attempted, playerSize)

  return {
    seq: input.seq,
    direction: input.direction,
    from: input.from,
    attempted,
    target: blockedLocally ? input.from : attempted,
    startedAtMs: input.nowMs,
    deltaMs,
    distance,
    blockedLocally,
  }
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
