# packages/policy

Shared server-side policy package.

Responsibilities:

- Evaluate room chat delivery.
- Evaluate proximity chat delivery.
- Evaluate private zone chat delivery.
- Evaluate moderator announcements.
- Evaluate room, proximity, zone, and presentation media joins.
- Centralize permission keys used by world-server and future API/media layers.

Current implementation:

- `evaluateChatDelivery` returns either a recipient list or a rejection reason.
- Proximity chat uses server-known positions and a configured radius.
- Zone chat requires the sender and recipients to be in the requested zone.
- The client never supplies recipient lists.
- `evaluateMediaJoin` returns allowed media room names, publish/subscribe
  grants, and participant scopes.

Next step:

- Add room entry and zone entry policy helpers.
