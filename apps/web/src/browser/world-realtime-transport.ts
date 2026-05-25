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
  readonly lastError?: string
}

export class WorldRealtimeTransport {
  private socket?: WebSocket
  private clientId?: string
  private status: WorldRealtimeStatus = "idle"
  private sentCount = 0
  private receivedCount = 0
  private fallbackCount = 0
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
    if (this.status !== "open" || !this.socket || this.clientId !== clientId) {
      this.fallbackCount += 1
      return false
    }

    this.socket.send(
      JSON.stringify({
        type: "world_message",
        clientId,
        message,
      }),
    )
    this.sentCount += 1
    return true
  }

  snapshot(): WorldRealtimeSnapshot {
    return {
      status: this.status,
      url: this.url,
      sentCount: this.sentCount,
      receivedCount: this.receivedCount,
      fallbackCount: this.fallbackCount,
      lastError: this.lastError,
    }
  }

  private receive(data: unknown): void {
    try {
      const packet = JSON.parse(String(data)) as Partial<WorldEventsPacket>
      if (packet.type !== "world_events" || !Array.isArray(packet.events)) return

      this.receivedCount += 1
      this.applyEvents(packet.events)
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Invalid realtime packet."
    }
  }
}

function worldRealtimeUrl(clientId: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  const url = new URL("/world/realtime", window.location.href)
  url.protocol = protocol
  url.searchParams.set("clientId", clientId)
  return url.toString()
}
