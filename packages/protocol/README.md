# packages/protocol

Target shared protocol package.

Responsibilities:

- Movement intent schemas.
- Server state schemas.
- Chat event schemas.
- Media event schemas.
- Versioned protocol definitions.

The first required protocol replacement is movement:

```json
{ "type": "move", "vector": { "x": 1, "y": -1 }, "direction": "right", "seq": 42 }
```

Current implementation:

- `MoveIntentMessage` validates the client movement intent. New clients send a
  normalized-intent movement vector; `direction` is only a cardinal facing hint
  for animation and legacy clients.
- `PlayerStateMessage` broadcasts server-authoritative position.
- `MovementRejectedMessage` rejects invalid movement without accepting client
  coordinates.
- Runtime guards reject the old client-controlled `{ "x": 705, "y": 500 }`
  style payload.
- `ChatSendMessage` represents room, proximity, zone, and moderator
  announcement chat requests.
- Chat delivery responses include server-computed recipients or explicit
  rejection reasons.
