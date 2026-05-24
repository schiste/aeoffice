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
