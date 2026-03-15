import { createEffect, onCleanup } from 'solid-js'
import type { CatalogSnapshot, SimulationSnapshot } from '../lib/sim/protocol'

interface MapViewportProps {
  catalog: CatalogSnapshot | null
  snapshot: SimulationSnapshot | null
}

const CENTER_HEX = { q: 0, r: 0 }

export function MapViewport(props: MapViewportProps) {
  let canvas!: HTMLCanvasElement
  let resizeObserver: ResizeObserver | null = null

  createEffect(() => {
    renderMap(canvas, props.snapshot, props.catalog)
  })

  createEffect(() => {
    resizeObserver?.disconnect()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    resizeObserver = new ResizeObserver(() => {
      renderMap(canvas, props.snapshot, props.catalog)
    })
    resizeObserver.observe(canvas)
  })

  onCleanup(() => {
    resizeObserver?.disconnect()
    const context = canvas.getContext('2d')
    context?.clearRect(0, 0, canvas.width, canvas.height)
  })

  return (
    <canvas
      ref={canvas}
      data-ui="game-map-canvas"
      class="map-canvas"
      width="520"
      height="360"
    />
  )
}

function renderMap(
  canvas: HTMLCanvasElement,
  snapshot: SimulationSnapshot | null,
  catalog: CatalogSnapshot | null,
) {
  const context = canvas.getContext('2d')

  if (!context || !snapshot || !catalog) {
    return
  }

  const tileIndex = new Map(catalog.tiles.map((tile) => [tile.id, tile]))

  const rect = canvas.getBoundingClientRect()
  const cssWidth = Math.max(1, Math.round(rect.width || canvas.clientWidth || 520))
  const cssHeight = Math.max(1, Math.round(rect.height || canvas.clientHeight || 360))
  const deviceScale = window.devicePixelRatio || 1
  const targetWidth = Math.round(cssWidth * deviceScale)
  const targetHeight = Math.round(cssHeight * deviceScale)

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth
    canvas.height = targetHeight
  }

  context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0)
  context.clearRect(0, 0, cssWidth, cssHeight)
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, cssWidth, cssHeight)

  const maxDistance = snapshot.hexes.reduce((max, hex) => Math.max(max, hex.distance), 0)
  const hexRadius = computeHexRadius(cssWidth, cssHeight, maxDistance)
  const originX = cssWidth / 2
  const originY = cssHeight / 2
  const frontierRing = snapshot.bubble.stabilizedRing + 1

  for (const hex of snapshot.hexes) {
    const tile = tileIndex.get(hex.tileId)
    if (!tile) {
      continue
    }
    const [x, y] = hexToPixel(hex.q, hex.r, hexRadius)
    const active = hex.state !== 'inactive' && !tile.isBlocker
    const fillProgress = hex.state === 'stabilized' ? 1 : hex.progress
    const isCenter = hex.q === CENTER_HEX.q && hex.r === CENTER_HEX.r
    const isBubbleEdge =
      hex.state === 'stabilized'
        ? hex.distance === snapshot.bubble.stabilizedRing
        : hex.state === 'converting' && hex.distance === frontierRing

    drawHex(context, originX + x, originY + y, hexRadius, {
      active,
      isCenter,
      isBubbleEdge,
      isBlocked: tile.isBlocker,
      terrain: tile.terrain,
      feature: tile.feature,
      fillProgress,
    })
  }
}

function computeHexRadius(width: number, height: number, maxDistance: number) {
  const radiusByWidth = width / (Math.sqrt(3) * (maxDistance * 2 + 1) + 3)
  const radiusByHeight = height / (3 * maxDistance + 3)
  return Math.max(10, Math.min(24, Math.floor(Math.min(radiusByWidth, radiusByHeight))))
}

function hexToPixel(q: number, r: number, radius: number): [number, number] {
  const x = radius * Math.sqrt(3) * (q + r / 2)
  const y = radius * 1.5 * r
  return [x, y]
}

function drawHex(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  options: {
    active: boolean
    isCenter: boolean
    isBubbleEdge: boolean
    isBlocked: boolean
    terrain: CatalogSnapshot['tiles'][number]['terrain']
    feature: CatalogSnapshot['tiles'][number]['feature']
    fillProgress: number
  },
) {
  context.beginPath()

  for (let side = 0; side < 6; side += 1) {
    const angle = ((60 * side - 30) * Math.PI) / 180
    const x = centerX + radius * Math.cos(angle)
    const y = centerY + radius * Math.sin(angle)

    if (side === 0) {
      context.moveTo(x, y)
    } else {
      context.lineTo(x, y)
    }
  }

  context.closePath()
  context.fillStyle = terrainFillStyle(options.terrain, options.isBlocked)
  context.fill()
  const blueAlpha = options.fillProgress * 0.28
  if (options.active) {
    context.fillStyle = `rgba(56, 136, 255, ${blueAlpha.toFixed(3)})`
    context.fill()
  }
  context.strokeStyle = options.isBlocked ? '#777777' : options.isBubbleEdge ? '#2f7dff' : '#161616'
  context.lineWidth = options.isCenter ? 2 : options.isBubbleEdge ? 1.5 : 1
  context.stroke()

  if (options.active) {
    context.beginPath()
    context.arc(centerX, centerY, options.isCenter ? 5 : 3, 0, Math.PI * 2)
    context.fillStyle = options.isBubbleEdge ? '#2f7dff' : '#161616'
    context.fill()
  }

  if (options.isCenter) {
    context.beginPath()
    context.moveTo(centerX - radius * 0.4, centerY)
    context.lineTo(centerX + radius * 0.4, centerY)
    context.moveTo(centerX, centerY - radius * 0.4)
    context.lineTo(centerX, centerY + radius * 0.4)
    context.strokeStyle = '#161616'
    context.lineWidth = 1
    context.stroke()
  }

  if (options.feature === 'survivor_cave') {
    context.save()
    context.translate(centerX, centerY)
    context.rotate(Math.PI / 4)
    context.strokeStyle = options.active ? '#2f7dff' : '#161616'
    context.lineWidth = 1.5
    context.strokeRect(-radius * 0.18, -radius * 0.18, radius * 0.36, radius * 0.36)
    context.restore()
  }
}

function terrainFillStyle(
  terrain: CatalogSnapshot['tiles'][number]['terrain'],
  isBlocked: boolean,
) {
  if (isBlocked) {
    return '#e3e3e3'
  }

  switch (terrain) {
    case 'river':
      return 'rgba(110, 150, 190, 0.10)'
    case 'scrub':
      return 'rgba(90, 90, 90, 0.05)'
    case 'ridge':
      return 'rgba(80, 80, 80, 0.08)'
    case 'mountain':
      return 'rgba(120, 120, 120, 0.12)'
    case 'plains':
    default:
      return 'rgba(0, 0, 0, 0.02)'
  }
}
