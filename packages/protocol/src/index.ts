export const PROTOCOL_VERSION = 1

export const DIRECTIONS = ["up", "down", "left", "right"] as const
export const CHAT_SCOPES = [
  "room",
  "proximity",
  "zone",
  "moderator_announcement",
] as const

export type Direction = (typeof DIRECTIONS)[number]
export type ChatScope = (typeof CHAT_SCOPES)[number]

export type ClientMessage = MoveIntentMessage | ChatSendMessage

export type ServerMessage =
  | PlayerStateMessage
  | MovementRejectedMessage
  | ChatDeliveredMessage
  | ChatRejectedMessage
  | ProtocolErrorMessage

export interface MoveIntentMessage {
  readonly type: "move"
  readonly direction: Direction
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

export function isChatScope(value: unknown): value is ChatScope {
  return typeof value === "string" && CHAT_SCOPES.includes(value as ChatScope)
}

export function isMoveIntentMessage(value: unknown): value is MoveIntentMessage {
  if (!isRecord(value)) return false

  const seq = value.seq

  return (
    value.type === "move" &&
    isDirection(value.direction) &&
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
