const state = {
  sessionId: undefined,
  playerId: "player-1",
  clientId: `browser-${Math.floor(Math.random() * 100000)}`,
  seq: 1,
  position: { x: 96, y: 64 },
  joined: false,
  fixtureMap: undefined,
}

const elements = {
  start: document.querySelector("#start"),
  map: document.querySelector("#map"),
  player: document.querySelector("#player"),
  sessionStatus: document.querySelector("#session-status"),
  worldStatus: document.querySelector("#world-status"),
  mediaStatus: document.querySelector("#media-status"),
  events: document.querySelector("#events"),
  chatForm: document.querySelector("#chat-form"),
  chatBody: document.querySelector("#chat-body"),
}

elements.start.addEventListener("click", () => runSmokeLoop())
document.querySelectorAll("[data-direction]").forEach((button) => {
  button.addEventListener("click", () => move(button.dataset.direction))
})
elements.chatForm.addEventListener("submit", (event) => {
  event.preventDefault()
  sendChat(elements.chatBody.value)
})

loadFixtureMap().catch((error) => {
  log(error instanceof Error ? error.message : "Unable to load fixture map")
  renderPlayer()
})

async function runSmokeLoop() {
  elements.start.disabled = true

  try {
    if (!state.fixtureMap) {
      await loadFixtureMap()
    }

    const session = await postJson("/dev/sign-in", {
      subject: "wikimedia-browser-user",
      username: "Browser Ada",
    })
    state.sessionId = session.sessionId
    elements.sessionStatus.textContent = "signed in"
    log(`Signed in as ${session.username}`)

    const token = await postJson("/api/world-token", {
      sessionId: state.sessionId,
      roomId: "room-lobby",
    })

    const joined = await postJson("/world/join", {
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
    elements.worldStatus.textContent = "joined room-lobby"
    log("Joined the local world")

    await move("right")
    await sendChat("Hello from the browser shell")
    await joinMedia()
  } catch (error) {
    log(error instanceof Error ? error.message : "Unknown browser shell error")
  } finally {
    elements.start.disabled = false
  }
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

function labelForToken(tokenId) {
  if (tokenId.includes("conference_table")) return "TABLE"
  if (tokenId.includes("chair")) return "SEAT"
  if (tokenId.includes("coffee")) return "CAFE"
  return "ITEM"
}
