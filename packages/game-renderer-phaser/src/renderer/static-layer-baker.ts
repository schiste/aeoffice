import Phaser from "phaser"

import { RENDERER_VERTEX_ROUND_MODE } from "./constants"
import type {
  RendererStaticLayerBakeInfo,
  RendererTilemapLayerInfo,
} from "./types"
import type { StaticTileLayerPaintResult } from "../square/square-tilemap-renderer"

const STATIC_LAYER_BAKE_TEXTURE_KEY = "aedventure.static-architecture-bake"
const MAX_STATIC_BAKE_TEXTURE_SIZE = 4096

export class StaticLayerBaker {
  private renderTexture?: Phaser.GameObjects.RenderTexture

  constructor(private readonly scene: Phaser.Scene) {}

  bakeStaticLayers(
    layers: readonly StaticTileLayerPaintResult[],
    dimensions: { readonly width: number; readonly height: number },
  ): RendererStaticLayerBakeInfo {
    const sourceTileCount = sourceTileCountForLayers(
      layers.map((layer) => layer.info),
    )

    if (layers.length === 0) {
      this.clear()
      return emptyStaticLayerBakeInfo({
        sourceLayerCount: 0,
        sourceTileCount,
        skippedReason: "no_static_layers",
      })
    }

    if (this.scene.renderer.type !== Phaser.WEBGL) {
      this.clear()
      return emptyStaticLayerBakeInfo({
        sourceLayerCount: layers.length,
        sourceTileCount,
        skippedReason: "non_webgl_renderer",
      })
    }

    if (
      dimensions.width > MAX_STATIC_BAKE_TEXTURE_SIZE ||
      dimensions.height > MAX_STATIC_BAKE_TEXTURE_SIZE
    ) {
      this.clear()
      return emptyStaticLayerBakeInfo({
        width: dimensions.width,
        height: dimensions.height,
        sourceLayerCount: layers.length,
        sourceTileCount,
        skippedReason: "texture_too_large",
      })
    }

    const renderTexture = this.acquireRenderTexture(
      dimensions.width,
      dimensions.height,
    )

    if (!renderTexture) {
      this.clear()
      return emptyStaticLayerBakeInfo({
        width: dimensions.width,
        height: dimensions.height,
        sourceLayerCount: layers.length,
        sourceTileCount,
        skippedReason: "render_texture_unavailable",
      })
    }

    renderTexture
      .setVisible(true)
      .setActive(true)
      .setDepth(0)
      .setName("baked-static-architecture")
      .setOrigin(0, 0)
      .setPosition(0, 0)
      .setVertexRoundMode(RENDERER_VERTEX_ROUND_MODE)
      .clear()
      .draw(layers.map((layer) => layer.gameObject), 0, 0)
    renderTexture.render()

    layers.forEach((layer) => layer.gameObject.destroy(false))

    return {
      source: "phaser_render_texture",
      enabled: true,
      mode: "single_render_texture",
      textureKey: STATIC_LAYER_BAKE_TEXTURE_KEY,
      width: dimensions.width,
      height: dimensions.height,
      sourceLayerCount: layers.length,
      bakedLayerCount: 1,
      sourceTileCount,
      displayObjectReduction: Math.max(0, layers.length - 1),
    }
  }

  clear(): void {
    this.renderTexture?.clear()
    this.renderTexture?.setVisible(false)
    this.renderTexture?.setActive(false)
  }

  private acquireRenderTexture(
    width: number,
    height: number,
  ): Phaser.GameObjects.RenderTexture | undefined {
    if (!this.renderTexture) {
      this.renderTexture = this.scene.add.renderTexture(0, 0, width, height)
    } else {
      this.renderTexture.resize(width, height)
    }

    this.renderTexture.saveTexture(STATIC_LAYER_BAKE_TEXTURE_KEY)
    return this.renderTexture
  }
}

export function emptyStaticLayerBakeInfo(
  options: Partial<
    Pick<
      RendererStaticLayerBakeInfo,
      | "width"
      | "height"
      | "sourceLayerCount"
      | "sourceTileCount"
      | "skippedReason"
    >
  > = {},
): RendererStaticLayerBakeInfo {
  return {
    source: "phaser_render_texture",
    enabled: false,
    mode: "disabled",
    width: options.width ?? 0,
    height: options.height ?? 0,
    sourceLayerCount: options.sourceLayerCount ?? 0,
    bakedLayerCount: 0,
    sourceTileCount: options.sourceTileCount ?? 0,
    displayObjectReduction: 0,
    skippedReason: options.skippedReason,
  }
}

function sourceTileCountForLayers(
  layers: readonly RendererTilemapLayerInfo[],
): number {
  return layers.reduce((total, layer) => total + layer.populatedTileCount, 0)
}
