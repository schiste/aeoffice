# packages/auth-wikimedia

Target Wikimedia OAuth integration package.

Responsibilities:

- OAuth 2.0 authorization-code flow helpers.
- PKCE support where applicable.
- Profile lookup and normalization.
- Wikimedia group to local role mapping.
- Blocked user handling.

Secrets must never be exposed in frontend code.

