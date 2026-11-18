#!/usr/bin/env bash
# Resolves the version to publish and the npm dist-tag arguments for publish.yml.
#
# Inputs (env): PACKAGE, REF_TYPE, REF_NAME, DRY_RUN ("true" for a rehearsal),
#               GITHUB_OUTPUT, REGISTRY (default https://registry.npmjs.org).
#               Reads ./package.json and queries the registry.
# Outputs (GITHUB_OUTPUT): version=<x.y.z>,
#   tag_args=<"" | "--tag latest-<major>" | "--tag latest-<major>.<minor>">
set -euo pipefail

VERSION=$(node -p "require('./package.json').version")
echo "package.json version: ${VERSION}"

if ! [[ "$VERSION" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
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

# Registry reads bypass `npm view`: it reads the full package document, which
# npm's CDN caches for up to 300 s, so a release queued right behind another
# would see the dist-tags from before it. These two endpoints are not cached.
REGISTRY=${REGISTRY:-https://registry.npmjs.org}
PKG_PATH=${PACKAGE/\//%2f}
BODY=$(mktemp)

# get <path>: fetches ${REGISTRY}/<path> into $BODY and prints the HTTP status.
# A network failure aborts (set -e fails the caller's assignment).
get() {
  local code
  if ! code=$(curl -sS --retry 3 -o "$BODY" -w '%{http_code}' "${REGISTRY}/$1"); then
    echo "::error::Registry request for ${REGISTRY}/$1 failed." >&2
    exit 1
  fi
  echo "$code"
}

# A missing package is a first publish: the version lookup returns 404, and the
# dist-tags endpoint returns 404 (401 for a scope) because there is no package.
# Any other status aborts.
CODE=$(get "${PKG_PATH}/${VERSION}")
case "$CODE" in
  200)
    if [ "$DRY_RUN" = "true" ]; then
      echo "::warning::${PACKAGE}@${VERSION} is already on npm; a real publish of this version would fail."
    else
      echo "::error::${PACKAGE}@${VERSION} is already on npm."
      exit 1
    fi
    ;;
  404) ;;
  *)
    echo "::error::Registry returned HTTP ${CODE} looking up ${PACKAGE}@${VERSION}."
    exit 1
    ;;
esac

CODE=$(get "-/package/${PKG_PATH}/dist-tags")
case "$CODE" in
  200)
    if ! TAGS=$(jq -ce 'if type == "object" then . else error("not an object") end' "$BODY"); then
      echo "::error::Registry returned unreadable dist-tags for ${PACKAGE}."
      exit 1
    fi
    ;;
  401 | 404)
    # Only a package that does not exist has no dist-tags; confirm it.
    CODE=$(get "${PKG_PATH}")
    if [ "$CODE" != 404 ]; then
      echo "::error::Registry has no dist-tags for ${PACKAGE} but its package lookup returned HTTP ${CODE}."
      exit 1
    fi
    echo "${PACKAGE} is not on npm yet: first publish."
    TAGS='{}'
    ;;
  *)
    echo "::error::Registry returned HTTP ${CODE} reading the dist-tags of ${PACKAGE}."
    exit 1
    ;;
esac

# Prints the version holding dist-tag $1, or nothing if the tag is unset.
tag_holder() { echo "$TAGS" | jq -r --arg t "$1" '.[$t] // ""'; }

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
