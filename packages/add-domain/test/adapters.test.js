const assert = require("node:assert")
const {
  addCommandForGameInteraction,
  addSnapshotToGameWorld,
  createAddCatalogIndexes,
  selectAddTile,
  selectAddUiState,
  workerRequestForAddCommand,
} = require("../dist/index.js")
const { validateGameWorld } = require("../../game-world/dist/index.js")

const catalog = createCatalogFixture()
const snapshot = createSnapshotFixture()

const indexes = createAddCatalogIndexes(catalog)
assert.equal(indexes.tilesById.get("tile.base_core").label, "Base Core")
assert.equal(indexes.structuresById.get("structure.cave").kind, "cave")
assert.equal(selectAddTile(catalog, "tile.mountain_wall").isBlocker, true)

const world = addSnapshotToGameWorld(snapshot, catalog, {
  worldId: "test.add.world",
  mapId: "test.add.hex",
  hexRadius: 24,
})
const validation = validateGameWorld(world)
assert.equal(validation.valid, true, validation.errors.join("\n"))

assert.equal(world.id, "test.add.world")
assert.equal(world.activeMapId, "test.add.hex")
assert.equal(world.metadata.runtimeAuthority, "rust-wasm")

const map = world.maps[0]
assert.equal(map.topology.kind, "hex")
assert.equal(map.topology.radius, 24)
assert.deepEqual(map.topology.bounds, {
  qMin: -1,
  qMax: 2,
  rMin: -1,
  rMax: 1,
  radius: 2,
})

const terrain = map.layers.find((layer) => layer.id === "add.layer.terrain")
const collision = map.layers.find((layer) => layer.id === "add.layer.collision")
const bubble = map.layers.find((layer) => layer.id === "add.layer.bubble")
assert.equal(terrain.cells.length, snapshot.hexes.length)
assert.equal(collision.cells.length, 1)
assert.equal(collision.cells[0].coord.q, -1)
assert.equal(bubble.cells.length, 3)

assert.ok(map.entities.some((entity) => entity.id === "add.entity.hero"))
assert.ok(
  map.entities.some(
    (entity) =>
      entity.id === "add.entity.structure.structure.crystal_circle.0.0" &&
      entity.kind === "landmark",
  ),
)
assert.ok(
  map.entities.some(
    (entity) =>
      entity.id === "add.entity.structure.structure.cave.2.-1" &&
      entity.label === "Survivor Cave",
  ),
)
assert.ok(
  map.entities.some(
    (entity) => entity.id === "add.entity.flora.flora.reeds.1.-1",
  ),
)

const zonesById = new Map(map.zones.map((zone) => [zone.id, zone]))
assert.equal(zonesById.get("add.zone.base").cells.length, 1)
assert.equal(zonesById.get("add.zone.bubble.stabilized").cells.length, 2)
assert.equal(zonesById.get("add.zone.bubble.frontier").cells.length, 1)
assert.equal(zonesById.get("add.zone.survivor_cave").cells.length, 1)

const interactionsById = new Map(map.interactions.map((interaction) => [interaction.id, interaction]))
const explore = interactionsById.get(
  "add.interaction.world_action.world_action.explore_base",
)
assert.equal(explore.enabled, true)
assert.equal(explore.requiredZoneId, "add.zone.base")
assert.deepEqual(addCommandForGameInteraction(explore), {
  kind: "start_world_action",
  actionId: "world_action.explore_base",
})
assert.deepEqual(workerRequestForAddCommand(addCommandForGameInteraction(explore)), {
  type: "startWorldAction",
  actionId: "world_action.explore_base",
})

const storyChoice = interactionsById.get(
  "add.interaction.story_choice.story.beat.road_to_base.accept",
)
assert.deepEqual(workerRequestForAddCommand(addCommandForGameInteraction(storyChoice)), {
  type: "chooseStoryOption",
  beatId: "story.beat.road_to_base",
  optionId: "accept",
})

const assignHero = interactionsById.get("add.interaction.assign_hero")
assert.deepEqual(workerRequestForAddCommand(addCommandForGameInteraction(assignHero)), {
  type: "assignHero",
  assigned: true,
})

const recruit = interactionsById.get("add.interaction.recruit_survivor")
assert.equal(recruit.enabled, true)
assert.deepEqual(workerRequestForAddCommand(addCommandForGameInteraction(recruit)), {
  type: "recruitFromSurvivorCave",
})

const ui = selectAddUiState(snapshot, catalog)
assert.equal(ui.resources.find((resource) => resource.id === "resource.bassline").value, 12)
assert.equal(ui.resources.find((resource) => resource.id === "resource.bassline").cap, 100)
assert.equal(ui.objective.recruitmentEnabled, true)
assert.equal(ui.activeStoryBeat.id, "story.beat.road_to_base")
assert.equal(
  ui.availableWorldActions.find((action) => action.id === "world_action.explore_base").enabled,
  true,
)
assert.equal(
  ui.availableWorldActions.find((action) => action.id === "world_action.hero_only").enabled,
  false,
)

function createCatalogFixture() {
  return {
    resources: [
      resource("resource.bassline", "Bassline", "band", 100),
      resource("resource.chorus", "Chorus", "band", 50),
      resource("resource.harmonics", "Harmonics", "band", 30),
      resource("resource.water", "Water", "material", 20),
      resource("resource.vibes", "Vibes", "run_scoped_pool", 10),
    ],
    roles: [],
    stations: [],
    constructionOptions: [],
    processingRecipes: [],
    worldActions: [
      worldAction("world_action.explore_base", "Explore base", false),
      worldAction("world_action.hero_only", "Hero-only run", true),
    ],
    storyBeats: [
      {
        id: "story.beat.road_to_base",
        schemaId: "story.beat.road_to_base",
        label: "Road to Base",
        body: "Choose how to enter.",
        arc: "intro",
        sequence: 1,
        worldActionId: null,
        choices: [{ id: "accept", label: "Enter", response: "You step forward." }],
        relatedIds: [],
      },
    ],
    flags: [],
    models: [],
    flora: [
      {
        id: "flora.reeds",
        schemaId: "flora.reeds",
        label: "Reeds",
        kind: "reeds",
        tags: ["harvestable"],
      },
    ],
    structures: [
      {
        id: "structure.crystal_circle",
        schemaId: "structure.crystal_circle",
        label: "Crystal Circle",
        kind: "crystal_circle",
        tags: ["base"],
      },
      {
        id: "structure.cave",
        schemaId: "structure.cave",
        label: "Survivor Cave",
        kind: "cave",
        tags: ["landmark", "recruitment_source"],
      },
    ],
    tiles: [
      tile("tile.base_core", "Base Core", "plains", "base", false, [], [
        "structure.crystal_circle",
      ]),
      tile("tile.river_shallows", "River Shallows", "river", "none", false, [
        "flora.reeds",
      ]),
      tile("tile.mountain_wall", "Mountain Wall", "mountain", "none", true),
      tile("tile.survivor_cave", "Survivor Cave", "plains", "survivor_cave", false, [], [
        "structure.cave",
      ]),
      tile("tile.plains_open", "Open Plains", "plains", "none", false),
    ],
    entitySchemas: [],
    uiElements: [],
    balance: {},
  }
}

function createSnapshotFixture() {
  return {
    schemaVersion: 1,
    clockSeconds: 42,
    resources: {
      bassline: 12,
      basslineCap: 100,
      chorus: 4,
      chorusCap: 50,
      harmonics: 2,
      harmonicsCap: 30,
      stone: 0,
      stoneCap: 10,
      baseStoneStock: 0,
      water: 6,
      waterCap: 20,
      baseWaterStock: 2,
      vibes: 1,
      vibesCap: 10,
      lifetimeGenerated: 20,
      lifetimeSpent: 8,
    },
    roster: {
      heroAssigned: false,
      heroRoleId: "role.crystal_bassline",
      totalCrew: 0,
      crewByRole: {},
    },
    heroProgress: {},
    heroSurvival: {
      sustain: 1,
      viralLoadRatio: 0.1,
      location: "studio",
    },
    narrative: {
      activeBeatId: "story.beat.road_to_base",
      completedBeatIds: [],
      choiceByBeat: {},
    },
    crystalCircle: {},
    processing: {},
    base: {},
    power: {},
    stations: {},
    recruitment: {},
    bubble: {
      stabilizedHexes: 2,
    },
    objectives: {
      reachObjectiveTarget: 2,
      reachObjectiveMet: true,
      survivorCaveDistance: 2,
      recruitmentRangeTiles: 2,
      recruitmentEnabled: true,
      survivorCaveInBubble: true,
    },
    hexes: [
      hex(0, 0, 0, "tile.base_core", "stabilized", 1),
      hex(1, -1, 1, "tile.river_shallows", "converting", 0.4),
      hex(-1, 1, 1, "tile.mountain_wall", "blocked", 0),
      hex(2, -1, 2, "tile.survivor_cave", "stabilized", 1),
      hex(1, 0, 1, "tile.plains_open", "inactive", 0),
    ],
    activeConstruction: null,
    activeWorldAction: null,
    notes: ["Fixture snapshot"],
  }
}

function resource(id, label, category, baseCap) {
  return {
    id,
    schemaId: id,
    label,
    category,
    baseCap,
    capBehavior: "overflow_lost",
    startsAt: 0,
  }
}

function worldAction(id, label, heroOnly) {
  return {
    id,
    schemaId: id,
    label,
    durationSeconds: 15,
    heroOnly,
    offlineProgress: true,
    heroExposure: "studio",
    returnToBubbleSeconds: 0,
    returnToStudioSeconds: 0,
    requirements: [],
    effects: [],
    uiOrder: 1,
  }
}

function tile(
  id,
  label,
  terrain,
  feature,
  isBlocker,
  floraIds = [],
  structureIds = [],
) {
  return {
    id,
    schemaId: id,
    label,
    terrain,
    feature,
    impedance: isBlocker ? 99 : 1,
    isBlocker,
    tags: isBlocker ? ["blocker"] : ["open_ground"],
    floraIds,
    structureIds,
    buildingCapacity: isBlocker ? 0 : 1,
  }
}

function hex(q, r, distance, tileId, state, progress) {
  return {
    q,
    r,
    distance,
    tileId,
    state,
    progress,
  }
}
