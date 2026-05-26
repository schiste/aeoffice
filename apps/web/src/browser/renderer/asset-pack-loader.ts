import Phaser from "phaser"

import {
  OFFICE_ASSET_PACK_KEY,
  OFFICE_ASSET_PACK_SECTION,
  OFFICE_ATLAS_IMAGE_TEXTURE_KEY,
  OFFICE_ATLAS_MANIFEST_CACHE_KEY,
  emptyAssetPackInfo,
  internalOfficeAssetPackData,
} from "./asset-atlas"
import type { RendererAssetPackInfo } from "./types"

type LoaderFileLike = {
  readonly key?: string
  readonly type?: string
}

export class RendererAssetPackLoader {
  private info: RendererAssetPackInfo = emptyAssetPackInfo()
  private completedKeys = new Set<string>()
  private failedKeys = new Set<string>()

  constructor(private readonly scene: Phaser.Scene) {}

  preloadCoreOfficePack(): void {
    this.info = {
      ...emptyAssetPackInfo(),
      progress: {
        ...emptyAssetPackInfo().progress,
        started: true,
      },
    }

    this.bindLoaderEvents()
    this.scene.load.addPack(internalOfficeAssetPackData())
  }

  getInfo(): RendererAssetPackInfo {
    const loadedSections = this.coreAssetsReady()
      ? [OFFICE_ASSET_PACK_SECTION]
      : []

    return {
      ...this.info,
      loadedSections,
      progress: {
        ...this.info.progress,
        completedKeys: [...this.completedKeys].sort(),
        failedKeys: [...this.failedKeys].sort(),
      },
      cache: {
        jsonKeys: this.scene.cache.json.exists(OFFICE_ATLAS_MANIFEST_CACHE_KEY)
          ? [OFFICE_ATLAS_MANIFEST_CACHE_KEY]
          : [],
        textureKeys: this.scene.textures.exists(OFFICE_ATLAS_IMAGE_TEXTURE_KEY)
          ? [OFFICE_ATLAS_IMAGE_TEXTURE_KEY]
          : [],
      },
    }
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

  private coreAssetsReady(): boolean {
    return (
      this.scene.cache.json.exists(OFFICE_ATLAS_MANIFEST_CACHE_KEY) &&
      this.scene.textures.exists(OFFICE_ATLAS_IMAGE_TEXTURE_KEY)
    )
  }
}
