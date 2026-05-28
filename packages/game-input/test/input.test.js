const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")
const {
  GameInputController,
  GameInputSequencer,
  eventTargetConsumesGameInput,
  gameInputTelemetry,
  joystickInputFromPointer,
  keyboardGameInputActionForKey,
  keyboardMovementDirectionForKey,
  movementControlIntentFromDataset,
  sequenceMoveIntent,
} = require("../dist/index.js")

const packageRoot = path.resolve(__dirname, "..")
const neutralSource = fs.readFileSync(
  path.join(packageRoot, "src", "index.ts"),
  "utf8",
)

for (const forbidden of [
  "SkyOffice",
  "LimeZu",
  "office",
  "meeting",
  "media",
  "tenant",
  "admin",
  "account",
  "Wikimedia",
]) {
  assert.ok(
    !new RegExp(`\\b${forbidden}\\b`, "i").test(neutralSource),
    `game-input source must stay domain-neutral; found ${forbidden}.`,
  )
}

const input = new GameInputController(
  { analogCurveExponent: 1 },
  { joystickDefaultRadiusPx: 48, joystickDeadzoneRatio: 0.2 },
)

assert.equal(keyboardMovementDirectionForKey("ArrowUp"), "up")
assert.equal(keyboardMovementDirectionForKey("d"), "right")
assert.equal(keyboardMovementDirectionForKey("x"), undefined)
assert.deepEqual(keyboardGameInputActionForKey("E"), {
  type: "interact",
  source: "keyboard",
})
assert.deepEqual(keyboardGameInputActionForKey("Escape"), {
  type: "cancel",
  source: "keyboard",
})
assert.equal(eventTargetConsumesGameInput(null), false)

input.pressDirection("right")
input.pressDirection("up")
let held = input.activeHeldIntent()
assert.equal(held.type, "move")
assert.equal(held.direction, "up")
assert.equal(held.movementMode, "walk")
assert.deepEqual(held.rawVector, { x: 1, y: -1 })
assert.ok(Math.abs(held.vector.x - 0.707) < 0.001)
assert.ok(Math.abs(held.vector.y + 0.707) < 0.001)

input.setShiftRunning(true)
held = input.activeHeldIntent()
assert.equal(held.movementMode, "run")

const dpad = movementControlIntentFromDataset({
  moveX: "-1",
  moveY: "0",
  facing: "left",
})
assert.deepEqual(dpad, {
  vector: { x: -1, y: 0 },
  direction: "left",
  source: "dpad",
})
input.pressControl({ ...dpad, id: 7 })
assert.equal(input.snapshot().pressedControls.length, 1)
assert.equal(input.releaseControl(7).direction, "left")

const joystick = joystickInputFromPointer({
  pointerId: 11,
  clientX: 148,
  clientY: 100,
  surfaceRect: { left: 52, top: 52, width: 96, height: 96 },
  deadzoneRatio: 0.2,
  minMagnitude: 0.08,
})
assert.equal(joystick.pointerId, 11)
assert.equal(joystick.direction, "right")
assert.equal(joystick.vector.x, 1)
assert.equal(joystick.vector.y, 0)

const sequencer = new GameInputSequencer(41)
assert.deepEqual(sequencer.sequenceMove(held), {
  type: "move",
  seq: 41,
  source: undefined,
  vector: held.vector,
  direction: held.direction,
  movementMode: "run",
})
assert.deepEqual(sequenceMoveIntent(42, held), {
  type: "move",
  seq: 42,
  source: undefined,
  vector: held.vector,
  direction: held.direction,
  movementMode: "run",
})

const telemetry = gameInputTelemetry(input.snapshot(), { repeatMs: 60 })
assert.equal(telemetry.source, "game_input")
assert.deepEqual(telemetry.neutralIntentTypes, [
  "move",
  "interact",
  "select",
  "cancel",
  "run",
])
assert.equal(telemetry.sequenceModel, "monotonic_client_sequence")
assert.equal(telemetry.repeatMs, 60)
