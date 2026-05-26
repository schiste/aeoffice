# Avatar Atlas Import Path

The avatar renderer now treats sprite art as a manifest-backed contract. Real
PNG/JSON atlases can be added later without changing `AvatarRenderer` or the
animation state machine.

## Runtime Contract

- Stable semantic frame key:
  `internal-avatar-atlas-v1/frames/{avatarId}/{action}/{direction}/{frameIndex}`
- Real manifest path:
  `/assets/avatar-atlases/internal-avatar-atlas-v1/manifest.json`
- Real image path:
  `/assets/avatar-atlases/internal-avatar-atlas-v1/atlas.png`
- Server direction model: `4_way`
- Visual direction model: `8_way`
- Frame key strategy: `avatar_action_server_direction_frame`

The renderer exposes both identifiers:

- `frameKey`: semantic animation frame key from the atlas contract.
- `textureKey` / `textureFrame`: concrete Phaser render target.

Current generated avatars use `runtime_generated_fallback` and create one
fallback texture per semantic frame plus visual facing:

```text
{semanticFrameKey}::generated::{visualFacing}
```

That keeps diagonal preview frames visually distinct while preserving the same
semantic frame keys a real atlas will use.

## Manifest Shape

```json
{
  "schemaVersion": 1,
  "atlasId": "internal-avatar-atlas-v1",
  "textureKey": "internal-avatar-atlas-v1-real",
  "imagePath": "/assets/avatar-atlases/internal-avatar-atlas-v1/atlas.png",
  "frameWidth": 32,
  "frameHeight": 42,
  "exportScale": 2,
  "anchor": { "x": 0.5, "y": 0.86 },
  "frameKeyStrategy": "avatar_action_server_direction_frame",
  "serverDirectionModel": "4_way",
  "visualDirectionModel": "8_way",
  "license": {
    "spdx": "CC-BY-SA-4.0",
    "source": "https://example.invalid/source"
  },
  "frames": [
    {
      "semanticFrameKey": "internal-avatar-atlas-v1/frames/ember/idle/down/00",
      "atlasFrameKey": "ember_idle_down_00",
      "avatarId": "ember",
      "action": "idle",
      "direction": "down",
      "frameIndex": 0,
      "rect": { "x": 0, "y": 0, "width": 64, "height": 84 }
    }
  ]
}
```

The validator requires every expected semantic frame to exist before the real
atlas can become active. Until then, generated fallback frames remain active.
