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
      scene: this.sceneManager.scenes,
    })
    this.capabilityReporter = new RendererCapabilityReporter(this.game)
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

  getAvatarInfo(): RendererAvatarInfo {
    return this.scene.getAvatarInfo()
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
    this.resizeObserver.disconnect()
    this.game.destroy(true)
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
    this.scene.resizeViewport(width, height)
    this.zoomFactor = this.scene.getCameraState().zoomFactor
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
