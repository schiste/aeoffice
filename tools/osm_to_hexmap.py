#!/usr/bin/env python3
"""
OSM -> HexEditor map importer (small-area MVP).

Fetches OSM data from Overpass, projects to UTM (WGS84), buckets features into a pointy-top
hex grid, and writes a HexEditor-compatible JSON map (version 4).

This is intentionally conservative: it handles nodes + ways, closed ways for polygons,
and polyline sampling for roads/rivers. Relations (multipolygons) are currently ignored.
"""

from __future__ import annotations

import argparse
import dataclasses
import datetime as dt
import json
import math
import sys
import time
import urllib.parse
import urllib.request
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple


SQRT3 = 1.7320508075688772


@dataclasses.dataclass(frozen=True)
class UTMRef:
    zone: int
    hemisphere: str  # "N" or "S"


def utm_zone_for_lon(lon: float) -> int:
    return int(math.floor((lon + 180.0) / 6.0) + 1)


def latlon_to_utm(lat_deg: float, lon_deg: float, forced_zone: Optional[int] = None) -> Tuple[float, float, UTMRef]:
    """
    WGS84 lat/lon (degrees) -> UTM easting/northing (meters).
    Standard series expansion; accurate enough for our editor import.
    """
    # WGS84 ellipsoid
    a = 6378137.0
    f = 1.0 / 298.257223563
    e2 = f * (2.0 - f)
    ep2 = e2 / (1.0 - e2)
    k0 = 0.9996

    zone = forced_zone if forced_zone is not None else utm_zone_for_lon(lon_deg)
    hemisphere = "N" if lat_deg >= 0.0 else "S"

    lat = math.radians(lat_deg)
    lon = math.radians(lon_deg)
    lon0 = math.radians((zone - 1) * 6 - 180 + 3)  # central meridian

    sin_lat = math.sin(lat)
    cos_lat = math.cos(lat)
    tan_lat = math.tan(lat)

    N = a / math.sqrt(1.0 - e2 * sin_lat * sin_lat)
    T = tan_lat * tan_lat
    C = ep2 * cos_lat * cos_lat
    A = cos_lat * (lon - lon0)

    e4 = e2 * e2
    e6 = e4 * e2

    M = a * (
        (1.0 - e2 / 4.0 - 3.0 * e4 / 64.0 - 5.0 * e6 / 256.0) * lat
        - (3.0 * e2 / 8.0 + 3.0 * e4 / 32.0 + 45.0 * e6 / 1024.0) * math.sin(2.0 * lat)
        + (15.0 * e4 / 256.0 + 45.0 * e6 / 1024.0) * math.sin(4.0 * lat)
        - (35.0 * e6 / 3072.0) * math.sin(6.0 * lat)
    )

    easting = k0 * N * (
        A
        + (1.0 - T + C) * A**3 / 6.0
        + (5.0 - 18.0 * T + T * T + 72.0 * C - 58.0 * ep2) * A**5 / 120.0
    ) + 500_000.0

    northing = k0 * (
        M
        + N
        * tan_lat
        * (
            A**2 / 2.0
            + (5.0 - T + 9.0 * C + 4.0 * C * C) * A**4 / 24.0
            + (61.0 - 58.0 * T + T * T + 600.0 * C - 330.0 * ep2) * A**6 / 720.0
        )
    )

    if hemisphere == "S":
        northing += 10_000_000.0

    return easting, northing, UTMRef(zone=zone, hemisphere=hemisphere)


def utm_to_latlon(easting: float, northing: float, ref: UTMRef) -> Tuple[float, float]:
    """
    UTM (WGS84) easting/northing (meters) -> lat/lon degrees.
    Inverse of `latlon_to_utm`; accurate enough for small-area imports.
    """
    # WGS84 ellipsoid
    a = 6378137.0
    f = 1.0 / 298.257223563
    e2 = f * (2.0 - f)
    ep2 = e2 / (1.0 - e2)
    k0 = 0.9996

    x = float(easting) - 500_000.0
    y = float(northing)
    if ref.hemisphere.upper() == "S":
        y -= 10_000_000.0

    lon0 = math.radians((ref.zone - 1) * 6 - 180 + 3)  # central meridian

    e1 = (1.0 - math.sqrt(1.0 - e2)) / (1.0 + math.sqrt(1.0 - e2))
    e4 = e2 * e2
    e6 = e4 * e2

    m = y / k0
    mu = m / (a * (1.0 - e2 / 4.0 - 3.0 * e4 / 64.0 - 5.0 * e6 / 256.0))

    j1 = (3.0 * e1 / 2.0 - 27.0 * e1**3 / 32.0)
    j2 = (21.0 * e1**2 / 16.0 - 55.0 * e1**4 / 32.0)
    j3 = (151.0 * e1**3 / 96.0)
    j4 = (1097.0 * e1**4 / 512.0)

    fp = mu + j1 * math.sin(2.0 * mu) + j2 * math.sin(4.0 * mu) + j3 * math.sin(6.0 * mu) + j4 * math.sin(8.0 * mu)

    sin_fp = math.sin(fp)
    cos_fp = math.cos(fp)
    tan_fp = math.tan(fp)

    c1 = ep2 * cos_fp * cos_fp
    t1 = tan_fp * tan_fp
    n1 = a / math.sqrt(1.0 - e2 * sin_fp * sin_fp)
    r1 = a * (1.0 - e2) / ((1.0 - e2 * sin_fp * sin_fp) ** 1.5)
    d = x / (n1 * k0)

    lat = fp - (n1 * tan_fp / r1) * (
        d**2 / 2.0
        - (5.0 + 3.0 * t1 + 10.0 * c1 - 4.0 * c1**2 - 9.0 * ep2) * d**4 / 24.0
        + (61.0 + 90.0 * t1 + 298.0 * c1 + 45.0 * t1**2 - 252.0 * ep2 - 3.0 * c1**2) * d**6 / 720.0
    )

    lon = lon0 + (
        d
        - (1.0 + 2.0 * t1 + c1) * d**3 / 6.0
        + (5.0 - 2.0 * c1 + 28.0 * t1 - 3.0 * c1**2 + 8.0 * ep2 + 24.0 * t1**2) * d**5 / 120.0
    ) / cos_fp

    return (math.degrees(lat), math.degrees(lon))


def cube_to_pixel(q: int, r: int, size: float) -> Tuple[float, float]:
    x = size * (SQRT3 * q + (SQRT3 / 2.0) * r)
    y = size * (1.5 * r)
    return x, y


def _cube_round(frac_q: float, frac_r: float) -> Tuple[int, int]:
    s = -frac_q - frac_r
    rq = round(frac_q)
    rr = round(frac_r)
    rs = round(s)

    q_diff = abs(rq - frac_q)
    r_diff = abs(rr - frac_r)
    s_diff = abs(rs - s)

    if q_diff > r_diff and q_diff > s_diff:
        rq = -rr - rs
    elif r_diff > s_diff:
        rr = -rq - rs

    return int(rq), int(rr)


def pixel_to_cube(x: float, y: float, size: float) -> Tuple[int, int]:
    q = (SQRT3 / 3.0 * x - 1.0 / 3.0 * y) / size
    r = (2.0 / 3.0 * y) / size
    return _cube_round(q, r)


def hex_distance(a: Tuple[int, int], b: Tuple[int, int]) -> int:
    dq = a[0] - b[0]
    dr = a[1] - b[1]
    ds = -dq - dr
    return int((abs(dq) + abs(dr) + abs(ds)) // 2)


def cube_lerp(a: Tuple[int, int], b: Tuple[int, int], t: float) -> Tuple[float, float]:
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def cube_line(a: Tuple[int, int], b: Tuple[int, int]) -> List[Tuple[int, int]]:
    n = hex_distance(a, b)
    if n == 0:
        return [a]
    out: List[Tuple[int, int]] = []
    for i in range(n + 1):
        t = float(i) / float(n)
        fq, fr = cube_lerp(a, b, t)
        out.append(_cube_round(fq, fr))
    # De-dup consecutive
    dedup: List[Tuple[int, int]] = []
    for c in out:
        if not dedup or dedup[-1] != c:
            dedup.append(c)
    return dedup


def edge_key(a: Tuple[int, int], b: Tuple[int, int]) -> str:
    (q1, r1) = a
    (q2, r2) = b
    if (q2, r2) < (q1, r1):
        q1, r1, q2, r2 = q2, r2, q1, r1
    return f"{q1},{r1}:{q2},{r2}"


def approx_bbox_deg(lat: float, lon: float, radius_m: float) -> Tuple[float, float, float, float]:
    # Small-area approximation: degrees per meter
    lat_rad = math.radians(lat)
    meters_per_deg_lat = 111_320.0
    meters_per_deg_lon = 111_320.0 * math.cos(lat_rad)
    dlat = radius_m / meters_per_deg_lat
    dlon = radius_m / max(1e-9, meters_per_deg_lon)
    return (lat - dlat, lon - dlon, lat + dlat, lon + dlon)


def http_post(url: str, data: bytes, headers: Dict[str, str], timeout_s: float) -> bytes:
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        return resp.read()


def overpass_query(bbox: Tuple[float, float, float, float], timeout_s: int) -> Dict[str, Any]:
    (min_lat, min_lon, max_lat, max_lon) = bbox
    # Overpass QL: fetch key feature sets plus required nodes.
    ql = f"""
[out:json][timeout:{timeout_s}];
(
  way["highway"]({min_lat},{min_lon},{max_lat},{max_lon});
  way["waterway"~"river|stream|canal|drain"]({min_lat},{min_lon},{max_lat},{max_lon});
  way["natural"="water"]({min_lat},{min_lon},{max_lat},{max_lon});
  way["waterway"="riverbank"]({min_lat},{min_lon},{max_lat},{max_lon});
  way["landuse"="forest"]({min_lat},{min_lon},{max_lat},{max_lon});
  way["natural"="wood"]({min_lat},{min_lon},{max_lat},{max_lon});
  way["natural"="wetland"]({min_lat},{min_lon},{max_lat},{max_lon});
  node["place"~"city|town|village|hamlet"]["name"]({min_lat},{min_lon},{max_lat},{max_lon});
  node["amenity"]["name"]({min_lat},{min_lon},{max_lat},{max_lon});
  node["tourism"]["name"]({min_lat},{min_lon},{max_lat},{max_lon});
  node["historic"]["name"]({min_lat},{min_lon},{max_lat},{max_lon});
  node["natural"~"peak|spring"]["name"]({min_lat},{min_lon},{max_lat},{max_lon});
);
(._;>;);
out body;
""".strip()
    data = urllib.parse.urlencode({"data": ql}).encode("utf-8")

    endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://lz4.overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
    ]
    headers = {"Content-Type": "application/x-www-form-urlencoded", "User-Agent": "AD&D-HexEditor/0.1 (local import test)"}

    last_err: Optional[Exception] = None
    for attempt in range(1, 4):
        for url in endpoints:
            try:
                raw = http_post(url, data=data, headers=headers, timeout_s=float(timeout_s) + 15.0)
                return json.loads(raw.decode("utf-8"))
            except Exception as e:  # urllib mixes HTTPError/URLError; keep it simple for an MVP.
                last_err = e
                continue
        time.sleep(1.5 * attempt)

    raise RuntimeError(f"Overpass request failed after retries: {last_err}") from last_err


def point_in_poly(x: float, y: float, poly: Sequence[Tuple[float, float]]) -> bool:
    # Ray casting algorithm. Assumes poly is closed or not; will handle either.
    n = len(poly)
    if n < 3:
        return False
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]
        xj, yj = poly[j]
        intersect = ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi)
        if intersect:
            inside = not inside
        j = i
    return inside


def classify_polygon(tags: Dict[str, str]) -> Optional[str]:
    natural = tags.get("natural", "")
    landuse = tags.get("landuse", "")
    waterway = tags.get("waterway", "")

    if natural == "water" or waterway == "riverbank" or landuse == "reservoir":
        return "water"
    if natural == "wetland" or landuse == "wetland":
        return "swamp"
    if landuse == "forest" or natural == "wood":
        return "forest"
    return None


def tag_summary(tags: Dict[str, str]) -> str:
    # Short summary for POI description.
    for k in ["place", "amenity", "tourism", "historic", "natural", "shop", "railway"]:
        if k in tags:
            return f"{k}={tags[k]}"
    return ""


def _clamp(v: float, lo: float, hi: float) -> float:
    return lo if v < lo else hi if v > hi else v


def _svg_escape(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def _simplify_points_px(points: Sequence[Tuple[float, float]], min_dist_px: float) -> List[Tuple[float, float]]:
    if not points:
        return []
    out: List[Tuple[float, float]] = [points[0]]
    lastx, lasty = points[0]
    md2 = min_dist_px * min_dist_px
    for (x, y) in points[1:]:
        dx = x - lastx
        dy = y - lasty
        if dx * dx + dy * dy >= md2:
            out.append((x, y))
            lastx, lasty = x, y
    if out[-1] != points[-1]:
        out.append(points[-1])
    return out


def build_basemap_svg(
    *,
    nodes: Dict[int, Tuple[float, float, float, float]],
    ways: Sequence[Dict[str, Any]],
    radius_m: float,
    out_px: int = 1024,
) -> str:
    """
    Create a simple cartographic basemap SVG (UTM meters -> image pixels).
    Uses OSM tags to style water/forest/swamp polygons and roads/rivers lines.
    """
    w = out_px
    h = out_px
    px_per_m = float(out_px) / (2.0 * float(radius_m))

    def to_px(x_m: float, y_m: float) -> Tuple[float, float]:
        x = (w / 2.0) + x_m * px_per_m
        y = (h / 2.0) + y_m * px_per_m
        return (_clamp(x, -5000.0, 5000.0), _clamp(y, -5000.0, 5000.0))

    polys: List[Tuple[str, List[Tuple[float, float]]]] = []
    roads: List[List[Tuple[float, float]]] = []
    rivers: List[List[Tuple[float, float]]] = []

    for way in ways:
        tags: Dict[str, str] = way.get("tags", {}) or {}
        node_ids: List[int] = [int(nid) for nid in (way.get("nodes", []) or [])]
        if len(node_ids) < 2:
            continue

        coords_m: List[Tuple[float, float]] = []
        ok = True
        for nid in node_ids:
            if nid not in nodes:
                ok = False
                break
            _lat, _lon, x, y = nodes[nid]
            coords_m.append((float(x), float(y)))
        if not ok or len(coords_m) < 2:
            continue

        if tags.get("waterway", "") in {"river", "stream", "canal", "drain"}:
            rivers.append(coords_m)
            continue
        if "highway" in tags:
            roads.append(coords_m)
            continue

        t = classify_polygon(tags)
        if t is None:
            continue
        if len(coords_m) < 4:
            continue
        if coords_m[0] != coords_m[-1]:
            coords_m.append(coords_m[0])
        polys.append((t, coords_m))

    # Transform + simplify in pixel space
    poly_px: List[Tuple[str, List[Tuple[float, float]]]] = []
    for t, pts in polys:
        pts_px = [to_px(x, y) for (x, y) in pts]
        pts_px = _simplify_points_px(pts_px, min_dist_px=1.5)
        if len(pts_px) >= 4:
            poly_px.append((t, pts_px))

    road_px = [_simplify_points_px([to_px(x, y) for (x, y) in pts], min_dist_px=1.2) for pts in roads]
    river_px = [_simplify_points_px([to_px(x, y) for (x, y) in pts], min_dist_px=1.2) for pts in rivers]

    def fmt_points(pts: Sequence[Tuple[float, float]]) -> str:
        return " ".join(f"{x:.1f},{y:.1f}" for (x, y) in pts)

    # Basic styling
    bg = "#14161c"
    fill_forest = "#1f4f2a"
    fill_water = "#2f5f9f"
    fill_swamp = "#3f5a3a"
    stroke_road = "#b2a27b"
    stroke_river = "#4aa3ff"
    border_poly = "rgba(0,0,0,0.35)"

    layers: Dict[str, List[str]] = {"water": [], "swamp": [], "forest": []}
    for t, pts in poly_px:
        if t not in layers:
            continue
        layers[t].append(f'<polygon points="{fmt_points(pts)}" />')

    road_elems: List[str] = []
    for pts in road_px:
        if len(pts) < 2:
            continue
        road_elems.append(f'<polyline points="{fmt_points(pts)}" />')

    river_elems: List[str] = []
    for pts in river_px:
        if len(pts) < 2:
            continue
        river_elems.append(f'<polyline points="{fmt_points(pts)}" />')

    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">',
        f'<rect x="0" y="0" width="{w}" height="{h}" fill="{bg}" />',
        # Polygons
        f'<g id="water" fill="{fill_water}" stroke="{border_poly}" stroke-width="0.8" opacity="0.95">',
        *layers["water"],
        "</g>",
        f'<g id="swamp" fill="{fill_swamp}" stroke="{border_poly}" stroke-width="0.8" opacity="0.95">',
        *layers["swamp"],
        "</g>",
        f'<g id="forest" fill="{fill_forest}" stroke="{border_poly}" stroke-width="0.8" opacity="0.95">',
        *layers["forest"],
        "</g>",
        # Lines
        f'<g id="rivers" fill="none" stroke="{stroke_river}" stroke-width="2.0" stroke-linecap="round" stroke-linejoin="round" opacity="0.9">',
        *river_elems,
        "</g>",
        f'<g id="roads" fill="none" stroke="{stroke_road}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.85">',
        *road_elems,
        "</g>",
        "</svg>",
    ]
    return "\n".join(svg) + "\n"


def build_hex_map(
    osm: Dict[str, Any],
    center_lat: float,
    center_lon: float,
    radius_m: float,
    hex_km: float,
) -> Dict[str, Any]:
    forced_zone = utm_zone_for_lon(center_lon)
    origin_e, origin_n, utm_ref = latlon_to_utm(center_lat, center_lon, forced_zone=forced_zone)

    # Define hex geometry:
    # We treat "hex_km" as the distance across flats (and also neighbor center-to-center distance).
    neighbor_m = hex_km * 1000.0
    hex_size_m = neighbor_m / SQRT3

    # Build node table
    nodes: Dict[int, Tuple[float, float, float, float]] = {}  # id -> (lat, lon, x, y)
    ways: List[Dict[str, Any]] = []

    for el in osm.get("elements", []):
        if el.get("type") == "node":
            nid = int(el["id"])
            lat = float(el["lat"])
            lon = float(el["lon"])
            e, n, _ = latlon_to_utm(lat, lon, forced_zone=utm_ref.zone)
            x = e - origin_e
            y = -(n - origin_n)  # north is up
            nodes[nid] = (lat, lon, x, y)
        elif el.get("type") == "way":
            ways.append(el)

    # Define hex coverage area based on UTM square +/- radius.
    # Convert corners to cube to get a bounding cube rect, then filter to a circle.
    corners_xy = [
        (-radius_m, -radius_m),
        (radius_m, -radius_m),
        (-radius_m, radius_m),
        (radius_m, radius_m),
    ]
    corner_cubes = [pixel_to_cube(cx, cy, hex_size_m) for (cx, cy) in corners_xy]
    min_q = min(q for (q, _r) in corner_cubes) - 3
    max_q = max(q for (q, _r) in corner_cubes) + 3
    min_r = min(r for (_q, r) in corner_cubes) - 3
    max_r = max(r for (_q, r) in corner_cubes) + 3

    hexes: Dict[Tuple[int, int], Dict[str, Any]] = {}
    circle_limit = radius_m + neighbor_m * 0.75
	    for q in range(min_q, max_q + 1):
	        for r in range(min_r, max_r + 1):
	            cx, cy = cube_to_pixel(q, r, hex_size_m)
	            if math.hypot(cx, cy) > circle_limit:
	                continue
	            lat_c, lon_c = utm_to_latlon(origin_e + cx, origin_n - cy, utm_ref)
	            hexes[(q, r)] = {
	                "terrain": "plains",
	                "features": [],
	                "elevation": 0,
	                "name": "",
	                "description": "",
	                "region_id": 0,
	                "datalayer": {
	                    "center": {"x_m": float(cx), "y_m": float(cy), "lat": float(lat_c), "lon": float(lon_c)},
	                    "osm": {"landcover": [], "lines": [], "pois": []},
	                },
	                "_line_refs": {},  # internal key -> dict, converted on emit
	            }

    # Polygons for terrain
	    terrain_polys: List[Tuple[str, List[Tuple[float, float]], Tuple[float, float, float, float], int, Dict[str, str]]] = []
	    for w in ways:
	        wid = int(w.get("id", 0))
	        tags: Dict[str, str] = w.get("tags", {}) or {}
	        t = classify_polygon(tags)
	        if not t:
	            continue
        node_ids: List[int] = [int(nid) for nid in (w.get("nodes", []) or [])]
        if len(node_ids) < 4:
            continue
        if node_ids[0] != node_ids[-1]:
            # Close it (common for some exports); keep it simple.
            node_ids.append(node_ids[0])
        pts: List[Tuple[float, float]] = []
        for nid in node_ids:
            if nid not in nodes:
                pts = []
                break
            _lat, _lon, x, y = nodes[nid]
            pts.append((x, y))
        if len(pts) < 4:
            continue
	        xs = [p[0] for p in pts]
	        ys = [p[1] for p in pts]
	        bbox = (min(xs), min(ys), max(xs), max(ys))
	        terrain_polys.append((t, pts, bbox, wid, tags))

    # Apply polygon terrain to hex centers (priority order)
    priority = {"water": 3, "swamp": 2, "forest": 1}
    for (q, r), h in hexes.items():
        cx, cy = cube_to_pixel(q, r, hex_size_m)
        best = h["terrain"]
        best_p = 0
	        for t, poly, bb, wid, tags in terrain_polys:
	            if priority.get(t, 0) <= best_p:
	                continue
            (minx, miny, maxx, maxy) = bb
            if cx < minx or cx > maxx or cy < miny or cy > maxy:
                continue
	            if point_in_poly(cx, cy, poly):
	                h["datalayer"]["osm"]["landcover"].append(
	                    {"kind": t, "way_id": wid, "tags": {k: tags[k] for k in tags.keys() if k in ("natural", "landuse", "waterway", "name")}}
	                )
	                best = t
	                best_p = priority[t]
        h["terrain"] = best

    # Roads/rivers -> edges via cube_line sampling
    edges: Dict[str, str] = {}  # edge_key -> type

    def add_edge(a: Tuple[int, int], b: Tuple[int, int], etype: str) -> None:
        if a == b:
            return
        if a not in hexes or b not in hexes:
            return
        k = edge_key(a, b)
        prev = edges.get(k)
        if prev == "river":
            return
        if prev == "road" and etype == "river":
            edges[k] = "river"
            return
        edges.setdefault(k, etype)

	    for w in ways:
	        tags: Dict[str, str] = w.get("tags", {}) or {}
	        etype: Optional[str] = None
	        if "highway" in tags:
	            etype = "road"
	        if tags.get("waterway", "") in {"river", "stream", "canal", "drain"}:
	            etype = "river"
	        if etype is None:
	            continue
	        wid = int(w.get("id", 0))
	        wname = str(tags.get("name", "")).strip()
	        wref = str(tags.get("ref", "")).strip()
	        wclass = str(tags.get("highway", "") if etype == "road" else tags.get("waterway", "")).strip()

	        node_ids: List[int] = [int(nid) for nid in (w.get("nodes", []) or [])]
	        pts_cube: List[Tuple[int, int]] = []
        for nid in node_ids:
            if nid not in nodes:
                pts_cube = []
                break
            _lat, _lon, x, y = nodes[nid]
            pts_cube.append(pixel_to_cube(x, y, hex_size_m))
        if len(pts_cube) < 2:
            continue

	        for i in range(len(pts_cube) - 1):
	            path = cube_line(pts_cube[i], pts_cube[i + 1])
	            for j in range(len(path) - 1):
	                add_edge(path[j], path[j + 1], etype)
	            for (hq, hr) in path:
	                if (hq, hr) not in hexes:
	                    continue
	                k = f"{etype}:{wid}"
	                hexes[(hq, hr)]["_line_refs"][k] = {
	                    "kind": etype,
	                    "way_id": wid,
	                    "class": wclass,
	                    "name": wname,
	                    "ref": wref,
	                }

    # POIs
    place_kinds = {"city", "town", "village", "hamlet"}
    promoted_places: List[Tuple[int, int]] = []
    promote_min_hex_distance = 2
    for el in osm.get("elements", []):
        if el.get("type") != "node":
            continue
        tags: Dict[str, str] = el.get("tags", {}) or {}
        if not tags:
            continue
        name = str(tags.get("name", "")).strip()
        place = str(tags.get("place", "")).strip()
        is_place = place in place_kinds
        # Keep POIs only if they have a name (or are a named place).
        if name == "" and not is_place:
            continue
        if not any(k in tags for k in ("place", "amenity", "tourism", "historic", "natural", "name")):
            continue
        nid = int(el["id"])
        if nid not in nodes:
            continue
        lat, lon, x, y = nodes[nid]
        q, r = pixel_to_cube(x, y, hex_size_m)
        if (q, r) not in hexes:
            continue

        summary = tag_summary(tags)
        poi = {
            "kind": "poi",
            "name": name if name else (summary if summary else place),
            "lat": lat,
            "lon": lon,
            "tags": {k: tags[k] for k in tags.keys() if k in ("place", "amenity", "tourism", "historic", "natural")},
        }

	        h = hexes[(q, r)]
	        h["features"].append(poi)
	        h["datalayer"]["osm"]["pois"].append(
	            {"name": poi["name"], "lat": float(lat), "lon": float(lon), "tags": poi.get("tags", {})}
	        )
        # Promote *some* place nodes into the primary hex name (controls POI marker rendering),
        # but keep it sparse so the map doesn't become unreadable at low zoom.
        if is_place and name != "" and h.get("name", "") == "":
            too_close = False
            for pc in promoted_places:
                if hex_distance((q, r), pc) < promote_min_hex_distance:
                    too_close = True
                    break
            if not too_close:
                h["name"] = name
                if summary:
                    h["description"] = summary
                promoted_places.append((q, r))
        elif summary and summary not in str(h.get("description", "")):
            # Keep it short; append one-liners.
            desc = str(h.get("description", ""))
            h["description"] = (desc + " | " + summary).strip(" |") if desc else summary

    # Emit HexEditor save format v4
    now = dt.datetime.now(dt.timezone.utc)
    meta: Dict[str, Any] = {
        "kind": "save",
        "unix": int(time.time()),
        "iso": now.isoformat(),
        "source": "overpass",
        "center": {"lat": center_lat, "lon": center_lon},
        "radius_m": int(radius_m),
        "hex": {"across_flats_m": int(neighbor_m), "size_m": hex_size_m},
        "utm": {"zone": utm_ref.zone, "hemisphere": utm_ref.hemisphere},
        "notes": "Terrain from closed ways only; relations (multipolygons) ignored in this MVP.",
    }

	    hex_list: List[Dict[str, Any]] = []
	    for (q, r) in sorted(hexes.keys(), key=lambda t: (t[1], t[0])):  # r then q matches editor sort
	        h = hexes[(q, r)]
	        if isinstance(h.get("_line_refs"), dict):
	            h["datalayer"]["osm"]["lines"] = list(h["_line_refs"].values())
	        item: Dict[str, Any] = {
	            "q": q,
	            "r": r,
	            "terrain": h.get("terrain", "plains"),
	            "features": h.get("features", []),
	            "elevation": int(h.get("elevation", 0)),
	            "datalayer": h.get("datalayer", {}),
	        }
        if h.get("name", ""):
            item["name"] = h["name"]
        if h.get("description", ""):
            item["description"] = h["description"]
        hex_list.append(item)

    edge_list: List[Dict[str, Any]] = [{"key": k, "type": edges[k]} for k in sorted(edges.keys())]

    return {
        "version": 4,
        "meta": meta,
        "regions": [],
        "hexes": hex_list,
        "edges": edge_list,
        "terrain_limits": {},
    }


def main(argv: Sequence[str]) -> int:
    ap = argparse.ArgumentParser(description="Import a small OSM area into the Godot HexEditor map format.")
    ap.add_argument("--lat", type=float, required=True, help="Center latitude")
    ap.add_argument("--lon", type=float, required=True, help="Center longitude")
    ap.add_argument("--radius-m", type=float, default=10_000.0, help="Radius in meters (default: 10000)")
    ap.add_argument("--hex-km", type=float, default=4.0, help="Hex size across flats (km), default 4")
    ap.add_argument("--out", required=True, help="Output JSON path (HexEditor save format v4)")
    ap.add_argument("--basemap-svg", default="", help="Optional output basemap SVG path (if empty: derived from --out)")
    ap.add_argument("--basemap-px", type=int, default=1024, help="Basemap SVG size in pixels (default: 1024)")
    ap.add_argument("--timeout-s", type=int, default=30, help="Overpass timeout seconds")
    args = ap.parse_args(argv)

    bbox = approx_bbox_deg(args.lat, args.lon, args.radius_m)
    osm = overpass_query(bbox, timeout_s=args.timeout_s)
    out_map = build_hex_map(osm, args.lat, args.lon, args.radius_m, args.hex_km)

    basemap_path = str(args.basemap_svg).strip()
    if basemap_path == "":
        if args.out.endswith(".json"):
            basemap_path = args.out[:-5] + "_basemap.svg"
        else:
            basemap_path = args.out + "_basemap.svg"

    # Rebuild the minimal node/way tables needed for SVG rendering (UTM meters relative to center).
    forced_zone = utm_zone_for_lon(args.lon)
    origin_e, origin_n, utm_ref = latlon_to_utm(args.lat, args.lon, forced_zone=forced_zone)
    nodes: Dict[int, Tuple[float, float, float, float]] = {}
    ways: List[Dict[str, Any]] = []
    for el in osm.get("elements", []):
        if el.get("type") == "node":
            nid = int(el["id"])
            lat = float(el["lat"])
            lon = float(el["lon"])
            e, n, _ = latlon_to_utm(lat, lon, forced_zone=utm_ref.zone)
            x = e - origin_e
            y = -(n - origin_n)
            nodes[nid] = (lat, lon, x, y)
        elif el.get("type") == "way":
            ways.append(el)

    svg = build_basemap_svg(nodes=nodes, ways=ways, radius_m=float(args.radius_m), out_px=int(args.basemap_px))
    with open(basemap_path, "w", encoding="utf-8") as fsvg:
        fsvg.write(svg)

    # Store basemap reference in meta (res:// if inside godot/).
    meta: Dict[str, Any] = out_map.get("meta", {}) if isinstance(out_map.get("meta", {}), dict) else {}
    res_path = ""
    norm = basemap_path.replace("\\", "/")
    if "/godot/" in ("/" + norm):
        idx = norm.rfind("/godot/")
        rel = norm[idx + len("/godot/") :]
        res_path = "res://" + rel
    elif norm.startswith("godot/"):
        res_path = "res://" + norm[len("godot/") :]

    meta["basemap"] = {
        "path": res_path if res_path else basemap_path,
        "radius_m": int(args.radius_m),
        "px": int(args.basemap_px),
        "kind": "svg",
        "style": "osm_simple",
    }
    out_map["meta"] = meta

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out_map, f, indent=2, ensure_ascii=False)
        f.write("\n")

    hex_count = len(out_map.get("hexes", []))
    edge_count = len(out_map.get("edges", []))
    print(f"Wrote {hex_count} hexes, {edge_count} edges -> {args.out}")
    print(f"Wrote basemap -> {basemap_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
