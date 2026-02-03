#!/usr/bin/env python3
"""
OSM to Hex Grid Converter
Fetches OpenStreetMap data and converts it to hex tiles for the AD&D Hex Map Editor.
Also downloads map tiles to create a basemap image.

Usage:
    python osm_to_hex.py --lat 47.5798 --lon 0.7031 --radius 10 --output ../maps/tours_region.json
"""

import argparse
import json
import math
import os
import sqlite3
import requests
from collections import defaultdict
from typing import Dict, List, Tuple, Any
from io import BytesIO

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    print("Warning: PIL not installed. Basemap images will not be generated.")
    print("Install with: pip install Pillow")

# Overpass API endpoints (fallbacks)
OVERPASS_URLS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
]

# OSM tile server (use OpenStreetMap standard tiles)
TILE_SERVER = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
TILE_SIZE = 256

# Hex size in km (center to corner distance)
HEX_SIZE_KM = 4.0

# Earth radius in km
EARTH_RADIUS_KM = 6371.0


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in km."""
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return EARTH_RADIUS_KM * c


def latlon_to_km(lat: float, lon: float, center_lat: float, center_lon: float) -> Tuple[float, float]:
    """Convert lat/lon to km offset from center."""
    # X (east-west) distance
    x_km = haversine_distance(center_lat, center_lon, center_lat, lon)
    if lon < center_lon:
        x_km = -x_km

    # Y (north-south) distance
    y_km = haversine_distance(center_lat, center_lon, lat, center_lon)
    if lat < center_lat:
        y_km = -y_km

    return x_km, y_km


def km_to_hex_axial(x_km: float, y_km: float, hex_size_km: float) -> Tuple[int, int]:
    """Convert km coordinates to axial hex coordinates (q, r)."""
    # Pointy-top hex grid
    # hex_size is center to corner, so width = sqrt(3) * size, height = 2 * size
    hex_width = math.sqrt(3) * hex_size_km
    hex_height = 2 * hex_size_km

    # Convert to axial coordinates
    q = (math.sqrt(3) / 3 * x_km - 1 / 3 * y_km) / hex_size_km
    r = (2 / 3 * y_km) / hex_size_km

    # Round to nearest hex
    return axial_round(q, r)


def axial_round(q: float, r: float) -> Tuple[int, int]:
    """Round fractional axial coordinates to nearest hex."""
    s = -q - r

    rq = round(q)
    rr = round(r)
    rs = round(s)

    q_diff = abs(rq - q)
    r_diff = abs(rr - r)
    s_diff = abs(rs - s)

    if q_diff > r_diff and q_diff > s_diff:
        rq = -rr - rs
    elif r_diff > s_diff:
        rr = -rq - rs

    return int(rq), int(rr)


def fetch_osm_data(center_lat: float, center_lon: float, radius_km: float) -> Dict:
    """Fetch OSM data from Overpass API."""
    print(f"Fetching OSM data for {radius_km}km radius around ({center_lat}, {center_lon})...")

    # Comprehensive query for all useful OSM data
    query = f"""
    [out:json][timeout:180];
    (
      // Land use areas
      way["landuse"](around:{radius_km * 1000},{center_lat},{center_lon});

      // Natural features
      way["natural"](around:{radius_km * 1000},{center_lat},{center_lon});

      // Water features
      way["waterway"](around:{radius_km * 1000},{center_lat},{center_lon});
      way["water"](around:{radius_km * 1000},{center_lat},{center_lon});

      // Major roads only
      way["highway"~"motorway|trunk|primary|secondary"](around:{radius_km * 1000},{center_lat},{center_lon});

      // Railways
      way["railway"~"rail|light_rail|narrow_gauge"](around:{radius_km * 1000},{center_lat},{center_lon});

      // Places (towns, villages)
      node["place"~"city|town|village|hamlet|locality|isolated_dwelling"](around:{radius_km * 1000},{center_lat},{center_lon});

      // Named natural features (forests, hills, peaks, etc.)
      node["natural"~"peak|hill|cliff|spring|cave_entrance"](around:{radius_km * 1000},{center_lat},{center_lon});
      way["natural"]["name"](around:{radius_km * 1000},{center_lat},{center_lon});

      // Named leisure areas (parks, nature reserves)
      way["leisure"~"park|nature_reserve|garden"](around:{radius_km * 1000},{center_lat},{center_lon});
      node["leisure"~"park|nature_reserve"](around:{radius_km * 1000},{center_lat},{center_lon});

      // Historic features
      node["historic"](around:{radius_km * 1000},{center_lat},{center_lon});
      way["historic"](around:{radius_km * 1000},{center_lat},{center_lon});

      // Tourism features (viewpoints, attractions)
      node["tourism"~"viewpoint|attraction|castle|ruins|monument"](around:{radius_km * 1000},{center_lat},{center_lon});
      way["tourism"~"attraction|castle|ruins"](around:{radius_km * 1000},{center_lat},{center_lon});

      // Amenities (places of worship, schools, hospitals)
      node["amenity"~"place_of_worship|hospital|school|university|monastery"](around:{radius_km * 1000},{center_lat},{center_lon});
      way["amenity"~"place_of_worship|hospital|school|university|monastery"](around:{radius_km * 1000},{center_lat},{center_lon});

      // Boundary relations for named areas (protected areas, forests)
      relation["boundary"~"protected_area|national_park|nature_reserve"](around:{radius_km * 1000},{center_lat},{center_lon});
      relation["landuse"="forest"]["name"](around:{radius_km * 1000},{center_lat},{center_lon});
    );
    out body;
    >;
    out skel qt;
    """

    last_error = None
    for url in OVERPASS_URLS:
        try:
            print(f"  Trying: {url}")
            response = requests.post(url, data={"data": query}, timeout=180)
            response.raise_for_status()
            data = response.json()
            print(f"  Received {len(data.get('elements', []))} elements")
            return data
        except Exception as e:
            print(f"  Failed: {e}")
            last_error = e
            continue

    raise last_error


def latlon_to_tile(lat: float, lon: float, zoom: int) -> Tuple[int, int]:
    """Convert lat/lon to tile coordinates at given zoom level."""
    lat_rad = math.radians(lat)
    n = 2 ** zoom
    x = int((lon + 180) / 360 * n)
    y = int((1 - math.asinh(math.tan(lat_rad)) / math.pi) / 2 * n)
    return x, y


def tile_to_latlon(x: int, y: int, zoom: int) -> Tuple[float, float]:
    """Convert tile coordinates to lat/lon (top-left corner of tile)."""
    n = 2 ** zoom
    lon = x / n * 360 - 180
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * y / n)))
    lat = math.degrees(lat_rad)
    return lat, lon


def download_basemap(center_lat: float, center_lon: float, radius_km: float, output_path: str, zoom_override: int = 0) -> Dict[str, Any]:
    """Download OSM tiles and save them separately for on-demand loading.

    Returns a dict with tile metadata for the JSON file.
    """
    if not HAS_PIL:
        return {}

    print("Downloading basemap tiles...")

    # Choose zoom level based on radius (more tiles = more detail but slower)
    # Higher zoom = more detail but more tiles to download
    # Zoom 15 gives ~4.8km per tile, zoom 16 gives ~2.4km per tile
    if zoom_override > 0:
        zoom = zoom_override
    elif radius_km <= 3:
        zoom = 16  # Very detailed for small areas
    elif radius_km <= 8:
        zoom = 15  # Good detail for medium areas
    elif radius_km <= 15:
        zoom = 14  # Balanced for larger areas
    else:
        zoom = 13  # For very large areas

    # Calculate bounding box
    lat_delta = radius_km / 111.0  # ~111km per degree latitude
    lon_delta = radius_km / (111.0 * math.cos(math.radians(center_lat)))

    north = center_lat + lat_delta
    south = center_lat - lat_delta
    east = center_lon + lon_delta
    west = center_lon - lon_delta

    # Get tile range
    x_min, y_min = latlon_to_tile(north, west, zoom)
    x_max, y_max = latlon_to_tile(south, east, zoom)

    # Ensure proper ordering
    if x_min > x_max:
        x_min, x_max = x_max, x_min
    if y_min > y_max:
        y_min, y_max = y_max, y_min

    num_tiles_x = x_max - x_min + 1
    num_tiles_y = y_max - y_min + 1
    total_tiles = num_tiles_x * num_tiles_y

    print(f"  Zoom level: {zoom}")
    print(f"  Tiles: {num_tiles_x}x{num_tiles_y} = {total_tiles} tiles")

    # Create tiles directory next to output file
    output_dir = os.path.dirname(output_path) or "."
    map_name = os.path.splitext(os.path.basename(output_path))[0]
    tiles_dir = os.path.join(output_dir, f"{map_name}_tiles")
    os.makedirs(tiles_dir, exist_ok=True)

    # Download and save tiles separately
    headers = {
        'User-Agent': 'AD&D HexMap Editor/1.0 (Educational/Gaming project)'
    }

    downloaded = 0
    for x in range(x_min, x_max + 1):
        for y in range(y_min, y_max + 1):
            tile_url = TILE_SERVER.format(z=zoom, x=x, y=y)
            # Use local tile coordinates (0-based) for filenames
            local_x = x - x_min
            local_y = y - y_min
            tile_filename = f"tile_{local_x}_{local_y}.png"
            tile_path = os.path.join(tiles_dir, tile_filename)

            try:
                response = requests.get(tile_url, headers=headers, timeout=30)
                response.raise_for_status()

                # Save tile directly to file
                with open(tile_path, 'wb') as f:
                    f.write(response.content)

                downloaded += 1
                if downloaded % 10 == 0:
                    print(f"  Downloaded {downloaded}/{total_tiles} tiles...")

            except Exception as e:
                print(f"  Warning: Failed to download tile {x},{y}: {e}")

    print(f"  Downloaded {downloaded}/{total_tiles} tiles to {tiles_dir}")

    # Calculate the geographic bounds of the tile grid
    top_lat, left_lon = tile_to_latlon(x_min, y_min, zoom)
    bottom_lat, right_lon = tile_to_latlon(x_max + 1, y_max + 1, zoom)

    # Calculate the radius from center to corner in meters (for backwards compatibility)
    center_to_corner_km = haversine_distance(
        center_lat, center_lon,
        top_lat, left_lon
    )

    # Return tile metadata
    return {
        "type": "tiles",
        "tiles_dir": f"res://maps/{map_name}_tiles",
        "zoom": zoom,
        "tile_size": TILE_SIZE,
        "grid": {
            "x_min": x_min,
            "y_min": y_min,
            "x_max": x_max,
            "y_max": y_max,
            "cols": num_tiles_x,
            "rows": num_tiles_y
        },
        "bounds": {
            "top_lat": top_lat,
            "bottom_lat": bottom_lat,
            "left_lon": left_lon,
            "right_lon": right_lon
        },
        "center_lat": center_lat,
        "center_lon": center_lon,
        "radius_m": center_to_corner_km * 1000
    }


def parse_osm_elements(osm_data: Dict) -> Tuple[Dict[int, Dict], List[Dict], List[Dict]]:
    """Parse OSM elements into nodes, ways, and relations."""
    nodes = {}
    ways = []
    relations = []

    for element in osm_data.get("elements", []):
        if element["type"] == "node":
            nodes[element["id"]] = {
                "lat": element["lat"],
                "lon": element["lon"],
                "tags": element.get("tags", {})
            }
        elif element["type"] == "way":
            ways.append({
                "id": element["id"],
                "nodes": element.get("nodes", []),
                "tags": element.get("tags", {})
            })
        elif element["type"] == "relation":
            relations.append({
                "id": element["id"],
                "members": element.get("members", []),
                "tags": element.get("tags", {})
            })

    return nodes, ways, relations


def get_way_centroid(way: Dict, nodes: Dict[int, Dict]) -> Tuple[float, float]:
    """Calculate centroid of a way."""
    lats = []
    lons = []
    for node_id in way["nodes"]:
        if node_id in nodes:
            lats.append(nodes[node_id]["lat"])
            lons.append(nodes[node_id]["lon"])

    if not lats:
        return None, None

    return sum(lats) / len(lats), sum(lons) / len(lons)


def classify_terrain(tags: Dict) -> str:
    """Classify OSM tags into terrain type."""
    # Water
    if tags.get("natural") == "water" or tags.get("water") or tags.get("waterway"):
        return "water"

    # Forest
    if tags.get("natural") == "wood" or tags.get("landuse") == "forest":
        return "forest"

    # Urban/Buildings
    if tags.get("building") or tags.get("landuse") in ["residential", "commercial", "industrial", "retail"]:
        return "ruins"  # Using ruins as urban placeholder

    # Farmland
    if tags.get("landuse") in ["farmland", "farm", "meadow", "orchard", "vineyard"]:
        return "plains"

    # Hills/Mountains
    if tags.get("natural") in ["peak", "ridge", "cliff"]:
        return "hills"

    # Wetland/Swamp
    if tags.get("natural") == "wetland" or tags.get("landuse") == "marsh":
        return "swamp"

    # Desert/Bare
    if tags.get("natural") in ["sand", "beach", "bare_rock"]:
        return "desert"

    # Grassland
    if tags.get("natural") == "grassland" or tags.get("landuse") == "grass":
        return "plains"

    # Default
    return "plains"


def aggregate_hex_data(
    nodes: Dict[int, Dict],
    ways: List[Dict],
    center_lat: float,
    center_lon: float,
    radius_km: float,
    hex_size_km: float
) -> Dict[Tuple[int, int], Dict]:
    """Aggregate OSM features into hex tiles."""
    print("Aggregating features into hex tiles...")

    hex_data = defaultdict(lambda: {
        "terrain_counts": defaultdict(int),
        "features": [],
        "has_road": False,
        "has_railway": False,
        "has_water": False,
        "has_forest": False,
        "has_farmland": False,
        "has_urban": False,
        "places": [],
        "building_count": 0,
        "landuse": [],
        "natural": [],
        "total_area": 0.0
    })

    # Process ways
    for way in ways:
        tags = way["tags"]
        if not tags:
            continue

        # Get centroid
        lat, lon = get_way_centroid(way, nodes)
        if lat is None:
            continue

        # Convert to hex coordinates
        x_km, y_km = latlon_to_km(lat, lon, center_lat, center_lon)

        # Skip if outside radius
        if math.sqrt(x_km ** 2 + y_km ** 2) > radius_km:
            continue

        q, r = km_to_hex_axial(x_km, y_km, hex_size_km)
        hex_key = (q, r)

        # Classify and count
        terrain = classify_terrain(tags)
        hex_data[hex_key]["terrain_counts"][terrain] += 1

        # Track special features
        if tags.get("highway"):
            hex_data[hex_key]["has_road"] = True
            hex_data[hex_key]["features"].append(f"road:{tags['highway']}")

        if tags.get("railway"):
            hex_data[hex_key]["has_railway"] = True
            hex_data[hex_key]["features"].append(f"railway:{tags['railway']}")

        if tags.get("waterway"):
            hex_data[hex_key]["has_water"] = True
            hex_data[hex_key]["features"].append(f"waterway:{tags['waterway']}")

        if tags.get("water"):
            hex_data[hex_key]["has_water"] = True
            hex_data[hex_key]["features"].append(f"water:{tags['water']}")

        if tags.get("natural") == "water":
            hex_data[hex_key]["has_water"] = True
            hex_data[hex_key]["features"].append("natural:water")

        if tags.get("building"):
            hex_data[hex_key]["building_count"] += 1

        # Track landuse
        landuse = tags.get("landuse")
        if landuse:
            hex_data[hex_key]["landuse"].append(landuse)
            hex_data[hex_key]["features"].append(f"landuse:{landuse}")
            if landuse == "forest":
                hex_data[hex_key]["has_forest"] = True
            elif landuse in ["farmland", "farm", "meadow", "orchard", "vineyard", "grass"]:
                hex_data[hex_key]["has_farmland"] = True
            elif landuse in ["residential", "commercial", "industrial", "retail"]:
                hex_data[hex_key]["has_urban"] = True

        # Track natural features
        natural = tags.get("natural")
        if natural:
            hex_data[hex_key]["natural"].append(natural)
            hex_data[hex_key]["features"].append(f"natural:{natural}")
            if natural == "wood":
                hex_data[hex_key]["has_forest"] = True

    # Process place nodes (cities, towns, villages)
    for node_id, node in nodes.items():
        tags = node.get("tags", {})
        place = tags.get("place")
        if place in ["city", "town", "village", "hamlet", "locality", "isolated_dwelling"]:
            x_km, y_km = latlon_to_km(node["lat"], node["lon"], center_lat, center_lon)
            if math.sqrt(x_km ** 2 + y_km ** 2) <= radius_km:
                q, r = km_to_hex_axial(x_km, y_km, hex_size_km)
                hex_data[(q, r)]["places"].append({
                    "name": tags.get("name", "Unknown"),
                    "type": place,
                    "population": tags.get("population", "")
                })

    # Process all tagged nodes (historic, tourism, amenity, leisure, natural features)
    for node_id, node in nodes.items():
        tags = node.get("tags", {})
        if not tags:
            continue

        # Skip place nodes (already processed above)
        if tags.get("place"):
            continue

        x_km, y_km = latlon_to_km(node["lat"], node["lon"], center_lat, center_lon)
        if math.sqrt(x_km ** 2 + y_km ** 2) > radius_km:
            continue

        q, r = km_to_hex_axial(x_km, y_km, hex_size_km)
        hex_key = (q, r)

        # Historic features
        historic = tags.get("historic")
        if historic:
            name = tags.get("name", "")
            if "historic" not in hex_data[hex_key]:
                hex_data[hex_key]["historic"] = []
            hex_data[hex_key]["historic"].append({
                "type": historic,
                "name": name
            })
            hex_data[hex_key]["features"].append(f"historic:{historic}")

        # Tourism features
        tourism = tags.get("tourism")
        if tourism:
            name = tags.get("name", "")
            if "tourism" not in hex_data[hex_key]:
                hex_data[hex_key]["tourism"] = []
            hex_data[hex_key]["tourism"].append({
                "type": tourism,
                "name": name
            })
            hex_data[hex_key]["features"].append(f"tourism:{tourism}")

        # Amenity features
        amenity = tags.get("amenity")
        if amenity:
            name = tags.get("name", "")
            if "amenities" not in hex_data[hex_key]:
                hex_data[hex_key]["amenities"] = []
            hex_data[hex_key]["amenities"].append({
                "type": amenity,
                "name": name
            })
            hex_data[hex_key]["features"].append(f"amenity:{amenity}")

        # Leisure features
        leisure = tags.get("leisure")
        if leisure:
            name = tags.get("name", "")
            if "leisure" not in hex_data[hex_key]:
                hex_data[hex_key]["leisure"] = []
            hex_data[hex_key]["leisure"].append({
                "type": leisure,
                "name": name
            })
            hex_data[hex_key]["features"].append(f"leisure:{leisure}")

        # Natural point features (peaks, springs, etc.)
        natural = tags.get("natural")
        if natural:
            name = tags.get("name", "")
            ele = tags.get("ele", "")  # Elevation for peaks
            if "natural_points" not in hex_data[hex_key]:
                hex_data[hex_key]["natural_points"] = []
            hex_data[hex_key]["natural_points"].append({
                "type": natural,
                "name": name,
                "elevation": ele
            })
            if name:
                hex_data[hex_key]["features"].append(f"natural:{natural}:{name}")
            else:
                hex_data[hex_key]["features"].append(f"natural:{natural}")

    return dict(hex_data)


def determine_dominant_terrain(hex_info: Dict) -> str:
    """Determine dominant terrain type for a hex."""
    counts = hex_info["terrain_counts"]

    if not counts:
        return "plains"  # Default

    # Priority override: if many buildings, it's urban
    if hex_info["building_count"] > 20:
        return "ruins"  # Urban area

    # Find most common terrain
    return max(counts.keys(), key=lambda k: counts[k])


def generate_hex_map(
    hex_data: Dict[Tuple[int, int], Dict],
    center_lat: float,
    center_lon: float,
    radius_km: float,
    hex_size_km: float
) -> Dict:
    """Generate hex map JSON in hex_editor.gd compatible format."""
    print("Generating hex map...")

    hexes = []  # Array of {q, r, terrain, features, elevation, name, description, region_id}
    edges = []  # Array of {key: "q1,r1:q2,r2", type: "road"|"river"}
    regions = [{"id": 0, "name": "Unassigned", "color": [0.9, 0.9, 0.9, 0.35]}]

    edges_added = set()  # Track edges to avoid duplicates

    # Calculate hex range to fill
    max_hexes = int(radius_km / hex_size_km) + 2

    for q in range(-max_hexes, max_hexes + 1):
        for r in range(-max_hexes, max_hexes + 1):
            # Check if hex center is within radius
            hex_x = hex_size_km * math.sqrt(3) * (q + r / 2)
            hex_y = hex_size_km * 3 / 2 * r

            if math.sqrt(hex_x ** 2 + hex_y ** 2) > radius_km:
                continue

            hex_info = hex_data.get((q, r), None)

            if hex_info:
                terrain = determine_dominant_terrain(hex_info)

                # Build features list from OSM data
                features = []
                if hex_info["has_road"]:
                    features.append("road")
                if hex_info["has_railway"]:
                    features.append("railway")
                if hex_info["has_water"]:
                    features.append("waterway")
                if hex_info.get("has_forest"):
                    features.append("forest")
                if hex_info.get("has_farmland"):
                    features.append("farmland")
                if hex_info.get("has_urban"):
                    features.append("urban")
                if hex_info["building_count"] > 0:
                    features.append(f"buildings:{hex_info['building_count']}")

                # Get place names for hex name
                hex_name = ""
                hex_desc = ""
                if hex_info["places"]:
                    # Use largest place as hex name
                    places_sorted = sorted(hex_info["places"],
                        key=lambda p: {"city": 4, "town": 3, "village": 2, "hamlet": 1}.get(p["type"], 0),
                        reverse=True)
                    hex_name = places_sorted[0]["name"]
                    hex_desc = f"{places_sorted[0]['type'].title()}"
                    if places_sorted[0].get("population"):
                        hex_desc += f" (pop: {places_sorted[0]['population']})"

                # Collect unique landuse and natural values
                landuse_set = list(set(hex_info.get("landuse", [])))
                natural_set = list(set(hex_info.get("natural", [])))

                # Build datalayer with OSM metadata
                datalayer = {
                    "osm": {
                        "has_road": hex_info["has_road"],
                        "has_railway": hex_info["has_railway"],
                        "has_water": hex_info["has_water"],
                        "has_forest": hex_info.get("has_forest", False),
                        "has_farmland": hex_info.get("has_farmland", False),
                        "has_urban": hex_info.get("has_urban", False),
                        "building_count": hex_info["building_count"],
                        "landuse": landuse_set,
                        "natural": natural_set,
                        "features": hex_info["features"][:100],  # Increased limit for all data
                        "places": hex_info["places"],
                        "historic": hex_info.get("historic", []),
                        "tourism": hex_info.get("tourism", []),
                        "amenities": hex_info.get("amenities", []),
                        "leisure": hex_info.get("leisure", []),
                        "natural_points": hex_info.get("natural_points", [])
                    }
                }

                # Add hex in object format
                hex_obj = {
                    "q": q,
                    "r": r,
                    "terrain": terrain,
                    "impedance": None,
                    "features": features,
                    "elevation": 0,
                }
                if hex_name:
                    hex_obj["name"] = hex_name
                if hex_desc:
                    hex_obj["description"] = hex_desc
                hex_obj["datalayer"] = datalayer
                hexes.append(hex_obj)

                # Add edges for roads between hexes
                if hex_info["has_road"]:
                    neighbors = [
                        (q + 1, r), (q - 1, r),
                        (q, r + 1), (q, r - 1),
                        (q + 1, r - 1), (q - 1, r + 1)
                    ]
                    for nq, nr in neighbors:
                        neighbor_info = hex_data.get((nq, nr))
                        if neighbor_info and neighbor_info["has_road"]:
                            # Create sorted edge key
                            coords = sorted([(q, r), (nq, nr)])
                            edge_key = f"{coords[0][0]},{coords[0][1]}:{coords[1][0]},{coords[1][1]}"
                            if edge_key not in edges_added:
                                edges_added.add(edge_key)
                                edges.append({"key": edge_key, "type": "road"})

                # Add edges for water features
                if hex_info["has_water"]:
                    neighbors = [
                        (q + 1, r), (q - 1, r),
                        (q, r + 1), (q, r - 1),
                        (q + 1, r - 1), (q - 1, r + 1)
                    ]
                    for nq, nr in neighbors:
                        neighbor_info = hex_data.get((nq, nr))
                        if neighbor_info and neighbor_info["has_water"]:
                            coords = sorted([(q, r), (nq, nr)])
                            edge_key = f"{coords[0][0]},{coords[0][1]}:{coords[1][0]},{coords[1][1]}"
                            if edge_key not in edges_added:
                                edges_added.add(edge_key)
                                edges.append({"key": edge_key, "type": "river"})
            else:
                # Empty hex within radius - default terrain
                hexes.append({
                    "q": q,
                    "r": r,
                    "terrain": "plains",
                    "impedance": None,
                    "features": [],
                    "elevation": 0,
                })

    return {
        "version": 4,
        "meta": {
            "kind": "save",
            "source": "osm",
            "center_lat": center_lat,
            "center_lon": center_lon,
            "radius_km": radius_km,
            "hex": {
                "size_m": hex_size_km * 1000
            },
            "generator": "osm_to_hex.py"
        },
        "regions": regions,
        "hexes": hexes,
        "edges": edges,
        "terrain_limits": {}
    }


def add_basemap_to_meta(hex_map: Dict, basemap_info: Dict[str, Any]) -> None:
    """Add basemap information to the map metadata."""
    if basemap_info:
        hex_map["meta"]["basemap"] = basemap_info


def export_to_sqlite(
    db_path: str,
    hex_map: Dict,
    nodes: Dict[int, Dict],
    ways: List[Dict],
    center_lat: float,
    center_lon: float,
    hex_size_km: float
) -> None:
    """Export hex map data to SQLite database."""
    print(f"Exporting to SQLite: {db_path}")

    # Remove existing db if present
    if os.path.exists(db_path):
        os.remove(db_path)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Create schema
    cur.executescript("""
        -- Map metadata
        CREATE TABLE meta (
            key TEXT PRIMARY KEY,
            value TEXT
        );

        -- Hex tiles
        CREATE TABLE hexes (
            q INTEGER,
            r INTEGER,
            terrain TEXT,
            elevation_min REAL,
            elevation_max REAL,
            elevation_avg REAL,
            has_road INTEGER DEFAULT 0,
            has_railway INTEGER DEFAULT 0,
            has_water INTEGER DEFAULT 0,
            has_forest INTEGER DEFAULT 0,
            has_farmland INTEGER DEFAULT 0,
            has_urban INTEGER DEFAULT 0,
            building_count INTEGER DEFAULT 0,
            name TEXT,
            description TEXT,
            landuse TEXT,  -- JSON array
            natural TEXT,  -- JSON array
            features TEXT, -- JSON array
            PRIMARY KEY (q, r)
        );

        -- Points of interest with coordinates
        CREATE TABLE pois (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hex_q INTEGER,
            hex_r INTEGER,
            x REAL,  -- position within hex (0-1)
            y REAL,
            lat REAL,
            lon REAL,
            category TEXT,  -- place, historic, tourism, amenity, leisure, natural
            type TEXT,      -- village, castle, church, spring, etc.
            name TEXT,
            population TEXT,
            elevation TEXT,
            osm_tags TEXT,  -- JSON
            FOREIGN KEY (hex_q, hex_r) REFERENCES hexes(q, r)
        );

        -- Roads/paths as line geometries
        CREATE TABLE roads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT,  -- motorway, primary, secondary, etc.
            name TEXT,
            geometry TEXT,  -- JSON array of [lat, lon] points
            hex_cells TEXT  -- JSON array of [q, r] hexes this road passes through
        );

        -- Water features
        CREATE TABLE waterways (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT,  -- river, stream, canal
            name TEXT,
            geometry TEXT,
            hex_cells TEXT
        );

        -- Edges between hexes (roads, rivers)
        CREATE TABLE edges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hex1_q INTEGER,
            hex1_r INTEGER,
            hex2_q INTEGER,
            hex2_r INTEGER,
            type TEXT,  -- road, river
            UNIQUE(hex1_q, hex1_r, hex2_q, hex2_r, type)
        );

        -- Game state layer (mutable)
        CREATE TABLE hex_state (
            hex_q INTEGER,
            hex_r INTEGER,
            visited INTEGER DEFAULT 0,
            discovered_at INTEGER,
            custom_data TEXT,  -- JSON
            PRIMARY KEY (hex_q, hex_r)
        );

        CREATE TABLE poi_state (
            poi_id INTEGER PRIMARY KEY,
            discovered INTEGER DEFAULT 0,
            discovered_at INTEGER,
            notes TEXT,
            custom_data TEXT,  -- JSON
            FOREIGN KEY (poi_id) REFERENCES pois(id)
        );

        -- Cache layer
        CREATE TABLE cache (
            key TEXT PRIMARY KEY,
            data BLOB,
            created_at INTEGER
        );

        -- Indexes for spatial queries
        CREATE INDEX idx_hexes_coords ON hexes(q, r);
        CREATE INDEX idx_pois_hex ON pois(hex_q, hex_r);
        CREATE INDEX idx_pois_category ON pois(category);
        CREATE INDEX idx_pois_type ON pois(type);
        CREATE INDEX idx_edges_hex1 ON edges(hex1_q, hex1_r);
        CREATE INDEX idx_edges_hex2 ON edges(hex2_q, hex2_r);
    """)

    # Insert metadata
    meta = hex_map.get("meta", {})
    meta_items = [
        ("version", str(hex_map.get("version", 4))),
        ("source", "osm"),
        ("center_lat", str(center_lat)),
        ("center_lon", str(center_lon)),
        ("hex_size_m", str(hex_size_km * 1000)),
        ("generator", "osm_to_hex.py"),
    ]
    cur.executemany("INSERT INTO meta (key, value) VALUES (?, ?)", meta_items)

    # Insert hexes
    hex_count = 0
    for hex_obj in hex_map.get("hexes", []):
        q = hex_obj["q"]
        r = hex_obj["r"]
        datalayer = hex_obj.get("datalayer", {}).get("osm", {})

        cur.execute("""
            INSERT INTO hexes (
                q, r, terrain, has_road, has_railway, has_water,
                has_forest, has_farmland, has_urban, building_count,
                name, description, landuse, natural, features
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            q, r,
            hex_obj.get("terrain", "plains"),
            1 if datalayer.get("has_road") else 0,
            1 if datalayer.get("has_railway") else 0,
            1 if datalayer.get("has_water") else 0,
            1 if datalayer.get("has_forest") else 0,
            1 if datalayer.get("has_farmland") else 0,
            1 if datalayer.get("has_urban") else 0,
            datalayer.get("building_count", 0),
            hex_obj.get("name", ""),
            hex_obj.get("description", ""),
            json.dumps(datalayer.get("landuse", [])),
            json.dumps(datalayer.get("natural", [])),
            json.dumps(datalayer.get("features", []))
        ))
        hex_count += 1

        # Insert POIs from this hex's datalayer
        # Places
        for place in datalayer.get("places", []):
            cur.execute("""
                INSERT INTO pois (hex_q, hex_r, category, type, name, population)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (q, r, "place", place.get("type", ""), place.get("name", ""), place.get("population", "")))

        # Historic
        for hist in datalayer.get("historic", []):
            cur.execute("""
                INSERT INTO pois (hex_q, hex_r, category, type, name)
                VALUES (?, ?, ?, ?, ?)
            """, (q, r, "historic", hist.get("type", ""), hist.get("name", "")))

        # Tourism
        for tour in datalayer.get("tourism", []):
            cur.execute("""
                INSERT INTO pois (hex_q, hex_r, category, type, name)
                VALUES (?, ?, ?, ?, ?)
            """, (q, r, "tourism", tour.get("type", ""), tour.get("name", "")))

        # Amenities
        for amen in datalayer.get("amenities", []):
            cur.execute("""
                INSERT INTO pois (hex_q, hex_r, category, type, name)
                VALUES (?, ?, ?, ?, ?)
            """, (q, r, "amenity", amen.get("type", ""), amen.get("name", "")))

        # Leisure
        for leis in datalayer.get("leisure", []):
            cur.execute("""
                INSERT INTO pois (hex_q, hex_r, category, type, name)
                VALUES (?, ?, ?, ?, ?)
            """, (q, r, "leisure", leis.get("type", ""), leis.get("name", "")))

        # Natural points
        for natp in datalayer.get("natural_points", []):
            cur.execute("""
                INSERT INTO pois (hex_q, hex_r, category, type, name, elevation)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (q, r, "natural", natp.get("type", ""), natp.get("name", ""), natp.get("elevation", "")))

    # Insert edges
    edge_count = 0
    for edge in hex_map.get("edges", []):
        key = edge.get("key", "")
        parts = key.split(":")
        if len(parts) == 2:
            coords1 = parts[0].split(",")
            coords2 = parts[1].split(",")
            if len(coords1) == 2 and len(coords2) == 2:
                try:
                    cur.execute("""
                        INSERT OR IGNORE INTO edges (hex1_q, hex1_r, hex2_q, hex2_r, type)
                        VALUES (?, ?, ?, ?, ?)
                    """, (
                        int(coords1[0]), int(coords1[1]),
                        int(coords2[0]), int(coords2[1]),
                        edge.get("type", "road")
                    ))
                    edge_count += 1
                except ValueError:
                    pass

    # Process ways for road/waterway geometries
    road_count = 0
    water_count = 0
    for way in ways:
        tags = way.get("tags", {})
        way_nodes = way.get("nodes", [])

        # Build geometry from node IDs
        geometry = []
        for node_id in way_nodes:
            if node_id in nodes:
                node = nodes[node_id]
                geometry.append([node["lat"], node["lon"]])

        if not geometry:
            continue

        # Roads
        highway = tags.get("highway")
        if highway in ["motorway", "trunk", "primary", "secondary"]:
            cur.execute("""
                INSERT INTO roads (type, name, geometry)
                VALUES (?, ?, ?)
            """, (highway, tags.get("name", ""), json.dumps(geometry)))
            road_count += 1

        # Waterways
        waterway = tags.get("waterway")
        if waterway:
            cur.execute("""
                INSERT INTO waterways (type, name, geometry)
                VALUES (?, ?, ?)
            """, (waterway, tags.get("name", ""), json.dumps(geometry)))
            water_count += 1

    conn.commit()

    # Get POI count
    cur.execute("SELECT COUNT(*) FROM pois")
    poi_count = cur.fetchone()[0]

    conn.close()

    print(f"  Exported {hex_count} hexes, {poi_count} POIs, {edge_count} edges")
    print(f"  Roads: {road_count}, Waterways: {water_count}")


def main():
    parser = argparse.ArgumentParser(description="Convert OSM data to hex map")
    parser.add_argument("--lat", type=float, default=47.5798, help="Center latitude")
    parser.add_argument("--lon", type=float, default=0.7031, help="Center longitude")
    parser.add_argument("--radius", type=float, default=10.0, help="Radius in km")
    parser.add_argument("--hex-size", type=float, default=4.0, help="Hex size in km")
    parser.add_argument("--output", type=str, default="osm_hex_map.json", help="Output file")
    parser.add_argument("--no-basemap", action="store_true", help="Skip downloading basemap tiles")
    parser.add_argument("--zoom", type=int, default=0, help="Basemap zoom level (0=auto, higher=more detail, 13-17 recommended)")
    parser.add_argument("--sqlite", action="store_true", help="Also export to SQLite database")
    parser.add_argument("--sqlite-only", action="store_true", help="Only export to SQLite (skip JSON)")

    args = parser.parse_args()

    print(f"OSM to Hex Converter")
    print(f"  Center: ({args.lat}, {args.lon})")
    print(f"  Radius: {args.radius} km")
    print(f"  Hex size: {args.hex_size} km")
    if args.zoom > 0:
        print(f"  Zoom level: {args.zoom} (manual)")
    print()

    # Download basemap tiles first (if enabled)
    basemap_info = {}
    if not args.no_basemap and HAS_PIL:
        basemap_info = download_basemap(
            args.lat, args.lon, args.radius, args.output, args.zoom
        )
        print()

    # Fetch OSM data
    osm_data = fetch_osm_data(args.lat, args.lon, args.radius)

    # Parse elements
    nodes, ways, relations = parse_osm_elements(osm_data)
    print(f"  Parsed {len(nodes)} nodes, {len(ways)} ways, {len(relations)} relations")

    # Aggregate into hexes
    hex_data = aggregate_hex_data(nodes, ways, args.lat, args.lon, args.radius, args.hex_size)
    print(f"  Created {len(hex_data)} hex tiles with features")

    # Generate map
    hex_map = generate_hex_map(hex_data, args.lat, args.lon, args.radius, args.hex_size)
    print(f"  Final map has {len(hex_map['hexes'])} hexes, {len(hex_map['edges'])} edges")

    # Add basemap info to metadata
    if basemap_info:
        add_basemap_to_meta(hex_map, basemap_info)

    # Save JSON (unless sqlite-only)
    if not args.sqlite_only:
        with open(args.output, "w") as f:
            json.dump(hex_map, f, indent=2)
        print(f"\nSaved to: {args.output}")
        if basemap_info:
            print(f"Basemap tiles: {basemap_info.get('tiles_dir', 'N/A')}")

    # Export to SQLite if requested
    if args.sqlite or args.sqlite_only:
        db_path = args.output.replace(".json", ".db")
        if args.sqlite_only and not db_path.endswith(".db"):
            db_path = args.output + ".db"
        export_to_sqlite(db_path, hex_map, nodes, ways, args.lat, args.lon, args.hex_size)
        print(f"SQLite database: {db_path}")


if __name__ == "__main__":
    main()
