import {
  ADD_DOMAIN_BOUNDARY,
  ADD_MAP_MODE_OPTIONS,
  addMapModeLabel,
  selectAddMapScaleForMode,
  type AddDungeonObjectiveSummary,
  type AddDiscoverySummary,
  type AddFirstPlayableAction,
  type AddMapMode,
  type AddMapScaleSummary,
  type AddUiState,
  type AddWorldTimeSummary,
  type CatalogSnapshot,
  type SimulationSnapshot,
} from "@aedventure/add-domain"

import type { AddPhaserMapInfo, AddCharacterTravelEvent } from "./phaser-add-map"
import {
  ADD_AUTOSAVE_STORAGE_KEY,
  type AddSaveSource,
} from "./save-runtime"
import { ADD_TILE_TRAVEL_PRESENTATION } from "./travel-presentation-timing"

export type AddTelemetryTravelDramaState = "fresh" | "declined_once" | "complete"
export type AddTelemetryTravelDialogKind =
  | "first_warning"
  | "second_warning"
  | "first_declined"
  | "dramatic_reprise"
export type AddTelemetryTravelDialogEligibilityReason =
  | "opening_reach_base_from_survivor_cave"
  | "already_complete"
  | "missing_state"
  | "not_overworld"
  | "not_reach_base_step"
  | "missing_survivor_cave"
  | "not_survivor_cave_start"
  | "not_leaving_survivor_cave"

export interface AddTelemetryTravelDialogEligibility {
  readonly eligible: boolean
  readonly reason: AddTelemetryTravelDialogEligibilityReason
}

export interface AddTelemetryTravelExperience {
  readonly phase: "traveling" | "arrived"
  readonly event: AddCharacterTravelEvent
  readonly fromClockSeconds: number
  readonly toClockSeconds: number
  readonly fromTime: AddWorldTimeSummary
  readonly toTime: AddWorldTimeSummary
  readonly startedAtMs: number
  readonly arrivalAtMs: number
  readonly runtimeSynced: boolean
  readonly toxicityBefore: number
  readonly toxicityAfter: number | null
}

export interface AddTelemetryClockAnimationState {
  readonly remainingMinutes: number
}

export interface AddRuntimeTelemetryPresenterInput {
  readonly snapshot: SimulationSnapshot | null
  readonly catalog: CatalogSnapshot | null
  readonly ui: AddUiState | null
  readonly displayedWorldTime: AddWorldTimeSummary | null
  readonly displayClockSeconds: number | null
  readonly clockAnimation: AddTelemetryClockAnimationState | null
  readonly mapInfo: AddPhaserMapInfo
  readonly discovery: AddDiscoverySummary | null
  readonly dungeonObjective: AddDungeonObjectiveSummary | null
  readonly mapMode: AddMapMode
  readonly adminOpen: boolean
  readonly discoveryPanelCollapsed: boolean
  readonly firstPlayableCollapsed: boolean
  readonly questPanelPosition: {
    readonly x: number
    readonly y: number
  }
  readonly runtime: {
    readonly ready: boolean
    readonly autoTick: boolean
    readonly timeSpeed: number
    readonly online: boolean
    readonly lastEvent: string
    readonly lastCommand: string | null
    readonly error: string | null
  }
  readonly travel: {
    readonly experience: AddTelemetryTravelExperience | null
    readonly dramaState: AddTelemetryTravelDramaState
    readonly dialogKind: AddTelemetryTravelDialogKind | null
    readonly confirmationEligibility: AddTelemetryTravelDialogEligibility
  }
  readonly persistence: {
    readonly autosaveEnabled: boolean
    readonly autosaveAvailable: boolean
    readonly lastAutosaveAtMs: number | null
    readonly lastAutosaveClockSeconds: number | null
    readonly lastAutosaveSource: AddSaveSource | null
    readonly lastManualExportAtMs: number | null
    readonly lastImportAtMs: number | null
    readonly lastOfflineCatchupSeconds: number
    readonly resetCount: number
    readonly savePayloadLength: number
    readonly status: string
    readonly storageError: string | null
    readonly firstPlayablePersistenceReady: boolean
  }
}

export interface RuntimeTextState {
  readonly app: "add-rpg"
  readonly coordinateSystem: "active ADD map mode projected through Phaser"
  readonly shell: {
    readonly framework: "solid"
    readonly surface: "fullscreen_map_shell"
    readonly hostsPhaserMap: boolean
    readonly adminOpen: boolean
    readonly questPanel: {
      readonly collapsed: boolean
      readonly x: number
      readonly y: number
    }
    readonly discoveryPanel: {
      readonly collapsed: boolean
    }
  }
  readonly boundary: typeof ADD_DOMAIN_BOUNDARY
  readonly runtime: {
    readonly workerBoundary: "ui-worker-rust-wasm-snapshot"
    readonly ready: boolean
    readonly snapshotReceived: boolean
    readonly catalogReceived: boolean
    readonly autoTick: boolean
    readonly timeSpeed: number
    readonly online: boolean
    readonly lastEvent: string
    readonly lastCommand: string | null
    readonly error: string | null
  }
  readonly snapshot: {
    readonly clockSeconds: number
    readonly hexCount: number
    readonly stabilizedHexes: number
    readonly discoveredCellCount: number
    readonly discoveredCells: readonly string[]
    readonly heroMap: string
    readonly heroAssigned: boolean
    readonly activeWorldAction: string | null
    readonly resources: {
      readonly bassline: number
      readonly chorus: number
      readonly harmonics: number
      readonly stone: number
      readonly water: number
      readonly vibes: number
    }
    readonly base: {
      readonly tutorialInvestigated: boolean
      readonly tutorialExplored: boolean
      readonly studioRestoreUnlocked: boolean
      readonly studioRestored: boolean
      readonly firePitBuilt: boolean
      readonly bunksCapacity: number
      readonly freeBunks: number
    }
    readonly roster: {
      readonly heroRoleId: string
      readonly totalCrew: number
      readonly crewByRole: Record<string, number>
    }
    readonly heroSurvival: {
      readonly location: string
      readonly viralLoadRatio: number
      readonly debuffTier: number
      readonly movementSpeedMultiplier: number
      readonly encounterRateMultiplier: number
      readonly forcedReturnPhase: string | null
    }
    readonly bubble: {
      readonly reachFromBase: number
      readonly fieldBudget: number
      readonly targetRing: number
      readonly frontierProgress: number
    }
    readonly recruitment: {
      readonly totalRecruitedThisRun: number
      readonly pendingCount: number
      readonly nextRecruitCost: number
    }
    readonly activeConstruction: {
      readonly optionId: string
      readonly remainingSeconds: number
    } | null
  } | null
  readonly ui: {
    readonly worldTime: {
      readonly day: number
      readonly referenceDate: string
      readonly localTime: string
      readonly season: string
      readonly seasonLabel: string
      readonly daylightPhase: string
      readonly daylightRatio: number
      readonly nightRatio: number
      readonly sunrise: string
      readonly sunset: string
      readonly location: string
      readonly source: string
      readonly presentationClockSeconds: number
      readonly authoritativeClockSeconds: number
      readonly animating: boolean
      readonly remainingMinutes: number
    }
    readonly resourceCount: number
    readonly resourceFlows: readonly {
      readonly id: string
      readonly source: string
      readonly sink: string
      readonly blocker: string | null
    }[]
    readonly noteCount: number
    readonly activeStoryBeatId: string | null
    readonly storyChoiceIds: readonly string[]
    readonly enabledWorldActionIds: readonly string[]
    readonly roleAssignments: readonly {
      readonly id: string
      readonly available: boolean
      readonly heroAssigned: boolean
      readonly crewAssigned: number
    }[]
    readonly constructionOptions: readonly {
      readonly id: string
      readonly complete: boolean
      readonly enabled: boolean
      readonly inProgress: boolean
      readonly blockedReason: string | null
    }[]
    readonly objectiveReachMet: boolean
    readonly recruitmentEnabled: boolean
    readonly firstPlayable: {
      readonly complete: boolean
      readonly completedCount: number
      readonly totalCount: number
      readonly currentStepId: string | null
      readonly currentAction: AddFirstPlayableAction | null
      readonly steps: readonly {
        readonly id: string
        readonly complete: boolean
        readonly active: boolean
        readonly actionLabel: string | null
      }[]
      readonly persistenceReady: boolean
    }
  } | null
  readonly mapMode: {
    readonly active: AddMapMode
    readonly label: string
    readonly available: readonly AddMapMode[]
    readonly topology: "hex" | "square" | "unknown"
    readonly fixture: boolean
    readonly scale: AddMapScaleSummary
  }
  readonly travel: {
    readonly costGameMinutes: number
    readonly costRuntimeSeconds: number
    readonly presentationDurationMs: number
    readonly clockStepMs: number
    readonly active: boolean
    readonly phase: "idle" | "preview" | "traveling" | "arrived"
    readonly progress: number
    readonly fromTime: string | null
    readonly toTime: string | null
    readonly destinationLabel: string | null
    readonly exposureRisk: string | null
    readonly runtimeSynced: boolean
    readonly toxicityBefore: number | null
    readonly toxicityAfter: number | null
    readonly previewCell: string | null
    readonly previewLabel: string | null
    readonly previewAdjacent: boolean
    readonly confirmation: {
      readonly dramaState: AddTelemetryTravelDramaState
      readonly dialogOpen: boolean
      readonly dialogKind: AddTelemetryTravelDialogKind | null
      readonly eligible: boolean
      readonly reason: AddTelemetryTravelDialogEligibilityReason
    }
  }
  readonly map: AddPhaserMapInfo
  readonly discovery: {
    readonly phase: string
    readonly headline: string
    readonly nextAction: {
      readonly label: string
      readonly detail: string
      readonly kind: string
      readonly enabled: boolean
      readonly actionId: string | null
      readonly inputHint: string | null
    }
    readonly movementDiscoveredDelta: number
    readonly movementToxicityDelta: number
    readonly movementConsequences: {
      readonly active: boolean
      readonly viralLoad: {
        readonly before: number | null
        readonly after: number
        readonly delta: number
        readonly percent: number
      }
      readonly timeOfDay: {
        readonly localTime: string
        readonly phase: string
        readonly riskModifier: string
      }
      readonly safety: {
        readonly severity: string
        readonly headline: string
        readonly secondsUntilForcedReturn: number
        readonly pointOfNoReturnRatio: number
        readonly forcedReturnPhase: string | null
      }
      readonly warnings: readonly string[]
      readonly futureAuthority: string
    }
    readonly tileChoiceCount: number
    readonly selectedTile: {
      readonly cell: string
      readonly label: string
      readonly travelMinutes: number
      readonly travelRisk: string
      readonly standingHere: boolean
      readonly canTravelNow: boolean
      readonly knownFacts: readonly string[]
      readonly unknownFacts: readonly string[]
      readonly dungeonLinkCount: number
      readonly usefulnessLevel: string
      readonly usefulnessReasons: readonly string[]
    } | null
    readonly tileDetail: {
      readonly cell: string
      readonly label: string
      readonly visibility: string
      readonly terrain: string | null
      readonly feature: string | null
      readonly hasSubmap: boolean
      readonly linkCount: number
      readonly visibleLinkIds: readonly string[]
      readonly enabledLinkIds: readonly string[]
      readonly linkKinds: readonly string[]
      readonly targetMapModes: readonly string[]
      readonly actionKinds: readonly string[]
    } | null
    readonly dungeonEntryAvailable: boolean
    readonly dungeonEntryTarget: string | null
    readonly enabledActionIds: readonly string[]
    readonly relevantResourceIds: readonly string[]
  } | null
  readonly dungeonObjective: {
    readonly active: boolean
    readonly dungeonId: string
    readonly mapId: string
    readonly label: string
    readonly headline: string
    readonly currentStepId: string
    readonly returnAvailable: boolean
    readonly stepStatuses: readonly {
      readonly id: string
      readonly status: string
    }[]
  } | null
  readonly persistence: {
    readonly storageKey: string
    readonly autosaveEnabled: boolean
    readonly autosaveAvailable: boolean
    readonly lastAutosaveAtMs: number | null
    readonly lastAutosaveClockSeconds: number | null
    readonly lastAutosaveSource: AddSaveSource | null
    readonly lastManualExportAtMs: number | null
    readonly lastImportAtMs: number | null
    readonly lastOfflineCatchupSeconds: number
    readonly resetCount: number
    readonly savePayloadLength: number
    readonly status: string
    readonly storageError: string | null
  }
  readonly catalog: {
    readonly resourceCount: number
    readonly roleCount: number
    readonly tileCount: number
    readonly worldActionCount: number
  } | null
}

export function createAddRuntimeTextState(
  input: AddRuntimeTelemetryPresenterInput,
): RuntimeTextState {
  const worldTime = input.displayedWorldTime ?? input.ui?.worldTime ?? null
  return {
    app: "add-rpg",
    coordinateSystem: "active ADD map mode projected through Phaser",
    shell: {
      framework: "solid",
      surface: "fullscreen_map_shell",
      hostsPhaserMap: true,
      adminOpen: input.adminOpen,
      questPanel: {
        collapsed: input.firstPlayableCollapsed,
        x: input.questPanelPosition.x,
        y: input.questPanelPosition.y,
      },
      discoveryPanel: {
        collapsed: input.discoveryPanelCollapsed,
      },
    },
    boundary: ADD_DOMAIN_BOUNDARY,
    runtime: {
      workerBoundary: "ui-worker-rust-wasm-snapshot",
      ready: input.runtime.ready,
      snapshotReceived: input.snapshot !== null,
      catalogReceived: input.catalog !== null,
      autoTick: input.runtime.autoTick,
      timeSpeed: input.runtime.timeSpeed,
      online: input.runtime.online,
      lastEvent: input.runtime.lastEvent,
      lastCommand: input.runtime.lastCommand,
      error: input.runtime.error,
    },
    snapshot: input.snapshot ? snapshotTelemetry(input.snapshot) : null,
    ui: input.ui && worldTime ? uiTelemetry(input, worldTime) : null,
    mapMode: {
      active: input.mapMode,
      label: addMapModeLabel(input.mapMode),
      available: ADD_MAP_MODE_OPTIONS.map((option) => option.id),
      topology: input.mapInfo.topology.kind,
      fixture: input.mapInfo.topology.fixture,
      scale: selectAddMapScaleForMode(input.mapMode),
    },
    travel: travelTelemetry(input),
    map: input.mapInfo,
    discovery: input.discovery
      ? {
          phase: input.discovery.phase,
          headline: input.discovery.headline,
          nextAction: {
            label: input.discovery.nextAction.label,
            detail: input.discovery.nextAction.detail,
            kind: input.discovery.nextAction.kind,
            enabled: input.discovery.nextAction.enabled,
            actionId: input.discovery.nextAction.actionId,
            inputHint: input.discovery.nextAction.inputHint,
          },
          movementDiscoveredDelta: input.discovery.movement.discoveredDelta,
          movementToxicityDelta: round3(input.discovery.movement.toxicityDelta),
          movementConsequences: {
            active: input.discovery.movementConsequences.active,
            viralLoad: {
              before:
                input.discovery.movementConsequences.viralLoad.before === null
                  ? null
                  : round3(input.discovery.movementConsequences.viralLoad.before),
              after: round3(input.discovery.movementConsequences.viralLoad.after),
              delta: round3(input.discovery.movementConsequences.viralLoad.delta),
              percent: input.discovery.movementConsequences.viralLoad.percent,
            },
            timeOfDay: {
              localTime: input.discovery.movementConsequences.timeOfDay.localTime,
              phase: input.discovery.movementConsequences.timeOfDay.phase,
              riskModifier: input.discovery.movementConsequences.timeOfDay.riskModifier,
            },
            safety: {
              severity: input.discovery.movementConsequences.safety.severity,
              headline: input.discovery.movementConsequences.safety.headline,
              secondsUntilForcedReturn:
                input.discovery.movementConsequences.safety.secondsUntilForcedReturn,
              pointOfNoReturnRatio:
                input.discovery.movementConsequences.safety.pointOfNoReturnRatio,
              forcedReturnPhase:
                input.discovery.movementConsequences.safety.forcedReturnPhase,
            },
            warnings: input.discovery.movementConsequences.warnings,
            futureAuthority: input.discovery.movementConsequences.futureAuthority,
          },
          tileChoiceCount: input.discovery.tileChoices.length,
          selectedTile: input.discovery.selectedTile
            ? {
                cell: input.discovery.selectedTile.cell,
                label: input.discovery.selectedTile.label,
                travelMinutes: input.discovery.selectedTile.travel.gameMinutes,
                travelRisk: input.discovery.selectedTile.travel.risk,
                standingHere: input.discovery.selectedTile.travel.standingHere,
                canTravelNow: input.discovery.selectedTile.travel.canTravelNow,
                knownFacts: input.discovery.selectedTile.facts.known,
                unknownFacts: input.discovery.selectedTile.facts.unknown,
                dungeonLinkCount: input.discovery.selectedTile.dungeonLinks.count,
                usefulnessLevel: input.discovery.selectedTile.usefulness.level,
                usefulnessReasons: input.discovery.selectedTile.usefulness.reasons,
              }
            : null,
          tileDetail: input.discovery.tileDetail
            ? {
                cell: input.discovery.tileDetail.cell,
                label: input.discovery.tileDetail.label,
                visibility: input.discovery.tileDetail.visibility,
                terrain: input.discovery.tileDetail.terrain,
                feature: input.discovery.tileDetail.feature,
                hasSubmap: input.discovery.tileDetail.hasSubmap,
                linkCount: input.discovery.tileDetail.links.length,
                visibleLinkIds: input.discovery.tileDetail.links
                  .filter((link) => link.visible)
                  .map((link) => link.id),
                enabledLinkIds: input.discovery.tileDetail.links
                  .filter((link) => link.enabled)
                  .map((link) => link.id),
                linkKinds: input.discovery.tileDetail.links.map((link) => link.kind),
                targetMapModes: input.discovery.tileDetail.links.flatMap((link) =>
                  link.targetMapMode ? [link.targetMapMode] : [],
                ),
                actionKinds: input.discovery.tileDetail.actions.map((action) => action.kind),
              }
            : null,
          dungeonEntryAvailable: input.discovery.dungeonEntry?.enabled ?? false,
          dungeonEntryTarget: input.discovery.dungeonEntry?.targetMapId ?? null,
          enabledActionIds: input.discovery.actionLinks
            .filter((link) => link.enabled)
            .map((link) => link.id),
          relevantResourceIds: input.discovery.resourceLinks
            .filter((link) => link.relevant)
            .map((link) => link.id),
        }
      : null,
    dungeonObjective: input.dungeonObjective
      ? {
          active: input.dungeonObjective.active,
          dungeonId: input.dungeonObjective.dungeonId,
          mapId: input.dungeonObjective.mapId,
          label: input.dungeonObjective.label,
          headline: input.dungeonObjective.headline,
          currentStepId: input.dungeonObjective.currentStepId,
          returnAvailable: input.mapMode === "dungeon_square",
          stepStatuses: input.dungeonObjective.steps.map((step) => ({
            id: step.id,
            status: step.status,
          })),
        }
      : null,
    persistence: {
      storageKey: ADD_AUTOSAVE_STORAGE_KEY,
      autosaveEnabled: input.persistence.autosaveEnabled,
      autosaveAvailable: input.persistence.autosaveAvailable,
      lastAutosaveAtMs: input.persistence.lastAutosaveAtMs,
      lastAutosaveClockSeconds: input.persistence.lastAutosaveClockSeconds,
      lastAutosaveSource: input.persistence.lastAutosaveSource,
      lastManualExportAtMs: input.persistence.lastManualExportAtMs,
      lastImportAtMs: input.persistence.lastImportAtMs,
      lastOfflineCatchupSeconds: input.persistence.lastOfflineCatchupSeconds,
      resetCount: input.persistence.resetCount,
      savePayloadLength: input.persistence.savePayloadLength,
      status: input.persistence.status,
      storageError: input.persistence.storageError,
    },
    catalog: input.catalog
      ? {
          resourceCount: input.catalog.resources.length,
          roleCount: input.catalog.roles.length,
          tileCount: input.catalog.tiles.length,
          worldActionCount: input.catalog.worldActions.length,
        }
      : null,
  }
}

function snapshotTelemetry(snapshot: SimulationSnapshot): NonNullable<RuntimeTextState["snapshot"]> {
  return {
    clockSeconds: round2(snapshot.clockSeconds),
    hexCount: snapshot.hexes.length,
    stabilizedHexes: snapshot.bubble.stabilizedHexes,
    discoveredCellCount: snapshot.discoveredCells.length,
    discoveredCells: snapshot.discoveredCells.map((coord) => `${coord.q},${coord.r}`),
    heroMap: `${snapshot.heroMap.q},${snapshot.heroMap.r}`,
    heroAssigned: snapshot.roster.heroAssigned,
    activeWorldAction: snapshot.activeWorldAction?.actionId ?? null,
    resources: {
      bassline: snapshot.resources.bassline,
      chorus: snapshot.resources.chorus,
      harmonics: snapshot.resources.harmonics,
      stone: snapshot.resources.stone,
      water: snapshot.resources.water,
      vibes: snapshot.resources.vibes,
    },
    base: {
      tutorialInvestigated: snapshot.base.tutorialInvestigated,
      tutorialExplored: snapshot.base.tutorialExplored,
      studioRestoreUnlocked: snapshot.base.studioRestoreUnlocked,
      studioRestored: snapshot.base.studioRestored,
      firePitBuilt: snapshot.base.firePitBuilt,
      bunksCapacity: snapshot.base.bunksCapacity,
      freeBunks: snapshot.base.freeBunks,
    },
    roster: {
      heroRoleId: snapshot.roster.heroRoleId,
      totalCrew: snapshot.roster.totalCrew,
      crewByRole: stringNumberRecord(snapshot.roster.crewByRole),
    },
    heroSurvival: {
      location: snapshot.heroSurvival.location,
      viralLoadRatio: round3(snapshot.heroSurvival.viralLoadRatio),
      debuffTier: snapshot.heroSurvival.debuffTier,
      movementSpeedMultiplier: round3(snapshot.heroSurvival.movementSpeedMultiplier),
      encounterRateMultiplier: round3(snapshot.heroSurvival.encounterRateMultiplier),
      forcedReturnPhase: snapshot.heroSurvival.forcedReturn?.phase ?? null,
    },
    bubble: {
      reachFromBase: snapshot.bubble.reachFromBase,
      fieldBudget: snapshot.bubble.fieldBudget,
      targetRing: snapshot.bubble.targetRing,
      frontierProgress: snapshot.bubble.frontierProgress,
    },
    recruitment: {
      totalRecruitedThisRun: snapshot.recruitment.totalRecruitedThisRun,
      pendingCount: snapshot.recruitment.pendingRecruits.length,
      nextRecruitCost: snapshot.recruitment.nextRecruitCost,
    },
    activeConstruction: snapshot.activeConstruction
      ? {
          optionId: snapshot.activeConstruction.optionId,
          remainingSeconds: round2(snapshot.activeConstruction.remainingWorkSeconds),
        }
      : null,
  }
}

function uiTelemetry(
  input: AddRuntimeTelemetryPresenterInput,
  worldTime: AddWorldTimeSummary,
): NonNullable<RuntimeTextState["ui"]> {
  const ui = input.ui
  if (!ui) throw new Error("uiTelemetry requires ADD UI state.")
  return {
    worldTime: {
      day: worldTime.day,
      referenceDate: worldTime.referenceDate,
      localTime: worldTime.localTime,
      season: worldTime.season,
      seasonLabel: worldTime.seasonLabel,
      daylightPhase: worldTime.daylightPhase,
      daylightRatio: worldTime.daylightRatio,
      nightRatio: worldTime.nightRatio,
      sunrise: worldTime.sunrise,
      sunset: worldTime.sunset,
      location: worldTime.location.label,
      source: worldTime.source,
      presentationClockSeconds: round2(
        input.displayClockSeconds ?? input.snapshot?.clockSeconds ?? 0,
      ),
      authoritativeClockSeconds: round2(input.snapshot?.clockSeconds ?? 0),
      animating: input.clockAnimation !== null,
      remainingMinutes: input.clockAnimation?.remainingMinutes ?? 0,
    },
    resourceCount: ui.resources.length,
    resourceFlows: ui.resources.map((resource) => ({
      id: resource.id,
      source: resource.source,
      sink: resource.sink,
      blocker: resource.blocker,
    })),
    noteCount: ui.notes.length,
    activeStoryBeatId: ui.activeStoryBeat?.id ?? null,
    storyChoiceIds: ui.activeStoryBeat?.choices.map((choice) => choice.id) ?? [],
    enabledWorldActionIds: ui.availableWorldActions
      .filter((action) => action.enabled)
      .map((action) => action.id),
    roleAssignments: ui.roleAssignments.map((role) => ({
      id: role.id,
      available: role.available,
      heroAssigned: role.heroAssigned,
      crewAssigned: role.crewAssigned,
    })),
    constructionOptions: ui.constructionOptions.map((option) => ({
      id: option.id,
      complete: option.complete,
      enabled: option.enabled,
      inProgress: option.inProgress,
      blockedReason: option.blockedReason,
    })),
    objectiveReachMet: ui.objective.reachMet,
    recruitmentEnabled: ui.objective.recruitmentEnabled,
    firstPlayable: {
      complete: ui.firstPlayable.complete,
      completedCount: ui.firstPlayable.completedCount,
      totalCount: ui.firstPlayable.totalCount,
      currentStepId: ui.firstPlayable.currentStepId,
      currentAction: ui.firstPlayable.steps.find((step) => step.active)?.action ?? null,
      steps: ui.firstPlayable.steps.map((step) => ({
        id: step.id,
        complete: step.complete,
        active: step.active,
        actionLabel: step.actionLabel,
      })),
      persistenceReady: input.persistence.firstPlayablePersistenceReady,
    },
  }
}

function travelTelemetry(input: AddRuntimeTelemetryPresenterInput): RuntimeTextState["travel"] {
  const experience = input.travel.experience
  const phase = experience
    ? experience.phase
    : input.mapInfo.travel.previewCell
      ? "preview"
      : "idle"
  const progress =
    experience?.phase === "arrived"
      ? 1
      : input.mapInfo.travel.active
        ? input.mapInfo.travel.progress
        : 0

  return {
    costGameMinutes: ADD_TILE_TRAVEL_PRESENTATION.visibleGameMinutes,
    costRuntimeSeconds: ADD_TILE_TRAVEL_PRESENTATION.runtimeSeconds,
    presentationDurationMs: ADD_TILE_TRAVEL_PRESENTATION.durationMs,
    clockStepMs: ADD_TILE_TRAVEL_PRESENTATION.msPerVisibleMinute,
    active: experience?.phase === "traveling" || input.mapInfo.travel.active,
    phase,
    progress,
    fromTime: experience?.fromTime.localTime ?? null,
    toTime: experience?.toTime.localTime ?? null,
    destinationLabel:
      experience?.event.destinationLabel ??
      input.mapInfo.travel.destinationLabel ??
      input.mapInfo.travel.previewLabel,
    exposureRisk:
      experience?.event.exposureRisk ??
      input.mapInfo.travel.exposureRisk ??
      input.mapInfo.travel.previewExposureRisk,
    runtimeSynced: experience?.runtimeSynced ?? false,
    toxicityBefore: experience === null ? null : round3(experience.toxicityBefore),
    toxicityAfter:
      experience?.toxicityAfter === null || experience?.toxicityAfter === undefined
        ? null
        : round3(experience.toxicityAfter),
    previewCell: input.mapInfo.travel.previewCell,
    previewLabel: input.mapInfo.travel.previewLabel,
    previewAdjacent: input.mapInfo.travel.previewAdjacent,
    confirmation: {
      dramaState: input.travel.dramaState,
      dialogOpen: input.travel.dialogKind !== null,
      dialogKind: input.travel.dialogKind,
      eligible: input.travel.confirmationEligibility.eligible,
      reason: input.travel.confirmationEligibility.reason,
    },
  }
}

function stringNumberRecord(
  value: Record<string, number> | Map<string, number>,
): Record<string, number> {
  if (typeof (value as Map<string, number>).entries === "function") {
    return Object.fromEntries((value as Map<string, number>).entries())
  }
  return value as Record<string, number>
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}
