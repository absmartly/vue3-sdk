#!/usr/bin/env bash
# Tests for resolve-publish.sh. Stubs `curl` with a fake registry that serves
# the version lookup, the dist-tags endpoint and the package document, and
# fails on any other URL.
set -uo pipefail

SCRIPT="$(cd "$(dirname "$0")" && pwd)/resolve-publish.sh"
FAILURES=0
KEPT_QUERIES=$(mktemp)
PKG_URL="https://registry.npmjs.org/@absmartly%2fvue3-sdk"
TAGS_URL="https://registry.npmjs.org/-/package/@absmartly%2fvue3-sdk/dist-tags"

# run <name> <pkg-version> <ref-type> <ref-name> <dry-run> <mode> <published-versions> <dist-tags-json> <want-rc> <want-version> <want-tag-args> [<want-log-substring>] [<unwanted-log-substring>]
# published-versions: space-separated; a `!` suffix marks a version deprecated.
# mode: ok (package exists), new (not on npm), fail (network error),
#       tags500 (dist-tags endpoint errors), ver500 (version lookup errors),
#       doc500 (package document errors), docmiss (package document 404
#       while dist-tags exist), badoc / errdoc (package document is not JSON /
#       is a JSON error object), notime / noversions (package document
#       missing that map), ghost / ghost401 (dist-tags 404 / 401 but
#       package exists).
run() {
  local name=$1 version=$2 ref_type=$3 ref_name=$4 dry_run=$5 mode=$6 versions=$7 tags=$8
  local want_rc=$9 want_version=${10} want_tag=${11} want_log=${12:-} unwanted_log=${13:-}
  local dir
  dir=$(mktemp -d)
  printf '{"version":"%s"}\n' "$version" > "$dir/package.json"
  mkdir "$dir/bin"
  printf '%s' "$tags" > "$dir/tags.json"
  local v doc='{"versions":{'
  for v in $versions; do
    if [ "${v%!}" != "$v" ]; then doc+="\"${v%!}\":{\"deprecated\":\"old\"},"; else doc+="\"$v\":{},"; fi
  done
  printf '%s},"time":{}}' "${doc%,}" > "$dir/doc.json"
  if [ "$mode" = unpublished ] || [ "$mode" = pubtime ]; then
    jq --arg v "$version" '.time={($v):"2024-01-01T00:00:00.000Z"}' "$dir/doc.json" > "$dir/doc.tmp" && mv "$dir/doc.tmp" "$dir/doc.json"
  fi
  versions=${versions//!/}
  cat > "$dir/bin/curl" <<STUB
#!/usr/bin/env bash
# A missing timeout lets one hung request block every queued release.
[[ " \$* " == *" --connect-timeout "* && " \$* " == *" --max-time "* ]] ||
  { echo "curl called without --connect-timeout and --max-time: \$*" >&2; exit 98; }
out= url=
while [ \$# -gt 0 ]; do
  case "\$1" in
    -o) out=\$2; shift ;;
    -w | --retry | --connect-timeout | --max-time) shift ;;
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
      ok | ver500 | doc500 | docmiss | badoc | errdoc | notime | noversions | unpublished | pubtime) serve 200 "\$(cat "$dir/tags.json")" ;;
      new) serve 401 '"Unauthorized"' ;;
      ghost) serve 404 '"Not Found"' ;;
      ghost401) serve 401 '"Unauthorized"' ;;
      tags500) serve 500 '"Internal Server Error"' ;;
    esac ;;
  "$PKG_URL"\?_=[0-9]*)
    echo "\${url#*\?}" >> "$dir/doc-queries"
    case "$mode" in
      new | docmiss) serve 404 '{"error":"Not found"}' ;;
      doc500) serve 500 '{"error":"Internal Server Error"}' ;;
      badoc) serve 200 '<html>' ;;
      errdoc) serve 200 '{"error":"temporarily unavailable"}' ;;
      notime) serve 200 "\$(jq -c 'del(.time)' "$dir/doc.json")" ;;
      noversions) serve 200 "\$(jq -c 'del(.versions)' "$dir/doc.json")" ;;
      *) serve 200 "\$(cat "$dir/doc.json")" ;;
    esac ;;
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
  if [ "$rc" != "$want_rc" ] || [ "$got_version" != "$want_version" ] || [ "$got_tag" != "$want_tag" ] ||
    { [ -n "$want_log" ] && ! grep -qF -- "$want_log" "$dir/log"; } ||
    { [ -n "$unwanted_log" ] && grep -qF -- "$unwanted_log" "$dir/log"; }; then
    echo "FAIL: $name: rc=$rc version='$got_version' tag_args='$got_tag'" \
      "(want rc=$want_rc version='$want_version' tag_args='$want_tag' log containing '$want_log' and not '$unwanted_log')"
    sed 's/^/    /' "$dir/log"
    FAILURES=$((FAILURES + 1))
  else
    echo "ok: $name"
  fi
  if [ -n "${KEEP_DIR:-}" ]; then cat "$dir/doc-queries" >> "$KEPT_QUERIES"; fi
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
run "older patch of latest minor fails (no tag fits)" 1.2.1 tag v1.2.1 false ok "1.1.0 1.2.0 1.2.3" "$MINORS" 1 "" "" "not pointing latest-1.2 below it"
run "newer patch of latest minor stays latest" 1.2.4 tag v1.2.4 false ok "1.2.3" "$MINORS" 0 1.2.4 ""
run "newer minor of latest major stays latest" 1.3.0 tag v1.3.0 false ok "1.2.3" "$MINORS" 0 1.3.0 ""
run "numeric minor compare 9 < 10" 1.9.0 tag v1.9.0 false ok "1.10.0" '{"latest":"1.10.0"}' 0 1.9.0 "--tag latest-1.9"
run "numeric patch compare 9 < 10" 1.0.9 tag v1.0.9 false ok "1.0.10" '{"latest":"1.0.10"}' 1 "" "" "1.0.10, newer than 1.0.9"
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
run "dist-tags server error aborts" 1.0.2 tag v1.0.2 false tags500 "1.0.1" "" 1 "" "" "HTTP 500 reading the dist-tags"
run "missing dist-tags on existing package aborts" 1.0.2 tag v1.0.2 false ghost "1.0.1" "" 1 "" "" "package lookup returned HTTP 200"
run "401 dist-tags on existing package aborts" 1.0.2 tag v1.0.2 false ghost401 "1.0.1" "" 1 "" "" "package lookup returned HTTP 200"
run "first publish confirms the package is missing" 1.0.0 tag v1.0.0 false new "" "" 0 1.0.0 "" "is not on npm yet: first publish"
run "higher untagged stable version blocks implicit latest" 1.3.0 tag v1.3.0 false ok "1.2.0 2.0.0" '{"latest":"1.2.0"}' 0 1.3.0 "--tag latest-1"
run "higher stable version under another tag blocks implicit latest" 1.3.0 tag v1.3.0 false ok "1.2.0 2.0.0" '{"latest":"1.2.0","next":"2.0.0"}' 0 1.3.0 "--tag latest-1"
run "higher version on another major gets latest-<major>" 1.3.0 tag v1.3.0 false ok "1.2.0 2.0.0 2.1.0" '{"latest":"1.2.0","latest-2":"2.1.0"}' 0 1.3.0 "--tag latest-1"
run "higher same-major untagged version gets latest-1.3" 1.3.0 tag v1.3.0 false ok "1.2.0 1.4.0" '{"latest":"1.2.0"}' 0 1.3.0 "--tag latest-1.3"
run "untagged newer version in major line skips latest-1" 1.0.2 tag v1.0.2 false ok "1.0.1 1.5.0 2.0.0" '{"latest":"2.0.0"}' 0 1.0.2 "--tag latest-1.0" "not pointing latest-1 below it"
run "untagged newer version in minor line fails" 1.0.2 tag v1.0.2 false ok "1.0.1 1.0.5 2.0.0" '{"latest":"2.0.0"}' 1 "" "" "would point a tag backwards"
run "numeric line top 1.10.0 above 1.9.0" 1.9.5 tag v1.9.5 false ok "1.9.0 1.10.0 2.0.0" '{"latest":"2.0.0"}' 0 1.9.5 "--tag latest-1.9"
run "prerelease line-tag holder is ignored" 1.0.2 tag v1.0.2 false ok "1.0.1 1.6.0-beta.1 2.0.0" '{"latest":"2.0.0","next":"1.6.0-beta.1"}' 0 1.0.2 "--tag latest-1"
run "same-major prerelease latest gets latest-1.2" 1.2.0 tag v1.2.0 false ok "1.1.0 1.5.0-beta.1" '{"latest":"1.5.0-beta.1"}' 0 1.2.0 "--tag latest-1.2"
run "prerelease line-tag holder newer is not moved back" 1.4.1 tag v1.4.1 false ok "1.4.0 2.0.0 1.5.0-beta.1" '{"latest":"2.0.0","latest-1":"1.5.0-beta.1"}' 0 1.4.1 "--tag latest-1.4" "latest-1 is at 1.5.0-beta.1"
run "numeric line compare 1.0.10 above 1.0.9" 1.0.9 tag v1.0.9 false ok "1.0.10 2.0.0" '{"latest":"2.0.0"}' 1 "" "" "not pointing latest-1.0 below it"
run "line tag holder missing from stale document fails" 1.0.3 tag v1.0.3 false ok "1.0.1 2.0.0" '{"latest":"2.0.0","latest-1":"1.0.5"}' 1 "" "" "would point a tag backwards"
run "other-tag holder missing from stale document counts for its line" 1.0.3 tag v1.0.3 false ok "1.0.1 2.0.0" '{"latest":"2.0.0","next":"1.6.0"}' 0 1.0.3 "--tag latest-1.0" "not pointing latest-1 below it"
run "same-major stale holder blocks minor line" 1.2.1 tag v1.2.1 false ok "1.2.0 1.3.0" '{"latest":"1.3.0","beta":"1.2.5"}' 1 "" "" "would point a tag backwards"
run "deprecated newer version in line is ignored" 1.0.2 tag v1.0.2 false ok "1.0.1 1.5.0! 2.0.0" '{"latest":"2.0.0"}' 0 1.0.2 "--tag latest-1"
run "prerelease in line is ignored" 1.0.2 tag v1.0.2 false ok "1.0.1 1.5.0-beta.1 2.0.0" '{"latest":"2.0.0"}' 0 1.0.2 "--tag latest-1"
run "prefix 1. does not match 10.x" 1.0.2 tag v1.0.2 false ok "1.0.1 10.0.0" '{"latest":"10.0.0"}' 0 1.0.2 "--tag latest-1"
run "higher deprecated version does not block latest" 1.3.0 tag v1.3.0 false ok "1.2.0 2.0.0!" '{"latest":"1.2.0"}' 0 1.3.0 ""
run "higher prerelease version does not block latest" 1.3.0 tag v1.3.0 false ok "1.2.0 2.0.0-beta.1" '{"latest":"1.2.0","next":"2.0.0-beta.1"}' 0 1.3.0 ""
run "numeric highest compare 9 < 10" 1.9.1 tag v1.9.1 false ok "1.9.0 1.10.0" '{"latest":"1.9.0"}' 0 1.9.1 "--tag latest-1.9"
run "tag holder missing from stale document still counts" 1.0.2 tag v1.0.2 false ok "1.0.1" '{"latest":"2.0.0"}' 0 1.0.2 "--tag latest-1"
run "non-latest tag holder missing from stale document still counts" 1.0.2 tag v1.0.2 false ok "1.0.1" '{"latest":"1.0.1","next":"2.0.0"}' 0 1.0.2 "--tag latest-1"
run "package document 404 with dist-tags aborts" 1.0.2 tag v1.0.2 false docmiss "1.0.1" '{"latest":"2.0.0"}' 1 "" "" "HTTP 404 reading the package document"
run "package document without time aborts" 1.0.2 tag v1.0.2 false notime "1.0.1" '{"latest":"2.0.0"}' 1 "" "" "unreadable package document"
run "package document without versions aborts" 1.0.2 tag v1.0.2 false noversions "1.0.1" '{"latest":"2.0.0"}' 1 "" "" "unreadable package document"
run "200 error object as package document aborts" 1.0.2 tag v1.0.2 false errdoc "1.0.1" '{"latest":"2.0.0"}' 1 "" "" "unreadable package document"
run "package document server error aborts" 1.0.2 tag v1.0.2 false doc500 "1.0.1" "$ONE" 1 "" "" "reading the package document"
run "previously unpublished version aborts" 1.0.2 tag v1.0.2 false unpublished "1.0.1" "$ONE" 1 "" "" "was previously published and unpublished"
run "dry run of previously unpublished version warns" 1.0.2 branch main true unpublished "1.0.1" "$ONE" 0 1.0.2 "" "a real publish would fail"
run "dry run of published version is not reported as unpublished" 1.0.1 branch main true pubtime "1.0.1" "$ONE" 0 1.0.1 "" "already on npm" "unpublished"
run "unreadable package document aborts" 1.0.2 tag v1.0.2 false badoc "1.0.1" "$ONE" 1 "" "" "unreadable package document"
run "version lookup server error aborts" 1.0.2 tag v1.0.2 false ver500 "1.0.1" "$TWO" 1 "" "" "HTTP 500 looking up"

# The package document URL must differ on every run, or the CDN caches it.
KEEP_DIR=1 run "cache-buster run 1" 1.0.2 tag v1.0.2 false ok "1.0.1" "$ONE" 0 1.0.2 ""
KEEP_DIR=1 run "cache-buster run 2" 1.0.2 tag v1.0.2 false ok "1.0.1" "$ONE" 0 1.0.2 ""
if [ "$(sort -u "$KEPT_QUERIES" | wc -l)" -eq 2 ]; then
  echo "ok: package document query differs between runs"
else
  echo "FAIL: package document query repeats between runs: $(tr '\n' ' ' < "$KEPT_QUERIES")"
  FAILURES=$((FAILURES + 1))
fi
rm -f "$KEPT_QUERIES"

if [ "$FAILURES" -ne 0 ]; then
  echo "$FAILURES test(s) failed"
  exit 1
fi
echo "all tests passed"
