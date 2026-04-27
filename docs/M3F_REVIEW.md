# M3F Mobile QA And Parity Review

Status: automated local QA complete; real-device Tailnet QA still required before
M5 beta readiness can be claimed.

## Scope

M3F verifies the reopened M3 implementation as a whole:

- implemented-state screenshots
- desktop, Android Chrome-sized, and iPhone Safari-sized Playwright smoke tests
- service-worker private API cache behavior
- safe M4 CLI/installer re-smoke after M3 changes
- final practical Scratch parity gaps

The automated tests used a temporary notes folder under `/tmp` and did not read
or write the user's real Scratch notes.

## Automated Viewport Report

Report artifact: `docs/m3f-playwright-report.json`

Result: 26 passed, 0 failed.

Covered states:

- note opens on desktop, Android-sized, and iPhone-sized viewports
- no horizontal overflow on mobile-sized viewports
- WYSIWYG editor renders headings, links, task lists, code blocks, KaTeX,
  Mermaid, and tables
- safe image import control is visible in the editor toolbar
- Mermaid renders with readable node text after fixing inline SVG theme colors
- command palette opens
- find-in-note toolbar opens
- source mode opens and shows raw Markdown
- settings opens by touch on mobile
- settings Folder, Integrations, Appearance, Shortcuts, and About tabs render

## Tailnet URL Smoke From Mac

URL tested: `[TAILNET_URL]`

Result: 8 passed, 0 failed.

Covered through the real Tailnet HTTPS URL:

- Android-sized viewport loads app title
- Android-sized viewport opens sidebar and sees notes
- Android-sized viewport opens an editor with toolbar
- Android-sized viewport opens Settings
- iPhone-sized viewport loads app title
- iPhone-sized viewport opens sidebar and sees notes
- iPhone-sized viewport opens an editor with toolbar
- iPhone-sized viewport opens Settings

This confirms the current built app is reachable through Tailscale Serve. It is
not a replacement for real Android Chrome and iPhone Safari testing, because it
still runs Chromium on the Mac.

## Screenshot Artifacts

Saved under `docs/m3f-screenshots/`:

- `desktop-editor.png`
- `desktop-command-palette.png`
- `desktop-find.png`
- `desktop-source-mode.png`
- `android-chrome-editor.png`
- `android-chrome-command-palette.png`
- `android-chrome-find.png`
- `android-chrome-source-mode.png`
- `iphone-safari-editor.png`
- `iphone-safari-command-palette.png`
- `iphone-safari-find.png`
- `iphone-safari-source-mode.png`
- `mobile-settings-folder.png`
- `mobile-settings-integrations.png`
- `mobile-settings-appearance.png`
- `mobile-settings-shortcuts.png`
- `mobile-settings-about.png`

## Fixes Made During M3F

- Fixed Mermaid rendering in `packages/web/src/components/editor/MermaidRenderer.tsx`.
  `beautiful-mermaid` generated SVGs with CSS variable fills that rendered as
  unreadable black blocks in Chromium screenshots. Scratch Web now resolves and
  inlines concrete light/dark colors before sanitizing and injecting the SVG.

## PWA And Private Cache Review

Verified in `packages/web/vite.config.ts` and the generated
`packages/web/dist/sw.js`:

- `/api/*` routes are registered as Workbox `NetworkOnly`.
- The generated service worker does not precache API responses.
- Static app shell assets are precached.
- `index.html` is precached as the app shell, so private note content must never
  be server-rendered into `index.html`. The current app renders notes client-side
  from `/api/*`.

## M4 Re-smoke

Safe isolated smoke used:

- fake `HOME`
- fake `SCRATCH_WEB_HOME`
- temporary notes folder
- port `47842`

Passed:

- `scratch-web setup --notes-folder ... --service-name ... --port 47842`
- `scratch-web status --plain`
- `scratch-web launchagent print`
- `scratch-web start`
- `scratch-web doctor`
- `scratch-web stop`
- `scratch-web tailscale status`

Observed:

- Tailscale installed: yes
- Tailscale version: `1.96.5`
- Tailscale logged in: yes
- Funnel enabled: no
- Temporary Tailscale Serve configured: no

Follow-up live re-smoke:

- The installed LaunchAgent had been left pointing at a temporary M4 smoke notes
  folder. I reconfigured Scratch Web to the real iCloud Scratch folder:
  `[LOCAL_PATH]`.
- Tailscale Serve stayed on the existing port `47832`.
- The Tailnet URL successfully lists the real notes through
  `[TAILNET_URL]`.
- The real folder currently contains 86 Markdown notes.

Important issue found:

- A launchd-started process can serve `/health` and `/api/notes-folder`, but it
  hangs when reading note/settings APIs from the iCloud Drive Scratch folder.
- The same server started as a normal background process from the user shell
  reads the iCloud folder quickly.
- Current live workaround: LaunchAgent is uninstalled and Scratch Web is running
  as a direct background process on port `47832`.
- CLI guardrail added: `scratch-web launchagent install --yes` refuses iCloud
  Drive Scratch folders by default. `--allow-icloud` is reserved for deliberate
  testing.
- `scratch-web status` and `scratch-web doctor` now surface the state as
  `LaunchAgent: disabled for iCloud Drive`, and doctor marks `Login startup` as
  a clear `NO` while the direct background service is running.
- M4/M5 must solve this before claiming reliable login startup for iCloud-backed
  Scratch folders. Likely directions: document/grant macOS privacy access for
  the Node binary, avoid LaunchAgent for iCloud folders, or provide a login item
  wrapper with the right user-session permissions.

I did not rerun `scratch-web tailscale serve --yes` during this pass because the
existing Tailscale Serve configuration is already correct and rerunning it would
mutate real machine network state.

## Remaining Parity And Readiness Gaps

These are the remaining gaps before M5 beta readiness:

1. Real Android Chrome Tailnet smoke must be confirmed on the actual `.ts.net`
   URL after the current M3 build is running. The Tailnet URL itself has passed
   a Mac-hosted Chromium smoke test.
2. Real iPhone Safari Tailnet smoke must be confirmed on the actual `.ts.net`
   URL after the current M3 build is running. The Tailnet URL itself has passed
   a Mac-hosted Chromium smoke test.
3. Light-mode upstream Scratch reference screenshots are still missing. Current
   web light-mode screenshots exist, but upstream light references were not
   captured to avoid changing the user's Scratch/macOS appearance without a
   dedicated capture/restore pass.
4. Table editing is functional at the basic TipTap level, but advanced
   Scratch-like table context actions remain thinner than upstream.
5. Folder/note moves have safe APIs and mobile action paths, but full
   desktop-quality drag-and-drop parity remains a polish item.
6. Conflict handling is safe, but not yet a rich compare/diff experience.
7. Browser-native confirm/prompt is still used for some Git/settings actions.
   This is functional and explicit, but not full Scratch dialog fidelity.
8. Frontmatter should be preserved and round-tripped, but there is no dedicated
   Scratch-like frontmatter editing surface.
9. The web build still emits a large-chunk warning because the editor stack,
   Markdown, Mermaid, KaTeX, and syntax highlighting ship together. This is not
   a correctness bug, but should be addressed during beta hardening if startup
   feels slow on real phones.
10. LaunchAgent login startup is not reliable yet for iCloud-backed Scratch
    folders. The current live service is intentionally running as a direct
    background process instead of launchd.

## Verdict

Automated M3F is complete. Scratch Web is ready for real-device Tailnet smoke on
Android Chrome and iPhone Safari. It is not ready to claim M5 beta readiness
until both real-device checks pass or the user explicitly approves the remaining
device gap with release-note wording.
