import { clamp, roundTo } from "./math"
import type {
  RendererWorldInteractionCandidate,
  RendererWorldInteractionInfo,
} from "./types"

export const INTERACTION_MARKER_SCREEN_SCALE_MIN = 0.72
export const INTERACTION_MARKER_SCREEN_SCALE_MAX = 1.18
export const INTERACTION_MARKER_HIT_AREA_WIDTH = 148
export const INTERACTION_MARKER_HIT_AREA_HEIGHT = 82

export function interactionMarkerScreenScale(zoom: number): number {
  return roundTo(
    clamp(
      1 / (zoom || 1),
      INTERACTION_MARKER_SCREEN_SCALE_MIN,
      INTERACTION_MARKER_SCREEN_SCALE_MAX,
    ),
    2,
  )
}

export function interactionStyle(candidate: RendererWorldInteractionCandidate): {
  readonly color: number
  readonly textColor: string
  readonly glyph: string
  readonly tone: string
} {
  if (candidate.presentation) {
    return {
      color: candidate.presentation.color,
      textColor: candidate.presentation.textColor,
      glyph: candidate.presentation.glyph ?? candidate.label,
      tone: candidate.presentation.tone ?? candidate.kind,
    }
  }

  return candidate.serverPermitted
    ? {
        color: 0x2f8f63,
        textColor: "#0f4f38",
        glyph: candidate.label,
        tone: candidate.kind,
      }
    : {
        color: 0xa66f19,
        textColor: "#6b440d",
        glyph: "Locked",
        tone: "locked",
      }
}

export function interactionActionFlowState(
  candidate: RendererWorldInteractionCandidate,
): "checking" | "locked" | "ready" {
  if (candidate.permission === "pending") return "checking"
  if (!candidate.serverPermitted) return "locked"
  return "ready"
}

export function interactionMarkerPosition(
  candidate: RendererWorldInteractionCandidate,
): {
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

export function interactionPromptLabel(
  candidate: RendererWorldInteractionCandidate,
): string {
  if (candidate.permission === "pending") return "Checking"
  if (!candidate.serverPermitted) return "Locked"
  return candidate.presentation?.prompt ?? candidate.prompt ?? candidate.label
}

export function interactionAffordanceLabel(
  candidate: RendererWorldInteractionCandidate,
): "Checking" | "Locked" | "E / Tap" {
  if (candidate.permission === "pending") return "Checking"
  if (!candidate.serverPermitted) return "Locked"
  return "E / Tap"
}

export function visibleInteractionMarkerCandidates(
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
