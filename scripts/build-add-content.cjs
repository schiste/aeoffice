#!/usr/bin/env node
// Content pipeline: codegen Rust catalog `const` arrays from the authored TS
// content modules (the single source of truth in packages/add-domain/src/content).
// Mirrors scripts/build-internal-office-atlas.cjs: a deterministic generator with
// a `--check` mode (used by `content:check`) that fails if the checked-in Rust has
// drifted. Data equivalence across a migration is guarded separately by the Rust
// `catalog_snapshot_matches_golden` test.
//
//   node scripts/build-add-content.cjs           # regenerate the Rust files
//   node scripts/build-add-content.cjs --check    # verify, do not write

const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { execFileSync } = require("node:child_process")

const ROOT = path.resolve(__dirname, "..")
const CHECK = process.argv.includes("--check")
const PREAMBLE = "use crate::game_data::*;"

function resolveRustfmt() {
  for (const candidate of ["rustfmt", path.join(os.homedir(), ".cargo", "bin", "rustfmt")]) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" })
      return candidate
    } catch {
      // try next
    }
  }
  throw new Error("rustfmt not found (install via `rustup component add rustfmt`).")
}

// Build the content source so we can require its compiled output.
execFileSync(path.join(ROOT, "node_modules", ".bin", "tsc"), ["-b", "packages/add-domain"], {
  cwd: ROOT,
  stdio: "inherit",
})

const { toRustConst } = require(path.join(ROOT, "packages/game-content/dist/index.js"))
const content = (name) => require(path.join(ROOT, "packages/add-domain/dist/content", `${name}.js`))
const resources = content("resources")
const roles = content("roles")
const flags = content("flags")
const flora = content("flora")
const structures = content("structures")
const tiles = content("tiles")
const stations = content("stations")
const construction = content("construction")
const worldActions = content("world-actions")
const processing = content("processing")

const VIS = "pub(in crate::game_data)"

// Reusable: a `requirements: &[RequirementDef]` field (tuple-variant enum).
const REQUIREMENTS_FIELD = {
  name: "requirements",
  kind: "array",
  element: {
    name: "req",
    kind: "taggedEnum",
    rustEnum: "RequirementDef",
    variants: {
      flag_set: { variant: "FlagSet", tuple: [{ name: "flag", from: "flag_id", kind: "idConst", prefix: "FLAG_" }] },
      flag_unset: { variant: "FlagUnset", tuple: [{ name: "flag", from: "flag_id", kind: "idConst", prefix: "FLAG_" }] },
    },
  },
}

// Reusable: cost / duration / effects (kind-tagged Rust enums). Cross-catalog id
// references (resource_id, item_id) emit as string literals (value-equivalent,
// dodges irregular id-const names like COST_ITEM_SKIN); flag ids stay id-consts.
const COST_FIELD = {
  name: "cost",
  kind: "taggedEnum",
  rustEnum: "CostDef",
  variants: {
    upfront: { variant: "Upfront", fields: [{ name: "resource_id", from: "resource_id", kind: "string" }, { name: "amount", kind: "f64" }] },
    upfront_bundle: {
      variant: "UpfrontBundle",
      fields: [
        {
          name: "costs",
          kind: "array",
          element: { name: "c", kind: "struct", structType: "CostItemDef", fields: [{ name: "item_id", from: "item_id", kind: "string" }, { name: "amount", kind: "f64" }] },
        },
      ],
    },
    drain_per_worker_second: { variant: "DrainPerWorkerSecond", fields: [{ name: "resource_id", from: "resource_id", kind: "string" }, { name: "amount", kind: "f64" }] },
    time_only: { variant: "TimeOnly" },
  },
}

const DURATION_FIELD = {
  name: "duration",
  kind: "taggedEnum",
  rustEnum: "DurationDef",
  variants: {
    fixed: { variant: "Fixed", fields: [{ name: "seconds", kind: "f64" }] },
    crystal_level_scaled: {
      variant: "CrystalLevelScaled",
      fields: [
        { name: "track", kind: "enum", rustEnum: "CrystalTrack" },
        { name: "base_seconds", from: "base_seconds", kind: "f64" },
        { name: "per_level_seconds", from: "per_level_seconds", kind: "f64" },
      ],
    },
  },
}

const EFFECTS_FIELD = {
  name: "effects",
  kind: "array",
  element: {
    name: "eff",
    kind: "taggedEnum",
    rustEnum: "EffectDef",
    variants: {
      set_flag: { variant: "SetFlag", fields: [{ name: "flag_id", from: "flag_id", kind: "idConst", prefix: "FLAG_" }, { name: "value", kind: "bool" }] },
      add_bunks: { variant: "AddBunks", fields: [{ name: "amount", kind: "i64" }] },
      add_skins: { variant: "AddSkins", fields: [{ name: "amount", kind: "i64" }] },
      increment_crystal_track: { variant: "IncrementCrystalTrack", fields: [{ name: "track", kind: "enum", rustEnum: "CrystalTrack" }, { name: "amount", kind: "i64" }] },
      increment_processing_track: { variant: "IncrementProcessingTrack", fields: [{ name: "track", kind: "enum", rustEnum: "ProcessingTrack" }, { name: "amount", kind: "i64" }] },
    },
  },
}

// One entry per generated Rust file. A file may hold several catalogs (consts);
// each maps authored TS data → a Rust `const` array via a shape descriptor.
const FILES = [
  {
    sourceModule: "packages/add-domain/src/content/resources.ts",
    rustPath: "crates/add-core/src/game_data/catalog/resources.rs",
    consts: [
      {
        entries: resources.RESOURCES,
        spec: {
          constName: "RESOURCES",
          rustType: "ResourceDef",
          visibility: VIS,
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
      },
    ],
  },
  {
    sourceModule: "packages/add-domain/src/content/roles.ts",
    rustPath: "crates/add-core/src/game_data/catalog/roles.rs",
    consts: [
      {
        entries: roles.ROLES,
        spec: {
          constName: "ROLES",
          rustType: "RoleDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "idConst" },
            { name: "schema_id", kind: "idConst" },
            { name: "label", kind: "string" },
            { name: "slot_pool", kind: "enum", rustEnum: "RoleSlotPool" },
            { name: "hero_allowed", kind: "bool" },
            { name: "crew_allowed", kind: "bool" },
            { name: "max_crew_slots", kind: "option", inner: "i64" },
            { name: "ui_section", kind: "string" },
            { name: "ui_order", kind: "i64" },
          ],
        },
      },
    ],
  },
  {
    sourceModule: "packages/add-domain/src/content/flags.ts",
    rustPath: "crates/add-core/src/game_data/catalog/flags.rs",
    consts: [
      {
        entries: flags.FLAGS,
        spec: {
          constName: "FLAGS",
          rustType: "FlagDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "idConst", prefix: "FLAG_" },
            { name: "label", kind: "string" },
            { name: "group", kind: "string" },
          ],
        },
      },
    ],
  },
  {
    sourceModule: "packages/add-domain/src/content/{flora,structures,tiles}.ts",
    rustPath: "crates/add-core/src/game_data/catalog/tiles.rs",
    consts: [
      {
        entries: flora.FLORA,
        spec: {
          constName: "FLORA",
          rustType: "FloraDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "idConst" },
            { name: "schema_id", kind: "idConst" },
            { name: "label", kind: "string" },
            { name: "kind", kind: "enum", rustEnum: "FloraKind" },
            { name: "tags", kind: "enumArray", rustEnum: "TileTag" },
          ],
        },
      },
      {
        entries: structures.STRUCTURES,
        spec: {
          constName: "STRUCTURES",
          rustType: "StructureDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "idConst" },
            { name: "schema_id", kind: "idConst" },
            { name: "label", kind: "string" },
            { name: "kind", kind: "enum", rustEnum: "StructureKind" },
            { name: "tags", kind: "enumArray", rustEnum: "TileTag" },
          ],
        },
      },
      {
        entries: tiles.TILES,
        spec: {
          constName: "TILES",
          rustType: "TileDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "idConst" },
            { name: "schema_id", kind: "idConst" },
            { name: "label", kind: "string" },
            { name: "terrain", kind: "enum", rustEnum: "TerrainSnapshot" },
            { name: "feature", kind: "enum", rustEnum: "TileFeature" },
            { name: "impedance", kind: "f64" },
            { name: "is_blocker", kind: "bool" },
            { name: "tags", kind: "enumArray", rustEnum: "TileTag" },
            { name: "flora_ids", kind: "idConstArray" },
            { name: "structure_ids", kind: "idConstArray" },
            { name: "dungeon_ids", kind: "idConstArray" },
            { name: "building_capacity", kind: "i64" },
          ],
        },
      },
    ],
  },
  {
    sourceModule: "packages/add-domain/src/content/stations.ts",
    rustPath: "crates/add-core/src/game_data/catalog/stations.rs",
    consts: [
      {
        entries: stations.STATIONS,
        spec: {
          constName: "STATIONS",
          rustType: "StationDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "idConst" },
            { name: "schema_id", kind: "idConst" },
            { name: "label", kind: "string" },
            { name: "category", kind: "enum", rustEnum: "StationCategory" },
            { name: "chorus_upkeep_per_second", kind: "f64" },
            { name: "manual_power", kind: "bool" },
            { name: "starts_requested", kind: "bool" },
            REQUIREMENTS_FIELD,
            { name: "ui_order", kind: "i64" },
          ],
        },
      },
    ],
  },
  {
    sourceModule: "packages/add-domain/src/content/{construction,world-actions,processing}.ts",
    rustPath: "crates/add-core/src/game_data/catalog/actions.rs",
    consts: [
      {
        entries: construction.CONSTRUCTION_OPTIONS,
        spec: {
          constName: "CONSTRUCTION_OPTIONS",
          rustType: "ConstructionOptionDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "idConst" },
            { name: "schema_id", kind: "idConst" },
            { name: "label", kind: "string" },
            { name: "group", kind: "enum", rustEnum: "ConstructionGroup" },
            COST_FIELD,
            DURATION_FIELD,
            REQUIREMENTS_FIELD,
            EFFECTS_FIELD,
            { name: "ui_order", kind: "i64" },
          ],
        },
      },
      {
        entries: worldActions.WORLD_ACTIONS,
        spec: {
          constName: "WORLD_ACTIONS",
          rustType: "WorldActionDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "idConst" },
            { name: "schema_id", kind: "idConst" },
            { name: "label", kind: "string" },
            { name: "duration_seconds", kind: "f64" },
            { name: "hero_only", kind: "bool" },
            { name: "offline_progress", kind: "bool" },
            { name: "hero_exposure", kind: "enum", rustEnum: "HeroExposureDef" },
            { name: "return_to_bubble_seconds", kind: "f64" },
            { name: "return_to_studio_seconds", kind: "f64" },
            REQUIREMENTS_FIELD,
            EFFECTS_FIELD,
            { name: "ui_order", kind: "i64" },
          ],
        },
      },
      {
        entries: processing.PROCESSING_RECIPES,
        spec: {
          constName: "PROCESSING_RECIPES",
          rustType: "ProcessingRecipeDef",
          visibility: VIS,
          fields: [
            { name: "id", kind: "idConst" },
            { name: "schema_id", kind: "idConst" },
            { name: "label", kind: "string" },
            { name: "station_id", kind: "string" },
            COST_FIELD,
            DURATION_FIELD,
            REQUIREMENTS_FIELD,
            EFFECTS_FIELD,
            { name: "max_level", kind: "i64" },
            { name: "ui_order", kind: "i64" },
          ],
        },
      },
    ],
  },
]

const rustfmt = resolveRustfmt()

function generate(file) {
  const header = [
    `// @generated by \`npm run content:build\` from ${file.sourceModule}.`,
    "// Do not edit by hand; edit the TS source and re-run the generator.",
  ].join("\n")
  const blocks = file.consts.map((c) => toRustConst(c.spec, c.entries))
  const raw = [header, "", PREAMBLE, "", blocks.join("\n")].join("\n")
  const tmp = path.join(os.tmpdir(), `add-content-${path.basename(file.rustPath)}`)
  fs.writeFileSync(tmp, raw)
  execFileSync(rustfmt, [tmp], { stdio: "ignore" })
  const formatted = fs.readFileSync(tmp, "utf8")
  fs.unlinkSync(tmp)
  return formatted
}

let drift = 0
for (const file of FILES) {
  const formatted = generate(file)
  const target = path.join(ROOT, file.rustPath)
  const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null
  if (CHECK) {
    if (current !== formatted) {
      drift += 1
      console.error(`[content:check] DRIFT: ${file.rustPath} is out of date with its TS source`)
    }
  } else if (current !== formatted) {
    fs.writeFileSync(target, formatted)
    console.log(`[content:build] wrote ${file.rustPath}`)
  } else {
    console.log(`[content:build] up to date: ${file.rustPath}`)
  }
}

if (CHECK && drift > 0) {
  console.error(`[content:check] ${drift} file(s) drifted; run \`npm run content:build\`.`)
  process.exit(1)
}
