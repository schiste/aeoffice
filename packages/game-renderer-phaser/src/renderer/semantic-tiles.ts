import type { FixtureToken, MultiTileVariantGids, TileSegment } from "./types"

export function drawSemanticTile(
  context: CanvasRenderingContext2D,
  token: FixtureToken,
  x: number,
  y: number,
  tileSize: number,
  segment: TileSegment,
): void {
  if (token.kind === "floor") {
    drawPolishedFloor(context, token, x, y, tileSize)
    return
  }

  if (token.kind === "wall") {
    drawPolishedWall(context, token, x, y, tileSize)
    return
  }

  if (token.kind === "item") {
    drawPolishedItem(context, token, x, y, tileSize, segment)
    return
  }

  drawAvatarSwatchTile(context, token, x, y, tileSize)
}

function drawPolishedFloor(
  context: CanvasRenderingContext2D,
  token: FixtureToken,
  x: number,
  y: number,
  tileSize: number,
): void {
  if (token.id.includes("wood")) {
    const gradient = context.createLinearGradient(x, y, x, y + tileSize)
    gradient.addColorStop(0, "#d8b175")
    gradient.addColorStop(1, "#bf9056")
    context.fillStyle = gradient
    context.fillRect(x, y, tileSize, tileSize)
    context.fillStyle = "rgba(106, 64, 35, 0.13)"
    context.fillRect(x, y + 7, tileSize, 2)
    context.fillRect(x, y + 23, tileSize, 2)
    context.strokeStyle = "rgba(85, 52, 28, 0.28)"
    context.lineWidth = 1
    for (let row = 0; row < 4; row += 1) {
      const top = y + row * 8 + 0.5
      context.beginPath()
      context.moveTo(x, top)
      context.lineTo(x + tileSize, top)
      context.stroke()
      const seam = x + ((row % 2 === 0 ? 14 : 24))
      context.beginPath()
      context.moveTo(seam + 0.5, top)
      context.lineTo(seam + 0.5, top + 8)
      context.stroke()
    }
    context.fillStyle = "rgba(255, 238, 196, 0.18)"
    context.fillRect(x + 2, y + 2, tileSize - 4, 3)
    return
  }

  if (token.id.includes("concrete")) {
    const gradient = context.createLinearGradient(x, y, x + tileSize, y + tileSize)
    gradient.addColorStop(0, "#d9dfdc")
    gradient.addColorStop(1, "#bfcac8")
    context.fillStyle = gradient
    context.fillRect(x, y, tileSize, tileSize)
    context.strokeStyle = "rgba(97, 111, 112, 0.28)"
    context.lineWidth = 1
    context.strokeRect(x + 0.5, y + 0.5, tileSize - 1, tileSize - 1)
    context.fillStyle = "rgba(255, 255, 255, 0.22)"
    context.fillRect(x + 3, y + 3, 6, 1)
    context.fillRect(x + 20, y + 13, 5, 1)
    context.fillStyle = "rgba(77, 91, 91, 0.16)"
    context.fillRect(x + 11, y + 8, 2, 2)
    context.fillRect(x + 25, y + 24, 2, 2)
    return
  }

  const carpetGradient = context.createLinearGradient(x, y, x, y + tileSize)
  carpetGradient.addColorStop(0, "#9fbcae")
  carpetGradient.addColorStop(1, "#86a595")
  context.fillStyle = carpetGradient
  context.fillRect(x, y, tileSize, tileSize)
  context.strokeStyle = "rgba(49, 85, 65, 0.2)"
  context.lineWidth = 1
  for (let offset = 0; offset <= tileSize; offset += 8) {
    context.beginPath()
    context.moveTo(x + offset + 0.5, y)
    context.lineTo(x + offset + 0.5, y + tileSize)
    context.moveTo(x, y + offset + 0.5)
    context.lineTo(x + tileSize, y + offset + 0.5)
    context.stroke()
  }
  context.fillStyle = "rgba(255, 255, 255, 0.08)"
  context.fillRect(x, y, tileSize, tileSize / 2)
}

function drawPolishedWall(
  context: CanvasRenderingContext2D,
  token: FixtureToken,
  x: number,
  y: number,
  tileSize: number,
): void {
  const corner = token.id.includes("corner")

  if (token.id.includes("glass")) {
    const gradient = context.createLinearGradient(x, y, x, y + tileSize)
    gradient.addColorStop(0, "#b8dce1")
    gradient.addColorStop(1, "#73aeb8")
    context.fillStyle = gradient
    context.fillRect(x, y, tileSize, tileSize)
    context.fillStyle = "rgba(232, 250, 255, 0.52)"
    context.fillRect(x + 3, y + 3, tileSize - 6, tileSize - 12)
    context.fillStyle = "rgba(48, 101, 112, 0.34)"
    context.fillRect(x, y + tileSize - 9, tileSize, 9)
    context.strokeStyle = "#487f88"
    context.lineWidth = 2
    context.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2)
    context.strokeStyle = "rgba(255, 255, 255, 0.72)"
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(x + 7, y + 4)
    context.lineTo(x + 20, y + 18)
    context.moveTo(x + 17, y + 3)
    context.lineTo(x + 27, y + 13)
    context.stroke()
    drawWallBaseLip(context, x, y, tileSize, "#376f77")
    if (corner) {
      drawWallCornerPost(context, x, y, tileSize, "#376f77", "#c8edf0")
    }
    return
  }

  if (token.id.includes("neutral")) {
    const gradient = context.createLinearGradient(x, y, x, y + tileSize)
    gradient.addColorStop(0, "#e6dfd2")
    gradient.addColorStop(1, "#c2b7a5")
    context.fillStyle = gradient
    context.fillRect(x, y, tileSize, tileSize)
    context.fillStyle = "#ece7dc"
    context.fillRect(x + 2, y + 2, tileSize - 4, 14)
    context.fillStyle = "#b6aa97"
    context.fillRect(x, y + tileSize - 8, tileSize, 8)
    context.strokeStyle = "rgba(98, 88, 74, 0.35)"
    context.lineWidth = 1
    context.strokeRect(x + 0.5, y + 0.5, tileSize - 1, tileSize - 1)
    drawWallBaseLip(context, x, y, tileSize, "#9f927e")
    if (corner) {
      drawWallCornerPost(context, x, y, tileSize, "#9f927e", "#f4efe6")
    }
    return
  }

  const gradient = context.createLinearGradient(x, y, x, y + tileSize)
  gradient.addColorStop(0, "#b98654")
  gradient.addColorStop(1, "#725031")
  context.fillStyle = gradient
  context.fillRect(x, y, tileSize, tileSize)
  context.fillStyle = "#b98756"
  context.fillRect(x + 2, y + 2, tileSize - 4, 12)
  context.fillStyle = "#6e4b31"
  context.fillRect(x, y + tileSize - 9, tileSize, 9)
  context.strokeStyle = "rgba(63, 38, 22, 0.34)"
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(x + 10.5, y + 2)
  context.lineTo(x + 10.5, y + tileSize - 9)
  context.moveTo(x + 21.5, y + 2)
  context.lineTo(x + 21.5, y + tileSize - 9)
  context.stroke()
  drawWallBaseLip(context, x, y, tileSize, "#5f3f27")
  if (corner) {
    drawWallCornerPost(context, x, y, tileSize, "#5f3f27", "#c79461")
  }
}

function drawWallBaseLip(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  tileSize: number,
  color: string,
): void {
  context.fillStyle = color
  context.globalAlpha = 0.5
  context.fillRect(x, y + tileSize - 4, tileSize, 4)
  context.globalAlpha = 1
  context.fillStyle = "rgba(32, 32, 29, 0.14)"
  context.fillRect(x, y + tileSize - 1, tileSize, 1)
}

function drawWallCornerPost(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  tileSize: number,
  dark: string,
  light: string,
): void {
  context.fillStyle = dark
  fillRoundedRect(context, x + 2, y + 2, 8, tileSize - 6, 2)
  context.fillStyle = light
  context.globalAlpha = 0.54
  context.fillRect(x + 4, y + 4, 2, tileSize - 11)
  context.globalAlpha = 1
  context.fillStyle = "rgba(32, 32, 29, 0.16)"
  context.fillRect(x + tileSize - 5, y + tileSize - 6, 5, 4)
}

function drawPolishedItem(
  context: CanvasRenderingContext2D,
  token: FixtureToken,
  x: number,
  y: number,
  tileSize: number,
  segment: TileSegment,
): void {
  context.clearRect(x, y, tileSize, tileSize)

  if (token.id.includes("large_conference_table")) {
    drawSegmentedObject(context, x, y, tileSize, segment, (originX, originY, width, height) => {
      drawSoftShadow(context, originX + width / 2, originY + height - 9, width - 16, 10)
      context.fillStyle = "#6d5c3a"
      fillRoundedRect(context, originX + 8, originY + 12, width - 16, height - 22, 5)
      context.fillStyle = "#9d8757"
      fillRoundedRect(context, originX + 12, originY + 15, width - 24, height - 30, 3)
      context.fillStyle = "rgba(255, 245, 210, 0.3)"
      context.fillRect(originX + 17, originY + 18, width - 34, 4)
      context.strokeStyle = "rgba(74, 57, 35, 0.28)"
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(originX + width / 3, originY + 17)
      context.lineTo(originX + width / 3, originY + height - 18)
      context.moveTo(originX + (width * 2) / 3, originY + 17)
      context.lineTo(originX + (width * 2) / 3, originY + height - 18)
      context.stroke()
      context.fillStyle = "#4b3d27"
      context.fillRect(originX + 16, originY + height - 17, 6, 8)
      context.fillRect(originX + width - 22, originY + height - 17, 6, 8)
    })
    return
  }

  if (token.id.includes("plant")) {
    drawSoftShadow(context, x + 16, y + 25, 18, 6)
    context.fillStyle = "#8a6648"
    fillRoundedRect(context, x + 10, y + 20, 12, 7, 2)
    context.fillStyle = "#2e7d52"
    context.beginPath()
    context.arc(x + 16, y + 14, 8, 0, Math.PI * 2)
    context.arc(x + 10, y + 15, 5, 0, Math.PI * 2)
    context.arc(x + 22, y + 14, 5, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = "#48a36e"
    context.beginPath()
    context.arc(x + 14, y + 11, 4, 0, Math.PI * 2)
    context.fill()
    return
  }

  if (token.id.includes("door")) {
    drawSoftShadow(context, x + 16, y + 28, 20, 5)
    context.fillStyle = "#9a633d"
    fillRoundedRect(context, x + 7, y + 4, 18, 24, 2)
    context.fillStyle = "#b87a4f"
    context.fillRect(x + 10, y + 7, 5, 18)
    context.strokeStyle = "rgba(73, 43, 23, 0.42)"
    context.lineWidth = 1
    strokeRoundedRect(context, x + 7.5, y + 4.5, 17, 23, 2)
    context.fillStyle = "#efc86d"
    context.beginPath()
    context.arc(x + 21, y + 17, 2, 0, Math.PI * 2)
    context.fill()
    return
  }

  if (token.id.includes("coffee_bar")) {
    drawSegmentedObject(context, x, y, tileSize, segment, (originX, originY, width) => {
      drawSoftShadow(context, originX + width / 2, originY + 25, width - 12, 6)
      context.fillStyle = "#6b4b34"
      fillRoundedRect(context, originX + 4, originY + 9, width - 8, 15, 4)
      context.fillStyle = "#d8c4a2"
      fillRoundedRect(context, originX + 7, originY + 10, width - 14, 4, 2)
      context.fillStyle = "#2f4d49"
      fillRoundedRect(context, originX + 10, originY + 15, 12, 6, 2)
      context.fillStyle = "#f9f6ef"
      context.fillRect(originX + width - 19, originY + 15, 6, 6)
      context.fillStyle = "#efc86d"
      context.fillRect(originX + width - 28, originY + 16, 5, 4)
      context.fillStyle = "rgba(255, 255, 255, 0.3)"
      context.fillRect(originX + 10, originY + 10, width - 26, 1)
    })
    return
  }

  if (token.id.includes("coffee_machine")) {
    drawSoftShadow(context, x + 16, y + 26, 16, 5)
    context.fillStyle = "#42545a"
    fillRoundedRect(context, x + 9, y + 7, 14, 18, 3)
    context.fillStyle = "#d9e7e4"
    context.fillRect(x + 12, y + 10, 8, 5)
    context.fillStyle = "#24745f"
    context.fillRect(x + 12, y + 17, 8, 4)
    context.fillStyle = "#d8c4a2"
    context.fillRect(x + 14, y + 22, 4, 2)
    return
  }

  if (token.id.includes("chair")) {
    drawSoftShadow(context, x + 16, y + 24, 18, 5)
    context.fillStyle = "#5b6f6d"
    fillRoundedRect(context, x + 8, y + 8, 16, 9, 3)
    context.fillStyle = "#344947"
    fillRoundedRect(context, x + 10, y + 16, 12, 7, 2)
    context.fillStyle = "#2c3837"
    context.fillRect(x + 10, y + 23, 3, 4)
    context.fillRect(x + 19, y + 23, 3, 4)
    return
  }

  if (token.id.includes("couch")) {
    drawSegmentedObject(context, x, y, tileSize, segment, (originX, originY, width) => {
      drawSoftShadow(context, originX + width / 2, originY + 25, width - 8, 6)
      context.fillStyle = "#6b806d"
      fillRoundedRect(context, originX + 3, originY + 10, width - 6, 13, 5)
      context.fillStyle = "#49604f"
      fillRoundedRect(context, originX + 7, originY + 18, width - 14, 6, 3)
      context.fillStyle = "#d9b77c"
      fillRoundedRect(context, originX + 10, originY + 13, 11, 6, 2)
      context.fillStyle = "#5e7664"
      fillRoundedRect(context, originX + 25, originY + 13, width - 48, 6, 2)
      context.fillStyle = "#34483b"
      context.fillRect(originX + 7, originY + 24, 4, 4)
      context.fillRect(originX + width - 11, originY + 24, 4, 4)
    })
    return
  }

  if (token.id.includes("round_table")) {
    drawSegmentedObject(context, x, y, tileSize, segment, (originX, originY, width, height) => {
      const centerX = originX + width / 2
      const centerY = originY + height / 2 - 2
      const radius = Math.min(width, height) * 0.3
      drawSoftShadow(context, centerX, centerY + radius - 1, radius * 1.8, 9)
      context.fillStyle = "#74563d"
      context.beginPath()
      context.arc(centerX, centerY + 2, radius + 3, 0, Math.PI * 2)
      context.fill()
      context.fillStyle = "#b78755"
      context.beginPath()
      context.arc(centerX, centerY, radius, 0, Math.PI * 2)
      context.fill()
      context.fillStyle = "rgba(255, 238, 196, 0.3)"
      fillRoundedRect(context, centerX - radius / 2, centerY - radius / 2, radius, 4, 2)
    })
    return
  }

  drawSegmentedObject(context, x, y, tileSize, segment, (originX, originY, width, height) => {
    drawSoftShadow(context, originX + width / 2, originY + height - 7, width - 8, 6)
    context.fillStyle = "#6d5c3a"
    fillRoundedRect(context, originX + 2, originY + 8, width - 4, height - 17, 3)
    context.fillStyle = "#9d8757"
    context.fillRect(originX + 5, originY + 11, width - 10, 4)
    context.fillStyle = "rgba(255, 245, 210, 0.3)"
    context.fillRect(originX + 8, originY + 15, width - 16, height - 27)
  })
}

function drawAvatarSwatchTile(
  context: CanvasRenderingContext2D,
  token: FixtureToken,
  x: number,
  y: number,
  tileSize: number,
): void {
  const swatch = token.id.includes("cobalt")
    ? "#316f9f"
    : token.id.includes("moss")
      ? "#3c8759"
      : token.id.includes("violet")
        ? "#755aa5"
        : "#c45b40"
  drawSoftShadow(context, x + 16, y + 25, 18, 5)
  context.fillStyle = swatch
  context.beginPath()
  context.arc(x + tileSize / 2, y + 15, 9, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = "#f0c7a1"
  context.beginPath()
  context.arc(x + tileSize / 2, y + 8, 6, 0, Math.PI * 2)
  context.fill()
}

function drawSoftShadow(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
): void {
  context.fillStyle = "rgba(32, 32, 29, 0.18)"
  context.beginPath()
  context.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2)
  context.fill()
}

function fillRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  roundedRectPath(context, x, y, width, height, radius)
  context.fill()
}

function strokeRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  roundedRectPath(context, x, y, width, height, radius)
  context.stroke()
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const resolvedRadius = Math.min(radius, width / 2, height / 2)

  context.beginPath()
  context.moveTo(x + resolvedRadius, y)
  context.lineTo(x + width - resolvedRadius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + resolvedRadius)
  context.lineTo(x + width, y + height - resolvedRadius)
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - resolvedRadius,
    y + height,
  )
  context.lineTo(x + resolvedRadius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - resolvedRadius)
  context.lineTo(x, y + resolvedRadius)
  context.quadraticCurveTo(x, y, x + resolvedRadius, y)
  context.closePath()
}

function drawSegmentedObject(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  tileSize: number,
  segment: TileSegment,
  draw: (
    originX: number,
    originY: number,
    width: number,
    height: number,
  ) => void,
): void {
  context.save()
  context.beginPath()
  context.rect(x, y, tileSize, tileSize)
  context.clip()
  draw(
    x - segment.offsetX * tileSize,
    y - segment.offsetY * tileSize,
    segment.widthTiles * tileSize,
    segment.heightTiles * tileSize,
  )
  context.restore()
}

export function createMultiTileVariantGids(
  tokens: readonly FixtureToken[],
): MultiTileVariantGids {
  const maxGid = Math.max(0, ...tokens.map((token) => token.provisionalGid))
  const byRootGid = new Map<number, readonly (readonly number[])[]>()
  const allGids: number[] = []
  let nextGid = maxGid + 1

  tokens.forEach((token) => {
    if (token.widthTiles <= 1 && token.heightTiles <= 1) return

    const rows: number[][] = []
    for (let offsetY = 0; offsetY < token.heightTiles; offsetY += 1) {
      const row: number[] = []
      for (let offsetX = 0; offsetX < token.widthTiles; offsetX += 1) {
        if (offsetX === 0 && offsetY === 0) {
          row.push(token.provisionalGid)
          continue
        }
        row.push(nextGid)
        allGids.push(nextGid)
        nextGid += 1
      }
      rows.push(row)
    }
    byRootGid.set(token.provisionalGid, rows)
  })

  return {
    byRootGid,
    allGids,
  }
}
