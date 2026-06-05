const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")
const {
  KNOWN_FACT_POLICIES,
  VISIBILITY_STATES,
  coordsInVisibilityRadius,
  coordsInVisibilityRadiusFromOrigins,
  createVisibilityEntry,
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
