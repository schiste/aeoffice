import Phaser from "phaser"

import { ZONE_LABEL_DEPTH } from "./constants"
import { clamp, roundTo } from "./math"
import type {
  RendererWorldInteractionCandidate,
  RendererWorldInteractionInfo,
} from "./types"

interface InteractionMarkerView {
  readonly candidateId: string
  readonly container: Phaser.GameObjects.Container
}

const MARKER_SCREEN_SCALE_MIN = 0.72
const MARKER_SCREEN_SCALE_MAX = 1.18

export class InteractionRenderer {
  private markers: InteractionMarkerView[] = []
  private info: RendererWorldInteractionInfo = emptyWorldInteractionInfo()

  constructor(private readonly scene: Phaser.Scene) {}

  render(info: RendererWorldInteractionInfo): void {
    this.clear()
    this.info = info
    info.candidates
      .filter((candidate) => candidate.markerVisible)
      .forEach((candidate) => this.createActionMarker(candidate))
    this.refreshFrame()
  }

  clear(): void {
    this.markers.forEach((marker) => marker.container.destroy(true))
    this.markers = []
  }

  getInfo(): RendererWorldInteractionInfo {
    return this.info
  }

  refreshFrame(): void {
    const zoom = this.scene.cameras.main.zoom || 1
    const scale = roundTo(
      clamp(1 / zoom, MARKER_SCREEN_SCALE_MIN, MARKER_SCREEN_SCALE_MAX),
      2,
    )

    this.markers.forEach((marker) => marker.container.setScale(scale))
  }

  private createActionMarker(candidate: RendererWorldInteractionCandidate): void {
    const color = interactionColor(candidate)
    const container = this.scene.add.container(
      candidate.bounds.x + candidate.bounds.width / 2,
      candidate.bounds.y - 8,
    )

    container.setDepth(ZONE_LABEL_DEPTH + 12)

    const halo = this.scene.add.ellipse(0, 0, 31, 31, color, 0.14)
    const pin = this.scene.add.graphics()
    pin.fillStyle(0xfffdf7, 0.98)
    pin.lineStyle(1.5, color, 0.82)
    pin.beginPath()
    pin.moveTo(0, -13)
    pin.lineTo(12, -1)
    pin.lineTo(0, 15)
    pin.lineTo(-12, -1)
    pin.closePath()
    pin.fillPath()
    pin.strokePath()

    const actionDot = this.scene.add.ellipse(0, -1, 8, 8, color, 0.9)
    const stem = this.scene.add.rectangle(0, 7, 2, 6, color, 0.72)

    container.add([halo, pin, stem, actionDot])
    this.scene.tweens.add({
      targets: halo,
      scaleX: 1.12,
      scaleY: 1.12,
      alpha: 0.2,
      duration: 980,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    })
    this.markers.push({ candidateId: candidate.id, container })
  }
}

function interactionColor(candidate: RendererWorldInteractionCandidate): number {
  if (candidate.serverPermitted) return 0x2f8f63
  if (candidate.permission === "pending") return 0xa66f19
  return 0x6f7d78
}

function emptyWorldInteractionInfo(): RendererWorldInteractionInfo {
  return {
    source: "server_permitted_world_interactions",
    authority: "server_permitted_actions_only",
    permissionSource: "unavailable",
    state: "idle",
    activeCandidateIds: [],
    permittedCandidateIds: [],
    deniedCandidateIds: [],
    candidates: [],
  }
}
