const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")
const {
  compileSemanticMapDefinition,
  firstFreeTile,
  tileSpawnPoint,
  validateCompiledMap,
  validateSpawnPoints,
} = require("../dist/index.js")

const neutralSource = fs.readFileSync(
  path.resolve(__dirname, "../src/index.ts"),
  "utf8",
)

for (const forbidden of [
  "SkyOffice",
  "LimeZu",
  "office",
  "lobby",
  "meeting",
  "lounge",
  "coffee",
  "chair",
  "desk",
  "Wikimedia",
  "media",
  "tenant",
]) {
  assert.ok(
    !new RegExp(`\\b${forbidden}\\b`, "i").test(neutralSource),
    `game-map source must stay domain-neutral; found ${forbidden}.`,
  )
}

const catalog = {
  version: 1,
  tileSize: 32,
  sources: [],
  tilesets: [],
  tokens: [
    token("surface.basic", 10, 1, 1, false),
    token("barrier.edge", 20, 1, 1, true),
    token("barrier.corner", 21, 1, 1, true),
    token("item.block_two", 30, 2, 1, true),
    token("object.marker", 31, 1, 1, false),
  ],
  styles: [
    {
      id: "style.basic",
      floorTokenId: "surface.basic",
      wallTokenIds: {
        straight: "barrier.edge",
        corner: "barrier.corner",
      },
      tags: ["test"],
    },
  ],
}

const definition = {
  roomDimensions: { width: 6, height: 5 },
  style: "style.basic",
  layers: {
    walls: [
      { x: 0, y: 0, type: "corner" },
      { x: 1, y: 0, type: "straight" },
    ],
    objects: [{ x: 4, y: 2, tokenId: "object.marker" }],
    furniture: [{ x: 2, y: 2, item: "block_two" }],
    zones: [
      {
        id: "zone-alpha",
        xStart: 1,
        yStart: 1,
        xEnd: 5,
        yEnd: 4,
        zoneType: "interaction.generic",
      },
    ],
  },
}

const compiled = compileSemanticMapDefinition(definition, catalog)
const spawnPoints = [
  tileSpawnPoint("default", { x: 1, y: 1 }, compiled.tileSize),
  tileSpawnPoint("secondary", { x: 4, y: 3 }, compiled.tileSize),
]
const validation = validateCompiledMap(compiled, spawnPoints)

assert.equal(compiled.width, 6)
assert.equal(compiled.height, 5)
assert.equal(compiled.tileSize, 32)
assert.equal(compiled.layers.floor.gids[0][0], 10)
assert.equal(compiled.layers.floor.gids[4][5], 10)
assert.equal(compiled.layers.walls.gids[0][0], 21)
assert.equal(compiled.layers.walls.gids[0][1], 20)
assert.equal(compiled.layers.objects.gids[2][2], 30)
assert.equal(compiled.layers.objects.gids[2][4], 31)
assert.equal(compiled.renderLayers.objects.gids[2][2], 30)
assert.equal(compiled.collisionLayers.movement.blocked[2][2], true)
assert.equal(compiled.collisionLayers.movement.blocked[2][3], true)
assert.equal(compiled.collisionLayers.movement.blocked[2][4], false)
assert.deepEqual(compiled.zones[0], definition.layers.zones[0])
assert.deepEqual(compiled.referencedTokenIds.sort(), [
  "barrier.corner",
  "barrier.edge",
  "item.block_two",
  "object.marker",
  "surface.basic",
])
assert.equal(validation.valid, true)
assert.deepEqual(
  validation.checks.map((check) => [check.id, check.status]),
  [
    ["blocked_tiles", "pass"],
    ["collision_layer", "pass"],
    ["compiler_output", "pass"],
    ["spawn_clearance", "pass"],
    ["zone_bounds", "pass"],
  ],
)
assert.deepEqual(validation.spawnIds, ["default", "secondary"])
assert.deepEqual(validation.zoneIds, ["zone-alpha"])

assert.deepEqual(firstFreeTile(compiled, [{ x: 2, y: 2 }, { x: 1, y: 1 }]), {
  x: 1,
  y: 1,
})
assert.deepEqual(
  validateSpawnPoints(compiled, [
    tileSpawnPoint("blocked", { x: 2, y: 2 }, compiled.tileSize),
  ]),
  [
    {
      id: "spawn_clearance",
      status: "fail",
      message: "Spawn blocked overlaps blocked tile 2:2.",
    },
  ],
)
assert.equal(validateCompiledMap(compiled).valid, false)
assert.match(
  validateCompiledMap(compiled).summary,
  /Generated map has no spawn points/,
)

assert.throws(
  () =>
    compileSemanticMapDefinition(
      {
        roomDimensions: { width: 2, height: 2 },
        style: "style.basic",
        layers: {
          furniture: [{ x: 1, y: 1, item: "missing" }],
        },
      },
      catalog,
    ),
  /Unknown visual token: item\.missing/,
)

function token(id, provisionalGid, widthTiles, heightTiles, collidable) {
  return {
    id,
    kind: "object",
    layer: "object",
    sourceId: "source.test.generated",
    tilesetId: "tileset.test.generated",
    provisionalGid,
    widthTiles,
    heightTiles,
    collidable,
    tags: ["test"],
  }
}
