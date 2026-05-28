import Phaser from "phaser"

import { ZONE_LABEL_DEPTH } from "./constants"
import {
  interactionMarkerPosition,
  interactionMarkerScreenScale,
  interactionStyle,
  visibleInteractionMarkerCandidates,
} from "./world-interaction-presentation"
import type {
  RendererWorldInteractionCandidate,
  RendererWorldInteractionInfo,
} from "./types"

interface InteractionMarkerView {
  readonly candidateId: string
  readonly container: Phaser.GameObjects.Container
  readonly baseShadow: Phaser.GameObjects.Ellipse
  readonly halo: Phaser.GameObjects.Ellipse
  readonly pulseRing: Phaser.GameObjects.Ellipse
  readonly selectionRing: Phaser.GameObjects.Ellipse
  readonly pin: Phaser.GameObjects.Graphics
  readonly actionDot: Phaser.GameObjects.Ellipse
  readonly stem: Phaser.GameObjects.Rectangle
}

type InteractionActivationHandler = (candidateId: string) => void

export class InteractionRenderer {
  private markers: InteractionMarkerView[] = []
  private info: RendererWorldInteractionInfo = emptyWorldInteractionInfo()
  private hoveredCandidateId?: string
  private selectedCandidateId?: string
  private activationHandler?: InteractionActivationHandler

  constructor(private readonly scene: Phaser.Scene) {}

  render(info: RendererWorldInteractionInfo): void {
    this.clear()
    this.selectedCandidateId = selectedCandidateIdFor(info, this.selectedCandidateId)
    this.hoveredCandidateId = candidateExists(info, this.hoveredCandidateId)
      ? this.hoveredCandidateId
      : undefined
    this.info = withInteractionPresentation(
      info,
      this.hoveredCandidateId,
      this.selectedCandidateId,
    )
    visibleInteractionMarkerCandidates(this.info)
      .forEach((candidate) => this.createActionMarker(candidate))
    this.refreshMarkerStates()
    this.refreshFrame()
  }

  clear(): void {
    this.markers.forEach((marker) => marker.container.destroy(true))
    this.markers = []
  }

  getInfo(): RendererWorldInteractionInfo {
    return this.info
  }

  setActivationHandler(handler: InteractionActivationHandler | undefined): void {
    this.activationHandler = handler
  }

  refreshFrame(): void {
    const zoom = this.scene.cameras.main.zoom || 1
    const scale = interactionMarkerScreenScale(zoom)

    this.markers.forEach((marker) => marker.container.setScale(scale))
  }

  private createActionMarker(candidate: RendererWorldInteractionCandidate): void {
    const style = interactionStyle(candidate)
    const position = interactionMarkerPosition(candidate)
    const container = this.scene.add.container(position.x, position.y)

    container.setDepth(ZONE_LABEL_DEPTH + 12)
    container.setInteractive(
      new Phaser.Geom.Rectangle(-56, -34, 112, 62),
      Phaser.Geom.Rectangle.Contains,
    )
    container.on("pointerover", () => this.setHoveredCandidate(candidate.id))
    container.on("pointerout", () => this.setHoveredCandidate(undefined))
    container.on("pointerdown", () => {
      this.setSelectedCandidate(candidate.id)
      if (candidate.serverPermitted) {
        this.activationHandler?.(candidate.id)
      }
    })

    const baseShadow = this.scene.add.ellipse(0, 21, 36, 11, 0x20201d, 0.15)
    const halo = this.scene.add.ellipse(0, 0, 38, 38, style.color, 0.14)
    const pulseRing = this.scene.add.ellipse(0, 0, 44, 44, style.color, 0)
    pulseRing.setStrokeStyle(1.5, style.color, 0.18)
    const selectionRing = this.scene.add.ellipse(0, 0, 46, 46, style.color, 0)
    selectionRing.setStrokeStyle(2, style.color, 0)
    const pin = this.scene.add.graphics()
    drawActionPin(pin, style.color, false)

    const actionDot = this.scene.add.ellipse(0, -3, 10, 10, style.color, 0.94)
    actionDot.setStrokeStyle(1.25, 0xfffdf7, 0.78)
    const stem = this.scene.add.rectangle(0, 10, 3, 9, style.color, 0.76)

    container.add([
      baseShadow,
      halo,
      pulseRing,
      selectionRing,
      pin,
      stem,
      actionDot,
    ])
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
    this.scene.tweens.add({
      targets: pulseRing,
      scaleX: 1.25,
      scaleY: 1.25,
      alpha: 0,
      duration: 1180,
      repeat: -1,
      ease: "Sine.easeOut",
    })
    this.scene.tweens.add({
      targets: container,
      y: position.y - 1.4,
      duration: 1320,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    })
    this.markers.push({
      candidateId: candidate.id,
      container,
      baseShadow,
      halo,
      pulseRing,
      selectionRing,
      pin,
      actionDot,
      stem,
    })
  }

  private setHoveredCandidate(candidateId: string | undefined): void {
    if (this.hoveredCandidateId === candidateId) return
    this.hoveredCandidateId = candidateId
    this.info = withInteractionPresentation(
      this.info,
      this.hoveredCandidateId,
      this.selectedCandidateId,
    )
    this.refreshMarkerStates()
  }

  private setSelectedCandidate(candidateId: string): void {
    if (this.selectedCandidateId === candidateId) return
    this.selectedCandidateId = candidateId
    this.info = withInteractionPresentation(
      this.info,
      this.hoveredCandidateId,
      this.selectedCandidateId,
    )
    this.refreshMarkerStates()
  }

  private refreshMarkerStates(): void {
    this.markers.forEach((marker) => {
      const selected = marker.candidateId === this.selectedCandidateId
      const hovered = marker.candidateId === this.hoveredCandidateId
      const active = selected || hovered
      marker.selectionRing.setVisible(active)
      marker.selectionRing.setStrokeStyle(active ? 3 : 2, 0xfffdf7, active ? 0.9 : 0)
      marker.baseShadow.setAlpha(active ? 0.2 : 0.15)
      marker.baseShadow.setScale(active ? 1.12 : 1)
      marker.halo.setAlpha(active ? 0.32 : 0.14)
      marker.pulseRing.setStrokeStyle(
        active ? 2 : 1.5,
        0xfffdf7,
        active ? 0.32 : 0.18,
      )
      marker.actionDot.setScale(active ? 1.16 : 1)
      marker.stem.setAlpha(active ? 0.9 : 0.76)
      const candidate = this.info.candidates.find(
        (entry) => entry.id === marker.candidateId,
      )
      if (candidate) {
        drawActionPin(marker.pin, interactionStyle(candidate).color, active)
      }
    })
  }
}

function drawActionPin(
  graphics: Phaser.GameObjects.Graphics,
  color: number,
  active: boolean,
): void {
  graphics.clear()
  graphics.fillStyle(0x20201d, active ? 0.1 : 0.05)
  graphics.fillEllipse(0, 18, active ? 29 : 24, active ? 9 : 7)
  graphics.fillStyle(0xfffdf7, active ? 1 : 0.98)
  graphics.lineStyle(active ? 2.4 : 1.6, color, active ? 0.96 : 0.84)
  graphics.beginPath()
  graphics.moveTo(0, -17)
  graphics.lineTo(15, -4)
  graphics.lineTo(11, 9)
  graphics.lineTo(0, 20)
  graphics.lineTo(-11, 9)
  graphics.lineTo(-15, -4)
  graphics.closePath()
  graphics.fillPath()
  graphics.strokePath()
  graphics.lineStyle(1, 0xffffff, active ? 0.46 : 0.32)
  graphics.beginPath()
  graphics.moveTo(-7, -8)
  graphics.lineTo(0, -13)
  graphics.lineTo(7, -8)
  graphics.strokePath()
}

function withInteractionPresentation(
  info: RendererWorldInteractionInfo,
  hoveredCandidateId: string | undefined,
  selectedCandidateId: string | undefined,
): RendererWorldInteractionInfo {
  const selected = candidateExists(info, selectedCandidateId)
    ? selectedCandidateId
    : selectedCandidateIdFor(info, undefined)
  const primary = info.primaryCandidateId
    ? info.candidates.find((candidate) => candidate.id === info.primaryCandidateId)
    : undefined

  return {
    ...info,
    actionAffordance: interactionAffordance(info, primary),
    hotkeyLabel: primary ? "E" : undefined,
    tapLabel: primary ? "Tap" : undefined,
    hoveredCandidateId: candidateExists(info, hoveredCandidateId)
      ? hoveredCandidateId
      : undefined,
    selectedCandidateId: selected,
    presentation: {
      markerStyle: "action_marker_cards",
      markerEffectMode: "layered_pin_pulse_shadow",
      selectionMode: "hover_click_marker",
      privateAreaFeedback: privateAreaFeedback(info),
    },
  }
}

function interactionAffordance(
  info: RendererWorldInteractionInfo,
  primary: RendererWorldInteractionCandidate | undefined,
): RendererWorldInteractionInfo["actionAffordance"] {
  if (!primary) return "walk_nearby"
  if (info.state === "pending") return "checking_permission"
  if (primary.serverPermitted) return "press_e_or_tap"
  return "server_denied"
}

function privateAreaFeedback(
  info: RendererWorldInteractionInfo,
): NonNullable<RendererWorldInteractionInfo["presentation"]>["privateAreaFeedback"] {
  const activePrivateCandidate = info.candidates.find(
    (candidate) =>
      candidate.active &&
      candidate.action === "enter_private",
  )

  if (!activePrivateCandidate) return "none"
  if (activePrivateCandidate.serverPermitted) return "available"
  if (activePrivateCandidate.permission === "pending") return "pending"
  return "denied"
}

function selectedCandidateIdFor(
  info: RendererWorldInteractionInfo,
  currentSelectedId: string | undefined,
): string | undefined {
  if (candidateSelectable(info, currentSelectedId)) return currentSelectedId
  return info.primaryCandidateId
}

function candidateExists(
  info: RendererWorldInteractionInfo,
  candidateId: string | undefined,
): candidateId is string {
  return Boolean(
    candidateId &&
      info.candidates.some((candidate) => candidate.id === candidateId),
  )
}

function candidateSelectable(
  info: RendererWorldInteractionInfo,
  candidateId: string | undefined,
): candidateId is string {
  return Boolean(
    candidateId &&
      info.candidates.some(
        (candidate) =>
          candidate.id === candidateId &&
          candidate.active &&
          candidate.markerVisible,
      ),
  )
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
    actionAffordance: "none",
    presentation: {
      markerStyle: "action_marker_cards",
      markerEffectMode: "layered_pin_pulse_shadow",
      selectionMode: "hover_click_marker",
      privateAreaFeedback: "none",
    },
  }
}
