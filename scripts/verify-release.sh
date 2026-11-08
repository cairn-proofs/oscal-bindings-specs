#!/usr/bin/env bash
#
# Checks each published spec artifact release against its tag. For each release:
#
# 1. The release has exactly the two assets the CI tag build attaches: <name>.tar.gz and SHA256SUMS.
# 2. The archive, gunzipped, has the same sha256 as `git archive --format=tar` of the tag, built with the prefix and
#    paths that scripts/build-archive.ts held at that tag. It compares the uncompressed tar because gzip output can
#    differ across git versions.
# 3. SHA256SUMS is exactly one line, and that line names the archive with its sha256.
# 4. The GitHub release attestation of each asset verifies (`gh release verify-asset`). Only the releases in
#    MUTABLE_RELEASES, published before immutable releases were on, skip this check, with a warning.
# 5. The SLSA build provenance of each asset verifies (`gh attestation verify`): signed by build.yml at the tag, for
#    the tag's commit, on a GitHub-hosted runner. Only the releases in UNATTESTED_RELEASES, built before build.yml
#    attested its output, skip this check, with a warning.
#
# It detects a release archive that differs from its tag, whoever produced it. It does not detect a change that is
# already in the tagged commit, or a tag that was moved on the remote together with its release.
#
# It runs no code from the tag and needs no npm install: git, gh, gzip, and shasum only. The clone must hold the
# release tags. GH_TOKEN must be set for gh.
#
#   scripts/verify-release.sh                 every published v* release
#   scripts/verify-release.sh <tag>...        the named releases
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-cairn-proofs/oscal-bindings-specs}"
# Published before the repository turned on immutable releases. They have no release attestation.
MUTABLE_RELEASES=("v0.1.0+oscal.1.2.3" "v0.2.0+oscal.1.2.3")
# Built before build.yml attested its output. They have no build provenance.
UNATTESTED_RELEASES=(
    "v0.1.0+oscal.1.2.3" "v0.2.0+oscal.1.2.3" "v0.3.0+oscal.1.2.3" "v0.4.0+oscal.1.2.3"
    "v0.5.0+oscal.1.2.3" "v0.5.1+oscal.1.2.3" "v0.6.0+oscal.1.2.3" "v0.7.0+oscal.1.2.3"
)

failures=()
fail() {
    failures+=("$1: $2")
    echo "::error::$1: $2"
}
sha256() { shasum -a 256 | cut -d' ' -f1; }
summary() { if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then echo "$1" >>"$GITHUB_STEP_SUMMARY"; fi; }

# The quoted strings of `export const CONTENTS = [...]` in the tag's build-archive.ts, one per line. The file is read
# as text, not run.
contents_at() {
    git show "refs/tags/$1:scripts/build-archive.ts" |
        awk '/^export const CONTENTS = \[/ { on = 1 } on { print } on && /\];/ { exit }' |
        grep -o '"[^"]*"' | tr -d '"'
}

# in_list <value> <item>...: whether the value is one of the items.
in_list() {
    local v="$1" t
    shift
    for t in "$@"; do [ "$t" = "$v" ] && return 0; done
    return 1
}

verify() {
    local tag="$1" dir version name archive paths rebuilt published listed expected assets immutable commit
    if ! git rev-parse --verify --quiet "refs/tags/$tag^{commit}" >/dev/null; then
        fail "$tag" "the clone has no such tag"
        return
    fi
    version="$(git show "refs/tags/$tag:VERSION" | tr -d '[:space:]')"
    name="oscal-bindings-specs-$version"
    archive="$name.tar.gz"

    assets="$(gh release view "$tag" --repo "$REPO" --json assets --jq '[.assets[].name] | sort | join(" ")')"
    expected="$(printf '%s\n' SHA256SUMS "$archive" | LC_ALL=C sort | paste -sd' ' -)"
    if [ "$assets" != "$expected" ]; then
        fail "$tag" "the assets are [$assets], expected [$expected]"
        return
    fi

    dir="$work/$version"
    if ! gh release download "$tag" --repo "$REPO" --dir "$dir" >/dev/null; then
        fail "$tag" "could not download the assets"
        return
    fi

    # 2. The archive against the tag.
    paths=()
    while IFS= read -r p; do paths+=("$p"); done < <(contents_at "$tag")
    if [ "${#paths[@]}" -eq 0 ]; then
        fail "$tag" "found no CONTENTS in scripts/build-archive.ts at the tag"
    else
        # pipefail makes a git or gzip failure the status of the substitution.
        if ! rebuilt="$(git archive --format=tar --prefix="$name/" "refs/tags/$tag" -- "${paths[@]}" | sha256)"; then
            fail "$tag" "git archive of the tag failed for the paths: ${paths[*]}"
        elif ! published="$(gzip -dc "$dir/$archive" | sha256)"; then
            fail "$tag" "$archive does not gunzip"
        elif [ "$rebuilt" != "$published" ]; then
            fail "$tag" "$archive differs from git archive of the tag (tar sha256 $published, expected $rebuilt)"
        fi
    fi

    # 3. The archive against SHA256SUMS.
    listed="$(cat "$dir/SHA256SUMS")"
    expected="$(sha256 <"$dir/$archive")  $archive"
    if [ "$listed" != "$expected" ]; then
        fail "$tag" "SHA256SUMS is [$listed], expected [$expected]"
    fi

    # 4. The release attestation.
    immutable="$(gh release view "$tag" --repo "$REPO" --json isImmutable --jq .isImmutable)"
    if in_list "$tag" "${MUTABLE_RELEASES[@]}"; then
        echo "::warning::$tag: a mutable release with no release attestation; the attestation check is skipped"
    elif [ "$immutable" != "true" ]; then
        fail "$tag" "the release is not immutable, so it has no release attestation"
    else
        for f in "$archive" SHA256SUMS; do
            if ! gh release verify-asset "$tag" "$dir/$f" --repo "$REPO" >/dev/null; then
                fail "$tag" "the release attestation does not verify $f"
            fi
        done
    fi

    # 5. The build provenance.
    if in_list "$tag" "${UNATTESTED_RELEASES[@]}"; then
        echo "::warning::$tag: built before build.yml attested its output; the provenance check is skipped"
    else
        commit="$(git rev-parse "refs/tags/$tag^{commit}")"
        for f in "$archive" SHA256SUMS; do
            if ! gh attestation verify "$dir/$f" --repo "$REPO" \
                --cert-identity "https://github.com/$REPO/.github/workflows/build.yml@refs/tags/$tag" \
                --source-ref "refs/tags/$tag" \
                --source-digest "$commit" \
                --deny-self-hosted-runners >/dev/null; then
                fail "$tag" "the build provenance does not verify $f"
            fi
        done
    fi

    echo "$tag: done"
}

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

tags=("$@")
if [ "${#tags[@]}" -eq 0 ]; then
    while IFS= read -r t; do tags+=("$t"); done < <(
        gh release list --repo "$REPO" --exclude-drafts --limit 1000 --json tagName --jq '.[].tagName | select(startswith("v"))'
    )
fi
if [ "${#tags[@]}" -eq 0 ]; then
    echo "::error::no published v* releases found in $REPO"
    exit 1
fi

for tag in "${tags[@]}"; do verify "$tag"; done

summary "### Release verification"
summary ""
if [ "${#failures[@]}" -eq 0 ]; then
    summary "${#tags[@]} release(s) match their tags: ${tags[*]}"
    echo "${#tags[@]} release(s) match their tags"
    exit 0
fi
for f in "${failures[@]}"; do summary "- $f"; done
echo "${#failures[@]} failure(s)"
exit 1
