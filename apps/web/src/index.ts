import type {
  ChatDeliveredMessage,
  ChatScope,
  ClientMessage,
  Direction,
  ServerMessage,
} from "@aedventure/protocol"
import type {
  PermissionKey,
  RoleKey,
  RoomId,
  SessionId,
  SpaceId,
  TenantId,
  UserId,
  WorldTokenClaims,
} from "@aedventure/shared-types"

export type MediaMode = "room" | "proximity" | "zone" | "presentation"

export interface Vector2 {
  readonly x: number
  readonly y: number
}

export interface WorldTokenResult {
  readonly token: string
  readonly claims: WorldTokenClaims
}

export interface AppApiClient {
  issueWorldToken(input: IssueAppWorldTokenInput): Promise<WorldTokenResult>
}

export interface IssueAppWorldTokenInput {
  readonly sessionId: SessionId
  readonly tenantId?: TenantId
  readonly spaceId?: SpaceId
  readonly roomId?: RoomId
  readonly nowMs: number
}

export interface WorldClient {
  join(input: JoinWorldInput): Promise<JoinWorldResult>
  send(message: ClientMessage, nowMs: number): Promise<readonly ServerMessage[]>
}

export type WorldTransportRequest =
  | {
      readonly type: "join"
      readonly input: JoinWorldInput
    }
  | {
      readonly type: "message"
      readonly message: ClientMessage
      readonly nowMs: number
    }

export type WorldTransportResponse =
  | {
      readonly type: "join_result"
      readonly result: JoinWorldResult
    }
  | {
      readonly type: "messages"
      readonly messages: readonly ServerMessage[]
    }

export interface WorldTransport {
  request(input: WorldTransportRequest): Promise<WorldTransportResponse>
}

export interface JoinWorldInput {
  readonly token: string
  readonly playerId: string
  readonly spawn: Vector2
  readonly nowMs: number
  readonly avatarId?: string
  readonly roomId?: RoomId
}

export type JoinWorldResult =
  | {
      readonly status: "joined"
      readonly player: PlayerView
    }
  | {
      readonly status: "denied"
      readonly reason: string
    }

export interface MediaGatewayClient {
  issueToken(input: IssueAppMediaTokenInput): Promise<AppMediaTokenResult>
}

export interface IssueAppMediaTokenInput {
  readonly playerId: string
  readonly mode: MediaMode
  readonly zoneId?: string
  readonly targetPlayerIds?: readonly string[]
  readonly publish?: boolean
  readonly subscribe?: boolean
  readonly nowMs: number
}

export type AppMediaTokenResult =
  | {
      readonly status: "issued"
      readonly liveKitUrl: string
      readonly token: string
      readonly room: string
      readonly canPublish: boolean
      readonly canSubscribe: boolean
      readonly participantPlayerIds: readonly string[]
      readonly expiresAt: string
    }
  | {
      readonly status: "denied"
      readonly reason: string
    }

export interface PlayerView {
  readonly playerId: string
  readonly userId?: UserId
  readonly x: number
  readonly y: number
  readonly roomId: string
  readonly direction: Direction
  readonly zoneIds: readonly string[]
  readonly permissions: readonly PermissionKey[]
  readonly roles: readonly RoleKey[]
  readonly lastSeqAck: number
}

export interface VirtualOfficeRenderer {
  worldEntered?(player: PlayerView): void
  playerUpdated?(player: PlayerView): void
  chatDelivered?(message: ChatDeliveredMessage): void
  mediaTokenIssued?(token: Extract<AppMediaTokenResult, { status: "issued" }>): void
  rejected?(reason: string): void
}

export interface CustomerVirtualOfficeAppOptions {
  readonly api: AppApiClient
  readonly world: WorldClient
  readonly media: MediaGatewayClient
  readonly renderer?: VirtualOfficeRenderer
}

export interface FetchLike {
  (
    url: string,
    init: {
      readonly method: "POST"
      readonly headers: Readonly<Record<string, string>>
      readonly body: string
      readonly credentials?: "include" | "same-origin" | "omit"
    },
  ): Promise<FetchResponseLike>
}

export interface FetchResponseLike {
  readonly ok: boolean
  readonly status: number
  json(): Promise<unknown>
}

export interface HttpClientOptions {
  readonly baseUrl: string
  readonly fetch: FetchLike
  readonly credentials?: "include" | "same-origin" | "omit"
}

export interface HttpWorldTransportOptions extends HttpClientOptions {
  readonly clientId: string
}

export interface EnterWorldInput {
  readonly sessionId: SessionId
  readonly playerId: string
  readonly spawn: Vector2
  readonly nowMs: number
  readonly tenantId?: TenantId
  readonly spaceId?: SpaceId
  readonly roomId?: RoomId
  readonly avatarId?: string
}

export interface CustomerOfficeState {
  readonly joined: boolean
  readonly localPlayerId?: string
  readonly roomId?: string
  readonly worldToken?: string
  readonly players: readonly PlayerView[]
  readonly chatLog: readonly ChatDeliveredMessage[]
  readonly activeMedia?: Extract<AppMediaTokenResult, { status: "issued" }>
}

export class CustomerVirtualOfficeApp {
  private readonly players = new Map<string, PlayerView>()
  private readonly chatLog: ChatDeliveredMessage[] = []
  private seq = 1
  private localPlayerId?: string
  private worldToken?: string
  private activeMedia?: Extract<AppMediaTokenResult, { status: "issued" }>

  constructor(private readonly options: CustomerVirtualOfficeAppOptions) {}

  getState(): CustomerOfficeState {
    return {
      joined: this.localPlayerId !== undefined,
      localPlayerId: this.localPlayerId,
      roomId: this.localPlayerId
        ? this.players.get(this.localPlayerId)?.roomId
        : undefined,
      worldToken: this.worldToken,
      players: [...this.players.values()],
      chatLog: [...this.chatLog],
      activeMedia: this.activeMedia,
    }
  }

  async enterWorld(input: EnterWorldInput): Promise<PlayerView> {
    const issued = await this.options.api.issueWorldToken({
      sessionId: input.sessionId,
      tenantId: input.tenantId,
      spaceId: input.spaceId,
      roomId: input.roomId,
      nowMs: input.nowMs,
    })
    const joined = await this.options.world.join({
      token: issued.token,
      playerId: input.playerId,
      spawn: input.spawn,
      nowMs: input.nowMs,
      avatarId: input.avatarId,
      roomId: input.roomId,
    })

    if (joined.status === "denied") {
      this.options.renderer?.rejected?.(joined.reason)
      throw new Error(`World admission denied: ${joined.reason}.`)
    }

    this.localPlayerId = input.playerId
    this.worldToken = issued.token
    this.players.set(joined.player.playerId, joined.player)
    this.options.renderer?.worldEntered?.(joined.player)
    return joined.player
  }

  async move(direction: Direction, nowMs: number): Promise<void> {
    await this.sendAndApply(
      {
        type: "move",
        direction,
        seq: this.nextSeq(),
      },
      nowMs,
    )
  }

  async sendChat(
    scope: ChatScope,
    body: string,
    nowMs: number,
    zoneId?: string,
  ): Promise<void> {
    await this.sendAndApply(
      {
        type: "chat_send",
        scope,
        body,
        seq: this.nextSeq(),
        zoneId,
      },
      nowMs,
    )
  }

  async joinMediaZone(
    zoneId: string,
    nowMs: number,
  ): Promise<AppMediaTokenResult> {
    const playerId = this.requireLocalPlayerId()
    const result = await this.options.media.issueToken({
      playerId,
      mode: "zone",
      zoneId,
      publish: true,
      subscribe: true,
      nowMs,
    })

    if (result.status === "issued") {
      this.activeMedia = result
      this.options.renderer?.mediaTokenIssued?.(result)
    } else {
      this.options.renderer?.rejected?.(result.reason)
    }

    return result
  }

  private async sendAndApply(
    message: ClientMessage,
    nowMs: number,
  ): Promise<void> {
    this.requireLocalPlayerId()
    const responses = await this.options.world.send(message, nowMs)
    for (const response of responses) {
      this.applyServerMessage(response)
    }
  }

  private applyServerMessage(message: ServerMessage): void {
    switch (message.type) {
      case "player_state":
        this.updatePlayerPosition(message)
        break
      case "chat_delivered":
        this.chatLog.push(message)
        this.options.renderer?.chatDelivered?.(message)
        break
      case "movement_rejected":
      case "chat_rejected":
        this.options.renderer?.rejected?.(message.reason)
        break
      case "protocol_error":
        this.options.renderer?.rejected?.(message.message)
        break
    }
  }

  private updatePlayerPosition(
    message: Extract<ServerMessage, { type: "player_state" }>,
  ): void {
    const existing = this.players.get(message.playerId)
    const updated: PlayerView = {
      playerId: message.playerId,
      userId: existing?.userId,
      x: message.x,
      y: message.y,
      roomId: existing?.roomId ?? "",
      direction: message.direction,
      zoneIds: existing?.zoneIds ?? [],
      permissions: existing?.permissions ?? [],
      roles: existing?.roles ?? [],
      lastSeqAck: message.seqAck,
    }

    this.players.set(message.playerId, updated)
    this.options.renderer?.playerUpdated?.(updated)
  }

  private nextSeq(): number {
    const seq = this.seq
    this.seq += 1
    return seq
  }

  private requireLocalPlayerId(): string {
    if (!this.localPlayerId) {
      throw new Error("Cannot interact with the world before joining it.")
    }

    return this.localPlayerId
  }
}

export class HttpAppApiClient implements AppApiClient {
  constructor(private readonly options: HttpClientOptions) {}

  async issueWorldToken(input: IssueAppWorldTokenInput): Promise<WorldTokenResult> {
    const body = await postJson(this.options, "/world-token", {
      sessionId: input.sessionId,
      tenantId: input.tenantId,
      spaceId: input.spaceId,
      roomId: input.roomId,
    })

    if (!isWorldTokenResult(body)) {
      throw new Error("API returned an invalid world-token response.")
    }

    return body
  }
}

export class HttpMediaGatewayClient implements MediaGatewayClient {
  constructor(private readonly options: HttpClientOptions) {}

  async issueToken(input: IssueAppMediaTokenInput): Promise<AppMediaTokenResult> {
    const body = await postJson(this.options, "/media-token", {
      playerId: input.playerId,
      mode: input.mode,
      zoneId: input.zoneId,
      targetPlayerIds: input.targetPlayerIds,
      publish: input.publish,
      subscribe: input.subscribe,
    })

    if (!isAppMediaTokenResult(body)) {
      throw new Error("Media gateway returned an invalid token response.")
    }

    return body
  }
}

export class TransportWorldClient implements WorldClient {
  constructor(private readonly transport: WorldTransport) {}

  async join(input: JoinWorldInput): Promise<JoinWorldResult> {
    const response = await this.transport.request({
      type: "join",
      input,
    })

    if (response.type !== "join_result") {
      throw new Error("World transport returned an invalid join response.")
    }

    return response.result
  }

  async send(
    message: ClientMessage,
    nowMs: number,
  ): Promise<readonly ServerMessage[]> {
    const response = await this.transport.request({
      type: "message",
      message,
      nowMs,
    })

    if (response.type !== "messages") {
      throw new Error("World transport returned an invalid message response.")
    }

    return response.messages
  }
}

export class HttpWorldTransport implements WorldTransport {
  constructor(private readonly options: HttpWorldTransportOptions) {}

  async request(input: WorldTransportRequest): Promise<WorldTransportResponse> {
    if (input.type === "join") {
      const body = await postJson(this.options, "/join", {
        clientId: this.options.clientId,
        token: input.input.token,
        playerId: input.input.playerId,
        spawn: input.input.spawn,
        avatarId: input.input.avatarId,
        roomId: input.input.roomId,
      })

      return {
        type: "join_result",
        result: joinResultFromResponse(body),
      }
    }

    const body = await postJson(this.options, "/message", {
      clientId: this.options.clientId,
      message: input.message,
    })

    return {
      type: "messages",
      messages: messagesForClient(body, this.options.clientId),
    }
  }

  async leave(): Promise<boolean> {
    const body = await postJson(this.options, "/leave", {
      clientId: this.options.clientId,
    })

    return isRecord(body) && body.left === true
  }
}

async function postJson(
  options: HttpClientOptions,
  path: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const response = await options.fetch(joinUrl(options.baseUrl, path), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(stripUndefined(body)),
    credentials: options.credentials ?? "include",
  })
  const parsed = await response.json()

  if (!response.ok && !isDeniedResponse(parsed)) {
    throw new Error(`HTTP ${response.status} from ${path}.`)
  }

  return parsed
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`
}

function stripUndefined(
  input: Record<string, unknown>,
): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  )
}

function isWorldTokenResult(value: unknown): value is WorldTokenResult {
  if (!isRecord(value)) return false

  return (
    typeof value.token === "string" &&
    isRecord(value.claims) &&
    typeof value.claims.sub === "string" &&
    typeof value.claims.sessionId === "string" &&
    Array.isArray(value.claims.permissions) &&
    Array.isArray(value.claims.roles) &&
    typeof value.claims.expiresAt === "string"
  )
}

function isAppMediaTokenResult(value: unknown): value is AppMediaTokenResult {
  if (!isRecord(value) || typeof value.status !== "string") return false

  if (value.status === "denied") {
    return typeof value.reason === "string"
  }

  return (
    value.status === "issued" &&
    typeof value.liveKitUrl === "string" &&
    typeof value.token === "string" &&
    typeof value.room === "string" &&
    typeof value.canPublish === "boolean" &&
    typeof value.canSubscribe === "boolean" &&
    Array.isArray(value.participantPlayerIds) &&
    value.participantPlayerIds.every((playerId) => typeof playerId === "string") &&
    typeof value.expiresAt === "string"
  )
}

function joinResultFromResponse(value: unknown): JoinWorldResult {
  if (!isRecord(value) || typeof value.status !== "string") {
    throw new Error("World server returned an invalid join response.")
  }

  if (value.status === "denied") {
    if (typeof value.reason !== "string") {
      throw new Error("World server returned an invalid join denial.")
    }

    return {
      status: "denied",
      reason: value.reason,
    }
  }

  if (value.status !== "joined" || !isRecord(value.player)) {
    throw new Error("World server returned an invalid joined response.")
  }

  return {
    status: "joined",
    player: playerViewFromSnapshot(value.player),
  }
}

function playerViewFromSnapshot(value: Record<string, unknown>): PlayerView {
  const position = value.position

  if (
    typeof value.playerId !== "string" ||
    !isRecord(position) ||
    typeof position.x !== "number" ||
    typeof position.y !== "number" ||
    typeof value.roomId !== "string" ||
    typeof value.direction !== "string" ||
    typeof value.lastSeqAck !== "number" ||
    !Array.isArray(value.zoneIds) ||
    !Array.isArray(value.permissions) ||
    !Array.isArray(value.roles)
  ) {
    throw new Error("World server returned an invalid player snapshot.")
  }

  return {
    playerId: value.playerId,
    userId: typeof value.userId === "string" ? (value.userId as UserId) : undefined,
    x: position.x,
    y: position.y,
    roomId: value.roomId,
    direction: value.direction as Direction,
    zoneIds: stringArray(value.zoneIds),
    permissions: stringArray(value.permissions) as readonly PermissionKey[],
    roles: stringArray(value.roles) as readonly RoleKey[],
    lastSeqAck: value.lastSeqAck,
  }
}

function messagesForClient(
  value: unknown,
  clientId: string,
): readonly ServerMessage[] {
  if (!isRecord(value) || !Array.isArray(value.events)) {
    throw new Error("World server returned an invalid message response.")
  }

  return value.events
    .filter((event) => eventVisibleToClient(event, clientId))
    .map((event) => (event as { message: ServerMessage }).message)
}

function eventVisibleToClient(event: unknown, clientId: string): boolean {
  if (!isRecord(event) || !isRecord(event.message)) return false

  if (event.type === "broadcast") {
    return event.exceptClientId !== clientId
  }

  return (
    event.type === "send" &&
    Array.isArray(event.clientIds) &&
    event.clientIds.includes(clientId)
  )
}

function stringArray(values: readonly unknown[]): readonly string[] {
  if (values.every((value) => typeof value === "string")) {
    return values as readonly string[]
  }

  throw new Error("Expected string array from world server.")
}

function isDeniedResponse(value: unknown): boolean {
  return isRecord(value) && value.status === "denied" && typeof value.reason === "string"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
