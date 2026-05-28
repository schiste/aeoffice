import {
  directionForMovementVector,
  entityStateFromSnapshotPlayer,
  movementModeForMoveIntent,
  movementVectorForDirection,
  movementVectorForMoveIntent,
  serverTickMetadataForSnapshot,
  type Direction,
  type EntityState as ProtocolEntityState,
  type MoveIntentMessage,
  type MovementMode,
  type MovementReconciliationPayload,
  type MovementVector,
  type WorldSnapshotInputStats,
  type WorldSnapshotMessage,
  type WorldSnapshotPlayer,
} from "@aedventure/game-protocol"

export interface Vector2 {
  readonly x: number
  readonly y: number
}

export interface Size {
  readonly width: number
  readonly height: number
}

export interface TileCoordinate {
  readonly x: number
  readonly y: number
}

export interface Rectangle {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface CollisionMap {
  readonly width: number
  readonly height: number
  readonly tileSize: number
  readonly blockedTiles: readonly TileCoordinate[]
}

export interface CollisionSlideOptions {
  readonly maxNudgePx?: number
  readonly nudgeStepPx?: number
}

export interface Zone {
  readonly id: string
  readonly bounds: Rectangle
  readonly requiredPermission?: string
}

export interface MovementSimulationInput {
  readonly current: Vector2
  readonly vector: MovementVector
  readonly seq: number
  readonly map: CollisionMap
  readonly playerSize: Size
  readonly speedPxPerSecond: number
  readonly deltaMs: number
  readonly collisionSlide?: CollisionSlideOptions
  readonly zones?: readonly Zone[]
  readonly currentZoneIds?: readonly string[]
  readonly permissions?: readonly string[]
}

export interface MovementSimulationResult {
  readonly accepted: boolean
  readonly reason?: "collision" | "speed_limit" | "zone_permission"
  readonly seqAck: number
  readonly position: Vector2
  readonly attemptedPosition: Vector2
  readonly requestedVector: MovementVector
  readonly appliedVector: MovementVector
  readonly collisionSlide: boolean
  readonly collisionSlideAxis?: "x" | "y" | "corner"
  readonly collisionSlideDistancePx: number
  readonly direction: Direction
  readonly enteredZoneIds: readonly string[]
  readonly leftZoneIds: readonly string[]
}

export interface SimulationEntityState {
  readonly entityId: string
  readonly entityKind?: string
  readonly position: Vector2
  readonly direction: Direction
  readonly zoneIds?: readonly string[]
  readonly lastSeqAck?: number
  readonly movementMode?: MovementMode
}

export interface MovementSpeedConfig {
  readonly speedPxPerSecond: number
  readonly runSpeedPxPerSecond?: number
}

export interface ApplyMovementIntentToEntityInput {
  readonly entity: SimulationEntityState
  readonly message: MoveIntentMessage
  readonly map: CollisionMap
  readonly playerSize: Size
  readonly speed: MovementSpeedConfig
  readonly tickMs: number
  readonly nowMs: number
  readonly deltaMs?: number
  readonly previousProcessedAtMs?: number
  readonly collisionSlide?: CollisionSlideOptions
  readonly zones?: readonly Zone[]
  readonly permissions?: readonly string[]
}

export interface ApplyMovementIntentToEntityResult {
  readonly entity: SimulationEntityState
  readonly movement: MovementSimulationResult
  readonly movementMode: MovementMode
  readonly speedPxPerSecond: number
  readonly deltaMs: number
  readonly processedAtMs: number
  readonly reconciliation: MovementReconciliationPayload
}

export interface DeterministicTickAdvanceInput {
  readonly currentTick: number
  readonly tickMs: number
  readonly nowMs: number
}

export interface DeterministicTickAdvanceResult {
  readonly tick: number
  readonly tickMs: number
  readonly serverTime: number
}

export interface CreateWorldSnapshotInput {
  readonly roomId: string
  readonly tick: number
  readonly tickMs: number
  readonly serverTime: number
  readonly inputStats: WorldSnapshotInputStats
  readonly players: readonly WorldSnapshotPlayer[]
  readonly entities?: readonly ProtocolEntityState[]
  readonly map?: WorldSnapshotMessage["map"]
}

export interface CreateMovementReconciliationInput {
  readonly seqAck: number
  readonly authoritativePosition: Vector2
  readonly requestedVector?: MovementVector
  readonly appliedVector?: MovementVector
  readonly predictedPosition?: Vector2
  readonly replayFromSeq?: number
  readonly accepted: boolean
  readonly reason?: MovementReconciliationPayload["reason"]
}

export interface ReplayMovementSimulationStep {
  readonly seq: number
  readonly vector: MovementVector
  readonly direction?: Direction
  readonly movementMode?: MovementMode
  readonly deltaMs: number
  readonly speedPxPerSecond?: number
  readonly runSpeedPxPerSecond?: number
}

export interface ReplayMovementSimulationsInput {
  readonly from: Vector2
  readonly steps: readonly ReplayMovementSimulationStep[]
  readonly map: CollisionMap
  readonly playerSize: Size
  readonly collisionSlide?: CollisionSlideOptions
}

export interface ReplayMovementSimulationsResult {
  readonly results: readonly MovementSimulationResult[]
  readonly target: Vector2
}

export const EMPTY_WORLD_SNAPSHOT_INPUT_STATS: WorldSnapshotInputStats = {
  authority: "server_authoritative_fixed_tick",
  inputCoalescing: "latest_intent_per_client_per_tick",
  queuedClientCount: 0,
  processedMoveCount: 0,
  droppedMoveCount: 0,
  maxQueueDepth: 0,
}

const MAX_SIMULATION_STEP_MS = 250
const CORNER_SLIDE_MAX_NUDGE_PX = 10
const CORNER_SLIDE_NUDGE_STEP_PX = 2

export function advanceDeterministicTick(
  input: DeterministicTickAdvanceInput,
): DeterministicTickAdvanceResult {
  return {
    tick: input.currentTick + 1,
    tickMs: input.tickMs,
    serverTime: input.nowMs,
  }
}

export function simulationDeltaMs(
  previousProcessedAtMs: number | undefined,
  nowMs: number,
  tickMs: number,
): number {
  const previous = previousProcessedAtMs ?? nowMs - tickMs
  return Math.min(tickMs, Math.max(0, nowMs - previous))
}

export function movementSpeedPxPerSecond(
  config: MovementSpeedConfig,
  movementMode: MovementMode,
): number {
  if (movementMode === "run") {
    return config.runSpeedPxPerSecond ?? config.speedPxPerSecond * 1.68
  }

  return config.speedPxPerSecond
}

export function applyMovementIntentToEntity(
  input: ApplyMovementIntentToEntityInput,
): ApplyMovementIntentToEntityResult {
  const movementMode = movementModeForMoveIntent(input.message)
  const speedPxPerSecond = movementSpeedPxPerSecond(input.speed, movementMode)
  const deltaMs = input.deltaMs === undefined
    ? simulationDeltaMs(input.previousProcessedAtMs, input.nowMs, input.tickMs)
    : Math.min(input.tickMs, Math.max(0, input.deltaMs))
  const requestedVector = movementVectorForMoveIntent(input.message)
  const movement = movementVectorIntensity(requestedVector) === 0
    ? idleMovementResult(input, requestedVector)
    : simulateMovement({
        current: input.entity.position,
        vector: requestedVector,
        seq: input.message.seq,
        map: input.map,
        playerSize: input.playerSize,
        speedPxPerSecond,
        deltaMs,
        collisionSlide: input.collisionSlide,
        zones: input.zones,
        currentZoneIds: input.entity.zoneIds,
        permissions: input.permissions,
      })

  const direction = input.message.direction ?? movement.direction
  const entity = {
    ...input.entity,
    position: movement.accepted ? movement.position : input.entity.position,
    direction,
    zoneIds: movement.accepted
      ? applyZoneChanges(
          input.entity.zoneIds ?? [],
          movement.enteredZoneIds,
          movement.leftZoneIds,
        )
      : input.entity.zoneIds,
    lastSeqAck: input.message.seq,
    movementMode,
  }

  return {
    entity,
    movement,
    movementMode,
    speedPxPerSecond,
    deltaMs,
    processedAtMs: input.nowMs,
    reconciliation: createMovementReconciliation({
      seqAck: input.message.seq,
      authoritativePosition: entity.position,
      requestedVector: movement.requestedVector,
      appliedVector: movement.appliedVector,
      accepted: movement.accepted,
      reason: movement.reason,
    }),
  }
}

export function createWorldSnapshot(
  input: CreateWorldSnapshotInput,
): WorldSnapshotMessage {
  const tickMetadata = serverTickMetadataForSnapshot({
    tick: input.tick,
    tickMs: input.tickMs,
    serverTime: input.serverTime,
    inputStats: input.inputStats,
  })

  return {
    type: "world_snapshot",
    roomId: input.roomId,
    tick: tickMetadata.tick,
    tickMs: tickMetadata.tickMs,
    serverTime: tickMetadata.serverTime,
    inputStats: input.inputStats,
    players: input.players,
    entities: input.entities ?? input.players.map(entityStateFromSnapshotPlayer),
    ...(input.map ? { map: input.map } : {}),
    tickMetadata,
  }
}

export function createMovementReconciliation(
  input: CreateMovementReconciliationInput,
): MovementReconciliationPayload {
  return {
    seqAck: input.seqAck,
    authoritativePosition: input.authoritativePosition,
    requestedVector: input.requestedVector,
    appliedVector: input.appliedVector,
    correctionPx: input.predictedPosition
      ? movementCorrectionPx(input.predictedPosition, input.authoritativePosition)
      : undefined,
    replayFromSeq: input.replayFromSeq,
    accepted: input.accepted,
    reason: input.reason,
  }
}

export function replayMovementSimulations(
  input: ReplayMovementSimulationsInput,
): ReplayMovementSimulationsResult {
  let cursor = input.from
  const results = input.steps.map((step) => {
    const result = simulateMovement({
      current: cursor,
      vector: step.vector,
      seq: step.seq,
      map: input.map,
      playerSize: input.playerSize,
      speedPxPerSecond: movementSpeedPxPerSecond(
        {
          speedPxPerSecond: step.speedPxPerSecond ?? 0,
          runSpeedPxPerSecond: step.runSpeedPxPerSecond,
        },
        step.movementMode ?? "walk",
      ),
      deltaMs: step.deltaMs,
      collisionSlide: input.collisionSlide,
    })

    if (result.accepted) {
      cursor = result.position
    }

    return result
  })

  return {
    results,
    target: cursor,
  }
}

export function movementCorrectionPx(
  predictedPosition: Vector2,
  authoritativePosition: Vector2,
): number {
  return Math.hypot(
    authoritativePosition.x - predictedPosition.x,
    authoritativePosition.y - predictedPosition.y,
  )
}

export function simulateMovement(
  input: MovementSimulationInput,
): MovementSimulationResult {
  const normalizedVector = normalizeMovementVector(input.vector)
  const intensity = movementVectorIntensity(input.vector)
  const deltaMs = Math.max(0, Math.min(input.deltaMs, MAX_SIMULATION_STEP_MS))
  const distance = (input.speedPxPerSecond * deltaMs * intensity) / 1000
  const attemptedPosition = moveByVector(
    input.current,
    normalizedVector,
    distance,
  )

  if (input.deltaMs > MAX_SIMULATION_STEP_MS) {
    return rejected(input, attemptedPosition, normalizedVector, "speed_limit")
  }

  const resolvedMovement = resolveMovementAgainstCollision(
    input,
    normalizedVector,
    attemptedPosition,
    distance,
    input.collisionSlide,
  )

  if (!resolvedMovement) {
    return rejected(input, attemptedPosition, normalizedVector, "collision")
  }

  const nextZoneIds = zonesAtPosition(
    input.zones ?? [],
    resolvedMovement.position,
    input.playerSize,
  ).map((zone) => zone.id)
  const permissionFailure = firstMissingZonePermission(
    input.zones ?? [],
    nextZoneIds,
    input.permissions ?? [],
  )

  if (permissionFailure) {
    return rejected(input, attemptedPosition, normalizedVector, "zone_permission")
  }

  const currentZoneIds = input.currentZoneIds ?? []

  return {
    accepted: true,
    seqAck: input.seq,
    position: resolvedMovement.position,
    attemptedPosition,
    requestedVector: normalizedVector,
    appliedVector: resolvedMovement.appliedVector,
    collisionSlide: resolvedMovement.collisionSlide,
    collisionSlideAxis: resolvedMovement.collisionSlideAxis,
    collisionSlideDistancePx: resolvedMovement.collisionSlideDistancePx,
    direction: directionForMovementVector(resolvedMovement.appliedVector),
    enteredZoneIds: nextZoneIds.filter((zoneId) => !currentZoneIds.includes(zoneId)),
    leftZoneIds: currentZoneIds.filter((zoneId) => !nextZoneIds.includes(zoneId)),
  }
}

export function moveByVector(
  current: Vector2,
  vector: MovementVector,
  distance: number,
): Vector2 {
  const normalized = normalizeMovementVector(vector)

  return {
    x: current.x + normalized.x * distance,
    y: current.y + normalized.y * distance,
  }
}

export function moveByDirection(
  current: Vector2,
  direction: Direction,
  distance: number,
): Vector2 {
  return moveByVector(current, movementVectorForDirection(direction), distance)
}

export function collidesWithMap(
  map: CollisionMap,
  position: Vector2,
  size: Size,
): boolean {
  if (
    position.x < 0 ||
    position.y < 0 ||
    position.x + size.width > map.width ||
    position.y + size.height > map.height
  ) {
    return true
  }

  const leftTile = Math.floor(position.x / map.tileSize)
  const rightTile = Math.floor((position.x + size.width - 1) / map.tileSize)
  const topTile = Math.floor(position.y / map.tileSize)
  const bottomTile = Math.floor((position.y + size.height - 1) / map.tileSize)

  for (let tileY = topTile; tileY <= bottomTile; tileY += 1) {
    for (let tileX = leftTile; tileX <= rightTile; tileX += 1) {
      if (isBlockedTile(map, tileX, tileY)) return true
    }
  }

  return false
}

export function zonesAtPosition(
  zones: readonly Zone[],
  position: Vector2,
  size: Size,
): readonly Zone[] {
  const playerBounds = { ...position, ...size }
  return zones.filter((zone) => rectanglesIntersect(playerBounds, zone.bounds))
}

function rejected(
  input: MovementSimulationInput,
  attemptedPosition: Vector2,
  normalizedVector: MovementVector,
  reason: "collision" | "speed_limit" | "zone_permission",
): MovementSimulationResult {
  return {
    accepted: false,
    reason,
    seqAck: input.seq,
    position: input.current,
    attemptedPosition,
    requestedVector: normalizedVector,
    appliedVector: { x: 0, y: 0 },
    collisionSlide: false,
    collisionSlideAxis: undefined,
    collisionSlideDistancePx: 0,
    direction: directionForMovementVector(normalizedVector),
    enteredZoneIds: [],
    leftZoneIds: [],
  }
}

function resolveMovementAgainstCollision(
  input: MovementSimulationInput,
  normalizedVector: MovementVector,
  attemptedPosition: Vector2,
  distance: number,
  collisionSlide: CollisionSlideOptions | undefined,
):
  | {
      readonly position: Vector2
      readonly appliedVector: MovementVector
      readonly collisionSlide: boolean
      readonly collisionSlideAxis?: "x" | "y" | "corner"
      readonly collisionSlideDistancePx: number
    }
  | undefined {
  if (!collidesWithMap(input.map, attemptedPosition, input.playerSize)) {
    return {
      position: attemptedPosition,
      appliedVector: normalizedVector,
      collisionSlide: false,
      collisionSlideAxis: undefined,
      collisionSlideDistancePx: 0,
    }
  }

  const slideCandidates = collisionSlideCandidates(
    input.current,
    normalizedVector,
    distance,
    input.map.tileSize,
    collisionSlide,
  )

  for (const candidate of slideCandidates) {
    if (!collidesWithMap(input.map, candidate.position, input.playerSize)) {
      return {
        ...candidate,
        collisionSlide: true,
      }
    }
  }

  return undefined
}

function collisionSlideCandidates(
  current: Vector2,
  normalizedVector: MovementVector,
  distance: number,
  tileSize: number,
  collisionSlide: CollisionSlideOptions | undefined,
): readonly {
  readonly position: Vector2
  readonly appliedVector: MovementVector
  readonly collisionSlideAxis: "x" | "y" | "corner"
  readonly collisionSlideDistancePx: number
}[] {
  return [
    ...axisSlideCandidates(current, normalizedVector, distance),
    ...cornerSlideCandidates(
      current,
      normalizedVector,
      distance,
      tileSize,
      collisionSlide,
    ),
  ]
}

function axisSlideCandidates(
  current: Vector2,
  normalizedVector: MovementVector,
  distance: number,
): readonly {
  readonly position: Vector2
  readonly appliedVector: MovementVector
  readonly collisionSlideAxis: "x" | "y"
  readonly collisionSlideDistancePx: number
}[] {
  if (normalizedVector.x === 0 || normalizedVector.y === 0) return []

  const horizontal = {
    position: {
      x: current.x + normalizedVector.x * distance,
      y: current.y,
    },
    appliedVector: {
      x: Math.sign(normalizedVector.x),
      y: 0,
    },
    collisionSlideAxis: "x" as const,
    collisionSlideDistancePx: distance,
  }
  const vertical = {
    position: {
      x: current.x,
      y: current.y + normalizedVector.y * distance,
    },
    appliedVector: {
      x: 0,
      y: Math.sign(normalizedVector.y),
    },
    collisionSlideAxis: "y" as const,
    collisionSlideDistancePx: distance,
  }

  return Math.abs(normalizedVector.x) >= Math.abs(normalizedVector.y)
    ? [horizontal, vertical]
    : [vertical, horizontal]
}

function cornerSlideCandidates(
  current: Vector2,
  normalizedVector: MovementVector,
  distance: number,
  tileSize: number,
  collisionSlide: CollisionSlideOptions | undefined,
): readonly {
  readonly position: Vector2
  readonly appliedVector: MovementVector
  readonly collisionSlideAxis: "corner"
  readonly collisionSlideDistancePx: number
}[] {
  const candidates: {
    readonly position: Vector2
    readonly appliedVector: MovementVector
    readonly collisionSlideAxis: "corner"
    readonly collisionSlideDistancePx: number
  }[] = []
  const configuredMaxNudgePx =
    collisionSlide?.maxNudgePx ?? CORNER_SLIDE_MAX_NUDGE_PX
  if (configuredMaxNudgePx <= 0) return candidates

  const maxNudgePx = Math.min(configuredMaxNudgePx, tileSize / 2)
  const nudgeStepPx = Math.max(
    0.5,
    collisionSlide?.nudgeStepPx ?? CORNER_SLIDE_NUDGE_STEP_PX,
  )
  const nudgeDistances = orderedNudgeDistances(
    maxNudgePx,
    nudgeStepPx,
  )
  const primaryAxis =
    Math.abs(normalizedVector.x) >= Math.abs(normalizedVector.y) ? "x" : "y"

  if (normalizedVector.x !== 0) {
    candidates.push(
      ...nudgeDistances.map((nudge) => ({
        position: {
          x: current.x + normalizedVector.x * distance,
          y: current.y + nudge,
        },
        appliedVector: normalizeMovementVector({
          x: Math.sign(normalizedVector.x),
          y: nudge / Math.max(distance, 1),
        }),
        collisionSlideAxis: "corner" as const,
        collisionSlideDistancePx: Math.hypot(
          normalizedVector.x * distance,
          nudge,
        ),
      })),
    )
  }

  if (normalizedVector.y !== 0) {
    candidates.push(
      ...nudgeDistances.map((nudge) => ({
        position: {
          x: current.x + nudge,
          y: current.y + normalizedVector.y * distance,
        },
        appliedVector: normalizeMovementVector({
          x: nudge / Math.max(distance, 1),
          y: Math.sign(normalizedVector.y),
        }),
        collisionSlideAxis: "corner" as const,
        collisionSlideDistancePx: Math.hypot(
          nudge,
          normalizedVector.y * distance,
        ),
      })),
    )
  }

  return candidates.sort((a, b) => {
    const aPrimary =
      primaryAxis === "x" ? Math.abs(a.appliedVector.x) : Math.abs(a.appliedVector.y)
    const bPrimary =
      primaryAxis === "x" ? Math.abs(b.appliedVector.x) : Math.abs(b.appliedVector.y)
    return bPrimary - aPrimary
  })
}

function orderedNudgeDistances(maxNudgePx: number, stepPx: number): readonly number[] {
  const nudges: number[] = []

  for (let nudge = stepPx; nudge <= maxNudgePx; nudge += stepPx) {
    nudges.push(-nudge, nudge)
  }

  return nudges
}

export function normalizeMovementVector(vector: MovementVector): MovementVector {
  const length = Math.hypot(vector.x, vector.y)
  if (length === 0) return { x: 0, y: 1 }

  return {
    x: vector.x / length,
    y: vector.y / length,
  }
}

export function movementVectorIntensity(vector: MovementVector): number {
  return Math.min(1, Math.hypot(vector.x, vector.y))
}

function firstMissingZonePermission(
  zones: readonly Zone[],
  nextZoneIds: readonly string[],
  permissions: readonly string[],
): Zone | undefined {
  return zones.find(
    (zone) =>
      nextZoneIds.includes(zone.id) &&
      zone.requiredPermission !== undefined &&
      !permissions.includes(zone.requiredPermission),
  )
}

export function isBlockedTile(map: CollisionMap, x: number, y: number): boolean {
  return map.blockedTiles.some((tile) => tile.x === x && tile.y === y)
}

function rectanglesIntersect(a: Rectangle, b: Rectangle): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

function idleMovementResult(
  input: ApplyMovementIntentToEntityInput,
  requestedVector: MovementVector,
): MovementSimulationResult {
  return {
    accepted: true,
    seqAck: input.message.seq,
    position: input.entity.position,
    attemptedPosition: input.entity.position,
    requestedVector,
    appliedVector: { x: 0, y: 0 },
    collisionSlide: false,
    collisionSlideAxis: undefined,
    collisionSlideDistancePx: 0,
    direction: input.message.direction ?? input.entity.direction,
    enteredZoneIds: [],
    leftZoneIds: [],
  }
}

export function applyZoneChanges(
  currentZoneIds: readonly string[],
  enteredZoneIds: readonly string[],
  leftZoneIds: readonly string[],
): readonly string[] {
  const remaining = currentZoneIds.filter((zoneId) => !leftZoneIds.includes(zoneId))
  const merged = [...remaining]

  for (const zoneId of enteredZoneIds) {
    if (!merged.includes(zoneId)) merged.push(zoneId)
  }

  return merged
}
