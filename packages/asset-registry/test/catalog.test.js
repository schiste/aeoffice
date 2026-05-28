const assert = require("node:assert")
const {
  assertNoUnapprovedBundledAssets,
  compileDeterministicPromptMap,
  compilePresetMap,
  compileSemanticMapDefinition,
  presetMapSummaries,
  starterVisualAssetCatalog,
  validateVisualAssetCatalog,
} = require("../dist/index.js")

assert.deepEqual(validateVisualAssetCatalog(starterVisualAssetCatalog), [])
assert.doesNotThrow(() =>
  assertNoUnapprovedBundledAssets(starterVisualAssetCatalog),
)
const sourcesById = new Map(
  starterVisualAssetCatalog.sources.map((source) => [source.id, source]),
)
const tokensById = new Map(
  starterVisualAssetCatalog.tokens.map((token) => [token.id, token]),
)
const internalSource = sourcesById.get("internal.generated.office.polished_v1")
assert.ok(internalSource)
assert.equal(internalSource.status, "target_approved")
assert.equal(internalSource.license, "LicenseRef-LPC-Copyleft-Mixed")
assert.match(internalSource.attributionText, /LPC copyleft source sheets/)
assert.equal(internalSource.redistributionAllowed, "yes")
assert.equal(internalSource.commercialUseAllowed, "yes")
assert.equal(internalSource.bundledInTargetApp, true)
assert.throws(
  () =>
    assertNoUnapprovedBundledAssets({
      ...starterVisualAssetCatalog,
      sources: [
        {
          ...sourcesById.get("legacy.skyoffice.tileset.modern_office"),
          bundledInTargetApp: true,
        },
      ],
    }),
  /Bundled source is not approved/,
)

const stableTargetTokenIds = [
  "floor.wood_parquet",
  "floor.polished_concrete",
  "floor.soft_carpet",
  "wall.wood.straight",
  "wall.wood.corner",
  "wall.glass.straight",
  "wall.glass.corner",
  "wall.neutral.straight",
  "wall.neutral.corner",
  "item.large_conference_table",
  "item.small_round_table",
  "item.office_chair",
  "item.coffee_machine",
  "item.plant_potted",
  "item.coffee_bar",
  "item.door_single",
  "item.lounge_couch",
  "item.modular_work_desk",
  "item.whiteboard_wall",
  "item.armchair_lounge",
  "item.bookshelf_low",
  "item.floor_lamp",
  "item.side_table",
  "avatar.local_placeholder",
  "avatar.ember",
  "avatar.cobalt",
  "avatar.moss",
  "avatar.violet",
]
for (const tokenId of stableTargetTokenIds) {
  const token = tokensById.get(tokenId)
  assert.ok(token, `Missing stable visual token ${tokenId}`)
  assert.equal(token.sourceId, "internal.generated.office.polished_v1")
  assert.ok(token.asset, `Missing atlas metadata for ${tokenId}`)
  assert.equal(token.asset.frameId, token.id)
  assert.equal(token.asset.atlasId, "atlas.internal.office.polished_v1")
  assert.equal(token.asset.size.width, token.widthTiles * 32)
  assert.equal(token.asset.size.height, token.heightTiles * 32)
  assert.equal(token.asset.size.exportScale, 2)
  assert.ok(token.asset.visualFootprint.width <= token.widthTiles * 32)
  assert.ok(token.asset.visualFootprint.height <= token.heightTiles * 32)
  assert.ok(token.asset.shadowFootprint.width <= token.widthTiles * 32)
  assert.ok(token.asset.shadowFootprint.height <= token.heightTiles * 32)
  assert.ok(token.asset.zAnchor.y <= token.heightTiles * 32)
  assert.ok(["none", "y_sort", "foreground"].includes(token.asset.occlusion.mode))
  assert.ok(token.asset.themeTags.length >= 1)
  assert.ok(token.asset.themeTags.includes("brandable"))
  assert.ok(token.asset.variants.length >= 2)
  assert.ok(
    token.asset.variants.some(
      (variant) => variant.role === "default" && variant.frameId === token.id,
    ),
  )
  assert.ok(
    token.asset.variants.some((variant) => variant.role === "tenant_tint"),
    `Expected tenant-tint variant metadata for ${tokenId}.`,
  )
}
assert.equal(tokensById.get("wall.wood.straight").asset.occlusion.mode, "foreground")
assert.equal(tokensById.get("wall.wood.straight").asset.occlusion.splitAtY, 12)
assert.equal(
  tokensById.get("wall.wood.straight").asset.occlusion.foregroundFootprint.height,
  20,
)
assert.equal(
  tokensById.get("item.large_conference_table").asset.occlusion.mode,
  "y_sort",
)
assert.ok(
  tokensById.get("item.plant_potted").asset.collisionFootprint.width <
    tokensById.get("item.plant_potted").asset.visualFootprint.width,
)
assert.deepEqual(tokensById.get("item.coffee_bar").asset.themeTags, [
  "kitchen",
  "lounge",
  "brandable",
])
assert.equal(
  sourcesById.get("internal.generated.office.polished_v1").filePath,
  "apps/web/public/assets/internal-office-atlas.manifest.json",
)
assert.equal(
  starterVisualAssetCatalog.tilesets.find(
    (tileset) => tileset.id === "tileset.internal.polished.office",
  ).atlasImagePath,
  "apps/web/public/assets/internal-office-atlas@2x.png",
)
assert.equal(tokensById.get("wall.neutral.straight").provisionalGid, 49)
assert.equal(tokensById.get("wall.neutral.corner").provisionalGid, 50)
assert.equal(tokensById.get("item.plant_potted").provisionalGid, 306)
assert.equal(tokensById.get("item.coffee_bar").provisionalGid, 307)
assert.equal(tokensById.get("item.door_single").provisionalGid, 308)
assert.equal(tokensById.get("item.lounge_couch").provisionalGid, 309)
assert.equal(tokensById.get("item.modular_work_desk").provisionalGid, 310)
assert.equal(tokensById.get("item.whiteboard_wall").provisionalGid, 311)
assert.equal(tokensById.get("item.armchair_lounge").provisionalGid, 312)
assert.equal(tokensById.get("item.bookshelf_low").provisionalGid, 313)
assert.equal(tokensById.get("item.floor_lamp").provisionalGid, 314)
assert.equal(tokensById.get("item.side_table").provisionalGid, 315)
assert.deepEqual(tokensById.get("item.whiteboard_wall").asset.interaction, {
  affordance: "inspect",
  label: "Whiteboard",
  prompt: "Use whiteboard",
  radiusTiles: 1.2,
  priority: 32,
})
assert.equal(tokensById.get("item.coffee_bar").asset.interaction.affordance, "serve")
assert.equal(
  sourcesById.get("legacy.skyoffice.tileset.modern_office").bundledInTargetApp,
  false,
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
assert.equal(compiled.renderLayers.objects.gids[3][4], 201)
assert.equal(compiled.layers.objects.gids[2][4], 160)
assert.equal(compiled.layers.objects.gids[1][9], 305)
assert.equal(compiled.collisionLayers.movement.name, "movement")
assert.equal(compiled.collisionLayers.movement.blocked[3][4], true)
assert.equal(compiled.collisionLayers.movement.blocked[5][6], false)
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
assert.match(generated.validation.summary, /Map preflight passed/)
assert.deepEqual(
  generated.validation.checks.map((check) => [check.id, check.status]),
  [
    ["blocked_tiles", "pass"],
    ["collision_layer", "pass"],
    ["compiler_output", "pass"],
    ["spawn_clearance", "pass"],
    ["zone_bounds", "pass"],
  ],
)
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
assert.ok(generated.keywords.includes("bar"))
assert.ok(
  generated.definition.layers.furniture.some(
    (item) => item.item === "coffee_bar",
  ),
)
assert.ok(
  generated.definition.layers.furniture.some(
    (item) => item.item === "whiteboard_wall",
  ),
)
assert.ok(
  generated.definition.layers.furniture.some(
    (item) => item.item === "side_table",
  ),
)
assert.ok(generated.compiled.referencedTokenIds.includes("item.coffee_bar"))
assert.ok(generated.compiled.referencedTokenIds.includes("item.whiteboard_wall"))
assert.ok(generated.compiled.blockedTiles.length > compiled.blockedTiles.length)
assert.deepEqual(generated.validation.spawnIds, ["default", "guest"])
assert.deepEqual(generated.validation.zoneIds, ["meeting-zone"])
assert.equal(generated.spawnPoints[0].position.x % generated.compiled.tileSize, 0)
assert.equal(generated.spawnPoints[0].position.y % generated.compiled.tileSize, 0)

const decorated = compileDeterministicPromptMap(
  "cozy 6-person room with plants and a door",
)
assert.equal(decorated.validation.valid, true)
assert.ok(decorated.keywords.includes("plant"))
assert.ok(decorated.keywords.includes("door"))
assert.ok(
  decorated.definition.layers.furniture.some(
    (item) => item.item === "plant_potted",
  ),
)
assert.ok(
  decorated.definition.layers.furniture.some(
    (item) => item.item === "door_single",
  ),
)
assert.ok(decorated.compiled.referencedTokenIds.includes("item.plant_potted"))
assert.ok(decorated.compiled.referencedTokenIds.includes("item.door_single"))

const loungePrompt = compileDeterministicPromptMap(
  "cozy lounge room with a sofa, plants and a door",
)
assert.equal(loungePrompt.validation.valid, true)
assert.ok(loungePrompt.keywords.includes("couch"))
assert.ok(
  loungePrompt.definition.layers.furniture.some(
    (item) => item.item === "lounge_couch",
  ),
)
assert.ok(loungePrompt.compiled.referencedTokenIds.includes("item.lounge_couch"))

assert.deepEqual(
  presetMapSummaries.map((preset) => preset.id),
  ["lobby", "meeting_room", "lounge_cafe"],
)
for (const presetId of presetMapSummaries.map((preset) => preset.id)) {
  const preset = compilePresetMap(presetId)

  assert.equal(preset.id, presetId)
  assert.equal(preset.validation.valid, true)
  assert.deepEqual(preset.validation.spawnIds, ["default", "guest"])
  assert.equal(preset.validation.zoneCount, 1)
  assert.ok(preset.compiled.blockedTiles.length > 0)
  assert.ok(
    preset.compiled.referencedTokenIds.every((tokenId) =>
      tokensById.has(tokenId),
    ),
  )
}
const lobby = compilePresetMap("lobby")
assert.equal(lobby.definition.style, "modern_light")
assert.equal(lobby.compiled.width, 16)
assert.ok(lobby.compiled.referencedTokenIds.includes("item.coffee_machine"))
assert.ok(lobby.compiled.referencedTokenIds.includes("item.modular_work_desk"))

const meetingRoom = compilePresetMap("meeting_room")
assert.equal(meetingRoom.definition.style, "cozy_wood")
assert.ok(meetingRoom.compiled.referencedTokenIds.includes("item.coffee_bar"))
assert.ok(meetingRoom.compiled.referencedTokenIds.includes("item.whiteboard_wall"))
assert.ok(meetingRoom.validation.zoneIds.includes("meeting-zone"))

const loungeCafe = compilePresetMap("lounge_cafe")
assert.equal(loungeCafe.definition.style, "quiet_carpet")
assert.ok(loungeCafe.compiled.referencedTokenIds.includes("item.small_round_table"))
assert.ok(loungeCafe.compiled.referencedTokenIds.includes("item.lounge_couch"))
assert.ok(loungeCafe.compiled.referencedTokenIds.includes("item.armchair_lounge"))
assert.ok(loungeCafe.compiled.referencedTokenIds.includes("item.bookshelf_low"))
assert.ok(loungeCafe.compiled.referencedTokenIds.includes("wall.neutral.straight"))
assert.ok(loungeCafe.validation.zoneIds.includes("lounge-zone"))

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
