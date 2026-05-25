const assert = require("assert")
const {
  collidesWithMap,
  simulateMovement,
  zonesAtPosition,
} = require("../dist/index.js")

const map = {
  width: 128,
  height: 128,
  tileSize: 32,
  blockedTiles: [{ x: 2, y: 1 }],
}

const playerSize = { width: 16, height: 16 }

const accepted = simulateMovement({
  current: { x: 32, y: 32 },
  vector: { x: 1, y: 0 },
  seq: 1,
  map,
  playerSize,
  speedPxPerSecond: 32,
  deltaMs: 500,
})

assert.equal(accepted.accepted, false)
assert.equal(accepted.reason, "speed_limit")
assert.deepEqual(accepted.position, { x: 32, y: 32 })

const collision = simulateMovement({
  current: { x: 47, y: 32 },
  vector: { x: 1, y: 0 },
  seq: 2,
  map,
  playerSize,
  speedPxPerSecond: 64,
  deltaMs: 250,
})

assert.equal(collision.accepted, false)
assert.equal(collision.reason, "collision")

const zones = [
  {
    id: "staff-room",
    bounds: { x: 48, y: 0, width: 32, height: 64 },
    requiredPermission: "zone:staff-room:enter",
  },
]

assert.equal(
  zonesAtPosition(zones, { x: 52, y: 10 }, playerSize)[0].id,
  "staff-room",
)

const denied = simulateMovement({
  current: { x: 32, y: 0 },
  vector: { x: 1, y: 0 },
  seq: 3,
  map: { ...map, blockedTiles: [] },
  playerSize,
  speedPxPerSecond: 64,
  deltaMs: 250,
  zones,
  permissions: [],
})

assert.equal(denied.accepted, false)
assert.equal(denied.reason, "zone_permission")

const permitted = simulateMovement({
  current: { x: 32, y: 0 },
  vector: { x: 1, y: 0 },
  seq: 4,
  map: { ...map, blockedTiles: [] },
  playerSize,
  speedPxPerSecond: 64,
  deltaMs: 250,
  zones,
  permissions: ["zone:staff-room:enter"],
})

assert.equal(permitted.accepted, true)
assert.deepEqual(permitted.enteredZoneIds, ["staff-room"])

const diagonal = simulateMovement({
  current: { x: 32, y: 32 },
  vector: { x: 1, y: 1 },
  seq: 5,
  map: { ...map, blockedTiles: [] },
  playerSize,
  speedPxPerSecond: 64,
  deltaMs: 250,
})

assert.equal(diagonal.accepted, true)
assert.equal(Math.round(diagonal.position.x), 43)
assert.equal(Math.round(diagonal.position.y), 43)
assert.equal(diagonal.direction, "down")

const diagonalSlide = simulateMovement({
  current: { x: 48, y: 16 },
  vector: { x: 1, y: 1 },
  seq: 6,
  map,
  playerSize,
  speedPxPerSecond: 64,
  deltaMs: 250,
})

assert.equal(diagonalSlide.accepted, true)
assert.equal(diagonalSlide.collisionSlide, true)
assert.equal(Math.round(diagonalSlide.position.x), 59)
assert.equal(Math.round(diagonalSlide.position.y), 16)
assert.deepEqual(diagonalSlide.appliedVector, { x: 1, y: 0 })
assert.equal(
  collidesWithMap(map, { x: 64, y: 32 }, playerSize),
  true,
)
