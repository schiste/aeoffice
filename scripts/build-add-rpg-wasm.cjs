const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const ROOT_DIR = path.resolve(__dirname, "..")
const CRATE_DIR = path.join(ROOT_DIR, "crates/add-web-bindings")
const OUT_DIR = path.join(
  ROOT_DIR,
  "apps/add-rpg/src/generated/wasm/add-web-bindings",
)

function main() {
  const wasmPack = resolveWasmPack()

  fs.rmSync(OUT_DIR, { recursive: true, force: true })
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const result = spawnSync(
    wasmPack,
    [
      "build",
      CRATE_DIR,
      "--target",
      "web",
      "--release",
      "--out-dir",
      OUT_DIR,
      "--out-name",
      "runtime",
    ],
    {
      cwd: ROOT_DIR,
      env: buildEnvironment(),
      stdio: "inherit",
    },
  )

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function resolveWasmPack() {
  if (process.env.WASM_PACK) return process.env.WASM_PACK

  const cargoInstallPath = path.join(os.homedir(), ".cargo/bin/wasm-pack")
  if (fs.existsSync(cargoInstallPath)) return cargoInstallPath

  return "wasm-pack"
}

function buildEnvironment() {
  const cargoPath = resolveCargo()
  const pathEntries = (process.env.PATH ?? "")
    .split(path.delimiter)
    .filter((entry) => !entry.includes(`${path.sep}.chau7${path.sep}cto_bin`))

  const cargoDir = path.dirname(cargoPath)
  const nextPath = [cargoDir, ...pathEntries.filter((entry) => entry !== cargoDir)].join(
    path.delimiter,
  )

  return {
    ...process.env,
    CARGO: cargoPath,
    PATH: nextPath,
  }
}

function resolveCargo() {
  if (process.env.REAL_CARGO) return process.env.REAL_CARGO

  const stableCargoPath = path.join(
    os.homedir(),
    ".rustup/toolchains/stable-aarch64-apple-darwin/bin/cargo",
  )
  if (fs.existsSync(stableCargoPath)) return stableCargoPath

  const rustupCargoPath = path.join(os.homedir(), ".cargo/bin/cargo")
  if (fs.existsSync(rustupCargoPath)) return rustupCargoPath

  return "cargo"
}

main()
