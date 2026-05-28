import type { ClientMessage } from "@aedventure/protocol"

interface WorldRoomEvent {
  readonly type: "broadcast" | "send"
  readonly exceptClientId?: string
  readonly clientIds?: readonly string[]
  readonly message: unknown
}

interface WorldEventsPacket {
  readonly type: "world_events"
  readonly transport?: "websocket"
  readonly events: readonly WorldRoomEvent[]
}

export type WorldRealtimeStatus =
  | "idle"
  | "connecting"
  | "open"
  | "closed"
  | "unavailable"

export interface WorldRealtimeSnapshot {
  readonly status: WorldRealtimeStatus
  readonly url?: string
  readonly sentCount: number
  readonly movementInputCount: number
  readonly idleInputCount: number
  readonly lastInputKind?: "movement" | "idle" | "chat"
  readonly receivedCount: number
  readonly fallbackCount: number
  readonly snapshotCount: number
  readonly lastSnapshotTick?: number
  readonly lastSnapshotServerTime?: number
  readonly lastSnapshotReceivedAtMs?: number
  readonly latestSnapshotAgeMs?: number
  readonly snapshotCadenceMs?: number
  readonly snapshotCadenceTargetMs?: number
  readonly snapshotJitterMs?: number
  readonly droppedSnapshotCount: number
  readonly bufferedSnapshotCount: number
  readonly bufferedSnapshotWindowMs?: number
  readonly latestSnapshotPlayerCount?: number
  readonly serverTickMs?: number
  readonly serverTickHz?: number
  readonly inputStats?: WorldRealtimeInputStats
  readonly lastError?: string
}

export interface WorldRealtimeInputStats {
  readonly authority: "server_authoritative_fixed_tick"
  readonly inputCoalescing: "latest_intent_per_client_per_tick"
  readonly queuedClientCount: number
  readonly processedMoveCount: number
  readonly droppedMoveCount: number
  readonly maxQueueDepth: number
  readonly latestInputAgeMs?: number
}

interface WorldRealtimeSnapshotSample {
  readonly tick: number
  readonly serverTime: number
  readonly receivedAtMs: number
  readonly playerCount: number
}

const SNAPSHOT_BUFFER_LIMIT = 8

export class WorldRealtimeTransport {
  private socket?: WebSocket
  private clientId?: string
  private status: WorldRealtimeStatus = "idle"
  private sentCount = 0
  private movementInputCount = 0
  private idleInputCount = 0
  private lastInputKind?: "movement" | "idle" | "chat"
  private receivedCount = 0
  private fallbackCount = 0
  private snapshotCount = 0
  private lastSnapshotTick?: number
  private lastSnapshotServerTime?: number
  private lastSnapshotReceivedAtMs?: number
  private previousSnapshotReceivedAtMs?: number
  private snapshotCadenceMs?: number
  private snapshotJitterMs?: number
  private droppedSnapshotCount = 0
  private readonly snapshotBuffer: WorldRealtimeSnapshotSample[] = []
  private latestSnapshotPlayerCount?: number
  private serverTickMs?: number
  private inputStats?: WorldRealtimeInputStats
  private lastError?: string
  private url?: string

  constructor(
    private readonly applyEvents: (events: readonly WorldRoomEvent[]) => void,
  ) {}

  connect(clientId: string): void {
    if (typeof WebSocket === "undefined") {
      this.status = "unavailable"
      this.lastError = "Browser WebSocket API is unavailable."
      return
    }

    if (
      this.socket &&
      this.clientId === clientId &&
      (this.status === "open" || this.status === "connecting")
    ) {
      return
    }

    this.disconnect()
    this.clientId = clientId
    this.url = worldRealtimeUrl(clientId)
    this.status = "connecting"
    this.lastError = undefined

    const socket = new WebSocket(this.url)
    this.socket = socket

    socket.addEventListener("open", () => {
      if (this.socket !== socket) return
      this.status = "open"
    })
    socket.addEventListener("message", (event) => {
      if (this.socket !== socket) return
      this.receive(event.data)
    })
    socket.addEventListener("close", () => {
      if (this.socket !== socket) return
      this.status = "closed"
      this.socket = undefined
    })
    socket.addEventListener("error", () => {
      if (this.socket !== socket) return
      this.status = "unavailable"
      this.lastError = "Realtime movement socket failed."
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close()
    }
    this.socket = undefined
    this.clientId = undefined
    this.status = "idle"
  }

  send(clientId: string, message: ClientMessage): boolean {
    if (!this.canStream(clientId)) {
      this.fallbackCount += 1
      return false
    }

    this.socket?.send(
      JSON.stringify({
        type: "world_message",
        clientId,
        message,
      }),
    )
    this.observeSentMessage(message)
    this.sentCount += 1
    return true
  }

  canStream(clientId: string): boolean {
    return (
      this.status === "open" &&
      Boolean(this.socket) &&
      this.clientId === clientId
    )
  }

  snapshot(): WorldRealtimeSnapshot {
    const latestSnapshotAgeMs =
      this.lastSnapshotReceivedAtMs === undefined
        ? undefined
        : Math.max(0, Math.round(Date.now() - this.lastSnapshotReceivedAtMs))

    return {
      status: this.status,
      url: this.url,
      sentCount: this.sentCount,
      movementInputCount: this.movementInputCount,
      idleInputCount: this.idleInputCount,
      lastInputKind: this.lastInputKind,
      receivedCount: this.receivedCount,
      fallbackCount: this.fallbackCount,
      snapshotCount: this.snapshotCount,
      lastSnapshotTick: this.lastSnapshotTick,
      lastSnapshotServerTime: this.lastSnapshotServerTime,
      lastSnapshotReceivedAtMs: this.lastSnapshotReceivedAtMs,
      snapshotCadenceMs: this.snapshotCadenceMs,
      snapshotCadenceTargetMs: this.serverTickMs,
      snapshotJitterMs: this.snapshotJitterMs,
      droppedSnapshotCount: this.droppedSnapshotCount,
      bufferedSnapshotCount: this.snapshotBuffer.length,
      bufferedSnapshotWindowMs: this.snapshotBufferedWindowMs(),
      latestSnapshotPlayerCount: this.latestSnapshotPlayerCount,
      serverTickMs: this.serverTickMs,
      serverTickHz: this.serverTickMs
        ? Number((1000 / this.serverTickMs).toFixed(1))
        : undefined,
      inputStats: this.inputStats,
      lastError: this.lastError,
      ...(latestSnapshotAgeMs === undefined ? {} : { latestSnapshotAgeMs }),
    }
  }

  private receive(data: unknown): void {
    try {
      const packet = JSON.parse(String(data)) as Partial<WorldEventsPacket>
      if (packet.type !== "world_events" || !Array.isArray(packet.events)) return

      this.receivedCount += 1
      this.observeSnapshots(packet.events)
      this.applyEvents(packet.events)
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Invalid realtime packet."
    }
  }

  private observeSentMessage(message: ClientMessage): void {
    if (message.type === "chat_send") {
      this.lastInputKind = "chat"
      return
    }

    const vector = message.vector
    const idle = vector !== undefined && Math.hypot(vector.x, vector.y) === 0
    if (idle) {
      this.idleInputCount += 1
      this.lastInputKind = "idle"
      return
    }

    this.movementInputCount += 1
    this.lastInputKind = "movement"
  }

  private observeSnapshots(events: readonly WorldRoomEvent[]): void {
    for (const event of events) {
      const message = event.message
      if (!isWorldSnapshotMessage(message)) continue

      const receivedAtMs = Date.now()
      const previousSnapshotTick = this.lastSnapshotTick
      this.snapshotCount += 1
      this.lastSnapshotTick = message.tick
      this.lastSnapshotServerTime = message.serverTime
      this.previousSnapshotReceivedAtMs = this.lastSnapshotReceivedAtMs
      this.lastSnapshotReceivedAtMs = receivedAtMs
      this.snapshotCadenceMs =
        this.previousSnapshotReceivedAtMs === undefined
          ? undefined
          : Math.max(0, receivedAtMs - this.previousSnapshotReceivedAtMs)
      this.serverTickMs = message.tickMs
      this.snapshotJitterMs =
        this.snapshotCadenceMs === undefined
          ? undefined
          : Number(Math.abs(this.snapshotCadenceMs - message.tickMs).toFixed(2))
      if (
        previousSnapshotTick !== undefined &&
        message.tick > previousSnapshotTick + 1
      ) {
        this.droppedSnapshotCount += message.tick - previousSnapshotTick - 1
      }
      this.latestSnapshotPlayerCount = message.players.length
      this.snapshotBuffer.push({
        tick: message.tick,
        serverTime: message.serverTime,
        receivedAtMs,
        playerCount: message.players.length,
      })
      this.snapshotBuffer.splice(
        0,
        Math.max(0, this.snapshotBuffer.length - SNAPSHOT_BUFFER_LIMIT),
      )
      this.inputStats = message.inputStats
    }
  }

  private snapshotBufferedWindowMs(): number | undefined {
    const first = this.snapshotBuffer[0]
    const latest = this.snapshotBuffer.at(-1)
    if (!first || !latest || first === latest) return undefined

    return Math.max(0, Math.round(latest.receivedAtMs - first.receivedAtMs))
  }
}

function isWorldSnapshotMessage(value: unknown): value is {
  readonly type: "world_snapshot"
  readonly tick: number
  readonly serverTime: number
  readonly tickMs: number
  readonly players: readonly unknown[]
  readonly inputStats: WorldRealtimeInputStats
} {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  const inputStats = record.inputStats

  return (
    record.type === "world_snapshot" &&
    typeof record.tick === "number" &&
    typeof record.serverTime === "number" &&
    typeof record.tickMs === "number" &&
    Array.isArray(record.players) &&
    isWorldRealtimeInputStats(inputStats)
  )
}

function isWorldRealtimeInputStats(
  value: unknown,
): value is WorldRealtimeInputStats {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>

  return (
    record.authority === "server_authoritative_fixed_tick" &&
    record.inputCoalescing === "latest_intent_per_client_per_tick" &&
    typeof record.queuedClientCount === "number" &&
    typeof record.processedMoveCount === "number" &&
    typeof record.droppedMoveCount === "number" &&
    typeof record.maxQueueDepth === "number" &&
    (record.latestInputAgeMs === undefined ||
      typeof record.latestInputAgeMs === "number")
  )
}

function worldRealtimeUrl(clientId: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  const url = new URL("/world/realtime", window.location.href)
  url.protocol = protocol
  url.searchParams.set("clientId", clientId)
  return url.toString()
}
