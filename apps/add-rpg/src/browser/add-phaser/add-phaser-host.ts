import Phaser from "phaser"
import type { GameWorld } from "@aedventure/game-world"

import { AddRpgHexScene } from "./add-world-scene"
import type {
  AddCharacterMoveDirection,
  AddPhaserMapInfo,
  AddRpgPhaserMapHostOptions,
  PhaserMapRendererState,
} from "./types"

export class AddRpgPhaserMapHost {
  private readonly scene: AddRpgHexScene
  private readonly game: Phaser.Game

  constructor(parent: HTMLElement, options: AddRpgPhaserMapHostOptions = {}) {
    this.scene = new AddRpgHexScene(options)
    this.game = new Phaser.Game({
      type: Phaser.WEBGL,
      parent,
      backgroundColor: "#e6dec2",
      transparent: true,
      width: parent.clientWidth || 720,
      height: parent.clientHeight || 520,
      render: {
        antialias: true,
        roundPixels: false,
        pixelArt: false,
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        parent,
        width: parent.clientWidth || 720,
        height: parent.clientHeight || 520,
      },
      scene: this.scene,
    })
  }

  renderWorld(world: GameWorld): void {
    this.scene.renderWorld(world)
  }

  advanceTime(milliseconds = 16): void {
    this.scene.advanceTime(milliseconds)
  }

  zoomBy(factor: number): void {
    this.scene.zoomBy(factor)
  }

  resetCamera(): void {
    this.scene.resetCamera()
  }

  moveMainCharacter(direction: AddCharacterMoveDirection): Promise<boolean> {
    return this.scene.moveMainCharacter(direction)
  }

  selectCell(cell: string): boolean {
    return this.scene.selectCell(cell)
  }

  setTravelLocked(locked: boolean): void {
    this.scene.setTravelLocked(locked)
  }

  getInfo(): AddPhaserMapInfo {
    return this.scene.getInfo()
  }

  getRendererState(): PhaserMapRendererState {
    return this.scene.getRendererState()
  }

  /** Ease the camera to frame the Hero, Base, or survivor Cave. */
  focusOn(target: "hero" | "base" | "cave"): void {
    this.scene.focusOn(target)
  }

  destroy(): void {
    this.game.destroy(true)
  }
}
