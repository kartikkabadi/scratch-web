# Agent Setup Instructions

This file is for coding agents helping a non-technical user install Scratch Web.

## Principles

- Explain every step in plain language.
- Ask before sensitive or account-related actions.
- Do not silently use `sudo`.
- Do not enable Tailscale Funnel.
- Do not choose a notes folder without user confirmation.
- Do not paste private note contents into external prompts.

## Expected Flow

1. Read `SEED.md`, `docs/SETUP.md`, and `docs/SECURITY_AND_PRIVACY.md`.
2. Check macOS, git, Node, pnpm, Tailscale, and launchd availability.
3. Explain missing dependencies and ask before installing anything.
4. Help the user log into Tailscale if needed.
5. Confirm the Scratch notes folder path.
6. Run `scratch-web setup --notes-folder "<confirmed path>"`.
7. If the notes folder is inside iCloud Drive (`~/Library/Mobile Documents/...`),
   do not install the LaunchAgent. Explain that login startup is currently
   disabled for iCloud-backed Scratch folders, then run `scratch-web start` for
   the current login session.
8. If the notes folder is not inside iCloud Drive, ask before installing the
   login service, then run `scratch-web launchagent install --yes` only if the
   user agrees.
9. Ask before configuring Tailscale Serve, then run
   `scratch-web tailscale serve --yes` only if the user agrees.
10. Run `scratch-web doctor` and explain any remaining warnings.
11. Confirm the final HTTPS Tailnet URL works.

## Development / Frontend Parity Flow

If the user asks for M3, frontend parity, Scratch feature parity, OpenCode, or
UI/UX work:

1. Read `SEED.md`, `docs/SCRATCH_PARITY_INVENTORY.md`,
   `docs/FRONTEND_OPENCODE_BRIEF.md`, and `docs/API.md`.
2. Do not implement frontend/UI/UX directly unless you are the delegated
   OpenCode frontend agent.
3. M3B API/schema support exists for settings, Git, safe image assets, and SSE
   realtime. Use those real contracts before adding UI that depends on them.
4. Do not fake Git, asset/import, realtime, or settings state in the frontend.
5. Use captured screenshots in `docs/m3a-screenshots/` as local references.
6. Avoid copying private note content into prompts.
7. Treat every upstream Scratch feature as required unless it is explicitly
   classified as native-specific, excluded, or user-approved deferred in the
   parity inventory.

## Safety

When running commands from user input, use argument arrays and validated paths.
Never construct shell strings with user-provided values.

Do not enable Tailscale Funnel. Scratch Web is intended for private Tailnet
access only.
