#!/bin/sh
# Installs the binding templates of the OSCAL bindings spec store in a binding repository, from templates/binding/
# of the spec artifact that the binding pins (openspec/specs/binding-surface, SRF-015). Run it in the root directory
# of the binding, at the first install and on each pin move:
#
#   sh install.sh --archive <spec artifact .tar.gz> --sha256 <hex> [--record <path>] [--hooks-dir <dir>]
#
# 1. It verifies the archive by its sha256. On a different hash, it fails and changes no file.
# 2. It writes openspec/config.yaml, and <hooks-dir>/pre-commit with the archive path, the sha256 and the record path.
# 3. It writes openspec/spec-ids.yaml and the record only when they do not exist.
# 4. It writes AGENTS.md from the template, and keeps the section "Binding notes" of an existing AGENTS.md. An
#    existing AGENTS.md without that section goes into the section.
# 5. It sets core.hooksPath to <hooks-dir> when core.hooksPath is not set. It does not change another value.
#
# The default record is openspec/traceability.json, and the default hooks directory is .githooks.

set -eu

usage() {
  echo "usage: sh install.sh --archive <spec artifact .tar.gz> --sha256 <hex> [--record <path>] [--hooks-dir <dir>]" >&2
  exit 2
}
fail() {
  echo "install: $*" >&2
  exit 1
}

archive=""
sha256=""
record="openspec/traceability.json"
hooks_dir=".githooks"
while [ $# -gt 0 ]; do
  case $1 in
    --archive) [ $# -ge 2 ] || usage; archive=$2; shift 2 ;;
    --sha256) [ $# -ge 2 ] || usage; sha256=$2; shift 2 ;;
    --record) [ $# -ge 2 ] || usage; record=$2; shift 2 ;;
    --hooks-dir) [ $# -ge 2 ] || usage; hooks_dir=$2; shift 2 ;;
    *) usage ;;
  esac
done
[ -n "$archive" ] && [ -n "$sha256" ] || usage

top=$(git rev-parse --show-toplevel 2>/dev/null) || fail "run it in a git repository."
[ "$(pwd -P)" = "$(cd "$top" && pwd -P)" ] || fail "run it in the root directory of the repository, $top."
[ -f "$archive" ] || fail "the archive $archive does not exist."

# 1. Verify the archive before any file changes.
if command -v sha256sum >/dev/null 2>&1; then
  actual=$(sha256sum "$archive" | cut -d ' ' -f 1)
elif command -v shasum >/dev/null 2>&1; then
  actual=$(shasum -a 256 "$archive" | cut -d ' ' -f 1)
else
  fail "there is no sha256sum and no shasum to verify the archive."
fi
[ "$actual" = "$sha256" ] || fail "the sha256 of $archive is $actual, not $sha256. No file changed."

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
trap 'exit 1' HUP INT TERM
tar -xzf "$archive" -C "$work"
set -- "$work"/*/
[ $# -eq 1 ] && [ -d "$1" ] || fail "the archive $archive does not hold one top directory. No file changed."
src="${1%/}/templates/binding"
for f in openspec/config.yaml openspec/spec-ids.yaml openspec/traceability.json AGENTS.md hooks/pre-commit; do
  [ -f "$src/$f" ] || fail "the archive $archive has no templates/binding/$f. No file changed."
done
version=""
[ -f "${1%/}/VERSION" ] && version=$(tr -d '[:space:]' < "${1%/}/VERSION")

# 2. The template config and the hook.
mkdir -p openspec "$hooks_dir"
cp "$src/openspec/config.yaml" openspec/config.yaml
echo "wrote openspec/config.yaml"
awk -v archive="$archive" -v sha="$sha256" -v record="$record" '
  function note() { return index($0, "#") ? "  " substr($0, index($0, "#")) : "" }
  /^ARCHIVE="/ { print "ARCHIVE=\"${OSCAL_SPECS_ARCHIVE:-" archive "}\"" note(); next }
  /^ARCHIVE_SHA256="/ { print "ARCHIVE_SHA256=\"${OSCAL_SPECS_SHA256:-" sha "}\"" note(); next }
  /^RECORD="/ { print "RECORD=\"${OSCAL_SPECS_RECORD:-" record "}\"" note(); next }
  { print }
' "$src/hooks/pre-commit" > "$hooks_dir/pre-commit"
chmod +x "$hooks_dir/pre-commit"
echo "wrote $hooks_dir/pre-commit"

# 3. The ledger and the record, only when they do not exist.
for pair in "openspec/spec-ids.yaml:openspec/spec-ids.yaml" "openspec/traceability.json:$record"; do
  from=${pair%%:*}
  to=${pair#*:}
  if [ -e "$to" ]; then
    echo "kept $to"
  else
    mkdir -p "$(dirname "$to")"
    cp "$src/$from" "$to"
    echo "wrote $to"
  fi
done

# 4. The agent guide, with the section "Binding notes" of the binding.
notes="## Binding notes"
if [ -f AGENTS.md ]; then
  if grep -qx "$notes" AGENTS.md; then
    awk -v h="$notes" 'f { print } $0 == h { f = 1 }' AGENTS.md > "$work/notes"
  else
    { echo; cat AGENTS.md; } > "$work/notes"
    echo "moved the text of the existing AGENTS.md into its section \"Binding notes\""
  fi
  awk -v h="$notes" '{ print } $0 == h { exit }' "$src/AGENTS.md" > "$work/AGENTS.md"
  cat "$work/notes" >> "$work/AGENTS.md"
  cp "$work/AGENTS.md" AGENTS.md
else
  cp "$src/AGENTS.md" AGENTS.md
fi
echo "wrote AGENTS.md"

# 5. Activate the hook.
current=$(git config --get core.hooksPath || true)
if [ -z "$current" ]; then
  git config core.hooksPath "$hooks_dir"
  echo "set core.hooksPath to $hooks_dir"
elif [ "$current" != "$hooks_dir" ]; then
  echo "core.hooksPath is $current, so the hook in $hooks_dir is not active. Call it from $current/pre-commit."
fi

echo
echo "Next: add the prefixes of the binding to openspec/spec-ids.yaml, fill the section \"Binding notes\" of"
echo "AGENTS.md, and commit. The hook runs the binding checker before each commit."
if [ -n "$version" ]; then
  echo "To plan against this release, check out its tag in the contract store clone that OpenSpec reads:"
  echo "  git -C <clone> checkout v$version"
fi
