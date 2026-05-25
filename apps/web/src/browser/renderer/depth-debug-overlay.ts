import Phaser from "phaser"

import type { RendererDepthInfo, RendererDepthObjectInfo } from "./types"

const DEBUG_DEPTH = 120000

export class DepthDebugOverlay {
  private readonly enabled = depthDebugEnabled()
  private graphics?: Phaser.GameObjects.Graphics
  private readonly labels: Phaser.GameObjects.Text[] = []

  constructor(private readonly scene: Phaser.Scene) {}

  isEnabled(): boolean {
    return this.enabled
  }

  clear(): void {
    this.graphics?.clear()
    this.labels.forEach((label) => label.destroy())
    this.labels.length = 0
  }

  releaseDisplayObjects(): void {
    this.graphics = undefined
    this.labels.length = 0
  }

  render(depthInfo: RendererDepthInfo): void {
    this.clear()
    if (!this.enabled) return

    const graphics = this.ensureGraphics()
    graphics.setVisible(true)

    depthInfo.objects.forEach((object) => {
      this.drawObject(object)
    })
    depthInfo.players.forEach((player) => {
      graphics.lineStyle(1, 0xffffff, 0.92)
      graphics.strokeCircle(player.zAnchor.x, player.zAnchor.y, 4)
      graphics.fillStyle(player.local ? 0x49b6ff : 0x8bd17c, 0.9)
      graphics.fillCircle(player.zAnchor.x, player.zAnchor.y, 3)
      this.addLabel(
        player.zAnchor.x + 5,
        player.zAnchor.y - 18,
        `${player.name} z:${player.depth}`,
        0x102f3a,
      )
    })
  }

  private drawObject(object: RendererDepthObjectInfo): void {
    const graphics = this.ensureGraphics()
    const color = object.layer === "wall_foreground" ? 0xf6a04f : 0x2c7be5
    graphics.lineStyle(1, color, 0.86)
    graphics.strokeRect(
      object.bounds.x,
      object.bounds.y,
      object.bounds.width,
      object.bounds.height,
    )
    graphics.fillStyle(color, 0.85)
    graphics.fillCircle(object.zAnchor.x, object.zAnchor.y, 3)
    this.addLabel(
      object.zAnchor.x + 5,
      object.zAnchor.y + 4,
      `${object.tokenId} z:${object.depth}`,
      color,
    )
  }

  private addLabel(x: number, y: number, text: string, color: number): void {
    const label = this.scene.add.text(x, y, text, {
      color: `#${color.toString(16).padStart(6, "0")}`,
      fontFamily: "Aptos, Segoe UI, sans-serif",
      fontSize: "9px",
      fontStyle: "700",
      backgroundColor: "rgba(255,255,255,0.82)",
      padding: {
        x: 3,
        y: 2,
      },
    })

    label.setDepth(DEBUG_DEPTH + 1)
    label.setVisible(this.enabled)
    this.labels.push(label)
  }

  private ensureGraphics(): Phaser.GameObjects.Graphics {
    if (!this.graphics) {
      this.graphics = this.scene.add.graphics()
      this.graphics.setDepth(DEBUG_DEPTH)
      this.graphics.setVisible(this.enabled)
    }

    return this.graphics
  }
}

function depthDebugEnabled(): boolean {
  const hostname = window.location.hostname
  const localHost = ["127.0.0.1", "localhost", "::1"].includes(hostname)
  const params = new URLSearchParams(window.location.search)

  return (
    localHost &&
    (params.get("debugDepth") === "1" ||
      window.localStorage.getItem("aedventure.debugDepth") === "1")
  )
}
