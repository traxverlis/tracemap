#!/usr/bin/env bash
# Restore a backup produced by scripts/backup.sh.
#
# Usage: scripts/restore.sh <dump-file> [files-archive.tar.gz]
set -euo pipefail

cd "$(dirname "$0")/.."

DUMP="${1:?usage: scripts/restore.sh <dump-file> [files-archive.tar.gz]}"
ARCHIVE="${2:-}"
SERVICE="${POSTGRES_SERVICE:-postgres}"
DB="${POSTGRES_DB:-dim}"
USER="${POSTGRES_USER:-dim}"

if [ ! -f "$DUMP" ]; then
    echo "dump not found: $DUMP" >&2
    exit 1
fi

read -r -p "This overwrites the '$DB' database. Type RESTORE to continue: " CONFIRM
if [ "$CONFIRM" != "RESTORE" ]; then
    echo "aborted"
    exit 1
fi

echo "Restoring database..."
docker compose exec -T "$SERVICE" \
    pg_restore --username "$USER" --dbname "$DB" --clean --if-exists < "$DUMP"

if [ -n "$ARCHIVE" ]; then
    if [ ! -f "$ARCHIVE" ]; then
        echo "archive not found: $ARCHIVE" >&2
        exit 1
    fi
    echo "Restoring evidence / reports / photos..."
    docker compose run --rm --no-deps \
        -v "$(cd "$(dirname "$ARCHIVE")" && pwd):/backup" \
        --entrypoint sh backend -c \
        "tar xzf /backup/$(basename "$ARCHIVE") -C /data"
fi

echo "Restore complete."
