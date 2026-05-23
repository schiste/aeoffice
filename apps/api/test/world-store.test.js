const assert = require("assert")
const { PostgresWorldStore } = require("../dist/world-store.js")

const now = "2026-05-23T10:00:00.000Z"

class RecordingExecutor {
  constructor({ oneRows = [], oneOrNoneRows = [], manyRows = [] } = {}) {
    this.oneRows = [...oneRows]
    this.oneOrNoneRows = [...oneOrNoneRows]
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
    return this.oneOrNoneRows.shift()
  }

  async many(query) {
    this.queries.push(query)
    return this.manyRows.shift() ?? []
  }
}

async function main() {
  const spaceExecutor = new RecordingExecutor({
    oneRows: [
      {
        id: "space_1",
        tenant_id: "tenant_1",
        slug: "hq",
        name: "HQ",
        created_at: new Date(now),
        updated_at: new Date(now),
      },
    ],
  })
  const spaceStore = new PostgresWorldStore(spaceExecutor)

  const space = await spaceStore.createSpace({
    id: "space_1",
    tenantId: "tenant_1",
    slug: "hq",
    name: "HQ",
    now,
  })

  assert.equal(space.tenantId, "tenant_1")
  assert.equal(space.createdAt, now)
  assert.match(spaceExecutor.queries[0].text, /insert into spaces/)

  const lookupExecutor = new RecordingExecutor({
    oneOrNoneRows: [
      {
        id: "space_1",
        tenant_id: "tenant_1",
        slug: "hq",
        name: "HQ",
        created_at: now,
        updated_at: now,
      },
    ],
  })
  const lookupStore = new PostgresWorldStore(lookupExecutor)

  const foundSpace = await lookupStore.findSpaceBySlug("tenant_1", "hq")

  assert.equal(foundSpace.id, "space_1")
  assert.match(lookupExecutor.queries[0].text, /from spaces/)
  assert.deepEqual(lookupExecutor.queries[0].values, ["tenant_1", "hq"])

  const roomExecutor = new RecordingExecutor({
    oneRows: [
      {
        id: "room_1",
        space_id: "space_1",
        slug: "lobby",
        name: "Lobby",
        created_at: now,
        updated_at: now,
      },
    ],
  })
  const roomStore = new PostgresWorldStore(roomExecutor)

  const room = await roomStore.createRoom({
    id: "room_1",
    spaceId: "space_1",
    slug: "lobby",
    name: "Lobby",
    now,
  })

  assert.equal(room.spaceId, "space_1")
  assert.match(roomExecutor.queries[0].text, /insert into rooms/)

  const listExecutor = new RecordingExecutor({
    manyRows: [
      [
        {
          id: "room_1",
          space_id: "space_1",
          slug: "lobby",
          name: "Lobby",
          created_at: now,
          updated_at: now,
        },
      ],
    ],
  })
  const listStore = new PostgresWorldStore(listExecutor)

  const rooms = await listStore.listRoomsForSpace("space_1")

  assert.equal(rooms.length, 1)
  assert.equal(rooms[0].slug, "lobby")
  assert.match(listExecutor.queries[0].text, /order by slug asc/)

  const mapExecutor = new RecordingExecutor({
    oneRows: [
      {
        id: "map_1",
        space_id: "space_1",
        slug: "floor-1",
        name: "Floor 1",
        active_version_id: null,
        created_at: now,
        updated_at: now,
      },
    ],
  })
  const mapStore = new PostgresWorldStore(mapExecutor)

  const map = await mapStore.createMap({
    id: "map_1",
    spaceId: "space_1",
    slug: "floor-1",
    name: "Floor 1",
    now,
  })

  assert.equal(map.activeVersionId, undefined)
  assert.match(mapExecutor.queries[0].text, /insert into maps/)

  const versionExecutor = new RecordingExecutor({
    oneRows: [
      {
        id: "map_version_1",
        map_id: "map_1",
        version_number: 1,
        status: "draft",
        map_document: {
          width: 320,
          height: 240,
          zones: [],
        },
        created_by_user_id: "usr_1",
        created_at: now,
      },
    ],
  })
  const versionStore = new PostgresWorldStore(versionExecutor)

  const version = await versionStore.createMapVersion({
    id: "map_version_1",
    mapId: "map_1",
    versionNumber: 1,
    status: "draft",
    mapDocument: {
      width: 320,
      height: 240,
      zones: [],
    },
    createdByUserId: "usr_1",
    now,
  })

  assert.equal(version.mapDocument.width, 320)
  assert.equal(version.createdByUserId, "usr_1")
  assert.match(versionExecutor.queries[0].text, /insert into map_versions/)

  const publishExecutor = new RecordingExecutor({
    oneRows: [
      {
        id: "map_1",
        space_id: "space_1",
        slug: "floor-1",
        name: "Floor 1",
        active_version_id: "map_version_1",
        created_at: now,
        updated_at: "2026-05-23T10:05:00.000Z",
      },
    ],
  })
  const publishStore = new PostgresWorldStore(publishExecutor)

  const published = await publishStore.publishMapVersion({
    mapId: "map_1",
    versionId: "map_version_1",
    now: "2026-05-23T10:05:00.000Z",
  })

  assert.equal(published.activeVersionId, "map_version_1")
  assert.match(publishExecutor.queries[0].text, /with target_version/)
  assert.match(publishExecutor.queries[0].text, /exists \(select 1 from target_version\)/)
  assert.match(publishExecutor.queries[0].text, /active_version_id/)
  assert.deepEqual(publishExecutor.queries[0].values, [
    "map_1",
    "map_version_1",
    "2026-05-23T10:05:00.000Z",
  ])
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
