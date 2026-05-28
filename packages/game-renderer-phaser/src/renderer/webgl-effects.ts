import Phaser from "phaser"

import { EFFECTS_AMBIENT_DEPTH } from "./constants"
import type {
  FixtureMap,
  FixtureZone,
  RendererEffectsInfo,
  RendererResolvedEffectsQuality,
  RendererTenantLightingMode,
} from "./types"

export const ROOM_LIGHTING_SHADER_PIPELINE = "ShaderQuad:aedventure_room_lighting"
export const ROOM_LIGHTING_SHADER_PASS = "custom_room_lighting_shader" as const

const ROOM_LIGHTING_SHADER_NAME = "aedventure_room_lighting_shader"
const MAX_SHADER_ZONE_UNIFORMS = 4

const ROOM_LIGHTING_FRAGMENT_SHADER = `
precision mediump float;

varying vec2 outTexCoord;

uniform vec2 uResolution;
uniform vec3 uAmbientColor;
uniform vec3 uLightColor;
uniform vec3 uZoneColor;
uniform float uLightingMode;
uniform float uZoneCount;
uniform vec4 uZone0;
uniform vec4 uZone1;
uniform vec4 uZone2;
uniform vec4 uZone3;

float roundedRectDistance(vec2 point, vec4 rect) {
  vec2 center = rect.xy + rect.zw * 0.5;
  vec2 halfSize = rect.zw * 0.5;
  vec2 q = abs(point - center) - halfSize;

  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
}

float zoneGlow(vec2 point, vec4 rect) {
  float distanceToRect = roundedRectDistance(point, rect);
  float outerGlow = smoothstep(96.0, 0.0, distanceToRect);
  float innerEdgeFade = smoothstep(-72.0, -8.0, distanceToRect);

  return outerGlow * innerEdgeFade;
}

void main() {
  vec2 pixel = vec2(outTexCoord.x * uResolution.x, (1.0 - outTexCoord.y) * uResolution.y);
  vec2 center = uResolution * 0.5;
  float largestDimension = max(uResolution.x, uResolution.y);
  float centerDistance = distance(pixel, center) / largestDimension;
  float roomLight = smoothstep(0.54, 0.08, centerDistance);
  float vignette = smoothstep(0.38, 0.86, centerDistance);
  vec2 grainCell = floor(pixel / 18.0);
  float grain = fract(sin(dot(grainCell, vec2(12.9898, 78.233))) * 43758.5453);

  float glow = 0.0;
  glow += step(0.5, uZoneCount) * zoneGlow(pixel, uZone0);
  glow += step(1.5, uZoneCount) * zoneGlow(pixel, uZone1);
  glow += step(2.5, uZoneCount) * zoneGlow(pixel, uZone2);
  glow += step(3.5, uZoneCount) * zoneGlow(pixel, uZone3);
  glow = clamp(glow, 0.0, 1.0);

  float nightBoost = step(0.5, uLightingMode) * (1.0 - step(1.5, uLightingMode));
  float tenantBoost = step(1.5, uLightingMode);
  vec3 color = uAmbientColor * (0.035 + roomLight * 0.055);
  color += uLightColor * roomLight * (0.012 + nightBoost * 0.018);
  color += uZoneColor * glow * (0.055 + tenantBoost * 0.035);
  color += vec3((grain - 0.5) * 0.004);
  color = clamp(color, 0.0, 1.0);

  float alpha = 0.001 + roomLight * 0.0015 + glow * 0.006 + vignette * (0.0025 + nightBoost * 0.005);
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.011));
}
`

export interface WebglEffectsCounts {
  readonly shaderPasses: number
  readonly shaderObjects: number
  readonly shaderZoneUniforms: number
}

export class WebglEffectsPass {
  private shader?: Phaser.GameObjects.Shader
  private zoneUniforms: readonly ZoneUniform[] = []
  private bounds: { readonly width: number; readonly height: number } = {
    width: 1,
    height: 1,
  }
  private tenantLighting: RendererTenantLightingMode = "day"
  private fixtureStyle = "default"

  constructor(private readonly scene: Phaser.Scene) {}

  render(options: {
    readonly fixtureMap: FixtureMap
    readonly bounds: { readonly width: number; readonly height: number }
    readonly quality: RendererResolvedEffectsQuality
    readonly tenantLighting: RendererTenantLightingMode
  }): WebglEffectsCounts {
    if (options.quality !== "premium") {
      this.clear()
      return emptyWebglEffectsCounts()
    }

    this.bounds = options.bounds
    this.tenantLighting = options.tenantLighting
    this.fixtureStyle = options.fixtureMap.definition.style
    this.zoneUniforms = options.fixtureMap.compiled.zones
      .slice(0, MAX_SHADER_ZONE_UNIFORMS)
      .map((zone) => zoneUniform(zone, options.fixtureMap.compiled.tileSize))

    const shader = this.acquireShader()
    shader
      .setVisible(true)
      .setActive(true)
      .setPosition(0, 0)
      .setOrigin(0, 0)
      .setDepth(EFFECTS_AMBIENT_DEPTH + 2)
      .setSize(options.bounds.width, options.bounds.height)
      .setDisplaySize(options.bounds.width, options.bounds.height)

    return {
      shaderPasses: 1,
      shaderObjects: 1,
      shaderZoneUniforms: this.zoneUniforms.length,
    }
  }

  clear(): void {
    this.shader?.destroy()
    this.shader = undefined
    this.zoneUniforms = []
  }

  pipelineNames(): readonly string[] {
    return this.shader ? [ROOM_LIGHTING_SHADER_PIPELINE] : []
  }

  private acquireShader(): Phaser.GameObjects.Shader {
    if (!this.shader) {
      this.shader = this.scene.add.shader({
        name: ROOM_LIGHTING_SHADER_NAME,
        shaderName: ROOM_LIGHTING_SHADER_NAME,
        fragmentSource: ROOM_LIGHTING_FRAGMENT_SHADER,
        setupUniforms: (setUniform: (name: string, value: unknown) => void) => {
          this.setupUniforms(setUniform)
        },
      })
    }

    return this.shader
  }

  private setupUniforms(
    setUniform: (name: string, value: unknown) => void,
  ): void {
    const palette = shaderPalette(this.fixtureStyle, this.tenantLighting)
    const zones = paddedZoneUniforms(this.zoneUniforms)

    setUniform("uResolution", [this.bounds.width, this.bounds.height])
    setUniform("uAmbientColor", palette.ambientColor)
    setUniform("uLightColor", palette.lightColor)
    setUniform("uZoneColor", palette.zoneColor)
    setUniform("uLightingMode", lightingModeUniform(this.tenantLighting))
    setUniform("uZoneCount", this.zoneUniforms.length)
    setUniform("uZone0", zones[0])
    setUniform("uZone1", zones[1])
    setUniform("uZone2", zones[2])
    setUniform("uZone3", zones[3])
  }
}

export function emptyWebglEffectsCounts(): WebglEffectsCounts {
  return {
    shaderPasses: 0,
    shaderObjects: 0,
    shaderZoneUniforms: 0,
  }
}

export function disabledShaderAppliedInfo(): Pick<
  RendererEffectsInfo["applied"],
  | "customWebglPipelines"
  | "shaderPass"
  | "floorLighting"
  | "zoneGlow"
  | "softShadows"
> {
  return {
    customWebglPipelines: [],
    shaderPass: "none",
    floorLighting: "none",
    zoneGlow: "none",
    softShadows: "none",
  }
}

type ZoneUniform = readonly [number, number, number, number]

function zoneUniform(zone: FixtureZone, tileSize: number): ZoneUniform {
  return [
    zone.xStart * tileSize,
    zone.yStart * tileSize,
    (zone.xEnd - zone.xStart) * tileSize,
    (zone.yEnd - zone.yStart) * tileSize,
  ]
}

function paddedZoneUniforms(
  zones: readonly ZoneUniform[],
): readonly [ZoneUniform, ZoneUniform, ZoneUniform, ZoneUniform] {
  const empty: ZoneUniform = [0, 0, 0, 0]

  return [
    zones[0] ?? empty,
    zones[1] ?? empty,
    zones[2] ?? empty,
    zones[3] ?? empty,
  ]
}

function lightingModeUniform(tenantLighting: RendererTenantLightingMode): number {
  if (tenantLighting === "night") return 1
  if (tenantLighting === "tenant_theme") return 2
  return 0
}

function shaderPalette(
  style: string,
  tenantLighting: RendererTenantLightingMode,
): {
  readonly ambientColor: readonly [number, number, number]
  readonly lightColor: readonly [number, number, number]
  readonly zoneColor: readonly [number, number, number]
} {
  if (tenantLighting === "night") {
    return {
      ambientColor: rgb(0x223552),
      lightColor: rgb(0xffdfa3),
      zoneColor: rgb(0x7be1ff),
    }
  }

  if (tenantLighting === "tenant_theme") {
    return {
      ambientColor: rgb(0x287c83),
      lightColor: rgb(0xd5fff6),
      zoneColor: rgb(0x43cbb6),
    }
  }

  if (style.includes("wood") || style.includes("cozy")) {
    return {
      ambientColor: rgb(0xffd6a0),
      lightColor: rgb(0xfff4cf),
      zoneColor: rgb(0x52c4ae),
    }
  }

  return {
    ambientColor: rgb(0xb8c9c4),
    lightColor: rgb(0xf3f4e8),
    zoneColor: rgb(0x4bbdb4),
  }
}

function rgb(color: number): readonly [number, number, number] {
  return [
    ((color >> 16) & 0xff) / 255,
    ((color >> 8) & 0xff) / 255,
    (color & 0xff) / 255,
  ]
}
