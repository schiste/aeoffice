export type Brand<TValue, TBrand extends string> = TValue & {
  readonly __brand: TBrand
}

export type TenantId = Brand<string, "TenantId">
export type UserId = Brand<string, "UserId">
export type SessionId = Brand<string, "SessionId">
export type SpaceId = Brand<string, "SpaceId">
export type RoomId = Brand<string, "RoomId">
export type MapId = Brand<string, "MapId">
export type ZoneId = Brand<string, "ZoneId">
export type PlayerId = Brand<string, "PlayerId">
export type PermissionKey = Brand<string, "PermissionKey">
export type RoleKey = Brand<string, "RoleKey">

export interface Timestamped {
  readonly createdAt: string
  readonly updatedAt: string
}

export interface WorldTokenClaims {
  readonly sub: UserId
  readonly sessionId: SessionId
  readonly spaceId?: SpaceId
  readonly roomId?: RoomId
  readonly permissions: readonly PermissionKey[]
  readonly roles: readonly RoleKey[]
  readonly expiresAt: string
}

export function isWorldTokenClaims(value: unknown): value is WorldTokenClaims {
  if (!isRecord(value)) return false

  return (
    typeof value.sub === "string" &&
    typeof value.sessionId === "string" &&
    (value.spaceId === undefined || typeof value.spaceId === "string") &&
    (value.roomId === undefined || typeof value.roomId === "string") &&
    Array.isArray(value.permissions) &&
    value.permissions.every((permission) => typeof permission === "string") &&
    Array.isArray(value.roles) &&
    value.roles.every((role) => typeof role === "string") &&
    typeof value.expiresAt === "string" &&
    Number.isFinite(Date.parse(value.expiresAt))
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
