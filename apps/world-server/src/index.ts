import {
  animationForDirection,
  isChatSendMessage,
  isMoveIntentMessage,
  type ChatRejectedMessage,
  type ChatSendMessage,
  type ClientMessage,
  type Direction,
  type MovementRejectedMessage,
  type PlayerStateMessage,
  type ProtocolErrorMessage,
  type ServerMessage,
} from "@aedventure/protocol"
import {
  type CollisionMap,
  type Size,
  type Vector2,
  type Zone,
  simulateMovement,
  zonesAtPosition,
} from "@aedventure/map-engine"
import {
  evaluateChatDelivery,
  type ParticipantPolicyContext,
} from "@aedventure/policy"

export interface WorldServerConfig {
  readonly map: CollisionMap
  readonly zones?: readonly Zone[]
  readonly playerSize: Size
  readonly speedPxPerSecond: number
  readonly defaultAvatarId: string
  readonly tickMs: number
  readonly defaultRoomId: string
  readonly proximityChatRadiusPx: number
}

export interface AddPlayerInput {
  readonly playerId: string
  readonly spawn: Vector2
  readonly avatarId?: string
  readonly roomId?: string
  readonly permissions?: readonly string[]
}

export interface PlayerSnapshot {
  readonly playerId: string
  readonly position: Vector2
  readonly roomId: string
  readonly direction: Direction
  readonly zoneIds: readonly string[]
  readonly permissions: readonly string[]
  readonly lastSeqAck: number
}

interface PlayerState {
  playerId: string
  position: Vector2
  roomId: string
  direction: Direction
  zoneIds: readonly string[]
  permissions: readonly string[]
  avatarId: string
  lastSeqAck: number
  lastProcessedAt?: number
}

export class AuthoritativeWorld {
  private readonly players = new Map<string, PlayerState>()

  constructor(private readonly config: WorldServerConfig) {}

  addPlayer(input: AddPlayerInput): PlayerSnapshot {
    const state: PlayerState = {
      playerId: input.playerId,
      position: input.spawn,
      roomId: input.roomId ?? this.config.defaultRoomId,
      direction: "down",
      zoneIds: zonesAtPosition(
        this.config.zones ?? [],
        input.spawn,
        this.config.playerSize,
      ).map((zone) => zone.id),
      permissions: input.permissions ?? [],
      avatarId: input.avatarId ?? this.config.defaultAvatarId,
      lastSeqAck: 0,
    }

    this.players.set(input.playerId, state)
    return snapshot(state)
  }

  removePlayer(playerId: string): boolean {
    return this.players.delete(playerId)
  }

  getPlayer(playerId: string): PlayerSnapshot | undefined {
    const state = this.players.get(playerId)
    return state ? snapshot(state) : undefined
  }

  handleClientMessage(
    playerId: string,
    message: ClientMessage | unknown,
    nowMs: number,
  ): ServerMessage {
    const state = this.players.get(playerId)

    if (!state) {
      return movementRejected(
        playerId,
        "unknown_player",
        { x: 0, y: 0 },
        getMessageSeq(message),
        nowMs,
      )
    }

    if (isMoveIntentMessage(message)) {
      return this.handleMoveIntent(state, message, nowMs)
    }

    if (isChatSendMessage(message)) {
      return this.handleChatMessage(state, message, nowMs)
    }

    return protocolError(
      "invalid_payload",
      "Expected move intent or chat message.",
      nowMs,
    )
  }

  private handleMoveIntent(
    state: PlayerState,
    message: ClientMessage,
    nowMs: number,
  ): ServerMessage {
    if (!isMoveIntentMessage(message)) {
      return protocolError("invalid_payload", "Expected move intent message.", nowMs)
    }

    const previousProcessedAt = state.lastProcessedAt ?? nowMs - this.config.tickMs
    const deltaMs = Math.max(0, nowMs - previousProcessedAt)
    const result = simulateMovement({
      current: state.position,
      direction: message.direction,
      seq: message.seq,
      map: this.config.map,
      playerSize: this.config.playerSize,
      speedPxPerSecond: this.config.speedPxPerSecond,
      deltaMs,
      zones: this.config.zones,
      currentZoneIds: state.zoneIds,
      permissions: state.permissions,
    })

    state.lastProcessedAt = nowMs
    state.direction = message.direction
    state.lastSeqAck = message.seq

    if (!result.accepted) {
      return movementRejected(
        state.playerId,
        result.reason ?? "collision",
        state.position,
        message.seq,
        nowMs,
      )
    }

    state.position = result.position
    state.zoneIds = applyZoneChanges(
      state.zoneIds,
      result.enteredZoneIds,
      result.leftZoneIds,
    )

    return playerStateMessage(state, message.seq, nowMs)
  }

  private handleChatMessage(
    state: PlayerState,
    message: ChatSendMessage,
    nowMs: number,
  ): ServerMessage {
    const decision = evaluateChatDelivery({
      sender: participantContext(state),
      participants: [...this.players.values()].map(participantContext),
      message,
      config: {
        proximityRadiusPx: this.config.proximityChatRadiusPx,
      },
    })

    if (!decision.allowed) {
      return chatRejected(state.playerId, decision.reason, message.seq, nowMs)
    }

    return {
      type: "chat_delivered",
      messageId: `${state.playerId}:${message.seq}`,
      fromPlayerId: state.playerId,
      scope: message.scope,
      body: message.body.trim(),
      recipientPlayerIds: decision.recipientPlayerIds,
      zoneId: message.zoneId,
      seqAck: message.seq,
      serverTime: nowMs,
    }
  }
}

function playerStateMessage(
  state: PlayerState,
  seqAck: number,
  serverTime: number,
): PlayerStateMessage {
  return {
    type: "player_state",
    playerId: state.playerId,
    x: state.position.x,
    y: state.position.y,
    direction: state.direction,
    anim: animationForDirection(state.avatarId, state.direction, true),
    seqAck,
    serverTime,
  }
}

function movementRejected(
  playerId: string,
  reason: MovementRejectedMessage["reason"],
  position: Vector2,
  seqAck: number,
  serverTime: number,
): MovementRejectedMessage {
  return {
    type: "movement_rejected",
    playerId,
    reason,
    x: position.x,
    y: position.y,
    seqAck,
    serverTime,
  }
}

function chatRejected(
  playerId: string,
  reason: ChatRejectedMessage["reason"],
  seqAck: number,
  serverTime: number,
): ChatRejectedMessage {
  return {
    type: "chat_rejected",
    playerId,
    reason,
    seqAck,
    serverTime,
  }
}

function protocolError(
  code: ProtocolErrorMessage["code"],
  message: string,
  serverTime: number,
): ProtocolErrorMessage {
  return {
    type: "protocol_error",
    code,
    message,
    serverTime,
  }
}

function snapshot(state: PlayerState): PlayerSnapshot {
  return {
    playerId: state.playerId,
    position: state.position,
    roomId: state.roomId,
    direction: state.direction,
    zoneIds: state.zoneIds,
    permissions: state.permissions,
    lastSeqAck: state.lastSeqAck,
  }
}

function participantContext(state: PlayerState): ParticipantPolicyContext {
  return {
    playerId: state.playerId,
    roomId: state.roomId,
    zoneIds: state.zoneIds,
    permissions: state.permissions,
    position: state.position,
  }
}

function getMessageSeq(message: unknown): number {
  if (
    typeof message === "object" &&
    message !== null &&
    "seq" in message &&
    typeof (message as { seq: unknown }).seq === "number"
  ) {
    return (message as { seq: number }).seq
  }

  return 0
}

function applyZoneChanges(
  currentZoneIds: readonly string[],
  enteredZoneIds: readonly string[],
  leftZoneIds: readonly string[],
): readonly string[] {
  const remaining = currentZoneIds.filter((zoneId) => !leftZoneIds.includes(zoneId))
  const merged = [...remaining]

  for (const zoneId of enteredZoneIds) {
    if (!merged.includes(zoneId)) merged.push(zoneId)
  }

  return merged
}
