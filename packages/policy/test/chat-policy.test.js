const assert = require("assert")
const {
  CHAT_PERMISSIONS,
  evaluateChatDelivery,
} = require("../dist/index.js")

const config = { proximityRadiusPx: 64 }

const sender = {
  playerId: "p1",
  roomId: "room-1",
  zoneIds: ["zone-a"],
  permissions: [
    CHAT_PERMISSIONS.roomSend,
    CHAT_PERMISSIONS.proximitySend,
    CHAT_PERMISSIONS.zoneSend,
    CHAT_PERMISSIONS.moderatorAnnouncementSend,
  ],
  position: { x: 0, y: 0 },
}

const nearRecipient = {
  playerId: "p2",
  roomId: "room-1",
  zoneIds: ["zone-a"],
  permissions: [
    CHAT_PERMISSIONS.roomReceive,
    CHAT_PERMISSIONS.proximityReceive,
    CHAT_PERMISSIONS.zoneReceive,
    CHAT_PERMISSIONS.moderatorAnnouncementReceive,
  ],
  position: { x: 32, y: 0 },
}

const farRecipient = {
  playerId: "p3",
  roomId: "room-1",
  zoneIds: [],
  permissions: [
    CHAT_PERMISSIONS.roomReceive,
    CHAT_PERMISSIONS.proximityReceive,
    CHAT_PERMISSIONS.moderatorAnnouncementReceive,
  ],
  position: { x: 256, y: 0 },
}

const otherRoomRecipient = {
  playerId: "p4",
  roomId: "room-2",
  zoneIds: ["zone-a"],
  permissions: [
    CHAT_PERMISSIONS.roomReceive,
    CHAT_PERMISSIONS.proximityReceive,
    CHAT_PERMISSIONS.zoneReceive,
  ],
  position: { x: 16, y: 0 },
}

const participants = [sender, nearRecipient, farRecipient, otherRoomRecipient]

const room = evaluateChatDelivery({
  sender,
  participants,
  message: { scope: "room", body: "Hello room" },
  config,
})

assert.equal(room.allowed, true)
assert.deepEqual(room.recipientPlayerIds, ["p2", "p3"])

const proximity = evaluateChatDelivery({
  sender,
  participants,
  message: { scope: "proximity", body: "Hello nearby" },
  config,
})

assert.equal(proximity.allowed, true)
assert.deepEqual(proximity.recipientPlayerIds, ["p2"])

const zone = evaluateChatDelivery({
  sender,
  participants,
  message: { scope: "zone", zoneId: "zone-a", body: "Hello zone" },
  config,
})

assert.equal(zone.allowed, true)
assert.deepEqual(zone.recipientPlayerIds, ["p2"])

const outOfScope = evaluateChatDelivery({
  sender,
  participants,
  message: { scope: "zone", zoneId: "zone-b", body: "Wrong zone" },
  config,
})

assert.equal(outOfScope.allowed, false)
assert.equal(outOfScope.reason, "out_of_scope")

const missingPermission = evaluateChatDelivery({
  sender: { ...sender, permissions: [] },
  participants,
  message: { scope: "room", body: "No permission" },
  config,
})

assert.equal(missingPermission.allowed, false)
assert.equal(missingPermission.reason, "missing_permission")

const empty = evaluateChatDelivery({
  sender,
  participants,
  message: { scope: "room", body: "   " },
  config,
})

assert.equal(empty.allowed, false)
assert.equal(empty.reason, "empty_body")
