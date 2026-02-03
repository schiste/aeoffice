# OSM → HexEditor import (MVP)

This project can generate a HexEditor-compatible map from OpenStreetMap data (roads, rivers, basic terrain, POIs) for a small area.

## What it does

- Downloads OSM data from Overpass for a small bounding box around a center coordinate.
- Projects lat/lon to **UTM (WGS84)** (accurate meters).
- Buckets features into a pointy-top hex grid using the same math as `HexMath`.
- Writes a `version: 4` HexEditor save JSON (`hexes` + `edges`) you can open in the Godot editor.

## Limitations (current MVP)

- Terrain polygons only use **closed ways** (relations/multipolygons are ignored).
- Terrain mapping is basic: `water`, `forest`, `swamp`, otherwise `plains`.
- Roads/rivers are approximated by sampling the line into hex steps and marking crossed edges.

## Run the import (test location)

This builds a ~10km radius import centered on `47.5798, 0.7031` using **4km hexes** (across flats).

```bash
python3 tools/osm_to_hexmap.py \
  --lat 47.5798 --lon 0.7031 \
  --radius-m 10000 \
  --hex-km 4 \
  --out godot/maps/osm_47.5798_0.7031_r10km_hex4km.json
```

Then in Godot: `File -> Open...` and select `res://maps/osm_47.5798_0.7031_r10km_hex4km.json`.

## Basemap overlay

The importer also writes a simple SVG basemap next to the JSON:

- `res://maps/osm_47.5798_0.7031_r10km_hex4km_basemap.svg`

If the editor detects `meta.basemap`, it renders it behind the hexes. Toggle it in Godot via `View -> Show Basemap`.
You can also adjust `Terrain opacity` and `Basemap opacity` in `Settings…` (Ctrl+,).
