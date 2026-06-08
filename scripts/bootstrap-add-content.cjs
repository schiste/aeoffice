#!/usr/bin/env node
// One-time bootstrap: emit a TS content module for a catalog from the captured
// catalog snapshot (the golden JSON), so large/nested catalogs don't have to be
// hand-transcribed. After bootstrapping, the TS module is the source of truth and
// `content:build` codegens the Rust back from it (golden-verified round-trip).
//
//   node scripts/bootstrap-add-content.cjs <catalogKey> <CONST_NAME> <tsRelPath> <ImportType> [ConstType] [omitKey,omitKey]
//   e.g. ... uiElements UI_ELEMENTS .../ui-elements.ts UiElementDef
//   e.g. ... entitySchemas ENTITY_SCHEMAS .../entity-schemas.ts EntitySchemaDef 'Omit<EntitySchemaDef, "presentation" | "visibility">' presentation,visibility

const fs = require("node:fs")
const path = require("node:path")

const ROOT = path.resolve(__dirname, "..")
const [, , key, constName, tsRel, importType, constTypeArg, omitArg] = process.argv
if (!key || !constName || !tsRel || !importType) {
  console.error("usage: bootstrap-add-content.cjs <catalogKey> <CONST_NAME> <tsRelPath> <ImportType> [ConstType] [omitKey,omitKey]")
  process.exit(1)
}
const constType = constTypeArg || importType
// Optional top-level keys to drop (fields injected elsewhere, not authored here).
const omit = (omitArg || "").split(",").filter(Boolean)

const golden = require(path.join(ROOT, "crates/add-core/tests/golden/catalog.json"))
const raw = golden[key]
if (raw === undefined) {
  console.error(`catalog key "${key}" is missing from the golden snapshot`)
  process.exit(1)
}
const drop = (obj) => {
  if (!omit.length) return obj
  const copy = { ...obj }
  for (const k of omit) delete copy[k]
  return copy
}
const isArray = Array.isArray(raw)
const data = isArray ? raw.map(drop) : drop(raw)
const annotation = isArray ? `readonly ${constType}[]` : constType

const body = `import type { ${importType} } from "../runtime/protocol"

// Bootstrapped from the catalog snapshot, then owned here as the source of truth.
// \`content:build\` codegens the Rust catalog from this module.
export const ${constName}: ${annotation} = ${JSON.stringify(data, null, 2)}
`
fs.writeFileSync(path.join(ROOT, tsRel), body)
console.log(`[bootstrap] wrote ${tsRel} (${isArray ? `${data.length} entries` : "1 object"})`)
