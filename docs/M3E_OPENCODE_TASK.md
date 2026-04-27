# M3E OpenCode Task

You are working in `[LOCAL_PATH]`.

## Mandatory Reading

Read these before changing code:

- `[LOCAL_PATH]`
- `SEED.md`
- `docs/SCRATCH_PARITY_INVENTORY.md`
- `docs/FRONTEND_OPENCODE_BRIEF.md`
- `docs/API.md`
- `packages/shared/src`
- `packages/web/src`
- `reference/scratch/src/types/note.ts`
- `reference/scratch/src/components/settings/*`
- `reference/scratch/src/services/git.ts`
- `reference/scratch/src/services/files.ts`

## Mandatory Skills To Invoke And Apply

Invoke and follow these local skills:

- `[LOCAL_PATH]`
- `[LOCAL_PATH]`
- `[LOCAL_PATH]`
- `[LOCAL_PATH]`

Interpretation: use these for fidelity, state coverage, mobile ergonomics,
and de-slopifying. Do not redesign Scratch into a different product. Do not
add a landing page, illustrations, new visual identity, or marketing content.

## Assignment

Implement M3E only: settings parity, Git UI, safe image/asset insertion, and
the preview/import decision record.

Codex already confirmed backend/API support exists:

- `GET/PUT /api/settings`
- `GET /api/git/available`
- `GET /api/git/status`
- `POST /api/git/init`
- `POST /api/git/commit`
- `POST /api/git/push`
- `POST /api/git/fetch`
- `POST /api/git/pull`
- `POST /api/git/sync`
- `POST /api/git/remote`
- `POST /api/git/push-upstream`
- `POST /api/assets/import`
- `GET /api/assets/:path`

Do not fake APIs. Do not add in-app AI note editing. Do not implement native
host-file preview/open behavior; document it as native-specific/deferred unless
there is already a safe API.

## Required UI/Behavior

Settings page:

- Keep Scratch's quiet minimal structure and mobile-first behavior.
- Folder tab:
  - Show notes folder path.
  - Explain browser cannot directly change/open arbitrary Mac folders; setup CLI owns that.
  - Toggle folders.
  - Auto/manual save setting.
  - Default note name template input.
  - Preview/explain supported tokens plainly.
  - Ignored patterns editor with add/remove/reset-ish behavior, not read-only text.
- Integrations tab:
  - Passcode/auth explanatory block, clearly setup-owned for now.
  - Git enable toggle stored in settings.
  - Git availability and status panel.
  - Init repo with explicit confirmation.
  - Commit with user-provided message and explicit confirmation.
  - Push/fetch/pull/sync buttons with explicit confirmations for write/network operations.
  - Add/set remote URL with confirmation.
  - Push upstream button when useful.
  - Friendly errors for Git unavailable, not initialized, no remote, auth/network failures.
- Appearance tab:
  - Theme light/dark/system.
  - Custom light/dark colors for upstream-ish keys: `bg`, `bg-secondary`,
    `bg-muted`, `bg-emphasis`, `text`, `text-muted`, `accent`, `border`,
    `selection`.
  - Typography: font family, base font size, bold weight, line height.
  - Text direction: auto/LTR/RTL.
  - Page/editor width: narrow/normal/wide/full/custom, custom px input.
  - Interface zoom.
  - Make these settings visibly affect the app/editor via CSS variables or
    simple root styles where practical.
- Shortcuts tab:
  - Expand to cover the currently implemented M3C/M3D actions, not only the old six shortcuts.
- About tab:
  - Keep prominent credit to Scratch and erictli.
  - State Scratch Web is independent/unofficial.
  - Mention native preview/open-file behavior is not available in the web app
    unless implemented through a safe upload/import path.

Assets/images:

- Add a safe UI path to insert local images into the editor using the existing
  asset import API.
- Use browser file picker for PNG/JPEG/GIF/WebP only.
- Enforce client-side type/size guard before sending.
- Convert to base64 and call `importAsset`, then insert markdown/image node
  using returned `url`/`path`.
- Preserve markdown image syntax round-trip.
- Surface friendly errors.

## Constraints

- iPhone Safari and Android Chrome are equal primary targets.
- Desktop remains functional, but do not optimize desktop at mobile's expense.
- Do not use real/private note content in prompts or hard-coded examples.
- Keep code simple. Prefer explicit event handlers and data flow.
- Avoid unnecessary `useEffect` derived-state loops.
- Do not break existing M3C/M3D editor, command palette, source mode, or mobile
  note selection behavior.
- Add/update tests where appropriate.

## Verification To Run

Run at least:

```bash
pnpm --filter @scratch-web/web check
pnpm --filter @scratch-web/web test
```

Report changed files, tests run, and remaining gaps.
