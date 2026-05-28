import Phaser from "phaser"

import { ZONE_LABEL_DEPTH } from "./constants"
import {
  INTERACTION_MARKER_HIT_AREA_HEIGHT,
  INTERACTION_MARKER_HIT_AREA_WIDTH,
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
  readonly targetOutline: Phaser.GameObjects.Graphics
  readonly tapTarget: Phaser.GameObjects.Rectangle
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
    this.markers.forEach((marker) => {
      marker.targetOutline.destroy()
      marker.container.destroy(true)
    })
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
    const targetOutline = this.scene.add.graphics()
    const container = this.scene.add.container(position.x, position.y)

    targetOutline.setDepth(ZONE_LABEL_DEPTH + 8)
    container.setDepth(ZONE_LABEL_DEPTH + 12)
    container.setInteractive(
      new Phaser.Geom.Rectangle(
        -INTERACTION_MARKER_HIT_AREA_WIDTH / 2,
        -INTERACTION_MARKER_HIT_AREA_HEIGHT / 2,
        INTERACTION_MARKER_HIT_AREA_WIDTH,
        INTERACTION_MARKER_HIT_AREA_HEIGHT,
      ),
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

    const tapTarget = this.scene.add.rectangle(
      0,
      0,
      INTERACTION_MARKER_HIT_AREA_WIDTH - 18,
      INTERACTION_MARKER_HIT_AREA_HEIGHT - 18,
      style.color,
      0.018,
    )
    tapTarget.setStrokeStyle(1, style.color, 0.12)
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
      tapTarget,
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
      targetOutline,
      tapTarget,
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
      marker.tapTarget.setAlpha(active ? 0.07 : 0.018)
      marker.tapTarget.setStrokeStyle(
        active ? 1.7 : 1,
        0xfffdf7,
        active ? 0.32 : 0.12,
      )
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
        drawTargetFeedback(
          marker.targetOutline,
          candidate,
          interactionStyle(candidate).color,
          {
            hovered,
            selected,
          },
        )
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

function drawTargetFeedback(
  graphics: Phaser.GameObjects.Graphics,
  candidate: RendererWorldInteractionCandidate,
  color: number,
  state: { readonly hovered: boolean; readonly selected: boolean },
): void {
  graphics.clear()

  if (!candidate.active || !candidate.markerVisible) return

  const alpha = state.selected ? 0.78 : state.hovered ? 0.62 : 0.34
  const lineWidth = state.selected ? 2.4 : state.hovered ? 1.9 : 1.2
  const bounds = candidate.bounds

  graphics.lineStyle(lineWidth, color, alpha)
  graphics.fillStyle(color, state.selected ? 0.06 : 0.025)

  if (candidate.kind === "object") {
    graphics.fillRect(bounds.x - 3, bounds.y - 3, bounds.width + 6, bounds.height + 6)
    graphics.strokeRect(
      bounds.x - 4,
      bounds.y - 4,
      bounds.width + 8,
      bounds.height + 8,
    )
    drawCornerTicks(graphics, bounds, 8)
    return
  }

  if (candidate.action === "enter_portal" || candidate.action === "open_door") {
    const centerY = bounds.y + bounds.height / 2
    const direction = candidate.action === "enter_portal" ? 1 : -1
    graphics.strokeRect(bounds.x + 2, bounds.y + 2, bounds.width - 4, bounds.height - 4)
    graphics.beginPath()
    graphics.moveTo(bounds.x + bounds.width / 2 - direction * 11, centerY - 9)
    graphics.lineTo(bounds.x + bounds.width / 2 + direction * 1, centerY)
    graphics.lineTo(bounds.x + bounds.width / 2 - direction * 11, centerY + 9)
    graphics.strokePath()
    graphics.beginPath()
    graphics.moveTo(bounds.x + bounds.width / 2 + direction * 1, centerY - 9)
    graphics.lineTo(bounds.x + bounds.width / 2 + direction * 13, centerY)
    graphics.lineTo(bounds.x + bounds.width / 2 + direction * 1, centerY + 9)
    graphics.strokePath()
    return
  }

  drawCornerTicks(graphics, bounds, 12)
}

function drawCornerTicks(
  graphics: Phaser.GameObjects.Graphics,
  bounds: RendererWorldInteractionCandidate["bounds"],
  size: number,
): void {
  const left = bounds.x
  const right = bounds.x + bounds.width
  const top = bounds.y
  const bottom = bounds.y + bounds.height

  graphics.beginPath()
  graphics.moveTo(left, top + size)
  graphics.lineTo(left, top)
  graphics.lineTo(left + size, top)
  graphics.moveTo(right - size, top)
  graphics.lineTo(right, top)
  graphics.lineTo(right, top + size)
  graphics.moveTo(left, bottom - size)
  graphics.lineTo(left, bottom)
  graphics.lineTo(left + size, bottom)
  graphics.moveTo(right - size, bottom)
  graphics.lineTo(right, bottom)
  graphics.lineTo(right, bottom - size)
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
      objectSelectionMode: "hover_select_target_outline",
      doorPortalFeedback: "directional_beacon_and_bounds",
      actionFlow: "approach_permission_confirm_execute",
      touchAffordance: "large_marker_hit_area_dom_prompt",
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
      objectSelectionMode: "hover_select_target_outline",
      doorPortalFeedback: "directional_beacon_and_bounds",
      actionFlow: "approach_permission_confirm_execute",
      touchAffordance: "large_marker_hit_area_dom_prompt",
      privateAreaFeedback: "none",
    },
  }
}
