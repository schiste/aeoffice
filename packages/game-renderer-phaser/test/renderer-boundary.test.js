const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")

const packageRoot = path.resolve(__dirname, "..")
const sourceRoot = path.join(packageRoot, "src")
const publicApiSource = fs.readFileSync(
  path.join(packageRoot, "src", "index.ts"),
  "utf8",
)

const forbiddenTerms = [
  "SkyOffice",
  "LimeZu",
  "OfficeScene",
  "PhaserOfficeRenderer",
  "office",
  "meeting",
  "media",
  "admin",
  "account",
  "Wikimedia",
]

for (const filePath of sourceFiles(sourceRoot)) {
  const source = fs.readFileSync(filePath, "utf8")
  for (const forbidden of forbiddenTerms) {
    assert.ok(
      !new RegExp(`\\b${forbidden}\\b`, "i").test(source),
      `${path.relative(packageRoot, filePath)} must stay domain-neutral; found ${forbidden}.`,
    )
  }
}

for (const fileName of ["README.md", "package.json"]) {
  const source = fs.readFileSync(path.join(packageRoot, fileName), "utf8")
  for (const forbidden of forbiddenTerms) {
    assert.ok(
      !new RegExp(`\\b${forbidden}\\b`, "i").test(source),
      `${fileName} must stay domain-neutral; found ${forbidden}.`,
    )
  }
}

for (const exportedName of [
  "RendererHost",
  "PhaserTileWorldRenderer",
  "TileWorldScene",
  "RendererSceneManager",
  "TilemapRenderer",
  "SquareTilemapRenderer",
  "ObjectRenderer",
  "AvatarRenderer",
  "EntityRenderer",
  "ZoneRenderer",
  "CameraController",
  "DomWorldOverlayRenderer",
  "InteractionRenderer",
  "RendererTelemetry",
  "GameMapCellRenderer",
  "HexCellRenderer",
  "HexZoneRenderer",
  "HexLandmarkRenderer",
  "hexCellPolygonPoints",
  "CellPresentationPolicy",
  "WorldInteractionPolicy",
  "TopologyNavigationPolicy",
  "validateFixtureMapForRenderer",
]) {
  assert.match(
    publicApiSource,
    new RegExp(`\\b${exportedName}\\b`),
    `Expected @aedventure/game-renderer-phaser to export ${exportedName}.`,
  )
}

for (const sourcePath of [
  "src/shared/renderer-host.ts",
  "src/shared/camera-controller.ts",
  "src/shared/entity-renderer.ts",
  "src/shared/zone-renderer.ts",
  "src/shared/game-map-cell-renderer.ts",
  "src/shared/overlays.ts",
  "src/shared/telemetry.ts",
  "src/square/square-tilemap-renderer.ts",
  "src/hex/hex-cell-renderer.ts",
  "src/hex/hex-zone-renderer.ts",
  "src/hex/hex-landmark-renderer.ts",
]) {
  assert.ok(
    fs.existsSync(path.join(packageRoot, sourcePath)),
    `Expected topology renderer split file ${sourcePath} to exist.`,
  )
}

function sourceFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(filePath)
    if (entry.isFile() && filePath.endsWith(".ts")) return [filePath]
    return []
  })
}
