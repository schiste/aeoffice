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

- `coturn/turnserver.conf` is a local configuration skeleton.
- Static TURN secrets must come from environment or a secret manager.
