#!/bin/sh
set -e
DIST_DIR="dist"
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"
cp index.html "$DIST_DIR/"

