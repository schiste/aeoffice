import {
  type CollisionSlideOptions,
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
import {
  MOVEMENT_RUN_SPEED_PX_PER_SECOND,
  MOVEMENT_WALK_SPEED_PX_PER_SECOND,
} from "./movement-feel"

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
  | "server_superseded"

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
  readonly collisionSlideAxis?: "x" | "y" | "corner"
  readonly collisionSlideDistancePx: number
}

export interface MovementPredictionState {
  active?: ClientMovementPrediction
  pending: ClientMovementPrediction[]
  last?: ClientMovementPrediction
  lastAckSeq?: number
  lastSentAtMs?: number
  lastReplayCount: number
  totalReplayed: number
  totalPredicted: number
  totalConfirmed: number
  totalCorrected: number
  totalClientBlocked: number
  totalServerRejected: number
  lastOutcome: MovementPredictionOutcome
  lastCorrectionPx?: number
  lastReplayCorrectionPx?: number
  lastReplayTarget?: Vector2
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
  readonly deltaMs?: number
  readonly playerSize?: Size
  readonly collisionSlide?: CollisionSlideOptions
  readonly speedPxPerSecond?: number
  readonly runSpeedPxPerSecond?: number
}

export interface ReplayMovementPredictionsInput {
  readonly from: Vector2
  readonly predictions: readonly ClientMovementPrediction[]
  readonly map: CollisionMap
  readonly playerSize?: Size
  readonly collisionSlide?: CollisionSlideOptions
}

export interface ReplayMovementPredictionsResult {
  readonly predictions: ClientMovementPrediction[]
  readonly target: Vector2
}

export const CLIENT_WALK_SPEED_PX_PER_SECOND =
  MOVEMENT_WALK_SPEED_PX_PER_SECOND
export const CLIENT_RUN_SPEED_PX_PER_SECOND = MOVEMENT_RUN_SPEED_PX_PER_SECOND
export const CLIENT_PREDICTION_SPEED_PX_PER_SECOND =
  CLIENT_WALK_SPEED_PX_PER_SECOND
export const CLIENT_MOVEMENT_FRAME_MS = 50
export const CLIENT_PREDICTION_MAX_STEP_MS = CLIENT_MOVEMENT_FRAME_MS
export const CLIENT_PREDICTION_PLAYER_SIZE: Size = {
  width: 16,
  height: 16,
}
export const CLIENT_PREDICTION_POSITION_EPSILON_PX = 1.75
export const CLIENT_INPUT_HISTORY_LIMIT = 48

export function initialMovementPredictionState(): MovementPredictionState {
  return {
    active: undefined,
    pending: [],
    last: undefined,
    lastAckSeq: undefined,
    lastSentAtMs: undefined,
    lastReplayCount: 0,
    totalReplayed: 0,
    totalPredicted: 0,
    totalConfirmed: 0,
    totalCorrected: 0,
    totalClientBlocked: 0,
    totalServerRejected: 0,
    lastOutcome: "idle",
    lastCorrectionPx: undefined,
    lastReplayCorrectionPx: undefined,
    lastReplayTarget: undefined,
  }
}

export function createClientMovementPrediction(
  input: CreateClientMovementPredictionInput,
): ClientMovementPrediction {
  const playerSize = input.playerSize ?? CLIENT_PREDICTION_PLAYER_SIZE
  const speedPxPerSecond =
    movementSpeedPxPerSecond(input.movementMode ?? "walk", input)
  const intensity = movementVectorIntensity(input.vector)
  const deltaMs = movementPredictionDeltaMs(
    input.lastSentAtMs,
    input.nowMs,
    input.deltaMs,
  )
  const distance = (speedPxPerSecond * deltaMs * intensity) / 1000
  if (intensity === 0) {
    return {
      seq: input.seq,
      direction: input.direction ?? "down",
      movementMode: input.movementMode ?? "walk",
      requestedVector: { x: 0, y: 0 },
      appliedVector: { x: 0, y: 0 },
      from: input.from,
      attempted: input.from,
      target: input.from,
      startedAtMs: input.nowMs,
      deltaMs: 0,
      distance: 0,
      speedPxPerSecond,
      blockedLocally: false,
      collisionSlide: false,
      collisionSlideAxis: undefined,
      collisionSlideDistancePx: 0,
    }
  }
  const result = simulateMovement({
    current: input.from,
    vector: input.vector,
    seq: input.seq,
    map: input.map,
    playerSize,
    speedPxPerSecond,
    deltaMs,
    collisionSlide: input.collisionSlide,
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
    collisionSlideAxis: result.collisionSlideAxis,
    collisionSlideDistancePx: result.collisionSlideDistancePx,
  }
}

export function replayMovementPredictions(
  input: ReplayMovementPredictionsInput,
): ReplayMovementPredictionsResult {
  let cursor = input.from
  const predictions = input.predictions.map((prediction) => {
    const replayed = createClientMovementPrediction({
      seq: prediction.seq,
      vector: prediction.requestedVector,
      direction: prediction.direction,
      movementMode: prediction.movementMode,
      from: cursor,
      map: input.map,
      nowMs: prediction.startedAtMs,
      deltaMs: prediction.deltaMs,
      playerSize: input.playerSize,
      collisionSlide: input.collisionSlide,
      speedPxPerSecond:
        prediction.movementMode === "walk"
          ? prediction.speedPxPerSecond
          : undefined,
      runSpeedPxPerSecond:
        prediction.movementMode === "run"
          ? prediction.speedPxPerSecond
          : undefined,
    })
    cursor = replayed.target
    return replayed
  })

  return {
    predictions,
    target: cursor,
  }
}

export function trimMovementPredictionHistory(
  predictions: readonly ClientMovementPrediction[],
): ClientMovementPrediction[] {
  return predictions.slice(-CLIENT_INPUT_HISTORY_LIMIT)
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

function movementVectorIntensity(vector: MovementVector): number {
  return Math.min(1, Math.hypot(vector.x, vector.y))
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
  overrideDeltaMs: number | undefined,
): number {
  if (overrideDeltaMs !== undefined) {
    return Math.max(
      0,
      Math.min(overrideDeltaMs, CLIENT_PREDICTION_MAX_STEP_MS),
    )
  }

  const previousSentAtMs = lastSentAtMs ?? nowMs - CLIENT_PREDICTION_MAX_STEP_MS
  return Math.max(
    0,
    Math.min(nowMs - previousSentAtMs, CLIENT_PREDICTION_MAX_STEP_MS),
  )
}
