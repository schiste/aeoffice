import Phaser from "phaser"

import {
  emptyAssetPipelineInfo,
  loadInternalOfficeAtlas,
} from "./asset-atlas"
import { AvatarRenderer } from "./avatar-renderer"
import { CameraController } from "./camera-controller"
import { depthInfo, emptyDepthInfo } from "./depth"
import { DepthDebugOverlay } from "./depth-debug-overlay"
import { TilemapRenderer } from "./tilemap-renderer"
import { ObjectRenderer } from "./object-renderer"
import {
  RendererTelemetry,
  type RendererTelemetrySnapshot,
} from "./renderer-telemetry"
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
  RendererTilemapInfo,
  RendererViewportState,
  RendererZoomPresetId,
} from "./types"

export class OfficeScene extends Phaser.Scene {
  private readonly avatarRenderer: AvatarRenderer
  private readonly cameraController: CameraController
  private readonly tilemapRenderer: TilemapRenderer
  private readonly objectRenderer: ObjectRenderer
  private readonly zoneRenderer: ZoneRenderer
  private readonly depthDebugOverlay: DepthDebugOverlay
  private readonly telemetry = new RendererTelemetry()
  private readonly atlasPromise = loadInternalOfficeAtlas()
  private activeMap?: Phaser.Tilemaps.Tilemap
  private tilemapInfo: RendererTilemapInfo = emptyTilemapInfo()
  private assetPipelineInfo: RendererAssetPipelineInfo = emptyAssetPipelineInfo()
  private objectDepthInfo: RendererDepthInfo["objects"] = []
  private rendererDepthInfo: RendererDepthInfo

  constructor(private readonly onReady: (scene: OfficeScene) => void) {
    super({ key: "OfficeScene" })
    this.avatarRenderer = new AvatarRenderer(this)
    this.cameraController = new CameraController(this)
    this.tilemapRenderer = new TilemapRenderer(this)
    this.objectRenderer = new ObjectRenderer(this)
    this.zoneRenderer = new ZoneRenderer(this)
    this.depthDebugOverlay = new DepthDebugOverlay(this)
    this.rendererDepthInfo = emptyDepthInfo(this.depthDebugOverlay.isEnabled())
  }

  create(): void {
    this.cameraController.markReady()
    this.zoneRenderer.bindPointerInput()
    this.onReady(this)
  }

  async renderFixtureMap(
    fixtureMap: FixtureMap,
    players: readonly RenderedPlayer[],
  ): Promise<void> {
    const atlas = await this.atlasPromise
    const tileSize = fixtureMap.compiled.tileSize
    const widthInPixels = fixtureMap.compiled.width * tileSize
    const heightInPixels = fixtureMap.compiled.height * tileSize

    this.avatarRenderer.clear()
    this.cameraController.clearFollow()
    this.zoneRenderer.clear()
    this.depthDebugOverlay.clear()
    this.children.removeAll(true)
    this.depthDebugOverlay.releaseDisplayObjects()
    this.objectRenderer.clearObjectTextures()
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
    this.telemetry.recordRender(
      fixtureMap,
      players,
      this.cameraController.getViewportState(),
    )
  }

  updatePlayers(players: readonly RenderedPlayer[]): void {
    const followTarget = this.avatarRenderer.updatePlayers(players)
    this.cameraController.follow(followTarget)
    this.rendererDepthInfo = depthInfo(
      this.objectDepthInfo,
      this.avatarRenderer.getDepthInfo(),
      this.depthDebugOverlay.isEnabled(),
    )
    this.depthDebugOverlay.render(this.rendererDepthInfo)
    this.telemetry.recordPlayers(
      players,
      this.cameraController.getViewportState(),
    )
  }

  resizeViewport(width: number, height: number): void {
    this.cameraController.resizeViewport(width, height)
  }

  setZoomFactor(zoomFactor: number): void {
    this.cameraController.setZoomFactor(zoomFactor)
  }

  setZoomPreset(zoomPreset: RendererZoomPresetId): void {
    this.cameraController.setZoomPreset(zoomPreset)
  }

  setCameraMode(mode: RendererCameraMode): void {
    this.cameraController.setCameraMode(mode)
  }

  setActiveZones(zoneIds: readonly string[]): void {
    this.zoneRenderer.setActiveZones(zoneIds)
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

  getTelemetrySnapshot(): RendererTelemetrySnapshot | undefined {
    return this.telemetry.getSnapshot()
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
    objectLayerMode: "sprites",
    zoneLayerMode: "graphics",
    avatarLayerMode: "display_objects",
    labelLayerMode: "display_objects",
  }
}

function emptyTilemapInfo(): RendererTilemapInfo {
  return tilemapInfoFromLayers([])
}
