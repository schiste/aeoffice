import type { SqlExecutor, SqlQuery } from "./postgres-store"

export interface PgQueryResult<TRow> {
  readonly rows: readonly TRow[]
}

export interface PgClientLike {
  query<TRow>(
    text: string,
    values: readonly unknown[],
  ): Promise<PgQueryResult<TRow>>
}

export class PgSqlExecutor implements SqlExecutor {
  constructor(private readonly client: PgClientLike) {}

  async oneOrNone<TRow>(query: SqlQuery): Promise<TRow | undefined> {
    const result = await this.client.query<TRow>(query.text, query.values)

    if (result.rows.length > 1) {
      throw new Error("Expected at most one Postgres row.")
    }

    return result.rows[0]
  }

  async one<TRow>(query: SqlQuery): Promise<TRow> {
    const result = await this.client.query<TRow>(query.text, query.values)

    if (result.rows.length !== 1) {
      throw new Error("Expected exactly one Postgres row.")
    }

    return result.rows[0]
  }
}
