import {
  type NormalizedWikimediaIdentity,
  type WikimediaGroupRoleMapping,
  WikimediaOAuthClient,
  type WikimediaOAuthConfig,
  type WikimediaOAuthHttpClient,
  type WikimediaOAuthProfile,
  mapWikimediaGroupsToRoles,
  normalizeWikimediaProfile,
} from "@aedventure/auth-wikimedia"
import type {
  PermissionKey,
  RoleKey,
  RoomId,
  SessionId,
  SpaceId,
  UserId,
  WorldTokenClaims,
} from "@aedventure/shared-types"
import { ApiController, type PermissionResolver } from "./controller"
import {
  registerApiRoutes,
  type ApiRoutesOptions,
  type Clock,
  type FastifyLike,
} from "./routes"
import {
  SeededPermissionResolver,
  type SeededPermissionResolverOptions,
} from "./seeded-permission-resolver"
import {
  InMemoryOAuthStateStore,
  SequentialOAuthStateGenerator,
  WikimediaOAuthController,
} from "./wikimedia-oauth-controller"

export type OAuthIdentityId = string

export interface UserRecord {
  readonly id: UserId
  readonly username: string
  readonly displayName: string
  readonly blocked: boolean
  readonly createdAt: string
  readonly updatedAt: string
}

export interface OAuthIdentityRecord {
  readonly id: OAuthIdentityId
  readonly userId: UserId
  readonly provider: "wikimedia"
  readonly providerSubject: string
  readonly username: string
  readonly groups: readonly string[]
  readonly rawProfile: Record<string, unknown>
  readonly createdAt: string
  readonly updatedAt: string
}

export interface SessionRecord {
  readonly id: SessionId
  readonly userId: UserId
  readonly createdAt: string
  readonly updatedAt: string
  readonly expiresAt: string
  readonly revokedAt?: string
}

export interface SessionCookie {
  readonly name: string
  readonly value: string
  readonly httpOnly: true
  readonly secure: true
  readonly sameSite: "lax" | "strict"
  readonly path: "/"
  readonly expiresAt: string
}

export interface IssuedWorldToken {
  readonly token: string
  readonly claims: WorldTokenClaims
}

export interface SignInSuccess {
  readonly status: "signed_in"
  readonly user: UserRecord
  readonly identity: OAuthIdentityRecord
  readonly session: SessionRecord
  readonly sessionCookie: SessionCookie
  readonly roleKeys: readonly RoleKey[]
}

export interface SignInDenied {
  readonly status: "denied"
  readonly reason: "wikimedia_blocked"
  readonly identity: NormalizedWikimediaIdentity
}

export type SignInResult = SignInSuccess | SignInDenied

export interface AuthenticationPolicy {
  readonly sessionTtlMs: number
  readonly worldTokenTtlMs: number
  readonly denyBlockedWikimediaUsers: boolean
  readonly sessionCookieName: string
}

export interface IdGenerator {
  nextId(prefix: string): string
}

export interface TokenSigner {
  sign(claims: WorldTokenClaims): string
}

export interface PlatformStore {
  findOAuthIdentity(
    provider: "wikimedia",
    providerSubject: string,
  ): Promise<OAuthIdentityRecord | undefined>
  findUserById(userId: UserId): Promise<UserRecord | undefined>
  findSessionById(sessionId: SessionId): Promise<SessionRecord | undefined>
  createUser(input: CreateUserInput): Promise<UserRecord>
  updateUser(userId: UserId, input: UpdateUserInput): Promise<UserRecord>
  createOAuthIdentity(input: CreateOAuthIdentityInput): Promise<OAuthIdentityRecord>
  updateOAuthIdentity(
    identityId: OAuthIdentityId,
    input: UpdateOAuthIdentityInput,
  ): Promise<OAuthIdentityRecord>
  createSession(input: CreateSessionInput): Promise<SessionRecord>
}

export interface CreateUserInput {
  readonly id: UserId
  readonly username: string
  readonly displayName: string
  readonly blocked: boolean
  readonly now: string
}

export interface UpdateUserInput {
  readonly username: string
  readonly displayName: string
  readonly blocked: boolean
  readonly now: string
}

export interface CreateOAuthIdentityInput {
  readonly id: OAuthIdentityId
  readonly userId: UserId
  readonly identity: NormalizedWikimediaIdentity
  readonly now: string
}

export interface UpdateOAuthIdentityInput {
  readonly identity: NormalizedWikimediaIdentity
  readonly now: string
}

export interface CreateSessionInput {
  readonly id: SessionId
  readonly userId: UserId
  readonly now: string
  readonly expiresAt: string
}

export interface AuthenticationServiceOptions {
  readonly store: PlatformStore
  readonly idGenerator: IdGenerator
  readonly tokenSigner: TokenSigner
  readonly policy: AuthenticationPolicy
  readonly roleMappings?: readonly WikimediaGroupRoleMapping[]
}

export class AuthenticationService {
  constructor(private readonly options: AuthenticationServiceOptions) {}

  async signInWithWikimediaProfile(
    profile: WikimediaOAuthProfile,
    nowMs: number,
  ): Promise<SignInResult> {
    const identity = normalizeWikimediaProfile(profile)

    if (identity.blocked && this.options.policy.denyBlockedWikimediaUsers) {
      return {
        status: "denied",
        reason: "wikimedia_blocked",
        identity,
      }
    }

    const now = iso(nowMs)
    const existingIdentity = await this.options.store.findOAuthIdentity(
      identity.provider,
      identity.providerSubject,
    )

    const user = existingIdentity
      ? await this.updateExistingUser(existingIdentity, identity, now)
      : await this.createUserForIdentity(identity, now)

    const storedIdentity = existingIdentity
      ? await this.options.store.updateOAuthIdentity(existingIdentity.id, {
          identity,
          now,
        })
      : await this.options.store.createOAuthIdentity({
          id: this.options.idGenerator.nextId("oid"),
          userId: user.id,
          identity,
          now,
        })

    const session = await this.options.store.createSession({
      id: this.options.idGenerator.nextId("sess") as SessionId,
      userId: user.id,
      now,
      expiresAt: iso(nowMs + this.options.policy.sessionTtlMs),
    })

    const roleKeys = mapWikimediaGroupsToRoles(
      identity,
      this.options.roleMappings ?? [],
    ) as readonly RoleKey[]

    return {
      status: "signed_in",
      user,
      identity: storedIdentity,
      session,
      sessionCookie: createSessionCookie(
        this.options.policy.sessionCookieName,
        session,
      ),
      roleKeys,
    }
  }

  async issueWorldToken(
    sessionId: SessionId,
    input: {
      readonly permissions: readonly PermissionKey[]
      readonly roles: readonly RoleKey[]
      readonly nowMs: number
      readonly spaceId?: SpaceId
      readonly roomId?: RoomId
    },
  ): Promise<IssuedWorldToken> {
    const session = await this.getActiveSession(sessionId, input.nowMs)

    const claims: WorldTokenClaims = {
      sub: session.userId,
      sessionId: session.id,
      permissions: input.permissions,
      roles: input.roles,
      spaceId: input.spaceId,
      roomId: input.roomId,
      expiresAt: iso(input.nowMs + this.options.policy.worldTokenTtlMs),
    }

    return {
      token: this.options.tokenSigner.sign(claims),
      claims,
    }
  }

  async getActiveSession(
    sessionId: SessionId,
    nowMs: number,
  ): Promise<SessionRecord> {
    const session = await this.options.store.findSessionById(sessionId)

    if (!session) {
      throw new Error("Cannot issue world token for unknown session.")
    }

    if (session.revokedAt) {
      throw new Error("Cannot issue world token for revoked session.")
    }

    if (Date.parse(session.expiresAt) <= nowMs) {
      throw new Error("Cannot issue world token for expired session.")
    }

    return session
  }

  private async createUserForIdentity(
    identity: NormalizedWikimediaIdentity,
    now: string,
  ): Promise<UserRecord> {
    return this.options.store.createUser({
      id: this.options.idGenerator.nextId("usr") as UserId,
      username: identity.username,
      displayName: identity.username,
      blocked: identity.blocked,
      now,
    })
  }

  private async updateExistingUser(
    existingIdentity: OAuthIdentityRecord,
    identity: NormalizedWikimediaIdentity,
    now: string,
  ): Promise<UserRecord> {
    return this.options.store.updateUser(existingIdentity.userId, {
      username: identity.username,
      displayName: identity.username,
      blocked: identity.blocked,
      now,
    })
  }
}

export class InMemoryPlatformStore implements PlatformStore {
  private readonly users = new Map<UserId, UserRecord>()
  private readonly oauthIdentities = new Map<OAuthIdentityId, OAuthIdentityRecord>()
  private readonly sessions = new Map<SessionId, SessionRecord>()

  async findOAuthIdentity(
    provider: "wikimedia",
    providerSubject: string,
  ): Promise<OAuthIdentityRecord | undefined> {
    return [...this.oauthIdentities.values()].find(
      (identity) =>
        identity.provider === provider &&
        identity.providerSubject === providerSubject,
    )
  }

  async findUserById(userId: UserId): Promise<UserRecord | undefined> {
    return this.users.get(userId)
  }

  async findSessionById(
    sessionId: SessionId,
  ): Promise<SessionRecord | undefined> {
    return this.sessions.get(sessionId)
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    const user: UserRecord = {
      id: input.id,
      username: input.username,
      displayName: input.displayName,
      blocked: input.blocked,
      createdAt: input.now,
      updatedAt: input.now,
    }

    this.users.set(user.id, user)
    return user
  }

  async updateUser(userId: UserId, input: UpdateUserInput): Promise<UserRecord> {
    const existing = required(this.users.get(userId), "Unknown user.")
    const updated: UserRecord = {
      ...existing,
      username: input.username,
      displayName: input.displayName,
      blocked: input.blocked,
      updatedAt: input.now,
    }

    this.users.set(userId, updated)
    return updated
  }

  async createOAuthIdentity(
    input: CreateOAuthIdentityInput,
  ): Promise<OAuthIdentityRecord> {
    const identity: OAuthIdentityRecord = {
      id: input.id,
      userId: input.userId,
      provider: input.identity.provider,
      providerSubject: input.identity.providerSubject,
      username: input.identity.username,
      groups: input.identity.groups,
      rawProfile: input.identity.rawProfile,
      createdAt: input.now,
      updatedAt: input.now,
    }

    this.oauthIdentities.set(identity.id, identity)
    return identity
  }

  async updateOAuthIdentity(
    identityId: OAuthIdentityId,
    input: UpdateOAuthIdentityInput,
  ): Promise<OAuthIdentityRecord> {
    const existing = required(
      this.oauthIdentities.get(identityId),
      "Unknown OAuth identity.",
    )
    const updated: OAuthIdentityRecord = {
      ...existing,
      username: input.identity.username,
      groups: input.identity.groups,
      rawProfile: input.identity.rawProfile,
      updatedAt: input.now,
    }

    this.oauthIdentities.set(identityId, updated)
    return updated
  }

  async createSession(input: CreateSessionInput): Promise<SessionRecord> {
    const session: SessionRecord = {
      id: input.id,
      userId: input.userId,
      createdAt: input.now,
      updatedAt: input.now,
      expiresAt: input.expiresAt,
    }

    this.sessions.set(session.id, session)
    return session
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private next = 1

  nextId(prefix: string): string {
    const id = `${prefix}_${this.next}`
    this.next += 1
    return id
  }
}

export class JsonTokenSigner implements TokenSigner {
  sign(claims: WorldTokenClaims): string {
    return `unsigned-local.${JSON.stringify(claims)}`
  }
}

export const DEFAULT_AUTHENTICATION_POLICY: AuthenticationPolicy = {
  sessionTtlMs: 1000 * 60 * 60 * 8,
  worldTokenTtlMs: 1000 * 60 * 5,
  denyBlockedWikimediaUsers: true,
  sessionCookieName: "aedventure_session",
}

export interface ApiRuntime {
  readonly auth: AuthenticationService
  readonly apiController: ApiController
  readonly wikimediaOAuthController: WikimediaOAuthController
  readonly permissionResolver: PermissionResolver
  readonly registerRoutes: (app: FastifyLike) => void
}

export interface CreateInMemoryApiRuntimeOptions {
  readonly oauth: WikimediaOAuthClient
  readonly clock?: Clock
  readonly platformStore?: PlatformStore
  readonly permissionResolver?: PermissionResolver
  readonly authenticationPolicy?: AuthenticationPolicy
  readonly roleMappings?: readonly WikimediaGroupRoleMapping[]
  readonly oauthStateTtlMs?: number
}

export interface RuntimeFetchRequest {
  readonly method: "GET" | "POST"
  readonly headers: Readonly<Record<string, string>>
  readonly body?: string
}

export interface RuntimeFetchResponse {
  readonly ok: boolean
  readonly status: number
  json(): Promise<unknown>
}

export interface RuntimeFetch {
  (url: string, request: RuntimeFetchRequest): Promise<RuntimeFetchResponse>
}

export interface ApiRuntimeConfig {
  readonly wikimediaOAuth: WikimediaOAuthConfig
  readonly sessionTtlMs?: number
  readonly worldTokenTtlMs?: number
  readonly denyBlockedWikimediaUsers?: boolean
  readonly sessionCookieName?: string
  readonly oauthStateTtlMs?: number
  readonly roleMappings?: readonly WikimediaGroupRoleMapping[]
  readonly seededAccess?: SeededPermissionResolverOptions
}

export interface CreateApiRuntimeFromConfigOptions {
  readonly config: ApiRuntimeConfig
  readonly fetch: RuntimeFetch
  readonly clock?: Clock
  readonly platformStore?: PlatformStore
  readonly permissionResolver?: PermissionResolver
}

export class FetchWikimediaOAuthHttpClient implements WikimediaOAuthHttpClient {
  constructor(private readonly fetch: RuntimeFetch) {}

  postForm(
    url: string,
    body: URLSearchParams,
    headers: Readonly<Record<string, string>>,
  ): Promise<unknown> {
    return this.jsonRequest(url, {
      method: "POST",
      headers,
      body: body.toString(),
    })
  }

  getJson(
    url: string,
    headers: Readonly<Record<string, string>>,
  ): Promise<unknown> {
    return this.jsonRequest(url, {
      method: "GET",
      headers,
    })
  }

  private async jsonRequest(
    url: string,
    request: RuntimeFetchRequest,
  ): Promise<unknown> {
    const response = await this.fetch(url, request)
    const body = await response.json()

    if (!response.ok) {
      throw new Error(`Wikimedia OAuth HTTP request failed: ${response.status}.`)
    }

    return body
  }
}

export function createInMemoryApiRuntime(
  options: CreateInMemoryApiRuntimeOptions,
): ApiRuntime {
  const auth = new AuthenticationService({
    store: options.platformStore ?? new InMemoryPlatformStore(),
    idGenerator: new SequentialIdGenerator(),
    tokenSigner: new JsonTokenSigner(),
    policy: options.authenticationPolicy ?? DEFAULT_AUTHENTICATION_POLICY,
    roleMappings: options.roleMappings,
  })
  const permissionResolver =
    options.permissionResolver ?? new SeededPermissionResolver()
  const apiController = new ApiController(auth, permissionResolver)
  const wikimediaOAuthController = new WikimediaOAuthController({
    oauth: options.oauth,
    auth,
    stateStore: new InMemoryOAuthStateStore(),
    stateGenerator: new SequentialOAuthStateGenerator(),
    stateTtlMs: options.oauthStateTtlMs ?? 1000 * 60 * 10,
  })
  const routeOptions: ApiRoutesOptions = {
    apiController,
    wikimediaOAuthController,
    clock: options.clock ?? systemClock,
  }

  return {
    auth,
    apiController,
    wikimediaOAuthController,
    permissionResolver,
    registerRoutes: (app) => registerApiRoutes(app, routeOptions),
  }
}

export function createApiRuntimeFromConfig(
  options: CreateApiRuntimeFromConfigOptions,
): ApiRuntime {
  return createInMemoryApiRuntime({
    oauth: new WikimediaOAuthClient(
      options.config.wikimediaOAuth,
      new FetchWikimediaOAuthHttpClient(options.fetch),
    ),
    clock: options.clock,
    platformStore: options.platformStore,
    permissionResolver:
      options.permissionResolver ??
      new SeededPermissionResolver(options.config.seededAccess),
    authenticationPolicy: authenticationPolicyFromConfig(options.config),
    roleMappings: options.config.roleMappings,
    oauthStateTtlMs: options.config.oauthStateTtlMs,
  })
}

export function apiRuntimeConfigFromEnv(
  env: Readonly<Record<string, string | undefined>>,
): ApiRuntimeConfig {
  const defaultRoles = csv(env.AEDVENTURE_DEFAULT_ROLE_KEYS)
  const defaultPermissions = csv(env.AEDVENTURE_DEFAULT_PERMISSION_KEYS)

  return {
    wikimediaOAuth: {
      clientId: requiredEnv(env, "WIKIMEDIA_OAUTH_CLIENT_ID"),
      clientSecret: optionalEnv(env.WIKIMEDIA_OAUTH_CLIENT_SECRET),
      redirectUri: optionalEnv(env.WIKIMEDIA_OAUTH_REDIRECT_URI),
      scopes: csv(env.WIKIMEDIA_OAUTH_SCOPES),
    },
    sessionTtlMs: optionalPositiveInteger(env.AEDVENTURE_SESSION_TTL_MS),
    worldTokenTtlMs: optionalPositiveInteger(env.AEDVENTURE_WORLD_TOKEN_TTL_MS),
    oauthStateTtlMs: optionalPositiveInteger(env.AEDVENTURE_OAUTH_STATE_TTL_MS),
    sessionCookieName: optionalEnv(env.AEDVENTURE_SESSION_COOKIE_NAME),
    seededAccess:
      defaultRoles.length > 0 || defaultPermissions.length > 0
        ? {
            defaultAccess: {
              roles: defaultRoles as readonly RoleKey[],
              permissions: defaultPermissions as readonly PermissionKey[],
            },
          }
        : undefined,
  }
}

export {
  type ApiResponse,
  type DeniedResponseBody,
  type IssueWorldTokenRequest,
  type PermissionResolver,
  type SignInRequest,
  type SignInResponseBody,
  type WorldTokenResponseBody,
  ApiController,
  serializeSessionCookie,
} from "./controller"

export {
  type SqlExecutor,
  type SqlQuery,
  PostgresPlatformStore,
} from "./postgres-store"

export {
  type CreateMapInput,
  type CreateMapVersionInput,
  type CreateRoomInput,
  type CreateSpaceInput,
  type MapDocument,
  type MapVersionRecord,
  type MapVersionStatus,
  type PublishMapVersionInput,
  type RoomRecord,
  type SpaceRecord,
  type WorldMapRecord,
  type WorldStore,
  PostgresWorldStore,
} from "./world-store"

export {
  type AssignUserRoleInput,
  type CreatePermissionInput,
  type CreateRoleInput,
  type GrantRolePermissionInput,
  type PermissionId,
  type PermissionRecord,
  type PermissionStore,
  type ResolveUserAccessInput,
  type ResolvedUserAccess,
  type RoleId,
  type RolePermissionRecord,
  type RoleRecord,
  type UserRoleAssignmentId,
  type UserRoleAssignmentRecord,
  PostgresPermissionStore,
} from "./permission-store"

export {
  type PgClientLike,
  type PgQueryResult,
  PgSqlExecutor,
} from "./pg-executor"

export {
  type BeginWikimediaSignInBody,
  type BeginWikimediaSignInRequest,
  type CompleteWikimediaSignInBody,
  type CompleteWikimediaSignInRequest,
  type CreateOAuthStateInput,
  type ConsumeOAuthStateInput,
  type OAuthDeniedBody,
  type OAuthStateGenerator,
  type OAuthStateRecord,
  type OAuthStateStore,
  type WikimediaOAuthControllerOptions,
  InMemoryOAuthStateStore,
  SequentialOAuthStateGenerator,
  WikimediaOAuthController,
} from "./wikimedia-oauth-controller"

export {
  type ApiRoutesOptions,
  type ApiFetchHandler,
  type ApiRouteRuntime,
  type Clock,
  type FastifyHandler,
  type FastifyLike,
  type FastifyReplyLike,
  type FastifyRequestLike,
  createApiFetchHandler,
  registerApiRoutes,
} from "./routes"

export {
  type SeededAccessGrant,
  type SeededPermissionResolverOptions,
  SeededPermissionResolver,
} from "./seeded-permission-resolver"

function createSessionCookie(
  name: string,
  session: SessionRecord,
): SessionCookie {
  return {
    name,
    value: session.id,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expiresAt: session.expiresAt,
  }
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message)
  return value
}

function iso(ms: number): string {
  return new Date(ms).toISOString()
}

const systemClock: Clock = {
  nowMs: () => Date.now(),
}

function authenticationPolicyFromConfig(
  config: ApiRuntimeConfig,
): AuthenticationPolicy {
  return {
    sessionTtlMs: config.sessionTtlMs ?? DEFAULT_AUTHENTICATION_POLICY.sessionTtlMs,
    worldTokenTtlMs:
      config.worldTokenTtlMs ?? DEFAULT_AUTHENTICATION_POLICY.worldTokenTtlMs,
    denyBlockedWikimediaUsers:
      config.denyBlockedWikimediaUsers ??
      DEFAULT_AUTHENTICATION_POLICY.denyBlockedWikimediaUsers,
    sessionCookieName:
      config.sessionCookieName ?? DEFAULT_AUTHENTICATION_POLICY.sessionCookieName,
  }
}

function requiredEnv(
  env: Readonly<Record<string, string | undefined>>,
  name: string,
): string {
  const value = optionalEnv(env[name])
  if (!value) throw new Error(`Missing required environment variable: ${name}.`)
  return value
}

function optionalEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function optionalPositiveInteger(value: string | undefined): number | undefined {
  const trimmed = optionalEnv(value)
  if (!trimmed) return undefined

  const parsed = Number(trimmed)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected positive integer environment value, got ${trimmed}.`)
  }

  return parsed
}

function csv(value: string | undefined): readonly string[] {
  return (optionalEnv(value) ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}
