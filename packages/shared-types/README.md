# packages/shared-types

Target shared domain types.

Use this package only for stable cross-app types. Avoid placing runtime logic
here.

Current implementation:

- Branded IDs for users, sessions, spaces, rooms, maps, zones, players,
  permissions, and roles.
- `WorldTokenClaims`, shared by API token issuance and world-server admission.
- `isWorldTokenClaims`, a small runtime guard used by local token verification.
