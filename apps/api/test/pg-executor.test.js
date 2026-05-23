const assert = require("assert")
const { PgSqlExecutor } = require("../dist/pg-executor.js")

class RecordingPgClient {
  constructor(results) {
    this.results = [...results]
    this.queries = []
  }

  async query(text, values) {
    this.queries.push({ text, values })
    const result = this.results.shift()
    assert.notEqual(result, undefined, "Expected pg query result.")
    return result
  }
}

async function main() {
  const client = new RecordingPgClient([{ rows: [{ id: "usr_1" }] }])
  const executor = new PgSqlExecutor(client)

  const row = await executor.one({
    text: "select * from users where id = $1",
    values: ["usr_1"],
  })

  assert.deepEqual(row, { id: "usr_1" })
  assert.deepEqual(client.queries[0], {
    text: "select * from users where id = $1",
    values: ["usr_1"],
  })

  const emptyClient = new RecordingPgClient([{ rows: [] }])
  const emptyExecutor = new PgSqlExecutor(emptyClient)
  const missing = await emptyExecutor.oneOrNone({
    text: "select * from sessions where id = $1",
    values: ["missing"],
  })

  assert.equal(missing, undefined)

  const tooManyClient = new RecordingPgClient([{ rows: [{ id: 1 }, { id: 2 }] }])
  const tooManyExecutor = new PgSqlExecutor(tooManyClient)

  await assert.rejects(
    async () =>
      tooManyExecutor.oneOrNone({
        text: "select * from oauth_identities",
        values: [],
      }),
    /at most one/,
  )

  const noneClient = new RecordingPgClient([{ rows: [] }])
  const noneExecutor = new PgSqlExecutor(noneClient)

  await assert.rejects(
    async () =>
      noneExecutor.one({
        text: "insert into users (...) returning *",
        values: [],
      }),
    /exactly one/,
  )

  const manyClient = new RecordingPgClient([{ rows: [{ id: 1 }, { id: 2 }] }])
  const manyExecutor = new PgSqlExecutor(manyClient)

  const rows = await manyExecutor.many({
    text: "select * from rooms where space_id = $1",
    values: ["space_1"],
  })

  assert.equal(rows.length, 2)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
