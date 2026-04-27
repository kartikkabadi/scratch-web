# M3 OpenCode Task

Status: superseded by reopened M3 parity planning.

The previous M3 task produced the current mobile-first MVP shell. That shell is
useful, but it is not full Scratch parity. Do not use the old MVP acceptance
criteria for new frontend work.

Use these current sources instead:

- `SEED.md`
- `docs/SCRATCH_PARITY_INVENTORY.md`
- `docs/FRONTEND_OPENCODE_BRIEF.md`
- `docs/API.md`
- `docs/m3a-screenshots/`

## Current Rule

M3B API/schema support now exists for settings, Git, safe image assets, and SSE
realtime. OpenCode may begin assigned frontend parity waves after Codex's final
M3B review, but it must consume the real contracts in `docs/API.md`. Do not fake
Git, assets/import, realtime, or settings behavior in the frontend.

## Required Skill Invocation

The current OpenCode prompt must invoke:

- `[LOCAL_PATH]`
- `[LOCAL_PATH]`
- `[LOCAL_PATH]`
- `[LOCAL_PATH]`

Use the skills for fidelity, mobile behavior, state coverage, and quality. Do
not redesign away from Scratch.
