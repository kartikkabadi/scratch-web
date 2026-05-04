# Completion Audit

Date: 2026-05-03

Status: ready to ship as a private beta on this Mac and Tailnet. iPhone Safari
was explicitly skipped for this ship decision, and Helium was used as the
browser automation surface after the Codex in-app-browser backend was
unavailable.

## Objective

Build and complete Scratch Web to a ready-to-ship state, including
implementation, verification, real-world testing, and a concrete handoff of
remaining risks.

## Prompt-To-Evidence Checklist

| Requirement | Evidence | Verdict |
| --- | --- | --- |
| Build and complete the app | Web, server, CLI, docs, and lockfile changes are present in the worktree. `pnpm build` completed successfully with no large-chunk warning. | Pass for private beta candidate |
| Polish frontend and UI/UX | UI shell, sidebar, editor empty state, settings, loading state, icons, mobile layout, and CSS polish changed in `packages/web/src/App.tsx`, `packages/web/src/components/editor/Editor.tsx`, `packages/web/src/components/layout/Sidebar.tsx`, `packages/web/src/components/settings/SettingsPage.tsx`, `packages/web/src/components/ui/icons.tsx`, and `packages/web/src/index.css`. | Pass with remaining visual parity caveats |
| Make it feel close to official Scratch macOS app | Current UI uses a cleaner Scratch/macOS-like shell and mobile ergonomics. Automated screenshots and Redmi smoke verify render/function. Upstream light-mode Scratch reference screenshots are still missing, so exact visual parity is not fully proven. | Partial |
| Use OpenCode for UI where possible | OpenCode was attempted repeatedly, but did not produce usable writes because runs hung or failed against provider/network behavior. Codex completed a scoped fallback implementation and verified it. | Pass with process caveat |
| Use in-app browser / browser use in Safari or Helium | Browser Use was read and attempted through the required `iab` backend. The backend reports no discoverable Codex in-app-browser target: `No Codex IAB backends were discovered`. Helium was then controlled through Computer Use and verified app load, note list, empty state, Settings, Appearance, and command palette. | Pass with tooling caveat |
| Use adb | A Redmi-class Android device was driven through `adb` for Tailnet/Chrome checks and crash-buffer inspection. | Pass |
| Use Redmi, not RMX | Two Android devices were visible; testing used the Redmi-class device and intentionally avoided the RMX device. Exact serials are omitted from public docs. | Pass |
| Use Tailscale | The Android smoke confirmed Tailscale VPN connectivity and private Tailnet access without publishing the Tailnet hostname. | Pass |
| Full real-world testing with files/folders, not GitHub | Added `pnpm qa:realworld`, which creates an isolated temporary Scratch vault with Markdown files, nested folders, ignored folders, settings, assets, Git-local checks, backups, SSE, static app checks, service-worker checks, and desktop/mobile screenshots. | Pass |
| Avoid GitHub/external mutation | The QA script tests local Git init/status/commit and rejects unsafe `file://` remotes. No GitHub or external remote mutation is used. | Pass |
| Test create/edit/delete behavior | Isolated QA covers create/save/conflict/duplicate/move/delete. A throwaway Scratch-folder smoke note was created, edited through the live HTTP API, deleted through the live HTTP API, and verified through backups. | Pass |
| Test edge cases | Covered symlink note reads/writes, symlink parent paths, stale save conflict, bad origins, missing Origin, bad content type, SVG/MIME asset rejection, static path backslash rejection, service-worker private API behavior, iCloud LaunchAgent guardrail, Git remote URL validation, and backup restore path safety. | Pass for known high-risk cases |
| Run standard tests | `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm audit`, `pnpm audit --prod`, and `pnpm build` passed after the final code changes. | Pass |
| Verify live Mac service | `pnpm scratch-web restart` started the fresh bundle. `pnpm scratch-web status --plain` reports service running on `127.0.0.1:47832`, Tailnet URL configured, Funnel disabled, and no recent errors. Local and Tailnet `/health` return `{"ok":true}`. | Pass |
| Verify Android Chrome real device | Redmi Chrome loaded the Tailnet URL, exposed app shell markers in UIAutomator, opened note/settings/source-mode in earlier ADB flow, and crash buffer remained empty. | Pass |
| Verify iPhone Safari real device | Explicitly skipped by the user for this ship decision. Mac-hosted Chromium iPhone-sized smoke passed earlier, but that is not a substitute for real iPhone Safari. | Skipped by owner |
| Concrete handoff of remaining risks | `docs/SHIP_READINESS.md`, `docs/M3F_REVIEW.md`, and this audit identify the remaining gates and known release notes. | Pass |

## Current Verified Commands

These commands passed during the final hardening pass:

```bash
pnpm check
pnpm lint
pnpm test
pnpm audit
pnpm audit --prod
pnpm build
pnpm qa:realworld
pnpm scratch-web status --plain
pnpm scratch-web device-smoke
git diff --check
```

Latest isolated QA evidence folder:

```text
<temporary qa artifact directory>
```

Latest real-note write-cycle target:

```text
~/Library/Mobile Documents/com~apple~CloudDocs/Scratch/Scratch Web Smoke.md
```

Result: file no longer exists after delete; backup manifest contains the
expected overwrite and delete entries.

## Deferred Non-Blocking Checks

1. Real iPhone Safari Tailnet smoke:
   - Skipped for this ship decision.
   - Open the configured private Tailnet URL, for example
     `https://<mac-name>.<tailnet>.ts.net`.
   - Open sidebar.
   - Open a note.
   - Open Settings.
   - Toggle source mode.
   - Use find-in-note.
   - Confirm no private note text is copied into screenshots/prompts.

2. Codex in-app-browser automation:
   - Re-run Browser Use with the `iab` backend when the Codex app exposes an
     in-app-browser target to the Browser Use runtime.
   - Current blocker is tool discovery, not an application failure. Helium
     browser automation passed as the fallback browser surface.

## Known Release Risks

- LaunchAgent login startup remains disabled for iCloud-backed Scratch folders;
  use `scratch-web start` because launchd can hang when reading iCloud Drive
  notes.
- App-level auth is off by default; Tailscale keeps exposure private, but shared
  Tailnets/devices should use extra care.
- Exact visual parity with upstream Scratch macOS light mode is not fully proven
  without a dedicated upstream screenshot capture/restore pass.
- Advanced Scratch-like table context actions, richer conflict diff UI,
  desktop-grade drag-and-drop parity, and frontmatter-specific editing remain
  polish items rather than blockers for private beta.

## Verdict

Scratch Web is ready to ship as a private beta on this Mac and Tailnet with the
deferred checks above documented.
