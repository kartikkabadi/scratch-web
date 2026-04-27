# M3 MVP Self Review

Date: 2026-04-27

Status: historical review of the first M3 MVP implementation. Reopened M3
supersedes this scope and requires full practical Scratch parity. See
`SEED.md`, `docs/SCRATCH_PARITY_INVENTORY.md`, and
`docs/FRONTEND_OPENCODE_BRIEF.md`.

## Scope

M3 built and hardened the mobile-first Scratch Web frontend in `packages/web`.
OpenCode produced the first UI implementation. Codex reviewed, debugged,
de-slopified, tested, and fixed integration/security issues.

## What Passed

- App opens directly into notes.
- Mobile layouts were checked at 390x844 and 412x915.
- Desktop layout remains functional at 1440x900.
- Notes can be created, edited, autosaved, duplicated, and deleted.
- Search finds saved note content.
- Empty folders can be created, renamed, displayed, and deleted.
- Settings can switch theme mode and persist through the backend.
- Dark theme applies from settings on initial load.
- Offline/unreachable state exists.
- 409 save conflict state is covered by a frontend context test.
- Rendered markdown is sanitized with DOMPurify before `dangerouslySetInnerHTML`.
- No note content is stored in `localStorage`, `sessionStorage`, or IndexedDB.
- Service worker precaches only app shell/static assets.
- Service worker uses `NetworkOnly` for `/api/*`.

## Fixes Made During Review

- Fixed stale autosave content caused by scheduling a save before the textarea
  ref/state reflected the latest value.
- Removed unused "recently saved" state and async work inside React state
  setters.
- Fixed dev proxy handling for `/health`.
- Preserved the browser origin through the Vite proxy so backend origin checks
  still pass.
- Fixed bodyless mutating API calls so they send `content-type:
  application/json`.
- Added empty folder loading from `GET /api/folders`; sidebar now renders
  folders that do not yet contain notes.
- Fixed title-based note rename behavior so pinned note IDs are updated when a
  saved note changes filename.
- Added a real PWA SVG icon instead of pointing the manifest at missing PNG
  files.
- Applied configured light/dark/system theme to the document root.
- Made folder and note action labels deterministic and more accessible.
- Reduced mobile visual clutter by hiding note actions behind a compact row menu.
- Improved responsive settings layout for mobile.

## Verification Commands

- `pnpm --filter @scratch-web/web check`
- `pnpm --filter @scratch-web/web test`
- `pnpm --filter @scratch-web/web build`
- `pnpm check`
- `pnpm build`
- `pnpm test`

## Browser QA

Browser QA used a temporary notes folder under `/tmp`; no real Scratch notes were
used.

Flows verified:

- Load app shell and note list.
- Create note and autosave markdown file.
- Search for the newly created note.
- Create, rename, and delete an empty folder.
- Duplicate and delete a note through the note actions menu.
- Switch settings theme to light and verify root theme class.
- Capture mobile and desktop screenshots.

Screenshots:

- `docs/m3-review-screenshots/mobile-390-notes.png`
- `docs/m3-review-screenshots/mobile-390-settings.png`
- `docs/m3-review-screenshots/mobile-412-notes.png`
- `docs/m3-review-screenshots/mobile-412-settings.png`
- `docs/m3-review-screenshots/desktop-notes.png`
- `docs/m3-review-screenshots/desktop-settings.png`
- `docs/m3-review-screenshots/flow-01-start.png`
- `docs/m3-review-screenshots/flow-02-settings-light.png`

## MVP Limitations That Reopened M3 Must Fix

- The markdown editor is intentionally simple in the MVP. Reopened M3 must
  replace it with full practical Scratch editor parity.
- Folder/note action menus are functional and mobile-friendly, but still minimal.
- No realtime file-change UI was wired in the MVP. Reopened M3B now exposes SSE;
  frontend parity waves must consume that real endpoint instead of faking it.
- PWA install behavior over real Tailnet HTTPS must be rechecked after reopened
  M3 because frontend/API changes may affect the installed service.

## Historical M4 Readiness Claim

The first MVP M3 was considered ready for initial M4 installer/Tailscale work at
the time. That claim is now historical. Current beta readiness requires reopened
M3 parity completion and an M4 re-smoke.

## Reopened M3 Note

This review should not be used to claim beta frontend parity. The MVP editor is
textarea-based and intentionally lacks many upstream Scratch features. Reopened
M3 must replace this with the ordered M3A-M3F parity plan and re-smoke M4 after
frontend/API changes.
