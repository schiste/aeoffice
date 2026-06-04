const assert = require("node:assert")
const { PNG } = require("pngjs")

const SHARED_RENDERER_PACKAGE = "@aedventure/game-renderer-phaser"
const SHARED_ENGINE_PACKAGES = [
  "@aedventure/game-core",
  "@aedventure/game-assets",
  "@aedventure/game-map",
  "@aedventure/game-input",
  SHARED_RENDERER_PACKAGE,
]

function assertOfficeRenderGameContract(state) {
  assertCommonRenderGameContract(state, {
    app: "customer-virtual-office",
    domain: "@aedventure/office-domain",
  })
  assert.equal(typeof state.lifecycle?.rendererReadiness, "string")
  assert.equal(typeof state.layout?.mode, "string")
  assert.equal(typeof state.world?.joined, "boolean")
  assert.equal(typeof state.media?.tokenIssued, "boolean")
  assert.equal(typeof state.meeting?.panelState, "string")
  assert.equal(state.map?.renderer, "phaser")
  assert.equal(typeof state.map?.activeMapId, "string")
  assert.equal(state.mapValidation?.valid, true)
  assert.ok(Array.isArray(state.players), "Office app must expose players.")
}

function assertCommonRenderGameContract(state, options) {
  assert.equal(state.app, options.app)
  assert.match(
    state.coordinateSystem ?? "",
    /origin top-left.*x right.*y down/i,
    `${options.app} must expose an agent-readable coordinate system.`,
  )
  assert.equal(state.engineBoundary?.domain, options.domain)
  assert.equal(state.engineBoundary?.renderer, SHARED_RENDERER_PACKAGE)
  assert.deepEqual(state.engineBoundary?.uses, SHARED_ENGINE_PACKAGES)
  assert.equal(typeof state.engineBoundary?.importsOfficeDomain, "boolean")
  assert.equal(state.renderer?.requestedRenderer, "webgl")
  assert.equal(state.renderer?.mapValidation?.valid, true)
  assert.equal(typeof state.renderer?.performance, "object")
  assert.equal(typeof state.renderer?.viewport, "object")
}

function assertNonBlankImageBuffer(buffer, label, options = {}) {
  const image = PNG.sync.read(buffer)
  const stride = Math.max(
    4,
    Math.floor((image.width * image.height) / (options.sampleTarget ?? 20000)) * 4,
  )
  const colors = new Set()
  let minLuma = 255
  let maxLuma = 0
  let opaqueSamples = 0

  for (let offset = 0; offset < image.data.length; offset += stride) {
    const red = image.data[offset]
    const green = image.data[offset + 1]
    const blue = image.data[offset + 2]
    const alpha = image.data[offset + 3]

    if (alpha < (options.minAlpha ?? 16)) continue

    opaqueSamples += 1
    minLuma = Math.min(minLuma, red, green, blue)
    maxLuma = Math.max(maxLuma, red, green, blue)
    if (colors.size < 96) {
      colors.add(`${red >> 4}:${green >> 4}:${blue >> 4}`)
    }
  }

  const stats = {
    width: image.width,
    height: image.height,
    opaqueSamples,
    sampledUniqueColors: colors.size,
    luminanceRange: maxLuma - minLuma,
  }

  assert.ok(
    stats.width >= (options.minWidth ?? 300),
    `${label}: expected width >= ${options.minWidth ?? 300}, got ${stats.width}.`,
  )
  assert.ok(
    stats.height >= (options.minHeight ?? 220),
    `${label}: expected height >= ${options.minHeight ?? 220}, got ${stats.height}.`,
  )
  assert.ok(
    stats.opaqueSamples >= (options.minOpaqueSamples ?? 500),
    `${label}: expected enough opaque samples, got ${stats.opaqueSamples}.`,
  )
  assert.ok(
    stats.sampledUniqueColors >= (options.minUniqueColors ?? 4),
    `${label}: expected varied colors, got ${stats.sampledUniqueColors}.`,
  )
  assert.ok(
    stats.luminanceRange >= (options.minLuminanceRange ?? 24),
    `${label}: expected visible contrast, got ${stats.luminanceRange}.`,
  )

  return stats
}

module.exports = {
  SHARED_ENGINE_PACKAGES,
  assertNonBlankImageBuffer,
  assertOfficeRenderGameContract,
}
