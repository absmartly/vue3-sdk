#!/usr/bin/env bash
# npm installs a git dependency without running its prepack script, so a git-pinned
# @absmartly/javascript-sdk arrives without its build output (lib/, es/, dist/, types/).
# Build the locked commit's outputs the way prepack would (minus its format, lint and test steps,
# which javascript-sdk's own CI runs) and unpack it over the installed copy.
# Remove this once the dependency is a registry release again.
set -euo pipefail

cd "$(dirname "$0")/.."

resolved=$(node -p 'require("./package-lock.json").packages["node_modules/@absmartly/javascript-sdk"].resolved')
case "$resolved" in
	git+*) ;;
	*)
		echo "@absmartly/javascript-sdk is not a git dependency ($resolved); nothing to build."
		exit 0
		;;
esac

sha=${resolved##*#}
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

git -C "$work" init -q src
git -C "$work/src" fetch -q --depth 1 https://github.com/absmartly/javascript-sdk.git "$sha"
git -C "$work/src" checkout -q FETCH_HEAD

(
	cd "$work/src"
	npm ci
	npm run -s compile
	npm run -s build-es
	npm run -s build-cjs
	npm run -s build-browser
	npm pack --silent --ignore-scripts --pack-destination "$work"
)

target=node_modules/@absmartly/javascript-sdk
rm -rf "$target"
mkdir -p "$target"
tar -xzf "$work"/absmartly-javascript-sdk-*.tgz -C "$target" --strip-components=1
echo "Built @absmartly/javascript-sdk from $sha"
