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

The first target asset source is a generated polished office atlas derived from
copyleft LPC/OpenGameArt sheets plus project-owned overlays. It is not copied
from SkyOffice or LimeZu.

| Asset ID | File path | Source URL | Author | License | Attribution | Redistribution | Commercial | Modified | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `internal.generated.office.polished_v1` | `apps/web/public/assets/internal-office-atlas.manifest.json` | `internal://aedventure/copyleft-lpc-office-polished/v1` | LPC/OpenGameArt contributors and Aedventure project | LicenseRef-LPC-Copyleft-Mixed | See generated manifest `externalImageInputs` and the source credit files below. | yes | yes | yes | Deterministic atlas generated from LPC floors, walls, wooden furniture, and upholstery. Semantic token IDs remain stable. |

### Copyleft Source Inputs

| Source | Repository files | Original URL | License choice | Attribution |
|---|---|---|---|---|
| `[LPC] Floors` | `assets/copyleft/lpc/source/lpc-floors.zip`, `assets/copyleft/lpc/extracted/floors/floors.png`, `assets/copyleft/lpc/extracted/floors/CREDITS-floors.txt` | <https://opengameart.org/content/lpc-floors> | CC-BY-SA-4.0 | `"[LPC] Floors" by bluecarrot16 and contributors. CC-BY-SA 4.0.` See the checked-in credits file. |
| `[LPC] Walls` | `assets/copyleft/lpc/source/lpc-walls.zip`, `assets/copyleft/lpc/extracted/walls/walls.png`, `assets/copyleft/lpc/extracted/walls/CREDITS-walls.txt` | <https://opengameart.org/content/lpc-walls> | CC-BY-SA-3.0 | `"[LPC] Walls" by bluecarrot16 and contributors. CC-BY-SA 3.0.` See the checked-in credits file. |
| `[LPC] Wooden Furniture` | `assets/copyleft/lpc/source/dark-wood.png`, `assets/copyleft/lpc/source/credits-furniture.txt_.zip`, `assets/copyleft/lpc/extracted/furniture/CREDITS-furniture.txt` | <https://opengameart.org/content/lpc-wooden-furniture> | CC-BY-SA-4.0 | `"LPC Wooden Furniture" by bluecarrot16, Baŝto, Lanea Zimmerman (Sharm), William Thompson, Tuomo Untinen (Reemax), Janna/Lilius/Jannax.` See the checked-in credits file. |
| `[LPC] Upholstery` | `assets/copyleft/lpc/source/upholstery.png` | <https://opengameart.org/content/lpc-upholstery> | CC-BY-SA-4.0 | `"[LPC] Upholstery" by bluecarrot16, Lanea Zimmerman (Sharm).` Link back to the upholstery and LPC Interior Castle Tiles pages. |

The previously considered `[LPC Revised] The Office` download is deliberately
not included: its page lists CC-BY-SA, but the bundled credits file identifies
the actual files as OGA-BY, which does not meet the "only copyleft assets"
constraint for this pass.

## Development Reference Registry

`packages/asset-registry` may reference legacy SkyOffice assets as
`legacy_reference` metadata so renderer and map-compiler work can start against
stable semantic IDs.

These references do not approve the files for target-app redistribution and do
not allow copying them from `legacy/skyoffice-original/` into `apps/`,
`packages/`, or deployable web assets.
