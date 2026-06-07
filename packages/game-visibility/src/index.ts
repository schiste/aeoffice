import {
  serializeCellCoord,
  type CellCoord,
  type GridTopology,
} from "@aedventure/game-topology"

export const VISIBILITY_STATES = ["hidden", "discovered", "visible", "stale"] as const

export type VisibilityState = (typeof VISIBILITY_STATES)[number]

export type VisibilityCoordKey = string

export interface VisibilityEntry {
  readonly state: VisibilityState
  readonly discoveredAt?: number
  readonly lastVisibleAt?: number
  readonly revealSource?: string
}

export type VisibilityMap = ReadonlyMap<VisibilityCoordKey, VisibilityEntry>

export type MutableVisibilityMap = Map<VisibilityCoordKey, VisibilityEntry>

export interface VisibilityValidationResult {
  readonly valid: boolean
  readonly errors: readonly string[]
}

export interface VisibilityRevealOptions {
  readonly now?: number
  readonly revealSource?: string
}

export type KnownFactPolicy = (state: VisibilityState) => boolean

const VISIBILITY_RANK: Record<VisibilityState, number> = {
  hidden: 0,
  stale: 1,
  discovered: 2,
  visible: 3,
}

export const KNOWN_FACT_POLICIES: Record<
  "visibleOnly" | "discoveredOrVisible" | "rememberedOrVisible",
  KnownFactPolicy
> = {
  visibleOnly: (state: VisibilityState) => state === "visible",
  discoveredOrVisible: (state: VisibilityState) =>
    state === "discovered" || state === "visible",
  rememberedOrVisible: (state: VisibilityState) =>
    state === "discovered" || state === "visible" || state === "stale",
}

export function visibilityKey(coord: CellCoord | VisibilityCoordKey): VisibilityCoordKey {
  return typeof coord === "string" ? coord : serializeCellCoord(coord)
}

export function isVisibilityState(value: unknown): value is VisibilityState {
  return typeof value === "string" && VISIBILITY_STATES.includes(value as VisibilityState)
}

export function createVisibilityEntry(
  state: VisibilityState,
  options: VisibilityRevealOptions = {},
): VisibilityEntry {
  const entry: VisibilityEntry = {
    state,
    ...(state !== "hidden" && options.now !== undefined
      ? { discoveredAt: options.now }
      : {}),
    ...(state === "visible" && options.now !== undefined
      ? { lastVisibleAt: options.now }
      : {}),
    ...(options.revealSource ? { revealSource: options.revealSource } : {}),
  }
  return entry
}

export function createVisibilityMap(
  entries: readonly (readonly [CellCoord | VisibilityCoordKey, VisibilityEntry])[] = [],
): MutableVisibilityMap {
  const visibility = new Map<VisibilityCoordKey, VisibilityEntry>()
  for (const [coord, entry] of entries) {
    visibility.set(visibilityKey(coord), normalizeVisibilityEntry(entry))
  }
  return visibility
}

export function getVisibilityEntry(
  visibility: VisibilityMap,
  coord: CellCoord | VisibilityCoordKey,
): VisibilityEntry {
  return visibility.get(visibilityKey(coord)) ?? { state: "hidden" }
}

export function getVisibilityState(
  visibility: VisibilityMap,
  coord: CellCoord | VisibilityCoordKey,
): VisibilityState {
  return getVisibilityEntry(visibility, coord).state
}

export function isVisible(
  visibility: VisibilityMap,
  coord: CellCoord | VisibilityCoordKey,
): boolean {
  return getVisibilityState(visibility, coord) === "visible"
}

export function isKnown(
  visibility: VisibilityMap,
  coord: CellCoord | VisibilityCoordKey,
): boolean {
  return KNOWN_FACT_POLICIES.rememberedOrVisible(getVisibilityState(visibility, coord))
}

export function setVisibilityEntry(
  visibility: VisibilityMap,
  coord: CellCoord | VisibilityCoordKey,
  entry: VisibilityEntry,
): MutableVisibilityMap {
  const next = new Map(visibility)
  next.set(visibilityKey(coord), normalizeVisibilityEntry(entry))
  return next
}

export function mergeVisibilityEntry(
  current: VisibilityEntry | undefined,
  next: VisibilityEntry,
): VisibilityEntry {
  const currentEntry = current ?? { state: "hidden" }
  const normalizedNext = normalizeVisibilityEntry(next)
  const state =
    VISIBILITY_RANK[normalizedNext.state] >= VISIBILITY_RANK[currentEntry.state]
      ? normalizedNext.state
      : currentEntry.state

  return normalizeVisibilityEntry({
    state,
    discoveredAt: earliestDefined(currentEntry.discoveredAt, normalizedNext.discoveredAt),
    lastVisibleAt: latestDefined(currentEntry.lastVisibleAt, normalizedNext.lastVisibleAt),
    revealSource: normalizedNext.revealSource ?? currentEntry.revealSource,
  })
}

export function mergeVisibilityMap(
  visibility: VisibilityMap,
  updates: VisibilityMap,
): MutableVisibilityMap {
  const next = new Map(visibility)
  for (const [key, entry] of updates) {
    next.set(key, mergeVisibilityEntry(next.get(key), entry))
  }
  return next
}

export function coordsInVisibilityRadius<TCoord extends CellCoord>(
  topology: GridTopology<TCoord>,
  origin: TCoord,
  radius: number,
): readonly TCoord[] {
  assertNonNegativeInteger(radius, "radius")
  if (!topology.inBounds(origin)) return []

  const results = new Map<VisibilityCoordKey, TCoord>()
  const queue: { readonly coord: TCoord; readonly distance: number }[] = [
    { coord: origin, distance: 0 },
  ]
  results.set(topology.serialize(origin), origin)

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || current.distance >= radius) continue
    for (const neighbor of topology.neighbors(current.coord)) {
      const key = topology.serialize(neighbor)
      if (results.has(key)) continue
      const distance = topology.distance(origin, neighbor)
      if (distance > radius) continue
      results.set(key, neighbor)
      queue.push({ coord: neighbor, distance })
    }
  }

  return [...results.values()]
}

export function coordsInVisibilityRadiusFromOrigins<TCoord extends CellCoord>(
  topology: GridTopology<TCoord>,
  origins: readonly TCoord[],
  radius: number,
): readonly TCoord[] {
  const results = new Map<VisibilityCoordKey, TCoord>()
  for (const origin of origins) {
    for (const coord of coordsInVisibilityRadius(topology, origin, radius)) {
      results.set(topology.serialize(coord), coord)
    }
  }
  return [...results.values()]
}

export function revealVisibilityRadius<TCoord extends CellCoord>(
  visibility: VisibilityMap,
  topology: GridTopology<TCoord>,
  origins: readonly TCoord[],
  radius: number,
  state: Extract<VisibilityState, "discovered" | "visible">,
  options: VisibilityRevealOptions = {},
): MutableVisibilityMap {
  const next = new Map(visibility)
  for (const coord of coordsInVisibilityRadiusFromOrigins(topology, origins, radius)) {
    const key = topology.serialize(coord)
    next.set(
      key,
      mergeVisibilityEntry(
        next.get(key),
        createVisibilityEntry(state, options),
      ),
    )
  }
  return next
}

export interface FieldOfViewOptions<TCoord extends CellCoord> {
  readonly origin: TCoord
  readonly radius: number
  /** A cell is opaque if it blocks line of sight (e.g. a wall). */
  readonly isOpaque: (coord: TCoord) => boolean
  /**
   * A cell the viewer faces toward (e.g. the square ahead). Combined with
   * `coneHalfAngleDeg` this restricts the FOV to a forward cone. Omit either to
   * get a full 360° occluded FOV.
   */
  readonly facingToward?: TCoord
  /** Half-angle of the forward cone in degrees (e.g. 45 → a 90° cone). */
  readonly coneHalfAngleDeg?: number
  /**
   * Cells within this many rings form the cone's near base: every adjacent cell
   * that is not behind the viewer — front, the two front diagonals, and the two
   * sides — is visible there regardless of the cone angle (a king-move ring minus
   * the rear). Defaults to 0 (a pure cone). Only applies when a facing cone is set.
   */
  readonly peripheralRadius?: number
  /** Whether the origin cell itself is included. Defaults to true. */
  readonly includeOrigin?: boolean
  /** Line-of-sight sampling granularity, in cells. Defaults to 0.25. */
  readonly lineSampleStep?: number
}

/**
 * Occlusion-aware field of view: the cells within `radius` of `origin` that the
 * viewer can actually see — walls (`isOpaque`) block line of sight, and an
 * optional forward cone (`facingToward` + `coneHalfAngleDeg`) limits it to a
 * facing direction. Opaque cells on the boundary are themselves visible (you see
 * the wall face) but occlude everything behind them. Topology-generic.
 */
export function computeFieldOfView<TCoord extends CellCoord>(
  topology: GridTopology<TCoord>,
  options: FieldOfViewOptions<TCoord>,
): readonly TCoord[] {
  const { origin, radius, isOpaque } = options
  assertNonNegativeInteger(radius, "radius")
  if (!topology.inBounds(origin)) return []

  const includeOrigin = options.includeOrigin ?? true
  const sampleStep = Math.max(0.05, options.lineSampleStep ?? 0.25)
  const peripheralRadius = Math.max(0, options.peripheralRadius ?? 0)
  const facing = coneFacingVector(topology, options)
  const cosHalfAngle =
    facing && options.coneHalfAngleDeg !== undefined
      ? Math.cos((clampAngle(options.coneHalfAngleDeg) * Math.PI) / 180)
      : -1

  const originKey = topology.serialize(origin)
  const originWorld = topology.cellToWorld(origin)
  // Near-base radius in world units: a ring of king-moves (so the front diagonals
  // are included, not just the cardinal neighbours).
  const nearBaseWorldRadius =
    peripheralRadius > 0
      ? peripheralRadius * nearestNeighborWorldDistance(topology, origin, originWorld) * Math.SQRT2 +
        1e-6
      : 0
  const visible: TCoord[] = []

  for (const coord of coordsInVisibilityRadius(topology, origin, radius)) {
    if (topology.serialize(coord) === originKey) {
      if (includeOrigin) visible.push(coord)
      continue
    }
    const cellWorld = topology.cellToWorld(coord)
    const dx = cellWorld.x - originWorld.x
    const dy = cellWorld.y - originWorld.y

    if (facing) {
      const length = Math.hypot(dx, dy)
      if (length > 0) {
        const cosine = (dx * facing.x + dy * facing.y) / length
        // In the forward cone, OR in the near base (adjacent ring, not behind).
        const inCone = cosine >= cosHalfAngle
        const inBase = nearBaseWorldRadius > 0 && cosine >= 0 && length <= nearBaseWorldRadius
        if (!inCone && !inBase) continue
      }
    }

    if (hasLineOfSight(topology, origin, coord, originWorld, cellWorld, isOpaque, sampleStep)) {
      visible.push(coord)
    }
  }

  return visible
}

/** Reveal the occluded (optionally cone-limited) FOV, mirroring revealVisibilityRadius. */
export function revealFieldOfView<TCoord extends CellCoord>(
  visibility: VisibilityMap,
  topology: GridTopology<TCoord>,
  options: FieldOfViewOptions<TCoord>,
  state: Extract<VisibilityState, "discovered" | "visible">,
  revealOptions: VisibilityRevealOptions = {},
): MutableVisibilityMap {
  const next = new Map(visibility)
  for (const coord of computeFieldOfView(topology, options)) {
    const key = topology.serialize(coord)
    next.set(key, mergeVisibilityEntry(next.get(key), createVisibilityEntry(state, revealOptions)))
  }
  return next
}

export function markVisibleAsStale(
  visibility: VisibilityMap,
  options: VisibilityRevealOptions = {},
): MutableVisibilityMap {
  const next = new Map<VisibilityCoordKey, VisibilityEntry>()
  for (const [key, entry] of visibility) {
    next.set(
      key,
      entry.state === "visible"
        ? normalizeVisibilityEntry({
            ...entry,
            state: "stale",
            revealSource: options.revealSource ?? entry.revealSource,
          })
        : normalizeVisibilityEntry(entry),
    )
  }
  return next
}

export function filterKnownFacts<TFact>(
  facts: ReadonlyMap<VisibilityCoordKey, TFact>,
  visibility: VisibilityMap,
  policy: KnownFactPolicy = KNOWN_FACT_POLICIES.rememberedOrVisible,
): Map<VisibilityCoordKey, TFact> {
  const known = new Map<VisibilityCoordKey, TFact>()
  for (const [key, fact] of facts) {
    if (policy(getVisibilityState(visibility, key))) known.set(key, fact)
  }
  return known
}

export function knownFactForCell<TFact>(
  facts: ReadonlyMap<VisibilityCoordKey, TFact>,
  visibility: VisibilityMap,
  coord: CellCoord | VisibilityCoordKey,
  policy: KnownFactPolicy = KNOWN_FACT_POLICIES.rememberedOrVisible,
): TFact | undefined {
  const key = visibilityKey(coord)
  return policy(getVisibilityState(visibility, key)) ? facts.get(key) : undefined
}

export function validateVisibilityEntry(
  entry: VisibilityEntry,
  label = "visibility entry",
): VisibilityValidationResult {
  const errors: string[] = []
  if (!isVisibilityState(entry.state)) errors.push(`${label} has invalid state.`)
  if (entry.discoveredAt !== undefined && !Number.isFinite(entry.discoveredAt)) {
    errors.push(`${label} has invalid discoveredAt.`)
  }
  if (entry.lastVisibleAt !== undefined && !Number.isFinite(entry.lastVisibleAt)) {
    errors.push(`${label} has invalid lastVisibleAt.`)
  }
  if (entry.state === "hidden" && entry.lastVisibleAt !== undefined) {
    errors.push(`${label} cannot be hidden and last visible.`)
  }
  return { valid: errors.length === 0, errors }
}

export function validateVisibilityMap(
  visibility: VisibilityMap,
  options: { readonly allowedKeys?: ReadonlySet<VisibilityCoordKey> } = {},
): VisibilityValidationResult {
  const errors: string[] = []
  for (const [key, entry] of visibility) {
    if (key.trim().length === 0) errors.push("visibility map contains an empty key.")
    if (options.allowedKeys && !options.allowedKeys.has(key)) {
      errors.push(`visibility map contains key outside allowed set: ${key}`)
    }
    errors.push(...validateVisibilityEntry(entry, `visibility entry ${key}`).errors)
  }
  return { valid: errors.length === 0, errors }
}

function normalizeVisibilityEntry(entry: VisibilityEntry): VisibilityEntry {
  const state = isVisibilityState(entry.state) ? entry.state : "hidden"
  return {
    state,
    ...(entry.discoveredAt !== undefined && state !== "hidden"
      ? { discoveredAt: entry.discoveredAt }
      : {}),
    ...(entry.lastVisibleAt !== undefined && state !== "hidden"
      ? { lastVisibleAt: entry.lastVisibleAt }
      : {}),
    ...(entry.revealSource ? { revealSource: entry.revealSource } : {}),
  }
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`)
  }
}

function clampAngle(degrees: number): number {
  if (!Number.isFinite(degrees) || degrees < 0) return 0
  return Math.min(degrees, 180)
}

function nearestNeighborWorldDistance<TCoord extends CellCoord>(
  topology: GridTopology<TCoord>,
  origin: TCoord,
  originWorld: { readonly x: number; readonly y: number },
): number {
  let nearest = Infinity
  for (const neighbor of topology.neighbors(origin)) {
    const world = topology.cellToWorld(neighbor)
    const distance = Math.hypot(world.x - originWorld.x, world.y - originWorld.y)
    if (distance > 0) nearest = Math.min(nearest, distance)
  }
  return Number.isFinite(nearest) ? nearest : 0
}

function coneFacingVector<TCoord extends CellCoord>(
  topology: GridTopology<TCoord>,
  options: FieldOfViewOptions<TCoord>,
): { readonly x: number; readonly y: number } | null {
  if (!options.facingToward || options.coneHalfAngleDeg === undefined) return null
  const origin = topology.cellToWorld(options.origin)
  const toward = topology.cellToWorld(options.facingToward)
  const dx = toward.x - origin.x
  const dy = toward.y - origin.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return null
  return { x: dx / length, y: dy / length }
}

function hasLineOfSight<TCoord extends CellCoord>(
  topology: GridTopology<TCoord>,
  origin: TCoord,
  target: TCoord,
  originWorld: { readonly x: number; readonly y: number },
  targetWorld: { readonly x: number; readonly y: number },
  isOpaque: (coord: TCoord) => boolean,
  sampleStep: number,
): boolean {
  const samples = Math.max(1, Math.ceil(topology.distance(origin, target) / sampleStep))
  const originKey = topology.serialize(origin)
  const targetKey = topology.serialize(target)
  for (let i = 1; i < samples; i += 1) {
    const t = i / samples
    const cell = topology.worldToCell({
      x: originWorld.x + (targetWorld.x - originWorld.x) * t,
      y: originWorld.y + (targetWorld.y - originWorld.y) * t,
    })
    if (!cell) continue
    const key = topology.serialize(cell)
    if (key === originKey || key === targetKey) continue
    if (isOpaque(cell)) return false
  }
  return true
}

function earliestDefined(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined) return b
  if (b === undefined) return a
  return Math.min(a, b)
}

function latestDefined(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined) return b
  if (b === undefined) return a
  return Math.max(a, b)
}
