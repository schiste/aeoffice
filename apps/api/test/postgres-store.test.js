const assert = require("assert")
const { PostgresPlatformStore } = require("../dist/postgres-store.js")

const now = "2026-05-23T10:00:00.000Z"

class RecordingExecutor {
  constructor({ oneRows = [], oneOrNoneRows = [] } = {}) {
    this.oneRows = [...oneRows]
    this.oneOrNoneRows = [...oneOrNoneRows]
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
    return this.oneOrNoneRows.shift()
  }

  async many(query) {
    this.queries.push(query)
    return []
  }
}

async function main() {
  const createUserExecutor = new RecordingExecutor({
    oneRows: [
      {
        id: "usr_1",
        username: "Ada",
        display_name: "Ada",
        blocked: false,
        created_at: new Date(now),
        updated_at: new Date(now),
      },
    ],
  })
  const createUserStore = new PostgresPlatformStore(createUserExecutor)

  const user = await createUserStore.createUser({
    id: "usr_1",
    username: "Ada",
    displayName: "Ada",
    blocked: false,
    now,
  })

  assert.equal(user.createdAt, now)
  assert.match(createUserExecutor.queries[0].text, /insert into users/)
  assert.deepEqual(createUserExecutor.queries[0].values, [
    "usr_1",
    "Ada",
    "Ada",
    false,
    now,
  ])

  const identityExecutor = new RecordingExecutor({
    oneRows: [
      {
        id: "oid_1",
        user_id: "usr_1",
        provider: "wikimedia",
        provider_subject: "wikimedia-user-1",
        username: "Ada",
        groups: ["event-organizer"],
        raw_profile: { editcount: 42 },
        created_at: now,
        updated_at: now,
      },
    ],
  })
  const identityStore = new PostgresPlatformStore(identityExecutor)

  const identity = await identityStore.createOAuthIdentity({
    id: "oid_1",
    userId: "usr_1",
    identity: {
      provider: "wikimedia",
      providerSubject: "wikimedia-user-1",
      username: "Ada",
      blocked: false,
      groups: ["event-organizer"],
      rawProfile: { editcount: 42 },
    },
    now,
  })

  assert.equal(identity.providerSubject, "wikimedia-user-1")
  assert.deepEqual(identityExecutor.queries[0].values.slice(5, 7), [
    ["event-organizer"],
    { editcount: 42 },
  ])

  const identityLookupExecutor = new RecordingExecutor({
    oneOrNoneRows: [
      {
        id: "oid_1",
        user_id: "usr_1",
        provider: "wikimedia",
        provider_subject: "wikimedia-user-1",
        username: "Ada",
        groups: ["event-organizer"],
        raw_profile: { editcount: 42 },
        created_at: now,
        updated_at: now,
      },
    ],
  })
  const identityLookupStore = new PostgresPlatformStore(identityLookupExecutor)

  const foundIdentity = await identityLookupStore.findOAuthIdentity(
    "wikimedia",
    "wikimedia-user-1",
  )

  assert.equal(foundIdentity.userId, "usr_1")
  assert.match(identityLookupExecutor.queries[0].text, /from oauth_identities/)
  assert.deepEqual(identityLookupExecutor.queries[0].values, [
    "wikimedia",
    "wikimedia-user-1",
  ])

  const identityUpdateExecutor = new RecordingExecutor({
    oneRows: [
      {
        id: "oid_1",
        user_id: "usr_1",
        provider: "wikimedia",
        provider_subject: "wikimedia-user-1",
        username: "Ada Updated",
        groups: ["interface-admin"],
        raw_profile: { editcount: 84 },
        created_at: now,
        updated_at: "2026-05-23T10:06:00.000Z",
      },
    ],
  })
  const identityUpdateStore = new PostgresPlatformStore(identityUpdateExecutor)

  const updatedIdentity = await identityUpdateStore.updateOAuthIdentity("oid_1", {
    identity: {
      provider: "wikimedia",
      providerSubject: "wikimedia-user-1",
      username: "Ada Updated",
      blocked: false,
      groups: ["interface-admin"],
      rawProfile: { editcount: 84 },
    },
    now: "2026-05-23T10:06:00.000Z",
  })

  assert.deepEqual(updatedIdentity.groups, ["interface-admin"])
  assert.match(identityUpdateExecutor.queries[0].text, /update oauth_identities/)

  const sessionExecutor = new RecordingExecutor({
    oneOrNoneRows: [
      {
        id: "sess_1",
        user_id: "usr_1",
        created_at: now,
        updated_at: now,
        expires_at: "2026-05-23T18:00:00.000Z",
        revoked_at: null,
      },
    ],
  })
  const sessionStore = new PostgresPlatformStore(sessionExecutor)

  const session = await sessionStore.findSessionById("sess_1")

  assert.equal(session.id, "sess_1")
  assert.equal(session.revokedAt, undefined)
  assert.match(sessionExecutor.queries[0].text, /from sessions/)
  assert.deepEqual(sessionExecutor.queries[0].values, ["sess_1"])

  const createSessionExecutor = new RecordingExecutor({
    oneRows: [
      {
        id: "sess_2",
        user_id: "usr_1",
        created_at: now,
        updated_at: now,
        expires_at: "2026-05-23T18:00:00.000Z",
        revoked_at: null,
      },
    ],
  })
  const createSessionStore = new PostgresPlatformStore(createSessionExecutor)

  const createdSession = await createSessionStore.createSession({
    id: "sess_2",
    userId: "usr_1",
    now,
    expiresAt: "2026-05-23T18:00:00.000Z",
  })

  assert.equal(createdSession.expiresAt, "2026-05-23T18:00:00.000Z")
  assert.match(createSessionExecutor.queries[0].text, /insert into sessions/)
  assert.deepEqual(createSessionExecutor.queries[0].values, [
    "sess_2",
    "usr_1",
    "2026-05-23T18:00:00.000Z",
    now,
  ])

  const updateExecutor = new RecordingExecutor({
    oneRows: [
      {
        id: "usr_1",
        username: "Ada Lovelace",
        display_name: "Ada Lovelace",
        blocked: false,
        created_at: now,
        updated_at: "2026-05-23T10:05:00.000Z",
      },
    ],
  })
  const updateStore = new PostgresPlatformStore(updateExecutor)

  const updated = await updateStore.updateUser("usr_1", {
    username: "Ada Lovelace",
    displayName: "Ada Lovelace",
    blocked: false,
    now: "2026-05-23T10:05:00.000Z",
  })

  assert.equal(updated.username, "Ada Lovelace")
  assert.match(updateExecutor.queries[0].text, /update users/)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
