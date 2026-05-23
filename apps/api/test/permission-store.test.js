const assert = require("assert")
const { PostgresPermissionStore } = require("../dist/permission-store.js")

const now = "2026-05-23T10:00:00.000Z"

class RecordingExecutor {
  constructor({ oneRows = [], manyRows = [] } = {}) {
    this.oneRows = [...oneRows]
    this.manyRows = [...manyRows]
    this.queries = []
  }

  async one(query) {
    this.queries.push(query)
    const row = this.oneRows.shift()
    assert.notEqual(row, undefined, "Expected one() test row.")
    return row
  }

  async oneOrNone(query) {
    this.queries.push(query)
    return undefined
  }

  async many(query) {
    this.queries.push(query)
    return this.manyRows.shift() ?? []
  }
}

async function main() {
  const roleExecutor = new RecordingExecutor({
    oneRows: [
      {
        id: "role_1",
        tenant_id: "tenant_1",
        key: "space:organizer",
        name: "Organizer",
        created_at: new Date(now),
        updated_at: new Date(now),
      },
    ],
  })
  const roleStore = new PostgresPermissionStore(roleExecutor)

  const role = await roleStore.createRole({
    id: "role_1",
    tenantId: "tenant_1",
    key: "space:organizer",
    name: "Organizer",
    now,
  })

  assert.equal(role.key, "space:organizer")
  assert.equal(role.createdAt, now)
  assert.match(roleExecutor.queries[0].text, /insert into roles/)

  const permissionExecutor = new RecordingExecutor({
    oneRows: [
      {
        id: "permission_1",
        key: "room:lobby:enter",
        description: "Enter the lobby.",
        created_at: now,
        updated_at: now,
      },
    ],
  })
  const permissionStore = new PostgresPermissionStore(permissionExecutor)

  const permission = await permissionStore.createPermission({
    id: "permission_1",
    key: "room:lobby:enter",
    description: "Enter the lobby.",
    now,
  })

  assert.equal(permission.key, "room:lobby:enter")
  assert.match(permissionExecutor.queries[0].text, /insert into permissions/)

  const grantExecutor = new RecordingExecutor({
    oneRows: [
      {
        role_id: "role_1",
        permission_id: "permission_1",
        created_at: now,
      },
    ],
  })
  const grantStore = new PostgresPermissionStore(grantExecutor)

  const grant = await grantStore.grantRolePermission({
    roleId: "role_1",
    permissionId: "permission_1",
    now,
  })

  assert.equal(grant.roleId, "role_1")
  assert.match(grantExecutor.queries[0].text, /insert into role_permissions/)

  const assignmentExecutor = new RecordingExecutor({
    oneRows: [
      {
        id: "assignment_1",
        user_id: "usr_1",
        role_id: "role_1",
        space_id: "space_1",
        room_id: null,
        created_at: now,
      },
    ],
  })
  const assignmentStore = new PostgresPermissionStore(assignmentExecutor)

  const assignment = await assignmentStore.assignUserRole({
    id: "assignment_1",
    userId: "usr_1",
    roleId: "role_1",
    spaceId: "space_1",
    now,
  })

  assert.equal(assignment.spaceId, "space_1")
  assert.equal(assignment.roomId, undefined)
  assert.match(
    assignmentExecutor.queries[0].text,
    /insert into user_role_assignments/,
  )

  const resolveExecutor = new RecordingExecutor({
    manyRows: [
      [
        {
          role_key: "space:organizer",
          permission_key: "room:lobby:enter",
        },
        {
          role_key: "space:organizer",
          permission_key: "room:lobby:enter",
        },
        {
          role_key: "space:organizer",
          permission_key: "zone:staff-room:enter",
        },
      ],
    ],
  })
  const resolveStore = new PostgresPermissionStore(resolveExecutor)

  const access = await resolveStore.resolveUserAccess({
    userId: "usr_1",
    tenantId: "tenant_1",
    spaceId: "space_1",
    roomId: "room_lobby",
  })

  assert.deepEqual(access.roles, ["space:organizer"])
  assert.deepEqual(access.permissions, [
    "room:lobby:enter",
    "zone:staff-room:enter",
  ])
  assert.match(resolveExecutor.queries[0].text, /join roles/)
  assert.match(resolveExecutor.queries[0].text, /left join permissions/)
  assert.deepEqual(resolveExecutor.queries[0].values, [
    "usr_1",
    "tenant_1",
    "space_1",
    "room_lobby",
  ])
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
