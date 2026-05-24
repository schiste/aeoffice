import {
  PhaserOfficeRenderer,
  type RenderedPlayer,
  type RendererViewportState,
} from "./phaser-office-renderer"
import {
  compileDeterministicPromptMap,
  compilePresetMap,
  presetMapSummaries,
  starterVisualAssetCatalog,
  type DeterministicPromptMapResult,
  type PresetMapId,
  type PresetMapResult,
  type PromptMapValidation,
} from "@aedventure/asset-registry"

type Direction = "up" | "down" | "left" | "right"
type StatusState = "idle" | "pending" | "ready" | "blocked"
type ToastTone = "info" | "success" | "warning" | "error"
type MapSwitcherId = PresetMapId | "generated"
type AvatarId = "ember" | "cobalt" | "moss" | "violet"
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
  activeZone?: FixtureZone
  meetingJoined: boolean
  meetingZoneId?: string
  mediaRequestPending: boolean
  mediaSession?: MediaSession
  micEnabled: boolean
  cameraEnabled: boolean
  mapGeneration: MapGenerationState
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
  timerId?: number
  inFlight: boolean
  lastRequestedDirection?: Direction
}

interface ChatRecord {
  readonly id: string
  readonly body: string
  readonly recipientCount: number
}

interface MapGenerationState {
  readonly source: "preset" | "generated"
  readonly mapId: MapSwitcherId
  readonly label: string
  readonly prompt: string
  readonly keywords: readonly string[]
  readonly validation?: PromptMapValidation
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

const MOVE_REPEAT_MS = 250
const MOVEMENT_REJECTION_FEEDBACK_MS = 1200
const TOAST_TTL_MS = 7000
const MAX_TOASTS = 3
const MAX_CHAT_MESSAGES = 5
const MAX_RECENT_EVENTS = 8
const DEFAULT_MAP_PROMPT =
  "cozy 10-person meeting room with wooden walls and a coffee bar"
const DEFAULT_DISPLAY_NAME = "Browser Ada"
const DEFAULT_AVATAR_ID: AvatarId = "ember"
const avatarIds: readonly AvatarId[] = ["ember", "cobalt", "moss", "violet"]

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
    displayName: "Demo Grace",
    avatarId: "cobalt",
    position: { x: 96, y: 96 },
    direction: "down",
    joined: false,
  },
  fixtureMap: undefined,
  players: new Map(),
  snapshotPlayerIds: [],
  activeZone: undefined,
  meetingJoined: false,
  meetingZoneId: undefined,
  mediaRequestPending: false,
  mediaSession: undefined,
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
  lastMediaRoom: undefined,
  lastChatBody: undefined,
  lastMovementRejection: undefined,
  pendingAction: Promise.resolve(),
}
const movementInput: MovementInputState = {
  pressedDirections: [],
  timerId: undefined,
  inFlight: false,
  lastRequestedDirection: undefined,
}
const recentEvents: string[] = []
const chatMessages: ChatRecord[] = []
const toasts = new Map<string, number>()

const elements = {
  start: mustQuery<HTMLButtonElement>("#start"),
  reset: mustQuery<HTMLButtonElement>("#reset"),
  map: mustQuery<HTMLElement>("#map"),
  sessionStatus: mustQuery<HTMLElement>("#session-status"),
  sessionPill: mustQuery<HTMLElement>("#session-pill"),
  worldStatus: mustQuery<HTMLElement>("#world-status"),
  worldPill: mustQuery<HTMLElement>("#world-pill"),
  displayName: mustQuery<HTMLInputElement>("#demo-display-name"),
  avatarButtons: [
    ...document.querySelectorAll<HTMLButtonElement>("[data-avatar-id]"),
  ],
  mapSwitcherButtons: [
    ...document.querySelectorAll<HTMLButtonElement>("[data-map-id]"),
  ],
  mapGeneratorForm: mustQuery<HTMLFormElement>("#map-generator-form"),
  mapPrompt: mustQuery<HTMLInputElement>("#map-prompt"),
  generateMap: mustQuery<HTMLButtonElement>("#generate-map"),
  mapGenerationStatus: mustQuery<HTMLElement>("#map-generation-status"),
  validationBlocked: mustQuery<HTMLElement>("#validation-blocked"),
  validationSpawns: mustQuery<HTMLElement>("#validation-spawns"),
  validationZones: mustQuery<HTMLElement>("#validation-zones"),
  mediaStatus: mustQuery<HTMLElement>("#media-status"),
  mediaPill: mustQuery<HTMLElement>("#media-pill"),
  chatForm: mustQuery<HTMLFormElement>("#chat-form"),
  chatBody: mustQuery<HTMLInputElement>("#chat-body"),
  chatStatus: mustQuery<HTMLElement>("#chat-status"),
  chatMessages: mustQuery<HTMLOListElement>("#chat-messages"),
  toastRegion: mustQuery<HTMLElement>("#toast-region"),
  meetingStatus: mustQuery<HTMLElement>("#meeting-status"),
  joinMeeting: mustQuery<HTMLButtonElement>("#join-meeting"),
  leaveMeeting: mustQuery<HTMLButtonElement>("#leave-meeting"),
  mediaPanel: mustQuery<HTMLElement>("#media-panel"),
  mediaPanelStatus: mustQuery<HTMLElement>("#media-panel-status"),
  mediaRoom: mustQuery<HTMLElement>("#media-room"),
  mediaEndpoint: mustQuery<HTMLElement>("#media-endpoint"),
  mediaParticipants: mustQuery<HTMLElement>("#media-participants"),
  mediaTokenStatus: mustQuery<HTMLElement>("#media-token-status"),
  localPreview: mustQuery<HTMLElement>("#local-preview"),
  previewAvatar: mustQuery<HTMLElement>(".preview-avatar"),
  previewStatus: mustQuery<HTMLElement>("#preview-status"),
  toggleMic: mustQuery<HTMLButtonElement>("#toggle-mic"),
  toggleCamera: mustQuery<HTMLButtonElement>("#toggle-camera"),
  zoomOut: mustQuery<HTMLButtonElement>("#zoom-out"),
  zoomReset: mustQuery<HTMLButtonElement>("#zoom-reset"),
  zoomIn: mustQuery<HTMLButtonElement>("#zoom-in"),
}
const renderer = new PhaserOfficeRenderer(elements.map)

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
elements.mapGeneratorForm.addEventListener("submit", (event) => {
  event.preventDefault()
  queueAction(() => generateMapFromPrompt())
})
elements.joinMeeting.addEventListener("click", () => queueAction(() => joinMeeting()))
elements.leaveMeeting.addEventListener("click", () => queueAction(() => leaveMeeting()))
elements.toggleMic.addEventListener("click", () => toggleMic())
elements.toggleCamera.addEventListener("click", () => toggleCamera())
document.querySelectorAll<HTMLButtonElement>("[data-direction]").forEach((button) => {
  button.addEventListener("click", () =>
    requestMove(button.dataset.direction as Direction),
  )
})
elements.chatForm.addEventListener("submit", (event) => {
  event.preventDefault()
  queueAction(() => sendChat(elements.chatBody.value))
})
elements.zoomOut.addEventListener("click", () => {
  renderViewportControls(renderer.zoomOut())
})
elements.zoomReset.addEventListener("click", () => {
  renderViewportControls(renderer.resetZoom())
})
elements.zoomIn.addEventListener("click", () => {
  renderViewportControls(renderer.zoomIn())
})
document.addEventListener("keydown", (event) => {
  const direction = directionForKey(event.key)
  if (!direction) return

  event.preventDefault()
  if (event.repeat) return

  pressDirection(direction)
})
document.addEventListener("keyup", (event) => {
  const direction = directionForKey(event.key)
  if (!direction) return

  event.preventDefault()
  releaseDirection(direction)
})
window.addEventListener("blur", () => {
  stopHeldMovement()
})

switchToPresetMap("lobby", { announce: false }).catch((error: unknown) => {
  publishToast(
    error instanceof Error ? error.message : "Unable to load lobby map",
    "error",
  )
  renderPlayers()
})
renderViewportControls(renderer.getViewportState())
renderMeetingControls()
renderMediaPanel()
renderMapGenerationResult()
renderMapSwitcher()
renderIdentityControls()

async function startDemo(): Promise<void> {
  elements.start.disabled = true
  elements.start.textContent = "Joining..."
  setConnectionStatus("session", "pending", "Connecting")
  setConnectionStatus("world", "pending", "Joining")
  setConnectionStatus("media", "idle", "Not ready")

  try {
    if (state.joined) {
      elements.start.textContent = "Demo running"
      publishToast("Demo session already joined", "info")
      return
    }

    if (!state.fixtureMap) {
      await switchToPresetMap("lobby", { announce: false })
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
    setConnectionStatus("world", "ready", "Joined room-lobby")
    publishToast("Joined the local world", "success")

    await joinCompanion()
    await syncWorldSnapshot()
    await move("right")
    await sendChat(elements.chatBody.value)
    elements.start.textContent = "Demo running"
    renderMeetingControls()
  } catch (error: unknown) {
    elements.start.textContent = "Join demo"
    setConnectionStatus(
      "session",
      state.sessionId ? "ready" : "blocked",
      state.sessionId ? "Connected" : "Failed",
    )
    setConnectionStatus(
      "world",
      state.joined ? "ready" : "blocked",
      state.joined ? "Joined room-lobby" : "Join failed",
    )
    publishToast(
      error instanceof Error ? error.message : "Unknown browser shell error",
      "error",
    )
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
  recordEvent("Added Demo Grace as a local companion")
}

async function syncWorldSnapshot(): Promise<void> {
  if (!state.joined) return

  const snapshot = await postJson<{
    status: "ok" | "denied"
    reason?: string
    players: readonly PlayerSnapshot[]
  }>("/world/snapshot", {
    clientId: state.clientId,
  })

  if (snapshot.status !== "ok") {
    throw new Error(`World snapshot failed: ${snapshot.reason}`)
  }

  applyWorldSnapshot(snapshot.players)
  recordEvent(`Synced ${snapshot.players.length} player(s) from world snapshot`)
}

function applyWorldSnapshot(players: readonly PlayerSnapshot[]): void {
  state.snapshotPlayerIds = players.map((player) => player.playerId)

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
  options: { readonly announce?: boolean } = {},
): Promise<void> {
  const announce = options.announce !== false

  elements.reset.disabled = true

  if (state.companion.joined) {
    await leaveWorld(state.companion.clientId)
  }

  if (state.joined) {
    await leaveWorld(state.clientId)
  }

  state.sessionId = undefined
  state.seq = 1
  state.direction = "down"
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
  setConnectionStatus("world", "idle", "Not joined")
  setConnectionStatus("media", "idle", "Not ready")
  renderMediaPanel()
  elements.start.textContent = "Join demo"
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
    publishToast("Demo reset", "info")
  }
}

async function leaveWorld(clientId: string): Promise<void> {
  await postJson("/world/leave", {
    clientId,
  })
}

async function move(direction: Direction): Promise<void> {
  if (!state.joined) return

  const body = await postJson<{ events: readonly WorldEvent[] }>("/world/message", {
    clientId: state.clientId,
    message: {
      type: "move",
      direction,
      seq: state.seq,
    },
  })
  state.seq += 1
  applyEvents(body.events ?? [])
}

function pressDirection(direction: Direction): void {
  releaseDirection(direction)
  movementInput.pressedDirections.push(direction)
  startHeldMovement()
  requestMove(direction)
}

function releaseDirection(direction: Direction): void {
  const index = movementInput.pressedDirections.indexOf(direction)
  if (index !== -1) {
    movementInput.pressedDirections.splice(index, 1)
  }

  if (movementInput.pressedDirections.length === 0) {
    stopHeldMovement()
  }
}

function startHeldMovement(): void {
  if (movementInput.timerId !== undefined) return

  movementInput.timerId = window.setInterval(() => {
    const direction = activeHeldDirection()
    if (!direction) return
    requestMove(direction)
  }, MOVE_REPEAT_MS)
}

function stopHeldMovement(): void {
  movementInput.pressedDirections.length = 0

  if (movementInput.timerId !== undefined) {
    window.clearInterval(movementInput.timerId)
    movementInput.timerId = undefined
  }
}

function activeHeldDirection(): Direction | undefined {
  return movementInput.pressedDirections.at(-1)
}

function requestMove(direction: Direction): void {
  if (!state.joined || movementInput.inFlight) return

  movementInput.inFlight = true
  movementInput.lastRequestedDirection = direction
  void queueAction(() => move(direction)).finally(() => {
    movementInput.inFlight = false
  })
}

async function sendChat(body: string): Promise<void> {
  if (!state.joined || !body.trim()) return

  const response = await postJson<{ events: readonly WorldEvent[] }>("/world/message", {
    clientId: state.clientId,
    message: {
      type: "chat_send",
      scope: "room",
      body,
      seq: state.seq,
    },
  })
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
  setConnectionStatus("media", "pending", "Requesting media")
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
      setConnectionStatus("media", "ready", "Media ready")
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
      state.micEnabled = false
      state.cameraEnabled = false
      state.lastMediaRoom = media.room
      publishToast(`Joined ${zoneDisplayName(zone)}`, "success")
    } else {
      setConnectionStatus("media", "blocked", "Media denied")
      state.meetingJoined = false
      state.meetingZoneId = undefined
      clearMediaSession()
      publishToast(`Media denied: ${media.reason ?? "unknown"}`, "warning")
    }
  } catch (error: unknown) {
    setConnectionStatus("media", "blocked", "Media failed")
    state.meetingJoined = false
    state.meetingZoneId = undefined
    clearMediaSession()
    publishToast(
      error instanceof Error ? error.message : "Unable to request meeting media",
      "error",
    )
  } finally {
    state.mediaRequestPending = false
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
  setConnectionStatus("media", "idle", "Not ready")
  renderMeetingControls()
  renderMediaPanel()
  publishToast(message, "info")
}

async function switchMap(mapId: MapSwitcherId): Promise<void> {
  if (mapId === "generated") {
    await generateMapFromPrompt()
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

  try {
    const generated = compileDeterministicPromptMap(prompt)
    const fixtureMap = fixtureMapFromCompiledMap(generated)

    await switchToFixtureMap(fixtureMap, {
      source: "generated",
      mapId: "generated",
      label: "Generated room",
      prompt,
      keywords: generated.keywords,
      validation: generated.validation,
    })

    if (!generated.validation.valid) {
      publishToast(
        generated.validation.errors[0] ?? "Generated map is invalid",
        "warning",
      )
      return
    }

    publishToast("Generated room rendered", "success")
  } finally {
    elements.generateMap.disabled = false
  }
}

async function switchToFixtureMap(
  fixtureMap: FixtureMap,
  mapGeneration: MapGenerationState,
): Promise<void> {
  await resetDemo({ announce: false })
  await configureDevWorldGeometry(fixtureMap)
  applyFixtureMap(fixtureMap, mapGeneration)
  renderMapSwitcher()
}

function applyFixtureMap(
  fixtureMap: FixtureMap,
  mapGeneration: MapGenerationState,
): void {
  state.fixtureMap = fixtureMap
  state.mapGeneration = mapGeneration
  state.position = fixtureSpawnPosition(fixtureMap, "default")
  state.companion.position = fixtureSpawnPosition(fixtureMap, "guest")
  seedLocalRenderedPlayer()
  renderer.renderMap(fixtureMap)
  renderPlayers()
  updateActiveZoneFromPosition()
  renderMapGenerationResult()
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
        })),
    },
  }
}

async function configureDevWorldGeometry(fixtureMap: FixtureMap): Promise<void> {
  await postJson("/dev/world-geometry", {
    map: {
      width: fixtureMap.compiled.width * fixtureMap.compiled.tileSize,
      height: fixtureMap.compiled.height * fixtureMap.compiled.tileSize,
      tileSize: fixtureMap.compiled.tileSize,
      blockedTiles: fixtureMap.compiled.blockedTiles,
    },
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
      state.position = position
      state.direction = message.direction
      state.lastMovementRejection = undefined
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

  if ("reason" in message && message.reason) {
    publishToast(`Rejected: ${message.reason}`, "warning")
  }
}

function eventVisibleToClient(event: WorldEvent): boolean {
  if (event.type === "broadcast") return event.exceptClientId !== state.clientId
  return Array.isArray(event.clientIds) && event.clientIds.includes(state.clientId)
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
  renderViewportControls(renderer.getViewportState())

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
    state.position = position
    state.direction = direction
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
    publishToast(movementRejectionLabel(message.reason), "warning")
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
      return "Movement blocked by wall or furniture"
    case "zone_permission":
      return "Movement blocked by zone permissions"
    case "speed_limit":
      return "Movement ignored to preserve server speed limit"
    case "unknown_player":
      return "Movement ignored because the player left the room"
    case "invalid_message":
      return "Movement ignored because the request was invalid"
  }
}

function renderViewportControls(viewport: RendererViewportState): void {
  elements.zoomReset.textContent = `${Math.round(viewport.zoomFactor * 100)}%`
}

function renderMapSwitcher(): void {
  const activeMapId = state.mapGeneration.mapId

  elements.mapSwitcherButtons.forEach((button) => {
    const pressed = button.dataset.mapId === activeMapId
    button.setAttribute("aria-pressed", String(pressed))
  })
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

function renderMapGenerationResult(): void {
  const validation = state.mapGeneration.validation

  elements.mapGenerationStatus.textContent =
    state.mapGeneration.source === "generated"
      ? validation?.valid
        ? `Generated ${generationLabel(state.mapGeneration.keywords)}`
        : "Generated map needs review"
      : `${state.mapGeneration.label} loaded`
  elements.validationBlocked.textContent = String(validation?.blockedTileCount ?? 0)
  elements.validationSpawns.textContent = validation?.valid
    ? String(validation.spawnCount)
    : "Check"
  elements.validationZones.textContent = validation?.valid
    ? String(validation.zoneCount)
    : "Check"
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
  renderer.setActiveZones(nextZoneId ? [nextZoneId] : [])

  if (previousZoneId !== nextZoneId) {
    if (zone) {
      recordEvent(`Entered ${zoneDisplayName(zone)}`)
    } else {
      recordEvent("Left meeting zone")
    }
  }

  if (state.meetingJoined && state.meetingZoneId !== nextZoneId) {
    leaveMeetingLocally("Left meeting zone")
    return
  }

  renderMeetingControls()
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

function renderMeetingControls(): void {
  const zone = state.activeZone
  const canJoinMeeting = state.joined && Boolean(zone && isMeetingZone(zone))

  elements.meetingStatus.textContent = state.meetingJoined
    ? `In ${meetingZoneLabel(state.meetingZoneId, zone)}`
    : zone && isMeetingZone(zone)
      ? `Inside ${zoneDisplayName(zone)}`
      : "Outside meeting zone"
  elements.joinMeeting.disabled = !canJoinMeeting || state.meetingJoined
  elements.leaveMeeting.disabled = !state.meetingJoined
}

function toggleMic(): void {
  if (!state.mediaSession || !state.mediaSession.canPublish) {
    publishToast("Join meeting media before changing mic state", "warning")
    return
  }

  state.micEnabled = !state.micEnabled
  renderMediaPanel()
  publishToast(state.micEnabled ? "Mic on" : "Mic off", "info")
}

function toggleCamera(): void {
  if (!state.mediaSession || !state.mediaSession.canPublish) {
    publishToast("Join meeting media before changing camera state", "warning")
    return
  }

  state.cameraEnabled = !state.cameraEnabled
  renderMediaPanel()
  publishToast(state.cameraEnabled ? "Camera on" : "Camera off", "info")
}

function clearMediaSession(): void {
  state.mediaSession = undefined
  state.micEnabled = false
  state.cameraEnabled = false
  state.lastMediaRoom = undefined
}

function renderMediaPanel(): void {
  const session = state.mediaSession
  const tokenState = state.mediaRequestPending
    ? "Requesting token"
    : session
      ? "Token issued"
      : "Not issued"
  const panelState = state.mediaRequestPending
    ? "pending"
    : session
      ? "ready"
      : "idle"

  elements.mediaPanel.dataset.state = panelState
  elements.mediaPanelStatus.textContent = state.mediaRequestPending
    ? "Requesting token"
    : session
      ? "Ready"
      : "Not connected"
  elements.mediaRoom.textContent = session?.room ?? "None"
  elements.mediaEndpoint.textContent = session?.liveKitUrl ?? "None"
  elements.mediaParticipants.textContent = session
    ? String(session.participantPlayerIds.length)
    : "0"
  elements.mediaTokenStatus.textContent = session?.expiresAt
    ? `${tokenState}, ${formatMediaExpiry(session.expiresAt)}`
    : tokenState

  elements.toggleMic.disabled = !session?.canPublish
  elements.toggleMic.textContent = state.micEnabled ? "Mic on" : "Mic off"
  elements.toggleMic.setAttribute("aria-pressed", String(state.micEnabled))
  elements.toggleCamera.disabled = !session?.canPublish
  elements.toggleCamera.textContent = state.cameraEnabled ? "Camera on" : "Camera off"
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
      ? "Requesting token"
      : "No media session"
}

function isMeetingZone(zone: FixtureZone): boolean {
  return zone.zoneType.includes("meeting")
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
  const parsed = (await response.json()) as { reason?: string }

  if (!response.ok) {
    throw new Error(parsed.reason ?? `HTTP ${response.status}`)
  }

  return parsed as T
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
      publishToast(
        error instanceof Error ? error.message : "Unknown demo action error",
        "error",
      )
    })
  return state.pendingAction
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

function renderDemoToText(): string {
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
    player: {
      id: state.playerId,
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
    })),
    snapshotPlayerIds: state.snapshotPlayerIds,
    movement: {
      heldDirection: activeHeldDirection(),
      inFlight: movementInput.inFlight,
      lastRejectedReason: state.lastMovementRejection?.reason,
    },
    meeting: {
      activeZoneId: state.activeZone?.id,
      activeZoneType: state.activeZone?.zoneType,
      status: elements.meetingStatus.textContent,
      joined: state.meetingJoined,
      zoneId: state.meetingZoneId,
      joinDisabled: elements.joinMeeting.disabled,
      leaveDisabled: elements.leaveMeeting.disabled,
    },
    media: {
      panelStatus: elements.mediaPanelStatus.textContent,
      tokenIssued: Boolean(state.mediaSession),
      tokenStatus: elements.mediaTokenStatus.textContent,
      room: state.mediaSession?.room,
      liveKitUrl: state.mediaSession?.liveKitUrl,
      canPublish: state.mediaSession?.canPublish,
      canSubscribe: state.mediaSession?.canSubscribe,
      participantPlayerIds: state.mediaSession?.participantPlayerIds ?? [],
      mic: state.micEnabled ? "on" : "off",
      camera: state.cameraEnabled ? "on" : "off",
      micDisabled: elements.toggleMic.disabled,
      cameraDisabled: elements.toggleCamera.disabled,
      previewStatus: elements.previewStatus.textContent,
    },
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
            })),
            { id: "generated", label: "Generated room" },
          ],
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
  }
}

window.render_game_to_text = renderDemoToText
window.advanceTime = async () => {
  await state.pendingAction
  await renderer.advanceTime()
}

export {}
