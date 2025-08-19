#!/usr/bin/env bash
set -euo pipefail

STA=static
SRC=content
DST=build
CSS=components/style.css
LUA=link-fix.lua

# Nav component
NAV=components/nav.html

# Directorty containing attachments
ATC="$SRC/attachments"

# Directory to ignore (relative to SRC)
IGN="$SRC/Templates"

# clean up the build directory
if [[ -d "$DST" ]]; then
  echo "Cleaning up the build directory..."
  rm -rf "$DST"
fi
mkdir -p "$DST"

cp -r "$ATC" "$DST/attachments"

echo "Copying static files to the build directory..."
# copy the static files to build directory
cp -r "$STA"/* "$DST"

echo "Generating HTML files from Markdown..."
# walk the tree, pruning $IGN, convert .md → .html
find "$SRC" \
  -path "$IGN" -prune -o \
  -path "$ATC" -prune -o \
  -type f -name '*.md' -print | while IFS= read -r md; do

  # compute output path
  rel="${md#$SRC/}"
  out="$DST/${rel%.md}.html"
  mkdir -p "$(dirname "$out")"
  if [[ "$rel" == "blogs/"*  && "$(basename "$md" .md)" != "index" ]]; then
    pandoc \
      --from markdown \
      --to html \
      --mathml \
      --highlight-style pygments \
      --embed-resources \
      --standalone \
      --lua-filter="$LUA" \
      --css="$CSS" \
      --include-after-body "$NAV" \
      --metadata title="$(basename "$md" .md)" \
      --metadata author="Sam Ly" \
      "$md" \
      -o "$out"
  else
    pandoc \
      --from markdown \
      --to html \
      --mathml \
      --highlight-style pygments \
      --embed-resources \
      --standalone \
      --lua-filter="$LUA" \
      --css="$CSS" \
      --include-after-body "$NAV" \
      "$md" \
      -o "$out"
  fi
done