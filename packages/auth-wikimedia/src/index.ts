export interface WikimediaOAuthProfile {
  readonly sub: string
  readonly username: string
  readonly blocked?: boolean
  readonly groups?: readonly string[]
  readonly registered?: string
  readonly editcount?: number
  readonly raw?: Record<string, unknown>
}

export interface NormalizedWikimediaIdentity {
  readonly provider: "wikimedia"
  readonly providerSubject: string
  readonly username: string
  readonly blocked: boolean
  readonly groups: readonly string[]
  readonly registered?: string
  readonly editCount?: number
  readonly rawProfile: Record<string, unknown>
}

export interface WikimediaGroupRoleMapping {
  readonly wikimediaGroup: string
  readonly roleKey: string
}

export function normalizeWikimediaProfile(
  profile: WikimediaOAuthProfile,
): NormalizedWikimediaIdentity {
  if (!profile.sub.trim()) {
    throw new Error("Wikimedia profile is missing sub.")
  }

  if (!profile.username.trim()) {
    throw new Error("Wikimedia profile is missing username.")
  }

  return {
    provider: "wikimedia",
    providerSubject: profile.sub,
    username: profile.username,
    blocked: profile.blocked === true,
    groups: dedupe(profile.groups ?? []),
    registered: profile.registered,
    editCount: profile.editcount,
    rawProfile: {
      sub: profile.sub,
      username: profile.username,
      blocked: profile.blocked === true,
      groups: [...(profile.groups ?? [])],
      registered: profile.registered,
      editcount: profile.editcount,
      ...(profile.raw ?? {}),
    },
  }
}

export function mapWikimediaGroupsToRoles(
  identity: NormalizedWikimediaIdentity,
  mappings: readonly WikimediaGroupRoleMapping[],
): readonly string[] {
  const mappedRoles = mappings
    .filter((mapping) => identity.groups.includes(mapping.wikimediaGroup))
    .map((mapping) => mapping.roleKey)

  return dedupe(mappedRoles)
}

function dedupe(values: readonly string[]): readonly string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}
