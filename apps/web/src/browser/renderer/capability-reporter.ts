import Phaser from "phaser"

import {
  PHASER_RENDERER_CONFIG,
  RENDERER_ROUNDING_DECISIONS,
} from "./constants"
import type {
  RendererAssetPipelineInfo,
  RendererCapabilityInfo,
  RendererDepthInfo,
  RendererEffectsInfo,
  RendererMapValidationInfo,
  RendererPerformanceInfo,
  RendererTilemapInfo,
} from "./types"

export class RendererCapabilityReporter {
  private contextLossCount = 0
  private contextRestoreCount = 0
  private recoveryReady = true

  constructor(private readonly game: Phaser.Game) {}

  noteContextLost(): void {
    this.contextLossCount += 1
    this.recoveryReady = false
  }

  noteContextRestored(): void {
    this.contextRestoreCount += 1
    this.recoveryReady = true
  }

  getInfo(
    cameraRoundPixels: boolean,
    tilemap: RendererTilemapInfo,
    assets: RendererAssetPipelineInfo,
    depth: RendererDepthInfo,
    effects: RendererEffectsInfo,
    mapValidation: RendererMapValidationInfo,
    performance: RendererPerformanceInfo,
  ): RendererCapabilityInfo {
    const renderer = this.game.renderer
    const canvas = this.game.canvas
    const webgl = isWebGLRenderer(renderer)
    const gl = webgl ? renderer.gl : undefined

    return {
      requestedRenderer: PHASER_RENDERER_CONFIG.requestedRenderer,
      actualRenderer: rendererName(renderer.type),
      phaserVersion: Phaser.VERSION,
      canvas: {
        width: Math.round(canvas.width),
        height: Math.round(canvas.height),
        clientWidth: Math.round(canvas.clientWidth),
        clientHeight: Math.round(canvas.clientHeight),
      },
      config: {
        pixelArt: PHASER_RENDERER_CONFIG.pixelArt,
        smoothPixelArt: PHASER_RENDERER_CONFIG.smoothPixelArt,
        antialias: PHASER_RENDERER_CONFIG.antialias,
        antialiasGL: PHASER_RENDERER_CONFIG.antialiasGL,
        roundPixels: PHASER_RENDERER_CONFIG.roundPixels,
        powerPreference: PHASER_RENDERER_CONFIG.powerPreference,
        clearBeforeRender: PHASER_RENDERER_CONFIG.clearBeforeRender,
        preserveDrawingBuffer: PHASER_RENDERER_CONFIG.preserveDrawingBuffer,
        premultipliedAlpha: PHASER_RENDERER_CONFIG.premultipliedAlpha,
        failIfMajorPerformanceCaveat:
          PHASER_RENDERER_CONFIG.failIfMajorPerformanceCaveat,
      },
      rounding: {
        ...RENDERER_ROUNDING_DECISIONS,
        cameraRoundPixels,
      },
      assets,
      depth,
      tilemap,
      effects,
      mapValidation,
      performance,
      webgl: {
        available: webgl,
        contextLost: webgl ? renderer.contextLost : false,
        contextLossCount: this.contextLossCount,
        contextRestoreCount: this.contextRestoreCount,
        recoveryReady: this.recoveryReady,
        loseContextExtensionAvailable: Boolean(
          gl?.getExtension("WEBGL_lose_context"),
        ),
        maxTextures: webgl ? renderer.maxTextures : undefined,
        maxTextureSize: gl?.getParameter(gl.MAX_TEXTURE_SIZE),
        drawingBufferWidth: gl?.drawingBufferWidth,
        drawingBufferHeight: gl?.drawingBufferHeight,
        supportedExtensionCount: webgl
          ? renderer.supportedExtensions.length
          : undefined,
      },
    }
  }
}

export function isWebGLRenderer(
  renderer: Phaser.Renderer.Canvas.CanvasRenderer | Phaser.Renderer.WebGL.WebGLRenderer,
): renderer is Phaser.Renderer.WebGL.WebGLRenderer {
  return renderer.type === Phaser.WEBGL
}

function rendererName(
  rendererType: number,
): RendererCapabilityInfo["actualRenderer"] {
  if (rendererType === Phaser.WEBGL) return "webgl"
  if (rendererType === Phaser.CANVAS) return "canvas"
  if (rendererType === Phaser.HEADLESS) return "headless"
  return "unknown"
}
