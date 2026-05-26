import Phaser from "phaser"

import {
  createAvatarAtlasManifestLookup,
  resolveAvatarFrameTexture,
  type AvatarAtlasManifest,
  type AvatarAtlasManifestLookup,
  type ResolvedAvatarFrameTexture,
} from "./avatar-atlas-manifest"
import {
  avatarSpriteAtlasMetadata,
  type AvatarAnimationDefinition,
  type AvatarAppearanceMetadata,
} from "./avatar-registry"
import type { AvatarVisualFacing } from "./types"

interface FacingVector {
  readonly x: number
  readonly y: number
  readonly side: -1 | 0 | 1
}

let activeAvatarAtlasLookup: AvatarAtlasManifestLookup | undefined

export function setAvatarSpriteAtlasManifest(
  manifest: AvatarAtlasManifest | undefined,
): void {
  activeAvatarAtlasLookup = manifest
    ? createAvatarAtlasManifestLookup(manifest)
    : undefined
}

export function ensureAvatarSpriteFrameTexture(
  scene: Phaser.Scene,
  animation: AvatarAnimationDefinition,
  appearance: AvatarAppearanceMetadata,
  visualFacing: AvatarVisualFacing,
  frameIndex: number,
): ResolvedAvatarFrameTexture {
  const semanticFrameKey = animation.sprite.frameKeys[frameIndex] ??
    animation.sprite.frameKeys[0]
  const resolved = resolveAvatarFrameTexture({
    semanticFrameKey,
    visualFacing,
    lookup: activeAvatarAtlasLookup,
  })

  if (resolved.source === "real_atlas" && scene.textures.exists(resolved.textureKey)) {
    return resolved
  }

  const fallback = resolved.source === "real_atlas"
    ? resolveAvatarFrameTexture({ semanticFrameKey, visualFacing })
    : resolved

  if (scene.textures.exists(fallback.textureKey)) return fallback

  const atlas = avatarSpriteAtlasMetadata()
  const canvas = document.createElement("canvas")
  const scale = atlas.exportScale
  canvas.width = atlas.frameWidth * scale
  canvas.height = atlas.frameHeight * scale
  const context = canvas.getContext("2d")

  if (!context) {
    throw new Error(
      `Unable to create avatar frame texture ${fallback.textureKey}.`,
    )
  }

  context.imageSmoothingEnabled = true
  context.scale(scale, scale)
  drawAvatarFrame(
    context,
    animation,
    appearance,
    visualFacing,
    frameIndex,
    atlas.frameWidth,
    atlas.frameHeight,
  )

  scene.textures.addCanvas(fallback.textureKey, canvas)
  scene.textures.get(fallback.textureKey).setFilter(Phaser.Textures.FilterMode.LINEAR)

  return fallback
}

function drawAvatarFrame(
  context: CanvasRenderingContext2D,
  animation: AvatarAnimationDefinition,
  appearance: AvatarAppearanceMetadata,
  visualFacing: AvatarVisualFacing,
  frameIndex: number,
  frameWidth: number,
  frameHeight: number,
): void {
  const facing = facingVector(visualFacing)
  const palette = appearance.palette
  const centerX = frameWidth / 2
  const anchorY = frameHeight * animation.sprite.anchor.y
  const phase = animation.sprite.frameCount <= 1
    ? 0
    : frameIndex / animation.sprite.frameCount * Math.PI * 2
  const moving = animation.action === "walk" || animation.action === "run"
  const running = animation.action === "run"
  const turning = animation.action === "turn"
  const bob = moving ? Math.sin(phase) * (running ? 1.15 : 0.58) : 0
  const stride = moving ? Math.cos(phase) * (running ? 3.2 : 2.2) : 0
  const turnLean = turning
    ? Math.sin((frameIndex + 1) / animation.sprite.frameCount * Math.PI) * 1.2
    : 0
  const sideStep = facing.side * (0.55 + Math.abs(facing.y) * 0.2)
  const forwardStep = Math.abs(facing.x) > Math.abs(facing.y)
    ? 0
    : facing.y * 0.42
  const torsoX = centerX + facing.x * 0.75 + turnLean * facing.side
  const torsoY = anchorY - 13 + bob
  const headX = centerX + facing.x * 1.5 + turnLean * facing.side * 0.7
  const headY = anchorY - 25 + bob * 0.55
  const leftFoot = {
    x: centerX - 4.4 + stride * sideStep - facing.x * 0.9,
    y: anchorY - 2.2 + stride * forwardStep,
  }
  const rightFoot = {
    x: centerX + 4.4 - stride * sideStep - facing.x * 0.9,
    y: anchorY - 2.1 - stride * forwardStep,
  }

  context.clearRect(0, 0, frameWidth, frameHeight)
  context.lineJoin = "round"
  context.lineCap = "round"

  drawEllipse(
    context,
    leftFoot.x,
    leftFoot.y,
    running ? 3.8 : 3.4,
    2.2,
    color(palette.torsoDark),
    "rgba(31, 31, 28, 0.24)",
  )
  drawEllipse(
    context,
    rightFoot.x,
    rightFoot.y,
    running ? 3.8 : 3.4,
    2.2,
    color(palette.torsoDark),
    "rgba(31, 31, 28, 0.24)",
  )

  drawRoundedRect(
    context,
    torsoX - 6.9,
    torsoY - 10.4,
    13.8,
    19.8,
    6,
    color(palette.torso),
    color(palette.torsoDark),
  )
  drawAccentPanel(context, torsoX, torsoY, facing, color(palette.accent))
  drawEllipse(
    context,
    headX,
    headY,
    6.3,
    6.5,
    color(palette.head),
    "rgba(55, 45, 38, 0.24)",
  )
  drawHair(context, headX, headY, facing, color(palette.hair))
  drawFaceCue(context, headX, headY, visualFacing, color(palette.torsoDark))

  if (turning) {
    context.strokeStyle = withAlpha(palette.accent, 0.45)
    context.lineWidth = 1.2
    context.beginPath()
    context.arc(centerX, anchorY - 13, 10, -0.45, 0.65)
    context.stroke()
  }
}

function drawAccentPanel(
  context: CanvasRenderingContext2D,
  torsoX: number,
  torsoY: number,
  facing: FacingVector,
  fillStyle: string,
): void {
  context.fillStyle = fillStyle
  context.globalAlpha = Math.abs(facing.y) > 0.7 && facing.y < 0 ? 0.34 : 0.82
  context.beginPath()
  context.moveTo(torsoX + facing.x * 2.2, torsoY - 6)
  context.lineTo(torsoX + 3.5 + facing.x * 1.5, torsoY + 1)
  context.lineTo(torsoX - 3.5 + facing.x * 1.5, torsoY + 1)
  context.closePath()
  context.fill()
  context.globalAlpha = 1
}

function drawHair(
  context: CanvasRenderingContext2D,
  headX: number,
  headY: number,
  facing: FacingVector,
  fillStyle: string,
): void {
  context.fillStyle = fillStyle
  context.beginPath()
  context.ellipse(
    headX + facing.x * 0.8,
    headY - 3.4,
    5.7,
    3.6,
    facing.x * 0.1,
    Math.PI,
    Math.PI * 2,
  )
  context.lineTo(headX + 5.8, headY - 0.8)
  context.quadraticCurveTo(headX, headY + 1.5, headX - 5.8, headY - 0.8)
  context.closePath()
  context.fill()
}

function drawFaceCue(
  context: CanvasRenderingContext2D,
  headX: number,
  headY: number,
  visualFacing: AvatarVisualFacing,
  strokeStyle: string,
): void {
  if (visualFacing === "up") return

  const facing = facingVector(visualFacing)
  const eyeY = headY - 0.7
  const eyeSpread = visualFacing === "left" || visualFacing === "right" ? 1.6 : 2.4
  const eyeOffsetX = facing.x * 1.3

  context.fillStyle = strokeStyle
  context.globalAlpha = visualFacing.includes("up") ? 0.36 : 0.72
  context.beginPath()
  context.arc(headX - eyeSpread + eyeOffsetX, eyeY, 0.7, 0, Math.PI * 2)
  context.arc(headX + eyeSpread + eyeOffsetX, eyeY, 0.7, 0, Math.PI * 2)
  context.fill()
  context.globalAlpha = 0.42
  context.strokeStyle = strokeStyle
  context.lineWidth = 0.7
  context.beginPath()
  context.moveTo(headX - 1.7 + eyeOffsetX, headY + 2.2)
  context.quadraticCurveTo(headX + eyeOffsetX, headY + 3, headX + 1.7 + eyeOffsetX, headY + 2.2)
  context.stroke()
  context.globalAlpha = 1
}

function drawEllipse(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  fillStyle: string,
  strokeStyle?: string,
): void {
  context.fillStyle = fillStyle
  context.beginPath()
  context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2)
  context.fill()

  if (!strokeStyle) return

  context.strokeStyle = strokeStyle
  context.lineWidth = 0.9
  context.stroke()
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string,
  strokeStyle: string,
): void {
  const right = x + width
  const bottom = y + height

  context.beginPath()
  context.moveTo(x + radius, y)
  context.lineTo(right - radius, y)
  context.quadraticCurveTo(right, y, right, y + radius)
  context.lineTo(right, bottom - radius)
  context.quadraticCurveTo(right, bottom, right - radius, bottom)
  context.lineTo(x + radius, bottom)
  context.quadraticCurveTo(x, bottom, x, bottom - radius)
  context.lineTo(x, y + radius)
  context.quadraticCurveTo(x, y, x + radius, y)
  context.closePath()
  context.fillStyle = fillStyle
  context.fill()
  context.strokeStyle = strokeStyle
  context.globalAlpha = 0.58
  context.lineWidth = 0.9
  context.stroke()
  context.globalAlpha = 1
}

function facingVector(visualFacing: AvatarVisualFacing): FacingVector {
  switch (visualFacing) {
    case "up":
      return { x: 0, y: -1, side: 0 }
    case "upRight":
      return { x: 0.707, y: -0.707, side: 1 }
    case "right":
      return { x: 1, y: 0, side: 1 }
    case "downRight":
      return { x: 0.707, y: 0.707, side: 1 }
    case "down":
      return { x: 0, y: 1, side: 0 }
    case "downLeft":
      return { x: -0.707, y: 0.707, side: -1 }
    case "left":
      return { x: -1, y: 0, side: -1 }
    case "upLeft":
      return { x: -0.707, y: -0.707, side: -1 }
  }
}

function color(value: number): string {
  return `#${value.toString(16).padStart(6, "0")}`
}

function withAlpha(value: number, alpha: number): string {
  const red = value >> 16 & 0xff
  const green = value >> 8 & 0xff
  const blue = value & 0xff

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
