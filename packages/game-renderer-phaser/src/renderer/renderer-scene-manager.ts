import Phaser from "phaser"

import { RendererAssetPackLoader } from "./asset-pack-loader"
import { TileWorldScene } from "./tile-world-scene"
import type {
  RendererAssetPackConfig,
  RendererAssetPackInfo,
  RendererSceneDescriptor,
  RendererSceneManagerInfo,
} from "./types"

export class RendererLoadingScene extends Phaser.Scene {
  private readonly assetPackLoader: RendererAssetPackLoader

  constructor(
    private readonly onPreloadComplete: (info: RendererAssetPackInfo) => void,
    assetPackConfig: RendererAssetPackConfig,
  ) {
    super({ key: "RendererLoadingScene" })
    this.assetPackLoader = new RendererAssetPackLoader(
      this,
      undefined,
      assetPackConfig,
    )
  }

  preload(): void {
    this.assetPackLoader.preloadCoreAssetPack()
  }

  create(): void {
    this.onPreloadComplete(this.assetPackLoader.getInfo())
    this.scene.start("TileWorldScene")
  }
}

export class RendererSceneManager {
  private preloadedAssetPackInfo?: RendererAssetPackInfo

  readonly loadingScene: RendererLoadingScene
  readonly tileWorldScene: TileWorldScene
  readonly scenes: Phaser.Scene[]

  constructor(
    onWorldReady: (scene: TileWorldScene) => void,
    assetPackConfig: RendererAssetPackConfig,
  ) {
    this.loadingScene = new RendererLoadingScene(
      (info) => {
        this.preloadedAssetPackInfo = info
      },
      assetPackConfig,
    )
    this.tileWorldScene = new TileWorldScene(
      onWorldReady,
      () => this.preloadedAssetPackInfo,
      assetPackConfig,
    )
    this.scenes = [this.loadingScene, this.tileWorldScene]
  }

  getInfo(game?: Phaser.Game): RendererSceneManagerInfo {
    const activeSceneKeys = game
      ? game.scene
          .getScenes(true)
          .map((scene) => scene.scene.key)
          .filter((key): key is string => Boolean(key))
      : []

    const registeredSceneKeys = registeredSceneDescriptors.map(
      (scene) => scene.key,
    )
    const plannedSceneKeys = plannedSceneDescriptors.map((scene) => scene.key)

    return {
      source: "phaser_scene_manager",
      architecture: "boot_preload_tile_world_runtime",
      bootSceneKey: "RendererLoadingScene",
      worldSceneKey: "TileWorldScene",
      preloadOwner: "RendererLoadingScene",
      transitionOwner: "RendererSceneManager",
      activeSceneKey: activeSceneKeys[0],
      activeSceneKeys,
      registeredSceneKeys,
      plannedSceneKeys,
      scenes: [
        ...registeredSceneDescriptors.map((scene) => ({
          ...scene,
          status: activeSceneKeys.includes(scene.key)
            ? ("active" as const)
            : ("registered" as const),
        })),
        ...plannedSceneDescriptors,
      ],
    }
  }

  getPreloadedAssetPackInfo(): RendererAssetPackInfo | undefined {
    return this.preloadedAssetPackInfo
  }
}

const registeredSceneDescriptors: readonly RendererSceneDescriptor[] = [
  {
    key: "RendererLoadingScene",
    role: "preload",
    status: "registered",
    owns: ["asset-pack-preload", "loader-progress", "cache-warmup"],
  },
  {
    key: "TileWorldScene",
    role: "world_runtime",
    status: "registered",
    owns: ["tilemap", "objects", "avatars", "zones", "camera", "effects"],
  },
]

const plannedSceneDescriptors: readonly RendererSceneDescriptor[] = [
  {
    key: "LobbyScene",
    role: "navigation",
    status: "planned",
    owns: ["world-selection", "entry"],
  },
  {
    key: "AvatarPreviewScene",
    role: "preview",
    status: "planned",
    owns: ["avatar-animation-gallery", "cosmetic-preview"],
  },
  {
    key: "GeneratedRoomPreviewScene",
    role: "preview",
    status: "planned",
    owns: ["mdi-preview", "map-validation-feedback"],
  },
  {
    key: "MapEditorScene",
    role: "editor",
    status: "planned",
    owns: ["semantic-map-editing", "zone-authoring", "collision-inspection"],
  },
  {
    key: "RoomTransitionScene",
    role: "transition",
    status: "planned",
    owns: ["map-switch-transition", "room-entry-animation"],
  },
]
