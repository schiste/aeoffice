const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")
const {
  assertNoUnapprovedBundledAssets,
  validateVisualAssetCatalog,
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
    `game-assets source must stay domain-neutral; found ${forbidden}.`,
  )
}

const catalog = {
  version: 1,
  tileSize: 32,
  sources: [
    {
      id: "source.test.generated",
      status: "target_approved",
      filePath: "generated/test.manifest.json",
      sourceUrl: "internal://test/generated",
      author: "Test",
      license: "CC-BY-SA-4.0",
      attributionText: "Test generated assets",
      redistributionAllowed: "yes",
      commercialUseAllowed: "yes",
      bundledInTargetApp: true,
    },
  ],
  tilesets: [
    {
      id: "tileset.test.generated",
      sourceId: "source.test.generated",
      tileWidth: 32,
      tileHeight: 32,
    },
  ],
  tokens: [
    {
      id: "floor.test",
      kind: "floor",
      layer: "floor",
      sourceId: "source.test.generated",
      tilesetId: "tileset.test.generated",
      provisionalGid: 1,
      widthTiles: 1,
      heightTiles: 1,
      collidable: false,
      tags: ["test"],
      asset: frame("floor.test", false),
    },
    {
      id: "wall.test",
      kind: "wall",
      layer: "wall",
      sourceId: "source.test.generated",
      tilesetId: "tileset.test.generated",
      provisionalGid: 2,
      widthTiles: 1,
      heightTiles: 1,
      collidable: true,
      tags: ["test"],
      asset: frame("wall.test", true),
    },
  ],
  styles: [
    {
      id: "style.test",
      floorTokenId: "floor.test",
      wallTokenIds: {
        straight: "wall.test",
        corner: "wall.test",
      },
      tags: ["test"],
    },
  ],
}

assert.deepEqual(validateVisualAssetCatalog(catalog), [])
assert.doesNotThrow(() => assertNoUnapprovedBundledAssets(catalog))

function frame(frameId, collidable) {
  return {
    atlasId: "atlas.test.generated",
    frameId,
    size: {
      width: 32,
      height: 32,
      exportScale: 1,
    },
    anchor: {
      x: 16,
      y: 16,
    },
    collisionFootprint: collidable
      ? {
          x: 0,
          y: 0,
          width: 32,
          height: 32,
        }
      : {
          x: 0,
          y: 0,
          width: 0,
          height: 0,
        },
    visualFootprint: {
      x: 0,
      y: 0,
      width: 32,
      height: 32,
    },
    shadowFootprint: {
      x: 4,
      y: 24,
      width: 24,
      height: 6,
    },
    zAnchor: {
      x: 16,
      y: 32,
    },
    interaction: {
      affordance: "none",
    },
    occlusion: {
      mode: "none",
    },
    themeTags: ["test"],
    variants: [
      {
        id: `${frameId}.default`,
        label: "Default",
        role: "default",
        frameId,
        themeTags: ["test"],
      },
    ],
  }
}
