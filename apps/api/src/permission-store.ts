import type {
  PermissionKey,
  RoleKey,
  RoomId,
  SpaceId,
  TenantId,
  UserId,
} from "@aedventure/shared-types"
import type { SqlExecutor } from "./postgres-store"

export type RoleId = string
export type PermissionId = string
export type UserRoleAssignmentId = string

export interface RoleRecord {
  readonly id: RoleId
  readonly tenantId?: TenantId
  readonly key: RoleKey
  readonly name: string
  readonly createdAt: string
  readonly updatedAt: string
}

export interface PermissionRecord {
  readonly id: PermissionId
  readonly key: PermissionKey
  readonly description: string
  readonly createdAt: string
  readonly updatedAt: string
}

export interface RolePermissionRecord {
  readonly roleId: RoleId
  readonly permissionId: PermissionId
  readonly createdAt: string
}

export interface UserRoleAssignmentRecord {
  readonly id: UserRoleAssignmentId
  readonly userId: UserId
  readonly roleId: RoleId
  readonly spaceId?: SpaceId
  readonly roomId?: RoomId
  readonly createdAt: string
}

export interface ResolvedUserAccess {
  readonly roles: readonly RoleKey[]
  readonly permissions: readonly PermissionKey[]
}

export interface CreateRoleInput {
  readonly id: RoleId
  readonly tenantId?: TenantId
  readonly key: RoleKey
  readonly name: string
  readonly now: string
}

export interface CreatePermissionInput {
  readonly id: PermissionId
  readonly key: PermissionKey
  readonly description: string
  readonly now: string
}

export interface GrantRolePermissionInput {
  readonly roleId: RoleId
  readonly permissionId: PermissionId
  readonly now: string
}

export interface AssignUserRoleInput {
  readonly id: UserRoleAssignmentId
  readonly userId: UserId
  readonly roleId: RoleId
  readonly spaceId?: SpaceId
  readonly roomId?: RoomId
  readonly now: string
}

export interface ResolveUserAccessInput {
  readonly userId: UserId
  readonly tenantId?: TenantId
  readonly spaceId?: SpaceId
  readonly roomId?: RoomId
}

export interface PermissionStore {
  createRole(input: CreateRoleInput): Promise<RoleRecord>
  createPermission(input: CreatePermissionInput): Promise<PermissionRecord>
  grantRolePermission(
    input: GrantRolePermissionInput,
  ): Promise<RolePermissionRecord>
  assignUserRole(input: AssignUserRoleInput): Promise<UserRoleAssignmentRecord>
  resolveUserAccess(input: ResolveUserAccessInput): Promise<ResolvedUserAccess>
}

type SqlTimestamp = string | Date

interface RoleRow {
  readonly id: string
  readonly tenant_id: string | null
  readonly key: string
  readonly name: string
  readonly created_at: SqlTimestamp
  readonly updated_at: SqlTimestamp
}

interface PermissionRow {
  readonly id: string
  readonly key: string
  readonly description: string
  readonly created_at: SqlTimestamp
  readonly updated_at: SqlTimestamp
}

interface RolePermissionRow {
  readonly role_id: string
  readonly permission_id: string
  readonly created_at: SqlTimestamp
}

interface UserRoleAssignmentRow {
  readonly id: string
  readonly user_id: string
  readonly role_id: string
  readonly space_id: string | null
  readonly room_id: string | null
  readonly created_at: SqlTimestamp
}

interface EffectivePermissionRow {
  readonly role_key: string
  readonly permission_key: string | null
}

const ROLE_COLUMNS = "id, tenant_id, key, name, created_at, updated_at"
const PERMISSION_COLUMNS = "id, key, description, created_at, updated_at"
const USER_ROLE_ASSIGNMENT_COLUMNS =
  "id, user_id, role_id, space_id, room_id, created_at"

export class PostgresPermissionStore implements PermissionStore {
  constructor(private readonly sql: SqlExecutor) {}

  async createRole(input: CreateRoleInput): Promise<RoleRecord> {
    const row = await this.sql.one<RoleRow>({
      text: `
        insert into roles (id, tenant_id, key, name, created_at, updated_at)
        values ($1, $2, $3, $4, $5, $5)
        returning ${ROLE_COLUMNS}
      `,
      values: [
        input.id,
        input.tenantId ?? null,
        input.key,
        input.name,
        input.now,
      ],
    })

    return toRoleRecord(row)
  }

  async createPermission(
    input: CreatePermissionInput,
  ): Promise<PermissionRecord> {
    const row = await this.sql.one<PermissionRow>({
      text: `
        insert into permissions (id, key, description, created_at, updated_at)
        values ($1, $2, $3, $4, $4)
        returning ${PERMISSION_COLUMNS}
      `,
      values: [input.id, input.key, input.description, input.now],
    })

    return toPermissionRecord(row)
  }

  async grantRolePermission(
    input: GrantRolePermissionInput,
  ): Promise<RolePermissionRecord> {
    const row = await this.sql.one<RolePermissionRow>({
      text: `
        insert into role_permissions (role_id, permission_id, created_at)
        values ($1, $2, $3)
        returning role_id, permission_id, created_at
      `,
      values: [input.roleId, input.permissionId, input.now],
    })

    return toRolePermissionRecord(row)
  }

  async assignUserRole(
    input: AssignUserRoleInput,
  ): Promise<UserRoleAssignmentRecord> {
    const row = await this.sql.one<UserRoleAssignmentRow>({
      text: `
        insert into user_role_assignments (
          id,
          user_id,
          role_id,
          space_id,
          room_id,
          created_at
        )
        values ($1, $2, $3, $4, $5, $6)
        returning ${USER_ROLE_ASSIGNMENT_COLUMNS}
      `,
      values: [
        input.id,
        input.userId,
        input.roleId,
        input.spaceId ?? null,
        input.roomId ?? null,
        input.now,
      ],
    })

    return toUserRoleAssignmentRecord(row)
  }

  async resolveUserAccess(
    input: ResolveUserAccessInput,
  ): Promise<ResolvedUserAccess> {
    const rows = await this.sql.many<EffectivePermissionRow>({
      text: `
        select r.key as role_key,
               p.key as permission_key
        from user_role_assignments ura
        join roles r on r.id = ura.role_id
        left join role_permissions rp on rp.role_id = r.id
        left join permissions p on p.id = rp.permission_id
        where ura.user_id = $1
          and ($2::uuid is null or r.tenant_id is null or r.tenant_id = $2)
          and ($3::uuid is null or ura.space_id is null or ura.space_id = $3)
          and ($4::uuid is null or ura.room_id is null or ura.room_id = $4)
        order by r.key asc, p.key asc
      `,
      values: [
        input.userId,
        input.tenantId ?? null,
        input.spaceId ?? null,
        input.roomId ?? null,
      ],
    })

    return {
      roles: dedupe(
        rows.map((row) => row.role_key).filter((key) => key.trim()),
      ) as readonly RoleKey[],
      permissions: dedupe(
        rows
          .map((row) => row.permission_key)
          .filter((key): key is string => typeof key === "string" && !!key.trim()),
      ) as readonly PermissionKey[],
    }
  }
}

function toRoleRecord(row: RoleRow): RoleRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id ? (row.tenant_id as TenantId) : undefined,
    key: row.key as RoleKey,
    name: row.name,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

function toPermissionRecord(row: PermissionRow): PermissionRecord {
  return {
    id: row.id,
    key: row.key as PermissionKey,
    description: row.description,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

function toRolePermissionRecord(row: RolePermissionRow): RolePermissionRecord {
  return {
    roleId: row.role_id,
    permissionId: row.permission_id,
    createdAt: toIso(row.created_at),
  }
}

function toUserRoleAssignmentRecord(
  row: UserRoleAssignmentRow,
): UserRoleAssignmentRecord {
  return {
    id: row.id,
    userId: row.user_id as UserId,
    roleId: row.role_id,
    spaceId: row.space_id ? (row.space_id as SpaceId) : undefined,
    roomId: row.room_id ? (row.room_id as RoomId) : undefined,
    createdAt: toIso(row.created_at),
  }
}

function dedupe(values: readonly string[]): readonly string[] {
  return [...new Set(values)]
}

function toIso(value: SqlTimestamp): string {
  return value instanceof Date ? value.toISOString() : value
}
