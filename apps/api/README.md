# apps/api

Target Fastify API server.

Responsibilities:

- Wikimedia OAuth 2.0 login.
- Local users, sessions, and OAuth identities.
- Roles and permissions.
- Persistent worlds, rooms, maps, assets, and moderation events.
- World-server token issuance.
- LiveKit token authorization through media-gateway.

Current implementation:

- `AuthenticationService` accepts normalized Wikimedia profiles and creates or
  updates local users, OAuth identities, and sessions.
- Blocked Wikimedia users are denied by default.
- API sessions issue secure, HTTP-only cookie descriptors.
- World tokens are short-lived claims derived from local sessions and shared
  through `packages/shared-types`.
- `ApiController` exposes dependency-light HTTP-shaped sign-in and world-token
  handlers for future Fastify routes. World-token issuance resolves roles and
  permissions server-side through `PermissionStore`; clients do not submit
  token permissions.
- `WikimediaOAuthController` starts Wikimedia OAuth redirects, validates
  callback state, exchanges codes through `packages/auth-wikimedia`, and creates
  local sessions.
- `registerApiRoutes` maps Fastify-shaped request/reply objects to the API and
  Wikimedia OAuth controllers without taking a direct Fastify dependency yet.
- `InMemoryPlatformStore` is only a test/dev adapter; production persistence
  should use Postgres through the migration schema.
- `PostgresPlatformStore` maps the identity/session store contract to SQL
  through an injected executor, keeping driver choice out of domain logic.
- `PgSqlExecutor` adapts a `pg`-style pool/client to that executor contract.
- `PostgresWorldStore` maps spaces, rooms, maps, and map versions to the
  durable schema, including active map-version publication.
- `PostgresPermissionStore` maps roles, permissions, role grants, user
  assignments, and effective access resolution to the durable schema.

Current persistence foundation:

- `migrations/0001_identity_and_world_foundation.sql` defines users,
  OAuth identities, sessions, spaces, rooms, maps, map versions, memberships,
  roles, permissions, moderation events, and assets.

Next step:

- Install/wire Fastify runtime configuration and replace request body/session
  placeholders with production middleware.
