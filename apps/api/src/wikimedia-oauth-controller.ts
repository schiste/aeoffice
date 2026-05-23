import type { WikimediaOAuthClient } from "@aedventure/auth-wikimedia"
import type {
  AuthenticationService,
  SignInResult,
  SignInSuccess,
} from "./index"
import { serializeSessionCookie, type ApiResponse } from "./controller"

export interface OAuthStateRecord {
  readonly provider: "wikimedia"
  readonly state: string
  readonly createdAt: string
  readonly expiresAt: string
  readonly redirectAfterSignIn?: string
  readonly codeVerifier?: string
}

export interface OAuthStateStore {
  createState(input: CreateOAuthStateInput): Promise<OAuthStateRecord>
  consumeState(
    input: ConsumeOAuthStateInput,
  ): Promise<OAuthStateRecord | undefined>
}

export interface CreateOAuthStateInput {
  readonly provider: "wikimedia"
  readonly state: string
  readonly nowMs: number
  readonly expiresAtMs: number
  readonly redirectAfterSignIn?: string
  readonly codeVerifier?: string
}

export interface ConsumeOAuthStateInput {
  readonly provider: "wikimedia"
  readonly state: string
  readonly nowMs: number
}

export interface OAuthStateGenerator {
  nextState(): string
}

export interface WikimediaOAuthControllerOptions {
  readonly oauth: WikimediaOAuthClient
  readonly auth: AuthenticationService
  readonly stateStore: OAuthStateStore
  readonly stateGenerator: OAuthStateGenerator
  readonly stateTtlMs: number
}

export interface BeginWikimediaSignInRequest {
  readonly nowMs: number
  readonly redirectAfterSignIn?: string
  readonly codeChallenge?: string
  readonly codeChallengeMethod?: "S256" | "plain"
  readonly codeVerifier?: string
}

export interface CompleteWikimediaSignInRequest {
  readonly nowMs: number
  readonly state?: string
  readonly code?: string
  readonly error?: string
  readonly errorDescription?: string
}

export interface BeginWikimediaSignInBody {
  readonly provider: "wikimedia"
  readonly expiresAt: string
}

export interface CompleteWikimediaSignInBody {
  readonly userId: string
  readonly username: string
  readonly sessionId: string
  readonly roles: readonly string[]
  readonly redirectAfterSignIn?: string
}

export interface OAuthDeniedBody {
  readonly error: string
  readonly reason: string
}

export class WikimediaOAuthController {
  constructor(private readonly options: WikimediaOAuthControllerOptions) {}

  async beginSignIn(
    request: BeginWikimediaSignInRequest,
  ): Promise<ApiResponse<BeginWikimediaSignInBody | OAuthDeniedBody>> {
    const redirectAfterSignIn = safeRedirectAfterSignIn(
      request.redirectAfterSignIn,
    )

    if (request.redirectAfterSignIn && !redirectAfterSignIn) {
      return denied(
        400,
        "redirect_after_sign_in_invalid",
        "Redirect after sign-in must be a local absolute path.",
      )
    }

    const state = this.options.stateGenerator.nextState()
    const expiresAtMs = request.nowMs + this.options.stateTtlMs
    const record = await this.options.stateStore.createState({
      provider: "wikimedia",
      state,
      nowMs: request.nowMs,
      expiresAtMs,
      redirectAfterSignIn,
      codeVerifier: request.codeVerifier,
    })
    const authorizationUrl = this.options.oauth.buildAuthorizationUrl({
      state,
      codeChallenge: request.codeChallenge,
      codeChallengeMethod: request.codeChallengeMethod,
    })

    return {
      status: 302,
      headers: {
        location: authorizationUrl,
      },
      body: {
        provider: "wikimedia",
        expiresAt: record.expiresAt,
      },
    }
  }

  async completeSignIn(
    request: CompleteWikimediaSignInRequest,
  ): Promise<ApiResponse<CompleteWikimediaSignInBody | OAuthDeniedBody>> {
    if (!request.state) {
      return denied(400, "oauth_state_missing", "Missing OAuth state.")
    }

    const stateRecord = await this.options.stateStore.consumeState({
      provider: "wikimedia",
      state: request.state,
      nowMs: request.nowMs,
    })

    if (!stateRecord) {
      return denied(400, "oauth_state_invalid", "Invalid or expired OAuth state.")
    }

    try {
      const oauthResult = await this.options.oauth.completeAuthorizationCodeFlow({
        code: request.code,
        state: request.state,
        expectedState: stateRecord.state,
        error: request.error,
        errorDescription: request.errorDescription,
        codeVerifier: stateRecord.codeVerifier,
      })
      const signIn = await this.options.auth.signInWithWikimediaProfile(
        oauthResult.profile,
        request.nowMs,
      )

      return signInResponse(signIn, stateRecord.redirectAfterSignIn)
    } catch (error) {
      return denied(
        401,
        "oauth_sign_in_failed",
        error instanceof Error ? error.message : "Unknown OAuth error.",
      )
    }
  }
}

export class InMemoryOAuthStateStore implements OAuthStateStore {
  private readonly states = new Map<string, OAuthStateRecord>()

  async createState(input: CreateOAuthStateInput): Promise<OAuthStateRecord> {
    const record: OAuthStateRecord = {
      provider: input.provider,
      state: input.state,
      createdAt: new Date(input.nowMs).toISOString(),
      expiresAt: new Date(input.expiresAtMs).toISOString(),
      redirectAfterSignIn: input.redirectAfterSignIn,
      codeVerifier: input.codeVerifier,
    }

    this.states.set(key(input.provider, input.state), record)
    return record
  }

  async consumeState(
    input: ConsumeOAuthStateInput,
  ): Promise<OAuthStateRecord | undefined> {
    const stateKey = key(input.provider, input.state)
    const record = this.states.get(stateKey)
    this.states.delete(stateKey)

    if (!record) return undefined
    if (Date.parse(record.expiresAt) <= input.nowMs) return undefined

    return record
  }
}

export class SequentialOAuthStateGenerator implements OAuthStateGenerator {
  private next = 1

  nextState(): string {
    const state = `oauth_state_${this.next}`
    this.next += 1
    return state
  }
}

function signInResponse(
  result: SignInResult,
  redirectAfterSignIn: string | undefined,
): ApiResponse<CompleteWikimediaSignInBody | OAuthDeniedBody> {
  if (result.status === "denied") {
    return denied(403, "sign_in_denied", result.reason)
  }

  return {
    status: 200,
    headers: {
      "set-cookie": serializeSessionCookie(result.sessionCookie),
    },
    body: completeSignInBody(result, redirectAfterSignIn),
  }
}

function completeSignInBody(
  result: SignInSuccess,
  redirectAfterSignIn: string | undefined,
): CompleteWikimediaSignInBody {
  return {
    userId: result.user.id,
    username: result.user.username,
    sessionId: result.session.id,
    roles: result.roleKeys,
    redirectAfterSignIn,
  }
}

function denied(
  status: number,
  error: string,
  reason: string,
): ApiResponse<OAuthDeniedBody> {
  return {
    status,
    body: {
      error,
      reason,
    },
  }
}

function safeRedirectAfterSignIn(value: string | undefined): string | undefined {
  if (!value) return undefined

  if (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !value.includes("\n") &&
    !value.includes("\r")
  ) {
    return value
  }

  return undefined
}

function key(provider: "wikimedia", state: string): string {
  return `${provider}:${state}`
}
