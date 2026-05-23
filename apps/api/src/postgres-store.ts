import type { SessionId, UserId } from "@aedventure/shared-types"
import type {
  CreateOAuthIdentityInput,
  CreateSessionInput,
  CreateUserInput,
  OAuthIdentityId,
  OAuthIdentityRecord,
  PlatformStore,
  SessionRecord,
  UpdateOAuthIdentityInput,
  UpdateUserInput,
  UserRecord,
} from "./index"

export interface SqlQuery {
  readonly text: string
  readonly values: readonly unknown[]
}

export interface SqlExecutor {
  oneOrNone<TRow>(query: SqlQuery): Promise<TRow | undefined>
  one<TRow>(query: SqlQuery): Promise<TRow>
  many<TRow>(query: SqlQuery): Promise<readonly TRow[]>
}

type SqlTimestamp = string | Date

interface UserRow {
  readonly id: string
  readonly username: string
  readonly display_name: string
  readonly blocked: boolean
  readonly created_at: SqlTimestamp
  readonly updated_at: SqlTimestamp
}

interface OAuthIdentityRow {
  readonly id: string
  readonly user_id: string
  readonly provider: "wikimedia"
  readonly provider_subject: string
  readonly username: string
  readonly groups: readonly string[]
  readonly raw_profile: Record<string, unknown>
  readonly created_at: SqlTimestamp
  readonly updated_at: SqlTimestamp
}

interface SessionRow {
  readonly id: string
  readonly user_id: string
  readonly created_at: SqlTimestamp
  readonly updated_at: SqlTimestamp
  readonly expires_at: SqlTimestamp
  readonly revoked_at: SqlTimestamp | null
}

const USER_COLUMNS =
  "id, username, display_name, blocked, created_at, updated_at"
const OAUTH_IDENTITY_COLUMNS =
  "id, user_id, provider, provider_subject, username, groups, raw_profile, created_at, updated_at"
const SESSION_COLUMNS =
  "id, user_id, created_at, updated_at, expires_at, revoked_at"

export class PostgresPlatformStore implements PlatformStore {
  constructor(private readonly sql: SqlExecutor) {}

  async findOAuthIdentity(
    provider: "wikimedia",
    providerSubject: string,
  ): Promise<OAuthIdentityRecord | undefined> {
    const row = await this.sql.oneOrNone<OAuthIdentityRow>({
      text: `
        select ${OAUTH_IDENTITY_COLUMNS}
        from oauth_identities
        where provider = $1 and provider_subject = $2
      `,
      values: [provider, providerSubject],
    })

    return row ? toOAuthIdentityRecord(row) : undefined
  }

  async findUserById(userId: UserId): Promise<UserRecord | undefined> {
    const row = await this.sql.oneOrNone<UserRow>({
      text: `
        select ${USER_COLUMNS}
        from users
        where id = $1
      `,
      values: [userId],
    })

    return row ? toUserRecord(row) : undefined
  }

  async findSessionById(
    sessionId: SessionId,
  ): Promise<SessionRecord | undefined> {
    const row = await this.sql.oneOrNone<SessionRow>({
      text: `
        select ${SESSION_COLUMNS}
        from sessions
        where id = $1
      `,
      values: [sessionId],
    })

    return row ? toSessionRecord(row) : undefined
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    const row = await this.sql.one<UserRow>({
      text: `
        insert into users (id, username, display_name, blocked, created_at, updated_at)
        values ($1, $2, $3, $4, $5, $5)
        returning ${USER_COLUMNS}
      `,
      values: [
        input.id,
        input.username,
        input.displayName,
        input.blocked,
        input.now,
      ],
    })

    return toUserRecord(row)
  }

  async updateUser(
    userId: UserId,
    input: UpdateUserInput,
  ): Promise<UserRecord> {
    const row = await this.sql.one<UserRow>({
      text: `
        update users
        set username = $2,
            display_name = $3,
            blocked = $4,
            updated_at = $5
        where id = $1
        returning ${USER_COLUMNS}
      `,
      values: [
        userId,
        input.username,
        input.displayName,
        input.blocked,
        input.now,
      ],
    })

    return toUserRecord(row)
  }

  async createOAuthIdentity(
    input: CreateOAuthIdentityInput,
  ): Promise<OAuthIdentityRecord> {
    const row = await this.sql.one<OAuthIdentityRow>({
      text: `
        insert into oauth_identities (
          id,
          user_id,
          provider,
          provider_subject,
          username,
          groups,
          raw_profile,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $8)
        returning ${OAUTH_IDENTITY_COLUMNS}
      `,
      values: [
        input.id,
        input.userId,
        input.identity.provider,
        input.identity.providerSubject,
        input.identity.username,
        [...input.identity.groups],
        input.identity.rawProfile,
        input.now,
      ],
    })

    return toOAuthIdentityRecord(row)
  }

  async updateOAuthIdentity(
    identityId: OAuthIdentityId,
    input: UpdateOAuthIdentityInput,
  ): Promise<OAuthIdentityRecord> {
    const row = await this.sql.one<OAuthIdentityRow>({
      text: `
        update oauth_identities
        set username = $2,
            groups = $3,
            raw_profile = $4,
            updated_at = $5
        where id = $1
        returning ${OAUTH_IDENTITY_COLUMNS}
      `,
      values: [
        identityId,
        input.identity.username,
        [...input.identity.groups],
        input.identity.rawProfile,
        input.now,
      ],
    })

    return toOAuthIdentityRecord(row)
  }

  async createSession(input: CreateSessionInput): Promise<SessionRecord> {
    const row = await this.sql.one<SessionRow>({
      text: `
        insert into sessions (id, user_id, expires_at, created_at, updated_at)
        values ($1, $2, $3, $4, $4)
        returning ${SESSION_COLUMNS}
      `,
      values: [input.id, input.userId, input.expiresAt, input.now],
    })

    return toSessionRecord(row)
  }
}

function toUserRecord(row: UserRow): UserRecord {
  return {
    id: row.id as UserId,
    username: row.username,
    displayName: row.display_name,
    blocked: row.blocked,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

function toOAuthIdentityRecord(row: OAuthIdentityRow): OAuthIdentityRecord {
  return {
    id: row.id,
    userId: row.user_id as UserId,
    provider: row.provider,
    providerSubject: row.provider_subject,
    username: row.username,
    groups: row.groups,
    rawProfile: row.raw_profile,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

function toSessionRecord(row: SessionRow): SessionRecord {
  return {
    id: row.id as SessionId,
    userId: row.user_id as UserId,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    expiresAt: toIso(row.expires_at),
    revokedAt: row.revoked_at ? toIso(row.revoked_at) : undefined,
  }
}

function toIso(value: SqlTimestamp): string {
  return value instanceof Date ? value.toISOString() : value
}
