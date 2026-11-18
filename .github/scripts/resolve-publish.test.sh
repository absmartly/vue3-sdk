#!/usr/bin/env bash
# Tests for resolve-publish.sh. Stubs `curl` with a fake registry that serves
# the version lookup, the dist-tags endpoint and the package document, and
# fails on any other URL.
set -uo pipefail

SCRIPT="$(cd "$(dirname "$0")" && pwd)/resolve-publish.sh"
FAILURES=0
PKG_URL="https://registry.npmjs.org/@absmartly%2fvue3-sdk"
TAGS_URL="https://registry.npmjs.org/-/package/@absmartly%2fvue3-sdk/dist-tags"

# run <name> <pkg-version> <ref-type> <ref-name> <dry-run> <mode> <published-versions> <dist-tags-json> <want-rc> <want-version> <want-tag-args>
# mode: ok (package exists), new (not on npm), fail (network error),
#       tags500 (dist-tags endpoint errors), ver500 (version lookup errors),
#       ghost / ghost401 (dist-tags 404 / 401 but package exists).
run() {
  local name=$1 version=$2 ref_type=$3 ref_name=$4 dry_run=$5 mode=$6 versions=$7 tags=$8
  local want_rc=$9 want_version=${10} want_tag=${11}
  local dir
  dir=$(mktemp -d)
  printf '{"version":"%s"}\n' "$version" > "$dir/package.json"
  mkdir "$dir/bin"
  printf '%s' "$tags" > "$dir/tags.json"
  cat > "$dir/bin/curl" <<STUB
#!/usr/bin/env bash
out= url=
while [ \$# -gt 0 ]; do
  case "\$1" in
    -o) out=\$2; shift ;;
    -w | --retry) shift ;;
    -*) ;;
    *) url=\$1 ;;
  esac
  shift
done
serve() { printf '%s' "\$2" > "\$out"; printf '%s' "\$1"; }
[ "$mode" = fail ] && { echo "curl: (6) Could not resolve host" >&2; exit 6; }
case "\$url" in
  "$TAGS_URL")
    case "$mode" in
      ok) serve 200 "\$(cat "$dir/tags.json")" ;;
      new) serve 401 '"Unauthorized"' ;;
      ghost) serve 404 '"Not Found"' ;;
      ghost401) serve 401 '"Unauthorized"' ;;
      tags500) serve 500 '"Internal Server Error"' ;;
    esac ;;
  "$PKG_URL")
    if [ "$mode" = new ]; then serve 404 '{"error":"Not found"}'; else serve 200 '{}'; fi ;;
  "$PKG_URL"/*)
    v=\${url##*/}
    if [ "$mode" = ver500 ]; then serve 500 '"Internal Server Error"'; exit 0; fi
    if [ "$mode" != new ] && [[ " $versions " == *" \$v "* ]]; then serve 200 '{}'; else serve 404 '"version not found"'; fi ;;
  *) echo "unexpected curl URL: \$url" >&2; exit 99 ;;
esac
STUB
  chmod +x "$dir/bin/curl"
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

ONE='{"latest":"1.0.1"}'
TWO='{"latest":"2.0.0"}'
MINORS='{"latest":"1.2.3"}'
LINES='{"latest":"2.0.0","latest-1":"1.4.0","latest-1.3":"1.3.0"}'

run "patch on current major" 1.0.2 tag v1.0.2 false ok "1.0.1" "$ONE" 0 1.0.2 ""
run "old major after newer latest gets latest-1" 1.0.2 tag v1.0.2 false ok "1.0.1 2.0.0" "$TWO" 0 1.0.2 "--tag latest-1"
run "patch on latest major" 2.0.1 tag v2.0.1 false ok "1.0.1 2.0.0" "$TWO" 0 2.0.1 ""
run "new major" 3.0.0 tag v3.0.0 false ok "1.0.1 2.0.0" "$TWO" 0 3.0.0 ""
run "numeric major compare 9 < 10" 9.1.0 tag v9.1.0 false ok "9.0.0 10.0.0" '{"latest":"10.0.0"}' 0 9.1.0 "--tag latest-9"
run "tag mismatch fails" 1.0.2 tag v1.0.3 false ok "1.0.1" "$ONE" 1 "" ""
run "tag without v fails" 1.0.2 tag 1.0.2 false ok "1.0.1" "$ONE" 1 "" ""
run "already published fails" 1.0.1 tag v1.0.1 false ok "1.0.1" "$ONE" 1 "" ""
run "already published (older) fails" 1.0.1 tag v1.0.1 false ok "1.0.1 2.0.0" "$TWO" 1 "" ""
run "dry run of published version warns" 1.0.1 branch main true ok "1.0.1" "$ONE" 0 1.0.1 ""
run "dry run on tag of published version warns" 1.0.1 tag v1.0.1 true ok "1.0.1" "$ONE" 0 1.0.1 ""
run "real publish from branch fails" 1.0.2 branch main false ok "1.0.1" "$ONE" 1 "" ""
run "older minor of latest major gets latest-1.1" 1.1.1 tag v1.1.1 false ok "1.1.0 1.2.0 1.2.3" "$MINORS" 0 1.1.1 "--tag latest-1.1"
run "older patch of latest minor gets latest-1.2" 1.2.1 tag v1.2.1 false ok "1.1.0 1.2.0 1.2.3" "$MINORS" 0 1.2.1 "--tag latest-1.2"
run "newer patch of latest minor stays latest" 1.2.4 tag v1.2.4 false ok "1.2.3" "$MINORS" 0 1.2.4 ""
run "newer minor of latest major stays latest" 1.3.0 tag v1.3.0 false ok "1.2.3" "$MINORS" 0 1.3.0 ""
run "numeric minor compare 9 < 10" 1.9.0 tag v1.9.0 false ok "1.10.0" '{"latest":"1.10.0"}' 0 1.9.0 "--tag latest-1.9"
run "numeric patch compare 9 < 10" 1.0.9 tag v1.0.9 false ok "1.0.10" '{"latest":"1.0.10"}' 0 1.0.9 "--tag latest-1.0"
run "higher major with lower minor stays latest" 2.0.0 tag v2.0.0 false ok "1.2.3" "$MINORS" 0 2.0.0 ""
run "older major line moves latest-1 forward" 1.4.1 tag v1.4.1 false ok "1.4.0 2.0.0" "$LINES" 0 1.4.1 "--tag latest-1"
run "latest-1 newer falls back to latest-1.3" 1.3.1 tag v1.3.1 false ok "1.3.0 1.4.0 2.0.0" "$LINES" 0 1.3.1 "--tag latest-1.3"
run "unset minor tag is created" 1.2.1 tag v1.2.1 false ok "1.2.0 2.0.0" "$LINES" 0 1.2.1 "--tag latest-1.2"
run "every candidate tag newer fails" 1.3.0 tag v1.3.0 false ok "1.3.1 2.0.0" '{"latest":"2.0.0","latest-1":"1.4.0","latest-1.3":"1.3.1"}' 1 "" ""
run "latest-1.1 newer on latest major fails" 1.1.1 tag v1.1.1 false ok "1.1.2 1.2.0" '{"latest":"1.2.0","latest-1.1":"1.1.2"}' 1 "" ""
run "latest-1.1 older on latest major moves forward" 1.1.2 tag v1.1.2 false ok "1.1.1 1.2.0" '{"latest":"1.2.0","latest-1.1":"1.1.1"}' 0 1.1.2 "--tag latest-1.1"
run "prerelease latest compares by core" 2.0.0 tag v2.0.0 false ok "2.0.0-beta.1" '{"latest":"2.0.0-beta.1"}' 0 2.0.0 ""
run "below prerelease latest major gets latest-1" 1.5.0 tag v1.5.0 false ok "2.0.0-beta.1" '{"latest":"2.0.0-beta.1"}' 0 1.5.0 "--tag latest-1"
run "unparseable line tag aborts" 1.4.1 tag v1.4.1 false ok "2.0.0" '{"latest":"2.0.0","latest-1":"junk"}' 1 "" ""
run "unparseable latest aborts" 1.0.2 tag v1.0.2 false ok "1.0.1" '{"latest":"garbage"}' 1 "" ""
run "non-object dist-tags aborts" 1.0.2 tag v1.0.2 false ok "1.0.1" '"oops"' 1 "" ""
run "invalid dist-tags JSON aborts" 1.0.2 tag v1.0.2 false ok "1.0.1" '<html>' 1 "" ""
run "no latest tag publishes as latest" 1.0.2 tag v1.0.2 false ok "1.0.1" '{}' 0 1.0.2 ""
run "prerelease rejected" 1.0.2-beta.1 tag v1.0.2-beta.1 false ok "1.0.1" "$ONE" 1 "" ""
run "leading-zero version rejected" 01.0.2 tag v01.0.2 false ok "1.0.1" "$ONE" 1 "" ""
run "first publish" 1.0.0 tag v1.0.0 false new "" "" 0 1.0.0 ""
run "network failure aborts" 1.0.2 tag v1.0.2 false fail "" "" 1 "" ""
run "dist-tags server error aborts" 1.0.2 tag v1.0.2 false tags500 "1.0.1" "" 1 "" ""
run "missing dist-tags on existing package aborts" 1.0.2 tag v1.0.2 false ghost "1.0.1" "" 1 "" ""
run "401 dist-tags on existing package aborts" 1.0.2 tag v1.0.2 false ghost401 "1.0.1" "" 1 "" ""
run "version lookup server error aborts" 1.0.2 tag v1.0.2 false ver500 "1.0.1" "$TWO" 1 "" ""

if [ "$FAILURES" -ne 0 ]; then
  echo "$FAILURES test(s) failed"
  exit 1
fi
echo "all tests passed"
