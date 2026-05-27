import Phaser from "phaser"

import {
  DEFAULT_RENDERED_PLAYERS,
  DEFAULT_VIEWPORT_HEIGHT,
  DEFAULT_VIEWPORT_WIDTH,
  DEFAULT_ZOOM_FACTOR,
  MAX_ZOOM_FACTOR,
  MIN_VIEWPORT_HEIGHT,
  MIN_VIEWPORT_WIDTH,
  MIN_ZOOM_FACTOR,
  PHASER_RENDERER_CONFIG,
  ZOOM_STEP,
} from "./constants"
import {
  isWebGLRenderer,
  RendererCapabilityReporter,
} from "./capability-reporter"
import { clamp } from "./math"
import { OfficeScene } from "./office-scene"
import { RendererSceneManager } from "./renderer-scene-manager"
import type {
  AvatarEmoteId,
  FixtureMap,
  RenderedPlayer,
  RendererAvatarInfo,
  RendererAvatarPlayerInfo,
  RendererAudioCueId,
  RendererAudioInfo,
  RendererCameraMode,
  RendererCameraState,
  RendererCapabilityInfo,
  RendererDevToolsInfo,
  RendererDevToolsOptions,
  RendererEffectsInfo,
  RendererEffectsOptions,
  RendererMapValidationInfo,
  RendererPerformanceInfo,
  RendererViewportState,
  RendererWorldInteractionInfo,
  RendererZoneInfo,
  RendererZoneInteractionState,
  RendererZonePresentationInfo,
  RendererZoomPresetId,
} from "./types"

export class PhaserOfficeRenderer {
  private static nextGameInstanceId = 1
  private readonly sceneManager: RendererSceneManager
  private readonly scene: OfficeScene
  private readonly game: Phaser.Game
  private readonly gameInstanceId = PhaserOfficeRenderer.nextGameInstanceId
  private readonly ready: Promise<OfficeScene>
  private readonly resizeObserver: ResizeObserver
  private readonly capabilityReporter: RendererCapabilityReporter
  private readonly labelOverlay: HTMLDivElement
  private readonly labelNodes = new Map<string, HTMLDivElement>()
  private readonly zoneLabelNodes = new Map<string, HTMLDivElement>()
  private labelFrameRequestId = 0
  private sceneReady = false
  private zoomFactor = DEFAULT_ZOOM_FACTOR
  private activeZoneIds: readonly string[] = []
  private zoneInteractionState: RendererZoneInteractionState = {
    activeZoneIds: [],
    availableActionZoneIds: [],
    joinedZoneIds: [],
  }
  private worldInteractionInfo: RendererWorldInteractionInfo =
    emptyWorldInteractionInfo()
  private players: readonly RenderedPlayer[] = DEFAULT_RENDERED_PLAYERS
  private fixtureMap?: FixtureMap
  private renderTask: Promise<void> = Promise.resolve()

  constructor(private readonly parent: HTMLElement) {
    PhaserOfficeRenderer.nextGameInstanceId += 1
    parent.classList.add("phaser-world-host")
    this.sceneManager = new RendererSceneManager((scene) => {
      this.resolveReady(scene)
    })
    this.scene = this.sceneManager.officeScene
    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve
    })
    this.game = new Phaser.Game({
      type: Phaser.WEBGL,
      parent,
      width: DEFAULT_VIEWPORT_WIDTH,
      height: DEFAULT_VIEWPORT_HEIGHT,
      backgroundColor: "#e7edf0",
      banner: false,
      render: {
        pixelArt: PHASER_RENDERER_CONFIG.pixelArt,
        smoothPixelArt: PHASER_RENDERER_CONFIG.smoothPixelArt,
        antialias: PHASER_RENDERER_CONFIG.antialias,
        antialiasGL: PHASER_RENDERER_CONFIG.antialiasGL,
        roundPixels: PHASER_RENDERER_CONFIG.roundPixels,
        powerPreference: PHASER_RENDERER_CONFIG.powerPreference,
        transparent: PHASER_RENDERER_CONFIG.transparent,
        clearBeforeRender: PHASER_RENDERER_CONFIG.clearBeforeRender,
        preserveDrawingBuffer: PHASER_RENDERER_CONFIG.preserveDrawingBuffer,
        premultipliedAlpha: PHASER_RENDERER_CONFIG.premultipliedAlpha,
        failIfMajorPerformanceCaveat:
          PHASER_RENDERER_CONFIG.failIfMajorPerformanceCaveat,
        mipmapRegeneration: false,
        autoMobileTextures: true,
      },
      scale: {
        mode: Phaser.Scale.NONE,
      },
      physics: {
        default: "arcade",
        arcade: {
          debug: false,
          gravity: { x: 0, y: 0 },
        },
      },
      scene: this.sceneManager.scenes,
    })
    this.capabilityReporter = new RendererCapabilityReporter(this.game)
    this.labelOverlay = document.createElement("div")
    this.labelOverlay.className = "world-dom-label-overlay"
    parent.appendChild(this.labelOverlay)
    void this.ready.then(() => {
      this.sceneReady = true
      this.renderDomLabels()
    })
    this.startDomLabelLoop()
    this.applyCrispCanvasTextScaling()
    this.installContextRecoveryHandlers()
    this.resizeObserver = new ResizeObserver(() => this.resizeToParent())
    this.resizeObserver.observe(parent)
    this.resizeToParent()
  }

  renderMap(fixtureMap: FixtureMap): void {
    this.renderTask = this.queueRender(async (scene) => {
      await scene.renderFixtureMap(fixtureMap, this.players)
      this.fixtureMap = fixtureMap
      scene.setZoneInteractionState(this.zoneInteractionState)
      scene.setWorldInteractions(this.worldInteractionInfo)
    })
    void this.renderTask.catch(() => undefined)
  }

  updatePlayers(players: readonly RenderedPlayer[]): void {
    this.players = players
    void this.renderTask.then(async () => {
      const scene = await this.ready
      scene.updatePlayers(players)
    })
  }

  setActiveZones(zoneIds: readonly string[]): void {
    this.activeZoneIds = [...zoneIds]
    this.zoneInteractionState = {
      activeZoneIds: this.activeZoneIds,
      availableActionZoneIds: this.activeZoneIds,
      joinedZoneIds: [],
    }
    void this.renderTask.then(async () => {
      const scene = await this.ready
      scene.setActiveZones(this.activeZoneIds)
    })
  }

  setZoneInteractionState(state: RendererZoneInteractionState): void {
    this.activeZoneIds = [...state.activeZoneIds]
    this.zoneInteractionState = {
      activeZoneIds: [...state.activeZoneIds],
      availableActionZoneIds: [...(state.availableActionZoneIds ?? [])],
      joinedZoneIds: [...(state.joinedZoneIds ?? [])],
    }
    void this.renderTask.then(async () => {
      const scene = await this.ready
      scene.setZoneInteractionState(this.zoneInteractionState)
    })
  }

  setWorldInteractions(info: RendererWorldInteractionInfo): void {
    this.worldInteractionInfo = cloneWorldInteractionInfo(info)
    void this.renderTask.then(async () => {
      const scene = await this.ready
      scene.setWorldInteractions(this.worldInteractionInfo)
    })
  }

  setWorldInteractionActivationHandler(
    handler: ((candidateId: string) => void) | undefined,
  ): void {
    void this.renderTask.then(async () => {
      const scene = await this.ready
      scene.setWorldInteractionActivationHandler(handler)
    })
  }

  zoomIn(): RendererViewportState {
    return this.setZoomFactor(this.getCameraState().zoomFactor + ZOOM_STEP)
  }

  zoomOut(): RendererViewportState {
    return this.setZoomFactor(this.getCameraState().zoomFactor - ZOOM_STEP)
  }

  resetZoom(): RendererViewportState {
    this.setZoomPreset("standard")
    return this.getViewportState()
  }

  getViewportState(): RendererViewportState {
    return this.scene.getViewportState()
  }

  getCameraState(): RendererCameraState {
    return this.scene.getCameraState()
  }

  setCameraMode(mode: RendererCameraMode): RendererCameraState {
    this.scene.setCameraMode(mode)
    const state = this.getCameraState()
    this.zoomFactor = state.zoomFactor
    return state
  }

  setZoomPreset(zoomPreset: RendererZoomPresetId): RendererCameraState {
    this.scene.setZoomPreset(zoomPreset)
    const state = this.getCameraState()
    this.zoomFactor = state.zoomFactor
    return state
  }

  triggerAvatarEmote(playerId: string, emoteId: AvatarEmoteId): void {
    this.scene.triggerAvatarEmote(playerId, emoteId)
  }

  playWorldAudioCue(cueId: RendererAudioCueId): void {
    this.scene.playWorldAudioCue(cueId)
  }

  getAvatarInfo(): RendererAvatarInfo {
    return this.scene.getAvatarInfo()
  }

  getAudioInfo(): RendererAudioInfo {
    return this.scene.getAudioInfo()
  }

  setZoneDebugOverlayEnabled(enabled: boolean): void {
    this.scene.setZoneDebugOverlayEnabled(enabled)
  }

  setDevToolsState(options: RendererDevToolsOptions): void {
    this.scene.setDevToolsState(options)
  }

  setEffectsOptions(options: RendererEffectsOptions): void {
    this.scene.setEffectsOptions(options)
  }

  getZoneInfo(): RendererZonePresentationInfo {
    return this.scene.getZoneInfo()
  }

  getWorldInteractionInfo(): RendererWorldInteractionInfo {
    return this.scene.getWorldInteractionInfo()
  }

  getEffectsInfo(): RendererEffectsInfo {
    return this.scene.getEffectsInfo()
  }

  getDevToolsInfo(): RendererDevToolsInfo {
    return this.scene.getDevToolsInfo()
  }

  getPerformanceInfo(): RendererPerformanceInfo {
    return this.scene.getPerformanceInfo(this.gameInstanceId)
  }

  getMapValidationInfo(): RendererMapValidationInfo {
    return this.scene.getMapValidationInfo()
  }

  preflightMap(fixtureMap: FixtureMap): RendererMapValidationInfo {
    return this.scene.preflightFixtureMap(fixtureMap)
  }

  projectWorldToViewport(point: { readonly x: number; readonly y: number }): {
    readonly x: number
    readonly y: number
  } {
    return this.scene.projectWorldToViewport(point)
  }

  getCapabilityInfo(): RendererCapabilityInfo {
    return this.capabilityReporter.getInfo(
      this.scene.getCameraRoundPixels(),
      this.scene.getTilemapInfo(),
      this.scene.getAssetPipelineInfo(),
      this.sceneManager.getInfo(this.game),
      this.scene.getAdvancedInputInfo(),
      this.scene.getPhysicsInfo(),
      this.scene.getAudioInfo(),
      this.scene.getDepthEffectsInfo(),
      this.scene.getDepthInfo(),
      this.scene.getEffectsInfo(),
      this.scene.getMapValidationInfo(),
      this.getPerformanceInfo(),
    )
  }

  async advanceTime(): Promise<void> {
    await this.ready
    await this.renderTask
  }

  destroy(): void {
    cancelAnimationFrame(this.labelFrameRequestId)
    this.labelNodes.clear()
    this.zoneLabelNodes.clear()
    this.labelOverlay.remove()
    this.resizeObserver.disconnect()
    this.game.destroy(true)
  }

  private startDomLabelLoop(): void {
    const update = () => {
      this.renderDomLabels()
      this.labelFrameRequestId = requestAnimationFrame(update)
    }

    this.labelFrameRequestId = requestAnimationFrame(update)
  }

  private renderDomLabels(): void {
    if (!this.sceneReady) return

    const visiblePlayerIds = new Set<string>()

    this.scene.getAvatarInfo().players.forEach((player) => {
      visiblePlayerIds.add(player.playerId)
      this.renderDomLabel(player)
    })

    this.labelNodes.forEach((node, playerId) => {
      if (visiblePlayerIds.has(playerId)) return
      node.remove()
      this.labelNodes.delete(playerId)
    })

    const visibleZoneIds = new Set<string>()

    this.scene.getZoneInfo().zones.forEach((zone) => {
      if (!zone.labelVisible) return
      visibleZoneIds.add(zone.id)
      this.renderDomZoneLabel(zone)
    })

    this.zoneLabelNodes.forEach((node, zoneId) => {
      if (visibleZoneIds.has(zoneId)) return
      node.remove()
      this.zoneLabelNodes.delete(zoneId)
    })
  }

  private renderDomLabel(player: RendererAvatarPlayerInfo): void {
    let node = this.labelNodes.get(player.playerId)

    if (!node) {
      node = document.createElement("div")
      node.className = "world-dom-label world-dom-avatar-label"
      this.labelOverlay.appendChild(node)
      this.labelNodes.set(player.playerId, node)
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
    const metrics = domLabelMetrics(player.labelScreenScale)
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

  private renderDomZoneLabel(zone: RendererZoneInfo): void {
    let node = this.zoneLabelNodes.get(zone.id)

    if (!node) {
      node = document.createElement("div")
      node.className = "world-dom-label world-dom-zone-label"
      this.labelOverlay.appendChild(node)
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

  private installContextRecoveryHandlers(): void {
    const renderer = this.game.renderer
    if (!isWebGLRenderer(renderer)) return

    renderer.on(Phaser.Renderer.Events.LOSE_WEBGL, () => {
      this.capabilityReporter.noteContextLost()
    })
    renderer.on(Phaser.Renderer.Events.RESTORE_WEBGL, () => {
      this.capabilityReporter.noteContextRestored()
      this.rerenderAfterContextRestore()
    })
  }

  private rerenderAfterContextRestore(): void {
    const fixtureMap = this.fixtureMap
    if (!fixtureMap) return

    this.renderTask = this.queueRender(async (scene) => {
      await scene.renderFixtureMap(fixtureMap, this.players)
      scene.setZoneInteractionState(this.zoneInteractionState)
      scene.setWorldInteractions(this.worldInteractionInfo)
      this.zoomFactor = scene.getCameraState().zoomFactor
    })
  }

  private queueRender(render: (scene: OfficeScene) => Promise<void>): Promise<void> {
    const previousRenderTask = this.renderTask.catch(() => undefined)
    return previousRenderTask.then(async () => {
      const scene = await this.ready
      await render(scene)
    })
  }

  private setZoomFactor(zoomFactor: number): RendererViewportState {
    this.zoomFactor = clamp(zoomFactor, MIN_ZOOM_FACTOR, MAX_ZOOM_FACTOR)
    this.scene.setZoomFactor(this.zoomFactor)
    this.zoomFactor = this.scene.getCameraState().zoomFactor
    return this.getViewportState()
  }

  private resizeToParent(): void {
    const rect = this.parent.getBoundingClientRect()
    const width = Math.max(
      MIN_VIEWPORT_WIDTH,
      Math.round(rect.width || this.parent.clientWidth || DEFAULT_VIEWPORT_WIDTH),
    )
    const height = Math.max(
      MIN_VIEWPORT_HEIGHT,
      Math.round(rect.height || this.parent.clientHeight || DEFAULT_VIEWPORT_HEIGHT),
    )

    this.game.scale.resize(width, height)
    this.applyCrispCanvasTextScaling()
    this.scene.resizeViewport(width, height)
    this.zoomFactor = this.scene.getCameraState().zoomFactor
  }

  private applyCrispCanvasTextScaling(): void {
    this.game.canvas.style.imageRendering = "auto"
  }

  private resolveReady: (scene: OfficeScene) => void = () => undefined
}

export { PhaserOfficeRenderer as RendererHost }

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

function cloneWorldInteractionInfo(
  info: RendererWorldInteractionInfo,
): RendererWorldInteractionInfo {
  return {
    ...info,
    activeCandidateIds: [...info.activeCandidateIds],
    permittedCandidateIds: [...info.permittedCandidateIds],
    deniedCandidateIds: [...info.deniedCandidateIds],
    candidates: info.candidates.map((candidate) => ({ ...candidate })),
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

function domLabelMetrics(scale: number): {
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
