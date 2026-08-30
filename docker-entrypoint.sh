#!/bin/sh
set -eu

mkdir -p /app/data /app/data/uploads

for file in admin-config.json activity-log.json artist-requests.json; do
  if [ ! -f "/app/data/$file" ] && [ -f "/app/data-seed/$file" ]; then
    cp "/app/data-seed/$file" "/app/data/$file"
  fi
done

if [ "${OVERWRITE_SEEDED_DATA:-false}" = "true" ]; then
  for file in artist-requests.json; do
    if [ -f "/app/data-seed/$file" ]; then
      cp "/app/data-seed/$file" "/app/data/$file"
    fi
  done
fi

if [ "${OVERWRITE_ADMIN_CONFIG:-false}" = "true" ]; then
  if [ -f "/app/data-seed/admin-config.json" ]; then
    cp "/app/data-seed/admin-config.json" "/app/data/admin-config.json"
  fi
fi

exec "$@"
