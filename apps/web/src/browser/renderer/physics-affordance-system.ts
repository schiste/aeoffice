import Phaser from "phaser"

import { roundTo } from "./math"
import type {
  RenderedPlayer,
  RendererDepthObjectInfo,
  RendererDepthPlacementBounds,
  RendererPhysicsInfo,
  RendererZoneInfo,
} from "./types"

type PhysicsZone = Phaser.GameObjects.Zone & {
  body?: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody
}

interface SensorRecord {
  readonly id: string
  readonly zone: PhysicsZone
}

interface ObjectSensorRecord extends SensorRecord {
  readonly tokenId: string
}

interface ProbeState {
  readonly active: boolean
  readonly x?: number
  readonly y?: number
  readonly width?: number
  readonly height?: number
  readonly overlappingObjectIds: readonly string[]
  readonly overlappingZoneIds: readonly string[]
}

const LOCAL_PROBE_SIZE_PX = 18

export class PhysicsAffordanceSystem {
  private objectSensors: ObjectSensorRecord[] = []
  private zoneSensors: SensorRecord[] = []
  private localProbe?: PhysicsZone
  private placementPreviewProbe?: PhysicsZone
  private localProbeState: ProbeState = emptyProbeState()
  private placementPreviewState: RendererPhysicsInfo["placementPreview"] =
    emptyPlacementPreviewState()

  constructor(private readonly scene: Phaser.Scene) {}

  bind(): void {
    this.ensureProbe("local")
    this.ensureProbe("placement")
  }

  clearMapTargets(): void {
    this.objectSensors.forEach((sensor) => sensor.zone.destroy())
    this.zoneSensors.forEach((sensor) => sensor.zone.destroy())
    this.objectSensors = []
    this.zoneSensors = []
    this.localProbeState = emptyProbeState()
    this.placementPreviewState = emptyPlacementPreviewState()
  }

  setMapTargets(options: {
    readonly objects: readonly RendererDepthObjectInfo[]
    readonly zones: readonly RendererZoneInfo[]
  }): void {
    this.clearMapTargets()
    this.objectSensors = options.objects.map((object) =>
      this.createObjectSensor(object),
    )
    this.zoneSensors = options.zones.map((zone) =>
      this.createSensor(zone.id, zone.bounds),
    )
    this.updatePlacementPreview()
  }

  updatePlayers(players: readonly RenderedPlayer[]): void {
    const localPlayer = players.find((player) => player.local)
    if (!localPlayer) {
      this.localProbeState = emptyProbeState()
      return
    }

    const probe = this.ensureProbe("local")
    this.positionProbe(probe, {
      x: localPlayer.position.x - LOCAL_PROBE_SIZE_PX / 2,
      y: localPlayer.position.y - LOCAL_PROBE_SIZE_PX / 2,
      width: LOCAL_PROBE_SIZE_PX,
      height: LOCAL_PROBE_SIZE_PX,
    })

    const overlappingObjectIds = this.overlappingObjectIds(probe)
    const overlappingZoneIds = this.overlappingZoneIds(probe)

    this.localProbeState = {
      active: true,
      x: roundTo(localPlayer.position.x, 2),
      y: roundTo(localPlayer.position.y, 2),
      width: LOCAL_PROBE_SIZE_PX,
      height: LOCAL_PROBE_SIZE_PX,
      overlappingObjectIds,
      overlappingZoneIds,
    }
  }

  getInfo(): RendererPhysicsInfo {
    return {
      source: "phaser_arcade_physics",
      authority: "visual_probes_only",
      enabled: Boolean(this.scene.physics?.world),
      engine: "arcade",
      matterAvailable: Boolean((this.scene as { matter?: unknown }).matter),
      matterEnabled: false,
      serverAuthorityBoundary:
        "movement_collision_permissions_remain_server_authoritative",
      features: [
        "arcade_sensor_bodies",
        "visual_collision_probes",
        "editor_placement_preview",
        "interaction_hit_area_validation",
        "local_affordance_feedback",
      ],
      config: {
        defaultSystem: "arcade",
        gravity: "none",
        debug: Boolean(
          (this.scene.physics?.world as { drawDebug?: boolean } | undefined)
            ?.drawDebug,
        ),
        simulationAffectsGameplay: false,
      },
      sensors: {
        objectSensorCount: this.objectSensors.length,
        zoneSensorCount: this.zoneSensors.length,
        staticBodyCount: this.objectSensors.length + this.zoneSensors.length,
        dynamicProbeCount: Number(Boolean(this.localProbe)) +
          Number(Boolean(this.placementPreviewProbe)),
      },
      localProbe: {
        ...this.localProbeState,
        affordance: localProbeAffordance(this.localProbeState),
      },
      placementPreview: this.placementPreviewState,
    }
  }

  private createObjectSensor(
    object: RendererDepthObjectInfo,
  ): ObjectSensorRecord {
    return {
      ...this.createSensor(object.id, object.collisionBounds),
      tokenId: object.tokenId,
    }
  }

  private createSensor(
    id: string,
    bounds: RendererDepthPlacementBounds,
  ): SensorRecord {
    const zone = this.scene.add.zone(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      bounds.width,
      bounds.height,
    ) as PhysicsZone

    zone.setName(`physics-sensor:${id}`)
    zone.setSize(bounds.width, bounds.height)
    this.scene.physics.add.existing(zone, true)
    const body = zone.body as Phaser.Physics.Arcade.StaticBody | undefined
    body?.setSize(bounds.width, bounds.height, true)
    body?.updateFromGameObject()

    return { id, zone }
  }

  private ensureProbe(kind: "local" | "placement"): PhysicsZone {
    const existing = kind === "local" ? this.localProbe : this.placementPreviewProbe
    if (existing) return existing

    const probe = this.scene.add.zone(
      0,
      0,
      LOCAL_PROBE_SIZE_PX,
      LOCAL_PROBE_SIZE_PX,
    ) as PhysicsZone
    probe.setName(`physics-${kind}-probe`)
    probe.setSize(LOCAL_PROBE_SIZE_PX, LOCAL_PROBE_SIZE_PX)
    this.scene.physics.add.existing(probe, false)
    const body = probe.body as Phaser.Physics.Arcade.Body | undefined
    body?.setAllowGravity(false)
    body?.setImmovable(true)
    body?.setSize(LOCAL_PROBE_SIZE_PX, LOCAL_PROBE_SIZE_PX, true)

    if (kind === "local") {
      this.localProbe = probe
    } else {
      this.placementPreviewProbe = probe
    }

    return probe
  }

  private updatePlacementPreview(): void {
    const firstObject = this.objectSensors[0]
    if (!firstObject) {
      this.placementPreviewState = emptyPlacementPreviewState()
      return
    }

    const bounds = sensorBounds(firstObject.zone)
    const probe = this.ensureProbe("placement")
    this.positionProbe(probe, bounds)
    const overlappingObjectIds = this.overlappingObjectIds(probe)
    const overlappingZoneIds = this.overlappingZoneIds(probe)

    this.placementPreviewState = {
      active: true,
      state: overlappingObjectIds.length > 0 ? "blocked" : "clear",
      x: roundTo(bounds.x + bounds.width / 2, 2),
      y: roundTo(bounds.y + bounds.height / 2, 2),
      width: roundTo(bounds.width, 2),
      height: roundTo(bounds.height, 2),
      overlappingObjectIds,
      overlappingZoneIds,
    }
  }

  private positionProbe(
    probe: PhysicsZone,
    bounds: RendererDepthPlacementBounds,
  ): void {
    probe.setPosition(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    probe.setSize(bounds.width, bounds.height)
    const body = probe.body as Phaser.Physics.Arcade.Body | undefined
    body?.reset(probe.x, probe.y)
    body?.setSize(bounds.width, bounds.height, true)
  }

  private overlappingObjectIds(probe: PhysicsZone): readonly string[] {
    return this.objectSensors
      .filter((sensor) => this.scene.physics.overlap(probe, sensor.zone))
      .map((sensor) => sensor.id)
      .sort()
  }

  private overlappingZoneIds(probe: PhysicsZone): readonly string[] {
    return this.zoneSensors
      .filter((sensor) => this.scene.physics.overlap(probe, sensor.zone))
      .map((sensor) => sensor.id)
      .sort()
  }
}

function sensorBounds(zone: PhysicsZone): RendererDepthPlacementBounds {
  return {
    x: zone.x - zone.width / 2,
    y: zone.y - zone.height / 2,
    width: zone.width,
    height: zone.height,
  }
}

function localProbeAffordance(
  state: ProbeState,
): RendererPhysicsInfo["localProbe"]["affordance"] {
  if (state.overlappingObjectIds.length > 0) return "visual_blocked"
  if (state.overlappingZoneIds.length > 0) return "near_zone"
  return "none"
}

function emptyProbeState(): ProbeState {
  return {
    active: false,
    overlappingObjectIds: [],
    overlappingZoneIds: [],
  }
}

function emptyPlacementPreviewState(): RendererPhysicsInfo["placementPreview"] {
  return {
    active: false,
    state: "unavailable",
    overlappingObjectIds: [],
    overlappingZoneIds: [],
  }
}
