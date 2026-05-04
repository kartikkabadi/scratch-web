# Roadmap

## M1: Foundation

- Reset repo and scaffold project.
- Add docs, seed, attribution, API contract, security model.
- Clone upstream Scratch into gitignored `reference/scratch`.
- Add TypeScript workspace skeleton.
- Add CLI/server/shared package shells.
- Add installer bootstrapper skeleton.
- Add OpenCode frontend brief.

## M2: Local Bridge MVP

- Implement local server and core APIs.
- Implement safe direct filesystem bridge.
- Add conflict-safe saves and backups.
- Add file watcher.
- Add CLI local commands.
- Add tests for security-sensitive path/write behavior.

## Current Status

M1-M4 have initial implementations. M3 was reopened because the existing
frontend was a useful MVP shell, not full Scratch parity. M3A through M3F now
have implementation/review artifacts. Automated M3F viewport QA and the safe M4
CLI re-smoke passed; real Android Chrome and iPhone Safari Tailnet checks remain
the gate before M5 beta hardening can honestly start.

## M3: Full Scratch Parity Frontend via OpenCode

- M3A: complete Scratch parity inventory, screenshots, and OpenCode brief.
- M3B: close backend API/schema gaps for settings, Git, assets/import, and realtime. Completed in implementation; keep under review as OpenCode consumes it.
- M3C: replace textarea final editor with WYSIWYG/source-mode markdown parity. Completed with TipTap editor, source mode, safe links, math, Mermaid, wikilinks, tables, code blocks, autosave/manual-save behavior, tests, and mobile smoke screenshot.
- M3D: add command palette, slash commands, wikilinks, find-in-note, and note/folder action parity. Completed with command palette, editor slash commands, wikilink autocomplete, find toolbar, focus mode, Git command entries, tests, and mobile browser smoke screenshot.
- M3E: complete settings parity, Git UI, and safe asset/image behavior where required. Completed with web settings controls, confirmed Git actions, safe image insertion, and native preview/import decision record.
- M3F: automated screenshot/viewport QA and safe M4 CLI re-smoke completed in `docs/M3F_REVIEW.md`; real Android Chrome and iPhone Safari Tailnet smoke remain.

Reference artifacts:

- `docs/SCRATCH_PARITY_INVENTORY.md`
- `docs/FRONTEND_OPENCODE_BRIEF.md`
- `docs/m3a-screenshots/`
- `docs/M3F_REVIEW.md`
- `docs/m3f-screenshots/`

## M4: Installer And Tailscale

- Implement release bootstrapper.
- Implement friendly TypeScript setup CLI.
- Add LaunchAgent setup.
- Configure private HTTPS Tailscale Serve.
- Add phone onboarding docs.
- Re-smoke after reopened M3 because frontend/API changes may affect the installed service.
- Resolve or clearly document the iCloud Drive + LaunchAgent issue found in M3F:
  launchd-started Node processes can hang when reading notes from
  `~/Library/Mobile Documents/...`, while direct background processes work.

## M5: Beta Hardening After Parity

- Backup restore polish. Completed for the local CLI with confirmation, path
  guards, and pre-restore safety copies.
- Production bundle split. Completed for Markdown, KaTeX, syntax highlighting,
  and Mermaid/ELK vendor chunks; real-phone startup feel still needs smoke.
- Dependency audit. Completed with `pnpm audit` and `pnpm audit --prod`
  reporting no known vulnerabilities after the `serialize-javascript` override.
- Asset handling hardening when required by M3 inventory.
- iCloud-friendly errors.
- Reliable startup strategy for iCloud-backed Scratch folders.
- Mobile testing over Tailscale.
- Broader security review before a public release.
