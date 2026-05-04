# Ship Readiness

Status: ready to ship as a private beta on this Mac and Tailnet. Redmi Android
Chrome, Helium browser smoke, isolated real-world QA, and the real
Scratch-folder write-cycle have passed. iPhone Safari was explicitly skipped
for this ship decision.

## Current Verified State

- Detailed completion audit: `docs/COMPLETION_AUDIT.md`.
- `pnpm check` passes.
- `pnpm lint` passes.
- `pnpm test` passes.
- `pnpm build` passes without large-chunk warnings.
- `pnpm qa:realworld` passes against an isolated temporary Scratch vault with
  seeded files/folders, desktop and mobile Chrome screenshots, API mutation
  checks, SSE, Git-local checks, service-worker checks, and symlink rejection.
- `pnpm audit` and `pnpm audit --prod` report no known vulnerabilities.
- Generated service worker keeps `/api/*` on `NetworkOnly` and does not
  precache private note API responses.
- The direct background service runs on `http://127.0.0.1:47832`.
- Tailscale Serve is configured for a private Tailnet HTTPS URL.
- Funnel is disabled.
- The configured notes folder is the user's Scratch notes folder.
- The live local and Tailnet health endpoints respond.
- The live local and Tailnet notes API responds without printing note content.
- Redmi Android Chrome, connected through Tailscale, loads the private Tailnet app,
  shows the polished empty state after cache busting, opens a note, opens
  Settings, toggles source mode, and reports no crash-buffer entries.
- Helium browser smoke passed on `http://127.0.0.1:47832/`: app shell loaded,
  sidebar note list rendered, empty state rendered, Settings opened, Appearance
  tab opened, and command palette opened.
- Scratch-folder write-cycle passed for a throwaway smoke note: created, edited
  through the live HTTP API, deleted through the live HTTP API, and verified
  with overwrite/delete backup manifest entries.
- Codex in-app-browser Browser Use `iab` backend was unavailable in this
  session, so Helium was used as the browser automation surface instead.

## Deferred Ship Checks

These checks are not blocking this private beta decision:

```bash
pnpm scratch-web device-smoke
```

1. Real iPhone Safari Tailnet smoke was explicitly skipped for this ship
   decision.
2. Re-run Codex in-app-browser automation when the Browser Use backend exposes
   the current in-app tab again.

Do not use private note text as screenshot or prompt material during this smoke.

## Known Release Notes

- iCloud Drive Scratch folders use `scratch-web start` for now; LaunchAgent
  login startup remains disabled by default for this path because launchd can
  hang while reading iCloud-backed notes.
- App-level passcode/auth is not implemented in this beta. Tailscale keeps the
  app private to the Tailnet, but shared Tailnets/devices should not be used for
  private notes until app auth ships.
- Mermaid/ELK is still the largest web vendor chunk. The build no longer warns,
  but real-phone startup feel should be judged during the device smoke.
