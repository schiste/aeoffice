#!/usr/bin/env node
const crypto = require("node:crypto")
const fs = require("node:fs")
const path = require("node:path")
const { PNG } = require("pngjs")

const ROOT_DIR = path.resolve(__dirname, "..")
const OUTPUT_DIR = path.join(ROOT_DIR, "apps/web/public/assets")
const IMAGE_PATH = path.join(OUTPUT_DIR, "internal-office-atlas@2x.png")
const MANIFEST_PATH = path.join(
  OUTPUT_DIR,
  "internal-office-atlas.manifest.json",
)

const ATLAS_ID = "atlas.internal.office.polished_v1"
const SOURCE_ID = "internal.generated.office.polished_v1"
const TILESET_ID = "tileset.internal.polished.office"
const LOGICAL_TILE_SIZE = 32
const EXPORT_SCALE = 2
const ATLAS_WIDTH = 512
const SOURCE_LICENSE = "LicenseRef-LPC-Copyleft-Mixed"

const SOURCE_IMAGE_INPUTS = [
  {
    id: "lpc.floors.floors_png",
    filePath: "assets/copyleft/lpc/extracted/floors/floors.png",
    sourceUrl: "https://opengameart.org/content/lpc-floors",
    author:
      "bluecarrot16, Lanea Zimmerman (Sharm), William Thompson, Hyptosis, SpiderDave, Cougarmint, Stephen Challener, Bonsaiheldin, Tyler Olsen, Jetrel, jestan, The Open Surge team, Gaurav Munjal, Reemax, Silveira Neto, bleutailfly, Casper Nilsson, NaRNeRZz, Buch, keith karnage, Arthur Carvalho, Guilherme Vieira, Chris Hamons",
    license: "CC-BY-SA-4.0",
    attributionText:
      '"[LPC] Floors" by bluecarrot16 and contributors. CC-BY-SA 4.0. See assets/copyleft/lpc/extracted/floors/CREDITS-floors.txt.',
    creditsPath: "assets/copyleft/lpc/extracted/floors/CREDITS-floors.txt",
  },
  {
    id: "lpc.walls.walls_png",
    filePath: "assets/copyleft/lpc/extracted/walls/walls.png",
    sourceUrl: "https://opengameart.org/content/lpc-walls",
    author:
      "bluecarrot16, Lanea Zimmerman (Sharm), Daniel Armstrong, William Thompson, Hyptosis, Zabin, Daniel Cook, Guido Bos, SpiderDave, Cougarmint, Stephen Challener, Matthew Nash, Wolthera van Hövell tot Westerflier, Reemax, bleutailfly, NaRNeRZz, Sir Spummington, Casper Nilsson, KnoblePersona",
    license: "CC-BY-SA-3.0",
    attributionText:
      '"[LPC] Walls" by bluecarrot16 and contributors. CC-BY-SA 3.0. See assets/copyleft/lpc/extracted/walls/CREDITS-walls.txt.',
    creditsPath: "assets/copyleft/lpc/extracted/walls/CREDITS-walls.txt",
  },
  {
    id: "lpc.wooden_furniture.dark_wood_png",
    filePath: "assets/copyleft/lpc/source/dark-wood.png",
    sourceUrl: "https://opengameart.org/content/lpc-wooden-furniture",
    author:
      "bluecarrot16, Baŝto, Lanea Zimmerman (Sharm), William Thompson, Tuomo Untinen (Reemax), Janna/Lilius/Jannax",
    license: "CC-BY-SA-4.0",
    attributionText:
      '"LPC Wooden Furniture" by bluecarrot16, Baŝto, Lanea Zimmerman (Sharm), William Thompson, Tuomo Untinen (Reemax), Janna/Lilius/Jannax. See assets/copyleft/lpc/extracted/furniture/CREDITS-furniture.txt.',
    creditsPath: "assets/copyleft/lpc/extracted/furniture/CREDITS-furniture.txt",
  },
  {
    id: "lpc.upholstery.upholstery_png",
    filePath: "assets/copyleft/lpc/source/upholstery.png",
    sourceUrl: "https://opengameart.org/content/lpc-upholstery",
    author: "bluecarrot16, Lanea Zimmerman (Sharm)",
    license: "CC-BY-SA-4.0",
    attributionText:
      '"[LPC] Upholstery" by bluecarrot16, Lanea Zimmerman (Sharm). Used under CC-BY-SA 4.0. Link back to https://opengameart.org/content/lpc-upholstery and https://opengameart.org/content/lpc-interior-castle-tiles.',
    creditsPath: undefined,
  },
]

const SOURCE_IMAGE_INPUTS_BY_ID = new Map(
  SOURCE_IMAGE_INPUTS.map((input) => [input.id, input]),
)
const sourcePngCache = new Map()

const FRAMES = [
  frame("floor.wood_parquet", "floor", 1, 1, false),
  frame("floor.polished_concrete", "floor", 1, 1, false),
  frame("floor.soft_carpet", "floor", 1, 1, false),
  frame("wall.wood.straight", "wall", 1, 1, true, "foreground"),
  frame("wall.wood.corner", "wall", 1, 1, true, "foreground"),
  frame("wall.glass.straight", "wall", 1, 1, true, "foreground"),
  frame("wall.glass.corner", "wall", 1, 1, true, "foreground"),
  frame("wall.neutral.straight", "wall", 1, 1, true, "foreground"),
  frame("wall.neutral.corner", "wall", 1, 1, true, "foreground"),
  frame("item.large_conference_table", "item", 3, 2, true, "y_sort"),
  frame("item.small_round_table", "item", 2, 2, true, "y_sort"),
  frame("item.office_chair", "item", 1, 1, true, "y_sort"),
  frame("item.coffee_machine", "item", 1, 1, true, "y_sort"),
  frame("item.plant_potted", "item", 1, 1, true, "y_sort"),
  frame("item.coffee_bar", "item", 2, 1, true, "y_sort"),
  frame("item.door_single", "item", 1, 1, false, "y_sort"),
  frame("item.lounge_couch", "item", 2, 1, true, "y_sort"),
  frame("avatar.local_placeholder", "avatar", 1, 1, false),
  frame("avatar.ember", "avatar", 1, 1, false),
  frame("avatar.cobalt", "avatar", 1, 1, false),
  frame("avatar.moss", "avatar", 1, 1, false),
  frame("avatar.violet", "avatar", 1, 1, false),
]

function main() {
  const generated = buildAtlas()

  if (process.argv.includes("--check")) {
    assertFileMatches(IMAGE_PATH, generated.image, "atlas image")
    assertFileMatches(MANIFEST_PATH, Buffer.from(generated.manifest), "manifest")
    console.log("Internal office atlas is reproducible.")
    return
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.writeFileSync(IMAGE_PATH, generated.image)
  fs.writeFileSync(MANIFEST_PATH, generated.manifest)
  console.log(`Wrote ${path.relative(ROOT_DIR, IMAGE_PATH)}`)
  console.log(`Wrote ${path.relative(ROOT_DIR, MANIFEST_PATH)}`)
}

function buildAtlas() {
  const layout = layoutFrames(FRAMES)
  const png = new PNG({
    width: layout.width,
    height: layout.height,
    colorType: 6,
  })

  png.data.fill(0)
  for (const frameLayout of layout.frames) {
    drawFrame(png, frameLayout)
  }

  const image = PNG.sync.write(png, { colorType: 6, inputHasAlpha: true })
  const imageSha256 = sha256(image)
  const manifest = `${JSON.stringify(
    manifestFor(layout, imageSha256),
    null,
    2,
  )}\n`

  return {
    image,
    manifest,
  }
}

function frame(id, kind, widthTiles, heightTiles, collidable, occlusionMode = "none") {
  return {
    id,
    kind,
    widthTiles,
    heightTiles,
    collidable,
    occlusionMode,
  }
}

function layoutFrames(frames) {
  const laidOutFrames = []
  let cursorX = 0
  let cursorY = 0
  let rowHeight = 0

  for (const sourceFrame of frames) {
    const width = sourceFrame.widthTiles * LOGICAL_TILE_SIZE * EXPORT_SCALE
    const height = sourceFrame.heightTiles * LOGICAL_TILE_SIZE * EXPORT_SCALE

    if (cursorX > 0 && cursorX + width > ATLAS_WIDTH) {
      cursorX = 0
      cursorY += rowHeight
      rowHeight = 0
    }

    laidOutFrames.push({
      ...sourceFrame,
      x: cursorX,
      y: cursorY,
      width,
      height,
    })
    cursorX += width
    rowHeight = Math.max(rowHeight, height)
  }

  return {
    width: ATLAS_WIDTH,
    height: nextPowerOfTwo(cursorY + rowHeight),
    frames: laidOutFrames,
  }
}

function manifestFor(layout, imageSha256) {
  return {
    schemaVersion: 1,
    atlasId: ATLAS_ID,
    sourceId: SOURCE_ID,
    tilesetId: TILESET_ID,
    source: {
      author: "LPC/OpenGameArt contributors and Aedventure project",
      license: SOURCE_LICENSE,
      redistributionAllowed: "yes",
      commercialUseAllowed: "yes",
      bundledInTargetApp: true,
      attributionText:
        "Generated atlas derived from bundled LPC copyleft source sheets. See externalImageInputs and assets/ASSET_MANIFEST.md.",
      externalImageInputs: sourceImageInputsForManifest(),
    },
    image: {
      path: "/assets/internal-office-atlas@2x.png",
      width: layout.width,
      height: layout.height,
      tileSize: LOGICAL_TILE_SIZE,
      exportScale: EXPORT_SCALE,
      retinaStrategy:
        "Author frames at 2x, then downsample into 32px logical Phaser textures for crisp high-DPI and stable tile coordinates.",
    },
    frames: layout.frames.map((layoutFrame) => ({
      id: layoutFrame.id,
      tokenId: layoutFrame.id,
      kind: layoutFrame.kind,
      x: layoutFrame.x,
      y: layoutFrame.y,
      width: layoutFrame.width,
      height: layoutFrame.height,
      ...frameMetadata(layoutFrame),
    })),
    generated: {
      tool: "scripts/build-internal-office-atlas.cjs",
      deterministic: true,
      inputs: [
        "packages/asset-registry/src/index.ts",
        ...SOURCE_IMAGE_INPUTS.flatMap((input) =>
          input.creditsPath ? [input.filePath, input.creditsPath] : [input.filePath],
        ),
      ],
      notes:
        "The atlas is generated from license-clean LPC copyleft image inputs plus project-owned vector overlays. No SkyOffice or LimeZu assets are copied.",
    },
    checksums: {
      imageSha256,
    },
  }
}

function frameMetadata(layoutFrame) {
  const width = layoutFrame.widthTiles * LOGICAL_TILE_SIZE
  const height = layoutFrame.heightTiles * LOGICAL_TILE_SIZE

  return {
    size: {
      width,
      height,
      exportScale: EXPORT_SCALE,
    },
    anchor: {
      x: width / 2,
      y: height / 2,
    },
    collisionFootprint: layoutFrame.collidable
      ? {
          x: 0,
          y: 0,
          width,
          height,
        }
      : {
          x: 0,
          y: 0,
          width: 0,
          height: 0,
        },
    visualFootprint: {
      x: 0,
      y: 0,
      width,
      height,
    },
    zAnchor: {
      x: width / 2,
      y: height,
    },
    occlusion: {
      mode: layoutFrame.occlusionMode,
      splitAtY: layoutFrame.occlusionMode === "foreground" ? 0 : undefined,
      foregroundFootprint:
        layoutFrame.occlusionMode === "foreground"
          ? {
              x: 0,
              y: 0,
              width,
              height,
            }
          : undefined,
    },
  }
}

function sourceImageInputsForManifest() {
  return SOURCE_IMAGE_INPUTS.map((input) => {
    const fileBuffer = fs.readFileSync(path.join(ROOT_DIR, input.filePath))
    const creditsSha256 = input.creditsPath
      ? sha256(fs.readFileSync(path.join(ROOT_DIR, input.creditsPath)))
      : undefined

    return {
      id: input.id,
      filePath: input.filePath,
      sourceUrl: input.sourceUrl,
      author: input.author,
      license: input.license,
      attributionText: input.attributionText,
      creditsPath: input.creditsPath,
      sha256: sha256(fileBuffer),
      creditsSha256,
    }
  })
}

function drawFrame(png, layoutFrame) {
  if (layoutFrame.kind === "floor") {
    drawFloor(png, layoutFrame)
    return
  }

  if (layoutFrame.kind === "wall") {
    drawWall(png, layoutFrame)
    return
  }

  if (layoutFrame.kind === "avatar") {
    drawAvatar(png, layoutFrame)
    return
  }

  drawItem(png, layoutFrame)
}

function drawFloor(png, frameLayout) {
  if (frameLayout.id.includes("wood")) {
    copySourceRegion(
      png,
      frameLayout,
      "lpc.floors.floors_png",
      192,
      1184,
      32,
      32,
      0,
      0,
      32,
      32,
    )
    rect(png, frameLayout, 1, 1, 30, 2, "#ffeec4", 0.13)
    return
  }

  if (frameLayout.id.includes("concrete")) {
    copySourceRegion(
      png,
      frameLayout,
      "lpc.floors.floors_png",
      0,
      1120,
      32,
      32,
      0,
      0,
      32,
      32,
    )
    rect(png, frameLayout, 0, 0, 32, 32, "#ffffff", 0.08)
    return
  }

  copySourceRegion(
    png,
    frameLayout,
    "lpc.floors.floors_png",
    416,
    416,
    32,
    32,
    0,
    0,
    32,
    32,
  )
  rect(png, frameLayout, 0, 0, 32, 16, "#ffffff", 0.07)
}

function drawWall(png, frameLayout) {
  const corner = frameLayout.id.includes("corner")

  if (frameLayout.id.includes("glass")) {
    copySourceRegion(
      png,
      frameLayout,
      "lpc.walls.walls_png",
      160,
      1504,
      32,
      32,
      0,
      0,
      32,
      32,
    )
    diagonalGlassShine(png, frameLayout)
    wallBaseLip(png, frameLayout, "#376f77")
    if (corner) wallCornerPost(png, frameLayout, "#376f77", "#c8edf0")
    return
  }

  if (frameLayout.id.includes("neutral")) {
    copySourceRegion(
      png,
      frameLayout,
      "lpc.walls.walls_png",
      0,
      1696,
      32,
      32,
      0,
      0,
      32,
      32,
    )
    wallBaseLip(png, frameLayout, "#9f927e")
    if (corner) wallCornerPost(png, frameLayout, "#9f927e", "#f4efe6")
    return
  }

  copySourceRegion(
    png,
    frameLayout,
    "lpc.walls.walls_png",
    192,
    1248,
    32,
    32,
    0,
    0,
    32,
    32,
  )
  wallBaseLip(png, frameLayout, "#5f3f27")
  if (corner) wallCornerPost(png, frameLayout, "#5f3f27", "#c79461")
}

function drawItem(png, frameLayout) {
  if (frameLayout.id.includes("large_conference_table")) {
    shadow(png, frameLayout, 48, 55, 80, 10)
    rect(png, frameLayout, 8, 12, 80, 42, "#6d5c3a", 1)
    copySourceRegion(
      png,
      frameLayout,
      "lpc.floors.floors_png",
      192,
      1184,
      32,
      32,
      12,
      15,
      72,
      32,
      0.92,
    )
    rect(png, frameLayout, 17, 18, 62, 4, "#fff5d2", 0.3)
    rect(png, frameLayout, 32, 17, 1, 30, "#4a3923", 0.28)
    rect(png, frameLayout, 64, 17, 1, 30, "#4a3923", 0.28)
    rect(png, frameLayout, 16, 47, 6, 8, "#4b3d27", 1)
    rect(png, frameLayout, 74, 47, 6, 8, "#4b3d27", 1)
    return
  }

  if (frameLayout.id.includes("round_table")) {
    shadow(png, frameLayout, 32, 39, 42, 10)
    copySourceRegion(
      png,
      frameLayout,
      "lpc.wooden_furniture.dark_wood_png",
      216,
      216,
      72,
      72,
      0,
      1,
      64,
      62,
    )
    return
  }

  if (frameLayout.id.includes("coffee_bar")) {
    shadow(png, frameLayout, 32, 26, 52, 6)
    rect(png, frameLayout, 4, 9, 56, 15, "#6b4b34", 1)
    copySourceRegion(
      png,
      frameLayout,
      "lpc.wooden_furniture.dark_wood_png",
      0,
      224,
      112,
      24,
      7,
      10,
      50,
      4,
      0.9,
    )
    rect(png, frameLayout, 10, 15, 12, 6, "#2f4d49", 1)
    rect(png, frameLayout, 45, 15, 6, 6, "#f9f6ef", 1)
    rect(png, frameLayout, 36, 16, 5, 4, "#efc86d", 1)
    rect(png, frameLayout, 10, 10, 38, 1, "#ffffff", 0.3)
    return
  }

  if (frameLayout.id.includes("couch")) {
    shadow(png, frameLayout, 32, 25, 56, 6)
    copySourceRegion(
      png,
      frameLayout,
      "lpc.upholstery.upholstery_png",
      192,
      160,
      72,
      24,
      0,
      7,
      64,
      20,
    )
    return
  }

  if (frameLayout.id.includes("plant")) {
    shadow(png, frameLayout, 16, 25, 18, 6)
    rect(png, frameLayout, 10, 20, 12, 7, "#8a6648", 1)
    ellipse(png, frameLayout, 16, 14, 8, 8, "#2e7d52", 1)
    ellipse(png, frameLayout, 10, 15, 5, 5, "#2e7d52", 1)
    ellipse(png, frameLayout, 22, 14, 5, 5, "#2e7d52", 1)
    ellipse(png, frameLayout, 14, 11, 4, 4, "#48a36e", 1)
    return
  }

  if (frameLayout.id.includes("door")) {
    shadow(png, frameLayout, 16, 28, 20, 5)
    rect(png, frameLayout, 7, 4, 18, 24, "#9a633d", 1)
    rect(png, frameLayout, 10, 7, 5, 18, "#b87a4f", 1)
    strokeRect(png, frameLayout, 7, 4, 18, 24, "#492b17", 0.42)
    ellipse(png, frameLayout, 21, 17, 2, 2, "#efc86d", 1)
    return
  }

  if (frameLayout.id.includes("coffee_machine")) {
    shadow(png, frameLayout, 16, 26, 16, 5)
    rect(png, frameLayout, 9, 7, 14, 18, "#42545a", 1)
    rect(png, frameLayout, 12, 10, 8, 5, "#d9e7e4", 1)
    rect(png, frameLayout, 12, 17, 8, 4, "#24745f", 1)
    rect(png, frameLayout, 14, 22, 4, 2, "#d8c4a2", 1)
    return
  }

  if (frameLayout.id.includes("chair")) {
    shadow(png, frameLayout, 16, 24, 18, 5)
    rect(png, frameLayout, 8, 8, 16, 9, "#5b6f6d", 1)
    copySourceRegion(
      png,
      frameLayout,
      "lpc.wooden_furniture.dark_wood_png",
      280,
      236,
      24,
      46,
      7,
      8,
      18,
      18,
      0.68,
    )
    rect(png, frameLayout, 10, 23, 3, 4, "#2c3837", 1)
    rect(png, frameLayout, 19, 23, 3, 4, "#2c3837", 1)
    return
  }

  shadow(png, frameLayout, 16, 24, 24, 6)
  rect(png, frameLayout, 2, 8, 28, 15, "#6d5c3a", 1)
  rect(png, frameLayout, 5, 11, 22, 4, "#9d8757", 1)
  rect(png, frameLayout, 8, 15, 16, 6, "#fff5d2", 0.3)
}

function drawAvatar(png, frameLayout) {
  const style = avatarStyle(frameLayout.id)

  shadow(png, frameLayout, 16, 25, 18, 5)
  ellipse(png, frameLayout, 11, 25, 4, 3, style.torsoDark, 1)
  ellipse(png, frameLayout, 21, 25, 4, 3, style.torsoDark, 1)
  ellipse(png, frameLayout, 16, 17, 9, 11, style.torso, 1)
  strokeEllipse(png, frameLayout, 16, 17, 9, 11, style.torsoDark, 0.55)
  ellipse(png, frameLayout, 16, 8, 6, 6, style.head, 1)
  ellipse(png, frameLayout, 16, 4, 6, 3, style.hair, 1)
  rect(png, frameLayout, 14, 17, 4, 4, style.accent, 0.86)
}

function avatarStyle(id) {
  if (id.includes("cobalt")) {
    return {
      torso: "#316f9f",
      torsoDark: "#1d4260",
      head: "#f0c7a1",
      accent: "#9dc7e4",
      hair: "#273748",
    }
  }

  if (id.includes("moss")) {
    return {
      torso: "#3c8759",
      torsoDark: "#24543a",
      head: "#d7b38e",
      accent: "#a7d18f",
      hair: "#473522",
    }
  }

  if (id.includes("violet")) {
    return {
      torso: "#755aa5",
      torsoDark: "#49336f",
      head: "#e0b995",
      accent: "#c8b4f2",
      hair: "#332444",
    }
  }

  return {
    torso: "#c45b40",
    torsoDark: "#873727",
    head: "#ffd3a3",
    accent: "#f6a04f",
    hair: "#5a3323",
  }
}

function wallBaseLip(png, frameLayout, color) {
  rect(png, frameLayout, 0, 28, 32, 4, color, 0.5)
  rect(png, frameLayout, 0, 31, 32, 1, "#20201d", 0.14)
}

function wallCornerPost(png, frameLayout, dark, light) {
  rect(png, frameLayout, 2, 2, 8, 24, dark, 1)
  rect(png, frameLayout, 4, 4, 2, 21, light, 0.54)
  rect(png, frameLayout, 27, 26, 5, 4, "#20201d", 0.16)
}

function diagonalGlassShine(png, frameLayout) {
  for (let offset = 0; offset < 14; offset += 1) {
    rect(png, frameLayout, 7 + offset, 4 + offset, 1, 1, "#ffffff", 0.72)
  }
  for (let offset = 0; offset < 11; offset += 1) {
    rect(png, frameLayout, 17 + offset, 3 + offset, 1, 1, "#ffffff", 0.72)
  }
}

function shadow(png, frameLayout, cx, cy, width, height) {
  ellipse(png, frameLayout, cx, cy, width / 2, height / 2, "#20201d", 0.18)
}

function copySourceRegion(
  png,
  frameLayout,
  sourceInputId,
  sourceX,
  sourceY,
  sourceWidth,
  sourceHeight,
  destinationX,
  destinationY,
  destinationWidth,
  destinationHeight,
  alpha = 1,
) {
  const sourcePng = loadSourcePng(sourceInputId)
  const destinationPixelX = frameLayout.x + Math.round(destinationX * EXPORT_SCALE)
  const destinationPixelY = frameLayout.y + Math.round(destinationY * EXPORT_SCALE)
  const destinationPixelWidth = Math.round(destinationWidth * EXPORT_SCALE)
  const destinationPixelHeight = Math.round(destinationHeight * EXPORT_SCALE)

  for (let y = 0; y < destinationPixelHeight; y += 1) {
    for (let x = 0; x < destinationPixelWidth; x += 1) {
      const sampleX =
        sourceX + Math.min(sourceWidth - 1, Math.floor((x / destinationPixelWidth) * sourceWidth))
      const sampleY =
        sourceY +
        Math.min(sourceHeight - 1, Math.floor((y / destinationPixelHeight) * sourceHeight))
      const sample = sampleSourcePixel(sourcePng, sampleX, sampleY)

      if (!sample || sample.a <= 0 || isTransparentMagenta(sample)) continue

      blendPixel(
        png,
        destinationPixelX + x,
        destinationPixelY + y,
        sample,
        (sample.a / 255) * alpha,
      )
    }
  }
}

function loadSourcePng(sourceInputId) {
  const cached = sourcePngCache.get(sourceInputId)
  if (cached) return cached

  const input = SOURCE_IMAGE_INPUTS_BY_ID.get(sourceInputId)
  if (!input) {
    throw new Error(`Unknown source image input ${sourceInputId}`)
  }

  const sourcePng = PNG.sync.read(fs.readFileSync(path.join(ROOT_DIR, input.filePath)))
  sourcePngCache.set(sourceInputId, sourcePng)
  return sourcePng
}

function sampleSourcePixel(sourcePng, x, y) {
  if (x < 0 || y < 0 || x >= sourcePng.width || y >= sourcePng.height) {
    return undefined
  }

  const offset = (sourcePng.width * y + x) << 2
  return {
    r: sourcePng.data[offset],
    g: sourcePng.data[offset + 1],
    b: sourcePng.data[offset + 2],
    a: sourcePng.data[offset + 3],
  }
}

function isTransparentMagenta(color) {
  return color.r === 255 && color.g === 0 && color.b === 255
}

function verticalGradient(png, frameLayout, x, y, width, height, top, bottom) {
  const topColor = parseColor(top)
  const bottomColor = parseColor(bottom)

  for (let row = 0; row < height * EXPORT_SCALE; row += 1) {
    const ratio = height <= 1 ? 0 : row / (height * EXPORT_SCALE - 1)
    const color = {
      r: Math.round(topColor.r + (bottomColor.r - topColor.r) * ratio),
      g: Math.round(topColor.g + (bottomColor.g - topColor.g) * ratio),
      b: Math.round(topColor.b + (bottomColor.b - topColor.b) * ratio),
    }
    fillRectPixels(
      png,
      frameLayout.x + x * EXPORT_SCALE,
      frameLayout.y + y * EXPORT_SCALE + row,
      width * EXPORT_SCALE,
      1,
      color,
      1,
    )
  }
}

function rect(png, frameLayout, x, y, width, height, color, alpha) {
  fillRectPixels(
    png,
    frameLayout.x + Math.round(x * EXPORT_SCALE),
    frameLayout.y + Math.round(y * EXPORT_SCALE),
    Math.round(width * EXPORT_SCALE),
    Math.round(height * EXPORT_SCALE),
    parseColor(color),
    alpha,
  )
}

function strokeRect(png, frameLayout, x, y, width, height, color, alpha) {
  rect(png, frameLayout, x, y, width, 1, color, alpha)
  rect(png, frameLayout, x, y + height - 1, width, 1, color, alpha)
  rect(png, frameLayout, x, y, 1, height, color, alpha)
  rect(png, frameLayout, x + width - 1, y, 1, height, color, alpha)
}

function ellipse(png, frameLayout, cx, cy, radiusX, radiusY, color, alpha) {
  const resolvedColor = parseColor(color)
  const pixelCenterX = frameLayout.x + cx * EXPORT_SCALE
  const pixelCenterY = frameLayout.y + cy * EXPORT_SCALE
  const pixelRadiusX = radiusX * EXPORT_SCALE
  const pixelRadiusY = radiusY * EXPORT_SCALE
  const left = Math.floor(pixelCenterX - pixelRadiusX)
  const right = Math.ceil(pixelCenterX + pixelRadiusX)
  const top = Math.floor(pixelCenterY - pixelRadiusY)
  const bottom = Math.ceil(pixelCenterY + pixelRadiusY)

  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const dx = (x - pixelCenterX) / pixelRadiusX
      const dy = (y - pixelCenterY) / pixelRadiusY
      if (dx * dx + dy * dy <= 1) {
        blendPixel(png, x, y, resolvedColor, alpha)
      }
    }
  }
}

function strokeEllipse(png, frameLayout, cx, cy, radiusX, radiusY, color, alpha) {
  const resolvedColor = parseColor(color)
  const pixelCenterX = frameLayout.x + cx * EXPORT_SCALE
  const pixelCenterY = frameLayout.y + cy * EXPORT_SCALE
  const pixelRadiusX = radiusX * EXPORT_SCALE
  const pixelRadiusY = radiusY * EXPORT_SCALE
  const left = Math.floor(pixelCenterX - pixelRadiusX)
  const right = Math.ceil(pixelCenterX + pixelRadiusX)
  const top = Math.floor(pixelCenterY - pixelRadiusY)
  const bottom = Math.ceil(pixelCenterY + pixelRadiusY)

  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const dx = (x - pixelCenterX) / pixelRadiusX
      const dy = (y - pixelCenterY) / pixelRadiusY
      const distance = dx * dx + dy * dy
      if (distance >= 0.83 && distance <= 1.08) {
        blendPixel(png, x, y, resolvedColor, alpha)
      }
    }
  }
}

function fillRectPixels(png, x, y, width, height, color, alpha) {
  const startX = clamp(Math.round(x), 0, png.width)
  const startY = clamp(Math.round(y), 0, png.height)
  const endX = clamp(Math.round(x + width), 0, png.width)
  const endY = clamp(Math.round(y + height), 0, png.height)

  for (let py = startY; py < endY; py += 1) {
    for (let px = startX; px < endX; px += 1) {
      blendPixel(png, px, py, color, alpha)
    }
  }
}

function blendPixel(png, x, y, color, alpha) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return

  const offset = (png.width * y + x) << 2
  const sourceAlpha = clamp(alpha, 0, 1)
  const destinationAlpha = png.data[offset + 3] / 255
  const outAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha)

  if (outAlpha <= 0) {
    png.data[offset] = 0
    png.data[offset + 1] = 0
    png.data[offset + 2] = 0
    png.data[offset + 3] = 0
    return
  }

  png.data[offset] = Math.round(
    (color.r * sourceAlpha +
      png.data[offset] * destinationAlpha * (1 - sourceAlpha)) /
      outAlpha,
  )
  png.data[offset + 1] = Math.round(
    (color.g * sourceAlpha +
      png.data[offset + 1] * destinationAlpha * (1 - sourceAlpha)) /
      outAlpha,
  )
  png.data[offset + 2] = Math.round(
    (color.b * sourceAlpha +
      png.data[offset + 2] * destinationAlpha * (1 - sourceAlpha)) /
      outAlpha,
  )
  png.data[offset + 3] = Math.round(outAlpha * 255)
}

function parseColor(hex) {
  const value = hex.replace("#", "")
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  }
}

function nextPowerOfTwo(value) {
  let resolved = 1
  while (resolved < value) {
    resolved *= 2
  }
  return Math.max(64, resolved)
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex")
}

function assertFileMatches(filePath, expected, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${path.relative(ROOT_DIR, filePath)}`)
  }

  const actual = fs.readFileSync(filePath)
  if (!actual.equals(expected)) {
    throw new Error(
      `${label} is not reproducible. Run node scripts/build-internal-office-atlas.cjs.`,
    )
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

if (require.main === module) {
  main()
}

module.exports = {
  ATLAS_ID,
  EXPORT_SCALE,
  FRAMES,
  IMAGE_PATH,
  LOGICAL_TILE_SIZE,
  MANIFEST_PATH,
  SOURCE_ID,
  SOURCE_IMAGE_INPUTS,
  SOURCE_LICENSE,
  TILESET_ID,
  buildAtlas,
}
