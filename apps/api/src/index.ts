import {
  type NormalizedWikimediaIdentity,
  type WikimediaGroupRoleMapping,
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
    const session = await this.options.store.findSessionById(sessionId)

    if (!session) {
      throw new Error("Cannot issue world token for unknown session.")
    }

    if (session.revokedAt) {
      throw new Error("Cannot issue world token for revoked session.")
    }

    if (Date.parse(session.expiresAt) <= input.nowMs) {
      throw new Error("Cannot issue world token for expired session.")
    }

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
