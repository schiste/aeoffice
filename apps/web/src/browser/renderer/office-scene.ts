import Phaser from "phaser"

import {
  emptyAssetPipelineInfo,
  loadInternalOfficeAtlas,
} from "./asset-atlas"
import { AvatarRenderer } from "./avatar-renderer"
import { CameraController } from "./camera-controller"
import { depthInfo, emptyDepthInfo } from "./depth"
import { DepthDebugOverlay } from "./depth-debug-overlay"
import { DevToolsOverlay } from "./dev-tools-overlay"
import { EffectsLayer } from "./effects-layer"
import { InteractionRenderer } from "./interaction-renderer"
import { TilemapRenderer } from "./tilemap-renderer"
import { ObjectRenderer } from "./object-renderer"
import {
  RendererTelemetry,
  type RendererTelemetrySnapshot,
} from "./renderer-telemetry"
import { validateFixtureMapForRenderer } from "./map-render-validation"
import { rendererPerformanceInfo } from "./performance-info"
import { createMultiTileVariantGids } from "./semantic-tiles"
import { TILESET_KEY, TILESET_NAME } from "./constants"
import { ZoneRenderer } from "./zone-renderer"
import type {
  FixtureMap,
  AvatarEmoteId,
  RenderedPlayer,
  RendererAvatarInfo,
  RendererAssetPipelineInfo,
  RendererCameraMode,
  RendererCameraState,
  RendererDepthInfo,
  RendererDevToolsInfo,
  RendererDevToolsOptions,
  RendererEffectsInfo,
  RendererEffectsOptions,
  RendererMapValidationInfo,
  RendererPerformanceInfo,
  RendererTilemapInfo,
  RendererViewportState,
  RendererWorldInteractionInfo,
  RendererZoneInteractionState,
  RendererZonePresentationInfo,
  RendererZoomPresetId,
} from "./types"

export class OfficeScene extends Phaser.Scene {
  private readonly avatarRenderer: AvatarRenderer
  private readonly cameraController: CameraController
  private readonly tilemapRenderer: TilemapRenderer
  private readonly objectRenderer: ObjectRenderer
  private readonly zoneRenderer: ZoneRenderer
  private readonly interactionRenderer: InteractionRenderer
  private readonly effectsLayer: EffectsLayer
  private readonly depthDebugOverlay: DepthDebugOverlay
  private readonly devToolsOverlay: DevToolsOverlay
  private readonly telemetry = new RendererTelemetry()
  private readonly atlasPromise = loadInternalOfficeAtlas()
  private activeMap?: Phaser.Tilemaps.Tilemap
  private tilemapInfo: RendererTilemapInfo = emptyTilemapInfo()
  private assetPipelineInfo: RendererAssetPipelineInfo = emptyAssetPipelineInfo()
  private objectDepthInfo: RendererDepthInfo["objects"] = []
  private rendererDepthInfo: RendererDepthInfo
  private mapValidationInfo: RendererMapValidationInfo = emptyMapValidationInfo()
  private currentFixtureMap?: FixtureMap
  private mapRenderCount = 0
  private lastMapRenderDurationMs = 0
  private lastTileSize = 32
  private lastCullingKey = ""
  private sceneReady = false

  constructor(private readonly onReady: (scene: OfficeScene) => void) {
    super({ key: "OfficeScene" })
    this.avatarRenderer = new AvatarRenderer(this)
    this.cameraController = new CameraController(this)
    this.tilemapRenderer = new TilemapRenderer(this)
    this.objectRenderer = new ObjectRenderer(this)
    this.zoneRenderer = new ZoneRenderer(this)
    this.interactionRenderer = new InteractionRenderer(this)
    this.effectsLayer = new EffectsLayer(this)
    this.depthDebugOverlay = new DepthDebugOverlay(this)
    this.devToolsOverlay = new DevToolsOverlay(this)
    this.rendererDepthInfo = emptyDepthInfo(this.depthDebugOverlay.isEnabled())
  }

  create(): void {
    this.sceneReady = true
    this.cameraController.markReady()
    this.zoneRenderer.bindPointerInput()
    this.syncDevToolOverlays()
    this.events.on(Phaser.Scenes.Events.UPDATE, (_time: number, delta: number) => {
      this.updateFrame(delta)
    })
    this.onReady(this)
  }

  async renderFixtureMap(
    fixtureMap: FixtureMap,
    players: readonly RenderedPlayer[],
  ): Promise<void> {
    const renderStartedAt = performance.now()
    const mapValidation = this.preflightFixtureMap(fixtureMap)
    if (!mapValidation.valid) {
      throw new Error(
        `Renderer map preflight failed before Phaser mutation: ${mapValidation.errors.join(" ")}`,
      )
    }

    const atlas = await this.atlasPromise
    const tileSize = fixtureMap.compiled.tileSize
    const widthInPixels = fixtureMap.compiled.width * tileSize
    const heightInPixels = fixtureMap.compiled.height * tileSize
    this.lastTileSize = tileSize

    this.avatarRenderer.clear()
    this.cameraController.clearFollow()
    this.zoneRenderer.clear()
    this.interactionRenderer.clear()
    this.effectsLayer.clear()
    this.depthDebugOverlay.clear()
    this.devToolsOverlay.clear()
    this.objectRenderer.releaseActiveSprites()
    this.activeMap?.destroy()
    this.activeMap = undefined
    this.lastCullingKey = ""
    this.currentFixtureMap = fixtureMap
    this.activeMap = this.make.tilemap({
      tileWidth: tileSize,
      tileHeight: tileSize,
      width: fixtureMap.compiled.width,
      height: fixtureMap.compiled.height,
    })
    this.cameraController.setMapSize(widthInPixels, heightInPixels)

    const multiTileVariantGids = createMultiTileVariantGids(
      fixtureMap.catalog.tokens,
    )

    this.assetPipelineInfo = this.tilemapRenderer.installSemanticTileset(
      fixtureMap,
      multiTileVariantGids,
      atlas,
    )
    const tileset = this.activeMap.addTilesetImage(
      TILESET_NAME,
      TILESET_KEY,
      tileSize,
      tileSize,
      0,
      0,
      0,
    )

    if (!tileset) {
      throw new Error("Unable to create Phaser semantic tileset.")
    }

    const tokensByGid = new Map(
      fixtureMap.catalog.tokens.map((token) => [token.provisionalGid, token]),
    )

    const floorLayerInfo = this.tilemapRenderer.paintStaticTileLayer(
      this.activeMap,
      "floor",
      fixtureMap.compiled.layers.floor,
      tileset,
      tokensByGid,
      multiTileVariantGids.byRootGid,
      0,
    )
    const wallLayerInfo = this.tilemapRenderer.paintStaticTileLayer(
      this.activeMap,
      "walls",
      fixtureMap.compiled.layers.walls,
      tileset,
      tokensByGid,
      multiTileVariantGids.byRootGid,
      10,
    )
    this.tilemapInfo = tilemapInfoFromLayers([floorLayerInfo, wallLayerInfo])
    this.effectsLayer.renderFixtureMap(fixtureMap, {
      width: widthInPixels,
      height: heightInPixels,
    })
    const furnitureDepthInfo = this.objectRenderer.paintObjectSprites(
      fixtureMap.compiled.layers.objects,
      fixtureMap.catalog.tokens,
      tokensByGid,
      tileSize,
      atlas,
    )
    const wallForegroundDepthInfo = this.objectRenderer.paintWallForegroundSprites(
      fixtureMap.compiled.layers.walls,
      fixtureMap.catalog.tokens,
      tokensByGid,
      tileSize,
      atlas,
    )
    this.objectDepthInfo = [...furnitureDepthInfo, ...wallForegroundDepthInfo]
    this.zoneRenderer.reset(fixtureMap.compiled.zones, tileSize)
    this.updatePlayers(players)
    this.refreshDevToolsOverlay()
    this.telemetry.recordRender(
      fixtureMap,
      players,
      this.cameraController.getViewportState(),
    )
    this.mapRenderCount += 1
    this.lastMapRenderDurationMs = performance.now() - renderStartedAt
  }

  updatePlayers(players: readonly RenderedPlayer[]): void {
    const followTarget = this.avatarRenderer.updatePlayers(players)
    this.cameraController.follow(followTarget)
    this.cameraController.updateFrame(1000 / 60)
    this.refreshDepthInfo()
    this.depthDebugOverlay.render(this.rendererDepthInfo)
    this.updateViewportCulling()
    this.refreshDevToolsOverlay()
    this.telemetry.recordPlayers(
      players,
      this.cameraController.getViewportState(),
    )
  }

  resizeViewport(width: number, height: number): void {
    this.cameraController.resizeViewport(width, height)
    this.updateViewportCulling()
  }

  setZoomFactor(zoomFactor: number): void {
    this.cameraController.setZoomFactor(zoomFactor)
    this.updateViewportCulling()
  }

  setZoomPreset(zoomPreset: RendererZoomPresetId): void {
    this.cameraController.setZoomPreset(zoomPreset)
    this.updateViewportCulling()
  }

  setCameraMode(mode: RendererCameraMode): void {
    this.cameraController.setCameraMode(mode)
    this.updateViewportCulling()
  }

  setActiveZones(zoneIds: readonly string[]): void {
    this.zoneRenderer.setActiveZones(zoneIds)
  }

  setZoneInteractionState(state: RendererZoneInteractionState): void {
    this.zoneRenderer.setInteractionState(state)
  }

  setWorldInteractions(info: RendererWorldInteractionInfo): void {
    this.interactionRenderer.render(info)
  }

  setWorldInteractionActivationHandler(
    handler: ((candidateId: string) => void) | undefined,
  ): void {
    this.interactionRenderer.setActivationHandler(handler)
  }

  setZoneDebugOverlayEnabled(enabled: boolean): void {
    this.devToolsOverlay.setState({
      enabled: this.devToolsOverlay.getInfo().enabled || enabled,
      overlays: {
        zones: enabled,
      },
    })
    this.syncDevToolOverlays()
  }

  setDevToolsState(options: RendererDevToolsOptions): void {
    this.devToolsOverlay.setState(options)
    this.syncDevToolOverlays()
  }

  setEffectsOptions(options: RendererEffectsOptions): void {
    this.effectsLayer.setOptions(options)
  }

  preflightFixtureMap(fixtureMap: FixtureMap): RendererMapValidationInfo {
    this.mapValidationInfo = validateFixtureMapForRenderer(fixtureMap)
    return this.mapValidationInfo
  }

  triggerAvatarEmote(playerId: string, emoteId: AvatarEmoteId): void {
    this.avatarRenderer.triggerEmote(playerId, emoteId)
  }

  getViewportState(): RendererViewportState {
    return this.cameraController.getViewportState()
  }

  getAvatarInfo(): RendererAvatarInfo {
    return this.avatarRenderer.getAvatarInfo()
  }

  getZoneInfo(): RendererZonePresentationInfo {
    return this.zoneRenderer.getZoneInfo()
  }

  getWorldInteractionInfo(): RendererWorldInteractionInfo {
    return this.interactionRenderer.getInfo()
  }

  getEffectsInfo(): RendererEffectsInfo {
    return this.effectsLayer.getInfo()
  }

  getCameraState(): RendererCameraState {
    return this.cameraController.getCameraState()
  }

  projectWorldToViewport(point: { readonly x: number; readonly y: number }): {
    readonly x: number
    readonly y: number
  } {
    return this.cameraController.projectWorldToViewport(point)
  }

  getCameraRoundPixels(): boolean {
    return this.cameraController.getCameraRoundPixels()
  }

  getTilemapInfo(): RendererTilemapInfo {
    return this.tilemapInfo
  }

  getAssetPipelineInfo(): RendererAssetPipelineInfo {
    return this.assetPipelineInfo
  }

  getDepthInfo(): RendererDepthInfo {
    return this.rendererDepthInfo
  }

  getDevToolsInfo(): RendererDevToolsInfo {
    return this.devToolsOverlay.getInfo()
  }

  getTelemetrySnapshot(): RendererTelemetrySnapshot | undefined {
    return this.telemetry.getSnapshot()
  }

  getPerformanceInfo(gameInstanceId: number): RendererPerformanceInfo {
    return rendererPerformanceInfo({
      gameInstanceId,
      mapRenderCount: this.mapRenderCount,
      mapSwitchCount: Math.max(0, this.mapRenderCount - 1),
      lastMapRenderDurationMs: this.lastMapRenderDurationMs,
      displayObjectCount: this.children.list.length,
      textureCount: Object.keys(this.textures.list).length,
      camera: this.cameraController.getCameraState(),
      tileSize: this.lastTileSize,
      objectPool: this.objectRenderer.getPoolInfo(),
      tilemap: this.tilemapInfo,
      assets: this.assetPipelineInfo,
    })
  }

  getMapValidationInfo(): RendererMapValidationInfo {
    return this.mapValidationInfo
  }

  private updateViewportCulling(): void {
    const worldView = this.cameraController.getCameraState().worldView
    const cullingKey = [
      Math.round(worldView.x),
      Math.round(worldView.y),
      Math.round(worldView.width),
      Math.round(worldView.height),
    ].join(":")

    if (cullingKey === this.lastCullingKey) return
    this.lastCullingKey = cullingKey
    this.objectRenderer.updateViewportCulling(worldView)
    this.refreshDevToolsOverlay()
  }

  private syncDevToolOverlays(): void {
    if (!this.sceneReady) return

    this.zoneRenderer.setDebugOverlayEnabled(
      this.devToolsOverlay.isZoneOverlayEnabled(),
    )
    this.depthDebugOverlay.setEnabled(
      this.devToolsOverlay.isDepthOverlayEnabled(),
    )
    this.refreshDepthInfo()
    this.depthDebugOverlay.render(this.rendererDepthInfo)
    this.refreshDevToolsOverlay()
  }

  private refreshDepthInfo(): void {
    this.rendererDepthInfo = depthInfo(
      this.objectDepthInfo,
      this.avatarRenderer.getDepthInfo(),
      this.depthDebugOverlay.isEnabled(),
    )
  }

  private refreshDevToolsOverlay(): void {
    this.devToolsOverlay.render(
      this.currentFixtureMap,
      this.rendererDepthInfo,
      this.cameraController.getCameraState(),
    )
  }

  private updateFrame(deltaMs: number): void {
    this.avatarRenderer.refreshFrame()
    this.interactionRenderer.refreshFrame()
    this.cameraController.updateFrame(deltaMs)
    this.refreshDepthInfo()
    this.depthDebugOverlay.render(this.rendererDepthInfo)
    this.updateViewportCulling()
    this.refreshDevToolsOverlay()
  }
}

function tilemapInfoFromLayers(
  staticLayers: RendererTilemapInfo["staticLayers"],
): RendererTilemapInfo {
  return {
    staticLayers,
    staticGpuLayerCount: staticLayers.filter((layer) => layer.mode === "gpu")
      .length,
    staticCpuLayerCount: staticLayers.filter((layer) => layer.mode === "cpu")
      .length,
    staticTileCount: staticLayers.reduce(
      (total, layer) => total + layer.populatedTileCount,
      0,
    ),
    staticLayerBatching: "phaser_tilemap_gpu_layers",
    staticLayerBatchCount: staticLayers.length,
    objectLayerMode: "sprites",
    zoneLayerMode: "graphics",
    avatarLayerMode: "display_objects",
    labelLayerMode: "display_objects",
  }
}

function emptyTilemapInfo(): RendererTilemapInfo {
  return tilemapInfoFromLayers([])
}

function emptyMapValidationInfo(): RendererMapValidationInfo {
  return {
    source: "renderer_preflight",
    valid: true,
    mutationSafe: true,
    errors: [],
    checkedLayerNames: [],
    visualFootprintCount: 0,
    collisionLayerPresent: false,
    renderFingerprint: "map-unrendered",
  }
}
