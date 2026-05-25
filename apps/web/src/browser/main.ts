import {
  PhaserOfficeRenderer,
  type AvatarEmoteId,
  type RenderedPlayer,
  type RendererCameraState,
  type RendererDevToolOverlayId,
  type RendererDevToolOverlayState,
  type RendererEffectsOptions,
  type RendererPerformanceInfo,
  type RendererZoomPresetId,
} from "./phaser-office-renderer"
import { validateFixtureMapForRenderer } from "./renderer/map-render-validation"
import {
  createClientMovementPrediction,
  initialMovementPredictionState,
  movementPredictionCorrectionPx,
  movementPredictionMatches,
  type ClientMovementPrediction,
  type MovementPredictionState,
} from "./movement-prediction"
import {
  directionForMovementVector,
  isDirection,
  movementVectorForDirection,
  type Direction,
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
  lastMediaRoom?: string
  lastChatBody?: string
  lastMovementRejection?: {
    readonly reason: MovementRejectedReason
    readonly atMs: number
  }
  pendingAction: Promise<void>
}

interface MovementInputState {
  readonly pressedDirections: Direction[]
  readonly pressedControls: MovementControlIntent[]
  pendingIntent?: MovementIntent
  timerId?: number
  inFlight: boolean
  lastRequestedDirection?: Direction
}

interface MovementIntent {
  readonly vector: MovementVector
  readonly direction: Direction
}

interface MovementControlIntent {
  readonly id: number
  readonly vector: MovementVector
  readonly direction: Direction
  readonly button?: HTMLButtonElement
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

const MOVE_REPEAT_MS = 125
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
  lastMediaRoom: undefined,
  lastChatBody: undefined,
  lastMovementRejection: undefined,
  pendingAction: Promise.resolve(),
}
const movementInput: MovementInputState = {
  pressedDirections: [],
  pressedControls: [],
  pendingIntent: undefined,
  timerId: undefined,
  inFlight: false,
  lastRequestedDirection: undefined,
}
const recentEvents: string[] = []
const chatMessages: ChatRecord[] = []
const movementDebugRecords: MovementDebugRecord[] = []
const toasts = new Map<string, number>()

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
  movementDebugLog: mustQuery<HTMLOListElement>("#movement-debug-log"),
  movementDebugCopy: mustQuery<HTMLButtonElement>("#movement-debug-copy"),
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
document
  .querySelectorAll<HTMLButtonElement>("[data-move-x][data-move-y][data-facing]")
  .forEach((button) => installMovementControlButton(button))
elements.movementDebugCopy.addEventListener("click", () => {
  void copyMovementDebugLog()
})
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
renderLifecycleStatus()
syncResponsiveToolSections()

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

  const local = players.find((player) => player.playerId === state.playerId)
  if (local) {
    state.position = playerSnapshotPosition(local)
    state.direction = local.direction ?? state.direction
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
  state.players.clear()
  chatMessages.length = 0
  renderChatMessages()
  stopHeldMovement()
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

async function move(vector: MovementVector, direction: Direction): Promise<void> {
  if (!state.joined) return

  const seq = state.seq
  logMovementDebug(
    "send",
    `seq=${seq} vector=${formatMovementVector(vector)} facing=${direction} pos=${formatMovementVector(state.position)}`,
  )
  const prediction = beginClientMovementPrediction(vector, direction, seq)
  state.seq += 1

  let body: { events: readonly WorldEvent[] }
  try {
    body = await postJson<{ events: readonly WorldEvent[] }>("/world/message", {
      clientId: state.clientId,
      message: {
        type: "move",
        vector,
        direction,
        seq,
      },
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
  seq: number,
): ClientMovementPrediction | undefined {
  if (!state.fixtureMap) return undefined

  const prediction = createClientMovementPrediction({
    seq,
    vector,
    direction,
    from: state.position,
    map: collisionMapForFixtureMap(state.fixtureMap),
    lastSentAtMs: state.movementPrediction.lastSentAtMs,
    nowMs: Date.now(),
  })

  state.movementPrediction.active = prediction
  state.movementPrediction.last = prediction
  state.movementPrediction.lastSentAtMs = prediction.startedAtMs
  state.movementPrediction.lastCorrectionPx = undefined
  logMovementDebug(
    "predict",
    `seq=${seq} requested=${formatMovementVector(prediction.requestedVector)} applied=${formatMovementVector(prediction.appliedVector)} target=${formatMovementVector(prediction.target)} slide=${prediction.collisionSlide}`,
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
  })
  renderPlayers()
  return prediction
}

function applyClientMovementBlock(prediction: ClientMovementPrediction): void {
  const showFeedback = shouldShowMovementRejectionFeedback("collision")
  state.direction = prediction.direction
  upsertRenderedPlayer({
    playerId: state.playerId,
    position: prediction.from,
    direction: prediction.direction,
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
  if (!prediction || state.movementPrediction.active?.seq !== prediction.seq) return

  state.movementPrediction.active = undefined
  state.movementPrediction.totalCorrected += 1
  state.movementPrediction.lastOutcome = "corrected"
  state.movementPrediction.lastCorrectionPx = movementPredictionCorrectionPx(
    prediction,
    state.position,
  )
  upsertRenderedPlayer({
    playerId: state.playerId,
    position: state.position,
    direction: state.direction,
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
        `vector=${formatMovementVector(intent.vector)} facing=${intent.direction}`,
      )
      requestMove(intent.vector, intent.direction)
    }
  })
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
  }
}

function isControlVectorComponent(value: number): value is -1 | 0 | 1 {
  return value === -1 || value === 0 || value === 1
}

function pressDirection(direction: Direction): void {
  releaseDirection(direction)
  movementInput.pressedDirections.push(direction)
  startHeldMovement()
  requestMoveFromHeldInput()
}

function releaseDirection(direction: Direction): void {
  const index = movementInput.pressedDirections.indexOf(direction)
  if (index !== -1) {
    movementInput.pressedDirections.splice(index, 1)
  }

  if (!hasHeldMovementInput()) {
    stopHeldMovementTimer()
  }
}

function pressMovementControl(intent: MovementControlIntent): void {
  releaseMovementControl(intent.id)
  movementInput.pressedControls.push(intent)
  if (intent.button) {
    intent.button.dataset.active = "true"
  }
  startHeldMovement()
  requestMoveFromHeldInput()
}

function releaseMovementControl(id: number): void {
  const index = movementInput.pressedControls.findIndex(
    (intent) => intent.id === id,
  )
  if (index !== -1) {
    const [intent] = movementInput.pressedControls.splice(index, 1)
    if (intent?.button) {
      delete intent.button.dataset.active
    }
  }

  if (!hasHeldMovementInput()) {
    stopHeldMovementTimer()
  }
}

function startHeldMovement(): void {
  if (movementInput.timerId !== undefined) return

  movementInput.timerId = window.setInterval(() => {
    requestMoveFromHeldInput()
  }, MOVE_REPEAT_MS)
}

function stopHeldMovement(): void {
  movementInput.pressedDirections.length = 0
  movementInput.pressedControls.forEach((intent) => {
    if (intent.button) {
      delete intent.button.dataset.active
    }
  })
  movementInput.pressedControls.length = 0
  stopHeldMovementTimer()
}

function stopHeldMovementTimer(): void {
  if (movementInput.timerId !== undefined) {
    window.clearInterval(movementInput.timerId)
    movementInput.timerId = undefined
  }
}

function hasHeldMovementInput(): boolean {
  return (
    movementInput.pressedDirections.length > 0 ||
    movementInput.pressedControls.length > 0
  )
}

function activeHeldDirection(): Direction | undefined {
  return activeHeldMovementIntent()?.direction
}

function activeHeldMovementIntent():
  | {
      readonly vector: MovementVector
      readonly direction: Direction
    }
  | undefined {
  const pressed = new Set(movementInput.pressedDirections)
  const controlVector = movementInput.pressedControls.reduce(
    (result, intent) => ({
      x: clampMovementComponent(result.x + intent.vector.x),
      y: clampMovementComponent(result.y + intent.vector.y),
    }),
    { x: 0, y: 0 },
  )
  const vector = {
    x: clampMovementComponent(
      controlVector.x +
        (pressed.has("right") ? 1 : 0) +
        (pressed.has("left") ? -1 : 0),
    ),
    y: clampMovementComponent(
      controlVector.y +
        (pressed.has("down") ? 1 : 0) +
        (pressed.has("up") ? -1 : 0),
    ),
  }

  if (vector.x === 0 && vector.y === 0) return undefined
  const orderedIntents = [
    ...movementInput.pressedDirections.map((direction) => ({
      direction,
      vector: movementVectorForDirection(direction),
    })),
    ...movementInput.pressedControls,
  ]

  return {
    vector,
    direction:
      orderedIntents
        .filter((intent) => vectorIncludesIntent(vector, intent.vector))
        .at(-1)?.direction ?? directionForMovementVector(vector),
  }
}

function requestMoveFromHeldInput(): void {
  const intent = activeHeldMovementIntent()
  if (!intent) {
    logMovementDebug("intent", "none")
    return
  }
  logMovementDebug(
    "intent",
    `vector=${formatMovementVector(intent.vector)} facing=${intent.direction} keys=${movementInput.pressedDirections.join("+") || "-"} pads=${movementInput.pressedControls.length}`,
  )
  requestMove(intent.vector, intent.direction)
}

function vectorIncludesIntent(
  vector: MovementVector,
  intentVector: MovementVector,
): boolean {
  return (
    vectorComponentIncludesIntent(vector.x, intentVector.x) &&
    vectorComponentIncludesIntent(vector.y, intentVector.y) &&
    (intentVector.x !== 0 || intentVector.y !== 0)
  )
}

function vectorComponentIncludesIntent(
  value: number,
  intentValue: number,
): boolean {
  return intentValue === 0 || Math.sign(value) === Math.sign(intentValue)
}

function clampMovementComponent(value: number): -1 | 0 | 1 {
  if (value < 0) return -1
  if (value > 0) return 1
  return 0
}

function requestMove(vector: MovementVector, direction: Direction): void {
  if (!state.joined) {
    logMovementDebug(
      "ignore",
      `not_joined vector=${formatMovementVector(vector)} facing=${direction}`,
    )
    return
  }
  if (movementInput.inFlight) {
    movementInput.pendingIntent = { vector, direction }
    logMovementDebug(
      "queue",
      `in_flight vector=${formatMovementVector(vector)} facing=${direction}`,
    )
    return
  }

  movementInput.inFlight = true
  movementInput.lastRequestedDirection = direction
  void queueAction(() => move(vector, direction)).finally(() => {
    movementInput.inFlight = false
    const pendingIntent = movementInput.pendingIntent
    movementInput.pendingIntent = undefined
    if (pendingIntent) {
      logMovementDebug(
        "dequeue",
        `vector=${formatMovementVector(pendingIntent.vector)} facing=${pendingIntent.direction}`,
      )
      requestMove(pendingIntent.vector, pendingIntent.direction)
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
    if (mapGeneration.source === "generated" && state.generatedRoom) {
      await renderer.advanceTime()
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
    setLifecycleStatus(
      "recovering",
      "Map reload failed",
      "The room could not be prepared. Try switching rooms again.",
      technicalErrorDetail(error),
    )
    throw error
  }
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
  state.players.clear()
  seedLocalRenderedPlayer()
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
): Promise<void> {
  if (!state.joined) {
    throw new Error("Cannot request a smoke movement before joining the world.")
  }

  await move(vector, direction)
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
      reconcileClientMovementPrediction(position, message.seqAck, false)
      state.position = position
      state.direction = message.direction
      state.lastMovementRejection = undefined
      logMovementDebug(
        "server",
        `seq=${message.seqAck ?? "-"} pos=${formatMovementVector(position)} facing=${message.direction}`,
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
): void {
  const prediction = state.movementPrediction.active
  if (!prediction) return
  if (seqAck !== undefined && prediction.seq !== seqAck) return

  const correctionPx = movementPredictionCorrectionPx(
    prediction,
    authoritativePosition,
  )
  state.movementPrediction.active = undefined
  state.movementPrediction.lastCorrectionPx = Number(correctionPx.toFixed(2))

  if (rejected) {
    state.movementPrediction.totalServerRejected += 1
    state.movementPrediction.lastOutcome = "server_rejected"
    logMovementDebug(
      "reconcile",
      `seq=${prediction.seq} rejected correction=${state.movementPrediction.lastCorrectionPx}`,
    )
    return
  }

  if (movementPredictionMatches(prediction, authoritativePosition)) {
    state.movementPrediction.totalConfirmed += 1
    state.movementPrediction.lastOutcome = "confirmed"
    logMovementDebug(
      "reconcile",
      `seq=${prediction.seq} confirmed correction=${state.movementPrediction.lastCorrectionPx}`,
    )
    return
  }

  state.movementPrediction.totalCorrected += 1
  state.movementPrediction.lastOutcome = "corrected"
  logMovementDebug(
    "reconcile",
    `seq=${prediction.seq} corrected correction=${state.movementPrediction.lastCorrectionPx}`,
  )
}

function seedLocalRenderedPlayer(): void {
  upsertRenderedPlayer({
    playerId: state.playerId,
    position: state.position,
    direction: state.direction,
  })
}

function upsertRenderedPlayer(player: PlayerSnapshot): void {
  const position = playerSnapshotPosition(player)
  const direction = player.direction ?? "down"

  state.players.set(player.playerId, {
    playerId: player.playerId,
    name: displayNameForPlayer(player),
    avatarId: avatarIdForPlayer(player),
    position,
    direction,
    local: player.playerId === state.playerId,
    rejected: player.rejected,
  })
}

function renderPlayers(): void {
  const players = [...state.players.values()]
  renderer.updatePlayers(players)
  renderCameraControls(renderer.getCameraState())

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
      ? movementInput.lastRequestedDirection ?? state.direction
      : message.playerId === state.companion.playerId
        ? state.companion.direction
        : "down"
  const showFeedback = shouldShowMovementRejectionFeedback(message.reason)

  if (message.playerId === state.playerId) {
    reconcileClientMovementPrediction(position, message.seqAck, true)
    state.position = position
    state.direction = direction
    logMovementDebug(
      "rejected",
      `seq=${message.seqAck ?? "-"} reason=${message.reason} pos=${formatMovementVector(position)}`,
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
  const zone = state.fixtureMap
    ? zoneContainingPoint(
        state.fixtureMap.compiled.zones,
        state.position,
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
  clearMediaSession()
  chatMessages.length = 0
  renderChatMessages()
  state.players.clear()

  if (state.fixtureMap) {
    state.position = fixtureSpawnPosition(state.fixtureMap, "default")
    state.companion.position = fixtureSpawnPosition(state.fixtureMap, "guest")
  }

  state.direction = "down"
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

function movementPredictionTextState() {
  const prediction = state.movementPrediction

  return {
    mode: "client_prediction_server_reconciliation",
    active: Boolean(prediction.active),
    seq: prediction.active?.seq,
    direction: prediction.active?.direction,
    lastSeq: prediction.last?.seq,
    lastDirection: prediction.last?.direction,
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
    lastCollisionSlide: prediction.last?.collisionSlide ?? false,
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
    lastOutcome: prediction.lastOutcome,
    totalPredicted: prediction.totalPredicted,
    totalConfirmed: prediction.totalConfirmed,
    totalCorrected: prediction.totalCorrected,
    totalClientBlocked: prediction.totalClientBlocked,
    totalServerRejected: prediction.totalServerRejected,
    lastCorrectionPx: prediction.lastCorrectionPx,
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
      direction: state.direction,
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
      local: player.local,
      emoteId: player.emoteId,
    })),
    snapshotPlayerIds: state.snapshotPlayerIds,
    movement: {
      heldDirection: activeHeldDirection(),
      heldVector: activeHeldMovementIntent()?.vector,
      pendingVector: movementInput.pendingIntent?.vector,
      pendingDirection: movementInput.pendingIntent?.direction,
      inFlight: movementInput.inFlight,
      lastRejectedReason: state.lastMovementRejection?.reason,
      repeatMs: MOVE_REPEAT_MS,
      rejectionFeedbackMs: MOVEMENT_REJECTION_FEEDBACK_MS,
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
    devTools: {
      gated: state.devTools.gated,
      enabled: state.devTools.enabled,
      activeFixtureId: state.devTools.activeFixtureId,
      availableFixtureIds: DEV_TOOL_FIXTURES,
      lastAction: state.devTools.lastAction,
      overlays: state.devTools.overlays,
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
