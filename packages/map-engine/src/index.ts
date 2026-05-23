import type { Direction } from "@aedventure/protocol"

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
  readonly direction: Direction
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
  readonly direction: Direction
  readonly enteredZoneIds: readonly string[]
  readonly leftZoneIds: readonly string[]
}

const MAX_SIMULATION_STEP_MS = 250

export function simulateMovement(
  input: MovementSimulationInput,
): MovementSimulationResult {
  const deltaMs = Math.max(0, Math.min(input.deltaMs, MAX_SIMULATION_STEP_MS))
  const attemptedPosition = moveByDirection(
    input.current,
    input.direction,
    (input.speedPxPerSecond * deltaMs) / 1000,
  )

  if (input.deltaMs > MAX_SIMULATION_STEP_MS) {
    return rejected(input, attemptedPosition, "speed_limit")
  }

  if (collidesWithMap(input.map, attemptedPosition, input.playerSize)) {
    return rejected(input, attemptedPosition, "collision")
  }

  const nextZoneIds = zonesAtPosition(
    input.zones ?? [],
    attemptedPosition,
    input.playerSize,
  ).map((zone) => zone.id)
  const permissionFailure = firstMissingZonePermission(
    input.zones ?? [],
    nextZoneIds,
    input.permissions ?? [],
  )

  if (permissionFailure) {
    return rejected(input, attemptedPosition, "zone_permission")
  }

  const currentZoneIds = input.currentZoneIds ?? []

  return {
    accepted: true,
    seqAck: input.seq,
    position: attemptedPosition,
    attemptedPosition,
    direction: input.direction,
    enteredZoneIds: nextZoneIds.filter((zoneId) => !currentZoneIds.includes(zoneId)),
    leftZoneIds: currentZoneIds.filter((zoneId) => !nextZoneIds.includes(zoneId)),
  }
}

export function moveByDirection(
  current: Vector2,
  direction: Direction,
  distance: number,
): Vector2 {
  switch (direction) {
    case "up":
      return { x: current.x, y: current.y - distance }
    case "down":
      return { x: current.x, y: current.y + distance }
    case "left":
      return { x: current.x - distance, y: current.y }
    case "right":
      return { x: current.x + distance, y: current.y }
  }
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
  reason: "collision" | "speed_limit" | "zone_permission",
): MovementSimulationResult {
  return {
    accepted: false,
    reason,
    seqAck: input.seq,
    position: input.current,
    attemptedPosition,
    direction: input.direction,
    enteredZoneIds: [],
    leftZoneIds: [],
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
