const state = {
  sessionId: undefined,
  playerId: "player-1",
  clientId: `browser-${Math.floor(Math.random() * 100000)}`,
  seq: 1,
  position: { x: 32, y: 32 },
  joined: false,
}

const elements = {
  start: document.querySelector("#start"),
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

renderPlayer()

async function runSmokeLoop() {
  elements.start.disabled = true

  try {
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
