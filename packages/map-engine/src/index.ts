import {
  directionForMovementVector,
  movementVectorForDirection,
  type Direction,
  type MovementVector,
} from "@aedventure/protocol"

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

const MAX_SIMULATION_STEP_MS = 250
const CORNER_SLIDE_MAX_NUDGE_PX = 10
const CORNER_SLIDE_NUDGE_STEP_PX = 2

export function simulateMovement(
  input: MovementSimulationInput,
): MovementSimulationResult {
  const normalizedVector = normalizeMovementVector(input.vector)
  const deltaMs = Math.max(0, Math.min(input.deltaMs, MAX_SIMULATION_STEP_MS))
  const distance = (input.speedPxPerSecond * deltaMs) / 1000
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
): readonly {
  readonly position: Vector2
  readonly appliedVector: MovementVector
  readonly collisionSlideAxis: "x" | "y" | "corner"
  readonly collisionSlideDistancePx: number
}[] {
  return [
    ...axisSlideCandidates(current, normalizedVector, distance),
    ...cornerSlideCandidates(current, normalizedVector, distance, tileSize),
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
  const maxNudgePx = Math.min(CORNER_SLIDE_MAX_NUDGE_PX, tileSize / 3)
  const nudgeDistances = orderedNudgeDistances(
    maxNudgePx,
    CORNER_SLIDE_NUDGE_STEP_PX,
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

function normalizeMovementVector(vector: MovementVector): MovementVector {
  const length = Math.hypot(vector.x, vector.y)
  if (length === 0) return { x: 0, y: 1 }

  return {
    x: vector.x / length,
    y: vector.y / length,
  }
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

function isBlockedTile(map: CollisionMap, x: number, y: number): boolean {
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
