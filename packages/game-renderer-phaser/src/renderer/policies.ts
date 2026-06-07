import type { CellCoord } from "@aedventure/game-topology"
import type {
  GameCellPlacement,
  GameMetadata,
  GameTopologyReference,
} from "@aedventure/game-world"

export interface CellVisualStyle {
  readonly fill: number
  readonly stroke: number
  readonly alpha: number
  readonly accent: number
  readonly highlight: number
  readonly shadow: number
  readonly activity: CellVisualActivity
  readonly activityProgress: number
  readonly motif: CellVisualMotif
}

export type CellVisualActivity = "inactive" | "active" | "transitioning" | "blocked"
export type CellVisualMotif =
  | "none"
  | "water"
  | "vegetation"
  | "ridge"
  | "peak"
  | "floor"
  | "wall"
  | "blocked"

export interface FogVisualStyle {
  readonly visible: boolean
  readonly fill: number
  readonly alpha: number
  readonly feather?: number
  readonly state?: string
}

export interface CellPresentationPolicy {
  cellVisible(cell: GameCellPlacement): boolean
  cellStyle(cell: GameCellPlacement): CellVisualStyle
  fogStyle(cell: GameCellPlacement): FogVisualStyle
}

export interface WorldInteractionDetail {
  readonly id: string
  readonly label: string
  readonly prompt?: string
  readonly action?: string
  readonly enabled: boolean
  readonly metadata?: GameMetadata
}

export interface WorldInteractionPolicy {
  interactionForCell(
    coord: CellCoord,
    cell: GameCellPlacement | undefined,
  ): WorldInteractionDetail | null
}

export interface TopologyNavigationInput {
  readonly direction: string
  readonly vector?: {
    readonly x: number
    readonly y: number
  }
  readonly mode?: string
}

export interface TopologyNavigationPolicy {
  nextCoord(
    coord: CellCoord,
    input: TopologyNavigationInput,
    topology: GameTopologyReference,
  ): CellCoord | null
  canEnterCell(cell: GameCellPlacement): boolean
}

export const DEFAULT_CELL_VISUAL_STYLE: CellVisualStyle = {
  fill: 0xdde7d0,
  stroke: 0xa9b1a2,
  alpha: 1,
  accent: 0x7cbf8c,
  highlight: 0xfff5d0,
  shadow: 0x1d2118,
  activity: "active",
  activityProgress: 1,
  motif: "none",
}

export const DEFAULT_FOG_VISUAL_STYLE: FogVisualStyle = {
  visible: false,
  fill: 0x000000,
  alpha: 0,
}

export const DEFAULT_CELL_PRESENTATION_POLICY: CellPresentationPolicy = {
  cellVisible: () => true,
  cellStyle: (cell) =>
    cell.blocked
      ? {
          ...DEFAULT_CELL_VISUAL_STYLE,
          fill: 0x8b6748,
          stroke: 0x59412f,
          alpha: 0.94,
          activity: "blocked",
          activityProgress: 1,
          motif: "blocked",
        }
      : DEFAULT_CELL_VISUAL_STYLE,
  fogStyle: () => DEFAULT_FOG_VISUAL_STYLE,
}

export const EMPTY_WORLD_INTERACTION_POLICY: WorldInteractionPolicy = {
  interactionForCell: () => null,
}
