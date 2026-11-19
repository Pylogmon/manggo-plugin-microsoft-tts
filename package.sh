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
zip -q -X "$staging/plugin.mplugin" manggo.plugin.json main.js sec-ms-gec.js edge.svg
mv -f "$staging/plugin.mplugin" "$output"
printf '%s\n' "$output"
