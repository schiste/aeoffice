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

interface FrameMotion {
  readonly lift: number
  readonly stride: number
  readonly armSwing: number
  readonly shoulderSway: number
  readonly squashX: number
  readonly squashY: number
  readonly footLift: number
  readonly run: boolean
  readonly turnLean: number
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
  const motion = frameMotion(animation, frameIndex)
  const sideStep = facing.side * (0.62 + Math.abs(facing.y) * 0.26)
  const forwardStep = Math.abs(facing.x) > Math.abs(facing.y)
    ? 0.08 * facing.y
    : facing.y * 0.52
  const torsoX =
    centerX + facing.x * 0.95 + motion.shoulderSway + motion.turnLean * facing.side
  const torsoY = anchorY - 13 + motion.lift
  const headX = centerX + facing.x * 1.85 + motion.shoulderSway * 0.42 +
    motion.turnLean * facing.side * 0.72
  const headY = anchorY - 25 + motion.lift * 0.48
  const leftFoot = {
    x: centerX - 4.6 + motion.stride * sideStep - facing.x * 1.05,
    y: anchorY - 2.1 + motion.stride * forwardStep -
      Math.max(0, motion.footLift) * 1.25,
  }
  const rightFoot = {
    x: centerX + 4.6 - motion.stride * sideStep - facing.x * 1.05,
    y: anchorY - 2.0 - motion.stride * forwardStep -
      Math.max(0, -motion.footLift) * 1.25,
  }
  const leftArm = {
    x: torsoX - 7.2 + facing.x * 0.45 - motion.armSwing * sideStep * 0.42,
    y: torsoY - 2.6 - motion.armSwing * forwardStep * 0.4,
  }
  const rightArm = {
    x: torsoX + 7.2 + facing.x * 0.45 + motion.armSwing * sideStep * 0.42,
    y: torsoY - 2.4 + motion.armSwing * forwardStep * 0.4,
  }

  context.clearRect(0, 0, frameWidth, frameHeight)
  context.lineJoin = "round"
  context.lineCap = "round"

  drawBodyShadow(context, centerX, anchorY, motion)
  drawEllipse(
    context,
    leftFoot.x,
    leftFoot.y,
    motion.run ? 4.1 : 3.55,
    motion.run ? 2.35 : 2.15,
    color(palette.torsoDark),
    "rgba(31, 31, 28, 0.24)",
  )
  drawEllipse(
    context,
    rightFoot.x,
    rightFoot.y,
    motion.run ? 4.1 : 3.55,
    motion.run ? 2.35 : 2.15,
    color(palette.torsoDark),
    "rgba(31, 31, 28, 0.24)",
  )
  drawArm(context, rightArm, facing, motion, palette, "back")
  drawArm(context, leftArm, facing, motion, palette, "back")

  drawRoundedRect(
    context,
    torsoX - 7.15 * motion.squashX,
    torsoY - 10.6,
    14.3 * motion.squashX,
    20 * motion.squashY,
    6,
    color(palette.torso),
    color(palette.torsoDark),
  )
  drawJacketSeam(context, torsoX, torsoY, facing, palette)
  drawAccentPanel(context, torsoX, torsoY, facing, color(palette.accent))
  drawArm(context, leftArm, facing, motion, palette, "front")
  drawArm(context, rightArm, facing, motion, palette, "front")
  drawEllipse(
    context,
    headX,
    headY,
    6.55,
    6.7,
    color(palette.head),
    "rgba(55, 45, 38, 0.24)",
  )
  drawEarCue(
    context,
    headX,
    headY,
    facing,
    color(palette.head),
    palette.torsoDark,
  )
  drawHair(context, headX, headY, facing, color(palette.hair))
  drawFaceCue(context, headX, headY, visualFacing, color(palette.torsoDark))

  if (animation.action === "turn") {
    context.strokeStyle = withAlpha(palette.accent, 0.45)
    context.lineWidth = 1.2
    context.beginPath()
    context.arc(
      centerX,
      anchorY - 13,
      10,
      -0.45 + facing.x * 0.2,
      0.65 + facing.x * 0.2,
    )
    context.stroke()
  }
}

function frameMotion(
  animation: AvatarAnimationDefinition,
  frameIndex: number,
): FrameMotion {
  const phase = animation.sprite.frameCount <= 1
    ? 0
    : frameIndex / animation.sprite.frameCount * Math.PI * 2
  const moving = animation.action === "walk" || animation.action === "run"
  const run = animation.action === "run"
  const turnLean = animation.action === "turn"
    ? Math.sin((frameIndex + 1) / animation.sprite.frameCount * Math.PI) * 1.35
    : 0
  const lift = moving
    ? -Math.abs(Math.sin(phase)) * (run ? 1.25 : 0.68)
    : Math.sin(phase) * 0.18
  const stride = moving ? Math.cos(phase) * (run ? 3.75 : 2.45) : 0
  const armSwing = moving ? Math.cos(phase + Math.PI) * (run ? 3.2 : 2.05) : 0

  return {
    lift,
    stride,
    armSwing,
    shoulderSway: moving ? Math.sin(phase) * (run ? 0.82 : 0.38) : 0,
    squashX: moving ? 1 + Math.abs(Math.sin(phase)) * (run ? 0.045 : 0.026) : 1,
    squashY: moving ? 1 - Math.abs(Math.sin(phase)) * (run ? 0.055 : 0.032) : 1,
    footLift: moving ? Math.sin(phase) * (run ? 1.7 : 1.05) : 0,
    run,
    turnLean,
  }
}

function drawBodyShadow(
  context: CanvasRenderingContext2D,
  centerX: number,
  anchorY: number,
  motion: FrameMotion,
): void {
  context.fillStyle = "rgba(27, 25, 21, 0.16)"
  context.beginPath()
  context.ellipse(
    centerX,
    anchorY - 0.2,
    motion.run ? 8.8 : 8.1,
    motion.run ? 3.05 : 2.75,
    0,
    0,
    Math.PI * 2,
  )
  context.fill()
}

function drawArm(
  context: CanvasRenderingContext2D,
  point: { readonly x: number; readonly y: number },
  facing: FacingVector,
  motion: FrameMotion,
  palette: AvatarAppearanceMetadata["palette"],
  layer: "front" | "back",
): void {
  const frontSide = facing.side === 0
    ? point.x < 16
    : Math.sign(point.x - 16) === facing.side
  if ((layer === "front") !== frontSide) return

  context.strokeStyle = color(palette.torsoDark)
  context.globalAlpha = layer === "front" ? 0.94 : 0.54
  context.lineWidth = motion.run ? 3.1 : 2.7
  context.beginPath()
  context.moveTo(point.x - facing.x * 0.75, point.y - 5.8)
  context.quadraticCurveTo(
    point.x + facing.x * 1.15,
    point.y - 1.5,
    point.x + facing.x * 1.7,
    point.y + 4.2,
  )
  context.stroke()
  context.globalAlpha = 1
}

function drawJacketSeam(
  context: CanvasRenderingContext2D,
  torsoX: number,
  torsoY: number,
  facing: FacingVector,
  palette: AvatarAppearanceMetadata["palette"],
): void {
  context.strokeStyle = withAlpha(palette.torsoDark, 0.32)
  context.lineWidth = 0.8
  context.beginPath()
  context.moveTo(torsoX + facing.x * 1.2, torsoY - 8)
  context.lineTo(torsoX + facing.x * 1.8, torsoY + 8.2)
  context.stroke()
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
  context.moveTo(torsoX + facing.x * 2.4, torsoY - 6.5)
  context.lineTo(torsoX + 4.1 + facing.x * 1.6, torsoY + 1.8)
  context.lineTo(torsoX - 4.1 + facing.x * 1.6, torsoY + 1.8)
  context.closePath()
  context.fill()
  context.globalAlpha = 1
}

function drawEarCue(
  context: CanvasRenderingContext2D,
  headX: number,
  headY: number,
  facing: FacingVector,
  fillStyle: string,
  strokeColor: number,
): void {
  if (Math.abs(facing.x) < 0.5) return

  context.fillStyle = fillStyle
  context.strokeStyle = withAlpha(strokeColor, 0.18)
  context.lineWidth = 0.7
  context.beginPath()
  context.ellipse(
    headX - facing.x * 5.6,
    headY + 0.2,
    1.5,
    2.1,
    0,
    0,
    Math.PI * 2,
  )
  context.fill()
  context.stroke()
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
    headX + facing.x * 1.05,
    headY - 3.8 + Math.max(0, -facing.y) * 0.7,
    6,
    3.9,
    facing.x * 0.16,
    Math.PI,
    Math.PI * 2,
  )
  context.lineTo(headX + 5.9 + facing.x * 0.8, headY - 0.7)
  context.quadraticCurveTo(
    headX + facing.x * 1.4,
    headY + 1.6,
    headX - 5.9 + facing.x * 0.8,
    headY - 0.7,
  )
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
  const sideView = visualFacing === "left" || visualFacing === "right"
  const diagonal = visualFacing.includes("Right") || visualFacing.includes("Left")
  const eyeY = headY - 0.8 + Math.max(0, -facing.y) * 0.45
  const eyeSpread = sideView ? 1.25 : diagonal ? 2.05 : 2.45
  const eyeOffsetX = facing.x * (sideView ? 2.15 : 1.45)

  context.fillStyle = strokeStyle
  context.globalAlpha = visualFacing.includes("up") ? 0.42 : 0.78
  context.beginPath()
  context.arc(
    headX - eyeSpread + eyeOffsetX,
    eyeY,
    sideView ? 0.55 : 0.68,
    0,
    Math.PI * 2,
  )
  if (!sideView) {
    context.arc(headX + eyeSpread + eyeOffsetX, eyeY, 0.68, 0, Math.PI * 2)
  }
  context.fill()
  context.globalAlpha = 0.42
  context.strokeStyle = strokeStyle
  context.lineWidth = 0.7
  context.beginPath()
  context.moveTo(headX - 1.7 + eyeOffsetX, headY + 2.1)
  context.quadraticCurveTo(
    headX + eyeOffsetX,
    headY + 2.9 + Math.max(0, facing.y) * 0.35,
    headX + 1.7 + eyeOffsetX,
    headY + 2.1,
  )
  context.stroke()
  if (diagonal) {
    context.globalAlpha = 0.38
    context.beginPath()
    context.moveTo(headX + facing.x * 4.2, headY - 2.2)
    context.lineTo(headX + facing.x * 5.6, headY + 1.8)
    context.stroke()
  }
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
