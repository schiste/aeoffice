import { FURNITURE_DEPTH_BASE } from "./constants"
import type { FixtureToken } from "./types"

export function avatarDepth(y: number): number {
  return FURNITURE_DEPTH_BASE + Math.round(y)
}

export function furnitureDepth(bottomY: number, token: FixtureToken): number {
  const lift = token.id.includes("door") ? -28 : 0
  return FURNITURE_DEPTH_BASE + Math.round(bottomY + lift)
}
