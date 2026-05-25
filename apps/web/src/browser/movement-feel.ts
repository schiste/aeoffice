export interface MovementFeelTuning {
  readonly walkSpeedPxPerSecond: number
  readonly runSpeedPxPerSecond: number
  readonly accelerationTimeConstantMs: number
  readonly decelerationTimeConstantMs: number
  readonly turnResponseTimeConstantMs: number
  readonly activeCorrectionTimeConstantMs: number
  readonly idleCorrectionTimeConstantMs: number
  readonly softCorrectionThresholdPx: number
  readonly hardCorrectionThresholdPx: number
  readonly correctionEpsilonPx: number
  readonly collisionSlideSpeedScale: number
  readonly frameStepLimitMs: number
  readonly stopVelocityEpsilonPxPerSecond: number
}

export type MovementFeelTuningKey = keyof MovementFeelTuning

export interface MovementFeelControl {
  readonly key: MovementFeelTuningKey
  readonly label: string
  readonly min: number
  readonly max: number
  readonly step: number
  readonly unit: string
  readonly help: string
}

export const MOVEMENT_WALK_SPEED_PX_PER_SECOND = 88
export const MOVEMENT_RUN_SPEED_PX_PER_SECOND = 148
export const MOVEMENT_ACCELERATION_TIME_CONSTANT_MS = 34
export const MOVEMENT_DECELERATION_TIME_CONSTANT_MS = 28
export const MOVEMENT_TURN_RESPONSE_TIME_CONSTANT_MS = 18
export const MOVEMENT_ACTIVE_CORRECTION_TIME_CONSTANT_MS = 190
export const MOVEMENT_IDLE_CORRECTION_TIME_CONSTANT_MS = 90
export const MOVEMENT_SOFT_CORRECTION_THRESHOLD_PX = 1.5
export const MOVEMENT_HARD_CORRECTION_THRESHOLD_PX = 96
export const MOVEMENT_CORRECTION_EPSILON_PX = 0.35
export const MOVEMENT_COLLISION_SLIDE_SPEED_SCALE = 1
export const MOVEMENT_FRAME_STEP_LIMIT_MS = 50
export const MOVEMENT_STOP_VELOCITY_EPSILON_PX_PER_SECOND = 1.5

export const DEFAULT_MOVEMENT_FEEL: MovementFeelTuning = {
  walkSpeedPxPerSecond: MOVEMENT_WALK_SPEED_PX_PER_SECOND,
  runSpeedPxPerSecond: MOVEMENT_RUN_SPEED_PX_PER_SECOND,
  accelerationTimeConstantMs: MOVEMENT_ACCELERATION_TIME_CONSTANT_MS,
  decelerationTimeConstantMs: MOVEMENT_DECELERATION_TIME_CONSTANT_MS,
  turnResponseTimeConstantMs: MOVEMENT_TURN_RESPONSE_TIME_CONSTANT_MS,
  activeCorrectionTimeConstantMs: MOVEMENT_ACTIVE_CORRECTION_TIME_CONSTANT_MS,
  idleCorrectionTimeConstantMs: MOVEMENT_IDLE_CORRECTION_TIME_CONSTANT_MS,
  softCorrectionThresholdPx: MOVEMENT_SOFT_CORRECTION_THRESHOLD_PX,
  hardCorrectionThresholdPx: MOVEMENT_HARD_CORRECTION_THRESHOLD_PX,
  correctionEpsilonPx: MOVEMENT_CORRECTION_EPSILON_PX,
  collisionSlideSpeedScale: MOVEMENT_COLLISION_SLIDE_SPEED_SCALE,
  frameStepLimitMs: MOVEMENT_FRAME_STEP_LIMIT_MS,
  stopVelocityEpsilonPxPerSecond:
    MOVEMENT_STOP_VELOCITY_EPSILON_PX_PER_SECOND,
}

export const MOVEMENT_FEEL_CONTROLS: readonly MovementFeelControl[] = [
  {
    key: "walkSpeedPxPerSecond",
    label: "Walk speed",
    min: 48,
    max: 140,
    step: 1,
    unit: "px/s",
    help: "Base local movement speed.",
  },
  {
    key: "runSpeedPxPerSecond",
    label: "Run speed",
    min: 80,
    max: 230,
    step: 1,
    unit: "px/s",
    help: "Local sprint target speed.",
  },
  {
    key: "accelerationTimeConstantMs",
    label: "Acceleration",
    min: 6,
    max: 140,
    step: 1,
    unit: "ms",
    help: "Lower values reach target speed faster.",
  },
  {
    key: "decelerationTimeConstantMs",
    label: "Deceleration",
    min: 6,
    max: 160,
    step: 1,
    unit: "ms",
    help: "Lower values stop faster after release.",
  },
  {
    key: "turnResponseTimeConstantMs",
    label: "Turn response",
    min: 4,
    max: 120,
    step: 1,
    unit: "ms",
    help: "Lower values make direction changes snappier.",
  },
  {
    key: "activeCorrectionTimeConstantMs",
    label: "Moving correction",
    min: 30,
    max: 420,
    step: 1,
    unit: "ms",
    help: "Blend server corrections while input is held.",
  },
  {
    key: "idleCorrectionTimeConstantMs",
    label: "Idle correction",
    min: 20,
    max: 260,
    step: 1,
    unit: "ms",
    help: "Blend server corrections after input stops.",
  },
  {
    key: "softCorrectionThresholdPx",
    label: "Soft threshold",
    min: 0,
    max: 8,
    step: 0.25,
    unit: "px",
    help: "Ignore tiny reconciliation differences.",
  },
  {
    key: "hardCorrectionThresholdPx",
    label: "Hard threshold",
    min: 16,
    max: 180,
    step: 1,
    unit: "px",
    help: "Snap instead of blending very large corrections.",
  },
  {
    key: "collisionSlideSpeedScale",
    label: "Slide carry",
    min: 0,
    max: 1,
    step: 0.05,
    unit: "x",
    help: "How much velocity survives a collision slide.",
  },
]

const MOVEMENT_FEEL_CONTROL_MAP = new Map(
  MOVEMENT_FEEL_CONTROLS.map((control) => [control.key, control]),
)

export function movementFeelControlForKey(
  key: MovementFeelTuningKey,
): MovementFeelControl | undefined {
  return MOVEMENT_FEEL_CONTROL_MAP.get(key)
}

export function isMovementFeelTuningKey(
  value: string,
): value is MovementFeelTuningKey {
  return value in DEFAULT_MOVEMENT_FEEL
}

export function normalizeMovementFeel(
  input: Partial<MovementFeelTuning>,
): MovementFeelTuning {
  return {
    ...DEFAULT_MOVEMENT_FEEL,
    ...Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        key,
        isMovementFeelTuningKey(key)
          ? clampMovementFeelValue(key, Number(value))
          : value,
      ]),
    ),
  }
}

export function clampMovementFeelValue(
  key: MovementFeelTuningKey,
  value: number,
): number {
  const fallback = DEFAULT_MOVEMENT_FEEL[key]
  const finiteValue = Number.isFinite(value) ? value : fallback
  const control = movementFeelControlForKey(key)

  if (!control) return finiteValue

  const clamped = Math.max(control.min, Math.min(control.max, finiteValue))
  const precision = decimalPrecision(control.step)
  return Number(clamped.toFixed(precision))
}

export function formatMovementFeelValue(
  key: MovementFeelTuningKey,
  value: number,
): string {
  const control = movementFeelControlForKey(key)
  const precision = control ? decimalPrecision(control.step) : 2
  const formatted = Number(value.toFixed(precision)).toString()
  return control?.unit ? `${formatted}${control.unit}` : formatted
}

function decimalPrecision(value: number): number {
  const [, decimals = ""] = value.toString().split(".")
  return decimals.length
}
