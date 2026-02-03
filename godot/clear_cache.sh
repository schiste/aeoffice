#!/bin/bash
# Clear Godot cache for fresh reload
# Run this before opening Godot if you experience caching issues

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CACHE_DIR="$SCRIPT_DIR/.godot"

if [ -d "$CACHE_DIR" ]; then
    echo "Clearing Godot cache at: $CACHE_DIR"
    rm -rf "$CACHE_DIR"
    echo "Cache cleared successfully!"
else
    echo "No cache found at: $CACHE_DIR"
fi
