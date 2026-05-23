export interface WikimediaOAuthProfile {
  readonly sub: string
  readonly username: string
  readonly blocked?: boolean
  readonly groups?: readonly string[]
  readonly registered?: string
  readonly editcount?: number
  readonly raw?: Record<string, unknown>
}

export interface WikimediaOAuthEndpoints {
  readonly authorizationUrl: string
  readonly tokenUrl: string
  readonly profileUrl: string
}

export interface WikimediaOAuthConfig {
  readonly clientId: string
  readonly clientSecret?: string
  readonly redirectUri?: string
  readonly scopes?: readonly string[]
  readonly endpoints?: Partial<WikimediaOAuthEndpoints>
}

export interface WikimediaAuthorizationUrlInput {
  readonly state: string
  readonly codeChallenge?: string
  readonly codeChallengeMethod?: "S256" | "plain"
  readonly redirectUri?: string
  readonly scopes?: readonly string[]
}

export interface WikimediaOAuthCallbackInput {
  readonly code?: string
  readonly state?: string
  readonly expectedState: string
  readonly error?: string
  readonly errorDescription?: string
}

export interface WikimediaOAuthTokenResponse {
  readonly accessToken: string
  readonly refreshToken?: string
  readonly tokenType?: string
  readonly expiresIn?: number
  readonly scope?: string
  readonly raw: Record<string, unknown>
}

export interface WikimediaOAuthHttpClient {
  postForm(
    url: string,
    body: URLSearchParams,
    headers: Readonly<Record<string, string>>,
  ): Promise<unknown>
  getJson(
    url: string,
    headers: Readonly<Record<string, string>>,
  ): Promise<unknown>
}

export interface WikimediaAuthorizationCodeExchangeInput {
  readonly code: string
  readonly redirectUri?: string
  readonly codeVerifier?: string
}

export interface WikimediaAuthorizationCodeFlowInput
  extends WikimediaOAuthCallbackInput {
  readonly redirectUri?: string
  readonly codeVerifier?: string
}

export interface WikimediaAuthorizationCodeFlowResult {
  readonly token: WikimediaOAuthTokenResponse
  readonly profile: WikimediaOAuthProfile
  readonly identity: NormalizedWikimediaIdentity
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

export const WIKIMEDIA_OAUTH_ENDPOINTS: WikimediaOAuthEndpoints = {
  authorizationUrl: "https://meta.wikimedia.org/w/rest.php/oauth2/authorize",
  tokenUrl: "https://meta.wikimedia.org/w/rest.php/oauth2/access_token",
  profileUrl: "https://meta.wikimedia.org/w/rest.php/oauth2/resource/profile",
}

export class WikimediaOAuthClient {
  constructor(
    private readonly config: WikimediaOAuthConfig,
    private readonly http: WikimediaOAuthHttpClient,
  ) {}

  buildAuthorizationUrl(input: WikimediaAuthorizationUrlInput): string {
    return buildWikimediaAuthorizationUrl(this.config, input)
  }

  validateCallback(input: WikimediaOAuthCallbackInput): string {
    return validateWikimediaOAuthCallback(input)
  }

  exchangeAuthorizationCode(
    input: WikimediaAuthorizationCodeExchangeInput,
  ): Promise<WikimediaOAuthTokenResponse> {
    return exchangeWikimediaAuthorizationCode(this.config, this.http, input)
  }

  fetchProfile(accessToken: string): Promise<WikimediaOAuthProfile> {
    return fetchWikimediaOAuthProfile(this.config, this.http, accessToken)
  }

  async completeAuthorizationCodeFlow(
    input: WikimediaAuthorizationCodeFlowInput,
  ): Promise<WikimediaAuthorizationCodeFlowResult> {
    const code = this.validateCallback(input)
    const token = await this.exchangeAuthorizationCode({
      code,
      redirectUri: input.redirectUri,
      codeVerifier: input.codeVerifier,
    })
    const profile = await this.fetchProfile(token.accessToken)

    return {
      token,
      profile,
      identity: normalizeWikimediaProfile(profile),
    }
  }
}

export function buildWikimediaAuthorizationUrl(
  config: WikimediaOAuthConfig,
  input: WikimediaAuthorizationUrlInput,
): string {
  assertNonEmpty(config.clientId, "Wikimedia OAuth client ID is required.")
  assertNonEmpty(input.state, "Wikimedia OAuth state is required.")

  const endpoints = resolveEndpoints(config)
  const url = new URL(endpoints.authorizationUrl)
  const redirectUri = input.redirectUri ?? config.redirectUri
  const scopes = input.scopes ?? config.scopes

  url.searchParams.set("client_id", config.clientId)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("state", input.state)

  if (redirectUri) url.searchParams.set("redirect_uri", redirectUri)
  if (scopes?.length) url.searchParams.set("scope", scopes.join(" "))

  if (input.codeChallenge) {
    url.searchParams.set("code_challenge", input.codeChallenge)
    url.searchParams.set(
      "code_challenge_method",
      input.codeChallengeMethod ?? "S256",
    )
  }

  return url.toString()
}

export function validateWikimediaOAuthCallback(
  input: WikimediaOAuthCallbackInput,
): string {
  if (input.error) {
    const description = input.errorDescription
      ? `: ${input.errorDescription}`
      : ""
    throw new Error(`Wikimedia OAuth error ${input.error}${description}.`)
  }

  if (!input.state || input.state !== input.expectedState) {
    throw new Error("Wikimedia OAuth callback state mismatch.")
  }

  if (!input.code?.trim()) {
    throw new Error("Wikimedia OAuth callback is missing code.")
  }

  return input.code
}

export async function exchangeWikimediaAuthorizationCode(
  config: WikimediaOAuthConfig,
  http: WikimediaOAuthHttpClient,
  input: WikimediaAuthorizationCodeExchangeInput,
): Promise<WikimediaOAuthTokenResponse> {
  assertNonEmpty(config.clientId, "Wikimedia OAuth client ID is required.")
  assertNonEmpty(input.code, "Wikimedia OAuth authorization code is required.")

  const endpoints = resolveEndpoints(config)
  const redirectUri = input.redirectUri ?? config.redirectUri
  const form = new URLSearchParams()

  form.set("grant_type", "authorization_code")
  form.set("code", input.code)
  form.set("client_id", config.clientId)

  if (config.clientSecret) form.set("client_secret", config.clientSecret)
  if (redirectUri) form.set("redirect_uri", redirectUri)
  if (input.codeVerifier) form.set("code_verifier", input.codeVerifier)

  const raw = await http.postForm(endpoints.tokenUrl, form, {
    "content-type": "application/x-www-form-urlencoded",
  })

  return parseWikimediaTokenResponse(raw)
}

export async function fetchWikimediaOAuthProfile(
  config: WikimediaOAuthConfig,
  http: WikimediaOAuthHttpClient,
  accessToken: string,
): Promise<WikimediaOAuthProfile> {
  assertNonEmpty(accessToken, "Wikimedia OAuth access token is required.")

  const endpoints = resolveEndpoints(config)
  const raw = await http.getJson(endpoints.profileUrl, {
    authorization: `Bearer ${accessToken}`,
  })

  return parseWikimediaOAuthProfile(raw)
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

export function parseWikimediaTokenResponse(
  value: unknown,
): WikimediaOAuthTokenResponse {
  const raw = asRecord(value, "Wikimedia OAuth token response")

  return {
    accessToken: requiredString(raw, "access_token"),
    refreshToken: optionalString(raw, "refresh_token"),
    tokenType: optionalString(raw, "token_type"),
    expiresIn: optionalNumber(raw, "expires_in"),
    scope: optionalString(raw, "scope"),
    raw,
  }
}

export function parseWikimediaOAuthProfile(
  value: unknown,
): WikimediaOAuthProfile {
  const raw = asRecord(value, "Wikimedia OAuth profile")

  return {
    sub: requiredString(raw, "sub"),
    username: requiredString(raw, "username"),
    blocked: optionalBoolean(raw, "blocked"),
    groups: optionalStringArray(raw, "groups"),
    registered: optionalString(raw, "registered"),
    editcount: optionalNumber(raw, "editcount"),
    raw,
  }
}

function resolveEndpoints(config: WikimediaOAuthConfig): WikimediaOAuthEndpoints {
  return {
    ...WIKIMEDIA_OAUTH_ENDPOINTS,
    ...(config.endpoints ?? {}),
  }
}

function assertNonEmpty(value: string, message: string): void {
  if (!value.trim()) throw new Error(message)
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`)
  }

  return value as Record<string, unknown>
}

function requiredString(
  record: Readonly<Record<string, unknown>>,
  key: string,
): string {
  const value = record[key]

  if (typeof value === "string" && value.trim()) return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)

  throw new Error(`Wikimedia OAuth response is missing ${key}.`)
}

function optionalString(
  record: Readonly<Record<string, unknown>>,
  key: string,
): string | undefined {
  const value = record[key]

  if (value === undefined || value === null || value === "") return undefined
  if (typeof value === "string") return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)

  throw new Error(`Wikimedia OAuth response has invalid ${key}.`)
}

function optionalNumber(
  record: Readonly<Record<string, unknown>>,
  key: string,
): number | undefined {
  const value = record[key]

  if (value === undefined || value === null) return undefined
  if (typeof value === "number" && Number.isFinite(value)) return value

  throw new Error(`Wikimedia OAuth response has invalid ${key}.`)
}

function optionalBoolean(
  record: Readonly<Record<string, unknown>>,
  key: string,
): boolean | undefined {
  const value = record[key]

  if (value === undefined || value === null) return undefined
  if (typeof value === "boolean") return value

  throw new Error(`Wikimedia OAuth response has invalid ${key}.`)
}

function optionalStringArray(
  record: Readonly<Record<string, unknown>>,
  key: string,
): readonly string[] | undefined {
  const value = record[key]

  if (value === undefined || value === null) return undefined
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value
  }

  throw new Error(`Wikimedia OAuth response has invalid ${key}.`)
}

function dedupe(values: readonly string[]): readonly string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}
