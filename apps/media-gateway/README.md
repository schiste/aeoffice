# apps/media-gateway

Target media gateway.

Responsibilities:

- Issue LiveKit tokens.
- Enforce server-side media policy.
- Integrate coturn configuration.
- Support proximity-driven media subscriptions.

PeerJS is not part of the target architecture.

Current implementation:

- `MediaGatewayService` evaluates media join requests through
  `packages/policy`.
- `MediaGatewayController` resolves the requester and participant set
  server-side before issuing any token.
- `registerMediaGatewayRoutes` exposes the framework-neutral `/media-token`
  route contract used by the browser app adapter.
- It issues short-lived media token claims for room, proximity, and zone media.
- It records publish/subscribe grants in the token claim.
- `UnsignedLocalMediaTokenSigner` is a development-only signer used by tests.

Current non-goals:

- No production LiveKit JWT signing yet.
- No concrete Fastify runtime process yet.
- No PeerJS compatibility layer.

Next step:

- Replace the local signer with a real LiveKit JWT signer once runtime
  dependencies and secret handling are added.
