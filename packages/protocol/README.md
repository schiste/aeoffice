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
{ "type": "move", "direction": "down", "seq": 42 }
```

