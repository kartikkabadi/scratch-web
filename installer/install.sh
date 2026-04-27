#!/usr/bin/env bash
set -euo pipefail

SCRATCH_WEB_HOME="${SCRATCH_WEB_HOME:-$HOME/.scratch-web}"
SCRATCH_WEB_APP_DIR="${SCRATCH_WEB_APP_DIR:-$SCRATCH_WEB_HOME/app}"
SCRATCH_WEB_REPO_URL="${SCRATCH_WEB_REPO_URL:-}"
SCRATCH_WEB_REF="${SCRATCH_WEB_REF:-main}"
SCRATCH_WEB_TARBALL_URL="${SCRATCH_WEB_TARBALL_URL:-}"
SCRATCH_WEB_SHA256="${SCRATCH_WEB_SHA256:-}"

say() {
  printf '%s\n' "$*"
}

need() {
  command -v "$1" >/dev/null 2>&1
}

say "Scratch Web installer"
say
say "This installer prepares Scratch Web under:"
say "  $SCRATCH_WEB_HOME"
say
say "It will not use sudo, configure Tailscale, modify LaunchAgents, or choose"
say "your notes folder without a later explicit command/confirmation."
say

if [[ "$(uname -s)" != "Darwin" ]]; then
  say "Scratch Web setup currently targets macOS."
  exit 1
fi

missing=()
for tool in node pnpm; do
  if ! need "$tool"; then
    missing+=("$tool")
  fi
done
if [[ -n "$SCRATCH_WEB_TARBALL_URL" ]]; then
  for tool in curl tar shasum; do
    if ! need "$tool"; then
      missing+=("$tool")
    fi
  done
else
  if ! need git; then
    missing+=(git)
  fi
fi

if ((${#missing[@]} > 0)); then
  say "Missing required tools: ${missing[*]}"
  say "Please install them first, then rerun this installer."
  exit 1
fi

mkdir -p "$SCRATCH_WEB_HOME" "$SCRATCH_WEB_HOME/logs" "$SCRATCH_WEB_HOME/config" "$SCRATCH_WEB_HOME/run" "$SCRATCH_WEB_HOME/backups" "$SCRATCH_WEB_HOME/bin" "$SCRATCH_WEB_HOME/launchd"
chmod 700 "$SCRATCH_WEB_HOME" "$SCRATCH_WEB_HOME/logs" "$SCRATCH_WEB_HOME/config" "$SCRATCH_WEB_HOME/run" "$SCRATCH_WEB_HOME/backups" "$SCRATCH_WEB_HOME/bin" "$SCRATCH_WEB_HOME/launchd"

if [[ -n "$SCRATCH_WEB_TARBALL_URL" ]]; then
  tmpdir="$(mktemp -d)"
  archive="$tmpdir/scratch-web.tar.gz"
  say "Downloading Scratch Web release..."
  curl -fsSL "$SCRATCH_WEB_TARBALL_URL" -o "$archive"
  if [[ -n "$SCRATCH_WEB_SHA256" ]]; then
    actual="$(shasum -a 256 "$archive" | awk '{print $1}')"
    if [[ "$actual" != "$SCRATCH_WEB_SHA256" ]]; then
      say "Checksum verification failed."
      say "Expected: $SCRATCH_WEB_SHA256"
      say "Actual:   $actual"
      exit 1
    fi
    say "Checksum verified."
  else
    say "No checksum was provided. Public install docs should include SCRATCH_WEB_SHA256."
  fi
  rm -rf "$SCRATCH_WEB_APP_DIR"
  mkdir -p "$SCRATCH_WEB_APP_DIR"
  tar -xzf "$archive" -C "$SCRATCH_WEB_APP_DIR" --strip-components 1
elif [[ -n "$SCRATCH_WEB_REPO_URL" && -d "$SCRATCH_WEB_APP_DIR/.git" ]]; then
  say "Updating existing Scratch Web checkout..."
  git -C "$SCRATCH_WEB_APP_DIR" fetch --tags origin
  git -C "$SCRATCH_WEB_APP_DIR" checkout "$SCRATCH_WEB_REF"
  git -C "$SCRATCH_WEB_APP_DIR" pull --ff-only origin "$SCRATCH_WEB_REF"
elif [[ -n "$SCRATCH_WEB_REPO_URL" ]]; then
  say "Cloning Scratch Web..."
  rm -rf "$SCRATCH_WEB_APP_DIR"
  git clone --branch "$SCRATCH_WEB_REF" "$SCRATCH_WEB_REPO_URL" "$SCRATCH_WEB_APP_DIR"
else
  say "Set SCRATCH_WEB_TARBALL_URL for a release install, or SCRATCH_WEB_REPO_URL for a source install."
  say "Public docs should prefer a tagged release tarball plus SCRATCH_WEB_SHA256."
  exit 1
fi

cd "$SCRATCH_WEB_APP_DIR"
pnpm install --frozen-lockfile
pnpm build

ln -sf "$SCRATCH_WEB_APP_DIR/packages/cli/dist/index.js" "$SCRATCH_WEB_HOME/bin/scratch-web"
chmod 700 "$SCRATCH_WEB_HOME/bin/scratch-web"

say
say "Installed Scratch Web CLI:"
say "  $SCRATCH_WEB_HOME/bin/scratch-web"
say
say "Next, choose your Scratch notes folder and run:"
say "  $SCRATCH_WEB_HOME/bin/scratch-web setup --notes-folder \"\$HOME/path/to/your/Scratch/folder\""
say
say "Then check setup:"
say "  $SCRATCH_WEB_HOME/bin/scratch-web doctor"
