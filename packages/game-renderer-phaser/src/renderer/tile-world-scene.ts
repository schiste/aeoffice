import Phaser from "phaser"

import {
  emptyAssetPipelineInfo,
  runtimeAssetAtlasFromLoadedAssets,
  type RuntimeAssetAtlas,
} from "./asset-atlas"
import { AdvancedInputPlugin } from "./advanced-input-plugin"
import { RendererAssetPackLoader } from "./asset-pack-loader"
import { AvatarRenderer } from "../shared/entity-renderer"
import { CameraController } from "../shared/camera-controller"
import { depthInfo, emptyDepthInfo } from "./depth"
import { DepthDebugOverlay } from "./depth-debug-overlay"
import { DepthEffectsLayer } from "./depth-effects-layer"
import { DevToolsOverlay } from "./dev-tools-overlay"
import { EffectsLayer } from "./effects-layer"
import { InteractionRenderer } from "./interaction-renderer"
import { SquareTilemapRenderer } from "../square/square-tilemap-renderer"
import { ObjectRenderer } from "./object-renderer"
import {
  RendererTelemetry,
  type RendererTelemetrySnapshot,
} from "../shared/telemetry"
import { PhysicsAffordanceSystem } from "./physics-affordance-system"
import { validateFixtureMapForRenderer } from "./map-render-validation"
import { rendererPerformanceInfo } from "./performance-info"
import { createMultiTileVariantGids } from "./semantic-tiles"
import { TILESET_KEY, TILESET_NAME } from "./constants"
import {
  StaticLayerBaker,
  emptyStaticLayerBakeInfo,
} from "./static-layer-baker"
import {
  TilemapFeatureSystem,
  emptyTilemapFeatureInfo,
} from "./tilemap-feature-system"
import { WorldAudioSystem } from "./world-audio-system"
import { ZoneRenderer } from "../shared/zone-renderer"
import type {
  FixtureMap,
  AvatarEmoteId,
  RenderedPlayer,
  RendererAvatarInfo,
  RendererAdvancedInputInfo,
  RendererAssetPackConfig,
  RendererAudioCueId,
  RendererAudioInfo,
  RendererAssetPackInfo,
  RendererAssetPipelineInfo,
  RendererCameraMode,
  RendererCameraState,
  RendererDepthInfo,
  RendererDepthEffectsInfo,
  RendererDevToolsInfo,
  RendererDevToolsOptions,
  RendererEffectsInfo,
  RendererEffectsOptions,
  RendererMapValidationInfo,
  RendererPerformanceInfo,
  RendererPhysicsInfo,
  RendererTilemapFeatureInfo,
  RendererTilemapInfo,
  RendererViewportState,
  RendererWorldInteractionInfo,
  RendererZoneInteractionState,
  RendererZonePresentationInfo,
  RendererZoomPresetId,
} from "./types"

export class TileWorldScene extends Phaser.Scene {
  private readonly avatarRenderer: AvatarRenderer
  private readonly cameraController: CameraController
  private readonly tilemapRenderer: SquareTilemapRenderer
  private readonly objectRenderer: ObjectRenderer
  private readonly zoneRenderer: ZoneRenderer
  private readonly interactionRenderer: InteractionRenderer
  private readonly advancedInputPlugin: AdvancedInputPlugin
  private readonly physicsAffordanceSystem: PhysicsAffordanceSystem
  private readonly depthEffectsLayer: DepthEffectsLayer
  private readonly effectsLayer: EffectsLayer
  private readonly staticLayerBaker: StaticLayerBaker
  private readonly tilemapFeatureSystem: TilemapFeatureSystem
  private readonly worldAudioSystem: WorldAudioSystem
  private readonly depthDebugOverlay: DepthDebugOverlay
  private readonly devToolsOverlay: DevToolsOverlay
  private readonly telemetry = new RendererTelemetry()
  private readonly assetPackLoader: RendererAssetPackLoader
  private runtimeAssetAtlas?: RuntimeAssetAtlas
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

  constructor(
    private readonly onReady: (scene: TileWorldScene) => void,
    assetPackInfoProvider?: () => RendererAssetPackInfo | undefined,
    private readonly assetPackConfig?: RendererAssetPackConfig,
  ) {
    super({ key: "TileWorldScene" })
    this.avatarRenderer = new AvatarRenderer(this)
    this.cameraController = new CameraController(this)
    this.tilemapRenderer = new SquareTilemapRenderer(this)
    this.objectRenderer = new ObjectRenderer(this)
    this.zoneRenderer = new ZoneRenderer(this)
    this.interactionRenderer = new InteractionRenderer(this)
    this.advancedInputPlugin = new AdvancedInputPlugin(this)
    this.physicsAffordanceSystem = new PhysicsAffordanceSystem(this)
    this.depthEffectsLayer = new DepthEffectsLayer(this)
    this.effectsLayer = new EffectsLayer(this)
    this.staticLayerBaker = new StaticLayerBaker(this)
    this.tilemapFeatureSystem = new TilemapFeatureSystem(this)
    this.worldAudioSystem = new WorldAudioSystem(this)
    this.depthDebugOverlay = new DepthDebugOverlay(this)
    this.devToolsOverlay = new DevToolsOverlay(this)
    this.assetPackLoader = new RendererAssetPackLoader(
      this,
      assetPackInfoProvider,
      assetPackConfig,
    )
    this.rendererDepthInfo = emptyDepthInfo(this.depthDebugOverlay.isEnabled())
  }

  preload(): void {
    if (!this.assetPackLoader.coreAssetsReady()) {
      this.assetPackLoader.preloadCoreAssetPack()
    }
  }

  create(): void {
    this.sceneReady = true
    this.runtimeAssetAtlas = runtimeAssetAtlasFromLoadedAssets(
      this,
      this.assetPackConfig,
    )
    this.assetPipelineInfo = {
      ...emptyAssetPipelineInfo(this.assetPackConfig),
      loader: this.assetPackLoader.getInfo(),
    }
    this.cameraController.markReady()
    this.zoneRenderer.bindPointerInput()
    this.advancedInputPlugin.bind({
      onHoveredZoneChange: (zoneId) => this.zoneRenderer.setHoveredZoneId(zoneId),
    })
    this.physicsAffordanceSystem.bind()
    this.worldAudioSystem.initialize()
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

    const atlas = this.runtimeAssetAtlas
    const tileSize = fixtureMap.compiled.tileSize
    const widthInPixels = fixtureMap.compiled.width * tileSize
    const heightInPixels = fixtureMap.compiled.height * tileSize
    this.lastTileSize = tileSize

    this.avatarRenderer.clear()
    this.cameraController.clearFollow()
    this.zoneRenderer.clear()
    this.interactionRenderer.clear()
    this.advancedInputPlugin.clearMapTargets()
    this.physicsAffordanceSystem.clearMapTargets()
    this.depthEffectsLayer.clear()
    this.effectsLayer.clear()
    this.staticLayerBaker.clear()
    this.tilemapFeatureSystem.clear()
    this.worldAudioSystem.resetWorldState()
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
      this.assetPackLoader.getInfo(),
      this.assetPackConfig,
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

    const floorLayer = this.tilemapRenderer.paintStaticTileLayer(
      this.activeMap,
      "floor",
      fixtureMap.compiled.layers.floor,
      tileset,
      tokensByGid,
      multiTileVariantGids.byRootGid,
      0,
    )
    const wallLayer = this.tilemapRenderer.paintStaticTileLayer(
      this.activeMap,
      "walls",
      fixtureMap.compiled.layers.walls,
      tileset,
      tokensByGid,
      multiTileVariantGids.byRootGid,
      10,
    )
    const tilemapFeatureInfo = this.tilemapFeatureSystem.configure({
      tilemap: this.activeMap,
      fixtureMap,
    })
    const staticLayerBake = this.staticLayerBaker.bakeStaticLayers(
      [floorLayer, wallLayer],
      {
        width: widthInPixels,
        height: heightInPixels,
      },
    )
    this.tilemapInfo = tilemapInfoFromLayers(
      [floorLayer.info, wallLayer.info],
      staticLayerBake,
      tilemapFeatureInfo,
    )
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
    this.advancedInputPlugin.setZones(this.zoneRenderer.getZoneInfo().zones)
    this.advancedInputPlugin.setObjects(this.objectDepthInfo)
    this.physicsAffordanceSystem.setMapTargets({
      objects: this.objectDepthInfo,
      zones: this.zoneRenderer.getZoneInfo().zones,
    })
    this.depthEffectsLayer.renderMap({
      objects: this.objectDepthInfo,
      zones: this.zoneRenderer.getZoneInfo().zones,
      mapBounds: {
        width: widthInPixels,
        height: heightInPixels,
      },
    })
    this.updatePlayers(players)
    this.refreshDevToolsOverlay()
    this.telemetry.recordRender(
      fixtureMap,
      players,
      this.cameraController.getViewportState(),
    )
    this.worldAudioSystem.noteMapRendered()
    this.mapRenderCount += 1
    this.lastMapRenderDurationMs = performance.now() - renderStartedAt
  }

  updatePlayers(players: readonly RenderedPlayer[]): void {
    const followTarget = this.avatarRenderer.updatePlayers(players)
    this.worldAudioSystem.observePlayers(players)
    this.physicsAffordanceSystem.updatePlayers(players)
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
    this.advancedInputPlugin.setZones(this.zoneRenderer.getZoneInfo().zones)
  }

  setZoneInteractionState(state: RendererZoneInteractionState): void {
    this.zoneRenderer.setInteractionState(state)
    this.advancedInputPlugin.setZones(this.zoneRenderer.getZoneInfo().zones)
    this.effectsLayer.setZoneInteractionState(state)
    this.worldAudioSystem.observeZoneInteractionState(state)
  }

  setWorldInteractions(info: RendererWorldInteractionInfo): void {
    this.interactionRenderer.render(info)
    this.worldAudioSystem.observeWorldInteractions(info)
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

  playWorldAudioCue(cueId: RendererAudioCueId): void {
    this.worldAudioSystem.playCue(cueId)
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

  getAdvancedInputInfo(): RendererAdvancedInputInfo {
    return this.advancedInputPlugin.getInfo()
  }

  getAudioInfo(): RendererAudioInfo {
    return this.worldAudioSystem.getInfo()
  }

  getPhysicsInfo(): RendererPhysicsInfo {
    return this.physicsAffordanceSystem.getInfo()
  }

  getDepthEffectsInfo(): RendererDepthEffectsInfo {
    return this.depthEffectsLayer.getInfo()
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
    const occludedPlayerIds = this.depthEffectsLayer.updateDepthInfo(
      this.rendererDepthInfo,
    )
    this.avatarRenderer.setForegroundOccludedLabels(occludedPlayerIds)
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
  staticLayerBake = emptyStaticLayerBakeInfo(),
  features: RendererTilemapFeatureInfo = emptyTilemapFeatureInfo(),
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
    staticLayerBake,
    objectLayerMode: "sprites",
    zoneLayerMode: "graphics",
    avatarLayerMode: "display_objects",
    labelLayerMode: "display_objects",
    features,
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
