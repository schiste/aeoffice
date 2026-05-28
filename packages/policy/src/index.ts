import type { ChatRejectedReason, ChatScope } from "@aedventure/game-protocol"

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

export type MediaMode = "room" | "proximity" | "zone" | "presentation"

export interface MediaJoinRequest {
  readonly mode: MediaMode
  readonly zoneId?: string
  readonly targetPlayerIds?: readonly string[]
  readonly publish?: boolean
  readonly subscribe?: boolean
}

export interface MediaPolicyConfig {
  readonly proximityRadiusPx: number
}

export interface MediaJoinInput {
  readonly requester: ParticipantPolicyContext
  readonly participants: readonly ParticipantPolicyContext[]
  readonly request: MediaJoinRequest
  readonly config: MediaPolicyConfig
}

export type MediaJoinRejectedReason =
  | "invalid_request"
  | "missing_permission"
  | "out_of_scope"
  | "no_targets"

export interface MediaJoinAllowed {
  readonly allowed: true
  readonly mediaRoomName: string
  readonly participantPlayerIds: readonly string[]
  readonly canPublish: boolean
  readonly canSubscribe: boolean
}

export interface MediaJoinDenied {
  readonly allowed: false
  readonly reason: MediaJoinRejectedReason
}

export type MediaJoinDecision = MediaJoinAllowed | MediaJoinDenied

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

export const MEDIA_PERMISSIONS = {
  roomJoin: "media:room:join",
  roomPublish: "media:room:publish",
  roomSubscribe: "media:room:subscribe",
  proximityJoin: "media:proximity:join",
  proximityPublish: "media:proximity:publish",
  proximitySubscribe: "media:proximity:subscribe",
  zoneJoin: "media:zone:join",
  zonePublish: "media:zone:publish",
  zoneSubscribe: "media:zone:subscribe",
  presentationJoin: "media:presentation:join",
  presentationPublish: "media:presentation:publish",
  presentationSubscribe: "media:presentation:subscribe",
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

export function evaluateMediaJoin(input: MediaJoinInput): MediaJoinDecision {
  switch (input.request.mode) {
    case "room":
      return mediaRoom(input)
    case "proximity":
      return mediaProximity(input)
    case "zone":
      return mediaZone(input)
    case "presentation":
      return mediaPresentation(input)
  }
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

function mediaRoom(input: MediaJoinInput): MediaJoinDecision {
  if (!hasPermission(input.requester, MEDIA_PERMISSIONS.roomJoin)) {
    return mediaDenied("missing_permission")
  }

  return mediaAllowed(input, {
    roomName: `room:${input.requester.roomId}`,
    participants: input.participants.filter(
      (participant) => participant.roomId === input.requester.roomId,
    ),
    publishPermission: MEDIA_PERMISSIONS.roomPublish,
    subscribePermission: MEDIA_PERMISSIONS.roomSubscribe,
  })
}

function mediaProximity(input: MediaJoinInput): MediaJoinDecision {
  if (!hasPermission(input.requester, MEDIA_PERMISSIONS.proximityJoin)) {
    return mediaDenied("missing_permission")
  }

  const targetIds = input.request.targetPlayerIds ?? []

  if (targetIds.length === 0) {
    return mediaDenied("no_targets")
  }

  const participants = input.participants.filter(
    (participant) =>
      participant.roomId === input.requester.roomId &&
      (participant.playerId === input.requester.playerId ||
        targetIds.includes(participant.playerId)) &&
      distance(input.requester.position, participant.position) <=
        input.config.proximityRadiusPx,
  )

  const resolvedTargetCount = participants.filter(
    (participant) => participant.playerId !== input.requester.playerId,
  ).length

  if (resolvedTargetCount === 0) {
    return mediaDenied("out_of_scope")
  }

  return mediaAllowed(input, {
    roomName: `proximity:${input.requester.roomId}:${sortedKey([
      input.requester.playerId,
      ...targetIds,
    ])}`,
    participants,
    publishPermission: MEDIA_PERMISSIONS.proximityPublish,
    subscribePermission: MEDIA_PERMISSIONS.proximitySubscribe,
  })
}

function mediaZone(input: MediaJoinInput): MediaJoinDecision {
  const zoneId = input.request.zoneId

  if (!zoneId) {
    return mediaDenied("invalid_request")
  }

  if (!input.requester.zoneIds.includes(zoneId)) {
    return mediaDenied("out_of_scope")
  }

  if (!hasPermission(input.requester, MEDIA_PERMISSIONS.zoneJoin)) {
    return mediaDenied("missing_permission")
  }

  return mediaAllowed(input, {
    roomName: `zone:${input.requester.roomId}:${zoneId}`,
    participants: input.participants.filter(
      (participant) =>
        participant.roomId === input.requester.roomId &&
        participant.zoneIds.includes(zoneId),
    ),
    publishPermission: MEDIA_PERMISSIONS.zonePublish,
    subscribePermission: MEDIA_PERMISSIONS.zoneSubscribe,
  })
}

function mediaPresentation(input: MediaJoinInput): MediaJoinDecision {
  if (!hasPermission(input.requester, MEDIA_PERMISSIONS.presentationJoin)) {
    return mediaDenied("missing_permission")
  }

  return mediaAllowed(input, {
    roomName: `presentation:${input.requester.roomId}`,
    participants: input.participants.filter(
      (participant) => participant.roomId === input.requester.roomId,
    ),
    publishPermission: MEDIA_PERMISSIONS.presentationPublish,
    subscribePermission: MEDIA_PERMISSIONS.presentationSubscribe,
  })
}

function mediaAllowed(
  input: MediaJoinInput,
  policy: {
    readonly roomName: string
    readonly participants: readonly ParticipantPolicyContext[]
    readonly publishPermission: string
    readonly subscribePermission: string
  },
): MediaJoinDecision {
  const canPublish =
    input.request.publish === true &&
    hasPermission(input.requester, policy.publishPermission)
  const canSubscribe =
    input.request.subscribe !== false &&
    hasPermission(input.requester, policy.subscribePermission)

  if (!canPublish && !canSubscribe) {
    return mediaDenied("missing_permission")
  }

  return {
    allowed: true,
    mediaRoomName: policy.roomName,
    participantPlayerIds: policy.participants.map(
      (participant) => participant.playerId,
    ),
    canPublish,
    canSubscribe,
  }
}

function mediaDenied(reason: MediaJoinRejectedReason): MediaJoinDenied {
  return {
    allowed: false,
    reason,
  }
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

function sortedKey(values: readonly string[]): string {
  return [...new Set(values)].sort().join(":")
}
