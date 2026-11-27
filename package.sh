#!/bin/sh
set -eu

cd "$(dirname "$0")"
mkdir -p dist
staging="$(mktemp -d dist/.package.XXXXXX)"
cleanup() {
  rm -f "$staging/plugin.mplugin"
  rmdir "$staging"
}
trap cleanup EXIT

output="dist/manggo-plugin-microsoft-tts.mplugin"
set -- manggo.plugin.json main.js voices.js sec-ms-gec.js edge.svg
if command -v zip >/dev/null 2>&1; then
  zip -q -X "$staging/plugin.mplugin" "$@"
elif command -v bsdtar >/dev/null 2>&1; then
  bsdtar -cf "$staging/plugin.mplugin" --format=zip "$@"
elif [ -n "${WINDIR:-}" ] && [ -x "$WINDIR/System32/tar.exe" ]; then
  "$WINDIR/System32/tar.exe" -cf "$staging/plugin.mplugin" --format=zip "$@"
else
  printf '%s\n' '打包需要 zip 或支持 ZIP 的 bsdtar。' >&2
  exit 1
fi
mv -f "$staging/plugin.mplugin" "$output"
printf '%s\n' "$output"
