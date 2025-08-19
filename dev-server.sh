#!/bin/bash
set -e

cd build

# TODO: add watch mode
echo "Starting development server on http://localhost:8000"
python3 -m http.server 8000