const assert = require("assert")
const { SeededPermissionResolver } = require("../dist/index.js")

async function main() {
  const resolver = new SeededPermissionResolver({
    defaultAccess: {
      roles: ["space:guest"],
      permissions: ["room:lobby:enter"],
    },
    grants: [
      {
        userId: "usr_1",
        tenantId: "tenant-1",
        spaceId: "space-1",
        roomId: "room-lobby",
        roles: ["space:member"],
        permissions: ["chat:room:send", "chat:room:receive"],
      },
      {
        userId: "usr_1",
        tenantId: "tenant-1",
        spaceId: "space-1",
        roomId: "room-lobby",
        roles: ["space:member"],
        permissions: ["media:zone:join"],
      },
      {
        userId: "usr_1",
        tenantId: "tenant-1",
        spaceId: "space-1",
        roomId: "room-private",
        roles: ["space:private-member"],
        permissions: ["room:private:enter"],
      },
    ],
  })

  const lobbyAccess = await resolver.resolveUserAccess({
    userId: "usr_1",
    tenantId: "tenant-1",
    spaceId: "space-1",
    roomId: "room-lobby",
  })

  assert.deepEqual(lobbyAccess.roles, ["space:member"])
  assert.deepEqual(lobbyAccess.permissions, [
    "chat:room:send",
    "chat:room:receive",
    "media:zone:join",
  ])

  const privateAccess = await resolver.resolveUserAccess({
    userId: "usr_1",
    tenantId: "tenant-1",
    spaceId: "space-1",
    roomId: "room-private",
  })

  assert.deepEqual(privateAccess.roles, ["space:private-member"])
  assert.deepEqual(privateAccess.permissions, ["room:private:enter"])

  const defaultAccess = await resolver.resolveUserAccess({
    userId: "usr_2",
    tenantId: "tenant-1",
    spaceId: "space-1",
    roomId: "room-lobby",
  })

  assert.deepEqual(defaultAccess.roles, ["space:guest"])
  assert.deepEqual(defaultAccess.permissions, ["room:lobby:enter"])
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
