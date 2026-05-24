import {
  evaluateMediaJoin,
  type MediaMode,
  type MediaJoinDecision,
  type MediaJoinRequest,
  type ParticipantPolicyContext,
} from "@aedventure/policy"

export interface MediaGatewayConfig {
  readonly liveKitUrl: string
  readonly tokenTtlMs: number
  readonly proximityRadiusPx: number
}

export interface MediaTokenClaims {
  readonly iss: "aedventure-media-gateway"
  readonly sub: string
  readonly room: string
  readonly canPublish: boolean
  readonly canSubscribe: boolean
  readonly participantPlayerIds: readonly string[]
  readonly expiresAt: string
}

export interface MediaTokenSigner {
  sign(claims: MediaTokenClaims): string
}

export interface MediaTokenIssued {
  readonly status: "issued"
  readonly liveKitUrl: string
  readonly token: string
  readonly claims: MediaTokenClaims
}

export interface MediaTokenDenied {
  readonly status: "denied"
  readonly reason: Exclude<MediaJoinDecision, { allowed: true }>["reason"]
}

export type MediaTokenResult = MediaTokenIssued | MediaTokenDenied

export interface IssueMediaTokenInput {
  readonly requester: ParticipantPolicyContext
  readonly participants: readonly ParticipantPolicyContext[]
  readonly request: MediaJoinRequest
  readonly nowMs: number
}

export interface MediaGatewayResponse<TBody> {
  readonly status: number
  readonly body: TBody
}

export interface ParticipantDirectory {
  findParticipant(
    playerId: string,
  ): Promise<ParticipantPolicyContext | undefined>
  listParticipantsFor(
    requester: ParticipantPolicyContext,
  ): Promise<readonly ParticipantPolicyContext[]>
}

export interface IssueMediaTokenRequest {
  readonly playerId: string
  readonly mode: MediaMode
  readonly nowMs: number
  readonly zoneId?: string
  readonly targetPlayerIds?: readonly string[]
  readonly publish?: boolean
  readonly subscribe?: boolean
}

export type MediaGatewayDeniedReason =
  | Exclude<MediaJoinDecision, { allowed: true }>["reason"]
  | "unknown_player"
  | "bad_request"

export interface MediaTokenResponseBody {
  readonly status: "issued"
  readonly liveKitUrl: string
  readonly token: string
  readonly room: string
  readonly canPublish: boolean
  readonly canSubscribe: boolean
  readonly participantPlayerIds: readonly string[]
  readonly expiresAt: string
}

export interface MediaDeniedResponseBody {
  readonly status: "denied"
  readonly reason: MediaGatewayDeniedReason
}

export class MediaGatewayController {
  constructor(
    private readonly service: MediaGatewayService,
    private readonly participantDirectory: ParticipantDirectory,
  ) {}

  async issueToken(
    request: IssueMediaTokenRequest,
  ): Promise<MediaGatewayResponse<MediaTokenResponseBody | MediaDeniedResponseBody>> {
    const requester = await this.participantDirectory.findParticipant(
      request.playerId,
    )

    if (!requester) {
      return denied(404, "unknown_player")
    }

    const result = this.service.issueMediaToken({
      requester,
      participants: await this.participantDirectory.listParticipantsFor(requester),
      request: {
        mode: request.mode,
        zoneId: request.zoneId,
        targetPlayerIds: request.targetPlayerIds,
        publish: request.publish,
        subscribe: request.subscribe,
      },
      nowMs: request.nowMs,
    })

    if (result.status === "denied") {
      return denied(403, result.reason)
    }

    return {
      status: 200,
      body: {
        status: "issued",
        liveKitUrl: result.liveKitUrl,
        token: result.token,
        room: result.claims.room,
        canPublish: result.claims.canPublish,
        canSubscribe: result.claims.canSubscribe,
        participantPlayerIds: result.claims.participantPlayerIds,
        expiresAt: result.claims.expiresAt,
      },
    }
  }
}

export interface MediaGatewayRoutesOptions {
  readonly controller: MediaGatewayController
  readonly clock: Clock
}

export interface Clock {
  nowMs(): number
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

export function registerMediaGatewayRoutes(
  app: FastifyLike,
  options: MediaGatewayRoutesOptions,
): void {
  app.post("/media-token", async (request, reply) =>
    sendRoute(reply, async () =>
      options.controller.issueToken(
        issueMediaTokenRequest(request, options.clock),
      ),
    ),
  )
}

export class MediaGatewayService {
  constructor(
    private readonly config: MediaGatewayConfig,
    private readonly signer: MediaTokenSigner,
  ) {}

  issueMediaToken(input: IssueMediaTokenInput): MediaTokenResult {
    const decision = evaluateMediaJoin({
      requester: input.requester,
      participants: input.participants,
      request: input.request,
      config: {
        proximityRadiusPx: this.config.proximityRadiusPx,
      },
    })

    if (!decision.allowed) {
      return {
        status: "denied",
        reason: decision.reason,
      }
    }

    const claims: MediaTokenClaims = {
      iss: "aedventure-media-gateway",
      sub: input.requester.playerId,
      room: decision.mediaRoomName,
      canPublish: decision.canPublish,
      canSubscribe: decision.canSubscribe,
      participantPlayerIds: decision.participantPlayerIds,
      expiresAt: new Date(input.nowMs + this.config.tokenTtlMs).toISOString(),
    }

    return {
      status: "issued",
      liveKitUrl: this.config.liveKitUrl,
      token: this.signer.sign(claims),
      claims,
    }
  }
}

export class UnsignedLocalMediaTokenSigner implements MediaTokenSigner {
  sign(claims: MediaTokenClaims): string {
    return `unsigned-livekit-local.${JSON.stringify(claims)}`
  }
}

function issueMediaTokenRequest(
  request: FastifyRequestLike,
  clock: Clock,
): IssueMediaTokenRequest {
  const body = asRecord(request.body)

  return {
    playerId: requiredString(body.playerId, "playerId"),
    mode: requiredMediaMode(body.mode),
    zoneId: optionalString(body.zoneId),
    targetPlayerIds: optionalStringArray(body.targetPlayerIds),
    publish: optionalBoolean(body.publish),
    subscribe: optionalBoolean(body.subscribe),
    nowMs: clock.nowMs(),
  }
}

async function sendRoute(
  reply: FastifyReplyLike,
  handler: () => Promise<MediaGatewayResponse<unknown>>,
): Promise<unknown> {
  try {
    const response = await handler()
    reply.status(response.status)
    return reply.send(response.body)
  } catch (error) {
    reply.status(400)
    return reply.send({
      status: "denied",
      reason: "bad_request",
      detail: error instanceof Error ? error.message : "Invalid request.",
    })
  }
}

function denied(
  status: number,
  reason: MediaGatewayDeniedReason,
): MediaGatewayResponse<MediaDeniedResponseBody> {
  return {
    status,
    body: {
      status: "denied",
      reason,
    },
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

function optionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value
  if (value === undefined || value === null) return undefined
  throw new Error("Expected boolean media option.")
}

function optionalStringArray(value: unknown): readonly string[] | undefined {
  if (value === undefined || value === null) return undefined
  if (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim())
  ) {
    return value
  }

  throw new Error("Expected targetPlayerIds to be an array of strings.")
}

function requiredMediaMode(value: unknown): MediaMode {
  if (
    value === "room" ||
    value === "proximity" ||
    value === "zone" ||
    value === "presentation"
  ) {
    return value
  }

  throw new Error("Invalid media mode.")
}
