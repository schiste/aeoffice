import {
  PhaserOfficeRenderer,
  type RenderedPlayer,
} from "./phaser-office-renderer"

type Direction = "up" | "down" | "left" | "right"

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
      readonly reason?: string
    }

interface PlayerSnapshot {
  readonly playerId: string
  readonly userId?: string
  readonly position?: Vector2
  readonly x?: number
  readonly y?: number
  readonly direction?: Direction
}

interface AppState {
  sessionId?: string
  playerId: string
  clientId: string
  seq: number
  position: Vector2
  direction: Direction
  joined: boolean
  companion: {
    playerId: string
    clientId: string
    position: Vector2
    direction: Direction
    joined: boolean
  }
  fixtureMap?: FixtureMap
  players: Map<string, RenderedPlayer>
  snapshotPlayerIds: string[]
  lastMediaRoom?: string
  lastChatBody?: string
  pendingAction: Promise<void>
}

const state: AppState = {
  sessionId: undefined,
  playerId: "player-1",
  clientId: `browser-${Math.floor(Math.random() * 100000)}`,
  seq: 1,
  position: { x: 96, y: 64 },
  direction: "down",
  joined: false,
  companion: {
    playerId: "player-2",
    clientId: `companion-${Math.floor(Math.random() * 100000)}`,
    position: { x: 96, y: 96 },
    direction: "down",
    joined: false,
  },
  fixtureMap: undefined,
  players: new Map(),
  snapshotPlayerIds: [],
  lastMediaRoom: undefined,
  lastChatBody: undefined,
  pendingAction: Promise.resolve(),
}

const elements = {
  start: mustQuery<HTMLButtonElement>("#start"),
  reset: mustQuery<HTMLButtonElement>("#reset"),
  map: mustQuery<HTMLElement>("#map"),
  sessionStatus: mustQuery<HTMLElement>("#session-status"),
  worldStatus: mustQuery<HTMLElement>("#world-status"),
  mediaStatus: mustQuery<HTMLElement>("#media-status"),
  events: mustQuery<HTMLOListElement>("#events"),
  chatForm: mustQuery<HTMLFormElement>("#chat-form"),
  chatBody: mustQuery<HTMLInputElement>("#chat-body"),
}
const renderer = new PhaserOfficeRenderer(elements.map)

elements.start.addEventListener("click", () => queueAction(() => startDemo()))
elements.reset.addEventListener("click", () => queueAction(() => resetDemo()))
document.querySelectorAll<HTMLButtonElement>("[data-direction]").forEach((button) => {
  button.addEventListener("click", () =>
    queueAction(() => move(button.dataset.direction as Direction)),
  )
})
elements.chatForm.addEventListener("submit", (event) => {
  event.preventDefault()
  queueAction(() => sendChat(elements.chatBody.value))
})
document.addEventListener("keydown", (event) => {
  const direction = directionForKey(event.key)
  if (!direction || event.repeat) return

  event.preventDefault()
  queueAction(() => move(direction))
})

loadFixtureMap().catch((error: unknown) => {
  log(error instanceof Error ? error.message : "Unable to load fixture map")
  renderPlayers()
})

async function startDemo(): Promise<void> {
  elements.start.disabled = true
  elements.start.textContent = "Joining..."

  try {
    if (state.joined) {
      elements.start.textContent = "Demo running"
      log("Demo session already joined")
      return
    }

    if (!state.fixtureMap) {
      await loadFixtureMap()
    }

    const session = await signInDevUser("wikimedia-browser-user", "Browser Ada")
    state.sessionId = session.sessionId
    elements.sessionStatus.textContent = "signed in"
    log(`Signed in as ${session.username}`)

    const token = await issueWorldToken(state.sessionId)
    const joined = await joinWorld({
      clientId: state.clientId,
      token: token.token,
      playerId: state.playerId,
      spawn: state.position,
      roomId: "room-lobby",
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
    elements.worldStatus.textContent = "joined room-lobby"
    log("Joined the local world as Browser Ada")

    await joinCompanion()
    await syncWorldSnapshot()
    await move("right")
    await sendChat(elements.chatBody.value)
    await joinMedia()
    elements.start.textContent = "Demo running"
  } catch (error: unknown) {
    elements.start.textContent = "Join demo"
    log(error instanceof Error ? error.message : "Unknown browser shell error")
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
    "Demo Grace",
  )
  const companionToken = await issueWorldToken(companionSession.sessionId)
  const joined = await joinWorld({
    clientId: state.companion.clientId,
    token: companionToken.token,
    playerId: state.companion.playerId,
    spawn: state.companion.position,
    roomId: "room-lobby",
  })

  if (joined.status !== "joined") {
    throw new Error(`Companion admission failed: ${joined.reason}`)
  }

  state.companion.joined = true
  state.companion.position = playerSnapshotPosition(joined.player)
  state.companion.direction = joined.player.direction ?? "down"
  upsertRenderedPlayer(joined.player)
  renderPlayers()
  log("Added Demo Grace as a local companion")
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
  log(`Synced ${snapshot.players.length} player(s) from world snapshot`)
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
}

function playerSnapshotPosition(player: PlayerSnapshot): Vector2 {
  return {
    x: player.position?.x ?? player.x ?? 0,
    y: player.position?.y ?? player.y ?? 0,
  }
}

async function resetDemo(): Promise<void> {
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
  state.lastMediaRoom = undefined
  state.lastChatBody = undefined
  elements.sessionStatus.textContent = "idle"
  elements.worldStatus.textContent = "not joined"
  elements.mediaStatus.textContent = "not issued"
  elements.start.textContent = "Join demo"
  elements.start.disabled = false
  elements.reset.disabled = true

  if (state.fixtureMap) {
    state.position = fixtureSpawnPosition(state.fixtureMap, "default")
    state.companion.position = fixtureSpawnPosition(state.fixtureMap, "guest")
  }

  seedLocalRenderedPlayer()
  renderPlayers()
  log("Demo reset")
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

async function joinMedia(): Promise<void> {
  const media = await postJson<{
    status: "issued" | "denied"
    room?: string
    reason?: string
  }>("/media/media-token", {
    playerId: state.playerId,
    mode: "zone",
    zoneId: "meeting-zone",
    publish: true,
    subscribe: true,
  })

  if (media.status === "issued" && media.room) {
    elements.mediaStatus.textContent = media.room
    state.lastMediaRoom = media.room
    log(`Issued media token for ${media.room}`)
  } else {
    elements.mediaStatus.textContent = media.reason ?? "denied"
    log(`Media denied: ${media.reason ?? "unknown"}`)
  }
}

async function loadFixtureMap(): Promise<void> {
  const fixtureMap = await getJson<FixtureMap>("/dev/fixture-map")
  state.fixtureMap = fixtureMap
  state.position = fixtureSpawnPosition(fixtureMap, "default")
  state.companion.position = fixtureSpawnPosition(fixtureMap, "guest")
  seedLocalRenderedPlayer()
  renderer.renderMap(fixtureMap)
  renderPlayers()
  log(
    `Loaded ${fixtureMap.definition.style} fixture map from ${fixtureMap.catalog.tokens.length} visual token(s)`,
  )
}

function applyEvents(events: readonly WorldEvent[]): void {
  events
    .filter((event) => eventVisibleToClient(event))
    .forEach((event) => applyServerMessage(event.message))
}

function applyServerMessage(message: ServerMessage): void {
  if ("type" in message && message.type === "player_state") {
    const position = { x: message.x, y: message.y }

    if (message.playerId === state.playerId) {
      state.position = position
      state.direction = message.direction
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
    log(`Moved ${message.direction} to ${Math.round(message.x)}, ${Math.round(message.y)}`)
    return
  }

  if ("type" in message && message.type === "chat_delivered") {
    state.lastChatBody = message.body
    log(`Chat delivered to ${message.recipientPlayerIds.length} recipient(s)`)
    return
  }

  if ("reason" in message && message.reason) {
    log(`Rejected: ${message.reason}`)
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
    position,
    direction,
    local: player.playerId === state.playerId,
  })
}

function renderPlayers(): void {
  renderer.updatePlayers([...state.players.values()])
}

function displayNameForPlayer(player: Pick<PlayerSnapshot, "playerId" | "userId">): string {
  if (player.playerId === state.playerId) return "Browser Ada"
  if (player.playerId === state.companion.playerId) return "Demo Grace"
  if (player.userId) return titleCaseName(player.userId)
  return titleCaseName(player.playerId)
}

function titleCaseName(value: string): string {
  return value
    .replace(/^wikimedia-/, "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ")
}

function fixtureSpawnPosition(fixtureMap: FixtureMap, spawnId: string): Vector2 {
  const spawn = fixtureMap.spawnPoints.find((candidate) => candidate.id === spawnId)
  return spawn ? spawn.position : state.position
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  const parsed = (await response.json()) as { reason?: string }

  if (!response.ok) {
    throw new Error(parsed.reason ?? `HTTP ${response.status}`)
  }

  return parsed as T
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

function log(message: string): void {
  const item = document.createElement("li")
  item.textContent = message
  elements.events.prepend(item)
}

function queueAction(action: () => Promise<void>): Promise<void> {
  state.pendingAction = state.pendingAction
    .then(action)
    .catch((error: unknown) => {
      log(error instanceof Error ? error.message : "Unknown demo action error")
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
      x: Math.round(state.position.x),
      y: Math.round(state.position.y),
      direction: state.direction,
    },
    companion: {
      id: state.companion.playerId,
      joined: state.companion.joined,
      x: Math.round(state.companion.position.x),
      y: Math.round(state.companion.position.y),
      direction: state.companion.direction,
    },
    players: [...state.players.values()].map((player) => ({
      id: player.playerId,
      name: player.name,
      x: Math.round(player.position.x),
      y: Math.round(player.position.y),
      direction: player.direction,
      local: player.local,
    })),
    snapshotPlayerIds: state.snapshotPlayerIds,
    map: state.fixtureMap
      ? {
          renderer: "phaser",
          style: state.fixtureMap.definition.style,
          width: state.fixtureMap.compiled.width,
          height: state.fixtureMap.compiled.height,
          tileSize: state.fixtureMap.compiled.tileSize,
          blockedTileCount: state.fixtureMap.compiled.blockedTiles.length,
          zones: state.fixtureMap.compiled.zones.map((zone) => zone.id),
        }
      : undefined,
    lastChatBody: state.lastChatBody,
    lastMediaRoom: state.lastMediaRoom,
    recentEvents: [...elements.events.querySelectorAll("li")]
      .slice(0, 6)
      .map((item) => item.textContent),
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
