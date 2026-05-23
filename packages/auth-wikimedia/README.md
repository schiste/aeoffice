# packages/auth-wikimedia

Target Wikimedia OAuth integration package.

Responsibilities:

- OAuth 2.0 authorization-code flow helpers.
- PKCE support where applicable.
- Profile lookup and normalization.
- Wikimedia group to local role mapping.
- Blocked user handling.

Secrets must never be exposed in frontend code.

Reference docs:

- https://www.mediawiki.org/wiki/Wikimedia_APIs/Authentication
- https://www.mediawiki.org/wiki/OAuth/For_Developers

Current implementation:

- `WikimediaOAuthClient` builds authorization-code URLs, validates callback
  state, exchanges authorization codes for tokens through an injected HTTP
  client, and fetches `oauth2/resource/profile`.
- `normalizeWikimediaProfile` converts the OAuth profile into the local
  identity shape used by `apps/api`.
- `mapWikimediaGroupsToRoles` supports explicit group-to-role mappings.
- The package does not assign privileged tenant roles by default; mappings
  must be provided by the API/control-plane layer.

Next step:

- Wire the helper into API routes with server-side state/session storage.
