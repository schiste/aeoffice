import type { WikimediaOAuthProfile } from "@aedventure/auth-wikimedia"
import type {
  PermissionKey,
  RoleKey,
  RoomId,
  SessionId,
  SpaceId,
} from "@aedventure/shared-types"
import type {
  AuthenticationService,
  IssuedWorldToken,
  SessionCookie,
  SignInSuccess,
} from "./index"

export interface ApiResponse<TBody> {
  readonly status: number
  readonly headers?: Readonly<Record<string, string>>
  readonly body: TBody
}

export interface SignInRequest {
  readonly profile: WikimediaOAuthProfile
  readonly nowMs: number
}

export interface IssueWorldTokenRequest {
  readonly sessionId: SessionId
  readonly permissions: readonly PermissionKey[]
  readonly roles: readonly RoleKey[]
  readonly nowMs: number
  readonly spaceId?: SpaceId
  readonly roomId?: RoomId
}

export interface SignInResponseBody {
  readonly userId: string
  readonly username: string
  readonly sessionId: string
  readonly roles: readonly string[]
}

export interface DeniedResponseBody {
  readonly error: string
  readonly reason: string
}

export interface WorldTokenResponseBody {
  readonly token: string
  readonly claims: IssuedWorldToken["claims"]
}

export class ApiController {
  constructor(private readonly auth: AuthenticationService) {}

  async signInWithWikimediaProfile(
    request: SignInRequest,
  ): Promise<ApiResponse<SignInResponseBody | DeniedResponseBody>> {
    const result = await this.auth.signInWithWikimediaProfile(
      request.profile,
      request.nowMs,
    )

    if (result.status === "denied") {
      return {
        status: 403,
        body: {
          error: "sign_in_denied",
          reason: result.reason,
        },
      }
    }

    return {
      status: 200,
      headers: {
        "set-cookie": serializeSessionCookie(result.sessionCookie),
      },
      body: signInBody(result),
    }
  }

  async issueWorldToken(
    request: IssueWorldTokenRequest,
  ): Promise<ApiResponse<WorldTokenResponseBody | DeniedResponseBody>> {
    try {
      const issued = await this.auth.issueWorldToken(request.sessionId, {
        permissions: request.permissions,
        roles: request.roles,
        nowMs: request.nowMs,
        spaceId: request.spaceId,
        roomId: request.roomId,
      })

      return {
        status: 200,
        body: {
          token: issued.token,
          claims: issued.claims,
        },
      }
    } catch (error) {
      return {
        status: 401,
        body: {
          error: "world_token_denied",
          reason: error instanceof Error ? error.message : "Unknown error.",
        },
      }
    }
  }
}

export function serializeSessionCookie(cookie: SessionCookie): string {
  const sameSite = cookie.sameSite === "lax" ? "Lax" : "Strict"

  return [
    `${cookie.name}=${cookie.value}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    `SameSite=${sameSite}`,
    `Expires=${new Date(cookie.expiresAt).toUTCString()}`,
  ].join("; ")
}

function signInBody(result: SignInSuccess): SignInResponseBody {
  return {
    userId: result.user.id,
    username: result.user.username,
    sessionId: result.session.id,
    roles: result.roleKeys,
  }
}
