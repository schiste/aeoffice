const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")

const ROOT_DIR = path.resolve(__dirname, "..")

function main() {
  const packageJson = readJson("package.json")
  const verifyTargetStack = readText("scripts/verify-target-stack.sh")

  assert.equal(
    packageJson.scripts.check,
    "scripts/verify-target-stack.sh",
    "npm run check must remain the full target-stack verification gate.",
  )
  assertScript(packageJson, "smoke:office", "scripts/frontend-smoke.test.cjs")
  assertScript(packageJson, "smoke:rpg", "@aedventure/rpg-idle-demo")
  assertScript(packageJson, "smoke:engine-sandbox", "@aedventure/engine-sandbox")
  assertScript(packageJson, "smoke:add-rpg", "@aedventure/add-rpg")
  assertScript(packageJson, "smoke:office:built", "scripts/frontend-smoke.test.cjs")
  assertScript(packageJson, "smoke:rpg:built", "scripts/rpg-idle-demo-smoke.test.cjs")
  assertScript(packageJson, "smoke:engine-sandbox:built", "scripts/engine-sandbox-smoke.test.cjs")
  assertScript(packageJson, "smoke:add-rpg:built", "scripts/add-rpg-smoke.test.cjs")
  assertScript(packageJson, "smoke:apps", "smoke:add-rpg")
  assertScript(packageJson, "qa:renderer", "scripts/renderer-qa.test.cjs")
  assertScript(packageJson, "qa:multi-app", "scripts/multi-app-qa-contracts.test.cjs")

  assertStackStep(verifyTargetStack, "node \"$ROOT_DIR/scripts/build-add-rpg-wasm.cjs\"")
  assertStackStep(verifyTargetStack, "cargo check --manifest-path \"$ROOT_DIR/Cargo.toml\"")
  assertStackStep(verifyTargetStack, "npm run qa:multi-app")
  assertStackStep(verifyTargetStack, "npm --workspace @aedventure/web run build:browser")
  assertStackStep(verifyTargetStack, "npm --workspace @aedventure/rpg-idle-demo run build:browser")
  assertStackStep(verifyTargetStack, "npm --workspace @aedventure/engine-sandbox run build:browser")
  assertStackStep(verifyTargetStack, "npm --workspace @aedventure/add-rpg run build:browser")
  assertStackStep(verifyTargetStack, "npm run smoke:rpg:built")
  assertStackStep(verifyTargetStack, "npm run smoke:engine-sandbox:built")
  assertStackStep(verifyTargetStack, "npm run smoke:add-rpg:built")
  assertStackStep(verifyTargetStack, "npm run smoke:office:built")
  assertStackStep(verifyTargetStack, "npm run qa:renderer:built")

  assertScreenshotContract("scripts/frontend-smoke.test.cjs", [
    "assertNonBlankImageBuffer",
    "office map screenshot",
  ])
  assertScreenshotContract("scripts/rpg-idle-demo-smoke.test.cjs", [
    "assertNonBlankImageBuffer",
    "rpg-idle-demo-smoke.png",
  ])
  assertScreenshotContract("scripts/engine-sandbox-smoke.test.cjs", [
    "assertNonBlankImageBuffer",
    "engine-sandbox-smoke.png",
    "squareRendered",
    "hexRendered",
  ])
  assertScreenshotContract("scripts/add-rpg-smoke.test.cjs", [
    "assertNonBlankImageBuffer",
    "add-rpg-map-smoke.png",
    "add-rpg-dungeon-map-smoke.png",
    "mapMode?.topology === \"square\"",
    "mapMode?.topology === \"hex\"",
  ])
  assertScreenshotContract("scripts/renderer-qa.test.cjs", [
    "topologyChecks",
    "add-rpg-hex-renderer-fixture-canvas.png",
    "add-rpg-square-renderer-fixture-canvas.png",
    "Renderer QA must include a nonblank hex topology render.",
    "Renderer QA must include a nonblank square topology render.",
  ])

  console.log("Multi-app QA contract checks passed.")
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath))
}

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), "utf8")
}

function assertScript(packageJson, scriptName, expectedFragment) {
  assert.ok(
    packageJson.scripts[scriptName]?.includes(expectedFragment),
    `Expected package script ${scriptName} to include ${expectedFragment}.`,
  )
}

function assertStackStep(scriptText, expectedFragment) {
  assert.ok(
    scriptText.includes(expectedFragment),
    `Expected verify-target-stack.sh to include ${expectedFragment}.`,
  )
}

function assertScreenshotContract(relativePath, expectedFragments) {
  const scriptText = readText(relativePath)
  expectedFragments.forEach((fragment) => {
    assert.ok(
      scriptText.includes(fragment),
      `Expected ${relativePath} to include ${fragment}.`,
    )
  })
}

main()
