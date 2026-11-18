#!/usr/bin/env bash
# Resolves the version to publish and the npm dist-tag arguments for publish.yml.
#
# Inputs (env): PACKAGE, REF_TYPE, REF_NAME, DRY_RUN ("true" for a rehearsal),
#               GITHUB_OUTPUT. Reads ./package.json and queries npm.
# Outputs (GITHUB_OUTPUT): version=<x.y.z>,
#   tag_args=<"" | "--tag latest-<major>" | "--tag latest-<major>.<minor>">
set -euo pipefail

VERSION=$(node -p "require('./package.json').version")
echo "package.json version: ${VERSION}"

if ! [[ "$VERSION" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
  echo "::error::Version '${VERSION}' is not a plain MAJOR.MINOR.PATCH release; this workflow does not publish prereleases."
  exit 1
fi
MAJOR=${BASH_REMATCH[1]}
MINOR=${BASH_REMATCH[2]}
PATCH=${BASH_REMATCH[3]}

if [ "$REF_TYPE" = "tag" ]; then
  if [ "$REF_NAME" != "v${VERSION}" ]; then
    echo "::error::Tag '${REF_NAME}' does not match package.json version 'v${VERSION}'."
    exit 1
  fi
elif [ "$DRY_RUN" != "true" ]; then
  echo "::error::Real publishes must run from a v* tag; '${REF_NAME}' is a ${REF_TYPE}. Use dry_run=true or push a tag."
  exit 1
else
  echo "::notice::Dry run from ${REF_TYPE} '${REF_NAME}': skipping the tag/version match check."
fi

# A missing package (E404) means first publish; any other failure aborts.
ERR_FILE=$(mktemp)
if VIEW=$(npm view "$PACKAGE" --json versions dist-tags 2>"$ERR_FILE"); then
  :
elif grep -q E404 "$ERR_FILE"; then
  VIEW='{}'
else
  cat "$ERR_FILE" >&2
  exit 1
fi

# npm >= 12 wraps `npm view --json` output in an array; npm 11 returns an object.
# A package with a single version reports `versions` as a string, not an array.
VIEW=$(echo "$VIEW" | jq -c '
  (if type == "array" then (.[0] // {}) else . end)
  | {versions: (.versions // [] | if type == "string" then [.] else . end),
     latest: (."dist-tags".latest // "")}')

if echo "$VIEW" | jq -e --arg v "$VERSION" '.versions | index($v) != null' >/dev/null; then
  if [ "$DRY_RUN" = "true" ]; then
    echo "::warning::${PACKAGE}@${VERSION} is already on npm; a real publish of this version would fail."
  else
    echo "::error::${PACKAGE}@${VERSION} is already on npm."
    exit 1
  fi
fi

LATEST=$(echo "$VIEW" | jq -r '.latest')
echo "Current latest on npm: ${LATEST:-<none>}"

# Never let a version below the current `latest` become `latest`:
# an older major (a 1.x patch after 2.0.0) gets `latest-<major>`, and an older
# minor/patch line of the latest major (1.1.1 after 1.2.0) gets
# `latest-<major>.<minor>`. npm itself refuses to implicitly tag such a version
# `latest`. The tags avoid `v<major>`: npm rejects dist-tags that are valid
# semver ranges, and `v1` is one.
TAG_ARGS=""
if [[ "$LATEST" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+) ]]; then
  LATEST_MAJOR=${BASH_REMATCH[1]}
  LATEST_MINOR=${BASH_REMATCH[2]}
  LATEST_PATCH=${BASH_REMATCH[3]}
  if [ "$MAJOR" -lt "$LATEST_MAJOR" ]; then
    TAG_ARGS="--tag latest-${MAJOR}"
  elif [ "$MAJOR" -eq "$LATEST_MAJOR" ] &&
    { [ "$MINOR" -lt "$LATEST_MINOR" ] ||
      { [ "$MINOR" -eq "$LATEST_MINOR" ] && [ "$PATCH" -lt "$LATEST_PATCH" ]; }; }; then
    TAG_ARGS="--tag latest-${MAJOR}.${MINOR}"
  fi
elif [ -n "$LATEST" ]; then
  echo "::error::Cannot parse npm latest '${LATEST}' as MAJOR.MINOR.PATCH."
  exit 1
fi
echo "dist-tag: ${TAG_ARGS:-latest (default)}"

echo "version=${VERSION}" >> "$GITHUB_OUTPUT"
echo "tag_args=${TAG_ARGS}" >> "$GITHUB_OUTPUT"
