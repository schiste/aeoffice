const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")
const {
  KNOWN_FACT_POLICIES,
  VISIBILITY_STATES,
  computeFieldOfView,
  coordsInVisibilityRadius,
  coordsInVisibilityRadiusFromOrigins,
  createVisibilityEntry,
  revealFieldOfView,
  createVisibilityMap,
  filterKnownFacts,
  getVisibilityEntry,
  getVisibilityState,
  isKnown,
  isVisibilityState,
  isVisible,
  knownFactForCell,
  markVisibleAsStale,
  mergeVisibilityEntry,
  mergeVisibilityMap,
  revealVisibilityRadius,
  setVisibilityEntry,
  validateVisibilityEntry,
  validateVisibilityMap,
  visibilityKey,
} = require("../dist/index.js")
const {
  createHexCoord,
  createHexTopology,
  createSquareCoord,
  createSquareTopology,
  hexBoundsFromRadius,
  serializeCellCoord,
} = require("../../game-topology/dist/index.js")

const neutralSource = fs.readFileSync(
  path.resolve(__dirname, "../src/index.ts"),
  "utf8",
)

for (const forbidden of [
  "ADD",
  "SkyOffice",
  "LimeZu",
  "office",
  "meeting",
  "media",
  "tenant",
  "admin",
  "account",
  "toxicity",
  "dungeon",
  "Phaser",
  "Wikimedia",
]) {
  assert.ok(
    !new RegExp(`\\b${forbidden}\\b`, "i").test(neutralSource),
    `game-visibility source must stay domain-neutral; found ${forbidden}.`,
  )
}

assert.deepEqual(VISIBILITY_STATES, ["hidden", "discovered", "visible", "stale"])
assert.equal(isVisibilityState("visible"), true)
assert.equal(isVisibilityState("unknown"), false)

const squareCoord = createSquareCoord(1, 2)
assert.equal(visibilityKey(squareCoord), "square:1:2")
assert.equal(visibilityKey("custom:cell"), "custom:cell")

const empty = createVisibilityMap()
assert.equal(getVisibilityState(empty, squareCoord), "hidden")
assert.deepEqual(getVisibilityEntry(empty, squareCoord), { state: "hidden" })
assert.equal(isVisible(empty, squareCoord), false)
assert.equal(isKnown(empty, squareCoord), false)

const discovered = createVisibilityEntry("discovered", {
  now: 4,
  revealSource: "fixture",
})
assert.deepEqual(discovered, {
  state: "discovered",
  discoveredAt: 4,
  revealSource: "fixture",
})

const visible = createVisibilityEntry("visible", { now: 7 })
assert.deepEqual(visible, {
  state: "visible",
  discoveredAt: 7,
  lastVisibleAt: 7,
})

const visibility = createVisibilityMap([[squareCoord, discovered]])
assert.equal(getVisibilityState(visibility, squareCoord), "discovered")
assert.equal(isKnown(visibility, squareCoord), true)

const updated = setVisibilityEntry(visibility, squareCoord, visible)
assert.equal(getVisibilityState(updated, squareCoord), "visible")
assert.equal(getVisibilityState(visibility, squareCoord), "discovered")

assert.deepEqual(
  mergeVisibilityEntry(
    { state: "discovered", discoveredAt: 2, revealSource: "old" },
    { state: "visible", discoveredAt: 5, lastVisibleAt: 9, revealSource: "new" },
  ),
  {
    state: "visible",
    discoveredAt: 2,
    lastVisibleAt: 9,
    revealSource: "new",
  },
)
assert.deepEqual(
  mergeVisibilityEntry(
    { state: "visible", discoveredAt: 1, lastVisibleAt: 8 },
    { state: "stale", discoveredAt: 3, lastVisibleAt: 4 },
  ),
  {
    state: "visible",
    discoveredAt: 1,
    lastVisibleAt: 8,
  },
)

const merged = mergeVisibilityMap(
  createVisibilityMap([[createSquareCoord(0, 0), { state: "discovered" }]]),
  createVisibilityMap([[createSquareCoord(0, 0), { state: "visible", lastVisibleAt: 3 }]]),
)
assert.equal(getVisibilityState(merged, createSquareCoord(0, 0)), "visible")

const square = createSquareTopology({
  cellSize: 16,
  bounds: { width: 5, height: 5 },
})
const squareRadius = coordsInVisibilityRadius(square, createSquareCoord(2, 2), 1)
assert.deepEqual(squareRadius, [
  createSquareCoord(2, 2),
  createSquareCoord(2, 1),
  createSquareCoord(3, 2),
  createSquareCoord(2, 3),
  createSquareCoord(1, 2),
])
assert.deepEqual(coordsInVisibilityRadius(square, createSquareCoord(9, 9), 1), [])

const hex = createHexTopology({
  radius: 10,
  bounds: hexBoundsFromRadius(2),
})
const hexRadius = coordsInVisibilityRadius(hex, createHexCoord(0, 0), 1)
assert.deepEqual(hexRadius, [
  createHexCoord(0, 0),
  createHexCoord(1, 0),
  createHexCoord(1, -1),
  createHexCoord(0, -1),
  createHexCoord(-1, 0),
  createHexCoord(-1, 1),
  createHexCoord(0, 1),
])

const multiOrigin = coordsInVisibilityRadiusFromOrigins(
  square,
  [createSquareCoord(0, 0), createSquareCoord(4, 4)],
  1,
)
assert.equal(multiOrigin.length, 6)
assert.ok(multiOrigin.some((coord) => serializeCellCoord(coord) === "square:0:1"))
assert.ok(multiOrigin.some((coord) => serializeCellCoord(coord) === "square:4:3"))

const revealed = revealVisibilityRadius(
  createVisibilityMap(),
  hex,
  [createHexCoord(0, 0)],
  1,
  "visible",
  { now: 12, revealSource: "test" },
)
assert.equal(revealed.size, 7)
assert.equal(getVisibilityState(revealed, createHexCoord(1, -1)), "visible")
assert.deepEqual(getVisibilityEntry(revealed, createHexCoord(1, -1)), {
  state: "visible",
  discoveredAt: 12,
  lastVisibleAt: 12,
  revealSource: "test",
})

const stale = markVisibleAsStale(revealed)
assert.equal(getVisibilityState(stale, createHexCoord(1, -1)), "stale")
assert.equal(getVisibilityEntry(stale, createHexCoord(1, -1)).lastVisibleAt, 12)

const facts = new Map([
  ["hex:1:-1", "visible fact"],
  ["hex:2:0", "hidden fact"],
])
assert.deepEqual(
  [...filterKnownFacts(facts, stale, KNOWN_FACT_POLICIES.rememberedOrVisible)],
  [["hex:1:-1", "visible fact"]],
)
assert.deepEqual(
  [...filterKnownFacts(facts, stale, KNOWN_FACT_POLICIES.visibleOnly)],
  [],
)
assert.equal(
  knownFactForCell(facts, stale, createHexCoord(1, -1)),
  "visible fact",
)
assert.equal(knownFactForCell(facts, stale, createHexCoord(2, 0)), undefined)

assert.equal(validateVisibilityEntry({ state: "visible", discoveredAt: 2 }).valid, true)
assert.equal(validateVisibilityEntry({ state: "hidden", lastVisibleAt: 2 }).valid, false)
assert.equal(
  validateVisibilityMap(stale, {
    allowedKeys: new Set(["hex:0:0"]),
  }).valid,
  false,
)
assert.equal(validateVisibilityMap(stale).valid, true)

assert.throws(
  () => coordsInVisibilityRadius(square, createSquareCoord(0, 0), -1),
  /radius must be a non-negative integer/,
)

// --- Occlusion-aware field of view ---
const fovSquare = createSquareTopology({ cellSize: 16, bounds: { width: 7, height: 7 } })

// A single opaque cell directly east of the viewer blocks everything behind it.
const occluded = computeFieldOfView(fovSquare, {
  origin: createSquareCoord(3, 3),
  radius: 3,
  isOpaque: (coord) => coord.x === 4 && coord.y === 3,
})
const occludedKeys = new Set(occluded.map((coord) => serializeCellCoord(coord)))
assert.ok(occludedKeys.has("square:3:3"), "origin is visible")
assert.ok(occludedKeys.has("square:4:3"), "the opaque cell itself is seen (its near face)")
assert.ok(!occludedKeys.has("square:5:3"), "the cell directly behind the wall is occluded")
assert.ok(!occludedKeys.has("square:6:3"), "the cell further behind the wall is occluded")
assert.ok(occludedKeys.has("square:1:3"), "an open cell to the side is visible")
assert.ok(occludedKeys.has("square:3:1"), "an open cell to the side is visible")

// A forward cone (facing north) excludes cells behind and to the side of the viewer.
const cone = computeFieldOfView(fovSquare, {
  origin: createSquareCoord(3, 3),
  radius: 3,
  isOpaque: () => false,
  facingToward: createSquareCoord(3, 1),
  coneHalfAngleDeg: 45,
})
const coneKeys = new Set(cone.map((coord) => serializeCellCoord(coord)))
assert.ok(coneKeys.has("square:3:3"), "origin is included in the cone FOV")
assert.ok(coneKeys.has("square:3:2"), "the cell ahead is in the cone")
assert.ok(coneKeys.has("square:3:1"), "further ahead is in the cone")
assert.ok(!coneKeys.has("square:3:4"), "the cell behind the viewer is outside the cone")
assert.ok(!coneKeys.has("square:3:5"), "further behind is outside the cone")
assert.ok(!coneKeys.has("square:1:3"), "a cell square to the side is outside a 90-degree cone")

// Peripheral base: the immediate front/left/right are visible (the cone's near
// base) even outside the narrow cone; the square directly behind stays hidden.
const baseCone = computeFieldOfView(fovSquare, {
  origin: createSquareCoord(3, 3),
  radius: 3,
  isOpaque: () => false,
  facingToward: createSquareCoord(3, 1),
  coneHalfAngleDeg: 45,
  peripheralRadius: 1,
})
const baseKeys = new Set(baseCone.map((coord) => serializeCellCoord(coord)))
assert.ok(baseKeys.has("square:3:2"), "the square ahead is in the cone base")
assert.ok(baseKeys.has("square:2:3"), "the adjacent left square is in the cone base")
assert.ok(baseKeys.has("square:4:3"), "the adjacent right square is in the cone base")
assert.ok(baseKeys.has("square:2:2"), "the front-left diagonal is in the cone base")
assert.ok(baseKeys.has("square:4:2"), "the front-right diagonal is in the cone base")
assert.ok(!baseKeys.has("square:3:4"), "the square directly behind stays hidden")
assert.ok(!baseKeys.has("square:4:4"), "a rear diagonal stays hidden")

// Memory: cells leave a remembered (stale) trail when no longer in the cone.
const lookNorth = revealFieldOfView(
  createVisibilityMap(),
  fovSquare,
  {
    origin: createSquareCoord(3, 3),
    radius: 3,
    isOpaque: () => false,
    facingToward: createSquareCoord(3, 1),
    coneHalfAngleDeg: 45,
  },
  "visible",
  { now: 1 },
)
assert.equal(getVisibilityState(lookNorth, createSquareCoord(3, 1)), "visible")
const lookSouth = revealFieldOfView(
  markVisibleAsStale(lookNorth),
  fovSquare,
  {
    origin: createSquareCoord(3, 3),
    radius: 3,
    isOpaque: () => false,
    facingToward: createSquareCoord(3, 5),
    coneHalfAngleDeg: 45,
  },
  "visible",
  { now: 2 },
)
assert.equal(
  getVisibilityState(lookSouth, createSquareCoord(3, 1)),
  "stale",
  "a cell seen earlier stays remembered after turning away",
)
assert.equal(
  getVisibilityState(lookSouth, createSquareCoord(3, 5)),
  "visible",
  "the newly-faced cell becomes visible",
)
