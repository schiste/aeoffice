import {
  evaluateMediaJoin,
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
