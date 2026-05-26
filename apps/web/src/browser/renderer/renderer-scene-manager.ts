import Phaser from "phaser"

import { RendererAssetPackLoader } from "./asset-pack-loader"
import { OfficeScene } from "./office-scene"
import type {
  RendererAssetPackInfo,
  RendererSceneDescriptor,
  RendererSceneManagerInfo,
} from "./types"

export class RendererLoadingScene extends Phaser.Scene {
  private readonly assetPackLoader: RendererAssetPackLoader

  constructor(
    private readonly onPreloadComplete: (info: RendererAssetPackInfo) => void,
  ) {
    super({ key: "RendererLoadingScene" })
    this.assetPackLoader = new RendererAssetPackLoader(this)
  }

  preload(): void {
    this.assetPackLoader.preloadCoreOfficePack()
  }

  create(): void {
    this.onPreloadComplete(this.assetPackLoader.getInfo())
    this.scene.start("OfficeScene")
  }
}

export class RendererSceneManager {
  private preloadedAssetPackInfo?: RendererAssetPackInfo

  readonly loadingScene: RendererLoadingScene
  readonly officeScene: OfficeScene
  readonly scenes: Phaser.Scene[]

  constructor(onOfficeReady: (scene: OfficeScene) => void) {
    this.loadingScene = new RendererLoadingScene((info) => {
      this.preloadedAssetPackInfo = info
    })
    this.officeScene = new OfficeScene(
      onOfficeReady,
      () => this.preloadedAssetPackInfo,
    )
    this.scenes = [this.loadingScene, this.officeScene]
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
      architecture: "boot_preload_office_runtime",
      bootSceneKey: "RendererLoadingScene",
      worldSceneKey: "OfficeScene",
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
    key: "OfficeScene",
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
    owns: ["space-selection", "tenant-entry"],
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
