## HexData - OSM-compatible data structure for hex map cells
## This class provides a standardized way to store and serialize hex data
## with full OpenStreetMap tag compatibility
class_name HexData
extends RefCounted

# =============================================================================
# CORE PROPERTIES (existing)
# =============================================================================

## Display name for this hex
var name: String = ""

## Description/notes for this hex
var description: String = ""

## Elevation level (can be negative for underground)
var elevation: int = 0

## Region ID this hex belongs to
var region_id: int = 0

## Legacy terrain type (for backward compatibility)
var terrain: String = "plains"

## Movement impedance (cost multiplier for pathfinding)
var impedance: float = 1.0

## Generic features array (legacy)
var features: Array = []

# =============================================================================
# OSM TAG PROPERTIES
# =============================================================================

## Primary highway/road type
var highway: int = OSMConstants.Highway.NONE

## Land use classification
var landuse: int = OSMConstants.Landuse.NONE

## Natural feature type
var natural: int = OSMConstants.Natural.NONE

## Building type
var building: int = OSMConstants.Building.NONE

## Amenity type
var amenity: int = OSMConstants.Amenity.NONE

## Leisure facility type
var leisure: int = OSMConstants.Leisure.NONE

## Tourism feature type
var tourism: int = OSMConstants.Tourism.NONE

## Waterway type
var waterway: int = OSMConstants.Waterway.NONE

## Man-made structure type
var man_made: int = OSMConstants.ManMade.NONE

## Surface material
var surface: int = OSMConstants.Surface.NONE

## Access restrictions
var access: int = OSMConstants.Access.NONE

## Shop type
var shop: int = OSMConstants.Shop.NONE

## Barrier type
var barrier: int = OSMConstants.Barrier.NONE

## Power infrastructure type
var power: int = OSMConstants.Power.NONE

## Railway feature type
var railway: int = OSMConstants.Railway.NONE

# =============================================================================
# ADDITIONAL OSM PROPERTIES
# =============================================================================

## Indoor level (for multi-floor buildings, negative for basements)
var level: int = 0

## Whether this is underground
var tunnel: bool = false

## Whether this is a bridge/elevated
var bridge: bool = false

## Layer order for overlapping features (-5 to 5)
var layer: int = 0

## Opening hours (string like "Mo-Fr 09:00-17:00")
var opening_hours: String = ""

## Website URL
var website: String = ""

## Phone number
var phone: String = ""

## Address - street name
var addr_street: String = ""

## Address - house number
var addr_housenumber: String = ""

## Address - city
var addr_city: String = ""

## Address - postcode
var addr_postcode: String = ""

## Operator/owner name
var operator_name: String = ""

## Brand name
var brand: String = ""

## Cuisine type (for restaurants)
var cuisine: String = ""

## Religion (for places of worship)
var religion: String = ""

## Denomination
var denomination: String = ""

## Whether this is lit at night
var lit: bool = false

## Whether covered/roofed
var covered: bool = false

## Whether wheelchair accessible
var wheelchair: String = ""  # "yes", "no", "limited"

## Internet access type
var internet_access: String = ""  # "wlan", "wired", "terminal", "no"

## Custom tags dictionary for additional OSM tags
var custom_tags: Dictionary = {}

# =============================================================================
# METHODS
# =============================================================================

func _init() -> void:
	pass


## Create from a legacy hex dictionary
static func from_legacy(data: Dictionary) -> HexData:
	var hex := HexData.new()
	hex.terrain = str(data.get("terrain", "plains"))
	hex.impedance = float(data.get("impedance", 1.0))
	hex.elevation = int(data.get("elevation", 0))
	hex.name = str(data.get("name", ""))
	hex.description = str(data.get("description", ""))
	hex.region_id = int(data.get("region_id", 0))
	hex.features = data.get("features", [])

	# Load OSM tags if present
	hex.highway = int(data.get("highway", OSMConstants.Highway.NONE))
	hex.landuse = int(data.get("landuse", OSMConstants.Landuse.NONE))
	hex.natural = int(data.get("natural", OSMConstants.Natural.NONE))
	hex.building = int(data.get("building", OSMConstants.Building.NONE))
	hex.amenity = int(data.get("amenity", OSMConstants.Amenity.NONE))
	hex.leisure = int(data.get("leisure", OSMConstants.Leisure.NONE))
	hex.tourism = int(data.get("tourism", OSMConstants.Tourism.NONE))
	hex.waterway = int(data.get("waterway", OSMConstants.Waterway.NONE))
	hex.man_made = int(data.get("man_made", OSMConstants.ManMade.NONE))
	hex.surface = int(data.get("surface", OSMConstants.Surface.NONE))
	hex.access = int(data.get("access", OSMConstants.Access.NONE))
	hex.shop = int(data.get("shop", OSMConstants.Shop.NONE))
	hex.barrier = int(data.get("barrier", OSMConstants.Barrier.NONE))
	hex.power = int(data.get("power", OSMConstants.Power.NONE))
	hex.railway = int(data.get("railway", OSMConstants.Railway.NONE))

	hex.level = int(data.get("level", 0))
	hex.tunnel = bool(data.get("tunnel", false))
	hex.bridge = bool(data.get("bridge", false))
	hex.layer = int(data.get("layer", 0))
	hex.opening_hours = str(data.get("opening_hours", ""))
	hex.website = str(data.get("website", ""))
	hex.phone = str(data.get("phone", ""))
	hex.addr_street = str(data.get("addr_street", ""))
	hex.addr_housenumber = str(data.get("addr_housenumber", ""))
	hex.addr_city = str(data.get("addr_city", ""))
	hex.addr_postcode = str(data.get("addr_postcode", ""))
	hex.operator_name = str(data.get("operator", ""))
	hex.brand = str(data.get("brand", ""))
	hex.cuisine = str(data.get("cuisine", ""))
	hex.religion = str(data.get("religion", ""))
	hex.denomination = str(data.get("denomination", ""))
	hex.lit = bool(data.get("lit", false))
	hex.covered = bool(data.get("covered", false))
	hex.wheelchair = str(data.get("wheelchair", ""))
	hex.internet_access = str(data.get("internet_access", ""))
	hex.custom_tags = data.get("custom_tags", {})

	return hex


## Convert to dictionary for saving
func to_dict() -> Dictionary:
	var data := {
		"terrain": terrain,
		"impedance": impedance,
		"elevation": elevation,
		"name": name,
		"description": description,
		"region_id": region_id,
		"features": features,
	}

	# Only include non-default OSM tags to save space
	if highway != OSMConstants.Highway.NONE:
		data["highway"] = highway
	if landuse != OSMConstants.Landuse.NONE:
		data["landuse"] = landuse
	if natural != OSMConstants.Natural.NONE:
		data["natural"] = natural
	if building != OSMConstants.Building.NONE:
		data["building"] = building
	if amenity != OSMConstants.Amenity.NONE:
		data["amenity"] = amenity
	if leisure != OSMConstants.Leisure.NONE:
		data["leisure"] = leisure
	if tourism != OSMConstants.Tourism.NONE:
		data["tourism"] = tourism
	if waterway != OSMConstants.Waterway.NONE:
		data["waterway"] = waterway
	if man_made != OSMConstants.ManMade.NONE:
		data["man_made"] = man_made
	if surface != OSMConstants.Surface.NONE:
		data["surface"] = surface
	if access != OSMConstants.Access.NONE:
		data["access"] = access
	if shop != OSMConstants.Shop.NONE:
		data["shop"] = shop
	if barrier != OSMConstants.Barrier.NONE:
		data["barrier"] = barrier
	if power != OSMConstants.Power.NONE:
		data["power"] = power
	if railway != OSMConstants.Railway.NONE:
		data["railway"] = railway

	if level != 0:
		data["level"] = level
	if tunnel:
		data["tunnel"] = tunnel
	if bridge:
		data["bridge"] = bridge
	if layer != 0:
		data["layer"] = layer
	if opening_hours != "":
		data["opening_hours"] = opening_hours
	if website != "":
		data["website"] = website
	if phone != "":
		data["phone"] = phone
	if addr_street != "":
		data["addr_street"] = addr_street
	if addr_housenumber != "":
		data["addr_housenumber"] = addr_housenumber
	if addr_city != "":
		data["addr_city"] = addr_city
	if addr_postcode != "":
		data["addr_postcode"] = addr_postcode
	if operator_name != "":
		data["operator"] = operator_name
	if brand != "":
		data["brand"] = brand
	if cuisine != "":
		data["cuisine"] = cuisine
	if religion != "":
		data["religion"] = religion
	if denomination != "":
		data["denomination"] = denomination
	if lit:
		data["lit"] = lit
	if covered:
		data["covered"] = covered
	if wheelchair != "":
		data["wheelchair"] = wheelchair
	if internet_access != "":
		data["internet_access"] = internet_access
	if not custom_tags.is_empty():
		data["custom_tags"] = custom_tags

	return data


## Convert to legacy dictionary format (for backward compatibility)
func to_legacy_dict() -> Dictionary:
	return {
		"terrain": terrain,
		"impedance": impedance,
		"elevation": elevation,
		"name": name,
		"description": description,
		"region_id": region_id,
		"features": features,
	}


## Get a human-readable summary of OSM tags
func get_osm_summary() -> String:
	var parts: Array[String] = []

	if highway != OSMConstants.Highway.NONE:
		parts.append("highway=" + OSMConstants.HIGHWAY_NAMES[highway])
	if landuse != OSMConstants.Landuse.NONE:
		parts.append("landuse=" + OSMConstants.LANDUSE_NAMES[landuse])
	if natural != OSMConstants.Natural.NONE:
		parts.append("natural=" + OSMConstants.NATURAL_NAMES[natural])
	if building != OSMConstants.Building.NONE:
		parts.append("building=" + OSMConstants.BUILDING_NAMES[building])
	if amenity != OSMConstants.Amenity.NONE:
		parts.append("amenity=" + OSMConstants.AMENITY_NAMES[amenity])
	if leisure != OSMConstants.Leisure.NONE:
		parts.append("leisure=" + OSMConstants.LEISURE_NAMES[leisure])
	if tourism != OSMConstants.Tourism.NONE:
		parts.append("tourism=" + OSMConstants.TOURISM_NAMES[tourism])
	if waterway != OSMConstants.Waterway.NONE:
		parts.append("waterway=" + OSMConstants.WATERWAY_NAMES[waterway])
	if man_made != OSMConstants.ManMade.NONE:
		parts.append("man_made=" + OSMConstants.MAN_MADE_NAMES[man_made])
	if surface != OSMConstants.Surface.NONE:
		parts.append("surface=" + OSMConstants.SURFACE_NAMES[surface])
	if shop != OSMConstants.Shop.NONE:
		parts.append("shop=" + OSMConstants.SHOP_NAMES[shop])
	if barrier != OSMConstants.Barrier.NONE:
		parts.append("barrier=" + OSMConstants.BARRIER_NAMES[barrier])
	if railway != OSMConstants.Railway.NONE:
		parts.append("railway=" + OSMConstants.RAILWAY_NAMES[railway])

	if tunnel:
		parts.append("tunnel=yes")
	if bridge:
		parts.append("bridge=yes")
	if level != 0:
		parts.append("level=" + str(level))

	return ", ".join(parts) if parts.size() > 0 else "(no OSM tags)"


## Set custom tag
func set_tag(key: String, value: Variant) -> void:
	custom_tags[key] = value


## Get custom tag
func get_tag(key: String, default: Variant = null) -> Variant:
	return custom_tags.get(key, default)


## Check if hex has any OSM data beyond basic terrain
func has_osm_data() -> bool:
	return (
		highway != OSMConstants.Highway.NONE or
		landuse != OSMConstants.Landuse.NONE or
		natural != OSMConstants.Natural.NONE or
		building != OSMConstants.Building.NONE or
		amenity != OSMConstants.Amenity.NONE or
		leisure != OSMConstants.Leisure.NONE or
		tourism != OSMConstants.Tourism.NONE or
		waterway != OSMConstants.Waterway.NONE or
		man_made != OSMConstants.ManMade.NONE or
		shop != OSMConstants.Shop.NONE or
		barrier != OSMConstants.Barrier.NONE or
		power != OSMConstants.Power.NONE or
		railway != OSMConstants.Railway.NONE or
		tunnel or bridge or level != 0 or
		not custom_tags.is_empty()
	)
