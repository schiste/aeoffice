import type { TileWorldScene } from "./tile-world-scene"
import {
  interactionActionFlowState,
  interactionAffordanceLabel,
  interactionMarkerPosition,
  interactionMarkerScreenScale,
  interactionPromptLabel,
  interactionStyle,
  visibleInteractionMarkerCandidates,
} from "./world-interaction-presentation"
import type {
  RendererWorldInteractionCandidate,
  RendererWorldInteractionInfo,
} from "./types"

interface InteractionLabelNodes {
  readonly card: HTMLDivElement
  readonly key: HTMLSpanElement
  readonly kind: HTMLSpanElement
  readonly prompt: HTMLDivElement
}

export class DomInteractionOverlayRenderer {
  private readonly interactionLabelNodes = new Map<string, InteractionLabelNodes>()

  constructor(
    private readonly overlay: HTMLElement,
    private readonly scene: TileWorldScene,
  ) {}

  destroy(): void {
    this.interactionLabelNodes.forEach((nodes) => nodes.card.remove())
    this.interactionLabelNodes.clear()
  }

  render(
    info: RendererWorldInteractionInfo,
    options: { readonly zoom: number },
  ): void {
    const visibleCandidateIds = new Set<string>()
    const screenScale = interactionMarkerScreenScale(options.zoom) * options.zoom

    visibleInteractionMarkerCandidates(info).forEach((candidate) => {
      visibleCandidateIds.add(candidate.id)
      this.renderInteractionLabel(candidate, screenScale, {
        active:
          candidate.id === info.hoveredCandidateId ||
          candidate.id === info.selectedCandidateId,
        hovered: candidate.id === info.hoveredCandidateId,
        selected: candidate.id === info.selectedCandidateId,
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
    state: {
      readonly active: boolean
      readonly hovered: boolean
      readonly selected: boolean
    },
  ): void {
    const nodes = this.interactionNodesFor(candidate)
    const style = interactionStyle(candidate)
    const base = this.scene.projectWorldToViewport(
      interactionMarkerPosition(candidate),
    )

    nodes.card.classList.toggle("is-active", state.active)
    nodes.card.classList.toggle("is-hovered", state.hovered)
    nodes.card.classList.toggle("is-selected", state.selected)
    nodes.card.dataset.actionTone = style.tone
    nodes.card.dataset.action = candidate.action
    nodes.card.dataset.interactionKind = candidate.kind
    nodes.card.dataset.actionFlow = interactionActionFlowState(candidate)
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

function cssHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`
}
