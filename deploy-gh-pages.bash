#!/bin/bash

# Exit immediately if a command fails
set -e

BUILD_DIR="build"
DEPLOY_BRANCH="gh-pages"
TMP_DIR=$(mktemp -d)

echo "▶️  Starting deployment..."

# Ensure build directory exists
if [ ! -d "$BUILD_DIR" ]; then
  echo "❌ Build directory '$BUILD_DIR' not found. Aborting."
  exit 1
fi

# Stash any uncommitted changes
git stash --include-untracked

# Fetch latest
git fetch origin

# Switch to gh-pages branch, or create it if it doesn't exist
if git show-ref --quiet refs/heads/$DEPLOY_BRANCH; then
  git switch $DEPLOY_BRANCH
else
  git switch --orphan $DEPLOY_BRANCH
fi

# Remove all tracked files
git rm -rf . > /dev/null 2>&1 || true

# Copy build output to repo root
cp -r $BUILD_DIR/* .

# Add and commit
git add .
COMMIT_MSG="Deploy to GitHub Pages: $(date +'%Y-%m-%d %H:%M:%S')"
git commit -m "$COMMIT_MSG"

# Push to gh-pages branch
git push -u origin $DEPLOY_BRANCH --force

# Return to previous branch and apply stash
git switch -
git stash pop || true

echo "✅ Deployed to GitHub Pages on branch '$DEPLOY_BRANCH'."
