const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")
const {
  coordInTopologyBounds,
  coordMatchesTopology,
  validateGameWorld,
} = require("../dist/index.js")

const source = fs.readFileSync(path.resolve(__dirname, "../src/index.ts"), "utf8")

for (const forbidden of [
  "SkyOffice",
  "LimeZu",
  "Wikimedia",
  "LiveKit",
  "tenant",
  "media",
  "account",
]) {
  assert.ok(
    !new RegExp(`\\b${forbidden}\\b`, "i").test(source),
    `game-world source must stay domain-neutral; found ${forbidden}.`,
  )
}

const squareCoord = (x, y) => ({ kind: "square", x, y })
const hexCoord = (q, r) => ({ kind: "hex", q, r })

const validWorld = {
  id: "world.neutral-fixture",
  activeMapId: "map.square-room",
  maps: [
    {
      id: "map.square-room",
      label: "Square fixture",
      topology: {
        kind: "square",
        cellSize: 32,
        bounds: { width: 4, height: 3 },
      },
      layers: [
        {
          id: "layer.terrain",
          kind: "terrain",
          cells: [
            {
              coord: squareCoord(0, 0),
              tokenId: "tile.floor",
              visibility: {
                state: "visible",
                discoveredAt: 3,
                lastVisibleAt: 3,
                revealSource: "neutral-fixture",
              },
            },
            {
              coord: squareCoord(1, 0),
              tokenId: "tile.floor",
              links: [
                {
                  id: "link.square-room.hex-overworld",
                  kind: "map",
                  label: "Hex overworld",
                  targetMapId: "map.hex-overworld",
                  targetCoord: hexCoord(1, -1),
                },
              ],
            },
          ],
        },
        {
          id: "layer.objects",
          kind: "objects",
          cells: [{ coord: squareCoord(2, 1), tokenId: "object.marker" }],
        },
      ],
      entities: [
        {
          id: "entity.hero",
          kind: "actor",
          coord: squareCoord(1, 1),
          layerId: "layer.objects",
        },
      ],
      zones: [
        {
          id: "zone.action",
          kind: "interaction",
          cells: [squareCoord(1, 1), squareCoord(2, 1)],
          interactionIds: ["interaction.inspect-marker"],
        },
      ],
      interactions: [
        {
          id: "interaction.inspect-marker",
          kind: "inspect",
          action: "inspect",
          target: { kind: "entity", id: "entity.hero" },
          requiredZoneId: "zone.action",
        },
      ],
    },
    {
      id: "map.hex-overworld",
      label: "Hex fixture",
      topology: {
        kind: "hex",
        radius: 16,
        bounds: { qMin: -2, qMax: 2, rMin: -2, rMax: 2, radius: 2 },
      },
      layers: [
        {
          id: "layer.hex-terrain",
          kind: "terrain",
          cells: [
            {
              coord: hexCoord(0, 0),
              tokenId: "hex.base",
              visibility: {
                state: "discovered",
                discoveredAt: 1,
                revealSource: "neutral-fixture",
              },
            },
            { coord: hexCoord(1, -1), tokenId: "hex.path" },
          ],
        },
      ],
      entities: [
        {
          id: "entity.landmark",
          kind: "landmark",
          coord: hexCoord(1, -1),
        },
      ],
      zones: [
        {
          id: "zone.hex-frontier",
          kind: "frontier",
          cells: [hexCoord(0, 0), hexCoord(1, -1)],
        },
      ],
      interactions: [
        {
          id: "interaction.open-map",
          kind: "map_action",
          action: "open",
          target: { kind: "map", id: "map.hex-overworld" },
        },
        {
          id: "interaction.enter-frontier",
          kind: "zone_action",
          action: "enter",
          target: { kind: "zone", id: "zone.hex-frontier" },
        },
      ],
    },
  ],
}

const validation = validateGameWorld(validWorld)
assert.equal(validation.valid, true)
assert.equal(validation.errors.length, 0)
assert.match(validation.summary, /valid with 2 map/)
assert.deepEqual(
  validation.checks
    .filter((check) => check.status === "fail")
    .map((check) => check.id),
  [],
)

assert.equal(
  coordMatchesTopology(squareCoord(1, 1), validWorld.maps[0].topology),
  true,
)
assert.equal(
  coordMatchesTopology(hexCoord(1, -1), validWorld.maps[0].topology),
  false,
)
assert.equal(
  coordInTopologyBounds(squareCoord(3, 2), validWorld.maps[0].topology),
  true,
)
assert.equal(
  coordInTopologyBounds(squareCoord(4, 2), validWorld.maps[0].topology),
  false,
)
assert.equal(
  coordInTopologyBounds(hexCoord(2, 0), validWorld.maps[1].topology),
  true,
)
assert.equal(
  coordInTopologyBounds(hexCoord(2, 1), validWorld.maps[1].topology),
  false,
)

const invalidWorld = {
  id: "",
  activeMapId: "missing",
  maps: [
    {
      id: "duplicate",
      topology: {
        kind: "square",
        cellSize: 0,
        bounds: { width: 0, height: 3 },
      },
      layers: [
        {
          id: "layer.bad",
          kind: "terrain",
          cells: [
            {
              coord: hexCoord(0, 0),
              visibility: {
                state: "hidden",
                lastVisibleAt: 9,
              },
              links: [
                {
                  id: "",
                  kind: "",
                  targetMapId: "",
                },
              ],
            },
          ],
        },
        {
          id: "layer.bad",
          kind: "objects",
        },
      ],
      entities: [
        {
          id: "entity.bad",
          kind: "actor",
          coord: squareCoord(8, 0),
          layerId: "layer.missing",
        },
        {
          id: "entity.bad",
          kind: "actor",
        },
      ],
      zones: [
        {
          id: "zone.bad",
          kind: "interaction",
          cells: [],
          interactionIds: ["interaction.missing"],
        },
      ],
      interactions: [
        {
          id: "interaction.bad",
          kind: "inspect",
          action: "inspect",
          target: { kind: "entity", id: "entity.missing" },
          requiredZoneId: "zone.missing",
        },
        {
          id: "interaction.bad",
          kind: "inspect",
          action: "inspect",
          target: { kind: "map", id: "map.missing" },
        },
      ],
    },
    {
      id: "duplicate",
      topology: {
        kind: "hex",
        radius: -1,
      },
      layers: [],
      entities: [],
      zones: [],
    },
  ],
}

const invalid = validateGameWorld(invalidWorld)
assert.equal(invalid.valid, false)
assert.ok(invalid.errors.some((error) => /id must not be empty/.test(error)))
assert.ok(invalid.errors.some((error) => /Duplicate map ids/.test(error)))
assert.ok(invalid.errors.some((error) => /Active map missing/.test(error)))
assert.ok(invalid.errors.some((error) => /cellSize must be positive/.test(error)))
assert.ok(invalid.errors.some((error) => /layer ids contain duplicates/.test(error)))
assert.ok(invalid.errors.some((error) => /entity ids contain duplicates/.test(error)))
assert.ok(invalid.errors.some((error) => /Layer cells outside topology/.test(error)))
assert.ok(invalid.errors.some((error) => /Cell visibility errors/.test(error)))
assert.ok(invalid.errors.some((error) => /Cell link errors/.test(error)))
assert.ok(invalid.errors.some((error) => /Entity coordinate\/layer errors/.test(error)))
assert.ok(invalid.errors.some((error) => /Zone cell errors/.test(error)))
assert.ok(invalid.errors.some((error) => /Interaction target errors/.test(error)))
assert.ok(invalid.errors.some((error) => /hex topology radius must be positive/.test(error)))

for (const appPath of ["../../../apps/web"]) {
  assertNoCurrentAppDependency(appPath)
}

function assertNoCurrentAppDependency(relativeAppPath) {
  const appRoot = path.resolve(__dirname, relativeAppPath)
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(appRoot, "package.json"), "utf8"),
  )
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }
  assert.equal(
    allDeps["@aedventure/game-world"],
    undefined,
    `${relativeAppPath} must not depend on game-world yet.`,
  )

  const srcRoot = path.join(appRoot, "src")
  for (const filePath of sourceFiles(srcRoot)) {
    const sourceText = fs.readFileSync(filePath, "utf8")
    assert.equal(
      sourceText.includes("@aedventure/game-world"),
      false,
      `${path.relative(appRoot, filePath)} must not import game-world yet.`,
    )
  }
}

function sourceFiles(root) {
  const entries = fs.readdirSync(root, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name)
    if (entry.isDirectory()) {
      files.push(...sourceFiles(fullPath))
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }
  return files
}
