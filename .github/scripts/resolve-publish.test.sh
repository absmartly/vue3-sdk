#!/usr/bin/env bash
# Tests for resolve-publish.sh. Stubs `npm view` with fixtures in both the
# npm 11 (object) and npm >= 12 (array) --json shapes.
set -uo pipefail

SCRIPT="$(cd "$(dirname "$0")" && pwd)/resolve-publish.sh"
FAILURES=0

# run <name> <pkg-version> <ref-type> <ref-name> <dry-run> <view-mode> <view-json> <want-rc> <want-version> <want-tag-args>
run() {
  local name=$1 version=$2 ref_type=$3 ref_name=$4 dry_run=$5 mode=$6 json=$7
  local want_rc=$8 want_version=$9 want_tag=${10}
  local dir
  dir=$(mktemp -d)
  printf '{"version":"%s"}\n' "$version" > "$dir/package.json"
  mkdir "$dir/bin"
  printf '%s' "$json" > "$dir/view.json"
  cat > "$dir/bin/npm" <<STUB
#!/usr/bin/env bash
case "$mode" in
  ok) cat "$dir/view.json" ;;
  e404) echo "npm error code E404" >&2; exit 1 ;;
  fail) echo "npm error code ETIMEDOUT" >&2; exit 1 ;;
esac
STUB
  chmod +x "$dir/bin/npm"
  : > "$dir/out"

  local rc=0
  (cd "$dir" && PATH="$dir/bin:$PATH" PACKAGE=@absmartly/vue3-sdk REF_TYPE=$ref_type \
    REF_NAME=$ref_name DRY_RUN=$dry_run GITHUB_OUTPUT="$dir/out" bash "$SCRIPT") > "$dir/log" 2>&1 || rc=$?

  local got_version got_tag
  got_version=$(sed -n 's/^version=//p' "$dir/out")
  got_tag=$(sed -n 's/^tag_args=//p' "$dir/out")
  if [ "$rc" != "$want_rc" ] || [ "$got_version" != "$want_version" ] || [ "$got_tag" != "$want_tag" ]; then
    echo "FAIL: $name: rc=$rc version='$got_version' tag_args='$got_tag'" \
      "(want rc=$want_rc version='$want_version' tag_args='$want_tag')"
    sed 's/^/    /' "$dir/log"
    FAILURES=$((FAILURES + 1))
  else
    echo "ok: $name"
  fi
  rm -rf "$dir"
}

for shape in object array; do
  wrap() { if [ "$shape" = array ]; then printf '[%s]' "$1"; else printf '%s' "$1"; fi; }
  ONE=$(wrap '{"versions":"1.0.1","dist-tags":{"latest":"1.0.1"}}')
  ELEVEN=$(wrap '{"versions":"11.0.0","dist-tags":{"latest":"11.0.0"}}')
  TWO=$(wrap '{"versions":["1.0.1","2.0.0"],"dist-tags":{"latest":"2.0.0"}}')
  TEN=$(wrap '{"versions":["9.0.0","10.0.0"],"dist-tags":{"latest":"10.0.0"}}')

  run "$shape: patch on current major" 1.0.2 tag v1.0.2 false ok "$ONE" 0 1.0.2 ""
  run "$shape: old major after newer latest gets latest-1" 1.0.2 tag v1.0.2 false ok "$TWO" 0 1.0.2 "--tag latest-1"
  run "$shape: patch on latest major" 2.0.1 tag v2.0.1 false ok "$TWO" 0 2.0.1 ""
  run "$shape: new major" 3.0.0 tag v3.0.0 false ok "$TWO" 0 3.0.0 ""
  run "$shape: numeric major compare 9 < 10" 9.1.0 tag v9.1.0 false ok "$TEN" 0 9.1.0 "--tag latest-9"
  run "$shape: tag mismatch fails" 1.0.2 tag v1.0.3 false ok "$ONE" 1 "" ""
  run "$shape: tag without v fails" 1.0.2 tag 1.0.2 false ok "$ONE" 1 "" ""
  run "$shape: already published (single) fails" 1.0.1 tag v1.0.1 false ok "$ONE" 1 "" ""
  run "$shape: already published (list) fails" 2.0.0 tag v2.0.0 false ok "$TWO" 1 "" ""
  run "$shape: dry run of published version warns" 1.0.1 branch main true ok "$ONE" 0 1.0.1 ""
  run "$shape: dry run on tag of published version warns" 1.0.1 tag v1.0.1 true ok "$ONE" 0 1.0.1 ""
  run "$shape: single version is not substring-matched" 1.0.0 tag v1.0.0 false ok "$ELEVEN" 0 1.0.0 "--tag latest-1"
  run "$shape: real publish from branch fails" 1.0.2 branch main false ok "$ONE" 1 "" ""
done

run "prerelease rejected" 1.0.2-beta.1 tag v1.0.2-beta.1 false ok '{}' 1 "" ""
run "first publish (E404)" 1.0.0 tag v1.0.0 false e404 '' 0 1.0.0 ""
run "npm view failure aborts" 1.0.2 tag v1.0.2 false fail '' 1 "" ""
run "empty array from npm 12" 1.0.0 tag v1.0.0 false ok '[]' 0 1.0.0 ""

if [ "$FAILURES" -ne 0 ]; then
  echo "$FAILURES test(s) failed"
  exit 1
fi
echo "all tests passed"
