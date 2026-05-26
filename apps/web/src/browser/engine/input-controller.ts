import {
  directionForMovementVector,
  movementVectorForDirection,
  type Direction,
  type MovementMode,
  type MovementVector,
} from "@aedventure/protocol"

import {
  shapeMovementVectorForFeel,
  type MovementFeelTuning,
} from "../movement-feel"

export interface MovementIntent {
  readonly vector: MovementVector
  readonly direction: Direction
  readonly movementMode: MovementMode
}

export interface RawMovementIntent extends MovementIntent {
  readonly rawVector: MovementVector
}

export interface MovementControlIntent {
  readonly id: number
  readonly vector: MovementVector
  readonly direction: Direction
  readonly source: "dpad"
  readonly button?: HTMLButtonElement
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

export class InputController {
  private readonly pressedDirections: Direction[] = []
  private readonly pressedControls: MovementControlIntent[] = []
  private readonly joystick: MovementJoystickState
  private pendingIntent?: MovementIntent
  private inFlight = false
  private lastRequestedDirection?: Direction
  private runToggled = false
  private shiftRunning = false

  constructor(
    private feel: MovementFeelTuning,
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

  setFeel(feel: MovementFeelTuning): void {
    this.feel = feel
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
    if (intent.button) {
      intent.button.dataset.active = "true"
    }
  }

  releaseControl(id: number): MovementControlIntent | undefined {
    const index = this.pressedControls.findIndex((intent) => intent.id === id)
    if (index === -1) return undefined

    const [intent] = this.pressedControls.splice(index, 1)
    if (intent?.button) {
      delete intent.button.dataset.active
    }
    return intent
  }

  clearHeldInput(): void {
    this.pressedDirections.length = 0
    this.shiftRunning = false
    this.pressedControls.forEach((intent) => {
      if (intent.button) {
        delete intent.button.dataset.active
      }
    })
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

    const vector = shapeMovementVectorForFeel(rawVector, this.feel)
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
