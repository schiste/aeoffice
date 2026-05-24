import Phaser from "phaser"

import { AvatarRenderer } from "./avatar-renderer"
import { CameraController } from "./camera-controller"
import { TilemapRenderer } from "./tilemap-renderer"
import { ObjectRenderer } from "./object-renderer"
import {
  RendererTelemetry,
  type RendererTelemetrySnapshot,
} from "./renderer-telemetry"
import { createMultiTileVariantGids } from "./semantic-tiles"
import { TILESET_KEY, TILESET_NAME } from "./constants"
import { ZoneRenderer } from "./zone-renderer"
import type { FixtureMap, RenderedPlayer, RendererViewportState } from "./types"

export class OfficeScene extends Phaser.Scene {
  private readonly avatarRenderer: AvatarRenderer
  private readonly cameraController: CameraController
  private readonly tilemapRenderer: TilemapRenderer
  private readonly objectRenderer: ObjectRenderer
  private readonly zoneRenderer: ZoneRenderer
  private readonly telemetry = new RendererTelemetry()
  private activeMap?: Phaser.Tilemaps.Tilemap

  constructor(private readonly onReady: (scene: OfficeScene) => void) {
    super({ key: "OfficeScene" })
    this.avatarRenderer = new AvatarRenderer(this)
    this.cameraController = new CameraController(this)
    this.tilemapRenderer = new TilemapRenderer(this)
    this.objectRenderer = new ObjectRenderer(this)
    this.zoneRenderer = new ZoneRenderer(this)
  }

  create(): void {
    this.cameraController.markReady()
    this.zoneRenderer.bindPointerInput()
    this.onReady(this)
  }

  renderFixtureMap(
    fixtureMap: FixtureMap,
    players: readonly RenderedPlayer[],
  ): void {
    const tileSize = fixtureMap.compiled.tileSize
    const widthInPixels = fixtureMap.compiled.width * tileSize
    const heightInPixels = fixtureMap.compiled.height * tileSize

    this.avatarRenderer.clear()
    this.cameraController.clearFollow()
    this.zoneRenderer.clear()
    this.children.removeAll(true)
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

    this.tilemapRenderer.installSemanticTileset(fixtureMap, multiTileVariantGids)
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

    this.tilemapRenderer.paintTileLayer(
      this.activeMap,
      "floor",
      fixtureMap.compiled.layers.floor,
      tileset,
      tokensByGid,
      multiTileVariantGids.byRootGid,
      0,
    )
    this.tilemapRenderer.paintTileLayer(
      this.activeMap,
      "walls",
      fixtureMap.compiled.layers.walls,
      tileset,
      tokensByGid,
      multiTileVariantGids.byRootGid,
      10,
    )
    this.objectRenderer.paintObjectSprites(
      fixtureMap.compiled.layers.objects,
      fixtureMap.catalog.tokens,
      tokensByGid,
      tileSize,
    )
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

  setActiveZones(zoneIds: readonly string[]): void {
    this.zoneRenderer.setActiveZones(zoneIds)
  }

  getViewportState(): RendererViewportState {
    return this.cameraController.getViewportState()
  }

  getCameraRoundPixels(): boolean {
    return this.cameraController.getCameraRoundPixels()
  }

  getTelemetrySnapshot(): RendererTelemetrySnapshot | undefined {
    return this.telemetry.getSnapshot()
  }
}
