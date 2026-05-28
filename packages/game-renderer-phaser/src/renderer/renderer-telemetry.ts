import type { FixtureMap, RenderedPlayer, RendererViewportState } from "./types"

export interface RendererTelemetrySnapshot {
  readonly mapWidth: number
  readonly mapHeight: number
  readonly tileSize: number
  readonly tokenCount: number
  readonly zoneCount: number
  readonly playerCount: number
  readonly viewport: RendererViewportState
  readonly lastRenderedAtMs: number
}

export class RendererTelemetry {
  private snapshot?: RendererTelemetrySnapshot

  recordRender(
    fixtureMap: FixtureMap,
    players: readonly RenderedPlayer[],
    viewport: RendererViewportState,
  ): void {
    this.snapshot = {
      mapWidth: fixtureMap.compiled.width,
      mapHeight: fixtureMap.compiled.height,
      tileSize: fixtureMap.compiled.tileSize,
      tokenCount: fixtureMap.catalog.tokens.length,
      zoneCount: fixtureMap.compiled.zones.length,
      playerCount: players.length,
      viewport,
      lastRenderedAtMs: performance.now(),
    }
  }

  recordPlayers(
    players: readonly RenderedPlayer[],
    viewport: RendererViewportState,
  ): void {
    if (!this.snapshot) return
    this.snapshot = {
      ...this.snapshot,
      playerCount: players.length,
      viewport,
      lastRenderedAtMs: performance.now(),
    }
  }

  getSnapshot(): RendererTelemetrySnapshot | undefined {
    return this.snapshot
  }
}
