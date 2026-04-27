# M3E OpenCode Task, Repo-Local Version

You are working in `[LOCAL_PATH]`.

Do not read files outside this repo. The broader AGENTS guidance needed for
this task is embedded below:

- Use pnpm, TypeScript, React/Vite, and the repo's existing patterns.
- Preserve existing work; do not reset, clean, checkout, or overwrite unrelated
  changes.
- Use `rg` for search.
- Keep the change focused on the assigned M3E scope.
- Frontend/UI work is owned by OpenCode; Codex will review and fix integration.
- Do not add in-app AI note editing.
- Do not expose private note content.
- Mobile-first: iPhone Safari and Android Chrome are equal primary targets.
- Do not redesign Scratch. Clone Scratch's behavior and quiet minimal feel.

## Read These Repo Files First

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

## Skill Instructions To Apply

Apply the user's frontend taste skills by name and by these distilled rules:

- `design-taste-frontend`: dependency-check imports, full loading/empty/error
  states, visible focus states, mobile viewport stability, no emojis, no
  generic AI-purple/glow UI, no unnecessary libraries.
- `redesign-existing-projects`: work with the existing stack, improve targeted
  weak spots without rewriting from scratch, keep interactions and error states
  complete, use semantic markup where practical.
- `image-to-code`: for this task, do not generate new concepts; use the existing
  Scratch screenshots in `docs/m3a-screenshots` as the visual source instead.
- `minimalist-ui`: quiet editorial/minimal UI, warm monochrome variables,
  crisp borders, no heavy shadows, no gradients, no emojis.

## Assignment

Implement M3E only: settings parity, Git UI, safe image/asset insertion, and
the preview/import decision record.

Backend/API support exists:

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

Do not fake APIs. Do not implement native host-file preview/open behavior.
Document preview/open-file as native-specific/deferred unless a safe API already
exists.

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
  - Ignored patterns editor with add/remove behavior, not read-only text.
- Integrations tab:
  - Passcode/auth explanatory block, setup-owned for now.
  - Git enable toggle stored in settings.
  - Git availability and status panel.
  - Init repo with explicit confirmation.
  - Commit with user-provided message and explicit confirmation.
  - Push/fetch/pull/sync buttons with explicit confirmations.
  - Add/set remote URL with confirmation.
  - Push upstream button when useful.
  - Friendly errors for Git unavailable, not initialized, no remote, auth/network failures.
- Appearance tab:
  - Theme light/dark/system.
  - Custom light/dark colors for keys: `bg`, `bg-secondary`, `bg-muted`,
    `bg-emphasis`, `text`, `text-muted`, `accent`, `border`, `selection`.
  - Typography: font family, base font size, bold weight, line height.
  - Text direction: auto/LTR/RTL.
  - Page/editor width: narrow/normal/wide/full/custom, custom px input.
  - Interface zoom.
  - Make these settings visibly affect the app/editor via CSS variables or
    simple root styles where practical.
- Shortcuts tab:
  - Expand to cover currently implemented M3C/M3D actions.
- About tab:
  - Keep prominent credit to Scratch and erictli.
  - State Scratch Web is independent/unofficial.
  - Mention native preview/open-file behavior is not available in the web app
    unless implemented through a safe upload/import path.

Assets/images:

- Add a safe UI path to insert local images into the editor using the existing
  asset import API.
- Use browser file picker for PNG/JPEG/GIF/WebP only.
- Enforce client-side type and 10MB size guard before sending.
- Convert to base64 and call `importAsset`, then insert markdown/image node
  using returned `url`/`path`.
- Preserve markdown image syntax round-trip.
- Surface friendly errors.

## Constraints

- Do not use real/private note content in prompts or hard-coded examples.
- Keep code simple. Prefer explicit event handlers and data flow.
- Avoid unnecessary `useEffect` derived-state loops.
- Do not break M3C/M3D editor, command palette, source mode, or mobile note
  selection behavior.
- Add/update tests where appropriate.

## Verification To Run

Run at least:

```bash
pnpm --filter @scratch-web/web check
pnpm --filter @scratch-web/web test
```

Report changed files, tests run, and remaining gaps.
