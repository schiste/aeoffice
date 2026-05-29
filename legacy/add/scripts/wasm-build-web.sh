#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB_DIR="$REPO_ROOT/apps/web"
OUT_DIR="$WEB_DIR/src/lib/wasm/add-web-bindings"
REAL_CARGO="$(rustup which cargo)"
REAL_CARGO_DIR="$(dirname "$REAL_CARGO")"
REAL_WASM_PACK="${HOME}/.cargo/bin/wasm-pack"

rm -rf "$OUT_DIR"

PATH="$REAL_CARGO_DIR:${HOME}/.cargo/bin:/usr/bin:/bin:/usr/sbin:/sbin" \
CARGO="$REAL_CARGO" \
"$REAL_WASM_PACK" build "$REPO_ROOT/crates/web-bindings" \
  --target web \
  --release \
  --out-dir "$OUT_DIR" \
  --out-name runtime
