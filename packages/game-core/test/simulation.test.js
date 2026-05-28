const assert = require("assert")
const {
  advanceDeterministicTick,
  applyMovementIntentToEntity,
  collidesWithMap,
  createMovementReconciliation,
  createWorldSnapshot,
  movementCorrectionPx,
  replayMovementSimulations,
  simulateMovement,
  zonesAtPosition,
} = require("../dist/index.js")

function roundedVector(vector) {
  return {
    x: Number(vector.x.toFixed(3)),
    y: Number(vector.y.toFixed(3)),
  }
}

const map = {
  width: 128,
  height: 128,
  tileSize: 32,
  blockedTiles: [{ x: 2, y: 1 }],
}
const openMap = { ...map, blockedTiles: [] }
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
  map: openMap,
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
  map: openMap,
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
  map: openMap,
  playerSize,
  speedPxPerSecond: 64,
  deltaMs: 250,
})

assert.equal(diagonal.accepted, true)
assert.equal(Math.round(diagonal.position.x), 43)
assert.equal(Math.round(diagonal.position.y), 43)
assert.equal(diagonal.direction, "down")

const analogHalfTilt = simulateMovement({
  current: { x: 32, y: 32 },
  vector: { x: 0.5, y: 0 },
  seq: 51,
  map: openMap,
  playerSize,
  speedPxPerSecond: 64,
  deltaMs: 250,
})

assert.equal(analogHalfTilt.accepted, true)
assert.equal(Math.round(analogHalfTilt.position.x), 40)
assert.deepEqual(analogHalfTilt.requestedVector, { x: 1, y: 0 })

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
assert.equal(diagonalSlide.collisionSlideAxis, "x")
assert.equal(Math.round(diagonalSlide.collisionSlideDistancePx), 16)
assert.equal(Math.round(diagonalSlide.position.x), 59)
assert.deepEqual(diagonalSlide.appliedVector, { x: 1, y: 0 })

const applied = applyMovementIntentToEntity({
  entity: {
    entityId: "hero",
    entityKind: "player",
    position: { x: 32, y: 0 },
    direction: "down",
    zoneIds: [],
    movementMode: "walk",
  },
  message: {
    type: "move",
    vector: { x: 1, y: 0 },
    direction: "right",
    movementMode: "run",
    seq: 10,
  },
  map: openMap,
  playerSize,
  speed: {
    speedPxPerSecond: 64,
    runSpeedPxPerSecond: 128,
  },
  tickMs: 250,
  nowMs: 1000,
  deltaMs: 250,
  zones,
  permissions: ["zone:staff-room:enter"],
})

assert.equal(applied.movement.accepted, true)
assert.equal(applied.entity.direction, "right")
assert.equal(applied.entity.movementMode, "run")
assert.equal(applied.entity.lastSeqAck, 10)
assert.deepEqual(applied.entity.zoneIds, ["staff-room"])
assert.equal(applied.entity.position.x, 64)
assert.equal(applied.speedPxPerSecond, 128)
assert.equal(applied.reconciliation.accepted, true)
assert.equal(applied.reconciliation.seqAck, 10)

const idleApplied = applyMovementIntentToEntity({
  entity: applied.entity,
  message: {
    type: "move",
    vector: { x: 0, y: 0 },
    direction: "left",
    movementMode: "walk",
    seq: 11,
  },
  map: openMap,
  playerSize,
  speed: {
    speedPxPerSecond: 64,
    runSpeedPxPerSecond: 128,
  },
  tickMs: 250,
  nowMs: 1250,
  zones,
  permissions: ["zone:staff-room:enter"],
})

assert.equal(idleApplied.movement.accepted, true)
assert.deepEqual(idleApplied.movement.requestedVector, { x: 0, y: 0 })
assert.deepEqual(idleApplied.movement.appliedVector, { x: 0, y: 0 })
assert.equal(idleApplied.entity.direction, "left")
assert.equal(idleApplied.entity.position.x, 64)

const replay = replayMovementSimulations({
  from: { x: 0, y: 0 },
  map: openMap,
  playerSize,
  steps: [
    {
      seq: 1,
      vector: { x: 1, y: 0 },
      movementMode: "walk",
      speedPxPerSecond: 64,
      deltaMs: 250,
    },
    {
      seq: 2,
      vector: { x: 0, y: 1 },
      movementMode: "walk",
      speedPxPerSecond: 64,
      deltaMs: 250,
    },
  ],
})

assert.equal(replay.results.length, 2)
assert.deepEqual(roundedVector(replay.target), { x: 16, y: 16 })

const tick = advanceDeterministicTick({
  currentTick: 41,
  tickMs: 50,
  nowMs: 12345,
})

assert.deepEqual(tick, {
  tick: 42,
  tickMs: 50,
  serverTime: 12345,
})

const snapshot = createWorldSnapshot({
  roomId: "room-1",
  tick: tick.tick,
  tickMs: tick.tickMs,
  serverTime: tick.serverTime,
  inputStats: {
    authority: "server_authoritative_fixed_tick",
    inputCoalescing: "latest_intent_per_client_per_tick",
    queuedClientCount: 1,
    processedMoveCount: 1,
    droppedMoveCount: 0,
    maxQueueDepth: 1,
  },
  players: [
    {
      playerId: "hero",
      x: 64,
      y: 0,
      direction: "left",
      zoneIds: ["staff-room"],
      lastSeqAck: 11,
      movementMode: "walk",
    },
  ],
})

assert.equal(snapshot.type, "world_snapshot")
assert.equal(snapshot.tickMetadata.tick, 42)
assert.equal(snapshot.entities[0].entityId, "hero")
assert.equal(snapshot.entities[0].transform.position.x, 64)

assert.equal(
  movementCorrectionPx({ x: 10, y: 10 }, { x: 13, y: 14 }),
  5,
)
assert.deepEqual(
  createMovementReconciliation({
    seqAck: 12,
    authoritativePosition: { x: 13, y: 14 },
    predictedPosition: { x: 10, y: 10 },
    accepted: false,
    reason: "collision",
  }),
  {
    seqAck: 12,
    authoritativePosition: { x: 13, y: 14 },
    requestedVector: undefined,
    appliedVector: undefined,
    correctionPx: 5,
    replayFromSeq: undefined,
    accepted: false,
    reason: "collision",
  },
)

assert.equal(
  collidesWithMap(map, { x: 64, y: 32 }, playerSize),
  true,
)
