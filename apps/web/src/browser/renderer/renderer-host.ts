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
  ZOOM_STEP,
} from "./constants"
import { clamp } from "./math"
import { OfficeScene } from "./office-scene"
import type { FixtureMap, RenderedPlayer, RendererViewportState } from "./types"

export class PhaserOfficeRenderer {
  private readonly scene: OfficeScene
  private readonly game: Phaser.Game
  private readonly ready: Promise<OfficeScene>
  private readonly resizeObserver: ResizeObserver
  private zoomFactor = DEFAULT_ZOOM_FACTOR
  private activeZoneIds: readonly string[] = []
  private players: readonly RenderedPlayer[] = DEFAULT_RENDERED_PLAYERS

  constructor(private readonly parent: HTMLElement) {
    parent.classList.add("phaser-world-host")
    this.scene = new OfficeScene((scene) => {
      this.resolveReady(scene)
    })
    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve
    })
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: DEFAULT_VIEWPORT_WIDTH,
      height: DEFAULT_VIEWPORT_HEIGHT,
      backgroundColor: "#e7edf0",
      banner: false,
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.NONE,
      },
      scene: this.scene,
    })
    this.resizeObserver = new ResizeObserver(() => this.resizeToParent())
    this.resizeObserver.observe(parent)
    this.resizeToParent()
  }

  renderMap(fixtureMap: FixtureMap): void {
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

  async advanceTime(): Promise<void> {
    await this.ready
  }

  destroy(): void {
    this.resizeObserver.disconnect()
    this.game.destroy(true)
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
