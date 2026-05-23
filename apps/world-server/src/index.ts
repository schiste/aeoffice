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
import {
  isWorldTokenClaims,
  type RoomId,
  type UserId,
  type WorldTokenClaims,
} from "@aedventure/shared-types"

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
  readonly userId?: UserId
  readonly spawn: Vector2
  readonly avatarId?: string
  readonly roomId?: string
  readonly permissions?: readonly string[]
  readonly roles?: readonly string[]
}

export interface PlayerSnapshot {
  readonly playerId: string
  readonly userId?: UserId
  readonly position: Vector2
  readonly roomId: string
  readonly direction: Direction
  readonly zoneIds: readonly string[]
  readonly permissions: readonly string[]
  readonly roles: readonly string[]
  readonly lastSeqAck: number
}

interface PlayerState {
  playerId: string
  userId?: UserId
  position: Vector2
  roomId: string
  direction: Direction
  zoneIds: readonly string[]
  permissions: readonly string[]
  roles: readonly string[]
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
      userId: input.userId,
      position: input.spawn,
      roomId: input.roomId ?? this.config.defaultRoomId,
      direction: "down",
      zoneIds: zonesAtPosition(
        this.config.zones ?? [],
        input.spawn,
        this.config.playerSize,
      ).map((zone) => zone.id),
      permissions: input.permissions ?? [],
      roles: input.roles ?? [],
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

export interface WorldTokenVerifier {
  verify(token: string): WorldTokenClaims
}

export interface WorldAdmissionInput {
  readonly token: string
  readonly playerId: string
  readonly spawn: Vector2
  readonly nowMs: number
  readonly avatarId?: string
  readonly requestedRoomId?: RoomId
}

export type WorldAdmissionDeniedReason =
  | "invalid_token"
  | "expired_token"
  | "room_mismatch"

export interface WorldAdmissionAllowed {
  readonly status: "admitted"
  readonly player: PlayerSnapshot
  readonly claims: WorldTokenClaims
}

export interface WorldAdmissionDenied {
  readonly status: "denied"
  readonly reason: WorldAdmissionDeniedReason
}

export type WorldAdmissionResult =
  | WorldAdmissionAllowed
  | WorldAdmissionDenied

export interface WorldRoomJoinRequest {
  readonly clientId: string
  readonly token: string
  readonly playerId: string
  readonly spawn: Vector2
  readonly nowMs: number
  readonly avatarId?: string
  readonly requestedRoomId?: RoomId
}

export type WorldRoomJoinResult =
  | {
      readonly status: "joined"
      readonly clientId: string
      readonly player: PlayerSnapshot
    }
  | {
      readonly status: "denied"
      readonly clientId: string
      readonly reason: WorldAdmissionDeniedReason
    }

export type WorldRoomEvent =
  | {
      readonly type: "send"
      readonly clientIds: readonly string[]
      readonly message: ServerMessage
    }
  | {
      readonly type: "broadcast"
      readonly exceptClientId?: string
      readonly message: ServerMessage
    }

interface WorldRoomClient {
  readonly clientId: string
  readonly playerId: string
}

export class WorldAdmissionService {
  constructor(
    private readonly world: AuthoritativeWorld,
    private readonly verifier: WorldTokenVerifier,
  ) {}

  admit(input: WorldAdmissionInput): WorldAdmissionResult {
    let claims: WorldTokenClaims

    try {
      claims = this.verifier.verify(input.token)
    } catch {
      return {
        status: "denied",
        reason: "invalid_token",
      }
    }

    if (Date.parse(claims.expiresAt) <= input.nowMs) {
      return {
        status: "denied",
        reason: "expired_token",
      }
    }

    if (
      claims.roomId !== undefined &&
      input.requestedRoomId !== undefined &&
      claims.roomId !== input.requestedRoomId
    ) {
      return {
        status: "denied",
        reason: "room_mismatch",
      }
    }

    const player = this.world.addPlayer({
      playerId: input.playerId,
      userId: claims.sub,
      spawn: input.spawn,
      avatarId: input.avatarId,
      roomId: input.requestedRoomId ?? claims.roomId,
      permissions: claims.permissions,
      roles: claims.roles,
    })

    return {
      status: "admitted",
      player,
      claims,
    }
  }
}

export class WorldRoomController {
  private readonly clients = new Map<string, WorldRoomClient>()
  private readonly playerClients = new Map<string, string>()

  constructor(
    private readonly world: AuthoritativeWorld,
    private readonly admission: WorldAdmissionService,
  ) {}

  join(input: WorldRoomJoinRequest): WorldRoomJoinResult {
    const admission = this.admission.admit({
      token: input.token,
      playerId: input.playerId,
      spawn: input.spawn,
      nowMs: input.nowMs,
      avatarId: input.avatarId,
      requestedRoomId: input.requestedRoomId,
    })

    if (admission.status === "denied") {
      return {
        status: "denied",
        clientId: input.clientId,
        reason: admission.reason,
      }
    }

    this.clients.set(input.clientId, {
      clientId: input.clientId,
      playerId: input.playerId,
    })
    this.playerClients.set(input.playerId, input.clientId)

    return {
      status: "joined",
      clientId: input.clientId,
      player: admission.player,
    }
  }

  leave(clientId: string): boolean {
    const client = this.clients.get(clientId)

    if (!client) {
      return false
    }

    this.clients.delete(clientId)
    this.playerClients.delete(client.playerId)
    return this.world.removePlayer(client.playerId)
  }

  receive(clientId: string, message: unknown, nowMs: number): readonly WorldRoomEvent[] {
    const client = this.clients.get(clientId)

    if (!client) {
      return [
        {
          type: "send",
          clientIds: [clientId],
          message: protocolError(
            "invalid_payload",
            "Client is not admitted to this world room.",
            nowMs,
          ),
        },
      ]
    }

    const response = this.world.handleClientMessage(client.playerId, message, nowMs)

    return routeServerMessage(response, clientId, this.playerClients)
  }
}

export class UnsignedLocalWorldTokenVerifier implements WorldTokenVerifier {
  verify(token: string): WorldTokenClaims {
    const prefix = "unsigned-local."

    if (!token.startsWith(prefix)) {
      throw new Error("Unsupported token format.")
    }

    const parsed = JSON.parse(token.slice(prefix.length)) as unknown

    if (!isWorldTokenClaims(parsed)) {
      throw new Error("Invalid world token claims.")
    }

    return parsed
  }
}

function routeServerMessage(
  message: ServerMessage,
  senderClientId: string,
  playerClients: ReadonlyMap<string, string>,
): readonly WorldRoomEvent[] {
  if (message.type === "chat_delivered") {
    const recipientClientIds = message.recipientPlayerIds
      .map((playerId) => playerClients.get(playerId))
      .filter((clientId): clientId is string => clientId !== undefined)

    return [
      {
        type: "send",
        clientIds: [senderClientId],
        message,
      },
      {
        type: "send",
        clientIds: recipientClientIds,
        message,
      },
    ]
  }

  if (message.type === "player_state") {
    return [
      {
        type: "broadcast",
        message,
      },
    ]
  }

  return [
    {
      type: "send",
      clientIds: [senderClientId],
      message,
    },
  ]
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
    userId: state.userId,
    position: state.position,
    roomId: state.roomId,
    direction: state.direction,
    zoneIds: state.zoneIds,
    permissions: state.permissions,
    roles: state.roles,
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
