import Phaser from "phaser"

import {
  DEFAULT_RENDERER_ASSET_PACK_CONFIG,
  emptyAssetPackInfo,
  rendererAssetPackData,
} from "./asset-atlas"
import type { RendererAssetPackConfig, RendererAssetPackInfo } from "./types"

type LoaderFileLike = {
  readonly key?: string
  readonly type?: string
}

export class RendererAssetPackLoader {
  private info: RendererAssetPackInfo = emptyAssetPackInfo()
  private completedKeys = new Set<string>()
  private failedKeys = new Set<string>()

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly preloadInfoProvider: (() => RendererAssetPackInfo | undefined) = () =>
      undefined,
    private readonly config: RendererAssetPackConfig = DEFAULT_RENDERER_ASSET_PACK_CONFIG,
  ) {}

  preloadCoreAssetPack(): void {
    if (this.coreAssetsReady()) {
      this.info = this.preloadedInfo()
      return
    }

    this.info = {
      ...emptyAssetPackInfo(this.config),
      progress: {
        ...emptyAssetPackInfo(this.config).progress,
        started: true,
      },
    }

    this.bindLoaderEvents()
    this.scene.load.addPack(rendererAssetPackData(this.config))
  }

  getInfo(): RendererAssetPackInfo {
    const info = this.preloadedInfo()
    const loadedSections = this.coreAssetsReady()
      ? [this.config.coreSection]
      : []

    return {
      ...info,
      loadedSections,
      progress: {
        ...info.progress,
        completedKeys: [
          ...new Set([...info.progress.completedKeys, ...this.completedKeys]),
        ].sort(),
        failedKeys: [
          ...new Set([...info.progress.failedKeys, ...this.failedKeys]),
        ].sort(),
      },
      cache: {
        jsonKeys: this.scene.cache.json.exists(this.config.manifestCacheKey)
          ? [this.config.manifestCacheKey]
          : [],
        textureKeys: this.scene.textures.exists(this.config.imageTextureKey)
          ? [this.config.imageTextureKey]
          : [],
      },
    }
  }

  coreAssetsReady(): boolean {
    return (
      this.scene.cache.json.exists(this.config.manifestCacheKey) &&
      this.scene.textures.exists(this.config.imageTextureKey)
    )
  }

  private bindLoaderEvents(): void {
    const loader = this.scene.load

    loader.off(Phaser.Loader.Events.START, this.handleStart, this)
    loader.off(Phaser.Loader.Events.PROGRESS, this.handleProgress, this)
    loader.off(Phaser.Loader.Events.FILE_COMPLETE, this.handleFileComplete, this)
    loader.off(Phaser.Loader.Events.FILE_LOAD_ERROR, this.handleFileError, this)
    loader.off(Phaser.Loader.Events.COMPLETE, this.handleComplete, this)

    loader.on(Phaser.Loader.Events.START, this.handleStart, this)
    loader.on(Phaser.Loader.Events.PROGRESS, this.handleProgress, this)
    loader.on(Phaser.Loader.Events.FILE_COMPLETE, this.handleFileComplete, this)
    loader.on(Phaser.Loader.Events.FILE_LOAD_ERROR, this.handleFileError, this)
    loader.once(Phaser.Loader.Events.COMPLETE, this.handleComplete, this)
  }

  private handleStart(): void {
    this.info = {
      ...this.info,
      progress: {
        ...this.info.progress,
        started: true,
        complete: false,
        value: 0,
      },
    }
  }

  private handleProgress(progress: number): void {
    this.info = {
      ...this.info,
      progress: {
        ...this.info.progress,
        started: true,
        value: Number(progress.toFixed(3)),
      },
    }
  }

  private handleFileComplete(key: string, type: string): void {
    this.completedKeys.add(`${type}:${key}`)
    this.info = {
      ...this.info,
      progress: {
        ...this.info.progress,
        loadedFiles: this.completedKeys.size,
      },
    }
  }

  private handleFileError(file: LoaderFileLike): void {
    this.failedKeys.add(`${file.type ?? "unknown"}:${file.key ?? "unknown"}`)
    this.info = {
      ...this.info,
      progress: {
        ...this.info.progress,
        failedFiles: this.failedKeys.size,
      },
    }
  }

  private handleComplete(
    _loader: Phaser.Loader.LoaderPlugin,
    totalComplete: number,
    totalFailed: number,
  ): void {
    this.info = {
      ...this.info,
      progress: {
        ...this.info.progress,
        complete: true,
        value: 1,
        totalFiles: totalComplete + totalFailed,
        loadedFiles: totalComplete,
        failedFiles: totalFailed,
      },
    }
  }

  private preloadedInfo(): RendererAssetPackInfo {
    if (this.info.progress.started) return this.info

    const preloadedInfo = this.preloadInfoProvider()
    if (preloadedInfo) return preloadedInfo

    if (!this.coreAssetsReady()) return this.info

    return {
      ...this.info,
      progress: {
        ...this.info.progress,
        started: true,
        complete: true,
        value: 1,
        totalFiles: 2,
        loadedFiles: 2,
        failedFiles: 0,
      },
    }
  }
}
