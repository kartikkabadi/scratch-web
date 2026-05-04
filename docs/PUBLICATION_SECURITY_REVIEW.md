# Publication Security Review

Date: 2026-05-04

Scope: public GitHub repository preparation for Scratch Web.

## Checks Run

- Tracked secret-pattern scan for common cloud/API/token/private-key formats.
- Repository metadata scan for real Tailnet hostnames, adb serials, local user
  paths, and throwaway smoke-test note names.
- `strings` scan on release screenshots for the same sensitive markers.
- `git diff --check`.
- `pnpm check`.
- `pnpm lint`.
- `pnpm test`.
- `pnpm audit --prod`.
- `pnpm build`.
- `pnpm qa:realworld`.

## Results

- No high-confidence tracked secret patterns found.
- No known production dependency vulnerabilities found by `pnpm audit --prod`.
- No public-release docs or release screenshots contain the previously observed
  Tailnet hostname, adb serials, local user path, or throwaway smoke-test note
  name markers.
- Release screenshots use a disposable demo notes folder.
- Real-world QA passed 26 checks covering filesystem boundaries, symlink
  rejection, backups, asset validation, mutating request guards, local Git
  behavior, SSE, service-worker API caching, and desktop/mobile Chrome rendering.

## Hardening Included

- Command palette Git write/network actions now ask for confirmation before
  commit, push, pull, fetch, or sync.
- Editor link creation now accepts only `http`, `https`, and `mailto` URLs.
- Small-screen editor content is centered in a stable mobile reading column.
- GitHub issue/PR templates warn contributors not to publish private notes,
  Tailnet hostnames, device serials, tokens, or local user paths.

## Remaining Limits

- App-level auth remains optional and setup-owned; private Tailnet access is the
  intended deployment boundary.
- Tailscale Funnel should not be enabled silently.
- iCloud-backed Scratch folders still avoid LaunchAgent startup by default.
- A physical Redmi screenshot was not captured during this publication pass
  because adb exposed only a non-requested Android device. The README uses a
  mobile browser screenshot from the disposable demo vault instead.
