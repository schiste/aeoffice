import type { TravelRevealPreview } from "./types"

export function inactiveTravelRevealPreview(): TravelRevealPreview {
  return {
    active: false,
    progress: 0,
    cells: new Set<string>(),
    destinationCell: null,
    center: null,
    radius: 0,
    feather: 0,
  }
}
