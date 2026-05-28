export interface MovementFeelTuning {
  readonly walkSpeedPxPerSecond: number
  readonly runSpeedPxPerSecond: number
  readonly accelerationTimeConstantMs: number
  readonly decelerationTimeConstantMs: number
  readonly turnResponseTimeConstantMs: number
  readonly analogCurveExponent: number
  readonly collisionBodyRadiusPx: number
  readonly collisionSlideMaxNudgePx: number
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
export type MovementFeelPresetId =
  | "default"
  | "snappy"
  | "smooth"
  | "heavy"
  | "mobile"

export interface MovementFeelControl {
  readonly key: MovementFeelTuningKey
  readonly label: string
  readonly min: number
  readonly max: number
  readonly step: number
  readonly unit: string
  readonly help: string
}

export interface MovementFeelPreset {
  readonly id: MovementFeelPresetId
  readonly label: string
  readonly summary: string
  readonly values: MovementFeelTuning
}

export const MOVEMENT_WALK_SPEED_PX_PER_SECOND = 88
export const MOVEMENT_RUN_SPEED_PX_PER_SECOND = 148
export const MOVEMENT_ACCELERATION_TIME_CONSTANT_MS = 34
export const MOVEMENT_DECELERATION_TIME_CONSTANT_MS = 28
export const MOVEMENT_TURN_RESPONSE_TIME_CONSTANT_MS = 18
export const MOVEMENT_ANALOG_CURVE_EXPONENT = 1
export const MOVEMENT_COLLISION_BODY_RADIUS_PX = 7.5
export const MOVEMENT_COLLISION_SLIDE_MAX_NUDGE_PX = 12
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
  analogCurveExponent: MOVEMENT_ANALOG_CURVE_EXPONENT,
  collisionBodyRadiusPx: MOVEMENT_COLLISION_BODY_RADIUS_PX,
  collisionSlideMaxNudgePx: MOVEMENT_COLLISION_SLIDE_MAX_NUDGE_PX,
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

export const DEFAULT_MOVEMENT_FEEL_PRESET_ID: MovementFeelPresetId = "default"

export const MOVEMENT_FEEL_PRESETS: readonly MovementFeelPreset[] = [
  {
    id: "default",
    label: "Default",
    summary: "Balanced office movement baseline.",
    values: DEFAULT_MOVEMENT_FEEL,
  },
  {
    id: "snappy",
    label: "Snappy",
    summary: "Fast response for precise keyboard movement.",
    values: {
      ...DEFAULT_MOVEMENT_FEEL,
      walkSpeedPxPerSecond: 98,
      runSpeedPxPerSecond: 172,
      accelerationTimeConstantMs: 16,
      decelerationTimeConstantMs: 18,
      turnResponseTimeConstantMs: 8,
      collisionBodyRadiusPx: 7.25,
      collisionSlideMaxNudgePx: 14,
      activeCorrectionTimeConstantMs: 140,
      idleCorrectionTimeConstantMs: 70,
      softCorrectionThresholdPx: 1,
      collisionSlideSpeedScale: 0.9,
    },
  },
  {
    id: "smooth",
    label: "Smooth",
    summary: "Gliding feel with softer correction blends.",
    values: {
      ...DEFAULT_MOVEMENT_FEEL,
      walkSpeedPxPerSecond: 86,
      runSpeedPxPerSecond: 144,
      accelerationTimeConstantMs: 52,
      decelerationTimeConstantMs: 46,
      turnResponseTimeConstantMs: 34,
      analogCurveExponent: 1.05,
      collisionSlideMaxNudgePx: 13,
      activeCorrectionTimeConstantMs: 260,
      idleCorrectionTimeConstantMs: 150,
      softCorrectionThresholdPx: 2.5,
      hardCorrectionThresholdPx: 104,
      collisionSlideSpeedScale: 0.92,
    },
  },
  {
    id: "heavy",
    label: "Heavy",
    summary: "Weightier movement for slower, deliberate avatars.",
    values: {
      ...DEFAULT_MOVEMENT_FEEL,
      walkSpeedPxPerSecond: 76,
      runSpeedPxPerSecond: 122,
      accelerationTimeConstantMs: 82,
      decelerationTimeConstantMs: 70,
      turnResponseTimeConstantMs: 58,
      analogCurveExponent: 1.15,
      collisionBodyRadiusPx: 8.25,
      collisionSlideMaxNudgePx: 10,
      activeCorrectionTimeConstantMs: 300,
      idleCorrectionTimeConstantMs: 170,
      softCorrectionThresholdPx: 2,
      hardCorrectionThresholdPx: 100,
      collisionSlideSpeedScale: 0.75,
    },
  },
  {
    id: "mobile",
    label: "Mobile",
    summary: "Analog-friendly feel for touch joystick control.",
    values: {
      ...DEFAULT_MOVEMENT_FEEL,
      walkSpeedPxPerSecond: 84,
      runSpeedPxPerSecond: 138,
      accelerationTimeConstantMs: 42,
      decelerationTimeConstantMs: 36,
      turnResponseTimeConstantMs: 24,
      analogCurveExponent: 0.75,
      collisionBodyRadiusPx: 7.75,
      collisionSlideMaxNudgePx: 15,
      activeCorrectionTimeConstantMs: 220,
      idleCorrectionTimeConstantMs: 120,
      softCorrectionThresholdPx: 2,
      hardCorrectionThresholdPx: 112,
      collisionSlideSpeedScale: 0.95,
    },
  },
]

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
    key: "analogCurveExponent",
    label: "Analog curve",
    min: 0.65,
    max: 1.8,
    step: 0.05,
    unit: "x",
    help: "Lower values make partial joystick tilt more responsive.",
  },
  {
    key: "collisionBodyRadiusPx",
    label: "Body radius",
    min: 5,
    max: 10,
    step: 0.25,
    unit: "px",
    help: "Authoritative collision body radius around the avatar feet.",
  },
  {
    key: "collisionSlideMaxNudgePx",
    label: "Slide assist",
    min: 0,
    max: 18,
    step: 0.5,
    unit: "px",
    help: "Maximum corner nudge used to glide along walls and furniture.",
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
const MOVEMENT_FEEL_PRESET_MAP = new Map(
  MOVEMENT_FEEL_PRESETS.map((preset) => [preset.id, preset]),
)

export function movementFeelControlForKey(
  key: MovementFeelTuningKey,
): MovementFeelControl | undefined {
  return MOVEMENT_FEEL_CONTROL_MAP.get(key)
}

export function movementFeelPresetForId(
  id: MovementFeelPresetId,
): MovementFeelPreset {
  return MOVEMENT_FEEL_PRESET_MAP.get(id) ?? MOVEMENT_FEEL_PRESETS[0]
}

export function isMovementFeelPresetId(
  value: string,
): value is MovementFeelPresetId {
  return MOVEMENT_FEEL_PRESET_MAP.has(value as MovementFeelPresetId)
}

export function movementFeelPresetIdForTuning(
  feel: MovementFeelTuning,
): MovementFeelPresetId | "custom" {
  const normalized = normalizeMovementFeel(feel)

  return (
    MOVEMENT_FEEL_PRESETS.find((preset) =>
      movementFeelValuesEqual(normalized, normalizeMovementFeel(preset.values)),
    )?.id ?? "custom"
  )
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

export function movementCollisionBodySize(
  feel: MovementFeelTuning,
): { readonly width: number; readonly height: number } {
  const diameter = Math.max(1, feel.collisionBodyRadiusPx * 2)

  return {
    width: diameter,
    height: diameter,
  }
}

export function movementCollisionSlideOptions(
  feel: MovementFeelTuning,
): { readonly maxNudgePx: number } {
  return {
    maxNudgePx: feel.collisionSlideMaxNudgePx,
  }
}

function decimalPrecision(value: number): number {
  const [, decimals = ""] = value.toString().split(".")
  return decimals.length
}

function movementFeelValuesEqual(
  first: MovementFeelTuning,
  second: MovementFeelTuning,
): boolean {
  return (Object.keys(DEFAULT_MOVEMENT_FEEL) as MovementFeelTuningKey[]).every(
    (key) => first[key] === second[key],
  )
}
