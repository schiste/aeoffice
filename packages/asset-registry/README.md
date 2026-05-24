# Asset Registry

The asset registry is the target app's semantic visual contract.

It lets gameplay, map compilation, Phaser rendering, and future AI map
generation refer to stable IDs such as `floor.wood_parquet` or
`item.large_conference_table` instead of raw tileset paths and numeric tile
indices.

## Current Policy

- SkyOffice assets are registered only as development references.
- Target app code must not bundle reference-only assets.
- Target assets must be added through `assets/ASSET_MANIFEST.md` before they
  are marked as bundled or approved.
- The current target-safe visual source is
  `internal.generated.office.placeholders`, a CC0 runtime-generated placeholder
  set that covers basic floors, walls, chairs, tables, plants, coffee fixtures,
  doors, and avatars.
- Semantic IDs should be append-only once maps depend on them.

## Why This Exists Early

The first Phaser renderer and the first AI map compiler should both target the
same semantic dictionary. That prevents the renderer, prompt schemas, and
backend collision model from drifting into separate asset vocabularies.
