#!/usr/bin/env bash
set -euo pipefail

STA=static
SRC=content
DST=build
CSS=static/style.css
LUA=link-fix.lua

# Directory to ignore (relative to SRC)
IGN="$SRC/Templates"

# clean up the build directory
if [[ -d "$DST" ]]; then
  echo "Cleaning up the build directory..."
  rm -rf "$DST"
fi
mkdir -p "$DST"

# copy the static files to build directory
cp -r "$STA" "$DST"

# walk the tree, pruning $IGN, convert .md → .html
find "$SRC" \
  -path "$IGN" -prune -o \
  -type f -name '*.md' -print | while IFS= read -r md; do

  # compute output path
  rel="${md#$SRC/}"
  out="$DST/${rel%.md}.html"
  mkdir -p "$(dirname "$out")"

  pandoc \
    --from markdown \
    --to html \
    --mathml \
    --highlight-style pygments \
    --embed-resources \
    --standalone \
    --lua-filter="$LUA" \
    --css="$CSS" \
    "$md" \
    -o "$out"
done