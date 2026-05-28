import {
  directionForMovementVector,
  isDirection,
  movementVectorForDirection,
  type Direction,
  type MovementMode,
  type MovementVector,
} from "@aedventure/game-protocol"

export type GameInputActionType =
  | "move"
  | "interact"
  | "select"
  | "cancel"
  | "run"

export type GameInputSource =
  | "keyboard"
  | "dpad"
  | "joystick"
  | "pointer"
  | "programmatic"

export interface InputVectorShaping {
  readonly analogCurveExponent: number
}

export interface MovementIntent {
  readonly type: "move"
  readonly vector: MovementVector
  readonly direction: Direction
  readonly movementMode: MovementMode
  readonly source?: GameInputSource
}

export interface RawMovementIntent extends MovementIntent {
  readonly rawVector: MovementVector
}

export interface MovementControlIntent {
  readonly id: number
  readonly vector: MovementVector
  readonly direction: Direction
  readonly source: "dpad" | "keyboard" | "pointer"
}

export interface MovementJoystickState {
  active: boolean
  pointerId?: number
  vector: MovementVector
  direction?: Direction
  magnitude: number
  knob: MovementVector
  radiusPx: number
  deadzonePx: number
}

export interface MovementInputSnapshot {
  readonly pressedDirections: readonly Direction[]
  readonly pressedControls: readonly MovementControlIntent[]
  readonly joystick: MovementJoystickState
  readonly pendingIntent?: MovementIntent
  readonly inFlight: boolean
  readonly lastRequestedDirection?: Direction
  readonly runToggled: boolean
  readonly shiftRunning: boolean
}

export interface KeyboardGameInputAction {
  readonly type: Exclude<GameInputActionType, "move">
  readonly source: "keyboard"
}

export interface SequenceNumberedInputShape {
  readonly type: GameInputActionType
  readonly seq: number
  readonly source?: GameInputSource
}

export interface SequenceNumberedMoveInput extends SequenceNumberedInputShape {
  readonly type: "move"
  readonly vector: MovementVector
  readonly direction: Direction
  readonly movementMode: MovementMode
}

export interface SequenceNumberedActionInput extends SequenceNumberedInputShape {
  readonly type: Exclude<GameInputActionType, "move">
}

export type SequenceNumberedGameInput =
  | SequenceNumberedMoveInput
  | SequenceNumberedActionInput

export interface JoystickSurfaceRect {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

export interface JoystickPointerInput {
  readonly pointerId: number
  readonly clientX: number
  readonly clientY: number
  readonly surfaceRect: JoystickSurfaceRect
  readonly deadzoneRatio: number
  readonly minMagnitude: number
  readonly previousDirection?: Direction
  readonly minRadiusPx?: number
}

export interface JoystickComputedInput {
  readonly pointerId: number
  readonly vector: MovementVector
  readonly direction?: Direction
  readonly magnitude: number
  readonly knob: MovementVector
  readonly radiusPx: number
  readonly deadzonePx: number
  readonly minMagnitude: number
}

export interface GameInputTelemetry {
  readonly source: "game_input"
  readonly neutralIntentTypes: readonly GameInputActionType[]
  readonly heldDirectionCount: number
  readonly pressedControlCount: number
  readonly joystickActive: boolean
  readonly pendingIntentType?: GameInputActionType
  readonly inFlight: boolean
  readonly runToggled: boolean
  readonly shiftRunning: boolean
  readonly repeatMs?: number
  readonly sequenceModel: "monotonic_client_sequence"
}

export class GameInputController {
  private readonly pressedDirections: Direction[] = []
  private readonly pressedControls: MovementControlIntent[] = []
  private readonly joystick: MovementJoystickState
  private pendingIntent?: MovementIntent
  private inFlight = false
  private lastRequestedDirection?: Direction
  private runToggled = false
  private shiftRunning = false

  constructor(
    private shaping: InputVectorShaping,
    options: {
      readonly joystickDefaultRadiusPx: number
      readonly joystickDeadzoneRatio: number
    },
  ) {
    this.joystick = {
      active: false,
      pointerId: undefined,
      vector: { x: 0, y: 0 },
      direction: undefined,
      magnitude: 0,
      knob: { x: 0, y: 0 },
      radiusPx: options.joystickDefaultRadiusPx,
      deadzonePx: options.joystickDefaultRadiusPx * options.joystickDeadzoneRatio,
    }
  }

  setVectorShaping(shaping: InputVectorShaping): void {
    this.shaping = shaping
  }

  snapshot(): MovementInputSnapshot {
    return {
      pressedDirections: this.pressedDirections,
      pressedControls: this.pressedControls,
      joystick: this.joystick,
      pendingIntent: this.pendingIntent,
      inFlight: this.inFlight,
      lastRequestedDirection: this.lastRequestedDirection,
      runToggled: this.runToggled,
      shiftRunning: this.shiftRunning,
    }
  }

  pressDirection(direction: Direction): void {
    this.releaseDirection(direction)
    this.pressedDirections.push(direction)
  }

  releaseDirection(direction: Direction): void {
    const index = this.pressedDirections.indexOf(direction)
    if (index !== -1) {
      this.pressedDirections.splice(index, 1)
    }
  }

  pressControl(intent: MovementControlIntent): void {
    this.releaseControl(intent.id)
    this.pressedControls.push(intent)
  }

  releaseControl(id: number): MovementControlIntent | undefined {
    const index = this.pressedControls.findIndex((intent) => intent.id === id)
    if (index === -1) return undefined

    const [intent] = this.pressedControls.splice(index, 1)
    return intent
  }

  clearHeldInput(): void {
    this.pressedDirections.length = 0
    this.shiftRunning = false
    this.pressedControls.length = 0
    this.releaseJoystick()
  }

  setRunToggled(enabled: boolean): void {
    this.runToggled = enabled
  }

  toggleRun(): boolean {
    this.runToggled = !this.runToggled
    return this.runToggled
  }

  setShiftRunning(enabled: boolean): void {
    this.shiftRunning = enabled
  }

  activeMovementMode(): MovementMode {
    return this.runToggled || this.shiftRunning ? "run" : "walk"
  }

  activeHeldDirection(): Direction | undefined {
    return this.activeHeldIntent()?.direction
  }

  activeHeldIntent(): RawMovementIntent | undefined {
    const pressed = new Set(this.pressedDirections)
    const joystickIntent = this.activeJoystickIntent()
    const controlVector = this.pressedControls.reduce(
      (result, intent) => ({
        x: clampMovementComponent(result.x + intent.vector.x),
        y: clampMovementComponent(result.y + intent.vector.y),
      }),
      { x: 0, y: 0 },
    )
    const rawVector = {
      x: clampMovementComponent(
        controlVector.x +
          (joystickIntent?.vector.x ?? 0) +
          (pressed.has("right") ? 1 : 0) +
          (pressed.has("left") ? -1 : 0),
      ),
      y: clampMovementComponent(
        controlVector.y +
          (joystickIntent?.vector.y ?? 0) +
          (pressed.has("down") ? 1 : 0) +
          (pressed.has("up") ? -1 : 0),
      ),
    }

    if (rawVector.x === 0 && rawVector.y === 0) return undefined

    const vector = shapeMovementVector(rawVector, this.shaping)
    if (vector.x === 0 && vector.y === 0) return undefined

    const orderedIntents = [
      ...this.pressedDirections.map((direction) => ({
        direction,
        vector: movementVectorForDirection(direction),
      })),
      ...this.pressedControls,
      ...(joystickIntent ? [joystickIntent] : []),
    ]

    return {
      type: "move",
      vector,
      rawVector,
      movementMode: this.activeMovementMode(),
      direction:
        orderedIntents
          .filter((intent) => vectorIncludesIntent(vector, intent.vector))
          .at(-1)?.direction ?? directionForMovementVector(vector),
    }
  }

  hasHeldInput(): boolean {
    return (
      this.pressedDirections.length > 0 ||
      this.pressedControls.length > 0 ||
      this.activeJoystickIntent() !== undefined
    )
  }

  setJoystickPointer(pointerId: number): void {
    this.joystick.pointerId = pointerId
  }

  joystickPointerId(): number | undefined {
    return this.joystick.pointerId
  }

  updateJoystick(input: {
    readonly pointerId: number
    readonly vector: MovementVector
    readonly direction?: Direction
    readonly magnitude: number
    readonly knob: MovementVector
    readonly radiusPx: number
    readonly deadzonePx: number
    readonly minMagnitude: number
  }): void {
    this.joystick.pointerId = input.pointerId
    this.joystick.active = input.magnitude > input.minMagnitude
    this.joystick.vector = input.vector
    this.joystick.direction = input.direction
    this.joystick.magnitude = Number(input.magnitude.toFixed(3))
    this.joystick.knob = input.knob
    this.joystick.radiusPx = input.radiusPx
    this.joystick.deadzonePx = input.deadzonePx
  }

  releaseJoystick(): MovementVector {
    const previousVector = this.joystick.vector
    this.joystick.active = false
    this.joystick.pointerId = undefined
    this.joystick.vector = { x: 0, y: 0 }
    this.joystick.magnitude = 0
    this.joystick.knob = { x: 0, y: 0 }
    return previousVector
  }

  activeJoystickIntent():
    | {
        readonly vector: MovementVector
        readonly direction: Direction
        readonly source: "joystick"
      }
    | undefined {
    if (!this.joystick.active) return undefined
    if (this.joystick.vector.x === 0 && this.joystick.vector.y === 0) {
      return undefined
    }

    return {
      vector: this.joystick.vector,
      direction:
        this.joystick.direction ??
        directionForMovementVector(this.joystick.vector),
      source: "joystick",
    }
  }

  markRequestStarted(direction: Direction): void {
    this.lastRequestedDirection = direction
  }

  lastDirectionOr(fallback: Direction): Direction {
    return this.lastRequestedDirection ?? fallback
  }

  setInFlight(inFlight: boolean): void {
    this.inFlight = inFlight
  }

  isInFlight(): boolean {
    return this.inFlight
  }

  queuePendingIntent(intent: MovementIntent): void {
    this.pendingIntent = intent
  }

  consumePendingIntent(): MovementIntent | undefined {
    const intent = this.pendingIntent
    this.pendingIntent = undefined
    return intent
  }
}

export { GameInputController as InputController }

export class GameInputSequencer {
  constructor(private nextSeq = 1) {}

  reset(nextSeq = 1): void {
    this.nextSeq = nextSeq
  }

  peek(): number {
    return this.nextSeq
  }

  next(): number {
    const seq = this.nextSeq
    this.nextSeq += 1
    return seq
  }

  sequenceMove(intent: MovementIntent): SequenceNumberedMoveInput {
    return sequenceMoveIntent(this.next(), intent)
  }

  sequenceAction(
    action: KeyboardGameInputAction,
  ): SequenceNumberedActionInput {
    return sequenceActionIntent(this.next(), action)
  }
}

export function sequenceMoveIntent(
  seq: number,
  intent: MovementIntent,
): SequenceNumberedMoveInput {
  return {
    type: "move",
    seq,
    source: intent.source,
    vector: intent.vector,
    direction: intent.direction,
    movementMode: intent.movementMode,
  }
}

export function sequenceActionIntent(
  seq: number,
  action: KeyboardGameInputAction,
): SequenceNumberedActionInput {
  return {
    type: action.type,
    seq,
    source: action.source,
  }
}

export function keyboardMovementDirectionForKey(
  key: string,
): Direction | undefined {
  switch (key) {
    case "ArrowUp":
    case "w":
    case "W":
      return "up"
    case "ArrowDown":
    case "s":
    case "S":
      return "down"
    case "ArrowLeft":
    case "a":
    case "A":
      return "left"
    case "ArrowRight":
    case "d":
    case "D":
      return "right"
    default:
      return undefined
  }
}

export function keyboardGameInputActionForKey(
  key: string,
): KeyboardGameInputAction | undefined {
  if (key === "e" || key === "E") return { type: "interact", source: "keyboard" }
  if (key === "Enter" || key === " ") return { type: "select", source: "keyboard" }
  if (key === "Escape") return { type: "cancel", source: "keyboard" }
  if (key === "Shift") return { type: "run", source: "keyboard" }
  return undefined
}

export function eventTargetConsumesGameInput(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined") return false
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  )
}

export function movementControlIntentFromDataset(
  dataset: {
    readonly moveX?: string
    readonly moveY?: string
    readonly facing?: string
  },
): Omit<MovementControlIntent, "id"> | undefined {
  const vector = {
    x: Number(dataset.moveX),
    y: Number(dataset.moveY),
  }

  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y)) return undefined
  if (!isControlVectorComponent(vector.x) || !isControlVectorComponent(vector.y)) {
    return undefined
  }
  if (vector.x === 0 && vector.y === 0) return undefined
  if (!isDirection(dataset.facing)) return undefined

  return {
    vector,
    direction: dataset.facing,
    source: "dpad",
  }
}

export function joystickInputFromPointer(
  input: JoystickPointerInput,
): JoystickComputedInput {
  const radiusPx = Math.max(
    input.minRadiusPx ?? 24,
    Math.min(input.surfaceRect.width, input.surfaceRect.height) / 2,
  )
  const deadzonePx = radiusPx * input.deadzoneRatio
  const center = {
    x: input.surfaceRect.left + input.surfaceRect.width / 2,
    y: input.surfaceRect.top + input.surfaceRect.height / 2,
  }
  const offset = {
    x: input.clientX - center.x,
    y: input.clientY - center.y,
  }
  const rawDistance = Math.hypot(offset.x, offset.y)
  const distance = Math.min(rawDistance, radiusPx)
  const magnitude = rawDistance <= deadzonePx ? 0 : distance / radiusPx
  const scale = rawDistance > 0 ? distance / rawDistance : 0
  const knob = {
    x: offset.x * scale,
    y: offset.y * scale,
  }
  const vector =
    magnitude <= input.minMagnitude
      ? { x: 0, y: 0 }
      : {
          x: roundMovementComponent(knob.x / radiusPx),
          y: roundMovementComponent(knob.y / radiusPx),
        }
  const direction =
    vector.x === 0 && vector.y === 0
      ? input.previousDirection
      : directionForMovementVector(vector)

  return {
    pointerId: input.pointerId,
    vector,
    direction,
    magnitude,
    knob,
    radiusPx,
    deadzonePx,
    minMagnitude: input.minMagnitude,
  }
}

export function gameInputTelemetry(
  snapshot: MovementInputSnapshot,
  options: { readonly repeatMs?: number } = {},
): GameInputTelemetry {
  return {
    source: "game_input",
    neutralIntentTypes: ["move", "interact", "select", "cancel", "run"],
    heldDirectionCount: snapshot.pressedDirections.length,
    pressedControlCount: snapshot.pressedControls.length,
    joystickActive: snapshot.joystick.active,
    pendingIntentType: snapshot.pendingIntent?.type,
    inFlight: snapshot.inFlight,
    runToggled: snapshot.runToggled,
    shiftRunning: snapshot.shiftRunning,
    repeatMs: options.repeatMs,
    sequenceModel: "monotonic_client_sequence",
  }
}

export function shapeMovementVector(
  vector: MovementVector,
  shaping: InputVectorShaping,
): MovementVector {
  const magnitude = Math.hypot(vector.x, vector.y)
  if (magnitude === 0) return { x: 0, y: 0 }

  const normalized = {
    x: vector.x / magnitude,
    y: vector.y / magnitude,
  }
  const clampedMagnitude = Math.min(1, magnitude)
  const curvedMagnitude = Math.pow(
    clampedMagnitude,
    Math.max(0.01, shaping.analogCurveExponent),
  )

  return {
    x: roundMovementComponent(normalized.x * curvedMagnitude),
    y: roundMovementComponent(normalized.y * curvedMagnitude),
  }
}

export function clampMovementComponent(value: number): number {
  if (value < -1) return -1
  if (value > 1) return 1
  return Number(value.toFixed(3))
}

export function vectorIncludesIntent(
  vector: MovementVector,
  intentVector: MovementVector,
): boolean {
  return (
    vectorComponentIncludesIntent(vector.x, intentVector.x) &&
    vectorComponentIncludesIntent(vector.y, intentVector.y) &&
    (intentVector.x !== 0 || intentVector.y !== 0)
  )
}

function vectorComponentIncludesIntent(
  value: number,
  intentValue: number,
): boolean {
  return intentValue === 0 || Math.sign(value) === Math.sign(intentValue)
}

function isControlVectorComponent(value: number): value is -1 | 0 | 1 {
  return value === -1 || value === 0 || value === 1
}

function roundMovementComponent(value: number): number {
  if (Math.abs(value) < 0.0005) return 0
  return Number(Math.max(-1, Math.min(1, value)).toFixed(3))
}
