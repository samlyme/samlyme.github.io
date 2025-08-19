#!/bin/bash
set -e

# Customize these
SOURCE_DIR="build"
REMOTE_REPO="git@github.com:samlyme/samlyme.github.io.git"
REMOTE_BRANCH="gh-pages"

# Create a temp directory and initialize a bare Git repo
TMP_DIR=$(mktemp -d)

echo "📦 Copying contents of '$SOURCE_DIR' to temp directory..."
cp -r $SOURCE_DIR/* $TMP_DIR

cd $TMP_DIR
git init
git add .
git commit -m "Deploy from $SOURCE_DIR on $(date)"

echo "🚀 Pushing to $REMOTE_REPO ($REMOTE_BRANCH)..."
git branch -M $REMOTE_BRANCH
git push -f $REMOTE_REPO $REMOTE_BRANCH

echo "✅ Done. Cleaned up temp directory."
