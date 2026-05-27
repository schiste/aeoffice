import Phaser from "phaser"

import { applyCrispWorldText } from "./text-rendering"
import type {
  FixtureMap,
  RendererCameraState,
  RendererDepthInfo,
  RendererDevToolsFixtureSelectorInfo,
  RendererDevToolsInfo,
  RendererDevToolsOptions,
  RendererDevToolOverlayState,
  Vector2,
} from "./types"

const DEV_TOOLS_DEPTH = 130000

const DEFAULT_OVERLAYS: RendererDevToolOverlayState = {
  grid: false,
  collision: false,
  zones: false,
  depth: false,
  objectFootprints: false,
  spriteBounds: false,
  camera: false,
}

const DEFAULT_FIXTURE_SELECTOR: RendererDevToolsFixtureSelectorInfo = {
  enabled: false,
  activeFixtureId: undefined,
  availableFixtureIds: [],
}

const KEYBOARD_SHORTCUTS = [
  "Alt+Shift+T toggle dev tools",
  "Alt+Shift+G grid",
  "Alt+Shift+C collision",
  "Alt+Shift+Z zones",
  "Alt+Shift+D depth",
  "Alt+Shift+O object footprints",
  "Alt+Shift+B sprite bounds",
  "Alt+Shift+R camera readout",
  "Alt+Shift+F next fixture",
  "Alt+Shift+V previous fixture",
]

export class DevToolsOverlay {
  private gated = false
  private enabled = false
  private overlays: RendererDevToolOverlayState = { ...DEFAULT_OVERLAYS }
  private fixtureSelector: RendererDevToolsFixtureSelectorInfo = {
    ...DEFAULT_FIXTURE_SELECTOR,
  }
  private fixtureMap?: FixtureMap
  private depthInfo?: RendererDepthInfo
  private camera?: RendererCameraState
  private graphics?: Phaser.GameObjects.Graphics
  private cameraText?: Phaser.GameObjects.Text
  private overlayObjectCounts = {
    gridLineCount: 0,
    blockedTileCount: 0,
    zoneBoundsCount: 0,
    depthAnchorCount: 0,
    objectFootprintCount: 0,
    spriteBoundsCount: 0,
  }

  constructor(private readonly scene: Phaser.Scene) {}

  setState(options: RendererDevToolsOptions): void {
    this.gated = options.gated ?? this.gated
    this.enabled = options.enabled ?? this.enabled
    this.overlays = {
      ...this.overlays,
      ...(options.overlays ?? {}),
    }
    this.fixtureSelector = options.fixtureSelector ?? this.fixtureSelector
    this.redraw()
  }

  render(
    fixtureMap: FixtureMap | undefined,
    depthInfo: RendererDepthInfo,
    camera: RendererCameraState,
  ): void {
    this.fixtureMap = fixtureMap
    this.depthInfo = depthInfo
    this.camera = camera
    this.redraw()
  }

  clear(): void {
    this.graphics?.clear()
    this.cameraText?.destroy()
    this.cameraText = undefined
    this.overlayObjectCounts = {
      gridLineCount: 0,
      blockedTileCount: 0,
      zoneBoundsCount: 0,
      depthAnchorCount: 0,
      objectFootprintCount: 0,
      spriteBoundsCount: 0,
    }
  }

  isZoneOverlayEnabled(): boolean {
    return this.enabled && this.overlays.zones
  }

  isDepthOverlayEnabled(): boolean {
    return this.enabled && this.overlays.depth
  }

  getInfo(): RendererDevToolsInfo {
    return {
      source: "renderer_dev_tools",
      gated: this.gated,
      enabled: this.enabled,
      overlays: { ...this.overlays },
      fixtureSelector: this.fixtureSelector,
      overlayObjectCounts: this.overlayObjectCounts,
      cameraReadout:
        this.enabled && this.overlays.camera && this.camera
          ? {
              mode: this.camera.mode,
              zoomPreset: this.camera.zoomPreset,
              effectiveZoom: this.camera.effectiveZoom,
              scrollX: this.camera.scrollX,
              scrollY: this.camera.scrollY,
              worldView: this.camera.worldView,
            }
          : undefined,
      keyboardShortcuts: KEYBOARD_SHORTCUTS,
    }
  }

  private redraw(): void {
    this.clear()
    if (!this.enabled || !this.fixtureMap || !this.camera) return

    const graphics = this.ensureGraphics()
    const counts = {
      gridLineCount: 0,
      blockedTileCount: 0,
      zoneBoundsCount: this.overlays.zones ? this.fixtureMap.compiled.zones.length : 0,
      depthAnchorCount:
        this.overlays.depth && this.depthInfo
          ? this.depthInfo.objects.length + this.depthInfo.players.length
          : 0,
      objectFootprintCount: 0,
      spriteBoundsCount: 0,
    }

    if (this.overlays.grid) {
      counts.gridLineCount = this.drawGrid(graphics, this.fixtureMap)
    }
    if (this.overlays.collision) {
      counts.blockedTileCount = this.drawCollision(graphics, this.fixtureMap)
    }
    if (this.overlays.objectFootprints && this.depthInfo) {
      counts.objectFootprintCount = this.drawObjectFootprints(
        graphics,
        this.depthInfo,
      )
    }
    if (this.overlays.spriteBounds && this.depthInfo) {
      counts.spriteBoundsCount = this.drawSpriteBounds(graphics, this.depthInfo)
    }
    if (this.overlays.camera) {
      this.drawCameraReadout(this.camera)
    }

    this.overlayObjectCounts = counts
  }

  private ensureGraphics(): Phaser.GameObjects.Graphics {
    if (!this.graphics) {
      this.graphics = this.scene.add.graphics()
      this.graphics.setDepth(DEV_TOOLS_DEPTH)
    }

    this.graphics.setVisible(true)
    return this.graphics
  }

  private drawGrid(graphics: Phaser.GameObjects.Graphics, fixtureMap: FixtureMap): number {
    const tileSize = fixtureMap.compiled.tileSize
    const width = fixtureMap.compiled.width * tileSize
    const height = fixtureMap.compiled.height * tileSize
    let lineCount = 0

    graphics.lineStyle(1, 0x2563eb, 0.18)
    for (let x = 0; x <= width; x += tileSize) {
      graphics.lineBetween(x, 0, x, height)
      lineCount += 1
    }
    for (let y = 0; y <= height; y += tileSize) {
      graphics.lineBetween(0, y, width, y)
      lineCount += 1
    }

    return lineCount
  }

  private drawCollision(
    graphics: Phaser.GameObjects.Graphics,
    fixtureMap: FixtureMap,
  ): number {
    const tileSize = fixtureMap.compiled.tileSize
    const blockedTiles = collisionTiles(fixtureMap)

    graphics.fillStyle(0xdc2626, 0.18)
    graphics.lineStyle(1, 0xdc2626, 0.58)
    blockedTiles.forEach((tile) => {
      graphics.fillRect(tile.x * tileSize, tile.y * tileSize, tileSize, tileSize)
      graphics.strokeRect(tile.x * tileSize, tile.y * tileSize, tileSize, tileSize)
    })

    return blockedTiles.length
  }

  private drawSpriteBounds(
    graphics: Phaser.GameObjects.Graphics,
    depthInfo: RendererDepthInfo,
  ): number {
    graphics.lineStyle(1, 0x9333ea, 0.9)
    depthInfo.objects.forEach((object) => {
      graphics.strokeRect(
        object.bounds.x,
        object.bounds.y,
        object.bounds.width,
        object.bounds.height,
      )
      graphics.fillStyle(0x9333ea, 0.8)
      graphics.fillCircle(object.zAnchor.x, object.zAnchor.y, 2.5)
    })

    graphics.lineStyle(1, 0x16a34a, 0.9)
    depthInfo.players.forEach((player) => {
      graphics.strokeRect(
        player.labelBounds.x,
        player.labelBounds.y,
        player.labelBounds.width,
        player.labelBounds.height,
      )
      graphics.fillStyle(player.local ? 0x16a34a : 0x60a5fa, 0.9)
      graphics.fillCircle(player.zAnchor.x, player.zAnchor.y, 2.5)
    })

    return depthInfo.objects.length + depthInfo.players.length
  }

  private drawObjectFootprints(
    graphics: Phaser.GameObjects.Graphics,
    depthInfo: RendererDepthInfo,
  ): number {
    depthInfo.objects.forEach((object) => {
      graphics.lineStyle(1, 0x0ea5e9, 0.86)
      graphics.strokeRect(
        object.bounds.x,
        object.bounds.y,
        object.bounds.width,
        object.bounds.height,
      )

      if (object.collisionBounds.width > 0 && object.collisionBounds.height > 0) {
        graphics.fillStyle(0xef4444, 0.12)
        graphics.fillRect(
          object.collisionBounds.x,
          object.collisionBounds.y,
          object.collisionBounds.width,
          object.collisionBounds.height,
        )
        graphics.lineStyle(1, 0xef4444, 0.82)
        graphics.strokeRect(
          object.collisionBounds.x,
          object.collisionBounds.y,
          object.collisionBounds.width,
          object.collisionBounds.height,
        )
      }

      graphics.lineStyle(1, 0xf59e0b, 0.9)
      graphics.lineBetween(
        object.zAnchor.x - 4,
        object.zAnchor.y,
        object.zAnchor.x + 4,
        object.zAnchor.y,
      )
      graphics.lineBetween(
        object.zAnchor.x,
        object.zAnchor.y - 4,
        object.zAnchor.x,
        object.zAnchor.y + 4,
      )
    })

    return depthInfo.objects.length
  }

  private drawCameraReadout(camera: RendererCameraState): void {
    const lines = [
      "Renderer dev tools",
      `camera ${camera.mode} / ${camera.zoomPreset}`,
      `zoom ${camera.effectiveZoom.toFixed(2)} scroll ${camera.scrollX},${camera.scrollY}`,
      `view ${Math.round(camera.worldView.x)},${Math.round(camera.worldView.y)} ${Math.round(camera.worldView.width)}x${Math.round(camera.worldView.height)}`,
      `fixture ${this.fixtureSelector.activeFixtureId ?? "app"}`,
    ]

    this.cameraText = this.scene.add.text(10, 10, lines.join("\n"), {
      color: "#0f172a",
      fontFamily: "Aptos, Segoe UI, sans-serif",
      fontSize: "11px",
      fontStyle: "700",
      backgroundColor: "rgba(255,255,255,0.84)",
      padding: {
        x: 6,
        y: 5,
      },
    })
    applyCrispWorldText(this.cameraText)
    this.cameraText.setScrollFactor(0)
    this.cameraText.setDepth(DEV_TOOLS_DEPTH + 1)
  }
}

function collisionTiles(fixtureMap: FixtureMap): readonly Vector2[] {
  return (
    fixtureMap.compiled.collisionLayers?.movement.blockedTiles ??
    fixtureMap.compiled.blockedTiles ??
    []
  )
}
