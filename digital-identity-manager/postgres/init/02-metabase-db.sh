#!/bin/sh
# Create the Metabase application database if it does not exist yet.
# Metabase keeps its own state separate from the identity inventory.
set -eu

METABASE_DB="${METABASE_DB:-metabase}"

if [ "$(psql -tAc "SELECT 1 FROM pg_database WHERE datname = '${METABASE_DB}'" \
        --username "$POSTGRES_USER" --dbname "$POSTGRES_DB")" != "1" ]; then
    echo "creating database ${METABASE_DB}"
    createdb --username "$POSTGRES_USER" --owner "$POSTGRES_USER" "$METABASE_DB"
fi
