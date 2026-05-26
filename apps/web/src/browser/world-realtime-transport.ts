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
  readonly receivedCount: number
  readonly fallbackCount: number
  readonly snapshotCount: number
  readonly lastSnapshotTick?: number
  readonly lastSnapshotServerTime?: number
  readonly serverTickMs?: number
  readonly lastError?: string
}

export class WorldRealtimeTransport {
  private socket?: WebSocket
  private clientId?: string
  private status: WorldRealtimeStatus = "idle"
  private sentCount = 0
  private receivedCount = 0
  private fallbackCount = 0
  private snapshotCount = 0
  private lastSnapshotTick?: number
  private lastSnapshotServerTime?: number
  private serverTickMs?: number
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
    return {
      status: this.status,
      url: this.url,
      sentCount: this.sentCount,
      receivedCount: this.receivedCount,
      fallbackCount: this.fallbackCount,
      snapshotCount: this.snapshotCount,
      lastSnapshotTick: this.lastSnapshotTick,
      lastSnapshotServerTime: this.lastSnapshotServerTime,
      serverTickMs: this.serverTickMs,
      lastError: this.lastError,
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

  private observeSnapshots(events: readonly WorldRoomEvent[]): void {
    for (const event of events) {
      const message = event.message
      if (!isWorldSnapshotMessage(message)) continue

      this.snapshotCount += 1
      this.lastSnapshotTick = message.tick
      this.lastSnapshotServerTime = message.serverTime
      this.serverTickMs = message.tickMs
    }
  }
}

function isWorldSnapshotMessage(value: unknown): value is {
  readonly type: "world_snapshot"
  readonly tick: number
  readonly serverTime: number
  readonly tickMs: number
} {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>

  return (
    record.type === "world_snapshot" &&
    typeof record.tick === "number" &&
    typeof record.serverTime === "number" &&
    typeof record.tickMs === "number"
  )
}

function worldRealtimeUrl(clientId: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  const url = new URL("/world/realtime", window.location.href)
  url.protocol = protocol
  url.searchParams.set("clientId", clientId)
  return url.toString()
}
