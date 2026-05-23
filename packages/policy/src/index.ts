import type { ChatRejectedReason, ChatScope } from "@aedventure/protocol"

export interface PolicyVector2 {
  readonly x: number
  readonly y: number
}

export interface ParticipantPolicyContext {
  readonly playerId: string
  readonly roomId: string
  readonly zoneIds: readonly string[]
  readonly permissions: readonly string[]
  readonly position: PolicyVector2
}

export interface ChatPolicyMessage {
  readonly scope: ChatScope
  readonly body: string
  readonly zoneId?: string
}

export interface ChatPolicyConfig {
  readonly proximityRadiusPx: number
}

export interface ChatDeliveryInput {
  readonly sender: ParticipantPolicyContext
  readonly participants: readonly ParticipantPolicyContext[]
  readonly message: ChatPolicyMessage
  readonly config: ChatPolicyConfig
}

export interface ChatDeliveryAllowed {
  readonly allowed: true
  readonly recipientPlayerIds: readonly string[]
}

export interface ChatDeliveryDenied {
  readonly allowed: false
  readonly reason: ChatRejectedReason
}

export type ChatDeliveryDecision = ChatDeliveryAllowed | ChatDeliveryDenied

export const CHAT_PERMISSIONS = {
  roomSend: "chat:room:send",
  roomReceive: "chat:room:receive",
  proximitySend: "chat:proximity:send",
  proximityReceive: "chat:proximity:receive",
  zoneSend: "chat:zone:send",
  zoneReceive: "chat:zone:receive",
  moderatorAnnouncementSend: "chat:moderator_announcement:send",
  moderatorAnnouncementReceive: "chat:moderator_announcement:receive",
} as const

export function evaluateChatDelivery(
  input: ChatDeliveryInput,
): ChatDeliveryDecision {
  const body = input.message.body.trim()

  if (body.length === 0) {
    return denied("empty_body")
  }

  switch (input.message.scope) {
    case "room":
      return roomChat(input)
    case "proximity":
      return proximityChat(input)
    case "zone":
      return zoneChat(input)
    case "moderator_announcement":
      return moderatorAnnouncement(input)
  }
}

export function hasPermission(
  participant: ParticipantPolicyContext,
  permission: string,
): boolean {
  return participant.permissions.includes(permission)
}

function roomChat(input: ChatDeliveryInput): ChatDeliveryDecision {
  if (!hasPermission(input.sender, CHAT_PERMISSIONS.roomSend)) {
    return denied("missing_permission")
  }

  return recipients(
    input.participants.filter(
      (participant) =>
        participant.roomId === input.sender.roomId &&
        participant.playerId !== input.sender.playerId &&
        hasPermission(participant, CHAT_PERMISSIONS.roomReceive),
    ),
  )
}

function proximityChat(input: ChatDeliveryInput): ChatDeliveryDecision {
  if (!hasPermission(input.sender, CHAT_PERMISSIONS.proximitySend)) {
    return denied("missing_permission")
  }

  return recipients(
    input.participants.filter(
      (participant) =>
        participant.roomId === input.sender.roomId &&
        participant.playerId !== input.sender.playerId &&
        hasPermission(participant, CHAT_PERMISSIONS.proximityReceive) &&
        distance(input.sender.position, participant.position) <=
          input.config.proximityRadiusPx,
    ),
  )
}

function zoneChat(input: ChatDeliveryInput): ChatDeliveryDecision {
  const zoneId = input.message.zoneId

  if (!zoneId) {
    return denied("invalid_message")
  }

  if (!input.sender.zoneIds.includes(zoneId)) {
    return denied("out_of_scope")
  }

  if (!hasPermission(input.sender, CHAT_PERMISSIONS.zoneSend)) {
    return denied("missing_permission")
  }

  return recipients(
    input.participants.filter(
      (participant) =>
        participant.roomId === input.sender.roomId &&
        participant.playerId !== input.sender.playerId &&
        participant.zoneIds.includes(zoneId) &&
        hasPermission(participant, CHAT_PERMISSIONS.zoneReceive),
    ),
  )
}

function moderatorAnnouncement(input: ChatDeliveryInput): ChatDeliveryDecision {
  if (!hasPermission(input.sender, CHAT_PERMISSIONS.moderatorAnnouncementSend)) {
    return denied("missing_permission")
  }

  return recipients(
    input.participants.filter(
      (participant) =>
        participant.roomId === input.sender.roomId &&
        participant.playerId !== input.sender.playerId &&
        hasPermission(participant, CHAT_PERMISSIONS.moderatorAnnouncementReceive),
    ),
  )
}

function recipients(
  participants: readonly ParticipantPolicyContext[],
): ChatDeliveryDecision {
  const recipientPlayerIds = participants.map((participant) => participant.playerId)

  if (recipientPlayerIds.length === 0) {
    return denied("no_recipients")
  }

  return {
    allowed: true,
    recipientPlayerIds,
  }
}

function denied(reason: ChatRejectedReason): ChatDeliveryDenied {
  return {
    allowed: false,
    reason,
  }
}

function distance(a: PolicyVector2, b: PolicyVector2): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}
