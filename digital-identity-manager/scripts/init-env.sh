#!/usr/bin/env bash
# Create or complete the local .env file used by the Docker stack.
#
# The compose files declare SECRET_KEY, OSINT_RUNNER_TOKEN and POSTGRES_PASSWORD
# as required: `docker compose up` refuses to start while one of them is missing
# or empty. This script copies .env.example when needed and fills only the
# secrets that are still empty, so it is safe to run several times.
#
# Usage: scripts/init-env.sh [env-file]
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE="${1:-.env}"
EXAMPLE_FILE=".env.example"
SECRET_KEYS="SECRET_KEY OSINT_RUNNER_TOKEN POSTGRES_PASSWORD"

if ! command -v openssl >/dev/null 2>&1; then
    echo "error: openssl is required to generate the secrets" >&2
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    if [ ! -f "$EXAMPLE_FILE" ]; then
        echo "error: neither $ENV_FILE nor $EXAMPLE_FILE exists" >&2
        exit 1
    fi
    cp "$EXAMPLE_FILE" "$ENV_FILE"
    echo "Created $ENV_FILE from $EXAMPLE_FILE"
fi

chmod 600 "$ENV_FILE"

TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT
chmod 600 "$TMP_FILE"

for KEY in $SECRET_KEYS; do
    # A value counts as present only when it starts with a non-blank character:
    # "KEY=" and "KEY=   " are the placeholders shipped in .env.example.
    if grep -Eq "^[[:space:]]*${KEY}=[^[:space:]]" "$ENV_FILE"; then
        echo "$KEY: already set, left untouched"
        continue
    fi

    # The secret is passed through the environment, never on a command line.
    if grep -Eq "^[[:space:]]*${KEY}=" "$ENV_FILE"; then
        # Replace the empty placeholder in place, keeping the file order.
        KEY="$KEY" VALUE="$(openssl rand -hex 32)" awk '
            BEGIN { key = ENVIRON["KEY"]; value = ENVIRON["VALUE"] }
            !replaced && $0 ~ "^[[:space:]]*" key "=" {
                print key "=" value
                replaced = 1
                next
            }
            { print }
        ' "$ENV_FILE" >"$TMP_FILE"
        cat "$TMP_FILE" >"$ENV_FILE"
    else
        KEY="$KEY" VALUE="$(openssl rand -hex 32)" awk '
            BEGIN { print ENVIRON["KEY"] "=" ENVIRON["VALUE"] }
        ' >>"$ENV_FILE"
    fi
    echo "$KEY: generated"
done

echo
echo "$ENV_FILE is ready. Review the remaining values, then start the stack:"
echo "    docker compose up -d --build"
