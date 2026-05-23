#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/legacy/skyoffice-original"

if [[ ! -d "$APP_DIR" ]]; then
  echo "Missing app directory: $APP_DIR" >&2
  exit 1
fi

if [[ "${SKIP_INSTALL:-0}" != "1" ]]; then
  if command -v yarn >/dev/null 2>&1; then
    YARN_CMD=(yarn)
  else
    YARN_CMD=(npm exec --yes yarn@1.22.22 --)
  fi

  echo "Installing root dependencies..."
  (cd "$APP_DIR" && "${YARN_CMD[@]}" install --frozen-lockfile)

  echo "Installing client dependencies..."
  (cd "$APP_DIR/client" && "${YARN_CMD[@]}" install --frozen-lockfile)
fi

echo "Building realtime server TypeScript..."
(cd "$APP_DIR" && ./node_modules/.bin/tsc --project server/tsconfig.server.json)

echo "Building client production bundle..."
(cd "$APP_DIR/client" && ./node_modules/.bin/tsc && ./node_modules/.bin/vite build)

echo "SkyOffice baseline verification passed."
