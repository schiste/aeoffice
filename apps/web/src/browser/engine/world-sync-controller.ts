import type { ClientMessage } from "@aedventure/protocol"

import {
  WorldRealtimeTransport,
  type WorldRealtimeSnapshot,
} from "../world-realtime-transport"

interface WorldRoomEvent {
  readonly type: "broadcast" | "send"
  readonly exceptClientId?: string
  readonly clientIds?: readonly string[]
  readonly message: unknown
}

export class WorldSyncController {
  private readonly realtime: WorldRealtimeTransport

  constructor(
    applyEvents: (events: readonly WorldRoomEvent[]) => void,
  ) {
    this.realtime = new WorldRealtimeTransport(applyEvents)
  }

  connect(clientId: string): void {
    this.realtime.connect(clientId)
  }

  disconnect(): void {
    this.realtime.disconnect()
  }

  canStream(clientId: string): boolean {
    return this.realtime.canStream(clientId)
  }

  send(clientId: string, message: ClientMessage): boolean {
    return this.realtime.send(clientId, message)
  }

  snapshot(): WorldRealtimeSnapshot {
    return this.realtime.snapshot()
  }
}
