const assert = require("node:assert")
const {
  assertNoUnapprovedBundledAssets,
  compileDeterministicPromptMap,
  compileSemanticMapDefinition,
  starterVisualAssetCatalog,
  validateVisualAssetCatalog,
} = require("../dist/index.js")

assert.deepEqual(validateVisualAssetCatalog(starterVisualAssetCatalog), [])
assert.doesNotThrow(() =>
  assertNoUnapprovedBundledAssets(starterVisualAssetCatalog),
)
assert.throws(
  () =>
    assertNoUnapprovedBundledAssets({
      ...starterVisualAssetCatalog,
      sources: [
        {
          ...starterVisualAssetCatalog.sources[0],
          bundledInTargetApp: true,
        },
      ],
    }),
  /Bundled source is not approved/,
)

const compiled = compileSemanticMapDefinition({
  roomDimensions: { width: 12, height: 10 },
  style: "cozy_wood",
  layers: {
    walls: [
      { x: 0, y: 0, type: "corner" },
      { x: 1, y: 0, type: "straight" },
    ],
    furniture: [
      { x: 4, y: 3, item: "large_conference_table" },
      { x: 4, y: 2, item: "office_chair", direction: "south" },
      { x: 9, y: 1, item: "coffee_machine" },
    ],
    zones: [
      {
        id: "meeting-zone",
        xStart: 3,
        yStart: 2,
        xEnd: 7,
        yEnd: 5,
        zoneType: "meeting_private",
      },
    ],
  },
})

assert.equal(compiled.width, 12)
assert.equal(compiled.height, 10)
assert.equal(compiled.tileSize, 32)
assert.equal(compiled.layers.floor.gids[0][0], 12)
assert.equal(compiled.layers.walls.gids[0][0], 46)
assert.equal(compiled.layers.walls.gids[0][1], 45)
assert.equal(compiled.layers.objects.gids[3][4], 201)
assert.equal(compiled.layers.objects.gids[2][4], 160)
assert.equal(compiled.layers.objects.gids[1][9], 305)
assert.deepEqual(compiled.zones[0], {
  id: "meeting-zone",
  xStart: 3,
  yStart: 2,
  xEnd: 7,
  yEnd: 5,
  zoneType: "meeting_private",
})
assert.ok(
  compiled.blockedTiles.some((tile) => tile.x === 6 && tile.y === 4),
)
assert.ok(
  compiled.referencedTokenIds.includes("item.large_conference_table"),
)

const generated = compileDeterministicPromptMap(
  "cozy 10-person meeting room with wooden walls and a coffee bar",
)

assert.equal(generated.validation.valid, true)
assert.equal(generated.definition.roomDimensions.width, 14)
assert.equal(generated.definition.roomDimensions.height, 11)
assert.equal(
  generated.definition.layers.furniture.filter(
    (item) => item.item === "office_chair",
  ).length,
  10,
)
assert.ok(generated.keywords.includes("10-person"))
assert.ok(generated.keywords.includes("coffee"))
assert.ok(generated.compiled.blockedTiles.length > compiled.blockedTiles.length)
assert.deepEqual(generated.validation.spawnIds, ["default", "guest"])
assert.deepEqual(generated.validation.zoneIds, ["meeting-zone"])
assert.equal(generated.spawnPoints[0].position.x % generated.compiled.tileSize, 0)
assert.equal(generated.spawnPoints[0].position.y % generated.compiled.tileSize, 0)

assert.throws(
  () =>
    compileSemanticMapDefinition({
      roomDimensions: { width: 4, height: 4 },
      style: "cozy_wood",
      layers: {
        furniture: [{ x: 1, y: 1, item: "unknown_sofa" }],
      },
    }),
  /Unknown visual token: item\.unknown_sofa/,
)
