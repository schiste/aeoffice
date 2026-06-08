// @aedventure/game-content — engine-neutral content authoring pipeline.
//
// Content (items, perks, quests, dialogue, encounter tables, and any other
// catalog) is authored as typed data, validated by a generic checker, and can be
// emitted to other build targets (e.g. generated Rust consts). Domain-neutral and
// renderer-agnostic: the engine gets a content vocabulary without app specifics;
// objects reference content by id.

export interface ContentEntry {
  readonly id: string
}

export interface ContentCatalog<T extends ContentEntry> {
  readonly kind: string
  readonly entries: readonly T[]
}

export interface ContentCatalogValidation {
  readonly valid: boolean
  readonly errors: readonly string[]
}

/** Validate a catalog: non-empty kind, present + unique ids, and (optionally)
 * that every `referenceField` value resolves against a known id set. */
export function validateContentCatalog<T extends ContentEntry>(
  catalog: ContentCatalog<T>,
  options: {
    readonly knownIds?: ReadonlySet<string>
    readonly references?: ReadonlyArray<{ readonly field: keyof T; readonly into: ReadonlySet<string> }>
  } = {},
): ContentCatalogValidation {
  const errors: string[] = []
  if (catalog.kind.trim() === "") errors.push("Catalog kind must not be empty.")
  const seen = new Set<string>()
  catalog.entries.forEach((entry, index) => {
    if (typeof entry.id !== "string" || entry.id.trim() === "") {
      errors.push(`${catalog.kind} entry ${index} has an empty id.`)
      return
    }
    if (seen.has(entry.id)) errors.push(`${catalog.kind}: duplicate id "${entry.id}".`)
    seen.add(entry.id)
    if (options.knownIds && !options.knownIds.has(entry.id)) {
      errors.push(`${catalog.kind}: id "${entry.id}" is not in the allowed id set.`)
    }
    for (const ref of options.references ?? []) {
      const value = entry[ref.field]
      if (typeof value === "string" && value !== "" && !ref.into.has(value)) {
        errors.push(`${catalog.kind} "${entry.id}": ${String(ref.field)} "${value}" does not resolve.`)
      }
    }
  })
  return { valid: errors.length === 0, errors }
}

// --- Neutral content vocabulary --------------------------------------------
// Minimal schemas for the named content kinds; apps extend/profile as needed.

export interface Item extends ContentEntry {
  readonly label: string
  readonly stackable?: boolean
  readonly maxStack?: number
  readonly tags?: readonly string[]
}

export interface Perk extends ContentEntry {
  readonly label: string
  readonly description?: string
  readonly requires?: readonly string[]
  readonly tags?: readonly string[]
}

export interface QuestStep {
  readonly id: string
  readonly label: string
  readonly detail?: string
}

export interface Quest extends ContentEntry {
  readonly label: string
  readonly steps: readonly QuestStep[]
}

export interface DialogueChoice {
  readonly id: string
  readonly label: string
  readonly response?: string
  readonly next?: string
}

export interface DialogueNode extends ContentEntry {
  readonly speaker?: string
  readonly body: string
  readonly choices?: readonly DialogueChoice[]
}

export interface EncounterChance {
  readonly creatureId: string
  readonly weight: number
  readonly min?: number
  readonly max?: number
}

export interface EncounterTable extends ContentEntry {
  readonly label?: string
  readonly entries: readonly EncounterChance[]
}

// --- Rust-literal emitter ---------------------------------------------------
// Emits a catalog as a generated Rust `const` array literal. Output is compact;
// run rustfmt afterwards for canonical formatting. The build step that uses this
// is what couples the (neutral) pipeline to a specific runtime.

export type RustFieldKind =
  | "string"
  | "idConst"
  | "f64"
  | "i64"
  | "u64"
  | "bool"
  | "enum"
  | "option"
  | "enumArray"
  | "idConstArray"

export interface RustFieldSpec {
  /** Rust field name (snake_case). */
  readonly name: string
  /** Source key on the data object; defaults to the camelCase of `name`. */
  readonly from?: string
  readonly kind: RustFieldKind
  /** Required when `kind` is "enum": the Rust enum type name. */
  readonly rustEnum?: string
  /** Required when `kind` is "option": the inner value's kind (null -> None). */
  readonly inner?: RustFieldKind
  /** For "idConst": prefix prepended to the derived const name (e.g. "FLAG_"). */
  readonly prefix?: string
}

export interface RustConstSpec {
  readonly constName: string
  readonly rustType: string
  readonly visibility?: string
  readonly fields: readonly RustFieldSpec[]
  readonly preamble?: string
  readonly header?: string
}

/** The id-const naming convention: "thing.some_name" -> "THING_SOME_NAME". */
export function idConstName(id: string): string {
  return id.toUpperCase().replace(/[.]/g, "_")
}

function camelCase(snake: string): string {
  return snake.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

function pascalCase(value: string): string {
  return value
    .split(/[_\s.]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("")
}

function rustF64(value: number): string {
  return Number.isInteger(value) ? `${value}.0` : String(value)
}

function rustFieldValue(spec: RustFieldSpec, raw: unknown): string {
  switch (spec.kind) {
    case "string":
      return JSON.stringify(String(raw))
    case "idConst":
      return `${spec.prefix ?? ""}${idConstName(String(raw))}`
    case "f64":
      return rustF64(Number(raw))
    case "i64":
    case "u64":
      return String(Math.trunc(Number(raw)))
    case "bool":
      return raw ? "true" : "false"
    case "enum":
      return `${spec.rustEnum}::${pascalCase(String(raw))}`
    case "option":
      return raw === null || raw === undefined
        ? "None"
        : `Some(${rustFieldValue({ ...spec, kind: spec.inner ?? "string" }, raw)})`
    case "enumArray": {
      const values = Array.isArray(raw) ? raw : []
      return `&[${values.map((v) => `${spec.rustEnum}::${pascalCase(String(v))}`).join(", ")}]`
    }
    case "idConstArray": {
      const values = Array.isArray(raw) ? raw : []
      return `&[${values.map((v) => `${spec.prefix ?? ""}${idConstName(String(v))}`).join(", ")}]`
    }
  }
}

export function toRustConst(
  spec: RustConstSpec,
  entries: readonly Record<string, unknown>[],
): string {
  const lines: string[] = []
  if (spec.header) lines.push(spec.header, "")
  if (spec.preamble) lines.push(spec.preamble, "")
  const visibility = spec.visibility ? `${spec.visibility} ` : ""
  lines.push(`${visibility}const ${spec.constName}: &[${spec.rustType}] = &[`)
  for (const entry of entries) {
    const fields = spec.fields
      .map((field) => `${field.name}: ${rustFieldValue(field, entry[field.from ?? camelCase(field.name)])}`)
      .join(", ")
    lines.push(`${spec.rustType} { ${fields} },`)
  }
  lines.push("];", "")
  return lines.join("\n")
}
