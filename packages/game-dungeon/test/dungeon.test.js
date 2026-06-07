const assert = require("node:assert")
const {
  compileDungeon,
  validateDungeonBlueprint,
  dungeonEntranceCoord,
} = require("../dist/index.js")
const { validateGameWorld } = require("../../game-world/dist/index.js")

const blueprint = {
  id: "test.dungeon.demo",
  label: "Demo Dungeon",
  grid: [
    "#####",
    "#>.E#",
    "#...#",
    "#####",
  ],
  legend: {
    "#": { kind: "wall" },
    ".": { kind: "floor" },
    ">": {
      kind: "floor",
      entrance: true,
      feature: "entrance",
      link: { idSuffix: "exit", kind: "map", targetMapId: "test.overworld", label: "Leave" },
    },
    E: {
      kind: "floor",
      feature: "creature",
      entity: {
        idSuffix: "rat",
        label: "Rat",
        kind: "creature",
        visualFootprint: { unit: "cell", width: 0.3, height: 0.3 },
        sourceId: "rat",
      },
    },
  },
  rooms: [{ id: "test.dungeon.demo.room", label: "Main Room", chars: ".>E" }],
}

// Blueprint validation passes for a well-formed blueprint.
assert.deepEqual(validateDungeonBlueprint(blueprint), { valid: true, errors: [] })

// Entrance lookup.
assert.deepEqual(dungeonEntranceCoord(blueprint), { kind: "square", x: 1, y: 1 })

const map = compileDungeon(blueprint)

// Topology + bounds derived from the grid.
assert.equal(map.id, "test.dungeon.demo")
assert.equal(map.topology.kind, "square")
assert.equal(map.topology.bounds.width, 5)
assert.equal(map.topology.bounds.height, 4)
assert.equal(map.metadata.entranceX, 1)
assert.equal(map.metadata.entranceY, 1)

// Layers: terrain has every cell, collision only the walls.
const terrain = map.layers.find((layer) => layer.kind === "terrain")
const collision = map.layers.find((layer) => layer.kind === "collision")
assert.equal(terrain.cells.length, 20)
const wallCount = terrain.cells.filter((cell) => cell.blocked).length
assert.equal(collision.cells.length, wallCount)
assert.ok(wallCount > 0, "demo dungeon should have walls")

// Entities are coord-suffixed; the entrance auto-entity and a sub-tile creature.
assert.ok(map.entities.some((entity) => entity.id === "test.dungeon.demo.entity.entrance.1.1"))
const rat = map.entities.find((entity) => entity.id === "test.dungeon.demo.entity.rat.3.1")
assert.ok(rat, "rat creature entity should exist at its coord")
assert.equal(rat.kind, "creature")
assert.deepEqual(rat.visualFootprint, { unit: "cell", width: 0.3, height: 0.3 })

// The exit link rides on the entrance cell.
const entranceCell = terrain.cells.find((cell) => cell.coord.x === 1 && cell.coord.y === 1)
assert.ok(entranceCell.links && entranceCell.links.length === 1)
assert.equal(entranceCell.links[0].targetMapId, "test.overworld")

// Room zone collected the floor glyphs.
assert.equal(map.zones.length, 1)
assert.ok(map.zones[0].cells.length > 0)

// The compiled map is a structurally valid GameWorld.
const validation = validateGameWorld({
  id: "test.world",
  activeMapId: map.id,
  maps: [map],
})
assert.ok(
  validation.valid,
  `compiled dungeon should be a valid GameWorld: ${validation.errors.join(", ")}`,
)

// Validation catches a malformed blueprint (unknown glyph, no entrance).
const bad = validateDungeonBlueprint({
  id: "",
  grid: ["#?#", "###"],
  legend: { "#": { kind: "wall" } },
})
assert.equal(bad.valid, false)
assert.ok(bad.errors.length > 0)

console.log("game-dungeon: all assertions passed")
