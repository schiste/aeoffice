const state = {
  sessionId: undefined,
  playerId: "player-1",
  clientId: `browser-${Math.floor(Math.random() * 100000)}`,
  seq: 1,
  position: { x: 96, y: 64 },
  joined: false,
  companion: {
    playerId: "player-2",
    clientId: `companion-${Math.floor(Math.random() * 100000)}`,
    position: { x: 96, y: 96 },
    joined: false,
  },
  fixtureMap: undefined,
  snapshotPlayerIds: [],
  lastMediaRoom: undefined,
  lastChatBody: undefined,
  pendingAction: Promise.resolve(),
}

const elements = {
  start: document.querySelector("#start"),
  reset: document.querySelector("#reset"),
  map: document.querySelector("#map"),
  player: document.querySelector("#player"),
  sessionStatus: document.querySelector("#session-status"),
  worldStatus: document.querySelector("#world-status"),
  mediaStatus: document.querySelector("#media-status"),
  events: document.querySelector("#events"),
  chatForm: document.querySelector("#chat-form"),
  chatBody: document.querySelector("#chat-body"),
  companion: undefined,
}

elements.start.addEventListener("click", () => queueAction(() => startDemo()))
elements.reset.addEventListener("click", () => queueAction(() => resetDemo()))
document.querySelectorAll("[data-direction]").forEach((button) => {
  button.addEventListener("click", () =>
    queueAction(() => move(button.dataset.direction)),
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

loadFixtureMap().catch((error) => {
  log(error instanceof Error ? error.message : "Unable to load fixture map")
  renderPlayer()
})

async function startDemo() {
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
  } catch (error) {
    elements.start.textContent = "Join demo"
    log(error instanceof Error ? error.message : "Unknown browser shell error")
  } finally {
    elements.start.disabled = state.joined
    elements.reset.disabled = !state.joined
  }
}

async function signInDevUser(subject, username) {
  return postJson("/dev/sign-in", {
    subject,
    username,
  })
}

async function issueWorldToken(sessionId) {
  return postJson("/api/world-token", {
    sessionId,
    roomId: "room-lobby",
  })
}

async function joinWorld(input) {
  return postJson("/world/join", input)
}

async function joinCompanion() {
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
  state.companion.position = {
    x: joined.player.position?.x ?? joined.player.x ?? state.companion.position.x,
    y: joined.player.position?.y ?? joined.player.y ?? state.companion.position.y,
  }
  log("Added Demo Grace as a local companion")
}

async function syncWorldSnapshot() {
  if (!state.joined) return

  const snapshot = await postJson("/world/snapshot", {
    clientId: state.clientId,
  })

  if (snapshot.status !== "ok") {
    throw new Error(`World snapshot failed: ${snapshot.reason}`)
  }

  applyWorldSnapshot(snapshot.players)
  log(`Synced ${snapshot.players.length} player(s) from world snapshot`)
}

function applyWorldSnapshot(players) {
  state.snapshotPlayerIds = players.map((player) => player.playerId)

  const local = players.find((player) => player.playerId === state.playerId)
  if (local) {
    state.position = playerSnapshotPosition(local)
    renderPlayer()
  }

  const companion = players.find(
    (player) => player.playerId === state.companion.playerId,
  )
  state.companion.joined = Boolean(companion)

  if (companion) {
    state.companion.position = playerSnapshotPosition(companion)
  }

  renderCompanion()
}

function playerSnapshotPosition(player) {
  return {
    x: player.position?.x ?? player.x,
    y: player.position?.y ?? player.y,
  }
}

async function resetDemo() {
  elements.reset.disabled = true

  if (state.companion.joined) {
    await leaveWorld(state.companion.clientId)
  }

  if (state.joined) {
    await leaveWorld(state.clientId)
  }

  state.sessionId = undefined
  state.seq = 1
  state.joined = false
  state.companion.joined = false
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

  renderPlayer()
  renderCompanion()
  log("Demo reset")
}

async function leaveWorld(clientId) {
  return postJson("/world/leave", {
    clientId,
  })
}

async function move(direction) {
  if (!state.joined) return

  const body = await postJson("/world/message", {
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

async function sendChat(body) {
  if (!state.joined || !body.trim()) return

  const response = await postJson("/world/message", {
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

async function joinMedia() {
  const media = await postJson("/media/media-token", {
    playerId: state.playerId,
    mode: "zone",
    zoneId: "meeting-zone",
    publish: true,
    subscribe: true,
  })

  if (media.status === "issued") {
    elements.mediaStatus.textContent = media.room
    state.lastMediaRoom = media.room
    log(`Issued media token for ${media.room}`)
  } else {
    elements.mediaStatus.textContent = media.reason
    log(`Media denied: ${media.reason}`)
  }
}

async function loadFixtureMap() {
  const fixtureMap = await getJson("/dev/fixture-map")
  state.fixtureMap = fixtureMap
  state.position = fixtureSpawnPosition(fixtureMap, "default")
  state.companion.position = fixtureSpawnPosition(fixtureMap, "guest")
  renderMap(fixtureMap)
  log(
    `Loaded ${fixtureMap.definition.style} fixture map from ${fixtureMap.catalog.tokens.length} visual token(s)`,
  )
}

function renderMap(fixtureMap) {
  const player = elements.player
  const tileSize = fixtureMap.compiled.tileSize
  const world = document.createElement("div")
  world.className = "tile-world"
  world.style.width = `${fixtureMap.compiled.width * tileSize}px`
  world.style.height = `${fixtureMap.compiled.height * tileSize}px`

  const tokensByGid = new Map(
    fixtureMap.catalog.tokens.map((token) => [token.provisionalGid, token]),
  )

  renderTileLayer(world, fixtureMap.compiled.layers.floor, tokensByGid, tileSize)
  renderTileLayer(world, fixtureMap.compiled.layers.walls, tokensByGid, tileSize)
  renderTileLayer(world, fixtureMap.compiled.layers.objects, tokensByGid, tileSize)
  renderZones(world, fixtureMap.compiled.zones, tileSize)

  elements.map.textContent = ""
  world.append(player)
  elements.map.append(world)
  renderPlayer()
  renderCompanion()
}

function renderTileLayer(world, layer, tokensByGid, tileSize) {
  layer.gids.forEach((row, y) => {
    row.forEach((gid, x) => {
      if (gid === 0) return

      const token = tokensByGid.get(gid)
      if (!token) return

      const tile = document.createElement("div")
      tile.className = `tile tile-${token.kind}`
      tile.dataset.token = token.id
      tile.title = token.id
      tile.style.left = `${x * tileSize}px`
      tile.style.top = `${y * tileSize}px`
      tile.style.width = `${token.widthTiles * tileSize}px`
      tile.style.height = `${token.heightTiles * tileSize}px`

      if (token.kind === "item") {
        tile.textContent = labelForToken(token.id)
      }

      world.append(tile)
    })
  })
}

function renderZones(world, zones, tileSize) {
  zones.forEach((zone) => {
    const element = document.createElement("div")
    element.className = `zone zone-${zone.zoneType}`
    element.dataset.zone = zone.id
    element.title = zone.id
    element.style.left = `${zone.xStart * tileSize}px`
    element.style.top = `${zone.yStart * tileSize}px`
    element.style.width = `${(zone.xEnd - zone.xStart) * tileSize}px`
    element.style.height = `${(zone.yEnd - zone.yStart) * tileSize}px`
    world.append(element)
  })
}

function applyEvents(events) {
  events
    .filter((event) => eventVisibleToClient(event))
    .forEach((event) => applyServerMessage(event.message))
}

function applyServerMessage(message) {
  if (message.type === "player_state" && message.playerId === state.playerId) {
    state.position = { x: message.x, y: message.y }
    renderPlayer()
    log(`Moved ${message.direction} to ${Math.round(message.x)}, ${Math.round(message.y)}`)
    return
  }

  if (message.type === "chat_delivered") {
    state.lastChatBody = message.body
    log(`Chat delivered to ${message.recipientPlayerIds.length} recipient(s)`)
    return
  }

  if (message.reason) {
    log(`Rejected: ${message.reason}`)
  }
}

function eventVisibleToClient(event) {
  if (event.type === "broadcast") return event.exceptClientId !== state.clientId
  return Array.isArray(event.clientIds) && event.clientIds.includes(state.clientId)
}

function renderPlayer() {
  elements.player.style.left = `${state.position.x}px`
  elements.player.style.top = `${state.position.y}px`
}

function renderCompanion() {
  const world = elements.map.querySelector(".tile-world")
  if (!world) return

  if (!state.companion.joined) {
    elements.companion?.remove()
    return
  }

  if (!elements.companion) {
    elements.companion = document.createElement("div")
    elements.companion.className = "player companion"
    elements.companion.setAttribute("aria-label", "Demo companion")
    elements.companion.title = "Demo Grace"
  }

  elements.companion.style.left = `${state.companion.position.x}px`
  elements.companion.style.top = `${state.companion.position.y}px`

  if (!elements.companion.parentElement) {
    world.append(elements.companion)
  }
}

function fixtureSpawnPosition(fixtureMap, spawnId) {
  const spawn = fixtureMap.spawnPoints.find((candidate) => candidate.id === spawnId)
  return spawn ? spawn.position : state.position
}

async function getJson(path) {
  const response = await fetch(path)
  const parsed = await response.json()

  if (!response.ok) {
    throw new Error(parsed.reason ?? `HTTP ${response.status}`)
  }

  return parsed
}

async function postJson(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const parsed = await response.json()

  if (!response.ok) {
    throw new Error(parsed.reason ?? `HTTP ${response.status}`)
  }

  return parsed
}

function log(message) {
  const item = document.createElement("li")
  item.textContent = message
  elements.events.prepend(item)
}

function queueAction(action) {
  state.pendingAction = state.pendingAction
    .then(action)
    .catch((error) => {
      log(error instanceof Error ? error.message : "Unknown demo action error")
    })
  return state.pendingAction
}

function directionForKey(key) {
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

function renderDemoToText() {
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
    },
    companion: {
      id: state.companion.playerId,
      joined: state.companion.joined,
      x: Math.round(state.companion.position.x),
      y: Math.round(state.companion.position.y),
    },
    snapshotPlayerIds: state.snapshotPlayerIds,
    map: state.fixtureMap
      ? {
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

window.render_game_to_text = renderDemoToText
window.advanceTime = async () => state.pendingAction

function labelForToken(tokenId) {
  if (tokenId.includes("conference_table")) return "TABLE"
  if (tokenId.includes("chair")) return "SEAT"
  if (tokenId.includes("coffee")) return "CAFE"
  return "ITEM"
}
