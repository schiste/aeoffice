# packages/auth-wikimedia

Target Wikimedia OAuth integration package.

Responsibilities:

- OAuth 2.0 authorization-code flow helpers.
- PKCE support where applicable.
- Profile lookup and normalization.
- Wikimedia group to local role mapping.
- Blocked user handling.

Secrets must never be exposed in frontend code.

Current implementation:

- `normalizeWikimediaProfile` converts the OAuth profile into the local
  identity shape used by `apps/api`.
- `mapWikimediaGroupsToRoles` supports explicit group-to-role mappings.
- The package does not assign privileged tenant roles by default; mappings
  must be provided by the API/control-plane layer.

Next step:

- Add OAuth authorization URL, callback validation, token exchange, and profile
  fetch helpers once runtime HTTP dependencies are installed.
