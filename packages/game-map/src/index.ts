import type {
  VisualAssetCatalog,
  VisualTokenDefinition,
} from "@aedventure/game-assets"

export interface SemanticMapDefinition {
  readonly roomDimensions: {
    readonly width: number
    readonly height: number
  }
  readonly style: string
  readonly layers: {
    readonly walls?: readonly SemanticWallPlacement[]
    readonly objects?: readonly SemanticObjectPlacement[]
    readonly furniture?: readonly SemanticFurniturePlacement[]
    readonly zones?: readonly SemanticZoneDefinition[]
  }
}

export type MapDefinitionInterface = SemanticMapDefinition

export interface SemanticWallPlacement {
  readonly x: number
  readonly y: number
  readonly type: "straight" | "corner"
}

export interface SemanticObjectPlacement {
  readonly x: number
  readonly y: number
  readonly tokenId?: string
  readonly item?: string
  readonly direction?: "north" | "south" | "east" | "west"
}

export type SemanticFurniturePlacement = SemanticObjectPlacement

export interface SemanticZoneDefinition {
  readonly id: string
  readonly xStart: number
  readonly yStart: number
  readonly xEnd: number
  readonly yEnd: number
  readonly zoneType: string
}

export interface CompiledTileLayer {
  readonly name: string
  readonly width: number
  readonly height: number
  readonly gids: readonly (readonly number[])[]
}

export interface CompiledSemanticMap {
  readonly width: number
  readonly height: number
  readonly tileSize: number
  readonly renderLayers: {
    readonly floor: CompiledTileLayer
    readonly walls: CompiledTileLayer
    readonly objects: CompiledTileLayer
  }
  readonly layers: {
    readonly floor: CompiledTileLayer
    readonly walls: CompiledTileLayer
    readonly objects: CompiledTileLayer
  }
  readonly collisionLayers: {
    readonly movement: CompiledCollisionLayer
  }
  readonly blockedTiles: readonly { readonly x: number; readonly y: number }[]
  readonly zones: readonly SemanticZoneDefinition[]
  readonly referencedTokenIds: readonly string[]
}

export interface CompiledCollisionLayer {
  readonly name: "movement"
  readonly width: number
  readonly height: number
  readonly blocked: readonly (readonly boolean[])[]
  readonly blockedTiles: readonly { readonly x: number; readonly y: number }[]
}

export interface MapSpawnPoint {
  readonly id: string
  readonly position: {
    readonly x: number
    readonly y: number
  }
}

export type PromptMapSpawnPoint = MapSpawnPoint

export interface MapValidation {
  readonly valid: boolean
  readonly errors: readonly string[]
  readonly checks: readonly MapValidationCheck[]
  readonly summary: string
  readonly blockedTileCount: number
  readonly spawnCount: number
  readonly zoneCount: number
  readonly spawnIds: readonly string[]
  readonly zoneIds: readonly string[]
}

export type PromptMapValidation = MapValidation

export interface MapValidationCheck {
  readonly id:
    | "collision_layer"
    | "spawn_clearance"
    | "zone_bounds"
    | "blocked_tiles"
    | "compiler_output"
  readonly status: "pass" | "fail"
  readonly message: string
}

export type PromptMapValidationCheck = MapValidationCheck

export interface CompileSemanticMapOptions {
  readonly resolveObjectTokenId?: (
    placement: SemanticObjectPlacement,
  ) => string
}

export function compileSemanticMapDefinition(
  definition: SemanticMapDefinition,
  catalog: VisualAssetCatalog,
  options: CompileSemanticMapOptions = {},
): CompiledSemanticMap {
  const style = catalog.styles.find((candidate) => candidate.id === definition.style)
  if (!style) {
    throw new Error(`Unknown visual style: ${definition.style}`)
  }

  const width = definition.roomDimensions.width
  const height = definition.roomDimensions.height
  const floorToken = requireToken(catalog, style.floorTokenId)
  const floor = createLayer("floor", width, height, floorToken.provisionalGid)
  const walls = createLayer("walls", width, height, 0)
  const objects = createLayer("objects", width, height, 0)
  const blockedTiles: { x: number; y: number }[] = []
  const referencedTokenIds = new Set<string>([floorToken.id])
  const resolveObjectTokenId =
    options.resolveObjectTokenId ?? defaultObjectTokenId

  for (const wall of definition.layers.walls ?? []) {
    const token = requireToken(catalog, style.wallTokenIds[wall.type])
    referencedTokenIds.add(token.id)
    paintToken(walls, token, wall.x, wall.y)
    addBlockedTiles(blockedTiles, token, wall.x, wall.y)
  }

  for (const object of [
    ...(definition.layers.objects ?? []),
    ...(definition.layers.furniture ?? []),
  ]) {
    const token = requireToken(catalog, resolveObjectTokenId(object))
    referencedTokenIds.add(token.id)
    paintToken(objects, token, object.x, object.y)
    addBlockedTiles(blockedTiles, token, object.x, object.y)
  }

  return {
    width,
    height,
    tileSize: catalog.tileSize,
    renderLayers: {
      floor,
      walls,
      objects,
    },
    layers: {
      floor,
      walls,
      objects,
    },
    collisionLayers: {
      movement: createMovementCollisionLayer(width, height, blockedTiles),
    },
    blockedTiles,
    zones: definition.layers.zones ?? [],
    referencedTokenIds: [...referencedTokenIds],
  }
}

export function validateCompiledMap(
  compiled: CompiledSemanticMap,
  spawnPoints: readonly MapSpawnPoint[] = [],
): MapValidation {
  const errors: string[] = []
  const checks: MapValidationCheck[] = []
  const blockedTileKeys = new Set<string>()
  const fail = (id: MapValidationCheck["id"], message: string) => {
    errors.push(message)
    checks.push({ id, status: "fail", message })
  }
  const pass = (id: MapValidationCheck["id"], message: string) => {
    checks.push({ id, status: "pass", message })
  }

  for (const tile of compiled.blockedTiles) {
    const key = `${tile.x}:${tile.y}`

    if (blockedTileKeys.has(key)) {
      fail("blocked_tiles", `Duplicate blocked tile ${key}.`)
    }
    blockedTileKeys.add(key)

    if (
      tile.x < 0 ||
      tile.y < 0 ||
      tile.x >= compiled.width ||
      tile.y >= compiled.height
    ) {
      fail("blocked_tiles", `Blocked tile ${key} is outside the map.`)
    }
  }

  if (blockedTileKeys.size === compiled.blockedTiles.length) {
    pass(
      "blocked_tiles",
      `${compiled.blockedTiles.length} blocked movement tiles are unique and in bounds.`,
    )
  }

  const collisionBlockedCount = compiled.collisionLayers.movement.blocked.reduce(
    (total, row) =>
      total + row.reduce((rowTotal, blocked) => rowTotal + (blocked ? 1 : 0), 0),
    0,
  )
  if (
    compiled.collisionLayers.movement.width !== compiled.width ||
    compiled.collisionLayers.movement.height !== compiled.height ||
    collisionBlockedCount !== blockedTileKeys.size
  ) {
    fail(
      "collision_layer",
      "Movement collision layer does not match compiled blocked tiles.",
    )
  } else {
    pass(
      "collision_layer",
      `Movement collision layer matches ${collisionBlockedCount} blocked tiles.`,
    )
  }

  if (
    compiled.renderLayers.floor.width === compiled.width &&
    compiled.renderLayers.walls.width === compiled.width &&
    compiled.renderLayers.objects.width === compiled.width &&
    compiled.renderLayers.floor.height === compiled.height &&
    compiled.renderLayers.walls.height === compiled.height &&
    compiled.renderLayers.objects.height === compiled.height
  ) {
    pass(
      "compiler_output",
      "Compiler emitted renderer-agnostic render layers, collision layer, and zones.",
    )
  } else {
    fail(
      "compiler_output",
      "Compiled render layer dimensions do not match the map dimensions.",
    )
  }

  const spawnPointsHaveFailures = validateSpawnPointsInto(
    spawnPoints,
    compiled,
    blockedTileKeys,
    fail,
  )
  if (spawnPoints.length > 0 && !spawnPointsHaveFailures) {
    pass(
      "spawn_clearance",
      `${spawnPoints.length} entry spots are clear and inside the map.`,
    )
  }
  validateZoneBoundsInto(compiled, checks, fail, pass)

  if (compiled.blockedTiles.length === 0) {
    fail("blocked_tiles", "Generated map has no blocked tiles.")
  }
  if (spawnPoints.length === 0) {
    fail("spawn_clearance", "Generated map has no spawn points.")
  }
  if (compiled.zones.length === 0) {
    fail("zone_bounds", "Generated map has no zones.")
  }

  return {
    valid: errors.length === 0,
    errors,
    checks,
    summary:
      errors.length === 0
        ? "Map preflight passed: render layers, movement collision, spawn points, and zones are consistent."
        : `Map preflight failed: ${errors.join(" ")}`,
    blockedTileCount: compiled.blockedTiles.length,
    spawnCount: spawnPoints.length,
    zoneCount: compiled.zones.length,
    spawnIds: spawnPoints.map((spawn) => spawn.id),
    zoneIds: compiled.zones.map((zone) => zone.id),
  }
}

export const validatePromptMap = validateCompiledMap

export function validateSpawnPoints(
  compiled: CompiledSemanticMap,
  spawnPoints: readonly MapSpawnPoint[],
): readonly MapValidationCheck[] {
  const checks: MapValidationCheck[] = []
  const blockedTileKeys = new Set(
    compiled.blockedTiles.map((tile) => `${tile.x}:${tile.y}`),
  )
  const add = (status: MapValidationCheck["status"]) =>
    (id: MapValidationCheck["id"], message: string) => {
      checks.push({ id, status, message })
    }

  const spawnPointsHaveFailures = validateSpawnPointsInto(
    spawnPoints,
    compiled,
    blockedTileKeys,
    add("fail"),
  )
  if (spawnPoints.length > 0 && !spawnPointsHaveFailures) {
    add("pass")(
      "spawn_clearance",
      `${spawnPoints.length} entry spots are clear and inside the map.`,
    )
  }

  return checks
}

export function tileSpawnPoint(
  id: string,
  tile: { readonly x: number; readonly y: number },
  tileSize: number,
): MapSpawnPoint {
  return {
    id,
    position: {
      x: tile.x * tileSize,
      y: tile.y * tileSize,
    },
  }
}

export function firstFreeTile(
  compiled: CompiledSemanticMap,
  candidates: readonly { readonly x: number; readonly y: number }[],
): { readonly x: number; readonly y: number } | undefined {
  return candidates.find(
    (tile) =>
      tile.x >= 0 &&
      tile.y >= 0 &&
      tile.x < compiled.width &&
      tile.y < compiled.height &&
      !compiled.blockedTiles.some(
        (blockedTile) => blockedTile.x === tile.x && blockedTile.y === tile.y,
      ),
  )
}

export function createMovementCollisionLayer(
  width: number,
  height: number,
  blockedTiles: readonly { readonly x: number; readonly y: number }[],
): CompiledCollisionLayer {
  const blocked = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => false),
  )

  for (const tile of blockedTiles) {
    if (tile.x < 0 || tile.y < 0 || tile.x >= width || tile.y >= height) {
      continue
    }

    blocked[tile.y][tile.x] = true
  }

  return {
    name: "movement",
    width,
    height,
    blocked,
    blockedTiles,
  }
}

export function createLayer(
  name: string,
  width: number,
  height: number,
  fillGid: number,
): CompiledTileLayer {
  return {
    name,
    width,
    height,
    gids: Array.from({ length: height }, () =>
      Array.from({ length: width }, () => fillGid),
    ),
  }
}

function validateSpawnPointsInto(
  spawnPoints: readonly MapSpawnPoint[],
  compiled: CompiledSemanticMap,
  blockedTileKeys: ReadonlySet<string>,
  fail: (id: MapValidationCheck["id"], message: string) => void,
): boolean {
  let hasFailures = false

  for (const spawn of spawnPoints) {
    const tile = {
      x: Math.floor(spawn.position.x / compiled.tileSize),
      y: Math.floor(spawn.position.y / compiled.tileSize),
    }
    const key = `${tile.x}:${tile.y}`

    if (
      tile.x < 0 ||
      tile.y < 0 ||
      tile.x >= compiled.width ||
      tile.y >= compiled.height
    ) {
      hasFailures = true
      fail("spawn_clearance", `Spawn ${spawn.id} is outside the map.`)
    }

    if (blockedTileKeys.has(key)) {
      hasFailures = true
      fail("spawn_clearance", `Spawn ${spawn.id} overlaps blocked tile ${key}.`)
    }
  }

  return hasFailures
}

function validateZoneBoundsInto(
  compiled: CompiledSemanticMap,
  checks: readonly MapValidationCheck[],
  fail: (id: MapValidationCheck["id"], message: string) => void,
  pass: (id: MapValidationCheck["id"], message: string) => void,
): void {
  for (const zone of compiled.zones) {
    if (zone.xStart >= zone.xEnd || zone.yStart >= zone.yEnd) {
      fail("zone_bounds", `Zone ${zone.id} has invalid bounds.`)
    }

    if (
      zone.xStart < 0 ||
      zone.yStart < 0 ||
      zone.xEnd > compiled.width ||
      zone.yEnd > compiled.height
    ) {
      fail("zone_bounds", `Zone ${zone.id} is outside the map.`)
    }
  }
  if (
    compiled.zones.length > 0 &&
    !checks.some((check) => check.id === "zone_bounds" && check.status === "fail")
  ) {
    pass(
      "zone_bounds",
      `${compiled.zones.length} interaction zones are inside the map bounds.`,
    )
  }
}

function requireToken(
  catalog: VisualAssetCatalog,
  tokenId: string,
): VisualTokenDefinition {
  const token = catalog.tokens.find((candidate) => candidate.id === tokenId)
  if (!token) throw new Error(`Unknown visual token: ${tokenId}`)
  return token
}

function paintToken(
  layer: CompiledTileLayer,
  token: VisualTokenDefinition,
  x: number,
  y: number,
): void {
  ensureInsideLayer(layer, token, x, y)
  ;(layer.gids[y] as number[])[x] = token.provisionalGid
}

function addBlockedTiles(
  blockedTiles: { x: number; y: number }[],
  token: VisualTokenDefinition,
  x: number,
  y: number,
): void {
  if (!token.collidable) return

  for (let tileY = y; tileY < y + token.heightTiles; tileY += 1) {
    for (let tileX = x; tileX < x + token.widthTiles; tileX += 1) {
      blockedTiles.push({ x: tileX, y: tileY })
    }
  }
}

function ensureInsideLayer(
  layer: CompiledTileLayer,
  token: VisualTokenDefinition,
  x: number,
  y: number,
): void {
  if (
    x < 0 ||
    y < 0 ||
    x + token.widthTiles > layer.width ||
    y + token.heightTiles > layer.height
  ) {
    throw new Error(`Token ${token.id} is outside layer ${layer.name}`)
  }
}

function defaultObjectTokenId(placement: SemanticObjectPlacement): string {
  if (placement.tokenId) return placement.tokenId
  if (placement.item) return `item.${placement.item}`
  throw new Error("Semantic object placement requires tokenId or item.")
}
