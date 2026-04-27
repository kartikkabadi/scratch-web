# M3E Review

Status: implemented and self-reviewed.

## Scope Completed

- Expanded Settings into Scratch-like Folder, Integrations, Appearance,
  Shortcuts, and About tabs.
- Added Folder settings for folders enabled, auto/manual save, default note name
  template preview, and ignored pattern add/remove.
- Added Git settings using the existing backend API: availability/status,
  init, commit, fetch, pull, push, sync, set remote, and push upstream.
- Added explicit confirmations before Git write/network actions.
- Added appearance controls for theme, custom color keys, typography, text
  direction, editor width/custom width, and interface zoom.
- Wired appearance settings into root CSS variables so they affect the app.
- Added safe image insertion from the editor toolbar using the existing asset
  import API with client-side MIME and size checks.
- Documented native arbitrary file preview/open behavior as web-v1
  native-specific instead of exposing arbitrary Mac file access.

## Verification

- `pnpm --filter @scratch-web/web check`
- `pnpm --filter @scratch-web/web test`
- `pnpm check`
- `pnpm test`
- `pnpm build`
- Mobile Playwright smoke against a built app and temporary notes folder:
  changed save mode, added ignored pattern, changed theme, checked Git panel,
  confirmed About attribution, opened a note, and confirmed image insertion
  toolbar availability.

## Review Findings

- OpenCode was invoked twice for M3E, but both runs failed to produce a repo
  patch. The final implementation was kept conservative and integration-focused
  by Codex after the failed OpenCode attempts.
- The current Git UI intentionally uses browser `confirm`/`prompt` as the
  smallest complete confirmation path. M3F can decide whether this needs a more
  Scratch-like dialog before beta.
- Image insertion now has a safe web path, but real image round-trip and visual
  screenshots should be included in M3F.
- The editor bundle still triggers Vite's large chunk warning. This remains an
  M5 beta hardening item.

## Remaining Parity Work

- M3F owns final screenshot comparison, mobile viewport reports, Android Chrome
  and iPhone Safari Tailnet smoke, final Scratch parity gap list, and the M4
  installer/Tailscale re-smoke.
