#!/bin/sh
set -eu

mkdir -p /app/data /app/tmp

if [ -f /app/ace.js ]; then
  node ace migration:run --force
fi

exec node bin/server.js
