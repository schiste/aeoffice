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
  handlers for future Fastify routes.
- `InMemoryPlatformStore` is only a test/dev adapter; production persistence
  should use Postgres through the migration schema.

Current persistence foundation:

- `migrations/0001_identity_and_world_foundation.sql` defines users,
  OAuth identities, sessions, spaces, rooms, maps, map versions, memberships,
  roles, permissions, moderation events, and assets.

Next step:

- Add Fastify routes and a Postgres-backed `PlatformStore` implementation.
