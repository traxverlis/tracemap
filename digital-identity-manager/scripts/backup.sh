#!/usr/bin/env bash
# Encrypted-at-rest-friendly backup of the inventory.
#
# The dump contains highly sensitive personal data: store it on an encrypted
# volume and delete it as soon as it is no longer needed.
#
# Usage: scripts/backup.sh [destination-directory]
set -euo pipefail

cd "$(dirname "$0")/.."

DEST="${1:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SERVICE="${POSTGRES_SERVICE:-postgres}"
DB="${POSTGRES_DB:-dim}"
USER="${POSTGRES_USER:-dim}"

mkdir -p "$DEST"
chmod 700 "$DEST"

DUMP="$DEST/dim-$STAMP.dump"

echo "Dumping database '$DB' from service '$SERVICE'..."
docker compose exec -T "$SERVICE" pg_dump --username "$USER" --format=custom "$DB" > "$DUMP"
chmod 600 "$DUMP"

echo "Archiving evidence and reports volumes..."
docker compose run --rm --no-deps \
    -v "$(cd "$DEST" && pwd):/backup" \
    --entrypoint sh backend -c \
    "tar czf /backup/dim-files-$STAMP.tar.gz -C /data evidence reports photos" || {
        echo "warning: file archive failed (is the stack running?)" >&2
    }

echo "Backup written to $DEST"
echo "Remember: these files contain personal data. Encrypt them."
