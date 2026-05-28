const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")
const {
  GAME_INPUT_ACTIONS,
  directionForMovementVector,
  entityStateFromSnapshotPlayer,
  isActionCommandMessage,
  isClientMessage,
  isMoveIntentMessage,
  isWorldSnapshotMessage,
  movementModeForMoveIntent,
  movementVectorForDirection,
  movementVectorForMoveIntent,
  serverTickMetadataForSnapshot,
} = require("../dist/index.js")

const packageRoot = path.resolve(__dirname, "..")
const source = fs.readFileSync(path.join(packageRoot, "src", "index.ts"), "utf8")

for (const forbidden of [
  "SkyOffice",
  "LimeZu",
  "office",
  "media",
  "tenant",
  "admin",
  "account",
  "Wikimedia",
]) {
  assert.ok(
    !new RegExp(`\\b${forbidden}\\b`, "i").test(source),
    `game-protocol source must stay domain-neutral; found ${forbidden}.`,
  )
}

assert.deepEqual(GAME_INPUT_ACTIONS, [
  "move",
  "interact",
  "select",
  "cancel",
  "run",
])

assert.deepEqual(movementVectorForDirection("left"), { x: -1, y: 0 })
assert.equal(directionForMovementVector({ x: 0.2, y: -0.8 }), "up")

const move = {
  type: "move",
  vector: { x: 0.707, y: -0.707 },
  direction: "right",
  movementMode: "run",
  seq: 7,
}
assert.equal(isMoveIntentMessage(move), true)
assert.equal(isClientMessage(move), true)
assert.deepEqual(movementVectorForMoveIntent(move), move.vector)
assert.equal(movementModeForMoveIntent(move), "run")

const action = {
  type: "action",
  action: "interact",
  targetId: "door-1",
  targetKind: "entity",
  seq: 8,
}
assert.equal(isActionCommandMessage(action), true)
assert.equal(isClientMessage(action), true)

const inputStats = {
  authority: "server_authoritative_fixed_tick",
  inputCoalescing: "latest_intent_per_client_per_tick",
  queuedClientCount: 1,
  processedMoveCount: 2,
  droppedMoveCount: 0,
  maxQueueDepth: 1,
}
const snapshot = {
  type: "world_snapshot",
  roomId: "room-alpha",
  tick: 11,
  tickMs: 50,
  serverTime: 1234,
  inputStats,
  players: [
    {
      playerId: "player-1",
      userId: "user-1",
      x: 10,
      y: 20,
      direction: "down",
      zoneIds: ["zone-a"],
      lastSeqAck: 7,
      movementMode: "walk",
    },
  ],
}
assert.equal(isWorldSnapshotMessage(snapshot), true)
assert.deepEqual(serverTickMetadataForSnapshot(snapshot), {
  authority: "server_authoritative_fixed_tick",
  tick: 11,
  tickMs: 50,
  serverTime: 1234,
  inputStats,
})
assert.deepEqual(entityStateFromSnapshotPlayer(snapshot.players[0]), {
  entityId: "player-1",
  entityKind: "player",
  transform: {
    position: { x: 10, y: 20 },
    direction: "down",
  },
  motion: {
    movementMode: "walk",
  },
  zoneIds: ["zone-a"],
  lastSeqAck: 7,
  metadata: { userId: "user-1" },
})
