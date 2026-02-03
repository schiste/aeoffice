#!/bin/bash
# Build script for AD&D Game Engine

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Building Rust GDExtension..."
cd rust/addgame
cargo build "$@"

echo "Copying library to Godot project..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    cp target/debug/libaddgame.dylib "$SCRIPT_DIR/godot/bin/"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    cp target/debug/libaddgame.so "$SCRIPT_DIR/godot/bin/"
else
    cp target/debug/addgame.dll "$SCRIPT_DIR/godot/bin/"
fi

echo "Build complete!"
echo ""
echo "To run the game:"
echo "  1. Open Godot"
echo "  2. Import project from: $SCRIPT_DIR/godot"
echo "  3. Run the project"
