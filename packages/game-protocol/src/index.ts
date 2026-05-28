export const PROTOCOL_VERSION = 1

export const DIRECTIONS = ["up", "down", "left", "right"] as const
export const MOVEMENT_MODES = ["walk", "run"] as const
export const GAME_INPUT_ACTIONS = [
  "move",
  "interact",
  "select",
  "cancel",
  "run",
] as const
export const CHAT_SCOPES = [
  "room",
  "proximity",
  "zone",
  "moderator_announcement",
] as const

export type Direction = (typeof DIRECTIONS)[number]
export type MovementMode = (typeof MOVEMENT_MODES)[number]
export type GameInputAction = (typeof GAME_INPUT_ACTIONS)[number]
export type ChatScope = (typeof CHAT_SCOPES)[number]

export interface MovementVector {
  readonly x: number
  readonly y: number
}

export interface WorldPosition {
  readonly x: number
  readonly y: number
}

export interface EntityTransform {
  readonly position: WorldPosition
  readonly direction?: Direction
  readonly zIndex?: number
}

export interface EntityMotionState {
  readonly movementMode?: MovementMode
  readonly velocity?: MovementVector
  readonly speedPxPerSecond?: number
}

export interface EntityState {
  readonly entityId: string
  readonly entityKind: "player" | "npc" | "object" | string
  readonly transform: EntityTransform
  readonly motion?: EntityMotionState
  readonly zoneIds?: readonly string[]
  readonly lastSeqAck?: number
  readonly metadata?: Readonly<Record<string, unknown>>
}

export interface MapLayerState {
  readonly name: string
  readonly width: number
  readonly height: number
  readonly gids: readonly (readonly number[])[]
}

export interface MapZoneState {
  readonly id: string
  readonly zoneType: string
  readonly xStart: number
  readonly yStart: number
  readonly xEnd: number
  readonly yEnd: number
}

export interface MapCollisionState {
  readonly name: "movement" | string
  readonly width: number
  readonly height: number
  readonly blocked: readonly (readonly boolean[])[]
}

export interface MapStateMessage {
  readonly type: "map_state"
  readonly mapId: string
  readonly mapVersion?: string
  readonly width: number
  readonly height: number
  readonly tileSize: number
  readonly layers: readonly MapLayerState[]
  readonly collisionLayers?: readonly MapCollisionState[]
  readonly zones?: readonly MapZoneState[]
  readonly spawnPoints?: readonly {
    readonly id: string
    readonly position: WorldPosition
  }[]
  readonly serverTime: number
}

export interface MovementReconciliationPayload {
  readonly seqAck: number
  readonly authoritativePosition: WorldPosition
  readonly requestedVector?: MovementVector
  readonly appliedVector?: MovementVector
  readonly correctionPx?: number
  readonly replayFromSeq?: number
  readonly accepted: boolean
  readonly reason?: MovementRejectedReason
}

export interface ServerTickMetadata {
  readonly authority: "server_authoritative_fixed_tick"
  readonly tick: number
  readonly tickMs: number
  readonly serverTime: number
  readonly inputStats: WorldSnapshotInputStats
}

export type ClientMessage =
  | MoveIntentMessage
  | ActionCommandMessage
  | ChatSendMessage

export type ServerMessage =
  | PlayerStateMessage
  | WorldSnapshotMessage
  | MovementRejectedMessage
  | ActionCommandResultMessage
  | MapStateMessage
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

export interface ActionCommandMessage {
  readonly type: "action"
  readonly action: Exclude<GameInputAction, "move"> | string
  readonly targetId?: string
  readonly targetKind?: "entity" | "zone" | "map" | string
  readonly seq: number
  readonly protocolVersion?: typeof PROTOCOL_VERSION
  readonly payload?: Readonly<Record<string, unknown>>
}

export interface ActionCommandResultMessage {
  readonly type: "action_result"
  readonly action: string
  readonly seqAck: number
  readonly accepted: boolean
  readonly targetId?: string
  readonly reason?: string
  readonly serverTime: number
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
  readonly reconciliation?: MovementReconciliationPayload
}

export interface WorldSnapshotPlayer {
  readonly playerId: string
  readonly userId?: string
  readonly x: number
  readonly y: number
  readonly direction: Direction
  readonly zoneIds: readonly string[]
  readonly lastSeqAck: number
  readonly movementMode?: MovementMode
}

export interface WorldSnapshotInputStats {
  readonly authority: "server_authoritative_fixed_tick"
  readonly inputCoalescing: "latest_intent_per_client_per_tick"
  readonly queuedClientCount: number
  readonly processedMoveCount: number
  readonly droppedMoveCount: number
  readonly maxQueueDepth: number
  readonly latestInputAgeMs?: number
}

export interface WorldSnapshotMessage {
  readonly type: "world_snapshot"
  readonly roomId: string
  readonly tick: number
  readonly tickMs: number
  readonly serverTime: number
  readonly inputStats: WorldSnapshotInputStats
  readonly players: readonly WorldSnapshotPlayer[]
  readonly entities?: readonly EntityState[]
  readonly map?: Pick<MapStateMessage, "mapId" | "mapVersion">
  readonly tickMetadata?: ServerTickMetadata
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
  readonly reconciliation?: MovementReconciliationPayload
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

export function isGameInputAction(value: unknown): value is GameInputAction {
  return (
    typeof value === "string" &&
    GAME_INPUT_ACTIONS.includes(value as GameInputAction)
  )
}

export function isMovementVector(value: unknown): value is MovementVector {
  if (!isRecord(value)) return false

  return (
    isMovementComponent(value.x) &&
    isMovementComponent(value.y)
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
  const vector = value.vector
  const direction = value.direction

  return (
    value.type === "move" &&
    (isNonZeroMovementVector(vector) || isDirection(direction)) &&
    (vector === undefined || isMovementVector(vector)) &&
    (direction === undefined || isDirection(direction)) &&
    (value.movementMode === undefined || isMovementMode(value.movementMode)) &&
    typeof seq === "number" &&
    Number.isInteger(seq) &&
    seq >= 0
  )
}

export function isActionCommandMessage(
  value: unknown,
): value is ActionCommandMessage {
  if (!isRecord(value)) return false

  const seq = value.seq
  return (
    value.type === "action" &&
    typeof value.action === "string" &&
    value.action.length > 0 &&
    typeof seq === "number" &&
    Number.isInteger(seq) &&
    seq >= 0 &&
    (value.targetId === undefined || typeof value.targetId === "string") &&
    (value.targetKind === undefined || typeof value.targetKind === "string")
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

export function isClientMessage(value: unknown): value is ClientMessage {
  return (
    isMoveIntentMessage(value) ||
    isActionCommandMessage(value) ||
    isChatSendMessage(value)
  )
}

export function isWorldSnapshotMessage(
  value: unknown,
): value is WorldSnapshotMessage {
  if (!isRecord(value)) return false

  return (
    value.type === "world_snapshot" &&
    typeof value.roomId === "string" &&
    typeof value.tick === "number" &&
    typeof value.tickMs === "number" &&
    typeof value.serverTime === "number" &&
    Array.isArray(value.players) &&
    isWorldSnapshotInputStats(value.inputStats)
  )
}

export function isWorldSnapshotInputStats(
  value: unknown,
): value is WorldSnapshotInputStats {
  if (!isRecord(value)) return false

  return (
    value.authority === "server_authoritative_fixed_tick" &&
    value.inputCoalescing === "latest_intent_per_client_per_tick" &&
    typeof value.queuedClientCount === "number" &&
    typeof value.processedMoveCount === "number" &&
    typeof value.droppedMoveCount === "number" &&
    typeof value.maxQueueDepth === "number"
  )
}

export function entityStateFromSnapshotPlayer(
  player: WorldSnapshotPlayer,
): EntityState {
  return {
    entityId: player.playerId,
    entityKind: "player",
    transform: {
      position: { x: player.x, y: player.y },
      direction: player.direction,
    },
    motion: {
      movementMode: player.movementMode,
    },
    zoneIds: player.zoneIds,
    lastSeqAck: player.lastSeqAck,
    metadata: player.userId ? { userId: player.userId } : undefined,
  }
}

export function serverTickMetadataForSnapshot(
  snapshot: Pick<
    WorldSnapshotMessage,
    "tick" | "tickMs" | "serverTime" | "inputStats"
  >,
): ServerTickMetadata {
  return {
    authority: "server_authoritative_fixed_tick",
    tick: snapshot.tick,
    tickMs: snapshot.tickMs,
    serverTime: snapshot.serverTime,
    inputStats: snapshot.inputStats,
  }
}

export function animationForDirection(
  avatarId: string,
  direction: Direction,
  moving: boolean,
): string {
  const action = moving ? "walk" : "idle"
  return `${avatarId}_${action}_${direction}`
}

function isNonZeroMovementVector(value: unknown): value is MovementVector {
  return isMovementVector(value) && Math.hypot(value.x, value.y) > 0
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
