#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -x "$ROOT_DIR/node_modules/.bin/tsc" ]]; then
  TSC="$ROOT_DIR/node_modules/.bin/tsc"
elif [[ -x "$ROOT_DIR/legacy/skyoffice-original/node_modules/.bin/tsc" ]]; then
  TSC="$ROOT_DIR/legacy/skyoffice-original/node_modules/.bin/tsc"
else
  echo "Missing TypeScript compiler. Run npm install at the repository root." >&2
  exit 1
fi

echo "Building target TypeScript workspace..."
"$TSC" -b "$ROOT_DIR/tsconfig.json"

mkdir -p "$ROOT_DIR/node_modules/@aedventure"
ln -sfn "../../packages/protocol" "$ROOT_DIR/node_modules/@aedventure/protocol"
ln -sfn "../../packages/map-engine" "$ROOT_DIR/node_modules/@aedventure/map-engine"
ln -sfn "../../packages/auth-wikimedia" "$ROOT_DIR/node_modules/@aedventure/auth-wikimedia"
ln -sfn "../../packages/policy" "$ROOT_DIR/node_modules/@aedventure/policy"
ln -sfn "../../packages/shared-types" "$ROOT_DIR/node_modules/@aedventure/shared-types"
ln -sfn "../../apps/api" "$ROOT_DIR/node_modules/@aedventure/api"
ln -sfn "../../apps/media-gateway" "$ROOT_DIR/node_modules/@aedventure/media-gateway"
ln -sfn "../../apps/web" "$ROOT_DIR/node_modules/@aedventure/web"
ln -sfn "../../apps/world-server" "$ROOT_DIR/node_modules/@aedventure/world-server"

echo "Running map-engine movement checks..."
node "$ROOT_DIR/packages/map-engine/test/movement.test.js"

echo "Running Wikimedia OAuth checks..."
node "$ROOT_DIR/packages/auth-wikimedia/test/oauth-flow.test.js"

echo "Running policy checks..."
node "$ROOT_DIR/packages/policy/test/chat-policy.test.js"

echo "Running authoritative world-server checks..."
node "$ROOT_DIR/apps/world-server/test/authoritative-world.test.js"

echo "Running API auth/session checks..."
node "$ROOT_DIR/apps/api/test/authentication.test.js"
node "$ROOT_DIR/apps/api/test/controller.test.js"
node "$ROOT_DIR/apps/api/test/postgres-store.test.js"
node "$ROOT_DIR/apps/api/test/pg-executor.test.js"
node "$ROOT_DIR/apps/api/test/wikimedia-oauth-controller.test.js"
node "$ROOT_DIR/apps/api/test/routes.test.js"
node "$ROOT_DIR/apps/api/test/world-store.test.js"
node "$ROOT_DIR/apps/api/test/permission-store.test.js"
node "$ROOT_DIR/apps/api/test/seeded-permission-resolver.test.js"

echo "Running media-gateway checks..."
node "$ROOT_DIR/apps/media-gateway/test/media-gateway.test.js"

echo "Running browser app-layer checks..."
node "$ROOT_DIR/apps/web/test/customer-office-app.test.js"
node "$ROOT_DIR/apps/web/test/adapters.test.js"

"$ROOT_DIR/scripts/verify-infra-config.sh"

echo "Target stack verification passed."
