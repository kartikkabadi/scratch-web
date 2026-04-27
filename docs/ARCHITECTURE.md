# Architecture

Scratch Web is a Mac-hosted private bridge.

```text
iPhone/Android browser
  -> HTTPS Tailnet URL from Tailscale Serve
  -> localhost Scratch Web server on the Mac
  -> local Scratch notes folder
```

The Mac is the filesystem authority. The phone never directly accesses iCloud
Drive or the notes folder; it talks to the Mac service over Tailscale.

## Packages

- `packages/shared`: shared TypeScript contracts.
- `packages/server`: local Node server, API, filesystem bridge, watcher, safety.
- `packages/cli`: `scratch-web` command line interface.
- `installer`: tiny bootstrapper that hands off to the TypeScript CLI.

## Reopened M3 Parity Architecture

The first M3 frontend is an MVP shell. Reopened M3 must move Scratch Web toward
upstream Scratch parity without changing the core Mac-hosted bridge model.

Required architecture direction:

- Keep `.md` files as the source of truth.
- Prefer an editor engine compatible with upstream Scratch's TipTap/Markdown
  model.
- Extend shared API/types before UI work depends on new behavior.
- Do not ask the frontend to fake Git, assets/import, realtime, or settings
  state.
- Preserve unknown `.scratch/settings.json` keys when Scratch Web updates known
  settings.
- Treat upstream Scratch screenshots and source as reference material, not a
  vendored app copy.

M3 reference artifacts:

- `docs/SCRATCH_PARITY_INVENTORY.md`
- `docs/FRONTEND_OPENCODE_BRIEF.md`
- `docs/m3a-screenshots/`

## Security Defaults

- Bind to `127.0.0.1` by default.
- Expose through private Tailscale Serve, not Funnel.
- Use HTTPS Tailnet URL for PWA behavior.
- Validate all API input at runtime.
- Do not trust client-provided paths, versions, or command input.
- Treat note content as untrusted when rendering.

## Direct Write Model

Scratch Web writes directly to the configured Scratch notes folder. Safe writes
must use:

- path boundary checks
- direct and parent-directory symlink rejection for write/delete/move in v1
- backups before overwrite/delete
- atomic temp-file-then-rename writes
- conflict checks using `mtimeMs + size + sha256`
