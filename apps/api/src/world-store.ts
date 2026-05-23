import type {
  MapId,
  MapVersionId,
  RoomId,
  SpaceId,
  TenantId,
  UserId,
} from "@aedventure/shared-types"
import type { SqlExecutor } from "./postgres-store"

export type MapVersionStatus = "draft" | "published" | "archived"
export type MapDocument = Record<string, unknown>

export interface SpaceRecord {
  readonly id: SpaceId
  readonly tenantId: TenantId
  readonly slug: string
  readonly name: string
  readonly createdAt: string
  readonly updatedAt: string
}

export interface RoomRecord {
  readonly id: RoomId
  readonly spaceId: SpaceId
  readonly slug: string
  readonly name: string
  readonly createdAt: string
  readonly updatedAt: string
}

export interface WorldMapRecord {
  readonly id: MapId
  readonly spaceId: SpaceId
  readonly slug: string
  readonly name: string
  readonly activeVersionId?: MapVersionId
  readonly createdAt: string
  readonly updatedAt: string
}

export interface MapVersionRecord {
  readonly id: MapVersionId
  readonly mapId: MapId
  readonly versionNumber: number
  readonly status: MapVersionStatus
  readonly mapDocument: MapDocument
  readonly createdByUserId?: UserId
  readonly createdAt: string
}

export interface CreateSpaceInput {
  readonly id: SpaceId
  readonly tenantId: TenantId
  readonly slug: string
  readonly name: string
  readonly now: string
}

export interface CreateRoomInput {
  readonly id: RoomId
  readonly spaceId: SpaceId
  readonly slug: string
  readonly name: string
  readonly now: string
}

export interface CreateMapInput {
  readonly id: MapId
  readonly spaceId: SpaceId
  readonly slug: string
  readonly name: string
  readonly now: string
}

export interface CreateMapVersionInput {
  readonly id: MapVersionId
  readonly mapId: MapId
  readonly versionNumber: number
  readonly status: MapVersionStatus
  readonly mapDocument: MapDocument
  readonly createdByUserId?: UserId
  readonly now: string
}

export interface PublishMapVersionInput {
  readonly mapId: MapId
  readonly versionId: MapVersionId
  readonly now: string
}

export interface WorldStore {
  findSpaceBySlug(
    tenantId: TenantId,
    slug: string,
  ): Promise<SpaceRecord | undefined>
  listRoomsForSpace(spaceId: SpaceId): Promise<readonly RoomRecord[]>
  listMapsForSpace(spaceId: SpaceId): Promise<readonly WorldMapRecord[]>
  createSpace(input: CreateSpaceInput): Promise<SpaceRecord>
  createRoom(input: CreateRoomInput): Promise<RoomRecord>
  createMap(input: CreateMapInput): Promise<WorldMapRecord>
  createMapVersion(input: CreateMapVersionInput): Promise<MapVersionRecord>
  publishMapVersion(input: PublishMapVersionInput): Promise<WorldMapRecord>
}

type SqlTimestamp = string | Date

interface SpaceRow {
  readonly id: string
  readonly tenant_id: string
  readonly slug: string
  readonly name: string
  readonly created_at: SqlTimestamp
  readonly updated_at: SqlTimestamp
}

interface RoomRow {
  readonly id: string
  readonly space_id: string
  readonly slug: string
  readonly name: string
  readonly created_at: SqlTimestamp
  readonly updated_at: SqlTimestamp
}

interface MapRow {
  readonly id: string
  readonly space_id: string
  readonly slug: string
  readonly name: string
  readonly active_version_id: string | null
  readonly created_at: SqlTimestamp
  readonly updated_at: SqlTimestamp
}

interface MapVersionRow {
  readonly id: string
  readonly map_id: string
  readonly version_number: number
  readonly status: MapVersionStatus
  readonly map_document: MapDocument
  readonly created_by_user_id: string | null
  readonly created_at: SqlTimestamp
}

const SPACE_COLUMNS = "id, tenant_id, slug, name, created_at, updated_at"
const ROOM_COLUMNS = "id, space_id, slug, name, created_at, updated_at"
const MAP_COLUMNS =
  "id, space_id, slug, name, active_version_id, created_at, updated_at"
const MAP_VERSION_COLUMNS =
  "id, map_id, version_number, status, map_document, created_by_user_id, created_at"

export class PostgresWorldStore implements WorldStore {
  constructor(private readonly sql: SqlExecutor) {}

  async findSpaceBySlug(
    tenantId: TenantId,
    slug: string,
  ): Promise<SpaceRecord | undefined> {
    const row = await this.sql.oneOrNone<SpaceRow>({
      text: `
        select ${SPACE_COLUMNS}
        from spaces
        where tenant_id = $1 and slug = $2
      `,
      values: [tenantId, slug],
    })

    return row ? toSpaceRecord(row) : undefined
  }

  async listRoomsForSpace(spaceId: SpaceId): Promise<readonly RoomRecord[]> {
    const rows = await this.sql.many<RoomRow>({
      text: `
        select ${ROOM_COLUMNS}
        from rooms
        where space_id = $1
        order by slug asc
      `,
      values: [spaceId],
    })

    return rows.map(toRoomRecord)
  }

  async listMapsForSpace(spaceId: SpaceId): Promise<readonly WorldMapRecord[]> {
    const rows = await this.sql.many<MapRow>({
      text: `
        select ${MAP_COLUMNS}
        from maps
        where space_id = $1
        order by slug asc
      `,
      values: [spaceId],
    })

    return rows.map(toMapRecord)
  }

  async createSpace(input: CreateSpaceInput): Promise<SpaceRecord> {
    const row = await this.sql.one<SpaceRow>({
      text: `
        insert into spaces (id, tenant_id, slug, name, created_at, updated_at)
        values ($1, $2, $3, $4, $5, $5)
        returning ${SPACE_COLUMNS}
      `,
      values: [input.id, input.tenantId, input.slug, input.name, input.now],
    })

    return toSpaceRecord(row)
  }

  async createRoom(input: CreateRoomInput): Promise<RoomRecord> {
    const row = await this.sql.one<RoomRow>({
      text: `
        insert into rooms (id, space_id, slug, name, created_at, updated_at)
        values ($1, $2, $3, $4, $5, $5)
        returning ${ROOM_COLUMNS}
      `,
      values: [input.id, input.spaceId, input.slug, input.name, input.now],
    })

    return toRoomRecord(row)
  }

  async createMap(input: CreateMapInput): Promise<WorldMapRecord> {
    const row = await this.sql.one<MapRow>({
      text: `
        insert into maps (id, space_id, slug, name, created_at, updated_at)
        values ($1, $2, $3, $4, $5, $5)
        returning ${MAP_COLUMNS}
      `,
      values: [input.id, input.spaceId, input.slug, input.name, input.now],
    })

    return toMapRecord(row)
  }

  async createMapVersion(
    input: CreateMapVersionInput,
  ): Promise<MapVersionRecord> {
    const row = await this.sql.one<MapVersionRow>({
      text: `
        insert into map_versions (
          id,
          map_id,
          version_number,
          status,
          map_document,
          created_by_user_id,
          created_at
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        returning ${MAP_VERSION_COLUMNS}
      `,
      values: [
        input.id,
        input.mapId,
        input.versionNumber,
        input.status,
        input.mapDocument,
        input.createdByUserId ?? null,
        input.now,
      ],
    })

    return toMapVersionRecord(row)
  }

  async publishMapVersion(
    input: PublishMapVersionInput,
  ): Promise<WorldMapRecord> {
    const row = await this.sql.one<MapRow>({
      text: `
        with target_version as (
          update map_versions
          set status = 'published'
          where id = $2 and map_id = $1
          returning id
        ),
        archived_versions as (
          update map_versions
          set status = 'archived'
          where map_id = $1
            and id <> $2
            and status = 'published'
          returning id
        )
        update maps
        set active_version_id = (select id from target_version),
            updated_at = $3
        where id = $1
          and exists (select 1 from target_version)
        returning ${MAP_COLUMNS}
      `,
      values: [input.mapId, input.versionId, input.now],
    })

    return toMapRecord(row)
  }
}

function toSpaceRecord(row: SpaceRow): SpaceRecord {
  return {
    id: row.id as SpaceId,
    tenantId: row.tenant_id as TenantId,
    slug: row.slug,
    name: row.name,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

function toRoomRecord(row: RoomRow): RoomRecord {
  return {
    id: row.id as RoomId,
    spaceId: row.space_id as SpaceId,
    slug: row.slug,
    name: row.name,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

function toMapRecord(row: MapRow): WorldMapRecord {
  return {
    id: row.id as MapId,
    spaceId: row.space_id as SpaceId,
    slug: row.slug,
    name: row.name,
    activeVersionId: row.active_version_id
      ? (row.active_version_id as MapVersionId)
      : undefined,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

function toMapVersionRecord(row: MapVersionRow): MapVersionRecord {
  return {
    id: row.id as MapVersionId,
    mapId: row.map_id as MapId,
    versionNumber: row.version_number,
    status: row.status,
    mapDocument: row.map_document,
    createdByUserId: row.created_by_user_id
      ? (row.created_by_user_id as UserId)
      : undefined,
    createdAt: toIso(row.created_at),
  }
}

function toIso(value: SqlTimestamp): string {
  return value instanceof Date ? value.toISOString() : value
}
