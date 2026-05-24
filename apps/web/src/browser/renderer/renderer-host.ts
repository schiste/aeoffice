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
import type {
  FixtureMap,
  RenderedPlayer,
  RendererCapabilityInfo,
  RendererViewportState,
} from "./types"

export class PhaserOfficeRenderer {
  private readonly scene: OfficeScene
  private readonly game: Phaser.Game
  private readonly ready: Promise<OfficeScene>
  private readonly resizeObserver: ResizeObserver
  private readonly capabilityReporter: RendererCapabilityReporter
  private zoomFactor = DEFAULT_ZOOM_FACTOR
  private activeZoneIds: readonly string[] = []
  private players: readonly RenderedPlayer[] = DEFAULT_RENDERED_PLAYERS
  private fixtureMap?: FixtureMap

  constructor(private readonly parent: HTMLElement) {
    parent.classList.add("phaser-world-host")
    this.scene = new OfficeScene((scene) => {
      this.resolveReady(scene)
    })
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
      scene: this.scene,
    })
    this.capabilityReporter = new RendererCapabilityReporter(this.game)
    this.installContextRecoveryHandlers()
    this.resizeObserver = new ResizeObserver(() => this.resizeToParent())
    this.resizeObserver.observe(parent)
    this.resizeToParent()
  }

  renderMap(fixtureMap: FixtureMap): void {
    this.fixtureMap = fixtureMap
    void this.ready.then((scene) => {
      scene.renderFixtureMap(fixtureMap, this.players)
      scene.setActiveZones(this.activeZoneIds)
    })
  }

  updatePlayers(players: readonly RenderedPlayer[]): void {
    this.players = players
    void this.ready.then((scene) => {
      scene.updatePlayers(players)
    })
  }

  setActiveZones(zoneIds: readonly string[]): void {
    this.activeZoneIds = [...zoneIds]
    void this.ready.then((scene) => {
      scene.setActiveZones(this.activeZoneIds)
    })
  }

  zoomIn(): RendererViewportState {
    return this.setZoomFactor(this.zoomFactor + ZOOM_STEP)
  }

  zoomOut(): RendererViewportState {
    return this.setZoomFactor(this.zoomFactor - ZOOM_STEP)
  }

  resetZoom(): RendererViewportState {
    return this.setZoomFactor(DEFAULT_ZOOM_FACTOR)
  }

  getViewportState(): RendererViewportState {
    return this.scene.getViewportState()
  }

  getCapabilityInfo(): RendererCapabilityInfo {
    return this.capabilityReporter.getInfo(this.scene.getCameraRoundPixels())
  }

  async advanceTime(): Promise<void> {
    await this.ready
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

    void this.ready.then((scene) => {
      scene.renderFixtureMap(fixtureMap, this.players)
      scene.setActiveZones(this.activeZoneIds)
      scene.setZoomFactor(this.zoomFactor)
    })
  }

  private setZoomFactor(zoomFactor: number): RendererViewportState {
    this.zoomFactor = clamp(zoomFactor, MIN_ZOOM_FACTOR, MAX_ZOOM_FACTOR)
    this.scene.setZoomFactor(this.zoomFactor)
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
    this.scene.setZoomFactor(this.zoomFactor)
  }

  private resolveReady: (scene: OfficeScene) => void = () => undefined
}
