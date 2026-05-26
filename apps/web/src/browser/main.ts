import {
  PhaserOfficeRenderer,
  type AvatarEmoteId,
  type RenderedPlayer,
  type RendererCameraFollowMotion,
  type RendererCameraState,
  type RendererDevToolOverlayId,
  type RendererDevToolOverlayState,
  type RendererEffectsOptions,
  type RendererPerformanceInfo,
  type RendererZoomPresetId,
} from "./phaser-office-renderer"
import { validateFixtureMapForRenderer } from "./renderer/map-render-validation"
import {
  CLIENT_INPUT_HISTORY_LIMIT,
  CLIENT_MOVEMENT_FRAME_MS,
  CLIENT_PREDICTION_MAX_STEP_MS,
  createClientMovementPrediction,
  initialMovementPredictionState,
  movementPredictionCorrectionPx,
  movementPredictionMatches,
  replayMovementPredictions,
  trimMovementPredictionHistory,
  type ClientMovementPrediction,
  type MovementPredictionState,
} from "./movement-prediction"
import {
  ClientMotionController,
  type ClientMotionIntent,
  type ClientMotionSnapshot,
} from "./client-motion-controller"
import {
  DEFAULT_MOVEMENT_FEEL,
  MOVEMENT_FEEL_CONTROLS,
  clampMovementFeelValue,
  formatMovementFeelValue,
  isMovementFeelTuningKey,
  movementCollisionBodySize,
  movementCollisionSlideOptions,
  normalizeMovementFeel,
  type MovementFeelTuning,
  type MovementFeelTuningKey,
} from "./movement-feel"
import {
  InputController,
  clampMovementComponent,
  type MovementControlIntent,
  type MovementIntent,
} from "./engine/input-controller"
import { WorldSyncController } from "./engine/world-sync-controller"
import {
  directionForMovementVector,
  isDirection,
  movementVectorForDirection,
  type Direction,
  type MovementMode,
  type MovementVector,
} from "@aedventure/protocol"
import {
  compileDeterministicPromptMap,
  compilePresetMap,
  presetMapSummaries,
  starterVisualAssetCatalog,
  type DeterministicPromptMapResult,
  type PresetMapId,
  type PresetMapResult,
  type PromptMapValidation,
  type VisualAssetFrameMetadata,
} from "@aedventure/asset-registry"

type StatusState = "idle" | "pending" | "ready" | "blocked"
type ToastTone = "info" | "success" | "warning" | "error"
type MapSwitcherId = PresetMapId | "generated"
type AvatarId = "ember" | "cobalt" | "moss" | "violet"
type DepthFixtureCaseId =
  | "table_player_behind"
  | "table_player_front"
  | "wall_player_behind"
type RendererReadiness = "loading" | "ready" | "failed"
type DevToolFixtureId =
  | PresetMapId
  | "generated"
  | "depth_table_player_behind"
  | "depth_table_player_front"
  | "depth_wall_player_behind"
  | "avatar_fixture"
  | "zone_fixture"
  | "stress_20x15"
  | "stress_50x40"
  | "stress_100x80"
type StageOverlayState =
  | "loading"
  | "empty"
  | "reloading"
  | "recovery"
  | "error"
  | "hidden"
type LifecyclePhase =
  | "empty"
  | "joining"
  | "joined"
  | "leaving"
  | "map_reloading"
  | "recovering"
type MovementRejectedReason =
  | "invalid_message"
  | "collision"
  | "speed_limit"
  | "zone_permission"
  | "unknown_player"

interface Vector2 {
  readonly x: number
  readonly y: number
}

interface FixtureMap {
  readonly definition: {
    readonly style: string
  }
  readonly compiled: {
    readonly width: number
    readonly height: number
    readonly tileSize: number
    readonly blockedTiles: readonly Vector2[]
    readonly layers: {
      readonly floor: TileLayer
      readonly walls: TileLayer
      readonly objects: TileLayer
    }
    readonly collisionLayers?: {
      readonly movement: {
        readonly name: "movement"
        readonly width: number
        readonly height: number
        readonly blocked: readonly (readonly boolean[])[]
        readonly blockedTiles: readonly Vector2[]
      }
    }
    readonly zones: readonly FixtureZone[]
  }
  readonly spawnPoints: readonly {
    readonly id: string
    readonly position: Vector2
  }[]
  readonly catalog: {
    readonly tokens: readonly FixtureToken[]
  }
}

interface TileLayer {
  readonly gids: readonly (readonly number[])[]
}

interface FixtureToken {
  readonly id: string
  readonly kind: "floor" | "wall" | "item" | "avatar"
  readonly provisionalGid: number
  readonly widthTiles: number
  readonly heightTiles: number
  readonly asset?: VisualAssetFrameMetadata
}

interface FixtureZone {
  readonly id: string
  readonly xStart: number
  readonly yStart: number
  readonly xEnd: number
  readonly yEnd: number
  readonly zoneType: string
}

interface WorldEvent {
  readonly type: "broadcast" | "send"
  readonly exceptClientId?: string
  readonly clientIds?: readonly string[]
  readonly message: ServerMessage
}

type ServerMessage =
  | {
      readonly type: "player_state"
      readonly playerId: string
      readonly x: number
      readonly y: number
      readonly direction: Direction
      readonly seqAck?: number
      readonly serverTime?: number
      readonly requestedVector?: MovementVector
      readonly appliedVector?: MovementVector
      readonly collisionSlide?: boolean
      readonly collisionSlideAxis?: "x" | "y" | "corner"
      readonly collisionSlideDistancePx?: number
      readonly movementMode?: MovementMode
      readonly speedPxPerSecond?: number
    }
  | {
      readonly type: "world_snapshot"
      readonly roomId: string
      readonly tick: number
      readonly tickMs: number
      readonly serverTime: number
      readonly players: readonly {
        readonly playerId: string
        readonly userId?: string
        readonly x: number
        readonly y: number
        readonly direction: Direction
        readonly zoneIds: readonly string[]
        readonly lastSeqAck: number
        readonly movementMode?: MovementMode
      }[]
    }
  | {
      readonly type: "chat_delivered"
      readonly body: string
      readonly recipientPlayerIds: readonly string[]
    }
  | {
      readonly type: "movement_rejected"
      readonly playerId: string
      readonly reason: MovementRejectedReason
      readonly x: number
      readonly y: number
      readonly seqAck: number
      readonly serverTime?: number
      readonly requestedVector?: MovementVector
      readonly appliedVector?: MovementVector
      readonly collisionSlide?: boolean
      readonly collisionSlideAxis?: "x" | "y" | "corner"
      readonly collisionSlideDistancePx?: number
      readonly movementMode?: MovementMode
      readonly speedPxPerSecond?: number
    }
  | {
      readonly type: "protocol_error"
      readonly code?: string
      readonly message: string
    }
  | {
      readonly reason?: string
    }

interface PlayerSnapshot {
  readonly playerId: string
  readonly userId?: string
  readonly position?: Vector2
  readonly x?: number
  readonly y?: number
  readonly direction?: Direction
  readonly movementMode?: MovementMode
  readonly cameraMotion?: RendererCameraFollowMotion
  readonly rejected?: boolean
}

interface AppState {
  sessionId?: string
  playerId: string
  clientId: string
  seq: number
  position: Vector2
  direction: Direction
  profile: {
    displayName: string
    avatarId: AvatarId
  }
  joined: boolean
  companion: {
    playerId: string
    clientId: string
    displayName: string
    avatarId: AvatarId
    position: Vector2
    direction: Direction
    joined: boolean
  }
  fixtureMap?: FixtureMap
  players: Map<string, RenderedPlayer>
  snapshotPlayerIds: string[]
  movementPrediction: MovementPredictionState
  lifecycle: {
    phase: LifecyclePhase
    message: string
    publicMessage: string
    detail?: string
    lastRecoveryReason?: string
  }
  rendererReadiness: RendererReadiness
  activeZone?: FixtureZone
  meetingJoined: boolean
  meetingZoneId?: string
  mediaRequestPending: boolean
  mediaSession?: MediaSession
  mediaUnavailableMessage?: string
  mediaUnavailableDetail?: string
  micEnabled: boolean
  cameraEnabled: boolean
  mapGeneration: MapGenerationState
  generatedRoom?: GeneratedRoomState
  generatedPreview?: GeneratedMapPreviewState
  devTools: DevToolsAppState
  movementFeel: MovementFeelTuning
  serverProtocolMismatch?: ServerProtocolMismatchState
  lastMediaRoom?: string
  lastChatBody?: string
  lastMovementRejection?: {
    readonly reason: MovementRejectedReason
    readonly atMs: number
  }
  pendingAction: Promise<void>
}

interface MovementReconciliationResult {
  readonly acknowledged: ClientMovementPrediction
  readonly authoritativePosition: Vector2
  readonly replayTarget: Vector2
  readonly replayCount: number
  readonly rejected: boolean
}

interface ChatRecord {
  readonly id: string
  readonly body: string
  readonly recipientCount: number
}

interface MovementDebugRecord {
  readonly atMs: number
  readonly label: string
  readonly detail: string
}

interface ServerProtocolMismatchState {
  readonly kind: "movement_vector_telemetry_missing"
  readonly detectedAtMs: number
  readonly lastSeqAck?: number
}

interface MapGenerationState {
  readonly source: "preset" | "generated"
  readonly mapId: MapSwitcherId
  readonly label: string
  readonly prompt: string
  readonly keywords: readonly string[]
  readonly validation?: PromptMapValidation
  readonly preview?: GeneratedMapPreviewState
}

interface GeneratedRoomState {
  readonly fixtureMap: FixtureMap
  readonly mapGeneration: MapGenerationState
}

interface GeneratedMapPreviewState {
  readonly mode: "preflight" | "invalid" | "applied"
  readonly mdiSchema: "semantic_map_definition"
  readonly rendererAgnostic: true
  readonly compilerOutputs: readonly ["render_layers", "collision_layers", "zones"]
  readonly previewFingerprint: string
  readonly appliedFingerprint?: string
  readonly previewMatchesRendered: boolean
  readonly rendererPreflight: {
    readonly valid: boolean
    readonly errors: readonly string[]
    readonly visualFootprintCount: number
  }
}

interface DevToolsAppState {
  readonly gated: boolean
  enabled: boolean
  activeFixtureId?: DevToolFixtureId
  lastAction?: string
  overlays: RendererDevToolOverlayState
}

interface DepthFixtureCaseResult {
  readonly id: DepthFixtureCaseId
  readonly expectedLayerAtSample: "avatar" | "object"
  readonly sample: Vector2
  readonly sampleViewport: Vector2
  readonly playerPosition: Vector2
  readonly occluderTokenId: string
}

interface AvatarFixtureResult {
  readonly playerIds: readonly string[]
  readonly avatarIds: readonly AvatarId[]
  readonly directions: readonly Direction[]
}

interface ZoneFixtureResult {
  readonly zoneIds: readonly string[]
  readonly zoneTypes: readonly string[]
}

interface BigMapBenchmarkSample {
  readonly pass: number
  readonly size: "20x15" | "50x40" | "100x80"
  readonly performance: RendererPerformanceInfo
  readonly staticTileCount: number
  readonly objectCount: number
  readonly mapRenderDurationMs: number
}

interface BigMapBenchmarkResult {
  readonly samples: readonly BigMapBenchmarkSample[]
  readonly gameInstanceIds: readonly number[]
  readonly repeatedLargeMapDisplayObjectDelta: number
  readonly repeatedLargeMapTextureDelta: number
}

interface InvalidMapAttemptResult {
  readonly accepted: boolean
  readonly error?: string
  readonly before: {
    readonly activeMapId?: string
    readonly mapRenderCount: number
    readonly renderFingerprint: string
  }
  readonly after: {
    readonly activeMapId?: string
    readonly mapRenderCount: number
    readonly renderFingerprint: string
  }
}

type MediaTokenResponse =
  | {
      readonly status: "issued"
      readonly liveKitUrl: string
      readonly token: string
      readonly room: string
      readonly canPublish: boolean
      readonly canSubscribe: boolean
      readonly participantPlayerIds: readonly string[]
      readonly expiresAt: string
    }
  | {
      readonly status: "denied"
      readonly reason?: string
    }

interface MediaSession {
  readonly liveKitUrl: string
  readonly token: string
  readonly room: string
  readonly canPublish: boolean
  readonly canSubscribe: boolean
  readonly participantPlayerIds: readonly string[]
  readonly expiresAt: string
}

const MOVE_REPEAT_MS = CLIENT_MOVEMENT_FRAME_MS
const MOVEMENT_REJECTION_FEEDBACK_MS = 900
const TOAST_TTL_MS = 4200
const MAX_TOASTS = 3
const MAX_CHAT_MESSAGES = 5
const MAX_RECENT_EVENTS = 8
const DEFAULT_MAP_PROMPT =
  "cozy 10-person meeting room with wooden walls, plants, and a coffee bar"
const DEFAULT_DISPLAY_NAME = "Browser Ada"
const DEFAULT_AVATAR_ID: AvatarId = "ember"
const MOBILE_LAYOUT_QUERY = "(max-width: 760px)"
const JOYSTICK_DEADZONE_RATIO = 0.18
const JOYSTICK_DEFAULT_RADIUS_PX = 54
const JOYSTICK_MIN_MAGNITUDE = 0.08
const avatarIds: readonly AvatarId[] = ["ember", "cobalt", "moss", "violet"]
const DEV_TOOL_FIXTURES: readonly DevToolFixtureId[] = [
  "lobby",
  "meeting_room",
  "lounge_cafe",
  "generated",
  "depth_table_player_behind",
  "depth_table_player_front",
  "depth_wall_player_behind",
  "avatar_fixture",
  "zone_fixture",
  "stress_20x15",
  "stress_50x40",
  "stress_100x80",
]
const DEV_TOOL_OVERLAY_IDS: readonly RendererDevToolOverlayId[] = [
  "grid",
  "collision",
  "zones",
  "depth",
  "spriteBounds",
  "camera",
]

const state: AppState = {
  sessionId: undefined,
  playerId: "player-1",
  clientId: `browser-${Math.floor(Math.random() * 100000)}`,
  seq: 1,
  position: { x: 96, y: 64 },
  direction: "down",
  profile: {
    displayName: DEFAULT_DISPLAY_NAME,
    avatarId: DEFAULT_AVATAR_ID,
  },
  joined: false,
  companion: {
    playerId: "player-2",
    clientId: `companion-${Math.floor(Math.random() * 100000)}`,
    displayName: "Grace",
    avatarId: "cobalt",
    position: { x: 96, y: 96 },
    direction: "down",
    joined: false,
  },
  fixtureMap: undefined,
  players: new Map(),
  snapshotPlayerIds: [],
  movementPrediction: initialMovementPredictionState(),
  lifecycle: {
    phase: "empty",
    message: "Room empty",
    publicMessage: "Room empty",
    detail: undefined,
  },
  rendererReadiness: "loading",
  activeZone: undefined,
  meetingJoined: false,
  meetingZoneId: undefined,
  mediaRequestPending: false,
  mediaSession: undefined,
  mediaUnavailableMessage: undefined,
  mediaUnavailableDetail: undefined,
  micEnabled: false,
  cameraEnabled: false,
  mapGeneration: {
    source: "preset",
    mapId: "lobby",
    label: "Lobby",
    prompt: "Lobby",
    keywords: ["lobby"],
    validation: undefined,
  },
  generatedRoom: undefined,
  generatedPreview: undefined,
  devTools: initialDevToolsState(),
  movementFeel: DEFAULT_MOVEMENT_FEEL,
  serverProtocolMismatch: undefined,
  lastMediaRoom: undefined,
  lastChatBody: undefined,
  lastMovementRejection: undefined,
  pendingAction: Promise.resolve(),
}
const inputController = new InputController(state.movementFeel, {
  joystickDefaultRadiusPx: JOYSTICK_DEFAULT_RADIUS_PX,
  joystickDeadzoneRatio: JOYSTICK_DEADZONE_RATIO,
})
let movementTimerId: number | undefined
const clientMotion = new ClientMotionController(state.movementFeel)
const worldSync = new WorldSyncController((events) =>
  applyEvents(events as readonly WorldEvent[]),
)
const recentEvents: string[] = []
const chatMessages: ChatRecord[] = []
const movementDebugRecords: MovementDebugRecord[] = []
const toasts = new Map<string, number>()
let movementFeelSyncTimerId: number | undefined

const elements = {
  start: mustQuery<HTMLButtonElement>("#start"),
  reset: mustQuery<HTMLButtonElement>("#reset"),
  map: mustQuery<HTMLElement>("#map"),
  stageOverlay: mustQuery<HTMLElement>("#stage-overlay"),
  stageOverlayKicker: mustQuery<HTMLElement>("#stage-overlay-kicker"),
  stageOverlayTitle: mustQuery<HTMLElement>("#stage-overlay-title"),
  stageOverlayBody: mustQuery<HTMLElement>("#stage-overlay-body"),
  sessionStatus: mustQuery<HTMLElement>("#session-status"),
  sessionPill: mustQuery<HTMLElement>("#session-pill"),
  worldStatus: mustQuery<HTMLElement>("#world-status"),
  worldPill: mustQuery<HTMLElement>("#world-pill"),
  lifecycleBanner: mustQuery<HTMLElement>("#lifecycle-banner"),
  lifecycleStatus: mustQuery<HTMLElement>("#lifecycle-status"),
  displayName: mustQuery<HTMLInputElement>("#demo-display-name"),
  avatarButtons: [
    ...document.querySelectorAll<HTMLButtonElement>("[data-avatar-id]"),
  ],
  mapSwitcherButtons: [
    ...document.querySelectorAll<HTMLButtonElement>("[data-map-id]"),
  ],
  promptExampleButtons: [
    ...document.querySelectorAll<HTMLButtonElement>("[data-prompt-example]"),
  ],
  mapGeneratorForm: mustQuery<HTMLFormElement>("#map-generator-form"),
  mapPrompt: mustQuery<HTMLTextAreaElement>("#map-prompt"),
  generateMap: mustQuery<HTMLButtonElement>("#generate-map"),
  generatedMapAvailability: mustQuery<HTMLElement>("#generated-map-availability"),
  generatedPreview: mustQuery<HTMLElement>("#generated-preview"),
  generatedPreviewDetail: mustQuery<HTMLElement>("#generated-preview-detail"),
  mapGenerationStatus: mustQuery<HTMLElement>("#map-generation-status"),
  validationBlocked: mustQuery<HTMLElement>("#validation-blocked"),
  validationSpawns: mustQuery<HTMLElement>("#validation-spawns"),
  validationZones: mustQuery<HTMLElement>("#validation-zones"),
  validationSummary: mustQuery<HTMLElement>("#validation-summary"),
  mediaStatus: mustQuery<HTMLElement>("#media-status"),
  mediaPill: mustQuery<HTMLElement>("#media-pill"),
  chatForm: mustQuery<HTMLFormElement>("#chat-form"),
  chatBody: mustQuery<HTMLInputElement>("#chat-body"),
  chatStatus: mustQuery<HTMLElement>("#chat-status"),
  chatMessages: mustQuery<HTMLOListElement>("#chat-messages"),
  toastRegion: mustQuery<HTMLElement>("#toast-region"),
  meetingPanel: mustQuery<HTMLElement>("#meeting-panel"),
  meetingStatus: mustQuery<HTMLElement>("#meeting-status"),
  meetingHint: mustQuery<HTMLElement>("#meeting-hint"),
  joinMeeting: mustQuery<HTMLButtonElement>("#join-meeting"),
  leaveMeeting: mustQuery<HTMLButtonElement>("#leave-meeting"),
  mediaPanel: mustQuery<HTMLElement>("#media-panel"),
  mediaPanelStatus: mustQuery<HTMLElement>("#media-panel-status"),
  mediaAvailability: mustQuery<HTMLElement>("#media-availability"),
  mediaRoom: mustQuery<HTMLElement>("#media-room"),
  mediaEndpoint: mustQuery<HTMLElement>("#media-endpoint"),
  mediaParticipants: mustQuery<HTMLElement>("#media-participants"),
  mediaTokenStatus: mustQuery<HTMLElement>("#media-token-status"),
  localPreview: mustQuery<HTMLElement>("#local-preview"),
  previewAvatar: mustQuery<HTMLElement>(".preview-avatar"),
  previewStatus: mustQuery<HTMLElement>("#preview-status"),
  toggleMic: mustQuery<HTMLButtonElement>("#toggle-mic"),
  toggleCamera: mustQuery<HTMLButtonElement>("#toggle-camera"),
  cameraFollow: mustQuery<HTMLButtonElement>("#camera-follow"),
  cameraFit: mustQuery<HTMLButtonElement>("#camera-fit"),
  zoomPreset: mustQuery<HTMLSelectElement>("#zoom-preset"),
  zoomOut: mustQuery<HTMLButtonElement>("#zoom-out"),
  zoomReset: mustQuery<HTMLButtonElement>("#zoom-reset"),
  zoomIn: mustQuery<HTMLButtonElement>("#zoom-in"),
  runToggle: mustQuery<HTMLButtonElement>("#run-toggle"),
  joystick: mustQuery<HTMLElement>("#analog-joystick"),
  joystickKnob: mustQuery<HTMLElement>("#joystick-knob"),
  joystickStatus: mustQuery<HTMLElement>("#joystick-status"),
  movementDebugLog: mustQuery<HTMLOListElement>("#movement-debug-log"),
  movementDebugCopy: mustQuery<HTMLButtonElement>("#movement-debug-copy"),
  movementFeelPanel: mustQuery<HTMLDetailsElement>("#movement-feel-panel"),
  movementFeelSummary: mustQuery<HTMLElement>("#movement-feel-summary"),
  movementFeelControls: mustQuery<HTMLElement>("#movement-feel-controls"),
  movementFeelReset: mustQuery<HTMLButtonElement>("#movement-feel-reset"),
  mobileCollapsibleSections: [
    ...document.querySelectorAll<HTMLDetailsElement>("[data-mobile-collapsible]"),
  ],
}
const renderer = new PhaserOfficeRenderer(elements.map)
const mobileLayoutQuery = window.matchMedia(MOBILE_LAYOUT_QUERY)
syncRendererDevTools()
installDevToolsKeyboardShortcuts()

elements.start.addEventListener("click", () => queueAction(() => startDemo()))
elements.reset.addEventListener("click", () => queueAction(() => resetDemo()))
elements.displayName.addEventListener("input", () => {
  state.profile.displayName = elements.displayName.value
  renderIdentityControls()
  seedLocalRenderedPlayer()
  renderPlayers()
  renderMediaPanel()
})
elements.displayName.addEventListener("blur", () => {
  elements.displayName.value = displayNameForLocalProfile()
  state.profile.displayName = elements.displayName.value
  renderIdentityControls()
  seedLocalRenderedPlayer()
  renderPlayers()
  renderMediaPanel()
})
elements.avatarButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const avatarId = button.dataset.avatarId
    if (!isAvatarId(avatarId)) return
    state.profile.avatarId = avatarId
    renderIdentityControls()
    seedLocalRenderedPlayer()
    renderPlayers()
    renderMediaPanel()
  })
})
elements.mapSwitcherButtons.forEach((button) => {
  button.addEventListener("click", () =>
    queueAction(() => switchMap(button.dataset.mapId as MapSwitcherId)),
  )
})
elements.promptExampleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const prompt = button.dataset.promptExample
    if (!prompt) return
    elements.mapPrompt.value = prompt
    elements.mapPrompt.focus()
  })
})
elements.mapGeneratorForm.addEventListener("submit", (event) => {
  event.preventDefault()
  queueAction(() => generateMapFromPrompt())
})
elements.joinMeeting.addEventListener("click", () => queueAction(() => joinMeeting()))
elements.leaveMeeting.addEventListener("click", () => queueAction(() => leaveMeeting()))
elements.toggleMic.addEventListener("click", () => toggleMic())
elements.toggleCamera.addEventListener("click", () => toggleCamera())
elements.runToggle.addEventListener("click", () => {
  inputController.toggleRun()
  renderMovementModeControl()
  requestMoveFromHeldInput()
})
document
  .querySelectorAll<HTMLButtonElement>("[data-move-x][data-move-y][data-facing]")
  .forEach((button) => installMovementControlButton(button))
installAnalogJoystick()
elements.movementDebugCopy.addEventListener("click", () => {
  void copyMovementDebugLog()
})
installMovementFeelPanel()
elements.chatForm.addEventListener("submit", (event) => {
  event.preventDefault()
  queueAction(() => sendChat(elements.chatBody.value))
})
elements.zoomOut.addEventListener("click", () => {
  renderer.zoomOut()
  renderCameraControls(renderer.getCameraState())
})
elements.zoomReset.addEventListener("click", () => {
  renderer.resetZoom()
  renderCameraControls(renderer.getCameraState())
})
elements.zoomIn.addEventListener("click", () => {
  renderer.zoomIn()
  renderCameraControls(renderer.getCameraState())
})
elements.cameraFollow.addEventListener("click", () => {
  renderCameraControls(renderer.setCameraMode("follow_player"))
})
elements.cameraFit.addEventListener("click", () => {
  renderCameraControls(renderer.setCameraMode("fit_room"))
})
elements.zoomPreset.addEventListener("change", () => {
  const zoomPreset = elements.zoomPreset.value
  if (!isRendererZoomPresetId(zoomPreset) || zoomPreset === "custom") return
  renderCameraControls(renderer.setZoomPreset(zoomPreset))
})
document.addEventListener("keydown", (event) => {
  if (eventTargetConsumesMovementKeys(event.target)) return

  if (event.key === "Shift") {
    if (!inputController.snapshot().shiftRunning) {
      inputController.setShiftRunning(true)
      renderMovementModeControl()
      requestMoveFromHeldInput()
    }
    return
  }

  const direction = directionForKey(event.key)
  if (!direction) return

  event.preventDefault()
  if (event.repeat) {
    logMovementDebug("key-repeat", `${event.key} ignored`)
    return
  }

  logMovementDebug("key-down", `${event.key} -> ${direction}`)
  pressDirection(direction)
})
document.addEventListener("keyup", (event) => {
  if (eventTargetConsumesMovementKeys(event.target)) return

  if (event.key === "Shift") {
    inputController.setShiftRunning(false)
    renderMovementModeControl()
    requestMoveFromHeldInput()
    return
  }

  const direction = directionForKey(event.key)
  if (!direction) return

  event.preventDefault()
  logMovementDebug("key-up", `${event.key} -> ${direction}`)
  releaseDirection(direction)
})
window.addEventListener("blur", () => {
  logMovementDebug("blur", "cleared held movement")
  stopHeldMovement()
})
mobileLayoutQuery.addEventListener("change", () => syncResponsiveToolSections())

switchToPresetMap("lobby", { announce: false })
  .then(() => applyInitialDevFixture())
  .catch((error: unknown) => {
    setRendererReadiness("failed")
    setLifecycleStatus(
      "recovering",
      "Unable to load office",
      "The office map could not be prepared. Refresh the page or try again shortly.",
      technicalErrorDetail(error),
    )
    publishToast("The office could not load. Try again shortly.", "error")
    renderPlayers()
  })
void renderer.advanceTime().then(
  () => setRendererReadiness("ready"),
  (error: unknown) => {
    setRendererReadiness("failed")
    setLifecycleStatus(
      "recovering",
      "Renderer unavailable",
      "The office view could not start. Refresh the page or try again shortly.",
      technicalErrorDetail(error),
    )
    publishToast("The office view could not start.", "error")
  },
)
renderCameraControls(renderer.getCameraState())
renderMeetingControls()
renderMediaPanel()
renderMapGenerationResult()
renderMapSwitcher()
renderIdentityControls()
renderMovementModeControl()
renderLifecycleStatus()
syncResponsiveToolSections()
startClientMotionLoop()

async function startDemo(): Promise<void> {
  elements.start.disabled = true
  elements.start.textContent = "Joining..."
  setLifecycleStatus("joining", "Joining room")
  setConnectionStatus("session", "pending", "Connecting")
  setConnectionStatus("world", "pending", "Joining")
  setConnectionStatus("media", "idle", "Media off")

  try {
    if (state.joined) {
      elements.start.textContent = "In office"
      setLifecycleStatus("joined", roomOccupancyLabel())
      publishToast("Already in the office", "info")
      return
    }

    if (!state.fixtureMap) {
      await switchToPresetMap("lobby", { announce: false })
    }
    if (state.fixtureMap) {
      await configureDevWorldGeometry(state.fixtureMap)
    }

    const session = await signInDevUser(
      "wikimedia-browser-user",
      displayNameForLocalProfile(),
    )
    state.sessionId = session.sessionId
    setConnectionStatus("session", "ready", "Connected")
    publishToast(`Signed in as ${session.username}`, "success")

    const token = await issueWorldToken(state.sessionId)
    const joined = await joinWorld({
      clientId: state.clientId,
      token: token.token,
      playerId: state.playerId,
      spawn: state.position,
      roomId: "room-lobby",
      avatarId: state.profile.avatarId,
    })

    if (joined.status !== "joined") {
      throw new Error(`World admission failed: ${joined.reason}`)
    }

    state.position = playerSnapshotPosition(joined.player)
    state.direction = joined.player.direction ?? "down"
    resetClientMotion(state.position, state.direction)
    worldSync.connect(state.clientId)
    upsertRenderedPlayer(joined.player)
    renderPlayers()
    state.joined = true
    elements.reset.disabled = false
    setConnectionStatus("world", "ready", "In lobby")
    setLifecycleStatus("joined", "Only you in room")
    publishToast("Entered the office", "success")

    await joinCompanion()
    const synced = await syncWorldSnapshot()
    if (!synced) return
    await move(movementVectorForDirection("right"), "right")
    if (!state.joined) return
    await sendChat(elements.chatBody.value)
    if (!state.joined) return
    elements.start.textContent = "In office"
    renderMeetingControls()
  } catch (error: unknown) {
    elements.start.textContent = "Enter office"
    setLifecycleStatus(
      state.joined ? "joined" : "empty",
      state.joined ? roomOccupancyLabel() : roomReadyLabel(),
    )
    setConnectionStatus(
      "session",
      state.sessionId ? "ready" : "blocked",
      state.sessionId ? "Connected" : "Failed",
    )
    setConnectionStatus(
      "world",
      state.joined ? "ready" : "blocked",
      state.joined ? "In lobby" : "Join failed",
    )
    setLifecycleStatus(
      state.joined ? "joined" : "empty",
      state.joined ? roomOccupancyLabel() : roomReadyLabel(),
      state.joined
        ? undefined
        : "The office could not be joined. Check the local server and try again.",
      technicalErrorDetail(error),
    )
    publishToast("Could not join the office. Try again shortly.", "error")
  } finally {
    elements.start.disabled = state.joined
    elements.reset.disabled = !state.joined
  }
}

async function signInDevUser(subject: string, username: string) {
  return postJson<{ sessionId: string; username: string }>("/dev/sign-in", {
    subject,
    username,
  })
}

async function issueWorldToken(sessionId: string) {
  return postJson<{ token: string }>("/api/world-token", {
    sessionId,
    roomId: "room-lobby",
  })
}

async function joinWorld(input: Record<string, unknown>) {
  return postJson<{
    status: "joined" | "denied"
    reason?: string
    player: PlayerSnapshot
  }>("/world/join", input)
}

async function joinCompanion(): Promise<void> {
  const companionSession = await signInDevUser(
    "wikimedia-browser-companion",
    state.companion.displayName,
  )
  const companionToken = await issueWorldToken(companionSession.sessionId)
  const joined = await joinWorld({
    clientId: state.companion.clientId,
    token: companionToken.token,
    playerId: state.companion.playerId,
    spawn: state.companion.position,
    roomId: "room-lobby",
    avatarId: state.companion.avatarId,
  })

  if (joined.status !== "joined") {
    throw new Error(`Companion admission failed: ${joined.reason}`)
  }

  state.companion.joined = true
  state.companion.position = playerSnapshotPosition(joined.player)
  state.companion.direction = joined.player.direction ?? "down"
  upsertRenderedPlayer(joined.player)
  renderPlayers()
  recordEvent("Added Grace as a local companion")
}

async function syncWorldSnapshot(): Promise<boolean> {
  if (!state.joined) return false

  let snapshot: {
    status: "ok" | "denied"
    reason?: string
    players: readonly PlayerSnapshot[]
  }

  try {
    snapshot = await postJson<{
      status: "ok" | "denied"
      reason?: string
      players: readonly PlayerSnapshot[]
    }>("/world/snapshot", {
      clientId: state.clientId,
    })
  } catch (error: unknown) {
    if (isRecoverableWorldError(error)) {
      recoverFromWorldLoss("unknown_client")
      return false
    }
    throw error
  }

  if (snapshot.status !== "ok") {
    if (snapshot.reason === "unknown_client") {
      recoverFromWorldLoss("unknown_client")
      return false
    }
    throw new Error(`World snapshot failed: ${snapshot.reason}`)
  }

  applyWorldSnapshot(snapshot.players)
  recordEvent(`Synced ${snapshot.players.length} player(s) from world snapshot`)
  return true
}

function applyWorldSnapshot(players: readonly PlayerSnapshot[]): void {
  state.snapshotPlayerIds = players.map((player) => player.playerId)
  state.movementPrediction.active = undefined
  state.movementPrediction.pending = []
  state.movementPrediction.lastAckSeq = undefined
  state.movementPrediction.lastReplayCount = 0
  state.movementPrediction.lastReplayCorrectionPx = undefined
  state.movementPrediction.lastReplayTarget = undefined

  const local = players.find((player) => player.playerId === state.playerId)
  if (local) {
    state.position = playerSnapshotPosition(local)
    state.direction = local.direction ?? state.direction
    clientMotion.reconcile(state.position, { force: true })
  }

  const companion = players.find(
    (player) => player.playerId === state.companion.playerId,
  )
  state.companion.joined = Boolean(companion)

  if (companion) {
    state.companion.position = playerSnapshotPosition(companion)
    state.companion.direction = companion.direction ?? state.companion.direction
  }

  state.players.clear()
  players.forEach(upsertRenderedPlayer)
  if (players.length === 0) {
    state.joined = false
    state.companion.joined = false
    setConnectionStatus("world", "idle", "Room empty")
    setLifecycleStatus("empty", "Room empty")
    seedLocalRenderedPlayer()
  } else {
    setLifecycleStatus("joined", roomOccupancyLabel(players.length))
  }
  renderPlayers()
  updateActiveZoneFromPosition()
}

function playerSnapshotPosition(player: PlayerSnapshot): Vector2 {
  return {
    x: player.position?.x ?? player.x ?? 0,
    y: player.position?.y ?? player.y ?? 0,
  }
}

async function resetDemo(
  options: {
    readonly announce?: boolean
    readonly lifecyclePhase?: LifecyclePhase
    readonly lifecycleMessage?: string
  } = {},
): Promise<void> {
  const announce = options.announce !== false

  elements.reset.disabled = true
  elements.start.disabled = true
  if (state.joined || state.companion.joined) {
    setLifecycleStatus("leaving", "Leaving room")
  }

  if (state.companion.joined) {
    await leaveWorldSafely(state.companion.clientId, state.companion.displayName)
  }

  if (state.joined) {
    await leaveWorldSafely(state.clientId, displayNameForLocalProfile())
  }

  state.sessionId = undefined
  state.seq = 1
  state.direction = "down"
  state.movementPrediction = initialMovementPredictionState()
  state.joined = false
  state.companion.joined = false
  state.companion.direction = "down"
  state.snapshotPlayerIds = []
  state.activeZone = undefined
  state.meetingJoined = false
  state.meetingZoneId = undefined
  state.mediaRequestPending = false
  clearMediaSession()
  state.lastChatBody = undefined
  state.lastMovementRejection = undefined
  state.serverProtocolMismatch = undefined
  worldSync.disconnect()
  state.players.clear()
  chatMessages.length = 0
  renderChatMessages()
  stopHeldMovement()
  inputController.setRunToggled(false)
  renderMovementModeControl()
  setConnectionStatus("session", "idle", "Disconnected")
  setConnectionStatus("world", "idle", "Outside room")
  setConnectionStatus("media", "idle", "Media off")
  setLifecycleStatus(
    options.lifecyclePhase ?? "empty",
    options.lifecycleMessage ?? "Room empty",
  )
  renderMediaPanel()
  elements.start.textContent = "Enter office"
  elements.start.disabled = false
  elements.reset.disabled = true

  if (state.fixtureMap) {
    state.position = fixtureSpawnPosition(state.fixtureMap, "default")
    state.companion.position = fixtureSpawnPosition(state.fixtureMap, "guest")
  }

  resetClientMotion(state.position, state.direction)
  seedLocalRenderedPlayer()
  renderPlayers()
  updateActiveZoneFromPosition()
  if (announce) {
    publishToast("Left the office", "info")
  }
}

async function leaveWorld(clientId: string): Promise<void> {
  await postJson("/world/leave", {
    clientId,
  })
}

async function leaveWorldSafely(clientId: string, label: string): Promise<void> {
  try {
    await leaveWorld(clientId)
  } catch (error: unknown) {
    recordEvent(`${label} leave skipped: ${errorMessage(error)}`)
  }
}

function startClientMotionLoop(): void {
  const frame = (nowMs: number) => {
    stepClientMotionFrame(nowMs)
    window.requestAnimationFrame(frame)
  }

  window.requestAnimationFrame(frame)
}

function stepClientMotionFrame(nowMs: number): void {
  if (!state.joined || !state.fixtureMap) return

  const result = clientMotion.step({
    nowMs,
    intent: activeHeldMovementIntent(),
    map: collisionMapForFixtureMap(state.fixtureMap),
    playerSize: movementCollisionBodySize(state.movementFeel),
  })

  if (!result.changed) return
  renderLocalPlayerFromMotion(result.snapshot)
}

function primeClientMotionIntent(intent: ClientMotionIntent): void {
  if (!state.joined || !state.fixtureMap) return

  const result = clientMotion.step({
    nowMs: performance.now(),
    intent,
    map: collisionMapForFixtureMap(state.fixtureMap),
    playerSize: movementCollisionBodySize(state.movementFeel),
  })

  if (!result.changed) return
  renderLocalPlayerFromMotion(result.snapshot)
}

function renderLocalPlayerFromMotion(snapshot: ClientMotionSnapshot): void {
  const player = state.players.get(state.playerId)
  if (!player) return

  state.players.set(state.playerId, {
    ...player,
    position: snapshot.position,
    direction: snapshot.direction,
    movementMode: snapshot.movementMode,
    cameraMotion: cameraMotionFromSnapshot(snapshot),
  })
  renderPlayers({ refreshCameraControls: false })
  updateActiveZoneFromPosition()
}

function resetClientMotion(position: Vector2, direction: Direction): void {
  clientMotion.reset(position, direction)
}

async function move(
  vector: MovementVector,
  direction: Direction,
  movementMode: MovementMode = "walk",
): Promise<void> {
  if (!state.joined) return

  const seq = state.seq
  logMovementDebug(
    "send",
    `seq=${seq} vector=${formatMovementVector(vector)} facing=${direction} mode=${movementMode} pos=${formatMovementVector(state.position)}`,
  )
  const prediction = beginClientMovementPrediction(
    vector,
    direction,
    movementMode,
    seq,
  )
  state.seq += 1
  const message = {
    type: "move" as const,
    vector,
    direction,
    movementMode,
    seq,
  }

  if (worldSync.send(state.clientId, message)) {
    logMovementDebug("realtime-send", `seq=${seq} transport=websocket`)
    return
  }

  let body: { events: readonly WorldEvent[] }
  try {
    body = await postJson<{ events: readonly WorldEvent[] }>("/world/message", {
      clientId: state.clientId,
      message,
    })
  } catch (error: unknown) {
    if (isRecoverableWorldError(error)) {
      logMovementDebug("recover", `seq=${seq} reason=unknown_client`)
      recoverFromWorldLoss("unknown_client")
      return
    }
    abandonClientMovementPrediction(prediction)
    logMovementDebug("error", `seq=${seq} ${errorMessage(error)}`)
    throw error
  }
  logMovementDebug("response", `seq=${seq} events=${body.events?.length ?? 0}`)
  applyEvents(body.events ?? [])
}

function beginClientMovementPrediction(
  vector: MovementVector,
  direction: Direction,
  movementMode: MovementMode,
  seq: number,
): ClientMovementPrediction | undefined {
  if (!state.fixtureMap) return undefined

  const prediction = createClientMovementPrediction({
    seq,
    vector,
    direction,
    movementMode,
    from: movementPredictionBasePosition(),
    map: collisionMapForFixtureMap(state.fixtureMap),
    lastSentAtMs: state.movementPrediction.lastSentAtMs,
    nowMs: Date.now(),
    playerSize: movementCollisionBodySize(state.movementFeel),
    collisionSlide: movementCollisionSlideOptions(state.movementFeel),
    speedPxPerSecond: state.movementFeel.walkSpeedPxPerSecond,
    runSpeedPxPerSecond: state.movementFeel.runSpeedPxPerSecond,
  })

  state.movementPrediction.pending = trimMovementPredictionHistory([
    ...state.movementPrediction.pending,
    prediction,
  ])
  state.movementPrediction.active = state.movementPrediction.pending.at(-1)
  state.movementPrediction.last = prediction
  state.movementPrediction.lastSentAtMs = prediction.startedAtMs
  state.movementPrediction.lastCorrectionPx = undefined
  logMovementDebug(
    "predict",
    `seq=${seq} mode=${prediction.movementMode} speed=${prediction.speedPxPerSecond} requested=${formatMovementVector(prediction.requestedVector)} applied=${formatMovementVector(prediction.appliedVector)} from=${formatMovementVector(prediction.from)} target=${formatMovementVector(prediction.target)} pending=${state.movementPrediction.pending.length} slide=${prediction.collisionSlide} slideAxis=${prediction.collisionSlideAxis ?? "-"} slideDistance=${formatMovementNumber(prediction.collisionSlideDistancePx)}`,
  )

  if (prediction.blockedLocally) {
    state.movementPrediction.totalClientBlocked += 1
    state.movementPrediction.lastOutcome = "client_blocked"
    applyClientMovementBlock(prediction)
    return prediction
  }

  state.movementPrediction.totalPredicted += 1
  state.movementPrediction.lastOutcome = "predicted"
  upsertRenderedPlayer({
    playerId: state.playerId,
    position: prediction.target,
    direction,
    movementMode,
  })
  renderPlayers()
  return prediction
}

function movementPredictionBasePosition(): Vector2 {
  return state.movementPrediction.pending.at(-1)?.target ?? state.position
}

function applyClientMovementBlock(prediction: ClientMovementPrediction): void {
  const showFeedback = shouldShowMovementRejectionFeedback("collision")
  state.direction = prediction.direction
  upsertRenderedPlayer({
    playerId: state.playerId,
    position: prediction.from,
    direction: prediction.direction,
    movementMode: prediction.movementMode,
    rejected: showFeedback,
  })
  renderPlayers()

  if (showFeedback) {
    publishToast(movementRejectionLabel("collision"), "info")
  }
}

function abandonClientMovementPrediction(
  prediction: ClientMovementPrediction | undefined,
): void {
  if (!prediction) return

  const pending = state.movementPrediction.pending.filter(
    (candidate) => candidate.seq !== prediction.seq,
  )
  if (pending.length === state.movementPrediction.pending.length) return

  state.movementPrediction.pending = pending
  state.movementPrediction.active = pending.at(-1)
  state.movementPrediction.totalCorrected += 1
  state.movementPrediction.lastOutcome = "corrected"
  state.movementPrediction.lastCorrectionPx = movementPredictionCorrectionPx(
    prediction,
    state.position,
  )
  clientMotion.reconcile(state.position, { force: true })
  upsertRenderedPlayer({
    playerId: state.playerId,
    position: state.position,
    direction: state.direction,
    movementMode: prediction.movementMode,
  })
  renderPlayers()
}

function installMovementControlButton(button: HTMLButtonElement): void {
  const intent = movementIntentForControlButton(button)
  if (!intent) return

  button.addEventListener("pointerdown", (event) => {
    if (!state.joined) return

    event.preventDefault()
    button.setPointerCapture(event.pointerId)
    logMovementDebug(
      "pad-down",
      `id=${event.pointerId} vector=${formatMovementVector(intent.vector)} facing=${intent.direction}`,
    )
    pressMovementControl({
      ...intent,
      id: event.pointerId,
      button,
    })
  })
  button.addEventListener("pointerup", (event) => {
    event.preventDefault()
    logMovementDebug("pad-up", `id=${event.pointerId}`)
    releaseMovementControl(event.pointerId)
  })
  button.addEventListener("pointercancel", (event) => {
    logMovementDebug("pad-cancel", `id=${event.pointerId}`)
    releaseMovementControl(event.pointerId)
  })
  button.addEventListener("lostpointercapture", (event) => {
    logMovementDebug("pad-lost", `id=${event.pointerId}`)
    releaseMovementControl(event.pointerId)
  })
  button.addEventListener("click", (event) => {
    event.preventDefault()
    if (event.detail === 0) {
      logMovementDebug(
        "pad-click",
        `vector=${formatMovementVector(intent.vector)} facing=${intent.direction} mode=${activeMovementMode()}`,
      )
      requestMove(intent.vector, intent.direction, activeMovementMode())
    }
  })
}

function installAnalogJoystick(): void {
  elements.joystick.addEventListener("pointerdown", (event) => {
    if (!state.joined) return

    event.preventDefault()
    elements.joystick.setPointerCapture(event.pointerId)
    inputController.setJoystickPointer(event.pointerId)
    updateJoystickFromPointer(event, "down")
  })
  elements.joystick.addEventListener("pointermove", (event) => {
    if (inputController.joystickPointerId() !== event.pointerId) return

    event.preventDefault()
    updateJoystickFromPointer(event, "move")
  })
  elements.joystick.addEventListener("pointerup", (event) => {
    if (inputController.joystickPointerId() !== event.pointerId) return

    event.preventDefault()
    releaseJoystick("up", event.pointerId)
  })
  elements.joystick.addEventListener("pointercancel", (event) => {
    if (inputController.joystickPointerId() !== event.pointerId) return

    releaseJoystick("cancel", event.pointerId)
  })
  elements.joystick.addEventListener("lostpointercapture", (event) => {
    if (inputController.joystickPointerId() !== event.pointerId) return

    releaseJoystick("lost", event.pointerId)
  })
  renderJoystickControl()
}

function updateJoystickFromPointer(
  event: PointerEvent,
  phase: "down" | "move",
): void {
  const surface = elements.joystick.querySelector<HTMLElement>(".joystick-surface")
  if (!surface) return

  const rect = surface.getBoundingClientRect()
  const radiusPx = Math.max(24, Math.min(rect.width, rect.height) / 2)
  const deadzonePx = radiusPx * JOYSTICK_DEADZONE_RATIO
  const center = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  }
  const offset = {
    x: event.clientX - center.x,
    y: event.clientY - center.y,
  }
  const rawDistance = Math.hypot(offset.x, offset.y)
  const distance = Math.min(rawDistance, radiusPx)
  const magnitude = rawDistance <= deadzonePx ? 0 : distance / radiusPx
  const scale = rawDistance > 0 ? distance / rawDistance : 0
  const knob = {
    x: offset.x * scale,
    y: offset.y * scale,
  }
  const vector =
    magnitude <= JOYSTICK_MIN_MAGNITUDE
      ? { x: 0, y: 0 }
      : {
          x: Number((knob.x / radiusPx).toFixed(3)),
          y: Number((knob.y / radiusPx).toFixed(3)),
        }
  const direction =
    vector.x === 0 && vector.y === 0
      ? inputController.snapshot().joystick.direction
      : directionForMovementVector(vector)

  inputController.updateJoystick({
    pointerId: event.pointerId,
    vector,
    direction,
    magnitude,
    knob,
    radiusPx,
    deadzonePx,
    minMagnitude: JOYSTICK_MIN_MAGNITUDE,
  })
  renderJoystickControl()
  logMovementDebug(
    `joystick-${phase}`,
    `id=${event.pointerId} vector=${formatMovementVector(vector)} magnitude=${formatMovementNumber(magnitude)} facing=${direction ?? "-"}`,
  )

  if (hasHeldMovementInput()) {
    startHeldMovement()
    requestMoveFromHeldInput()
  } else {
    stopHeldMovementTimer()
  }
}

function releaseJoystick(reason: "up" | "cancel" | "lost" | "reset", id?: number): void {
  const previousVector = inputController.releaseJoystick()
  renderJoystickControl()
  logMovementDebug(
    "joystick-release",
    `reason=${reason} id=${id ?? "-"} previous=${formatMovementVector(previousVector)}`,
  )

  if (!hasHeldMovementInput()) {
    stopHeldMovementTimer()
  }
}

function renderJoystickControl(): void {
  const joystick = inputController.snapshot().joystick

  elements.joystick.dataset.active = joystick.active ? "true" : "false"
  elements.joystickKnob.style.setProperty("--joystick-x", `${joystick.knob.x}px`)
  elements.joystickKnob.style.setProperty("--joystick-y", `${joystick.knob.y}px`)
  elements.joystickStatus.textContent = joystick.active
    ? `${Math.round(joystick.magnitude * 100)}% ${joystick.direction ?? "move"}`
    : "Drag to move"
}

function movementIntentForControlButton(
  button: HTMLButtonElement,
): Omit<MovementControlIntent, "id" | "button"> | undefined {
  const vector = {
    x: Number(button.dataset.moveX),
    y: Number(button.dataset.moveY),
  }
  const direction = button.dataset.facing

  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y)) return undefined
  if (!isControlVectorComponent(vector.x) || !isControlVectorComponent(vector.y)) {
    return undefined
  }
  if (vector.x === 0 && vector.y === 0) return undefined
  if (!isDirection(direction)) return undefined

  return {
    vector,
    direction,
    source: "dpad",
  }
}

function isControlVectorComponent(value: number): value is -1 | 0 | 1 {
  return value === -1 || value === 0 || value === 1
}

function pressDirection(direction: Direction): void {
  inputController.pressDirection(direction)
  startHeldMovement()
  requestMoveFromHeldInput()
}

function releaseDirection(direction: Direction): void {
  inputController.releaseDirection(direction)

  if (!hasHeldMovementInput()) {
    stopHeldMovementTimer()
  }
}

function pressMovementControl(intent: MovementControlIntent): void {
  inputController.pressControl(intent)
  startHeldMovement()
  requestMoveFromHeldInput()
}

function releaseMovementControl(id: number): void {
  inputController.releaseControl(id)

  if (!hasHeldMovementInput()) {
    stopHeldMovementTimer()
  }
}

function startHeldMovement(): void {
  if (movementTimerId !== undefined) return

  movementTimerId = window.setInterval(() => {
    requestMoveFromHeldInput()
  }, MOVE_REPEAT_MS)
}

function stopHeldMovement(): void {
  inputController.clearHeldInput()
  stopHeldMovementTimer()
  renderJoystickControl()
  renderMovementModeControl()
}

function stopHeldMovementTimer(): void {
  if (movementTimerId !== undefined) {
    window.clearInterval(movementTimerId)
    movementTimerId = undefined
  }
}

function hasHeldMovementInput(): boolean {
  return inputController.hasHeldInput()
}

function activeHeldDirection(): Direction | undefined {
  return inputController.activeHeldDirection()
}

function activeMovementMode(): MovementMode {
  return inputController.activeMovementMode()
}

function renderMovementModeControl(): void {
  const running = activeMovementMode() === "run"
  elements.runToggle.setAttribute("aria-pressed", String(running))
}

function installMovementFeelPanel(): void {
  elements.movementFeelPanel.hidden = !state.devTools.gated
  if (!state.devTools.gated) return

  elements.movementFeelControls.replaceChildren(
    ...MOVEMENT_FEEL_CONTROLS.map(createMovementFeelControl),
  )
  elements.movementFeelControls.addEventListener("input", (event) => {
    const input = event.target
    if (!(input instanceof HTMLInputElement)) return

    const key = input.dataset.feelKey
    if (!key || !isMovementFeelTuningKey(key)) return

    applyMovementFeelValue(key, Number(input.value))
  })
  elements.movementFeelReset.addEventListener("click", () => {
    applyMovementFeel(DEFAULT_MOVEMENT_FEEL)
    logMovementDebug("feel", "reset defaults")
  })
  applyMovementFeel(state.movementFeel)
}

function createMovementFeelControl(control: (typeof MOVEMENT_FEEL_CONTROLS)[number]): HTMLElement {
  const field = document.createElement("label")
  field.className = "movement-feel-control"
  field.dataset.feelControl = control.key

  const header = document.createElement("span")
  header.className = "movement-feel-control-header"

  const label = document.createElement("strong")
  label.textContent = control.label

  const output = document.createElement("output")
  output.dataset.feelOutput = control.key

  header.append(label, output)

  const range = document.createElement("input")
  range.type = "range"
  range.min = String(control.min)
  range.max = String(control.max)
  range.step = String(control.step)
  range.dataset.feelKey = control.key
  range.dataset.feelRange = control.key

  const help = document.createElement("small")
  help.textContent = control.help

  field.append(header, range, help)
  return field
}

function applyMovementFeelValue(
  key: MovementFeelTuningKey,
  value: number,
): void {
  const nextFeel = normalizeMovementFeel({
    ...state.movementFeel,
    [key]: clampMovementFeelValue(key, value),
  })
  applyMovementFeel(nextFeel)
  logMovementDebug(
    "feel",
    `${key}=${formatMovementFeelValue(key, nextFeel[key])}`,
  )
}

function applyMovementFeel(nextFeel: MovementFeelTuning): void {
  state.movementFeel = normalizeMovementFeel(nextFeel)
  inputController.setFeel(state.movementFeel)
  clientMotion.setFeel(state.movementFeel)
  renderMovementFeelPanel()
  scheduleDevelopmentMovementFeelSync()
}

function renderMovementFeelPanel(): void {
  elements.movementFeelPanel.hidden = !state.devTools.gated
  if (!state.devTools.gated) return

  elements.movementFeelSummary.textContent = "Client prediction + visual feel"
  MOVEMENT_FEEL_CONTROLS.forEach((control) => {
    const value = state.movementFeel[control.key]
    const range = elements.movementFeelControls.querySelector<HTMLInputElement>(
      `[data-feel-range="${control.key}"]`,
    )
    const output = elements.movementFeelControls.querySelector<HTMLOutputElement>(
      `[data-feel-output="${control.key}"]`,
    )

    if (range && document.activeElement !== range) {
      range.value = String(value)
    }
    if (output) {
      output.value = formatMovementFeelValue(control.key, value)
    }
  })
}

function scheduleDevelopmentMovementFeelSync(): void {
  if (!state.devTools.gated) return

  if (movementFeelSyncTimerId !== undefined) {
    window.clearTimeout(movementFeelSyncTimerId)
  }

  movementFeelSyncTimerId = window.setTimeout(() => {
    movementFeelSyncTimerId = undefined
    void syncDevelopmentMovementFeel(state.movementFeel)
  }, 120)
}

async function syncDevelopmentMovementFeel(feel: MovementFeelTuning): Promise<void> {
  try {
    const body = await postJson<{
      readonly status: "ok"
      readonly playerSize: { readonly width: number; readonly height: number }
    }>("/dev/world-movement", {
      walkSpeedPxPerSecond: feel.walkSpeedPxPerSecond,
      runSpeedPxPerSecond: feel.runSpeedPxPerSecond,
      collisionBodyRadiusPx: feel.collisionBodyRadiusPx,
      collisionSlideMaxNudgePx: feel.collisionSlideMaxNudgePx,
    })
    logMovementDebug(
      "feel-sync",
      `server body=${formatMovementNumber(body.playerSize.width)}x${formatMovementNumber(body.playerSize.height)}`,
    )
  } catch (error: unknown) {
    logMovementDebug("feel-sync", `skipped ${errorMessage(error)}`)
  }
}

function activeHeldMovementIntent():
  | {
      readonly vector: MovementVector
      readonly rawVector: MovementVector
      readonly direction: Direction
      readonly movementMode: MovementMode
    }
  | undefined {
  return inputController.activeHeldIntent()
}

function requestMoveFromHeldInput(): void {
  const intent = activeHeldMovementIntent()
  if (!intent) {
    logMovementDebug("intent", "none")
    return
  }
  const input = inputController.snapshot()
  logMovementDebug(
    "intent",
    `vector=${formatMovementVector(intent.rawVector)} shaped=${formatMovementVector(intent.vector)} facing=${intent.direction} mode=${intent.movementMode} keys=${input.pressedDirections.join("+") || "-"} pads=${input.pressedControls.length} joystick=${input.joystick.active ? formatMovementVector(input.joystick.vector) : "-"}`,
  )
  requestMove(intent.vector, intent.direction, intent.movementMode)
}

function activeJoystickIntent():
  | {
      readonly vector: MovementVector
      readonly direction: Direction
      readonly source: "joystick"
    }
  | undefined {
  return inputController.activeJoystickIntent()
}

function requestMove(
  vector: MovementVector,
  direction: Direction,
  movementMode: MovementMode,
): void {
  if (!state.joined) {
    logMovementDebug(
      "ignore",
      `not_joined vector=${formatMovementVector(vector)} facing=${direction} mode=${movementMode}`,
    )
    return
  }
  primeClientMotionIntent({ vector, direction, movementMode })
  if (worldSync.canStream(state.clientId)) {
    inputController.markRequestStarted(direction)
    void move(vector, direction, movementMode).catch((error: unknown) => {
      recordEvent(`Movement failed: ${technicalErrorDetail(error)}`)
      publishToast(friendlyActionError(error), "error")
    })
    return
  }

  if (inputController.isInFlight()) {
    inputController.queuePendingIntent({ vector, direction, movementMode })
    logMovementDebug(
      "queue",
      `in_flight vector=${formatMovementVector(vector)} facing=${direction} mode=${movementMode}`,
    )
    return
  }

  inputController.setInFlight(true)
  inputController.markRequestStarted(direction)
  void move(vector, direction, movementMode)
    .catch((error: unknown) => {
      recordEvent(`Movement failed: ${technicalErrorDetail(error)}`)
      publishToast(friendlyActionError(error), "error")
    })
    .finally(() => {
      inputController.setInFlight(false)
      const pendingIntent = inputController.consumePendingIntent()
      if (pendingIntent) {
        logMovementDebug(
          "dequeue",
          `vector=${formatMovementVector(pendingIntent.vector)} facing=${pendingIntent.direction} mode=${pendingIntent.movementMode}`,
        )
        requestMove(
          pendingIntent.vector,
          pendingIntent.direction,
          pendingIntent.movementMode,
        )
      }
    })
}

async function sendChat(body: string): Promise<void> {
  if (!state.joined || !body.trim()) return

  let response: { events: readonly WorldEvent[] }
  try {
    response = await postJson<{ events: readonly WorldEvent[] }>("/world/message", {
      clientId: state.clientId,
      message: {
        type: "chat_send",
        scope: "room",
        body,
        seq: state.seq,
      },
    })
  } catch (error: unknown) {
    if (isRecoverableWorldError(error)) {
      recoverFromWorldLoss("unknown_client")
      return
    }
    throw error
  }
  state.seq += 1
  applyEvents(response.events ?? [])
}

async function joinMeeting(): Promise<void> {
  if (!state.joined) {
    publishToast("Join the world before starting meeting media", "warning")
    return
  }

  const zone = state.activeZone

  if (!zone || !isMeetingZone(zone)) {
    publishToast("Move into a meeting zone before joining media", "warning")
    return
  }

  elements.joinMeeting.disabled = true
  state.mediaRequestPending = true
  clearMediaUnavailable()
  setConnectionStatus("media", "pending", "Requesting media")
  renderMeetingControls()
  renderMediaPanel()

  try {
    const media = await postMediaToken({
      playerId: state.playerId,
      mode: "zone",
      zoneId: zone.id,
      publish: true,
      subscribe: true,
    })

    if (media.status === "issued") {
      setConnectionStatus("media", "ready", "In call")
      state.meetingJoined = true
      state.meetingZoneId = zone.id
      state.mediaSession = {
        liveKitUrl: media.liveKitUrl,
        token: media.token,
        room: media.room,
        canPublish: media.canPublish,
        canSubscribe: media.canSubscribe,
        participantPlayerIds: media.participantPlayerIds,
        expiresAt: media.expiresAt,
      }
      state.lastMediaRoom = media.room
      publishToast(`Joined ${zoneDisplayName(zone)}`, "success")
    } else {
      if (media.reason === "unknown_player") {
        recoverFromWorldLoss("unknown_client")
        return
      }
      setConnectionStatus("media", "blocked", "Media blocked")
      state.meetingJoined = false
      state.meetingZoneId = undefined
      clearMediaSession()
      setMediaUnavailable(
        "Call access is not available for this zone right now.",
        media.reason,
      )
    }
  } catch (error: unknown) {
    setConnectionStatus("media", "blocked", "Media unavailable")
    state.meetingJoined = false
    state.meetingZoneId = undefined
    clearMediaSession()
    setMediaUnavailable(
      "Call media is unavailable. You can keep using the room.",
      technicalErrorDetail(error),
    )
  } finally {
    state.mediaRequestPending = false
    renderZonePresentation()
    renderMeetingControls()
    renderMediaPanel()
  }
}

async function leaveMeeting(): Promise<void> {
  leaveMeetingLocally("Left meeting")
}

function leaveMeetingLocally(message: string): void {
  state.meetingJoined = false
  state.meetingZoneId = undefined
  clearMediaSession()
  setConnectionStatus("media", "idle", "Media off")
  renderZonePresentation()
  renderMeetingControls()
  renderMediaPanel()
  publishToast(message, "info")
}

async function switchMap(mapId: MapSwitcherId): Promise<void> {
  if (mapId === "generated") {
    if (!state.generatedRoom) {
      publishToast("Generate a room before opening it", "info")
      renderMapSwitcher()
      return
    }

    await switchToFixtureMap(
      state.generatedRoom.fixtureMap,
      state.generatedRoom.mapGeneration,
    )
    publishToast("Opened generated room", "success")
    return
  }

  await switchToPresetMap(mapId, { announce: true })
}

async function switchToPresetMap(
  presetId: PresetMapId,
  options: { readonly announce?: boolean } = {},
): Promise<void> {
  const preset = compilePresetMap(presetId)
  const fixtureMap = fixtureMapFromCompiledMap(preset)

  await switchToFixtureMap(fixtureMap, {
    source: "preset",
    mapId: preset.id,
    label: preset.label,
    prompt: preset.label,
    keywords: [preset.id],
    validation: preset.validation,
  })

  if (options.announce !== false) {
    publishToast(`Switched to ${preset.label}`, "success")
  }
}

async function generateMapFromPrompt(): Promise<void> {
  const prompt = elements.mapPrompt.value.trim() || DEFAULT_MAP_PROMPT
  elements.generateMap.disabled = true
  elements.generateMap.textContent = state.generatedRoom
    ? "Regenerating..."
    : "Generating..."
  setGeneratorPreviewState(
    "working",
    state.generatedRoom ? "Regenerating room..." : "Generating room...",
    "Compiling the prompt into a playable room and resetting the local world.",
  )
  setLifecycleStatus("map_reloading", "Generating room")

  try {
    const generated = compileDeterministicPromptMap(prompt)
    const fixtureMap = fixtureMapFromCompiledMap(generated)
    const preview = generatedPreviewForFixtureMap(fixtureMap, "preflight")
    const mapGeneration = {
      source: "generated" as const,
      mapId: "generated" as const,
      label: "Generated room",
      prompt,
      keywords: generated.keywords,
      validation: generated.validation,
      preview,
    }
    state.generatedPreview = preview
    renderMapGenerationResult()

    if (!generated.validation.valid || !preview.rendererPreflight.valid) {
      state.generatedPreview = {
        ...preview,
        mode: "invalid",
      }
      publishToast(
        generated.validation.errors[0] ??
          preview.rendererPreflight.errors[0] ??
          "Generated map is invalid",
        "warning",
      )
      renderMapGenerationResult()
      return
    }

    state.generatedRoom = {
      fixtureMap,
      mapGeneration,
    }

    await switchToFixtureMap(fixtureMap, mapGeneration)

    publishToast("Generated room ready", "success")
  } finally {
    elements.generateMap.disabled = false
    elements.generateMap.textContent = state.generatedRoom
      ? "Regenerate room"
      : "Generate room"
    renderMapSwitcher()
  }
}

function generatedPreviewForFixtureMap(
  fixtureMap: FixtureMap,
  mode: GeneratedMapPreviewState["mode"],
  appliedFingerprint?: string,
): GeneratedMapPreviewState {
  const rendererPreflight = validateFixtureMapForRenderer(fixtureMap)
  const previewFingerprint = rendererPreflight.renderFingerprint

  return {
    mode,
    mdiSchema: "semantic_map_definition",
    rendererAgnostic: true,
    compilerOutputs: ["render_layers", "collision_layers", "zones"],
    previewFingerprint,
    appliedFingerprint,
    previewMatchesRendered: appliedFingerprint
      ? previewFingerprint === appliedFingerprint
      : false,
    rendererPreflight: {
      valid: rendererPreflight.valid,
      errors: rendererPreflight.errors,
      visualFootprintCount: rendererPreflight.visualFootprintCount,
    },
  }
}

function validFixtureValidation(fixtureMap: FixtureMap): PromptMapValidation {
  return {
    valid: true,
    errors: [],
    checks: [
      {
        id: "blocked_tiles",
        status: "pass",
        message: `${fixtureMap.compiled.blockedTiles.length} blocked movement tiles are in bounds.`,
      },
      {
        id: "spawn_clearance",
        status: "pass",
        message: `${fixtureMap.spawnPoints.length} entry spots are clear and inside the room.`,
      },
      {
        id: "zone_bounds",
        status: "pass",
        message: `${fixtureMap.compiled.zones.length} interaction zones are inside the room bounds.`,
      },
    ],
    summary: "Fixture map preflight passed for smoke automation.",
    blockedTileCount: fixtureMap.compiled.blockedTiles.length,
    spawnCount: fixtureMap.spawnPoints.length,
    zoneCount: fixtureMap.compiled.zones.length,
    spawnIds: fixtureMap.spawnPoints.map((spawn) => spawn.id),
    zoneIds: fixtureMap.compiled.zones.map((zone) => zone.id),
  }
}

async function switchToFixtureMap(
  fixtureMap: FixtureMap,
  mapGeneration: MapGenerationState,
): Promise<void> {
  await beginRoomTransition()
  setLifecycleStatus(
    "map_reloading",
    `Reloading ${mapGeneration.label}`,
    "Preparing the room layout and resetting local room state.",
  )
  try {
    await resetDemo({
      announce: false,
      lifecyclePhase: "map_reloading",
      lifecycleMessage: `Reloading ${mapGeneration.label}`,
    })
    await configureDevWorldGeometry(fixtureMap)
    applyFixtureMap(fixtureMap, mapGeneration)
    await finishRoomTransition()
    if (mapGeneration.source === "generated" && state.generatedRoom) {
      const appliedPreview = generatedPreviewForFixtureMap(
        fixtureMap,
        "applied",
        renderer.getMapValidationInfo().renderFingerprint,
      )
      state.generatedPreview = appliedPreview
      state.generatedRoom = {
        fixtureMap,
        mapGeneration: {
          ...mapGeneration,
          preview: appliedPreview,
        },
      }
      state.mapGeneration = {
        ...state.mapGeneration,
        preview: appliedPreview,
      }
      renderMapGenerationResult()
    }
    setLifecycleStatus("empty", roomReadyLabel(mapGeneration.label))
    renderMapSwitcher()
  } catch (error: unknown) {
    delete elements.map.dataset.transition
    setLifecycleStatus(
      "recovering",
      "Map reload failed",
      "The room could not be prepared. Try switching rooms again.",
      technicalErrorDetail(error),
    )
    throw error
  }
}

async function beginRoomTransition(): Promise<void> {
  elements.map.dataset.transition = "switching"
  await delay(90)
}

async function finishRoomTransition(): Promise<void> {
  await renderer.advanceTime()
  elements.map.dataset.transition = "entering"
  window.setTimeout(() => {
    if (elements.map.dataset.transition === "entering") {
      delete elements.map.dataset.transition
    }
  }, 260)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function applyFixtureMap(
  fixtureMap: FixtureMap,
  mapGeneration: MapGenerationState,
): void {
  state.fixtureMap = fixtureMap
  state.mapGeneration = mapGeneration
  state.movementPrediction = initialMovementPredictionState()
  if (state.devTools.gated) {
    state.devTools.activeFixtureId = devFixtureIdForMapGeneration(mapGeneration)
  }
  state.position = fixtureSpawnPosition(fixtureMap, "default")
  resetClientMotion(state.position, state.direction)
  state.companion.position = fixtureSpawnPosition(fixtureMap, "guest")
  seedLocalRenderedPlayer()
  syncRendererDevTools()
  renderer.renderMap(fixtureMap)
  renderPlayers()
  updateActiveZoneFromPosition()
  renderMapGenerationResult()
}

function devFixtureIdForMapGeneration(
  mapGeneration: MapGenerationState,
): DevToolFixtureId {
  return mapGeneration.mapId === "generated" ? "generated" : mapGeneration.mapId
}

function fixtureMapFromCompiledMap(
  compiledMap: Pick<
    DeterministicPromptMapResult | PresetMapResult,
    "definition" | "compiled" | "spawnPoints"
  >,
): FixtureMap {
  const referencedTokenIds = new Set(compiledMap.compiled.referencedTokenIds)

  return {
    definition: compiledMap.definition,
    compiled: compiledMap.compiled,
    spawnPoints: compiledMap.spawnPoints,
    catalog: {
      tokens: starterVisualAssetCatalog.tokens
        .filter((token) => referencedTokenIds.has(token.id))
        .map((token) => ({
          id: token.id,
          kind: token.kind,
          provisionalGid: token.provisionalGid,
          widthTiles: token.widthTiles,
          heightTiles: token.heightTiles,
          asset: token.asset,
        })),
    },
  }
}

async function renderLargeStaticMapForSmoke(
  dimensions: { readonly width?: number; readonly height?: number } = {},
): Promise<void> {
  const width = Math.min(128, Math.max(12, Math.round(dimensions.width ?? 96)))
  const height = Math.min(128, Math.max(10, Math.round(dimensions.height ?? 72)))
  const fixtureMap = largeStaticFixtureMap(width, height)

  await configureDevWorldGeometry(fixtureMap)
  applyFixtureMap(fixtureMap, {
    source: "generated",
    mapId: "generated",
    label: "Renderer stress map",
    prompt: "Large generated static map renderer smoke",
    keywords: ["large", "renderer", "stress"],
    validation: validFixtureValidation(fixtureMap),
  })
}

async function runBigMapBenchmarkForSmoke(): Promise<BigMapBenchmarkResult> {
  const benchmarkMaps = [
    { size: "20x15", width: 20, height: 15 },
    { size: "50x40", width: 50, height: 40 },
    { size: "100x80", width: 100, height: 80 },
  ] as const
  const samples: BigMapBenchmarkSample[] = []

  for (let pass = 1; pass <= 2; pass += 1) {
    for (const benchmarkMap of benchmarkMaps) {
      await renderLargeStaticMapForSmoke(benchmarkMap)
      await renderer.advanceTime()
      const performance = renderer.getPerformanceInfo()
      samples.push({
        pass,
        size: benchmarkMap.size,
        performance,
        staticTileCount: renderer.getCapabilityInfo().tilemap.staticTileCount,
        objectCount: renderer.getCapabilityInfo().depth.objectCount,
        mapRenderDurationMs: performance.runtime.lastMapRenderDurationMs,
      })
    }
  }

  const firstLargeMap = samples.find(
    (sample) => sample.pass === 1 && sample.size === "100x80",
  )
  const secondLargeMap = samples.find(
    (sample) => sample.pass === 2 && sample.size === "100x80",
  )

  return {
    samples,
    gameInstanceIds: [
      ...new Set(
        samples.map((sample) => sample.performance.lifecycle.gameInstanceId),
      ),
    ],
    repeatedLargeMapDisplayObjectDelta:
      (secondLargeMap?.performance.runtime.displayObjectCount ?? 0) -
      (firstLargeMap?.performance.runtime.displayObjectCount ?? 0),
    repeatedLargeMapTextureDelta:
      (secondLargeMap?.performance.runtime.textureCount ?? 0) -
      (firstLargeMap?.performance.runtime.textureCount ?? 0),
  }
}

async function attemptInvalidMapForSmoke(): Promise<InvalidMapAttemptResult> {
  const before = {
    activeMapId: state.mapGeneration.mapId,
    mapRenderCount: renderer.getPerformanceInfo().lifecycle.mapRenderCount,
    renderFingerprint: renderer.getMapValidationInfo().renderFingerprint,
  }
  const invalidMap = invalidVisualFootprintFixtureMap()
  const preflight = renderer.preflightMap(invalidMap)
  const accepted = preflight.valid
  const error = preflight.valid
    ? undefined
    : `Renderer map preflight failed before Phaser mutation: ${preflight.errors.join(" ")}`

  await renderer.advanceTime()

  return {
    accepted,
    error,
    before,
    after: {
      activeMapId: state.mapGeneration.mapId,
      mapRenderCount: renderer.getPerformanceInfo().lifecycle.mapRenderCount,
      renderFingerprint: renderer.getMapValidationInfo().renderFingerprint,
    },
  }
}

async function renderDepthFixtureCaseForSmoke(
  caseId: DepthFixtureCaseId,
): Promise<DepthFixtureCaseResult> {
  const depthCase = depthFixtureCase(caseId)

  state.profile.avatarId = "cobalt"
  state.profile.displayName = "Depth Ada"
  await configureDevWorldGeometry(depthCase.fixtureMap)
  applyFixtureMap(depthCase.fixtureMap, {
    source: "generated",
    mapId: "generated",
    label: `Depth case: ${caseId}`,
    prompt: `Renderer depth smoke ${caseId}`,
    keywords: ["renderer", "depth", caseId],
    validation: validFixtureValidation(depthCase.fixtureMap),
  })
  state.joined = true
  state.position = depthCase.playerPosition
  state.direction = "down"
  resetClientMotion(state.position, state.direction)
  state.players.clear()
  seedLocalRenderedPlayer()
  const depthPlayer = state.players.get(state.playerId)
  if (depthPlayer) {
    state.players.set(state.playerId, {
      ...depthPlayer,
      entryAnimation: "none",
    })
  }
  renderPlayers()
  renderer.setCameraMode("fit_room")
  await renderer.advanceTime()

  return {
    id: caseId,
    expectedLayerAtSample: depthCase.expectedLayerAtSample,
    sample: depthCase.sample,
    sampleViewport: renderer.projectWorldToViewport(depthCase.sample),
    playerPosition: depthCase.playerPosition,
    occluderTokenId: depthCase.occluderTokenId,
  }
}

async function renderAvatarFixtureCaseForSmoke(): Promise<AvatarFixtureResult> {
  const fixtureMap = avatarFixtureMap()
  const players: readonly RenderedPlayer[] = [
    {
      playerId: "avatar-ember",
      name: "Ember Ada",
      avatarId: "ember",
      position: tileCenter(3, 3, fixtureMap.compiled.tileSize),
      direction: "down",
      local: true,
    },
    {
      playerId: "avatar-cobalt",
      name: "Cobalt Grace",
      avatarId: "cobalt",
      position: tileCenter(6, 3, fixtureMap.compiled.tileSize),
      direction: "right",
      local: false,
      emoteId: "wave",
    },
    {
      playerId: "avatar-moss",
      name: "Moss Lin",
      avatarId: "moss",
      position: tileCenter(3, 6, fixtureMap.compiled.tileSize),
      direction: "left",
      local: false,
    },
    {
      playerId: "avatar-violet",
      name: "Violet Kim",
      avatarId: "violet",
      position: tileCenter(6, 6, fixtureMap.compiled.tileSize),
      direction: "up",
      local: false,
    },
  ]

  await configureDevWorldGeometry(fixtureMap)
  applyFixtureMap(fixtureMap, {
    source: "generated",
    mapId: "generated",
    label: "Avatar fixture",
    prompt: "Renderer avatar system fixture",
    keywords: ["renderer", "avatar"],
    validation: validFixtureValidation(fixtureMap),
  })
  state.joined = true
  state.position = players[0].position
  state.direction = players[0].direction
  resetClientMotion(state.position, state.direction)
  state.profile.avatarId = "ember"
  state.profile.displayName = "Ember Ada"
  state.players.clear()
  players.forEach((player) => state.players.set(player.playerId, player))
  renderPlayers()
  await renderer.advanceTime()

  return {
    playerIds: players.map((player) => player.playerId),
    avatarIds: players.map((player) => player.avatarId as AvatarId),
    directions: players.map((player) => player.direction),
  }
}

async function moveAvatarFixturePlayerForSmoke(
  playerId: string,
  position: Vector2,
  direction: Direction,
): Promise<void> {
  const player = state.players.get(playerId)
  if (!player) throw new Error(`Missing avatar fixture player ${playerId}.`)

  state.players.set(playerId, {
    ...player,
    position,
    direction,
    emoteId: undefined,
  })
  renderPlayers()
  await renderer.advanceTime()
}

async function renderZoneFixtureCaseForSmoke(): Promise<ZoneFixtureResult> {
  const fixtureMap = zoneFixtureMap()

  await configureDevWorldGeometry(fixtureMap)
  applyFixtureMap(fixtureMap, {
    source: "generated",
    mapId: "generated",
    label: "Zone fixture",
    prompt: "Renderer zone presentation fixture",
    keywords: ["renderer", "zone"],
    validation: validFixtureValidation(fixtureMap),
  })
  state.joined = true
  state.position = fixtureSpawnPosition(fixtureMap, "default")
  state.direction = "down"
  resetClientMotion(state.position, state.direction)
  state.players.clear()
  seedLocalRenderedPlayer()
  renderPlayers()
  updateActiveZoneFromPosition()
  await renderer.advanceTime()

  return {
    zoneIds: fixtureMap.compiled.zones.map((zone) => zone.id),
    zoneTypes: fixtureMap.compiled.zones.map((zone) => zone.zoneType),
  }
}

async function moveLocalPlayerForSmoke(position: Vector2): Promise<void> {
  state.position = position
  clientMotion.reconcile(position, { force: true })
  upsertRenderedPlayer({
    playerId: state.playerId,
    position,
    direction: state.direction,
  })
  renderPlayers()
  updateActiveZoneFromPosition()
  await renderer.advanceTime()
}

async function requestMoveForSmoke(
  vector: MovementVector,
  direction: Direction,
  movementMode: MovementMode = "walk",
): Promise<void> {
  if (!state.joined) {
    throw new Error("Cannot request a smoke movement before joining the world.")
  }

  await move(vector, direction, movementMode)
  await renderer.advanceTime()
}

function depthFixtureCase(caseId: DepthFixtureCaseId): {
  readonly fixtureMap: FixtureMap
  readonly expectedLayerAtSample: "avatar" | "object"
  readonly sample: Vector2
  readonly playerPosition: Vector2
  readonly occluderTokenId: string
} {
  const tableCase = caseId.startsWith("table")
  const playerPosition =
    caseId === "table_player_front"
      ? { x: 144, y: 162 }
      : { x: 144, y: 148 }
  const sample =
    caseId === "table_player_front"
      ? { x: 144, y: 158 }
      : { x: 144, y: 144 }
  const occluderTokenId = tableCase
    ? "item.large_conference_table"
    : "wall.wood.straight"

  return {
    fixtureMap: depthFixtureMap({
      table: tableCase,
      playerPosition,
      occluderTokenId,
    }),
    expectedLayerAtSample: caseId === "table_player_front" ? "avatar" : "object",
    sample,
    playerPosition,
    occluderTokenId,
  }
}

function avatarFixtureMap(): FixtureMap {
  const width = 12
  const height = 10
  const tileSize = starterVisualAssetCatalog.tileSize
  const floorToken = visualTokenById("floor.wood_parquet")
  const wallToken = visualTokenById("wall.neutral.straight")
  const cornerToken = visualTokenById("wall.neutral.corner")
  const floor = gridOf(width, height, floorToken.provisionalGid)
  const walls = gridOf(width, height, 0)
  const objects = gridOf(width, height, 0)
  const blockedTiles: Vector2[] = []

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1
      if (!edge) continue

      const corner =
        (x === 0 || x === width - 1) && (y === 0 || y === height - 1)
      walls[y][x] = corner ? cornerToken.provisionalGid : wallToken.provisionalGid
      blockedTiles.push({ x, y })
    }
  }

  return {
    definition: {
      style: "cozy_wood",
    },
    compiled: {
      width,
      height,
      tileSize,
      blockedTiles,
      layers: {
        floor: { gids: floor },
        walls: { gids: walls },
        objects: { gids: objects },
      },
      zones: [],
    },
    spawnPoints: [
      {
        id: "default",
        position: tileCenter(3, 3, tileSize),
      },
      {
        id: "guest",
        position: tileCenter(6, 3, tileSize),
      },
    ],
    catalog: {
      tokens: [floorToken, wallToken, cornerToken],
    },
  }
}

function zoneFixtureMap(): FixtureMap {
  const width = 14
  const height = 10
  const tileSize = starterVisualAssetCatalog.tileSize
  const floorToken = visualTokenById("floor.polished_concrete")
  const wallToken = visualTokenById("wall.glass.straight")
  const cornerToken = visualTokenById("wall.glass.corner")
  const doorToken = visualTokenById("item.door_single")
  const floor = gridOf(width, height, floorToken.provisionalGid)
  const walls = gridOf(width, height, 0)
  const objects = gridOf(width, height, 0)
  const blockedTiles: Vector2[] = []

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1
      if (!edge) continue

      const corner =
        (x === 0 || x === width - 1) && (y === 0 || y === height - 1)
      walls[y][x] = corner ? cornerToken.provisionalGid : wallToken.provisionalGid
      blockedTiles.push({ x, y })
    }
  }

  objects[7][2] = doorToken.provisionalGid

  return {
    definition: {
      style: "clean_glass",
    },
    compiled: {
      width,
      height,
      tileSize,
      blockedTiles,
      layers: {
        floor: { gids: floor },
        walls: { gids: walls },
        objects: { gids: objects },
      },
      zones: [
        {
          id: "meeting-zone",
          xStart: 2,
          yStart: 2,
          xEnd: 5,
          yEnd: 5,
          zoneType: "meeting_private",
        },
        {
          id: "private-zone",
          xStart: 7,
          yStart: 2,
          xEnd: 11,
          yEnd: 5,
          zoneType: "private",
        },
        {
          id: "portal-door",
          xStart: 2,
          yStart: 6,
          xEnd: 5,
          yEnd: 8,
          zoneType: "portal",
        },
        {
          id: "quiet-zone",
          xStart: 7,
          yStart: 6,
          xEnd: 12,
          yEnd: 8,
          zoneType: "quiet",
        },
      ],
    },
    spawnPoints: [
      {
        id: "default",
        position: tileCenter(3, 3, tileSize),
      },
      {
        id: "guest",
        position: tileCenter(9, 3, tileSize),
      },
    ],
    catalog: {
      tokens: [floorToken, wallToken, cornerToken, doorToken],
    },
  }
}

function depthFixtureMap(options: {
  readonly table: boolean
  readonly playerPosition: Vector2
  readonly occluderTokenId: string
}): FixtureMap {
  const width = 10
  const height = 8
  const tileSize = starterVisualAssetCatalog.tileSize
  const floorToken = visualTokenById("floor.wood_parquet")
  const occluderToken = visualTokenById(options.occluderTokenId)
  const floor = gridOf(width, height, floorToken.provisionalGid)
  const walls = gridOf(width, height, 0)
  const objects = gridOf(width, height, 0)
  const blockedTiles: Vector2[] = []

  if (options.table) {
    objects[3][3] = occluderToken.provisionalGid
    for (let y = 3; y < 5; y += 1) {
      for (let x = 3; x < 6; x += 1) {
        blockedTiles.push({ x, y })
      }
    }
  } else {
    walls[4][4] = occluderToken.provisionalGid
    blockedTiles.push({ x: 4, y: 4 })
  }

  return {
    definition: {
      style: "cozy_wood",
    },
    compiled: {
      width,
      height,
      tileSize,
      blockedTiles,
      layers: {
        floor: { gids: floor },
        walls: { gids: walls },
        objects: { gids: objects },
      },
      zones: [],
    },
    spawnPoints: [
      {
        id: "default",
        position: options.playerPosition,
      },
      {
        id: "guest",
        position: { x: options.playerPosition.x + 48, y: options.playerPosition.y },
      },
    ],
    catalog: {
      tokens: [floorToken, occluderToken],
    },
  }
}

function largeStaticFixtureMap(width: number, height: number): FixtureMap {
  const tileSize = starterVisualAssetCatalog.tileSize
  const floorToken = visualTokenById("floor.wood_parquet")
  const wallToken = visualTokenById("wall.wood.straight")
  const cornerToken = visualTokenById("wall.wood.corner")
  const plantToken = visualTokenById("item.plant_potted")
  const chairToken = visualTokenById("item.office_chair")
  const floor = gridOf(width, height, floorToken.provisionalGid)
  const walls = gridOf(width, height, 0)
  const objects = gridOf(width, height, 0)
  const blockedTiles: Vector2[] = []
  const spawnTiles = new Set([
    `${Math.floor(width / 2)},${Math.floor(height / 2)}`,
    `${Math.floor(width / 2) + 2},${Math.floor(height / 2)}`,
  ])

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1
      if (!edge) continue

      const corner =
        (x === 0 || x === width - 1) && (y === 0 || y === height - 1)
      walls[y][x] = corner ? cornerToken.provisionalGid : wallToken.provisionalGid
      blockedTiles.push({ x, y })
    }
  }

  for (let y = 3; y < height - 3; y += 6) {
    for (let x = 3; x < width - 3; x += 8) {
      if (spawnTiles.has(`${x},${y}`)) continue

      const token = (x + y) % 2 === 0 ? plantToken : chairToken
      objects[y][x] = token.provisionalGid
      blockedTiles.push({ x, y })
    }
  }

  return {
    definition: {
      style: "cozy_wood",
    },
    compiled: {
      width,
      height,
      tileSize,
      blockedTiles,
      layers: {
        floor: { gids: floor },
        walls: { gids: walls },
        objects: { gids: objects },
      },
      zones: [
        {
          id: "stress-zone",
          xStart: 4,
          yStart: 4,
          xEnd: Math.max(5, width - 4),
          yEnd: Math.max(5, height - 4),
          zoneType: "meeting_private",
        },
      ],
    },
    spawnPoints: [
      {
        id: "default",
        position: tileCenter(Math.floor(width / 2), Math.floor(height / 2), tileSize),
      },
      {
        id: "guest",
        position: tileCenter(
          Math.floor(width / 2) + 2,
          Math.floor(height / 2),
          tileSize,
        ),
      },
    ],
    catalog: {
      tokens: [floorToken, wallToken, cornerToken, plantToken, chairToken],
    },
  }
}

function invalidVisualFootprintFixtureMap(): FixtureMap {
  const generated = compileDeterministicPromptMap(DEFAULT_MAP_PROMPT)
  const fixtureMap = fixtureMapFromCompiledMap(generated)
  const tableToken = visualTokenById("item.large_conference_table")
  const objects = fixtureMap.compiled.layers.objects.gids.map((row) => [...row])
  const invalidX = fixtureMap.compiled.width - 1
  const invalidY = fixtureMap.compiled.height - 1

  objects[invalidY][invalidX] = tableToken.provisionalGid

  return {
    ...fixtureMap,
    compiled: {
      ...fixtureMap.compiled,
      layers: {
        ...fixtureMap.compiled.layers,
        objects: {
          ...fixtureMap.compiled.layers.objects,
          gids: objects,
        },
      },
    },
    catalog: {
      tokens: fixtureMap.catalog.tokens.some((token) => token.id === tableToken.id)
        ? fixtureMap.catalog.tokens
        : [...fixtureMap.catalog.tokens, tableToken],
    },
  }
}

function visualTokenById(id: string): FixtureToken {
  const token = starterVisualAssetCatalog.tokens.find(
    (candidate) => candidate.id === id,
  )

  if (!token) throw new Error(`Missing visual token ${id}.`)

  return {
    id: token.id,
    kind: token.kind,
    provisionalGid: token.provisionalGid,
    widthTiles: token.widthTiles,
    heightTiles: token.heightTiles,
    asset: token.asset,
  }
}

function gridOf(width: number, height: number, gid: number): number[][] {
  return Array.from({ length: height }, () => Array(width).fill(gid))
}

function tileCenter(x: number, y: number, tileSize: number): Vector2 {
  return {
    x: x * tileSize + tileSize / 2,
    y: y * tileSize + tileSize / 2,
  }
}

function collisionMapForFixtureMap(fixtureMap: FixtureMap) {
  return {
    width: fixtureMap.compiled.width * fixtureMap.compiled.tileSize,
    height: fixtureMap.compiled.height * fixtureMap.compiled.tileSize,
    tileSize: fixtureMap.compiled.tileSize,
    blockedTiles: fixtureMap.compiled.blockedTiles,
  }
}

async function configureDevWorldGeometry(fixtureMap: FixtureMap): Promise<void> {
  await postJson("/dev/world-geometry", {
    map: collisionMapForFixtureMap(fixtureMap),
    zones: fixtureMap.compiled.zones.map((zone) => ({
      id: zone.id,
      bounds: {
        x: zone.xStart * fixtureMap.compiled.tileSize,
        y: zone.yStart * fixtureMap.compiled.tileSize,
        width: (zone.xEnd - zone.xStart) * fixtureMap.compiled.tileSize,
        height: (zone.yEnd - zone.yStart) * fixtureMap.compiled.tileSize,
      },
    })),
  })
}

function applyEvents(events: readonly WorldEvent[]): void {
  events
    .filter((event) => eventVisibleToClient(event))
    .forEach((event) => applyServerMessage(event.message))
}

function applyServerMessage(message: ServerMessage): void {
  if ("type" in message && message.type === "player_state") {
    const position = { x: message.x, y: message.y }
    const localPlayerMoved = message.playerId === state.playerId

    if (localPlayerMoved) {
      observeServerMovementProtocol(message)
      const reconciliation = reconcileClientMovementPrediction(
        position,
        message.seqAck,
        false,
      )
      state.position = position
      state.direction = message.direction
      clientMotion.reconcile(reconciliation?.replayTarget ?? position)
      state.lastMovementRejection = undefined
      logMovementDebug(
        "server",
        `seq=${message.seqAck ?? "-"} pos=${formatMovementVector(position)} facing=${message.direction} ${formatServerMovementTelemetry(message)}`,
      )
    }

    if (message.playerId === state.companion.playerId) {
      state.companion.position = position
      state.companion.direction = message.direction
    }

    upsertRenderedPlayer({
      playerId: message.playerId,
      position,
      direction: message.direction,
      movementMode: message.movementMode,
    })
    renderPlayers()
    if (localPlayerMoved) {
      updateActiveZoneFromPosition()
    }
    recordEvent(`Moved ${message.direction} to ${Math.round(message.x)}, ${Math.round(message.y)}`)
    return
  }

  if ("type" in message && message.type === "movement_rejected") {
    applyMovementRejection(message)
    return
  }

  if ("type" in message && message.type === "world_snapshot") {
    applyRealtimeWorldSnapshot(message)
    return
  }

  if ("type" in message && message.type === "chat_delivered") {
    state.lastChatBody = message.body
    addChatMessage(message.body, message.recipientPlayerIds.length)
    return
  }

  if ("type" in message && message.type === "protocol_error") {
    if (isRecoverableProtocolError(message)) {
      recoverFromWorldLoss("unknown_client")
      return
    }
    recordEvent(`Protocol warning: ${message.message}`)
    publishToast("The room could not apply that update.", "warning")
    return
  }

  if ("reason" in message && message.reason) {
    recordEvent(`Server rejected message: ${message.reason}`)
    publishToast("The room could not apply that action.", "warning")
  }
}

function eventVisibleToClient(event: WorldEvent): boolean {
  if (event.type === "broadcast") return event.exceptClientId !== state.clientId
  return Array.isArray(event.clientIds) && event.clientIds.includes(state.clientId)
}

function reconcileClientMovementPrediction(
  authoritativePosition: Vector2,
  seqAck: number | undefined,
  rejected: boolean,
): MovementReconciliationResult | undefined {
  const pending = state.movementPrediction.pending
  const ackIndex =
    seqAck === undefined
      ? pending.length - 1
      : pending.findIndex((prediction) => prediction.seq === seqAck)

  if (ackIndex < 0) return undefined

  const acknowledged = pending[ackIndex]
  const unacknowledged = pending.slice(ackIndex + 1)
  const correctionPx = movementPredictionCorrectionPx(
    acknowledged,
    authoritativePosition,
  )
  const replay = replayPendingMovementPredictions(
    authoritativePosition,
    unacknowledged,
  )
  const replayCorrectionPx = vectorDistancePx(
    authoritativePosition,
    replay.target,
  )

  state.movementPrediction.pending = replay.predictions
  state.movementPrediction.active = replay.predictions.at(-1)
  state.movementPrediction.last = acknowledged
  state.movementPrediction.lastAckSeq = acknowledged.seq
  state.movementPrediction.lastCorrectionPx = Number(correctionPx.toFixed(2))
  state.movementPrediction.lastReplayCount = replay.predictions.length
  state.movementPrediction.totalReplayed += replay.predictions.length
  state.movementPrediction.lastReplayCorrectionPx = Number(
    replayCorrectionPx.toFixed(2),
  )
  state.movementPrediction.lastReplayTarget = replay.target

  if (rejected) {
    state.movementPrediction.totalServerRejected += 1
    state.movementPrediction.lastOutcome = "server_rejected"
    logMovementDebug(
      "reconcile",
      `seq=${acknowledged.seq} rejected correction=${state.movementPrediction.lastCorrectionPx} replay=${replay.predictions.length} pending=${formatPredictionSeqs(replay.predictions)}`,
    )
    return {
      acknowledged,
      authoritativePosition,
      replayTarget: replay.target,
      replayCount: replay.predictions.length,
      rejected,
    }
  }

  if (movementPredictionMatches(acknowledged, authoritativePosition)) {
    state.movementPrediction.totalConfirmed += 1
    state.movementPrediction.lastOutcome = "confirmed"
    logMovementDebug(
      "reconcile",
      `seq=${acknowledged.seq} confirmed correction=${state.movementPrediction.lastCorrectionPx} replay=${replay.predictions.length} pending=${formatPredictionSeqs(replay.predictions)}`,
    )
    return {
      acknowledged,
      authoritativePosition,
      replayTarget: replay.target,
      replayCount: replay.predictions.length,
      rejected,
    }
  }

  state.movementPrediction.totalCorrected += 1
  state.movementPrediction.lastOutcome = "corrected"
  logMovementDebug(
    "reconcile",
    `seq=${acknowledged.seq} corrected correction=${state.movementPrediction.lastCorrectionPx} replay=${replay.predictions.length} pending=${formatPredictionSeqs(replay.predictions)}`,
  )
  return {
    acknowledged,
    authoritativePosition,
    replayTarget: replay.target,
    replayCount: replay.predictions.length,
    rejected,
  }
}

function replayPendingMovementPredictions(
  authoritativePosition: Vector2,
  pending: readonly ClientMovementPrediction[],
): {
  readonly predictions: ClientMovementPrediction[]
  readonly target: Vector2
} {
  if (pending.length === 0) {
    return {
      predictions: [],
      target: authoritativePosition,
    }
  }

  if (!state.fixtureMap) {
    const predictions = trimMovementPredictionHistory(pending)
    return {
      predictions,
      target: predictions.at(-1)?.target ?? authoritativePosition,
    }
  }

  return replayMovementPredictions({
    from: authoritativePosition,
    predictions: pending,
    map: collisionMapForFixtureMap(state.fixtureMap),
    playerSize: movementCollisionBodySize(state.movementFeel),
    collisionSlide: movementCollisionSlideOptions(state.movementFeel),
  })
}

function vectorDistancePx(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function formatPredictionSeqs(
  predictions: readonly ClientMovementPrediction[],
): string {
  return predictions.map((prediction) => prediction.seq).join(",") || "-"
}

function seedLocalRenderedPlayer(): void {
  const motion = clientMotion.snapshot()

  upsertRenderedPlayer({
    playerId: state.playerId,
    position: clientMotion.renderedPosition(state.position),
    direction: clientMotion.renderedDirection(state.direction),
    movementMode: clientMotion.renderedMovementMode("walk"),
    cameraMotion: cameraMotionFromSnapshot(motion),
  })
}

function upsertRenderedPlayer(player: PlayerSnapshot): void {
  const snapshotPosition = playerSnapshotPosition(player)
  const local = player.playerId === state.playerId
  const position = local
    ? clientMotion.renderedPosition(snapshotPosition)
    : snapshotPosition
  const direction = local
    ? clientMotion.renderedDirection(player.direction ?? "down")
    : player.direction ?? "down"
  const movementMode = local
    ? clientMotion.renderedMovementMode(player.movementMode ?? "walk")
    : player.movementMode ?? "walk"

  state.players.set(player.playerId, {
    playerId: player.playerId,
    name: displayNameForPlayer(player),
    avatarId: avatarIdForPlayer(player),
    position,
    direction,
    movementMode,
    cameraMotion: local
      ? player.cameraMotion ?? cameraMotionFromSnapshot(clientMotion.snapshot())
      : undefined,
    local,
    rejected: player.rejected,
  })
}

function cameraMotionFromSnapshot(
  snapshot: ClientMotionSnapshot,
): RendererCameraFollowMotion {
  return {
    velocity: snapshot.velocity,
    speedPxPerSecond: snapshot.speedPxPerSecond,
    inputActive: snapshot.inputActive,
    correcting: snapshot.correcting,
    movementMode: snapshot.movementMode,
  }
}

function renderPlayers(
  options: { readonly refreshCameraControls?: boolean } = {},
): void {
  const players = [...state.players.values()]
  renderer.updatePlayers(players)
  if (options.refreshCameraControls !== false) {
    renderCameraControls(renderer.getCameraState())
  }

  players.forEach((player) => {
    if (!player.rejected) return
    state.players.set(player.playerId, {
      ...player,
      rejected: false,
    })
  })
}

function displayNameForPlayer(player: Pick<PlayerSnapshot, "playerId" | "userId">): string {
  if (player.playerId === state.playerId) return displayNameForLocalProfile()
  if (player.playerId === state.companion.playerId) return state.companion.displayName
  if (player.userId) return titleCaseName(player.userId)
  return titleCaseName(player.playerId)
}

function avatarIdForPlayer(player: Pick<PlayerSnapshot, "playerId">): AvatarId {
  if (player.playerId === state.playerId) return state.profile.avatarId
  if (player.playerId === state.companion.playerId) return state.companion.avatarId
  return "moss"
}

function applyMovementRejection(
  message: Extract<ServerMessage, { type: "movement_rejected" }>,
): void {
  const position = { x: message.x, y: message.y }
  const direction =
    message.playerId === state.playerId
      ? inputController.lastDirectionOr(state.direction)
      : message.playerId === state.companion.playerId
        ? state.companion.direction
        : "down"
  const showFeedback = shouldShowMovementRejectionFeedback(message.reason)

  if (message.playerId === state.playerId) {
    observeServerMovementProtocol(message)
    const reconciliation = reconcileClientMovementPrediction(
      position,
      message.seqAck,
      true,
    )
    state.position = position
    state.direction = direction
    clientMotion.reconcile(reconciliation?.replayTarget ?? position, {
      rejected: !reconciliation || reconciliation.replayCount === 0,
    })
    logMovementDebug(
      "rejected",
      `seq=${message.seqAck ?? "-"} reason=${message.reason} pos=${formatMovementVector(position)} ${formatServerMovementTelemetry(message)}`,
    )
  }

  if (message.playerId === state.companion.playerId) {
    state.companion.position = position
    state.companion.direction = direction
  }

  upsertRenderedPlayer({
    playerId: message.playerId,
    position,
    direction,
    movementMode: message.movementMode,
    rejected: showFeedback,
  })
  renderPlayers()
  if (message.playerId === state.playerId) {
    updateActiveZoneFromPosition()
  }

  if (showFeedback) {
    publishToast(
      movementRejectionLabel(message.reason),
      message.reason === "collision" ? "info" : "warning",
    )
  }
}

function applyRealtimeWorldSnapshot(
  message: Extract<ServerMessage, { type: "world_snapshot" }>,
): void {
  const snapshotIds = new Set(message.players.map((player) => player.playerId))
  state.snapshotPlayerIds = [...snapshotIds]
  state.companion.joined = snapshotIds.has(state.companion.playerId)

  for (const player of message.players) {
    const position = { x: player.x, y: player.y }
    const localPlayer = player.playerId === state.playerId

    if (localPlayer) {
      const reconciliation =
        player.lastSeqAck > (state.movementPrediction.lastAckSeq ?? -1)
          ? reconcileClientMovementPrediction(position, player.lastSeqAck, false)
          : undefined

      state.position = position
      state.direction = player.direction
      if (reconciliation) {
        clientMotion.reconcile(reconciliation.replayTarget)
      }
    }

    if (player.playerId === state.companion.playerId) {
      state.companion.position = position
      state.companion.direction = player.direction
    }

    upsertRenderedPlayer({
      playerId: player.playerId,
      userId: player.userId,
      position,
      direction: player.direction,
      movementMode: player.movementMode,
    })
  }

  for (const playerId of state.players.keys()) {
    if (!snapshotIds.has(playerId)) {
      state.players.delete(playerId)
    }
  }

  renderPlayers()
  updateActiveZoneFromPosition()
}

function shouldShowMovementRejectionFeedback(
  reason: MovementRejectedReason,
): boolean {
  const nowMs = Date.now()
  const previous = state.lastMovementRejection
  const changedReason = previous?.reason !== reason
  const outsideCooldown =
    previous === undefined || nowMs - previous.atMs >= MOVEMENT_REJECTION_FEEDBACK_MS

  if (!changedReason && !outsideCooldown) return false

  state.lastMovementRejection = {
    reason,
    atMs: nowMs,
  }
  return true
}

function movementRejectionLabel(reason: MovementRejectedReason): string {
  switch (reason) {
    case "collision":
      return "Bumped into wall or furniture"
    case "zone_permission":
      return "This zone is not open yet"
    case "speed_limit":
      return "Step held back to match server pace"
    case "unknown_player":
      return "Rejoin needed before moving"
    case "invalid_message":
      return "Move request could not be used"
  }
}

function renderCameraControls(camera: RendererCameraState): void {
  elements.zoomReset.textContent = `${Math.round(camera.zoomFactor * 100)}%`
  elements.zoomOut.disabled = !camera.canZoomOut
  elements.zoomIn.disabled = !camera.canZoomIn
  elements.cameraFollow.setAttribute(
    "aria-pressed",
    String(camera.mode === "follow_player"),
  )
  elements.cameraFit.setAttribute(
    "aria-pressed",
    String(camera.mode === "fit_room"),
  )
  elements.zoomPreset.value = camera.zoomPreset
}

function isRendererZoomPresetId(
  zoomPreset: string,
): zoomPreset is RendererZoomPresetId {
  return ["room", "standard", "near", "focus", "custom"].includes(zoomPreset)
}

function renderMapSwitcher(): void {
  const activeMapId = state.mapGeneration.mapId

  elements.mapSwitcherButtons.forEach((button) => {
    const mapId = button.dataset.mapId as MapSwitcherId | undefined
    const pressed = mapId === activeMapId
    const generatedDisabled = mapId === "generated" && !state.generatedRoom

    button.disabled = generatedDisabled
    button.setAttribute("aria-pressed", String(pressed))
    button.setAttribute("aria-disabled", String(generatedDisabled))
  })

  elements.generatedMapAvailability.textContent =
    activeMapId === "generated"
      ? "Current room"
      : state.generatedRoom
        ? "Ready to open"
        : "Create one first"
}

function renderIdentityControls(): void {
  const displayName = displayNameForLocalProfile()

  elements.avatarButtons.forEach((button) => {
    const pressed = button.dataset.avatarId === state.profile.avatarId
    button.setAttribute("aria-pressed", String(pressed))
  })
  elements.previewAvatar.textContent = initialsForName(displayName)
  elements.localPreview.dataset.avatarId = state.profile.avatarId
}

function setLifecycleStatus(
  phase: LifecyclePhase,
  message: string,
  publicMessage?: string,
  detail?: string,
  recoveryReason?: string,
): void {
  state.lifecycle = {
    phase,
    message,
    publicMessage: publicMessage ?? lifecyclePublicMessage(phase, message),
    detail,
    lastRecoveryReason: recoveryReason,
  }
  renderLifecycleStatus()
}

function renderLifecycleStatus(): void {
  elements.lifecycleBanner.dataset.state = state.lifecycle.phase
  elements.lifecycleStatus.textContent = state.lifecycle.publicMessage
  renderStageOverlay()
}

function setRendererReadiness(readiness: RendererReadiness): void {
  state.rendererReadiness = readiness
  elements.map.dataset.loading = String(readiness === "loading")
  renderStageOverlay()
}

function lifecyclePublicMessage(
  phase: LifecyclePhase,
  message: string,
): string {
  switch (phase) {
    case "empty":
      return message.includes("ready") ? message : roomReadyLabel()
    case "joining":
      return "Entering office..."
    case "joined":
      return message
    case "leaving":
      return "Leaving office..."
    case "map_reloading":
      return "Preparing room..."
    case "recovering":
      return "Rejoin needed"
  }
}

interface StageOverlayContent {
  readonly state: StageOverlayState
  readonly kicker: string
  readonly title: string
  readonly body: string
  readonly hidden: boolean
}

function renderStageOverlay(): void {
  const content = stageOverlayContent()

  elements.stageOverlay.hidden = content.hidden
  elements.stageOverlay.dataset.state = content.state
  elements.stageOverlayKicker.textContent = content.kicker
  elements.stageOverlayTitle.textContent = content.title
  elements.stageOverlayBody.textContent = content.body
}

function stageOverlayContent(): StageOverlayContent {
  if (state.rendererReadiness === "loading") {
    return {
      state: "loading",
      kicker: "Starting renderer",
      title: "Preparing office",
      body: "The map is loading. Controls will be ready shortly.",
      hidden: false,
    }
  }

  if (state.rendererReadiness === "failed") {
    return {
      state: "error",
      kicker: "Office view",
      title: "Renderer unavailable",
      body: "Refresh the page or try again shortly.",
      hidden: false,
    }
  }

  switch (state.lifecycle.phase) {
    case "joining":
      return {
        state: "loading",
        kicker: "Joining room",
        title: "Entering office",
        body: "Creating your local session and joining the shared room.",
        hidden: false,
      }
    case "leaving":
      return {
        state: "reloading",
        kicker: "Leaving room",
        title: "Closing session",
        body: "Clearing live room state and returning to the room preview.",
        hidden: false,
      }
    case "map_reloading":
      return {
        state: "reloading",
        kicker: "Room update",
        title: state.lifecycle.publicMessage,
        body: "The map and local room state are being prepared.",
        hidden: false,
      }
    case "recovering":
      return {
        state: "recovery",
        kicker: "Room recovery",
        title: state.lifecycle.publicMessage,
        body: "The live room state changed. Rejoin to continue from the current map.",
        hidden: false,
      }
    case "empty":
      return {
        state: "empty",
        kicker: "Room ready",
        title: state.lifecycle.publicMessage,
        body: "Enter the office when you are ready. The room is idle.",
        hidden: false,
      }
    case "joined":
      return {
        state: "hidden",
        kicker: "",
        title: "",
        body: "",
        hidden: true,
      }
  }
}

function syncResponsiveToolSections(): void {
  const mobile = mobileLayoutQuery.matches

  elements.mobileCollapsibleSections.forEach((section) => {
    section.open = !mobile && !section.classList.contains("compact-tool")
  })
}

function renderMapGenerationResult(): void {
  const activeGenerated = state.mapGeneration.source === "generated"
  const previewMap = activeGenerated
    ? state.mapGeneration
    : state.generatedRoom?.mapGeneration
  const validation = previewMap?.validation
  const preview = previewMap?.preview ?? state.generatedPreview

  if (!previewMap || !validation) {
    setGeneratorPreviewState(
      "empty",
      "No generated room yet",
      "Pick an example or describe a room, then generate a playable map.",
    )
    elements.validationBlocked.textContent = "0"
    elements.validationSpawns.textContent = "0"
    elements.validationZones.textContent = "0"
    elements.validationSummary.textContent = "Custom room checks will appear here."
    return
  }

  const previewState = validation.valid ? "ready" : "review"
  const status = activeGenerated
    ? validation.valid
      ? `Generated ${generationLabel(previewMap.keywords)}`
      : "Generated map needs review"
    : previewMap
      ? "Generated room saved"
      : "No generated room yet"
  const detail = activeGenerated
    ? generatedRoomDetail(previewMap)
    : previewMap
      ? `Saved from: "${previewMap.prompt}"`
      : "Pick an example or describe a room, then generate a playable map."

  setGeneratorPreviewState(
    preview?.mode === "applied" && preview.previewMatchesRendered
      ? "ready"
      : previewState,
    status,
    preview ? `${detail} - ${previewDetail(preview)}` : detail,
  )
  elements.validationBlocked.textContent = `${validation.blockedTileCount} tiles`
  elements.validationSpawns.textContent = validation.valid
    ? `${validation.spawnCount} ready`
    : "Check"
  elements.validationZones.textContent = validation.valid
    ? `${validation.zoneCount} ready`
    : "Check"
  elements.validationSummary.textContent = validationHumanSummary(validation)
}

function updateActiveZoneFromPosition(): void {
  const position = clientMotion.renderedPosition(state.position)
  const zone = state.fixtureMap
    ? zoneContainingPoint(
        state.fixtureMap.compiled.zones,
        position,
        state.fixtureMap.compiled.tileSize,
      )
    : undefined
  const previousZoneId = state.activeZone?.id
  const nextZoneId = zone?.id

  state.activeZone = zone
  renderZonePresentation()
  if (!activeMeetingZone() && !state.mediaSession) {
    state.micEnabled = false
    state.cameraEnabled = false
  }

  if (previousZoneId !== nextZoneId) {
    if (state.mediaUnavailableMessage) {
      clearMediaUnavailable()
    }
    if (zone) {
      recordEvent(`Entered ${zoneDisplayName(zone)}`)
      if (state.joined && isMeetingZone(zone)) {
        publishToast(`Call available in ${zoneDisplayName(zone)}`, "info")
      }
    } else {
      recordEvent("Left meeting zone")
    }
  }

  if (state.meetingJoined && state.meetingZoneId !== nextZoneId) {
    leaveMeetingLocally("Left meeting zone")
    return
  }

  renderMeetingControls()
  renderMediaPanel()
}

function renderZonePresentation(): void {
  const activeZoneIds = state.activeZone ? [state.activeZone.id] : []
  const availableActionZoneIds =
    state.joined && state.activeZone && hasZoneActionAffordance(state.activeZone)
      ? [state.activeZone.id]
      : []
  const joinedZoneIds = state.meetingJoined && state.meetingZoneId
    ? [state.meetingZoneId]
    : []

  renderer.setZoneInteractionState({
    activeZoneIds,
    availableActionZoneIds,
    joinedZoneIds,
  })
}

function setGeneratorPreviewState(
  stateName: "empty" | "working" | "ready" | "review",
  status: string,
  detail: string,
): void {
  elements.generatedPreview.dataset.state = stateName
  elements.mapGenerationStatus.textContent = status
  elements.generatedPreviewDetail.textContent = detail
}

function generatedRoomDetail(mapGeneration: MapGenerationState): string {
  const features = generatedFeatureLabels(mapGeneration.keywords)

  return `Prompt: "${mapGeneration.prompt}" - Features: ${features}`
}

function previewDetail(preview: GeneratedMapPreviewState): string {
  if (preview.mode === "applied" && preview.previewMatchesRendered) {
    return "Preview matches the rendered room."
  }
  if (!preview.rendererPreflight.valid) {
    return `Preview blocked before rendering: ${preview.rendererPreflight.errors.join(" ")}`
  }
  return "Preview passed renderer preflight."
}

function generatedFeatureLabels(keywords: readonly string[]): string {
  const featureLabels: string[] = []
  const hasKeyword = (keyword: string) => keywords.includes(keyword)

  if (hasKeyword("cozy")) featureLabels.push("cozy")
  if (hasKeyword("wood")) featureLabels.push("wood walls")
  if (hasKeyword("coffee") && hasKeyword("bar")) {
    featureLabels.push("coffee bar")
  } else if (hasKeyword("coffee")) {
    featureLabels.push("coffee")
  }
  if (hasKeyword("plant")) featureLabels.push("plants")
  if (hasKeyword("couch")) featureLabels.push("couch")
  if (hasKeyword("door")) featureLabels.push("door")

  return featureLabels.length > 0 ? featureLabels.slice(0, 4).join(", ") : "workspace"
}

function validationHumanSummary(validation: PromptMapValidation): string {
  if (!validation.valid) {
    return `Needs review: ${validation.errors.join(" ")}`
  }

  if (validation.checks.length > 0) {
    const orderedCheckIds: PromptMapValidation["checks"][number]["id"][] = [
      "spawn_clearance",
      "zone_bounds",
      "collision_layer",
    ]
    const messageById = new Map(
      validation.checks
        .filter((check) => check.status === "pass")
        .map((check) => [check.id, check.message]),
    )

    return orderedCheckIds
      .map((id) => messageById.get(id))
      .filter((message): message is string => Boolean(message))
      .join(" ")
  }

  const spawnCopy =
    validation.spawnCount === 1
      ? "1 entry spot is clear"
      : `${validation.spawnCount} entry spots are clear`
  const zoneCopy =
    validation.zoneCount === 1
      ? "1 call area is ready"
      : `${validation.zoneCount} call areas are ready`

  return `${spawnCopy}, ${zoneCopy}, and walls/furniture are blocking movement correctly.`
}

function generationLabel(keywords: readonly string[]): string {
  const seats = keywords.find((keyword) => keyword.endsWith("-person")) ?? "meeting"
  const roomType = keywords.includes("meeting") ? "meeting room" : "room"

  return `${seats} ${roomType}`
}

function zoneContainingPoint(
  zones: readonly FixtureZone[],
  position: Vector2,
  tileSize: number,
): FixtureZone | undefined {
  return zones.find((zone) => {
    const left = zone.xStart * tileSize
    const top = zone.yStart * tileSize
    const right = zone.xEnd * tileSize
    const bottom = zone.yEnd * tileSize

    return (
      position.x >= left &&
      position.x < right &&
      position.y >= top &&
      position.y < bottom
    )
  })
}

function activeMeetingZone(): FixtureZone | undefined {
  return state.joined && state.activeZone && isMeetingZone(state.activeZone)
    ? state.activeZone
    : undefined
}

function meetingHintLabel(zone: FixtureZone | undefined): string {
  if (!state.joined) {
    return "Enter the office, then walk into a marked meeting area."
  }
  if (state.mediaRequestPending) {
    return "Asking the server for access to this zone call."
  }
  if (state.meetingJoined) {
    return "Call connected. Leaving the zone clears the local call state."
  }
  if (zone) {
    return "Call available here. Prepare mic/camera, then join when ready."
  }
  return "Walk into a highlighted meeting area to unlock call controls."
}

function mediaAvailabilityLabel(zone: FixtureZone | undefined): string {
  if (state.mediaRequestPending) {
    return "Checking server permission for this meeting zone."
  }
  if (state.mediaSession) {
    return "Server access granted. Device controls affect this call session."
  }
  if (state.mediaUnavailableMessage) {
    return state.mediaUnavailableMessage
  }
  if (zone) {
    return `Available because you are in ${zoneDisplayName(zone)}.`
  }
  return "Walk into a meeting zone to prepare mic and camera."
}

function canUseDeviceControls(): boolean {
  if (state.mediaRequestPending) return false
  if (state.mediaSession) return state.mediaSession.canPublish
  if (state.mediaUnavailableMessage) return false
  return Boolean(activeMeetingZone())
}

function renderMeetingControls(): void {
  const zone = state.activeZone
  const availableZone = activeMeetingZone()
  const canJoinMeeting = Boolean(availableZone) && !state.mediaRequestPending

  elements.meetingPanel.dataset.state = state.mediaRequestPending
    ? "pending"
    : state.meetingJoined
      ? "joined"
      : availableZone
        ? "available"
        : "outside"
  elements.meetingStatus.textContent = state.mediaRequestPending
    ? "Requesting call access"
    : state.meetingJoined
      ? `In ${meetingZoneLabel(state.meetingZoneId, zone)} call`
      : availableZone
        ? `Inside ${zoneDisplayName(availableZone)}`
        : "Outside meeting zone"
  elements.meetingHint.textContent = meetingHintLabel(availableZone)
  elements.joinMeeting.disabled = !canJoinMeeting || state.meetingJoined
  elements.joinMeeting.textContent = state.meetingJoined
    ? "In call"
    : state.mediaRequestPending
      ? "Joining..."
      : "Join call"
  elements.leaveMeeting.disabled = !state.meetingJoined
  elements.leaveMeeting.textContent = "Leave call"
}

function toggleMic(): void {
  if (!canUseDeviceControls()) {
    publishToast("Walk into a meeting zone before changing mic state", "warning")
    return
  }

  state.micEnabled = !state.micEnabled
  renderMediaPanel()
  publishToast(state.micEnabled ? "Mic ready" : "Mic muted", "info")
}

function toggleCamera(): void {
  if (!canUseDeviceControls()) {
    publishToast("Walk into a meeting zone before changing camera state", "warning")
    return
  }

  state.cameraEnabled = !state.cameraEnabled
  renderMediaPanel()
  publishToast(state.cameraEnabled ? "Camera ready" : "Camera off", "info")
}

function clearMediaSession(): void {
  state.mediaSession = undefined
  state.micEnabled = false
  state.cameraEnabled = false
  state.lastMediaRoom = undefined
  clearMediaUnavailable()
}

function clearMediaUnavailable(): void {
  state.mediaUnavailableMessage = undefined
  state.mediaUnavailableDetail = undefined
}

function setMediaUnavailable(message: string, detail?: string): void {
  state.mediaUnavailableMessage = message
  state.mediaUnavailableDetail = detail
  setConnectionStatus("media", "blocked", "Media unavailable")
  publishToast(message, "warning")
  renderMediaPanel()
}

function renderMediaPanel(): void {
  const session = state.mediaSession
  const availableZone = activeMeetingZone()
  const devicesAvailable = canUseDeviceControls()
  const tokenState = state.mediaRequestPending
    ? "Requesting access"
    : session
      ? "Access granted"
      : state.mediaUnavailableMessage
        ? "Unavailable"
      : availableZone
        ? `Available because you are in ${zoneDisplayName(availableZone)}`
        : "Enter a meeting zone"
  const panelState = state.mediaRequestPending
    ? "pending"
    : session
      ? "ready"
      : state.mediaUnavailableMessage
        ? "blocked"
      : availableZone
        ? "available"
        : "idle"

  elements.mediaPanel.dataset.state = panelState
  elements.mediaPanelStatus.textContent = state.mediaRequestPending
    ? "Requesting access"
    : session
      ? "Connected"
      : state.mediaUnavailableMessage
        ? "Unavailable"
      : availableZone
        ? "Available in zone"
        : "Inactive"
  elements.mediaAvailability.textContent = mediaAvailabilityLabel(availableZone)
  elements.mediaRoom.textContent =
    session?.room ??
    (availableZone
      ? zoneDisplayName(availableZone)
      : state.mediaUnavailableMessage
        ? "Unavailable"
        : "Not joined")
  elements.mediaEndpoint.textContent =
    session?.liveKitUrl ??
    (state.mediaUnavailableMessage
      ? "Try again from this zone"
      : availableZone
        ? "Ready after Join"
        : "Not joined")
  elements.mediaParticipants.textContent = session
    ? String(session.participantPlayerIds.length)
    : availableZone
      ? "Join to see"
      : "0"
  elements.mediaTokenStatus.textContent = session?.expiresAt
    ? `${tokenState}, ${formatMediaExpiry(session.expiresAt)}`
    : tokenState

  elements.toggleMic.disabled = !devicesAvailable
  elements.toggleMic.textContent = state.micEnabled
    ? session
      ? "Mic on"
      : "Mic ready"
    : "Mic muted"
  elements.toggleMic.setAttribute("aria-pressed", String(state.micEnabled))
  elements.toggleCamera.disabled = !devicesAvailable
  elements.toggleCamera.textContent = state.cameraEnabled
    ? session
      ? "Camera on"
      : "Camera ready"
    : "Camera off"
  elements.toggleCamera.setAttribute("aria-pressed", String(state.cameraEnabled))

  elements.localPreview.dataset.camera = state.cameraEnabled ? "on" : "off"
  elements.localPreview.dataset.avatarId = state.profile.avatarId
  elements.previewAvatar.textContent = initialsForName(displayNameForLocalProfile())
  elements.previewStatus.textContent = session
    ? state.cameraEnabled
      ? "Camera on"
      : state.micEnabled
        ? "Mic on"
        : "Muted"
    : state.mediaRequestPending
      ? "Requesting access"
      : state.mediaUnavailableMessage
        ? "Call unavailable"
      : availableZone
        ? state.cameraEnabled
          ? "Camera ready"
          : state.micEnabled
            ? "Mic ready"
            : "Devices ready"
        : "Enter zone"
}

function recoverFromWorldLoss(reason: string): void {
  const alreadyRecovering = state.lifecycle.phase === "recovering"

  stopHeldMovement()
  state.seq = 1
  state.movementPrediction = initialMovementPredictionState()
  state.joined = false
  state.companion.joined = false
  state.companion.direction = "down"
  state.snapshotPlayerIds = []
  state.activeZone = undefined
  state.meetingJoined = false
  state.meetingZoneId = undefined
  state.mediaRequestPending = false
  state.lastMovementRejection = undefined
  worldSync.disconnect()
  clearMediaSession()
  chatMessages.length = 0
  renderChatMessages()
  state.players.clear()

  if (state.fixtureMap) {
    state.position = fixtureSpawnPosition(state.fixtureMap, "default")
    state.companion.position = fixtureSpawnPosition(state.fixtureMap, "guest")
  }

  state.direction = "down"
  resetClientMotion(state.position, state.direction)
  seedLocalRenderedPlayer()
  renderPlayers()
  renderZonePresentation()
  setConnectionStatus(
    "session",
    state.sessionId ? "ready" : "idle",
    state.sessionId ? "Connected" : "Disconnected",
  )
  setConnectionStatus("world", "blocked", "Rejoin required")
  setConnectionStatus("media", "idle", "Media off")
  setLifecycleStatus(
    "recovering",
    "World restarted, rejoin needed",
    "Rejoin needed",
    `World session recovery requested: ${reason}`,
    reason,
  )
  elements.start.textContent = "Rejoin office"
  elements.start.disabled = false
  elements.reset.disabled = true
  renderMeetingControls()
  renderMediaPanel()

  if (!alreadyRecovering) {
    publishToast("World server restarted. Rejoin to continue.", "warning")
  }
}

function roomReadyLabel(label = state.mapGeneration.label): string {
  return `${label} ready, room empty`
}

function roomOccupancyLabel(totalPlayers = state.players.size): string {
  if (totalPlayers <= 0) return "Room empty"
  if (totalPlayers === 1) return "Only you in room"
  return `${totalPlayers} users in room`
}

function isMeetingZone(zone: FixtureZone): boolean {
  return zone.zoneType.includes("meeting")
}

function hasZoneActionAffordance(zone: FixtureZone): boolean {
  const raw = `${zone.zoneType} ${zone.id}`.toLowerCase()

  return (
    isMeetingZone(zone) ||
    raw.includes("private") ||
    raw.includes("portal") ||
    raw.includes("door")
  )
}

function meetingZoneLabel(zoneId: string | undefined, currentZone: FixtureZone | undefined): string {
  if (currentZone && currentZone.id === zoneId) return zoneDisplayName(currentZone)
  return zoneId ? titleCaseName(zoneId) : "meeting"
}

function zoneDisplayName(zone: FixtureZone): string {
  return titleCaseName(zone.id)
}

function formatMediaExpiry(expiresAt: string): string {
  const expires = new Date(expiresAt)

  if (Number.isNaN(expires.getTime())) return "expires soon"

  return `expires ${expires.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`
}

function setConnectionStatus(
  target: "session" | "world" | "media",
  stateValue: StatusState,
  label: string,
): void {
  const status =
    target === "session"
      ? elements.sessionStatus
      : target === "world"
        ? elements.worldStatus
        : elements.mediaStatus
  const pill =
    target === "session"
      ? elements.sessionPill
      : target === "world"
        ? elements.worldPill
        : elements.mediaPill

  status.textContent = label
  pill.dataset.state = stateValue
}

function addChatMessage(body: string, recipientCount: number): void {
  chatMessages.unshift({
    id: `chat-${Date.now()}-${chatMessages.length}`,
    body,
    recipientCount,
  })
  chatMessages.splice(MAX_CHAT_MESSAGES)
  renderChatMessages()
  recordEvent(`Chat delivered to ${recipientCount} recipient(s)`)
}

function renderChatMessages(): void {
  elements.chatMessages.replaceChildren(
    ...chatMessages.map((message) => {
      const item = document.createElement("li")
      const body = document.createElement("span")
      const meta = document.createElement("small")

      body.textContent = message.body
      meta.textContent = `${message.recipientCount} recipient${
        message.recipientCount === 1 ? "" : "s"
      }`
      item.append(body, meta)
      return item
    }),
  )
  elements.chatStatus.textContent =
    chatMessages.length === 0
      ? "No messages yet"
      : `${chatMessages.length} recent message${chatMessages.length === 1 ? "" : "s"}`
}

function publishToast(message: string, tone: ToastTone = "info"): void {
  recordEvent(message)

  const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const toast = document.createElement("div")
  toast.className = `toast toast-${tone}`
  toast.dataset.toastId = id
  toast.textContent = message
  elements.toastRegion.prepend(toast)

  toasts.set(
    id,
    window.setTimeout(() => removeToast(id), TOAST_TTL_MS),
  )

  while (elements.toastRegion.childElementCount > MAX_TOASTS) {
    const last = elements.toastRegion.lastElementChild as HTMLElement | null
    if (!last?.dataset.toastId) break
    removeToast(last.dataset.toastId)
  }
}

function removeToast(id: string): void {
  const timer = toasts.get(id)
  if (timer !== undefined) {
    window.clearTimeout(timer)
    toasts.delete(id)
  }
  elements.toastRegion
    .querySelector<HTMLElement>(`[data-toast-id="${id}"]`)
    ?.remove()
}

function recordEvent(message: string): void {
  recentEvents.unshift(message)
  recentEvents.splice(MAX_RECENT_EVENTS)
}

function logMovementDebug(label: string, detail: string): void {
  movementDebugRecords.unshift({
    atMs: Date.now(),
    label,
    detail,
  })
  movementDebugRecords.splice(80)
  renderMovementDebugLog()
}

function renderMovementDebugLog(): void {
  elements.movementDebugLog.replaceChildren(
    ...movementDebugRecords.map((record) => {
      const item = document.createElement("li")
      item.textContent = movementDebugLine(record)
      return item
    }),
  )
}

async function copyMovementDebugLog(): Promise<void> {
  const text = movementDebugRecords.map(movementDebugLine).join("\n")

  try {
    await navigator.clipboard.writeText(text)
    elements.movementDebugCopy.textContent = "Copied"
  } catch {
    elements.movementDebugCopy.textContent = "Select"
    elements.movementDebugLog.focus()
  } finally {
    window.setTimeout(() => {
      elements.movementDebugCopy.textContent = "Copy"
    }, 1200)
  }
}

function movementDebugLine(record: MovementDebugRecord): string {
  return `${new Date(record.atMs).toLocaleTimeString()} ${record.label}: ${record.detail}`
}

function formatMovementVector(vector: Vector2 | MovementVector): string {
  return `${formatMovementNumber(vector.x)},${formatMovementNumber(vector.y)}`
}

function formatServerMovementTelemetry(
  message: {
    readonly requestedVector?: MovementVector
    readonly appliedVector?: MovementVector
    readonly collisionSlide?: boolean
    readonly collisionSlideAxis?: "x" | "y" | "corner"
    readonly collisionSlideDistancePx?: number
    readonly movementMode?: MovementMode
    readonly speedPxPerSecond?: number
  },
): string {
  const requested = message.requestedVector
    ? formatMovementVector(message.requestedVector)
    : "legacy/missing"
  const applied = message.appliedVector
    ? formatMovementVector(message.appliedVector)
    : "legacy/missing"
  const slide = message.collisionSlide ?? "legacy/missing"
  const slideAxis = message.collisionSlideAxis ?? "-"
  const slideDistance =
    message.collisionSlideDistancePx !== undefined
      ? formatMovementNumber(message.collisionSlideDistancePx)
      : "-"
  const mode = message.movementMode ?? "legacy/missing"
  const speed = message.speedPxPerSecond ?? "legacy/missing"

  return `serverMode=${mode} serverSpeed=${speed} serverRequested=${requested} serverApplied=${applied} serverSlide=${slide} serverSlideAxis=${slideAxis} serverSlideDistance=${slideDistance}`
}

function observeServerMovementProtocol(message: {
  readonly seqAck?: number
  readonly requestedVector?: MovementVector
  readonly appliedVector?: MovementVector
  readonly collisionSlide?: boolean
}): void {
  if (hasServerMovementTelemetry(message)) {
    if (state.serverProtocolMismatch) {
      state.serverProtocolMismatch = undefined
      setConnectionStatus("world", "ready", "In room")
      logMovementDebug("protocol", "server movement telemetry restored")
    }
    return
  }

  const firstMismatch = !state.serverProtocolMismatch
  state.serverProtocolMismatch = {
    kind: "movement_vector_telemetry_missing",
    detectedAtMs: Date.now(),
    lastSeqAck: message.seqAck,
  }
  setConnectionStatus("world", "blocked", "Update server")

  if (!firstMismatch) return

  logMovementDebug(
    "protocol",
    "server vector telemetry missing; stop and restart npm run dev:http",
  )
  publishToast("World server is outdated. Restart npm run dev:http.", "warning")
}

function hasServerMovementTelemetry(message: {
  readonly requestedVector?: MovementVector
  readonly appliedVector?: MovementVector
  readonly collisionSlide?: boolean
}): boolean {
  return (
    message.requestedVector !== undefined &&
    message.appliedVector !== undefined &&
    typeof message.collisionSlide === "boolean"
  )
}

function formatMovementNumber(value: number): string {
  return Number(value.toFixed(3)).toString()
}

function titleCaseName(value: string): string {
  return value
    .replace(/^wikimedia-/, "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ")
}

function displayNameForLocalProfile(): string {
  const trimmed = state.profile.displayName.trim().replace(/\s+/g, " ")
  return trimmed ? trimmed.slice(0, 24) : DEFAULT_DISPLAY_NAME
}

function initialsForName(value: string): string {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const initials =
    parts.length >= 2
      ? `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`
      : value.slice(0, 2)

  return initials.toUpperCase() || "BA"
}

function isAvatarId(value: string | undefined): value is AvatarId {
  return avatarIds.includes(value as AvatarId)
}

function fixtureSpawnPosition(fixtureMap: FixtureMap, spawnId: string): Vector2 {
  const spawn = fixtureMap.spawnPoints.find((candidate) => candidate.id === spawnId)
  return spawn ? spawn.position : state.position
}

class HttpJsonError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string,
    readonly path: string,
  ) {
    super(reason)
    this.name = "HttpJsonError"
  }
}

async function postJson<T = Record<string, unknown>>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const parsed = await parseJsonResponse(response)

  if (!response.ok) {
    throw new HttpJsonError(
      response.status,
      parsed.reason ?? `HTTP ${response.status}`,
      path,
    )
  }

  return parsed as T
}

async function parseJsonResponse(response: Response): Promise<{ reason?: string }> {
  try {
    return (await response.json()) as { reason?: string }
  } catch {
    return {}
  }
}

function isRecoverableWorldError(error: unknown): boolean {
  return (
    error instanceof HttpJsonError &&
    (error.reason === "unknown_client" ||
      error.reason === "unknown_player" ||
      error.reason.includes("not admitted"))
  )
}

function isRecoverableProtocolError(
  message: Extract<ServerMessage, { type: "protocol_error" }>,
): boolean {
  return message.message.includes("not admitted")
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error"
}

function technicalErrorDetail(error: unknown): string {
  if (error instanceof HttpJsonError) {
    return `${error.path} returned ${error.status}: ${error.reason}`
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }
  return "Unknown error"
}

function friendlyActionError(error: unknown): string {
  if (error instanceof HttpJsonError) {
    if (error.path.includes("world-geometry")) {
      return "The room could not be prepared. Try switching rooms again."
    }
    if (error.path.includes("world")) {
      return "The room action could not be completed. Rejoin if it continues."
    }
    if (error.path.includes("media")) {
      return "Call media is unavailable. You can keep using the room."
    }
    if (error.status >= 500) {
      return "The local server could not complete that action."
    }
  }

  if (error instanceof TypeError) {
    return "The local server is unavailable. Check that the demo stack is running."
  }

  return "That office action could not be completed."
}

async function postMediaToken(body: Record<string, unknown>): Promise<MediaTokenResponse> {
  const response = await fetch("/media/media-token", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const parsed = (await response.json()) as { status?: string; reason?: string }

  if (parsed.status === "denied") {
    return {
      status: "denied",
      reason: parsed.reason,
    }
  }

  if (!response.ok) {
    throw new Error(parsed.reason ?? `HTTP ${response.status}`)
  }

  const issued = parsed as {
    readonly status?: string
    readonly liveKitUrl?: unknown
    readonly token?: unknown
    readonly room?: unknown
    readonly canPublish?: unknown
    readonly canSubscribe?: unknown
    readonly participantPlayerIds?: unknown
    readonly expiresAt?: unknown
  }

  if (issued.status === "issued" && typeof issued.room === "string") {
    return {
      status: "issued",
      liveKitUrl:
        typeof issued.liveKitUrl === "string" ? issued.liveKitUrl : "unknown",
      token: typeof issued.token === "string" ? issued.token : "",
      room: issued.room,
      canPublish: issued.canPublish === true,
      canSubscribe: issued.canSubscribe === true,
      participantPlayerIds: Array.isArray(issued.participantPlayerIds)
        ? issued.participantPlayerIds.filter(
            (playerId): playerId is string => typeof playerId === "string",
          )
        : [],
      expiresAt:
        typeof issued.expiresAt === "string"
          ? issued.expiresAt
          : new Date(Date.now()).toISOString(),
    }
  }

  throw new Error("Invalid media token response")
}

function queueAction(action: () => Promise<void>): Promise<void> {
  state.pendingAction = state.pendingAction
    .then(action)
    .catch((error: unknown) => {
      recordEvent(`Action failed: ${technicalErrorDetail(error)}`)
      publishToast(friendlyActionError(error), "error")
    })
  return state.pendingAction
}

function initialDevToolsState(): DevToolsAppState {
  const gated = devToolsGateEnabled()
  const params = currentSearchParams()
  const overlays = DEV_TOOL_OVERLAY_IDS.reduce(
    (result, overlayId) => ({
      ...result,
      [overlayId]: gated && params.get(devToolQueryParam(overlayId)) === "1",
    }),
    {} as RendererDevToolOverlayState,
  )

  return {
    gated,
    enabled: gated && params.get("devtools") !== "0",
    activeFixtureId: "lobby",
    lastAction: gated ? "Developer tools enabled" : undefined,
    overlays,
  }
}

function syncRendererDevTools(): void {
  renderer.setDevToolsState({
    gated: state.devTools.gated,
    enabled: state.devTools.enabled,
    overlays: state.devTools.overlays,
    fixtureSelector: {
      enabled: state.devTools.gated,
      activeFixtureId: state.devTools.activeFixtureId,
      availableFixtureIds: DEV_TOOL_FIXTURES,
    },
  })
}

function installDevToolsKeyboardShortcuts(): void {
  document.addEventListener(
    "keydown",
    (event) => {
      if (!state.devTools.gated || !event.altKey || !event.shiftKey) return

      const key = event.key.toLowerCase()
      let handled = true

      switch (key) {
        case "t":
          state.devTools.enabled = !state.devTools.enabled
          state.devTools.lastAction = state.devTools.enabled
            ? "Enabled renderer developer tools"
            : "Disabled renderer developer tools"
          syncRendererDevTools()
          break
        case "g":
          toggleDevToolOverlay("grid")
          break
        case "c":
          toggleDevToolOverlay("collision")
          break
        case "z":
          toggleDevToolOverlay("zones")
          break
        case "d":
          toggleDevToolOverlay("depth")
          break
        case "b":
          toggleDevToolOverlay("spriteBounds")
          break
        case "r":
          toggleDevToolOverlay("camera")
          break
        case "f":
          queueAction(() => selectRelativeDevFixture(1))
          break
        case "v":
          queueAction(() => selectRelativeDevFixture(-1))
          break
        default:
          handled = false
      }

      if (!handled) return
      event.preventDefault()
      event.stopImmediatePropagation()
    },
    { capture: true },
  )
}

function toggleDevToolOverlay(overlayId: RendererDevToolOverlayId): void {
  state.devTools.enabled = true
  state.devTools.overlays = {
    ...state.devTools.overlays,
    [overlayId]: !state.devTools.overlays[overlayId],
  }
  state.devTools.lastAction = `${state.devTools.overlays[overlayId] ? "Enabled" : "Disabled"} ${overlayId} overlay`
  syncRendererDevTools()
}

async function applyInitialDevFixture(): Promise<void> {
  syncRendererDevTools()
  if (!state.devTools.gated) return

  const fixtureId = devToolFixtureFromParam(currentSearchParams().get("devFixture"))
  if (!fixtureId || fixtureId === "lobby") return
  await selectDevFixture(fixtureId)
}

async function selectRelativeDevFixture(offset: number): Promise<void> {
  const activeFixtureId = state.devTools.activeFixtureId ?? "lobby"
  const activeIndex = DEV_TOOL_FIXTURES.indexOf(activeFixtureId)
  const nextIndex =
    (Math.max(0, activeIndex) + offset + DEV_TOOL_FIXTURES.length) %
    DEV_TOOL_FIXTURES.length

  await selectDevFixture(DEV_TOOL_FIXTURES[nextIndex])
}

async function selectDevFixture(fixtureId: DevToolFixtureId): Promise<void> {
  if (!state.devTools.gated) return

  state.devTools.enabled = true
  state.devTools.activeFixtureId = fixtureId
  state.devTools.lastAction = `Selected fixture ${fixtureId}`
  syncRendererDevTools()

  switch (fixtureId) {
    case "lobby":
    case "meeting_room":
    case "lounge_cafe":
      await switchToPresetMap(fixtureId, { announce: false })
      break
    case "generated":
      await switchToGeneratedDevFixture()
      break
    case "depth_table_player_behind":
      await renderDepthFixtureCaseForSmoke("table_player_behind")
      break
    case "depth_table_player_front":
      await renderDepthFixtureCaseForSmoke("table_player_front")
      break
    case "depth_wall_player_behind":
      await renderDepthFixtureCaseForSmoke("wall_player_behind")
      break
    case "avatar_fixture":
      await renderAvatarFixtureCaseForSmoke()
      break
    case "zone_fixture":
      await renderZoneFixtureCaseForSmoke()
      break
    case "stress_20x15":
      await renderLargeStaticMapForSmoke({ width: 20, height: 15 })
      break
    case "stress_50x40":
      await renderLargeStaticMapForSmoke({ width: 50, height: 40 })
      break
    case "stress_100x80":
      await renderLargeStaticMapForSmoke({ width: 100, height: 80 })
      break
  }

  state.devTools.activeFixtureId = fixtureId
  syncRendererDevTools()
  await renderer.advanceTime()
}

async function switchToGeneratedDevFixture(): Promise<void> {
  if (!state.generatedRoom) {
    const generated = compileDeterministicPromptMap(DEFAULT_MAP_PROMPT)
    const fixtureMap = fixtureMapFromCompiledMap(generated)
    const preview = generatedPreviewForFixtureMap(fixtureMap, "preflight")
    const mapGeneration = {
      source: "generated" as const,
      mapId: "generated" as const,
      label: "Generated room",
      prompt: DEFAULT_MAP_PROMPT,
      keywords: generated.keywords,
      validation: generated.validation,
      preview,
    }
    state.generatedPreview = preview
    state.generatedRoom = {
      fixtureMap,
      mapGeneration,
    }
  }

  await switchToFixtureMap(
    state.generatedRoom.fixtureMap,
    state.generatedRoom.mapGeneration,
  )
}

function devToolsGateEnabled(): boolean {
  if (!localAutomationHost()) return false

  const params = currentSearchParams()
  return (
    params.get("devtools") === "1" ||
    window.localStorage.getItem("aedventure.devtools") === "1"
  )
}

function currentSearchParams(): URLSearchParams {
  return new URLSearchParams(window.location.search)
}

function devToolQueryParam(overlayId: RendererDevToolOverlayId): string {
  switch (overlayId) {
    case "grid":
      return "devGrid"
    case "collision":
      return "devCollision"
    case "zones":
      return "devZones"
    case "depth":
      return "devDepth"
    case "spriteBounds":
      return "devSpriteBounds"
    case "camera":
      return "devCamera"
  }
}

function devToolFixtureFromParam(value: string | null): DevToolFixtureId | undefined {
  if (!value) return undefined
  return DEV_TOOL_FIXTURES.includes(value as DevToolFixtureId)
    ? (value as DevToolFixtureId)
    : undefined
}

function directionForKey(key: string): Direction | undefined {
  switch (key) {
    case "ArrowUp":
    case "w":
    case "W":
      return "up"
    case "ArrowDown":
    case "s":
    case "S":
      return "down"
    case "ArrowLeft":
    case "a":
    case "A":
      return "left"
    case "ArrowRight":
    case "d":
    case "D":
      return "right"
    default:
      return undefined
  }
}

function eventTargetConsumesMovementKeys(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  )
}

function movementPredictionTextState() {
  const prediction = state.movementPrediction
  const playerSize = movementCollisionBodySize(state.movementFeel)

  return {
    mode: "client_prediction_server_reconciliation",
    maxStepMs: CLIENT_PREDICTION_MAX_STEP_MS,
    historyLimit: CLIENT_INPUT_HISTORY_LIMIT,
    collisionBody: {
      radiusPx: state.movementFeel.collisionBodyRadiusPx,
      width: Number(playerSize.width.toFixed(2)),
      height: Number(playerSize.height.toFixed(2)),
      slideMaxNudgePx: state.movementFeel.collisionSlideMaxNudgePx,
    },
    active: Boolean(prediction.active),
    seq: prediction.active?.seq,
    pendingCount: prediction.pending.length,
    pendingSeqs: prediction.pending.map((pending) => pending.seq),
    direction: prediction.active?.direction,
    movementMode: prediction.active?.movementMode,
    lastSeq: prediction.last?.seq,
    lastAckSeq: prediction.lastAckSeq,
    lastDirection: prediction.last?.direction,
    lastMovementMode: prediction.last?.movementMode,
    requestedVector: prediction.active
      ? roundedVector(prediction.active.requestedVector)
      : undefined,
    lastRequestedVector: prediction.last
      ? roundedVector(prediction.last.requestedVector)
      : undefined,
    appliedVector: prediction.active
      ? roundedVector(prediction.active.appliedVector)
      : undefined,
    lastAppliedVector: prediction.last
      ? roundedVector(prediction.last.appliedVector)
      : undefined,
    collisionSlide: prediction.active?.collisionSlide ?? false,
    collisionSlideAxis: prediction.active?.collisionSlideAxis,
    collisionSlideDistancePx: prediction.active?.collisionSlideDistancePx,
    lastCollisionSlide: prediction.last?.collisionSlide ?? false,
    lastCollisionSlideAxis: prediction.last?.collisionSlideAxis,
    lastCollisionSlideDistancePx: prediction.last?.collisionSlideDistancePx,
    blockedLocally: prediction.active?.blockedLocally ?? false,
    lastBlockedLocally: prediction.last?.blockedLocally ?? false,
    from: prediction.active
      ? roundedVector(prediction.active.from)
      : undefined,
    attempted: prediction.active
      ? roundedVector(prediction.active.attempted)
      : undefined,
    target: prediction.active
      ? roundedVector(prediction.active.target)
      : undefined,
    deltaMs: prediction.active
      ? Math.round(prediction.active.deltaMs)
      : undefined,
    distance: prediction.active
      ? Number(prediction.active.distance.toFixed(2))
      : undefined,
    speedPxPerSecond: prediction.active?.speedPxPerSecond,
    lastSpeedPxPerSecond: prediction.last?.speedPxPerSecond,
    lastOutcome: prediction.lastOutcome,
    totalPredicted: prediction.totalPredicted,
    totalConfirmed: prediction.totalConfirmed,
    totalCorrected: prediction.totalCorrected,
    totalClientBlocked: prediction.totalClientBlocked,
    totalServerRejected: prediction.totalServerRejected,
    totalReplayed: prediction.totalReplayed,
    lastReplayCount: prediction.lastReplayCount,
    lastCorrectionPx: prediction.lastCorrectionPx,
    lastReplayCorrectionPx: prediction.lastReplayCorrectionPx,
    lastReplayTarget: prediction.lastReplayTarget
      ? roundedVector(prediction.lastReplayTarget)
      : undefined,
  }
}

function clientMotionTextState() {
  const motion = clientMotion.snapshot()

  return {
    mode: "continuous_local_motion",
    active: motion.active,
    inputActive: motion.inputActive,
    correcting: motion.correcting,
    x: Number(motion.position.x.toFixed(3)),
    y: Number(motion.position.y.toFixed(3)),
    velocity: roundedVector(motion.velocity),
    speedPxPerSecond: motion.speedPxPerSecond,
    targetSpeedPxPerSecond: motion.targetSpeedPxPerSecond,
    direction: motion.direction,
    movementMode: motion.movementMode,
    lastFrameDeltaMs: motion.lastFrameDeltaMs,
    correctionPx: motion.correctionPx,
    feel: movementFeelTextState(),
  }
}

function movementFeelTextState() {
  return {
    source: "client_runtime_tuning",
    panelVisible: !elements.movementFeelPanel.hidden,
    controls: MOVEMENT_FEEL_CONTROLS.map((control) => ({
      key: control.key,
      label: control.label,
      value: state.movementFeel[control.key],
      min: control.min,
      max: control.max,
      step: control.step,
      unit: control.unit,
    })),
    values: {
      ...state.movementFeel,
    },
    defaults: {
      ...DEFAULT_MOVEMENT_FEEL,
    },
  }
}

function joystickTextState() {
  const joystick = inputController.snapshot().joystick

  return {
    available: true,
    primary: true,
    active: joystick.active,
    pointerId: joystick.pointerId,
    vector: roundedVector(joystick.vector),
    direction: joystick.direction,
    magnitude: joystick.magnitude,
    knob: roundedVector(joystick.knob),
    radiusPx: Number(joystick.radiusPx.toFixed(1)),
    deadzonePx: Number(joystick.deadzonePx.toFixed(1)),
    deadzoneRatio: JOYSTICK_DEADZONE_RATIO,
    minMagnitude: JOYSTICK_MIN_MAGNITUDE,
    dpadFallback: true,
  }
}

function roundedVector(position: Vector2): Vector2 {
  return {
    x: Number(position.x.toFixed(3)),
    y: Number(position.y.toFixed(3)),
  }
}

function renderDemoToText(): string {
  const overlay = stageOverlayContent()
  const realtime = worldSync.snapshot()
  const input = inputController.snapshot()

  return JSON.stringify({
    coordinateSystem: "pixel origin top-left, x right, y down",
    joined: state.joined,
    sessionStatus: elements.sessionStatus.textContent,
    worldStatus: elements.worldStatus.textContent,
    mediaStatus: elements.mediaStatus.textContent,
    controls: {
      joinDisabled: elements.start.disabled,
      resetDisabled: elements.reset.disabled,
      joinLabel: elements.start.textContent,
    },
    world: {
      status: elements.worldStatus.textContent,
      joined: state.joined,
      playerCount: state.players.size,
      snapshotPlayerIds: state.snapshotPlayerIds,
    },
    lifecycle: {
      phase: state.lifecycle.phase,
      message: state.lifecycle.message,
      publicMessage: state.lifecycle.publicMessage,
      detail: state.lifecycle.detail,
      lastRecoveryReason: state.lifecycle.lastRecoveryReason,
      rendererReadiness: state.rendererReadiness,
      stageOverlay: {
        state: overlay.state,
        hidden: overlay.hidden,
        title: overlay.title,
        body: overlay.body,
      },
      roomEmpty: !state.joined && state.snapshotPlayerIds.length === 0,
      occupancy: state.joined ? state.players.size : 0,
    },
    player: {
      id: state.playerId,
      clientId: state.clientId,
      name: displayNameForLocalProfile(),
      avatarId: state.profile.avatarId,
      x: Math.round(state.position.x),
      y: Math.round(state.position.y),
      visualX: Math.round(clientMotion.renderedPosition(state.position).x),
      visualY: Math.round(clientMotion.renderedPosition(state.position).y),
      direction: state.direction,
      visualDirection: clientMotion.renderedDirection(state.direction),
    },
    companion: {
      id: state.companion.playerId,
      name: state.companion.displayName,
      avatarId: state.companion.avatarId,
      joined: state.companion.joined,
      x: Math.round(state.companion.position.x),
      y: Math.round(state.companion.position.y),
      direction: state.companion.direction,
    },
    players: [...state.players.values()].map((player) => ({
      id: player.playerId,
      name: player.name,
      avatarId: player.avatarId,
      x: Math.round(player.position.x),
      y: Math.round(player.position.y),
      direction: player.direction,
      movementMode: player.movementMode ?? "walk",
      local: player.local,
      emoteId: player.emoteId,
    })),
    snapshotPlayerIds: state.snapshotPlayerIds,
    movement: {
      heldDirection: activeHeldDirection(),
      heldVector: activeHeldMovementIntent()?.vector,
      pendingVector: input.pendingIntent?.vector,
      pendingDirection: input.pendingIntent?.direction,
      pendingMovementMode: input.pendingIntent?.movementMode,
      movementMode: activeMovementMode(),
      runToggled: input.runToggled,
      shiftRunning: input.shiftRunning,
      inFlight: input.inFlight,
      lastRejectedReason: state.lastMovementRejection?.reason,
      serverProtocolMismatch: state.serverProtocolMismatch,
      repeatMs: MOVE_REPEAT_MS,
      rejectionFeedbackMs: MOVEMENT_REJECTION_FEEDBACK_MS,
      realtime,
      simulation: {
        mode: realtime.status === "open"
          ? "websocket_fixed_tick_snapshot_stream"
          : "http_request_response_fallback",
        inputHz: Number((1000 / MOVE_REPEAT_MS).toFixed(1)),
        clientInputMs: MOVE_REPEAT_MS,
        serverTickMs: realtime.serverTickMs,
        serverHz: realtime.serverTickMs
          ? Number((1000 / realtime.serverTickMs).toFixed(1))
          : undefined,
        snapshotCount: realtime.snapshotCount,
        lastSnapshotTick: realtime.lastSnapshotTick,
        lastSnapshotServerTime: realtime.lastSnapshotServerTime,
      },
      motion: clientMotionTextState(),
      feel: movementFeelTextState(),
      joystick: joystickTextState(),
      prediction: movementPredictionTextState(),
      debugLog: movementDebugRecords.map(movementDebugLine),
    },
    meeting: {
      activeZoneId: state.activeZone?.id,
      activeZoneType: state.activeZone?.zoneType,
      status: elements.meetingStatus.textContent,
      hint: elements.meetingHint.textContent,
      panelState: elements.meetingPanel.dataset.state,
      joined: state.meetingJoined,
      zoneId: state.meetingZoneId,
      joinDisabled: elements.joinMeeting.disabled,
      joinLabel: elements.joinMeeting.textContent,
      leaveDisabled: elements.leaveMeeting.disabled,
      leaveLabel: elements.leaveMeeting.textContent,
    },
    media: {
      panelStatus: elements.mediaPanelStatus.textContent,
      availability: elements.mediaAvailability.textContent,
      tokenIssued: Boolean(state.mediaSession),
      tokenStatus: elements.mediaTokenStatus.textContent,
      room: state.mediaSession?.room,
      liveKitUrl: state.mediaSession?.liveKitUrl,
      canPublish: state.mediaSession?.canPublish,
      canSubscribe: state.mediaSession?.canSubscribe,
      participantPlayerIds: state.mediaSession?.participantPlayerIds ?? [],
      unavailableMessage: state.mediaUnavailableMessage,
      unavailableDetail: state.mediaUnavailableDetail,
      mic: state.micEnabled ? "on" : "off",
      camera: state.cameraEnabled ? "on" : "off",
      micDisabled: elements.toggleMic.disabled,
      cameraDisabled: elements.toggleCamera.disabled,
      micLabel: elements.toggleMic.textContent,
      cameraLabel: elements.toggleCamera.textContent,
      previewStatus: elements.previewStatus.textContent,
    },
    layout: {
      mode: mobileLayoutQuery.matches ? "mobile" : "desktop",
      collapsibleSections: elements.mobileCollapsibleSections.map((section) => ({
        label: section.querySelector("summary")?.textContent?.trim() ?? "",
        open: section.open,
      })),
    },
    renderer: renderer.getCapabilityInfo(),
    engine: engineArchitectureTextState(),
    devTools: {
      gated: state.devTools.gated,
      enabled: state.devTools.enabled,
      activeFixtureId: state.devTools.activeFixtureId,
      availableFixtureIds: DEV_TOOL_FIXTURES,
      lastAction: state.devTools.lastAction,
      overlays: state.devTools.overlays,
      feelPanel: {
        visible: !elements.movementFeelPanel.hidden,
        controlCount: elements.movementFeelControls.querySelectorAll(
          "[data-feel-control]",
        ).length,
      },
      renderer: renderer.getDevToolsInfo(),
      primaryUiControlsExposed: document.querySelectorAll("[data-devtools-control]")
        .length,
    },
    effects: renderer.getEffectsInfo(),
    mapValidation: renderer.getMapValidationInfo(),
    performance: renderer.getPerformanceInfo(),
    avatars: renderer.getAvatarInfo(),
    zones: renderer.getZoneInfo(),
    camera: renderer.getCameraState(),
    viewport: renderer.getViewportState(),
    map: state.fixtureMap
      ? {
          renderer: "phaser",
          source: state.mapGeneration.source,
          activeMapId: state.mapGeneration.mapId,
          label: state.mapGeneration.label,
          availableMaps: [
            ...presetMapSummaries.map((preset) => ({
              id: preset.id,
              label: preset.label,
              disabled: false,
            })),
            {
              id: "generated",
              label: "Generated room",
              disabled: !state.generatedRoom,
            },
          ],
          generatedAvailable: Boolean(state.generatedRoom),
          generatedPreviewStatus: elements.mapGenerationStatus.textContent,
          generatedPreviewDetail: elements.generatedPreviewDetail.textContent,
          generatedPreview: state.mapGeneration.preview ?? state.generatedPreview,
          aiReadiness: {
            mdiSchema: "semantic_map_definition",
            rendererAgnostic: true,
            compilerOutputs: ["render_layers", "collision_layers", "zones"],
            previewMatchesRendered:
              state.mapGeneration.preview?.previewMatchesRendered ?? false,
          },
          validationSummary: elements.validationSummary.textContent,
          prompt: state.mapGeneration.prompt,
          keywords: state.mapGeneration.keywords,
          style: state.fixtureMap.definition.style,
          width: state.fixtureMap.compiled.width,
          height: state.fixtureMap.compiled.height,
          tileSize: state.fixtureMap.compiled.tileSize,
          blockedTileCount: state.fixtureMap.compiled.blockedTiles.length,
          zones: state.fixtureMap.compiled.zones.map((zone) => zone.id),
          validation: state.mapGeneration.validation
            ? {
                valid: state.mapGeneration.validation.valid,
                errors: state.mapGeneration.validation.errors,
                summary: state.mapGeneration.validation.summary,
                checks: state.mapGeneration.validation.checks,
                blockedTileCount: state.mapGeneration.validation.blockedTileCount,
                spawnCount: state.mapGeneration.validation.spawnCount,
                zoneCount: state.mapGeneration.validation.zoneCount,
                spawnIds: state.mapGeneration.validation.spawnIds,
                zoneIds: state.mapGeneration.validation.zoneIds,
              }
            : undefined,
        }
      : undefined,
    lastChatBody: state.lastChatBody,
    lastMediaRoom: state.lastMediaRoom,
    chat: {
      status: elements.chatStatus.textContent,
      messages: chatMessages.map((message) => ({
        body: message.body,
        recipientCount: message.recipientCount,
      })),
    },
    toasts: [...elements.toastRegion.querySelectorAll<HTMLElement>(".toast")].map(
      (toast) => toast.textContent,
    ),
    recentEvents: recentEvents.slice(0, 6),
  })
}

function engineArchitectureTextState() {
  return {
    source: "browser_engine_runtime",
    renderer: {
      host: "RendererHost",
      scene: "OfficeScene",
      modules: [
        "TilemapRenderer",
        "ObjectRenderer",
        "AvatarRenderer",
        "ZoneRenderer",
        "CameraController",
      ],
    },
    controllers: {
      input: "InputController",
      worldSync: "WorldSyncController",
    },
    boundaries: {
      phaserIsolatedBehindRendererHost: true,
      inputStateOwnedOutsideDomEvents: true,
      realtimeTransportOwnedByWorldSync: true,
    },
  }
}

function mustQuery<TElement extends Element>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector)
  if (!element) throw new Error(`Missing required element ${selector}`)
  return element
}

declare global {
  interface Window {
    render_game_to_text: () => string
    advanceTime: (ms?: number) => Promise<void>
    __aedventureRendererDevTools?: {
      setOverlay: (
        overlayId: RendererDevToolOverlayId,
        enabled: boolean,
      ) => Promise<void>
      selectFixture: (fixtureId: DevToolFixtureId) => Promise<void>
      state: () => unknown
    }
    __aedventureMovementFeel?: {
      setValue: (key: MovementFeelTuningKey, value: number) => unknown
      reset: () => unknown
      state: () => unknown
    }
    __aedventureRendererTest?: {
      renderLargeStaticMap: (dimensions?: {
        readonly width?: number
        readonly height?: number
      }) => Promise<void>
      runBigMapBenchmark: () => Promise<BigMapBenchmarkResult>
      attemptInvalidMap: () => Promise<InvalidMapAttemptResult>
      renderDepthFixtureCase: (
        caseId: DepthFixtureCaseId,
      ) => Promise<DepthFixtureCaseResult>
      renderAvatarFixtureCase: () => Promise<AvatarFixtureResult>
      moveAvatarFixturePlayer: (
        playerId: string,
        position: Vector2,
        direction: Direction,
      ) => Promise<void>
      triggerAvatarEmote: (
        playerId: string,
        emoteId: AvatarEmoteId,
      ) => Promise<void>
      renderZoneFixtureCase: () => Promise<ZoneFixtureResult>
      moveLocalPlayer: (position: Vector2) => Promise<void>
      requestMove: (
        vector: MovementVector,
        direction: Direction,
        movementMode?: MovementMode,
      ) => Promise<void>
      setZoneDebugOverlay: (enabled: boolean) => Promise<void>
      setRendererEffects: (options: RendererEffectsOptions) => Promise<void>
    }
  }
}

window.render_game_to_text = renderDemoToText
window.advanceTime = async () => {
  await state.pendingAction
  await renderer.advanceTime()
}

if (localAutomationHost()) {
  window.__aedventureRendererDevTools = {
    setOverlay: async (overlayId, enabled) => {
      if (!state.devTools.gated || !DEV_TOOL_OVERLAY_IDS.includes(overlayId)) {
        return
      }
      state.devTools.enabled = true
      state.devTools.overlays = {
        ...state.devTools.overlays,
        [overlayId]: enabled,
      }
      state.devTools.lastAction = `${enabled ? "Enabled" : "Disabled"} ${overlayId} overlay`
      syncRendererDevTools()
      await renderer.advanceTime()
    },
    selectFixture: async (fixtureId) => {
      if (!state.devTools.gated || !DEV_TOOL_FIXTURES.includes(fixtureId)) {
        return
      }
      await selectDevFixture(fixtureId)
    },
    state: () => JSON.parse(renderDemoToText()).devTools,
  }
}

if (localAutomationHost()) {
  window.__aedventureMovementFeel = {
    setValue: (key, value) => {
      if (!state.devTools.gated || !isMovementFeelTuningKey(key)) {
        return movementFeelTextState()
      }

      applyMovementFeelValue(key, value)
      return movementFeelTextState()
    },
    reset: () => {
      if (state.devTools.gated) {
        applyMovementFeel(DEFAULT_MOVEMENT_FEEL)
      }
      return movementFeelTextState()
    },
    state: movementFeelTextState,
  }
}

if (localAutomationHost()) {
  window.__aedventureRendererTest = {
    renderLargeStaticMap: renderLargeStaticMapForSmoke,
    runBigMapBenchmark: runBigMapBenchmarkForSmoke,
    attemptInvalidMap: attemptInvalidMapForSmoke,
    renderDepthFixtureCase: renderDepthFixtureCaseForSmoke,
    renderAvatarFixtureCase: renderAvatarFixtureCaseForSmoke,
    moveAvatarFixturePlayer: moveAvatarFixturePlayerForSmoke,
    triggerAvatarEmote: async (playerId, emoteId) => {
      renderer.triggerAvatarEmote(playerId, emoteId)
      await renderer.advanceTime()
    },
    renderZoneFixtureCase: renderZoneFixtureCaseForSmoke,
    moveLocalPlayer: moveLocalPlayerForSmoke,
    requestMove: requestMoveForSmoke,
    setZoneDebugOverlay: async (enabled) => {
      renderer.setZoneDebugOverlayEnabled(enabled)
      await renderer.advanceTime()
    },
    setRendererEffects: async (options) => {
      renderer.setEffectsOptions(options)
      await renderer.advanceTime()
    },
  }
}

function localAutomationHost(): boolean {
  return ["127.0.0.1", "localhost", "::1"].includes(window.location.hostname)
}

export {}
