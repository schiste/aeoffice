import Phaser from "phaser"

import { EFFECTS_AMBIENT_DEPTH, ZONE_DEPTH } from "./constants"
import type {
  FixtureMap,
  FixtureToken,
  FixtureZone,
  RendererEffectsInfo,
  RendererResolvedEffectsQuality,
  RendererZoneInteractionState,
} from "./types"

export type ParticleEffectName =
  | "coffee_steam"
  | "plant_motes"
  | "portal_shimmer"
  | "meeting_zone_activation"
  | "room_entry_transition"

export interface ParticleEffectsCounts {
  readonly particleEmitters: number
  readonly particleTextures: number
  readonly coffeeSteamEmitters: number
  readonly plantMoteEmitters: number
  readonly portalShimmerEmitters: number
  readonly meetingZoneActivationEmitters: number
  readonly entryTransitionEmitters: number
  readonly particleAliveBudget: number
}

interface ParticleEmitterRecord {
  readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter
  readonly effectName: ParticleEffectName
  readonly aliveBudget: number
}

interface ParticleRenderOptions {
  readonly fixtureMap: FixtureMap
  readonly bounds: {
    readonly width: number
    readonly height: number
  }
  readonly quality: RendererResolvedEffectsQuality
}

interface ParticleTarget {
  readonly token: FixtureToken
  readonly x: number
  readonly y: number
}

const PARTICLE_TEXTURE_KEY = "aedventure.effect.soft_particle"
const MAX_COFFEE_STEAM_EMITTERS = 4
const MAX_PLANT_MOTE_EMITTERS = 6
const MAX_PORTAL_SHIMMER_EMITTERS = 3
const MAX_MEETING_ACTIVATION_EMITTERS = 4

type ParticleEmitterConfig =
  Phaser.Types.GameObjects.Particles.ParticleEmitterConfig

export class ParticleEffectsPass {
  private ambientRecords: readonly ParticleEmitterRecord[] = []
  private activationRecords: readonly ParticleEmitterRecord[] = []
  private lastRenderOptions?: ParticleRenderOptions
  private lastCounts = emptyParticleEffectsCounts()
  private zoneInteractionState: RendererZoneInteractionState = {
    activeZoneIds: [],
    availableActionZoneIds: [],
    joinedZoneIds: [],
  }

  constructor(private readonly scene: Phaser.Scene) {}

  render(options: ParticleRenderOptions): ParticleEffectsCounts {
    this.clear()
    this.lastRenderOptions = options

    if (options.quality !== "premium" || !this.ensureParticleTexture()) {
      this.lastCounts = emptyParticleEffectsCounts()
      return this.lastCounts
    }

    const records: ParticleEmitterRecord[] = []
    records.push(...this.createEntryTransitionEmitter(options))
    records.push(...this.createCoffeeSteamEmitters(options.fixtureMap))
    records.push(...this.createPlantMoteEmitters(options.fixtureMap))
    records.push(...this.createPortalShimmerEmitters(options.fixtureMap))
    this.ambientRecords = records
    this.activationRecords = this.createMeetingActivationEmitters(
      options.fixtureMap,
    )
    this.lastCounts = this.computeCounts()
    return this.lastCounts
  }

  setZoneInteractionState(
    state: RendererZoneInteractionState,
  ): ParticleEffectsCounts | undefined {
    const nextState = cloneZoneInteractionState(state)
    if (
      zoneInteractionSignature(nextState) ===
      zoneInteractionSignature(this.zoneInteractionState)
    ) {
      return this.lastRenderOptions ? this.lastCounts : undefined
    }

    this.zoneInteractionState = nextState

    if (
      !this.lastRenderOptions ||
      this.lastRenderOptions.quality !== "premium" ||
      !this.ensureParticleTexture()
    ) {
      return undefined
    }

    destroyRecords(this.activationRecords)
    this.activationRecords = this.createMeetingActivationEmitters(
      this.lastRenderOptions.fixtureMap,
    )
    this.lastCounts = this.computeCounts()
    return this.lastCounts
  }

  clear(): void {
    destroyRecords(this.ambientRecords)
    destroyRecords(this.activationRecords)
    this.ambientRecords = []
    this.activationRecords = []
    this.lastRenderOptions = undefined
    this.lastCounts = emptyParticleEffectsCounts()
  }

  effectNames(): readonly ParticleEffectName[] {
    return uniqueEffectNames([...this.ambientRecords, ...this.activationRecords])
  }

  private createEntryTransitionEmitter(
    options: ParticleRenderOptions,
  ): readonly ParticleEmitterRecord[] {
    const emitter = this.createEmitter(
      options.bounds.width / 2,
      options.bounds.height / 2,
      {
        frequency: 70,
        quantity: 2,
        lifespan: { min: 420, max: 820 },
        speed: { min: 3, max: 11 },
        angle: { min: 205, max: 335 },
        alpha: { start: 0.11, end: 0 },
        scale: { start: 0.55, end: 0.08 },
        tint: 0xf8f3df,
        blendMode: "ADD",
        duration: 720,
        maxAliveParticles: 18,
      },
      EFFECTS_AMBIENT_DEPTH + 5,
    )

    return [recordFor(emitter, "room_entry_transition", 18)]
  }

  private createCoffeeSteamEmitters(
    fixtureMap: FixtureMap,
  ): readonly ParticleEmitterRecord[] {
    return this.objectTargets(fixtureMap, (token) => token.id.includes("coffee"))
      .slice(0, MAX_COFFEE_STEAM_EMITTERS)
      .map((target) => {
        const tileSize = fixtureMap.compiled.tileSize
        const width = Math.max(1, target.token.widthTiles) * tileSize
        const emitter = this.createEmitter(
          target.x * tileSize + width * 0.5,
          target.y * tileSize + tileSize * 0.5,
          {
            frequency: 520,
            quantity: 1,
            lifespan: { min: 1050, max: 1650 },
            speedX: { min: -2, max: 2 },
            speedY: { min: -9, max: -4 },
            alpha: { start: 0.16, end: 0 },
            scale: { start: 0.32, end: 0.9 },
            tint: 0xe9e3d2,
            blendMode: "NORMAL",
            maxAliveParticles: 5,
          },
          ZONE_DEPTH + 18,
        )
        return recordFor(emitter, "coffee_steam", 5)
      })
  }

  private createPlantMoteEmitters(
    fixtureMap: FixtureMap,
  ): readonly ParticleEmitterRecord[] {
    return this.objectTargets(fixtureMap, (token) => token.id.includes("plant"))
      .slice(0, MAX_PLANT_MOTE_EMITTERS)
      .map((target) => {
        const tileSize = fixtureMap.compiled.tileSize
        const emitter = this.createEmitter(
          target.x * tileSize + tileSize * 0.5,
          target.y * tileSize + tileSize * 0.42,
          {
            frequency: 980,
            quantity: 1,
            lifespan: { min: 900, max: 1400 },
            speedX: { min: -5, max: 5 },
            speedY: { min: -4, max: 2 },
            alpha: { start: 0.09, end: 0 },
            scale: { start: 0.16, end: 0.36 },
            tint: 0xd8e8b4,
            blendMode: "NORMAL",
            maxAliveParticles: 3,
          },
          ZONE_DEPTH + 14,
        )
        return recordFor(emitter, "plant_motes", 3)
      })
  }

  private createPortalShimmerEmitters(
    fixtureMap: FixtureMap,
  ): readonly ParticleEmitterRecord[] {
    return fixtureMap.compiled.zones
      .filter((zone) => zoneKind(zone) === "portal")
      .slice(0, MAX_PORTAL_SHIMMER_EMITTERS)
      .map((zone) => {
        const bounds = zoneBounds(zone, fixtureMap.compiled.tileSize)
        const emitter = this.createEmitter(
          bounds.x + bounds.width * 0.5,
          bounds.y + bounds.height * 0.5,
          {
            frequency: 260,
            quantity: 1,
            lifespan: { min: 650, max: 1150 },
            speedX: { min: -6, max: 6 },
            speedY: { min: -5, max: 5 },
            alpha: { start: 0.13, end: 0 },
            scale: { start: 0.2, end: 0.7 },
            tint: 0x58dde2,
            blendMode: "ADD",
            maxAliveParticles: 8,
          },
          ZONE_DEPTH + 20,
        )
        return recordFor(emitter, "portal_shimmer", 8)
      })
  }

  private createMeetingActivationEmitters(
    fixtureMap: FixtureMap,
  ): readonly ParticleEmitterRecord[] {
    const activeZoneIds = new Set([
      ...this.zoneInteractionState.activeZoneIds,
      ...(this.zoneInteractionState.availableActionZoneIds ?? []),
      ...(this.zoneInteractionState.joinedZoneIds ?? []),
    ])

    return fixtureMap.compiled.zones
      .filter((zone) => zoneKind(zone) === "meeting" && activeZoneIds.has(zone.id))
      .slice(0, MAX_MEETING_ACTIVATION_EMITTERS)
      .map((zone) => {
        const bounds = zoneBounds(zone, fixtureMap.compiled.tileSize)
        const emitter = this.createEmitter(
          bounds.x + bounds.width * 0.5,
          bounds.y + bounds.height * 0.5,
          {
            frequency: 180,
            quantity: 1,
            lifespan: { min: 460, max: 760 },
            speed: { min: 2, max: 8 },
            alpha: { start: 0.18, end: 0 },
            scale: { start: 0.18, end: 0.52 },
            tint: 0x79e4ce,
            blendMode: "ADD",
            maxAliveParticles: 10,
          },
          ZONE_DEPTH + 22,
        )
        return recordFor(emitter, "meeting_zone_activation", 10)
      })
  }

  private createEmitter(
    x: number,
    y: number,
    config: ParticleEmitterConfig,
    depth: number,
  ): Phaser.GameObjects.Particles.ParticleEmitter {
    const emitter = this.scene.add.particles(x, y, PARTICLE_TEXTURE_KEY, {
      ...config,
      particleBringToTop: false,
    })
    emitter.setDepth(depth)
    return emitter
  }

  private objectTargets(
    fixtureMap: FixtureMap,
    predicate: (token: FixtureToken) => boolean,
  ): readonly ParticleTarget[] {
    const tokensByGid = new Map(
      fixtureMap.catalog.tokens.map((token) => [token.provisionalGid, token]),
    )
    const targets: ParticleTarget[] = []

    fixtureMap.compiled.layers.objects.gids.forEach((row, y) => {
      row.forEach((gid, x) => {
        if (gid <= 0) return
        const token = tokensByGid.get(gid)
        if (!token || !predicate(token)) return
        targets.push({ token, x, y })
      })
    })

    return targets
  }

  private computeCounts(): ParticleEffectsCounts {
    const records = [...this.ambientRecords, ...this.activationRecords]

    return {
      particleEmitters: records.length,
      particleTextures: this.scene.textures.exists(PARTICLE_TEXTURE_KEY) ? 1 : 0,
      coffeeSteamEmitters: countEffect(records, "coffee_steam"),
      plantMoteEmitters: countEffect(records, "plant_motes"),
      portalShimmerEmitters: countEffect(records, "portal_shimmer"),
      meetingZoneActivationEmitters: countEffect(
        records,
        "meeting_zone_activation",
      ),
      entryTransitionEmitters: countEffect(records, "room_entry_transition"),
      particleAliveBudget: records.reduce(
        (total, record) => total + record.aliveBudget,
        0,
      ),
    }
  }

  private ensureParticleTexture(): boolean {
    if (this.scene.textures.exists(PARTICLE_TEXTURE_KEY)) return true
    if (typeof document === "undefined") return false

    const canvas = document.createElement("canvas")
    canvas.width = 12
    canvas.height = 12
    const context = canvas.getContext("2d")
    if (!context) return false

    const gradient = context.createRadialGradient(6, 6, 0, 6, 6, 6)
    gradient.addColorStop(0, "rgba(255,255,255,0.92)")
    gradient.addColorStop(0.42, "rgba(255,255,255,0.42)")
    gradient.addColorStop(1, "rgba(255,255,255,0)")
    context.fillStyle = gradient
    context.fillRect(0, 0, 12, 12)
    this.scene.textures.addCanvas(PARTICLE_TEXTURE_KEY, canvas)
    return true
  }
}

export function emptyParticleEffectsCounts(): ParticleEffectsCounts {
  return {
    particleEmitters: 0,
    particleTextures: 0,
    coffeeSteamEmitters: 0,
    plantMoteEmitters: 0,
    portalShimmerEmitters: 0,
    meetingZoneActivationEmitters: 0,
    entryTransitionEmitters: 0,
    particleAliveBudget: 0,
  }
}

export function disabledParticleAppliedInfo(): Pick<
  RendererEffectsInfo["applied"],
  "particleEffects"
> {
  return {
    particleEffects: [],
  }
}

function recordFor(
  emitter: Phaser.GameObjects.Particles.ParticleEmitter,
  effectName: ParticleEffectName,
  aliveBudget: number,
): ParticleEmitterRecord {
  return {
    emitter,
    effectName,
    aliveBudget,
  }
}

function destroyRecords(records: readonly ParticleEmitterRecord[]): void {
  records.forEach((record) => {
    record.emitter.destroy()
  })
}

function countEffect(
  records: readonly ParticleEmitterRecord[],
  effectName: ParticleEffectName,
): number {
  return records.filter((record) => record.effectName === effectName).length
}

function uniqueEffectNames(
  records: readonly ParticleEmitterRecord[],
): readonly ParticleEffectName[] {
  return [...new Set(records.map((record) => record.effectName))]
}

function cloneZoneInteractionState(
  state: RendererZoneInteractionState,
): RendererZoneInteractionState {
  return {
    activeZoneIds: [...state.activeZoneIds],
    availableActionZoneIds: [...(state.availableActionZoneIds ?? [])],
    joinedZoneIds: [...(state.joinedZoneIds ?? [])],
  }
}

function zoneInteractionSignature(state: RendererZoneInteractionState): string {
  return [
    [...state.activeZoneIds].sort().join(","),
    [...(state.availableActionZoneIds ?? [])].sort().join(","),
    [...(state.joinedZoneIds ?? [])].sort().join(","),
  ].join("|")
}

function zoneKind(zone: FixtureZone): "meeting" | "portal" | "other" {
  const raw = `${zone.zoneType} ${zone.id}`.toLowerCase()
  if (raw.includes("meeting")) return "meeting"
  if (raw.includes("portal") || raw.includes("door")) return "portal"
  return "other"
}

function zoneBounds(
  zone: FixtureZone,
  tileSize: number,
): {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
} {
  return {
    x: zone.xStart * tileSize,
    y: zone.yStart * tileSize,
    width: Math.max(tileSize, (zone.xEnd - zone.xStart) * tileSize),
    height: Math.max(tileSize, (zone.yEnd - zone.yStart) * tileSize),
  }
}
