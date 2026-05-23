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
ln -sfn "../../packages/shared-types" "$ROOT_DIR/node_modules/@aedventure/shared-types"

echo "Running map-engine movement checks..."
node "$ROOT_DIR/packages/map-engine/test/movement.test.js"

echo "Running authoritative world-server checks..."
node "$ROOT_DIR/apps/world-server/test/authoritative-world.test.js"

echo "Target stack verification passed."
