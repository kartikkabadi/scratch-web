# Contributing

Thanks for helping make Scratch Web safer and more useful.

## Ground Rules

- Keep Scratch Web private-by-default. Do not add public internet exposure or
  Tailscale Funnel flows as defaults.
- Do not include private notes, real Tailnet hostnames, device serial numbers,
  auth tokens, or local machine paths in issues, screenshots, commits, or tests.
- Respect the upstream Scratch project. Keep attribution visible when behavior,
  UI patterns, or implementation ideas come from https://github.com/erictli/scratch.
- Prefer small changes with tests over broad rewrites.

## Local Setup

```bash
pnpm install
pnpm check
pnpm lint
pnpm test
pnpm build
```

Use `pnpm qa:realworld` before changes that affect filesystem behavior, static
serving, PWA caching, Git integration, or mobile shell behavior.

## Security And Privacy

Scratch Web writes directly to a notes folder. Treat note content, backups, logs,
Tailnet hostnames, and device identifiers as sensitive.

Before opening a PR:

- Run the standard checks above.
- Run `git diff --check`.
- Search your diff for secrets or private machine details.
- Use a disposable demo notes folder for screenshots.

## Pull Requests

Describe:

- What changed.
- What was verified.
- Any security, privacy, or migration risk.
- Whether screenshots use a demo notes folder.
