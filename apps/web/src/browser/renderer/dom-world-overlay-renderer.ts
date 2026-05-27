import { clamp } from "./math"
import type { OfficeScene } from "./office-scene"
import { avatarEmoteDefinition } from "./avatar-registry"
import {
  interactionAffordanceLabel,
  interactionMarkerPosition,
  interactionMarkerScreenScale,
  interactionPromptLabel,
  interactionStyle,
  visibleInteractionMarkerCandidates,
} from "./world-interaction-presentation"
import type {
  RendererAvatarPlayerInfo,
  RendererWorldInteractionCandidate,
  RendererZoneInfo,
} from "./types"

interface InteractionLabelNodes {
  readonly card: HTMLDivElement
  readonly key: HTMLSpanElement
  readonly kind: HTMLSpanElement
  readonly prompt: HTMLDivElement
}

export class DomWorldOverlayRenderer {
  private readonly overlay: HTMLDivElement
  private readonly avatarLabelNodes = new Map<string, HTMLDivElement>()
  private readonly zoneLabelNodes = new Map<string, HTMLDivElement>()
  private readonly emoteLabelNodes = new Map<string, HTMLDivElement>()
  private readonly interactionLabelNodes = new Map<string, InteractionLabelNodes>()
  private frameRequestId = 0
  private sceneReady = false

  constructor(
    parent: HTMLElement,
    private readonly scene: OfficeScene,
    sceneReady: Promise<OfficeScene>,
  ) {
    this.overlay = document.createElement("div")
    this.overlay.className = "world-dom-label-overlay"
    parent.appendChild(this.overlay)

    void sceneReady.then(() => {
      this.sceneReady = true
      this.render()
    })
    this.startLoop()
  }

  destroy(): void {
    cancelAnimationFrame(this.frameRequestId)
    this.avatarLabelNodes.clear()
    this.zoneLabelNodes.clear()
    this.emoteLabelNodes.clear()
    this.interactionLabelNodes.clear()
    this.overlay.remove()
  }

  private startLoop(): void {
    const update = () => {
      this.render()
      this.frameRequestId = requestAnimationFrame(update)
    }

    this.frameRequestId = requestAnimationFrame(update)
  }

  private render(): void {
    if (!this.sceneReady) return

    this.renderAvatarLabels()
    this.renderZoneLabels()
    this.renderInteractionLabels()
  }

  private renderAvatarLabels(): void {
    const visiblePlayerIds = new Set<string>()
    const activeEmotePlayerIds = new Set<string>()

    this.scene.getAvatarInfo().players.forEach((player) => {
      visiblePlayerIds.add(player.playerId)
      this.renderAvatarLabel(player)
      if (player.emoteId && player.emoteOverlay.visible) {
        activeEmotePlayerIds.add(player.playerId)
        this.renderEmoteLabel(player)
      }
    })

    this.avatarLabelNodes.forEach((node, playerId) => {
      if (visiblePlayerIds.has(playerId)) return
      node.remove()
      this.avatarLabelNodes.delete(playerId)
    })
    this.emoteLabelNodes.forEach((node, playerId) => {
      if (visiblePlayerIds.has(playerId) && activeEmotePlayerIds.has(playerId)) return
      node.remove()
      this.emoteLabelNodes.delete(playerId)
    })
  }

  private renderAvatarLabel(player: RendererAvatarPlayerInfo): void {
    let node = this.avatarLabelNodes.get(player.playerId)

    if (!node) {
      node = document.createElement("div")
      node.className = "world-dom-label world-dom-avatar-label"
      this.overlay.appendChild(node)
      this.avatarLabelNodes.set(player.playerId, node)
    }

    if (node.textContent !== player.name) {
      node.textContent = player.name
    }

    node.style.setProperty("--world-label-accent", avatarLabelAccent(player.avatarId))
    node.style.opacity = player.labelVisible
      ? player.labelOccludedByForeground ? "0.52" : "1"
      : "0"

    const center = {
      x: player.labelBounds.x + player.labelBounds.width / 2,
      y: player.labelBounds.y + player.labelBounds.height / 2,
    }
    const viewport = this.scene.projectWorldToViewport(center)
    const metrics = domAvatarLabelMetrics(player.labelScreenScale)
    node.style.setProperty("--world-label-font-size", `${metrics.fontSizePx}px`)
    node.style.setProperty("--world-label-line-height", `${metrics.lineHeightPx}px`)
    node.style.setProperty("--world-label-padding", metrics.padding)
    node.style.setProperty("--world-label-min-width", `${metrics.minWidthPx}px`)
    node.style.setProperty("--world-label-max-width", `${metrics.maxWidthPx}px`)

    const width = Math.max(1, node.offsetWidth)
    const height = Math.max(1, node.offsetHeight)
    node.style.left = `${Math.round(viewport.x - width / 2)}px`
    node.style.top = `${Math.round(viewport.y - height / 2)}px`
  }

  private renderEmoteLabel(player: RendererAvatarPlayerInfo): void {
    if (!player.emoteId || !player.emoteOverlay.visible) return

    let node = this.emoteLabelNodes.get(player.playerId)

    if (!node) {
      node = document.createElement("div")
      node.className = "world-dom-emote-label"
      this.overlay.appendChild(node)
      this.emoteLabelNodes.set(player.playerId, node)
    }

    const emote = avatarEmoteDefinition(player.emoteId)
    if (node.textContent !== emote.glyph) {
      node.textContent = emote.glyph
    }

    node.style.setProperty("--world-label-accent", avatarLabelAccent(player.avatarId))
    node.style.setProperty("--world-emote-size", `${player.emoteOverlay.size}px`)
    node.style.opacity = String(player.emoteOverlay.opacity)

    const viewport = this.scene.projectWorldToViewport({
      x: player.currentPosition.x + player.emoteOverlay.x,
      y: player.currentPosition.y + player.emoteOverlay.y,
    })
    const width = Math.max(1, node.offsetWidth)
    const height = Math.max(1, node.offsetHeight)

    node.style.left = `${Math.round(viewport.x - width / 2)}px`
    node.style.top = `${Math.round(viewport.y - height / 2)}px`
  }

  private renderZoneLabels(): void {
    const visibleZoneIds = new Set<string>()
    const suppressedZoneLabelIds = activeInteractionZoneIds(
      this.scene.getWorldInteractionInfo(),
    )

    this.scene.getZoneInfo().zones.forEach((zone) => {
      if (suppressedZoneLabelIds.has(zone.id)) return
      if (!zone.labelVisible) return
      visibleZoneIds.add(zone.id)
      this.renderZoneLabel(zone)
    })

    this.zoneLabelNodes.forEach((node, zoneId) => {
      if (visibleZoneIds.has(zoneId)) return
      node.remove()
      this.zoneLabelNodes.delete(zoneId)
    })
  }

  private renderZoneLabel(zone: RendererZoneInfo): void {
    let node = this.zoneLabelNodes.get(zone.id)

    if (!node) {
      node = document.createElement("div")
      node.className = "world-dom-label world-dom-zone-label"
      this.overlay.appendChild(node)
      this.zoneLabelNodes.set(zone.id, node)
    }

    if (node.textContent !== zone.label) {
      node.textContent = zone.label
    }

    node.dataset.zoneKind = zone.kind
    node.style.setProperty("--world-label-accent", zoneLabelAccent(zone))
    const metrics = domZoneLabelMetrics(zone.labelScale)
    node.style.setProperty("--world-label-font-size", `${metrics.fontSizePx}px`)
    node.style.setProperty("--world-label-line-height", `${metrics.lineHeightPx}px`)
    node.style.setProperty("--world-label-padding", metrics.padding)
    node.style.setProperty("--world-label-min-width", `${metrics.minWidthPx}px`)
    node.style.setProperty("--world-label-max-width", `${metrics.maxWidthPx}px`)

    const left = this.scene.projectWorldToViewport({
      x: zone.bounds.x,
      y: zone.bounds.y,
    })
    const right = this.scene.projectWorldToViewport({
      x: zone.bounds.x + zone.bounds.width,
      y: zone.bounds.y,
    })
    const labelAnchor = this.scene.projectWorldToViewport({
      x: zone.bounds.x + zone.bounds.width / 2,
      y: zone.bounds.y + 12,
    })
    const width = Math.max(1, node.offsetWidth)
    const height = Math.max(1, node.offsetHeight)
    const minX = Math.min(left.x, right.x) + width / 2 + 7
    const maxX = Math.max(left.x, right.x) - width / 2 - 7
    const x = minX <= maxX ? clamp(labelAnchor.x, minX, maxX) : labelAnchor.x

    node.style.left = `${Math.round(x - width / 2)}px`
    node.style.top = `${Math.round(labelAnchor.y - height / 2)}px`
  }

  private renderInteractionLabels(): void {
    const info = this.scene.getWorldInteractionInfo()
    const visibleCandidateIds = new Set<string>()
    const zoom = this.scene.cameras.main.zoom || 1
    const screenScale = interactionMarkerScreenScale(zoom) * zoom

    visibleInteractionMarkerCandidates(info).forEach((candidate) => {
      visibleCandidateIds.add(candidate.id)
      this.renderInteractionLabel(candidate, screenScale, {
        active:
          candidate.id === info.hoveredCandidateId ||
          candidate.id === info.selectedCandidateId,
      })
    })

    this.interactionLabelNodes.forEach((nodes, candidateId) => {
      if (visibleCandidateIds.has(candidateId)) return
      nodes.card.remove()
      this.interactionLabelNodes.delete(candidateId)
    })
  }

  private renderInteractionLabel(
    candidate: RendererWorldInteractionCandidate,
    screenScale: number,
    state: { readonly active: boolean },
  ): void {
    const nodes = this.interactionNodesFor(candidate)
    const style = interactionStyle(candidate)
    const base = this.scene.projectWorldToViewport(
      interactionMarkerPosition(candidate),
    )

    nodes.card.classList.toggle("is-active", state.active)
    nodes.card.dataset.actionTone = style.tone
    nodes.card.style.setProperty("--world-label-accent", cssHex(style.color))
    nodes.card.style.color = style.textColor
    nodes.key.textContent = interactionAffordanceLabel(candidate)
    nodes.kind.textContent = style.glyph
    nodes.prompt.textContent = interactionPromptLabel(candidate)

    this.placeNode(nodes.card, {
      x: base.x,
      y: base.y + 29 * screenScale,
    })
  }

  private interactionNodesFor(
    candidate: RendererWorldInteractionCandidate,
  ): InteractionLabelNodes {
    const current = this.interactionLabelNodes.get(candidate.id)
    if (current) return current

    const card = document.createElement("div")
    card.className = "world-dom-interaction-card"
    const key = document.createElement("span")
    key.className = "world-dom-interaction-key"
    const kind = document.createElement("span")
    kind.className = "world-dom-interaction-kind"
    const prompt = document.createElement("div")
    prompt.className = "world-dom-interaction-prompt"
    card.append(key, kind, prompt)
    this.overlay.append(card)
    const nodes = { card, key, kind, prompt }
    this.interactionLabelNodes.set(candidate.id, nodes)

    return nodes
  }

  private placeNode(
    node: HTMLElement,
    center: { readonly x: number; readonly y: number },
  ): void {
    const width = Math.max(1, node.offsetWidth)
    const height = Math.max(1, node.offsetHeight)

    node.style.left = `${Math.round(center.x - width / 2)}px`
    node.style.top = `${Math.round(center.y - height / 2)}px`
  }
}

function avatarLabelAccent(avatarId: string): string {
  switch (avatarId) {
    case "cobalt":
      return "#316f9f"
    case "moss":
      return "#3c8759"
    case "violet":
      return "#755aa5"
    case "ember":
    default:
      return "#c45b40"
  }
}

function zoneLabelAccent(zone: RendererZoneInfo): string {
  if (zone.availability === "joined") return "#2b7a5f"
  if (zone.active || zone.availability === "available") return "#1d7768"

  switch (zone.kind) {
    case "meeting":
      return "#1e7d8f"
    case "private":
      return "#8762a8"
    case "portal":
      return "#b36b2f"
    case "quiet":
      return "#5f7f59"
    case "lobby":
    default:
      return "#227267"
  }
}

function domAvatarLabelMetrics(scale: number): {
  readonly fontSizePx: number
  readonly lineHeightPx: number
  readonly minWidthPx: number
  readonly maxWidthPx: number
  readonly padding: string
} {
  const cssScale = clamp(scale, 0.95, 1.14)
  const fontSizePx = Math.round(clamp(12 * cssScale, 12, 14))
  const lineHeightPx = fontSizePx + 2
  const paddingTopPx = Math.round(clamp(2 * cssScale, 2, 3))
  const paddingBottomPx = Math.round(clamp(3 * cssScale, 3, 4))
  const paddingX = Math.round(clamp(8 * cssScale, 8, 10))

  return {
    fontSizePx,
    lineHeightPx,
    minWidthPx: Math.round(clamp(52 * cssScale, 52, 60)),
    maxWidthPx: Math.round(clamp(142 * cssScale, 142, 162)),
    padding: `${paddingTopPx}px ${paddingX}px ${paddingBottomPx}px`,
  }
}

function domZoneLabelMetrics(scale: number): {
  readonly fontSizePx: number
  readonly lineHeightPx: number
  readonly minWidthPx: number
  readonly maxWidthPx: number
  readonly padding: string
} {
  const cssScale = clamp(scale, 0.92, 1.16)
  const fontSizePx = Math.round(clamp(10 * cssScale, 10, 12))
  const lineHeightPx = fontSizePx + 2
  const paddingTopPx = Math.round(clamp(1 * cssScale, 1, 2))
  const paddingBottomPx = Math.round(clamp(2 * cssScale, 2, 3))
  const paddingX = Math.round(clamp(6 * cssScale, 6, 8))

  return {
    fontSizePx,
    lineHeightPx,
    minWidthPx: 0,
    maxWidthPx: Math.round(clamp(120 * cssScale, 120, 142)),
    padding: `${paddingTopPx}px ${paddingX}px ${paddingBottomPx}px`,
  }
}

function cssHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`
}

function activeInteractionZoneIds(
  info: ReturnType<OfficeScene["getWorldInteractionInfo"]>,
): Set<string> {
  return new Set(
    visibleInteractionMarkerCandidates(info)
      .filter((candidate) => candidate.kind === "zone" && candidate.active)
      .map((candidate) => candidate.targetId),
  )
}
