#!/bin/sh
set -eu

mkdir -p /app/data /app/data/uploads

for file in admin-config.json activity-log.json artist-requests.json; do
  if [ ! -f "/app/data/$file" ] && [ -f "/app/data-seed/$file" ]; then
    cp "/app/data-seed/$file" "/app/data/$file"
  fi
done

exec "$@"
