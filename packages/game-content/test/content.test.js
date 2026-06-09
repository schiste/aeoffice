const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")
const {
  validateContentCatalog,
  idConstName,
  toRustConst,
} = require("../dist/index.js")

// Engine-neutral: no app/domain terms in the source.
const src = fs.readFileSync(path.resolve(__dirname, "../src/index.ts"), "utf8")
for (const forbidden of ["dungeon", "Phaser", "office", "studio", "hero", "fog", "bassline", "chorus"]) {
  assert.ok(
    !new RegExp(`\\b${forbidden}\\b`, "i").test(src),
    `game-content must stay neutral; found "${forbidden}"`,
  )
}
// Case-sensitive: the domain token "ADD", not the lowercase Set.add() method.
assert.ok(!/\bADD\b/.test(src), 'game-content must stay neutral; found "ADD"')

// Validation: unique/non-empty ids, optional reference resolution.
assert.equal(validateContentCatalog({ kind: "item", entries: [{ id: "a" }, { id: "b" }] }).valid, true)
const dup = validateContentCatalog({ kind: "item", entries: [{ id: "a" }, { id: "a" }] })
assert.equal(dup.valid, false)
assert.ok(dup.errors[0].includes("duplicate"))
assert.equal(validateContentCatalog({ kind: "item", entries: [{ id: "" }] }).valid, false)
const refs = validateContentCatalog(
  { kind: "loot", entries: [{ id: "x", itemId: "item.gold" }] },
  { references: [{ field: "itemId", into: new Set(["item.silver"]) }] },
)
assert.equal(refs.valid, false)

assert.equal(idConstName("resource.bassline"), "RESOURCE_BASSLINE")
assert.equal(idConstName("role.crystal_bassline"), "ROLE_CRYSTAL_BASSLINE")

// Rust emitter golden: compact literal that rustfmt will reflow canonically.
const rust = toRustConst(
  {
    constName: "RESOURCES",
    rustType: "ResourceDef",
    visibility: "pub(in crate::game_data)",
    preamble: "use crate::game_data::*;",
    fields: [
      { name: "id", kind: "idConst" },
      { name: "schema_id", kind: "idConst" },
      { name: "label", kind: "string" },
      { name: "category", kind: "enum", rustEnum: "ResourceCategory" },
      { name: "base_cap", kind: "f64" },
      { name: "cap_behavior", kind: "enum", rustEnum: "CapBehavior" },
      { name: "starts_at", kind: "f64" },
    ],
  },
  [
    {
      id: "resource.bassline",
      schemaId: "resource.bassline",
      label: "Bassline",
      category: "band",
      baseCap: 90,
      capBehavior: "overflow_lost",
      startsAt: 0,
    },
  ],
)
const expected = [
  "use crate::game_data::*;",
  "",
  "pub(in crate::game_data) const RESOURCES: &[ResourceDef] = &[",
  'ResourceDef { id: RESOURCE_BASSLINE, schema_id: RESOURCE_BASSLINE, label: "Bassline", category: ResourceCategory::Band, base_cap: 90.0, cap_behavior: CapBehavior::OverflowLost, starts_at: 0.0 },',
  "];",
  "",
].join("\n")
assert.equal(rust, expected)

// option kind: null -> None, value -> Some(inner-formatted)
const optRust = toRustConst(
  {
    constName: "X",
    rustType: "T",
    fields: [{ name: "max_crew_slots", kind: "option", inner: "i64" }],
  },
  [{ maxCrewSlots: null }, { maxCrewSlots: 2 }],
)
assert.ok(optRust.includes("T { max_crew_slots: None },"))
assert.ok(optRust.includes("T { max_crew_slots: Some(2) },"))

// array kinds: enumArray + idConstArray (+ empty)
const arrRust = toRustConst(
  {
    constName: "X",
    rustType: "T",
    fields: [
      { name: "tags", kind: "enumArray", rustEnum: "TileTag" },
      { name: "structure_ids", kind: "idConstArray" },
    ],
  },
  [
    { tags: ["water_source", "easy_propagation"], structureIds: ["structure.base"] },
    { tags: [], structureIds: [] },
  ],
)
assert.ok(arrRust.includes("tags: &[TileTag::WaterSource, TileTag::EasyPropagation]"))
assert.ok(arrRust.includes("structure_ids: &[STRUCTURE_BASE]"))
assert.ok(arrRust.includes("T { tags: &[], structure_ids: &[] },"))

// taggedEnum inside array: tuple-variant Rust enums (RequirementDef-like)
const reqRust = toRustConst(
  {
    constName: "X",
    rustType: "T",
    fields: [
      {
        name: "requirements",
        kind: "array",
        element: {
          name: "req",
          kind: "taggedEnum",
          rustEnum: "RequirementDef",
          variants: {
            flag_set: { variant: "FlagSet", tuple: [{ name: "flag", from: "flag_id", kind: "idConst", prefix: "FLAG_" }] },
          },
        },
      },
    ],
  },
  [{ requirements: [{ kind: "flag_set", flag_id: "base.fire_pit_built" }] }, { requirements: [] }],
)
assert.ok(reqRust.includes("requirements: &[RequirementDef::FlagSet(FLAG_BASE_FIRE_PIT_BUILT)]"))
assert.ok(reqRust.includes("T { requirements: &[] },"))

// encounter resolver: weighted pick + deterministic fixed spawns
const { rollEncounter, resolveEncounterSpawns } = require("../dist/index.js")
const encTable = { id: "t", entries: [{ creatureId: "rat", weight: 3 }, { creatureId: "giant_rat", weight: 1 }] }
assert.equal(rollEncounter(encTable, 0).creatureId, "rat")
assert.equal(rollEncounter(encTable, 0.9).creatureId, "giant_rat")
assert.equal(rollEncounter({ id: "e", entries: [] }, 0.5), undefined)
assert.deepEqual(
  resolveEncounterSpawns(encTable, 4).map((s) => s.creatureId),
  ["rat", "rat", "rat", "giant_rat"],
)
assert.equal(resolveEncounterSpawns(encTable, 1)[0].creatureId, "rat")

// loot tables: weighted pick, qty range, hash stability
const { rollLoot, lootDrop, hashUnit } = require("../dist/index.js")
const lootTable = {
  id: "l",
  entries: [
    { itemId: "scrap", weight: 3, min: 1, max: 3 },
    { itemId: "ration", weight: 1, min: 1, max: 1 },
  ],
}
assert.equal(rollLoot(lootTable, 0).itemId, "scrap")
assert.equal(rollLoot(lootTable, 0.95).itemId, "ration")
assert.equal(rollLoot({ id: "e", entries: [] }, 0.5), undefined)
assert.equal(lootDrop(lootTable, 0, 0).qty, 1)
assert.equal(lootDrop(lootTable, 0, 0.99).qty, 3)
assert.equal(lootDrop(lootTable, 0, 0.5).itemId, "scrap")
const h = hashUnit("dungeon.studio:12:6")
assert.ok(h >= 0 && h < 1)
assert.equal(h, hashUnit("dungeon.studio:12:6"))
assert.notEqual(hashUnit("a"), hashUnit("b"))

console.log("game-content: all assertions passed")
