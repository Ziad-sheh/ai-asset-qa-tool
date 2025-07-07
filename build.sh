#!/bin/sh
set -e
DIST_DIR="dist"
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR/src"
cp index.html "$DIST_DIR/"
cp -r src "$DIST_DIR/"
if [ -f firebaseConfig.js ]; then
  cp firebaseConfig.js "$DIST_DIR/"
fi

