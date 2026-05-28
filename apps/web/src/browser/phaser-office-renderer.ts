import {
  PhaserTileWorldRenderer,
  type RendererHostOptions,
} from "@aedventure/game-renderer-phaser"

const OFFICE_RENDERER_ASSET_PACK: RendererHostOptions["assetPack"] = {
  packKey: "aedventure.office.core-pack",
  coreSection: "core-office",
  manifestCacheKey: "aedventure.office.atlas.manifest",
  imageTextureKey: "aedventure.office.atlas.image",
  manifestPath: "assets/internal-office-atlas.manifest.json",
  imagePath: "assets/internal-office-atlas@2x.png",
  assetBundleId: "tenant.default",
  themeBundleId: "theme.office.polished_v1",
  deferredSections: ["avatar-atlas", "tenant-theme"],
}

export class PhaserOfficeRenderer extends PhaserTileWorldRenderer {
  constructor(parent: HTMLElement) {
    super(parent, { assetPack: OFFICE_RENDERER_ASSET_PACK })
  }
}

export { PhaserOfficeRenderer as RendererHost }
export * from "@aedventure/game-renderer-phaser"
