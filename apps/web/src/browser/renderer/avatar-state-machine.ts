import type {
  AvatarAnimationAction,
  AvatarAnimationTransitionReason,
  AvatarVisualFacing,
  Direction,
  MovementMode,
} from "./types"

export interface AvatarAnimationStateMachineInput {
  readonly currentAction: AvatarAnimationAction
  readonly currentVisualFacing: AvatarVisualFacing
  readonly currentDirection: Direction
  readonly direction: Direction
  readonly movementMode: MovementMode
  readonly moved: boolean
  readonly directionChanged: boolean
  readonly movementModeChanged: boolean
  readonly identityChanged: boolean
  readonly avatarChanged: boolean
  readonly preview?: {
    readonly action: AvatarAnimationAction
    readonly visualFacing: AvatarVisualFacing
  }
  readonly visualFacingFromMotion: AvatarVisualFacing
  readonly visualFacingFromDirection: AvatarVisualFacing
  readonly nowMs: number
  readonly turnHoldUntilMs: number
  readonly turnDurationMs: number
}

export interface AvatarAnimationTransitionPlan {
  readonly action: AvatarAnimationAction
  readonly visualFacing: AvatarVisualFacing
  readonly reason: AvatarAnimationTransitionReason
  readonly preserveSpritePhase: boolean
  readonly restartSpriteClock: boolean
  readonly poseBlendDurationMs?: number
  readonly startTurnHold: boolean
  readonly clearTurnHold: boolean
}

export function resolveAvatarAnimationTransition(
  input: AvatarAnimationStateMachineInput,
): AvatarAnimationTransitionPlan {
  if (input.preview) {
    return {
      action: input.preview.action,
      visualFacing: input.preview.visualFacing,
      reason: "preview_locked",
      preserveSpritePhase: sameActionFamily(
        input.currentAction,
        input.preview.action,
      ),
      restartSpriteClock: !sameActionFamily(
        input.currentAction,
        input.preview.action,
      ),
      startTurnHold: false,
      clearTurnHold: true,
    }
  }

  if (input.avatarChanged || input.identityChanged) {
    return {
      action: input.moved ? input.movementMode : "idle",
      visualFacing: input.moved
        ? input.visualFacingFromMotion
        : input.visualFacingFromDirection,
      reason: "identity_changed",
      preserveSpritePhase: false,
      restartSpriteClock: true,
      startTurnHold: false,
      clearTurnHold: true,
    }
  }

  if (input.moved) {
    const directionBlend = input.currentVisualFacing !== input.visualFacingFromMotion
    const speedBlend =
      isLocomotionAction(input.currentAction) &&
      input.currentAction !== input.movementMode

    return {
      action: input.movementMode,
      visualFacing: input.visualFacingFromMotion,
      reason: isLocomotionAction(input.currentAction)
        ? speedBlend
          ? "locomotion_speed_blend"
          : directionBlend
            ? "locomotion_direction_blend"
            : "locomotion_continue"
        : "idle_to_locomotion",
      preserveSpritePhase: isLocomotionAction(input.currentAction),
      restartSpriteClock: !isLocomotionAction(input.currentAction),
      startTurnHold: false,
      clearTurnHold: true,
    }
  }

  if (input.currentAction === "turn" && input.nowMs < input.turnHoldUntilMs) {
    return {
      action: "turn",
      visualFacing: input.currentVisualFacing,
      reason: "turn_hold",
      preserveSpritePhase: true,
      restartSpriteClock: false,
      startTurnHold: false,
      clearTurnHold: false,
    }
  }

  if (input.directionChanged) {
    return {
      action: "turn",
      visualFacing: input.visualFacingFromDirection,
      reason: isLocomotionAction(input.currentAction)
        ? "locomotion_to_turn"
        : "idle_to_turn",
      preserveSpritePhase: false,
      restartSpriteClock: true,
      startTurnHold: true,
      clearTurnHold: false,
    }
  }

  if (input.currentAction === "turn") {
    return {
      action: "idle",
      visualFacing: input.currentVisualFacing,
      reason: "turn_to_idle",
      preserveSpritePhase: false,
      restartSpriteClock: true,
      startTurnHold: false,
      clearTurnHold: true,
    }
  }

  if (isLocomotionAction(input.currentAction)) {
    return {
      action: "idle",
      visualFacing: input.currentVisualFacing,
      reason: "locomotion_to_idle",
      preserveSpritePhase: false,
      restartSpriteClock: true,
      startTurnHold: false,
      clearTurnHold: true,
    }
  }

  return {
    action: "idle",
    visualFacing: input.currentVisualFacing,
    reason: "idle_hold",
    preserveSpritePhase: true,
    restartSpriteClock: false,
    startTurnHold: false,
    clearTurnHold: true,
  }
}

export function isLocomotionAction(action: AvatarAnimationAction): boolean {
  return action === "walk" || action === "run"
}

function sameActionFamily(
  previous: AvatarAnimationAction,
  next: AvatarAnimationAction,
): boolean {
  return previous === next || (isLocomotionAction(previous) && isLocomotionAction(next))
}
