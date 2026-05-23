#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

required_files=(
  "$ROOT_DIR/infra/.env.example"
  "$ROOT_DIR/infra/docker-compose.yml"
  "$ROOT_DIR/infra/coturn/turnserver.conf"
  "$ROOT_DIR/infra/livekit/production.example.yaml"
)

for file in "${required_files[@]}"; do
  if [[ ! -s "$file" ]]; then
    echo "Missing required infra file: $file" >&2
    exit 1
  fi
done

compose_file="$ROOT_DIR/infra/docker-compose.yml"
required_services=(
  "postgres:"
  "valkey:"
  "livekit:"
  "coturn:"
  "minio:"
)

for service in "${required_services[@]}"; do
  if ! rg --fixed-strings --quiet "$service" "$compose_file"; then
    echo "Missing Compose service: $service" >&2
    exit 1
  fi
done

turn_secret_line="$(rg '^static-auth-secret=' "$ROOT_DIR/infra/coturn/turnserver.conf" || true)"
if [[ "$turn_secret_line" != *'${COTURN_STATIC_AUTH_SECRET}'* ]]; then
  echo "coturn config must keep TURN secret environment-backed." >&2
  exit 1
fi

if rg --quiet "TWILIO|PeerJS|peerjs" "$ROOT_DIR/infra"; then
  echo "Infra skeleton must not reintroduce Twilio or PeerJS dependencies." >&2
  exit 1
fi

if command -v docker-compose >/dev/null 2>&1; then
  docker-compose \
    -f "$ROOT_DIR/infra/docker-compose.yml" \
    --env-file "$ROOT_DIR/infra/.env.example" \
    config >/dev/null
fi

echo "Infra config verification passed."
