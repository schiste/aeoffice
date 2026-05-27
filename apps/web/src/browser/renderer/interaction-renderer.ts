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
  readonly halo: Phaser.GameObjects.Ellipse
  readonly selectionRing: Phaser.GameObjects.Ellipse
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

    const halo = this.scene.add.ellipse(0, 0, 34, 34, style.color, 0.14)
    const selectionRing = this.scene.add.ellipse(0, 0, 42, 42, style.color, 0)
    selectionRing.setStrokeStyle(2, style.color, 0)
    const pin = this.scene.add.graphics()
    pin.fillStyle(0xfffdf7, 0.98)
    pin.lineStyle(1.5, style.color, 0.82)
    pin.beginPath()
    pin.moveTo(0, -13)
    pin.lineTo(12, -1)
    pin.lineTo(0, 15)
    pin.lineTo(-12, -1)
    pin.closePath()
    pin.fillPath()
    pin.strokePath()

    const actionDot = this.scene.add.ellipse(0, -1, 8, 8, style.color, 0.9)
    const stem = this.scene.add.rectangle(0, 7, 2, 6, style.color, 0.72)

    container.add([
      halo,
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
    this.markers.push({
      candidateId: candidate.id,
      container,
      halo,
      selectionRing,
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
      marker.selectionRing.setStrokeStyle(2, 0xfffdf7, active ? 0.88 : 0)
      marker.halo.setAlpha(active ? 0.26 : 0.14)
    })
  }
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
      selectionMode: "hover_click_marker",
      privateAreaFeedback: "none",
    },
  }
}
