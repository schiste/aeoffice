import {
  animationForDirection,
  isChatSendMessage,
  isMoveIntentMessage,
  movementModeForMoveIntent,
  movementVectorForMoveIntent,
  type ChatRejectedMessage,
  type ChatSendMessage,
  type ClientMessage,
  type Direction,
  type MovementMode,
  type MovementVector,
  type MovementRejectedMessage,
  type PlayerStateMessage,
  type ProtocolErrorMessage,
  type ServerMessage,
  type WorldSnapshotMessage,
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
  readonly runSpeedPxPerSecond?: number
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

export interface WorldGeometryConfig {
  readonly map: CollisionMap
  readonly zones?: readonly Zone[]
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
  readonly movementMode: MovementMode
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
  movementMode: MovementMode
  lastProcessedAt?: number
}

export class AuthoritativeWorld {
  private readonly players = new Map<string, PlayerState>()

  constructor(private config: WorldServerConfig) {}

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
      movementMode: "walk",
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

  listPlayers(): readonly PlayerSnapshot[] {
    return [...this.players.values()].map(snapshot)
  }

  getParticipant(playerId: string): ParticipantPolicyContext | undefined {
    const state = this.players.get(playerId)
    return state ? participantContext(state) : undefined
  }

  listParticipants(): readonly ParticipantPolicyContext[] {
    return [...this.players.values()].map(participantContext)
  }

  tickMs(): number {
    return this.config.tickMs
  }

  reset(geometry?: WorldGeometryConfig): void {
    this.players.clear()

    if (geometry) {
      this.config = {
        ...this.config,
        map: geometry.map,
        zones: geometry.zones,
      }
    }
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
    const deltaMs = Math.min(
      this.config.tickMs,
      Math.max(0, nowMs - previousProcessedAt),
    )
    const requestedVector = movementVectorForMoveIntent(message)
    const movementMode = movementModeForMoveIntent(message)
    const speedPxPerSecond = movementSpeedPxPerSecond(this.config, movementMode)
    const result = simulateMovement({
      current: state.position,
      vector: requestedVector,
      seq: message.seq,
      map: this.config.map,
      playerSize: this.config.playerSize,
      speedPxPerSecond,
      deltaMs,
      zones: this.config.zones,
      currentZoneIds: state.zoneIds,
      permissions: state.permissions,
    })

    state.lastProcessedAt = nowMs
    state.direction = message.direction ?? result.direction
    state.lastSeqAck = message.seq
    state.movementMode = movementMode

    if (!result.accepted) {
      return movementRejected(
        state.playerId,
        result.reason ?? "collision",
        state.position,
        message.seq,
        nowMs,
        movementTelemetry(result, movementMode, speedPxPerSecond),
      )
    }

    state.position = result.position
    state.zoneIds = applyZoneChanges(
      state.zoneIds,
      result.enteredZoneIds,
      result.leftZoneIds,
    )

    return playerStateMessage(
      state,
      message.seq,
      nowMs,
      movementTelemetry(result, movementMode, speedPxPerSecond),
    )
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

export interface WorldGatewayResponse<TBody> {
  readonly status: number
  readonly body: TBody
}

export interface JoinWorldRouteRequest {
  readonly clientId: string
  readonly token: string
  readonly playerId: string
  readonly spawn: Vector2
  readonly avatarId?: string
  readonly roomId?: RoomId
}

export interface SendWorldMessageRouteRequest {
  readonly clientId: string
  readonly message: unknown
}

export interface SnapshotWorldRouteRequest {
  readonly clientId: string
}

export interface LeaveWorldRouteRequest {
  readonly clientId: string
}

export interface WorldMessageRouteBody {
  readonly events: readonly WorldRoomEvent[]
}

export type WorldRoomSnapshotResult =
  | {
      readonly status: "ok"
      readonly clientId: string
      readonly players: readonly PlayerSnapshot[]
    }
  | {
      readonly status: "denied"
      readonly clientId: string
      readonly reason: "unknown_client"
    }

export interface LeaveWorldRouteBody {
  readonly left: boolean
}

export interface WorldRouteErrorBody {
  readonly error: string
  readonly reason: string
}

export interface Clock {
  nowMs(): number
}

export interface WorldGatewayRoutesOptions {
  readonly controller: WorldGatewayController
  readonly clock: Clock
}

export interface WorldGatewayRuntime {
  readonly world: AuthoritativeWorld
  readonly admission: WorldAdmissionService
  readonly controller: WorldRoomController
  readonly gateway: WorldGatewayController
  readonly registerRoutes: (app: FastifyLike) => void
}

export interface CreateWorldGatewayRuntimeOptions {
  readonly config: WorldServerConfig
  readonly verifier?: WorldTokenVerifier
  readonly clock?: Clock
}

export interface FastifyLike {
  post(path: string, handler: FastifyHandler): void
}

export interface FastifyRequestLike {
  readonly body?: unknown
}

export interface FastifyReplyLike {
  status(code: number): FastifyReplyLike
  send(body: unknown): unknown
}

export type FastifyHandler = (
  request: FastifyRequestLike,
  reply: FastifyReplyLike,
) => Promise<unknown>

export type WorldFetchHandler = (request: Request) => Promise<Response>

interface WorldRoomClient {
  readonly clientId: string
  readonly playerId: string
}

interface QueuedMoveIntent {
  readonly clientId: string
  readonly message: ClientMessage
  readonly receivedAtMs: number
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
  private readonly queuedMoveIntents = new Map<string, QueuedMoveIntent[]>()
  private tickCount = 0

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
    this.queuedMoveIntents.delete(clientId)
    return this.world.removePlayer(client.playerId)
  }

  resetRoom(geometry?: WorldGeometryConfig): void {
    this.clients.clear()
    this.playerClients.clear()
    this.queuedMoveIntents.clear()
    this.tickCount = 0
    this.world.reset(geometry)
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

  queueRealtimeMessage(
    clientId: string,
    message: unknown,
    nowMs: number,
  ): readonly WorldRoomEvent[] {
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

    if (!isMoveIntentMessage(message)) {
      return this.receive(clientId, message, nowMs)
    }

    const queued = this.queuedMoveIntents.get(clientId) ?? []
    queued.push({
      clientId,
      message,
      receivedAtMs: nowMs,
    })
    this.queuedMoveIntents.set(clientId, queued.slice(-4))

    return []
  }

  tick(nowMs: number): readonly WorldRoomEvent[] {
    this.tickCount += 1

    const events: WorldRoomEvent[] = []

    for (const [clientId, queued] of this.queuedMoveIntents) {
      if (queued.length === 0) continue

      const latest = queued.at(-1)
      this.queuedMoveIntents.set(clientId, [])
      if (!latest) continue

      const client = this.clients.get(clientId)
      if (!client) continue

      const response = this.world.handleClientMessage(
        client.playerId,
        latest.message,
        nowMs,
      )
      events.push(...routeServerMessage(response, clientId, this.playerClients))
    }

    if (this.clients.size > 0) {
      events.push({
        type: "broadcast",
        message: this.snapshotMessage(nowMs),
      })
    }

    return events
  }

  snapshot(clientId: string): WorldRoomSnapshotResult {
    const client = this.clients.get(clientId)

    if (!client) {
      return {
        status: "denied",
        clientId,
        reason: "unknown_client",
      }
    }

    const requester = this.world.getPlayer(client.playerId)
    const players = requester
      ? this.world
          .listPlayers()
          .filter((player) => player.roomId === requester.roomId)
      : []

    return {
      status: "ok",
      clientId,
      players,
    }
  }

  private snapshotMessage(nowMs: number): WorldSnapshotMessage {
    const players = this.world.listPlayers()

    return {
      type: "world_snapshot",
      roomId: players[0]?.roomId ?? "unknown",
      tick: this.tickCount,
      tickMs: this.world.tickMs(),
      serverTime: nowMs,
      players: players.map((player) => ({
        playerId: player.playerId,
        userId: player.userId,
        x: player.position.x,
        y: player.position.y,
        direction: player.direction,
        zoneIds: player.zoneIds,
        lastSeqAck: player.lastSeqAck,
        movementMode: player.movementMode,
      })),
    }
  }
}

export class WorldGatewayController {
  constructor(private readonly room: WorldRoomController) {}

  join(
    request: JoinWorldRouteRequest,
    nowMs: number,
  ): WorldGatewayResponse<WorldRoomJoinResult> {
    const result = this.room.join({
      clientId: request.clientId,
      token: request.token,
      playerId: request.playerId,
      spawn: request.spawn,
      avatarId: request.avatarId,
      requestedRoomId: request.roomId,
      nowMs,
    })

    return {
      status: result.status === "joined" ? 200 : 403,
      body: result,
    }
  }

  sendMessage(
    request: SendWorldMessageRouteRequest,
    nowMs: number,
  ): WorldGatewayResponse<WorldMessageRouteBody> {
    return {
      status: 200,
      body: {
        events: this.room.receive(request.clientId, request.message, nowMs),
      },
    }
  }

  snapshot(
    request: SnapshotWorldRouteRequest,
  ): WorldGatewayResponse<WorldRoomSnapshotResult> {
    const result = this.room.snapshot(request.clientId)

    return {
      status: result.status === "ok" ? 200 : 403,
      body: result,
    }
  }

  leave(request: LeaveWorldRouteRequest): WorldGatewayResponse<LeaveWorldRouteBody> {
    return {
      status: 200,
      body: {
        left: this.room.leave(request.clientId),
      },
    }
  }
}

export function registerWorldGatewayRoutes(
  app: FastifyLike,
  options: WorldGatewayRoutesOptions,
): void {
  app.post("/join", async (request, reply) =>
    sendRoute(reply, async () =>
      options.controller.join(joinWorldRouteRequest(request), options.clock.nowMs()),
    ),
  )

  app.post("/message", async (request, reply) =>
    sendRoute(reply, async () =>
      options.controller.sendMessage(
        sendWorldMessageRouteRequest(request),
        options.clock.nowMs(),
      ),
    ),
  )

  app.post("/snapshot", async (request, reply) =>
    sendRoute(reply, async () =>
      options.controller.snapshot(snapshotWorldRouteRequest(request)),
    ),
  )

  app.post("/leave", async (request, reply) =>
    sendRoute(reply, async () =>
      options.controller.leave(leaveWorldRouteRequest(request)),
    ),
  )
}

export function createWorldGatewayRuntime(
  options: CreateWorldGatewayRuntimeOptions,
): WorldGatewayRuntime {
  const world = new AuthoritativeWorld(options.config)
  const admission = new WorldAdmissionService(
    world,
    options.verifier ?? new UnsignedLocalWorldTokenVerifier(),
  )
  const controller = new WorldRoomController(world, admission)
  const gateway = new WorldGatewayController(controller)
  const routeOptions: WorldGatewayRoutesOptions = {
    controller: gateway,
    clock: options.clock ?? systemClock,
  }

  return {
    world,
    admission,
    controller,
    gateway,
    registerRoutes: (app) => registerWorldGatewayRoutes(app, routeOptions),
  }
}

export function createWorldFetchHandler(
  runtime: Pick<WorldGatewayRuntime, "registerRoutes">,
): WorldFetchHandler {
  const app = new FetchRouteRegistry()
  runtime.registerRoutes(app)
  return (request) => app.handle(request)
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

function joinWorldRouteRequest(
  request: FastifyRequestLike,
): JoinWorldRouteRequest {
  const body = asRecord(request.body)

  return {
    clientId: requiredString(body.clientId, "clientId"),
    token: requiredString(body.token, "token"),
    playerId: requiredString(body.playerId, "playerId"),
    spawn: requiredVector2(body.spawn, "spawn"),
    avatarId: optionalString(body.avatarId),
    roomId: optionalString(body.roomId) as RoomId | undefined,
  }
}

function sendWorldMessageRouteRequest(
  request: FastifyRequestLike,
): SendWorldMessageRouteRequest {
  const body = asRecord(request.body)

  return {
    clientId: requiredString(body.clientId, "clientId"),
    message: body.message,
  }
}

function snapshotWorldRouteRequest(
  request: FastifyRequestLike,
): SnapshotWorldRouteRequest {
  const body = asRecord(request.body)

  return {
    clientId: requiredString(body.clientId, "clientId"),
  }
}

function leaveWorldRouteRequest(
  request: FastifyRequestLike,
): LeaveWorldRouteRequest {
  const body = asRecord(request.body)

  return {
    clientId: requiredString(body.clientId, "clientId"),
  }
}

async function sendRoute(
  reply: FastifyReplyLike,
  handler: () => Promise<WorldGatewayResponse<unknown>> | WorldGatewayResponse<unknown>,
): Promise<unknown> {
  try {
    const response = await handler()
    reply.status(response.status)
    return reply.send(response.body)
  } catch (error) {
    reply.status(400)
    return reply.send({
      error: "bad_request",
      reason: error instanceof Error ? error.message : "Invalid request.",
    })
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined
}

function requiredString(value: unknown, fieldName: string): string {
  const parsed = optionalString(value)
  if (!parsed) throw new Error(`Missing required field: ${fieldName}.`)
  return parsed
}

function requiredVector2(value: unknown, fieldName: string): Vector2 {
  const parsed = asRecord(value)

  if (typeof parsed.x !== "number" || typeof parsed.y !== "number") {
    throw new Error(`Missing required vector field: ${fieldName}.`)
  }

  return {
    x: parsed.x,
    y: parsed.y,
  }
}

class FetchRouteRegistry implements FastifyLike {
  private readonly routes = new Map<string, FastifyHandler>()

  post(path: string, handler: FastifyHandler): void {
    this.routes.set(routeKey("POST", path), handler)
  }

  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const handler = this.routes.get(routeKey(request.method, url.pathname))

    if (!handler) {
      return jsonResponse(404, {
        error: "not_found",
        reason: "No world route matches this request.",
      })
    }

    try {
      const reply = new FetchReply()
      await handler(
        {
          body: await requestBody(request),
        },
        reply,
      )
      return reply.toResponse()
    } catch (error) {
      return jsonResponse(400, {
        error: "bad_request",
        reason: error instanceof Error ? error.message : "Invalid request.",
      })
    }
  }
}

class FetchReply implements FastifyReplyLike {
  private statusCode = 200
  private body: unknown

  status(code: number): FastifyReplyLike {
    this.statusCode = code
    return this
  }

  send(body: unknown): unknown {
    this.body = body
    return this
  }

  toResponse(): Response {
    return jsonResponse(this.statusCode, this.body ?? null)
  }
}

async function requestBody(request: Request): Promise<unknown> {
  if (request.method === "GET" || request.method === "HEAD") return undefined

  const text = await request.text()
  if (!text.trim()) return undefined
  return JSON.parse(text)
}

function routeKey(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  })
}

const systemClock: Clock = {
  nowMs: () => Date.now(),
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
  telemetry?: MovementTelemetry,
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
    ...telemetry,
  }
}

function movementRejected(
  playerId: string,
  reason: MovementRejectedMessage["reason"],
  position: Vector2,
  seqAck: number,
  serverTime: number,
  telemetry?: MovementTelemetry,
): MovementRejectedMessage {
  return {
    type: "movement_rejected",
    playerId,
    reason,
    x: position.x,
    y: position.y,
    seqAck,
    serverTime,
    ...telemetry,
  }
}

interface MovementTelemetry {
  readonly requestedVector: MovementVector
  readonly appliedVector: MovementVector
  readonly collisionSlide: boolean
  readonly collisionSlideAxis?: "x" | "y" | "corner"
  readonly collisionSlideDistancePx: number
  readonly movementMode: MovementMode
  readonly speedPxPerSecond: number
}

function movementTelemetry(result: {
  readonly requestedVector: MovementVector
  readonly appliedVector: MovementVector
  readonly collisionSlide: boolean
  readonly collisionSlideAxis?: "x" | "y" | "corner"
  readonly collisionSlideDistancePx: number
}, movementMode: MovementMode, speedPxPerSecond: number): MovementTelemetry {
  return {
    requestedVector: result.requestedVector,
    appliedVector: result.appliedVector,
    collisionSlide: result.collisionSlide,
    collisionSlideAxis: result.collisionSlideAxis,
    collisionSlideDistancePx: result.collisionSlideDistancePx,
    movementMode,
    speedPxPerSecond,
  }
}

function movementSpeedPxPerSecond(
  config: Pick<WorldServerConfig, "speedPxPerSecond" | "runSpeedPxPerSecond">,
  movementMode: MovementMode,
): number {
  if (movementMode === "run") {
    return config.runSpeedPxPerSecond ?? config.speedPxPerSecond * 1.68
  }

  return config.speedPxPerSecond
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
    movementMode: state.movementMode,
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
