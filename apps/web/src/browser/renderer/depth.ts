import { FURNITURE_DEPTH_BASE } from "./constants"
import type {
  FixtureToken,
  RendererDepthInfo,
  RendererDepthObjectInfo,
  RendererDepthPlacementBounds,
  RendererDepthPlayerInfo,
  Vector2,
} from "./types"

export function avatarDepth(y: number): number {
  return worldYDepth(y)
}

export function objectDepth(
  tileX: number,
  tileY: number,
  tileSize: number,
  token: FixtureToken,
): number {
  return worldYDepth(objectZAnchor(tileX, tileY, tileSize, token).y)
}

export function objectZAnchor(
  tileX: number,
  tileY: number,
  tileSize: number,
  token: FixtureToken,
): Vector2 {
  return {
    x: tileX * tileSize + (token.asset?.zAnchor.x ?? token.widthTiles * tileSize / 2),
    y: tileY * tileSize + (token.asset?.zAnchor.y ?? token.heightTiles * tileSize),
  }
}

export function objectBounds(
  tileX: number,
  tileY: number,
  tileSize: number,
  token: FixtureToken,
): RendererDepthPlacementBounds {
  const visualFootprint = token.asset?.visualFootprint

  return {
    x: tileX * tileSize + (visualFootprint?.x ?? 0),
    y: tileY * tileSize + (visualFootprint?.y ?? 0),
    width: visualFootprint?.width ?? token.widthTiles * tileSize,
    height: visualFootprint?.height ?? token.heightTiles * tileSize,
  }
}

export function depthObjectInfo(
  id: string,
  token: FixtureToken,
  layer: RendererDepthObjectInfo["layer"],
  tileX: number,
  tileY: number,
  tileSize: number,
): RendererDepthObjectInfo {
  return {
    id,
    tokenId: token.id,
    kind: token.kind,
    layer,
    depth: objectDepth(tileX, tileY, tileSize, token),
    zAnchor: objectZAnchor(tileX, tileY, tileSize, token),
    bounds: objectBounds(tileX, tileY, tileSize, token),
    occlusionMode: token.asset?.occlusion.mode ?? "none",
  }
}

export function depthInfo(
  objects: readonly RendererDepthObjectInfo[],
  players: readonly RendererDepthPlayerInfo[],
  debugOverlayEnabled: boolean,
): RendererDepthInfo {
  return {
    debugOverlayEnabled,
    objectCount: objects.length,
    foregroundObjectCount: objects.filter(
      (object) => object.layer === "wall_foreground",
    ).length,
    playerCount: players.length,
    objects,
    players,
  }
}

export function emptyDepthInfo(debugOverlayEnabled = false): RendererDepthInfo {
  return depthInfo([], [], debugOverlayEnabled)
}

function worldYDepth(y: number): number {
  return FURNITURE_DEPTH_BASE + Math.round(y)
}
