# M3E Direct OpenCode Task

You are working in `<repo-root>`.

Do not delegate to subagents. Do not spawn workers. Edit files directly in this
repo and return the changed file list. Keep the implementation focused and
complete enough to pass tests.

Read:

- `SEED.md`
- `docs/SCRATCH_PARITY_INVENTORY.md`
- `docs/API.md`
- `packages/shared/src`
- `packages/web/src`
- `reference/scratch/src/components/settings/*`

Apply these frontend taste rules from the user's skills:

- Use the existing Scratch-like minimal style; do not redesign.
- Mobile-first, iPhone Safari and Android Chrome equal primary targets.
- No emojis, no gradients, no heavy shadows, no marketing UI.
- Include loading/error/empty states where needed.
- Do not import new libraries unless already present.
- Do not fake APIs.

Implement M3E directly:

1. Replace the current thin `packages/web/src/components/settings/SettingsPage.tsx`
   with a fuller Scratch-like settings page:
   - Folder tab: notes path, setup-owned folder explanation, folders toggle,
     save mode auto/manual, default note template input, ignored patterns add/remove.
   - Integrations tab: auth explanatory block, Git enable toggle, Git availability/status,
     init/commit/push/fetch/pull/sync/set remote/push upstream using existing API calls.
     Require `window.confirm` for Git init/write/network operations and prompt for commit/remote.
   - Appearance tab: theme, custom color keys, font family, size, bold weight,
     line height, direction, editor width/custom width, interface zoom.
   - Shortcuts tab: include implemented M3C/M3D shortcuts.
   - About tab: credit Scratch and erictli, unofficial status, preview/open-file web limitation.
2. Update `packages/web/src/App.tsx` and/or `packages/web/src/index.css` so appearance
   settings visibly affect CSS variables/root styles.
3. Add safe image insertion to `packages/web/src/components/editor/Editor.tsx`:
   - Toolbar button/file input.
   - PNG/JPEG/GIF/WebP only, max 10MB.
   - Use `importAsset` API and insert image using returned URL.
   - Friendly errors through existing app error action.
4. Add or update focused tests for settings/Git/API wiring where practical.

Run:

```bash
pnpm --filter @scratch-web/web check
pnpm --filter @scratch-web/web test
```

Return changed files, tests run, and remaining gaps.
