# infra

Target local and deployment infrastructure.

Week 1-4 goal:

- Docker Compose boots the full stack.

Expected services:

- API.
- Web.
- World server.
- PostgreSQL.
- Valkey.
- LiveKit.
- coturn.
- S3-compatible object storage.

Current implementation:

- `docker-compose.yml` boots shared local dependencies only: PostgreSQL,
  Valkey, LiveKit in local dev mode, coturn, and MinIO.
- `.env.example` lists local development variables. Real environments must
  supply secrets through environment injection or a secret manager.
- `coturn/turnserver.conf` is a local configuration skeleton.
- Static TURN secrets must come from environment or a secret manager.

App containers are intentionally not present yet. They need concrete runtime
entrypoints for `apps/api`, `apps/world-server`, `apps/media-gateway`, and
`apps/web`; adding placeholder containers before that would make local boot
status misleading.

## Local Shared Infra

From this directory:

```bash
cp .env.example .env
docker compose --env-file .env up postgres valkey livekit coturn minio
```

LiveKit currently runs in development mode and binds to `0.0.0.0` for local
container access. The production config template in `livekit/` is not wired
until the media gateway and token issuance are connected to real deployment
secrets.
