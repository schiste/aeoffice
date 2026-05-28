#!/usr/bin/env node
const assert = require("node:assert")
const crypto = require("node:crypto")
const fs = require("node:fs")
const path = require("node:path")
const {
  buildAtlas,
  IMAGE_PATH,
  MANIFEST_PATH,
  SOURCE_ID,
  SOURCE_IMAGE_INPUTS,
  SOURCE_LICENSE,
  TILESET_ID,
} = require("./build-internal-office-atlas.cjs")
const {
  starterVisualAssetCatalog,
  validateVisualAssetCatalog,
} = require("../packages/asset-registry/dist/index.js")

const ROOT_DIR = path.resolve(__dirname, "..")

assert.deepEqual(validateVisualAssetCatalog(starterVisualAssetCatalog), [])
assertGeneratedFilesAreCurrent()

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"))
const image = fs.readFileSync(IMAGE_PATH)
const imageSha256 = crypto.createHash("sha256").update(image).digest("hex")
assert.equal(manifest.checksums.imageSha256, imageSha256)
assert.equal(manifest.source.license, SOURCE_LICENSE)
assert.equal(manifest.source.redistributionAllowed, "yes")
assert.equal(manifest.source.commercialUseAllowed, "yes")
assert.equal(manifest.source.bundledInTargetApp, true)
assert.equal(
  manifest.source.externalImageInputs.length,
  SOURCE_IMAGE_INPUTS.length,
)
assert.ok(
  manifest.source.externalImageInputs.every((input) =>
    /CC-BY-SA|GPL/.test(input.license),
  ),
  "Every bundled external input must have a copyleft license path.",
)
assert.ok(
  manifest.source.externalImageInputs.every(
    (input) => !/OGA-BY|CC-BY-[0-9]/.test(input.license),
  ),
  "Bundled external inputs must not use permissive-only OGA-BY/CC-BY licenses.",
)

const sourcesById = new Map(
  starterVisualAssetCatalog.sources.map((source) => [source.id, source]),
)
const tilesetsById = new Map(
  starterVisualAssetCatalog.tilesets.map((tileset) => [tileset.id, tileset]),
)
const tokensById = new Map(
  starterVisualAssetCatalog.tokens.map((token) => [token.id, token]),
)
const manifestFramesByTokenId = new Map(
  manifest.frames.map((frame) => [frame.tokenId, frame]),
)

const internalSource = sourcesById.get(SOURCE_ID)
assert.ok(internalSource)
assert.equal(internalSource.status, "target_approved")
assert.equal(internalSource.license, SOURCE_LICENSE)
assert.match(internalSource.attributionText, /LPC copyleft source sheets/)
assert.equal(internalSource.redistributionAllowed, "yes")
assert.equal(internalSource.commercialUseAllowed, "yes")
assert.equal(internalSource.bundledInTargetApp, true)
assert.equal(internalSource.filePath, relativePath(MANIFEST_PATH))

const internalTileset = tilesetsById.get(TILESET_ID)
assert.ok(internalTileset)
assert.equal(internalTileset.sourceId, SOURCE_ID)
assert.equal(internalTileset.atlasImagePath, relativePath(IMAGE_PATH))
assert.equal(internalTileset.manifestPath, relativePath(MANIFEST_PATH))
assert.equal(internalTileset.exportScale, manifest.image.exportScale)

for (const source of starterVisualAssetCatalog.sources) {
  if (!source.bundledInTargetApp) continue

  assert.equal(
    source.status,
    "target_approved",
    `Bundled source ${source.id} must be target approved.`,
  )
  assert.equal(
    source.redistributionAllowed,
    "yes",
    `Bundled source ${source.id} must allow redistribution.`,
  )
  assert.equal(
    source.commercialUseAllowed,
    "yes",
    `Bundled source ${source.id} must allow commercial use.`,
  )
}

for (const token of starterVisualAssetCatalog.tokens) {
  if (token.sourceId !== SOURCE_ID) continue

  assert.ok(token.asset, `Internal token ${token.id} needs asset metadata.`)
  assert.equal(token.asset.frameId, token.id)
  assert.equal(token.asset.atlasId, manifest.atlasId)

  const frame = manifestFramesByTokenId.get(token.id)
  assert.ok(frame, `Internal token ${token.id} is missing from manifest.`)
  assert.deepEqual(frame.size, token.asset.size)
  assert.deepEqual(frame.anchor, token.asset.anchor)
  assert.deepEqual(frame.collisionFootprint, token.asset.collisionFootprint)
  assert.deepEqual(frame.visualFootprint, token.asset.visualFootprint)
  assert.deepEqual(frame.shadowFootprint, token.asset.shadowFootprint)
  assert.deepEqual(frame.zAnchor, token.asset.zAnchor)
  assert.deepEqual(frame.interaction, token.asset.interaction)
  assert.deepEqual(frame.occlusion, token.asset.occlusion)
  assert.deepEqual(frame.themeTags, token.asset.themeTags)
  assert.deepEqual(frame.variants, token.asset.variants)
  assert.equal(frame.width, token.asset.size.width * token.asset.size.exportScale)
  assert.equal(frame.height, token.asset.size.height * token.asset.size.exportScale)
  assert.ok(frame.themeTags.length > 0, `${token.id} must expose theme tags.`)
  assert.ok(frame.variants.length > 0, `${token.id} must expose variants.`)
  assert.ok(
    frame.variants.some(
      (variant) => variant.role === "default" && variant.frameId === token.id,
    ),
    `${token.id} must expose a default variant.`,
  )
}

for (const frame of manifest.frames) {
  const token = tokensById.get(frame.tokenId)
  assert.ok(token, `Manifest frame ${frame.tokenId} has no semantic token.`)
  assert.equal(
    token.sourceId,
    SOURCE_ID,
    `Manifest frame ${frame.tokenId} must map to the internal source.`,
  )
}

for (const input of manifest.source.externalImageInputs) {
  const sourceFilePath = path.join(ROOT_DIR, input.filePath)
  assert.ok(fs.existsSync(sourceFilePath), `Missing source asset ${input.filePath}`)
  assert.equal(
    crypto.createHash("sha256").update(fs.readFileSync(sourceFilePath)).digest("hex"),
    input.sha256,
    `Source asset checksum mismatch for ${input.filePath}`,
  )

  if (!input.creditsPath) continue

  const creditsFilePath = path.join(ROOT_DIR, input.creditsPath)
  assert.ok(
    fs.existsSync(creditsFilePath),
    `Missing source credits ${input.creditsPath}`,
  )
  assert.equal(
    crypto
      .createHash("sha256")
      .update(fs.readFileSync(creditsFilePath))
      .digest("hex"),
    input.creditsSha256,
    `Credits checksum mismatch for ${input.creditsPath}`,
  )
}

for (const source of starterVisualAssetCatalog.sources) {
  if (!source.id.startsWith("legacy.")) continue
  assert.equal(source.bundledInTargetApp, false)
}

console.log("Internal asset pipeline verification passed.")

function assertGeneratedFilesAreCurrent() {
  const generated = buildAtlas()
  assert.ok(fs.existsSync(IMAGE_PATH), `Missing ${relativePath(IMAGE_PATH)}`)
  assert.ok(
    fs.existsSync(MANIFEST_PATH),
    `Missing ${relativePath(MANIFEST_PATH)}`,
  )
  assert.equal(
    fs.readFileSync(IMAGE_PATH).compare(generated.image),
    0,
    "Atlas PNG is stale. Run node scripts/build-internal-office-atlas.cjs.",
  )
  assert.equal(
    fs.readFileSync(MANIFEST_PATH).compare(Buffer.from(generated.manifest)),
    0,
    "Atlas manifest is stale. Run node scripts/build-internal-office-atlas.cjs.",
  )
}

function relativePath(filePath) {
  return path.relative(ROOT_DIR, filePath).split(path.sep).join("/")
}
