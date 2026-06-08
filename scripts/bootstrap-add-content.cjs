#!/usr/bin/env node
// One-time bootstrap: emit a TS content module for a catalog from the captured
// catalog snapshot (the golden JSON), so large/nested catalogs don't have to be
// hand-transcribed. After bootstrapping, the TS module is the source of truth and
// `content:build` codegens the Rust back from it (golden-verified round-trip).
//
//   node scripts/bootstrap-add-content.cjs <catalogKey> <CONST_NAME> <tsRelPath> <TsType>
//   e.g. ... uiElements UI_ELEMENTS packages/add-domain/src/content/ui-elements.ts UiElementDef

const fs = require("node:fs")
const path = require("node:path")

const ROOT = path.resolve(__dirname, "..")
const [, , key, constName, tsRel, tsType] = process.argv
if (!key || !constName || !tsRel || !tsType) {
  console.error("usage: bootstrap-add-content.cjs <catalogKey> <CONST_NAME> <tsRelPath> <TsType>")
  process.exit(1)
}

const golden = require(path.join(ROOT, "crates/add-core/tests/golden/catalog.json"))
const data = golden[key]
if (!Array.isArray(data)) {
  console.error(`catalog key "${key}" is not an array in the golden snapshot`)
  process.exit(1)
}

const body = `import type { ${tsType} } from "../runtime/protocol"

// Bootstrapped from the catalog snapshot, then owned here as the source of truth.
// \`content:build\` codegens the Rust catalog from this module.
export const ${constName}: readonly ${tsType}[] = ${JSON.stringify(data, null, 2)}
`
fs.writeFileSync(path.join(ROOT, tsRel), body)
console.log(`[bootstrap] wrote ${tsRel} (${data.length} entries)`)
