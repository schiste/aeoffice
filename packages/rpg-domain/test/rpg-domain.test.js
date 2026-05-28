const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")
const {
  RPG_IDLE_DEMO_ACTIONS,
  RPG_IDLE_DEMO_CATALOG,
  RPG_IDLE_DEMO_ENTITIES,
  createRpgIdleDemoMap,
  referencedRpgTokens,
} = require("../dist/index.js")
const { validateVisualAssetCatalog } = require("../../game-assets/dist/index.js")

const packageRoot = path.resolve(__dirname, "..")
const sourceRoot = path.join(packageRoot, "src")

for (const filePath of sourceFiles(sourceRoot)) {
  const source = fs.readFileSync(filePath, "utf8")
  assert.doesNotMatch(
    source,
    /@aedventure\/office-domain/,
    `${path.relative(packageRoot, filePath)} must not import office-domain.`,
  )
  for (const forbidden of [
    "SkyOffice",
    "LimeZu",
    "Wikimedia",
    "meeting",
    "media",
    "tenant",
    "account",
  ]) {
    assert.ok(
      !new RegExp(`\\b${forbidden}\\b`, "i").test(source),
      `${path.relative(packageRoot, filePath)} must stay independent from office/product concerns; found ${forbidden}.`,
    )
  }
}

const catalogErrors = validateVisualAssetCatalog(RPG_IDLE_DEMO_CATALOG)
assert.deepEqual(catalogErrors, [])

const map = createRpgIdleDemoMap()
assert.equal(map.id, "rpg_idle_grove")
assert.equal(map.definition.style, "style.grove_outpost")
assert.equal(map.compiled.width, 12)
assert.equal(map.compiled.height, 9)
assert.equal(map.compiled.tileSize, 32)
assert.equal(map.spawnPoints.length, 1)
assert.equal(map.validation.valid, true)
assert.equal(map.compiled.zones.length, 1)
assert.equal(map.compiled.zones[0].id, "zone.grove")
assert.ok(map.compiled.blockedTiles.length > 20)
assert.equal(
  map.compiled.collisionLayers.movement.blocked[3][3],
  true,
  "resource node tile should block movement",
)
assert.equal(
  map.compiled.collisionLayers.movement.blocked[4][4],
  false,
  "hero spawn tile should remain clear",
)

const hero = RPG_IDLE_DEMO_ENTITIES.find((entity) => entity.kind === "hero_unit")
const resource = RPG_IDLE_DEMO_ENTITIES.find(
  (entity) => entity.kind === "resource_node",
)
const building = RPG_IDLE_DEMO_ENTITIES.find(
  (entity) => entity.kind === "building_site",
)
assert.equal(hero.spawnPointId, "hero_spawn")
assert.equal(resource.tokenId, "item.resource_node.tree")
assert.equal(resource.interactionZoneId, "zone.grove")
assert.equal(building.tokenId, "item.building_site.cabin")
assert.deepEqual(RPG_IDLE_DEMO_ACTIONS, [
  {
    id: "gather_wood",
    label: "Gather wood",
    targetEntityId: "resource.ancient_tree",
    requiredZoneId: "zone.grove",
    resourceDelta: {
      wood: 1,
    },
  },
])

assert.deepEqual(
  referencedRpgTokens(map.compiled).map((token) => token.id).sort(),
  [
    "floor.grass_meadow",
    "item.building_site.cabin",
    "item.resource_node.tree",
    "wall.stone.corner",
    "wall.stone.straight",
  ],
)

function sourceFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(filePath)
    if (entry.isFile() && filePath.endsWith(".ts")) return [filePath]
    return []
  })
}
