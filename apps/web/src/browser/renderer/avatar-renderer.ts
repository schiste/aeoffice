import Phaser from "phaser"

import { AVATAR_HEIGHT, AVATAR_WIDTH } from "./constants"
import { avatarDepth } from "./depth"
import { clamp } from "./math"
import type { Direction, RenderedPlayer, Vector2 } from "./types"

const AVATAR_STYLES: Record<
  string,
  {
    readonly torso: number
    readonly torsoDark: number
    readonly head: number
    readonly accent: number
    readonly hair: number
  }
> = {
  ember: {
    torso: 0xc45b40,
    torsoDark: 0x873727,
    head: 0xffd3a3,
    accent: 0xf6a04f,
    hair: 0x5a3323,
  },
  cobalt: {
    torso: 0x316f9f,
    torsoDark: 0x1d4260,
    head: 0xf0c7a1,
    accent: 0x9dc7e4,
    hair: 0x273748,
  },
  moss: {
    torso: 0x3c8759,
    torsoDark: 0x24543a,
    head: 0xd7b38e,
    accent: 0xa7d18f,
    hair: 0x473522,
  },
  violet: {
    torso: 0x755aa5,
    torsoDark: 0x49336f,
    head: 0xe0b995,
    accent: 0xc8b4f2,
    hair: 0x332444,
  },
  companion: {
    torso: 0x316f9f,
    torsoDark: 0x1d4260,
    head: 0xf0c7a1,
    accent: 0x9dc7e4,
    hair: 0x273748,
  },
}

export interface AvatarFollowTarget {
  readonly playerId: string
  readonly cameraTarget: Phaser.GameObjects.Zone
}

export class AvatarRenderer {
  private readonly avatars = new Map<string, AvatarView>()

  constructor(private readonly scene: Phaser.Scene) {}

  clear(): void {
    this.avatars.forEach((avatar) => avatar.destroy())
    this.avatars.clear()
  }

  updatePlayers(players: readonly RenderedPlayer[]): AvatarFollowTarget | undefined {
    const visiblePlayerIds = new Set(players.map((player) => player.playerId))
    let localAvatar: AvatarFollowTarget | undefined

    this.avatars.forEach((avatar, playerId) => {
      if (visiblePlayerIds.has(playerId)) return
      avatar.destroy()
      this.avatars.delete(playerId)
    })

    players.forEach((player) => {
      let avatar = this.avatars.get(player.playerId)

      if (!avatar) {
        avatar = new AvatarView(this.scene, player)
        this.avatars.set(player.playerId, avatar)
      }

      avatar.update(player)
      if (player.local) {
        localAvatar = {
          playerId: player.playerId,
          cameraTarget: avatar.cameraTarget,
        }
      }
    })

    return localAvatar
  }
}

class AvatarView {
  readonly focusTarget: Phaser.GameObjects.Container
  readonly cameraTarget: Phaser.GameObjects.Zone
  private readonly shadow: Phaser.GameObjects.Ellipse
  private readonly leftFoot: Phaser.GameObjects.Ellipse
  private readonly rightFoot: Phaser.GameObjects.Ellipse
  private readonly torso: Phaser.GameObjects.Ellipse
  private readonly head: Phaser.GameObjects.Ellipse
  private readonly hair: Phaser.GameObjects.Ellipse
  private readonly facing: Phaser.GameObjects.Triangle
  private readonly labelShadow: Phaser.GameObjects.Rectangle
  private readonly labelBack: Phaser.GameObjects.Rectangle
  private readonly labelTail: Phaser.GameObjects.Triangle
  private readonly label: Phaser.GameObjects.Text
  private idleTween?: Phaser.Tweens.Tween
  private walkTween?: Phaser.Tweens.Tween
  private footTween?: Phaser.Tweens.Tween
  private positionTween?: Phaser.Tweens.Tween
  private rejectionTween?: Phaser.Tweens.Tween
  private lastPosition: Vector2
  private lastDirection: Direction
  private avatarId: string
  private local: boolean

  constructor(
    private readonly scene: Phaser.Scene,
    player: RenderedPlayer,
  ) {
    this.local = player.local
    this.avatarId = player.avatarId ?? fallbackAvatarId(player)
    this.lastPosition = player.position
    this.lastDirection = player.direction
    this.focusTarget = scene.add.container(player.position.x, player.position.y)
    this.cameraTarget = scene.add.zone(player.position.x, player.position.y, 2, 2)
    this.focusTarget.setName(`avatar:${player.playerId}`)
    this.cameraTarget.setName(`camera-anchor:${player.playerId}`)
    const style = avatarStyle(this.avatarId)

    this.shadow = scene.add.ellipse(0, 15, 20, 7, 0x20201d, 0.18)
    this.leftFoot = scene.add.ellipse(-5, 12, 7, 5, style.torsoDark, 1)
    this.rightFoot = scene.add.ellipse(5, 12, 7, 5, style.torsoDark, 1)
    this.torso = scene.add.ellipse(0, 2, AVATAR_WIDTH, AVATAR_HEIGHT, style.torso, 1)
    this.torso.setStrokeStyle(1, style.torsoDark, 0.55)
    this.head = scene.add.ellipse(0, -10, 13, 13, style.head, 1)
    this.hair = scene.add.ellipse(0, -14, 12, 6, style.hair, 1)
    this.facing = scene.add.triangle(0, -9, 0, -4, 4, 3, -4, 3, style.accent, 0.86)
    this.label = scene.add.text(0, -31, player.name, {
      color: "#20201d",
      fontFamily: "Aptos, Segoe UI, sans-serif",
      fontSize: "10px",
      fontStyle: "700",
      align: "center",
    })
    this.label.setOrigin(0.5, 0.5)
    this.labelShadow = scene.add.rectangle(
      1,
      -29,
      this.label.width + 14,
      17,
      0x20201d,
      0.16,
    )
    this.labelBack = scene.add.rectangle(
      0,
      -31,
      this.label.width + 14,
      17,
      0xfffdf7,
      0.93,
    )
    this.labelBack.setStrokeStyle(1, style.torso, 0.65)
    this.labelTail = scene.add.triangle(
      0,
      -21,
      -4,
      0,
      4,
      0,
      0,
      5,
      0xfffdf7,
      0.93,
    )
    this.labelTail.setStrokeStyle(1, style.torso, 0.55)

    this.focusTarget.add([
      this.shadow,
      this.leftFoot,
      this.rightFoot,
      this.torso,
      this.head,
      this.hair,
      this.facing,
      this.labelShadow,
      this.labelBack,
      this.labelTail,
      this.label,
    ])
    this.startIdleTween()
    this.update(player)
  }

  update(player: RenderedPlayer): void {
    const moved =
      player.position.x !== this.lastPosition.x ||
      player.position.y !== this.lastPosition.y
    const nextAvatarId = player.avatarId ?? fallbackAvatarId(player)
    const identityChanged =
      player.local !== this.local ||
      player.name !== this.label.text ||
      nextAvatarId !== this.avatarId
    const style = avatarStyle(nextAvatarId)

    this.local = player.local
    this.avatarId = nextAvatarId
    this.label.setText(player.name)
    this.labelShadow.setSize(this.label.width + 14, 17)
    this.labelBack.setSize(this.label.width + 14, 17)
    this.labelBack.setStrokeStyle(1, style.torso, 0.65)
    this.labelTail.setStrokeStyle(1, style.torso, 0.55)
    this.leftFoot.setFillStyle(style.torsoDark, 1)
    this.rightFoot.setFillStyle(style.torsoDark, 1)
    this.torso.setFillStyle(style.torso, 1)
    this.torso.setStrokeStyle(1, style.torsoDark, 0.55)
    this.head.setFillStyle(style.head, 1)
    this.hair.setFillStyle(style.hair, 1)
    this.facing.setFillStyle(style.accent, 0.86)
    this.focusTarget.setDepth(avatarDepth(player.position.y))
    this.setFacing(player.direction)

    if (moved || identityChanged || player.direction !== this.lastDirection) {
      this.interpolateTo(player.position)
      this.startWalkTween()
    } else if (!this.walkTween?.isPlaying()) {
      this.startIdleTween()
    }

    if (player.rejected) {
      this.showRejected(player.direction)
    }

    this.lastPosition = player.position
    this.lastDirection = player.direction
  }

  destroy(): void {
    this.idleTween?.stop()
    this.walkTween?.stop()
    this.footTween?.stop()
    this.positionTween?.stop()
    this.rejectionTween?.stop()
    this.focusTarget.destroy(true)
    this.cameraTarget.destroy()
  }

  private interpolateTo(position: Vector2): void {
    this.positionTween?.stop()
    const distance = Phaser.Math.Distance.Between(
      this.focusTarget.x,
      this.focusTarget.y,
      position.x,
      position.y,
    )
    this.positionTween = this.scene.tweens.add({
      targets: [this.focusTarget, this.cameraTarget],
      x: position.x,
      y: position.y,
      duration: clamp(Math.round(distance * 6.8), 115, 175),
      ease: "Sine.easeOut",
    })
  }

  private showRejected(direction: Direction): void {
    this.rejectionTween?.stop()
    this.positionTween?.stop()
    const style = avatarStyle(this.avatarId)
    this.focusTarget.setPosition(this.lastPosition.x, this.lastPosition.y)
    this.torso.setStrokeStyle(2, 0xffd166, 1)
    this.rejectionTween = this.scene.tweens.add({
      targets: this.focusTarget,
      x: this.focusTarget.x + facingNudgeX(direction),
      y: this.focusTarget.y + facingNudgeY(direction),
      scaleX: 1.045,
      scaleY: 0.955,
      duration: 72,
      yoyo: true,
      repeat: 0,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.focusTarget.setPosition(this.lastPosition.x, this.lastPosition.y)
        this.focusTarget.setScale(1, 1)
        this.torso.setStrokeStyle(1, style.torsoDark, 0.55)
        this.startIdleTween()
      },
    })
  }

  private setFacing(direction: Direction): void {
    const rotations: Record<Direction, number> = {
      down: Math.PI,
      left: Math.PI / 2,
      right: -Math.PI / 2,
      up: 0,
    }

    this.facing.setRotation(rotations[direction])
    this.facing.setPosition(
      direction === "left" ? -5 : direction === "right" ? 5 : 0,
      direction === "up" ? -15 : direction === "down" ? -5 : -10,
    )
    this.facing.setAlpha(direction === "up" ? 0.18 : 0.86)
    this.hair.setPosition(
      direction === "left" ? -3 : direction === "right" ? 3 : 0,
      direction === "up" ? -12 : -14,
    )
    this.leftFoot.setPosition(direction === "right" ? -3 : -5, 12)
    this.rightFoot.setPosition(direction === "left" ? 3 : 5, 12)
  }

  private startIdleTween(): void {
    if (this.idleTween?.isPlaying()) return

    this.walkTween?.stop()
    this.footTween?.stop()
    this.leftFoot.setScale(1, 1)
    this.rightFoot.setScale(1, 1)
    this.focusTarget.setScale(1, 1)
    this.focusTarget.y = this.lastPosition.y
    this.idleTween = this.scene.tweens.add({
      targets: this.focusTarget,
      y: this.lastPosition.y - 1.5,
      scaleY: 1.025,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    })
  }

  private startWalkTween(): void {
    this.idleTween?.stop()
    this.walkTween?.stop()
    this.footTween?.stop()
    this.focusTarget.setScale(1, 1)
    this.walkTween = this.scene.tweens.add({
      targets: this.focusTarget,
      scaleX: 1.045,
      scaleY: 0.955,
      duration: 105,
      yoyo: true,
      repeat: 2,
      ease: "Sine.easeInOut",
      onComplete: () => this.startIdleTween(),
    })
    this.footTween = this.scene.tweens.add({
      targets: [this.leftFoot, this.rightFoot],
      scaleX: 1.18,
      scaleY: 0.82,
      duration: 90,
      yoyo: true,
      repeat: 2,
      ease: "Sine.easeInOut",
    })
  }
}

function facingNudgeX(direction: Direction): number {
  if (direction === "left") return -4
  if (direction === "right") return 4
  return 0
}

function facingNudgeY(direction: Direction): number {
  if (direction === "up") return -4
  if (direction === "down") return 4
  return 0
}

function fallbackAvatarId(player: RenderedPlayer): string {
  return player.local ? "ember" : "companion"
}

function avatarStyle(avatarId: string): {
  readonly torso: number
  readonly torsoDark: number
  readonly head: number
  readonly accent: number
  readonly hair: number
} {
  return AVATAR_STYLES[avatarId] ?? AVATAR_STYLES.ember
}