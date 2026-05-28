import type {
  FixtureMap,
  FixtureToken,
  RendererMapValidationInfo,
  TileLayer,
} from "./types"

export function validateFixtureMapForRenderer(
  fixtureMap: FixtureMap,
): RendererMapValidationInfo {
  const errors: string[] = []
  const tokensByGid = new Map(
    fixtureMap.catalog.tokens.map((token) => [token.provisionalGid, token]),
  )
  let visualFootprintCount = 0

  validateLayerShape("floor", fixtureMap.compiled.layers.floor, fixtureMap, errors)
  validateLayerShape("walls", fixtureMap.compiled.layers.walls, fixtureMap, errors)
  validateLayerShape("objects", fixtureMap.compiled.layers.objects, fixtureMap, errors)

  visualFootprintCount += validateLayerVisualFootprints(
    fixtureMap.compiled.layers.walls,
    fixtureMap,
    tokensByGid,
    errors,
  )
  visualFootprintCount += validateLayerVisualFootprints(
    fixtureMap.compiled.layers.objects,
    fixtureMap,
    tokensByGid,
    errors,
  )
  validateCollisionLayer(fixtureMap, errors)
  validateZones(fixtureMap, errors)

  return {
    source: "renderer_preflight",
    valid: errors.length === 0,
    mutationSafe: errors.length === 0,
    errors,
    checkedLayerNames: ["floor", "walls", "objects"],
    visualFootprintCount,
    collisionLayerPresent: Boolean(fixtureMap.compiled.collisionLayers?.movement),
    renderFingerprint: fixtureMapRenderFingerprint(fixtureMap),
  }
}

export function fixtureMapRenderFingerprint(fixtureMap: FixtureMap): string {
  const collision = fixtureMap.compiled.collisionLayers?.movement
  const payload = [
    fixtureMap.definition.style,
    fixtureMap.compiled.width,
    fixtureMap.compiled.height,
    fixtureMap.compiled.tileSize,
    layerFingerprint(fixtureMap.compiled.layers.floor),
    layerFingerprint(fixtureMap.compiled.layers.walls),
    layerFingerprint(fixtureMap.compiled.layers.objects),
    collision ? collisionFingerprint(collision.blocked) : "no-collision-layer",
    fixtureMap.compiled.zones
      .map((zone) =>
        [
          zone.id,
          zone.zoneType,
          zone.xStart,
          zone.yStart,
          zone.xEnd,
          zone.yEnd,
        ].join(":"),
      )
      .join("|"),
  ].join("::")

  return `map-${stableHash(payload)}`
}

function validateLayerShape(
  name: string,
  layer: TileLayer,
  fixtureMap: FixtureMap,
  errors: string[],
): void {
  if (layer.gids.length !== fixtureMap.compiled.height) {
    errors.push(
      `Render layer ${name} height ${layer.gids.length} does not match map height ${fixtureMap.compiled.height}.`,
    )
  }

  layer.gids.forEach((row, y) => {
    if (row.length !== fixtureMap.compiled.width) {
      errors.push(
        `Render layer ${name} row ${y} width ${row.length} does not match map width ${fixtureMap.compiled.width}.`,
      )
    }
  })
}

function validateLayerVisualFootprints(
  layer: TileLayer,
  fixtureMap: FixtureMap,
  tokensByGid: ReadonlyMap<number, FixtureToken>,
  errors: string[],
): number {
  let visualFootprintCount = 0
  const mapWidthPx = fixtureMap.compiled.width * fixtureMap.compiled.tileSize
  const mapHeightPx = fixtureMap.compiled.height * fixtureMap.compiled.tileSize

  layer.gids.forEach((row, y) => {
    row.forEach((gid, x) => {
      if (gid <= 0) return

      const token = tokensByGid.get(gid)
      if (!token) {
        errors.push(`Render layer references unknown gid ${gid} at ${x}:${y}.`)
        return
      }

      const footprint = token.asset?.visualFootprint ?? {
        x: 0,
        y: 0,
        width: token.widthTiles * fixtureMap.compiled.tileSize,
        height: token.heightTiles * fixtureMap.compiled.tileSize,
      }
      const left = x * fixtureMap.compiled.tileSize + footprint.x
      const top = y * fixtureMap.compiled.tileSize + footprint.y
      const right = left + footprint.width
      const bottom = top + footprint.height
      visualFootprintCount += 1

      if (left < 0 || top < 0 || right > mapWidthPx || bottom > mapHeightPx) {
        errors.push(
          `Visual footprint for ${token.id} at ${x}:${y} exceeds map pixel bounds.`,
        )
      }
    })
  })

  return visualFootprintCount
}

function validateCollisionLayer(fixtureMap: FixtureMap, errors: string[]): void {
  const movement = fixtureMap.compiled.collisionLayers?.movement
  if (!movement) return

  if (
    movement.width !== fixtureMap.compiled.width ||
    movement.height !== fixtureMap.compiled.height
  ) {
    errors.push("Movement collision layer dimensions do not match the map.")
  }

  if (movement.blocked.length !== fixtureMap.compiled.height) {
    errors.push("Movement collision layer height does not match the map.")
  }

  movement.blocked.forEach((row, y) => {
    if (row.length !== fixtureMap.compiled.width) {
      errors.push(`Movement collision layer row ${y} width does not match the map.`)
    }
  })
}

function validateZones(fixtureMap: FixtureMap, errors: string[]): void {
  fixtureMap.compiled.zones.forEach((zone) => {
    if (
      zone.xStart < 0 ||
      zone.yStart < 0 ||
      zone.xEnd > fixtureMap.compiled.width ||
      zone.yEnd > fixtureMap.compiled.height ||
      zone.xStart >= zone.xEnd ||
      zone.yStart >= zone.yEnd
    ) {
      errors.push(`Zone ${zone.id} is outside renderer bounds.`)
    }
  })
}

function layerFingerprint(layer: TileLayer): string {
  return layer.gids.map((row) => row.join(",")).join(";")
}

function collisionFingerprint(blocked: readonly (readonly boolean[])[]): string {
  return blocked.map((row) => row.map((value) => (value ? "1" : "0")).join("")).join(";")
}

function stableHash(value: string): string {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(16).padStart(8, "0")
}
