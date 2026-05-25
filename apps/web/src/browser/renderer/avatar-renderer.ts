import Phaser from "phaser"

import {
  avatarAnimationDefinition,
  avatarAnimationKeys,
  avatarAppearance,
  avatarEmoteDefinition,
  avatarInterpolationProfile,
  AVATAR_COSMETIC_SLOTS,
  AVATAR_EMOTE_IDS,
  AVATAR_IDS,
  fallbackAvatarId,
  resolveAvatarId,
  type AvatarAnimationDefinition,
  type AvatarAppearanceMetadata,
  type AvatarInterpolationProfile,
} from "./avatar-registry"
import {
  AVATAR_HEIGHT,
  AVATAR_WIDTH,
} from "./constants"
import { avatarDepth } from "./depth"
import { clamp } from "./math"
import type {
  AvatarAnimationAction,
  AvatarCosmeticSlot,
  AvatarEmoteId,
  Direction,
  RenderedPlayer,
  RendererAvatarInfo,
  RendererAvatarPlayerInfo,
  RendererDepthPlacementBounds,
  RendererDepthPlayerInfo,
  Vector2,
} from "./types"

export interface AvatarFollowTarget {
  readonly playerId: string
  readonly cameraTarget: Phaser.GameObjects.Zone
}

const LABEL_TEXT_RESOLUTION = 4
const LABEL_TEXTURE_FILTER = "linear" as const
const LABEL_SCREEN_SCALE_MIN = 0.72
const LABEL_SCREEN_SCALE_MAX = 1.08

export class AvatarRenderer {
  private readonly avatars = new Map<string, AvatarView>()
  private depthPlayers: readonly RendererDepthPlayerInfo[] = []

  constructor(private readonly scene: Phaser.Scene) {}

  clear(): void {
    this.avatars.forEach((avatar) => avatar.destroy())
    this.avatars.clear()
    this.depthPlayers = []
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

    this.applyLabelLayout()
    this.depthPlayers = players.map((player) =>
      rendererDepthPlayerInfo(player, this.avatars.get(player.playerId)),
    )

    return localAvatar
  }

  refreshFrame(): void {
    this.avatars.forEach((avatar) => avatar.syncFrame())
    this.applyLabelLayout()
    this.depthPlayers = [...this.avatars.values()].map((avatar) =>
      avatar.depthInfo(),
    )
  }

  triggerEmote(playerId: string, emoteId: AvatarEmoteId): void {
    this.avatars.get(playerId)?.playEmote(emoteId)
  }

  getDepthInfo(): readonly RendererDepthPlayerInfo[] {
    return this.depthPlayers
  }

  getAvatarInfo(): RendererAvatarInfo {
    return {
      source: "renderer_runtime",
      availableAvatarIds: AVATAR_IDS,
      animationKeys: avatarAnimationKeys(),
      animationCount: avatarAnimationKeys().length,
      emoteIds: AVATAR_EMOTE_IDS,
      interpolationProfiles: ["local", "remote"],
      cosmeticSlots: AVATAR_COSMETIC_SLOTS,
      players: [...this.avatars.values()].map((avatar) => avatar.info()),
    }
  }

  private applyLabelLayout(): void {
    const acceptedLabels: RendererDepthPlacementBounds[] = []
    const orderedAvatars = [...this.avatars.values()].sort((first, second) => {
      if (first.local !== second.local) return first.local ? -1 : 1
      return first.targetPosition.y - second.targetPosition.y
    })

    orderedAvatars.forEach((avatar) => {
      const bounds = avatar.currentLabelBounds()
      const overlaps = acceptedLabels.some((accepted) =>
        rectanglesOverlap(bounds, accepted, 6),
      )
      const visible = avatar.local || !overlaps

      avatar.setLabelVisibility(
        visible,
        visible ? "visible" : "overlap_suppressed",
      )
      if (visible) {
        acceptedLabels.push(bounds)
      }
    })
  }
}

function rendererDepthPlayerInfo(
  player: RenderedPlayer,
  avatar: AvatarView | undefined,
): RendererDepthPlayerInfo {
  const labelBounds = avatar?.currentLabelBounds() ?? fallbackLabelBounds(player)

  return {
    playerId: player.playerId,
    name: player.name,
    local: player.local,
    depth: avatarDepth(player.position.y),
    zAnchor: player.position,
    labelBounds,
    labelVisible: avatar?.labelVisible ?? true,
  }
}

function fallbackLabelBounds(player: RenderedPlayer): RendererDepthPlacementBounds {
  const labelWidth = Math.max(44, player.name.length * 7 + 14)

  return {
    x: player.position.x - labelWidth / 2,
    y: player.position.y - 42,
    width: labelWidth,
    height: 20,
  }
}

class AvatarView {
  readonly focusTarget: Phaser.GameObjects.Container
  readonly cameraTarget: Phaser.GameObjects.Zone
  private readonly visualRoot: Phaser.GameObjects.Container
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
  private readonly emoteBack: Phaser.GameObjects.Ellipse
  private readonly emoteText: Phaser.GameObjects.Text
  private idleTween?: Phaser.Tweens.Tween
  private walkTween?: Phaser.Tweens.Tween
  private footTween?: Phaser.Tweens.Tween
  private positionTween?: Phaser.Tweens.Tween
  private rejectionTween?: Phaser.Tweens.Tween
  private emoteTween?: Phaser.Tweens.Tween
  private lastPosition: Vector2
  private lastDirection: Direction
  private avatarId: string
  private appearance: AvatarAppearanceMetadata
  private animation: AvatarAnimationDefinition
  private interpolationProfile: AvatarInterpolationProfile
  private currentEmoteId?: AvatarEmoteId
  private cosmetics: Partial<Record<AvatarCosmeticSlot, string>> = {}
  private labelReason: RendererAvatarPlayerInfo["labelVisibilityReason"] =
    "visible"
  private labelIsVisible = true

  get local(): boolean {
    return this.playerLocal
  }

  get targetPosition(): Vector2 {
    return this.lastPosition
  }

  get labelVisible(): boolean {
    return this.labelIsVisible
  }

  private get labelWidth(): number {
    return clamp(this.label.width + 14, 48, 132)
  }

  constructor(
    private readonly scene: Phaser.Scene,
    player: RenderedPlayer,
    private playerLocal = player.local,
  ) {
    this.avatarId = resolveAvatarId(player.avatarId ?? fallbackAvatarId(player))
    this.appearance = avatarAppearance(this.avatarId)
    this.animation = avatarAnimationDefinition(
      this.avatarId,
      player.direction,
      "idle",
    )
    this.interpolationProfile = avatarInterpolationProfile(player.local)
    this.lastPosition = player.position
    this.lastDirection = player.direction
    this.cosmetics = player.cosmetics ?? {}
    this.focusTarget = scene.add.container(player.position.x, player.position.y)
    this.cameraTarget = scene.add.zone(player.position.x, player.position.y, 2, 2)
    this.visualRoot = scene.add.container(0, 0)
    this.focusTarget.setName(`avatar:${player.playerId}`)
    this.focusTarget.setVertexRoundMode("off")
    this.visualRoot.setVertexRoundMode("off")
    this.cameraTarget.setName(`camera-anchor:${player.playerId}`)

    const palette = this.appearance.palette
    this.shadow = scene.add.ellipse(0, 15, 20, 7, 0x20201d, 0.18)
    this.leftFoot = scene.add.ellipse(-5, 12, 7, 5, palette.torsoDark, 1)
    this.rightFoot = scene.add.ellipse(5, 12, 7, 5, palette.torsoDark, 1)
    this.torso = scene.add.ellipse(0, 2, AVATAR_WIDTH, AVATAR_HEIGHT, palette.torso, 1)
    this.torso.setStrokeStyle(1, palette.torsoDark, 0.55)
    this.head = scene.add.ellipse(0, -10, 13, 13, palette.head, 1)
    this.hair = scene.add.ellipse(0, -14, 12, 6, palette.hair, 1)
    this.facing = scene.add.triangle(0, -9, 0, -4, 4, 3, -4, 3, palette.accent, 0.86)
    this.label = scene.add.text(0, -31, player.name, {
      color: "#20201d",
      fontFamily: "Aptos, Segoe UI, sans-serif",
      fontSize: "11px",
      fontStyle: "600",
      align: "center",
      resolution: LABEL_TEXT_RESOLUTION,
    })
    this.label.setResolution(LABEL_TEXT_RESOLUTION)
    this.applySmoothTextTexture(this.label)
    this.label.setOrigin(0.5, 0.5)
    this.labelShadow = scene.add.rectangle(1, -29, this.labelWidth, 17, 0x20201d, 0.16)
    this.labelBack = scene.add.rectangle(0, -31, this.labelWidth, 17, 0xfffdf7, 0.93)
    this.labelBack.setStrokeStyle(1, palette.torso, 0.65)
    this.labelTail = scene.add.triangle(0, -21, -4, 0, 4, 0, 0, 5, 0xfffdf7, 0.93)
    this.labelTail.setStrokeStyle(1, palette.torso, 0.55)
    this.emoteBack = scene.add.ellipse(12, -38, 18, 18, 0xfffdf7, 0.96)
    this.emoteBack.setStrokeStyle(1, palette.accent, 0.72)
    this.emoteText = scene.add.text(12, -39, "", {
      color: "#20201d",
      fontFamily: "Aptos, Segoe UI, sans-serif",
      fontSize: "13px",
      fontStyle: "800",
      align: "center",
      resolution: LABEL_TEXT_RESOLUTION,
    })
    this.emoteText.setResolution(LABEL_TEXT_RESOLUTION)
    this.applySmoothTextTexture(this.emoteText)
    this.emoteText.setOrigin(0.5, 0.5)
    this.emoteBack.setVisible(false)
    this.emoteText.setVisible(false)

    this.focusTarget.add(this.visualRoot)
    this.visualRoot.add([
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
      this.emoteBack,
      this.emoteText,
    ])
    this.applyAppearance(this.appearance)
    this.applyAnimationPose(this.animation)
    this.applyCameraAwareLabelScale()
    this.startIdleTween(this.animation, player.position)
    this.update(player)
  }

  update(player: RenderedPlayer): void {
    const moved =
      player.position.x !== this.lastPosition.x ||
      player.position.y !== this.lastPosition.y
    const nextAvatarId = resolveAvatarId(player.avatarId ?? fallbackAvatarId(player))
    const nextAppearance = avatarAppearance(nextAvatarId)
    const directionChanged = player.direction !== this.lastDirection
    const nextAction: AvatarAnimationAction = moved || directionChanged
      ? "walk"
      : "idle"
    const nextAnimation = avatarAnimationDefinition(
      nextAvatarId,
      player.direction,
      nextAction,
    )
    const identityChanged =
      player.local !== this.playerLocal ||
      player.name !== this.label.text ||
      nextAvatarId !== this.avatarId

    this.playerLocal = player.local
    this.avatarId = nextAvatarId
    this.appearance = nextAppearance
    this.animation = nextAnimation
    this.interpolationProfile = avatarInterpolationProfile(player.local)
    this.cosmetics = player.cosmetics ?? {}
    this.label.setText(player.name)
    this.applySmoothTextTexture(this.label)
    this.resizeLabel()
    this.applyAppearance(nextAppearance)
    this.applyAnimationPose(nextAnimation)
    this.applyCameraAwareLabelScale()
    this.focusTarget.setDepth(avatarDepth(this.focusTarget.y))

    if (moved) {
      this.interpolateTo(player.position, this.interpolationProfile)
      this.startWalkTween(nextAnimation)
    } else if (directionChanged || identityChanged) {
      this.cameraTarget.setPosition(player.position.x, player.position.y)
      this.startWalkTween(nextAnimation)
    } else if (!this.walkTween?.isPlaying()) {
      this.startIdleTween(nextAnimation, player.position)
    }

    if (player.rejected) {
      this.showRejected(player.direction)
    }

    if (player.emoteId) {
      this.playEmote(player.emoteId)
    }

    this.lastPosition = player.position
    this.lastDirection = player.direction
  }

  syncFrame(): void {
    this.applyCameraAwareLabelScale()
    this.focusTarget.setDepth(avatarDepth(this.focusTarget.y))
  }

  depthInfo(): RendererDepthPlayerInfo {
    return {
      playerId: this.focusTarget.name.replace(/^avatar:/, ""),
      name: this.label.text,
      local: this.playerLocal,
      depth: avatarDepth(this.focusTarget.y),
      zAnchor: {
        x: this.focusTarget.x,
        y: this.focusTarget.y,
      },
      labelBounds: this.currentLabelBounds(),
      labelVisible: this.labelIsVisible,
    }
  }

  playEmote(emoteId: AvatarEmoteId): void {
    const emote = avatarEmoteDefinition(emoteId)

    this.currentEmoteId = emote.id
    this.emoteTween?.stop()
    this.emoteBack.setVisible(true)
    this.emoteText.setVisible(true)
    this.emoteText.setText(emote.glyph)
    this.applySmoothTextTexture(this.emoteText)
    this.emoteBack.setAlpha(0.96)
    this.emoteText.setAlpha(1)
    this.emoteBack.setPosition(12, -38)
    this.emoteText.setPosition(12, -39)
    this.emoteTween = this.scene.tweens.add({
      targets: [this.emoteBack, this.emoteText],
      y: "-=7",
      alpha: 0,
      duration: emote.durationMs,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.currentEmoteId = undefined
        this.emoteBack.setVisible(false)
        this.emoteText.setVisible(false)
      },
    })
  }

  setLabelVisibility(
    visible: boolean,
    reason: RendererAvatarPlayerInfo["labelVisibilityReason"],
  ): void {
    this.labelIsVisible = visible
    this.labelReason = reason
    const alpha = visible ? 1 : 0

    this.label.setAlpha(alpha)
    this.labelBack.setAlpha(visible ? 0.93 : 0)
    this.labelShadow.setAlpha(visible ? 0.16 : 0)
    this.labelTail.setAlpha(visible ? 0.93 : 0)
  }

  currentLabelBounds(): RendererDepthPlacementBounds {
    const labelScale = this.currentLabelScale()
    const width = this.labelWidth * labelScale

    return {
      x: this.focusTarget.x - width / 2,
      y: this.focusTarget.y + this.visualRoot.y + this.animation.pose.labelY - 10,
      width,
      height: 20 * labelScale,
    }
  }

  info(): RendererAvatarPlayerInfo {
    return {
      playerId: this.focusTarget.name.replace(/^avatar:/, ""),
      name: this.label.text,
      avatarId: this.avatarId,
      local: this.playerLocal,
      direction: this.animation.direction,
      currentPosition: {
        x: Math.round(this.focusTarget.x),
        y: Math.round(this.focusTarget.y),
      },
      targetPosition: this.lastPosition,
      animation: {
        key: this.animation.key,
        action: this.animation.action,
        direction: this.animation.direction,
        durationMs: this.animation.durationMs,
      },
      interpolationProfile: this.interpolationProfile.id,
      interpolationActive: this.positionTween?.isPlaying() ?? false,
      movementSmoothing: {
        mode: this.playerLocal
          ? "client_prediction_reconciliation"
          : "remote_interpolation",
        logicalVertexRoundMode: "off",
        visualTransformIsolation: "inner_visual_root",
      },
      labelVisible: this.labelIsVisible,
      labelVisibilityReason: this.labelReason,
      labelBounds: this.currentLabelBounds(),
      labelResolution: LABEL_TEXT_RESOLUTION,
      labelTextureFilter: LABEL_TEXTURE_FILTER,
      labelScreenScale: this.currentLabelScale(),
      emoteId: this.currentEmoteId,
      cosmeticSlots: this.appearance.cosmeticSlots,
      cosmetics: this.cosmetics,
    }
  }

  destroy(): void {
    this.idleTween?.stop()
    this.walkTween?.stop()
    this.footTween?.stop()
    this.positionTween?.stop()
    this.rejectionTween?.stop()
    this.emoteTween?.stop()
    this.focusTarget.destroy(true)
    this.cameraTarget.destroy()
  }

  private interpolateTo(
    position: Vector2,
    profile: AvatarInterpolationProfile,
  ): void {
    this.positionTween?.stop()
    const distance = Phaser.Math.Distance.Between(
      this.focusTarget.x,
      this.focusTarget.y,
      position.x,
      position.y,
    )

    if (distance <= profile.positionEpsilon) {
      this.focusTarget.setPosition(position.x, position.y)
      this.cameraTarget.setPosition(position.x, position.y)
      return
    }

    this.positionTween = this.scene.tweens.add({
      targets: [this.focusTarget, this.cameraTarget],
      x: position.x,
      y: position.y,
      duration: clamp(
        Math.round(distance * profile.msPerPixel),
        profile.minDurationMs,
        profile.maxDurationMs,
      ),
      ease: profile.easing,
      onUpdate: () => {
        this.focusTarget.setDepth(avatarDepth(this.focusTarget.y))
        this.applyCameraAwareLabelScale()
      },
    })
  }

  private showRejected(direction: Direction): void {
    this.rejectionTween?.stop()
    const palette = this.appearance.palette
    this.torso.setStrokeStyle(2, 0xffd166, 1)
    this.rejectionTween = this.scene.tweens.add({
      targets: this.visualRoot,
      x: facingNudgeX(direction),
      y: facingNudgeY(direction),
      scaleX: 1.045,
      scaleY: 0.955,
      duration: 72,
      yoyo: true,
      repeat: 0,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.visualRoot.setPosition(0, 0)
        this.visualRoot.setScale(1, 1)
        this.torso.setStrokeStyle(1, palette.torsoDark, 0.55)
        this.startIdleTween(this.animation, this.lastPosition)
      },
    })
  }

  private applySmoothTextTexture(text: Phaser.GameObjects.Text): void {
    text.texture.setFilter(Phaser.Textures.FilterMode.LINEAR)
  }

  private applyAppearance(appearance: AvatarAppearanceMetadata): void {
    const palette = appearance.palette

    this.leftFoot.setFillStyle(palette.torsoDark, 1)
    this.rightFoot.setFillStyle(palette.torsoDark, 1)
    this.torso.setFillStyle(palette.torso, 1)
    this.torso.setStrokeStyle(1, palette.torsoDark, 0.55)
    this.head.setFillStyle(palette.head, 1)
    this.hair.setFillStyle(palette.hair, 1)
    this.facing.setFillStyle(palette.accent, 0.86)
    this.labelBack.setStrokeStyle(1, palette.torso, 0.65)
    this.labelTail.setStrokeStyle(1, palette.torso, 0.55)
    this.emoteBack.setStrokeStyle(1, palette.accent, 0.72)
  }

  private applyAnimationPose(animation: AvatarAnimationDefinition): void {
    const pose = animation.pose

    this.facing.setRotation(pose.facingRotation)
    this.facing.setPosition(pose.facingX, pose.facingY)
    this.facing.setAlpha(pose.facingAlpha)
    this.hair.setPosition(pose.hairX, pose.hairY)
    this.leftFoot.setPosition(pose.leftFootX, 12)
    this.rightFoot.setPosition(pose.rightFootX, 12)
    this.label.setPosition(0, pose.labelY)
    this.labelShadow.setPosition(1, pose.labelY + 2)
    this.labelBack.setPosition(0, pose.labelY)
    this.labelTail.setPosition(0, pose.labelY + 10)
    this.applyCameraAwareLabelScale()
  }

  private resizeLabel(): void {
    const width = this.labelWidth

    this.labelShadow.setSize(width, 17)
    this.labelBack.setSize(width, 17)
  }

  private startIdleTween(
    animation: AvatarAnimationDefinition,
    anchorPosition: Vector2,
  ): void {
    if (this.idleTween?.isPlaying()) return

    this.walkTween?.stop()
    this.footTween?.stop()
    this.leftFoot.setScale(1, 1)
    this.rightFoot.setScale(1, 1)
    this.visualRoot.setScale(1, 1)
    this.visualRoot.x = 0
    this.visualRoot.y = 0
    this.cameraTarget.setPosition(anchorPosition.x, anchorPosition.y)
    this.idleTween = this.scene.tweens.add({
      targets: this.visualRoot,
      y: -1.5,
      scaleY: animation.bodyScaleY,
      duration: animation.durationMs,
      yoyo: true,
      repeat: animation.repeat,
      ease: "Sine.easeInOut",
    })
  }

  private startWalkTween(animation: AvatarAnimationDefinition): void {
    this.idleTween?.stop()
    this.walkTween?.stop()
    this.footTween?.stop()
    this.visualRoot.setPosition(0, 0)
    this.visualRoot.setScale(1, 1)
    this.walkTween = this.scene.tweens.add({
      targets: this.visualRoot,
      scaleX: animation.bodyScaleX,
      scaleY: animation.bodyScaleY,
      duration: animation.durationMs,
      yoyo: true,
      repeat: animation.repeat,
      ease: "Sine.easeInOut",
      onComplete: () => {
        const idleAnimation = avatarAnimationDefinition(
          this.avatarId,
          this.lastDirection,
          "idle",
        )

        this.animation = idleAnimation
        this.applyAnimationPose(idleAnimation)
        this.startIdleTween(idleAnimation, this.lastPosition)
      },
    })
    this.footTween = this.scene.tweens.add({
      targets: [this.leftFoot, this.rightFoot],
      scaleX: animation.footScaleX,
      scaleY: animation.footScaleY,
      duration: Math.max(80, animation.durationMs - 15),
      yoyo: true,
      repeat: animation.repeat,
      ease: "Sine.easeInOut",
    })
  }

  private applyCameraAwareLabelScale(): void {
    const scale = this.currentLabelScale()

    this.label.setScale(scale)
    this.labelShadow.setScale(scale)
    this.labelBack.setScale(scale)
    this.labelTail.setScale(scale)
    this.label.setResolution(LABEL_TEXT_RESOLUTION)
    this.emoteText.setResolution(LABEL_TEXT_RESOLUTION)
  }

  private currentLabelScale(): number {
    const zoom = this.scene.cameras.main.zoom || 1
    return clamp(1 / zoom, LABEL_SCREEN_SCALE_MIN, LABEL_SCREEN_SCALE_MAX)
  }
}

function rectanglesOverlap(
  first: RendererDepthPlacementBounds,
  second: RendererDepthPlacementBounds,
  padding: number,
): boolean {
  return !(
    first.x + first.width + padding < second.x ||
    second.x + second.width + padding < first.x ||
    first.y + first.height + padding < second.y ||
    second.y + second.height + padding < first.y
  )
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
