import Phaser from "phaser"

import {
  avatarAnimationPipelineMetadata,
  avatarAnimationPreviewFixtures,
  avatarAnimationDefinition,
  avatarAnimationKeys,
  avatarAnimationStates,
  avatarAppearance,
  avatarEmoteDefinition,
  avatarInterpolationProfile,
  avatarSpriteAtlasMetadata,
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
  ensureAvatarNativeAnimation,
  ensureAvatarSpriteFrameTexture,
  type ResolvedAvatarNativeAnimation,
} from "./avatar-sprite-atlas"
import {
  isLocomotionAction,
  resolveAvatarAnimationTransition,
  type AvatarAnimationTransitionPlan,
} from "./avatar-state-machine"
import {
  AVATAR_HEIGHT,
  AVATAR_WIDTH,
} from "./constants"
import { avatarDepth } from "./depth"
import { clamp } from "./math"
import {
  applyCrispWorldText,
  WORLD_TEXT_RESOLUTION,
  WORLD_TEXT_TEXTURE_FILTER,
} from "./text-rendering"
import type {
  AvatarAnimationAction,
  AvatarAnimationTransitionReason,
  AvatarCosmeticSlot,
  AvatarEmoteId,
  AvatarVisualFacing,
  Direction,
  RenderedPlayer,
  RendererAvatarInfo,
  RendererAvatarFrameSource,
  RendererCameraFollowMotion,
  RendererAvatarPlayerInfo,
  RendererDepthPlacementBounds,
  RendererDepthPlayerInfo,
  Vector2,
} from "./types"

export interface AvatarFollowTarget {
  readonly playerId: string
  readonly cameraTarget: Phaser.GameObjects.Zone
  readonly motion?: RendererCameraFollowMotion
}

const LABEL_TEXT_RESOLUTION = WORLD_TEXT_RESOLUTION
const LABEL_TEXTURE_FILTER = WORLD_TEXT_TEXTURE_FILTER
const LABEL_SCREEN_SCALE_MIN = 0.72
const LABEL_SCREEN_SCALE_MAX = 1.08
const EMOTE_BUBBLE_SIZE = 18
const EMOTE_LABEL_GAP = 8
const POSE_BLEND_DURATION_MS = 96
const TURN_BLEND_DURATION_MS = 138
const REMOTE_INTERPOLATION_DELAY_MS = 115
const REMOTE_EXTRAPOLATION_LIMIT_MS = 85
const REMOTE_SNAPSHOT_HISTORY_LIMIT = 8
const REMOTE_SNAP_DISTANCE_PX = 192
const REMOTE_POSITION_EPSILON_PX = 0.35

interface AvatarPoseState {
  facingRotation: number
  facingX: number
  facingY: number
  facingAlpha: number
  headX: number
  headY: number
  headScaleX: number
  hairX: number
  hairY: number
  hairScaleX: number
  torsoRotation: number
  leftFootX: number
  leftFootY: number
  rightFootX: number
  rightFootY: number
  labelY: number
}

interface RemoteAvatarSnapshot {
  readonly position: Vector2
  readonly direction: Direction
  readonly movementMode: RenderedPlayer["movementMode"]
  readonly receivedAtMs: number
  readonly snapshotTick?: number
  readonly snapshotServerTime?: number
}

const VISUAL_FACING_POSES: Record<AvatarVisualFacing, AvatarPoseState> = {
  up: {
    facingRotation: 0,
    facingX: 0,
    facingY: -15,
    facingAlpha: 0.18,
    headX: 0,
    headY: -10,
    headScaleX: 0.96,
    hairX: 0,
    hairY: -12,
    hairScaleX: 0.98,
    torsoRotation: 0,
    leftFootX: -5,
    leftFootY: 12,
    rightFootX: 5,
    rightFootY: 12,
    labelY: -32,
  },
  upRight: {
    facingRotation: -Math.PI / 4,
    facingX: 4,
    facingY: -13,
    facingAlpha: 0.48,
    headX: 2,
    headY: -10,
    headScaleX: 0.98,
    hairX: 2,
    hairY: -13,
    hairScaleX: 0.96,
    torsoRotation: -0.035,
    leftFootX: -5,
    leftFootY: 12,
    rightFootX: 4,
    rightFootY: 11,
    labelY: -32,
  },
  right: {
    facingRotation: -Math.PI / 2,
    facingX: 5,
    facingY: -10,
    facingAlpha: 0.86,
    headX: 3,
    headY: -10,
    headScaleX: 0.94,
    hairX: 3,
    hairY: -14,
    hairScaleX: 0.92,
    torsoRotation: -0.055,
    leftFootX: -4,
    leftFootY: 12,
    rightFootX: 5,
    rightFootY: 12,
    labelY: -32,
  },
  downRight: {
    facingRotation: -3 * Math.PI / 4,
    facingX: 4,
    facingY: -7,
    facingAlpha: 0.86,
    headX: 2,
    headY: -10,
    headScaleX: 1,
    hairX: 2,
    hairY: -14,
    hairScaleX: 0.97,
    torsoRotation: -0.035,
    leftFootX: -5,
    leftFootY: 12,
    rightFootX: 5,
    rightFootY: 13,
    labelY: -33,
  },
  down: {
    facingRotation: Math.PI,
    facingX: 0,
    facingY: -5,
    facingAlpha: 0.86,
    headX: 0,
    headY: -10,
    headScaleX: 1,
    hairX: 0,
    hairY: -14,
    hairScaleX: 1,
    torsoRotation: 0,
    leftFootX: -5,
    leftFootY: 12,
    rightFootX: 5,
    rightFootY: 12,
    labelY: -33,
  },
  downLeft: {
    facingRotation: 3 * Math.PI / 4,
    facingX: -4,
    facingY: -7,
    facingAlpha: 0.86,
    headX: -2,
    headY: -10,
    headScaleX: 1,
    hairX: -2,
    hairY: -14,
    hairScaleX: 0.97,
    torsoRotation: 0.035,
    leftFootX: -5,
    leftFootY: 13,
    rightFootX: 5,
    rightFootY: 12,
    labelY: -33,
  },
  left: {
    facingRotation: Math.PI / 2,
    facingX: -5,
    facingY: -10,
    facingAlpha: 0.86,
    headX: -3,
    headY: -10,
    headScaleX: 0.94,
    hairX: -3,
    hairY: -14,
    hairScaleX: 0.92,
    torsoRotation: 0.055,
    leftFootX: -5,
    leftFootY: 12,
    rightFootX: 4,
    rightFootY: 12,
    labelY: -32,
  },
  upLeft: {
    facingRotation: Math.PI / 4,
    facingX: -4,
    facingY: -13,
    facingAlpha: 0.48,
    headX: -2,
    headY: -10,
    headScaleX: 0.98,
    hairX: -2,
    hairY: -13,
    hairScaleX: 0.96,
    torsoRotation: 0.035,
    leftFootX: -4,
    leftFootY: 11,
    rightFootX: 5,
    rightFootY: 12,
    labelY: -32,
  },
}

export class AvatarRenderer {
  private readonly avatars = new Map<string, AvatarView>()
  private depthPlayers: readonly RendererDepthPlayerInfo[] = []
  private foregroundOccludedPlayerIds = new Set<string>()

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
          motion: player.cameraMotion,
        }
      }
    })

    this.applyLabelLayout()
    this.applyForegroundLabelOcclusion()
    this.depthPlayers = [...this.avatars.values()].map((avatar) =>
      avatar.depthInfo(),
    )

    return localAvatar
  }

  refreshFrame(): void {
    this.avatars.forEach((avatar) => avatar.syncFrame())
    this.applyLabelLayout()
    this.applyForegroundLabelOcclusion()
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

  setForegroundOccludedLabels(playerIds: readonly string[]): void {
    this.foregroundOccludedPlayerIds = new Set(playerIds)
    this.applyForegroundLabelOcclusion()
  }

  getAvatarInfo(): RendererAvatarInfo {
    return {
      source: "renderer_runtime",
      availableAvatarIds: AVATAR_IDS,
      spriteAtlas: avatarSpriteAtlasMetadata(),
      animationPipeline: avatarAnimationPipelineMetadata(),
      animationStates: avatarAnimationStates(),
      animationKeys: avatarAnimationKeys(),
      animationCount: avatarAnimationKeys().length,
      previewFixtures: avatarAnimationPreviewFixtures(),
      visualDirectionModel: "server_4_way_visual_8_way",
      labelVisibilityRules: "local_always_remote_overlap_suppressed",
      emoteHooks: "renderer_emote_registry",
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

  private applyForegroundLabelOcclusion(): void {
    this.avatars.forEach((avatar, playerId) => {
      avatar.setForegroundLabelOcclusion(
        this.foregroundOccludedPlayerIds.has(playerId),
      )
    })
  }
}

class AvatarView {
  readonly focusTarget: Phaser.GameObjects.Container
  readonly cameraTarget: Phaser.GameObjects.Zone
  private readonly visualRoot: Phaser.GameObjects.Container
  private readonly bodyRoot: Phaser.GameObjects.Container
  private readonly shadow: Phaser.GameObjects.Ellipse
  private readonly impactRing: Phaser.GameObjects.Ellipse
  private readonly sprite: Phaser.GameObjects.Sprite
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
  private walkTweenAction?: AvatarAnimationAction
  private poseTween?: Phaser.Tweens.Tween
  private turnTween?: Phaser.Tweens.Tween
  private rejectionTween?: Phaser.Tweens.Tween
  private impactTween?: Phaser.Tweens.Tween
  private emoteTween?: Phaser.Tweens.Tween
  private remoteSnapshots: RemoteAvatarSnapshot[] = []
  private remoteVelocity: Vector2 = { x: 0, y: 0 }
  private remoteRenderTimeMs = 0
  private remoteLatestSnapshotAgeMs = 0
  private remoteLatestSnapshotTick?: number
  private remoteLatestSnapshotServerTime?: number
  private remoteLatestSnapshotReceivedAtMs?: number
  private remoteExtrapolating = false
  private remoteSnapping = false
  private lastPosition: Vector2
  private lastDirection: Direction
  private lastMovementMode: RenderedPlayer["movementMode"]
  private avatarId: string
  private appearance: AvatarAppearanceMetadata
  private animation: AvatarAnimationDefinition
  private visualFacing: AvatarVisualFacing
  private animationPreview: RenderedPlayer["animationPreview"]
  private spriteVisualFacing: AvatarVisualFacing = "down"
  private spriteAnimationKey = ""
  private spriteAnimationStartedAtMs = 0
  private spriteFrameIndex = 0
  private spriteFrameKey = ""
  private spriteTextureKey = ""
  private spriteTextureFrame: string | undefined
  private spriteFrameSource: RendererAvatarFrameSource =
    "runtime_generated_fallback"
  private spriteNativeAnimation?: ResolvedAvatarNativeAnimation
  private spriteElapsedMs = 0
  private spriteRawFrameIndex = 0
  private spriteCycleDurationMs = 1
  private spriteNormalizedCycleProgress = 0
  private turnHoldUntilMs = 0
  private transitionFrom: AvatarAnimationAction = "idle"
  private transitionTo: AvatarAnimationAction = "idle"
  private transitionReason: AvatarAnimationTransitionReason = "initial"
  private transitionPreservedSpritePhase = false
  private transitionRestartedSpriteClock = true
  private poseState: AvatarPoseState
  private interpolationProfile: AvatarInterpolationProfile
  private currentEmoteId?: AvatarEmoteId
  private cosmetics: Partial<Record<AvatarCosmeticSlot, string>> = {}
  private labelReason: RendererAvatarPlayerInfo["labelVisibilityReason"] =
    "visible"
  private labelIsVisible = true
  private foregroundLabelOccluded = false

  get local(): boolean {
    return this.playerLocal
  }

  get targetPosition(): Vector2 {
    return {
      x: this.focusTarget.x,
      y: this.focusTarget.y,
    }
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
    this.lastMovementMode = player.movementMode ?? "walk"
    this.visualFacing = visualFacingForDirection(player.direction)
    this.animationPreview = player.animationPreview
    this.poseState = renderedPoseFor(this.animation, this.visualFacing)
    this.cosmetics = player.cosmetics ?? {}
    this.focusTarget = scene.add.container(player.position.x, player.position.y)
    this.cameraTarget = scene.add.zone(player.position.x, player.position.y, 2, 2)
    if (!player.local) {
      this.remoteSnapshots = [
        {
          position: player.position,
          direction: player.direction,
          movementMode: player.movementMode ?? "walk",
          receivedAtMs:
            player.snapshotReceivedAtMs ??
            scene.time.now - REMOTE_INTERPOLATION_DELAY_MS,
          snapshotTick: player.snapshotTick,
          snapshotServerTime: player.snapshotServerTime,
        },
      ]
      this.observeRemoteSnapshotTiming(player, this.remoteSnapshots[0].receivedAtMs)
    }
    this.visualRoot = scene.add.container(0, 0)
    this.bodyRoot = scene.add.container(0, 0)
    const entryAnimation = player.entryAnimation ?? "fade"
    this.focusTarget.setAlpha(entryAnimation === "fade" ? 0 : 1)
    this.focusTarget.setName(`avatar:${player.playerId}`)
    this.focusTarget.setVertexRoundMode("off")
    this.visualRoot.setVertexRoundMode("off")
    this.bodyRoot.setVertexRoundMode("off")
    this.cameraTarget.setName(`camera-anchor:${player.playerId}`)

    const palette = this.appearance.palette
    this.shadow = scene.add.ellipse(0, 15, 20, 7, 0x20201d, 0.18)
    this.impactRing = scene.add.ellipse(0, 13, 22, 10, 0xffd166, 0)
    this.impactRing.setStrokeStyle(2, 0xffd166, 0)
    this.impactRing.setVisible(false)
    const initialSpriteFrame = ensureAvatarSpriteFrameTexture(
      scene,
      this.animation,
      this.appearance,
      this.visualFacing,
      0,
    )
    this.spriteFrameKey = initialSpriteFrame.semanticFrameKey
    this.spriteTextureKey = initialSpriteFrame.textureKey
    this.spriteTextureFrame = initialSpriteFrame.textureFrame
    this.spriteFrameSource = initialSpriteFrame.source
    this.sprite = scene.add.sprite(
      0,
      15,
      this.spriteTextureKey,
      this.spriteTextureFrame,
    )
    this.sprite.setOrigin(
      this.animation.sprite.anchor.x,
      this.animation.sprite.anchor.y,
    )
    this.sprite.setDisplaySize(
      avatarSpriteAtlasMetadata().frameWidth,
      avatarSpriteAtlasMetadata().frameHeight,
    )
    this.sprite.setName(`avatar-frame:${player.playerId}`)
    this.sprite.setVertexRoundMode("off")
    this.spriteAnimationKey = this.animation.key
    this.spriteVisualFacing = this.visualFacing
    this.spriteAnimationStartedAtMs = scene.time.now
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
    applyCrispWorldText(this.label)
    this.label.setOrigin(0.5, 0.5)
    this.label.setVisible(false)
    this.labelShadow = scene.add.rectangle(1, -29, this.labelWidth, 17, 0x20201d, 0.16)
    this.labelBack = scene.add.rectangle(0, -31, this.labelWidth, 17, 0xfffdf7, 0.93)
    this.labelBack.setStrokeStyle(1, palette.torso, 0.65)
    this.labelTail = scene.add.triangle(0, -21, -4, 0, 4, 0, 0, 5, 0xfffdf7, 0.93)
    this.labelTail.setStrokeStyle(1, palette.torso, 0.55)
    this.labelShadow.setVisible(false)
    this.labelBack.setVisible(false)
    this.labelTail.setVisible(false)
    this.emoteBack = scene.add.ellipse(
      0,
      0,
      EMOTE_BUBBLE_SIZE,
      EMOTE_BUBBLE_SIZE,
      0xfffdf7,
      0.96,
    )
    this.emoteBack.setStrokeStyle(1, palette.accent, 0.72)
    this.emoteText = scene.add.text(0, 0, "", {
      color: "#20201d",
      fontFamily: "Aptos, Segoe UI, sans-serif",
      fontSize: "13px",
      fontStyle: "800",
      align: "center",
      resolution: LABEL_TEXT_RESOLUTION,
    })
    applyCrispWorldText(this.emoteText)
    this.emoteText.setOrigin(0.5, 0.5)
    this.emoteBack.setVisible(false)
    this.emoteText.setVisible(false)
    this.positionEmoteOverlay()

    this.focusTarget.add(this.visualRoot)
    this.bodyRoot.add([
      this.shadow,
      this.impactRing,
      this.sprite,
      this.leftFoot,
      this.rightFoot,
      this.torso,
      this.head,
      this.hair,
      this.facing,
    ])
    this.hideProceduralBodyParts()
    this.visualRoot.add([
      this.bodyRoot,
      this.labelShadow,
      this.labelBack,
      this.labelTail,
      this.label,
      this.emoteBack,
      this.emoteText,
    ])
    this.applyAppearance(this.appearance)
    this.applyAnimationPose(this.animation, this.visualFacing)
    this.applyCameraAwareLabelScale()
    this.startIdleTween(this.animation, player.position)
    if (entryAnimation === "fade") {
      this.scene.tweens.add({
        targets: this.focusTarget,
        alpha: 1,
        duration: 180,
        ease: "Sine.easeOut",
      })
    }
    this.update(player)
  }

  update(player: RenderedPlayer): void {
    const previousAnimation = this.animation
    const previousVisualFacing = this.visualFacing
    const snapshotDelta = {
      x: player.position.x - this.lastPosition.x,
      y: player.position.y - this.lastPosition.y,
    }
    const snapshotMoved =
      vectorLength(snapshotDelta) > REMOTE_POSITION_EPSILON_PX
    const remoteInterpolationActive =
      !player.local && this.remoteInterpolationActive()
    const moved = player.local
      ? snapshotMoved
      : snapshotMoved || remoteInterpolationActive
    const nextAvatarId = resolveAvatarId(player.avatarId ?? fallbackAvatarId(player))
    const nextAppearance = avatarAppearance(nextAvatarId)
    const directionChanged = player.direction !== this.lastDirection
    const movementMode = player.movementMode ?? "walk"
    const movementModeChanged = movementMode !== this.lastMovementMode
    const visualFacingVector = snapshotMoved
      ? snapshotDelta
      : this.remoteVelocity
    const visualFacingFromMotion =
      vectorLength(visualFacingVector) > 0.01
        ? visualFacingForVector(visualFacingVector)
        : previousVisualFacing
    const visualFacingFromDirection = visualFacingForDirection(player.direction)
    const identityChanged =
      player.local !== this.playerLocal ||
      player.name !== this.label.text ||
      nextAvatarId !== this.avatarId
    const avatarChanged = nextAvatarId !== this.avatarId
    const transition = resolveAvatarAnimationTransition({
      currentAction: previousAnimation.action,
      currentVisualFacing: previousVisualFacing,
      currentDirection: previousAnimation.direction,
      direction: player.direction,
      movementMode,
      moved,
      directionChanged,
      movementModeChanged,
      identityChanged,
      avatarChanged,
      preview: player.animationPreview,
      visualFacingFromMotion,
      visualFacingFromDirection,
      nowMs: this.scene.time.now,
      turnHoldUntilMs: this.turnHoldUntilMs,
      turnDurationMs: TURN_BLEND_DURATION_MS,
    })
    const nextAction = transition.action
    const nextVisualFacing = transition.visualFacing
    const nextAnimation = avatarAnimationDefinition(
      nextAvatarId,
      player.direction,
      nextAction,
    )
    const poseChanged =
      previousAnimation.key !== nextAnimation.key ||
      previousVisualFacing !== nextVisualFacing ||
      avatarChanged

    if (transition.startTurnHold) {
      this.turnHoldUntilMs = this.scene.time.now + nextAnimation.durationMs
    } else if (transition.clearTurnHold) {
      this.turnHoldUntilMs = 0
    }
    this.recordAnimationTransition(previousAnimation, nextAnimation, transition)

    this.playerLocal = player.local
    this.avatarId = nextAvatarId
    this.appearance = nextAppearance
    this.animation = nextAnimation
    this.visualFacing = nextVisualFacing
    this.animationPreview = player.animationPreview
    this.interpolationProfile = avatarInterpolationProfile(player.local)
    this.cosmetics = player.cosmetics ?? {}
    if (player.local) {
      this.remoteSnapshots = []
      this.remoteVelocity = { x: 0, y: 0 }
      this.remoteExtrapolating = false
      this.remoteSnapping = false
    } else {
      this.enqueueRemoteSnapshot(player)
    }
    this.label.setText(player.name)
    applyCrispWorldText(this.label)
    this.resizeLabel()
    this.applyAppearance(nextAppearance)
    if (poseChanged) {
      if (avatarChanged) {
        this.applyAnimationPose(nextAnimation, nextVisualFacing)
      } else {
        this.blendToAnimationPose(
          nextAnimation,
          nextVisualFacing,
          poseBlendDurationMs(
            previousAnimation,
            nextAnimation,
            previousVisualFacing,
            nextVisualFacing,
            transition.reason,
          ),
        )
      }
      this.applySpriteAnimationTransition(
        nextAnimation,
        nextAppearance,
        nextVisualFacing,
        transition,
        previousAnimation,
      )
    } else {
      this.applySpriteFrame()
    }
    this.applyCameraAwareLabelScale()
    this.focusTarget.setDepth(avatarDepth(this.focusTarget.y))

    if (moved || isLocomotionAction(nextAction)) {
      if (player.local) {
        this.moveDirectlyTo(player.position)
      } else if (moved) {
        this.applyRemoteInterpolation(this.scene.time.now)
      }
      this.startWalkTween(nextAnimation)
    } else if (
      player.animationPreview ||
      directionChanged ||
      identityChanged ||
      movementModeChanged
    ) {
      this.cameraTarget.setPosition(player.position.x, player.position.y)
      if (nextAction === "turn") {
        this.startTurnTween(nextAnimation)
      } else if (nextAction === "idle") {
        this.startIdleTween(nextAnimation, player.position)
      } else {
        this.startWalkTween(nextAnimation)
      }
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
    this.lastMovementMode = movementMode
  }

  syncFrame(): void {
    if (!this.playerLocal) {
      this.applyRemoteInterpolation(this.scene.time.now)
    }
    this.applySpriteFrame()
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
    this.emoteText.setText(emote.glyph)
    applyCrispWorldText(this.emoteText)
    this.emoteText.setVisible(false)
    this.emoteBack.setAlpha(0.96)
    this.emoteText.setAlpha(1)
    this.positionEmoteOverlay()
    this.emoteTween = this.scene.tweens.add({
      targets: [this.emoteBack, this.emoteText],
      y: "-=8",
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
    this.applyLabelPresentation()
  }

  setForegroundLabelOcclusion(occluded: boolean): void {
    if (this.foregroundLabelOccluded === occluded) return
    this.foregroundLabelOccluded = occluded
    this.applyLabelPresentation()
  }

  currentLabelBounds(): RendererDepthPlacementBounds {
    const labelScale = this.currentLabelScale()
    const width = this.labelWidth * labelScale

    return {
      x: this.focusTarget.x - width / 2,
      y: this.focusTarget.y + this.visualRoot.y + this.poseState.labelY - 10,
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
        pipeline: "sprite_atlas_metadata",
        key: this.animation.key,
        action: this.animation.action,
        state: this.animation.action,
        direction: this.animation.direction,
        serverDirection: this.animation.direction,
        visualFacing: this.visualFacing,
        durationMs: this.animation.durationMs,
        sprite: this.animation.sprite,
        frameIndex: this.spriteFrameIndex,
        frameKey: this.spriteFrameKey,
        textureKey: this.spriteTextureKey,
        textureFrame: this.spriteTextureFrame,
        frameSource: this.spriteFrameSource,
        frameProgression: {
          source: "phaser_animation_manager",
          elapsedMs: Math.round(this.spriteElapsedMs),
          rawFrameIndex: this.spriteRawFrameIndex,
          currentFrameIndex: this.spriteFrameIndex,
          frameCount: this.animation.sprite.frameCount,
          cycleDurationMs: this.spriteCycleDurationMs,
          normalizedCycleProgress: Number(
            this.spriteNormalizedCycleProgress.toFixed(3),
          ),
          loop: this.animation.sprite.loop,
        },
        nativeAnimation: {
          source: "phaser_animation_manager",
          key: this.spriteNativeAnimation?.key ?? "",
          registered: this.spriteNativeAnimation?.registered ?? false,
          playing: this.sprite.anims.isPlaying,
          frameRate:
            this.sprite.anims.frameRate ||
            this.spriteNativeAnimation?.frameRate ||
            this.animation.sprite.frameRate,
          repeat:
            this.spriteNativeAnimation?.repeat ??
            (this.animation.sprite.loop ? -1 : this.animation.repeat),
          skipMissedFrames:
            this.spriteNativeAnimation?.skipMissedFrames ?? false,
          progress: Number(this.spriteNormalizedCycleProgress.toFixed(3)),
          currentFrameIndex: this.spriteFrameIndex,
          currentFrameTextureKey:
            this.sprite.anims.currentFrame?.textureKey ?? this.spriteTextureKey,
          currentFrameTextureFrame:
            this.sprite.anims.currentFrame?.textureFrame ??
            this.spriteTextureFrame,
        },
        frameRate: this.animation.sprite.frameRate,
        frameDurationMs: this.animation.sprite.frameDurationMs,
        loop: this.animation.sprite.loop,
        blendDurationMs: this.animation.sprite.blendDurationMs,
        transition: {
          from: this.transitionFrom,
          to: this.transitionTo,
          reason: this.transitionReason,
          preserveSpritePhase: this.transitionPreservedSpritePhase,
          restartedSpriteClock: this.transitionRestartedSpriteClock,
          turnHoldActive: this.turnHoldUntilMs > this.scene.time.now,
        },
        poseBlendActive: this.poseTween?.isPlaying() ?? false,
      },
      interpolationProfile: this.interpolationProfile.id,
      interpolationActive: this.remoteInterpolationActive(),
      remoteInterpolation: this.playerLocal
        ? undefined
        : this.remoteInterpolationInfo(),
      movementSmoothing: {
        mode: this.playerLocal
          ? "continuous_local_motion"
          : "remote_snapshot_buffer",
        logicalVertexRoundMode: "off",
        visualTransformIsolation: "inner_visual_root",
      },
      labelVisible: this.labelIsVisible,
      labelVisibilityReason: this.labelReason,
      labelPolicy: "local_always_remote_overlap_suppressed",
      labelOccludedByForeground: this.foregroundLabelOccluded,
      labelOcclusionPolicy: "local_visible_remote_foreground_labels_dimmed",
      labelBounds: this.currentLabelBounds(),
      labelResolution: LABEL_TEXT_RESOLUTION,
      labelTextureFilter: LABEL_TEXTURE_FILTER,
      labelRenderBackend: "dom_overlay",
      labelScreenScale: this.currentLabelScale(),
      emoteId: this.currentEmoteId,
      emoteOverlay: {
        visible: this.emoteBack.visible,
        anchor: "label_top_right",
        x: Math.round(this.emoteBack.x),
        y: Math.round(this.emoteBack.y),
        size: EMOTE_BUBBLE_SIZE,
        scale: Number(this.currentLabelScale().toFixed(2)),
        opacity: Number(this.emoteBack.alpha.toFixed(2)),
      },
      cosmeticSlots: this.appearance.cosmeticSlots,
      cosmetics: this.cosmetics,
    }
  }

  destroy(): void {
    this.idleTween?.stop()
    this.walkTween?.stop()
    this.footTween?.stop()
    this.poseTween?.stop()
    this.turnTween?.stop()
    this.rejectionTween?.stop()
    this.impactTween?.stop()
    this.emoteTween?.stop()
    this.focusTarget.destroy(true)
    this.cameraTarget.destroy()
  }

  private moveDirectlyTo(position: Vector2): void {
    this.focusTarget.setPosition(position.x, position.y)
    this.cameraTarget.setPosition(position.x, position.y)
    this.focusTarget.setDepth(avatarDepth(this.focusTarget.y))
    this.applyCameraAwareLabelScale()
  }

  private enqueueRemoteSnapshot(player: RenderedPlayer): void {
    const nowMs = player.snapshotReceivedAtMs ?? this.scene.time.now
    const latest = this.remoteSnapshots.at(-1)
    this.observeRemoteSnapshotTiming(player, nowMs)

    if (!latest) {
      this.remoteSnapshots = [
        {
          position: player.position,
          direction: player.direction,
          movementMode: player.movementMode ?? "walk",
          receivedAtMs: nowMs - REMOTE_INTERPOLATION_DELAY_MS,
          snapshotTick: player.snapshotTick,
          snapshotServerTime: player.snapshotServerTime,
        },
      ]
      return
    }

    const moved =
      distanceBetween(latest.position, player.position) >
      REMOTE_POSITION_EPSILON_PX
    const stateChanged =
      latest.direction !== player.direction ||
      latest.movementMode !== (player.movementMode ?? "walk")

    if (!moved && !stateChanged) return

    if (
      distanceBetween(this.focusTarget, player.position) >
      REMOTE_SNAP_DISTANCE_PX
    ) {
      this.remoteSnapping = true
      this.remoteSnapshots = [
        {
          position: player.position,
          direction: player.direction,
          movementMode: player.movementMode ?? "walk",
          receivedAtMs: nowMs - REMOTE_INTERPOLATION_DELAY_MS,
          snapshotTick: player.snapshotTick,
          snapshotServerTime: player.snapshotServerTime,
        },
      ]
      this.remoteVelocity = { x: 0, y: 0 }
      this.focusTarget.setPosition(player.position.x, player.position.y)
      this.cameraTarget.setPosition(player.position.x, player.position.y)
      return
    }

    this.remoteSnapping = false
    this.remoteSnapshots.push({
      position: player.position,
      direction: player.direction,
      movementMode: player.movementMode ?? "walk",
      receivedAtMs: nowMs,
      snapshotTick: player.snapshotTick,
      snapshotServerTime: player.snapshotServerTime,
    })
    this.remoteSnapshots.splice(
      0,
      Math.max(0, this.remoteSnapshots.length - REMOTE_SNAPSHOT_HISTORY_LIMIT),
    )
  }

  private applyRemoteInterpolation(nowMs: number): void {
    if (this.remoteSnapshots.length === 0) return

    const renderTimeMs = nowMs - REMOTE_INTERPOLATION_DELAY_MS
    this.remoteRenderTimeMs = Math.round(renderTimeMs)
    this.remoteLatestSnapshotAgeMs = Math.max(
      0,
      Math.round(
        nowMs - (this.remoteLatestSnapshotReceivedAtMs ?? nowMs),
      ),
    )

    while (
      this.remoteSnapshots.length >= 3 &&
      this.remoteSnapshots[1].receivedAtMs <= renderTimeMs
    ) {
      this.remoteSnapshots.shift()
    }

    const previous = this.remoteSnapshots[0]
    const next = this.remoteSnapshots[1]
    let position = previous.position
    let velocity = { x: 0, y: 0 }
    this.remoteExtrapolating = false

    if (next && renderTimeMs <= next.receivedAtMs) {
      const spanMs = Math.max(1, next.receivedAtMs - previous.receivedAtMs)
      const t = clamp((renderTimeMs - previous.receivedAtMs) / spanMs, 0, 1)
      position = {
        x: Phaser.Math.Linear(previous.position.x, next.position.x, t),
        y: Phaser.Math.Linear(previous.position.y, next.position.y, t),
      }
      velocity = velocityBetween(previous, next)
    } else if (next) {
      const overshootMs = Math.max(0, renderTimeMs - next.receivedAtMs)
      velocity = velocityBetween(previous, next)
      if (overshootMs <= REMOTE_EXTRAPOLATION_LIMIT_MS) {
        position = {
          x: next.position.x + velocity.x * overshootMs / 1000,
          y: next.position.y + velocity.y * overshootMs / 1000,
        }
        this.remoteExtrapolating = overshootMs > 0
      } else {
        position = next.position
        velocity = { x: 0, y: 0 }
      }
    } else {
      position = previous.position
    }

    this.remoteVelocity = velocity
    this.focusTarget.setPosition(position.x, position.y)
    this.cameraTarget.setPosition(position.x, position.y)
    this.focusTarget.setDepth(avatarDepth(this.focusTarget.y))
    this.applyCameraAwareLabelScale()
  }

  private remoteInterpolationActive(): boolean {
    if (this.playerLocal || this.remoteSnapshots.length < 2) return false

    return (
      distanceBetween(this.focusTarget, this.lastPosition) >
        this.interpolationProfile.positionEpsilon ||
      this.remoteExtrapolating
    )
  }

  private remoteInterpolationInfo(): RendererAvatarPlayerInfo["remoteInterpolation"] {
    const firstSnapshot = this.remoteSnapshots[0]
    const latestBufferedSnapshot = this.remoteSnapshots.at(-1)
    const bufferedWindowMs =
      firstSnapshot && latestBufferedSnapshot
        ? Math.max(
            0,
            Math.round(
              latestBufferedSnapshot.receivedAtMs - firstSnapshot.receivedAtMs,
            ),
          )
        : 0

    return {
      mode: "snapshot_buffer",
      source: "server_snapshot_stream",
      interpolationDelayMs: REMOTE_INTERPOLATION_DELAY_MS,
      extrapolationLimitMs: REMOTE_EXTRAPOLATION_LIMIT_MS,
      bufferedSnapshotCount: this.remoteSnapshots.length,
      bufferedWindowMs,
      renderTimeMs: this.remoteRenderTimeMs,
      latestSnapshotAgeMs: this.remoteLatestSnapshotAgeMs,
      latestSnapshotTick: this.remoteLatestSnapshotTick,
      latestSnapshotServerTime: this.remoteLatestSnapshotServerTime,
      latestSnapshotReceivedAtMs: this.remoteLatestSnapshotReceivedAtMs,
      extrapolating: this.remoteExtrapolating,
      snapping: this.remoteSnapping,
      velocity: roundedVector(this.remoteVelocity),
    }
  }

  private observeRemoteSnapshotTiming(
    player: RenderedPlayer,
    receivedAtMs: number,
  ): void {
    this.remoteLatestSnapshotTick = player.snapshotTick
    this.remoteLatestSnapshotServerTime = player.snapshotServerTime
    this.remoteLatestSnapshotReceivedAtMs = receivedAtMs
  }

  private showRejected(direction: Direction): void {
    this.rejectionTween?.stop()
    this.impactTween?.stop()
    const palette = this.appearance.palette
    this.torso.setStrokeStyle(2, 0xffd166, 1)
    this.impactRing.setVisible(true)
    this.impactRing.setAlpha(0.72)
    this.impactRing.setScale(0.72, 0.82)
    this.impactRing.setStrokeStyle(2, 0xffd166, 0.78)
    this.impactTween = this.scene.tweens.add({
      targets: this.impactRing,
      alpha: 0,
      scaleX: 1.46,
      scaleY: 1.24,
      duration: 190,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.impactRing.setVisible(false)
        this.impactRing.setScale(1, 1)
        this.impactRing.setStrokeStyle(2, 0xffd166, 0)
      },
    })
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

  private applyLabelPresentation(): void {
    if (!this.labelIsVisible) {
      this.label.setAlpha(0)
      this.labelBack.setAlpha(0)
      this.labelShadow.setAlpha(0)
      this.labelTail.setAlpha(0)
      return
    }

    this.label.setAlpha(this.foregroundLabelOccluded ? 0.44 : 1)
    this.labelBack.setAlpha(this.foregroundLabelOccluded ? 0.34 : 0.93)
    this.labelShadow.setAlpha(this.foregroundLabelOccluded ? 0.05 : 0.16)
    this.labelTail.setAlpha(this.foregroundLabelOccluded ? 0.28 : 0.93)
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

  private hideProceduralBodyParts(): void {
    const proceduralParts = [
      this.leftFoot,
      this.rightFoot,
      this.torso,
      this.head,
      this.hair,
      this.facing,
    ]

    proceduralParts.forEach((part) => part.setVisible(false))
  }

  private restartSpriteAnimation(
    animation: AvatarAnimationDefinition,
    appearance: AvatarAppearanceMetadata,
    visualFacing: AvatarVisualFacing,
  ): void {
    this.spriteAnimationKey = animation.key
    this.spriteVisualFacing = visualFacing
    this.spriteAnimationStartedAtMs = this.scene.time.now
    this.applyNativeSpriteAnimation(true, animation, appearance, visualFacing)
  }

  private applySpriteAnimationTransition(
    nextAnimation: AvatarAnimationDefinition,
    nextAppearance: AvatarAppearanceMetadata,
    nextVisualFacing: AvatarVisualFacing,
    transition: AvatarAnimationTransitionPlan,
    previousAnimation: AvatarAnimationDefinition,
  ): void {
    if (transition.preserveSpritePhase) {
      this.preserveSpriteAnimationPhase(previousAnimation, nextAnimation)
      this.spriteAnimationKey = nextAnimation.key
      this.spriteVisualFacing = nextVisualFacing
      this.applyNativeSpriteAnimation(
        true,
        nextAnimation,
        nextAppearance,
        nextVisualFacing,
      )
      return
    }

    if (transition.restartSpriteClock) {
      this.restartSpriteAnimation(nextAnimation, nextAppearance, nextVisualFacing)
      return
    }

    this.applyNativeSpriteAnimation(
      true,
      nextAnimation,
      nextAppearance,
      nextVisualFacing,
    )
  }

  private preserveSpriteAnimationPhase(
    previousAnimation: AvatarAnimationDefinition,
    nextAnimation: AvatarAnimationDefinition,
  ): void {
    const nowMs = this.scene.time.now
    const previousCycleMs = spriteCycleDurationMs(previousAnimation)
    const nextCycleMs = spriteCycleDurationMs(nextAnimation)
    const previousElapsedMs = Math.max(0, nowMs - this.spriteAnimationStartedAtMs)
    const normalizedPhase = previousAnimation.sprite.loop
      ? (previousElapsedMs % previousCycleMs) / previousCycleMs
      : clamp(previousElapsedMs / previousCycleMs, 0, 1)

    this.spriteAnimationStartedAtMs = nowMs - normalizedPhase * nextCycleMs
  }

  private recordAnimationTransition(
    previousAnimation: AvatarAnimationDefinition,
    nextAnimation: AvatarAnimationDefinition,
    transition: AvatarAnimationTransitionPlan,
  ): void {
    this.transitionFrom = previousAnimation.action
    this.transitionTo = nextAnimation.action
    this.transitionReason = transition.reason
    this.transitionPreservedSpritePhase = transition.preserveSpritePhase
    this.transitionRestartedSpriteClock = transition.restartSpriteClock
  }

  private applySpriteFrame(
    force = false,
    animation = this.animation,
    appearance = this.appearance,
    visualFacing = this.visualFacing,
  ): void {
    this.applyNativeSpriteAnimation(force, animation, appearance, visualFacing)
  }

  private applyNativeSpriteAnimation(
    force = false,
    animation = this.animation,
    appearance = this.appearance,
    visualFacing = this.visualFacing,
  ): void {
    if (
      this.spriteAnimationKey !== animation.key ||
      this.spriteVisualFacing !== visualFacing
    ) {
      this.spriteAnimationKey = animation.key
      this.spriteVisualFacing = visualFacing
      this.spriteAnimationStartedAtMs = this.scene.time.now
      force = true
    }

    const nativeAnimation = ensureAvatarNativeAnimation(
      this.scene,
      animation,
      appearance,
      visualFacing,
    )
    const animationChanged =
      this.spriteNativeAnimation?.key !== nativeAnimation.key ||
      this.sprite.anims.currentAnim?.key !== nativeAnimation.key
    const shouldRestartStoppedLoop =
      animation.sprite.loop && !this.sprite.anims.isPlaying

    if (force || animationChanged || shouldRestartStoppedLoop) {
      const startProgress = this.currentNativeAnimationProgress(animation)

      this.sprite.play(
        {
          key: nativeAnimation.key,
          frameRate: nativeAnimation.frameRate,
          repeat: nativeAnimation.repeat,
          skipMissedFrames: nativeAnimation.skipMissedFrames,
          startFrame: currentFrameIndexForProgress(animation, startProgress),
        },
        false,
      )
      this.sprite.anims.setProgress(startProgress)
    }

    this.sprite.anims.setProgress(this.currentNativeAnimationProgress(animation))
    this.spriteNativeAnimation = nativeAnimation
    this.syncSpriteFrameTelemetry(animation, nativeAnimation)
    this.sprite.setOrigin(
      animation.sprite.anchor.x,
      animation.sprite.anchor.y,
    )
    this.sprite.setDisplaySize(
      avatarSpriteAtlasMetadata().frameWidth,
      avatarSpriteAtlasMetadata().frameHeight,
    )
  }

  private syncSpriteFrameTelemetry(
    animation: AvatarAnimationDefinition,
    nativeAnimation: ResolvedAvatarNativeAnimation,
  ): void {
    const elapsedMs = Math.max(
      0,
      this.scene.time.now - this.spriteAnimationStartedAtMs,
    )
    const cycleDurationMs = spriteCycleDurationMs(animation)
    const currentNativeFrame = this.sprite.anims.currentFrame
    const currentFrameIndex = clamp(
      currentNativeFrame ? currentNativeFrame.index - 1 : 0,
      0,
      animation.sprite.frameCount - 1,
    )
    const frame = nativeAnimation.frameTextures[currentFrameIndex] ??
      nativeAnimation.frameTextures[0]
    const rawFrameIndex = Math.floor(elapsedMs / animation.sprite.frameDurationMs)

    this.spriteFrameIndex = currentFrameIndex
    this.spriteElapsedMs = elapsedMs
    this.spriteRawFrameIndex = rawFrameIndex
    this.spriteCycleDurationMs = cycleDurationMs
    this.spriteNormalizedCycleProgress = clamp(
      this.sprite.anims.getProgress(),
      0,
      1,
    )
    this.spriteFrameKey = frame.semanticFrameKey
    this.spriteTextureKey = frame.textureKey
    this.spriteTextureFrame = frame.textureFrame
    this.spriteFrameSource = frame.source
  }

  private currentNativeAnimationProgress(
    animation: AvatarAnimationDefinition,
  ): number {
    const elapsedMs = Math.max(
      0,
      this.scene.time.now - this.spriteAnimationStartedAtMs,
    )
    const cycleDurationMs = spriteCycleDurationMs(animation)

    if (animation.sprite.loop) return elapsedMs % cycleDurationMs / cycleDurationMs

    return clamp(elapsedMs / cycleDurationMs, 0, 1)
  }

  private applyAnimationPose(
    animation: AvatarAnimationDefinition,
    visualFacing: AvatarVisualFacing,
  ): void {
    this.poseTween?.stop()
    this.poseState = renderedPoseFor(animation, visualFacing)
    this.applyPoseState()
  }

  private blendToAnimationPose(
    animation: AvatarAnimationDefinition,
    visualFacing: AvatarVisualFacing,
    durationMs: number,
  ): void {
    const targetPose = renderedPoseFor(animation, visualFacing)

    targetPose.facingRotation = nearestEquivalentAngle(
      this.poseState.facingRotation,
      targetPose.facingRotation,
    )
    targetPose.torsoRotation = nearestEquivalentAngle(
      this.poseState.torsoRotation,
      targetPose.torsoRotation,
    )

    if (durationMs <= 0) {
      this.poseTween?.stop()
      this.poseState = targetPose
      this.applyPoseState()
      return
    }

    this.poseTween?.stop()
    this.poseTween = this.scene.tweens.add({
      targets: this.poseState,
      ...targetPose,
      duration: durationMs,
      ease: "Sine.easeOut",
      onUpdate: () => this.applyPoseState(),
      onComplete: () => {
        this.poseState = targetPose
        this.applyPoseState()
      },
    })
  }

  private applyPoseState(): void {
    const pose = this.poseState

    this.facing.setRotation(pose.facingRotation)
    this.facing.setPosition(pose.facingX, pose.facingY)
    this.facing.setAlpha(pose.facingAlpha)
    this.torso.setRotation(pose.torsoRotation)
    this.head.setPosition(pose.headX, pose.headY)
    this.head.setScale(pose.headScaleX, 1)
    this.hair.setPosition(pose.hairX, pose.hairY)
    this.hair.setScale(pose.hairScaleX, 1)
    this.leftFoot.setPosition(pose.leftFootX, pose.leftFootY)
    this.rightFoot.setPosition(pose.rightFootX, pose.rightFootY)
    this.label.setPosition(0, pose.labelY)
    this.labelShadow.setPosition(1, pose.labelY + 2)
    this.labelBack.setPosition(0, pose.labelY)
    this.labelTail.setPosition(0, pose.labelY + 10)
    this.positionEmoteOverlay()
    this.applyCameraAwareLabelScale()
  }

  private resizeLabel(): void {
    const width = this.labelWidth

    this.labelShadow.setSize(width, 17)
    this.labelBack.setSize(width, 17)
    this.positionEmoteOverlay()
  }

  private startIdleTween(
    animation: AvatarAnimationDefinition,
    anchorPosition: Vector2,
  ): void {
    if (this.idleTween?.isPlaying()) return

    this.walkTween?.stop()
    this.footTween?.stop()
    this.turnTween?.stop()
    this.leftFoot.setScale(1, 1)
    this.rightFoot.setScale(1, 1)
    this.bodyRoot.setPosition(0, 0)
    this.bodyRoot.setScale(1, 1)
    this.bodyRoot.setAngle(0)
    this.cameraTarget.setPosition(anchorPosition.x, anchorPosition.y)
    this.idleTween = this.scene.tweens.add({
      targets: this.bodyRoot,
      y: -1.5,
      scaleY: animation.bodyScaleY,
      duration: animation.durationMs,
      yoyo: true,
      repeat: animation.repeat,
      ease: "Sine.easeInOut",
    })
    this.walkTweenAction = undefined
  }

  private startWalkTween(animation: AvatarAnimationDefinition): void {
    if (
      this.walkTween?.isPlaying() &&
      this.footTween?.isPlaying() &&
      this.walkTweenAction === animation.action
    ) {
      return
    }

    this.idleTween?.stop()
    this.turnTween?.stop()
    this.walkTween?.stop()
    this.footTween?.stop()
    this.walkTweenAction = animation.action
    this.visualRoot.setPosition(0, 0)
    this.visualRoot.setScale(1, 1)
    this.bodyRoot.setPosition(0, 0)
    this.bodyRoot.setAngle(0)
    this.walkTween = this.scene.tweens.add({
      targets: this.bodyRoot,
      scaleX: animation.bodyScaleX,
      scaleY: animation.bodyScaleY,
      duration: animation.durationMs,
      yoyo: true,
      repeat: this.animationPreview?.action === animation.action
        ? -1
        : animation.repeat,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (this.animationPreview?.action === animation.action) return

        const idleAnimation = avatarAnimationDefinition(
          this.avatarId,
          this.lastDirection,
          "idle",
        )

        this.completeAnimationToIdle(
          animation,
          idleAnimation,
          "locomotion_to_idle",
          128,
        )
      },
    })
    this.footTween = this.scene.tweens.add({
      targets: [this.leftFoot, this.rightFoot],
      scaleX: animation.footScaleX,
      scaleY: animation.footScaleY,
      duration: Math.max(80, animation.durationMs - 15),
      yoyo: true,
      repeat: this.animationPreview?.action === animation.action
        ? -1
        : animation.repeat,
      ease: "Sine.easeInOut",
    })
  }

  private startTurnTween(animation: AvatarAnimationDefinition): void {
    this.idleTween?.stop()
    this.walkTween?.stop()
    this.footTween?.stop()
    this.turnTween?.stop()
    this.walkTweenAction = animation.action
    this.visualRoot.setPosition(0, 0)
    this.visualRoot.setScale(1, 1)
    this.leftFoot.setScale(1, 1)
    this.rightFoot.setScale(1, 1)

    this.turnTween = this.scene.tweens.add({
      targets: this.bodyRoot,
      angle: turnAngleForFacing(this.visualFacing),
      scaleX: animation.bodyScaleX,
      scaleY: animation.bodyScaleY,
      duration: animation.durationMs,
      yoyo: true,
      repeat: 0,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (this.animationPreview?.action === "turn") {
          this.bodyRoot.setAngle(0)
          this.restartSpriteAnimation(
            animation,
            this.appearance,
            this.visualFacing,
          )
          this.startTurnTween(animation)
          return
        }

        const idleAnimation = avatarAnimationDefinition(
          this.avatarId,
          this.lastDirection,
          "idle",
        )

        this.completeAnimationToIdle(
          animation,
          idleAnimation,
          "turn_to_idle",
          POSE_BLEND_DURATION_MS,
        )
      },
    })
  }

  private completeAnimationToIdle(
    previousAnimation: AvatarAnimationDefinition,
    idleAnimation: AvatarAnimationDefinition,
    reason: AvatarAnimationTransitionReason,
    blendDurationMs: number,
  ): void {
    this.animation = idleAnimation
    this.turnHoldUntilMs = 0
    this.walkTweenAction = undefined
    this.bodyRoot.setAngle(0)
    this.recordAnimationTransition(previousAnimation, idleAnimation, {
      action: idleAnimation.action,
      visualFacing: this.visualFacing,
      reason,
      preserveSpritePhase: false,
      restartSpriteClock: true,
      startTurnHold: false,
      clearTurnHold: true,
    })
    this.restartSpriteAnimation(idleAnimation, this.appearance, this.visualFacing)
    this.blendToAnimationPose(idleAnimation, this.visualFacing, blendDurationMs)
    this.startIdleTween(idleAnimation, this.lastPosition)
  }

  private applyCameraAwareLabelScale(): void {
    const scale = this.currentLabelScale()

    this.label.setScale(scale)
    this.labelShadow.setScale(scale)
    this.labelBack.setScale(scale)
    this.labelTail.setScale(scale)
    this.emoteBack.setScale(scale)
    this.emoteText.setScale(scale)
    applyCrispWorldText(this.label)
    applyCrispWorldText(this.emoteText)
  }

  private positionEmoteOverlay(): void {
    const x = clamp(this.labelWidth / 2 + EMOTE_LABEL_GAP, 32, 78)
    const y = this.poseState.labelY - EMOTE_BUBBLE_SIZE / 2 - EMOTE_LABEL_GAP - 2

    this.emoteBack.setPosition(x, y)
    this.emoteText.setPosition(x, y - 1)
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

function renderedPoseFor(
  animation: AvatarAnimationDefinition,
  visualFacing: AvatarVisualFacing,
): AvatarPoseState {
  const base = VISUAL_FACING_POSES[visualFacing]
  const stride =
    animation.action === "run" ? 1.35 : animation.action === "walk" ? 0.72 : 0
  const turnCompression = animation.action === "turn" ? 0.65 : 1
  const sideBias = visualFacing.includes("Right")
    ? 1
    : visualFacing.includes("Left")
      ? -1
      : 0

  return {
    ...base,
    facingAlpha:
      animation.action === "turn"
        ? Math.min(0.92, base.facingAlpha + 0.16)
        : base.facingAlpha,
    headX: base.headX + sideBias * stride * 0.2,
    hairX: base.hairX + sideBias * stride * 0.22,
    torsoRotation: base.torsoRotation * turnCompression,
    leftFootX: base.leftFootX - sideBias * stride * 0.35,
    rightFootX: base.rightFootX + sideBias * stride * 0.35,
    leftFootY: base.leftFootY + (animation.action === "run" ? 0.8 : 0),
    rightFootY: base.rightFootY - (animation.action === "run" ? 0.8 : 0),
  }
}

function visualFacingForDirection(direction: Direction): AvatarVisualFacing {
  return direction
}

function visualFacingForVector(vector: Vector2): AvatarVisualFacing {
  const angle = Math.atan2(vector.y, vector.x)
  const octant = Math.round(angle / (Math.PI / 4))

  switch ((octant + 8) % 8) {
    case 0:
      return "right"
    case 1:
      return "downRight"
    case 2:
      return "down"
    case 3:
      return "downLeft"
    case 4:
      return "left"
    case 5:
      return "upLeft"
    case 6:
      return "up"
    default:
      return "upRight"
  }
}

function poseBlendDurationMs(
  previousAnimation: AvatarAnimationDefinition,
  nextAnimation: AvatarAnimationDefinition,
  previousFacing: AvatarVisualFacing,
  nextFacing: AvatarVisualFacing,
  reason: AvatarAnimationTransitionReason,
): number {
  if (
    previousAnimation.key === nextAnimation.key &&
    previousFacing === nextFacing
  ) {
    return 0
  }

  if (reason === "locomotion_direction_blend") return 72
  if (reason === "locomotion_speed_blend") return 118
  if (reason === "idle_to_locomotion") return 86
  if (reason === "locomotion_to_idle") return 128
  if (nextAnimation.action === "turn") return TURN_BLEND_DURATION_MS
  if (previousAnimation.action !== nextAnimation.action) return POSE_BLEND_DURATION_MS

  return 84
}

function spriteCycleDurationMs(animation: AvatarAnimationDefinition): number {
  return Math.max(
    animation.sprite.frameDurationMs,
    animation.sprite.frameDurationMs * animation.sprite.frameCount,
  )
}

function currentFrameIndexForProgress(
  animation: AvatarAnimationDefinition,
  progress: number,
): number {
  return clamp(
    Math.floor(progress * animation.sprite.frameCount),
    0,
    animation.sprite.frameCount - 1,
  )
}

function nearestEquivalentAngle(current: number, target: number): number {
  const fullTurn = Math.PI * 2
  let resolved = target

  while (resolved - current > Math.PI) resolved -= fullTurn
  while (resolved - current < -Math.PI) resolved += fullTurn

  return resolved
}

function turnAngleForFacing(visualFacing: AvatarVisualFacing): number {
  if (visualFacing.includes("Right")) return -2.5
  if (visualFacing.includes("Left")) return 2.5
  return 0
}

function velocityBetween(
  previous: RemoteAvatarSnapshot,
  next: RemoteAvatarSnapshot,
): Vector2 {
  const seconds = Math.max(1, next.receivedAtMs - previous.receivedAtMs) / 1000

  return {
    x: (next.position.x - previous.position.x) / seconds,
    y: (next.position.y - previous.position.y) / seconds,
  }
}

function distanceBetween(first: Vector2, second: Vector2): number {
  return Math.hypot(first.x - second.x, first.y - second.y)
}

function vectorLength(vector: Vector2): number {
  return Math.hypot(vector.x, vector.y)
}

function roundedVector(vector: Vector2): Vector2 {
  return {
    x: Number(vector.x.toFixed(2)),
    y: Number(vector.y.toFixed(2)),
  }
}
