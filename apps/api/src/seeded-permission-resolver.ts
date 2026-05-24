import type {
  PermissionKey,
  RoleKey,
  RoomId,
  SpaceId,
  TenantId,
  UserId,
} from "@aedventure/shared-types"
import type { PermissionResolver } from "./controller"
import type {
  ResolveUserAccessInput,
  ResolvedUserAccess,
} from "./permission-store"

export interface SeededAccessGrant {
  readonly userId?: UserId
  readonly tenantId?: TenantId
  readonly spaceId?: SpaceId
  readonly roomId?: RoomId
  readonly roles: readonly RoleKey[]
  readonly permissions: readonly PermissionKey[]
}

export interface SeededPermissionResolverOptions {
  readonly grants?: readonly SeededAccessGrant[]
  readonly defaultAccess?: ResolvedUserAccess
}

export class SeededPermissionResolver implements PermissionResolver {
  private readonly grants: readonly SeededAccessGrant[]
  private readonly defaultAccess: ResolvedUserAccess

  constructor(options: SeededPermissionResolverOptions = {}) {
    this.grants = options.grants ?? []
    this.defaultAccess = options.defaultAccess ?? {
      roles: [],
      permissions: [],
    }
  }

  async resolveUserAccess(
    input: ResolveUserAccessInput,
  ): Promise<ResolvedUserAccess> {
    const matchingGrants = this.grants.filter((grant) => grantMatches(grant, input))

    if (matchingGrants.length === 0) {
      return this.defaultAccess
    }

    return {
      roles: dedupe(matchingGrants.flatMap((grant) => grant.roles)),
      permissions: dedupe(matchingGrants.flatMap((grant) => grant.permissions)),
    }
  }
}

function grantMatches(
  grant: SeededAccessGrant,
  input: ResolveUserAccessInput,
): boolean {
  return (
    optionalScopeMatches(grant.userId, input.userId) &&
    optionalScopeMatches(grant.tenantId, input.tenantId) &&
    optionalScopeMatches(grant.spaceId, input.spaceId) &&
    optionalScopeMatches(grant.roomId, input.roomId)
  )
}

function optionalScopeMatches<TValue extends string>(
  grantValue: TValue | undefined,
  requestedValue: TValue | undefined,
): boolean {
  return grantValue === undefined || grantValue === requestedValue
}

function dedupe<TValue extends string>(values: readonly TValue[]): readonly TValue[] {
  return [...new Set(values)]
}
