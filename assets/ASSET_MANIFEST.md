# Asset Manifest

The target app must only bundle assets that are compatible with the intended
open-source distribution.

Inherited SkyOffice assets under `legacy/skyoffice-original/` are
development-only reference assets and are not approved for redistribution in
the target app.

## Required Fields

Every target-app asset must be recorded with:

| Field | Required | Notes |
|---|---:|---|
| Asset ID | yes | Stable identifier used by code/config. |
| File path | yes | Repository path. |
| Source URL | yes | Original source or project-owned marker. |
| Author | yes | Individual, project, or organization. |
| License | yes | SPDX identifier where possible. |
| Attribution text | if required | Exact text required by the license. |
| Redistribution allowed | yes | Must be `yes` for bundled assets. |
| Commercial use allowed | yes | Must match product needs. |
| Modified | yes | Record whether derivative work was created. |
| Notes | optional | Any extra restrictions or context. |

## Approved Target Assets

The first target asset source is generated polished office art. It is not copied
from SkyOffice, LimeZu, or another third-party sprite pack; the browser renderer
draws the tileset and avatar shapes at runtime from semantic token metadata.

| Asset ID | File path | Source URL | Author | License | Attribution | Redistribution | Commercial | Modified | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `internal.generated.office.polished_v1` | `apps/web/src/browser/phaser-office-renderer.ts` | `internal://aedventure/generated-office-polished/v1` | Aedventure project | CC0-1.0 | None | yes | yes | no | Runtime-generated polished floors, wood/glass/neutral walls, tables, chairs, plants, coffee fixtures, doors, couches, and four directional avatar styles. |

## Development Reference Registry

`packages/asset-registry` may reference legacy SkyOffice assets as
`legacy_reference` metadata so renderer and map-compiler work can start against
stable semantic IDs.

These references do not approve the files for target-app redistribution and do
not allow copying them from `legacy/skyoffice-original/` into `apps/`,
`packages/`, or deployable web assets.
