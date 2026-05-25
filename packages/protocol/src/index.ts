export const PROTOCOL_VERSION = 1

export const DIRECTIONS = ["up", "down", "left", "right"] as const
export const MOVEMENT_MODES = ["walk", "run"] as const
export const CHAT_SCOPES = [
  "room",
  "proximity",
  "zone",
  "moderator_announcement",
] as const

export type Direction = (typeof DIRECTIONS)[number]
export type MovementMode = (typeof MOVEMENT_MODES)[number]
export type ChatScope = (typeof CHAT_SCOPES)[number]

export interface MovementVector {
  readonly x: number
  readonly y: number
}

export type ClientMessage = MoveIntentMessage | ChatSendMessage

export type ServerMessage =
  | PlayerStateMessage
  | MovementRejectedMessage
  | ChatDeliveredMessage
  | ChatRejectedMessage
  | ProtocolErrorMessage

export interface MoveIntentMessage {
  readonly type: "move"
  readonly vector?: MovementVector
  readonly direction?: Direction
  readonly movementMode?: MovementMode
  readonly seq: number
  readonly protocolVersion?: typeof PROTOCOL_VERSION
}

export interface PlayerStateMessage {
  readonly type: "player_state"
  readonly playerId: string
  readonly x: number
  readonly y: number
  readonly direction: Direction
  readonly anim: string
  readonly seqAck: number
  readonly serverTime: number
  readonly requestedVector?: MovementVector
  readonly appliedVector?: MovementVector
  readonly collisionSlide?: boolean
  readonly collisionSlideAxis?: "x" | "y" | "corner"
  readonly collisionSlideDistancePx?: number
  readonly movementMode?: MovementMode
  readonly speedPxPerSecond?: number
}

export type MovementRejectedReason =
  | "invalid_message"
  | "collision"
  | "speed_limit"
  | "zone_permission"
  | "unknown_player"

export interface MovementRejectedMessage {
  readonly type: "movement_rejected"
  readonly playerId: string
  readonly reason: MovementRejectedReason
  readonly x: number
  readonly y: number
  readonly seqAck: number
  readonly serverTime: number
  readonly requestedVector?: MovementVector
  readonly appliedVector?: MovementVector
  readonly collisionSlide?: boolean
  readonly collisionSlideAxis?: "x" | "y" | "corner"
  readonly collisionSlideDistancePx?: number
  readonly movementMode?: MovementMode
  readonly speedPxPerSecond?: number
}

export interface ChatSendMessage {
  readonly type: "chat_send"
  readonly scope: ChatScope
  readonly body: string
  readonly seq: number
  readonly zoneId?: string
  readonly protocolVersion?: typeof PROTOCOL_VERSION
}

export type ChatRejectedReason =
  | "invalid_message"
  | "empty_body"
  | "missing_permission"
  | "out_of_scope"
  | "no_recipients"
  | "unknown_player"

export interface ChatDeliveredMessage {
  readonly type: "chat_delivered"
  readonly messageId: string
  readonly fromPlayerId: string
  readonly scope: ChatScope
  readonly body: string
  readonly recipientPlayerIds: readonly string[]
  readonly seqAck: number
  readonly serverTime: number
  readonly zoneId?: string
}

export interface ChatRejectedMessage {
  readonly type: "chat_rejected"
  readonly playerId: string
  readonly reason: ChatRejectedReason
  readonly seqAck: number
  readonly serverTime: number
}

export interface ProtocolErrorMessage {
  readonly type: "protocol_error"
  readonly code: "unsupported_message" | "invalid_payload"
  readonly message: string
  readonly serverTime: number
}

export function isDirection(value: unknown): value is Direction {
  return typeof value === "string" && DIRECTIONS.includes(value as Direction)
}

export function isMovementMode(value: unknown): value is MovementMode {
  return typeof value === "string" && MOVEMENT_MODES.includes(value as MovementMode)
}

export function isMovementVector(value: unknown): value is MovementVector {
  if (!isRecord(value)) return false

  return (
    isMovementComponent(value.x) &&
    isMovementComponent(value.y) &&
    Math.hypot(value.x, value.y) > 0
  )
}

export function movementVectorForDirection(direction: Direction): MovementVector {
  switch (direction) {
    case "up":
      return { x: 0, y: -1 }
    case "down":
      return { x: 0, y: 1 }
    case "left":
      return { x: -1, y: 0 }
    case "right":
      return { x: 1, y: 0 }
  }
}

export function directionForMovementVector(vector: MovementVector): Direction {
  if (Math.abs(vector.x) > Math.abs(vector.y)) {
    return vector.x < 0 ? "left" : "right"
  }

  return vector.y < 0 ? "up" : "down"
}

export function movementVectorForMoveIntent(
  message: MoveIntentMessage,
): MovementVector {
  return message.vector ?? movementVectorForDirection(message.direction ?? "down")
}

export function movementModeForMoveIntent(
  message: MoveIntentMessage,
): MovementMode {
  return message.movementMode ?? "walk"
}

export function isChatScope(value: unknown): value is ChatScope {
  return typeof value === "string" && CHAT_SCOPES.includes(value as ChatScope)
}

export function isMoveIntentMessage(value: unknown): value is MoveIntentMessage {
  if (!isRecord(value)) return false

  const seq = value.seq

  return (
    value.type === "move" &&
    (isMovementVector(value.vector) || isDirection(value.direction)) &&
    (value.vector === undefined || isMovementVector(value.vector)) &&
    (value.direction === undefined || isDirection(value.direction)) &&
    (value.movementMode === undefined || isMovementMode(value.movementMode)) &&
    typeof seq === "number" &&
    Number.isInteger(seq) &&
    seq >= 0
  )
}

export function isChatSendMessage(value: unknown): value is ChatSendMessage {
  if (!isRecord(value)) return false

  const seq = value.seq
  const zoneId = value.zoneId

  return (
    value.type === "chat_send" &&
    isChatScope(value.scope) &&
    typeof value.body === "string" &&
    typeof seq === "number" &&
    Number.isInteger(seq) &&
    seq >= 0 &&
    (zoneId === undefined || typeof zoneId === "string")
  )
}

export function animationForDirection(
  avatarId: string,
  direction: Direction,
  moving: boolean,
): string {
  const action = moving ? "walk" : "idle"
  return `${avatarId}_${action}_${direction}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isMovementComponent(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= -1 &&
    value <= 1
  )
}
