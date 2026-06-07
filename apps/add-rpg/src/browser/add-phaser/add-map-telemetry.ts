import Phaser from "phaser"
import type { CellCoord } from "@aedventure/game-topology"
import type { GameCellPlacement } from "@aedventure/game-world"
import {
  addMapCoordKey,
  dungeonLinksForCell,
  knownFactsInfo,
  tileInteractionDetailForCoord,
  visibilityInfo,
  visibilityStateForCell,
  type AddTileInteractionDetail,
} from "@aedventure/add-domain"

import { ADD_TILE_TRAVEL_PRESENTATION } from "../travel-presentation-timing"
import { VISIBILITY_POLISH, type AddPhaserMapInfo, type RenderContext } from "./types"

export function tileInteractionVisibilitySamples(
  context: RenderContext,
): AddPhaserMapInfo["interaction"]["visibilitySamples"] {
  const samples: {
    hidden: AddTileInteractionDetail | null
    discovered: AddTileInteractionDetail | null
    visible: AddTileInteractionDetail | null
    stale: AddTileInteractionDetail | null
  } = {
    hidden: null,
    discovered: null,
    visible: null,
    stale: null,
  }

  for (const cell of context.terrainCells) {
    const visibility = visibilityStateForCell(cell)
    if (samples[visibility]) continue
    samples[visibility] = tileInteractionDetailForCoord(cell.coord, context.terrainByCoord)
  }

  return samples
}

export function hasDungeonLinks(cell: GameCellPlacement): boolean {
  return dungeonLinksForCell(cell).length > 0
}

export function dungeonLinksForCoord(
  coord: CellCoord,
  context: RenderContext,
): ReturnType<typeof dungeonLinksForCell> {
  const cell = context.terrainByCoord.get(addMapCoordKey(coord))
  return cell ? dungeonLinksForCell(cell) : []
}

export function authorityInfo(): AddPhaserMapInfo["authority"] {
  return {
    rules: "rust_wasm_snapshot",
    phaser: "visual_projection_only",
    mutatesSimulation: false,
  }
}

export function topologyInfo(context: RenderContext): AddPhaserMapInfo["topology"] {
  return {
    kind: context.topologyKind,
    mapMode: typeof context.map.metadata?.mapMode === "string" ? context.map.metadata.mapMode : null,
    fixture: context.map.metadata?.fixture === true,
    radius: context.map.topology.kind === "hex" ? context.map.topology.radius : null,
    cellSize: context.map.topology.kind === "square" ? context.map.topology.cellSize : null,
  }
}

export function rendererType(type: number): string {
  if (type === Phaser.WEBGL) return "webgl"
  if (type === Phaser.CANVAS) return "canvas"
  return "unknown"
}

export function emptyMapInfo(): AddPhaserMapInfo {
  return {
    hostedBy: "phaser",
    ready: false,
    renderCount: 0,
    mapId: null,
    validationValid: false,
    validationSummary: "Map has not rendered yet.",
    rendererType: "unknown",
    topology: {
      kind: "unknown",
      mapMode: null,
      fixture: false,
      radius: null,
      cellSize: null,
    },
    authority: authorityInfo(),
    cells: {
      total: 0,
      inactive: 0,
      converting: 0,
      stabilized: 0,
      blocked: 0,
      bubbleEdge: 0,
    },
    dungeonLinks: {
      total: 0,
      cellsWithLinks: 0,
      selected: [],
    },
    knownFacts: {
      hiddenCells: 0,
      discoveredCells: 0,
      visibleCells: 0,
      staleCells: 0,
      exactTerrainKnownCells: 0,
      dynamicRiskKnownCells: 0,
      vagueTravelLabels: 0,
      sampleHiddenTravelLabel: null,
    },
    visibility: {
      hiddenCells: 0,
      discoveredCells: 0,
      visibleCells: 0,
      staleCells: 0,
      revealTransitionsActive: 0,
      travelRevealPreviewActive: false,
      travelRevealPreviewCells: 0,
      travelRevealPreviewProgress: 0,
      travelRevealDestinationCell: null,
      hiddenCellRendering: "invisible_until_known_or_travel_revealed",
      fogRendering: "phaser_visual_overlay",
      affectsAuthority: false,
    },
    character: {
      id: "add.entity.hero",
      label: "Hero",
      visible: false,
      coord: null,
      cell: null,
      x: null,
      y: null,
      moving: false,
      facing: null,
      lastMoveDirection: null,
      lastMoveAccepted: null,
      blockedReason: null,
      dungeonLinksAtCell: [],
      authority: "browser_navigation_triggers_rust_time",
    },
    travel: {
      costGameMinutes: ADD_TILE_TRAVEL_PRESENTATION.visibleGameMinutes,
      costRuntimeSeconds: ADD_TILE_TRAVEL_PRESENTATION.runtimeSeconds,
      presentationDurationMs: ADD_TILE_TRAVEL_PRESENTATION.durationMs,
      clockStepMs: ADD_TILE_TRAVEL_PRESENTATION.msPerVisibleMinute,
      active: false,
      progress: 0,
      direction: null,
      fromCell: null,
      toCell: null,
      destinationLabel: null,
      destinationState: null,
      destinationTerrain: null,
      exposureRisk: null,
      previewCell: null,
      previewLabel: null,
      previewAdjacent: false,
      previewExposureRisk: null,
      blockedReason: null,
    },
    landmarks: {
      baseCenter: null,
      studioLabelVisible: false,
      survivorCave: null,
      survivorCaveVisible: false,
      renderedCount: 0,
    },
    camera: {
      mode: "fit",
      zoom: 1,
      scrollX: 0,
      scrollY: 0,
    },
    interaction: {
      hoverEnabled: true,
      selectEnabled: true,
      hoveredCell: null,
      selectedCell: null,
      hoveredHex: null,
      selectedHex: null,
      selectedLabel: null,
      hoveredDetail: null,
      selectedDetail: null,
      visibilitySamples: {
        hidden: null,
        discovered: null,
        visible: null,
        stale: null,
      },
    },
    presentation: {
      terrainArt: "procedural_painterly_topology",
      bubbleEffects: "animated_halo_edge",
      landmarkSprites: "procedural_sprite_stack",
      labelRendering: "high_resolution_phaser_text",
      ambience: "subtle_motes_and_topographic_scan",
      visibilityPolish: VISIBILITY_POLISH,
      transitionState: "idle",
      transitionProgress: 1,
      responsiveLayout: "desktop",
    },
  }
}
