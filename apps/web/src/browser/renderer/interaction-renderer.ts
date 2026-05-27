import Phaser from "phaser"

import { ZONE_LABEL_DEPTH } from "./constants"
import { clamp, roundTo } from "./math"
import {
  applyCrispWorldText,
  WORLD_TEXT_RESOLUTION,
} from "./text-rendering"
import type {
  RendererWorldInteractionCandidate,
  RendererWorldInteractionInfo,
} from "./types"

interface InteractionMarkerView {
  readonly candidateId: string
  readonly container: Phaser.GameObjects.Container
  readonly halo: Phaser.GameObjects.Ellipse
  readonly selectionRing: Phaser.GameObjects.Ellipse
  readonly promptBack: Phaser.GameObjects.Rectangle
  readonly promptText: Phaser.GameObjects.Text
  readonly keyBack: Phaser.GameObjects.Rectangle
  readonly keyText: Phaser.GameObjects.Text
}

const MARKER_SCREEN_SCALE_MIN = 0.72
const MARKER_SCREEN_SCALE_MAX = 1.18
const MARKER_TEXT_RESOLUTION = WORLD_TEXT_RESOLUTION

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
    visibleMarkerCandidates(this.info)
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
    const scale = roundTo(
      clamp(1 / zoom, MARKER_SCREEN_SCALE_MIN, MARKER_SCREEN_SCALE_MAX),
      2,
    )

    this.markers.forEach((marker) => marker.container.setScale(scale))
  }

  private createActionMarker(candidate: RendererWorldInteractionCandidate): void {
    const style = interactionStyle(candidate)
    const position = markerPosition(candidate)
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
    const glyph = this.scene.add.text(0, -1, style.glyph, {
      color: "#fffdf7",
      fontFamily: "Aptos, Segoe UI, sans-serif",
      fontSize: "7px",
      fontStyle: "900",
      align: "center",
      resolution: MARKER_TEXT_RESOLUTION,
    })
    applyCrispWorldText(glyph)
    glyph.setOrigin(0.5, 0.5)

    const keyBack = this.scene.add.rectangle(-25, -19, 17, 15, 0x20201d, 0.88)
    keyBack.setStrokeStyle(1, 0xfffdf7, 0.62)
    const keyText = this.scene.add.text(-25, -20, "E", {
      color: "#fffdf7",
      fontFamily: "Aptos, Segoe UI, sans-serif",
      fontSize: "9px",
      fontStyle: "900",
      align: "center",
      resolution: MARKER_TEXT_RESOLUTION,
    })
    applyCrispWorldText(keyText)
    keyText.setOrigin(0.5, 0.5)

    const promptLabel = markerPromptLabel(candidate)
    const promptBack = this.scene.add.rectangle(
      0,
      24,
      clamp(promptLabel.length * 5.9 + 16, 44, 104),
      17,
      0xfffdf7,
      0.94,
    )
    promptBack.setStrokeStyle(1, style.color, 0.52)
    const promptText = this.scene.add.text(0, 23, promptLabel, {
      color: style.textColor,
      fontFamily: "Aptos, Segoe UI, sans-serif",
      fontSize: "8px",
      fontStyle: "850",
      align: "center",
      resolution: MARKER_TEXT_RESOLUTION,
    })
    applyCrispWorldText(promptText)
    promptText.setOrigin(0.5, 0.5)

    container.add([
      halo,
      selectionRing,
      pin,
      stem,
      actionDot,
      glyph,
      keyBack,
      keyText,
      promptBack,
      promptText,
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
      promptBack,
      promptText,
      keyBack,
      keyText,
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
      marker.promptBack.setAlpha(active ? 1 : 0.94)
      marker.promptText.setAlpha(active ? 1 : 0.94)
      marker.keyBack.setAlpha(active ? 0.96 : 0.88)
      marker.keyText.setAlpha(active ? 1 : 0.94)
    })
  }
}

function interactionStyle(candidate: RendererWorldInteractionCandidate): {
  readonly color: number
  readonly textColor: string
  readonly glyph: string
} {
  switch (candidate.action) {
    case "join_meeting":
      return { color: 0x2f8f63, textColor: "#0f4f38", glyph: "CALL" }
    case "enter_private":
      return { color: 0x755aa5, textColor: "#44305f", glyph: "LOCK" }
    case "enter_portal":
      return { color: 0x316f9f, textColor: "#1d4260", glyph: "GO" }
    case "open_door":
      return { color: 0x316f9f, textColor: "#1d4260", glyph: "DOOR" }
    case "use_object":
      return candidate.serverPermitted
        ? { color: 0x2f8f63, textColor: "#0f4f38", glyph: "USE" }
        : { color: 0xa66f19, textColor: "#6b440d", glyph: "..." }
  }
}

function markerPosition(candidate: RendererWorldInteractionCandidate): {
  readonly x: number
  readonly y: number
} {
  const centerX = candidate.bounds.x + candidate.bounds.width / 2
  const centerY = candidate.bounds.y + candidate.bounds.height / 2

  if (candidate.kind === "zone") {
    return {
      x: candidate.action === "enter_portal"
        ? candidate.bounds.x + candidate.bounds.width + 18
        : candidate.bounds.x + candidate.bounds.width - 18,
      y: centerY,
    }
  }

  return {
    x: centerX,
    y: candidate.bounds.y - 9,
  }
}

function markerPromptLabel(candidate: RendererWorldInteractionCandidate): string {
  if (candidate.permission === "pending") return "Checking"
  if (!candidate.serverPermitted) return "Locked"
  switch (candidate.action) {
    case "join_meeting":
      return "Join call"
    case "enter_private":
      return "Private"
    case "enter_portal":
      return "Enter"
    case "open_door":
      return "Open door"
    case "use_object":
      return candidate.label
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

function visibleMarkerCandidates(
  info: RendererWorldInteractionInfo,
): readonly RendererWorldInteractionCandidate[] {
  const primary = info.primaryCandidateId
    ? info.candidates.find((candidate) => candidate.id === info.primaryCandidateId)
    : undefined
  const candidates = info.candidates.filter(
    (candidate) => candidate.active && candidate.markerVisible,
  )

  if (!primary) return candidates

  return candidates.filter(
    (candidate) =>
      candidate.id === primary.id ||
      !isOverlappingDoorPortalMarker(candidate, primary),
  )
}

function isOverlappingDoorPortalMarker(
  candidate: RendererWorldInteractionCandidate,
  primary: RendererWorldInteractionCandidate,
): boolean {
  if (candidate.id === primary.id) return false
  const portalAndDoor =
    [candidate.action, primary.action].includes("enter_portal") &&
    [candidate.action, primary.action].includes("open_door")

  return portalAndDoor && distanceBetweenBounds(candidate.bounds, primary.bounds) < 54
}

function distanceBetweenBounds(
  first: RendererWorldInteractionCandidate["bounds"],
  second: RendererWorldInteractionCandidate["bounds"],
): number {
  return Math.hypot(
    first.x + first.width / 2 - (second.x + second.width / 2),
    first.y + first.height / 2 - (second.y + second.height / 2),
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
