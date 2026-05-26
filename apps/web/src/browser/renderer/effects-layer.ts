import Phaser from "phaser"

import { EFFECTS_AMBIENT_DEPTH } from "./constants"
import { isWebGLRenderer } from "./capability-reporter"
import type {
  FixtureMap,
  RendererEffectsDisableReason,
  RendererEffectsInfo,
  RendererEffectsOptions,
  RendererEffectsQuality,
  RendererResolvedEffectsQuality,
  RendererTenantLightingMode,
  RendererZoneInteractionState,
} from "./types"
import {
  ParticleEffectsPass,
  disabledParticleAppliedInfo,
  emptyParticleEffectsCounts,
  type ParticleEffectsCounts,
} from "./particle-effects"
import {
  ROOM_LIGHTING_SHADER_PASS,
  WebglEffectsPass,
  disabledShaderAppliedInfo,
  emptyWebglEffectsCounts,
  type WebglEffectsCounts,
} from "./webgl-effects"

interface MapRenderBounds {
  readonly width: number
  readonly height: number
}

interface EffectsCapability {
  readonly webglAvailable: boolean
  readonly contextLost: boolean
  readonly lowCapability: boolean
  readonly filtersAvailable: boolean
  readonly shadersAvailable: boolean
  readonly particlesAvailable: boolean
  readonly maxTextureSize?: number
}

interface EffectsObjectCounts {
  ambientShapes: number
  lightShapes: number
  shadowShapes: number
  shaderPasses: number
  shaderObjects: number
  shaderZoneUniforms: number
  particleEmitters: number
  particleTextures: number
  coffeeSteamEmitters: number
  plantMoteEmitters: number
  portalShimmerEmitters: number
  meetingZoneActivationEmitters: number
  entryTransitionEmitters: number
  particleAliveBudget: number
}

const MIN_EFFECTS_TEXTURE_SIZE = 1024

export class EffectsLayer {
  private requestedEnabled = true
  private requestedQuality: RendererEffectsQuality = "auto"
  private tenantLighting: RendererTenantLightingMode = "day"
  private lowCapabilityOverride = false
  private graphics?: Phaser.GameObjects.Graphics
  private readonly webglEffectsPass: WebglEffectsPass
  private readonly particleEffectsPass: ParticleEffectsPass
  private particleCounts: ParticleEffectsCounts = emptyParticleEffectsCounts()
  private filterControllers: Phaser.Filters.Controller[] = []
  private lastFixtureMap?: FixtureMap
  private lastBounds?: MapRenderBounds
  private info: RendererEffectsInfo = disabledEffectsInfo({
    requestedEnabled: true,
    requestedQuality: "auto",
    tenantLighting: "day",
    capability: emptyCapability(),
    disabledReason: "not_webgl",
  })

  constructor(private readonly scene: Phaser.Scene) {
    this.webglEffectsPass = new WebglEffectsPass(scene)
    this.particleEffectsPass = new ParticleEffectsPass(scene)
  }

  renderFixtureMap(
    fixtureMap: FixtureMap,
    bounds: MapRenderBounds,
  ): void {
    this.lastFixtureMap = fixtureMap
    this.lastBounds = bounds
    this.rebuild()
  }

  setOptions(options: RendererEffectsOptions): void {
    if (options.enabled !== undefined) {
      this.requestedEnabled = options.enabled
    }
    if (options.quality !== undefined) {
      this.requestedQuality = options.quality
    }
    if (options.tenantLighting !== undefined) {
      this.tenantLighting = options.tenantLighting
    }
    if (options.lowCapabilityOverride !== undefined) {
      this.lowCapabilityOverride = options.lowCapabilityOverride
    }
    this.rebuild()
  }

  clear(): void {
    this.destroyGraphics()
    this.webglEffectsPass.clear()
    this.particleEffectsPass.clear()
    this.particleCounts = emptyParticleEffectsCounts()
    this.destroyFilters()
  }

  getInfo(): RendererEffectsInfo {
    return this.info
  }

  setZoneInteractionState(state: RendererZoneInteractionState): void {
    const counts = this.particleEffectsPass.setZoneInteractionState(state)
    if (!counts) return

    this.particleCounts = counts
    this.info = {
      ...this.info,
      deterministic: counts.particleEmitters > 0 ? false : this.info.deterministic,
      animationMode:
        counts.particleEmitters > 0 ? "ambient_particles" : this.info.animationMode,
      applied: {
        ...this.info.applied,
        particleEffects: this.particleEffectsPass.effectNames(),
      },
      objectCounts: {
        ...this.info.objectCounts,
        ...counts,
      },
    }
  }

  private rebuild(): void {
    this.clear()
    const capability = this.detectCapability()
    const disabledReason = this.disabledReason(capability)
    const fixtureMap = this.lastFixtureMap
    const bounds = this.lastBounds

    if (disabledReason || !fixtureMap || !bounds) {
      this.info = disabledEffectsInfo({
        requestedEnabled: this.requestedEnabled,
        requestedQuality: this.requestedQuality,
        tenantLighting: this.tenantLighting,
        capability,
        disabledReason: disabledReason ?? "not_webgl",
      })
      return
    }

    const quality = this.resolvedQuality()
    const appliedFilters = this.applyCameraFilters(quality)
    const shaderCounts = capability.shadersAvailable
      ? this.webglEffectsPass.render({
          fixtureMap,
          bounds,
          quality,
          tenantLighting: this.tenantLighting,
        })
      : emptyWebglEffectsCounts()
    this.particleCounts = capability.particlesAvailable
      ? this.particleEffectsPass.render({
          fixtureMap,
          bounds,
          quality,
        })
      : emptyParticleEffectsCounts()
    const counts = this.drawStaticRoomPass(
      fixtureMap,
      bounds,
      quality,
      shaderCounts,
      this.particleCounts,
    )
    const shaderActive = shaderCounts.shaderPasses > 0
    const particlesActive = this.particleCounts.particleEmitters > 0
    this.info = {
      source: "renderer_runtime",
      authority: "visual_only",
      requested: {
        enabled: this.requestedEnabled,
        quality: this.requestedQuality,
        tenantLighting: this.tenantLighting,
      },
      enabled: true,
      quality,
      deterministic: !particlesActive,
      animationMode: particlesActive ? "ambient_particles" : "static",
      capability,
      applied: {
        webglFilters: appliedFilters,
        customWebglPipelines: this.webglEffectsPass.pipelineNames(),
        ambientEffects: [
          "ambient_tint",
          "tenant_lighting_tint",
          ...(shaderActive ? ["shader_floor_lighting"] : []),
        ],
        lightPass: quality === "premium" ? "static_room_lights" : "none",
        shadowPass: quality === "premium" ? "static_corner_shadows" : "none",
        shaderPass: shaderActive ? ROOM_LIGHTING_SHADER_PASS : "none",
        floorLighting: shaderActive ? "shader_floor_light_gradient" : "none",
        zoneGlow: shaderActive ? "custom_zone_glow_shader" : "none",
        softShadows: shaderActive ? "shader_vignette_soft_shadow" : "none",
        particleEffects: this.particleEffectsPass.effectNames(),
        selectionOutlines: "zone_renderer",
        hoverOutlines: "zone_renderer",
        tenantLighting: this.tenantLighting,
      },
      objectCounts: counts,
    }
  }

  private detectCapability(): EffectsCapability {
    const renderer = this.scene.game.renderer
    const webglAvailable = isWebGLRenderer(renderer)
    const gl = webglAvailable ? renderer.gl : undefined
    const maxTextureSize = gl?.getParameter(gl.MAX_TEXTURE_SIZE) as
      | number
      | undefined
    const contextLost = webglAvailable ? renderer.contextLost : false
    const lowCapability =
      this.lowCapabilityOverride ||
      !maxTextureSize ||
      maxTextureSize < MIN_EFFECTS_TEXTURE_SIZE

    return {
      webglAvailable,
      contextLost,
      lowCapability,
      filtersAvailable: this.cameraFiltersAvailable(),
      shadersAvailable: this.shaderGameObjectAvailable(webglAvailable),
      particlesAvailable: this.particlesGameObjectAvailable(webglAvailable),
      maxTextureSize,
    }
  }

  private shaderGameObjectAvailable(webglAvailable: boolean): boolean {
    return webglAvailable && typeof this.scene.add.shader === "function"
  }

  private particlesGameObjectAvailable(webglAvailable: boolean): boolean {
    return webglAvailable && typeof this.scene.add.particles === "function"
  }

  private cameraFiltersAvailable(): boolean {
    const filters = (
      this.scene.cameras.main as Phaser.Cameras.Scene2D.Camera & {
        filters?: {
          internal?: {
            addColorMatrix?: unknown
          }
        }
      }
    ).filters

    return typeof filters?.internal?.addColorMatrix === "function"
  }

  private disabledReason(
    capability: EffectsCapability,
  ): RendererEffectsDisableReason | undefined {
    if (!this.requestedEnabled || this.requestedQuality === "off") {
      return "forced_off"
    }
    if (!capability.webglAvailable) return "not_webgl"
    if (capability.contextLost) return "context_lost"
    if (capability.lowCapability) return "low_capability"
    return undefined
  }

  private resolvedQuality(): RendererResolvedEffectsQuality {
    if (this.requestedQuality === "low") return "low"
    if (this.requestedQuality === "premium") return "premium"
    return "premium"
  }

  private applyCameraFilters(
    quality: RendererResolvedEffectsQuality,
  ): readonly string[] {
    if (quality === "off" || !this.cameraFiltersAvailable()) return []

    try {
      const colorMatrix = this.scene.cameras.main.filters.internal.addColorMatrix()
      colorMatrix.active = true
      colorMatrix.colorMatrix.reset()
      colorMatrix.colorMatrix.brightness(
        this.tenantLighting === "night" ? 0.92 : 1,
      )
      colorMatrix.colorMatrix.saturate(
        this.tenantLighting === "tenant_theme" ? 1.06 : 1,
        true,
      )
      this.filterControllers.push(colorMatrix)
      return ["camera_color_matrix"]
    } catch {
      this.destroyFilters()
      return []
    }
  }

  private drawStaticRoomPass(
    fixtureMap: FixtureMap,
    bounds: MapRenderBounds,
    quality: RendererResolvedEffectsQuality,
    shaderCounts: WebglEffectsCounts = emptyWebglEffectsCounts(),
    particleCounts: ParticleEffectsCounts = emptyParticleEffectsCounts(),
  ): EffectsObjectCounts {
    const counts: EffectsObjectCounts = {
      ambientShapes: 0,
      lightShapes: 0,
      shadowShapes: 0,
      shaderPasses: shaderCounts.shaderPasses,
      shaderObjects: shaderCounts.shaderObjects,
      shaderZoneUniforms: shaderCounts.shaderZoneUniforms,
      particleEmitters: particleCounts.particleEmitters,
      particleTextures: particleCounts.particleTextures,
      coffeeSteamEmitters: particleCounts.coffeeSteamEmitters,
      plantMoteEmitters: particleCounts.plantMoteEmitters,
      portalShimmerEmitters: particleCounts.portalShimmerEmitters,
      meetingZoneActivationEmitters:
        particleCounts.meetingZoneActivationEmitters,
      entryTransitionEmitters: particleCounts.entryTransitionEmitters,
      particleAliveBudget: particleCounts.particleAliveBudget,
    }
    const palette = effectsPalette(fixtureMap.definition.style, this.tenantLighting)
    const graphics = this.scene.add.graphics()
    graphics.setDepth(EFFECTS_AMBIENT_DEPTH)

    graphics.fillStyle(palette.ambientColor, palette.ambientAlpha)
    graphics.fillRect(0, 0, bounds.width, bounds.height)
    counts.ambientShapes += 1

    if (quality === "premium") {
      this.drawStaticLights(graphics, fixtureMap, bounds, palette.lightColor, counts)
      this.drawCornerShadows(graphics, bounds, counts)
    }

    this.graphics = graphics
    return counts
  }

  private drawStaticLights(
    graphics: Phaser.GameObjects.Graphics,
    fixtureMap: FixtureMap,
    bounds: MapRenderBounds,
    color: number,
    counts: EffectsObjectCounts,
  ): void {
    const roomLightWidth = Math.min(bounds.width * 0.58, 520)
    const roomLightHeight = Math.min(bounds.height * 0.48, 360)
    graphics.fillStyle(color, this.tenantLighting === "night" ? 0.06 : 0.016)
    graphics.fillEllipse(
      bounds.width / 2,
      bounds.height / 2,
      roomLightWidth,
      roomLightHeight,
    )
    counts.lightShapes += 1

    fixtureMap.compiled.zones.slice(0, 4).forEach((zone) => {
      const centerX =
        ((zone.xStart + zone.xEnd) / 2) * fixtureMap.compiled.tileSize
      const centerY =
        ((zone.yStart + zone.yEnd) / 2) * fixtureMap.compiled.tileSize
      const width = Math.max(
        96,
        (zone.xEnd - zone.xStart) * fixtureMap.compiled.tileSize * 1.15,
      )
      const height = Math.max(
        72,
        (zone.yEnd - zone.yStart) * fixtureMap.compiled.tileSize * 1.2,
      )

      graphics.fillStyle(color, this.tenantLighting === "night" ? 0.024 : 0.009)
      graphics.fillEllipse(centerX, centerY, width, height)
      counts.lightShapes += 1
    })
  }

  private drawCornerShadows(
    graphics: Phaser.GameObjects.Graphics,
    bounds: MapRenderBounds,
    counts: EffectsObjectCounts,
  ): void {
    const horizontal = Math.min(96, bounds.width * 0.12)
    const vertical = Math.min(96, bounds.height * 0.12)

    graphics.fillStyle(0x17201d, this.tenantLighting === "night" ? 0.09 : 0.055)
    graphics.fillRect(0, 0, bounds.width, vertical)
    graphics.fillRect(0, bounds.height - vertical, bounds.width, vertical)
    graphics.fillRect(0, 0, horizontal, bounds.height)
    graphics.fillRect(bounds.width - horizontal, 0, horizontal, bounds.height)
    counts.shadowShapes += 4
  }

  private destroyGraphics(): void {
    this.graphics?.destroy()
    this.graphics = undefined
  }

  private destroyFilters(): void {
    this.filterControllers.forEach((controller) => {
      controller.active = false
      controller.destroy()
    })
    this.filterControllers = []
  }
}

function effectsPalette(
  style: string,
  tenantLighting: RendererTenantLightingMode,
): {
  readonly ambientColor: number
  readonly ambientAlpha: number
  readonly lightColor: number
} {
  if (tenantLighting === "night") {
    return {
      ambientColor: 0x24364f,
      ambientAlpha: 0.075,
      lightColor: 0xffe0a6,
    }
  }

  if (tenantLighting === "tenant_theme") {
    return {
      ambientColor: 0x2d7c83,
      ambientAlpha: 0.026,
      lightColor: 0xcff7ef,
    }
  }

  if (style.includes("wood") || style.includes("cozy")) {
    return {
      ambientColor: 0xffd9a6,
      ambientAlpha: 0.022,
      lightColor: 0xfff1c8,
    }
  }

  if (style.includes("glass")) {
    return {
      ambientColor: 0xd8eef5,
      ambientAlpha: 0.022,
      lightColor: 0xf2fbff,
    }
  }

  return {
    ambientColor: 0xe6edf0,
    ambientAlpha: 0.018,
    lightColor: 0xffffff,
  }
}

function disabledEffectsInfo(options: {
  readonly requestedEnabled: boolean
  readonly requestedQuality: RendererEffectsQuality
  readonly tenantLighting: RendererTenantLightingMode
  readonly capability: EffectsCapability
  readonly disabledReason: RendererEffectsDisableReason
}): RendererEffectsInfo {
  return {
    source: "renderer_runtime",
    authority: "visual_only",
    requested: {
      enabled: options.requestedEnabled,
      quality: options.requestedQuality,
      tenantLighting: options.tenantLighting,
    },
    enabled: false,
    quality: "off",
    deterministic: true,
    animationMode: "static",
    disabledReason: options.disabledReason,
    capability: options.capability,
    applied: {
      webglFilters: [],
      ...disabledShaderAppliedInfo(),
      ...disabledParticleAppliedInfo(),
      ambientEffects: [],
      lightPass: "none",
      shadowPass: "none",
      selectionOutlines: "zone_renderer",
      hoverOutlines: "zone_renderer",
      tenantLighting: options.tenantLighting,
    },
    objectCounts: {
      ambientShapes: 0,
      lightShapes: 0,
      shadowShapes: 0,
      ...emptyWebglEffectsCounts(),
      ...emptyParticleEffectsCounts(),
    },
  }
}

function emptyCapability(): EffectsCapability {
  return {
    webglAvailable: false,
    contextLost: false,
    lowCapability: true,
    filtersAvailable: false,
    shadersAvailable: false,
    particlesAvailable: false,
  }
}
