import type {
  RoomId,
  SessionId,
  SpaceId,
  TenantId,
} from "@aedventure/shared-types"
import type {
  ApiController,
  ApiResponse,
  IssueWorldTokenRequest,
} from "./controller"
import type {
  BeginWikimediaSignInRequest,
  CompleteWikimediaSignInRequest,
  WikimediaOAuthController,
} from "./wikimedia-oauth-controller"

export interface ApiRoutesOptions {
  readonly apiController: ApiController
  readonly wikimediaOAuthController: WikimediaOAuthController
  readonly clock: Clock
}

export interface ApiRouteRuntime {
  registerRoutes(app: FastifyLike): void
}

export interface Clock {
  nowMs(): number
}

export interface FastifyLike {
  get(path: string, handler: FastifyHandler): void
  post(path: string, handler: FastifyHandler): void
}

export interface FastifyRequestLike {
  readonly query?: unknown
  readonly body?: unknown
}

export interface FastifyReplyLike {
  status(code: number): FastifyReplyLike
  header(name: string, value: string): FastifyReplyLike
  send(body: unknown): unknown
}

export type FastifyHandler = (
  request: FastifyRequestLike,
  reply: FastifyReplyLike,
) => Promise<unknown>

export type ApiFetchHandler = (request: Request) => Promise<Response>

export function registerApiRoutes(
  app: FastifyLike,
  options: ApiRoutesOptions,
): void {
  app.get("/auth/wikimedia/start", async (request, reply) =>
    sendRoute(reply, async () =>
      options.wikimediaOAuthController.beginSignIn(
        beginWikimediaSignInRequest(request, options.clock),
      ),
    ),
  )

  app.get("/auth/wikimedia/callback", async (request, reply) =>
    sendRoute(reply, async () =>
      options.wikimediaOAuthController.completeSignIn(
        completeWikimediaSignInRequest(request, options.clock),
      ),
    ),
  )

  app.post("/world-token", async (request, reply) =>
    sendRoute(reply, async () =>
      options.apiController.issueWorldToken(
        issueWorldTokenRequest(request, options.clock),
      ),
    ),
  )
}

export function createApiFetchHandler(runtime: ApiRouteRuntime): ApiFetchHandler {
  const app = new FetchRouteRegistry()
  runtime.registerRoutes(app)
  return (request) => app.handle(request)
}

function beginWikimediaSignInRequest(
  request: FastifyRequestLike,
  clock: Clock,
): BeginWikimediaSignInRequest {
  const query = asRecord(request.query)

  return {
    nowMs: clock.nowMs(),
    redirectAfterSignIn: optionalString(
      query.redirectAfterSignIn ?? query.redirect_after_sign_in,
    ),
    codeChallenge: optionalString(query.codeChallenge ?? query.code_challenge),
    codeChallengeMethod: codeChallengeMethod(
      query.codeChallengeMethod ?? query.code_challenge_method,
    ),
  }
}

function completeWikimediaSignInRequest(
  request: FastifyRequestLike,
  clock: Clock,
): CompleteWikimediaSignInRequest {
  const query = asRecord(request.query)

  return {
    nowMs: clock.nowMs(),
    state: optionalString(query.state),
    code: optionalString(query.code),
    error: optionalString(query.error),
    errorDescription: optionalString(
      query.errorDescription ?? query.error_description,
    ),
  }
}

function issueWorldTokenRequest(
  request: FastifyRequestLike,
  clock: Clock,
): IssueWorldTokenRequest {
  const body = asRecord(request.body)

  return {
    sessionId: requiredString(body.sessionId, "sessionId") as SessionId,
    nowMs: clock.nowMs(),
    tenantId: optionalString(body.tenantId) as TenantId | undefined,
    spaceId: optionalString(body.spaceId) as SpaceId | undefined,
    roomId: optionalString(body.roomId) as RoomId | undefined,
  }
}

function send(reply: FastifyReplyLike, response: ApiResponse<unknown>): unknown {
  reply.status(response.status)

  for (const [name, value] of Object.entries(response.headers ?? {})) {
    reply.header(name, value)
  }

  return reply.send(response.body)
}

async function sendRoute(
  reply: FastifyReplyLike,
  handler: () => Promise<ApiResponse<unknown>>,
): Promise<unknown> {
  try {
    return send(reply, await handler())
  } catch (error) {
    return send(reply, {
      status: 400,
      body: {
        error: "bad_request",
        reason: error instanceof Error ? error.message : "Invalid request.",
      },
    })
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined
}

function requiredString(value: unknown, fieldName: string): string {
  const parsed = optionalString(value)
  if (!parsed) throw new Error(`Missing required field: ${fieldName}.`)
  return parsed
}

function codeChallengeMethod(value: unknown): "S256" | "plain" | undefined {
  if (value === "S256" || value === "plain") return value
  if (value === undefined || value === null || value === "") return undefined

  throw new Error("Invalid Wikimedia OAuth code challenge method.")
}

class FetchRouteRegistry implements FastifyLike {
  private readonly routes = new Map<string, FastifyHandler>()

  get(path: string, handler: FastifyHandler): void {
    this.routes.set(routeKey("GET", path), handler)
  }

  post(path: string, handler: FastifyHandler): void {
    this.routes.set(routeKey("POST", path), handler)
  }

  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const handler = this.routes.get(routeKey(request.method, url.pathname))

    if (!handler) {
      return jsonResponse(404, {
        error: "not_found",
        reason: "No API route matches this request.",
      })
    }

    try {
      const reply = new FetchReply()
      await handler(
        {
          query: queryRecord(url.searchParams),
          body: await requestBody(request),
        },
        reply,
      )
      return reply.toResponse()
    } catch (error) {
      return jsonResponse(400, {
        error: "bad_request",
        reason: error instanceof Error ? error.message : "Invalid request.",
      })
    }
  }
}

class FetchReply implements FastifyReplyLike {
  private statusCode = 200
  private readonly headers = new Headers()
  private body: unknown

  status(code: number): FastifyReplyLike {
    this.statusCode = code
    return this
  }

  header(name: string, value: string): FastifyReplyLike {
    this.headers.set(name, value)
    return this
  }

  send(body: unknown): unknown {
    this.body = body
    return this
  }

  toResponse(): Response {
    if (!this.headers.has("content-type")) {
      this.headers.set("content-type", "application/json")
    }

    return new Response(JSON.stringify(this.body ?? null), {
      status: this.statusCode,
      headers: this.headers,
    })
  }
}

async function requestBody(request: Request): Promise<unknown> {
  if (request.method === "GET" || request.method === "HEAD") return undefined

  const text = await request.text()
  if (!text.trim()) return undefined
  return JSON.parse(text)
}

function queryRecord(searchParams: URLSearchParams): Record<string, string> {
  return Object.fromEntries(searchParams.entries())
}

function routeKey(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  })
}
