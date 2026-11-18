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
     tags: (."dist-tags" // {})}')

if echo "$VIEW" | jq -e --arg v "$VERSION" '.versions | index($v) != null' >/dev/null; then
  if [ "$DRY_RUN" = "true" ]; then
    echo "::warning::${PACKAGE}@${VERSION} is already on npm; a real publish of this version would fail."
  else
    echo "::error::${PACKAGE}@${VERSION} is already on npm."
    exit 1
  fi
fi

# Prints the version holding dist-tag $1, or nothing if the tag is unset.
tag_holder() { echo "$VIEW" | jq -r --arg t "$1" '.tags[$t] // ""'; }

# Succeeds if MAJOR.MINOR.PATCH is below the npm version $1, comparing only
# its MAJOR.MINOR.PATCH core (so 2.0.0 is not below 2.0.0-beta.1). Aborts on
# anything that is not semver: never guess.
below() {
  if ! [[ "$1" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)([-+].*)?$ ]]; then
    echo "::error::Cannot compare against npm version '$1': not MAJOR.MINOR.PATCH."
    exit 1
  fi
  local ma=${BASH_REMATCH[1]} mi=${BASH_REMATCH[2]} pa=${BASH_REMATCH[3]}
  [ "$MAJOR" -lt "$ma" ] ||
    { [ "$MAJOR" -eq "$ma" ] && { [ "$MINOR" -lt "$mi" ] ||
      { [ "$MINOR" -eq "$mi" ] && [ "$PATCH" -lt "$pa" ]; }; }; }
}

LATEST=$(tag_holder latest)
echo "Current latest on npm: ${LATEST:-<none>}"

# Never move a dist-tag backwards. A version below `latest` goes to the
# newest line tag it does not lower: `latest-<major>` (1.4.1 after 2.0.0), else
# `latest-<major>.<minor>` (1.1.1 after 1.2.0, or 1.2.4 after 2.0.0 when
# latest-1 is 1.3.0). npm itself refuses to implicitly tag such a version
# `latest`. The tags avoid `v<major>`: npm rejects dist-tags that are valid
# semver ranges, and `v1` is one.
TAG_ARGS=""
if [ -n "$LATEST" ] && below "$LATEST"; then
  CANDIDATES=("latest-${MAJOR}.${MINOR}")
  if [ "$MAJOR" -lt "${LATEST%%.*}" ]; then
    CANDIDATES=("latest-${MAJOR}" "${CANDIDATES[@]}")
  fi
  for TAG in "${CANDIDATES[@]}"; do
    HOLDER=$(tag_holder "$TAG")
    if [ -z "$HOLDER" ] || ! below "$HOLDER"; then
      TAG_ARGS="--tag ${TAG}"
      break
    fi
    echo "${TAG} is at ${HOLDER}, newer than ${VERSION}; not moving it back."
  done
  if [ -z "$TAG_ARGS" ]; then
    echo "::error::${VERSION} is older than every dist-tag it could take (latest-${MAJOR}.${MINOR} is $(tag_holder "latest-${MAJOR}.${MINOR}")); publishing it would move a tag backwards."
    exit 1
  fi
fi
echo "dist-tag: ${TAG_ARGS:-latest (default)}"

echo "version=${VERSION}" >> "$GITHUB_OUTPUT"
echo "tag_args=${TAG_ARGS}" >> "$GITHUB_OUTPUT"
