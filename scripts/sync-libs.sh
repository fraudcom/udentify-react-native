#!/usr/bin/env bash
#
# sync-libs.sh - copy the workspace packages into test-app/node_modules, which holds
# extracted tarballs rather than links. video-call-rn-library is built with `bob build`
# first: its JS is consumed from lib/. Before a release, repack with `npm pack` instead.
#
# Usage: scripts/sync-libs.sh [--check] [package ...]   (--check reports, changes nothing)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST_ROOT="$ROOT/test-app/node_modules"

ALL_PACKAGES=(
  udentify-core
  ocr-rn-library
  nfc-rn-library
  liveness-rn-library
  mrz-rn-library
  video-call-rn-library
)

CHECK_ONLY=0
PACKAGES=()
for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=1 ;;
    -h|--help) sed -n '2,40p' "${BASH_SOURCE[0]}"; exit 0 ;;
    -*) echo "unknown option: $arg" >&2; exit 2 ;;
    *) PACKAGES+=("$arg") ;;
  esac
done
[ ${#PACKAGES[@]} -eq 0 ] && PACKAGES=("${ALL_PACKAGES[@]}")

red()  { printf '\033[31m%s\033[0m\n' "$*"; }
green(){ printf '\033[32m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*"; }

# Does this package's `main` point into lib/? Only then does it need building.
needs_build() {
  local pkg="$1"
  node -e "process.exit(/(^|\/)lib\//.test(require('$ROOT/$pkg/package.json').main || '') ? 0 : 1)" 2>/dev/null
}

# Newest mtime under a directory, 0 when it does not exist. pipefail is off in the
# subshell: `head -1` closes the pipe early, which would make the pipeline fail and
# the staleness check never fire.
newest() {
  [ -d "$1" ] || { echo 0; return; }
  local t
  t=$(set +o pipefail
      find "$1" -type f -not -path '*/.*' -exec stat -f '%m' {} + 2>/dev/null \
        | sort -rn | head -1)
  echo "${t:-0}"
}

failures=0
stale=0

for pkg in "${PACKAGES[@]}"; do
  src_dir="$ROOT/$pkg"
  dest_dir="$DEST_ROOT/$pkg"

  [ -d "$src_dir" ]  || { red "  $pkg: not in the workspace"; failures=1; continue; }
  if [ ! -d "$dest_dir" ]; then
    red "  $pkg: not installed in test-app/node_modules — run npm install in test-app first"
    failures=1; continue
  fi

  printf '\n== %s\n' "$pkg"

  if needs_build "$pkg"; then
    src_t="$(newest "$src_dir/src")"
    lib_t="$(newest "$src_dir/lib")"
    if [ "${src_t:-0}" -gt "${lib_t:-0}" ]; then
      stale=1
      if [ "$CHECK_ONLY" = "1" ]; then
        warn "  lib/ is older than src/ — its JS in the app is STALE (run without --check)"
      else
        echo "  building (main points into lib/)…"
        ( cd "$src_dir" && npx --no-install bob build >/dev/null ) \
          || { red "  bob build FAILED"; failures=1; continue; }
        green "  built"
      fi
    else
      echo "  lib/ up to date"
    fi
  fi

  [ "$CHECK_ONLY" = "1" ] && continue

  # Only the parts the app consumes. Frameworks and AARs come along inside
  # ios/ and android/ because CocoaPods and Gradle read them from there.
  for item in src ios android lib index.js package.json; do
    [ -e "$src_dir/$item" ] || continue
    if [ -d "$src_dir/$item" ]; then
      rsync -a --delete "$src_dir/$item/" "$dest_dir/$item/"
    else
      rsync -a "$src_dir/$item" "$dest_dir/$item"
    fi
  done
  for spec in "$src_dir"/*.podspec; do
    [ -e "$spec" ] && rsync -a "$spec" "$dest_dir/"
  done

  # Prove it rather than assume it.
  if diff -rq --exclude='.*' "$src_dir/src" "$dest_dir/src" >/dev/null 2>&1; then
    green "  synced"
  else
    red "  sync did NOT match — inspect $dest_dir"
    failures=1
  fi
done

echo
if [ "$CHECK_ONLY" = "1" ]; then
  if [ "$stale" = "1" ]; then
    warn "Stale JS found. Run scripts/sync-libs.sh to fix."
    exit 1
  fi
  green "Everything up to date."
  exit 0
fi

if [ "$failures" != "0" ]; then
  red "Finished with errors."
  exit 1
fi

green "All packages synced."
echo "Native changes still need an Xcode/Gradle build; JS-only changes need a Metro reload."
