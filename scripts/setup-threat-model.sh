#!/usr/bin/env bash
#
# Bootstraps a sparse, private checkout of this repo's threat model into
# ./threat-models. Generic: this script names nothing about where the store
# actually is, so it's safe to keep in a public repo. The store URL and
# subdirectory come from the environment -- see internal onboarding for
# their values.
#
# Usage (from this repo's root):
#   THREAT_MODEL_STORE_URL=<url> scripts/setup-threat-model.sh
set -euo pipefail

if [ -z "${THREAT_MODEL_STORE_URL:-}" ]; then
    echo "THREAT_MODEL_STORE_URL is not set. See internal onboarding for the value." >&2
    exit 1
fi

TARGET_DIR="threat-models"
# Defaults to this repo's own name, which is also the convention for the
# matching directory name in the store. Override with THREAT_MODEL_SUBDIR if
# this repo's directory there is named differently.
SUBDIR="${THREAT_MODEL_SUBDIR:-$(basename "$(git rev-parse --show-toplevel)")}"

if [ -d "$TARGET_DIR/.git" ]; then
    echo "Already set up at ./${TARGET_DIR} (subdir: ${SUBDIR})" >&2
    exit 0
fi

echo "Cloning into ./${TARGET_DIR} (sparse: ${SUBDIR}/)" >&2
git clone --no-checkout --filter=blob:none "$THREAT_MODEL_STORE_URL" "$TARGET_DIR"
cd "$TARGET_DIR"
git sparse-checkout init --cone
git sparse-checkout set "$SUBDIR"
git checkout main

if [ ! -d "$SUBDIR" ]; then
    echo "warning: no '${SUBDIR}/' directory in the store yet." >&2
    echo "Create it there first, or set THREAT_MODEL_SUBDIR if this repo's" >&2
    echo "directory there is named differently." >&2
fi
