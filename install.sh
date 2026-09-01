#!/usr/bin/env sh
set -eu

DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
SRC="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)/presets/sisyphus"
DEST="$DSH_HOME/.agent-presets/sisyphus"

if [ -e "$DEST" ]; then
  echo "already installed at $DEST; remove it first to reinstall" >&2
  exit 1
fi

mkdir -p "$DSH_HOME/.agent-presets"
cp -r "$SRC" "$DEST"

echo "installed preset 'sisyphus' at $DEST"
echo "restart dsh, then choose Sisyphus for a new session (or set agent-presets.default to sisyphus)"